# Technical Architecture - Queueing & Logging System

## 📋 Table of Contents

- [System Overview](#system-overview)
- [Queueing Architecture](#queueing-architecture)
- [Logging Architecture](#logging-architecture)
- [Data Flow](#data-flow)
- [Database Schema](#database-schema)
- [Performance Considerations](#performance-considerations)
- [Monitoring & Alerting](#monitoring--alerting)

---

## 🎯 System Overview

Aplikasi ini menggunakan **BullMQ** (Redis-backed queue) untuk reliable message processing dan **multi-level logging** untuk observability.

### Core Technologies

- **BullMQ** - Robust job queue with retry logic
- **Redis** - In-memory data store for queue
- **SQLite** - Persistent storage for logs
- **Winston** - Logging framework
- **Express** - Web framework

---

## 🔄 Queueing Architecture

### 1. Queue Structure

```typescript
// Queue Configuration
{
  name: "message-queue",
  connection: {
    host: "localhost",
    port: 6379
  },
  defaultJobOptions: {
    attempts: 3,              // Retry up to 3 times
    backoff: {
      type: 'exponential',    // 2s, 4s, 8s
      delay: 2000
    },
    removeOnComplete: {
      count: 100              // Keep last 100 completed
    },
    removeOnFail: {
      count: 50               // Keep last 50 failed
    }
  }
}
```

### 2. Job Lifecycle

```
┌─────────────────────────────────────────────────────┐
│                   JOB LIFECYCLE                     │
└─────────────────────────────────────────────────────┘

1. CREATED
   │
   ├─→ Controller receives request
   │   └─→ Validates input
   │       └─→ Gets template
   │           └─→ Renders variables
   │
2. QUEUED
   │
   ├─→ Job added to BullMQ queue
   │   └─→ Database log: status = 'queued'
   │
3. WAITING
   │
   ├─→ Job waits in Redis queue
   │   └─→ Priority: 1 (default)
   │
4. ACTIVE
   │
   ├─→ Worker picks job
   │   └─→ Database update: status = 'processing'
   │       └─→ Increment attempts counter
   │
5. PROCESSING
   │
   ├─→ Send via SMTP (email) or Qiscus (WhatsApp)
   │
   ├─→ SUCCESS?
   │   │
   │   ├─→ YES
   │   │   └─→ Database update: status = 'sent'
   │   │       └─→ Store message_id
   │   │           └─→ Job completed ✓
   │   │
   │   └─→ NO
   │       └─→ Error occurred
   │           │
   │           ├─→ attempts < 3?
   │           │   │
   │           │   ├─→ YES: RETRY
   │           │   │   └─→ Wait (exponential backoff)
   │           │   │       └─→ Back to ACTIVE
   │           │   │
   │           │   └─→ NO: FAILED
   │           │       └─→ Database update: status = 'failed'
   │           │           └─→ Store error_message
   │           │               └─→ Job marked as failed ✗
```

### 3. Worker Configuration

```typescript
// Message Worker
export const messageWorker = new Worker<MessageJobData>(
  "message-queue",
  async (job: Job<MessageJobData>) => {
    // 1. Update status to 'processing'
    DatabaseService.updateMessageStatus(
      job.id!,
      "processing",
      undefined,
      undefined,
      job.attemptsMade + 1
    );

    // 2. Process based on channel
    if (isEmailJobData(job.data)) {
      // Send email via SMTP
      const result = await smtpService.sendEmail({...});

      if (result.success) {
        // 3a. Success: Update to 'sent'
        DatabaseService.updateMessageStatus(
          job.id!,
          "sent",
          undefined,
          result.messageId,
          job.attemptsMade + 1
        );
      } else {
        // 3b. Failure: Throw error for retry
        throw new Error(result.error);
      }
    }
  },
  {
    connection: redisConfig,
    concurrency: 5,           // Process 5 jobs simultaneously
    limiter: {
      max: 10,                // Max 10 jobs
      duration: 1000          // per second
    }
  }
);
```

### 4. Job Data Structure

```typescript
// Email Job
interface EmailJobData {
  recipient: {
    email: string;
    name: string;
  };
  subject: string;
  body: string;
  from: string;
  channel: "email";
}

// WhatsApp Job
interface WhatsAppJobData {
  recipient: {
    phone: string;
    name: string;
  };
  message: string;
  channel: "whatsapp";
  qiscusComponents?: Array<...>;     // Qiscus template components
  qiscusTemplateName?: string;
  qiscusNamespace?: string;
}
```

### 5. Redis Data Structure

```
Keys in Redis:
- bull:message-queue:wait           (LIST)    - Waiting jobs
- bull:message-queue:active         (LIST)    - Active jobs
- bull:message-queue:completed      (ZSET)    - Completed jobs (sorted by timestamp)
- bull:message-queue:failed         (ZSET)    - Failed jobs (sorted by timestamp)
- bull:message-queue:id             (STRING)  - Job ID counter
- bull:message-queue:{jobId}        (HASH)    - Individual job data
```

---

## 📊 Logging Architecture

### 1. Three-Level Logging System

```
┌─────────────────────────────────────────────────────┐
│              LOGGING ARCHITECTURE                    │
└─────────────────────────────────────────────────────┘

Request
  │
  ├─→ Level 1: API Middleware Logger
  │   │
  │   ├─→ Captures: endpoint, method, IP, body
  │   ├─→ Measures: response time
  │   └─→ Stores in: api_logs table
  │
  ├─→ Level 2: Winston Logger
  │   │
  │   ├─→ File Transport
  │   │   ├─→ logs/error.log     (errors only)
  │   │   └─→ logs/combined.log  (all levels)
  │   │
  │   └─→ Console Transport (development only)
  │       └─→ Colored, human-readable
  │
  └─→ Level 3: Database Logger
      │
      ├─→ Message Logs (message_logs table)
      │   ├─→ Created: When job queued
      │   ├─→ Updated: When processing
      │   └─→ Updated: When sent/failed
      │
      └─→ System Logs (system_logs table)
          └─→ Important system events
```

### 2. Winston Configuration

```typescript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: {
    service: "email-blast-service",
  },
  transports: [
    // Error logs only
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
    // All logs
    new winston.transports.File({
      filename: "logs/combined.log",
    }),
  ],
});

// Development: Add console transport
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}
```

### 3. Log Levels

```typescript
logger.error(); // Errors that need attention
logger.warn(); // Warnings, potential issues
logger.info(); // Important information
logger.debug(); // Debugging information
```

### 4. API Request Logging

```typescript
// Middleware: apiLogger
export const apiLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const responseTime = Date.now() - startTime;

    DatabaseService.logAPI({
      endpoint: req.path,
      method: req.method,
      ip_address: req.ip,
      request_body: JSON.stringify(req.body),
      response_status: res.statusCode,
      response_time_ms: responseTime,
    });
  });

  next();
};
```

### 5. Message Logging Flow

```typescript
// Step 1: Initial log (Controller)
DatabaseService.logMessage({
  job_id: jobId,
  channel: "email",
  recipient_email: "user@example.com",
  recipient_name: "User Name",
  template_id: "template-001",
  template_name: "Welcome Email",
  subject: "Welcome!",
  status: "queued", // Initial status
  attempts: 1,
});

// Step 2: Update when processing (Worker)
DatabaseService.updateMessageStatus(
  jobId,
  "processing", // Update status
  undefined,
  undefined,
  job.attemptsMade + 1 // Increment attempts
);

// Step 3a: Update when sent (Worker)
DatabaseService.updateMessageStatus(
  jobId,
  "sent", // Final status: success
  undefined,
  messageId, // Store message ID
  job.attemptsMade + 1
);

// Step 3b: Update when failed (Worker)
DatabaseService.updateMessageStatus(
  jobId,
  "failed", // Final status: failed
  errorMessage, // Store error
  undefined,
  job.attemptsMade + 1
);
```

---

## 🔄 Data Flow

### Complete Request Flow

```
┌────────────────────────────────────────────────────────┐
│                  COMPLETE DATA FLOW                     │
└────────────────────────────────────────────────────────┘

1. CLIENT REQUEST
   │
   ├─→ POST /api/messages/blast
   │   Body: { recipients, channels, templateId, ... }
   │
2. API MIDDLEWARE
   │
   ├─→ Rate Limiter: Check request count
   ├─→ API Logger: Log request details
   └─→ Body Parser: Parse JSON
   │
3. CONTROLLER (message.controller.ts)
   │
   ├─→ Validate Input
   │   ├─→ Check recipients array
   │   ├─→ Check channels
   │   └─→ Check templateId
   │
   ├─→ Get Template
   │   └─→ TemplateService.getTemplateById()
   │
   ├─→ Validate Channel Compatibility
   │
   ├─→ Process Recipients
   │   │
   │   └─→ For each recipient:
   │       ├─→ Merge variables (global + recipient + info)
   │       ├─→ Render template
   │       └─→ Create job data
   │
   ├─→ Add to Queue
   │   └─→ addBulkMessagesToQueue(jobs)
   │       └─→ Returns jobIds
   │
   └─→ Log to Database
       └─→ For each job:
           └─→ DatabaseService.logMessage({ status: 'queued' })
   │
4. BULLMQ QUEUE
   │
   ├─→ Store jobs in Redis
   ├─→ Jobs wait in queue
   └─→ Worker picks job
   │
5. WORKER (message.worker.ts)
   │
   ├─→ Update Database: status = 'processing'
   │
   ├─→ Determine Channel
   │   │
   │   ├─→ EMAIL?
   │   │   └─→ smtpService.sendEmail()
   │   │       ├─→ SUCCESS: Update status = 'sent'
   │   │       └─→ FAIL: Throw error → Retry
   │   │
   │   └─→ WHATSAPP?
   │       └─→ qiscusService.sendTemplateMessage()
   │           ├─→ SUCCESS: Update status = 'sent'
   │           └─→ FAIL: Throw error → Retry
   │
6. EXTERNAL SERVICES
   │
   ├─→ SMTP Server (Email)
   │   └─→ Returns: { messageId, accepted, rejected }
   │
   └─→ Qiscus API (WhatsApp)
       └─→ Returns: { id, status }
   │
7. LOGGING & RESPONSE
   │
   ├─→ Winston Logger
   │   ├─→ logs/combined.log
   │   └─→ logs/error.log
   │
   ├─→ Database Logger
   │   ├─→ message_logs (final status)
   │   ├─→ api_logs (request/response)
   │   └─→ system_logs (important events)
   │
   └─→ Response to Client
       └─→ { success, totalMessages, jobIds }
```

---

## 💾 Database Schema

### 1. message_logs

```sql
CREATE TABLE message_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,              -- BullMQ job ID
  channel TEXT NOT NULL,              -- 'email' or 'whatsapp'
  recipient_email TEXT,               -- For email channel
  recipient_phone TEXT,               -- For WhatsApp channel
  recipient_name TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_name TEXT,
  subject TEXT,                       -- For email only
  status TEXT NOT NULL,               -- 'queued', 'processing', 'sent', 'failed'
  error_message TEXT,                 -- If failed
  message_id TEXT,                    -- Provider message ID
  attempts INTEGER DEFAULT 1,         -- Retry counter
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast queries
CREATE INDEX idx_job_id ON message_logs(job_id);
CREATE INDEX idx_status ON message_logs(status);
CREATE INDEX idx_channel ON message_logs(channel);
CREATE INDEX idx_recipient_email ON message_logs(recipient_email);
CREATE INDEX idx_created_at ON message_logs(created_at);
```

### 2. api_logs

```sql
CREATE TABLE api_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,             -- e.g., '/api/messages/blast'
  method TEXT NOT NULL,               -- GET, POST, PUT, DELETE
  ip_address TEXT,                    -- Client IP
  request_body TEXT,                  -- JSON string
  response_status INTEGER,            -- HTTP status code
  response_time_ms INTEGER,           -- Response time in ms
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_endpoint ON api_logs(endpoint);
CREATE INDEX idx_api_created_at ON api_logs(created_at);
```

### 3. system_logs

```sql
CREATE TABLE system_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,                -- 'error', 'warn', 'info', 'debug'
  message TEXT NOT NULL,
  metadata TEXT,                      -- JSON string with additional info
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_level ON system_logs(level);
CREATE INDEX idx_system_created_at ON system_logs(created_at);
```

---

## ⚡ Performance Considerations

### 1. Queue Performance

**Concurrency Settings:**

```typescript
{
  concurrency: 5,           // 5 workers process jobs simultaneously
  limiter: {
    max: 10,                // Max 10 jobs
    duration: 1000          // per second (rate limiting)
  }
}
```

**Throughput:**

- With 5 concurrent workers
- Each job takes ~500ms average
- Theoretical max: **10 jobs/second** (limited by rate limiter)
- Real-world: **~8-9 jobs/second** (accounting for overhead)

### 2. Redis Performance

**Memory Usage:**

```
- Per job: ~2-5 KB (depending on body size)
- 100 jobs in queue: ~500 KB
- 1000 jobs in queue: ~5 MB
```

**Connection Pooling:**

```typescript
{
  maxRetriesPerRequest: null,  // Don't retry failed commands
  enableReadyCheck: true,
  enableOfflineQueue: true
}
```

### 3. Database Performance

**WAL Mode:**

```sql
PRAGMA journal_mode = WAL;
```

- Better concurrent read/write performance
- Allows readers while writing

**Batch Inserts:**

- Use transactions for bulk operations
- Insert multiple logs in single transaction

**Index Strategy:**

- Index frequently queried columns
- Monitor query performance
- Use EXPLAIN QUERY PLAN

### 4. Logging Performance

**File Rotation:**

```bash
# Use logrotate for production
/var/log/email-blast/*.log {
  daily
  rotate 30
  compress
  delaycompress
  notifempty
  create 0640 appuser appgroup
}
```

**Database Cleanup:**

```typescript
// Automated cleanup job
setInterval(() => {
  DatabaseService.cleanupOldLogs(30); // Delete logs > 30 days
}, 24 * 60 * 60 * 1000); // Daily
```

---

## 📈 Monitoring & Alerting

### 1. Key Metrics to Monitor

**Queue Metrics:**

- Waiting count: `messageQueue.getWaitingCount()`
- Active count: `messageQueue.getActiveCount()`
- Completed count: `messageQueue.getCompletedCount()`
- Failed count: `messageQueue.getFailedCount()`

**Performance Metrics:**

- Average response time (from api_logs)
- Success rate by channel
- Error rate
- Queue processing time

**System Metrics:**

- Redis memory usage
- Database size
- Log file size
- CPU/Memory usage

### 2. Alert Conditions

**High Priority:**

- Error rate > 10%
- Queue waiting > 1000 jobs
- Redis connection failed
- Database write failed

**Medium Priority:**

- Failed jobs > 50
- Average response time > 5s
- Queue active count = 0 (worker down)

**Low Priority:**

- Logs size > 1GB
- Queue completed > 10000

### 3. Monitoring Endpoints

```bash
# Queue stats
GET /api/messages/stats

# Dashboard (comprehensive)
GET /api/dashboard

# Message logs
GET /api/logs/messages?status=failed

# System logs
GET /api/logs/system?level=error
```

### 4. Monitoring Script

```bash
#!/bin/bash
# scripts/monitor-queue.sh

while true; do
  clear
  echo "Queue Monitor - $(date)"

  # Queue stats
  curl -s http://localhost:3000/api/messages/stats | jq '.stats'

  # Recent errors
  curl -s 'http://localhost:3000/api/logs/messages?status=failed&limit=5' \
    | jq '.logs[] | {recipient, error_message, created_at}'

  sleep 5
done
```

### 5. Health Check

```bash
# Simple health check
curl http://localhost:3000/health

# Detailed status
curl http://localhost:3000/api/smtp/status
curl http://localhost:3000/api/messages/stats
curl http://localhost:3000/api/logs/messages/stats
```

---

## 🔧 Troubleshooting Guide

### Jobs Stuck in Queue

**Symptoms:**

- Waiting count increasing
- Active count = 0

**Solutions:**

1. Check worker is running
2. Check Redis connection
3. Restart worker

```bash
# Check Redis
docker exec -it email-blast-redis redis-cli ping

# View queue in Redis
docker exec -it email-blast-redis redis-cli
> LLEN bull:message-queue:wait
> LLEN bull:message-queue:active
```

### High Failure Rate

**Symptoms:**

- Failed count increasing rapidly
- Error logs growing

**Solutions:**

1. Check SMTP/Qiscus credentials
2. Check network connectivity
3. Review error messages

```bash
# View failed jobs
curl 'http://localhost:3000/api/logs/messages?status=failed&limit=20'

# Check error patterns
sqlite3 data/logs.db \
  "SELECT error_message, COUNT(*) as count
   FROM message_logs
   WHERE status='failed'
   GROUP BY error_message
   ORDER BY count DESC;"
```

### Slow Processing

**Symptoms:**

- High response times
- Queue backing up

**Solutions:**

1. Increase worker concurrency
2. Check external service latency
3. Optimize database queries

```bash
# Check response times
sqlite3 data/logs.db \
  "SELECT AVG(response_time_ms), MAX(response_time_ms)
   FROM api_logs
   WHERE endpoint='/api/messages/blast';"
```

---

## 📝 Summary

### Queue System

- ✅ Reliable job processing with BullMQ
- ✅ Automatic retry with exponential backoff
- ✅ Concurrent processing (5 workers)
- ✅ Rate limiting (10 jobs/second)

### Logging System

- ✅ Three-level logging (File, Database, Console)
- ✅ Comprehensive tracking (API, Messages, System)
- ✅ Automatic cleanup (retention policy)
- ✅ Fast queries with indexes

### Performance

- ✅ ~8-9 jobs/second throughput
- ✅ Efficient Redis usage
- ✅ Optimized database with WAL mode
- ✅ Monitoring & alerting ready

---

**Last Updated:** November 1, 2025  
**Version:** 1.0.0
