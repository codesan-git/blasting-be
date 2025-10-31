import { ChannelType } from "./template.types";

export interface EmailRecipient {
  email: string;
  name: string;
}

export interface EmailJobData {
  recipient: EmailRecipient;
  subject: string;
  body: string;
  from: string;
  channel: ChannelType;
}

export interface WhatsAppJobData {
  recipient: {
    phone: string;
    name: string;
  };
  message: string;
  channel: ChannelType;
  // Qiscus-specific properties
  qiscusComponents?: any[];
  qiscusTemplateName?: string;
  qiscusNamespace?: string;
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
