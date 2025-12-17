// src/controllers/custom-email.controller.ts
import { Request, Response } from "express";
import { CustomEmailService } from "../services/custom-email.service";
import { SendCustomEmailRequest } from "../types/custom-email.types";
import logger from "../utils/logger";
import ResponseHelper from "../utils/api-response.helper";

/**
 * Send custom email
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
      ResponseHelper.error(
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
      ResponseHelper.error(res, result.error || "Failed to send custom email");
    }
  } catch (error) {
    logger.error("Error sending custom email:", error);
    ResponseHelper.error(
      res,
      error instanceof Error ? error.message : "Failed to send custom email",
    );
  }
};

/**
 * Send bulk custom emails
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
      ResponseHelper.error(
        res,
        `Validation failed: ${validation.errors.join(", ")}`,
      );
      return;
    }

    if (!request.to || request.to.length === 0) {
      ResponseHelper.error(res, "At least one recipient is required");
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
    ResponseHelper.error(res, "Failed to send bulk custom emails");
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
      ResponseHelper.error(
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
    ResponseHelper.error(res, "Failed to preview custom email");
  }
};
