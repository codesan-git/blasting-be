import dotenv from "dotenv";
import app from "../app";
import logger from "../utils/logger";
import { emailWorker } from "../workers/email.worker";
import { createRedisConnection } from "../config/redis";

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

const startServer = async () => {
  try {
    await testRedisConnection();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info("Email worker is active and processing jobs");
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
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, closing server gracefully");
  await emailWorker.close();
  process.exit(0);
});

startServer();
