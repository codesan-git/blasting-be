// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import authService from "../services/auth.service";
import { JWTPayload, UserRole, Permission } from "../types/auth.types";
import logger from "../utils/logger";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "No token provided. Please login first.",
      });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    const payload = authService.verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please login again.",
      });
      return;
    }

    // Attach user to request
    req.user = payload;

    logger.debug("User authenticated", {
      userId: payload.userId,
      email: payload.email,
      roles: payload.roles,
    });

    next();
  } catch (error) {
    logger.error("Authentication error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

/**
 * Middleware to check if user has required role(s)
 * Usage: requireRole(UserRole.SUPER_ADMIN)
 * Usage: requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN_PPDB])
 */
export const requireRole = (roles: UserRole | UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    const userRoles = req.user.roles;

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      logger.warn("Access denied - insufficient role", {
        userId: req.user.userId,
        email: req.user.email,
        userRoles: userRoles,
        requiredRoles: requiredRoles,
        endpoint: req.path,
      });

      res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
        requiredRoles: requiredRoles,
        yourRoles: userRoles,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user has required permission(s)
 * Usage: requirePermission(Permission.EMAIL_SEND)
 * Usage: requirePermission([Permission.EMAIL_SEND, Permission.WHATSAPP_SEND])
 */
export const requirePermission = (permissions: Permission | Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const requiredPermissions = Array.isArray(permissions)
      ? permissions
      : [permissions];
    const userRoles = req.user.roles;

    // Import permission helpers
    const { hasAllPermissions } = require("../types/auth.types");

    // Check if user has all required permissions
    const hasPermissions = hasAllPermissions(userRoles, requiredPermissions);

    if (!hasPermissions) {
      logger.warn("Access denied - insufficient permissions", {
        userId: req.user.userId,
        email: req.user.email,
        userRoles: userRoles,
        requiredPermissions: requiredPermissions,
        endpoint: req.path,
      });

      res.status(403).json({
        success: false,
        message: "Access denied. You don't have the required permissions.",
        requiredPermissions: requiredPermissions,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user has ANY of the required permissions
 * Usage: requireAnyPermission([Permission.EMAIL_SEND, Permission.WHATSAPP_SEND])
 */
export const requireAnyPermission = (permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const userRoles = req.user.roles;

    // Import permission helpers
    const { hasAnyPermission } = require("../types/auth.types");

    // Check if user has any of the required permissions
    const hasPermissions = hasAnyPermission(userRoles, permissions);

    if (!hasPermissions) {
      logger.warn("Access denied - no matching permissions", {
        userId: req.user.userId,
        email: req.user.email,
        userRoles: userRoles,
        requiredPermissions: permissions,
        endpoint: req.path,
      });

      res.status(403).json({
        success: false,
        message:
          "Access denied. You don't have any of the required permissions.",
        requiredPermissions: permissions,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user is active
 */
export const requireActive = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  // In JWT, we don't store is_active, so we need to check from database
  const DatabaseService = require("../services/database.service").default;
  const user = DatabaseService.getUserById(req.user.userId);

  if (!user || !user.is_active) {
    logger.warn("Access denied - user not active", {
      userId: req.user.userId,
      email: req.user.email,
    });

    res.status(403).json({
      success: false,
      message:
        "Your account has been deactivated. Please contact administrator.",
    });
    return;
  }

  next();
};

/**
 * Optional authentication - continues even if token is invalid
 * Useful for endpoints that work for both authenticated and unauthenticated users
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = authService.verifyAccessToken(token);

      if (payload) {
        req.user = payload;
      }
    }

    next();
    // oxlint-disable-next-line no-unused-vars
  } catch (error) {
    // Continue without authentication
    next();
  }
};
