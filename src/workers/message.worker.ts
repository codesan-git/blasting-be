import { Worker, Job } from "bullmq";
import redisConfig from "../config/redis";
import logger from "../utils/logger";
import {
  MessageJobData,
  EmailJobData,
  WhatsAppJobData,
} from "../types/email.types";
import { ChannelType } from "../types/template.types";
import smtpService from "../services/smtp.service";
import DatabaseService from "../services/database.service";

// Gunakan SMTP Service untuk mengirim email
// const sendEmail = async (emailData: EmailJobData): Promise<void> => {
//   const result = await smtpService.sendEmail({
//     from: emailData.from,
//     to: emailData.recipient.email,
//     subject: emailData.subject,
//     html: emailData.body,
//   });

//   if (!result.success) {
//     throw new Error(result.error || "Failed to send email");
//   }
// };

// Simulasi pengiriman WhatsApp (akan diimplementasi nanti)
const sendWhatsApp = async (whatsappData: WhatsAppJobData): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const isSuccess = Math.random() > 0.1;

      if (isSuccess) {
        logger.info("WhatsApp message sent successfully (SIMULATED)", {
          to: whatsappData.recipient.phone,
          name: whatsappData.recipient.name,
        });
        resolve();
      } else {
        reject(new Error("Failed to send WhatsApp message"));
      }
    }, 800);
  });
};

// Type guard untuk mengecek apakah data adalah EmailJobData
function isEmailJobData(data: MessageJobData): data is EmailJobData {
  return "subject" in data && "from" in data;
}

// Type guard untuk mengecek apakah data adalah WhatsAppJobData
function isWhatsAppJobData(data: MessageJobData): data is WhatsAppJobData {
  return "message" in data && !("subject" in data);
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
      } else if (isWhatsAppJobData(job.data)) {
        await sendWhatsApp(job.data);

        logger.info(`WhatsApp job completed: ${job.id}`, {
          recipient: job.data.recipient.phone,
        });

        // Log success to database
        DatabaseService.updateMessageStatus(
          job.id!,
          "sent",
          undefined,
          undefined,
          job.attemptsMade + 1
        );
      }

      return { success: true, channel: job.data.channel, messageId };
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
    concurrency: 5, // Reduced from 10 untuk SMTP rate limiting
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // per second
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
