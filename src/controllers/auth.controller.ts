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
import ResponseHelper from "../utils/api-response.helper";

/**
 * Login endpoint
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      ResponseHelper.error(res, "Email and password are required");
      return;
    }

    const result = await authService.login(email, password);

    if (!result.success) {
      ResponseHelper.error(res, result.message);
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

    ResponseHelper.success(res, result);
  } catch (error) {
    logger.error("Login error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    ResponseHelper.error(res, "Login failed due to server error");
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
      ResponseHelper.error(res, "Refresh token is required");
      return;
    }

    const result = await authService.refreshAccessToken(refreshToken);

    if (!result.success) {
      ResponseHelper.error(res, result.message);
      return;
    }

    ResponseHelper.success(res, result);
  } catch (error) {
    logger.error("Token refresh error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    ResponseHelper.error(res, "Failed to refresh token");
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
      ResponseHelper.error(res, "Refresh token is required");
      return;
    }

    const success = await authService.logout(refreshToken);

    logger.info("User logged out", {
      userId: req.user?.userId,
      email: req.user?.email,
      success,
      important: true,
    });

    ResponseHelper.success(res, {
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error("Logout error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    ResponseHelper.error(res, "Logout failed");
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
      ResponseHelper.error(res, "Authentication required");
      return;
    }

    const user = DatabaseService.getUserById(req.user.userId);

    if (!user) {
      ResponseHelper.error(res, "User not found");
      return;
    }

    // Get user permissions
    const permissions = getUserPermissions(user.roles);

    // Don't send password
    const { password, ...userWithoutPassword } = user;

    ResponseHelper.success(res, {
      user: {
        ...userWithoutPassword,
        permissions,
      },
    });
  } catch (error) {
    logger.error("Get profile error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    ResponseHelper.error(res, "Failed to get profile");
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
      ResponseHelper.error(res, "Authentication required");
      return;
    }

    const { currentPassword, newPassword }: ChangePasswordRequest = req.body;

    if (!currentPassword || !newPassword) {
      ResponseHelper.error(
        res,
        "Current password and new password are required"
      );
      return;
    }

    if (newPassword.length < 8) {
      ResponseHelper.error(
        res,
        "New password must be at least 8 characters long"
      );
      return;
    }

    const success = await authService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword
    );

    if (!success) {
      ResponseHelper.error(res, "Current password is incorrect");
      return;
    }

    logger.info("Password changed", {
      userId: req.user.userId,
      email: req.user.email,
      important: true,
    });

    ResponseHelper.success(res, {
      success: true,
      message: "Password changed successfully. Please login again.",
    });
  } catch (error) {
    logger.error("Change password error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    ResponseHelper.error(res, "Failed to change password");
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
      ResponseHelper.error(
        res,
        "Email, password, name, and roles are required"
      );
      return;
    }

    if (password.length < 8) {
      ResponseHelper.error(res, "Password must be at least 8 characters long");
      return;
    }

    if (!Array.isArray(roles) || roles.length === 0) {
      ResponseHelper.error(res, "Roles must be a non-empty array");
      return;
    }

    // Validate roles
    const validRoles = Object.values(UserRole);
    const invalidRoles = roles.filter((role) => !validRoles.includes(role));

    if (invalidRoles.length > 0) {
      ResponseHelper.error(res, `Invalid roles: ${invalidRoles.join(", ")}`);
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

        ResponseHelper.error(
          res,
          `Super admin limit reached. Maximum ${MAX_SUPER_ADMINS} super admins allowed.`
        );
        return;
      }
    }

    // Create user
    try {
      const user = await authService.createUser(email, password, name, roles);

      if (!user) {
        ResponseHelper.error(
          res,
          "Failed to create user. Email might already exist."
        );
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

      ResponseHelper.success(res, {
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
        ResponseHelper.error(res, error.message);
        return;
      }

      throw error;
    }
  } catch (error) {
    logger.error("Registration error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    ResponseHelper.error(res, "Registration failed due to server error");
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
      ResponseHelper.error(res, "Authentication required");
      return;
    }

    const count = DatabaseService.revokeAllUserRefreshTokens(req.user.userId);

    logger.info("All sessions revoked", {
      userId: req.user.userId,
      email: req.user.email,
      count,
      important: true,
    });

    ResponseHelper.success(res, {
      success: true,
      message: `${count} session(s) revoked successfully. Please login again.`,
      count,
    });
  } catch (error) {
    logger.error("Revoke sessions error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    ResponseHelper.error(res, "Failed to revoke sessions");
  }
};
