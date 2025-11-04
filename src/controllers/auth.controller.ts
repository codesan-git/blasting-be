// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import authService from "../services/auth.service";
import DatabaseService from "../services/database.service";
import {
  LoginRequest,
  RegisterRequest,
  ChangePasswordRequest,
  UserRole,
  getUserPermissions,
} from "../types/auth.types";
import logger from "../utils/logger";

/**
 * Login endpoint
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    const result = await authService.login(email, password);

    if (!result.success) {
      res.status(401).json(result);
      return;
    }

    // Log successful login
    logger.info("User logged in", {
      userId: result.user?.id,
      email: result.user?.email,
      roles: result.user?.roles,
      ip: req.ip,
      important: true,
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error("Login error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Login failed due to server error",
    });
  }
};

/**
 * Refresh token endpoint
 * POST /api/auth/refresh
 */
export const refreshToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
      return;
    }

    const result = await authService.refreshAccessToken(refreshToken);

    if (!result.success) {
      res.status(401).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    logger.error("Token refresh error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Failed to refresh token",
    });
  }
};

/**
 * Logout endpoint
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
      return;
    }

    const success = await authService.logout(refreshToken);

    logger.info("User logged out", {
      userId: req.user?.userId,
      email: req.user?.email,
      success,
      important: true,
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error("Logout error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const user = DatabaseService.getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Get user permissions
    const permissions = getUserPermissions(user.roles);

    // Don't send password
    const { password, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      user: {
        ...userWithoutPassword,
        permissions,
      },
    });
  } catch (error) {
    logger.error("Get profile error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Failed to get profile",
    });
  }
};

/**
 * Change password
 * POST /api/auth/change-password
 */
export const changePassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const { currentPassword, newPassword }: ChangePasswordRequest = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
      return;
    }

    const success = await authService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword
    );

    if (!success) {
      res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
      return;
    }

    logger.info("Password changed", {
      userId: req.user.userId,
      email: req.user.email,
      important: true,
    });

    res.status(200).json({
      success: true,
      message: "Password changed successfully. Please login again.",
    });
  } catch (error) {
    logger.error("Change password error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};

/**
 * Register new user (admin only) - WITH SUPER ADMIN LIMIT
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, roles }: RegisterRequest = req.body;

    // Validation
    if (!email || !password || !name || !roles) {
      res.status(400).json({
        success: false,
        message: "Email, password, name, and roles are required",
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
      return;
    }

    if (!Array.isArray(roles) || roles.length === 0) {
      res.status(400).json({
        success: false,
        message: "Roles must be a non-empty array",
      });
      return;
    }

    // Validate roles
    const validRoles = Object.values(UserRole);
    const invalidRoles = roles.filter((role) => !validRoles.includes(role));

    if (invalidRoles.length > 0) {
      res.status(400).json({
        success: false,
        message: `Invalid roles: ${invalidRoles.join(", ")}`,
        validRoles,
      });
      return;
    }

    // 🔒 CHECK: Super admin limit
    if (roles.includes(UserRole.SUPER_ADMIN)) {
      const superAdminCount = DatabaseService.countSuperAdmins();
      const MAX_SUPER_ADMINS = parseInt(
        process.env.MAX_SUPER_ADMINS || "3",
        10
      );

      if (superAdminCount >= MAX_SUPER_ADMINS) {
        logger.warn("Super admin limit reached - registration blocked", {
          currentCount: superAdminCount,
          maxAllowed: MAX_SUPER_ADMINS,
          attemptedBy: req.user?.email,
          requestedEmail: email,
          important: true,
        });

        res.status(403).json({
          success: false,
          message: `Super admin limit reached. Maximum ${MAX_SUPER_ADMINS} super admins allowed.`,
          currentSuperAdmins: superAdminCount,
          maxAllowed: MAX_SUPER_ADMINS,
        });
        return;
      }
    }

    // Create user
    try {
      const user = await authService.createUser(email, password, name, roles);

      if (!user) {
        res.status(400).json({
          success: false,
          message: "Failed to create user. Email might already exist.",
        });
        return;
      }

      // Don't send password
      const { password: _, ...userWithoutPassword } = user;

      logger.info("New user registered", {
        userId: user.id,
        email: user.email,
        roles: user.roles,
        createdBy: req.user?.email,
        important: true,
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: userWithoutPassword,
      });
    } catch (error) {
      // Handle super admin limit error
      if (
        error instanceof Error &&
        error.message.includes("Super admin limit")
      ) {
        res.status(403).json({
          success: false,
          message: error.message,
        });
        return;
      }

      throw error;
    }
  } catch (error) {
    logger.error("Registration error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Registration failed due to server error",
    });
  }
};

/**
 * Revoke all user sessions (revoke all refresh tokens)
 * POST /api/auth/revoke-sessions
 */
export const revokeSessions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const count = DatabaseService.revokeAllUserRefreshTokens(req.user.userId);

    logger.info("All sessions revoked", {
      userId: req.user.userId,
      email: req.user.email,
      count,
      important: true,
    });

    res.status(200).json({
      success: true,
      message: `${count} session(s) revoked successfully. Please login again.`,
      count,
    });
  } catch (error) {
    logger.error("Revoke sessions error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Failed to revoke sessions",
    });
  }
};
