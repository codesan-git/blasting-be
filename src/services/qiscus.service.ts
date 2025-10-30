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

interface SendWhatsAppTemplateRequest {
  to: string;
  type: "template";
  template: QiscusTemplate;
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

export class QiscusService {
  private appId: string;
  private secretKey: string;
  private channelId: string;
  private baseUrl: string;
  private namespace: string;
  private isConfigured = false;

  constructor() {
    this.appId = process.env.QISCUS_APP_ID || "";
    this.secretKey = process.env.QISCUS_SECRET_KEY || "";
    this.channelId = process.env.QISCUS_CHANNEL_ID || "";
    this.baseUrl =
      process.env.QISCUS_BASE_URL || "https://omnichannel.qiscus.com";
    this.namespace = process.env.QISCUS_NAMESPACE || "";

    if (!this.appId || !this.secretKey || !this.channelId) {
      logger.warn("Qiscus not fully configured — using SIMULATION mode");
      this.isConfigured = false;
    } else {
      this.isConfigured = true;
      logger.info("Qiscus WhatsApp Service initialized", {
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

      if (data.headerParams?.length) {
        components.push({
          type: "header",
          parameters: data.headerParams.map((text) => ({
            type: "text" as const,
            text,
          })),
        });
      }

      if (data.bodyParams?.length) {
        components.push({
          type: "body",
          parameters: data.bodyParams.map((text) => ({
            type: "text" as const,
            text,
          })),
        });
      }

      if (data.buttonParams?.length) {
        data.buttonParams.forEach((btn) => {
          components.push({
            type: "button",
            sub_type: "url",
            index: btn.index,
            parameters: [{ type: "text", text: btn.text }],
          });
        });
      }

      const payload: SendWhatsAppTemplateRequest = {
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

      logger.info("Sending WhatsApp template via Qiscus", payload);

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

      if (!response.ok)
        throw new Error(result.message || `HTTP ${response.status}`);

      logger.info("WhatsApp message sent successfully", {
        to: data.to,
        template: data.templateName,
        messageId: result.id || result.message_id,
      });

      return { success: true, messageId: result.id || result.message_id };
    } catch (err) {
      logger.error("Failed to send WhatsApp via Qiscus", {
        to: data.to,
        error: err instanceof Error ? err.message : err,
      });
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  private async simulateWhatsAppSending(
    to: string,
    templateName: string
  ): Promise<SendResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const isSuccess = Math.random() > 0.1;
        if (isSuccess) {
          const messageId = `simulated-wa-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 9)}`;
          logger.info("Simulated WhatsApp message sent", {
            to,
            templateName,
            messageId,
          });
          resolve({ success: true, messageId });
        } else {
          logger.warn("Simulated WhatsApp send failed", { to, templateName });
          resolve({ success: false, error: "Simulated failure" });
        }
      }, 400);
    });
  }

  getStatus() {
    return {
      configured: this.isConfigured,
      appId: this.appId,
      channelId: this.channelId,
    };
  }
}

export const qiscusService = new QiscusService();
export default qiscusService;
