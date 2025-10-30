import { Router } from "express";
import { sendEmailBlast, getQueueStats } from "../controllers/email.controller";

const router = Router();

router.post("/blast", sendEmailBlast);
router.get("/stats", getQueueStats);

export default router;
