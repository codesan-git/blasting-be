import nodemailer from "nodemailer";
import logger from "../utils/logger";

interface EmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class SMTPService {
  private transporter: any = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // Check if SMTP is configured
    if (!smtpHost || !smtpUser || !smtpPass) {
      logger.warn("SMTP not configured. Email sending will be simulated.");
      this.isConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || "587"),
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        pool: true, // Use pooled connections
        maxConnections: 5, // Max concurrent connections
        maxMessages: 100, // Max messages per connection
        rateDelta: 1000, // 1 second
        rateLimit: 5, // Max 5 emails per rateDelta
      });

      this.isConfigured = true;
      logger.info("SMTP Service initialized successfully", {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
      });
    } catch (error) {
      logger.error("Failed to initialize SMTP Service:", error);
      this.isConfigured = false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<SendResult> {
    // If SMTP not configured, simulate email sending
    if (!this.isConfigured || !this.transporter) {
      return this.simulateEmailSending(options);
    }

    try {
      const info = await this.transporter.sendMail({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      });

      logger.info("Email sent successfully", {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
        accepted: info.accepted,
        rejected: info.rejected,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      logger.error("Failed to send email", {
        to: options.to,
        subject: options.subject,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async simulateEmailSending(
    options: EmailOptions
  ): Promise<SendResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate 90% success rate
        const isSuccess = Math.random() > 0.1;

        if (isSuccess) {
          const messageId = `simulated-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;
          logger.info("Email simulated successfully", {
            messageId,
            to: options.to,
            subject: options.subject,
            mode: "SIMULATION",
          });
          resolve({ success: true, messageId });
        } else {
          logger.warn("Email simulation failed", {
            to: options.to,
            subject: options.subject,
            mode: "SIMULATION",
          });
          resolve({
            success: false,
            error: "Simulated failure",
          });
        }
      }, 500); // Simulate network delay
    });
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      logger.info("SMTP verification skipped - running in simulation mode");
      return true; // Return true to allow simulation mode
    }

    try {
      await this.transporter.verify();
      logger.info("SMTP connection verified successfully");
      return true;
    } catch (error) {
      logger.error("SMTP connection verification failed:", error);
      return false;
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  getStatus(): { configured: boolean; host?: string; user?: string } {
    return {
      configured: this.isConfigured,
      host: process.env.SMTP_HOST,
      user: process.env.SMTP_USER,
    };
  }
}

export const smtpService = new SMTPService();
export default smtpService;
