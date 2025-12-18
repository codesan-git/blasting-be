// src/controllers/custom-email.controller.ts
import { Request, Response } from "express";
import { CustomEmailService } from "../services/custom-email.service";
import { SendCustomEmailRequest, CustomEmailRecipient } from "../types/custom-email.types";
import { TemplateAttachment } from "../types/template.types";
import logger from "../utils/logger";
import ResponseHelper from "../utils/api-response.helper";

/**
 * Send custom email (JSON)
 * POST /api/custom-emails/send
 * Body: {
 *   from: "sender@example.com",
 *   to: [{ email: "user@example.com", name: "John Doe" }],
 *   cc: [{ email: "cc@example.com" }],
 *   bcc: [{ email: "bcc@example.com" }],
 *   subject: "Custom Email Subject",
 *   body: "<h1>Hello</h1><p>This is custom email body with HTML support</p>",
 *   attachments: [
 *     {
 *       filename: "document.pdf",
 *       content: "base64string...",
 *       contentType: "application/pdf"
 *     }
 *   ],
 *   replyTo: "reply@example.com"
 * }
 */
export const sendCustomEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const request: SendCustomEmailRequest = req.body;

    // Validate request
    const validation = CustomEmailService.validateRequest(request);
    if (!validation.valid) {
      ResponseHelper.badRequest(
        res,
        `Validation failed: ${validation.errors.join(", ")}`,
      );
      return;
    }

    // Send email
    const result = await CustomEmailService.sendCustomEmail(request);

    if (result.success) {
      logger.info("Custom email sent", {
        messageId: result.messageId,
        recipients: result.recipients.to,
      });

      ResponseHelper.success(
        res,
        {
          messageId: result.messageId,
          recipients: result.recipients,
          scheduledAt: result.scheduledAt,
        },
        "Custom email sent successfully",
      );
    } else {
      ResponseHelper.badRequest(res, result.error || "Failed to send custom email");
    }
  } catch (error) {
    logger.error("Error sending custom email:", error);
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : "Failed to send custom email",
    );
  }
};

/**
 * Send custom email with multipart/form-data
 * POST /api/custom-emails/send-multipart
 * Form data:
 *   - from: string (optional)
 *   - to: string (email, required)
 *   - toName: string (optional)
 *   - cc: string (optional)
 *   - ccName: string (optional)
 *   - bcc: string (optional)
 *   - bccName: string (optional)
 *   - replyTo: string (optional)
 *   - subject: string (required)
 *   - body: string (HTML, required)
 *   - files: File[] (optional, multiple files)
 */
export const sendCustomEmailMultipart = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Handle case where req.body might be undefined with multipart/form-data
    const body = req.body || {};
    const {
      from,
      to,
      toName,
      cc,
      ccName,
      bcc,
      bccName,
      replyTo,
      subject,
      body: emailBody,
    } = body;

    // Validate required fields
    if (!to || !subject || !emailBody) {
      ResponseHelper.badRequest(
        res,
        "Required fields: to, subject, body",
      );
      return;
    }

    // Parse recipients
    const recipients: CustomEmailRecipient[] = [
      { email: to, name: toName || undefined },
    ];

    const ccRecipients: CustomEmailRecipient[] = cc
      ? [{ email: cc, name: ccName || undefined }]
      : [];

    const bccRecipients: CustomEmailRecipient[] = bcc
      ? [{ email: bcc, name: bccName || undefined }]
      : [];

    // Process uploaded files
    const attachments: TemplateAttachment[] = [];
    if (req.files && Array.isArray(req.files)) {
      const uploadedFiles = req.files as Express.Multer.File[];
      
      for (const file of uploadedFiles) {
        attachments.push({
          filename: file.originalname,
          path: file.path,
          contentType: file.mimetype,
        });
      }
      
      logger.info("Files uploaded for email", {
        count: uploadedFiles.length,
        files: uploadedFiles.map(f => f.originalname),
      });
    }

    // Build request
    const emailRequest: SendCustomEmailRequest = {
      from: from || undefined,
      to: recipients,
      cc: ccRecipients.length > 0 ? ccRecipients : undefined,
      bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
      replyTo: replyTo || undefined,
      subject,
      body: emailBody,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    // Validate request
    const validation = CustomEmailService.validateRequest(emailRequest);
    if (!validation.valid) {
      ResponseHelper.badRequest(
        res,
        `Validation failed: ${validation.errors.join(", ")}`,
      );
      return;
    }

    // Send email
    const result = await CustomEmailService.sendCustomEmail(emailRequest);

    if (result.success) {
      logger.info("Custom email sent via multipart", {
        messageId: result.messageId,
        recipients: result.recipients.to,
        attachmentCount: attachments.length,
      });

      ResponseHelper.success(
        res,
        {
          messageId: result.messageId,
          recipients: result.recipients,
          attachments: attachments.map((a) => ({
            filename: a.filename,
            size: req.files
              ? (req.files as Express.Multer.File[]).find(
                  (f) => f.originalname === a.filename,
                )?.size
              : 0,
          })),
        },
        "Custom email sent successfully",
      );
    } else {
      ResponseHelper.badRequest(
        res,
        result.error || "Failed to send custom email",
      );
    }
  } catch (error) {
    logger.error("Error sending custom email via multipart:", error);
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : "Failed to send custom email",
    );
  }
};

