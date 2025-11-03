# SMTP Configuration Guide

Complete guide to configure email sending with SMTP.

---

## 🎯 Quick Start (5 Minutes)

### Step 1: Get Gmail App Password

1. **Enable 2-Factor Authentication**

   - Visit: https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate App Password**
   - Visit: https://myaccount.google.com/apppasswords
   - Select "Mail" → Your device
   - Click "Generate"
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### Step 2: Configure Environment

Edit `.env` file:

```env
# SMTP Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcdefghijklmnop    # No spaces!
```

### Step 3: Restart & Test

```bash
# Restart application
npm run dev

# Check SMTP status
curl http://localhost:3000/api/smtp/status

# Expected response:
# {
#   "success": true,
#   "smtp": {
#     "configured": true,
#     "host": "smtp.gmail.com",
#     "user": "your-email@gmail.com"
#   }
# }

# Send test email
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "name": "Test User",
        "email": "your-email@gmail.com"
      }
    ],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "globalVariables": {
      "companyName": "My Company",
      "date": "2025-11-03"
    },
    "from": "your-email@gmail.com"
  }'
```

**Check your email inbox!** You should receive the welcome email within seconds.

---

## 📧 SMTP Providers Configuration

### 1. Gmail (Recommended for Testing)

**Best for:** Personal projects, testing, small volume (<500/day)

**Configuration:**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

**Limits:**

- Free Gmail: 500 emails/day
- Google Workspace: 2,000 emails/day

**Pros:**

- ✅ Easy setup
- ✅ Reliable delivery
- ✅ Free for personal use

**Cons:**

- ❌ Low daily limit
- ❌ Requires 2FA + App Password
- ❌ Not ideal for production

---

### 2. SendGrid (Recommended for Production)

**Best for:** Production, high volume, detailed analytics

**Setup:**

1. Sign up at https://sendgrid.com
2. Verify your sender identity (email or domain)
3. Create API Key (Settings → API Keys)
4. Configure:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your-sendgrid-api-key
```

**Limits:**

- Free: 100 emails/day forever
- Essentials: $19.95/month (50,000 emails/month)
- Pro: $89.95/month (100,000 emails/month)

**Pros:**

- ✅ High deliverability
- ✅ Detailed analytics
- ✅ Email validation
- ✅ Template engine
- ✅ Webhook support

**Cons:**

- ❌ Free tier is limited
- ❌ Requires domain verification for production

---

### 3. AWS SES (Recommended for Scale)

**Best for:** Large scale, cost-effective, AWS infrastructure

**Setup:**

1. Go to AWS SES Console
2. Verify your domain or email
3. Create SMTP credentials
4. Move out of sandbox mode (request)

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-aws-smtp-username
SMTP_PASS=your-aws-smtp-password
```

**Pricing:**

- First 62,000 emails: Free (if from EC2)
- After: $0.10 per 1,000 emails

**Pros:**

- ✅ Very cheap at scale
- ✅ High reliability
- ✅ Integrates with AWS services
- ✅ No daily limits (after sandbox)

**Cons:**

- ❌ Complex setup
- ❌ Sandbox mode initially (200/day)
- ❌ Requires domain verification

---

### 4. Mailgun

**Best for:** Developers, API-first approach

**Setup:**

1. Sign up at https://www.mailgun.com
2. Add and verify domain
3. Get SMTP credentials

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
```

**Limits:**

- Free: 5,000 emails/month (3 months)
- Foundation: $35/month (50,000 emails)

**Pros:**

- ✅ Developer-friendly
- ✅ Good documentation
- ✅ Email validation API
- ✅ European servers available

**Cons:**

- ❌ Free tier time-limited
- ❌ Complex pricing

---

### 5. Microsoft 365 / Outlook

**Best for:** Business with Microsoft 365 subscription

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@company.com
SMTP_PASS=your-password
```

**Limits:**

- 10,000 recipients/day

**Pros:**

- ✅ Included with M365
- ✅ Professional email address
- ✅ High limits

**Cons:**

- ❌ Requires M365 subscription
- ❌ Modern auth complexity

---

### 6. Mailtrap (Testing Only)

