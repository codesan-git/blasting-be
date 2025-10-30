import { Request, Response } from "express";
import DatabaseService from "../services/database.service";
import logger from "../utils/logger";

export const getMessageLogs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, channel, email, limit = 100, offset = 0 } = req.query;

    const logs = DatabaseService.getMessageLogs({
      status: status as string,
      channel: channel as string,
      email: email as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    logger.error("Error getting message logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get message logs",
    });
  }
};

export const getMessageStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const stats = DatabaseService.getMessageStats();

    // Transform to more readable format
    const formatted: any = {
      email: { queued: 0, processing: 0, sent: 0, failed: 0 },
      whatsapp: { queued: 0, processing: 0, sent: 0, failed: 0 },
      total: { queued: 0, processing: 0, sent: 0, failed: 0 },
    };

    stats.forEach((stat: any) => {
      const channel = stat.channel.toLowerCase();
      const status = stat.status.toLowerCase();

      if (formatted[channel]) {
        formatted[channel][status] = stat.count;
      }

      formatted.total[status] += stat.count;
    });

    res.status(200).json({
      success: true,
      stats: formatted,
    });
  } catch (error) {
    logger.error("Error getting message stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get message statistics",
    });
  }
};

export const getMessageStatsByDate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { days = 7 } = req.query;
    const stats = DatabaseService.getMessageStatsByDate(
      parseInt(days as string)
    );

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error("Error getting message stats by date:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get message statistics by date",
    });
  }
};

export const getAPILogs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const logs = DatabaseService.getAPILogs(
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    logger.error("Error getting API logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get API logs",
    });
  }
};

export const getSystemLogs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { level, limit = 100, offset = 0 } = req.query;

    const logs = DatabaseService.getSystemLogs(
      level as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    logger.error("Error getting system logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get system logs",
    });
  }
};

export const cleanupLogs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { days = 30 } = req.body;

    DatabaseService.cleanupOldLogs(parseInt(days as string));

    res.status(200).json({
      success: true,
      message: `Logs older than ${days} days have been cleaned up`,
    });
  } catch (error) {
    logger.error("Error cleaning up logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cleanup logs",
    });
  }
};
