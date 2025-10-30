import { Queue } from "bullmq";
import redisConfig from "../config/redis";
import logger from "../utils/logger";
import { MessageJobData } from "../types/email.types";

export const messageQueue = new Queue<MessageJobData>("message-queue", {
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

messageQueue.on("error", (error) => {
  logger.error("Message queue error:", error);
});

export const addMessageToQueue = async (
  messageData: MessageJobData
): Promise<string> => {
  try {
    const job = await messageQueue.add("send-message", messageData, {
      priority: 1,
    });

    logger.info(`Message job added to queue: ${job.id}`, {
      channel: messageData.channel,
    });

    return job.id || "";
  } catch (error) {
    logger.error("Failed to add message to queue:", error);
    throw error;
  }
};

export const addBulkMessagesToQueue = async (
  messagesData: MessageJobData[]
): Promise<string[]> => {
  try {
    const jobs = await messageQueue.addBulk(
      messagesData.map((data) => ({
        name: "send-message",
        data,
        opts: { priority: 1 },
      }))
    );

    const jobIds = jobs.map((job) => job.id || "");

    logger.info(`Bulk message jobs added to queue: ${jobs.length} messages`, {
      jobIds,
    });

    return jobIds;
  } catch (error) {
    logger.error("Failed to add bulk messages to queue:", error);
    throw error;
  }
};
