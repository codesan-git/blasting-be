export enum ChannelType {
  EMAIL = "email",
  WHATSAPP = "whatsapp",
  SMS = "sms",
  PUSH = "push",
  BOTH = "both", // Deprecated, kept for backward compatibility
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

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  channel: ChannelType;
  subject?: string; // For email
  body: string;
  variables: string[]; // List of variables like ['name', 'date', 'amount']

  // Qiscus WhatsApp specific
  qiscusConfig?: QiscusTemplateConfig;

  createdAt: Date;
  updatedAt: Date;
}

export interface MessageRecipient {
  email?: string;
  phone?: string; // WhatsApp number
  name: string;
  variables?: TemplateVariable; // Custom variables per recipient
}

export interface SendMessageRequest {
  recipients: MessageRecipient[];
  channels: string[]; // NEW: Array of channels ['email', 'whatsapp', 'sms']
  channel?: string; // OLD: Deprecated but kept for backward compatibility
  templateId: string;
  globalVariables?: TemplateVariable; // Variables applied to all recipients
  from?: string; // Email sender
  scheduledAt?: Date; // Optional: schedule for later
}
