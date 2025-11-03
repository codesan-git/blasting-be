// src/services/template.service.ts
import {
  Template,
  TemplateType,
  ChannelType,
  TemplateVariable,
  QiscusTemplateComponent,
  VariableRequirement,
} from "../types/template.types";

// In-memory template storage
const templates: Map<string, Template> = new Map();

// Pre-defined templates with variable requirements
const defaultTemplates: Template[] = [
  {
    id: "email-welcome-001",
    name: "Welcome Email",
    type: TemplateType.WELCOME,
    channels: [ChannelType.EMAIL],
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
    variableRequirements: [
      {
        name: "name",
        description: "Nama lengkap penerima",
        required: true,
        type: "string",
        example: "John Doe",
      },
      {
        name: "companyName",
        description: "Nama perusahaan",
        required: true,
        type: "string",
        example: "PT. Maju Jaya",
      },
      {
        name: "email",
        description: "Email penerima",
        required: true,
        type: "email",
        example: "john@example.com",
      },
      {
        name: "date",
        description: "Tanggal registrasi",
        required: true,
        type: "date",
        example: "2025-11-03",
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "invoicing_testing_v1_2",
    name: "Invoice Notification (Multi-Channel)",
    type: TemplateType.INVOICE,
    channels: [ChannelType.EMAIL, ChannelType.WHATSAPP],
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
    variables: ["name", "period", "invoiceNumber", "amount", "companyName"],
    variableRequirements: [
      {
        name: "name",
        description: "Nama penerima invoice",
        required: true,
        type: "string",
        example: "Budi Santoso",
      },
      {
        name: "period",
        description: "Periode invoice (bulan/tahun)",
        required: true,
        type: "string",
        example: "Oktober 2025",
      },
      {
        name: "invoiceNumber",
        description: "Nomor invoice",
        required: true,
        type: "string",
        example: "INV-2025-001",
      },
      {
        name: "amount",
        description: "Total nominal invoice",
        required: true,
        type: "string",
        example: "Rp 1.500.000",
      },
      {
        name: "companyName",
        description: "Nama perusahaan pengirim",
        required: true,
        type: "string",
        example: "PT. Contoh Indonesia",
      },
    ],
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
    channels: [ChannelType.EMAIL],
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
    variableRequirements: [
      {
        name: "name",
        description: "Nama penerima invoice",
        required: true,
        type: "string",
        example: "Budi Santoso",
      },
      {
        name: "invoiceNumber",
        description: "Nomor invoice",
        required: true,
        type: "string",
        example: "INV-2025-001",
      },
      {
        name: "period",
        description: "Periode invoice",
        required: true,
        type: "string",
        example: "Oktober 2025",
      },
      {
        name: "amount",
        description: "Total nominal invoice",
        required: true,
        type: "string",
        example: "Rp 1.500.000",
      },
      {
        name: "companyName",
        description: "Nama perusahaan",
        required: true,
        type: "string",
        example: "PT. Contoh Indonesia",
      },
    ],
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
    return Array.from(templates.values()).filter((t) =>
      t.channels.includes(channel)
    );
  }

  static getTemplatesByType(type: TemplateType): Template[] {
    return Array.from(templates.values()).filter((t) => t.type === type);
  }

  /**
   * Get template variable requirements
   */
  static getTemplateRequirements(
    templateId: string
  ): VariableRequirement[] | null {
    const template = templates.get(templateId);
    if (!template) return null;

    return template.variableRequirements || [];
  }

  /**
   * Validate variables against template requirements
   */
  static validateVariables(
    templateId: string,
    variables: TemplateVariable
  ): { valid: boolean; missing: string[]; errors: string[] } {
    const template = templates.get(templateId);
    if (!template) {
      return {
        valid: false,
        missing: [],
        errors: [`Template '${templateId}' not found`],
      };
    }

    const missing: string[] = [];
    const errors: string[] = [];

    // Check if template has requirements defined
    if (!template.variableRequirements) {
      // If no requirements, just check if variables exist
      const missingVars = template.variables.filter(
        (varName) => !(varName in variables)
      );

      return {
        valid: missingVars.length === 0,
        missing: missingVars,
        errors: missingVars.map(
          (varName) => `Missing required variable: ${varName}`
        ),
      };
    }

    // Validate against requirements
    template.variableRequirements.forEach((req) => {
      const value = variables[req.name];

      // Check if required variable is missing
      if (
        req.required &&
        (value === undefined || value === null || value === "")
      ) {
        missing.push(req.name);
        errors.push(
          `Missing required variable: '${req.name}' (${req.description})`
        );
        return;
      }

      // Skip type validation if variable is not provided and not required
      if (!req.required && (value === undefined || value === null)) {
        return;
      }

      // Type validation
      switch (req.type) {
        case "email":
          if (typeof value === "string" && !value.includes("@")) {
            errors.push(
              `Invalid email format for variable '${req.name}': ${value}`
            );
          }
          break;
        case "phone":
          if (typeof value === "string" && !/^\+?[\d\s-]+$/.test(value)) {
            errors.push(
              `Invalid phone format for variable '${req.name}': ${value}`
            );
          }
          break;
        case "number":
          if (typeof value !== "number" && isNaN(Number(value))) {
            errors.push(
              `Variable '${req.name}' must be a number, got: ${value}`
            );
          }
          break;
        case "string":
          if (typeof value !== "string" && typeof value !== "number") {
            errors.push(
              `Variable '${req.name}' must be a string, got: ${typeof value}`
            );
          }
          break;
      }
    });

    return {
      valid: errors.length === 0,
      missing,
      errors,
    };
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
