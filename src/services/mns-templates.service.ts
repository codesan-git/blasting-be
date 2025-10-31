import { TemplateService } from "./template.service";
import { emailTemplates } from "./templates/emailTemplates";
import { mnsWhatsappTemplates } from "./templates/waTemplates";
import logger from "../utils/logger";

/**
 * Initialize MNS templates.
 *
 * Kamu bisa atur channel yang mau dimuat via parameter:
 * - "email" => hanya template email
 * - "wa" => hanya template WhatsApp
 * - "all" => semua template
 */
export function initializeMNSTemplates(
  channel: "email" | "wa" | "all" = "all"
): void {
  let selectedTemplates = [];

  switch (channel) {
    case "email":
      selectedTemplates = emailTemplates;
      break;
    case "wa":
      selectedTemplates = mnsWhatsappTemplates;
      break;
    case "all":
    default:
      selectedTemplates = [...emailTemplates, ...mnsWhatsappTemplates];
      break;
  }

  logger.info(
    `🟢 Initializing MNS templates for channel: ${channel} (${selectedTemplates.length} templates)`
  );

  selectedTemplates.forEach((template) => {
    try {
      TemplateService.createTemplate(template);
      logger.info(
        `✅ Registered template: ${template.id} [${template.channel}]`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`⚠️ Failed to register template ${template.id}: ${message}`);
    }
  });
}
