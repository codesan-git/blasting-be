// src/controllers/attachment.controller.ts
import { Request, Response } from "express";
import path from "path";
import { AttachmentService } from "../services/attachment.service";
import logger from "../utils/logger";
import ResponseHelper from "../utils/api-response.helper";

/**
 * Upload single attachment (multipart/form-data)
 * POST /api/attachments/upload
 * Form data: file (single file)
 */
export const uploadAttachment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.file) {
      ResponseHelper.error(res, "No file uploaded");
      return;
    }

    const file = req.file;

    logger.info("File uploaded successfully", {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    });

    ResponseHelper.success(
      res,
      {
        filename: file.originalname,
        savedAs: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        url: `/uploads/attachments/${file.filename}`, // Public URL
      },
      "File uploaded successfully",
    );
  } catch (error) {
    logger.error("Error uploading file:", error);
    ResponseHelper.error(
      res,
      error instanceof Error ? error.message : "Failed to upload file",
    );
  }
};

/**
 * Upload multiple attachments (multipart/form-data)
 * POST /api/attachments/upload-multiple
 * Form data: files (multiple files)
 */
export const uploadMultipleAttachments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      ResponseHelper.error(res, "No files uploaded");
      return;
    }

    const files = req.files as Express.Multer.File[];

    const uploadedFiles = files.map((file) => ({
      filename: file.originalname,
      savedAs: file.filename,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      url: `/uploads/attachments/${file.filename}`,
    }));

    logger.info("Multiple files uploaded", {
      count: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
    });

    ResponseHelper.success(
      res,
      {
        count: uploadedFiles.length,
        files: uploadedFiles,
      },
      `${uploadedFiles.length} files uploaded successfully`,
    );
  } catch (error) {
    logger.error("Error uploading multiple files:", error);
    ResponseHelper.error(res, "Failed to upload files");
  }
};

/**
 * Upload attachment (base64) - LEGACY
 * POST /api/attachments/upload-base64
 * Body: {
 *   filename: "document.pdf",
 *   content: "base64string...",
 *   contentType: "application/pdf"
 * }
 */
export const uploadAttachmentBase64 = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { filename, content, contentType } = req.body;

    if (!filename || !content) {
      ResponseHelper.error(res, "filename and content are required");
      return;
    }

    const attachment = await AttachmentService.processAttachment(
      { filename, content, contentType },
      {
        maxSizeMB: 10,
        saveToFileSystem: true,
      },
    );

    logger.info("Attachment uploaded (base64)", { filename });

    ResponseHelper.success(
      res,
      {
        filename: attachment.filename,
        path: attachment.path,
        contentType: attachment.contentType,
      },
      "Attachment uploaded successfully",
    );
  } catch (error) {
    logger.error("Error uploading attachment:", error);
    ResponseHelper.error(
      res,
      error instanceof Error ? error.message : "Failed to upload attachment",
    );
  }
};

/**
 * Delete attachment
 * DELETE /api/attachments/:filename
 */
export const deleteAttachment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { filename } = req.params;
    const uploadDir = process.env.UPLOAD_DIR 
      ? path.resolve(process.env.UPLOAD_DIR)
      : path.join(process.cwd(), "uploads", "attachments");
    const filePath = path.join(uploadDir, filename);

    await AttachmentService.deleteFile(filePath);

    logger.info("Attachment deleted", { filename });

    ResponseHelper.success(res, null, "Attachment deleted successfully");
  } catch (error) {
    logger.error("Error deleting attachment:", error);
    ResponseHelper.error(res, "Failed to delete attachment");
  }
};

/**
 * Cleanup old attachments
 * POST /api/attachments/cleanup
 * Body: { daysOld: 30 }
 */
export const cleanupOldAttachments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { daysOld = 30 } = req.body;

    const deletedCount = await AttachmentService.cleanupOldAttachments(daysOld);

    logger.info("Attachment cleanup completed", { deletedCount, daysOld });

    ResponseHelper.success(
      res,
      { deletedCount, daysOld },
      "Old attachments cleaned up successfully",
    );
  } catch (error) {
    logger.error("Error cleaning up attachments:", error);
    ResponseHelper.error(res, "Failed to cleanup attachments");
  }
};
