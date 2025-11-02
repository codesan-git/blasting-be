import { Router } from "express";
import {
  handleQiscusWebhook,
  testWebhook,
} from "../controllers/webhook.controller";

const router = Router();

// Log semua request ke webhook routes untuk debugging
router.use((req, res, next) => {
  console.log(`[WEBHOOK ROUTE] ${req.method} ${req.path}`);
  next();
});

// Qiscus webhook endpoint (no rate limiting for webhooks)
// POST /webhooks/qiscus
router.post("/qiscus", handleQiscusWebhook);

// GET /webhooks/qiscus - untuk test connection
router.get("/qiscus", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Qiscus webhook endpoint is ready",
    method: "POST",
    endpoint: "/webhooks/qiscus",
    usage: "Send POST request with webhook payload",
  });
});

// Test webhook endpoint
// POST /webhooks/test
router.post("/test", testWebhook);

// GET /webhooks/test - untuk test connection
router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Test webhook endpoint is ready",
    method: "POST",
    endpoint: "/webhooks/test",
  });
});

// Debug: List all available webhook endpoints
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Webhook endpoints available",
    endpoints: [
      {
        path: "/webhooks/qiscus",
        methods: ["GET", "POST"],
        description: "Qiscus WhatsApp webhook handler",
      },
      {
        path: "/webhooks/test",
        methods: ["GET", "POST"],
        description: "Test webhook handler",
      },
    ],
  });
});

export default router;
