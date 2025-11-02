// src/jobs/backup.job.ts
import backupService from "../services/backup.service";
import logger from "../utils/logger";

interface BackupScheduleConfig {
  enabled: boolean;
  intervalHours: number;
  compressed: boolean;
  scheduledTime?: string; // Format: "HH:MM" (Jakarta time)
}

class BackupScheduler {
  private config: BackupScheduleConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private dailyTimeoutId: NodeJS.Timeout | null = null;

  constructor() {
    this.config = {
      enabled: process.env.BACKUP_ENABLED === "true",
      intervalHours: parseInt(process.env.BACKUP_INTERVAL_HOURS || "24", 10),
      compressed: process.env.BACKUP_COMPRESSED === "true",
      scheduledTime: process.env.BACKUP_SCHEDULED_TIME, // e.g., "02:00"
    };
  }

  /**
   * Start the backup scheduler
   */
  start(): void {
    if (!this.config.enabled) {
      logger.info("Backup scheduler is disabled");
      return;
    }

    // If scheduled time is set, use daily scheduler at specific time
    if (this.config.scheduledTime) {
      this.startDailyScheduler();
    } else {
      // Otherwise, use interval-based scheduler
      this.startIntervalScheduler();
    }
  }

  /**
   * Start daily scheduler at specific time (e.g., 02:00 WIB)
   */
  private startDailyScheduler(): void {
    if (!this.config.scheduledTime) return;

    const [targetHour, targetMinute] = this.config.scheduledTime
      .split(":")
      .map(Number);

    logger.info("Starting daily backup scheduler", {
      scheduledTime: this.config.scheduledTime,
      timezone: "Asia/Jakarta (WIB)",
      compressed: this.config.compressed,
      important: true,
    });

    // Function to schedule next backup
    const scheduleNextBackup = () => {
      const now = new Date();

      // Get current time in Jakarta
      const jakartaNow = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
      );

      // Set target time for today
      const targetTime = new Date(jakartaNow);
      targetTime.setHours(targetHour, targetMinute, 0, 0);

      // If target time already passed today, schedule for tomorrow
      if (jakartaNow >= targetTime) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      // Calculate delay until target time
      const delay = targetTime.getTime() - jakartaNow.getTime();

      logger.info("Next backup scheduled", {
        nextBackupTime: targetTime.toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
          dateStyle: "full",
          timeStyle: "long",
        }),
        delayMs: delay,
        delayHours: (delay / 1000 / 60 / 60).toFixed(2),
        important: true,
      });

      // Schedule backup
      this.dailyTimeoutId = setTimeout(() => {
        this.runBackup();
        // Schedule next backup after this one completes
        scheduleNextBackup();
      }, delay);
    };

    // Run first backup immediately if it's past scheduled time and no backup today
    const shouldRunImmediately = this.shouldRunImmediateBackup(
      targetHour,
      targetMinute
    );

    if (shouldRunImmediately) {
      logger.info("Running initial backup (no backup found for today)", {
        important: true,
      });
      this.runBackup();
    }

    // Schedule next backup
    scheduleNextBackup();
  }

  /**
   * Start interval-based scheduler (legacy mode)
   */
  private startIntervalScheduler(): void {
    logger.info("Starting interval-based backup scheduler", {
      intervalHours: this.config.intervalHours,
      compressed: this.config.compressed,
      important: true,
    });

    // Run backup immediately on start
    this.runBackup();

    // Schedule periodic backups
    const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.runBackup();
    }, intervalMs);

    logger.info(`Backup scheduled every ${this.config.intervalHours} hours`, {
      important: true,
    });
  }

  /**
   * Check if we should run immediate backup
   * (no backup exists for today after scheduled time)
   */
  private shouldRunImmediateBackup(
    targetHour: number,
    targetMinute: number
  ): boolean {
    try {
      const backups = backupService.listBackups();
      if (backups.length === 0) return true;

      // Get today's date in Jakarta
      const now = new Date();
      const jakartaNow = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
      );

      const todayStart = new Date(jakartaNow);
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date(jakartaNow);
      todayEnd.setHours(23, 59, 59, 999);

      // Check if any backup exists for today
      const hasTodayBackup = backups.some((backup) => {
        const backupDate = new Date(backup.created);
        return backupDate >= todayStart && backupDate <= todayEnd;
      });

      // Run immediately if:
      // 1. No backup today AND
      // 2. Current time is past scheduled time
      const scheduledTimeToday = new Date(jakartaNow);
      scheduledTimeToday.setHours(targetHour, targetMinute, 0, 0);

      return !hasTodayBackup && jakartaNow >= scheduledTimeToday;
    } catch (error) {
      logger.error("Error checking if should run immediate backup", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  /**
   * Stop the backup scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("Interval backup scheduler stopped");
    }

    if (this.dailyTimeoutId) {
      clearTimeout(this.dailyTimeoutId);
      this.dailyTimeoutId = null;
      logger.info("Daily backup scheduler stopped");
    }
  }

  /**
   * Run backup now
   */
  runBackup(): void {
    logger.info("Running scheduled backup...", { important: true });

    try {
      const result = this.config.compressed
        ? backupService.backupCompressed()
        : backupService.backup();

      if (result.success) {
        logger.info("Scheduled backup completed successfully", {
          backupPath: result.backupPath,
          important: true,
        });

        // Log backup stats
        const stats = backupService.getStats();
        logger.info("Backup statistics", {
          totalBackups: stats.totalBackups,
          totalSize: stats.totalSize,
        });
      } else {
        logger.error("Scheduled backup failed", {
          error: result.error,
          important: true,
        });
      }
    } catch (error) {
      logger.error("Error during scheduled backup", {
        error: error instanceof Error ? error.message : "Unknown error",
        important: true,
      });
    }
  }

  /**
   * Trigger manual backup via API
   */
  triggerManualBackup(): {
    success: boolean;
    backupPath?: string;
    error?: string;
  } {
    logger.info("Manual backup triggered via API", { important: true });
    return this.config.compressed
      ? backupService.backupCompressed()
      : backupService.backup();
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    enabled: boolean;
    running: boolean;
    mode: "daily" | "interval";
    intervalHours?: number;
    scheduledTime?: string;
    nextBackupTime?: string;
    compressed: boolean;
  } {
    const isRunning = this.intervalId !== null || this.dailyTimeoutId !== null;
    const mode = this.config.scheduledTime ? "daily" : "interval";

    let nextBackupTime: string | undefined;

    if (mode === "daily" && this.config.scheduledTime) {
      // Calculate next backup time
      const [targetHour, targetMinute] = this.config.scheduledTime
        .split(":")
        .map(Number);

      const now = new Date();
      const jakartaNow = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
      );

      const targetTime = new Date(jakartaNow);
      targetTime.setHours(targetHour, targetMinute, 0, 0);

      if (jakartaNow >= targetTime) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      nextBackupTime = targetTime.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "full",
        timeStyle: "long",
      });
    }

    return {
      enabled: this.config.enabled,
      running: isRunning,
      mode,
      intervalHours:
        mode === "interval" ? this.config.intervalHours : undefined,
      scheduledTime: this.config.scheduledTime,
      nextBackupTime,
      compressed: this.config.compressed,
    };
  }
}

export const backupScheduler = new BackupScheduler();
export default backupScheduler;
