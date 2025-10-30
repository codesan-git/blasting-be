import { Request, Response } from "express";
import { addBulkEmailsToQueue } from "../queues/email.queue";
import {
  EmailBlastRequest,
  EmailBlastResponse,
  EmailJobData,
} from "../types/email.types";
import { ChannelType } from "../types/template.types";
import logger from "../utils/logger";

export const sendEmailBlast = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { recipients, subject, body, from }: EmailBlastRequest = req.body;

    // Validasi input
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({
        success: false,
        message: "Recipients array is required and cannot be empty",
      });
      return;
    }

    if (!subject || !body || !from) {
      res.status(400).json({
        success: false,
        message: "Subject, body, and from fields are required",
      });
      return;
    }

    // Prepare email jobs
    const emailJobs: EmailJobData[] = recipients.map((recipient) => ({
      recipient,
      subject,
      body,
      from,
      channel: ChannelType.EMAIL,
    }));

    // Add to queue
    const jobIds = await addBulkEmailsToQueue(emailJobs);

    const response: EmailBlastResponse = {
      success: true,
      message: "Email blast queued successfully",
      totalEmails: recipients.length,
      jobIds,
    };

    logger.info("Email blast initiated", {
      totalEmails: recipients.length,
      subject,
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error("Error in sendEmailBlast:", error);
    res.status(500).json({
      success: false,
      message: "Failed to queue email blast",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getQueueStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { emailQueue } = await import("../queues/email.queue");

    const [waiting, active, completed, failed] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getCompletedCount(),
      emailQueue.getFailedCount(),
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
    logger.error("Error getting queue stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get queue statistics",
    });
  }
};
