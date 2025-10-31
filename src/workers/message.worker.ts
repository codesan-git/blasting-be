import { Worker, Job } from "bullmq";
import redisConfig from "../config/redis";
import logger from "../utils/logger";
import {
  MessageJobData,
  EmailJobData,
  WhatsAppJobData,
} from "../types/email.types";
import smtpService from "../services/smtp.service";
import qiscusService from "../services/qiscus.service";
import DatabaseService from "../services/database.service";

// Type guard untuk mengecek apakah data adalah EmailJobData
function isEmailJobData(data: MessageJobData): data is EmailJobData {
  return "subject" in data && "from" in data;
}

// Type guard untuk mengecek apakah data adalah WhatsAppJobData
function isWhatsAppJobData(data: MessageJobData): data is WhatsAppJobData {
  return data.channel === "whatsapp" && "message" in data;
}

export const messageWorker = new Worker<MessageJobData>(
  "message-queue",
  async (job: Job<MessageJobData>) => {
    logger.info(`Processing message job: ${job.id}`, {
      channel: job.data.channel,
      attempt: job.attemptsMade + 1,
    });

    // Log to database - queued/processing
    DatabaseService.updateMessageStatus(
      job.id!,
      "processing",
      undefined,
      undefined,
      job.attemptsMade + 1
    );

    try {
      let messageId: string | undefined;

      if (isEmailJobData(job.data)) {
        // Send Email via SMTP
        const result = await smtpService.sendEmail({
          from: job.data.from,
          to: job.data.recipient.email,
          subject: job.data.subject,
          html: job.data.body,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to send email");
        }

        messageId = result.messageId;

        logger.info(`Email job completed: ${job.id}`, {
          recipient: job.data.recipient.email,
          subject: job.data.subject,
          messageId,
        });

        // Log success to database
        DatabaseService.updateMessageStatus(
          job.id!,
          "sent",
          undefined,
          messageId,
          job.attemptsMade + 1
        );

        return { success: true, channel: "email", messageId };
      } else if (isWhatsAppJobData(job.data)) {
        // Send WhatsApp via Qiscus
        const whatsappData = job.data as WhatsAppJobData & {
          qiscusComponents?: any[];
          qiscusTemplateName?: string;
          qiscusNamespace?: string;
        };

        // Jika ada qiscusComponents, gunakan Qiscus API
        if (whatsappData.qiscusComponents && whatsappData.qiscusTemplateName) {
          const result = await qiscusService.sendTemplateMessage(
            whatsappData.recipient.phone,
            whatsappData.qiscusTemplateName,
            whatsappData.qiscusComponents,
            whatsappData.qiscusNamespace
          );

          if (!result.success) {
            throw new Error(result.error || "Failed to send WhatsApp message");
          }

          messageId = result.messageId;

          logger.info(`WhatsApp job completed via Qiscus: ${job.id}`, {
            recipient: whatsappData.recipient.phone,
            template: whatsappData.qiscusTemplateName,
            messageId,
          });
        } else {
          // Fallback ke simulasi jika tidak ada Qiscus config
          logger.warn(
            "WhatsApp message sent without Qiscus template (simulated)",
            {
              recipient: whatsappData.recipient.phone,
            }
          );
          messageId = `simulated-${Date.now()}`;
        }

        // Log success to database
        DatabaseService.updateMessageStatus(
          job.id!,
          "sent",
          undefined,
          messageId,
          job.attemptsMade + 1
        );

        return { success: true, channel: "whatsapp", messageId };
      }

      throw new Error("Unknown message type");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      logger.error(`Message job failed: ${job.id}`, {
        channel: job.data.channel,
        error: errorMessage,
        attempt: job.attemptsMade + 1,
      });

      // Log failure to database
      DatabaseService.updateMessageStatus(
        job.id!,
        "failed",
        errorMessage,
        undefined,
        job.attemptsMade + 1
      );

      throw error;
    }
  },
  {
    connection: redisConfig,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

messageWorker.on("completed", (job) => {
  logger.info(`Worker completed job: ${job.id}`);
});

messageWorker.on("failed", (job, err) => {
  logger.error(`Worker failed job: ${job?.id}`, {
    error: err.message,
  });
});

messageWorker.on("error", (error) => {
  logger.error("Worker error:", error);
});