/**
 * Send bulk custom emails (JSON)
 * POST /api/custom-emails/send-bulk
 * Body: {
 *   from: "sender@example.com",
 *   to: [
 *     { email: "user1@example.com", name: "User 1" },
 *     { email: "user2@example.com", name: "User 2" }
 *   ],
 *   subject: "Bulk Email Subject",
 *   body: "<p>Same content for all recipients</p>",
 *   attachments: [...]
 * }
 */
export const sendBulkCustomEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const request: SendCustomEmailRequest = req.body;

    // Validate request
    const validation = CustomEmailService.validateRequest(request);
    if (!validation.valid) {
      ResponseHelper.badRequest(
        res,
        `Validation failed: ${validation.errors.join(", ")}`,
      );
      return;
    }

    if (!request.to || request.to.length === 0) {
      ResponseHelper.badRequest(res, "At least one recipient is required");
      return;
    }

    logger.info("Sending bulk custom emails", {
      recipientCount: request.to.length,
      subject: request.subject,
    });

    // Send bulk emails
    const results = await CustomEmailService.sendBulkCustomEmail(request);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    logger.info("Bulk custom emails completed", {
      total: results.length,
      success: successCount,
      failed: failCount,
    });

    ResponseHelper.success(
      res,
      {
        total: results.length,
        success: successCount,
        failed: failCount,
        results: results.map((r) => ({
          email: r.recipients.to[0],
          success: r.success,
          messageId: r.messageId,
          error: r.error,
        })),
      },
      `Bulk emails sent: ${successCount} successful, ${failCount} failed`,
    );
  } catch (error) {
    logger.error("Error sending bulk custom emails:", error);
    ResponseHelper.internalError(res, "Failed to send bulk custom emails");
  }
};

/**
 * Send bulk custom emails with multipart/form-data
 * POST /api/custom-emails/send-bulk-multipart
 * Form data:
 *   - from: string (optional)
 *   - recipients: string (required, format: "email1:name1,email2:name2,email3")
 *   - subject: string (required)
 *   - body: string (HTML, required)
 *   - replyTo: string (optional)
 *   - files: File[] (optional, multiple files)
 */
