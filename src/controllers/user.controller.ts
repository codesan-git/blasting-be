// src/controllers/user.controller.ts
import { Request, Response } from "express";
import DatabaseService from "../services/database.service";
import authService from "../services/auth.service";
import {
  UpdateUserRequest,
  UserRole,
  getUserPermissions,
} from "../types/auth.types";
import logger from "../utils/logger";

/**
 * Get all users
 * GET /api/users
 */
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = DatabaseService.getAllUsers();

    // Remove passwords from response
    const usersWithoutPassword = users.map((user) => {
      const { password, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        permissions: getUserPermissions(user.roles),
      };
    });

    res.status(200).json({
      success: true,
      count: usersWithoutPassword.length,
      users: usersWithoutPassword,
    });
  } catch (error) {
    logger.error("Get all users error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Failed to get users",
    });
  }
};

/**
 * Get user by ID
 * GET /api/users/:id
 */
export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = DatabaseService.getUserById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      user: {
        ...userWithoutPassword,
        permissions: getUserPermissions(user.roles),
      },
    });
  } catch (error) {
    logger.error("Get user by ID error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Failed to get user",
    });
  }
};

/**
 * Update user - WITH SUPER ADMIN LIMIT CHECK
 * PUT /api/users/:id
 */
export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updates: UpdateUserRequest = req.body;

    // Check if user exists
    const user = DatabaseService.getUserById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Validate roles if provided
    if (updates.roles) {
      const validRoles = Object.values(UserRole);
      const invalidRoles = updates.roles.filter(
        (role) => !validRoles.includes(role)
      );

      if (invalidRoles.length > 0) {
        res.status(400).json({
          success: false,
          message: `Invalid roles: ${invalidRoles.join(", ")}`,
          validRoles,
        });
        return;
      }

      // 🔒 CHECK: If adding super_admin role
      const wasNotSuperAdmin = !user.roles.includes(UserRole.SUPER_ADMIN);
      const willBeSuperAdmin = updates.roles.includes(UserRole.SUPER_ADMIN);

      if (wasNotSuperAdmin && willBeSuperAdmin) {
        const superAdminCount = DatabaseService.countSuperAdmins();
        const MAX_SUPER_ADMINS = parseInt(
          process.env.MAX_SUPER_ADMINS || "3",
          10
        );

        if (superAdminCount >= MAX_SUPER_ADMINS) {
          logger.warn("Cannot promote user to super admin - limit reached", {
            userId: id,
            email: user.email,
            currentCount: superAdminCount,
            maxAllowed: MAX_SUPER_ADMINS,
            attemptedBy: req.user?.email,
            important: true,
          });

          res.status(403).json({
            success: false,
            message: `Cannot add super admin role. Maximum ${MAX_SUPER_ADMINS} super admins allowed.`,
            currentSuperAdmins: superAdminCount,
            maxAllowed: MAX_SUPER_ADMINS,
          });
          return;
        }
      }

      // 🔒 PROTECT: Prevent removing super_admin if it's the last one
      const wasSuperAdmin = user.roles.includes(UserRole.SUPER_ADMIN);
      const willNotBeSuperAdmin = !updates.roles.includes(UserRole.SUPER_ADMIN);

      if (wasSuperAdmin && willNotBeSuperAdmin) {
        const superAdminCount = DatabaseService.countSuperAdmins();
        const MIN_SUPER_ADMINS = 1;

        if (superAdminCount <= MIN_SUPER_ADMINS) {
          logger.warn("Cannot remove last super admin", {
            userId: id,
            email: user.email,
            currentCount: superAdminCount,
            attemptedBy: req.user?.email,
            important: true,
          });

          res.status(403).json({
            success: false,
            message:
              "Cannot remove super admin role from the last super admin. At least one super admin must exist.",
            currentSuperAdmins: superAdminCount,
            minRequired: MIN_SUPER_ADMINS,
          });
          return;
        }
      }
    }

    // Check if email already exists (if updating email)
    if (updates.email && updates.email !== user.email) {
      const existingUser = DatabaseService.getUserByEmail(updates.email);

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: "Email already exists",
        });
        return;
      }
    }

    // Update user
    const success = DatabaseService.updateUser(id, updates);

    if (!success) {
      res.status(500).json({
        success: false,
        message: "Failed to update user",
      });
      return;
    }

    // Get updated user
    const updatedUser = DatabaseService.getUserById(id);

    if (!updatedUser) {
      res.status(500).json({
        success: false,
        message: "Failed to get updated user",
      });
      return;
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    logger.info("User updated", {
      userId: id,
      updatedBy: req.user?.email,
      updates: Object.keys(updates),
      important: true,
    });

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        ...userWithoutPassword,
        permissions: getUserPermissions(updatedUser.roles),
      },
    });
  } catch (error) {
    logger.error("Update user error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
};

/**
 * Delete user
 * DELETE /api/users/:id
 */
export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = DatabaseService.getUserById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Prevent deleting yourself
    if (req.user && req.user.userId === id) {
      res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
      return;
    }

    // Delete user
    const success = DatabaseService.deleteUser(id);

    if (!success) {
      res.status(500).json({
        success: false,
        message: "Failed to delete user",
      });
      return;
    }

    logger.info("User deleted", {
      userId: id,
      email: user.email,
      deletedBy: req.user?.email,
      important: true,
    });

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    logger.error("Delete user error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
};

/**
 * Deactivate user (soft delete)
 * POST /api/users/:id/deactivate
 */
export const deactivateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = DatabaseService.getUserById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Prevent deactivating yourself
    if (req.user && req.user.userId === id) {
      res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account",
      });
      return;
    }

    // Deactivate user
    const success = DatabaseService.deactivateUser(id);

    if (!success) {
      res.status(500).json({
        success: false,
        message: "Failed to deactivate user",
      });
      return;
    }

    // Revoke all sessions
    DatabaseService.revokeAllUserRefreshTokens(id);

    logger.info("User deactivated", {
      userId: id,
      email: user.email,
      deactivatedBy: req.user?.email,
      important: true,
    });

    res.status(200).json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error) {
    logger.error("Deactivate user error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Failed to deactivate user",
    });
  }
};

/**
 * Activate user
 * POST /api/users/:id/activate
 */
export const activateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = DatabaseService.getUserById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Activate user
    const success = DatabaseService.activateUser(id);

    if (!success) {
      res.status(500).json({
        success: false,
        message: "Failed to activate user",
      });
      return;
    }

    logger.info("User activated", {
      userId: id,
      email: user.email,
      activatedBy: req.user?.email,
      important: true,
    });

    res.status(200).json({
      success: true,
      message: "User activated successfully",
    });
  } catch (error) {
    logger.error("Activate user error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Failed to activate user",
    });
  }
};

/**
 * Reset user password (admin only)
 * POST /api/users/:id/reset-password
 */
export const resetUserPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      res.status(400).json({
        success: false,
        message: "New password is required",
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
      return;
    }

    // Check if user exists
    const user = DatabaseService.getUserById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Hash new password
    const hashedPassword = await authService.hashPassword(newPassword);

    // Update password
    const success = DatabaseService.updateUserPassword(id, hashedPassword);

    if (!success) {
      res.status(500).json({
        success: false,
        message: "Failed to reset password",
      });
      return;
    }

    // Revoke all sessions
    DatabaseService.revokeAllUserRefreshTokens(id);

    logger.info("User password reset", {
      userId: id,
      email: user.email,
      resetBy: req.user?.email,
      important: true,
    });

    res.status(200).json({
      success: true,
      message: "Password reset successfully. User must login again.",
    });
  } catch (error) {
    logger.error("Reset password error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
};
