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
import axios from "axios";

interface ProcessedAttachment {
  filename: string;
  content?: Buffer;
  path?: string;
  contentType?: string;
}

export class CustomEmailService {
  private static transporter: Transporter<SentMessageInfo> | null = null;

  private static defaultFrom =
    process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";

  /**
   * Reset transporter (useful when configuration changes)
   */
  static resetTransporter(): void {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      logger.info("SMTP transporter reset");
    }
  }

  /**
   * Initialize or get transporter instance
   */
  private static getTransporter(): Transporter<SentMessageInfo> {
    if (this.transporter) {
      return this.transporter;
    }

    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpSecure = process.env.SMTP_SECURE === "true";
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // Log configuration (without password)
    logger.info("Initializing SMTP transporter", {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      user: smtpUser,
      hasPassword: !!smtpPass,
      passwordLength: smtpPass ? smtpPass.length : 0,
    });

    // For port 25 (SMTP relay), authentication might not be required
    // But we still need host and user for logging purposes
    if (!smtpHost) {
      throw new Error(
        "SMTP_HOST is required. Please set SMTP_HOST environment variable.",
      );
    }

    // Only require auth if password is provided (some SMTP relays don't need auth)
    const authConfig = smtpUser && smtpPass
      ? {
          user: smtpUser,
          pass: smtpPass,
        }
      : smtpUser
        ? {
            user: smtpUser,
            pass: "", // Empty password for relay servers
          }
        : undefined;

    // Use same approach as smtp.service.ts - let TypeScript infer the type
    // This allows pool options that aren't in the official type definition
    const transportOptions = {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      // Only add auth if credentials are provided
      ...(authConfig ? { auth: authConfig } : {}),
      // Connection pooling (same as smtp.service.ts - important for Plesk!)
      pool: true, // Use pooled connections
      maxConnections: 5, // Max concurrent connections
      maxMessages: 100, // Max messages per connection
      rateDelta: 1000, // 1 second
      rateLimit: 5, // Max 5 emails per rateDelta
      // Connection timeout settings (important for Plesk)
      connectionTimeout: parseInt(process.env.SMTP_CONNECTION_TIMEOUT || "10000"), // 10 seconds
      greetingTimeout: parseInt(process.env.SMTP_GREETING_TIMEOUT || "5000"), // 5 seconds
      socketTimeout: parseInt(process.env.SMTP_SOCKET_TIMEOUT || "30000"), // 30 seconds
      // TLS options (important for Plesk certificate issues)
      tls: {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false", // Default: true
        minVersion: (process.env.SMTP_TLS_MIN_VERSION || "TLSv1.2") as "TLSv1.3" | "TLSv1.2" | "TLSv1.1" | "TLSv1",
        ciphers: process.env.SMTP_TLS_CIPHERS || undefined,
      },
      // Debug mode (set SMTP_DEBUG=true to enable)
      debug: process.env.SMTP_DEBUG === "true",
      logger: process.env.SMTP_DEBUG === "true",
    };

    this.transporter = nodemailer.createTransport(transportOptions);

    logger.info("SMTP transporter created successfully", {
      host: smtpHost,
      port: smtpPort,
    });

    return this.transporter;
  }

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
   * Verify SMTP connection before sending
   */
  private static async verifyConnection(): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      logger.info("SMTP connection verified successfully");
      return true;
    } catch (error) {
      logger.error("SMTP connection verification failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return false;
    }
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

      // Get transporter (will initialize if needed)
      const transporter = this.getTransporter();

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

      // Log email details before sending
      const bodySize = Buffer.byteLength(request.body, 'utf8');
      logger.info("Attempting to send custom email", {
        from: mailOptions.from,
        to: request.to.map((r) => r.email),
        subject: request.subject,
        attachmentCount: processedAttachments.length,
        bodySizeBytes: bodySize,
        bodySizeKB: Math.round(bodySize / 1024 * 100) / 100,
        hasCC: !!request.cc && request.cc.length > 0,
        hasBCC: !!request.bcc && request.bcc.length > 0,
        hasReplyTo: !!request.replyTo,
      });

      // Send email
      const info = await transporter.sendMail(mailOptions);

      // Log detailed response from SMTP server
      logger.info("Custom email sent successfully", {
        messageId: info.messageId,
        recipients: request.to.map((r) => r.email),
        subject: request.subject,
        accepted: info.accepted || [],
        rejected: info.rejected || [],
        response: info.response || "No response",
        responseCode: info.responseCode || "No code",
        envelope: info.envelope || {},
        // Log full info object for debugging
        fullInfo: JSON.stringify({
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response,
          responseCode: info.responseCode,
          envelope: info.envelope,
        }),
      });

      // Check if email was actually accepted
      if (info.rejected && info.rejected.length > 0) {
        logger.warn("Some recipients were rejected by SMTP server", {
          rejected: info.rejected,
          accepted: info.accepted,
          response: info.response,
        });
      }

      // Check if accepted array is empty (email might not be accepted)
      if (!info.accepted || info.accepted.length === 0) {
        logger.error("Email was not accepted by SMTP server", {
          messageId: info.messageId,
          rejected: info.rejected,
          response: info.response,
          responseCode: info.responseCode,
        });
      }

      return {
        success: true,
        messageId: info.messageId,
        recipients: {
          to: request.to.map((r) => r.email),
          cc: request.cc?.map((r) => r.email),
          bcc: request.bcc?.map((r) => r.email),
        },
        scheduledAt: request.scheduledAt,
        smtpResponse: {
          accepted: info.accepted || [],
          rejected: info.rejected || [],
          response: info.response || undefined,
          responseCode: info.responseCode || undefined,
          envelope: info.envelope || undefined,
        },
      };
    } catch (error) {
      // Enhanced error logging for Plesk debugging
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      // Check for common Plesk/SMTP issues
      let detailedError = errorMessage;
      if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ETIMEDOUT")) {
        detailedError = `Connection failed: ${errorMessage}. Check if Plesk firewall allows outbound SMTP connections on port ${process.env.SMTP_PORT || "587"}`;
      } else if (errorMessage.includes("self signed certificate") || errorMessage.includes("certificate")) {
        detailedError = `TLS/SSL certificate error: ${errorMessage}. Try setting SMTP_TLS_REJECT_UNAUTHORIZED=false in .env (for testing only)`;
      } else if (errorMessage.includes("authentication") || errorMessage.includes("535")) {
        detailedError = `Authentication failed: ${errorMessage}. Verify SMTP_USER and SMTP_PASS are correct`;
      } else if (errorMessage.includes("greeting") || errorMessage.includes("timeout")) {
        detailedError = `Connection timeout: ${errorMessage}. Check SMTP host/port and firewall settings`;
      }

      logger.error("Failed to send custom email", {
        error: detailedError,
        originalError: errorMessage,
        stack: errorStack,
        recipients: request.to.map((r) => r.email),
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT,
        smtpUser: process.env.SMTP_USER,
      });

      return {
        success: false,
        recipients: {
          to: request.to.map((r) => r.email),
          cc: request.cc?.map((r) => r.email),
          bcc: request.bcc?.map((r) => r.email),
        },
        error: detailedError,
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

  /**
   * Test SMTP connection and configuration
   */
  static async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      // Check if credentials are configured
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (!smtpHost || !smtpUser || !smtpPass) {
        return {
          success: false,
          message: "SMTP credentials not configured",
          details: {
            hasHost: !!smtpHost,
            hasUser: !!smtpUser,
            hasPass: !!smtpPass,
          },
        };
      }

      // Try to get transporter (will initialize if needed)
      const transporter = this.getTransporter();

      // Verify connection
      await transporter.verify();

      return {
        success: true,
        message: "SMTP connection successful",
        details: {
          host: smtpHost,
          port: smtpPort || "587",
          user: smtpUser,
          secure: process.env.SMTP_SECURE === "true",
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Provide helpful error messages
      let message = "SMTP connection test failed";
      if (errorMessage.includes("ECONNREFUSED")) {
        message = "Cannot connect to SMTP server. Check host/port and firewall settings.";
      } else if (errorMessage.includes("ETIMEDOUT")) {
        message = "Connection timeout. Check if Plesk firewall allows outbound SMTP connections.";
      } else if (errorMessage.includes("authentication") || errorMessage.includes("535")) {
        message = "Authentication failed. Verify SMTP_USER and SMTP_PASS are correct.";
      } else if (errorMessage.includes("certificate")) {
        message = "TLS/SSL certificate error. Try setting SMTP_TLS_REJECT_UNAUTHORIZED=false (for testing only).";
      }

      return {
        success: false,
        message: `${message}: ${errorMessage}`,
        details: {
          error: errorMessage,
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER,
        },
      };
    }
  }

  /**
   * Get SMTP configuration status
   */
  static getStatus(): {
    configured: boolean;
    host?: string;
    port?: string;
    user?: string;
    secure?: boolean;
  } {
    return {
      configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      secure: process.env.SMTP_SECURE === "true",
    };
  }
}
