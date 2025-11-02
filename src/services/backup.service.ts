// src/services/backup.service.ts
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import logger from "../utils/logger";

/**
 * Get Jakarta timestamp for backup filename
 * Format: 2025-11-02_14-30-45
 */
const getJakartaTimestamp = (): string => {
  const now = new Date();
  const jakartaTime = now.toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Convert "11/02/2025, 14:30:45" to "2025-11-02_14-30-45"
  return jakartaTime.replace(
    /(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/,
    "$3-$1-$2_$4-$5-$6"
  );
};

class BackupService {
  private backupDir: string;
  private dbPath: string;
  private maxBackups: number;

  constructor() {
    this.dbPath = path.join(process.cwd(), "data", "logs.db");
    this.backupDir = path.join(process.cwd(), "backups");
    this.maxBackups = parseInt(process.env.MAX_BACKUPS || "30", 10);

    // Create backup directory if not exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.info("Backup directory created", { path: this.backupDir });
    }
  }

  /**
   * Create a backup of the database
   */
  backup(): { success: boolean; backupPath?: string; error?: string } {
    try {
      // Generate backup filename with Jakarta timezone timestamp
      const timestamp = getJakartaTimestamp();
      const backupFilename = `logs_backup_${timestamp}.db`;
      const backupPath = path.join(this.backupDir, backupFilename);

      // Check if source database exists
      if (!fs.existsSync(this.dbPath)) {
        logger.error("Database file not found", { path: this.dbPath });
        return {
          success: false,
          error: "Database file not found",
        };
      }

      // Copy database file
      fs.copyFileSync(this.dbPath, backupPath);

      // Verify backup
      const stats = fs.statSync(backupPath);
      if (stats.size === 0) {
        fs.unlinkSync(backupPath);
        throw new Error("Backup file is empty");
      }

      logger.info("Database backup created successfully", {
        backupPath,
        size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
        important: true,
      });

      // Cleanup old backups
      this.cleanupOldBackups();

      return {
        success: true,
        backupPath,
      };
    } catch (error) {
      logger.error("Failed to create database backup", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create compressed backup (gzip)
   */
  backupCompressed(): {
    success: boolean;
    backupPath?: string;
    error?: string;
  } {
    try {
      // Generate backup filename with Jakarta timezone timestamp
      const timestamp = getJakartaTimestamp();
      const backupFilename = `logs_backup_${timestamp}.db.gz`;
      const backupPath = path.join(this.backupDir, backupFilename);

      // Check if source database exists
      if (!fs.existsSync(this.dbPath)) {
        return {
          success: false,
          error: "Database file not found",
        };
      }

      // Use gzip to compress (requires gzip installed on system)
      execSync(`gzip -c "${this.dbPath}" > "${backupPath}"`);

      const stats = fs.statSync(backupPath);
      logger.info("Compressed database backup created", {
        backupPath,
        size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
        important: true,
      });

      this.cleanupOldBackups();

      return {
        success: true,
        backupPath,
      };
    } catch (error) {
      logger.error("Failed to create compressed backup", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Restore database from backup
   */
  restore(backupFilename: string): { success: boolean; error?: string } {
    try {
      const backupPath = path.join(this.backupDir, backupFilename);

      // Check if backup exists
      if (!fs.existsSync(backupPath)) {
        return {
          success: false,
          error: "Backup file not found",
        };
      }

      // Create a backup of current database before restoring
      const currentBackupPath = path.join(
        this.backupDir,
        `logs_before_restore_${getJakartaTimestamp()}.db`
      );
      if (fs.existsSync(this.dbPath)) {
        fs.copyFileSync(this.dbPath, currentBackupPath);
        logger.info("Current database backed up before restore", {
          path: currentBackupPath,
        });
      }

      // Restore backup
      if (backupFilename.endsWith(".gz")) {
        // Decompress and restore
        execSync(`gunzip -c "${backupPath}" > "${this.dbPath}"`);
      } else {
        // Direct copy
        fs.copyFileSync(backupPath, this.dbPath);
      }

      logger.info("Database restored successfully", {
        from: backupPath,
        important: true,
      });

      return { success: true };
    } catch (error) {
      logger.error("Failed to restore database", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * List all available backups
   */
  listBackups(): Array<{
    filename: string;
    size: string;
    created: string;
    compressed: boolean;
  }> {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return [];
      }

      const files = fs.readdirSync(this.backupDir);
      const backups = files
        .filter(
          (f) =>
            f.startsWith("logs_backup_") &&
            (f.endsWith(".db") || f.endsWith(".db.gz"))
        )
        .map((filename) => {
          const filePath = path.join(this.backupDir, filename);
          const stats = fs.statSync(filePath);

          return {
            filename,
            size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
            created: stats.birthtime.toISOString(),
            compressed: filename.endsWith(".gz"),
          };
        })
        .sort((a, b) => b.created.localeCompare(a.created)); // Newest first

      return backups;
    } catch (error) {
      logger.error("Failed to list backups", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return [];
    }
  }

  /**
   * Delete old backups, keep only the most recent ones
   */
  private cleanupOldBackups(): void {
    try {
      const backups = this.listBackups();

      if (backups.length <= this.maxBackups) {
        return;
      }

      // Delete oldest backups
      const toDelete = backups.slice(this.maxBackups);
      toDelete.forEach((backup) => {
        const filePath = path.join(this.backupDir, backup.filename);
        fs.unlinkSync(filePath);
        logger.info("Old backup deleted", { filename: backup.filename });
      });

      logger.info("Backup cleanup completed", {
        deleted: toDelete.length,
        kept: this.maxBackups,
      });
    } catch (error) {
      logger.error("Failed to cleanup old backups", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get backup statistics
   */
  getStats(): {
    totalBackups: number;
    totalSize: string;
    oldestBackup?: string;
    newestBackup?: string;
  } {
    const backups = this.listBackups();

    if (backups.length === 0) {
      return {
        totalBackups: 0,
        totalSize: "0 MB",
      };
    }

    // Calculate total size
    const totalBytes = backups.reduce((sum, backup) => {
      const sizeInMB = parseFloat(backup.size.replace(" MB", ""));
      return sum + sizeInMB * 1024 * 1024;
    }, 0);

    return {
      totalBackups: backups.length,
      totalSize: `${(totalBytes / 1024 / 1024).toFixed(2)} MB`,
      oldestBackup: backups[backups.length - 1]?.created,
      newestBackup: backups[0]?.created,
    };
  }
}

export const backupService = new BackupService();
export default backupService;
