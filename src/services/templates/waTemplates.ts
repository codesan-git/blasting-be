import {
  Template,
  TemplateType,
  ChannelType,
} from "../../types/template.types";

/**
 * WhatsApp template metadata (MNS-compatible)
 * Body dikosongkan karena dikontrol langsung oleh template Qiscus.
 */
export const mnsWhatsappTemplates: Template[] = [
  {
    id: "invoicing_testing_v1_2",
    name: "invoicing_testing_v1_2",
    type: TemplateType.NOTIFICATION,
    channel: ChannelType.WHATSAPP,
    body: "",
    variables: [
      "headerParams", // ex: ["September 2025"]
      "bodyParams", // ex: ["Satria Agung", "September 2025", "INV-123", "Rp2.500.000"]
      "buttonParams", // ex: [{index: "0", text: "some_id"}]
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "invoice_reminder_v2_0",
    name: "invoice_reminder_v2_0",
    type: TemplateType.REMINDER,
    channel: ChannelType.WHATSAPP,
    body: "",
    variables: ["headerParams", "bodyParams", "buttonParams"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