**Best for:** Development and testing without sending real emails

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
```

**Features:**

- All emails are caught (not sent)
- Web interface to view emails
- Perfect for development
- Free forever

---

## 🔧 Advanced Configuration

### Connection Pooling

Already configured in the application:

```typescript
{
  pool: true,              // Use connection pooling
  maxConnections: 5,       // Max 5 concurrent connections
  maxMessages: 100,        // Max 100 messages per connection
  rateDelta: 1000,         // 1 second
  rateLimit: 5             // Max 5 emails per second
}
```

### TLS/SSL Configuration

**For port 465 (SSL):**

```env
SMTP_PORT=465
SMTP_SECURE=true
```

**For port 587 (STARTTLS):**

```env
SMTP_PORT=587
SMTP_SECURE=false
```

### Custom SMTP Options

Edit `src/services/smtp.service.ts` for advanced options:

```typescript
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },

  // Advanced options
  tls: {
    rejectUnauthorized: false, // Accept self-signed certs
    minVersion: "TLSv1.2", // Minimum TLS version
  },

  // Connection timeout
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 5000, // 5 seconds
  socketTimeout: 30000, // 30 seconds

  // Debugging
  logger: true, // Enable logging
  debug: true, // Enable debug output
});
```

---

## 📊 Rate Limiting

### Built-in Application Limits

The application has multiple rate limiting layers:

**1. API Rate Limits:**

```env
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100      # 100 requests per window
```

**2. Blast Endpoint Limits:**

- 10 requests per minute
- Prevents abuse of bulk sending

**3. SMTP Rate Limits:**

- 5 emails per second
- 5 concurrent connections
- 100 messages per connection

**4. Worker Concurrency:**

- 5 concurrent jobs processing

### Provider-Specific Limits

**Gmail:**

- Free: 500 emails/day
- Workspace: 2,000 emails/day

**SendGrid:**

- Rate limit: 600 emails/second (Enterprise)
- Burst rate: 10,000 emails/second

**AWS SES:**

- Sending rate: 14 emails/second (default)
- Can be increased via support ticket

### Adjusting Limits

Edit worker concurrency in `src/workers/message.worker.ts`:

```typescript
export const messageWorker = new Worker(
  "message-queue",
  async (job) => {
    /* ... */
  },
  {
    concurrency: 10, // Increase from 5 to 10
    limiter: {
      max: 20, // 20 jobs
      duration: 1000, // per second
    },
  }
);
```

---

## 🔒 Security Best Practices

### 1. Protect Credentials

**Never commit credentials to Git:**

```bash
# .gitignore should include:
.env
.env.local
.env.production
```

**Use environment variables:**

```bash
# Set in system environment (production)
export SMTP_USER=your-email@gmail.com
export SMTP_PASS=your-secure-password

# Or use secrets management
# - AWS Secrets Manager
# - HashiCorp Vault
# - Docker Secrets
```

### 2. Use App Passwords

For Gmail/Google Workspace:

- ✅ Use App Passwords
- ❌ Never use your main password
- ✅ Enable 2-Factor Authentication

### 3. Rotate Credentials

```bash
# Rotate passwords regularly (every 90 days)
# Update .env with new credentials
# Restart application

pm2 restart email-blast-app
```

### 4. Monitor Suspicious Activity

```bash
# Check for unusual sending patterns
sqlite3 data/logs.db << 'SQL'
SELECT
  DATE(created_at) as date,
  COUNT(*) as emails_sent,
  COUNT(DISTINCT recipient_email) as unique_recipients
FROM message_logs
WHERE channel = 'email'
  AND created_at >= date('now', '-7 days')
GROUP BY DATE(created_at)
ORDER BY date DESC;
SQL

# Alert if:
# - Sudden spike in volume
# - Many failed deliveries
# - Unusual recipients
```

### 5. Validate Email Addresses

Already implemented in application:

```typescript
// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Additional checks
if (!emailRegex.test(email)) {
  throw new Error("Invalid email format");
}

// Optional: Use email verification service
// - ZeroBounce
// - NeverBounce
// - EmailListVerify
```

---

## 📈 Domain Authentication (Production)

For professional email delivery, configure these DNS records:

### 1. SPF (Sender Policy Framework)

Tells receiving servers which IPs can send from your domain.

```dns
Type: TXT
Host: @
Value: v=spf1 include:_spf.google.com ~all

# For SendGrid:
Value: v=spf1 include:sendgrid.net ~all

# For AWS SES:
Value: v=spf1 include:amazonses.com ~all
```

### 2. DKIM (DomainKeys Identified Mail)

Cryptographically signs your emails.

**Gmail:** Automatically configured
**SendGrid:** Get from SendGrid dashboard
**AWS SES:** Get from AWS SES console

```dns
Type: TXT
Host: [provider-specific]
Value: [provider-specific-key]
```

### 3. DMARC (Domain-based Message Authentication)

Tells receivers what to do with emails that fail SPF/DKIM.

```dns
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