export const sendBulkCustomEmailMultipart = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Handle case where req.body might be undefined with multipart/form-data
    const body = req.body || {};
    const { from, recipients, subject, body: emailBody, replyTo } = body;

    // Validate required fields
    if (!recipients || !subject || !emailBody) {
      ResponseHelper.badRequest(
        res,
        "Required fields: recipients, subject, body",
      );
      return;
    }

    // Parse recipients (format: "email1:name1,email2:name2,email3:name3")
    const recipientList: CustomEmailRecipient[] = recipients
      .split(",")
      .map((r: string) => {
        const trimmed = r.trim();
        if (trimmed.includes(":")) {
          const [email, name] = trimmed.split(":");
          return { email: email.trim(), name: name.trim() };
        }
        return { email: trimmed };
      })
      .filter((r: CustomEmailRecipient) => r.email); // Remove empty emails

    if (recipientList.length === 0) {
      ResponseHelper.badRequest(
        res,
        "At least one valid recipient is required",
      );
      return;
    }

    // Process uploaded files
    const attachments: TemplateAttachment[] = [];
    if (req.files && Array.isArray(req.files)) {
      const uploadedFiles = req.files as Express.Multer.File[];
      
      for (const file of uploadedFiles) {
        attachments.push({
          filename: file.originalname,
          path: file.path,
          contentType: file.mimetype,
        });
      }
      
      logger.info("Files uploaded for bulk email", {
        count: uploadedFiles.length,
        files: uploadedFiles.map(f => f.originalname),
      });
    }

    // Build request
    const emailRequest: SendCustomEmailRequest = {
      from: from || undefined,
      to: recipientList,
      replyTo: replyTo || undefined,
      subject,
      body: emailBody,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    // Validate request
    const validation = CustomEmailService.validateRequest(emailRequest);
    if (!validation.valid) {
      ResponseHelper.badRequest(
        res,
        `Validation failed: ${validation.errors.join(", ")}`,
      );
      return;
    }

    logger.info("Sending bulk custom emails via multipart", {
      recipientCount: recipientList.length,
      subject,
      attachmentCount: attachments.length,
    });

    // Send bulk emails
    const results = await CustomEmailService.sendBulkCustomEmail(emailRequest);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    logger.info("Bulk custom emails via multipart completed", {
      total: results.length,
      success: successCount,
      failed: failCount,
    });

    ResponseHelper.success(
      res,
      {
        total: results.length,
        success: successCount,
        failed: failCount,
        attachments: attachments.map((a) => ({
          filename: a.filename,
          size: req.files
            ? (req.files as Express.Multer.File[]).find(
                (f) => f.originalname === a.filename,
              )?.size
            : 0,
        })),
        results: results.map((r) => ({
          email: r.recipients.to[0],
          success: r.success,
          messageId: r.messageId,
          error: r.error,
        })),
      },
      `Bulk emails sent: ${successCount} successful, ${failCount} failed`,
    );
  } catch (error) {
    logger.error("Error sending bulk custom emails via multipart:", error);
    ResponseHelper.internalError(res, "Failed to send bulk custom emails");
  }
};

/**
 * Preview custom email (validate without sending)
 * POST /api/custom-emails/preview
 * Body: Same as send custom email
 */
export const previewCustomEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const request: SendCustomEmailRequest = req.body;

    // Validate request
    const validation = CustomEmailService.validateRequest(request);

    if (!validation.valid) {
      ResponseHelper.badRequest(
        res,
        `Validation failed: ${validation.errors.join(", ")}`,
      );
      return;
    }

    ResponseHelper.success(
      res,
      {
        valid: true,
        preview: {
          from:
            request.from ||
            process.env.DEFAULT_FROM_EMAIL ||
            "noreply@example.com",
          to: request.to,
          cc: request.cc,
          bcc: request.bcc,
          replyTo: request.replyTo,
          subject: request.subject,
          body: request.body,
          attachmentCount: request.attachments?.length || 0,
          attachments: request.attachments?.map((a) => ({
            filename: a.filename,
            contentType: a.contentType,
            hasContent: !!a.content,
            hasPath: !!a.path,
            hasUrl: !!a.url,
          })),
        },
      },
      "Custom email preview validated successfully",
    );
  } catch (error) {
    logger.error("Error previewing custom email:", error);
    ResponseHelper.internalError(res, "Failed to preview custom email");
  }
};

/**
 * Test SMTP connection
 * GET /api/custom-emails/test-connection
 */
export const testSMTPConnection = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await CustomEmailService.testConnection();
    
    if (result.success) {
      ResponseHelper.success(res, result.details, result.message);
    } else {
      ResponseHelper.badRequest(res, result.message, result.details);
    }
  } catch (error) {
    logger.error("Error testing SMTP connection:", error);
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : "Failed to test SMTP connection",
    );
  }
};

/**
 * Get SMTP status
 * GET /api/custom-emails/smtp-status
 */
export const getSMTPStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const status = CustomEmailService.getStatus();
    ResponseHelper.success(res, status, "SMTP status retrieved successfully");
  } catch (error) {
    logger.error("Error getting SMTP status:", error);
    ResponseHelper.internalError(res, "Failed to get SMTP status");
  }
};