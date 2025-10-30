import { ChannelType } from "./template.types";

export interface EmailRecipient {
  email: string;
  name: string;
}

export interface WhatsAppRecipient {
  phone: string;
  name: string;
}

export interface EmailJobData {
  channel: ChannelType.EMAIL;
  recipient: EmailRecipient;
  subject: string;
  body: string;
  from: string;
}

export interface WhatsAppJobData {
  channel: ChannelType.WHATSAPP;
  recipient: WhatsAppRecipient;

  message?: string;
  templateName?: string;
  templateData?: Record<string, string>;
}

export type MessageJobData = EmailJobData | WhatsAppJobData;

export interface EmailBlastRequest {
  recipients: EmailRecipient[];
  subject: string;
  body: string;
  from: string;
}

export interface EmailBlastResponse {
  success: boolean;
  message: string;
  totalEmails: number;
  jobIds: string[];
}