**DMARC Policies:**

- `p=none` - Monitor only (start here)
- `p=quarantine` - Send to spam
- `p=reject` - Reject email

### Verify Configuration

```bash
# Check SPF
dig yourdomain.com TXT | grep spf

# Check DKIM
dig [selector]._domainkey.yourdomain.com TXT

# Check DMARC
dig _dmarc.yourdomain.com TXT

# Or use online tools:
# - https://mxtoolbox.com/
# - https://www.mail-tester.com/
```

---

## 🧪 Testing Email Delivery

### Test Checklist

```bash
# 1. Check SMTP status
curl http://localhost:3000/api/smtp/status

# 2. Send test email
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [{"name": "Test", "email": "test@example.com"}],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "globalVariables": {"companyName": "Test Co", "date": "2025-11-03"},
    "from": "your-email@gmail.com"
  }'

# 3. Check queue processing
curl http://localhost:3000/api/messages/stats

# 4. Check logs
curl 'http://localhost:3000/api/logs/messages?limit=5'

# 5. Verify in inbox
```

### Test Different Scenarios

**1. Single Recipient:**

```bash
# Test basic functionality
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [{"name": "John", "email": "john@example.com"}],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "from": "sender@example.com"
  }'
```

**2. Multiple Recipients:**

```bash
# Test bulk sending
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {"name": "User 1", "email": "user1@example.com"},
      {"name": "User 2", "email": "user2@example.com"},
      {"name": "User 3", "email": "user3@example.com"}
    ],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "from": "sender@example.com"
  }'
```

**3. With Variables:**

```bash
# Test template rendering
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [{
      "name": "John Doe",
      "email": "john@example.com",
      "variables": {
        "invoiceNumber": "INV-001",
        "amount": "Rp 1,000,000"
      }
    }],
    "channels": ["email"],
    "templateId": "invoicing_testing_v1_2",
    "globalVariables": {
      "companyName": "My Company",
      "period": "November 2025"
    },
    "from": "billing@example.com"
  }'
```

**4. Test Error Handling:**

```bash
# Invalid email
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [{"name": "Test", "email": "invalid-email"}],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "from": "sender@example.com"
  }'

# Missing template
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [{"name": "Test", "email": "test@example.com"}],
    "channels": ["email"],
    "templateId": "non-existent",
    "from": "sender@example.com"
  }'
```

### Email Deliverability Test

Send test to https://www.mail-tester.com:

```bash
# Get test email address from mail-tester.com
# Example: test-abc123@srv1.mail-tester.com

curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [{
      "name": "Mail Tester",
      "email": "test-abc123@srv1.mail-tester.com"
    }],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "globalVariables": {
      "companyName": "Test Company",
      "date": "2025-11-03"
    },
    "from": "your-email@gmail.com"
  }'

# Check score at mail-tester.com
# Goal: Score 10/10
```

---

## ❌ Common Issues

### Issue 1: Authentication Failed

**Error:** `Invalid login: 535-5.7.8`

**Solutions:**

```bash
# For Gmail:
# 1. Enable 2FA
# 2. Generate App Password
# 3. Use App Password (not regular password)
# 4. Remove spaces from App Password

# Update .env:
SMTP_PASS=abcdefghijklmnop  # 16 chars, no spaces

# Restart app
npm run dev
```

### Issue 2: Connection Timeout

**Error:** `Connection timeout`

**Solutions:**

```bash
# 1. Test port connectivity
telnet smtp.gmail.com 587

# 2. Check firewall
sudo ufw allow out 587/tcp

# 3. Try alternate port
SMTP_PORT=465
SMTP_SECURE=true

# 4. Check proxy settings (if behind corporate firewall)
```

### Issue 3: Self-Signed Certificate Error

**Error:** `self signed certificate in certificate chain`

**Solution:**

```typescript
// Add to smtp.service.ts
tls: {
  rejectUnauthorized: false;
}
```

### Issue 4: Emails Going to Spam

**Solutions:**

```bash
# 1. Use proper "from" address (same as SMTP_USER)
from: "your-email@gmail.com"  # ✓
from: "noreply@random.com"     # ✗

# 2. Setup SPF/DKIM (see Domain Authentication section)

# 3. Avoid spam trigger words
Subject: "FREE MONEY CLICK HERE"  # ✗
Subject: "Your Invoice #12345"    # ✓

# 4. Warm up sending IP
# - Start with small volumes
# - Gradually increase
# - Monitor bounce rates

# 5. Add unsubscribe link (for marketing emails)
```

