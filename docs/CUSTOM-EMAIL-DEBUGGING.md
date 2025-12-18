# Custom Email Debugging Guide

Panduan untuk debugging custom email tanpa akses ke logs Plesk.

---

## 📊 SMTP Response di API Response

Setelah mengirim custom email, API response sekarang include detail SMTP response yang bisa langsung dilihat tanpa perlu akses ke logs.

### Response Structure

```json
{
  "success": true,
  "message": "Custom email sent successfully",
  "data": {
    "messageId": "<message-id@server>",
    "recipients": {
      "to": ["recipient@example.com"],
      "cc": [],
      "bcc": []
    },
    "smtpResponse": {
      "accepted": ["recipient@example.com"],  // ← Email yang diterima SMTP server
      "rejected": [],                          // ← Email yang ditolak SMTP server
      "response": "250 OK",                    // ← Response message dari SMTP server
      "responseCode": 250,                    // ← Response code (250 = success)
      "envelope": {
        "from": "sender@example.com",
        "to": ["recipient@example.com"]
      }
    }
  }
}
```

---

## 🔍 Cara Membaca Response

### 1. Email Berhasil Dikirim ✅

**Indikator:**
- `success: true`
- `smtpResponse.accepted` **tidak kosong** (ada email di dalamnya)
- `smtpResponse.rejected` **kosong** (`[]`)
- `smtpResponse.responseCode` adalah `250` (atau 2xx)
- `smtpResponse.response` berisi "250 OK" atau "250 Message accepted"

**Contoh Response:**
```json
{
  "success": true,
  "data": {
    "smtpResponse": {
      "accepted": ["user@example.com"],
      "rejected": [],
      "response": "250 OK",
      "responseCode": 250
    }
  }
}
```

**Artinya:** Email berhasil dikirim dan diterima oleh SMTP server. Email seharusnya sampai ke inbox (atau spam folder).

---

### 2. Email Ditolak oleh SMTP Server ❌

**Indikator:**
- `success: true` (API berhasil, tapi SMTP menolak)
- `smtpResponse.accepted` **kosong** (`[]`)
- `smtpResponse.rejected` **tidak kosong** (ada email di dalamnya)
- Ada `warning` di response

**Contoh Response:**
```json
{
  "success": true,
  "message": "Email request processed, but SMTP server rejected the email",
  "data": {
    "smtpResponse": {
      "accepted": [],
      "rejected": ["user@example.com"],
      "response": "550 5.1.1 User unknown",
      "responseCode": 550
    },
    "warning": "Email was rejected by SMTP server. Check smtpResponse for details."
  }
}
```

**Artinya:** 
- API request berhasil
- Tapi SMTP server menolak email
- Email **tidak akan sampai** ke recipient

**Kemungkinan Penyebab:**
- Email address tidak valid
- SMTP server tidak mengizinkan `from` address yang digunakan
- IP server tidak di-whitelist di SMTP relay
- Rate limiting di SMTP server

---

### 3. Response Code yang Umum

| Code | Arti | Status |
|------|------|--------|
| `250` | OK - Email diterima | ✅ Success |
| `251` | OK - Email akan di-forward | ✅ Success |
| `354` | Start mail input | ✅ Success (intermediate) |
| `421` | Service unavailable | ❌ Temporary failure |
| `450` | Mailbox unavailable | ❌ Temporary failure |
| `451` | Local error | ❌ Temporary failure |
| `452` | Insufficient storage | ❌ Temporary failure |
| `500` | Syntax error | ❌ Permanent failure |
| `501` | Syntax error in parameters | ❌ Permanent failure |
| `502` | Command not implemented | ❌ Permanent failure |
| `503` | Bad sequence of commands | ❌ Permanent failure |
| `504` | Command parameter not implemented | ❌ Permanent failure |
| `550` | Mailbox unavailable | ❌ Permanent failure |
| `551` | User not local | ❌ Permanent failure |
| `552` | Exceeded storage allocation | ❌ Permanent failure |
| `553` | Mailbox name not allowed | ❌ Permanent failure |
| `554` | Transaction failed | ❌ Permanent failure |

---

## 🧪 Testing SMTP Connection

Sebelum mengirim email, test koneksi SMTP terlebih dahulu:

```bash
GET /api/custom-emails/test-connection
```

