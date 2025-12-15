// src/services/attachment.service.ts
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { TemplateAttachment } from "../types/template.types";
import logger from "../utils/logger";

export class AttachmentService {
  private static uploadDir = process.env.UPLOAD_DIR || "./uploads/attachments";

  /**
   * Initialize upload directory
   */
  static async init(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      logger.info("Attachment upload directory initialized", {
        path: this.uploadDir,
      });
    } catch (error) {
      logger.error("Failed to create upload directory", error);
      throw error;
    }
  }

  /**
   * Generate unique filename
   */
  private static generateFilename(originalFilename: string): string {
    const ext = path.extname(originalFilename);
    const hash = crypto.randomBytes(16).toString("hex");
    const timestamp = Date.now();
    return `${timestamp}-${hash}${ext}`;
  }

  /**
   * Save base64 content to file system
   */
  static async saveBase64ToFile(
    filename: string,
    base64Content: string,
    contentType?: string,
  ): Promise<TemplateAttachment> {
    try {
      // Remove data URL prefix if exists (data:image/png;base64,...)
      const base64Data = base64Content.replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const uniqueFilename = this.generateFilename(filename);
      const filePath = path.join(this.uploadDir, uniqueFilename);

      await fs.writeFile(filePath, buffer);

      logger.info("Attachment saved to file system", {
        filename,
        path: filePath,
        size: buffer.length,
      });

      return {
        filename,
        path: filePath,
        contentType: contentType || this.getContentType(filename),
      };
    } catch (error) {
      logger.error("Failed to save attachment", { filename, error });
      throw new Error(`Failed to save attachment: ${filename}`);
    }
  }

  /**
   * Save multiple base64 attachments
   */
  static async saveMultipleBase64(
    attachments: Array<{
      filename: string;
      content: string;
      contentType?: string;
    }>,
  ): Promise<TemplateAttachment[]> {
    const savedAttachments: TemplateAttachment[] = [];

    for (const attachment of attachments) {
      const saved = await this.saveBase64ToFile(
        attachment.filename,
        attachment.content,
        attachment.contentType,
      );
      savedAttachments.push(saved);
    }

    return savedAttachments;
  }

  /**
   * Read file as base64
   */
  static async readFileAsBase64(filePath: string): Promise<string> {
    try {
      const buffer = await fs.readFile(filePath);
      return buffer.toString("base64");
    } catch (error) {
      logger.error("Failed to read attachment file", { filePath, error });
      throw new Error(`Failed to read file: ${filePath}`);
    }
  }

  /**
   * Delete attachment file
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      logger.info("Attachment file deleted", { path: filePath });
    } catch (error) {
      logger.error("Failed to delete attachment file", { filePath, error });
    }
  }

  /**
   * Get content type from filename extension
   */
  private static getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".txt": "text/plain",
      ".csv": "text/csv",
      ".zip": "application/zip",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }

  /**
   * Validate attachment size
   */
  static validateSize(base64Content: string, maxSizeMB: number = 10): boolean {
    const base64Data = base64Content.replace(/^data:.*?;base64,/, "");
    const sizeInBytes = Buffer.from(base64Data, "base64").length;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInMB > maxSizeMB) {
      logger.warn("Attachment size exceeds limit", {
        sizeMB: sizeInMB,
        maxSizeMB,
      });
      return false;
    }

    return true;
  }

  /**
   * Validate attachment type
   */
  static validateType(
    filename: string,
    allowedTypes: string[] = [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".png",
      ".jpg",
      ".jpeg",
      ".txt",
      ".csv",
    ],
  ): boolean {
    const ext = path.extname(filename).toLowerCase();
    return allowedTypes.includes(ext);
  }

  /**
   * Process attachment - validate and save
   */
  static async processAttachment(
    attachment: {
      filename: string;
      content?: string;
      path?: string;
      url?: string;
      contentType?: string;
    },
    options: {
      maxSizeMB?: number;
      allowedTypes?: string[];
      saveToFileSystem?: boolean;
    } = {},
  ): Promise<TemplateAttachment> {
    const { maxSizeMB = 10, allowedTypes, saveToFileSystem = true } = options;

    // Validate filename
    if (!attachment.filename) {
      throw new Error("Attachment filename is required");
    }

    // Validate type
    if (allowedTypes && !this.validateType(attachment.filename, allowedTypes)) {
      throw new Error(
        `File type not allowed: ${path.extname(attachment.filename)}`,
      );
    }

    // If content is provided (base64)
    if (attachment.content) {
      // Validate size
      if (!this.validateSize(attachment.content, maxSizeMB)) {
        throw new Error(`Attachment size exceeds ${maxSizeMB}MB limit`);
      }

      // Save to file system if requested
      if (saveToFileSystem) {
        return await this.saveBase64ToFile(
          attachment.filename,
          attachment.content,
          attachment.contentType,
        );
      }

      // Return as-is (base64)
      return {
        filename: attachment.filename,
        content: attachment.content,
        contentType:
          attachment.contentType || this.getContentType(attachment.filename),
      };
    }

    // If path or url is provided, return as-is
    if (attachment.path || attachment.url) {
      return {
        filename: attachment.filename,
        path: attachment.path,
        url: attachment.url,
        contentType:
          attachment.contentType || this.getContentType(attachment.filename),
      };
    }

    throw new Error(
      "Attachment must have either content, path, or url property",
    );
  }

  /**
   * Clean up old attachments (run as cron job)
   */
  static async cleanupOldAttachments(daysOld: number = 30): Promise<number> {
    try {
      const files = await fs.readdir(this.uploadDir);
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtimeMs > maxAge) {
          await this.deleteFile(filePath);
          deletedCount++;
        }
      }

      logger.info("Old attachments cleaned up", {
        deletedCount,
        daysOld,
      });

      return deletedCount;
    } catch (error) {
      logger.error("Failed to cleanup old attachments", error);
      throw error;
    }
  }
}
