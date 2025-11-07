// src/controllers/permission.controller.ts
import { Request, Response } from "express";
import DatabaseService from "../services/database.service";
import { Permission } from "../types/auth.types";
import logger from "../utils/logger";
import ResponseHelper from "../utils/api-response.helper";

/**
 * Get all available permissions
 * GET /api/permissions
 */
export const getAllPermissions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const allPermissions = Object.values(Permission);

    ResponseHelper.success(res, {
      success: true,
      count: allPermissions.length,
      permissions: allPermissions,
    });
  } catch (error) {
    logger.error("Get all permissions error", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId: req.user?.userId,
    });

    ResponseHelper.error(res, "Failed to get permissions");
  }
};

/**
 * Get role permissions
 * GET /api/permissions/roles/:role
 */
export const getRolePermissions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { role } = req.params;

    const permissions = await DatabaseService.getRolePermissions(role);

    ResponseHelper.success(res, {
      success: true,
      role,
      count: permissions.length,
      permissions,
    });
  } catch (error) {
    logger.error("Get role permissions error", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId: req.user?.userId,
      role: req.params.role,
    });

    ResponseHelper.error(res, "Failed to get role permissions");
  }
};

/**
 * Get all roles with their permissions
 * GET /api/permissions/roles
 */
export const getAllRolePermissions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const rolePermissions = await DatabaseService.getAllRolePermissions();

    ResponseHelper.success(res, {
      success: true,
      roles: Object.keys(rolePermissions),
      permissions: rolePermissions,
    });
  } catch (error) {
    logger.error("Get all role permissions error", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId: req.user?.userId,
    });

    ResponseHelper.error(res, "Failed to get role permissions");
  }
};

/**
 * Add permission to role
 * POST /api/permissions/roles/:role
 */
export const addRolePermission = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { role } = req.params;
    const { permission } = req.body;

    if (!permission) {
      ResponseHelper.error(res, "Permission is required");
      return;
    }

    // Validate permission
    const validPermissions = Object.values(Permission);
    if (!validPermissions.includes(permission)) {
      ResponseHelper.error(res, `Invalid permission: ${permission}`);
      return;
    }

    // Add permission
    const success = await DatabaseService.addRolePermission(
      role,
      permission,
      req.user?.userId
    );

    if (!success) {
      ResponseHelper.error(res, "Permission already exists for this role");
      return;
    }

    logger.info("Permission added to role", {
      role,
      permission,
      addedBy: req.user?.email,
      userId: req.user?.userId,
      important: true,
    });

    ResponseHelper.success(res, {
      success: true,
      message: "Permission added successfully",
      role,
      permission,
    });
  } catch (error) {
    logger.error("Add role permission error", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId: req.user?.userId,
      role: req.params.role,
    });

    ResponseHelper.error(res, "Failed to add permission");
  }
};

/**
 * Remove permission from role
 * DELETE /api/permissions/roles/:role/:permission
 */
export const removeRolePermission = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { role, permission } = req.params;

    // Remove permission
    const success = DatabaseService.removeRolePermission(role, permission);

    if (!success) {
      ResponseHelper.error(res, "Permission not found for this role");
      return;
    }

    logger.info("Permission removed from role", {
      role,
      permission,
      removedBy: req.user?.email,
      userId: req.user?.userId,
      important: true,
    });

    ResponseHelper.success(res, {
      success: true,
      message: "Permission removed successfully",
      role,
      permission,
    });
  } catch (error) {
    logger.error("Remove role permission error", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId: req.user?.userId,
      role: req.params.role,
      permission: req.params.permission,
    });

    ResponseHelper.error(res, "Failed to remove permission");
  }
};

/**
 * Set all permissions for a role (replace existing)
 * PUT /api/permissions/roles/:role
 */
export const setRolePermissions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      ResponseHelper.error(res, "Permissions must be an array");
      return;
    }

    // Validate all permissions
    const validPermissions = Object.values(Permission);
    const invalidPermissions = permissions.filter(
      (p) => !validPermissions.includes(p)
    );

    if (invalidPermissions.length > 0) {
      ResponseHelper.error(
        res,
        `Invalid permissions: ${invalidPermissions.join(", ")}`
      );
      return;
    }

    // Get old permissions for logging
    const oldPermissions = await DatabaseService.getRolePermissions(role);

    // Set new permissions
    const success = await DatabaseService.setRolePermissions(
      role,
      permissions,
      req.user?.userId
    );

    if (!success) {
      ResponseHelper.error(res, "Failed to set role permissions");
      return;
    }

    // Calculate changes
    const added = permissions.filter((p) => !oldPermissions.includes(p));
    const removed = oldPermissions.filter((p) => !permissions.includes(p));

    logger.info("Role permissions updated", {
      role,
      oldCount: oldPermissions.length,
      newCount: permissions.length,
      added,
      removed,
      updatedBy: req.user?.email,
      userId: req.user?.userId,
      important: true,
    });

    ResponseHelper.success(res, {
      success: true,
      message: "Role permissions updated successfully",
      role,
      permissions,
      changes: {
        added,
        removed,
      },
    });
  } catch (error) {
    logger.error("Set role permissions error", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId: req.user?.userId,
      role: req.params.role,
    });

    ResponseHelper.error(res, "Failed to set role permissions");
  }
};

/**
 * Get permission usage statistics
 * GET /api/permissions/stats
 */
export const getPermissionStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const stats = await DatabaseService.getPermissionStats();

    ResponseHelper.success(res, {
      success: true,
      count: stats.length,
      stats,
    });
  } catch (error) {
    logger.error("Get permission stats error", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId: req.user?.userId,
    });

    ResponseHelper.error(res, "Failed to get permission statistics");
  }
};
