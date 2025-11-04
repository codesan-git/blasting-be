// src/routes/permission.routes.ts
import { Router } from "express";
import {
  getAllPermissions,
  getRolePermissions,
  getAllRolePermissions,
  addRolePermission,
  removeRolePermission,
  setRolePermissions,
  getPermissionStats,
} from "../controllers/permission.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../types/auth.types";

const router = Router();

// All routes require authentication and super admin role
router.use(authenticate);
router.use(requireRole(UserRole.SUPER_ADMIN));

// Get all available permissions
router.get("/", getAllPermissions);

// Get permission statistics
router.get("/stats", getPermissionStats);

// Get all roles with their permissions
router.get("/roles", getAllRolePermissions);

// Get specific role permissions
router.get("/roles/:role", getRolePermissions);

// Add permission to role
router.post("/roles/:role", addRolePermission);

// Set all permissions for role (replace)
router.put("/roles/:role", setRolePermissions);

// Remove permission from role
router.delete("/roles/:role/:permission", removeRolePermission);

export default router;
