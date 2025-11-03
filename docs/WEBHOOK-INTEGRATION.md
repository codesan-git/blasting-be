# Qiscus Webhook Integration Guide

## 📋 Overview

Webhook memungkinkan aplikasi menerima **real-time updates** dari Qiscus tentang status pengiriman WhatsApp message (sent, delivered, read, failed).

### Tanpa Webhook

```
Send WhatsApp → Qiscus API → ❓ Status tidak diketahui
```

### Dengan Webhook

```
Send WhatsApp → Qiscus API → ✅ Qiscus kirim update → Database update status
```

---

## 🏗️ Arsitektur Webhook

```
┌────────────────────────────────────────────────────┐
│              WEBHOOK FLOW                          │
└────────────────────────────────────────────────────┘

1. APP STARTUP
   │
   ├─→ Server starts on http://your-domain.com:3000
   ├─→ Register webhook: POST /webhooks/qiscus
   └─→ Qiscus saves webhook URL

2. SEND MESSAGE
   │
   ├─→ POST /api/messages/blast
   ├─→ Queue job
   ├─→ Worker sends to Qiscus API
   ├─→ Database: status = 'processing'
   └─→ Qiscus returns message_id

3. QISCUS SENDS WEBHOOK (Asynchronous)
   │
   ├─→ Message sent to WhatsApp server
   │   └─→ POST http://your-domain.com/webhooks/qiscus
   │       Body: { type: "message_status", payload: { message_id, status: "sent" }}
   │
   ├─→ Message delivered to recipient
   │   └─→ POST http://your-domain.com/webhooks/qiscus
   │       Body: { type: "message_status", payload: { message_id, status: "delivered" }}
   │
   └─→ Message read by recipient
       └─→ POST http://your-domain.com/webhooks/qiscus
           Body: { type: "message_status", payload: { message_id, status: "read" }}

4. APP PROCESSES WEBHOOK
   │
   ├─→ Receive webhook payload
   ├─→ Validate message_id
   ├─→ Update database status
   └─→ Log to system_logs
```

---

## 🚀 Setup

### 1. Environment Variables

Tambahkan di `.env`:

```env
# Your public URL (must be accessible from internet)
APP_URL=https://your-domain.com

# Or use ngrok for development
APP_URL=https://abc123.ngrok.io

# Qiscus credentials
QISCUS_BASE_URL=https://multichannel.qiscus.com
QISCUS_APP_ID=your-app-id
QISCUS_SECRET_KEY=your-secret-key
QISCUS_CHANNEL_ID=your-channel-id
```

### 2. Expose Localhost (Development)

Jika develop di localhost, gunakan **ngrok** untuk expose:

```bash
# Install ngrok
npm install -g ngrok

# Start your app
npm run dev

# In another terminal, expose port 3000
ngrok http 3000

# Copy the HTTPS URL
# Example: https://abc123.ngrok.io

# Update .env
APP_URL=https://abc123.ngrok.io
```

### 3. Start Application

```bash
npm run dev

# Server will automatically register webhook on startup
# Check logs:
# ✓ Server running on port 3000
# ✓ Registering Qiscus webhook
# ✓ Qiscus webhook registered successfully
# ✓ Webhook URL: https://your-domain.com/webhooks/qiscus
```

---

## 📡 Webhook Endpoints

### 1. Receive Qiscus Webhook

**POST** `/webhooks/qiscus`

Endpoint ini menerima webhook dari Qiscus.

**Important:** Endpoint ini **TIDAK** menggunakan rate limiting.

**Webhook Payload Examples:**

#### Message Status Update

```json
{
  "type": "message_status",
  "payload": {
    "from": "6281234567890",
    "id": "wamid.abc123xyz",
    "message_id": "wamid.abc123xyz",
    "status": "sent",
    "timestamp": "2025-11-01T10:00:00Z",
    "recipient_id": "6281234567890"
  }
}
```

**Status Values:**

- `sent` - Message sent to WhatsApp server
- `delivered` - Message delivered to recipient's device
- `read` - Message read by recipient
- `failed` - Message failed to deliver

#### Incoming Message (Customer Reply)

```json
{
  "type": "incoming_message",
  "payload": {
    "from": "6281234567890",
    "id": "wamid.abc123xyz",
    "timestamp": "2025-11-01T10:05:00Z",
    "type": "text",
    "message": {
      "text": "Customer reply message",
      "type": "text"
    }
  }
}
```

**Response:**

Always returns `200 OK` to acknowledge receipt:

