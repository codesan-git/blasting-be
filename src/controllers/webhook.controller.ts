import { Request, Response } from "express";
import DatabaseService from "../services/database.service";
import {
  QiscusWebhookPayload,
  QiscusStatusPayload,
  QiscusIncomingPayload,
} from "../types/qiscus.types";
import logger from "../utils/logger";
import ResponseHelper from "../utils/api-response.helper";

/**
 * Handle incoming webhook from Qiscus
 * This endpoint will receive status updates for sent WhatsApp messages
 */
export const handleQiscusWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  const requestId = `webhook-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const payload = req.body as QiscusWebhookPayload;

    // 🔍 Tentukan type secara otomatis jika tidak ada di body
    let derivedType: string | undefined = payload.type;

    if (!derivedType) {
      if ((payload as any).statuses) derivedType = "message_status";
      else if ((payload as any).messages) derivedType = "incoming_message";
      else derivedType = "unknown";
    }

    // Log webhook receipt
    logger.info("=== WEBHOOK RECEIVED ===", {
      requestId,
      type: derivedType,
      payload: JSON.stringify(payload),
      headers: JSON.stringify(req.headers),
      ip: req.ip,
      important: true,
    });

    // Handle unknown payload
    if (derivedType === "unknown") {
      logger.warn("Unknown webhook structure received", {
        requestId,
        body: JSON.stringify(req.body),
        important: true,
      });

      ResponseHelper.success(res, "Webhook received (unknown structure)");
      return;
    }

    // 🔄 Gunakan derivedType untuk routing event
    if (derivedType === "message_status") {
      const statuses = (payload as any).statuses ?? [];
      for (const status of statuses) {
        await handleMessageStatus(
          {
            id: status.id,
            message_id: status.id,
            status: status.status,
            timestamp: status.timestamp,
            from: status.recipient_id,
            error: undefined,
          },
          requestId
        );
      }
    } else if (derivedType === "incoming_message") {
      await handleIncomingMessage((payload as any).messages[0], requestId);
    }

    logger.info("=== WEBHOOK PROCESSED SUCCESSFULLY ===", {
      requestId,
      type: derivedType,
      important: true,
    });

    ResponseHelper.success(res, "Webhook received");
  } catch (error) {
    logger.error("=== WEBHOOK PROCESSING ERROR ===", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      body: JSON.stringify(req.body),
      important: true,
    });

    ResponseHelper.success(res, "Webhook received with errors");
  }
};

/**
 * Handle message status updates (sent, delivered, read, failed)
 */
async function handleMessageStatus(
  payload: QiscusStatusPayload,
  requestId: string
): Promise<void> {
  const startTime = Date.now();

  try {
    const { message_id, status, timestamp, from, error: errorMsg } = payload;

    logger.info(">>> Processing message status", {
      requestId,
      messageId: message_id,
      status,
      from,
      timestamp,
      error: errorMsg,
      rawPayload: JSON.stringify(payload),
      important: true,
    });

    // Validate required fields
    if (!message_id) {
      logger.error("Message status update missing message_id", {
        requestId,
        payload: JSON.stringify(payload),
        important: true,
      });
      return;
    }

    if (!status) {
      logger.error("Message status update missing status", {
        requestId,
        messageId: message_id,
        payload: JSON.stringify(payload),
        important: true,
      });
      return;
    }

    // Check if message exists in database
    const existingMessage = DatabaseService.getMessageByMessageId(message_id);

    if (!existingMessage) {
      logger.warn("⚠️ Message not found in database", {
        requestId,
        messageId: message_id,
        status,
        note: "This message may have been sent before webhook was configured",
        important: true,
      });
      return;
    }

    logger.info("✓ Message found in database", {
      requestId,
      messageId: message_id,
      currentStatus: existingMessage.status,
      newStatus: status,
      recipient: existingMessage.recipient_phone,
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

        logger.info("✅ Message status updated to SENT", {
          requestId,
          messageId: message_id,
          timestamp,
          recipient: from,
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

        logger.info("✅ Message DELIVERED to recipient", {
          requestId,
          messageId: message_id,
          timestamp,
          recipient: from,
          important: true,
        });
        break;

      case "read":
        // Message read by recipient (no DB update needed, just log)
        logger.info("👁️ Message READ by recipient", {
          requestId,
          messageId: message_id,
          timestamp,
          recipient: from,
          important: true,
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

        logger.error("❌ Message FAILED", {
          requestId,
          messageId: message_id,
          error: failureReason,
          timestamp,
          recipient: from,
          important: true,
        });
        break;

      default:
        logger.warn("⚠️ Unknown status type", {
          requestId,
          status,
          messageId: message_id,
          payload: JSON.stringify(payload),
          important: true,
        });
    }

    logger.info(">>> Message status update completed", {
      requestId,
      messageId: message_id,
      status,
      processingTime: Date.now() - startTime,
      important: true,
    });
  } catch (error) {
    logger.error(">>> Error handling message status", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      payload: JSON.stringify(payload),
      processingTime: Date.now() - startTime,
      important: true,
    });
  }
}

/**
 * Handle incoming messages (replies from customers)
 */
async function handleIncomingMessage(
  payload: QiscusIncomingPayload,
  requestId: string
): Promise<void> {
  try {
    const { from, message, timestamp } = payload;

    logger.info(">>> Received incoming message", {
      requestId,
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

    logger.info(">>> Incoming message logged", {
      requestId,
      from,
      important: true,
    });
  } catch (error) {
    logger.error(">>> Error handling incoming message", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      payload: JSON.stringify(payload),
      important: true,
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
    const testId = `test-${Date.now()}`;

    logger.info("=== TEST WEBHOOK CALLED ===", {
      testId,
      body: JSON.stringify(req.body),
      headers: JSON.stringify(req.headers),
      ip: req.ip,
      important: true,
    });

    ResponseHelper.success(res, {
      message: "Webhook test successful",
      testId,
      received: req.body,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("=== ERROR IN TEST WEBHOOK ===", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      important: true,
    });

    ResponseHelper.error(res, "Webhook test failed");
  }
};
