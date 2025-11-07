// src/services/backup.service.ts - PostgreSQL Version
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import logger from "../utils/logger";

/**
 * Get Jakarta timestamp for backup filename
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

  return jakartaTime.replace(
    /(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/,
    "$3-$1-$2_$4-$5-$6"
  );
};

class BackupService {
  private backupDir: string;
  private maxBackups: number;
  private pgHost: string;
  private pgPort: string;
  private pgUser: string;
  private pgPassword: string;
  private pgDatabase: string;

  constructor() {
    this.backupDir = path.join(process.cwd(), "backups");
    this.maxBackups = parseInt(process.env.MAX_BACKUPS || "30", 10);

    this.pgHost = process.env.POSTGRES_HOST || "localhost";
    this.pgPort = process.env.POSTGRES_PORT || "5432";
    this.pgUser = process.env.POSTGRES_USER || "";
    this.pgPassword = process.env.POSTGRES_PASSWORD || "";
    this.pgDatabase = process.env.POSTGRES_DB || "";

    // Create backup directory if not exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.info("Backup directory created", { path: this.backupDir });
    }
  }

  /**
   * Create a backup using pg_dump
   */
  backup(): { success: boolean; backupPath?: string; error?: string } {
    try {
      const timestamp = getJakartaTimestamp();
      const backupFilename = `postgres_backup_${timestamp}.sql`;
      const backupPath = path.join(this.backupDir, backupFilename);

      logger.info("Starting PostgreSQL backup...", { important: true });

      // Set PGPASSWORD environment variable for authentication
      const env = {
        ...process.env,
        PGPASSWORD: this.pgPassword,
      };

      // Execute pg_dump
      const command = `pg_dump -h ${this.pgHost} -p ${this.pgPort} -U ${this.pgUser} -d ${this.pgDatabase} -F p -f "${backupPath}"`;

      execSync(command, { env });

      // Verify backup
      const stats = fs.statSync(backupPath);
      if (stats.size === 0) {
        fs.unlinkSync(backupPath);
        throw new Error("Backup file is empty");
      }

      logger.info("PostgreSQL backup created successfully", {
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
      logger.error("Failed to create PostgreSQL backup", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create compressed backup using pg_dump with gzip
   */
  backupCompressed(): {
    success: boolean;
    backupPath?: string;
    error?: string;
  } {
    try {
      const timestamp = getJakartaTimestamp();
      const backupFilename = `postgres_backup_${timestamp}.sql.gz`;
      const backupPath = path.join(this.backupDir, backupFilename);

      logger.info("Starting compressed PostgreSQL backup...", {
        important: true,
      });

      const env = {
        ...process.env,
        PGPASSWORD: this.pgPassword,
      };

      // Execute pg_dump with gzip compression
      const command = `pg_dump -h ${this.pgHost} -p ${this.pgPort} -U ${this.pgUser} -d ${this.pgDatabase} -F p | gzip > "${backupPath}"`;

      execSync(command, { env, shell: "/bin/bash" });

      const stats = fs.statSync(backupPath);
      logger.info("Compressed PostgreSQL backup created", {
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
   * Restore database from backup using psql
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

      logger.warn("Starting database restore...", {
        from: backupPath,
        important: true,
      });

      const env = {
        ...process.env,
        PGPASSWORD: this.pgPassword,
      };

      // Drop existing connections (optional, be careful in production!)
      try {
        execSync(
          `psql -h ${this.pgHost} -p ${this.pgPort} -U ${this.pgUser} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${this.pgDatabase}' AND pid <> pg_backend_pid();"`,
          { env }
        );
      } catch (e) {
        // Ignore error if no connections to drop
      }

      // Restore database
      if (backupFilename.endsWith(".gz")) {
        // Decompress and restore
        const command = `gunzip -c "${backupPath}" | psql -h ${this.pgHost} -p ${this.pgPort} -U ${this.pgUser} -d ${this.pgDatabase}`;
        execSync(command, { env, shell: "/bin/bash" });
      } else {
        // Direct restore
        const command = `psql -h ${this.pgHost} -p ${this.pgPort} -U ${this.pgUser} -d ${this.pgDatabase} -f "${backupPath}"`;
        execSync(command, { env });
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
            f.startsWith("postgres_backup_") &&
            (f.endsWith(".sql") || f.endsWith(".sql.gz"))
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
        .sort((a, b) => b.created.localeCompare(a.created));

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
