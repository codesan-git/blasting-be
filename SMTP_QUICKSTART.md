# SMTP Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Setup Gmail App Password (Easiest)

1. **Go to Gmail Settings**

   - Visit: https://myaccount.google.com/apppasswords
   - Login to your Gmail account

2. **Generate App Password**
   - Select "Mail" → Your device
   - Click "Generate"
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### Step 3: Update .env File

```bash
# Edit .env file
nano .env
```

Add these lines:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcdefghijklmnop
```

**Replace:**

- `your-email@gmail.com` with your actual Gmail
- `abcdefghijklmnop` with your App Password (remove spaces!)

### Step 4: Build and Run

```bash
# Build
npm run build

# Run with Docker Compose
docker-compose down
docker-compose up -d --build

# Check logs
docker-compose logs -f app
```

Look for these messages:

```
✅ SMTP connection verified successfully
✅ SMTP Mode: REAL EMAIL SENDING
```

### Step 5: Send Test Email

```bash
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "email": "YOUR_EMAIL@gmail.com",
        "name": "Test User"
      }
    ],
    "channel": "email",
    "templateId": "email-welcome-001",
    "globalVariables": {
      "companyName": "My Company",
      "date": "2025-10-30"
    },
    "from": "your-email@gmail.com"
  }'
```

**Replace:**

- `YOUR_EMAIL@gmail.com` - Where you want to receive test email
- `your-email@gmail.com` - Your sender email (same as SMTP_USER)

### Step 6: Check Your Email! 📧

You should receive the welcome email within seconds!

---

## 📊 Check SMTP Status

```bash
curl http://localhost:3000/api/smtp/status
```

Should return:

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

## 🧪 Test Rate Limiting

Send multiple requests quickly:

```bash
# This will work (first 10 within 1 minute)
for i in {1..12}; do
  curl -X POST http://localhost:3000/api/messages/blast \
    -H "Content-Type: application/json" \
    -d '{
      "recipients": [{"email": "test@example.com", "name": "Test"}],
      "channel": "email",
      "templateId": "email-welcome-001",
      "globalVariables": {"companyName": "Test", "date": "2025-10-30"},
      "from": "your-email@gmail.com"
    }'
  echo ""
  sleep 1
done
```

After 10 requests in 1 minute, you'll get:

```json
{
  "success": false,
  "message": "Too many blast requests. Maximum 10 requests per minute.",
  "retryAfter": "..."
}
```

---

## 🎯 Common Issues & Solutions

### ❌ "Invalid login: 535-5.7.8 Username and Password not accepted"

**Solution:** Use App Password, not your Gmail password!

1. Enable 2-Factor Authentication
2. Generate App Password
3. Use that password in SMTP_PASS

### ❌ "SMTP not configured. Running in simulation mode"

**Solution:** Check your .env file:

- Make sure SMTP_USER and SMTP_PASS are set
- No empty values
- No quotes around values

### ❌ "Connection timeout"

**Solution:**

1. Check internet connection
2. Try port 465 with SMTP_SECURE=true
3. Check if firewall blocks port 587

### ❌ Emails go to Spam

**Solutions:**

- Use proper "from" email (same as SMTP_USER)
- Don't send too many at once
- Add unsubscribe link (for marketing)
- Setup SPF/DKIM for production

---

## 💡 Production Tips

### Gmail Limits

- **Free**: 500 emails/day
- **Google Workspace**: 2,000 emails/day

For production, use:

- **SendGrid**: 100 emails/day (free), paid plans available
- **AWS SES**: $0.10 per 1,000 emails
- **Mailgun**: 5,000 emails/month (free trial)

### Rate Limits (Built-in)

1. **API Rate Limit**: 100 requests per 15 minutes
2. **Blast Rate Limit**: 10 requests per minute
3. **SMTP Rate Limit**: 5 emails per second
4. **Worker Concurrency**: 5 concurrent emails

To adjust, edit `.env`:

```env
RATE_LIMIT_WINDOW_MS=900000       # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100       # Max requests
```

---

## 🔄 Switch to Different SMTP

### SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=YOUR_SENDGRID_API_KEY
```

### AWS SES

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=YOUR_AWS_SMTP_USERNAME
SMTP_PASS=YOUR_AWS_SMTP_PASSWORD
```

### Mailtrap (Testing Only)

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=YOUR_MAILTRAP_USERNAME
SMTP_PASS=YOUR_MAILTRAP_PASSWORD
```

After changing, restart:

```bash
docker-compose down
docker-compose up -d
```

---

## 📝 Next Steps

1. ✅ Setup SMTP (Done!)
2. ⬜ Customize email templates
3. ⬜ Add your logo/branding
4. ⬜ Setup domain authentication (SPF/DKIM)
5. ⬜ Integrate WhatsApp API
6. ⬜ Add database for template storage
7. ⬜ Deploy to production

---

## 📖 Full Documentation

- **SMTP-SETUP.md** - Detailed SMTP configuration
- **API-GUIDE.md** - Complete API documentation
- **README.md** - General overview

---

**You're all set! 🎉**

Your application can now send real emails with rate limiting!
