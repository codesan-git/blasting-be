// src/controllers/attachment.controller.ts
import { Request, Response } from "express";
import { AttachmentService } from "../services/attachment.service";
import logger from "../utils/logger";
import ResponseHelper from "../utils/api-response.helper";

/**
 * Upload attachment (base64)
 * POST /api/attachments/upload
 * Body: {
 *   filename: "document.pdf",
 *   content: "base64string...",
 *   contentType: "application/pdf"
 * }
 */
export const uploadAttachment = async (
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

    logger.info("Attachment uploaded", { filename });

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
 * Upload multiple attachments
 * POST /api/attachments/upload-multiple
 * Body: {
 *   attachments: [
 *     { filename: "file1.pdf", content: "base64..." },
 *     { filename: "file2.png", content: "base64..." }
 *   ]
 * }
 */
export const uploadMultipleAttachments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { attachments } = req.body;

    if (!Array.isArray(attachments) || attachments.length === 0) {
      ResponseHelper.error(res, "attachments array is required");
      return;
    }

    const savedAttachments =
      await AttachmentService.saveMultipleBase64(attachments);

    logger.info("Multiple attachments uploaded", {
      count: savedAttachments.length,
    });

    ResponseHelper.success(
      res,
      {
        count: savedAttachments.length,
        attachments: savedAttachments.map((a) => ({
          filename: a.filename,
          path: a.path,
          contentType: a.contentType,
        })),
      },
      "Attachments uploaded successfully",
    );
  } catch (error) {
    logger.error("Error uploading multiple attachments:", error);
    ResponseHelper.error(res, "Failed to upload attachments");
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
    const uploadDir = process.env.UPLOAD_DIR || "./uploads/attachments";
    const filePath = `${uploadDir}/${filename}`;

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
