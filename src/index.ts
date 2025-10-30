import dotenv from "dotenv";
import app from "./app";
import logger from "./utils/logger";
import { emailWorker } from "./workers/email.worker";
import { messageWorker } from "./workers/message.worker";
import { createRedisConnection } from "./config/redis";
import smtpService from "./services/smtp.service";

dotenv.config();

const PORT = process.env.PORT || 3000;

// Test Redis connection
const testRedisConnection = async () => {
  const redis = createRedisConnection();
  try {
    await redis.ping();
    logger.info("Redis connection test successful");
    redis.disconnect();
  } catch (error) {
    logger.error("Redis connection test failed:", error);
    process.exit(1);
  }
};

// Test SMTP connection
const testSMTPConnection = async () => {
  try {
    const isVerified = await smtpService.verifyConnection();
    const status = smtpService.getStatus();

    if (status.configured && isVerified) {
      logger.info("SMTP connection verified successfully", {
        host: status.host,
        user: status.user,
      });
    } else if (status.configured && !isVerified) {
      logger.warn(
        "SMTP configured but connection failed. Check your credentials."
      );
    } else {
      logger.info("SMTP not configured. Running in simulation mode.");
    }
  } catch (error) {
    logger.error("SMTP connection test failed:", error);
  }
};

const startServer = async () => {
  try {
    await testRedisConnection();
    await testSMTPConnection();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info("Email worker is active and processing jobs");
      logger.info("Message worker is active and processing jobs");
      logger.info("Rate limiting enabled");

      const smtpStatus = smtpService.getStatus();
      if (smtpStatus.configured) {
        logger.info("SMTP Mode: REAL EMAIL SENDING");
      } else {
        logger.info("SMTP Mode: SIMULATION");
      }
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, closing server gracefully");
  await emailWorker.close();
  await messageWorker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, closing server gracefully");
  await emailWorker.close();
  await messageWorker.close();
  process.exit(0);
});

startServer();
