// src/app.ts - UPDATED VERSION WITH AUTHENTICATION
import express, { Application, Request, Response, NextFunction } from "express";
import emailRoutes from "./routes/email.routes";
import messageRoutes from "./routes/message.routes";
import templateRoutes from "./routes/template.routes";
import logsRoutes from "./routes/logs.routes";
import webhookRoutes from "./routes/webhook.routes";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import backupRoutes from "./routes/backup.routes";
import { getDashboardStats } from "./controllers/dashboard.controller";
import logger from "./utils/logger";
import { apiLogger } from "./middleware/apiLogger";
import {
  apiLimiter,
  blastLimiter,
  templateLimiter,
} from "./middleware/rateLimiter";
import { authenticate, requirePermission } from "./middleware/auth.middleware";
import { Permission } from "./types/auth.types";
import DatabaseService from "./services/database.service";
import permissionRoutes from "./routes/permission.routes";
import ResponseHelper from "./utils/api-response.helper";
import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { messageQueue } from "./queues/message.queue";
import expressBasicAuth from "express-basic-auth";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";

const app: Application = express();

// if (process.env.NODE_ENV !== "production") {
// (async () => {
// const { ExpressAdapter } = await import("@bull-board/express");
// const { createBullBoard } = await import("@bull-board/api");
// const { BullMQAdapter } = await import("@bull-board/api/bullMQAdapter");
// const { messageQueue } = await import("./queues/message.queue");
// const expressBasicAuth = await import("express-basic-auth");

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(messageQueue)],
  serverAdapter,
});

app.use(
  "/admin/queues",
  expressBasicAuth({
    users: {
      [process.env.BULLBOARD_USER || "admin"]:
        process.env.BULLBOARD_PASS || "secret",
    },
    challenge: true,
  }),
  serverAdapter.getRouter()
);
console.log("🚀 Bull Board aktif di mode development: /admin/queues");
//   })();
// }

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy - important for rate limiting behind reverse proxy
app.set("trust proxy", 1);

// API logging middleware (but skip for webhooks and auth)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith("/webhooks") || req.path.startsWith("/api/auth")) {
    return next(); // Skip logging for webhooks and auth
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

// IMPORTANT: Webhook routes MUST come BEFORE authentication & rate limiter
// Webhooks should NOT have authentication or rate limiting
app.use("/webhooks", webhookRoutes);

// Authentication routes (public - no auth required)
app.use("/api/auth", authRoutes);

// Apply general rate limiter to all API routes (except webhooks and auth)
app.use("/api/", apiLimiter);

app.use(
  "/api/permissions",
  permissionRoutes // Already has authenticate & requireRole inside
);

// Protected routes with authentication and specific permissions
app.use(
  "/api/email",
  authenticate,
  requirePermission(Permission.EMAIL_SEND),
  blastLimiter,
  emailRoutes
);

app.use(
  "/api/messages",
  authenticate,
  requirePermission([Permission.EMAIL_SEND, Permission.WHATSAPP_SEND]),
  blastLimiter,
  messageRoutes
);

app.use(
  "/api/templates",
  authenticate,
  requirePermission(Permission.TEMPLATE_READ),
  templateLimiter,
  templateRoutes
);

app.use(
  "/api/logs",
  authenticate,
  requirePermission(Permission.LOGS_READ),
  logsRoutes
);

app.use(
  "/api/backup",
  authenticate,
  requirePermission(Permission.BACKUP_READ),
  backupRoutes
);

app.use(
  "/api/users",
  userRoutes // Already has authenticate middleware inside
);

// Dashboard endpoint (requires dashboard read permission)
app.get(
  "/api/dashboard",
  authenticate,
  requirePermission(Permission.DASHBOARD_READ),
  getDashboardStats
);

// Health check (no authentication required)
app.get("/health", (req: Request, res: Response) => {
  ResponseHelper.success(res, "Health check successful");
});

// SMTP status check endpoint (requires system config permission)
app.get(
  "/api/smtp/status",
  authenticate,
  requirePermission(Permission.SYSTEM_CONFIG),
  (req: Request, res: Response) => {
    const smtpService = require("./services/smtp.service").default;
    const status = smtpService.getStatus();
    ResponseHelper.success(res, status);
  }
);

