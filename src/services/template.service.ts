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
    id: "trial_class_payment_success",
    name: "Pembayaran Trial Class MNS (Multi-Channel)",
    type: TemplateType.NOTIFICATION,
    channels: [ChannelType.EMAIL, ChannelType.WHATSAPP],
    subject: "Pembayaran Trial Class MNS Berhasil",
    body: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Halo orang tua/wali Ananda {{name}},</h2>
      
      <p>Kami informasikan bahwa pembayaran Trial Class untuk Ananda <strong>{{name}}</strong> telah berhasil kami terima dengan detail sebagai berikut.</p>
      
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
          📋 Rincian Pembayaran
        </h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;">
              <strong>Status:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">
              <span style="background-color: #28a745; color: white; padding: 4px 12px; border-radius: 4px; font-size: 14px;">
                {{paymentStatus}}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;">
              <strong>Metode Pembayaran:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">
              {{paymentMethod}}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;">
              <strong>No. Referensi:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right; font-family: monospace;">
              {{referenceNumber}}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;">
              <strong>Nominal Pembayaran:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right; color: #28a745; font-weight: bold; font-size: 16px;">
              {{paymentAmount}}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">
              <strong>Tanggal Pembayaran:</strong>
            </td>
            <td style="padding: 10px 0; text-align: right;">
              {{paymentDate}}
            </td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #e7f3ff; 
                  border-left: 4px solid #007bff; 
                  padding: 15px; 
                  margin: 25px 0;
                  border-radius: 4px;">
        <p style="margin: 0; color: #004085;">
          ℹ️ Jadwal Trial Class untuk Ananda <strong>{{name}}</strong> sedang kami persiapkan. Kami akan segera menginformasikan kembali begitu jadwal tersedia.
        </p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6;">
        Kami sangat menantikan kehadiran Ananda di Trial Class MNS. Sampai jumpa dan rasakan pengalaman belajar yang menyenangkan bersama MNS! 🎓✨
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <p>Terima kasih,<br>
      <strong>Tim Admisi Multimedia Nusantara School</strong></p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
        <p style="margin: 0 0 10px 0; font-weight: bold;">Butuh bantuan?</p>
        <p style="margin: 5px 0;">Hubungi kami melalui:</p>
        <ul style="list-style: none; padding: 0; margin: 10px 0;">
          <li style="margin: 5px 0;">📧 Email: <a href="mailto:admission@mns.sch.id">admission@mns.sch.id</a></li>
          <li style="margin: 5px 0;">📱 WhatsApp: <a href="https://wa.me/6282258880711">+62 822-5888-0711</a></li>
        </ul>
      </div>
    </div>
  `,
    variables: [
      "name",
      "paymentStatus",
      "paymentMethod",
      "referenceNumber",
      "paymentAmount",
      "paymentDate",
    ],
    variableRequirements: [
      {
        name: "name",
        description: "Nama lengkap anak/siswa yang mengikuti trial class",
        required: true,
        type: "string",
        example: "John Doe",
      },
      {
        name: "paymentStatus",
        description: "Status pembayaran",
        required: true,
        type: "string",
        example: "Sukses",
      },
      {
        name: "paymentMethod",
        description: "Metode pembayaran yang digunakan",
        required: true,
        type: "string",
        example: "VA BCA",
      },
      {
        name: "referenceNumber",
        description: "Nomor referensi transaksi pembayaran",
        required: true,
        type: "string",
        example: "120293294821339",
      },
      {
        name: "paymentAmount",
        description: "Nominal pembayaran dengan format currency",
        required: true,
        type: "string",
        example: "Rp200.000",
      },
      {
        name: "paymentDate",
        description: "Tanggal dan waktu pembayaran dengan timezone",
        required: true,
        type: "string",
        example: "06-Nov-25, 14:30 WIB",
      },
    ],
    qiscusConfig: {
      namespace: "b393932b_0056_4389_a284_c45fb5f78ef0",
      templateName: "trial_class_payment_success",
      languageCode: "id",
      bodyVariables: [
        "name",
        "paymentStatus",
        "paymentMethod",
        "referenceNumber",
        "paymentAmount",
        "paymentDate",
      ],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "email-ppdb-verification-001",
    name: "Email Verifikasi PPDB Multimedia Nusantara School",
    type: TemplateType.REMINDER,
    channels: [ChannelType.EMAIL],
    subject: "Verifikasi Akun PPDB Multimedia Nusantara School",
    body: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Halo {{name}},</h2>
      
      <p>Terima kasih telah mendaftar di portal PPDB Multimedia Nusantara School.</p>
      
      <p>Silakan klik tombol di bawah ini untuk memverifikasi email Anda dan melanjutkan proses pendaftaran:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{verificationLink}}" 
           style="background-color: #007bff; 
                  color: white; 
                  padding: 12px 30px; 
                  text-decoration: none; 
                  border-radius: 5px; 
                  display: inline-block;
                  font-weight: bold;">
          Verifikasi Email
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        Jika Anda tidak merasa melakukan pendaftaran, Anda dapat mengabaikan email ini.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <p>Terima kasih,<br>
      <strong>Tim Admisi Multimedia Nusantara School</strong></p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
        <p style="margin: 0 0 10px 0; font-weight: bold;">Butuh bantuan?</p>
        <p style="margin: 5px 0;">Hubungi kami melalui:</p>
        <ul style="list-style: none; padding: 0; margin: 10px 0;">
          <li style="margin: 5px 0;">📧 Email: <a href="mailto:admission@mns.sch.id">admission@mns.sch.id</a></li>
          <li style="margin: 5px 0;">📱 WhatsApp: <a href="https://wa.me/6282258880711">+62 822-5888-0711</a></li>
        </ul>
      </div>
    </div>
  `,
    variables: ["name", "verificationLink"],
    variableRequirements: [
      {
        name: "name",
        description: "Nama lengkap pengguna yang mendaftar",
        required: true,
        type: "string",
        example: "Ahmad Fauzi",
      },
      {
        name: "verificationLink",
        description: "Link verifikasi email yang akan diklik pengguna",
        required: true,
        type: "string",
        example: "https://ppdb.mns.sch.id/verify?token=abc123xyz",
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "email-ppdb-reset-password-001",
    name: "Email Reset Password PPDB Multimedia Nusantara School",
    type: TemplateType.REMINDER,
    channels: [ChannelType.EMAIL],
    subject: "Reset Password Akun PPDB Multimedia Nusantara School",
    body: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Halo {{name}},</h2>
      
      <p>Kami menerima permintaan reset password pada akun Anda.</p>
      
      <p>Klik tombol di bawah untuk membuat password baru:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{resetLink}}" 
           style="background-color: #dc3545; 
                  color: white; 
                  padding: 12px 30px; 
                  text-decoration: none; 
                  border-radius: 5px; 
                  display: inline-block;
                  font-weight: bold;">
          Reset Password
        </a>
      </div>
      
      <div style="background-color: #fff3cd; 
                  border-left: 4px solid #ffc107; 
                  padding: 12px 15px; 
                  margin: 20px 0;
                  border-radius: 4px;">
        <p style="margin: 0; color: #856404;">
          ⚠️ <strong>Penting:</strong> Link tersebut hanya berlaku selama <strong>{{linkLifetime}}</strong>.
        </p>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        Abaikan email ini jika Anda merasa tidak melakukan permintaan reset password.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <p>Terima kasih,<br>
      <strong>Tim Admisi Multimedia Nusantara School</strong></p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
        <p style="margin: 0 0 10px 0; font-weight: bold;">Butuh bantuan?</p>
        <p style="margin: 5px 0;">Hubungi kami melalui:</p>
        <ul style="list-style: none; padding: 0; margin: 10px 0;">
          <li style="margin: 5px 0;">📧 Email: <a href="mailto:admission@mns.sch.id">admission@mns.sch.id</a></li>
          <li style="margin: 5px 0;">📱 WhatsApp: <a href="https://wa.me/6282258880711">+62 822-5888-0711</a></li>
        </ul>
      </div>
    </div>
  `,
    variables: ["name", "resetLink", "linkLifetime"],
    variableRequirements: [
      {
        name: "name",
        description: "Nama lengkap pengguna yang melakukan reset password",
        required: true,
        type: "string",
        example: "Ahmad Fauzi",
      },
      {
        name: "resetLink",
        description: "Link reset password yang akan diklik pengguna",
        required: true,
        type: "string",
        example: "https://ppdb.mns.sch.id/reset-password?token=xyz789abc",
      },
      {
        name: "linkLifetime",
        description: "Durasi berlaku link reset password",
        required: true,
        type: "string",
        example: "30 menit",
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
