// Qiscus Webhook Types

// Base payload interface
export interface QiscusPayloadBase {
  from: string;
  id: string;
  timestamp: string;
}

// Message Status Payload (when Qiscus sends status updates)
export interface QiscusStatusPayload extends QiscusPayloadBase {
  status: "sent" | "delivered" | "read" | "failed";
  message_id: string;
  recipient_id?: string;
  error?: string; // Error message if status is "failed"
}

// Incoming Message Payload (when customer replies)
export interface QiscusIncomingPayload extends QiscusPayloadBase {
  type: string;
  message: {
    text: string;
    type: string;
  };
}

// Main webhook payload with discriminated union
export type QiscusWebhookPayload =
  | {
      type: "message_status";
      payload: QiscusStatusPayload;
    }
  | {
      type: "incoming_message";
      payload: QiscusIncomingPayload;
    };

// Webhook registration request
export interface QiscusWebhookRequest {
  webhooks: {
    url: string;
  };
}

// Webhook registration response
export interface QiscusWebhookResponse {
  success: boolean;
  data?: {
    url: string;
    created_at: string;
  };
  message?: string;
}

// Helper type for status updates
export interface QiscusStatusUpdate {
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  from?: string;
  error?: string;
}
