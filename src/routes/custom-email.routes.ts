// src/routes/custom-email.routes.ts
import { Router } from "express";
import {
  sendCustomEmail,
  sendBulkCustomEmail,
  previewCustomEmail,
  sendCustomEmailMultipart,
  sendBulkCustomEmailMultipart,
  testSMTPConnection,
  getSMTPStatus,
} from "../controllers/custom-email.controller";
import { uploadMultiple } from "../config/multer.config";

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

/**
 * @route   GET /api/custom-emails/test-connection
 * @desc    Test SMTP connection and configuration
 * @access  Private
 */
router.get("/test-connection", testSMTPConnection);

/**
 * @route   GET /api/custom-emails/smtp-status
 * @desc    Get SMTP configuration status
 * @access  Private
 */
router.get("/smtp-status", getSMTPStatus);

router.post("/send-multipart", uploadMultiple, sendCustomEmailMultipart);
router.post("/send-bulk-multipart", uploadMultiple, sendBulkCustomEmailMultipart);

export default router;
