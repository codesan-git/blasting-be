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

export const sendMessageBlast = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      recipients,
      channels,
      channel,
      templateId,
      globalVariables,
      from,
    }: SendMessageRequest = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({
        success: false,
        message: "Recipients array is required and cannot be empty",
      });
      return;
    }

    let selectedChannels: string[] = [];

    if (channels && Array.isArray(channels)) {
      selectedChannels = channels;
    } else if (channel) {
      selectedChannels = channel === "both" ? ["email", "whatsapp"] : [channel];
    } else {
      res.status(400).json({
        success: false,
        message:
          'Channels array is required. Example: ["email"], ["whatsapp"], or ["email", "whatsapp"]',
      });
      return;
    }

    const validChannels = ["email", "whatsapp", "sms", "push"];
    const invalidChannels = selectedChannels.filter(
      (ch) => !validChannels.includes(ch)
    );

    if (invalidChannels.length > 0) {
      res.status(400).json({
        success: false,
        message: `Invalid channels: ${invalidChannels.join(
          ", "
        )}. Valid: ${validChannels.join(", ")}`,
      });
      return;
    }

    if (!templateId) {
      res
        .status(400)
        .json({ success: false, message: "Template ID is required" });
      return;
    }

    const template = TemplateService.getTemplateById(templateId);
    if (!template) {
      res.status(404).json({
        success: false,
        message: `Template with ID '${templateId}' not found`,
      });
      return;
    }

    const messageJobs: MessageJobData[] = [];

    for (const recipient of recipients) {
      const variables: TemplateVariable = {
        ...globalVariables,
        ...recipient.variables,
        name: recipient.name,
        email: recipient.email || "",
        phone: recipient.phone || "",
      };

      const rendered = TemplateService.renderTemplate(template, variables);

      for (const selectedChannel of selectedChannels) {
        /** ----------------
         *  EMAIL CHANNEL
         * ----------------*/
        if (selectedChannel === "email" && recipient.email) {
          if (!from) {
            res.status(400).json({
              success: false,
              message: "From email is required when sending emails",
            });
            return;
          }

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
        }

        /** ----------------
         *  WHATSAPP CHANNEL (Qiscus)
         * ----------------*/
        if (selectedChannel === "whatsapp" && recipient.phone) {
          const waData = variables as Record<string, any>;

          const whatsappJob: WhatsAppJobData = {
            recipient: {
              phone: recipient.phone,
              name: recipient.name,
            },
            channel: ChannelType.WHATSAPP,
            templateName: template.id, // pakai ID yang sama seperti di Qiscus
            templateData: {
              headerParams: waData.headerParams || [],
              bodyParams: waData.bodyParams || [],
              buttonParams: waData.buttonParams || [],
            },
          };
          messageJobs.push(whatsappJob);
        }
      }
    }

    if (messageJobs.length === 0) {
      res.status(400).json({
        success: false,
        message: "No valid recipients found for selected channel(s).",
      });
      return;
    }

    const jobIds = await addBulkMessagesToQueue(messageJobs);

    for (let i = 0; i < messageJobs.length; i++) {
      const job = messageJobs[i];
      const jobId = jobIds[i];

      if ("subject" in job) {
        DatabaseService.logMessage({
          job_id: jobId,
          channel: "email",
          recipient_email: job.recipient.email,
          recipient_name: job.recipient.name,
          template_id: templateId,
          template_name: template.name,
          subject: job.subject,
          status: "queued",
        });
      } else if ("templateName" in job) {
        DatabaseService.logMessage({
          job_id: jobId,
          channel: "whatsapp",
          recipient_phone: job.recipient.phone,
          recipient_name: job.recipient.name,
          template_id: templateId,
          template_name: template.name,
          status: "queued",
        });
      }
    }

    logger.info("Message blast initiated", {
      totalMessages: messageJobs.length,
      channels: selectedChannels,
      templateId,
      templateName: template.name,
    });

    res.status(200).json({
      success: true,
      message: "Message blast queued successfully",
      totalMessages: messageJobs.length,
      channels: selectedChannels,
      template: {
        id: template.id,
        name: template.name,
      },
      jobIds,
    });
  } catch (error) {
    logger.error("Error in sendMessageBlast:", error);
    res.status(500).json({
      success: false,
      message: "Failed to queue message blast",
      error: error instanceof Error ? error.message : "Unknown error",
    });
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

    res.status(200).json({
      success: true,
      stats: {
        waiting,
        active,
        completed,
        failed,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get queue statistics",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
