# 📧 Email Blast Application - Complete Documentation

> **Multi-channel messaging platform** with email, WhatsApp, SMS, and push notification support using BullMQ queue system, Redis, and SQLite database.

---

## 📑 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [System Components](#system-components)
3. [Authentication & Authorization](#authentication--authorization)
4. [Rate Limiting](#rate-limiting)
5. [Message Queue System](#message-queue-system)
6. [Template System](#template-system)
7. [Message Blast Flow](#message-blast-flow)
8. [Logging System](#logging-system)
9. [Webhook System](#webhook-system)
10. [Backup System](#backup-system)
11. [API Endpoints](#api-endpoints)
12. [Environment Configuration](#environment-configuration)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT REQUEST                           │
│              (API with JWT Authentication)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXPRESS APP                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Rate Limiter │→ │     Auth     │→ │ Permissions  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│               CONTROLLER LAYER                               │
│  • Validate Request                                          │
│  • Check Template Requirements                               │
│  • Merge Variables (global + recipient)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  QUEUE SYSTEM (BullMQ)                       │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │ Message Queue│         │  Redis Store │                  │
│  │  (BullMQ)    │ ◄─────► │  (ioredis)   │                  │
│  └──────────────┘         └──────────────┘                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  WORKER PROCESSES                            │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │Email Worker  │         │WhatsApp Worker│                 │
│  │  (SMTP)      │         │  (Qiscus)     │                 │
│  └──────────────┘         └──────────────┘                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │ SMTP Server  │         │Qiscus WhatsApp│                 │
│  │  (Email)     │         │     API       │                 │
│  └──────────────┘         └──────────────┘                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              LOGGING & DATABASE                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              SQLite Database (logs.db)               │   │
│  │  • message_logs (delivery status)                    │   │
│  │  • api_logs (API call tracking)                      │   │
│  │  • system_logs (application logs)                    │   │
│  │  • users (authentication)                            │   │
│  │  • refresh_tokens                                    │   │
│  │  • role_permissions (dynamic RBAC)                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 System Components

### 1. **Express Application** (`src/app.ts`)

- HTTP server dengan middleware stack
- Route handling untuk semua endpoints
- Error handling dan logging

### 2. **Queue System** (BullMQ + Redis)

- **Message Queue**: Antrian pesan untuk email/WhatsApp/SMS
- **Worker**: Proses background untuk mengirim pesan
- **Job Retries**: Auto retry dengan exponential backoff

### 3. **Database** (SQLite via better-sqlite3)

- **WAL mode**: Write-Ahead Logging untuk concurrent access
- **Jakarta Timezone**: Semua timestamp menggunakan WIB (UTC+7)
- **Automatic backup**: Scheduled backup dengan compression

### 4. **External Services**

- **SMTP**: Nodemailer untuk email
- **Qiscus**: WhatsApp Business API
- **Webhooks**: Status callback dari Qiscus

---

## 🔐 Authentication & Authorization

### JWT-Based Authentication

#### Token Types

1. **Access Token** (Short-lived: 15 minutes)

   - Used for API authentication
   - Contains user ID, email, name, roles
   - Stored in `Authorization: Bearer <token>` header

2. **Refresh Token** (Long-lived: 7 days)
   - Used to get new access token
   - Hashed and stored in database
   - Can be revoked

#### User Roles

```typescript
enum UserRole {
  SUPER_ADMIN = "super_admin",
  ADMIN_PPDB = "admin_ppdb",
  ADMIN_ANNOUNCEMENT = "admin_announcement",
}
```

#### Permission System (Dynamic RBAC)

**Permissions are stored in database** (`role_permissions` table):

```typescript
enum Permission {
  // Email
  EMAIL_SEND = "email:send",
  EMAIL_READ = "email:read",

  // WhatsApp
  WHATSAPP_SEND = "whatsapp:send",
  WHATSAPP_READ = "whatsapp:read",

  // Templates
  TEMPLATE_CREATE = "template:create",
  TEMPLATE_READ = "template:read",
  TEMPLATE_UPDATE = "template:update",
  TEMPLATE_DELETE = "template:delete",

  // Logs
  LOGS_READ = "logs:read",
  LOGS_DELETE = "logs:delete",

  // Dashboard
  DASHBOARD_READ = "dashboard:read",

  // User Management
  USER_CREATE = "user:create",
  USER_READ = "user:read",
  USER_UPDATE = "user:update",
  USER_DELETE = "user:delete",

  // Backup
  BACKUP_CREATE = "backup:create",
  BACKUP_READ = "backup:read",
  BACKUP_RESTORE = "backup:restore",

  // System
  SYSTEM_CONFIG = "system:config",
  SYSTEM_LOGS = "system:logs",
}
```

#### Authentication Flow

```
┌──────────────┐
│    LOGIN     │
│ POST /api/   │
│  auth/login  │
└──────┬───────┘
       │
       │ 1. Verify email & password
       ▼
┌──────────────────────┐
│  Check User Active   │
│  Hash Password       │
└──────┬───────────────┘
       │
       │ 2. Generate tokens
       ▼
┌──────────────────────┐
│  Generate Access &   │
│  Refresh Tokens      │
└──────┬───────────────┘
       │
       │ 3. Return tokens
       ▼
┌──────────────────────┐
│   Response with:     │
│  • accessToken       │
│  • refreshToken      │
│  • user info         │
└──────────────────────┘
```

#### Super Admin Limit

**Maximum 3 Super Admins** (configurable via `MAX_SUPER_ADMINS` env):

- Prevents creating more than limit
- Prevents promoting users if limit reached
- Prevents removing last super admin

```typescript
// Check on user creation
if (roles.includes(UserRole.SUPER_ADMIN)) {
  const count = DatabaseService.countSuperAdmins();
  if (count >= MAX_SUPER_ADMINS) {
    throw new Error("Super admin limit reached");
  }
}
```

#### Middleware Stack

```typescript
// Example protected route
app.use(
  "/api/email",
  authenticate, // ✓ Check JWT
  requirePermission(Permission.EMAIL_SEND), // ✓ Check permission from DB
  blastLimiter, // ✓ Rate limit
  emailRoutes
);
```

---

## ⏱️ Rate Limiting

### Rate Limiter Configuration

Rate limiting menggunakan `express-rate-limit` dengan 3 level:

#### 1. General API Limiter (`apiLimiter`)

```typescript
windowMs: 60000,        // 1 minute
max: 1000,              // 1000 requests per minute
message: "Too many requests from this IP"
```

Applied to: `/api/*` (except webhooks and auth)

#### 2. Blast Limiter (`blastLimiter`)

```typescript
windowMs: 60000,        // 1 minute
max: 1000,              // 1000 blast requests per minute
message: "Too many blast requests"
```

Applied to:

- `/api/email/blast`
- `/api/messages/blast`

#### 3. Template Limiter (`templateLimiter`)

```typescript
windowMs: 60000,        // 1 minute
max: 30,                // 30 requests per minute
message: "Too many template requests"
```

Applied to: `/api/templates/*`

### Rate Limit Headers

Response includes:

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1699123456
```

### Bypassing Rate Limits

**Webhooks are NOT rate-limited**:

```typescript
// Webhooks MUST be before rate limiter
app.use("/webhooks", webhookRoutes);

// Rate limiter applied AFTER webhooks
app.use("/api/", apiLimiter);
```

---

## 📦 Message Queue System

### BullMQ Architecture

```
┌────────────────────────────────────────────────────┐
│                  MESSAGE QUEUE                      │
│                                                     │
│  ┌─────────────┐    ┌─────────────┐               │
│  │   PRODUCER  │───▶│    REDIS    │               │
│  │  (API Call) │    │   (Queue)   │               │
│  └─────────────┘    └──────┬──────┘               │
│                             │                       │
│                             ▼                       │
│                      ┌─────────────┐               │
│                      │   WORKER    │               │
│                      │  (Process)  │               │
│                      └──────┬──────┘               │
│                             │                       │
│                             ▼                       │
│                      ┌─────────────┐               │
│                      │  COMPLETED  │               │
│                      │  or FAILED  │               │
│                      └─────────────┘               │
└────────────────────────────────────────────────────┘
```

### Queue Configuration

**Message Queue** (`src/queues/message.queue.ts`):

```typescript
{
  attempts: 3,                    // Retry up to 3 times
  backoff: {
    type: "exponential",
    delay: 2000                   // 2s, 4s, 8s
  },
  removeOnComplete: {
    count: 100                    // Keep last 100 completed jobs
  },
  removeOnFail: {
    count: 50                     // Keep last 50 failed jobs
  }
}
```

### Worker Configuration

**Message Worker** (`src/workers/message.worker.ts`):

```typescript
{
  concurrency: 5,                 // Process 5 jobs simultaneously
  limiter: {
    max: 10,                      // Max 10 jobs
    duration: 1000                // per 1 second
  }
}
```

### Queue Job Flow

```
1. API Request
   ↓
2. Validate Input
   ↓
3. Create Jobs (addBulkMessagesToQueue)
   ↓
4. Jobs Added to Redis Queue
   ↓
5. Database: Status = "queued"
   ↓
6. Worker Picks Up Job
   ↓
7. Database: Status = "processing"
   ↓
8. Send via SMTP/Qiscus
   ↓
9. Success → Database: Status = "sent", messageId stored
   Failed → Database: Status = "failed", error stored
   ↓
10. Webhook (for WhatsApp)
    ↓
11. Update Status: "delivered", "read", "failed"
```

### Job Priority

Jobs can have priority (lower number = higher priority):

```typescript
await messageQueue.add("send-message", data, {
  priority: 1, // High priority
});
```

---

## 📝 Template System

### Template Structure

```typescript
interface Template {
  id: string;
  name: string;
  type: TemplateType;
  channels: ChannelType[]; // Multi-channel support
  subject?: string; // For email
  body: string; // Template with {{variables}}
  variables: string[]; // Required variable names
  variableRequirements: VariableRequirement[];
  qiscusConfig?: QiscusTemplateConfig; // WhatsApp template
  createdAt: Date;
  updatedAt: Date;
}
```

### Template Types

```typescript
enum TemplateType {
  WELCOME = "welcome",
  PROMOTION = "promotion",
  NOTIFICATION = "notification",
  REMINDER = "reminder",
  INVOICE = "invoice",
  CUSTOM = "custom",
}
```

### Channel Types

```typescript
enum ChannelType {
  EMAIL = "email",
  WHATSAPP = "whatsapp",
  SMS = "sms",
  PUSH = "push",
}
```

### Variable Requirements

Each variable can have detailed requirements:

```typescript
{
  name: "invoiceNumber",
  description: "Nomor invoice",
  required: true,
  type: "string",           // "string" | "number" | "date" | "email" | "phone"
  example: "INV-2025-001"
}
```

### Variable Merging Priority

```
recipient.variables (Highest)
        ↓
globalVariables
        ↓
recipient basic fields (name, email, phone)
```

Example:

```json
{
  "globalVariables": {
    "companyName": "PT ABC",
    "amount": "Rp 1.000.000"
  },
  "recipients": [
    {
      "name": "John",
      "email": "john@example.com",
      "variables": {
        "invoiceNumber": "INV-001",
        "amount": "Rp 2.000.000"  // ✓ Overrides global
      }
    }
  ]
}

// Result for John:
{
  name: "John",
  email: "john@example.com",
  companyName: "PT ABC",
  amount: "Rp 2.000.000",      // From recipient.variables
  invoiceNumber: "INV-001"
}
```

### Template Rendering

```typescript
// Template body
"Hello {{name}}, your invoice {{invoiceNumber}} is {{amount}}";

// After rendering
"Hello John, your invoice INV-001 is Rp 2.000.000";
```

### Qiscus WhatsApp Template

WhatsApp templates use Qiscus format:

```typescript
{
  qiscusConfig: {
    namespace: "b393932b_0056_4389_a284_c45fb5f78ef0",
    templateName: "invoicing_testing_v1_2",
    languageCode: "id",
    headerVariables: ["period"],
    bodyVariables: ["name", "period", "invoiceNumber", "amount"],
    buttonVariables: ["invoiceNumber"]
  }
}
```

Components are built automatically:

```typescript
[
  {
    type: "header",
    parameters: [{ type: "text", text: "September 2025" }],
  },
  {
    type: "body",
    parameters: [
      { type: "text", text: "John" },
      { type: "text", text: "September 2025" },
      { type: "text", text: "INV-001" },
      { type: "text", text: "Rp 2.000.000" },
    ],
  },
  {
    type: "button",
    sub_type: "url",
    index: "0",
    parameters: [{ type: "text", text: "INV-001" }],
  },
];
```

---

## 🚀 Message Blast Flow

### Complete Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│  1. CLIENT SENDS REQUEST                                  │
│     POST /api/messages/blast                              │
│     Headers: Authorization: Bearer <token>                │
│     Body: { recipients, channels, templateId, ... }       │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│  2. AUTHENTICATION & AUTHORIZATION                        │
│     ✓ Verify JWT token                                    │
│     ✓ Check user active                                   │
│     ✓ Check permissions from database                     │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│  3. RATE LIMITING                                         │
│     ✓ Check request count                                 │
│     ✓ Return 429 if exceeded                              │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│  4. INPUT VALIDATION                                      │
│     ✓ Check required fields                               │
│     ✓ Validate channels                                   │
│     ✓ Validate template exists                            │
│     ✓ Check channel compatibility                         │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│  5. RECIPIENT VALIDATION (Per-Recipient)                  │
│     For each recipient:                                   │
│       ✓ Check name, email, phone                          │
│       ✓ Merge variables (global + recipient + basic)      │
│       ✓ Validate against template requirements           │
│       ✓ Collect ALL errors                                │
│     Return 422 with ALL errors if validation fails        │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│  6. TEMPLATE RENDERING                                    │
│     For each recipient + channel:                         │
│       • Render email template (HTML)                      │
│       • Build Qiscus components (WhatsApp)                │
│       • Create MessageJobData                             │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│  7. QUEUE JOBS                                            │
│     • Add jobs to BullMQ (addBulkMessagesToQueue)         │
│     • Get job IDs                                         │
│     • Log to database: status = "queued"                  │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│  8. RETURN SUCCESS RESPONSE                               │
│     {                                                     │
│       "success": true,                                    │
│       "data": {                                           │
│         "totalMessages": 6,                               │
│         "totalRecipients": 3,                             │
│         "channels": ["email", "whatsapp"],                │
│         "jobIds": ["job1", "job2", ...]                   │
│       }                                                   │
│     }                                                     │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│  9. WORKER PROCESSES JOBS (Background)                    │
│     Worker picks up job:                                  │
│       • Update DB: status = "processing"                  │
│       • Send via SMTP (email) or Qiscus (WhatsApp)        │
│       • Success: Update DB: status = "sent", messageId    │
│       • Failed: Update DB: status = "failed", error       │
│       • Retry 3x with exponential backoff if failed       │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│  10. WEBHOOK STATUS UPDATES (WhatsApp only)               │
│      Qiscus sends webhook to /webhooks/qiscus:            │
│        • message_status: "sent" | "delivered" | "read"    │
│        • Update database by message_id                    │
│        • Log status changes                               │
└──────────────────────────────────────────────────────────┘
```

### Validation Flow Detail

```
INPUT VALIDATION
├── Basic Validation
│   ├── recipients array not empty
│   ├── channels array not empty
│   ├── templateId provided
│   └── from email (if email channel)
│
├── Channel Validation
│   ├── channels are valid
│   └── template supports channels
│
└── Per-Recipient Validation (LOOP)
    ├── Basic Fields
    │   ├── name (for logging)
    │   ├── email (if email channel)
    │   └── phone (if whatsapp channel)
    │
    ├── Merge Variables
    │   └── globalVariables + recipient.variables + basic fields
    │
    └── Template Requirements
        ├── Check each required variable
        ├── Validate variable types
        └── Collect ALL errors

If ANY errors → Return 422 with ALL errors
If NO errors → Continue to rendering
```

---

## 📊 Logging System

### Log Types

Application has 3 types of logs stored in SQLite:

#### 1. Message Logs (`message_logs`)

Tracks every message sent:

```sql
CREATE TABLE message_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  recipient_name TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_name TEXT,
  subject TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  message_id TEXT,
  attempts INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**Status Flow**:

```
"queued" → "processing" → "sent" → "delivered" → "read"
                       ↘ "failed"
```

#### 2. API Logs (`api_logs`)

Tracks every API call:

```sql
CREATE TABLE api_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  ip_address TEXT,
  request_body TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TEXT NOT NULL
);
```

**Logged via middleware**:

```typescript
app.use(apiLogger); // Automatically logs all API calls
```

#### 3. System Logs (`system_logs`)

Application-level logs:

```sql
CREATE TABLE system_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL
);
```

**Log Levels**:

- `error`: Errors and exceptions
- `warn`: Warnings
- `info`: Important events (if marked `important: true`)
- `debug`: Debug information

### Winston Logger

Custom logger wrapper (`src/utils/logger.ts`):

```typescript
logger.error("Failed to send email", {
  error: error.message,
  userId: user.id,
});

logger.warn("Rate limit approaching", {
  ip: req.ip,
  count: 95,
});

logger.info("Message blast initiated", {
  totalMessages: 100,
  important: true, // ← Logs to database
});

logger.debug("Processing recipient", {
  variables,
}); // Only console, not DB
```

### Timezone Handling

All timestamps use **Jakarta Time (WIB - UTC+7)**:

```typescript
// Set on startup
process.env.TZ = "Asia/Jakarta";

// Helper function
const getJakartaTime = (): string => {
  return new Date()
    .toLocaleString("en-US", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, "$3-$1-$2 $4:$5:$6");
};
```

### Log Cleanup

Automatic cleanup of old logs:

```typescript
// Scheduled job (optional)
scheduleLogCleanup();  // Runs every 24 hours

// Or manual cleanup
POST /api/logs/cleanup
{
  "days": 30  // Keep last 30 days
}
```

---

## 🔔 Webhook System

### Qiscus Webhook Flow

```
┌──────────────────────────────────────────────────────┐
│  1. SEND WHATSAPP MESSAGE                             │
│     Worker → Qiscus API                               │
│     Response: { message_id: "abc123" }                │
│     Store message_id in database                      │
└─────────────────────┬────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────┐
│  2. QISCUS SENDS STATUS UPDATE                        │
│     POST https://yourapp.com/webhooks/qiscus          │
│     {                                                 │
│       "type": "message_status",                       │
│       "payload": {                                    │
│         "message_id": "abc123",                       │
│         "status": "delivered",                        │
│         "timestamp": "2025-11-05T14:30:00Z"           │
│       }                                               │
│     }                                                 │
└─────────────────────┬────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────┐
│  3. WEBHOOK HANDLER PROCESSES                         │
│     • Validate payload                                │
│     • Find message by message_id                      │
│     • Update status in database                       │
│     • Log status change                               │
└──────────────────────────────────────────────────────┘
```

### Webhook Registration

Automatic registration on app startup:

```typescript
// On startup
const webhookUrl = `${APP_URL}/webhooks/qiscus`;
await qiscusWebhookService.registerWebhook(webhookUrl);
```

### Webhook Payload Types

#### 1. Message Status Update

```json
{
  "type": "message_status",
  "payload": {
    "message_id": "msg_abc123",
    "status": "sent" | "delivered" | "read" | "failed",
    "from": "6285779579424",
    "timestamp": "2025-11-05T14:30:00Z",
    "error": "Error message if failed"
  }
}
```

**Status Mapping**:

- `sent`: Message sent to WhatsApp server
- `delivered`: Message delivered to recipient's phone
- `read`: Message read by recipient
- `failed`: Message failed to send

#### 2. Incoming Message (Customer Reply)

```json
{
  "type": "incoming_message",
  "payload": {
    "from": "6285779579424",
    "id": "wamid.xyz",
    "timestamp": "2025-11-05T14:30:00Z",
    "message": {
      "text": "Thank you for the invoice!",
      "type": "text"
    }
  }
}
```

### Webhook Handler

```typescript
// src/controllers/webhook.controller.ts
export const handleQiscusWebhook = async (req, res) => {
  const payload = req.body;

  if (payload.type === "message_status") {
    await handleMessageStatus(payload.payload);
  } else if (payload.type === "incoming_message") {
    await handleIncomingMessage(payload.payload);
  }

  // Always respond 200 to prevent retries
  res.status(200).json({ success: true });
};
```

### Important Notes

- ⚠️ Webhooks are **NOT rate-limited**
- ⚠️ Webhooks do **NOT require authentication**
- ⚠️ Always respond with 200 to prevent Qiscus from retrying
- ⚠️ Webhook URL must be publicly accessible (use ngrok for local dev)

---

## 💾 Backup System

### Automatic Backups

Configured via environment variables:

```bash
BACKUP_ENABLED=true
BACKUP_INTERVAL_HOURS=24
BACKUP_COMPRESSED=true
BACKUP_SCHEDULED_TIME=02:00  # Daily at 2 AM WIB
MAX_BACKUPS=30
```

### Backup Modes

#### 1. Interval-Based (Legacy)

```bash
BACKUP_ENABLED=true
BACKUP_INTERVAL_HOURS=24
# Backup every 24 hours from app start
```

#### 2. Scheduled Time (Recommended)

```bash
BACKUP_ENABLED=true
BACKUP_SCHEDULED_TIME=02:00  # Daily at 2:00 AM WIB
BACKUP_COMPRESSED=true
```

### Backup Flow

```
┌──────────────────────────────────────────────────────┐
│  SCHEDULER                                            │
│  • Check if it's backup time (2:00 AM WIB)            │
│  • Check if backup already exists for today           │
└─────────────────────┬────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────┐
│  CREATE BACKUP                                        │
│  • Copy logs.db to backups/ directory                 │
│  • Filename: logs_backup_2025-11-05_02-00-00.db      │
│  • Optional: Compress with gzip (.db.gz)              │
└─────────────────────┬────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────┐
│  VERIFY BACKUP                                        │
│  • Check file size > 0                                │
│  • Log success/failure                                │
└─────────────────────┬────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────┐
│  CLEANUP OLD BACKUPS                                  │
│  • Keep only last MAX_BACKUPS (default: 30)           │
│  • Delete oldest backups                              │
└──────────────────────────────────────────────────────┘
```

### Backup Filename Format

```
logs_backup_YYYY-MM-DD_HH-MM-SS.db[.gz]

Examples:
logs_backup_2025-11-05_02-00-00.db
logs_backup_2025-11-05_02-00-00.db.gz (compressed)
logs_before_restore_2025-11-05_14-30-00.db (auto before restore)
```

### Manual Backup API

```bash
# Create uncompressed backup
POST /api/backup/create
{
  "compressed": false
}

# Create compressed backup (recommended)
POST /api/backup/create
{
  "compressed": true
}

# Response
{
  "success": true,
  "message": "Backup created successfully",
  "backupPath": "/path/to/backups/logs_backup_2025-11-05_14-30-00.db.gz",
  "stats": {
    "totalBackups": 15,
    "totalSize": "245.67 MB",
    "oldestBackup": "2025-10-20T02:00:00.000Z",
    "newestBackup": "2025-11-05T02:00:00.000Z"
  }
}
```

### List Backups

```bash
GET /api/backup/list

# Response
{
  "success": true,
  "count": 15,
  "stats": {
    "totalBackups": 15,
    "totalSize": "245.67 MB"
  },
  "backups": [
    {
      "filename": "logs_backup_2025-11-05_02-00-00.db.gz",
      "size": "18.45 MB",
      "created": "2025-11-05T02:00:00.000Z",
      "compressed": true
    },
    {
      "filename": "logs_backup_2025-11-04_02-00-00.db.gz",
      "size": "17.89 MB",
      "created": "2025-11-04T02:00:00.000Z",
      "compressed": true
    }
  ]
}
```

### Restore Database

```bash
POST /api/backup/restore
{
  "backupFilename": "logs_backup_2025-11-05_02-00-00.db.gz"
}

# Response
{
  "success": true,
  "message": "Database restored successfully. Please restart the application."
}
```

**Important**:

- Current database is backed up before restore
- Backup filename: `logs_before_restore_YYYY-MM-DD_HH-MM-SS.db`
- Application restart required after restore

### Download Backup

```bash
GET /api/backup/download/logs_backup_2025-11-05_02-00-00.db.gz

# Browser will download the file
```

---

## 🎯 API Endpoints

### Authentication

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_1699123456_abc123",
    "email": "admin@example.com",
    "name": "Admin User",
    "roles": ["super_admin"]
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

#### Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6..."
}

Response:
{
  "success": true,
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Get Profile

```http
GET /api/auth/me
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "admin@example.com",
      "name": "Admin User",
      "roles": ["super_admin"],
      "is_active": true,
      "created_at": "2025-11-01 10:00:00",
      "permissions": ["email:send", "whatsapp:send", ...]
    }
  }
}
```

#### Logout

```http
POST /api/auth/logout
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

#### Change Password

```http
POST /api/auth/change-password
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "currentPassword": "oldpass123",
  "newPassword": "newpass456"
}
```

#### Register User (Super Admin Only)

```http
POST /api/auth/register
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User",
  "roles": ["admin_ppdb"]
}
```

---

### Templates

#### Get All Templates

```http
GET /api/templates
Authorization: Bearer <accessToken>

# Filter by channel
GET /api/templates?channel=email

# Filter by type
GET /api/templates?type=invoice
```

#### Get Template by ID

```http
GET /api/templates/:id
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "data": {
    "id": "invoicing_testing_v1_2",
    "name": "Invoice Notification",
    "type": "invoice",
    "channels": ["email", "whatsapp"],
    "subject": "Invoice {{invoiceNumber}} - {{period}}",
    "body": "<h1>Invoice Notification</h1>...",
    "variables": ["name", "period", "invoiceNumber", "amount"],
    "variableRequirements": [
      {
        "name": "name",
        "description": "Nama penerima invoice",
        "required": true,
        "type": "string",
        "example": "Budi Santoso"
      }
    ]
  }
}
```

#### Get Template Requirements

```http
GET /api/templates/:id/requirements
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "data": {
    "templateId": "invoicing_testing_v1_2",
    "templateName": "Invoice Notification",
    "channels": ["email", "whatsapp"],
    "variableCount": 5,
    "requirements": [
      {
        "name": "name",
        "description": "Nama penerima invoice",
        "required": true,
        "type": "string",
        "example": "Budi Santoso"
      }
    ]
  }
}
```

#### Test Template Rendering

```http
POST /api/templates/test-render
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "templateId": "invoicing_testing_v1_2",
  "variables": {
    "name": "John Doe",
    "period": "November 2025",
    "invoiceNumber": "INV-001",
    "amount": "Rp 1.500.000",
    "companyName": "PT ABC"
  }
}

Response:
{
  "success": true,
  "data": {
    "template": {
      "id": "invoicing_testing_v1_2",
      "name": "Invoice Notification",
      "channel": "email"
    },
    "variables": { ... },
    "rendered": {
      "subject": "Invoice INV-001 - November 2025",
      "body": "<h1>Invoice Notification</h1><p>Dear John Doe,</p>...",
      "bodyLength": 1234
    }
  }
}
```

---

### Message Blast

#### Send Message Blast

```http
POST /api/messages/blast
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "channels": ["email", "whatsapp"],
  "templateId": "invoicing_testing_v1_2",
  "from": "noreply@example.com",
  "globalVariables": {
    "companyName": "PT ABC",
    "period": "November 2025",
    "amount": "Rp 1.500.000"
  },
  "recipients": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "6281234567890",
      "variables": {
        "invoiceNumber": "INV-001"
      }
    },
    {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "6289876543210",
      "variables": {
        "invoiceNumber": "INV-002",
        "amount": "Rp 2.000.000"  // Override global
      }
    }
  ]
}

Response (Success):
{
  "success": true,
  "message": "Message blast queued successfully",
  "data": {
    "totalMessages": 4,
    "totalRecipients": 2,
    "channels": ["email", "whatsapp"],
    "template": {
      "id": "invoicing_testing_v1_2",
      "name": "Invoice Notification",
      "channels": ["email", "whatsapp"],
      "qiscusEnabled": true
    },
    "jobIds": ["1", "2", "3", "4"]
  },
  "timestamp": "11/05/2025, 14:30:45"
}

Response (Validation Error):
{
  "success": false,
  "statusCode": 422,
  "message": "Validation failed for 2 recipient(s). Please check all fields.",
  "data": null,
  "errors": [
    {
      "field": "recipients[0].name",
      "message": "Recipient name is required"
    },
    {
      "field": "recipients[1].variables.invoiceNumber",
      "message": "Missing required variable: 'invoiceNumber' (Nomor invoice). Add it to recipient variables or globalVariables.",
      "code": "MISSING_REQUIRED_VARIABLE"
    }
  ],
  "timestamp": "11/05/2025, 14:30:45"
}
```

#### Get Queue Stats

```http
GET /api/messages/stats
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "message": "Queue statistics retrieved successfully",
  "data": {
    "stats": {
      "waiting": 45,
      "active": 5,
      "completed": 1250,
      "failed": 23
    }
  }
}
```

---

### Logs

#### Get Message Logs

```http
GET /api/logs/messages
Authorization: Bearer <accessToken>

# Filters
GET /api/logs/messages?status=sent
GET /api/logs/messages?channel=email
GET /api/logs/messages?email=john@example.com
GET /api/logs/messages?limit=50&offset=0

Response:
{
  "success": true,
  "data": {
    "count": 2,
    "logs": [
      {
        "id": 1,
        "job_id": "1",
        "channel": "email",
        "recipient_email": "john@example.com",
        "recipient_name": "John Doe",
        "template_id": "invoicing_testing_v1_2",
        "template_name": "Invoice Notification",
        "subject": "Invoice INV-001 - November 2025",
        "status": "sent",
        "message_id": "msg_abc123",
        "attempts": 1,
        "created_at": "2025-11-05 14:30:00",
        "updated_at": "2025-11-05 14:30:05"
      }
    ]
  }
}
```

#### Get Message Stats

```http
GET /api/logs/messages/stats
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "data": {
    "stats": {
      "email": {
        "queued": 10,
        "processing": 2,
        "sent": 1200,
        "failed": 15
      },
      "whatsapp": {
        "queued": 5,
        "processing": 1,
        "sent": 850,
        "failed": 8
      },
      "total": {
        "queued": 15,
        "processing": 3,
        "sent": 2050,
        "failed": 23
      }
    }
  }
}
```

#### Get Message Stats by Date

```http
GET /api/logs/messages/stats/by-date?days=7
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "data": {
    "stats": [
      {
        "date": "2025-11-05",
        "channel": "email",
        "status": "sent",
        "count": 150
      },
      {
        "date": "2025-11-05",
        "channel": "whatsapp",
        "status": "sent",
        "count": 120
      }
    ]
  }
}
```

#### Get API Logs

```http
GET /api/logs/api?limit=100&offset=0
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "data": {
    "count": 50,
    "logs": [
      {
        "id": 1,
        "endpoint": "/api/messages/blast",
        "method": "POST",
        "ip_address": "192.168.1.1",
        "response_status": 200,
        "response_time_ms": 245,
        "created_at": "2025-11-05 14:30:00"
      }
    ]
  }
}
```

#### Get System Logs

```http
GET /api/logs/system?level=error&limit=100
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "data": {
    "count": 10,
    "logs": [
      {
        "id": 1,
        "level": "error",
        "message": "Failed to send email",
        "metadata": "{\"error\":\"Connection timeout\",\"recipient\":\"john@example.com\"}",
        "created_at": "2025-11-05 14:30:00"
      }
    ]
  }
}
```

#### Cleanup Old Logs

```http
POST /api/logs/cleanup
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "days": 30
}

Response:
{
  "success": true,
  "message": "Logs older than 30 days have been cleaned up"
}
```

---

### Dashboard

#### Get Dashboard Stats

```http
GET /api/dashboard
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "dashboard": {
    "messageStats": [
      { "channel": "email", "status": "sent", "count": 1200 },
      { "channel": "email", "status": "failed", "count": 15 },
      { "channel": "whatsapp", "status": "sent", "count": 850 }
    ],
    "messageStatsByDate": [
      {
        "date": "2025-11-05",
        "channel": "email",
        "status": "sent",
        "count": 150
      }
    ],
    "queueStats": {
      "waiting": 45,
      "active": 5,
      "completed": 2050,
      "failed": 23
    },
    "recentLogs": [...]
  }
}
```

---

### User Management

#### Get All Users

```http
GET /api/users
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "data": [
    {
      "id": "user_123",
      "email": "admin@example.com",
      "name": "Admin User",
      "roles": ["super_admin"],
      "is_active": true,
      "created_at": "2025-11-01 10:00:00",
      "last_login_at": "2025-11-05 14:30:00",
      "permissions": ["email:send", "whatsapp:send", ...]
    }
  ]
}
```

#### Update User

```http
PUT /api/users/:id
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "roles": ["admin_ppdb", "admin_announcement"]
}
```

#### Deactivate/Activate User

```http
POST /api/users/:id/deactivate
Authorization: Bearer <accessToken>

POST /api/users/:id/activate
Authorization: Bearer <accessToken>
```

#### Reset User Password

```http
POST /api/users/:id/reset-password
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "newPassword": "newpassword123"
}
```

---

### Permissions

#### Get All Permissions

```http
GET /api/permissions
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "count": 20,
  "permissions": [
    "email:send",
    "email:read",
    "whatsapp:send",
    ...
  ]
}
```

#### Get Role Permissions

```http
GET /api/permissions/roles/admin_ppdb
Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "role": "admin_ppdb",
  "count": 8,
  "permissions": [
    "email:send",
    "email:read",
    "whatsapp:send",
    "template:read"
  ]
}
```

#### Add Permission to Role

```http
POST /api/permissions/roles/admin_ppdb
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "permission": "logs:read"
}
```

#### Remove Permission from Role

```http
DELETE /api/permissions/roles/admin_ppdb/logs:read
Authorization: Bearer <accessToken>
```

#### Set All Role Permissions (Replace)

```http
PUT /api/permissions/roles/admin_ppdb
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "permissions": [
    "email:send",
    "email:read",
    "whatsapp:send",
    "template:read"
  ]
}
```

---

### Backup

All backup endpoints documented in [Backup System](#-backup-system) section above.

---

### Webhooks

#### Qiscus Webhook (No Auth)

```http
POST /webhooks/qiscus
Content-Type: application/json

{
  "type": "message_status",
  "payload": {
    "message_id": "msg_abc123",
    "status": "delivered",
    "from": "6281234567890",
    "timestamp": "2025-11-05T14:30:00Z"
  }
}
```

#### Test Webhook (No Auth)

```http
POST /webhooks/test
Content-Type: application/json

{
  "test": "data"
}
```

---

## ⚙️ Environment Configuration

### Required Variables

```bash
# Server
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000

# JWT
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# SMTP (Optional - will simulate if not configured)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Qiscus WhatsApp (Optional - will simulate if not configured)
QISCUS_BASE_URL=https://multichannel.qiscus.com
QISCUS_APP_ID=your-app-id
QISCUS_SECRET_KEY=your-secret-key
QISCUS_CHANNEL_ID=your-channel-id

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging
LOG_LEVEL=info
LOG_RETENTION_DAYS=30

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULED_TIME=02:00
BACKUP_COMPRESSED=true
MAX_BACKUPS=30

# Super Admin Limit
MAX_SUPER_ADMINS=3
```

### Optional Features

```bash
# Disable backup scheduler
BACKUP_ENABLED=false

# Use interval instead of scheduled time
BACKUP_INTERVAL_HOURS=24
# (Remove BACKUP_SCHEDULED_TIME to use interval)

# Adjust rate limits
RATE_LIMIT_MAX_REQUESTS=500

# Change log level
LOG_LEVEL=debug  # debug | info | warn | error
```

---

## 🚀 Getting Started

### 1. Installation

```bash
# Clone repository
git clone <repo-url>
cd email-blast-app

# Install dependencies
npm install
```

### 2. Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or use local Redis
redis-server
```

### 4. Initialize Database

```bash
# Create authentication tables
npm run create-tables

# Create first super admin user
npm run manual-user
# Follow the prompts to create user
```

### 5. Run Application

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 6. Test the API

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'

# Get templates
curl -X GET http://localhost:3000/api/templates \
  -H "Authorization: Bearer <your-access-token>"

# Send message blast
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-access-token>" \
  -d '{
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "from": "noreply@example.com",
    "globalVariables": {
      "companyName": "My Company"
    },
    "recipients": [
      {
        "name": "John Doe",
        "email": "john@example.com",
        "variables": {
          "date": "2025-11-05"
        }
      }
    ]
  }'
```

---

## 🐛 Troubleshooting

### Redis Connection Error

```
Error: Redis connection failed
```

**Solution**:

- Check Redis is running: `redis-cli ping`
- Verify `REDIS_HOST` and `REDIS_PORT` in `.env`
- Check firewall settings

### SMTP Authentication Failed

```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Solution**:

- Use App Password for Gmail (not regular password)
- Enable "Less secure apps" or use OAuth2
- Check `SMTP_USER` and `SMTP_PASS` in `.env`

### Webhook Not Receiving

```
Qiscus webhook not updating status
```

**Solution**:

- Check `APP_URL` is publicly accessible
- Use ngrok for local development: `ngrok http 3000`
- Update webhook URL in Qiscus: `npm run dev` (auto-registers)
- Check `/api/webhooks/debug` for webhook logs

### Permission Denied

```
403 Forbidden: Access denied. Insufficient permissions.
```

**Solution**:

- Check user roles: `GET /api/auth/me`
- Check role permissions: `GET /api/permissions/roles/<role>`
- Add required permission: `POST /api/permissions/roles/<role>`

### Queue Not Processing

```
Messages stuck in "queued" status
```

**Solution**:

- Check worker is running (should auto-start with app)
- Check Redis connection
- Check queue stats: `GET /api/messages/stats`
- Restart application

---

## 📈 Performance Tips

### 1. Rate Limit Tuning

Adjust based on your SMTP/Qiscus limits:

```bash
RATE_LIMIT_MAX_REQUESTS=500  # Lower for strict limits
```

### 2. Worker Concurrency

Edit `src/workers/message.worker.ts`:

```typescript
{
  concurrency: 10,  // Increase for more parallel processing
  limiter: {
    max: 20,        // Increase max jobs per second
    duration: 1000
  }
}
```

### 3. Database Optimization

```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_message_created_at ON message_logs(created_at);
CREATE INDEX idx_message_status ON message_logs(status);
```

### 4. Cleanup Schedule

Regular log cleanup to keep database small:

```bash
LOG_RETENTION_DAYS=7  # Keep only 7 days of logs
```

---

## 🔒 Security Best Practices

### 1. Environment Variables

```bash
# Use strong JWT secret (32+ characters)
JWT_SECRET=$(openssl rand -base64 32)

# Use app-specific passwords
SMTP_PASS=xxxx-xxxx-xxxx-xxxx  # Gmail App Password
```

### 2. HTTPS Required

```bash
# Always use HTTPS in production
APP_URL=https://yourdomain.com

# Configure reverse proxy (nginx/caddy)
```

### 3. Rate Limiting

```bash
# Adjust based on your needs
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Regular Backups

```bash
BACKUP_ENABLED=true
BACKUP_SCHEDULED_TIME=02:00
MAX_BACKUPS=30
```

### 5. Log Monitoring

Monitor `system_logs` for:

- Failed login attempts
- Permission denied errors
- Rate limit hits
- SMTP/Qiscus failures

---

## 🚀 Quick Start Guide (VPS Deployment)

### Prerequisites

```bash
# Required software
- Node.js 18+ (LTS recommended)
- Docker & Docker Compose
- Git
- PM2 (optional, for production)
```

### Step 1: Initial VPS Setup

```bash
# 1. Clone repository
git clone <your-repo-url>
cd email-blast-app

# 2. Install dependencies
npm install

# 3. Start Docker services
docker-compose up -d

# Verify Redis is running
docker ps
docker exec <redis-container-name> redis-cli ping
# Should return: PONG
```

### Step 2: Environment Configuration

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit configuration
nano .env
```

**Required Environment Variables:**

```bash
# Server
PORT=3000
NODE_ENV=production
APP_URL=https://yourdomain.com  # IMPORTANT: Must be publicly accessible

# JWT
JWT_SECRET=$(openssl rand -base64 32)  # Generate strong secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# SMTP (Optional - Configure for email sending)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Qiscus WhatsApp (Optional - Configure for WhatsApp)
QISCUS_BASE_URL=https://multichannel.qiscus.com
QISCUS_APP_ID=your-app-id
QISCUS_SECRET_KEY=your-secret-key
QISCUS_CHANNEL_ID=your-channel-id

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULED_TIME=02:00
BACKUP_COMPRESSED=true
MAX_BACKUPS=30

# Super Admin Limit
MAX_SUPER_ADMINS=3
```

### Step 3: Database Setup

```bash
# 1. Create auth tables (users, refresh_tokens)
npm run create-tables

# 2. Create role permissions table
npm run create-role-permissions

# 3. Verify database
npm run check-db
```

**Output should show:**

```
✅ Users table exists
✅ Refresh tokens table exists
✅ role_permissions table exists
```

### Step 4: Create First User

```bash
# Interactive user creation
npm run setup-auth
```

**Follow the prompts:**

```
Email: admin@yourdomain.com
Full Name: Super Admin
Password: [minimum 8 characters]
Select roles: 1 (super_admin)
```

**Result:**

```
✅ User created successfully!
User Details:
   Email: admin@yourdomain.com
   Name: Super Admin
   Roles: super_admin
   ID: user_1699123456_abc123
   Active: true
```

### Step 5: Build & Start Application

```bash
# 1. Build TypeScript
npm run build

# 2. Start application (Production)
npm start

# OR with PM2 (Recommended)
pm2 start npm --name "email-blast-app" -- start
pm2 save
pm2 startup
```

### Step 6: Verify Deployment

```bash
# 1. Check health
curl http://localhost:3000/health

# Should return:
{
  "success": true,
  "message": "Health check successful"
}

# 2. Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "YOUR_PASSWORD"
  }'

# Should return:
{
  "success": true,
  "message": "Login successful",
  "user": { ... },
  "accessToken": "eyJhbGci...",
  "refreshToken": "a1b2c3..."
}
```

### Step 7: Configure Reverse Proxy (Nginx)

**Create Nginx config:**

```bash
sudo nano /etc/nginx/sites-available/email-blast-app
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Important for webhooks
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/email-blast-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL with Let's Encrypt
sudo certbot --nginx -d yourdomain.com
```

### Step 8: Setup Automatic Backup

```bash
# Setup daily backup at 2 AM
bash scripts/backup/setup-backup-cron.sh

# Follow prompts to configure:
# - Backup time (default: 2:00 AM)
# - Compression (recommended: yes)
# - Email notifications (optional)
```

### Step 9: Test Complete System

```bash
# Run comprehensive test
bash scripts/testing/test-api.sh

# Monitor system health
bash scripts/monitoring/health-check.sh

# Monitor in real-time
bash scripts/monitoring/monitor-realtime.sh
```

---

## 📁 Essential Scripts Reference

### ✅ **REQUIRED Scripts** (Keep These)

#### **Authentication & Setup**

```bash
npm run create-tables              # Create auth tables
npm run create-role-permissions    # Setup permissions
npm run setup-auth                 # Create first user
npm run check-db                   # Verify database
```

#### **Permission Management**

```bash
npm run manage-permissions         # Interactive permission manager
npm run test-permissions           # Test permission system
```

#### **Backup & Restore**

```bash
npm run backup                     # Manual backup
bash scripts/backup/backup-database.sh          # Automatic backup
bash scripts/backup/restore-backup.sh           # Restore from backup
bash scripts/backup/setup-backup-cron.sh        # Setup auto backup
bash scripts/backup/backup-monitor.sh           # Monitor backups
```

#### **Monitoring**

```bash
bash scripts/monitoring/health-check.sh         # System health
bash scripts/monitoring/monitor-realtime.sh     # Real-time monitor
bash scripts/monitoring/monitor-webhooks.sh     # Webhook monitor
```

#### **Testing**

```bash
bash scripts/testing/test-api.sh                # Complete API test
bash scripts/testing/test-webhook.sh            # Webhook test
bash scripts/testing/test-queue-health.sh       # Queue health test
```

---

### ⚠️ **OPTIONAL Scripts** (Development Only)

These scripts are useful for debugging but not needed in production:

```bash
# Debugging tools
npm run debug-auth                 # Debug auth issues
npm run manual-user                # Manual user creation
npm run test-auth-service          # Test auth service
npm run verify-user                # Verify user credentials

# Setup utilities
bash scripts/setup/setup-timezone.sh            # Configure timezone
```

---

### ❌ **DEPRECATED Scripts** (Can Remove)

These scripts are outdated or replaced by better alternatives:

```bash
# Old backup scripts (replaced by new system)
scripts/manual-backup.ts           # Use: npm run backup

# Old testing (replaced by comprehensive test suite)
scripts/test-super-admin-limit.ts  # Integrated in auth system
```

---

## 🔧 Production Deployment Checklist

### Security

- [ ] Set strong `JWT_SECRET` (32+ characters)
- [ ] Configure HTTPS with SSL certificate
- [ ] Set `NODE_ENV=production`
- [ ] Configure firewall (UFW/iptables)
- [ ] Limit SSH access
- [ ] Setup fail2ban for SSH protection
- [ ] Use environment-specific credentials
- [ ] Never commit `.env` to git

### Application

- [ ] Docker containers running (Redis)
- [ ] Database initialized with tables
- [ ] First super admin user created
- [ ] Role permissions configured
- [ ] SMTP configured (if using email)
- [ ] Qiscus configured (if using WhatsApp)
- [ ] Webhook URL publicly accessible
- [ ] Application running (PM2 or systemd)
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed

### Backup & Monitoring

- [ ] Automatic daily backup enabled
- [ ] Backup retention configured (30 days)
- [ ] Backup compression enabled
- [ ] Log cleanup scheduled
- [ ] Health check monitoring
- [ ] Error alerting configured
- [ ] Disk space monitoring

### Testing

- [ ] Health endpoint accessible
- [ ] Login working
- [ ] Template rendering working
- [ ] Email sending working (if configured)
- [ ] WhatsApp sending working (if configured)
- [ ] Webhook receiving working
- [ ] Queue processing working
- [ ] Logs being recorded

---

## 🔄 Maintenance Tasks

### Daily

```bash
# Check system health
bash scripts/monitoring/health-check.sh

# Monitor queue
curl http://localhost:3000/api/messages/stats | jq
```

### Weekly

```bash
# Review backup status
bash scripts/backup/backup-monitor.sh

# Check error logs
curl "http://localhost:3000/api/logs/system?level=error&limit=50" | jq

# Review success rate
curl http://localhost:3000/api/logs/messages/stats | jq
```

### Monthly

```bash
# Cleanup old logs
curl -X POST http://localhost:3000/api/logs/cleanup \
  -H "Content-Type: application/json" \
  -d '{"days": 30}'

# Review disk space
df -h

# Update dependencies
npm outdated
npm update
```

---

## 📋 Recommended Script Organization

**Keep these directories:**

```
scripts/
├── backup/                 # ✅ Backup & restore
│   ├── backup-database.sh
│   ├── restore-backup.sh
│   ├── setup-backup-cron.sh
│   └── backup-monitor.sh
│
├── monitoring/             # ✅ System monitoring
│   ├── health-check.sh
│   ├── monitor-realtime.sh
│   └── monitor-webhooks.sh
│
├── testing/                # ✅ Testing suite
│   ├── test-api.sh
│   ├── test-webhook.sh
│   └── test-queue-health.sh
│
└── setup/                  # ⚠️ Setup utilities (optional)
    └── setup-timezone.sh
```

**Can remove these:**

```
scripts/
├── check-database.ts       # ❌ Use: npm run check-db
├── manual-create-user.ts   # ❌ Use: npm run setup-auth
├── verify-user.ts          # ❌ Debug tool only
├── debug-auth.ts           # ❌ Debug tool only
└── test-auth-service.ts    # ❌ Debug tool only
```

---

## 🆘 Troubleshooting Common Issues

### Issue 1: Server Won't Start

```bash
# Check if port is already in use
lsof -i :3000

# Check logs
tail -f logs/combined.log

# Restart services
pm2 restart email-blast-app
docker-compose restart
```

### Issue 2: Can't Login

```bash
# Verify user exists
npm run check-db

# Test auth service
npm run test-auth-service

# Check permissions
npm run manage-permissions
```

### Issue 3: Queue Not Processing

```bash
# Check Redis
docker exec <redis-container> redis-cli ping

# Check queue stats
curl http://localhost:3000/api/messages/stats | jq

# Test queue health
bash scripts/testing/test-queue-health.sh
```

### Issue 4: Webhook Not Working

```bash
# Check webhook status
curl http://localhost:3000/api/qiscus/webhook/status | jq

# Test webhook endpoint
bash scripts/testing/test-webhook.sh

# Monitor webhook logs
bash scripts/monitoring/monitor-webhooks.sh
```

### Issue 5: Database Locked

```bash
# Check WAL mode
sqlite3 data/logs.db "PRAGMA journal_mode;"

# Should return: WAL

# If not, enable WAL
sqlite3 data/logs.db "PRAGMA journal_mode=WAL;"
```

---

## 📞 Quick Reference Commands

```bash
# Start application
npm start                           # Production
npm run dev                         # Development
pm2 start npm --name app -- start  # PM2

# Check status
curl http://localhost:3000/health
pm2 status
docker ps

# View logs
tail -f logs/combined.log
pm2 logs email-blast-app
docker logs <container-name>

# Database
sqlite3 data/logs.db
npm run check-db

# Backup
npm run backup
bash scripts/backup/backup-monitor.sh

# Monitoring
bash scripts/monitoring/health-check.sh
bash scripts/monitoring/monitor-realtime.sh

# Testing
bash scripts/testing/test-api.sh
bash scripts/testing/test-queue-health.sh
```

---

- **API Response Format**: All responses follow standardized format (see `src/types/api-response.types.ts`)
- **Permission Management**: Dynamic RBAC stored in database
- **Template Variables**: Support for global and per-recipient variables
- **Webhook Integration**: Automatic status updates from Qiscus
- **Backup System**: Automatic daily backups with retention policy

---

## 📞 Support

For issues or questions:

1. Check logs: `GET /api/logs/system?level=error`
2. Check queue: `GET /api/messages/stats`
3. Check webhook: `GET /api/webhooks/debug`
4. Review this documentation

---

**Last Updated**: November 5, 2025
**Version**: 1.0.0
