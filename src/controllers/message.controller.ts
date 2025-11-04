// src/controllers/message.controller.ts
import { Request, Response } from "express";
import { addBulkMessagesToQueue } from "../queues/message.queue";
import {
  MessageJobData,
  EmailJobData,
  WhatsAppJobData,
} from "../types/email.types";
import {
  SendMessageRequest,
  ChannelType,
  TemplateVariable,
} from "../types/template.types";
import { TemplateService } from "../services/template.service";
import DatabaseService from "../services/database.service";
import logger from "../utils/logger";
import ResponseHelper from "../utils/api-response.helper";

export const sendMessageBlast = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      recipients,
      channels,
      templateId,
      globalVariables,
      from,
    }: SendMessageRequest = req.body;

    // Validasi input
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      ResponseHelper.error(
        res,
        "Recipients array is required and cannot be empty"
      );
      return;
    }

    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      ResponseHelper.error(
        res,
        'Channels array is required. Example: ["email"], ["whatsapp"], or ["email", "whatsapp"]'
      );
      return;
    }

    // Validate channels
    const validChannels = ["email", "whatsapp", "sms", "push"];
    const invalidChannels = channels.filter(
      (ch) => !validChannels.includes(ch)
    );

    if (invalidChannels.length > 0) {
      ResponseHelper.error(
        res,
        `Invalid channels: ${invalidChannels.join(
          ", "
        )}. Valid channels: ${validChannels.join(", ")}`
      );
      return;
    }

    if (!templateId) {
      ResponseHelper.error(res, "Template ID is required");
      return;
    }

    // Get template
    const template = TemplateService.getTemplateById(templateId);
    if (!template) {
      ResponseHelper.error(res, `Template with ID '${templateId}' not found`);
      return;
    }

    // Validate channel compatibility
    const incompatibleChannels = channels.filter(
      (ch) => !template.channels.includes(ch as ChannelType)
    );

    if (incompatibleChannels.length > 0) {
      ResponseHelper.error(
        res,
        `Template '${
          template.name
        }' is only available for channels: ${template.channels.join(
          ", "
        )}. You requested: ${channels.join(", ")}`
      );
      return;
    }

    const messageJobs: MessageJobData[] = [];
    const jobMetadata: Array<{
      channel: string;
      recipient: any;
      templateId: string;
      templateName: string;
    }> = [];

    // Process each recipient
    for (const recipient of recipients) {
      // Merge all variables: globalVariables + recipient.variables + recipient info
      const variables: TemplateVariable = {
        ...globalVariables,
        ...recipient.variables,
        name: recipient.name,
        email: recipient.email || "",
        phone: recipient.phone || "",
      };

      logger.debug("Processing recipient with variables", {
        recipient: recipient.name,
        variables,
      });

      for (const selectedChannel of channels) {
        if (selectedChannel === "email" && recipient.email) {
          if (!from) {
            ResponseHelper.error(
              res,
              "From email is required when sending emails"
            );
            return;
          }

          const rendered = TemplateService.renderTemplate(template, variables);

          logger.debug("Rendered email template", {
            recipient: recipient.email,
            subject: rendered.subject,
            bodyLength: rendered.body.length,
          });

          const emailJob: EmailJobData = {
            recipient: {
              email: recipient.email,
              name: recipient.name,
            },
            subject: rendered.subject || "No Subject",
            body: rendered.body,
            from,
            channel: ChannelType.EMAIL,
          };

          messageJobs.push(emailJob);
          jobMetadata.push({
            channel: "email",
            recipient: { email: recipient.email, name: recipient.name },
            templateId,
            templateName: template.name,
          });
        }

        if (selectedChannel === "whatsapp" && recipient.phone) {
          if (template.qiscusConfig) {
            const qiscusComponents = TemplateService.buildQiscusComponents(
              template,
              variables
            );

            const whatsappJob: WhatsAppJobData = {
              recipient: {
                phone: recipient.phone,
                name: recipient.name,
              },
              message: `WhatsApp template message: ${template.name}`,
              channel: ChannelType.WHATSAPP,
              qiscusComponents,
              qiscusTemplateName: template.qiscusConfig.templateName,
              qiscusNamespace: template.qiscusConfig.namespace,
            };

            messageJobs.push(whatsappJob);
            jobMetadata.push({
              channel: "whatsapp",
              recipient: { phone: recipient.phone, name: recipient.name },
              templateId,
              templateName: template.name,
            });
          } else {
            const rendered = TemplateService.renderTemplate(
              template,
              variables
            );
            const whatsappJob: WhatsAppJobData = {
              recipient: {
                phone: recipient.phone,
                name: recipient.name,
              },
              message: rendered.body,
              channel: ChannelType.WHATSAPP,
            };

            messageJobs.push(whatsappJob);
            jobMetadata.push({
              channel: "whatsapp",
              recipient: { phone: recipient.phone, name: recipient.name },
              templateId,
              templateName: template.name,
            });
          }
        }

        if (selectedChannel === "sms" && recipient.phone) {
          logger.warn("SMS channel not yet implemented", {
            recipient: recipient.phone,
          });
        }

        if (selectedChannel === "push") {
          logger.warn("Push notification channel not yet implemented", {
            recipient: recipient.name,
          });
        }
      }
    }

    if (messageJobs.length === 0) {
      ResponseHelper.error(
        res,
        "No valid recipients found for the selected channel(s). Make sure recipients have required contact info (email/phone)."
      );
      return;
    }

    // Add to queue
    const jobIds = await addBulkMessagesToQueue(messageJobs);

    // Log to database - initial queued status
    for (let i = 0; i < messageJobs.length; i++) {
      const job = messageJobs[i];
      const jobId = jobIds[i];
      const metadata = jobMetadata[i];

      if (metadata.channel === "email") {
        const emailJob = job as EmailJobData;
        DatabaseService.logMessage({
          job_id: jobId,
          channel: "email",
          recipient_email: emailJob.recipient.email,
          recipient_name: emailJob.recipient.name,
          template_id: templateId,
          template_name: template.name,
          subject: emailJob.subject,
          status: "queued",
        });
      } else if (metadata.channel === "whatsapp") {
        const waJob = job as WhatsAppJobData;
        DatabaseService.logMessage({
          job_id: jobId,
          channel: "whatsapp",
          recipient_phone: waJob.recipient.phone,
          recipient_name: waJob.recipient.name,
          template_id: templateId,
          template_name: template.name,
          status: "queued",
        });
      }
    }

    logger.info("Message blast initiated", {
      totalMessages: messageJobs.length,
      channels: channels,
      templateId,
      templateName: template.name,
      qiscusEnabled: !!template.qiscusConfig,
    });

    const data = {
      totalMessages: messageJobs.length,
      channels: channels,
      template: {
        id: template.id,
        name: template.name,
        channels: template.channels,
        qiscusEnabled: !!template.qiscusConfig,
      },
      jobIds,
    };
    ResponseHelper.success(res, data, "Message blast queued successfully");
  } catch (error) {
    logger.error("Error in sendMessageBlast:", error);
    ResponseHelper.error(res, `Failed to queue message blast: ${error}`);
  }
};

export const getQueueStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { messageQueue } = await import("../queues/message.queue");

    const [waiting, active, completed, failed] = await Promise.all([
      messageQueue.getWaitingCount(),
      messageQueue.getActiveCount(),
      messageQueue.getCompletedCount(),
      messageQueue.getFailedCount(),
    ]);

    const data = {
      stats: {
        waiting,
        active,
        completed,
        failed,
      },
    };
    ResponseHelper.success(
      res,
      data,
      "Queue statistics retrieved successfully"
    );
  } catch (error) {
    logger.error("Error getting queue stats:", error);
    ResponseHelper.error(res, `Failed to get queue statistics: ${error}`);
  }
};
