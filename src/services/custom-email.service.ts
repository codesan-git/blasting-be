// src/services/custom-email.service.ts
import {
  SendCustomEmailRequest,
  SendCustomEmailResponse,
  CustomEmailRecipient,
} from "../types/custom-email.types";
import { AttachmentService } from "./attachment.service";
import { TemplateAttachment } from "../types/template.types";
import logger from "../utils/logger";
import nodemailer, { Transporter, SentMessageInfo } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import axios from "axios";

interface ProcessedAttachment {
  filename: string;
  content?: Buffer;
  path?: string;
  contentType?: string;
}

export class CustomEmailService {
  private static transporter: Transporter<SentMessageInfo> =
    nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    } as SMTPTransport.Options);

  private static defaultFrom =
    process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";

  /**
   * Validate email address format
   */
  private static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate custom email request
   */
  static validateRequest(request: SendCustomEmailRequest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate recipients
    if (!request.to || request.to.length === 0) {
      errors.push("At least one recipient is required");
    } else {
      request.to.forEach((recipient, index) => {
        if (!recipient.email) {
          errors.push(`Recipient ${index + 1}: email is required`);
        } else if (!this.validateEmail(recipient.email)) {
          errors.push(
            `Recipient ${index + 1}: invalid email format '${recipient.email}'`,
          );
        }
      });
    }

    // Validate CC emails
    if (request.cc && request.cc.length > 0) {
      request.cc.forEach((recipient, index) => {
        if (!recipient.email || !this.validateEmail(recipient.email)) {
          errors.push(
            `CC ${index + 1}: invalid email format '${recipient.email}'`,
          );
        }
      });
    }

    // Validate BCC emails
    if (request.bcc && request.bcc.length > 0) {
      request.bcc.forEach((recipient, index) => {
        if (!recipient.email || !this.validateEmail(recipient.email)) {
          errors.push(
            `BCC ${index + 1}: invalid email format '${recipient.email}'`,
          );
        }
      });
    }

    // Validate from email if provided
    if (request.from && !this.validateEmail(request.from)) {
      errors.push(`Invalid from email format '${request.from}'`);
    }

    // Validate reply-to email if provided
    if (request.replyTo && !this.validateEmail(request.replyTo)) {
      errors.push(`Invalid replyTo email format '${request.replyTo}'`);
    }

    // Validate subject
    if (!request.subject || request.subject.trim().length === 0) {
      errors.push("Email subject is required");
    }

    // Validate body
    if (!request.body || request.body.trim().length === 0) {
      errors.push("Email body is required");
    }

    // Validate attachments if provided
    if (request.attachments && request.attachments.length > 0) {
      request.attachments.forEach((attachment, index) => {
        if (!attachment.filename) {
          errors.push(`Attachment ${index + 1}: filename is required`);
        }

        if (!attachment.content && !attachment.path && !attachment.url) {
          errors.push(
            `Attachment ${index + 1}: must provide content, path, or url`,
          );
        }

        // Validate file type
        if (
          attachment.filename &&
          !AttachmentService.validateType(attachment.filename)
        ) {
          errors.push(
            `Attachment ${index + 1}: file type not allowed for '${attachment.filename}'`,
          );
        }

        // Validate size if content is provided
        if (
          attachment.content &&
          !AttachmentService.validateSize(attachment.content)
        ) {
          errors.push(`Attachment ${index + 1}: file size exceeds 10MB limit`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Process attachments - convert base64 to buffer or read from path
   */
  private static async processAttachments(
    attachments?: TemplateAttachment[],
  ): Promise<ProcessedAttachment[]> {
    if (!attachments || attachments.length === 0) {
      return [];
    }

    const processedAttachments: ProcessedAttachment[] = [];

    for (const attachment of attachments) {
      try {
        if (attachment.content) {
          // Base64 content
          const base64Data = attachment.content.replace(
            /^data:.*?;base64,/,
            "",
          );
          processedAttachments.push({
            filename: attachment.filename,
            content: Buffer.from(base64Data, "base64"),
            contentType: attachment.contentType,
          });
        } else if (attachment.path) {
          // File path
          processedAttachments.push({
            filename: attachment.filename,
            path: attachment.path,
            contentType: attachment.contentType,
          });
        } else if (attachment.url) {
          // URL - download first
          const response = await axios.get<ArrayBuffer>(attachment.url, {
            responseType: "arraybuffer",
          });
          processedAttachments.push({
            filename: attachment.filename,
            content: Buffer.from(response.data),
            contentType:
              attachment.contentType ||
              (response.headers["content-type"] as string),
          });
        }
      } catch (error) {
        logger.error("Failed to process attachment", {
          filename: attachment.filename,
          error,
        });
      }
    }

    return processedAttachments;
  }

  /**
   * Format recipients for nodemailer
   */
  private static formatRecipients(recipients: CustomEmailRecipient[]): string {
    return recipients
      .map((r) => (r.name ? `"${r.name}" <${r.email}>` : r.email))
      .join(", ");
  }

  /**
   * Send custom email
   */
  static async sendCustomEmail(
    request: SendCustomEmailRequest,
  ): Promise<SendCustomEmailResponse> {
    try {
      // Validate request
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          recipients: {
            to: request.to.map((r) => r.email),
            cc: request.cc?.map((r) => r.email),
            bcc: request.bcc?.map((r) => r.email),
          },
          error: validation.errors.join(", "),
        };
      }

      // Process attachments
      const processedAttachments = await this.processAttachments(
        request.attachments,
      );

      // Prepare email options
      const mailOptions = {
        from: request.from || this.defaultFrom,
        to: this.formatRecipients(request.to),
        cc: request.cc ? this.formatRecipients(request.cc) : undefined,
        bcc: request.bcc ? this.formatRecipients(request.bcc) : undefined,
        replyTo: request.replyTo,
        subject: request.subject,
        html: request.body,
        attachments: processedAttachments,
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      logger.info("Custom email sent successfully", {
        messageId: info.messageId,
        recipients: request.to.map((r) => r.email),
        subject: request.subject,
      });

      return {
        success: true,
        messageId: info.messageId,
        recipients: {
          to: request.to.map((r) => r.email),
          cc: request.cc?.map((r) => r.email),
          bcc: request.bcc?.map((r) => r.email),
        },
        scheduledAt: request.scheduledAt,
      };
    } catch (error) {
      logger.error("Failed to send custom email", {
        error,
        recipients: request.to.map((r) => r.email),
      });

      return {
        success: false,
        recipients: {
          to: request.to.map((r) => r.email),
          cc: request.cc?.map((r) => r.email),
          bcc: request.bcc?.map((r) => r.email),
        },
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send bulk custom emails (same content to multiple recipients)
   */
  static async sendBulkCustomEmail(
    request: SendCustomEmailRequest,
  ): Promise<SendCustomEmailResponse[]> {
    const results: SendCustomEmailResponse[] = [];

    for (const recipient of request.to) {
      const singleRequest: SendCustomEmailRequest = {
        ...request,
        to: [recipient],
      };

      const result = await this.sendCustomEmail(singleRequest);
      results.push(result);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }
}
