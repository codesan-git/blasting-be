import logger from "../utils/logger";

interface QiscusTemplateParameter {
  type: "text" | "image" | "document";
  text?: string;
  image?: { link: string };
  document?: { link: string; filename: string };
}

interface QiscusTemplateComponent {
  type: "header" | "body" | "footer" | "button";
  sub_type?: "url" | "quick_reply";
  index?: string;
  parameters: QiscusTemplateParameter[];
}

interface QiscusTemplate {
  namespace: string;
  name: string;
  language: {
    policy: "deterministic";
    code: string;
  };
  components: QiscusTemplateComponent[];
}

interface SendWhatsAppRequest {
  to: string;
  type: "template" | "text";
  template?: QiscusTemplate;
  text?: { body: string };
}

interface QiscusResponse {
  id?: string;
  message_id?: string;
  message?: string;
  status?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class QiscusService {
  private appId: string;
  private secretKey: string;
  private channelId: string;
  private baseUrl: string;
  private namespace: string;
  private isConfigured: boolean = false;

  constructor() {
    this.appId = process.env.QISCUS_APP_ID || "";
    this.secretKey = process.env.QISCUS_SECRET_KEY || "";
    this.channelId = process.env.QISCUS_CHANNEL_ID || "";
    this.baseUrl =
      process.env.QISCUS_BASE_URL || "https://omnichannel.qiscus.com";
    this.namespace = process.env.QISCUS_NAMESPACE || "";

    if (!this.appId || !this.secretKey || !this.channelId) {
      logger.warn(
        "Qiscus WhatsApp not configured. WhatsApp sending will be simulated."
      );
      this.isConfigured = false;
    } else {
      this.isConfigured = true;
      logger.info("Qiscus WhatsApp Service initialized successfully", {
        appId: this.appId,
        channelId: this.channelId,
      });
    }
  }

  async sendTemplateMessage(data: {
    to: string;
    templateName: string;
    headerParams?: string[];
    bodyParams?: string[];
    buttonParams?: Array<{ index: string; text: string }>;
    languageCode?: string;
  }): Promise<SendResult> {
    if (!this.isConfigured) {
      return this.simulateWhatsAppSending(data.to, data.templateName);
    }

    try {
      const components: QiscusTemplateComponent[] = [];

      // Header component
      if (data.headerParams && data.headerParams.length > 0) {
        components.push({
          type: "header",
          parameters: data.headerParams.map((text) => ({
            type: "text" as const,
            text,
          })),
        });
      }

      // Body component
      if (data.bodyParams && data.bodyParams.length > 0) {
        components.push({
          type: "body",
          parameters: data.bodyParams.map((text) => ({
            type: "text" as const,
            text,
          })),
        });
      }

      // Button components
      if (data.buttonParams) {
        data.buttonParams.forEach((button) => {
          components.push({
            type: "button",
            sub_type: "url",
            index: button.index,
            parameters: [{ type: "text" as const, text: button.text }],
          });
        });
      }

      const payload: SendWhatsAppRequest = {
        to: data.to,
        type: "template",
        template: {
          namespace: this.namespace,
          name: data.templateName,
          language: {
            policy: "deterministic",
            code: data.languageCode || "id",
          },
          components,
        },
      };

      const url = `${this.baseUrl}/whatsapp/v1/${this.appId}/${this.channelId}/messages`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "qiscus-app-id": this.appId,
          "qiscus-secret-key": this.secretKey,
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as QiscusResponse;

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      logger.info("WhatsApp message sent successfully via Qiscus", {
        to: data.to,
        templateName: data.templateName,
        messageId: result.id || result.message_id,
      });

      return {
        success: true,
        messageId: result.id || result.message_id,
      };
    } catch (error) {
      logger.error("Failed to send WhatsApp via Qiscus", {
        to: data.to,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendTextMessage(to: string, text: string): Promise<SendResult> {
    if (!this.isConfigured) {
      return this.simulateWhatsAppSending(to, "text");
    }

    try {
      const payload: SendWhatsAppRequest = {
        to,
        type: "text",
        text: { body: text },
      };

      const url = `${this.baseUrl}/whatsapp/v1/${this.appId}/${this.channelId}/messages`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "qiscus-app-id": this.appId,
          "qiscus-secret-key": this.secretKey,
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as QiscusResponse;

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      logger.info("WhatsApp text message sent successfully", {
        to,
        messageId: result.id || result.message_id,
      });

      return {
        success: true,
        messageId: result.id || result.message_id,
      };
    } catch (error) {
      logger.error("Failed to send WhatsApp text", {
        to,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async simulateWhatsAppSending(
    to: string,
    template: string
  ): Promise<SendResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const isSuccess = Math.random() > 0.1;

        if (isSuccess) {
          const messageId = `simulated-wa-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;
          logger.info("WhatsApp message simulated successfully", {
            to,
            template,
            messageId,
            mode: "SIMULATION",
          });
          resolve({ success: true, messageId });
        } else {
          logger.warn("WhatsApp simulation failed", {
            to,
            template,
            mode: "SIMULATION",
          });
          resolve({ success: false, error: "Simulated failure" });
        }
      }, 500);
    });
  }

  getStatus(): { configured: boolean; appId?: string; channelId?: string } {
    return {
      configured: this.isConfigured,
      appId: this.appId,
      channelId: this.channelId,
    };
  }
}

export const qiscusService = new QiscusService();
export default qiscusService;
