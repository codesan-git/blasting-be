import { Router } from "express";
import {
  sendMessageBlast,
  getQueueStats,
} from "../controllers/message.controller";

const router = Router();

router.post("/blast", sendMessageBlast);
router.get("/stats", getQueueStats);

export default router;
