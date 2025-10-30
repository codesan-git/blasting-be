# SMTP Setup Guide

## 🎯 Overview

Aplikasi ini mendukung 2 mode:

1. **Simulation Mode** - Tanpa SMTP (default)
2. **Real SMTP Mode** - Mengirim email sebenarnya

## 📧 Cara Setup SMTP

### Option 1: Gmail (Recommended untuk Testing)

#### Step 1: Enable 2-Factor Authentication

1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification"

#### Step 2: Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and your device
3. Click "Generate"
4. Copy the 16-character password

#### Step 3: Update .env File

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

### Option 2: Outlook/Office365

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Option 3: SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Option 4: AWS SES

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-aws-smtp-username
SMTP_PASS=your-aws-smtp-password
```

### Option 5: Mailgun

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
```

## 🔧 Configuration

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=production

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Rate Limiter
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100       # 100 requests per window
```

### SMTP Ports

- **Port 25**: Traditional SMTP (often blocked by ISPs)
- **Port 465**: SMTP with SSL (use SMTP_SECURE=true)
- **Port 587**: SMTP with STARTTLS (recommended, use SMTP_SECURE=false)
- **Port 2525**: Alternative port (Mailgun, SendGrid)

## 🧪 Testing SMTP

### 1. Check SMTP Status

```bash
curl http://localhost:3000/api/smtp/status
```

Response:

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

### 2. Send Test Email

```bash
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "email": "recipient@example.com",
        "name": "Test User"
      }
    ],
    "channel": "email",
    "templateId": "email-welcome-001",
    "globalVariables": {
      "companyName": "Test Company",
      "date": "2025-10-30"
    },
    "from": "your-email@gmail.com"
  }'
```

### 3. Check Logs

```bash
# Docker logs
docker-compose logs -f app

# File logs
tail -f logs/combined.log
```

Look for:

```
info: SMTP Service initialized successfully
info: Email sent successfully
```

## 🚨 Troubleshooting

### Error: "Invalid login"

**Cause**: Wrong credentials or App Password not enabled

**Solution**:

1. Double-check email and password
2. Use App Password (not your regular password)
3. Enable "Less secure app access" (not recommended)

### Error: "Connection timeout"

**Cause**: Firewall blocking port or wrong host

**Solution**:

1. Check if port 587 is open: `telnet smtp.gmail.com 587`
2. Try port 465 with `SMTP_SECURE=true`
3. Check firewall settings

### Error: "Self signed certificate"

**Cause**: SSL/TLS certificate issue

**Solution**:
Add to your SMTP config:

```typescript
tls: {
  rejectUnauthorized: false;
}
```

### Gmail: "Less secure app access"

Gmail blocks apps without OAuth2. Use App Password instead.

### Emails going to Spam

**Solutions**:

1. Setup SPF record for your domain
2. Setup DKIM signature
3. Setup DMARC policy
4. Use authenticated SMTP server
5. Warm up your sending IP
6. Don't send too many emails at once

## 📊 Rate Limiting

### API Rate Limits

1. **General API**: 100 requests per 15 minutes
2. **Blast Endpoints**: 10 requests per minute
3. **Template Endpoints**: 30 requests per minute

### SMTP Rate Limits

**Built-in limits:**

- Max 5 concurrent connections
- Max 100 messages per connection
- Max 5 emails per second

**Gmail limits:**

- Free: 500 emails/day
- Google Workspace: 2,000 emails/day

**SendGrid Free:**

- 100 emails/day

**AWS SES:**

- Sandbox: 200 emails/day
- Production: Request limit increase

### Bypass Rate Limit (Development Only)

Comment out rate limiters in `src/app.ts`:

```typescript
// app.use('/api/', apiLimiter);
// app.use('/api/messages', blastLimiter, messageRoutes);
```

## 🔒 Security Best Practices

1. **Never commit credentials** to Git
2. **Use environment variables** for all secrets
3. **Use App Passwords** instead of main password
4. **Enable 2FA** on your email account
5. **Rotate credentials** regularly
6. **Monitor for suspicious activity**
7. **Use rate limiting** to prevent abuse
8. **Validate email addresses** before sending
9. **Implement unsubscribe** mechanism
10. **Follow email marketing laws** (CAN-SPAM, GDPR)

## 📈 Production Recommendations

### For High Volume Email Sending:

1. **Use dedicated email service:**

   - SendGrid (99,000+ emails/month plans)
   - AWS SES (pay per use, very cheap)
   - Mailgun (API-first design)
   - Postmark (transactional email focused)

2. **Setup proper DNS records:**

   - SPF record
   - DKIM signature
   - DMARC policy
   - PTR record

3. **Monitor deliverability:**

   - Track bounce rates
   - Monitor spam complaints
   - Watch sender reputation
   - Use feedback loops

4. **Implement email validation:**

   - Check email format
   - Verify domain exists
   - Use email verification service

5. **Warm up your IP:**
   - Start with small volumes
   - Gradually increase
   - Monitor engagement

## 🧪 Testing Different SMTP Providers

### Mailtrap (Development/Testing)

Perfect for testing without sending real emails:

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
```

All emails are caught and can be viewed in Mailtrap inbox.

### Ethereal (Free Testing)

Temporary email testing:

1. Go to https://ethereal.email/create
2. Get credentials
3. Use in your .env

## 💡 Tips

1. **Start with simulation mode** to test your logic
2. **Use Mailtrap** for development testing
3. **Test with Gmail** for small volumes
4. **Upgrade to SendGrid/SES** for production
5. **Monitor your logs** for delivery issues
6. **Implement retry logic** (already built-in with BullMQ)
7. **Track email metrics** (opens, clicks, bounces)

## 📞 Support

If you encounter issues:

1. Check logs: `docker-compose logs app`
2. Verify SMTP settings: `curl http://localhost:3000/api/smtp/status`
3. Test connection: Use online SMTP tester
4. Check email provider documentation
5. Review firewall/network settings
