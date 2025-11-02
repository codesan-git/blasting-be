import axios from "axios";
import logger from "../utils/logger";
import {
  QiscusWebhookRequest,
  QiscusWebhookResponse,
} from "../types/qiscus.types";

class QiscusWebhookService {
  private baseUrl: string;
  private appId: string;
  private secretKey: string;
  private channelId: string;
  private isConfigured: boolean = false;

  constructor() {
    this.baseUrl = process.env.QISCUS_BASE_URL || "";
    this.appId = process.env.QISCUS_APP_ID || "";
    this.secretKey = process.env.QISCUS_SECRET_KEY || "";
    this.channelId = process.env.QISCUS_CHANNEL_ID || "";

    this.isConfigured = !!(
      this.baseUrl &&
      this.appId &&
      this.secretKey &&
      this.channelId
    );

    if (this.isConfigured) {
      logger.info("Qiscus Webhook Service initialized", {
        baseUrl: this.baseUrl,
        appId: this.appId,
        important: true,
      });
    }
  }

  /**
   * Register webhook URL to Qiscus
   * This should be called once during app initialization
   */
  async registerWebhook(webhookUrl: string): Promise<QiscusWebhookResponse> {
    if (!this.isConfigured) {
      logger.warn("Qiscus not configured, skipping webhook registration");
      return {
        success: false,
        message: "Qiscus not configured",
      };
    }

    try {
      // Correct URL format based on Golang code
      const url = `${this.baseUrl}/whatsapp/${this.appId}/${this.channelId}/settings`;

      const requestBody: QiscusWebhookRequest = {
        webhooks: {
          url: webhookUrl,
        },
      };

      logger.info("Registering Qiscus webhook", {
        url: webhookUrl,
        apiUrl: url,
        important: true,
      });

      const response = await axios.post(url, requestBody, {
        headers: {
          "Content-Type": "application/json",
          "Qiscus-App-Id": this.appId,
          "Qiscus-Secret-Key": this.secretKey,
        },
        timeout: 10000,
      });

      logger.info("Webhook registered successfully", {
        response: response.data,
        important: true,
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error("Failed to register webhook", {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url,
        });

        return {
          success: false,
          message: error.response?.data?.message || error.message,
        };
      }

      logger.error("Failed to register webhook", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get current webhook configuration
   */
  async getWebhookConfig(): Promise<any> {
    if (!this.isConfigured) {
      return null;
    }

    try {
      // Correct URL format based on Golang code
      const url = `${this.baseUrl}/whatsapp/${this.appId}/${this.channelId}/settings`;

      const response = await axios.get(url, {
        headers: {
          "Qiscus-App-Id": this.appId,
          "Qiscus-Secret-Key": this.secretKey,
        },
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      logger.error("Failed to get webhook config", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  getStatus(): {
    configured: boolean;
    baseUrl?: string;
    appId?: string;
  } {
    return {
      configured: this.isConfigured,
      baseUrl: this.baseUrl,
      appId: this.appId,
    };
  }
}

export const qiscusWebhookService = new QiscusWebhookService();
export default qiscusWebhookService;
