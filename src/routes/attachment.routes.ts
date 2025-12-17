// src/routes/attachment.routes.ts
import { Router } from "express";
import {
  uploadAttachment,
  uploadMultipleAttachments,
  uploadAttachmentBase64,
  deleteAttachment,
  cleanupOldAttachments,
} from "../controllers/attachment.controller";
import { uploadSingle, uploadMultiple } from "../config/multer.config";

const router = Router();

/**
 * @route   POST /api/attachments/upload
 * @desc    Upload single file (multipart/form-data)
 * @access  Private
 * @form    file: File
 */
router.post("/upload", uploadSingle, uploadAttachment);

/**
 * @route   POST /api/attachments/upload-multiple
 * @desc    Upload multiple files (multipart/form-data)
 * @access  Private
 * @form    files: File[]
 */
router.post("/upload-multiple", uploadMultiple, uploadMultipleAttachments);

/**
 * @route   POST /api/attachments/upload-base64
 * @desc    Upload file using base64 (JSON) - LEGACY
 * @access  Private
 * @body    { filename, content, contentType }
 */
router.post("/upload-base64", uploadAttachmentBase64);

/**
 * @route   DELETE /api/attachments/:filename
 * @desc    Delete attachment by filename
 * @access  Private
 */
router.delete("/:filename", deleteAttachment);

/**
 * @route   POST /api/attachments/cleanup
 * @desc    Cleanup old attachments
 * @access  Private
 * @body    { daysOld: number }
 */
router.post("/cleanup", cleanupOldAttachments);

export default router;
