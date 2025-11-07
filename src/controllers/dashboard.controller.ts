import { Request, Response } from "express";
import DatabaseService, {
  MessageStatRow,
  MessageStatsByDateRow,
  MessageLog,
} from "../services/database.service";
import { messageQueue } from "../queues/message.queue";
import logger from "../utils/logger";
import ResponseHelper from "../utils/api-response.helper";

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

interface DashboardResponse {
  success: boolean;
  dashboard: {
    messageStats: MessageStatRow[];
    messageStatsByDate: MessageStatsByDateRow[];
    queueStats: QueueStats;
    recentLogs: MessageLog[];
  };
}

export const getDashboardStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Message stats - ✅ Added await
    const messageStats = await DatabaseService.getMessageStats();
    const messageStatsByDate = await DatabaseService.getMessageStatsByDate(7);

    // Queue stats
    const [waiting, active, completed, failed] = await Promise.all([
      messageQueue.getWaitingCount(),
      messageQueue.getActiveCount(),
      messageQueue.getCompletedCount(),
      messageQueue.getFailedCount(),
    ]);

    const queueStats: QueueStats = {
      waiting,
      active,
      completed,
      failed,
    };

    // Recent logs - ✅ Added await
    const recentLogs = await DatabaseService.getMessageLogs({
      limit: 10,
      offset: 0,
    });

    const response: DashboardResponse = {
      success: true,
      dashboard: {
        messageStats,
        messageStatsByDate,
        queueStats,
        recentLogs,
      },
    };

    ResponseHelper.success(res, response);
  } catch (error) {
    logger.error("Error getting dashboard stats:", error);
    ResponseHelper.error(res, "Failed to get dashboard stats");
  }
};
