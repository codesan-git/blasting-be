// src/middleware/auth.middleware.ts - UPDATED WITH DYNAMIC PERMISSIONS
import { Request, Response, NextFunction } from "express";
import authService from "../services/auth.service";
import DatabaseService from "../services/database.service";
import { JWTPayload, UserRole, Permission } from "../types/auth.types";
import logger from "../utils/logger";
import ResponseHelper from "../utils/api-response.helper";

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
      ResponseHelper.error(res, "No token provided. Please login first.");
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    const payload = authService.verifyAccessToken(token);

    if (!payload) {
      ResponseHelper.error(
        res,
        "Invalid or expired token. Please login again."
      );
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

    ResponseHelper.error(res, "Authentication failed");
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
      ResponseHelper.error(res, "Authentication required");
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

      ResponseHelper.error(res, "Access denied. Insufficient permissions.");
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user has required permission(s) - DYNAMIC from DB
 * Usage: requirePermission(Permission.EMAIL_SEND)
 * Usage: requirePermission([Permission.EMAIL_SEND, Permission.WHATSAPP_SEND])
 */
export const requirePermission = (permissions: Permission | Permission[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      ResponseHelper.error(res, "Authentication required");
      return;
    }

    const requiredPermissions = Array.isArray(permissions)
      ? permissions
      : [permissions];
    const userRoles = req.user.roles;

    // 🔄 GET PERMISSIONS DYNAMICALLY FROM DATABASE
    const userPermissions = await DatabaseService.getRolesPermissions(
      userRoles
    );

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (permission) => !userPermissions.includes(permission)
      );

      logger.warn("Access denied - insufficient permissions", {
        userId: req.user.userId,
        email: req.user.email,
        userRoles: userRoles,
        userPermissions: userPermissions,
        requiredPermissions: requiredPermissions,
        missingPermissions: missingPermissions,
        endpoint: req.path,
      });

      ResponseHelper.error(
        res,
        "Access denied. You don't have the required permissions."
      );
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user has ANY of the required permissions - DYNAMIC from DB
 * Usage: requireAnyPermission([Permission.EMAIL_SEND, Permission.WHATSAPP_SEND])
 */
export const requireAnyPermission = async (permissions: Permission[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      ResponseHelper.error(res, "Authentication required");
      return;
    }

    const userRoles = req.user.roles;

    // 🔄 GET PERMISSIONS DYNAMICALLY FROM DATABASE
    const userPermissions = await DatabaseService.getRolesPermissions(
      userRoles
    );

    // Check if user has any of the required permissions
    const hasAnyPermission = permissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAnyPermission) {
      logger.warn("Access denied - no matching permissions", {
        userId: req.user.userId,
        email: req.user.email,
        userRoles: userRoles,
        userPermissions: userPermissions,
        requiredPermissions: permissions,
        endpoint: req.path,
      });

      ResponseHelper.error(
        res,
        "Access denied. You don't have any of the required permissions."
      );
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user is active
 */
export const requireActive = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    ResponseHelper.error(res, "Authentication required");
    return;
  }

  // Check from database
  const user = await DatabaseService.getUserById(req.user.userId);

  if (!user || !user.is_active) {
    logger.warn("Access denied - user not active", {
      userId: req.user.userId,
      email: req.user.email,
    });

    ResponseHelper.error(
      res,
      "Your account has been deactivated. Please contact administrator."
    );
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
  } catch (error) {
    // Continue without authentication
    next();
  }
};
