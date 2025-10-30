import express, { Application, Request, Response } from "express";
import emailRoutes from "./routes/email.routes";
import messageRoutes from "./routes/message.routes";
import templateRoutes from "./routes/template.routes";
import logsRoutes from "./routes/logs.routes";
import logger from "./utils/logger";
import {
  apiLimiter,
  blastLimiter,
  templateLimiter,
} from "./middleware/rateLimiter";

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy - important for rate limiting behind reverse proxy
app.set("trust proxy", 1);

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    body: req.body,
    query: req.query,
  });
  next();
});

// Apply general rate limiter to all API routes
app.use("/api/", apiLimiter);

// Routes with specific rate limiters
app.use("/api/email", blastLimiter, emailRoutes);
app.use("/api/messages", blastLimiter, messageRoutes);
app.use("/api/templates", templateLimiter, templateRoutes);
app.use("/api/logs", logsRoutes);

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

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

export default app;
