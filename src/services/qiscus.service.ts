import axios from "axios";
import logger from "../utils/logger";

interface QiscusTemplateComponent {
  type: string;
  parameters?: Array<{
    type: string;
    text: string;
  }>;
  sub_type?: string;
  index?: string;
}

interface QiscusTemplateMessage {
  to: string;
  type: "template";
  template: {
    namespace: string;
    name: string;
    language: {
      policy: "deterministic";
      code: string;
    };
    components: QiscusTemplateComponent[];
  };
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class QiscusService {
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
      logger.info("Qiscus WhatsApp Service initialized", {
        baseUrl: this.baseUrl,
        appId: this.appId,
        channelId: this.channelId,
      });
    } else {
      logger.warn(
        "Qiscus WhatsApp not configured. WhatsApp sending will be simulated."
      );
    }
  }

  async sendTemplateMessage(
    phone: string,
    templateName: string,
    components: QiscusTemplateComponent[],
    namespace?: string
  ): Promise<SendResult> {
    if (!this.isConfigured) {
      return this.simulateWhatsAppSending(phone, templateName);
    }

    try {
      // Format phone number (pastikan format: 6285xxx tanpa +)
      const formattedPhone = phone.replace(/^\+/, "").replace(/^0/, "62");

      const message: QiscusTemplateMessage = {
        to: formattedPhone,
        type: "template",
        template: {
          namespace: namespace || "b393932b_0056_4389_a284_c45fb5f78ef0", // default namespace
          name: templateName,
          language: {
            policy: "deterministic",
            code: "id",
          },
          components,
        },
      };

      const url = `${this.baseUrl}/whatsapp/v1/${this.appId}/${this.channelId}/messages`;

      logger.info("Sending WhatsApp template message", {
        url,
        phone: formattedPhone,
        template: templateName,
      });

      const response = await axios.post(url, message, {
        headers: {
          "Content-Type": "application/json",
          "qiscus-app-id": this.appId,
          "qiscus-secret-key": this.secretKey,
        },
        timeout: 10000, // 10 second timeout
      });

      logger.info("WhatsApp message sent successfully", {
        phone: formattedPhone,
        template: templateName,
        messageId: response.data?.data?.id,
        response: response.data,
      });

      return {
        success: true,
        messageId: response.data?.data?.id || `qiscus-${Date.now()}`,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error("Failed to send WhatsApp message via Qiscus", {
          phone,
          template: templateName,
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });

        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }

      logger.error("Failed to send WhatsApp message", {
        phone,
        template: templateName,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async simulateWhatsAppSending(
    phone: string,
    templateName: string
  ): Promise<SendResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const isSuccess = Math.random() > 0.1;

        if (isSuccess) {
          const messageId = `simulated-wa-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;

          logger.info("WhatsApp message simulated successfully", {
            phone,
            template: templateName,
            messageId,
            mode: "SIMULATION",
          });

          resolve({ success: true, messageId });
        } else {
          logger.warn("WhatsApp simulation failed", {
            phone,
            template: templateName,
            mode: "SIMULATION",
          });

          resolve({
            success: false,
            error: "Simulated failure",
          });
        }
      }, 800);
    });
  }

  getStatus(): {
    configured: boolean;
    baseUrl?: string;
    appId?: string;
    channelId?: string;
  } {
    return {
      configured: this.isConfigured,
      baseUrl: this.baseUrl,
      appId: this.appId,
      channelId: this.channelId,
    };
  }
}

export const qiscusService = new QiscusService();
export default qiscusService;
