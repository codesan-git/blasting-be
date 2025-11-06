// src/config/redis.ts
import { Redis, RedisOptions } from "ioredis";
import logger from "../utils/logger";

// Konfigurasi default Redis
const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  reconnectOnError: (err) => {
    const targetErrors = ["READONLY", "ECONNRESET", "ETIMEDOUT"];
    const shouldReconnect = targetErrors.some((target) =>
      err.message.includes(target)
    );
    if (shouldReconnect) {
      logger.warn("🔁 Redis reconnecting due to transient error:", err.message);
    }
    return shouldReconnect;
  },
};

// Factory: buat koneksi baru Redis (dipakai Worker atau Queue)
export const createRedisConnection = (): Redis => {
  const connection = new Redis(redisConfig);

  connection.on("connect", () => {
    logger.info("✅ Redis connected successfully");
  });

  connection.on("ready", () => {
    logger.info("🚀 Redis connection is ready");
  });

  connection.on("error", (err) => {
    logger.error("❌ Redis connection error:", err);
  });

  connection.on("close", () => {
    logger.warn("⚠️ Redis connection closed");
  });

  return connection;
};

export default redisConfig;
