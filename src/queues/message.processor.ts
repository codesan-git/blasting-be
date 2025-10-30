import { Job } from "bullmq";
import {
  MessageJobData,
  EmailJobData,
  WhatsAppJobData,
} from "../types/email.types";
import smtpService from "../services/smtp.service";
import qiscusService from "../services/qiscus.service";
import { ChannelType } from "../types/template.types";
import logger from "../utils/logger";

export const messageProcessor = async (job: Job<MessageJobData>) => {
  const data = job.data;

  try {
    // ✅ Type guard untuk email
    if (data.channel === ChannelType.EMAIL) {
      const emailData = data as EmailJobData;

      logger.info("Processing email job", { to: emailData.recipient.email });
      await smtpService.sendEmail({
        to: emailData.recipient.email,
        subject: emailData.subject,
        html: emailData.body,
        from: emailData.from,
      });

      logger.info("Email sent successfully", { to: emailData.recipient.email });
      return { success: true };
    }

    // ✅ Type guard untuk WhatsApp
    if (data.channel === ChannelType.WHATSAPP) {
      const waData = data as WhatsAppJobData;

      logger.info("Processing WhatsApp job", {
        to: waData.recipient.phone,
        template: waData.templateName,
      });

      const result = await qiscusService.sendTemplateMessage({
        to: waData.recipient.phone,
        templateName: waData.templateName ?? "", // <-- fix error TS2322
        bodyParams: waData.templateData
          ? Object.values(waData.templateData)
          : [],
      });

      if (result.success) {
        logger.info("WhatsApp sent successfully", {
          to: waData.recipient.phone,
          messageId: result.messageId,
        });
      } else {
        logger.warn("WhatsApp failed to send", {
          to: waData.recipient.phone,
          error: result.error,
        });
      }

      return result;
    }

    // Kalau channel tidak dikenal
    throw new Error(`Unsupported channel type: ${(data as any)?.channel}`);
  } catch (error) {
    logger.error("Error processing message job", {
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
