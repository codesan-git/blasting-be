// src/app.ts
import express, { Application, Request, Response, NextFunction } from "express";
import emailRoutes from "./routes/email.routes";
import messageRoutes from "./routes/message.routes";
import templateRoutes from "./routes/template.routes";
import logsRoutes from "./routes/logs.routes";
import webhookRoutes from "./routes/webhook.routes";
import { getDashboardStats } from "./controllers/dashboard.controller";
import logger from "./utils/logger";
import { apiLogger } from "./middleware/apiLogger";
import {
  apiLimiter,
  blastLimiter,
  templateLimiter,
} from "./middleware/rateLimiter";
import DatabaseService from "./services/database.service";
import backupRoutes from "./routes/backup.routes";

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy - important for rate limiting behind reverse proxy
app.set("trust proxy", 1);

// API logging middleware (but skip for webhooks)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith("/webhooks")) {
    return next(); // Skip logging for webhooks
  }
  apiLogger(req, res, next);
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    body: req.body,
    query: req.query,
  });
  next();
});

// IMPORTANT: Webhook routes MUST come BEFORE rate limiter
// Webhooks should NOT have rate limiting
app.use("/webhooks", webhookRoutes);

// Apply general rate limiter to all API routes (but not webhooks)
app.use("/api/", apiLimiter);

// Routes with specific rate limiters
app.use("/api/email", blastLimiter, emailRoutes);
app.use("/api/messages", blastLimiter, messageRoutes);
app.use("/api/templates", templateLimiter, templateRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/backup", backupRoutes);

// Dashboard endpoint
app.get("/api/dashboard", getDashboardStats);

// Health check (no rate limit)
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// SMTP status check endpoint
app.get("/api/smtp/status", (req: Request, res: Response) => {
  const smtpService = require("./services/smtp.service").default;
  const status = smtpService.getStatus();
  res.status(200).json({
    success: true,
    smtp: status,
  });
});

// Qiscus webhook status
app.get("/api/qiscus/webhook/status", async (req: Request, res: Response) => {
  const qiscusWebhookService =
    require("./services/qiscus-webhook.service").default;
  const status = qiscusWebhookService.getStatus();

  let config = null;
  if (status.configured) {
    config = await qiscusWebhookService.getWebhookConfig();
  }

  res.status(200).json({
    success: true,
    webhook: {
      ...status,
      currentConfig: config,
    },
  });
});

// Test template rendering endpoint
app.post("/api/templates/test-render", (req: Request, res: Response) => {
  try {
    const { templateId, variables } = req.body;

    if (!templateId) {
      res.status(400).json({
        success: false,
        message: "templateId is required",
      });
      return;
    }

    const { TemplateService } = require("./services/template.service");
    const template = TemplateService.getTemplateById(templateId);

    if (!template) {
      res.status(404).json({
        success: false,
        message: `Template '${templateId}' not found`,
      });
      return;
    }

    const rendered = TemplateService.renderTemplate(template, variables || {});

    res.status(200).json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        channel: template.channel,
      },
      variables: variables || {},
      rendered: {
        subject: rendered.subject,
        body: rendered.body,
        bodyLength: rendered.body.length,
      },
    });
  } catch (error) {
    logger.error("Error testing template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to test template",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Debug endpoint - cek webhook logs
app.get("/api/webhooks/debug", async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;

    // Get recent system logs related to webhooks
    const logs = DatabaseService.getSystemLogs(
      undefined,
      parseInt(limit as string),
      0
    );

    // Filter webhook-related logs
    const webhookLogs = logs.filter(
      (log) =>
        log.message.includes("WEBHOOK") ||
        log.message.includes("webhook") ||
        log.message.includes("message status") ||
        log.message.includes("Qiscus")
    );

    res.status(200).json({
      success: true,
      count: webhookLogs.length,
      logs: webhookLogs,
    });
  } catch (error) {
    logger.error("Error getting webhook debug logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get webhook debug logs",
    });
  }
});

// Debug endpoint - cek message by message_id
app.get(
  "/api/webhooks/message/:messageId",
  async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;

      const message = DatabaseService.getMessageByMessageId(messageId);

      if (!message) {
        res.status(404).json({
          success: false,
          message: `Message with ID '${messageId}' not found`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message,
      });
    } catch (error) {
      logger.error("Error getting message by ID:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get message",
      });
    }
  }
);

// Debug endpoint - test webhook payload
app.post("/api/webhooks/test-payload", async (req: Request, res: Response) => {
  try {
    logger.info("=== TEST PAYLOAD RECEIVED ===", {
      body: JSON.stringify(req.body, null, 2),
      headers: JSON.stringify(req.headers, null, 2),
      important: true,
    });

    res.status(200).json({
      success: true,
      message: "Test payload logged successfully",
      received: req.body,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error logging test payload:", error);
    res.status(500).json({
      success: false,
      message: "Failed to log test payload",
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  logger.warn("Route not found", {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

export default app;
