// src/services/template.service.ts
import {
  Template,
  TemplateType,
  ChannelType,
  TemplateVariable,
  QiscusTemplateComponent,
  VariableRequirement,
  TemplateAttachment,
  TemplateRenderData,
} from "../types/template.types";
import { AttachmentService } from "./attachment.service";

// In-memory template storage
const templates: Map<string, Template> = new Map();

// Pre-defined templates with variable requirements
const defaultTemplates: Template[] = [
  {
    id: "audit_reminder_001",
    name: "Reminder Penyelesaian Temuan Audit",
    type: TemplateType.REMINDER,
    channels: [ChannelType.EMAIL],
    subject: "Reminder: Penyelesaian Temuan Audit Tahun {{year}}",
    body: `Dear Bapak/Ibu, <br><br>Penyelesaian temuan audit untuk tahun {{year}} perlu perbaikan.<br><br>Mohon melakukan perbaikan kembali melalui aplikasi SIAMI (siami.umn.ac.id) pada menu Auditee > Audit > List Finding.<br><br>Terima Kasih<br><br><b>This email was sent automatically by system</b>`,
    variables: ["year"],
    variableRequirements: [
      {
        name: "year",
        description: "Tahun audit",
        required: true,
        type: "string",
        example: "2025",
      },
    ],
    // Enable attachment support for this template
    supportsAttachments: true,
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
    id: "trial_class_payment_success",
    name: "Pembayaran Trial Class MNS Berhasil",
    type: TemplateType.NOTIFICATION,
    channels: [ChannelType.EMAIL, ChannelType.WHATSAPP],
    subject: "Pembayaran Trial Class MNS Berhasil",
    body: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Halo orang tua/wali {{name}},</h2>

      <p>Kami informasikan bahwa pembayaran Trial Class untuk <strong>{{name}}</strong> telah berhasil kami terima dengan detail sebagai berikut.</p>

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
              {{paymentDateDay}}, {{paymentDate}}
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
          ℹ️ Jadwal Trial Class untuk <strong>{{name}}</strong> sedang kami persiapkan. Kami akan segera menginformasikan kembali begitu jadwal tersedia.
        </p>
      </div>

      <p style="font-size: 16px; line-height: 1.6;">
        Kami sangat menantikan kehadiran <strong>{{name}}</strong> di Trial Class MNS. Sampai jumpa dan rasakan pengalaman belajar yang menyenangkan bersama MNS! 🎓✨
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
      "paymentDateDay",
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
        name: "paymentDateDay",
        description: "Nama hari tanggal pembayaran (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu)",
        required: true,
        type: "string",
        example: "Kamis",
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
    id: "trial_class_attending_confirmation2",
    name: "Konfirmasi Kehadiran Trial Class MNS",
    type: TemplateType.REMINDER,
    channels: [ChannelType.EMAIL, ChannelType.WHATSAPP],
    subject: "Permintaan Konfirmasi Kehadiran Trial Class MNS",
    body: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Halo orang tua/wali {{name}},</h2>

      <p>Terima kasih telah mendaftarkan <strong>{{name}}</strong> untuk mengikuti Trial Class di MNS.</p>

      <p>Jadwal Trial Class untuk <strong>{{name}}</strong> telah tersedia dengan detail berikut:</p>

      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          📅 Detail Jadwal Trial Class
        </h3>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;">
              <strong>Tanggal:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">
              {{trialDateDay}}, {{trialDate}}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;">
              <strong>Pukul:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">
              {{trialTime}}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">
              <strong>Lokasi:</strong>
            </td>
            <td style="padding: 10px 0; text-align: right;">
              {{trialLocation}}
            </td>
          </tr>
        </table>
      </div>

      <p>Silakan melakukan konfirmasi kehadiran melalui tautan berikut:</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{confirmationLink}}"
           style="background-color: #28a745;
                  color: white;
                  padding: 12px 30px;
                  text-decoration: none;
                  border-radius: 5px;
                  display: inline-block;
                  font-weight: bold;">
          Konfirmasi Kehadiran
        </a>
      </div>

      <div style="background-color: #fff3cd;
                  border-left: 4px solid #ffc107;
                  padding: 12px 15px;
                  margin: 20px 0;
                  border-radius: 4px;">
        <p style="margin: 0; color: #856404;">
          ⚠️ Mohon kesediaannya untuk memberikan konfirmasi kehadiran <strong>{{name}}</strong> paling lambat <strong>{{confirmationDeadline}}</strong> sebelum jadwal yang telah ditentukan.
        </p>
      </div>

      <p style="font-size: 16px; line-height: 1.6;">
        Sampai bertemu di Trial Class MNS! 🎓✨
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
      "trialDateDay",
      "trialDate",
      "trialTime",
      "trialLocation",
      "confirmationDeadline",
      "confirmationLink",
    ],
    variableRequirements: [
      {
        name: "name",
        description: "Nama lengkap anak/siswa yang akan mengikuti trial class",
        required: true,
        type: "string",
        example: "John Doe",
      },
      {
        name: "trialDateDay",
        description: "Nama hari jadwal trial class (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu)",
        required: true,
        type: "string",
        example: "Kamis",
      },
      {
        name: "trialDate",
        description: "Tanggal trial class dalam format DD MMM YYYY",
        required: true,
        type: "string",
        example: "25 Desember 2026",
      },
      {
        name: "trialTime",
        description: "Waktu trial class dengan timezone",
        required: true,
        type: "string",
        example: "16:30 WIB",
      },
      {
        name: "trialLocation",
        description: "Lokasi lengkap pelaksanaan trial class",
        required: true,
        type: "string",
        example: "Ruang 502, Gedung A lantai 5 MNS",
      },
      {
        name: "confirmationDeadline",
        description:
          "Batas waktu konfirmasi kehadiran (relatif terhadap jadwal)",
        required: true,
        type: "string",
        example: "H-2",
      },
      {
        name: "confirmationLink",
        description: "Link untuk konfirmasi kehadiran trial class",
        required: true,
        type: "string",
        example: "https://ppdb.mns.sch.id/dashboard/trial-class/student-123",
      },
    ],
    qiscusConfig: {
      namespace: "b393932b_0056_4389_a284_c45fb5f78ef0",
      templateName: "trial_class_attending_confirmation2",
      languageCode: "id",
      bodyVariables: [
        "name",
        "trialDate",
        "trialTime",
        "trialLocation",
        "confirmationDeadline",
      ],
      buttonVariables: ["confirmationLink"],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "trial_class_attending_confirmed",
    name: "Konfirmasi Kehadiran Trial Class MNS Berhasil",
    type: TemplateType.NOTIFICATION,
    channels: [ChannelType.EMAIL, ChannelType.WHATSAPP],
    subject: "Sukses Konfirmasi Kehadiran Trial Class MNS",
    body: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Halo orang tua/wali {{name}},</h2>

      <p>Konfirmasi kehadiran Anda telah kami terima. Berikut detail pelaksanaan Trial Class:</p>

      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
          📅 Detail Pelaksanaan Trial Class
        </h3>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;">
              <strong>Tanggal:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">
              {{trialDateDay}}, {{trialDate}}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;">
              <strong>Pukul:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">
              {{trialTime}}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">
              <strong>Lokasi:</strong>
            </td>
            <td style="padding: 10px 0; text-align: right;">
              {{trialLocation}}
            </td>
          </tr>
        </table>
      </div>

      <div style="background-color: #d4edda;
                  border-left: 4px solid #28a745;
                  padding: 15px;
                  margin: 25px 0;
                  border-radius: 4px;">
        <p style="margin: 0; color: #155724;">
          ✅ Kami menantikan kehadiran <strong>{{name}}</strong> di Trial Class Multimedia Nusantara School.
        </p>
      </div>

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
    variables: ["name", "trialDateDay", "trialDate", "trialTime", "trialLocation"],
    variableRequirements: [
      {
        name: "name",
        description: "Nama lengkap anak/siswa yang akan mengikuti trial class",
        required: true,
        type: "string",
        example: "John Doe",
      },
      {
        name: "trialDateDay",
        description: "Nama hari jadwal trial class (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu)",
        required: true,
        type: "string",
        example: "Kamis",
      },
      {
        name: "trialDate",
        description: "Tanggal trial class dalam format DD MMM YYYY",
        required: true,
        type: "string",
        example: "25 Desember 2026",
      },
      {
        name: "trialTime",
        description: "Waktu trial class dengan timezone",
        required: true,
        type: "string",
        example: "16:30 WIB",
      },
      {
        name: "trialLocation",
        description: "Lokasi lengkap pelaksanaan trial class",
        required: true,
        type: "string",
        example: "Ruang 502, Gedung A lantai 5 MNS",
      },
    ],
    qiscusConfig: {
      namespace: "b393932b_0056_4389_a284_c45fb5f78ef0",
      templateName: "trial_class_attending_confirmed",
      languageCode: "id",
      bodyVariables: ["name", "trialDate", "trialTime", "trialLocation"],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "trial_class_reminder",
    name: "Reminder Trial Class MNS",
    type: TemplateType.REMINDER,
    channels: [ChannelType.EMAIL, ChannelType.WHATSAPP],
    subject: "Reminder Trial Class MNS",
    body: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Halo orang tua/wali {{name}},</h2>

      <p>Kami ingin mengingatkan kembali jika <strong>{{name}}</strong> akan mengikuti pelaksanaan Trial Class dengan rincian sebagai berikut.</p>

      <div style="background-color: #fff3cd; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #ffc107;">
        <h3 style="margin-top: 0; color: #856404;">
          ⏰ Jadwal Trial Class
        </h3>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff8dc;">
              <strong>Tanggal:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff8dc; text-align: right;">
              {{trialDateDay}}, {{trialDate}}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff8dc;">
              <strong>Pukul:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff8dc; text-align: right;">
              {{trialTime}}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">
              <strong>Lokasi:</strong>
            </td>
            <td style="padding: 10px 0; text-align: right;">
              {{trialLocation}}
            </td>
          </tr>
        </table>
      </div>

      <p style="font-size: 16px; line-height: 1.6;">
        Jika terdapat kendala, silakan menghubungi kami.
      </p>

      <p style="font-size: 16px; line-height: 1.6;">
        Sampai bertemu di Trial Class Multimedia Nusantara School. 🎓
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
    variables: ["name", "trialDateDay", "trialDate", "trialTime", "trialLocation"],
    variableRequirements: [
      {
        name: "name",
        description: "Nama lengkap anak/siswa yang akan mengikuti trial class",
        required: true,
        type: "string",
        example: "John Doe",
      },
      {
        name: "trialDateDay",
        description: "Nama hari jadwal trial class (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu)",
        required: true,
        type: "string",
        example: "Kamis",
      },
      {
        name: "trialDate",
        description: "Tanggal trial class dalam format DD MMM YYYY",
        required: true,
        type: "string",
        example: "25 Desember 2026",
      },
      {
        name: "trialTime",
        description: "Waktu trial class dengan timezone",
        required: true,
        type: "string",
        example: "16:30 WIB",
      },
      {
        name: "trialLocation",
        description: "Lokasi lengkap pelaksanaan trial class",
        required: true,
        type: "string",
        example: "Ruang 502, Gedung A lantai 5 MNS",
      },
    ],
    qiscusConfig: {
      namespace: "b393932b_0056_4389_a284_c45fb5f78ef0",
      templateName: "trial_class_reminder",
      languageCode: "id",
      bodyVariables: ["name", "trialDate", "trialTime", "trialLocation"],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "trial_class_on_review",
    name: "Informasi Laporan Observasi Trial Class MNS",
    type: TemplateType.NOTIFICATION,
    channels: [ChannelType.EMAIL, ChannelType.WHATSAPP],
    subject: "Informasi Laporan Observasi Trial Class MNS",
    body: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Halo orang tua/wali {{name}},</h2>

      <p>Trial Class <strong>{{name}}</strong> telah selesai dilaksanakan.</p>

      <div style="background-color: #e7f3ff;
                  border-left: 4px solid #007bff;
                  padding: 15px;
                  margin: 25px 0;
                  border-radius: 4px;">
        <p style="margin: 0; color: #004085;">
          📝 Saat ini, tim kami sedang menyiapkan laporan hasil observasi pembelajaran dan perkembangan selama kegiatan berlangsung.
        </p>
      </div>

      <div style="background-color: #fff3cd;
                  border-left: 4px solid #ffc107;
                  padding: 15px;
                  margin: 25px 0;
                  border-radius: 4px;">
        <p style="margin: 0; color: #856404;">
          ⏳ Mohon ditunggu informasinya dalam waktu maksimal <strong>{{deliveryDays}} hari kerja</strong>.
        </p>
      </div>

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
    variables: ["name", "deliveryDays"],
    variableRequirements: [
      {
        name: "name",
        description: "Nama lengkap anak/siswa yang telah mengikuti trial class",
        required: true,
        type: "string",
        example: "John Doe",
      },
      {
        name: "deliveryDays",
        description:
          "Jumlah hari kerja maksimal untuk pengiriman laporan observasi",
        required: true,
        type: "string",
        example: "2",
      },
    ],
    qiscusConfig: {
      namespace: "b393932b_0056_4389_a284_c45fb5f78ef0",
      templateName: "trial_class_on_review",
      languageCode: "id",
      bodyVariables: ["name", "deliveryDays"],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "trial_class_student_result",
    name: "Surat Keputusan dan Hasil Observasi Trial Class MNS",
    type: TemplateType.NOTIFICATION,
    channels: [ChannelType.EMAIL, ChannelType.WHATSAPP],
    subject: "Surat Keputusan dan Hasil Observasi Trial Class MNS",
    body: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Halo orang tua/wali {{name}},</h2>

      <p>Observasi Trial Class <strong>{{name}}</strong> sudah selesai dan hasilnya dapat dilihat pada website PPDB Multimedia Nusantara School.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{resultLink}}"
           style="background-color: #007bff;
                  color: white;
                  padding: 12px 30px;
                  text-decoration: none;
                  border-radius: 5px;
                  display: inline-block;
                  font-weight: bold;">
          Website PPDB MNS
        </a>
      </div>

      <div style="background-color: #e7f3ff;
                  border-left: 4px solid #007bff;
                  padding: 15px;
                  margin: 25px 0;
                  border-radius: 4px;">
        <p style="margin: 0; color: #004085;">
          📄 Orang tua/wali dapat mendownload dan membaca hasil observasi serta surat keputusan berdasarkan hasil observasi tersebut.
        </p>
      </div>

      <p style="font-size: 16px; line-height: 1.6;">
        Silakan hubungi kami apabila ada pertanyaan lebih lanjut atau ingin berdiskusi mengenai hasil observasi.
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
    variables: ["name", "resultLink"],
    variableRequirements: [
      {
        name: "name",
        description: "Nama lengkap anak/siswa yang telah mengikuti trial class",
        required: true,
        type: "string",
        example: "John Doe",
      },
      {
        name: "resultLink",
        description:
          "Link ke halaman hasil observasi dan surat keputusan trial class",
        required: true,
        type: "string",
        example: "https://ppdb.mns.sch.id/dashboard/trial-class/student-123",
      },
    ],
    qiscusConfig: {
      namespace: "b393932b_0056_4389_a284_c45fb5f78ef0",
      templateName: "trial_class_student_result",
      languageCode: "id",
      bodyVariables: ["name"],
      buttonVariables: ["resultLink"],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "booking_fee_reminder",
    name: "Informasi Pembayaran Booking Fee MNS",
    type: TemplateType.REMINDER,
    channels: [ChannelType.EMAIL, ChannelType.WHATSAPP],
    subject: "Informasi Pembayaran Booking Fee MNS",
    body: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Halo orang tua/wali {{name}},</h2>

      <p>Untuk melanjutkan proses registrasi dan menempatkan <strong>{{name}}</strong> di kelas reguler Multimedia Nusantara School, mohon kesediaannya untuk melakukan pembayaran Booking Fee sebelum <strong>{{paymentDeadline}}</strong></p>

      <p>Informasi lengkap mengenai tata cara dan metode pembayaran dapat diakses melalui website PPDB MNS dibawah ini.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{paymentInfoLink}}"
           style="background-color: #28a745;
                  color: white;
                  padding: 12px 30px;
                  text-decoration: none;
                  border-radius: 5px;
                  display: inline-block;
                  font-weight: bold;">
          Informasi Pembayaran
        </a>
      </div>

      <div style="background-color: #fff3cd;
                  border-left: 4px solid #ffc107;
                  padding: 15px;
                  margin: 25px 0;
                  border-radius: 4px;">
        <p style="margin: 0; color: #856404;">
          ⚠️ <strong>Penting:</strong> Dimohon untuk melakukan pembayaran booking fee sebelum tanggal jatuh tempo.
        </p>
      </div>

      <p style="font-size: 16px; line-height: 1.6;">
        Terima kasih atas kepercayaan yang diberikan kepada MNS. Kami tidak sabar menyambut <strong>{{name}}</strong> dalam perjalanan belajar yang menyenangkan di MNS! 🎓✨
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

      <p>Regards,<br>
      <strong>Tim Finance Multimedia Nusantara School</strong></p>

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
    variables: ["name", "paymentDeadline", "paymentInfoLink"],
    variableRequirements: [
      {
        name: "name",
        description: "Nama lengkap anak/siswa yang akan melakukan booking fee",
        required: true,
        type: "string",
        example: "John Doe",
      },
      {
        name: "paymentDeadline",
        description: "Batas waktu pembayaran booking fee dengan format lengkap",
        required: true,
        type: "string",
        example: "25-Dec-2026, 16:30 WIB",
      },
      {
        name: "paymentInfoLink",
        description: "Link ke halaman informasi pembayaran booking fee",
        required: true,
        type: "string",
        example: "https://ppdb.mns.sch.id/dashboard/booking-fee/student-123",
      },
    ],
    qiscusConfig: {
      namespace: "b393932b_0056_4389_a284_c45fb5f78ef0",
      templateName: "booking_fee_reminder",
      languageCode: "id",
      bodyVariables: ["name", "paymentDeadline"],
      buttonVariables: ["paymentInfoLink"],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "booking_fee_payment_success",
    name: "Pembayaran Booking Fee MNS Berhasil",
    type: TemplateType.NOTIFICATION,
    channels: [ChannelType.EMAIL, ChannelType.WHATSAPP],
    subject: "Pembayaran Booking Fee MNS Sukses",
    body: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Halo orang tua/wali {{name}},</h2>

      <p>Selamat! Pembayaran booking fee untuk pendaftaran <strong>{{name}}</strong> telah berhasil kami terima dengan detail pembayaran sebagai berikut.</p>

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
              {{paymentDateDay}}, {{paymentDate}}
            </td>
          </tr>
        </table>
      </div>

      <p style="font-size: 16px; line-height: 1.6;">
        Silahkan melengkapi data <strong>{{name}}</strong> melalui proses Re-enrollment pada website PPDB MNS untuk menyelesaikan proses registrasi.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{reenrollmentLink}}"
           style="background-color: #007bff;
                  color: white;
                  padding: 12px 30px;
                  text-decoration: none;
                  border-radius: 5px;
                  display: inline-block;
                  font-weight: bold;">
          Re-enrollment
        </a>
      </div>

      <p style="font-size: 16px; line-height: 1.6;">
        Terima kasih atas kepercayaan yang diberikan kepada MNS. Kami tidak sabar menyambut <strong>{{name}}</strong> dalam perjalanan belajar yang menyenangkan di MNS! 🎓✨
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

      <p>Regards,<br>
      <strong>Tim Finance Multimedia Nusantara School</strong></p>

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
      "paymentDateDay",
      "paymentDate",
      "reenrollmentLink",
    ],
    variableRequirements: [
      {
        name: "name",
        description: "Nama lengkap anak/siswa yang melakukan booking fee",
        required: true,
        type: "string",
        example: "John Doe",
      },
      {
        name: "paymentStatus",
        description: "Status pembayaran booking fee",
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
        example: "Rp3.000.000",
      },
      {
        name: "paymentDateDay",
        description: "Nama hari tanggal pembayaran (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu)",
        required: true,
        type: "string",
        example: "Kamis",
      },
      {
        name: "paymentDate",
        description: "Tanggal dan waktu pembayaran dengan timezone",
        required: true,
        type: "string",
        example: "06-Nov-25, 14:30 WIB",
      },
      {
        name: "reenrollmentLink",
        description:
          "Link ke halaman re-enrollment untuk melengkapi data siswa",
        required: true,
        type: "string",
        example: "https://ppdb.mns.sch.id/dashboard/re-enrollment",
      },
    ],
    qiscusConfig: {
      namespace: "b393932b_0056_4389_a284_c45fb5f78ef0",
      templateName: "booking_fee_payment_success",
      languageCode: "id",
      bodyVariables: [
        "name",
        "paymentStatus",
        "paymentMethod",
        "referenceNumber",
        "paymentAmount",
        "paymentDate",
      ],
      buttonVariables: ["reenrollmentLink"],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "reenrollment_reminder",
    name: "Re-enrollment Multimedia Nusantara School",
    type: TemplateType.REMINDER,
    channels: [ChannelType.EMAIL, ChannelType.WHATSAPP],
    subject: "Re-enrollment Multimedia Nusantara School",
    body: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Halo orang tua/wali {{name}},</h2>

      <p>Proses re-enrollment periode <strong>{{academicYear}}</strong> sudah dibuka.</p>

      <p>Silakan orang tua/wali menyelesaikan proses re-enrollment tersebut dengan cara:</p>

      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
          <li style="margin-bottom: 10px;">
            Melengkapi formulir re-enrollment pada website PPDB MNS sebelum periode berakhir.
          </li>
          <li>
            Melakukan pembayaran Booking Fee sebelum tanggal <strong>{{bookingFeeDeadline}}</strong>.
          </li>
        </ol>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{ppdbWebsiteLink}}"
           style="background-color: #007bff;
                  color: white;
                  padding: 12px 30px;
                  text-decoration: none;
                  border-radius: 5px;
                  display: inline-block;
                  font-weight: bold;">
          Website PPDB MNS
        </a>
      </div>

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
      "academicYear",
      "bookingFeeDeadline",
      "ppdbWebsiteLink",
    ],
    variableRequirements: [
      {
        name: "name",
        description:
          "Nama lengkap anak/siswa yang akan melakukan re-enrollment",
        required: true,
        type: "string",
        example: "John Doe",
      },
      {
        name: "academicYear",
        description: "Nama periode/tahun ajaran re-enrollment",
        required: true,
        type: "string",
        example: "2026/2027",
      },
      {
        name: "bookingFeeDeadline",
        description: "Tanggal jatuh tempo pembayaran booking fee",
        required: true,
        type: "string",
        example: "26 July 2026, 16:30 WIB",
      },
      {
        name: "ppdbWebsiteLink",
        description: "Link ke website PPDB MNS untuk proses re-enrollment",
        required: true,
        type: "string",
        example: "https://ppdb.mns.sch.id/dashboard/re-enrollment",
      },
    ],
    qiscusConfig: {
      namespace: "b393932b_0056_4389_a284_c45fb5f78ef0",
      templateName: "reenrollment_reminder",
      languageCode: "id",
      bodyVariables: ["name", "academicYear", "bookingFeeDeadline"],
      buttonVariables: ["ppdbWebsiteLink"],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "reenrollment_successful",
    name: "Re-enrollment Multimedia Nusantara School Sukses",
    type: TemplateType.NOTIFICATION,
    channels: [ChannelType.EMAIL, ChannelType.WHATSAPP],
    subject: "Re-enrollment Multimedia Nusantara School Sukses",
    body: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Halo orang tua/wali {{name}},</h2>

      <div style="background-color: #d4edda;
                  border-left: 4px solid #28a745;
                  padding: 20px;
                  margin: 25px 0;
                  border-radius: 4px;
                  text-align: center;">
        <h3 style="margin: 0 0 10px 0; color: #155724;">
          🎉 Selamat!
        </h3>
        <p style="margin: 0; color: #155724; font-size: 16px; line-height: 1.6;">
          Proses Re-enrollment <strong>{{name}}</strong> sudah selesai dan sudah kami verifikasi.
        </p>
      </div>

      <p style="font-size: 16px; line-height: 1.6;">
        Kami mengucapkan terima kasih karena sudah mempercayakan pendidikan <strong>{{name}}</strong> di Multimedia Nusantara School.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

      <p>Regards,<br>
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
    variables: ["name"],
    variableRequirements: [
      {
        name: "name",
        description:
          "Nama lengkap anak/siswa yang telah menyelesaikan re-enrollment",
        required: true,
        type: "string",
        example: "John Doe",
      },
    ],
    qiscusConfig: {
      namespace: "b393932b_0056_4389_a284_c45fb5f78ef0",
      templateName: "reenrollment_successful",
      languageCode: "id",
      bodyVariables: ["name"],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "trial_class_booking_fee_payment_success",
    name: "Pembayaran Trial Class dan Booking Fee MNS Berhasil",
    type: TemplateType.NOTIFICATION,
    channels: [ChannelType.EMAIL, ChannelType.WHATSAPP],
    subject: "Pembayaran Trial Class dan Booking Fee MNS Sukses",
    body: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Halo orang tua/wali {{name}},</h2>

      <p>Kami telah menerima pembayaran tagihan Anda dengan rincian sebagai berikut.</p>

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
              {{paymentDateDay}}, {{paymentDate}}
            </td>
          </tr>
        </table>
      </div>

      <div style="background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          📝 Daftar Tagihan yang Dibayar
        </h3>
        <pre style="font-family: Arial, sans-serif; line-height: 1.8; white-space: pre-line; margin: 0;">{{billingList}}</pre>
      </div>

      <div style="background-color: #e7f3ff;
                  border-left: 4px solid #007bff;
                  padding: 15px;
                  margin: 25px 0;
                  border-radius: 4px;">
        <p style="margin: 0; color: #004085;">
          ℹ️ Jadwal Trial Class untuk <strong>{{name}}</strong> sedang kami persiapkan. Kami akan segera menginformasikan kembali begitu jadwal tersedia.
        </p>
      </div>

      <p style="font-size: 16px; line-height: 1.6;">
        Kami sangat menantikan kehadiran <strong>{{name}}</strong> di Trial Class MNS. Sampai jumpa dan rasakan pengalaman belajar yang menyenangkan bersama MNS! 🎓✨
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
      "paymentDateDay",
      "paymentDate",
      "billingList",
    ],
    variableRequirements: [
      {
        name: "name",
        description: "Nama lengkap anak/siswa yang melakukan pembayaran",
        required: true,
        type: "string",
        example: "John Doe",
      },
      {
        name: "paymentStatus",
        description: "Status pembayaran",
        required: true,
        type: "string",
        example: "Pembayaran Sukses",
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
        example: "12402039192",
      },
      {
        name: "paymentAmount",
        description: "Total nominal pembayaran dengan format currency",
        required: true,
        type: "string",
        example: "Rp3.200.000",
      },
      {
        name: "paymentDateDay",
        description: "Nama hari tanggal pembayaran (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu)",
        required: true,
        type: "string",
        example: "Senin",
      },
      {
        name: "paymentDate",
        description: "Tanggal dan waktu pembayaran dengan timezone",
        required: true,
        type: "string",
        example: "25 Agustus 2025, 10:30 WIB",
      },
      {
        name: "billingList",
        description:
          "Daftar tagihan yang dibayar dalam format plain text (gunakan newline untuk pemisah item)",
        required: true,
        type: "string",
        example: "1. Booking Fee: Rp3.000.000 | 2. Trial Class Fee: Rp200.000",
      },
    ],
    qiscusConfig: {
      namespace: "b393932b_0056_4389_a284_c45fb5f78ef0",
      templateName: "trial_class_booking_fee_payment_success",
      languageCode: "id",
      bodyVariables: [
        "name",
        "paymentStatus",
        "paymentMethod",
        "referenceNumber",
        "paymentAmount",
        "paymentDate",
        "billingList",
      ],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "standard_bill_posting",
    name: "Informasi Tagihan Multimedia Nusantara School",
    type: TemplateType.INVOICE,
    channels: [ChannelType.EMAIL, ChannelType.WHATSAPP],
    subject: "Informasi Tagihan Multimedia Nusantara School",
    body: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Halo orang tua/wali {{name}} dengan NIS <strong>{{studentId}}</strong>,</h2>

      <p>Kami sampaikan bahwa saat ini terdapat tagihan baru dengan rincian sebagai berikut.</p>

      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          📋 Rincian Tagihan
        </h3>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;">
              <strong>Nama Tagihan:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">
              {{billName}}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;">
              <strong>Tipe Tagihan:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">
              {{billType}}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;">
              <strong>No. Billing:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right; font-family: monospace;">
              {{billingNumber}}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;">
              <strong>Jumlah:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right; color: #dc3545; font-weight: bold; font-size: 16px;">
              {{billAmount}}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">
              <strong>Jatuh Tempo:</strong>
            </td>
            <td style="padding: 10px 0; text-align: right; font-weight: bold;">
              {{dueDateDay}}, {{dueDate}}
            </td>
          </tr>
        </table>
      </div>

      <div style="background-color: #fff3cd;
                  border-left: 4px solid #ffc107;
                  padding: 15px;
                  margin: 25px 0;
                  border-radius: 4px;">
        <p style="margin: 0; color: #856404;">
          ⚠️ Orang tua/wali diharapkan untuk melakukan pembayaran tepat waktu sebelum tanggal jatuh tempo.
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

      <p>Terima kasih,<br>
      <strong>Tim Finance Multimedia Nusantara School</strong></p>

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
      "studentId",
      "billName",
      "billType",
      "billingNumber",
      "billAmount",
      "dueDateDay",
      "dueDate",
    ],
    variableRequirements: [
      {
        name: "name",
        description: "Nama lengkap anak/siswa",
        required: true,
        type: "string",
        example: "John Doe",
      },
      {
        name: "studentId",
        description: "Nomor Induk Siswa (NIS)",
        required: true,
        type: "string",
        example: "0250100010",
      },
      {
        name: "billName",
        description: "Nama tagihan",
        required: true,
        type: "string",
        example: "SPP Januari",
      },
      {
        name: "billType",
        description: "Tipe/kategori tagihan",
        required: true,
        type: "string",
        example: "SPP",
      },
      {
        name: "billingNumber",
        description: "Nomor billing/invoice",
        required: true,
        type: "string",
        example: "000121",
      },
      {
        name: "billAmount",
        description: "Jumlah tagihan dengan format currency",
        required: true,
        type: "string",
        example: "Rp2.150.000",
      },
      {
        name: "dueDateDay",
        description: "Nama hari jatuh tempo (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu)",
        required: true,
        type: "string",
        example: "Kamis",
      },
      {
        name: "dueDate",
        description: "Tanggal jatuh tempo pembayaran",
        required: true,
        type: "string",
        example: "25-MAR-26, 10:30 WIB",
      },
    ],
    qiscusConfig: {
      namespace: "b393932b_0056_4389_a284_c45fb5f78ef0",
      templateName: "standard_bill_posting",
      languageCode: "id",
      bodyVariables: [
        "name",
        "studentId",
        "billName",
        "billType",
        "billingNumber",
        "billAmount",
        "dueDate",
      ],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "standard_bill_payment_success",
    name: "Pembayaran Tagihan Multimedia Nusantara School Sukses",
    type: TemplateType.NOTIFICATION,
    channels: [ChannelType.EMAIL, ChannelType.WHATSAPP],
    subject: "Pembayaran Tagihan Multimedia Nusantara School Sukses",
    body: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Halo orang tua/wali {{name}} dengan NIS <strong>{{studentId}}</strong>,</h2>

      <p>Kami telah menerima pembayaran tagihan Anda dengan rincian sebagai berikut.</p>

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
              {{paymentDateDay}}, {{paymentDate}}
            </td>
          </tr>
        </table>
      </div>

      <div style="background-color: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          📝 Daftar Tagihan yang Dibayar
        </h3>
        <pre style="font-family: Arial, sans-serif; line-height: 1.8; white-space: pre-line; margin: 0;">{{billingList}}</pre>
      </div>

      <div style="background-color: #e7f3ff;
                  border-left: 4px solid #007bff;
                  padding: 15px;
                  margin: 25px 0;
                  border-radius: 4px;">
        <p style="margin: 0; color: #004085;">
          ℹ️ Bukti pembayaran ini akan tersimpan dalam sistem kami. Jika Bapak/Ibu membutuhkan salinan atau mengalami kendala, silakan hubungi kami.
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

      <p>Terima kasih,<br>
      <strong>Tim Finance Multimedia Nusantara School</strong></p>

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
      "studentId",
      "paymentStatus",
      "paymentMethod",
      "referenceNumber",
      "paymentAmount",
      "paymentDateDay",
      "paymentDate",
      "billingList",
    ],
    variableRequirements: [
      {
        name: "name",
        description: "Nama lengkap anak/siswa",
        required: true,
        type: "string",
        example: "John Doe",
      },
      {
        name: "studentId",
        description: "Nomor Induk Siswa (NIS)",
        required: true,
        type: "string",
        example: "0250100010",
      },
      {
        name: "paymentStatus",
        description: "Status pembayaran",
        required: true,
        type: "string",
        example: "Pembayaran Sukses",
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
        example: "12402039192",
      },
      {
        name: "paymentAmount",
        description: "Total nominal pembayaran dengan format currency",
        required: true,
        type: "string",
        example: "Rp15.000.000",
      },
      {
        name: "paymentDateDay",
        description: "Nama hari tanggal pembayaran (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu)",
        required: true,
        type: "string",
        example: "Kamis",
      },
      {
        name: "paymentDate",
        description: "Tanggal dan waktu pembayaran dengan timezone",
        required: true,
        type: "string",
        example: "25-MAR-26, 10:30 WIB",
      },
      {
        name: "billingList",
        description:
          "Daftar tagihan yang dibayar dalam format plain text (gunakan \\n untuk pemisah baris)",
        required: true,
        type: "string",
        example:
          "1. DPP Januari: Rp10.000.000 | 2. SPP Januari: Rp3.000.000 | 3. Seragam: Rp2.000.000",
      },
    ],
    qiscusConfig: {
      namespace: "b393932b_0056_4389_a284_c45fb5f78ef0",
      templateName: "standard_bill_payment_success",
      languageCode: "id",
      bodyVariables: [
        "name",
        "studentId",
        "paymentStatus",
        "paymentMethod",
        "referenceNumber",
        "paymentAmount",
        "paymentDate",
        "billingList",
      ],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "standard_bill_reminder",
    name: "Reminder Pembayaran Tagihan Multimedia Nusantara School",
    type: TemplateType.REMINDER,
    channels: [ChannelType.EMAIL, ChannelType.WHATSAPP],
    subject: "Reminder Pembayaran Tagihan Multimedia Nusantara School",
    body: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Halo orang tua/wali {{name}} dengan NIS <strong>{{studentId}}</strong>,</h2>

      <p>Kami mengingatkan untuk melakukan pembayaran tagihan berikut karena sudah mendekati tanggal jatuh tempo.</p>

      <div style="background-color: #fff3cd; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #ffc107;">
        <h3 style="margin-top: 0; color: #856404;">
          ⚠️ Rincian Tagihan
        </h3>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff8dc;">
              <strong>Nama Tagihan:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff8dc; text-align: right;">
              {{billName}}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff8dc;">
              <strong>Tipe Tagihan:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff8dc; text-align: right;">
              {{billType}}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff8dc;">
              <strong>No. Billing:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff8dc; text-align: right; font-family: monospace;">
              {{billingNumber}}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff8dc;">
              <strong>Jumlah:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff8dc; text-align: right; color: #dc3545; font-weight: bold; font-size: 16px;">
              {{billAmount}}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">
              <strong>Jatuh Tempo:</strong>
            </td>
            <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #dc3545;">
              {{dueDateDay}}, {{dueDate}}
            </td>
          </tr>
        </table>
      </div>

      <div style="background-color: #f8d7da;
                  border-left: 4px solid #dc3545;
                  padding: 15px;
                  margin: 25px 0;
                  border-radius: 4px;">
        <p style="margin: 0; color: #721c24;">
          ⏰ <strong>Penting:</strong> Orang tua/wali diharapkan untuk melakukan pembayaran tepat waktu sebelum tanggal jatuh tempo. Jika terdapat kendala silakan hubungi kami.
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

      <p>Terima kasih,<br>
      <strong>Tim Finance Multimedia Nusantara School</strong></p>

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
      "studentId",
      "billName",
      "billType",
      "billingNumber",
      "billAmount",
      "dueDateDay",
      "dueDate",
    ],
    variableRequirements: [
      {
        name: "name",
        description: "Nama lengkap anak/siswa",
        required: true,
        type: "string",
        example: "John Doe",
      },
      {
        name: "studentId",
        description: "Nomor Induk Siswa (NIS)",
        required: true,
        type: "string",
        example: "0250100010",
      },
      {
        name: "billName",
        description: "Nama tagihan",
        required: true,
        type: "string",
        example: "SPP Januari",
      },
      {
        name: "billType",
        description: "Tipe/kategori tagihan",
        required: true,
        type: "string",
        example: "SPP",
      },
      {
        name: "billingNumber",
        description: "Nomor billing/invoice",
        required: true,
        type: "string",
        example: "000121",
      },
      {
        name: "billAmount",
        description: "Jumlah tagihan dengan format currency",
        required: true,
        type: "string",
        example: "Rp2.150.000",
      },
      {
        name: "dueDateDay",
        description: "Nama hari jatuh tempo (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu)",
        required: true,
        type: "string",
        example: "Kamis",
      },
      {
        name: "dueDate",
        description: "Tanggal jatuh tempo pembayaran",
        required: true,
        type: "string",
        example: "25-MAR-26, 10:30 WIB",
      },
    ],
    qiscusConfig: {
      namespace: "b393932b_0056_4389_a284_c45fb5f78ef0",
      templateName: "standard_bill_reminder",
      languageCode: "id",
      bodyVariables: [
        "name",
        "studentId",
        "billName",
        "billType",
        "billingNumber",
        "billAmount",
        "dueDate",
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
      t.channels.includes(channel),
    );
  }

  static getTemplatesByType(type: TemplateType): Template[] {
    return Array.from(templates.values()).filter((t) => t.type === type);
  }

  /**
   * Get template variable requirements
   */
  static getTemplateRequirements(
    templateId: string,
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
    variables: TemplateVariable,
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
        (varName) => !(varName in variables),
      );

      return {
        valid: missingVars.length === 0,
        missing: missingVars,
        errors: missingVars.map(
          (varName) => `Missing required variable: ${varName}`,
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
          `Missing required variable: '${req.name}' (${req.description})`,
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
              `Invalid email format for variable '${req.name}': ${value}`,
            );
          }
          break;
        case "phone":
          if (typeof value === "string" && !/^\+?[\d\s-]+$/.test(value)) {
            errors.push(
              `Invalid phone format for variable '${req.name}': ${value}`,
            );
          }
          break;
        case "number":
          if (typeof value !== "number" && isNaN(Number(value))) {
            errors.push(
              `Variable '${req.name}' must be a number, got: ${value}`,
            );
          }
          break;
        case "url":
          if (typeof value === "string" && !/^https?:\/\/.+/.test(value)) {
            errors.push(
              `Invalid URL format for variable '${req.name}': ${value}`,
            );
          }
          break;
        case "string":
          if (typeof value !== "string" && typeof value !== "number") {
            errors.push(
              `Variable '${req.name}' must be a string, got: ${typeof value}`,
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

  /**
   * Validate attachments (optional)
   */
  static validateAttachments(
    templateId: string,
    attachments?: TemplateAttachment[],
  ): { valid: boolean; errors: string[] } {
    const template = templates.get(templateId);

    if (!template) {
      return {
        valid: false,
        errors: [`Template '${templateId}' not found`],
      };
    }

    // If template doesn't support attachments
    if (
      !template.supportsAttachments &&
      attachments &&
      attachments.length > 0
    ) {
      return {
        valid: false,
        errors: [`Template '${templateId}' does not support attachments`],
      };
    }

    // If no attachments provided, it's valid (attachments are optional)
    if (!attachments || attachments.length === 0) {
      return { valid: true, errors: [] };
    }

    const errors: string[] = [];

    attachments.forEach((attachment, index) => {
      if (!attachment.filename) {
        errors.push(`Attachment ${index + 1}: filename is required`);
      }

      // Must have either content, path, or url
      if (!attachment.content && !attachment.path && !attachment.url) {
        errors.push(
          `Attachment ${index + 1}: must provide content, path, or url`,
        );
      }

      // Validate contentType if provided
      if (attachment.contentType && !attachment.contentType.includes("/")) {
        errors.push(`Attachment ${index + 1}: invalid contentType format`);
      }

      // Validate file type using AttachmentService
      if (
        attachment.filename &&
        !AttachmentService.validateType(attachment.filename)
      ) {
        errors.push(
          `Attachment ${index + 1}: file type not allowed for '${attachment.filename}'`,
        );
      }

      // Validate size if content is provided
      if (
        attachment.content &&
        !AttachmentService.validateSize(attachment.content)
      ) {
        errors.push(`Attachment ${index + 1}: file size exceeds 10MB limit`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static createTemplate(
    template: Omit<Template, "createdAt" | "updatedAt">,
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
    updates: Partial<Template>,
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
    variables: TemplateVariable,
    channel: ChannelType,
  ): { subject?: string; body: string } {
    let renderedSubject = template.subject || "";
    let renderedBody = template.body;

    Object.keys(variables).forEach((key) => {
      const value = variables[key];
      const regex = new RegExp(`{{${key}}}`, "g");
      renderedSubject = renderedSubject.replace(regex, String(value));
      renderedBody = renderedBody.replace(regex, String(value));
    });

    if (channel === ChannelType.EMAIL) {
      renderedBody = renderedBody.replace(/\|/g, "<br/>");
    }

    return {
      subject: template.subject ? renderedSubject : undefined,
      body: renderedBody,
    };
  }

  /**
   * Render template with attachments support
   */
  static renderTemplateWithAttachments(
    template: Template,
    data: TemplateRenderData,
    channel: ChannelType,
  ): {
    subject?: string;
    body: string;
    attachments?: TemplateAttachment[];
  } {
    const { variables, attachments } = data;

    // Render subject and body
    const rendered = this.renderTemplate(template, variables, channel);

    // Merge static template attachments with dynamic attachments
    const finalAttachments: TemplateAttachment[] = [];

    if (template.attachments) {
      finalAttachments.push(...template.attachments);
    }

    if (attachments && template.supportsAttachments) {
      finalAttachments.push(...attachments);
    }

    return {
      ...rendered,
      attachments: finalAttachments.length > 0 ? finalAttachments : undefined,
    };
  }

  // Build Qiscus template components from variables
  static buildQiscusComponents(
    template: Template,
    variables: TemplateVariable,
  ): QiscusTemplateComponent[] {
    if (!template.qiscusConfig) {
      throw new Error("Template does not have Qiscus configuration");
    }

    const components: QiscusTemplateComponent[] = [];
    const config = template.qiscusConfig;

    if (config.headerVariables && config.headerVariables.length > 0) {
      components.push({
        type: "header",
        parameters: config.headerVariables.map((varName) => ({
          type: "text",
          text: String(variables[varName] || ""),
        })),
      });
    }

    if (config.bodyVariables && config.bodyVariables.length > 0) {
      components.push({
        type: "body",
        parameters: config.bodyVariables.map((varName) => ({
          type: "text",
          text: String(variables[varName] || ""),
        })),
      });
    }

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
