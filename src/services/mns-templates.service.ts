import { Template, TemplateType, ChannelType } from "../types/template.types";
import logger from "../utils/logger";

// MNS-specific templates based on documentation
export const mnsTemplates: Template[] = [
  // 1. Email Verification
  {
    id: "mns-email-verification",
    name: "Email Verification MNS",
    type: TemplateType.NOTIFICATION,
    channel: ChannelType.EMAIL,
    subject: "Verifikasi Akun PPDB Multimedia Nusantara School",
    body: `
      <h2>Halo {{name}},</h2>
      <p>Terima kasih telah mendaftar di portal PPDB Multimedia Nusantara School.</p>
      <p>Silakan klik tombol di bawah ini untuk memverifikasi email Anda dan melanjutkan proses pendaftaran:</p>
      <a href="{{verificationLink}}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; display: inline-block; border-radius: 4px; margin: 20px 0;">Verifikasi Email</a>
      <p>Jika Anda tidak merasa melakukan pendaftaran, Anda dapat mengabaikan email ini.</p>
      <p>Terima kasih,<br>Tim Admisi Multimedia Nusantara School</p>
      <hr>
      <p style="font-size: 12px; color: #666;">
        Butuh bantuan? Hubungi kami melalui:<br>
        Email: admission@mns.sch.id<br>
        WhatsApp: +6282258880711
      </p>
    `,
    variables: ["name", "verificationLink"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // 2. Reset Password
  {
    id: "mns-reset-password",
    name: "Reset Password MNS",
    type: TemplateType.NOTIFICATION,
    channel: ChannelType.EMAIL,
    subject: "Reset Password Akun PPDB Multimedia Nusantara School",
    body: `
      <h2>Halo {{name}},</h2>
      <p>Kami menerima permintaan <strong>reset password</strong> pada akun Anda.</p>
      <p>Klik tombol di bawah untuk membuat <strong>password</strong> baru:</p>
      <a href="{{resetLink}}" style="background-color: #FF9800; color: white; padding: 14px 20px; text-decoration: none; display: inline-block; border-radius: 4px; margin: 20px 0;">Reset Password</a>
      <p><strong>Link</strong> tersebut hanya berlaku selama {{linkLifetime}}.</p>
      <p>Abaikan <strong>email</strong> ini jika Anda merasa tidak melakukan permintaan <strong>reset password</strong>.</p>
      <p>Terima kasih,<br>Tim Admisi Multimedia Nusantara School</p>
      <hr>
      <p style="font-size: 12px; color: #666;">
        Butuh bantuan? Hubungi kami melalui:<br>
        Email: admission@mns.sch.id<br>
        WhatsApp: +6282258880711
      </p>
    `,
    variables: ["name", "resetLink", "linkLifetime"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // 3. Trial Class Fee Payment Success - WhatsApp
  {
    id: "mns-trial-payment-success-wa",
    name: "Trial Class Payment Success (WA)",
    type: TemplateType.NOTIFICATION,
    channel: ChannelType.WHATSAPP,
    body: "trial_class_payment_success", // Template name in Qiscus
    variables: [
      "childName",
      "paymentStatus",
      "paymentMethod",
      "referenceNumber",
      "amount",
      "paymentDate",
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // 4. Trial Class Fee Payment Success - Email
  {
    id: "mns-trial-payment-success-email",
    name: "Trial Class Payment Success (Email)",
    type: TemplateType.NOTIFICATION,
    channel: ChannelType.EMAIL,
    subject: "Pembayaran Trial Class MNS Berhasil",
    body: `
      <h2>Halo orang tua/wali Ananda {{childName}},</h2>
      <p>Kami informasikan bahwa pembayaran <strong>Trial Class</strong> untuk Ananda {{childName}} telah berhasil kami terima dengan detail sebagai berikut.</p>
      <h3>Rincian:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Status:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{paymentStatus}}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Metode Pembayaran:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{paymentMethod}}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>No. Referensi:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{referenceNumber}}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Nominal Pembayaran:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{amount}}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Tanggal Pembayaran:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{paymentDate}}</td></tr>
      </table>
      <p>Jadwal Trial Class untuk Ananda {{childName}} sedang kami persiapkan. Kami akan segera menginformasikan kembali begitu jadwal tersedia.</p>
      <p>Kami sangat menantikan kehadiran Ananda di <strong>Trial Class</strong> MNS. Sampai jumpa dan rasakan pengalaman belajar yang menyenangkan bersama MNS!</p>
      <p>Terima kasih,<br>Tim Admisi Multimedia Nusantara School</p>
      <hr>
      <p style="font-size: 12px; color: #666;">
        Butuh bantuan? Hubungi kami melalui:<br>
        Email: admission@mns.sch.id<br>
        WhatsApp: +6282258880711
      </p>
    `,
    variables: [
      "childName",
      "paymentStatus",
      "paymentMethod",
      "referenceNumber",
      "amount",
      "paymentDate",
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // 5. Trial Class Attending Confirmation - WhatsApp
  {
    id: "mns-trial-confirmation-wa",
    name: "Trial Class Confirmation (WA)",
    type: TemplateType.REMINDER,
    channel: ChannelType.WHATSAPP,
    body: "trial_class_attending_confirmation2",
    variables: [
      "childName",
      "trialDate",
      "trialTime",
      "trialLocation",
      "confirmDeadline",
      "confirmationLink",
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // 6. Trial Class Attending Confirmation - Email
  {
    id: "mns-trial-confirmation-email",
    name: "Trial Class Confirmation (Email)",
    type: TemplateType.REMINDER,
    channel: ChannelType.EMAIL,
    subject: "Permintaan Konfirmasi Kehadiran Trial Class MNS",
    body: `
      <h2>Halo orang tua/wali Ananda {{childName}},</h2>
      <p>Terima kasih telah mendaftarkan Ananda {{childName}} untuk mengikuti <strong>Trial Class</strong> di MNS.</p>
      <h3>Jadwal Trial Class untuk Ananda {{childName}} telah tersedia dengan detail berikut:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Tanggal:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{trialDate}}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Pukul:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{trialTime}}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Lokasi:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{trialLocation}}</td></tr>
      </table>
      <p>Silakan melakukan konfirmasi kehadiran melalui tautan berikut:</p>
      <a href="{{confirmationLink}}" style="background-color: #2196F3; color: white; padding: 14px 20px; text-decoration: none; display: inline-block; border-radius: 4px; margin: 20px 0;">Konfirmasi Kehadiran</a>
      <p>Mohon kesediaannya untuk memberikan konfirmasi kehadiran Ananda paling lambat {{confirmDeadline}} sebelum jadwal yang telah ditentukan.</p>
      <p>Sampai bertemu di <strong>Trial Class</strong> MNS!</p>
      <p>Terima kasih,<br>Tim Admisi Multimedia Nusantara School</p>
      <hr>
      <p style="font-size: 12px; color: #666;">
        Butuh bantuan? Hubungi kami melalui:<br>
        Email: admission@mns.sch.id<br>
        WhatsApp: +6282258880711
      </p>
    `,
    variables: [
      "childName",
      "trialDate",
      "trialTime",
      "trialLocation",
      "confirmDeadline",
      "confirmationLink",
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // 7. Standard Bill Posting - WhatsApp
  {
    id: "mns-bill-posting-wa",
    name: "Standard Bill Posting (WA)",
    type: TemplateType.NOTIFICATION,
    channel: ChannelType.WHATSAPP,
    body: "standard_bill_posting",
    variables: [
      "childName",
      "studentId",
      "billName",
      "billType",
      "billNumber",
      "amount",
      "dueDate",
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // 8. Standard Bill Posting - Email
  {
    id: "mns-bill-posting-email",
    name: "Standard Bill Posting (Email)",
    type: TemplateType.NOTIFICATION,
    channel: ChannelType.EMAIL,
    subject: "Informasi Tagihan Multimedia Nusantara School",
    body: `
      <h2>Halo orang tua/wali Ananda {{childName}} dengan NIS {{studentId}},</h2>
      <p>Kami sampaikan bahwa saat ini terdapat tagihan baru dengan rincian sebagai berikut.</p>
      <h3>Rincian:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Nama Tagihan:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{billName}}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Tipe Tagihan:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{billType}}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>No. Billing:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{billNumber}}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Jumlah:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{amount}}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Jatuh Tempo:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{dueDate}}</td></tr>
      </table>
      <p>Orang tua/wali diharapkan untuk melakukan pembayaran tepat waktu sebelum tanggal jatuh tempo.</p>
      <p>Terima kasih,<br>Tim Finance Multimedia Nusantara School</p>
      <hr>
      <p style="font-size: 12px; color: #666;">
        Butuh bantuan? Hubungi kami melalui:<br>
        Email: admission@mns.sch.id<br>
        WhatsApp: +6282258880711
      </p>
    `,
    variables: [
      "childName",
      "studentId",
      "billName",
      "billType",
      "billNumber",
      "amount",
      "dueDate",
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // 9. Standard Bill Payment Success - WhatsApp
  {
    id: "mns-bill-payment-success-wa",
    name: "Bill Payment Success (WA)",
    type: TemplateType.NOTIFICATION,
    channel: ChannelType.WHATSAPP,
    body: "standard_bill_payment_success",
    variables: [
      "childName",
      "studentId",
      "paymentStatus",
      "paymentMethod",
      "referenceNumber",
      "amount",
      "paymentDate",
      "billList",
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // 10. Standard Bill Payment Success - Email
  {
    id: "mns-bill-payment-success-email",
    name: "Bill Payment Success (Email)",
    type: TemplateType.NOTIFICATION,
    channel: ChannelType.EMAIL,
    subject: "Pembayaran Tagihan Multimedia Nusantara School Sukses",
    body: `
      <h2>Halo orang tua/wali Ananda {{childName}} dengan NIS {{studentId}},</h2>
      <p>Kami telah menerima pembayaran tagihan anda dengan rincian sebagai berikut.</p>
      <h3>Rincian:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Status:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{paymentStatus}}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Metode Pembayaran:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{paymentMethod}}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>No. Referensi:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{referenceNumber}}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Nominal Pembayaran:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{amount}}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Tanggal Pembayaran:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">{{paymentDate}}</td></tr>
      </table>
      <h3>Daftar Tagihan yang dibayar:</h3>
      <p>{{billList}}</p>
      <p>Bukti pembayaran ini akan tersimpan dalam sistem kami. Jika Bapak/Ibu membutuhkan salinan atau mengalami kendala, silakan hubungi kami.</p>
      <p>Terima kasih,<br>Tim Finance Multimedia Nusantara School</p>
      <hr>
      <p style="font-size: 12px; color: #666;">
        Butuh bantuan? Hubungi kami melalui:<br>
        Email: admission@mns.sch.id<br>
        WhatsApp: +6282258880711
      </p>
    `,
    variables: [
      "childName",
      "studentId",
      "paymentStatus",
      "paymentMethod",
      "referenceNumber",
      "amount",
      "paymentDate",
      "billList",
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Export function to add MNS templates to template service
export function initializeMNSTemplates(): void {
  const { TemplateService } = require("./template.service");

  mnsTemplates.forEach((template) => {
    try {
      TemplateService.createTemplate(template);
    } catch (error) {
      // Template might already exist, ignore
      logger.error("Failed to create template", {
        templateId: template.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
