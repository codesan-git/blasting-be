// src/routes/backup.routes.ts
import { Router, Request, Response } from "express";
import backupService from "../services/backup.service";
import backupScheduler from "../jobs/backup.job";
import logger from "../utils/logger";
import ResponseHelper from "../utils/api-response.helper";

const router = Router();

/**
 * Create backup now
 * POST /api/backup/create
 */
router.post("/create", async (req: Request, res: Response) => {
  try {
    const { compressed = false } = req.body;

    logger.info("Manual backup requested", {
      compressed,
      ip: req.ip,
      important: true,
    });

    const result = compressed
      ? backupService.backupCompressed()
      : backupService.backup();

    if (result.success) {
      ResponseHelper.success(res, {
        success: true,
        message: "Backup created successfully",
        backupPath: result.backupPath,
        stats: backupService.getStats(),
      });
    } else {
      ResponseHelper.error(res, `Failed to create backup: ${result.error}`);
    }
  } catch (error) {
    logger.error("Error creating backup", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    ResponseHelper.error(res, `Failed to create backup: ${error}`);
  }
});

/**
 * List all backups
 * GET /api/backup/list
 */
router.get("/list", (req: Request, res: Response) => {
  try {
    const backups = backupService.listBackups();
    const stats = backupService.getStats();

    ResponseHelper.success(res, {
      success: true,
      count: backups.length,
      stats,
      backups,
    });
  } catch (error) {
    logger.error("Error listing backups", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    ResponseHelper.error(res, `Failed to list backups: ${error}`);
  }
});

/**
 * Get backup statistics
 * GET /api/backup/stats
 */
router.get("/stats", (req: Request, res: Response) => {
  try {
    const stats = backupService.getStats();

    ResponseHelper.success(res, {
      success: true,
      stats,
    });
  } catch (error) {
    ResponseHelper.error(res, `Failed to get backup statistics: ${error}`);
  }
});

/**
 * Restore database from backup
 * POST /api/backup/restore
 * Body: { backupFilename: "logs_backup_2025-11-02_10-30-00.db" }
 */
router.post("/restore", async (req: Request, res: Response) => {
  try {
    const { backupFilename } = req.body;

    if (!backupFilename) {
      ResponseHelper.error(res, "backupFilename is required");
      return;
    }

    logger.warn("Database restore requested", {
      backupFilename,
      ip: req.ip,
      important: true,
    });

    const result = backupService.restore(backupFilename);

    if (result.success) {
      logger.info("Database restored successfully", {
        backupFilename,
        important: true,
      });

      ResponseHelper.success(res, {
        success: true,
        message:
          "Database restored successfully. Please restart the application.",
      });
    } else {
      ResponseHelper.error(res, `Failed to restore database: ${result.error}`);
    }
  } catch (error) {
    logger.error("Error restoring database", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    ResponseHelper.error(res, `Failed to restore database: ${error}`);
  }
});

/**
 * Get backup scheduler status
 * GET /api/backup/scheduler/status
 */
router.get("/scheduler/status", (req: Request, res: Response) => {
  const status = backupScheduler.getStatus();

  ResponseHelper.success(res, {
    success: true,
    scheduler: status,
  });
});

/**
 * Download backup file
 * GET /api/backup/download/:filename
 */
router.get("/download/:filename", (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const backups = backupService.listBackups();
    const backup = backups.find((b) => b.filename === filename);

    if (!backup) {
      ResponseHelper.error(res, "Backup file not found");
      return;
    }

    const backupPath = require("path").join(process.cwd(), "backups", filename);

    logger.info("Backup download requested", {
      filename,
      ip: req.ip,
    });

    res.download(backupPath, filename, (err) => {
      if (err) {
        logger.error("Error downloading backup", {
          filename,
          error: err.message,
        });
        ResponseHelper.error(res, "Failed to download backup");
      }
    });
  } catch (error) {
    logger.error("Error in backup download", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    ResponseHelper.error(res, `Failed to download backup: ${error}`);
  }
});

export default router;
