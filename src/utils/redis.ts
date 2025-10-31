import { createClient } from "redis";
import logger from "./logger";

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || "redis",
    port: Number(process.env.REDIS_PORT) || 6379,
  },
});

redisClient.on("connect", () => {
  logger.info("✅ Connected to Redis successfully");
});

redisClient.on("error", (err) => {
  logger.error("❌ Redis connection error:", err);
});

(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error("❌ Failed to connect to Redis:", error);
  }
})();

export default redisClient;
