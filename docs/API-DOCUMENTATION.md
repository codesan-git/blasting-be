# Email & WhatsApp Blast API Documentation

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
- [Queueing System](#queueing-system)
- [Logging System](#logging-system)
- [Templates](#templates)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## 🎯 Overview

Multi-channel messaging blast system with support for:

- ✉️ **Email** (via SMTP/Nodemailer)
- 💬 **WhatsApp** (via Qiscus Business API)
- 🔄 **Multi-channel** (send to both channels simultaneously)

### Key Features

- **BullMQ Queue System** - Reliable message processing with retry logic
- **Rate Limiting** - Protect API from abuse
- **Template Management** - Reusable message templates with variable substitution
- **Comprehensive Logging** - File logs + Database logs + API logs
- **Dashboard & Analytics** - Real-time stats and monitoring

---

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP Request
       ▼
┌─────────────────────┐
│   Express Server    │
│  (Rate Limiter)     │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────┐
│    Controllers       │
│  - Validate Input    │
│  - Get Template      │
│  - Render Variables  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│   BullMQ Queue       │
│  (Redis-backed)      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│      Workers         │
│  - Email Worker      │
│  - WhatsApp Worker   │
└──────┬───────────────┘
       │
       ├──────────────────────┐
       ▼                      ▼
┌─────────────┐      ┌─────────────┐
│ SMTP Service│      │   Qiscus    │
│ (Nodemailer)│      │    API      │
└─────────────┘      └─────────────┘
       │                      │
       ▼                      ▼
┌──────────────────────────────────┐
│       Database Logging           │
│     (SQLite - message_logs)      │
└──────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
```

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# SMTP (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Qiscus WhatsApp
QISCUS_BASE_URL=https://multichannel.qiscus.com
QISCUS_APP_ID=your-app-id
QISCUS_SECRET_KEY=your-secret-key
QISCUS_CHANNEL_ID=your-channel-id

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_RETENTION_DAYS=30
```

### Start the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start

# With Docker
docker-compose up -d
```

---

## 📡 API Endpoints

### Base URL

```
http://localhost:3000
```

---

## 1. Health & Status

### GET `/health`

Check server health

**Response:**

```json
{
  "status": "OK",
  "timestamp": "2025-11-01T10:00:00.000Z",
  "uptime": 3600.5
}
```

### GET `/api/smtp/status`

Check SMTP configuration status

**Response:**

```json
{
  "success": true,
  "smtp": {
    "configured": true,
    "host": "smtp.gmail.com",
    "user": "your-email@gmail.com"
  }
}
```

---

## 2. Templates

### GET `/api/templates`

Get all templates

**Query Parameters:**

- `channel` (optional): Filter by channel (`email`, `whatsapp`)
- `type` (optional): Filter by type (`welcome`, `promotion`, `invoice`, etc.)

**Response:**

```json
{
  "success": true,
  "count": 3,
  "templates": [
    {
      "id": "email-welcome-001",
      "name": "Welcome Email",
      "type": "welcome",
      "channel": "email",
      "subject": "Welcome to {{companyName}}, {{name}}!",
      "body": "...",
      "variables": ["name", "companyName", "email", "date"],
      "createdAt": "2025-11-01T10:00:00.000Z",
      "updatedAt": "2025-11-01T10:00:00.000Z"
    }
  ]
}
```

### GET `/api/templates/:id`

Get template by ID

**Response:**

```json
{
  "success": true,
  "template": {
    "id": "invoicing_testing_v1_2",
    "name": "Invoice Notification",
    "type": "invoice",
    "channel": "both",
    "subject": "Invoice {{invoiceNumber}} - {{period}}",
    "body": "...",
    "variables": ["name", "period", "invoiceNumber", "amount"],
    "qiscusConfig": {
      "namespace": "b393932b_0056_4389_a284_c45fb5f78ef0",
      "templateName": "invoicing_testing_v1_2",
      "languageCode": "id",
      "headerVariables": ["period"],
      "bodyVariables": ["name", "period", "invoiceNumber", "amount"],
      "buttonVariables": ["invoiceNumber"]
    }
  }
}
```

### POST `/api/templates`

Create new template

**Request Body:**

```json
{
  "id": "custom-order-001",
  "name": "Order Confirmation",
  "type": "notification",
  "channel": "email",
  "subject": "Order #{{orderNumber}} Confirmed",
  "body": "<h1>Thank you {{name}}!</h1><p>Order #{{orderNumber}} confirmed.</p>",
  "variables": ["name", "orderNumber", "amount"]
}
```

### PUT `/api/templates/:id`

Update template

**Request Body:**

```json
{
  "subject": "Updated Subject {{variable}}",
  "body": "Updated body content"
}
```

### DELETE `/api/templates/:id`

Delete template

**Response:**

```json
{
  "success": true,
  "message": "Template deleted successfully"
}
```

### POST `/api/templates/test-render`

Test template rendering with variables

**Request Body:**

```json
{
  "templateId": "email-welcome-001",
  "variables": {
    "name": "John Doe",
    "companyName": "TechCorp",
    "email": "john@example.com",
    "date": "2025-11-01"
  }
}
```

**Response:**

```json
{
  "success": true,
  "template": {
    "id": "email-welcome-001",
    "name": "Welcome Email",
    "channel": "email"
  },
  "variables": {...},
  "rendered": {
    "subject": "Welcome to TechCorp, John Doe!",
    "body": "<h1>Hello John Doe! 👋</h1>...",
    "bodyLength": 453
  }
}
```

---

## 3. Message Blast

### POST `/api/messages/blast`

Send message blast (Email, WhatsApp, or Both)

**Request Body:**

```json
{
  "recipients": [
    {
      "email": "john@example.com",
      "phone": "6281234567890",
      "name": "John Doe",
      "variables": {
        "customField": "Custom Value"
      }
    }
  ],
  "channels": ["email", "whatsapp"],
  "templateId": "invoicing_testing_v1_2",
  "globalVariables": {
    "companyName": "TechCorp",
    "period": "Oktober 2025"
  },
  "from": "noreply@techcorp.id"
}
```

**Field Descriptions:**

- `recipients` (required): Array of recipient objects
  - `email` (optional): Email address (required if using email channel)
  - `phone` (optional): Phone number with country code (required if using WhatsApp)
  - `name` (required): Recipient name
  - `variables` (optional): Custom variables per recipient (merged with globalVariables; recipient vars take precedence)
- `channels` (required): Array of channels `["email"]`, `["whatsapp"]`, or `["email", "whatsapp"]`
- `templateId` (required): Template ID to use
- `globalVariables` (optional): Variables applied to all recipients
- `from` (required for email): Sender email address

**Template variables (tanggal & jadwal):**  
Untuk template yang menampilkan tanggal (pembayaran, trial class, jatuh tempo), gunakan variabel **nama hari terpisah** (nilai: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu) dan variabel tanggal/waktu:

| Template ID | Variabel nama hari | Variabel tanggal/waktu |
|-------------|--------------------|-------------------------|
| `trial_class_payment_success` | `paymentDateDay` | `paymentDate` |
| `trial_class_attending_confirmation2` | `trialDateDay` | `trialDate`, `trialTime`, `trialLocation` |
| `trial_class_attending_confirmed` | `trialDateDay` | `trialDate`, `trialTime`, `trialLocation` |
| `trial_class_reminder` | `trialDateDay` | `trialDate`, `trialTime`, `trialLocation` |
| `booking_fee_payment_success` | `paymentDateDay` | `paymentDate` |
| `trial_class_booking_fee_payment_success` | `paymentDateDay` | `paymentDate`, `billingList` |
| `standard_bill_posting` | `dueDateDay` | `dueDate` |
| `standard_bill_payment_success` | `paymentDateDay` | `paymentDate`, `billingList` |
| `standard_bill_reminder` | `dueDateDay` | `dueDate` |

Contoh `globalVariables` atau `recipients[].variables` untuk template dengan tanggal:

```json
{
  "paymentDateDay": "Kamis",
  "paymentDate": "06-Nov-25, 14:30 WIB"
}
```

```json
{
  "trialDateDay": "Kamis",
  "trialDate": "25 Desember 2026",
  "trialTime": "16:30 WIB",
  "trialLocation": "Ruang 502, Gedung A lantai 5 MNS"
}
```

Daftar lengkap variabel per template bisa dilihat dari **GET `/api/templates/:id`** (field `variables` dan `variableRequirements`).

**Response:**

```json
{
  "success": true,
  "message": "Message blast queued successfully",
  "totalMessages": 2,
  "channels": ["email", "whatsapp"],
  "template": {
    "id": "invoicing_testing_v1_2",
    "name": "Invoice Notification",
    "qiscusEnabled": true
  },
  "jobIds": ["1234567890123", "1234567890124"]
}
```

---

## 4. Queue Statistics

### GET `/api/messages/stats`

Get queue statistics

**Response:**

```json
{
  "success": true,
  "stats": {
    "waiting": 5,
    "active": 2,
    "completed": 150,
    "failed": 3
  }
}
```

---

## 5. Dashboard

### GET `/api/dashboard`

Get comprehensive dashboard data

**Response:**

```json
{
  "success": true,
  "dashboard": {
    "messageStats": [
      {
        "channel": "email",
        "status": "sent",
        "count": 120
      },
      {
        "channel": "whatsapp",
        "status": "sent",
        "count": 85
      }
    ],
    "messageStatsByDate": [
      {
        "date": "2025-11-01",
        "channel": "email",
        "status": "sent",
        "count": 45
      }
    ],
    "queueStats": {
      "waiting": 5,
      "active": 2,
      "completed": 150,
      "failed": 3
    },
    "recentLogs": [...]
  }
}
```

---

## 6. Logs

### GET `/api/logs/messages`

Get message logs

**Query Parameters:**

- `status` (optional): Filter by status (`queued`, `processing`, `sent`, `failed`)
- `channel` (optional): Filter by channel (`email`, `whatsapp`)
- `email` (optional): Filter by recipient email
- `limit` (optional): Number of records (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**

```json
{
  "success": true,
  "count": 50,
  "logs": [
    {
      "id": 1,
      "job_id": "1234567890123",
      "channel": "email",
      "recipient_email": "john@example.com",
      "recipient_name": "John Doe",
      "template_id": "email-welcome-001",
      "template_name": "Welcome Email",
      "subject": "Welcome to TechCorp, John Doe!",
      "status": "sent",
      "message_id": "abc123xyz",
      "attempts": 1,
      "created_at": "2025-11-01T10:00:00.000Z",
      "updated_at": "2025-11-01T10:00:05.000Z"
    }
  ]
}
```

### GET `/api/logs/messages/stats`

Get message statistics by status

**Response:**

```json
{
  "success": true,
  "stats": {
    "email": {
      "queued": 5,
      "processing": 2,
      "sent": 120,
      "failed": 3
    },
    "whatsapp": {
      "queued": 3,
      "processing": 1,
      "sent": 85,
      "failed": 2
    },
    "total": {
      "queued": 8,
      "processing": 3,
      "sent": 205,
      "failed": 5
    }
  }
}
```

### GET `/api/logs/messages/stats/by-date`

Get message statistics by date

**Query Parameters:**

- `days` (optional): Number of days to look back (default: 7)

**Response:**

```json
{
  "success": true,
  "stats": [
    {
      "date": "2025-11-01",
      "channel": "email",
      "status": "sent",
      "count": 45
    }
  ]
}
```

### GET `/api/logs/api`

Get API request logs

**Query Parameters:**

- `limit` (optional): Number of records (default: 100)
- `offset` (optional): Pagination offset (default: 0)

### GET `/api/logs/system`

Get system logs

**Query Parameters:**

- `level` (optional): Filter by level (`error`, `warn`, `info`)
- `limit` (optional): Number of records (default: 100)
- `offset` (optional): Pagination offset (default: 0)

### POST `/api/logs/cleanup`

Cleanup old logs

**Request Body:**

```json
{
  "days": 30
}
```

---

## 🔄 Queueing System

### Queue Flow

```
1. Request → Controller
   ↓
2. Validation & Template Rendering
   ↓
3. Create Job Data → Add to BullMQ Queue
   ↓
4. Database Log: status = 'queued'
   ↓
5. Worker picks job from queue
   ↓
6. Database Update: status = 'processing'
   ↓
7. Send via SMTP/Qiscus
   ↓
8. Database Update: status = 'sent' or 'failed'
```

### Queue Configuration

```typescript
{
  attempts: 3,                    // Retry 3 times on failure
  backoff: {
    type: 'exponential',
    delay: 2000                   // 2s, 4s, 8s delays
  },
  removeOnComplete: {
    count: 100                    // Keep last 100 completed jobs
  },
  removeOnFail: {
    count: 50                     // Keep last 50 failed jobs
  }
}
```

### Worker Concurrency

- **Email Worker**: 5 concurrent jobs
- **Message Worker**: 5 concurrent jobs
- **Rate Limit**: 10 messages per second

---

## 📊 Logging System

### 3-Level Logging Architecture

#### 1. Winston File Logs

```
logs/
├── error.log         # Error level only
├── combined.log      # All levels
└── (console)         # Development mode
```

#### 2. Database Logs (SQLite)

**Tables:**

- `message_logs` - All message sending records
- `api_logs` - All API requests
- `system_logs` - System events and errors

**Message Log Schema:**

```sql
CREATE TABLE message_logs (
  id INTEGER PRIMARY KEY,
  job_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  recipient_name TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_name TEXT,
  subject TEXT,
  status TEXT NOT NULL,           -- queued, processing, sent, failed
  error_message TEXT,
  message_id TEXT,
  attempts INTEGER DEFAULT 1,
  created_at DATETIME,
  updated_at DATETIME
);
```

#### 3. API Request Logging

Every API request is logged with:

- Endpoint & Method
- IP Address
- Request Body
- Response Status
- Response Time (ms)

---

## 📝 Templates

### Template Types

- `welcome` - Welcome messages
- `promotion` - Promotional content
- `notification` - General notifications
- `reminder` - Payment reminders, etc.
- `invoice` - Invoice notifications
- `custom` - Custom templates

### Channel Types

- `email` - Email only
- `whatsapp` - WhatsApp only
- `both` - Available for both channels

### Variable Substitution

Templates use `{{variableName}}` syntax:

```html
<h1>Hello {{name}}!</h1>
<p>Your invoice {{invoiceNumber}} for {{period}} is ready.</p>
<p>Amount: {{amount}}</p>
```

Variables are replaced from:

1. `recipient.variables` (highest priority)
2. `globalVariables`
3. Recipient info (`name`, `email`, `phone`)

### Qiscus WhatsApp Templates

For WhatsApp via Qiscus, templates must be pre-approved in Qiscus dashboard.

**Template Configuration:**

```json
{
  "qiscusConfig": {
    "namespace": "your-namespace-id",
    "templateName": "your_template_name",
    "languageCode": "id",
    "headerVariables": ["period"],
    "bodyVariables": ["name", "period", "invoiceNumber", "amount"],
    "buttonVariables": ["invoiceNumber"]
  }
}
```

**Component Mapping:**

- `headerVariables` → Header component parameters
- `bodyVariables` → Body component parameters
- `buttonVariables` → Button URL parameters

---

## ⚠️ Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `409` - Conflict (duplicate)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Retry Logic

Failed jobs are automatically retried:

- Attempt 1: Immediate
- Attempt 2: 2 seconds delay
- Attempt 3: 4 seconds delay
- After 3 attempts: Marked as `failed`

---

## 💡 Best Practices

### 1. Template Design

✅ **DO:**

- Use clear, descriptive variable names
- Test templates before production use
- Use `/api/templates/test-render` endpoint
- Keep templates modular and reusable

❌ **DON'T:**

- Hardcode values in templates
- Use too many variables (keep it simple)
- Forget to escape HTML in email bodies

### 2. Rate Limiting

- Default: 100 requests per minute
- Blast endpoint: 10 requests per minute
- Adjust via environment variables

### 3. Queue Management

- Monitor queue stats regularly
- Set up alerts for high failure rates
- Clean up old logs periodically

```bash
# Cleanup logs older than 30 days
curl -X POST http://localhost:3000/api/logs/cleanup \
  -H "Content-Type: application/json" \
  -d '{"days": 30}'
```

### 4. Error Monitoring

Monitor these metrics:

- Queue waiting/active counts
- Message failure rates
- API response times
- Error logs

### 5. Production Checklist

- [ ] Configure SMTP properly
- [ ] Configure Qiscus credentials
- [ ] Set up Redis (production instance)
- [ ] Configure rate limits
- [ ] Set up log rotation
- [ ] Enable monitoring/alerting
- [ ] Test all templates
- [ ] Set up database backups

---

## 🔧 Troubleshooting

### Queue not processing

```bash
# Check Redis connection
docker exec -it email-blast-redis redis-cli ping

# Check queue stats
curl http://localhost:3000/api/messages/stats

# View worker logs
tail -f logs/combined.log | grep "Worker"
```

### Messages failing

```bash
# Check failed messages
curl http://localhost:3000/api/logs/messages?status=failed

# Check SMTP status
curl http://localhost:3000/api/smtp/status

# View error logs
tail -f logs/error.log
```

### High error rate

```bash
# Get statistics
curl http://localhost:3000/api/logs/messages/stats

# Check recent errors
curl "http://localhost:3000/api/logs/system?level=error&limit=10"
```

---

## 📞 Support

For issues and questions:

- Check logs: `tail -f logs/combined.log`
- Check database: `sqlite3 data/logs.db`
- Monitor queue: Use monitoring scripts
- Review documentation: This file

---

## 📄 License

ISC

---

**Last Updated:** February 2026  
**Version:** 1.0.0

---

**Catatan:** Dokumentasi API yang dipublikasi di Postman ([Message Blast Service API](https://documenter.getpostman.com/view/30073719/2sB3WwpcTC)) sebaiknya disinkronkan dengan file ini. Edit dokumen Postman via Postman app (Collection → View Docs / Publish) atau dengan mengimpor ulang collection jika ada file export-nya di repo.
