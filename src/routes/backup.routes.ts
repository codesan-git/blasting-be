// src/routes/backup.routes.ts
import { Router, Request, Response } from "express";
import backupService from "../services/backup.service";
import backupScheduler from "../jobs/backup.job";
import logger from "../utils/logger";

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
      res.status(200).json({
        success: true,
        message: "Backup created successfully",
        backupPath: result.backupPath,
        stats: backupService.getStats(),
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to create backup",
        error: result.error,
      });
    }
  } catch (error) {
    logger.error("Error creating backup", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Failed to create backup",
      error: error instanceof Error ? error.message : "Unknown error",
    });
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

    res.status(200).json({
      success: true,
      count: backups.length,
      stats,
      backups,
    });
  } catch (error) {
    logger.error("Error listing backups", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Failed to list backups",
    });
  }
});

/**
 * Get backup statistics
 * GET /api/backup/stats
 */
router.get("/stats", (req: Request, res: Response) => {
  try {
    const stats = backupService.getStats();

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get backup statistics",
    });
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
      res.status(400).json({
        success: false,
        message: "backupFilename is required",
      });
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

      res.status(200).json({
        success: true,
        message:
          "Database restored successfully. Please restart the application.",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to restore database",
        error: result.error,
      });
    }
  } catch (error) {
    logger.error("Error restoring database", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Failed to restore database",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get backup scheduler status
 * GET /api/backup/scheduler/status
 */
router.get("/scheduler/status", (req: Request, res: Response) => {
  const status = backupScheduler.getStatus();

  res.status(200).json({
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
      res.status(404).json({
        success: false,
        message: "Backup file not found",
      });
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
        res.status(500).json({
          success: false,
          message: "Failed to download backup",
        });
      }
    });
  } catch (error) {
    logger.error("Error in backup download", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Failed to download backup",
    });
  }
});

export default router;
