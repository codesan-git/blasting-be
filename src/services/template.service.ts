import {
  Template,
  TemplateType,
  ChannelType,
  TemplateVariable,
} from "../types/template.types";

// In-memory template storage (bisa diganti dengan database)
const templates: Map<string, Template> = new Map();

// Pre-defined templates
const defaultTemplates: Template[] = [
  {
    id: "email-welcome-001",
    name: "Welcome Email",
    type: TemplateType.WELCOME,
    channel: ChannelType.EMAIL,
    subject: "Welcome to {{companyName}}, {{name}}!",
    body: `
      <h1>Hello {{name}}! 👋</h1>
      <p>Welcome to <strong>{{companyName}}</strong>!</p>
      <p>We're excited to have you on board. Your account has been successfully created.</p>
      <p>Account Details:</p>
      <ul>
        <li>Email: {{email}}</li>
        <li>Registration Date: {{date}}</li>
      </ul>
      <p>If you have any questions, feel free to reach out to us.</p>
      <p>Best regards,<br>{{companyName}} Team</p>
    `,
    variables: ["name", "companyName", "email", "date"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "email-promo-001",
    name: "Promotional Email",
    type: TemplateType.PROMOTION,
    channel: ChannelType.EMAIL,
    subject: "🎉 Special Offer: {{discountPercent}}% OFF!",
    body: `
      <h1>Exclusive Offer for {{name}}! 🎁</h1>
      <p>Get <strong>{{discountPercent}}% OFF</strong> on your next purchase!</p>
      <p>Use code: <strong>{{promoCode}}</strong></p>
      <p>Valid until: {{expiryDate}}</p>
      <p>Don't miss out on this amazing deal!</p>
      <a href="{{shopUrl}}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; display: inline-block; border-radius: 4px;">Shop Now</a>
    `,
    variables: [
      "name",
      "discountPercent",
      "promoCode",
      "expiryDate",
      "shopUrl",
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "wa-welcome-001",
    name: "WhatsApp Welcome Message",
    type: TemplateType.WELCOME,
    channel: ChannelType.WHATSAPP,
    body: `Halo *{{name}}*! 👋

Selamat datang di *{{companyName}}*! 

Terima kasih telah bergabung dengan kami. Akun Anda telah berhasil dibuat.

📧 Email: {{email}}
📅 Tanggal Registrasi: {{date}}

Jika ada pertanyaan, silakan hubungi kami kapan saja.

Salam,
Tim {{companyName}}`,
    variables: ["name", "companyName", "email", "date"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "wa-promo-001",
    name: "WhatsApp Promotional Message",
    type: TemplateType.PROMOTION,
    channel: ChannelType.WHATSAPP,
    body: `🎉 *Penawaran Spesial untuk {{name}}!* 🎁

Dapatkan diskon *{{discountPercent}}%* untuk pembelian Anda!

🎫 Kode Promo: *{{promoCode}}*
⏰ Berlaku hingga: {{expiryDate}}

Jangan lewatkan kesempatan ini!

🛍️ Belanja sekarang: {{shopUrl}}`,
    variables: [
      "name",
      "discountPercent",
      "promoCode",
      "expiryDate",
      "shopUrl",
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "email-reminder-001",
    name: "Payment Reminder Email",
    type: TemplateType.REMINDER,
    channel: ChannelType.EMAIL,
    subject: "Payment Reminder - Invoice #{{invoiceNumber}}",
    body: `
      <h1>Payment Reminder</h1>
      <p>Dear {{name}},</p>
      <p>This is a friendly reminder that payment for Invoice #{{invoiceNumber}} is due.</p>
      <p><strong>Amount Due:</strong> {{currency}}{{amount}}</p>
      <p><strong>Due Date:</strong> {{dueDate}}</p>
      <p>Please make your payment at your earliest convenience.</p>
      <p>Thank you for your business!</p>
    `,
    variables: ["name", "invoiceNumber", "amount", "currency", "dueDate"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "wa-reminder-001",
    name: "WhatsApp Payment Reminder",
    type: TemplateType.REMINDER,
    channel: ChannelType.WHATSAPP,
    body: `📋 *Pengingat Pembayaran*

Halo {{name}},

Ini adalah pengingat ramah bahwa pembayaran untuk Invoice #{{invoiceNumber}} akan jatuh tempo.

💰 *Jumlah:* {{currency}}{{amount}}
📅 *Jatuh Tempo:* {{dueDate}}

Mohon lakukan pembayaran secepatnya.

Terima kasih! 🙏`,
    variables: ["name", "invoiceNumber", "amount", "currency", "dueDate"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Initialize default templates
defaultTemplates.forEach((template) => {
  templates.set(template.id, template);
});

export class TemplateService {
  static getAllTemplates(): Template[] {
    return Array.from(templates.values());
  }

  static getTemplateById(id: string): Template | undefined {
    return templates.get(id);
  }

  static getTemplatesByChannel(channel: ChannelType): Template[] {
    return Array.from(templates.values()).filter(
      (t) => t.channel === channel || t.channel === ChannelType.BOTH
    );
  }

  static getTemplatesByType(type: TemplateType): Template[] {
    return Array.from(templates.values()).filter((t) => t.type === type);
  }

  static createTemplate(
    template: Omit<Template, "createdAt" | "updatedAt">
  ): Template {
    const newTemplate: Template = {
      ...template,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    templates.set(template.id, newTemplate);
    return newTemplate;
  }

  static updateTemplate(
    id: string,
    updates: Partial<Template>
  ): Template | null {
    const template = templates.get(id);
    if (!template) return null;

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date(),
    };
    templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  static deleteTemplate(id: string): boolean {
    return templates.delete(id);
  }

  static renderTemplate(
    template: Template,
    variables: TemplateVariable
  ): { subject?: string; body: string } {
    let renderedSubject = template.subject || "";
    let renderedBody = template.body;

    // Replace all variables in subject and body
    Object.keys(variables).forEach((key) => {
      const value = variables[key];
      const regex = new RegExp(`{{${key}}}`, "g");
      renderedSubject = renderedSubject.replace(regex, String(value));
      renderedBody = renderedBody.replace(regex, String(value));
    });

    return {
      subject: template.subject ? renderedSubject : undefined,
      body: renderedBody,
    };
  }
}
