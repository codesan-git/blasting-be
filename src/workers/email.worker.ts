import { Worker, Job } from "bullmq";
import redisConfig from "../config/redis";
import logger from "../utils/logger";
import { EmailJobData } from "../types/email.types";

// Simulasi pengiriman email (ganti dengan SMTP real atau service email)
const sendEmail = async (emailData: EmailJobData): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulasi success/failure (90% success rate)
      const isSuccess = Math.random() > 0.1;

      if (isSuccess) {
        logger.info("Email sent successfully", {
          to: emailData.recipient.email,
          subject: emailData.subject,
        });
        resolve();
      } else {
        reject(new Error("Failed to send email"));
      }
    }, 1000); // Simulasi delay pengiriman 1 detik
  });
};

export const emailWorker = new Worker<EmailJobData>(
  "email-queue",
  async (job: Job<EmailJobData>) => {
    logger.info(`Processing email job: ${job.id}`, {
      recipient: job.data.recipient.email,
      attempt: job.attemptsMade + 1,
    });

    try {
      await sendEmail(job.data);

      logger.info(`Email job completed: ${job.id}`, {
        recipient: job.data.recipient.email,
      });

      return { success: true, recipient: job.data.recipient.email };
    } catch (error) {
      logger.error(`Email job failed: ${job.id}`, {
        recipient: job.data.recipient.email,
        error: error instanceof Error ? error.message : "Unknown error",
        attempt: job.attemptsMade + 1,
      });

      throw error;
    }
  },
  {
    connection: redisConfig,
    concurrency: 5, // Process 5 emails concurrently
  }
);

emailWorker.on("completed", (job) => {
  logger.info(`Worker completed job: ${job.id}`);
});

emailWorker.on("failed", (job, err) => {
  logger.error(`Worker failed job: ${job?.id}`, {
    error: err.message,
  });
});

emailWorker.on("error", (error) => {
  logger.error("Worker error:", error);
});