```json
{
  "success": true,
  "message": "Webhook received"
}
```

### 2. Test Webhook

**POST** `/webhooks/test`

Endpoint untuk testing webhook configuration.

**Request:**

```json
{
  "type": "message_status",
  "payload": {
    "message_id": "test-123",
    "status": "sent"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Webhook test successful",
  "received": {
    "type": "message_status",
    "payload": {...}
  }
}
```

### 3. Check Webhook Status

**GET** `/api/qiscus/webhook/status`

Get current webhook configuration.

**Response:**

```json
{
  "success": true,
  "webhook": {
    "configured": true,
    "baseUrl": "https://multichannel.qiscus.com",
    "appId": "your-app-id",
    "currentConfig": {
      "url": "https://your-domain.com/webhooks/qiscus",
      "created_at": "2025-11-01T10:00:00Z"
    }
  }
}
```

---

## 🔄 Database Updates

### Status Flow

```sql
-- 1. Initial (Controller)
INSERT INTO message_logs (
  job_id = '123',
  message_id = NULL,
  status = 'queued'
)

-- 2. Processing (Worker)
UPDATE message_logs
SET status = 'processing',
    message_id = 'wamid.abc123xyz'
WHERE job_id = '123'

-- 3. Webhook: Sent
UPDATE message_logs
SET status = 'sent'
WHERE message_id = 'wamid.abc123xyz'

-- 4. Webhook: Delivered (optional)
-- Just log, status stays 'sent'

-- 5. Webhook: Read (optional)
-- Just log, status stays 'sent'

-- OR: Webhook: Failed
UPDATE message_logs
SET status = 'failed',
    error_message = 'Delivery failed'
WHERE message_id = 'wamid.abc123xyz'
```

### Query Messages by Status

```bash
# Get all sent messages
curl 'http://localhost:3000/api/logs/messages?status=sent'

# Get failed messages
curl 'http://localhost:3000/api/logs/messages?status=failed'

# Get specific message by message_id
sqlite3 data/logs.db "SELECT * FROM message_logs WHERE message_id = 'wamid.abc123xyz'"
```

---

## 🧪 Testing Webhooks

### 1. Test with cURL

```bash
# Simulate message status webhook
curl -X POST http://localhost:3000/webhooks/qiscus \
  -H "Content-Type: application/json" \
  -d '{
    "type": "message_status",
    "payload": {
      "message_id": "test-message-123",
      "status": "sent",
      "timestamp": "2025-11-01T10:00:00Z",
      "from": "6281234567890"
    }
  }'

# Response
{
  "success": true,
  "message": "Webhook received"
}
```

### 2. Test with Postman

1. Create new POST request
2. URL: `http://localhost:3000/webhooks/qiscus`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):

```json
{
  "type": "message_status",
  "payload": {
    "message_id": "wamid.test123",
    "status": "delivered",
    "timestamp": "2025-11-01T10:00:00Z"
  }
}
```

### 3. Check Logs

```bash
# View recent system logs
curl 'http://localhost:3000/api/logs/system?limit=10'

# View message updates
curl 'http://localhost:3000/api/logs/messages?limit=10'

# Or check database directly
sqlite3 data/logs.db "
  SELECT
    message_id,
    status,
    recipient_phone,
    created_at,
    updated_at
  FROM message_logs
  WHERE message_id IS NOT NULL
  ORDER BY updated_at DESC
  LIMIT 10
"
```

---

## 🔒 Security

### 1. Webhook Signature (Recommended)

Qiscus mungkin mengirim signature untuk verify authenticity. Tambahkan validation:

```typescript
// middleware/webhookAuth.ts
import crypto from "crypto";

export const validateQiscusSignature = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const signature = req.headers["x-qiscus-signature"];
  const secret = process.env.QISCUS_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return next(); // Skip validation if not configured
  }

  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(401).json({
      success: false,
      message: "Invalid signature",
    });
  }

  next();
};
```

### 2. IP Whitelist

Hanya terima webhook dari Qiscus IP:

```typescript
// middleware/ipWhitelist.ts
const QISCUS_IPS = ["1.2.3.4", "5.6.7.8"];

export const whitelistQiscusIP = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const clientIP = req.ip;

  if (!QISCUS_IPS.includes(clientIP)) {
    logger.warn("Webhook from unauthorized IP", { ip: clientIP });
    return res.status(403).json({
      success: false,
      message: "Forbidden",
    });
  }

  next();
};
```

### 3. Rate Limiting (Optional)

Jika khawatir spam:

