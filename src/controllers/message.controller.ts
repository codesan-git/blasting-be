// src/controllers/message.controller.ts - IMPROVED WITH COMPREHENSIVE VALIDATION
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
import { ValidationError } from "../types/api-response.types";

// Validation helper untuk recipient
interface RecipientValidationError {
  recipientIndex: number;
  recipientName?: string;
  errors: ValidationError[];
}

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

    // ===== STEP 1: Basic Input Validation =====
    const validationErrors: ValidationError[] = [];

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      validationErrors.push({
        field: "recipients",
        message: "Recipients array is required and cannot be empty",
      });
    }

    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      validationErrors.push({
        field: "channels",
        message:
          'Channels array is required. Example: ["email"], ["whatsapp"], or ["email", "whatsapp"]',
      });
    }

    if (!templateId) {
      validationErrors.push({
        field: "templateId",
        message: "Template ID is required",
      });
    }

    // Return early if basic validation fails
    if (validationErrors.length > 0) {
      ResponseHelper.validationError(res, validationErrors);
      return;
    }

    // ===== STEP 2: Validate Channels =====
    const validChannels = ["email", "whatsapp", "sms", "push"];
    const invalidChannels = channels.filter(
      (ch) => !validChannels.includes(ch)
    );

    if (invalidChannels.length > 0) {
      validationErrors.push({
        field: "channels",
        message: `Invalid channels: ${invalidChannels.join(
          ", "
        )}. Valid channels: ${validChannels.join(", ")}`,
      });
      ResponseHelper.validationError(res, validationErrors);
      return;
    }

    // ===== STEP 3: Get and Validate Template =====
    const template = TemplateService.getTemplateById(templateId);
    if (!template) {
      ResponseHelper.notFound(
        res,
        `Template with ID '${templateId}' not found`
      );
      return;
    }

    // Check if email sending requires 'from' address
    if (channels.includes("email") && !from) {
      validationErrors.push({
        field: "from",
        message: "From email address is required when sending emails",
      });
      ResponseHelper.validationError(res, validationErrors);
      return;
    }

    // ===== STEP 4: Validate Channel Compatibility =====
    const incompatibleChannels = channels.filter(
      (ch) => !template.channels.includes(ch as ChannelType)
    );

    if (incompatibleChannels.length > 0) {
      validationErrors.push({
        field: "channels",
        message: `Template '${
          template.name
        }' is only available for channels: ${template.channels.join(
          ", "
        )}. You requested: ${channels.join(", ")}`,
      });
      ResponseHelper.validationError(res, validationErrors);
      return;
    }

    // ===== STEP 5: Validate Each Recipient =====
    const recipientValidationErrors: RecipientValidationError[] = [];

    recipients.forEach((recipient, index) => {
      const recipientErrors: ValidationError[] = [];

      // First, merge variables to get complete picture
      const mergedVariables: TemplateVariable = {
        ...globalVariables,
        ...recipient.variables,
        name: recipient.name || "",
        email: recipient.email || "",
        phone: recipient.phone || "",
      };

      // Check basic recipient fields only if template requires them OR channel needs them
      const templateNeedsName = template.variableRequirements?.some(
        (req) => req.name === "name" && req.required
      );
      const templateNeedsEmail = template.variableRequirements?.some(
        (req) => req.name === "email" && req.required
      );
      const templateNeedsPhone = template.variableRequirements?.some(
        (req) => req.name === "phone" && req.required
      );

      // Validate name (only if not already handled by template requirements)
      if (
        !templateNeedsName &&
        (!recipient.name || recipient.name.trim() === "")
      ) {
        recipientErrors.push({
          field: `recipients[${index}].name`,
          message: "Recipient name is required for logging purposes",
        });
      }

      // Check channel-specific requirements (only if not handled by template)
      if (channels.includes("email")) {
        if (
          !templateNeedsEmail &&
          (!recipient.email || recipient.email.trim() === "")
        ) {
          recipientErrors.push({
            field: `recipients[${index}].email`,
            message: "Email is required when email channel is selected",
          });
        } else if (recipient.email && !recipient.email.includes("@")) {
          recipientErrors.push({
            field: `recipients[${index}].email`,
            message: "Invalid email format",
          });
        }
      }

      if (channels.includes("whatsapp")) {
        if (
          !templateNeedsPhone &&
          (!recipient.phone || recipient.phone.trim() === "")
        ) {
          recipientErrors.push({
            field: `recipients[${index}].phone`,
            message:
              "Phone number is required when WhatsApp channel is selected",
          });
        }
      }

      // ===== STEP 6: Validate Variables Against Template Requirements =====
      if (template.variableRequirements) {
        template.variableRequirements.forEach((req) => {
          const value = mergedVariables[req.name];

          // Determine where the variable should come from
          const isInGlobal = globalVariables && req.name in globalVariables;
          const isInRecipientVars =
            recipient.variables && req.name in recipient.variables;
          const isBasicField = ["name", "email", "phone"].includes(req.name);

          // Check if required variable is missing
          if (
            req.required &&
            (value === undefined || value === null || value === "")
          ) {
            let fieldPath = "";
            let detailedMessage = "";

            // Determine the most appropriate field path and message
            if (isBasicField) {
              // If it's a basic field like name, email, phone
              fieldPath = `recipients[${index}].${req.name}`;
              detailedMessage = `Missing required field: '${req.name}' (${req.description})`;
            } else if (isInRecipientVars) {
              // Variable exists in recipient.variables but is empty
              fieldPath = `recipients[${index}].variables.${req.name}`;
              detailedMessage = `Variable '${req.name}' is empty (${req.description})`;
            } else if (!isInGlobal) {
              // Not in global, not in recipient - completely missing
              fieldPath = `recipients[${index}].variables.${req.name}`;
              detailedMessage = `Missing required variable: '${req.name}' (${req.description}). Add it to recipient variables or globalVariables.`;
            } else {
              // In global but somehow empty (edge case)
              fieldPath = `globalVariables.${req.name}`;
              detailedMessage = `Variable '${req.name}' in globalVariables is empty (${req.description})`;
            }

            recipientErrors.push({
              field: fieldPath,
              message: detailedMessage,
              code: "MISSING_REQUIRED_VARIABLE",
            });
            return;
          }

          // Skip type validation if variable is not provided and not required
          if (!req.required && (value === undefined || value === null)) {
            return;
          }

          // Type validation
          switch (req.type) {
            case "email":
              if (typeof value === "string" && !value.includes("@")) {
                recipientErrors.push({
                  field: `recipients[${index}].variables.${req.name}`,
                  message: `Invalid email format for '${req.name}': ${value}`,
                  code: "INVALID_EMAIL_FORMAT",
                });
              }
              break;
            case "phone":
              if (typeof value === "string" && !/^\+?[\d\s-]+$/.test(value)) {
                recipientErrors.push({
                  field: `recipients[${index}].variables.${req.name}`,
                  message: `Invalid phone format for '${req.name}': ${value}`,
                  code: "INVALID_PHONE_FORMAT",
                });
              }
              break;
            case "number":
              if (typeof value !== "number" && isNaN(Number(value))) {
                recipientErrors.push({
                  field: `recipients[${index}].variables.${req.name}`,
                  message: `Variable '${req.name}' must be a number, got: ${value}`,
                  code: "INVALID_NUMBER_FORMAT",
                });
              }
              break;
            case "string":
              if (typeof value !== "string" && typeof value !== "number") {
                recipientErrors.push({
                  field: `recipients[${index}].variables.${req.name}`,
                  message: `Variable '${
                    req.name
                  }' must be a string, got: ${typeof value}`,
                  code: "INVALID_STRING_FORMAT",
                });
              }
              break;
          }
        });
      }

      // If this recipient has errors, add to the list
      if (recipientErrors.length > 0) {
        recipientValidationErrors.push({
          recipientIndex: index,
          recipientName: recipient.name,
          errors: recipientErrors,
        });
      }
    });

    // ===== STEP 7: Return All Validation Errors =====
    if (recipientValidationErrors.length > 0) {
      // Flatten all recipient errors into a single array
      const allErrors = recipientValidationErrors.flatMap(
        (recipientError) => recipientError.errors
      );

      logger.warn("Message blast validation failed", {
        templateId,
        totalRecipients: recipients.length,
        recipientsWithErrors: recipientValidationErrors.length,
        totalErrors: allErrors.length,
        errorDetails: recipientValidationErrors,
      });

      ResponseHelper.validationError(
        res,
        allErrors,
        `Validation failed for ${recipientValidationErrors.length} recipient(s). Please check all fields.`
      );
      return;
    }

    // ===== STEP 8: Process Valid Recipients =====
    const messageJobs: MessageJobData[] = [];
    const jobMetadata: Array<{
      channel: string;
      recipient: any;
      templateId: string;
      templateName: string;
    }> = [];

    for (const recipient of recipients) {
      // Merge all variables
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
            from: from!,
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
      ResponseHelper.badRequest(
        res,
        "No valid recipients found for the selected channel(s). Make sure recipients have required contact info (email/phone)."
      );
      return;
    }

    // ===== STEP 9: Queue Messages =====
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
          created_by: req.user?.userId,
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
          created_by: req.user?.userId,
        });
      }
    }

    logger.info("Message blast initiated", {
      totalMessages: messageJobs.length,
      totalRecipients: recipients.length,
      channels: channels,
      templateId,
      templateName: template.name,
      qiscusEnabled: !!template.qiscusConfig,
      userId: req.user?.userId,
      userEmail: req.user?.email,
      important: true,
    });

    const data = {
      totalMessages: messageJobs.length,
      totalRecipients: recipients.length,
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
    ResponseHelper.internalError(
      res,
      `Failed to queue message blast: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
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
    ResponseHelper.internalError(
      res,
      `Failed to get queue statistics: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};
