import {
  Template,
  TemplateType,
  ChannelType,
  TemplateVariable,
  QiscusTemplateComponent,
} from "../types/template.types";

// In-memory template storage
const templates: Map<string, Template> = new Map();

// Pre-defined templates including Qiscus WhatsApp template
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
    id: "invoicing_testing_v1_2",
    name: "Invoice Notification (Multi-Channel)",
    type: TemplateType.INVOICE,
    channel: ChannelType.BOTH, // Changed to BOTH
    subject: "Invoice {{invoiceNumber}} - {{period}}", // Added for email
    body: `
      <h1>Invoice Notification</h1>
      <p>Dear {{name}},</p>
      <p>We hope this email finds you well. Please find your invoice details for <strong>{{period}}</strong>:</p>
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr style="background-color: #f2f2f2;">
          <td style="border: 1px solid #ddd; padding: 12px;"><strong>Invoice Number</strong></td>
          <td style="border: 1px solid #ddd; padding: 12px;">{{invoiceNumber}}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 12px;"><strong>Period</strong></td>
          <td style="border: 1px solid #ddd; padding: 12px;">{{period}}</td>
        </tr>
        <tr style="background-color: #f2f2f2;">
          <td style="border: 1px solid #ddd; padding: 12px;"><strong>Amount</strong></td>
          <td style="border: 1px solid #ddd; padding: 12px;">{{amount}}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 12px;"><strong>Company</strong></td>
          <td style="border: 1px solid #ddd; padding: 12px;">{{companyName}}</td>
        </tr>
      </table>
      <p>Please process the payment at your earliest convenience.</p>
      <p>Thank you for your business!</p>
      <p>Best regards,<br>{{companyName}} Team</p>
    `,
    variables: ["name", "period", "invoiceNumber", "amount", "companyName"],
    qiscusConfig: {
      namespace: "b393932b_0056_4389_a284_c45fb5f78ef0",
      templateName: "invoicing_testing_v1_2",
      languageCode: "id",
      headerVariables: ["period"],
      bodyVariables: ["name", "period", "invoiceNumber", "amount"],
      buttonVariables: ["invoiceNumber"],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "email-invoice-001",
    name: "Invoice Notification Email",
    type: TemplateType.INVOICE,
    channel: ChannelType.EMAIL,
    subject: "Invoice {{invoiceNumber}} - {{period}}",
    body: `
      <h1>Invoice Notification</h1>
      <p>Dear {{name}},</p>
      <p>We hope this email finds you well. Please find your invoice details for <strong>{{period}}</strong>:</p>
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr style="background-color: #f2f2f2;">
          <td style="border: 1px solid #ddd; padding: 12px;"><strong>Invoice Number</strong></td>
          <td style="border: 1px solid #ddd; padding: 12px;">{{invoiceNumber}}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 12px;"><strong>Period</strong></td>
          <td style="border: 1px solid #ddd; padding: 12px;">{{period}}</td>
        </tr>
        <tr style="background-color: #f2f2f2;">
          <td style="border: 1px solid #ddd; padding: 12px;"><strong>Amount</strong></td>
          <td style="border: 1px solid #ddd; padding: 12px;">{{amount}}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 12px;"><strong>Company</strong></td>
          <td style="border: 1px solid #ddd; padding: 12px;">{{companyName}}</td>
        </tr>
      </table>
      <p>Please process the payment at your earliest convenience.</p>
      <p>Thank you for your business!</p>
      <p>Best regards,<br>{{companyName}} Team</p>
    `,
    variables: ["name", "invoiceNumber", "period", "amount", "companyName"],
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

  // Build Qiscus template components from variables
  static buildQiscusComponents(
    template: Template,
    variables: TemplateVariable
  ): QiscusTemplateComponent[] {
    if (!template.qiscusConfig) {
      throw new Error("Template does not have Qiscus configuration");
    }

    const components: QiscusTemplateComponent[] = [];
    const config = template.qiscusConfig;

    // Header component
    if (config.headerVariables && config.headerVariables.length > 0) {
      components.push({
        type: "header",
        parameters: config.headerVariables.map((varName) => ({
          type: "text",
          text: String(variables[varName] || ""),
        })),
      });
    }

    // Body component
    if (config.bodyVariables && config.bodyVariables.length > 0) {
      components.push({
        type: "body",
        parameters: config.bodyVariables.map((varName) => ({
          type: "text",
          text: String(variables[varName] || ""),
        })),
      });
    }

    // Button component (untuk dynamic URL)
    if (config.buttonVariables && config.buttonVariables.length > 0) {
      components.push({
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: config.buttonVariables.map((varName) => ({
          type: "text",
          text: String(variables[varName] || ""),
        })),
      });
    }

    return components;
  }
}
