// src/types/template.types.ts
export enum ChannelType {
  EMAIL = "email",
  WHATSAPP = "whatsapp",
  SMS = "sms",
  PUSH = "push",
}

export enum TemplateType {
  WELCOME = "welcome",
  PROMOTION = "promotion",
  NOTIFICATION = "notification",
  REMINDER = "reminder",
  INVOICE = "invoice",
  CUSTOM = "custom",
}

export interface TemplateVariable {
  [key: string]: string | number;
}

// Variable requirement documentation
export interface VariableRequirement {
  name: string;
  description: string;
  required: boolean;
  type: "string" | "number" | "date" | "email" | "phone" | "url";
  example?: string;
}

// Qiscus WhatsApp Template Component
export interface QiscusTemplateComponent {
  type: "header" | "body" | "button";
  parameters?: Array<{
    type: string;
    text: string;
  }>;
  sub_type?: string;
  index?: string;
}

// Qiscus Template Configuration
export interface QiscusTemplateConfig {
  namespace?: string;
  templateName: string;
  languageCode?: string;
  // Mapping variable names ke component positions
  headerVariables?: string[]; // e.g., ["period"]
  bodyVariables?: string[]; // e.g., ["name", "period", "invoiceNumber", "amount"]
  buttonVariables?: string[]; // e.g., ["invoiceNumber"] for dynamic URL
}

// NEW: Attachment interface for email
export interface TemplateAttachment {
  filename: string;
  content?: string; // base64 encoded content
  path?: string; // file path
  contentType?: string; // MIME type (e.g., 'application/pdf', 'image/png')
  url?: string; // URL to download attachment
}

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  channels: ChannelType[]; // Changed from single channel to array
  subject?: string; // For email
  body: string;
  variables: string[]; // List of variables like ['name', 'date', 'amount']

  // NEW: Variable requirements documentation
  variableRequirements?: VariableRequirement[];

  // Qiscus WhatsApp specific
  qiscusConfig?: QiscusTemplateConfig;

  // NEW: Attachment support (optional)
  supportsAttachments?: boolean; // Indicates if this template supports dynamic attachments
  attachments?: TemplateAttachment[]; // Static attachments that always included

  createdAt: Date;
  updatedAt: Date;
}

export interface MessageRecipient {
  email?: string;
  phone?: string; // WhatsApp number
  name: string;
  variables?: TemplateVariable; // Custom variables per recipient
  attachments?: TemplateAttachment[]; // NEW: Optional per-recipient attachments
}

export interface SendMessageRequest {
  recipients: MessageRecipient[];
  channels: string[]; // Array of channels ['email', 'whatsapp', 'sms']
  templateId: string;
  globalVariables?: TemplateVariable; // Variables applied to all recipients
  from?: string; // Email sender
  scheduledAt?: Date; // Optional: schedule for later
  attachments?: TemplateAttachment[]; // NEW: Optional global attachments for all recipients
}

// NEW: Helper interface for rendering template with attachments
export interface TemplateRenderData {
  variables: TemplateVariable;
  attachments?: TemplateAttachment[];
}
