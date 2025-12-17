// src/routes/custom-email.routes.ts
import { Router } from "express";
import {
  sendCustomEmail,
  sendBulkCustomEmail,
  previewCustomEmail,
  sendCustomEmailMultipart,
  sendBulkCustomEmailMultipart,
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

router.post("/send-multipart", uploadMultiple, sendCustomEmailMultipart);
router.post("/send-bulk-multipart", uploadMultiple, sendBulkCustomEmailMultipart);

export default router;
