import { Request, Response } from "express";
import { addBulkEmailsToQueue } from "../queues/email.queue";
import {
  EmailBlastRequest,
  EmailBlastResponse,
  EmailJobData,
} from "../types/email.types";
import { ChannelType } from "../types/template.types";
import logger from "../utils/logger";
import ResponseHelper from "../utils/api-response.helper";

export const sendEmailBlast = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { recipients, subject, body, from }: EmailBlastRequest = req.body;

    // Validasi input
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      ResponseHelper.error(
        res,
        "Recipients array is required and cannot be empty"
      );
      return;
    }

    if (!subject || !body || !from) {
      ResponseHelper.error(res, "Subject, body, and from fields are required");
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

    ResponseHelper.success(res, response);
  } catch (error) {
    logger.error("Error in sendEmailBlast:", error);
    ResponseHelper.error(res, "Failed to queue email blast");
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

    ResponseHelper.success(res, {
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
    ResponseHelper.error(res, "Failed to get queue statistics");
  }
};
