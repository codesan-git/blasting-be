import {
  Template,
  TemplateType,
  ChannelType,
} from "../../types/template.types";

/**
 * Email templates (MNS-compatible version)
 * - ID dan name disamakan dengan versi WhatsApp agar bisa dipakai lintas channel
 * - Variabel harus konsisten antara email dan WhatsApp
 */

export const emailTemplates: Template[] = [
  {
    id: "invoicing_testing_v1_2",
    name: "invoicing_testing_v1_2",
    type: TemplateType.NOTIFICATION,
    channel: ChannelType.EMAIL,
    subject: "Invoice #{{invoiceNumber}} - {{period}}",
    body: `
      <h1>Halo {{name}},</h1>
      <p>Berikut adalah tagihan untuk periode <strong>{{period}}</strong>.</p>
      <p>
        <strong>Nomor Invoice:</strong> {{invoiceNumber}}<br/>
        <strong>Jumlah:</strong> {{amount}}<br/>
      </p>
      <p>Silakan lakukan pembayaran sesuai ketentuan yang berlaku.</p>
      <br/>
      <p>Terima kasih,<br/>Tim {{companyName}}</p>
    `,
    variables: ["name", "period", "invoiceNumber", "amount", "companyName"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "invoice_reminder_v2_0",
    name: "invoice_reminder_v2_0",
    type: TemplateType.REMINDER,
    channel: ChannelType.EMAIL,
    subject: "Pengingat Pembayaran - Invoice #{{invoiceNumber}}",
    body: `
      <p>Halo {{name}},</p>
      <p>
        Ini adalah pengingat bahwa pembayaran untuk invoice <strong>#{{invoiceNumber}}</strong>
        masih tertunda.
      </p>
      <p>
        <strong>Jumlah Tagihan:</strong> {{amount}}<br/>
        <strong>Jatuh Tempo:</strong> {{dueDate}}
      </p>
      <p>Mohon segera selesaikan pembayaran Anda.</p>
      <br/>
      <p>Terima kasih,<br/>Tim {{companyName}}</p>
    `,
    variables: ["name", "invoiceNumber", "amount", "dueDate", "companyName"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
