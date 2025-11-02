import { Request, Response } from "express";
import DatabaseService from "../services/database.service";
import {
  QiscusWebhookPayload,
  QiscusStatusPayload,
  QiscusIncomingPayload,
} from "../types/qiscus.types";
import logger from "../utils/logger";

/**
 * Handle incoming webhook from Qiscus
 * This endpoint will receive status updates for sent WhatsApp messages
 */
export const handleQiscusWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const payload = req.body as QiscusWebhookPayload;

    logger.info("Received Qiscus webhook", {
      type: payload.type,
      important: true,
    });

    // Handle different webhook types with type narrowing
    if (payload.type === "message_status") {
      await handleMessageStatus(payload.payload);
    } else if (payload.type === "incoming_message") {
      await handleIncomingMessage(payload.payload);
    } else {
      logger.warn("Unknown webhook type", {
        type: (payload as any).type,
        payload,
      });
    }

    // Always respond with 200 to acknowledge receipt
    res.status(200).json({
      success: true,
      message: "Webhook received",
    });
  } catch (error) {
    logger.error("Error processing webhook", {
      error: error instanceof Error ? error.message : "Unknown error",
      body: req.body,
    });

    // Still return 200 to prevent Qiscus from retrying
    res.status(200).json({
      success: true,
      message: "Webhook received with errors",
    });
  }
};

/**
 * Handle message status updates (sent, delivered, read, failed)
 */
async function handleMessageStatus(
  payload: QiscusStatusPayload
): Promise<void> {
  try {
    const { message_id, status, timestamp, from, error: errorMsg } = payload;

    if (!message_id || !status) {
      logger.warn("Invalid message status payload", { payload });
      return;
    }

    logger.info("Processing message status update", {
      messageId: message_id,
      status,
      from,
      important: true,
    });

    // Update database based on status
    switch (status) {
      case "sent":
        // Message successfully sent to WhatsApp server
        DatabaseService.updateMessageStatusByMessageId(
          message_id,
          "sent",
          undefined
        );

        logger.info("Message sent successfully", {
          messageId: message_id,
          timestamp,
          important: true,
        });
        break;

      case "delivered":
        // Message delivered to recipient's phone
        DatabaseService.updateMessageStatusByMessageId(
          message_id,
          "sent", // Keep as 'sent' in our system
          undefined
        );

        logger.info("Message delivered", {
          messageId: message_id,
          timestamp,
        });
        break;

      case "read":
        // Message read by recipient (no DB update needed, just log)
        logger.info("Message read", {
          messageId: message_id,
          timestamp,
        });
        break;

      case "failed":
        // Message failed to send
        const failureReason = errorMsg || "Message delivery failed";

        DatabaseService.updateMessageStatusByMessageId(
          message_id,
          "failed",
          failureReason
        );

        logger.error("Message delivery failed", {
          messageId: message_id,
          error: failureReason,
          important: true,
        });
        break;

      default:
        logger.warn("Unknown status type", { status, payload });
    }

    logger.info("Message status updated successfully", {
      messageId: message_id,
      status,
      important: true,
    });
  } catch (error) {
    logger.error("Error handling message status", {
      error: error instanceof Error ? error.message : "Unknown error",
      payload,
    });
  }
}

/**
 * Handle incoming messages (replies from customers)
 */
async function handleIncomingMessage(
  payload: QiscusIncomingPayload
): Promise<void> {
  try {
    const { from, message, timestamp } = payload;

    logger.info("Received incoming message", {
      from,
      messageText: message.text,
      messageType: message.type,
      timestamp,
      important: true,
    });

    // TODO: Store incoming messages to database if needed
    // TODO: Implement auto-reply logic
    // TODO: Create support ticket
    // TODO: Notify admin via email/Slack

    // For now, just log the incoming message
    // You can extend this based on your requirements
  } catch (error) {
    logger.error("Error handling incoming message", {
      error: error instanceof Error ? error.message : "Unknown error",
      payload,
    });
  }
}

/**
 * Test webhook endpoint
 */
export const testWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    logger.info("Test webhook called", {
      body: req.body,
      important: true,
    });

    res.status(200).json({
      success: true,
      message: "Webhook test successful",
      received: req.body,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error in test webhook", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      message: "Webhook test failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