### Issue 5: Rate Limit Exceeded

**Error:** `Too many emails sent`

**Solutions:**

```bash
# Check current sending rate
curl http://localhost:3000/api/logs/messages/stats

# Options:
# 1. Reduce sending rate
# 2. Upgrade provider plan
# 3. Use multiple providers
# 4. Implement queue throttling

# Example: Throttle to 100 emails/hour
# Edit worker:
# limiter: { max: 100, duration: 3600000 }
```

---

## 📊 Monitoring & Maintenance

### Monitor Sending Performance

```bash
# Check success rate
curl http://localhost:3000/api/logs/messages/stats | jq '.stats.email'

# Check recent failures
curl 'http://localhost:3000/api/logs/messages?status=failed&channel=email&limit=10'

# Check average response time
sqlite3 data/logs.db << 'SQL'
SELECT
  AVG(response_time_ms) as avg_response_ms,
  COUNT(*) as total_requests
FROM api_logs
WHERE endpoint LIKE '%/blast%'
  AND created_at >= datetime('now', '-1 hour');
SQL
```

### Email Health Metrics

Track these KPIs:

```bash
# Daily metrics script
#!/bin/bash
echo "=== EMAIL METRICS $(date +%Y-%m-%d) ==="

sqlite3 data/logs.db << 'SQL'
-- Emails sent today
SELECT COUNT(*) as emails_sent_today
FROM message_logs
WHERE channel = 'email'
  AND DATE(created_at) = DATE('now');

-- Success rate
SELECT
  ROUND(100.0 * SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate_percent
FROM message_logs
WHERE channel = 'email'
  AND DATE(created_at) = DATE('now');

-- Top failure reasons
SELECT
  error_message,
  COUNT(*) as count
FROM message_logs
WHERE channel = 'email'
  AND status = 'failed'
  AND DATE(created_at) = DATE('now')
GROUP BY error_message
ORDER BY count DESC
LIMIT 5;
SQL
```

### Maintenance Tasks

**Daily:**

- [ ] Check error logs
- [ ] Monitor success rate (>95%)
- [ ] Check queue backlog (<100)

**Weekly:**

- [ ] Review failed messages
- [ ] Check disk space
- [ ] Verify SMTP connection

**Monthly:**

- [ ] Rotate credentials
- [ ] Review sending patterns
- [ ] Update dependencies
- [ ] Test backup restore

---

## 🚀 Production Checklist

Before going live:

- [ ] SMTP credentials configured
- [ ] Domain verified (if using SendGrid/SES)
- [ ] SPF record configured
- [ ] DKIM configured
- [ ] DMARC configured
- [ ] SSL/TLS enabled
- [ ] Rate limits appropriate for volume
- [ ] Monitoring and alerting setup
- [ ] Backup system tested
- [ ] Error handling tested
- [ ] Deliverability tested (mail-tester.com)
- [ ] Unsubscribe mechanism (for marketing)
- [ ] Privacy policy and terms
- [ ] Comply with CAN-SPAM / GDPR

---

## 📚 Additional Resources

**Email Best Practices:**

- [Gmail Bulk Sender Guidelines](https://support.google.com/a/answer/81126)
- [SendGrid Email Best Practices](https://sendgrid.com/blog/email-best-practices/)
- [Can-SPAM Compliance](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)

**Tools:**

- [MX Toolbox](https://mxtoolbox.com/) - DNS & deliverability testing
- [Mail Tester](https://www.mail-tester.com/) - Spam score testing
- [DMARC Analyzer](https://dmarcian.com/) - DMARC monitoring

**Provider Documentation:**

- [Gmail SMTP](https://support.google.com/a/answer/176600)
- [SendGrid Docs](https://docs.sendgrid.com/)
- [AWS SES Docs](https://docs.aws.amazon.com/ses/)
- [Mailgun Docs](https://documentation.mailgun.com/)

---

## 📞 Support

For SMTP issues:

1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) → SMTP Issues section
2. Run diagnostics: `curl http://localhost:3000/api/smtp/status`
3. Check logs: `tail -f logs/combined.log | grep "SMTP\|Email"`
4. Test connection: `telnet smtp.gmail.com 587`

---

Last Updated: November 3, 2025  
Version: 1.0.0
