// src/controllers/user-activity.controller.ts
// NEW: User activity tracking endpoints
import { Request, Response } from "express";
import DatabaseService from "../services/database.service";
import logger from "../utils/logger";
import ResponseHelper from "../utils/api-response.helper";

/**
 * Get current user's activity
 * GET /api/users/me/activity
 */
export const getMyActivity = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      ResponseHelper.unauthorized(res);
      return;
    }

    const stats = DatabaseService.getUserActivityStats(req.user.userId);

    ResponseHelper.success(res, {
      userId: req.user.userId,
      email: req.user.email,
      name: req.user.name,
      ...stats,
    });
  } catch (error) {
    logger.error("Error getting user activity", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId: req.user?.userId,
    });

    ResponseHelper.internalError(res, "Failed to get user activity");
  }
};

/**
 * Get user's message history
 * GET /api/users/me/messages
 */
export const getMyMessages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      ResponseHelper.unauthorized(res);
      return;
    }

    const { limit = 50, offset = 0 } = req.query;

    const messages = DatabaseService.getMessageLogsByUser(
      req.user.userId,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    ResponseHelper.success(res, {
      userId: req.user.userId,
      count: messages.length,
      messages,
    });
  } catch (error) {
    logger.error("Error getting user messages", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId: req.user?.userId,
    });

    ResponseHelper.internalError(res, "Failed to get user messages");
  }
};

/**
 * Get user's API request history
 * GET /api/users/me/api-logs
 */
export const getMyAPILogs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      ResponseHelper.unauthorized(res);
      return;
    }

    const { limit = 50, offset = 0 } = req.query;

    const logs = DatabaseService.getAPILogs(
      parseInt(limit as string),
      parseInt(offset as string),
      req.user.userId
    );

    ResponseHelper.success(res, {
      userId: req.user.userId,
      count: logs.length,
      logs,
    });
  } catch (error) {
    logger.error("Error getting user API logs", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId: req.user?.userId,
    });

    ResponseHelper.internalError(res, "Failed to get API logs");
  }
};

/**
 * Get specific user's activity (Admin only)
 * GET /api/users/:id/activity
 */
export const getUserActivity = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = DatabaseService.getUserById(id);

    if (!user) {
      ResponseHelper.notFound(res, "User not found");
      return;
    }

    const stats = DatabaseService.getUserActivityStats(id);

    ResponseHelper.success(res, {
      userId: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      ...stats,
    });
  } catch (error) {
    logger.error("Error getting user activity", {
      error: error instanceof Error ? error.message : "Unknown error",
      requestedBy: req.user?.userId,
    });

    ResponseHelper.internalError(res, "Failed to get user activity");
  }
};

/**
 * Get specific user's messages (Admin only)
 * GET /api/users/:id/messages
 */
export const getUserMessages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const user = DatabaseService.getUserById(id);

    if (!user) {
      ResponseHelper.notFound(res, "User not found");
      return;
    }

    const messages = DatabaseService.getMessageLogsByUser(
      id,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    ResponseHelper.success(res, {
      userId: user.id,
      email: user.email,
      name: user.name,
      count: messages.length,
      messages,
    });
  } catch (error) {
    logger.error("Error getting user messages", {
      error: error instanceof Error ? error.message : "Unknown error",
      requestedBy: req.user?.userId,
    });

    ResponseHelper.internalError(res, "Failed to get user messages");
  }
};

/**
 * Get all users activity summary (Admin only)
 * GET /api/users/activity/summary
 */
export const getAllUsersActivitySummary = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = DatabaseService.getAllUsers();

    const summary = users.map((user) => {
      const stats = DatabaseService.getUserActivityStats(user.id);
      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        isActive: user.is_active,
        ...stats,
      };
    });

    // Sort by total activity (messages + API requests)
    summary.sort((a, b) => {
      const aTotal = a.totalMessages + a.totalAPIRequests;
      const bTotal = b.totalMessages + b.totalAPIRequests;
      return bTotal - aTotal;
    });

    ResponseHelper.success(res, {
      totalUsers: summary.length,
      activeUsers: summary.filter((u) => u.isActive).length,
      users: summary,
    });
  } catch (error) {
    logger.error("Error getting users activity summary", {
      error: error instanceof Error ? error.message : "Unknown error",
      requestedBy: req.user?.userId,
    });

    ResponseHelper.internalError(res, "Failed to get activity summary");
  }
};
