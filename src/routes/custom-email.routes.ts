// src/routes/custom-email.routes.ts
import { Router } from "express";
import {
  sendCustomEmail,
  sendBulkCustomEmail,
  previewCustomEmail,
} from "../controllers/custom-email.controller";

const router = Router();

/**
 * @route   POST /api/custom-emails/send
 * @desc    Send custom email with full control
 * @access  Private (add authentication middleware if needed)
 */
router.post("/send", sendCustomEmail);

/**
 * @route   POST /api/custom-emails/send-bulk
 * @desc    Send same custom email to multiple recipients
 * @access  Private
 */
router.post("/send-bulk", sendBulkCustomEmail);

/**
 * @route   POST /api/custom-emails/preview
 * @desc    Preview and validate custom email without sending
 * @access  Private
 */
router.post("/preview", previewCustomEmail);

export default router;