// Qiscus webhook status (requires system config permission)
app.get(
  "/api/qiscus/webhook/status",
  authenticate,
  requirePermission(Permission.SYSTEM_CONFIG),
  async (req: Request, res: Response) => {
    const qiscusWebhookService =
      require("./services/qiscus-webhook.service").default;
    const status = qiscusWebhookService.getStatus();

    let config = null;
    if (status.configured) {
      config = await qiscusWebhookService.getWebhookConfig();
    }

    const data = {
      webhook: {
        ...status,
        currentConfig: config,
      },
    };
    ResponseHelper.success(
      res,
      data,
      "Qiscus webhook status retrieved successfully"
    );
  }
);

// Test template rendering endpoint (requires template read permission)
app.post(
  "/api/templates/test-render",
  authenticate,
  requirePermission(Permission.TEMPLATE_READ),
  (req: Request, res: Response) => {
    try {
      const { templateId, variables } = req.body;

      if (!templateId) {
        ResponseHelper.error(res, "templateId is required");
        return;
      }

      const { TemplateService } = require("./services/template.service");
      const template = TemplateService.getTemplateById(templateId);

      if (!template) {
        ResponseHelper.error(res, `Template '${templateId}' not found`);
        return;
      }

      const rendered = TemplateService.renderTemplate(
        template,
        variables || {}
      );

      const data = {
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
      };
      ResponseHelper.success(res, data, "Template rendered successfully");
    } catch (error) {
      logger.error("Error testing template:", error);
      ResponseHelper.error(res, "Failed to test template");
    }
  }
);

// Debug endpoint - cek webhook logs (requires system logs permission)
app.get(
  "/api/webhooks/debug",
  authenticate,
  requirePermission(Permission.SYSTEM_LOGS),
  async (req: Request, res: Response) => {
    try {
      const { limit = 50 } = req.query;

      const logs = DatabaseService.getSystemLogs(
        undefined,
        parseInt(limit as string),
        0
      );

      const webhookLogs = (await logs).filter(
        (log) =>
          log.message.includes("WEBHOOK") ||
          log.message.includes("webhook") ||
          log.message.includes("message status") ||
          log.message.includes("Qiscus")
      );

      const data = {
        count: webhookLogs.length,
        logs: webhookLogs,
      };
      ResponseHelper.success(
        res,
        data,
        "Webhook debug logs retrieved successfully"
      );
    } catch (error) {
      logger.error("Error getting webhook debug logs:", error);
      ResponseHelper.error(res, "Failed to get webhook debug logs");
    }
  }
);

// Debug endpoint - cek message by message_id (requires logs read permission)
app.get(
  "/api/webhooks/message/:messageId",
  authenticate,
  requirePermission(Permission.LOGS_READ),
  async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;

      const message = DatabaseService.getMessageByMessageId(messageId);

      if (!message) {
        ResponseHelper.error(res, `Message with ID '${messageId}' not found`);
        return;
      }

      const data = {
        message,
      };
      ResponseHelper.success(res, data, "Message retrieved successfully");
    } catch (error) {
      logger.error("Error getting message by ID:", error);
      ResponseHelper.error(res, "Failed to get message");
    }
  }
);

// Debug endpoint - test webhook payload (no auth - for external testing)
app.post("/api/webhooks/test-payload", async (req: Request, res: Response) => {
  try {
    logger.info("=== TEST PAYLOAD RECEIVED ===", {
      body: JSON.stringify(req.body, null, 2),
      headers: JSON.stringify(req.headers, null, 2),
      important: true,
    });

    const data = {
      message: "Test payload logged successfully",
      received: req.body,
      timestamp: new Date().toISOString(),
    };
    ResponseHelper.success(res, data, "Test payload logged successfully");
  } catch (error) {
    logger.error("Error logging test payload:", error);
    ResponseHelper.error(res, "Failed to log test payload");
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  logger.warn("Route not found", {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  ResponseHelper.error(res, "Route not found");
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error:", err);
  ResponseHelper.error(res, "Internal server error");
});

export default app;
