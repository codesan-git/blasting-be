// src/routes/user.routes.ts
import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  deactivateUser,
  activateUser,
  resetUserPassword,
} from "../controllers/user.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../types/auth.types";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all users (super admin only)
router.get("/", requireRole(UserRole.SUPER_ADMIN), getAllUsers);

// Get user by ID (super admin only)
router.get("/:id", requireRole(UserRole.SUPER_ADMIN), getUserById);

// Update user (super admin only)
router.put("/:id", requireRole(UserRole.SUPER_ADMIN), updateUser);

// Delete user (super admin only)
router.delete("/:id", requireRole(UserRole.SUPER_ADMIN), deleteUser);

// Deactivate user (super admin only)
router.post(
  "/:id/deactivate",
  requireRole(UserRole.SUPER_ADMIN),
  deactivateUser
);

// Activate user (super admin only)
router.post("/:id/activate", requireRole(UserRole.SUPER_ADMIN), activateUser);

// Reset user password (super admin only)
router.post(
  "/:id/reset-password",
  requireRole(UserRole.SUPER_ADMIN),
  resetUserPassword
);

export default router;
