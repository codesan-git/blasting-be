import { Request, Response } from "express";
import DatabaseService, {
  MessageLog,
  APILog,
  SystemLog,
  MessageStatRow,
  MessageStatsByDateRow,
} from "../services/database.service";
import logger from "../utils/logger";
import ResponseHelper from "../utils/api-response.helper";

// Types for formatted stats
interface StatusCounts {
  queued: number;
  processing: number;
  sent: number;
  failed: number;
}

interface FormattedStats {
  email: StatusCounts;
  whatsapp: StatusCounts;
  total: StatusCounts;
}

type ChannelKey = "email" | "whatsapp";
type StatusKey = keyof StatusCounts;

// Helper function to validate channel
const isValidChannel = (channel: string): channel is ChannelKey => {
  return channel === "email" || channel === "whatsapp";
};

// Helper function to validate status
const isValidStatus = (status: string): status is StatusKey => {
  return ["queued", "processing", "sent", "failed"].includes(status);
};

// Helper function to parse query parameter
const parseQueryNumber = (value: unknown, defaultValue: number): number => {
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

export const getMessageLogs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, channel, email, limit = 100, offset = 0 } = req.query;

    const logs: MessageLog[] = DatabaseService.getMessageLogs({
      status: status as string | undefined,
      channel: channel as string | undefined,
      email: email as string | undefined,
      limit: parseQueryNumber(limit, 100),
      offset: parseQueryNumber(offset, 0),
    });

    ResponseHelper.success(res, {
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    logger.error("Error getting message logs:", error);
    ResponseHelper.error(res, "Failed to get message logs");
  }
};

export const getMessageStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const stats: MessageStatRow[] = DatabaseService.getMessageStats();

    // Transform to more readable format
    const formatted: FormattedStats = {
      email: { queued: 0, processing: 0, sent: 0, failed: 0 },
      whatsapp: { queued: 0, processing: 0, sent: 0, failed: 0 },
      total: { queued: 0, processing: 0, sent: 0, failed: 0 },
    };

    stats.forEach((stat) => {
      const channel = stat.channel.toLowerCase();
      const status = stat.status.toLowerCase();

      if (isValidChannel(channel) && isValidStatus(status)) {
        formatted[channel][status] = stat.count;
        formatted.total[status] += stat.count;
      } else if (isValidStatus(status)) {
        // If channel is not recognized, only add to total
        formatted.total[status] += stat.count;
      }
    });

    ResponseHelper.success(res, {
      success: true,
      stats: formatted,
    });
  } catch (error) {
    logger.error("Error getting message stats:", error);
    ResponseHelper.error(res, "Failed to get message statistics");
  }
};

export const getMessageStatsByDate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { days = 7 } = req.query;

    const stats: MessageStatsByDateRow[] =
      DatabaseService.getMessageStatsByDate(parseQueryNumber(days, 7));

    ResponseHelper.success(res, {
      success: true,
      stats,
    });
  } catch (error) {
    logger.error("Error getting message stats by date:", error);
    ResponseHelper.error(res, "Failed to get message statistics by date");
  }
};

export const getAPILogs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const logs: APILog[] = DatabaseService.getAPILogs(
      parseQueryNumber(limit, 100),
      parseQueryNumber(offset, 0)
    );

    ResponseHelper.success(res, {
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    logger.error("Error getting API logs:", error);
    ResponseHelper.error(res, "Failed to get API logs");
  }
};

export const getSystemLogs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { level, limit = 100, offset = 0 } = req.query;

    const logs: SystemLog[] = DatabaseService.getSystemLogs(
      level as string | undefined,
      parseQueryNumber(limit, 100),
      parseQueryNumber(offset, 0)
    );

    ResponseHelper.success(res, {
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    logger.error("Error getting system logs:", error);
    ResponseHelper.error(res, "Failed to get system logs");
  }
};

export const cleanupLogs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { days = 30 } = req.body;

    const daysToKeep = parseQueryNumber(days, 30);
    DatabaseService.cleanupOldLogs(daysToKeep);

    ResponseHelper.success(res, {
      success: true,
      message: `Logs older than ${daysToKeep} days have been cleaned up`,
    });
  } catch (error) {
    logger.error("Error cleaning up logs:", error);
    ResponseHelper.error(res, "Failed to cleanup logs");
  }
};
