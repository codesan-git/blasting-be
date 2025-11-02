import { Router } from "express";
import {
  handleQiscusWebhook,
  testWebhook,
} from "../controllers/webhook.controller";

const router = Router();

// Qiscus webhook endpoint (no rate limiting for webhooks)
router.post("/qiscus", handleQiscusWebhook);

// Test webhook endpoint
router.post("/test", testWebhook);

export default router;
