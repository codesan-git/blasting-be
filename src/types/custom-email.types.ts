// src/types/custom-email.types.ts
import { TemplateAttachment } from "./template.types";

export interface CustomEmailRecipient {
  email: string;
  name?: string;
}

export interface SendCustomEmailRequest {
  from?: string; // Sender email (optional, will use default if not provided)
  to: CustomEmailRecipient[]; // Recipients
  cc?: CustomEmailRecipient[]; // CC recipients (optional)
  bcc?: CustomEmailRecipient[]; // BCC recipients (optional)
  subject: string; // Email subject
  body: string; // Email body (HTML supported)
  attachments?: TemplateAttachment[]; // Optional attachments
  replyTo?: string; // Reply-to email (optional)
  scheduledAt?: Date; // Optional: schedule for later
}

export interface SendCustomEmailResponse {
  success: boolean;
  messageId?: string;
  recipients: {
    to: string[];
    cc?: string[];
    bcc?: string[];
  };
  scheduledAt?: Date;
  error?: string;
  // SMTP server response details (for debugging)
  smtpResponse?: {
    accepted: string[];
    rejected: string[];
    response?: string;
    responseCode?: number | string;
    envelope?: {
      from?: string;
      to?: string[];
    };
  };
}
