import { Redis } from "ioredis";
import logger from "../utils/logger";

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
};

export const createRedisConnection = (): Redis => {
  const connection = new Redis(redisConfig);

  connection.on("connect", () => {
    logger.info("Redis connected successfully");
  });

  connection.on("error", (err) => {
    logger.error("Redis connection error:", err);
  });

  return connection;
};

export default redisConfig;
