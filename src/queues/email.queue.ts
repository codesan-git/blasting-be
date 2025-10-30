import { Queue } from "bullmq";
import redisConfig from "../config/redis";
import logger from "../utils/logger";
import { EmailJobData } from "../types/email.types";

export const emailQueue = new Queue<EmailJobData>("email-queue", {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 50,
    },
  },
});

emailQueue.on("error", (error) => {
  logger.error("Email queue error:", error);
});

export const addEmailToQueue = async (
  emailData: EmailJobData
): Promise<string> => {
  try {
    const job = await emailQueue.add("send-email", emailData, {
      priority: 1,
    });

    logger.info(`Email job added to queue: ${job.id}`, {
      recipient: emailData.recipient.email,
      subject: emailData.subject,
    });

    return job.id || "";
  } catch (error) {
    logger.error("Failed to add email to queue:", error);
    throw error;
  }
};

export const addBulkEmailsToQueue = async (
  emailsData: EmailJobData[]
): Promise<string[]> => {
  try {
    const jobs = await emailQueue.addBulk(
      emailsData.map((data) => ({
        name: "send-email",
        data,
        opts: { priority: 1 },
      }))
    );

    const jobIds = jobs.map((job) => job.id || "");

    logger.info(`Bulk email jobs added to queue: ${jobs.length} emails`, {
      jobIds,
    });

    return jobIds;
  } catch (error) {
    logger.error("Failed to add bulk emails to queue:", error);
    throw error;
  }
};