**Response Success:**
```json
{
  "success": true,
  "message": "SMTP connection successful",
  "data": {
    "host": "smtp-relay.umn.ac.id",
    "port": "25",
    "user": "ppdb_mns@smtp-relay.umn.ac.id",
    "secure": false
  }
}
```

**Response Error:**
```json
{
  "success": false,
  "message": "SMTP connection test failed: [error details]",
  "data": {
    "error": "[error message]",
    "host": "smtp-relay.umn.ac.id",
    "port": "25",
    "user": "ppdb_mns@smtp-relay.umn.ac.id"
  }
}
```

---

## 🔧 Troubleshooting Berdasarkan Response

### Problem: `accepted` kosong, `rejected` ada isinya

**Kemungkinan Penyebab:**
1. Email address tidak valid
2. SMTP relay tidak mengizinkan `from` address
3. IP server tidak di-whitelist

**Solusi:**
1. Cek format email address
2. Pastikan `from` address sesuai dengan yang diizinkan relay
3. Hubungi admin SMTP relay untuk whitelist IP server

---

### Problem: `accepted` ada isinya, tapi email tidak sampai

**Kemungkinan Penyebab:**
1. Email masuk ke spam folder
2. Email di-block oleh recipient's email server
3. Delay delivery

**Solusi:**
1. Cek spam folder
2. Cek email server logs recipient
3. Tunggu beberapa menit (delay delivery)

---

### Problem: Response code 550 atau 553

**Kemungkinan Penyebab:**
- `from` address tidak diizinkan oleh SMTP relay
- Email address tidak valid

**Solusi:**
1. Pastikan `from` address sesuai dengan `SMTP_USER`
2. Cek apakah relay server mengizinkan `from` address tersebut
3. Hubungi admin SMTP relay

---

### Problem: Response code 421, 450, 451, 452

**Kemungkinan Penyebab:**
- Temporary failure di SMTP server
- Rate limiting
- Server overload

**Solusi:**
1. Coba lagi beberapa saat kemudian
2. Kurangi rate pengiriman email
3. Hubungi admin SMTP relay jika masalah berlanjut

---

## 📝 Contoh Lengkap

### Request
```bash
POST /api/custom-emails/send
Content-Type: application/json

{
  "from": "ppdb_mns@smtp-relay.umn.ac.id",
  "to": [
    { "email": "test@example.com", "name": "Test User" }
  ],
  "subject": "Test Email",
  "body": "<h1>Test</h1><p>This is a test email</p>"
}
```

### Response Success
```json
{
  "success": true,
  "message": "Custom email sent successfully",
  "data": {
    "messageId": "<20250101120000.12345@smtp-relay.umn.ac.id>",
    "recipients": {
      "to": ["test@example.com"],
      "cc": null,
      "bcc": null
    },
    "smtpResponse": {
      "accepted": ["test@example.com"],
      "rejected": [],
      "response": "250 OK: queued as 12345",
      "responseCode": 250,
      "envelope": {
        "from": "ppdb_mns@smtp-relay.umn.ac.id",
        "to": ["test@example.com"]
      }
    }
  }
}
```

### Response Rejected
```json
{
  "success": true,
  "message": "Email request processed, but SMTP server rejected the email",
  "data": {
    "messageId": "<20250101120000.12345@smtp-relay.umn.ac.id>",
    "recipients": {
      "to": ["test@example.com"],
      "cc": null,
      "bcc": null
    },
    "smtpResponse": {
      "accepted": [],
      "rejected": ["test@example.com"],
      "response": "550 5.1.1 User unknown",
      "responseCode": 550,
      "envelope": {
        "from": "ppdb_mns@smtp-relay.umn.ac.id",
        "to": ["test@example.com"]
      }
    },
    "warning": "Email was rejected by SMTP server. Check smtpResponse for details."
  }
}
```

---

## 🎯 Quick Checklist

Setelah mengirim email, cek:

- [ ] `success: true`?
- [ ] `smtpResponse.accepted` tidak kosong?
- [ ] `smtpResponse.rejected` kosong?
- [ ] `smtpResponse.responseCode` adalah 250?
- [ ] Tidak ada `warning` di response?

Jika semua ✅, email seharusnya sudah dikirim. Jika ada ❌, cek `smtpResponse` untuk detail error.

---

Last Updated: January 2025
