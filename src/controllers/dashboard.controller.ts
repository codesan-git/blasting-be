// src/controllers/dashboard.controller.ts
import { Request, Response } from "express";
import DatabaseService, {
  MessageStatRow,
  MessageStatsByDateRow,
  MessageLog,
} from "../services/database.service";
import { messageQueue } from "../queues/message.queue";
import logger from "../utils/logger";

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
    // Message stats
    const messageStats = DatabaseService.getMessageStats();
    const messageStatsByDate = DatabaseService.getMessageStatsByDate(7);

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

    // Recent logs
    const recentLogs = DatabaseService.getMessageLogs({
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

    res.status(200).json(response);
  } catch (error) {
    logger.error("Error getting dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get dashboard stats",
    });
  }
};
