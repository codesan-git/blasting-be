// src/routes/auth.routes.ts
import { Router } from "express";
import {
  login,
  refreshToken,
  logout,
  getProfile,
  changePassword,
  register,
  revokeSessions,
} from "../controllers/auth.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../types/auth.types";

const router = Router();

// Public routes (no authentication required)
router.post("/login", login);
router.post("/refresh", refreshToken);

// Protected routes (authentication required)
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getProfile);
router.post("/change-password", authenticate, changePassword);
router.post("/revoke-sessions", authenticate, revokeSessions);

// Admin only routes
router.post(
  "/register",
  authenticate,
  requireRole(UserRole.SUPER_ADMIN),
  register
);

export default router;
