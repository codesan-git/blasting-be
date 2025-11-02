import winston from "winston";
import DatabaseService from "../services/database.service";

// Simple console logger only - no file logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "email-blast-service" },
  transports: [
    // Console only for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Custom database logger wrapper
const dbLogger = {
  error: (message: string, meta?: any) => {
    logger.error(message, meta);
    DatabaseService.logSystem("error", message, meta);
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, meta);
    DatabaseService.logSystem("warn", message, meta);
  },
  info: (message: string, meta?: any) => {
    logger.info(message, meta);
    // Only log important info to database
    if (meta?.important) {
      DatabaseService.logSystem("info", message, meta);
    }
  },
  debug: (message: string, meta?: any) => {
    logger.debug(message, meta);
    // Debug logs only to console, not database
  },
};

export default dbLogger;