```typescript
// Limit webhook to 1000 requests per minute
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: "Too many webhook requests",
});

app.use("/webhooks", webhookLimiter);
```

---

## 🐛 Troubleshooting

### Webhook tidak diterima

**Cek:**

1. URL accessible dari internet

```bash
curl https://your-domain.com/webhooks/qiscus
```

2. Firewall allow incoming connections

```bash
sudo ufw status
sudo ufw allow 3000/tcp
```

3. Webhook registered di Qiscus

```bash
curl http://localhost:3000/api/qiscus/webhook/status
```

### Status tidak update

**Cek:**

1. Message ID tersimpan di database

```sql
SELECT message_id, status
FROM message_logs
WHERE message_id IS NOT NULL
LIMIT 10;
```

2. Webhook logs

```bash
curl 'http://localhost:3000/api/logs/system?level=info&limit=20' \
  | jq '.logs[] | select(.message | contains("webhook"))'
```

3. Test manual webhook

```bash
curl -X POST http://localhost:3000/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Ngrok URL berubah terus

**Solution:** Gunakan ngrok paid plan untuk fixed subdomain:

```bash
ngrok http 3000 --subdomain=myapp

# URL akan selalu: https://myapp.ngrok.io
```

Atau deploy ke production server dengan fixed domain.

---

## 📊 Monitoring

### 1. Real-time Webhook Monitor

```bash
# Monitor incoming webhooks
tail -f logs/combined.log | grep "webhook"

# Or watch system logs
watch -n 2 'curl -s http://localhost:3000/api/logs/system?limit=5 | jq'
```

### 2. Webhook Statistics

```bash
# Count webhooks received today
sqlite3 data/logs.db "
  SELECT COUNT(*)
  FROM system_logs
  WHERE message LIKE '%webhook%'
    AND DATE(created_at) = DATE('now')
"

# Status update breakdown
sqlite3 data/logs.db "
  SELECT
    status,
    COUNT(*) as count,
    MAX(updated_at) as last_update
  FROM message_logs
  WHERE message_id IS NOT NULL
  GROUP BY status
"
```

### 3. Alert on Failed Webhooks

Create monitoring script:

```bash
#!/bin/bash
# scripts/monitor-webhooks.sh

FAILED_COUNT=$(sqlite3 data/logs.db "
  SELECT COUNT(*)
  FROM message_logs
  WHERE status='failed'
    AND updated_at > datetime('now', '-1 hour')
")

if [ "$FAILED_COUNT" -gt 10 ]; then
  echo "Alert: $FAILED_COUNT failed messages in last hour"
  # Send notification (email, Slack, etc.)
fi
```

---

## 🚀 Production Deployment

### 1. Use Fixed Domain

```env
# Production .env
APP_URL=https://api.yourdomain.com
```

### 2. SSL Certificate

Webhook **harus** HTTPS di production:

```bash
# Install certbot
sudo certbot --nginx -d api.yourdomain.com
```

### 3. Nginx Configuration

```nginx
# Webhook endpoint (no rate limit)
location /webhooks {
    proxy_pass http://localhost:3000/webhooks;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # No rate limiting for webhooks
    limit_req off;
}
```

### 4. Register Webhook

```bash
# After deployment, verify webhook is registered
curl https://api.yourdomain.com/api/qiscus/webhook/status
```

### 5. Test Production Webhook

```bash
# Test dari luar
curl -X POST https://api.yourdomain.com/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"test": "production"}'
```

---

## 📋 Checklist

Before going live:

- [ ] Environment variables configured
- [ ] APP_URL set to production domain
- [ ] Domain accessible from internet
- [ ] SSL certificate installed
- [ ] Webhook registered in Qiscus dashboard
- [ ] Test webhook with cURL
- [ ] Monitor logs for webhook receipt
- [ ] Database updates working
- [ ] Error handling tested
- [ ] Monitoring scripts set up

---

## 📞 Support

**Common Questions:**

Q: Webhook URL berubah terus di development?  
A: Gunakan ngrok dengan subdomain tetap atau deploy ke server.

Q: Status tidak update otomatis?  
A: Pastikan message_id tersimpan dan webhook URL accessible.

Q: Bagaimana test tanpa Qiscus?  
A: Gunakan `/webhooks/test` endpoint dengan mock data.

Q: Perlu IP whitelist?  
A: Ya, untuk production sebaiknya whitelist Qiscus IPs.

---

**Last Updated:** November 1, 2025  
**Version:** 1.0.0
