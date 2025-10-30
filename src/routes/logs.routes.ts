import { Router } from "express";
import {
  getMessageLogs,
  getMessageStats,
  getMessageStatsByDate,
  getAPILogs,
  getSystemLogs,
  cleanupLogs,
} from "../controllers/logs.controller";

const router = Router();

// Message logs
router.get("/messages", getMessageLogs);
router.get("/messages/stats", getMessageStats);
router.get("/messages/stats/by-date", getMessageStatsByDate);

// API logs
router.get("/api", getAPILogs);

// System logs
router.get("/system", getSystemLogs);

// Cleanup
router.post("/cleanup", cleanupLogs);

export default router;
