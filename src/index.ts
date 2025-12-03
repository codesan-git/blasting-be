import dotenv from "dotenv";
dotenv.config();

// Set timezone to Jakarta (WIB - UTC+7)
process.env.TZ = "Asia/Jakarta";

// Verify timezone on startup
const jakartaTime = new Date().toLocaleString("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "full",
  timeStyle: "long",
});
console.log("🕐 Server Timezone: Asia/Jakarta (WIB - UTC+7)");
console.log("🕐 Current Time:", jakartaTime);
console.log("");

import app from "./app";
import logger from "./utils/logger";
import { emailWorker } from "./workers/email.worker";
import { messageWorker } from "./workers/message.worker";
import { createRedisConnection } from "./config/redis";
import smtpService from "./services/smtp.service";
import qiscusService from "./services/qiscus.service";
import qiscusWebhookService from "./services/qiscus-webhook.service";
import backupScheduler from "./jobs/backup.job";

const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

// Test Redis connection
const testRedisConnection = async () => {
  const redis = createRedisConnection();
  try {
    await redis.ping();
    logger.info("Redis connection test successful");
    // redis.disconnect();
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
        important: true,
      });
    } else if (status.configured && !isVerified) {
      logger.warn(
        "SMTP configured but connection failed. Check your credentials.",
      );
    } else {
      logger.info("SMTP not configured. Running in simulation mode.");
    }
  } catch (error) {
    logger.error("SMTP connection test failed:", error);
  }
};

// Check Qiscus configuration
const checkQiscusConfig = () => {
  const status = qiscusService.getStatus();

  if (status.configured) {
    logger.info("Qiscus WhatsApp configured successfully", {
      baseUrl: status.baseUrl,
      appId: status.appId,
      channelId: status.channelId,
      important: true,
    });
  } else {
    logger.info(
      "Qiscus WhatsApp not configured. WhatsApp messages will be simulated.",
    );
  }
};

// Register Qiscus webhook
const registerQiscusWebhook = async () => {
  const webhookStatus = qiscusWebhookService.getStatus();

  if (!webhookStatus.configured) {
    logger.info("Qiscus webhook not configured, skipping registration");
    return;
  }

  try {
    const webhookUrl = `${APP_URL}/webhooks/qiscus`;

    logger.info("Registering Qiscus webhook", {
      url: webhookUrl,
      important: true,
    });

    const result = await qiscusWebhookService.registerWebhook(webhookUrl);

    if (result.success) {
      logger.info("Qiscus webhook registered successfully", {
        url: webhookUrl,
        data: result.data,
        important: true,
      });
    } else {
      logger.warn("Failed to register Qiscus webhook", {
        message: result.message,
      });
    }
  } catch (error) {
    logger.error("Error registering Qiscus webhook:", error);
  }
};

const startServer = async () => {
  try {
    await testRedisConnection();
    await testSMTPConnection();
    checkQiscusConfig();

    app.listen(PORT, async () => {
      logger.info(`Server running on port ${PORT}`, { important: true });
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info("Email worker is active and processing jobs");
      logger.info("Message worker is active and processing jobs");
      logger.info("Rate limiting enabled");

      const smtpStatus = smtpService.getStatus();
      const qiscusStatus = qiscusService.getStatus();

      logger.info("=== Service Status ===", { important: true });
      logger.info(
        `SMTP: ${smtpStatus.configured ? "CONFIGURED" : "SIMULATION"}`,
      );
      logger.info(
        `Qiscus WhatsApp: ${
          qiscusStatus.configured ? "CONFIGURED" : "SIMULATION"
        }`,
      );

      // Register webhook after server starts
      await registerQiscusWebhook();

      logger.info(`Webhook URL: ${APP_URL}/webhooks/qiscus`, {
        important: true,
      });

      // Start backup scheduler
      backupScheduler.start();

      logger.info("=== Backup Configuration ===", { important: true });
      const backupStatus = backupScheduler.getStatus();
      logger.info(
        `Backup Scheduler: ${backupStatus.enabled ? "ENABLED" : "DISABLED"}`,
      );
      if (backupStatus.enabled) {
        logger.info(
          `Backup Interval: Every ${backupStatus.intervalHours} hours`,
        );
        logger.info(`Compression: ${backupStatus.compressed ? "ON" : "OFF"}`);
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
  backupScheduler.stop();
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
