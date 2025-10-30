# API Guide - Email & WhatsApp Blast with Templates

## 📋 Table of Contents

- [Overview](#overview)
- [Template Management](#template-management)
- [Send Messages](#send-messages)
- [Examples](#examples)

---

## Overview

Aplikasi ini mendukung:

- ✅ Email blast dengan template
- ✅ WhatsApp blast dengan template
- ✅ Kirim ke kedua channel sekaligus (email + WhatsApp)
- ✅ Template dengan variabel dinamis
- ✅ Global dan per-recipient variables

## Base URL

```
http://localhost:3000
```

---

## Template Management

### 1. Get All Templates

**GET** `/api/templates`

Query Parameters:

- `channel` (optional): Filter by channel (`email`, `whatsapp`, `both`)
- `type` (optional): Filter by type (`welcome`, `promotion`, `notification`, `reminder`, `custom`)

**Example:**

```bash
# Get all templates
curl http://localhost:3000/api/templates

# Get email templates only
curl http://localhost:3000/api/templates?channel=email

# Get promotion templates
curl http://localhost:3000/api/templates?type=promotion
```

**Response:**

```json
{
  "success": true,
  "count": 6,
  "templates": [
    {
      "id": "email-welcome-001",
      "name": "Welcome Email",
      "type": "welcome",
      "channel": "email",
      "subject": "Welcome to {{companyName}}, {{name}}!",
      "body": "...",
      "variables": ["name", "companyName", "email", "date"],
      "createdAt": "2025-10-29T...",
      "updatedAt": "2025-10-29T..."
    }
  ]
}
```

### 2. Get Template by ID

**GET** `/api/templates/:id`

**Example:**

```bash
curl http://localhost:3000/api/templates/email-welcome-001
```

### 3. Create New Template

**POST** `/api/templates`

**Request Body:**

```json
{
  "id": "custom-email-001",
  "name": "Custom Email Template",
  "type": "custom",
  "channel": "email",
  "subject": "Hello {{name}}!",
  "body": "<h1>Hi {{name}}</h1><p>Your order #{{orderNumber}} is ready!</p>",
  "variables": ["name", "orderNumber"]
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "id": "custom-email-001",
    "name": "Custom Email",
    "type": "custom",
    "channel": "email",
    "subject": "Order Update",
    "body": "Your order is ready!",
    "variables": ["name"]
  }'
```

### 4. Update Template

**PUT** `/api/templates/:id`

**Request Body:** (semua field optional)

```json
{
  "name": "Updated Template Name",
  "body": "Updated body content",
  "subject": "Updated subject"
}
```

### 5. Delete Template

**DELETE** `/api/templates/:id`

**Example:**

```bash
curl -X DELETE http://localhost:3000/api/templates/custom-email-001
```

---

## Send Messages

### Send Message Blast

**POST** `/api/messages/blast`

**Request Body:**

```json
{
  "recipients": [
    {
      "email": "user@example.com",
      "phone": "6281234567890",
      "name": "John Doe",
      "variables": {
        "orderNumber": "ORD-001"
      }
    }
  ],
  "channel": "email|whatsapp|both",
  "templateId": "email-welcome-001",
  "globalVariables": {
    "companyName": "My Company",
    "date": "2025-10-29"
  },
  "from": "noreply@example.com"
}
```

**Fields:**

- `recipients` (required): Array of recipients
  - `email` (optional): Email address (required if sending email)
  - `phone` (optional): WhatsApp number (required if sending WhatsApp)
  - `name` (required): Recipient name
  - `variables` (optional): Custom variables for this recipient
- `channel` (required): `email`, `whatsapp`, or `both`
- `templateId` (required): Template ID to use
- `globalVariables` (optional): Variables applied to all recipients
- `from` (required for email): Sender email address

---

## Examples

### Example 1: Send Welcome Email

```bash
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "email": "john@example.com",
        "name": "John Doe"
      },
      {
        "email": "jane@example.com",
        "name": "Jane Smith"
      }
    ],
    "channel": "email",
    "templateId": "email-welcome-001",
    "globalVariables": {
      "companyName": "TechCorp",
      "date": "2025-10-29"
    },
    "from": "noreply@techcorp.com"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Message blast queued successfully",
  "totalMessages": 2,
  "channel": "email",
  "template": {
    "id": "email-welcome-001",
    "name": "Welcome Email"
  },
  "jobIds": ["1", "2"]
}
```

### Example 2: Send WhatsApp Promotion

```bash
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "phone": "6281234567890",
        "name": "John Doe"
      },
      {
        "phone": "6289876543210",
        "name": "Jane Smith"
      }
    ],
    "channel": "whatsapp",
    "templateId": "wa-promo-001",
    "globalVariables": {
      "discountPercent": "50",
      "promoCode": "PROMO50",
      "expiryDate": "31 Dec 2025",
      "shopUrl": "https://shop.example.com"
    }
  }'
```

### Example 3: Send Both Email and WhatsApp

```bash
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "email": "john@example.com",
        "phone": "6281234567890",
        "name": "John Doe",
        "variables": {
          "invoiceNumber": "INV-001",
          "amount": "1000000",
          "dueDate": "15 Nov 2025"
        }
      }
    ],
    "channel": "both",
    "templateId": "email-reminder-001",
    "globalVariables": {
      "currency": "Rp"
    },
    "from": "billing@company.com"
  }'
```

### Example 4: Custom Variables per Recipient

```bash
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "email": "john@example.com",
        "name": "John",
        "variables": {
          "orderNumber": "ORD-001",
          "amount": "500000"
        }
      },
      {
        "email": "jane@example.com",
        "name": "Jane",
        "variables": {
          "orderNumber": "ORD-002",
          "amount": "750000"
        }
      }
    ],
    "channel": "email",
    "templateId": "custom-order-template",
    "globalVariables": {
      "companyName": "ShopMart",
      "currency": "Rp"
    },
    "from": "orders@shopmart.com"
  }'
```

### Example 5: Get Queue Statistics

```bash
curl http://localhost:3000/api/messages/stats
```

**Response:**

```json
{
  "success": true,
  "stats": {
    "waiting": 5,
    "active": 3,
    "completed": 100,
    "failed": 2
  }
}
```

---

## Pre-defined Templates

### Email Templates:

1. **email-welcome-001** - Welcome Email
   - Variables: `name`, `companyName`, `email`, `date`
2. **email-promo-001** - Promotional Email
   - Variables: `name`, `discountPercent`, `promoCode`, `expiryDate`, `shopUrl`
3. **email-reminder-001** - Payment Reminder
   - Variables: `name`, `invoiceNumber`, `amount`, `currency`, `dueDate`

### WhatsApp Templates:

1. **wa-welcome-001** - WhatsApp Welcome
   - Variables: `name`, `companyName`, `email`, `date`
2. **wa-promo-001** - WhatsApp Promotion
   - Variables: `name`, `discountPercent`, `promoCode`, `expiryDate`, `shopUrl`
3. **wa-reminder-001** - WhatsApp Payment Reminder
   - Variables: `name`, `invoiceNumber`, `amount`, `currency`, `dueDate`

---

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "message": "Recipients array is required and cannot be empty"
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Template with ID 'xyz' not found"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to queue message blast",
  "error": "Error details"
}
```

---

## Testing Tips

1. **Test dengan Postman**: Import collection dari contoh di atas
2. **Check Logs**: `tail -f logs/combined.log`
3. **Monitor Queue**: `curl http://localhost:3000/api/messages/stats`
4. **Check Redis**: `docker exec -it email-blast-redis redis-cli`
