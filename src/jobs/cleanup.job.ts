// src/jobs/cleanup.job.ts
import DatabaseService from "../services/database.service";
import logger from "../utils/logger";

interface CleanupConfig {
  intervalMs: number;
  daysToKeep: number;
}

export const scheduleLogCleanup = (): void => {
  const config: CleanupConfig = {
    intervalMs: 24 * 60 * 60 * 1000, // 24 hours
    daysToKeep: parseInt(process.env.LOG_RETENTION_DAYS || "30", 10),
  };

  setInterval(() => {
    try {
      logger.info("Running scheduled log cleanup", {
        daysToKeep: config.daysToKeep,
      });

      DatabaseService.cleanupOldLogs(config.daysToKeep);

      logger.info(`Cleaned up logs older than ${config.daysToKeep} days`, {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Failed to cleanup logs:", error);
    }
  }, config.intervalMs);
};
