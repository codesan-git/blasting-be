# Troubleshooting Guide

Complete guide to diagnose and fix common issues.

---

## 📋 Quick Diagnostics

Run this first to identify the problem:

```bash
# Comprehensive health check
bash scripts/monitoring/health-check.sh

# This will show:
# - Server status
# - Database connection
# - Redis connection
# - Queue statistics
# - Recent activity
```

---

## 🔴 Server Issues

### Problem: Server Won't Start

**Symptoms:**

- Error on `npm run dev`
- Port already in use
- Cannot bind to port

**Solutions:**

```bash
# 1. Check if port 3000 is in use
lsof -i :3000

# Kill the process
kill -9 <PID>

# 2. Change port
echo "PORT=3001" >> .env

# 3. Check for syntax errors
npm run build
# Look for TypeScript compilation errors
```

### Problem: Server Crashes Randomly

**Symptoms:**

- Server stops unexpectedly
- PM2 shows "errored" status
- Memory issues

**Solutions:**

```bash
# 1. Check logs for errors
tail -100 logs/error.log

# 2. Check memory usage
pm2 monit

# 3. Increase memory limit (PM2)
pm2 start dist/index.js --max-memory-restart 1G

# 4. Check for memory leaks
node --max-old-space-size=4096 dist/index.js
```

---

## 🔴 Redis Issues

### Problem: Cannot Connect to Redis

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solutions:**

```bash
# 1. Check if Redis is running
docker ps | grep redis

# 2. If not running, start it
docker-compose up -d redis

# 3. Test connection
docker exec email-blast-redis redis-cli ping
# Should return: PONG

# 4. Check Redis logs
docker logs email-blast-redis

# 5. Restart Redis
docker-compose restart redis
```

### Problem: Redis Memory Full

**Error:** `OOM command not allowed when used memory > 'maxmemory'`

**Solutions:**

```bash
# 1. Check memory usage
docker exec email-blast-redis redis-cli INFO memory

# 2. Clear completed jobs
docker exec email-blast-redis redis-cli FLUSHDB

# 3. Increase maxmemory in docker-compose.yml
# redis:
#   command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru

# 4. Restart Redis
docker-compose restart redis
```

### Problem: Too Many Redis Connections

**Error:** `Error: Maximum number of clients reached`

**Solutions:**

```bash
# 1. Check current connections
docker exec email-blast-redis redis-cli CLIENT LIST | wc -l

# 2. Close idle connections
docker exec email-blast-redis redis-cli CLIENT KILL TYPE normal

# 3. Increase max clients (docker-compose.yml)
# command: redis-server --maxclients 10000
```

---

## 🔴 Queue Issues

### Problem: Jobs Stuck in Queue

**Symptoms:**

- Waiting count increasing
- Active count = 0
- Messages not processing

**Solutions:**

```bash
# 1. Check queue stats
curl http://localhost:3000/api/messages/stats | jq

# 2. Check worker is running
ps aux | grep node | grep worker

# 3. Restart workers
pm2 restart email-blast-app

# 4. Check for stuck jobs in Redis
docker exec email-blast-redis redis-cli LLEN bull:message-queue:wait
docker exec email-blast-redis redis-cli LLEN bull:message-queue:active

# 5. Clear stuck jobs (CAUTION: loses data)
curl -X POST http://localhost:3000/api/queue/clear
```

### Problem: High Failure Rate

**Symptoms:**

- Many jobs in "failed" status
- Error logs growing fast

**Solutions:**

```bash
# 1. Check recent failed jobs
curl 'http://localhost:3000/api/logs/messages?status=failed&limit=20' | jq

# 2. Check error patterns
sqlite3 data/logs.db << 'SQL'
SELECT error_message, COUNT(*) as count
FROM message_logs
WHERE status='failed'
GROUP BY error_message
ORDER BY count DESC
LIMIT 10;
SQL

# 3. Check SMTP/Qiscus credentials
curl http://localhost:3000/api/smtp/status | jq
curl http://localhost:3000/api/qiscus/webhook/status | jq

# 4. Test external services
# For SMTP:
telnet smtp.gmail.com 587

# For Qiscus:
curl https://multichannel.qiscus.com/api/v2/health
```

### Problem: Queue Processing Slow

**Symptoms:**

- Queue backing up
- High response times
- Waiting count growing

**Solutions:**

```bash
# 1. Check processing time
sqlite3 data/logs.db << 'SQL'
SELECT
  AVG(JULIANDAY(updated_at) - JULIANDAY(created_at)) * 86400 as avg_seconds,
  MAX(JULIANDAY(updated_at) - JULIANDAY(created_at)) * 86400 as max_seconds
FROM message_logs
WHERE status IN ('sent', 'failed');
SQL

# 2. Increase worker concurrency
# Edit src/workers/message.worker.ts:
# concurrency: 10 (from 5)

# 3. Check external service latency
time curl -X POST https://api.qiscus.com/...

# 4. Optimize database (if slow)
sqlite3 data/logs.db 'VACUUM; ANALYZE;'
```

---

## 🔴 Database Issues

### Problem: Database Locked

**Error:** `database is locked`

**Solutions:**

```bash
# 1. Check what's locking the database
lsof data/logs.db

# 2. Stop all connections
pm2 stop email-blast-app

# 3. Remove lock file (if exists)
rm -f data/logs.db-shm data/logs.db-wal

# 4. Restart application
pm2 start email-blast-app

# 5. If persistent, backup and recreate
cp data/logs.db data/logs.db.backup
sqlite3 data/logs.db 'VACUUM;'
```

### Problem: Database Corruption

**Error:** `database disk image is malformed`

**Solutions:**

```bash
# 1. Check integrity
sqlite3 data/logs.db 'PRAGMA integrity_check;'

# 2. Export data
sqlite3 data/logs.db '.dump' > backup.sql

# 3. Recreate database
mv data/logs.db data/logs.db.corrupt
sqlite3 data/logs.db < backup.sql

# 4. If backup exists, restore
bash scripts/backup/restore-backup.sh 1
```

### Problem: Database Too Large

**Symptoms:**

- Slow queries
- High disk usage
- Backup takes too long

**Solutions:**

```bash
# 1. Check database size
du -h data/logs.db

# 2. Cleanup old logs (>30 days)
curl -X POST http://localhost:3000/api/logs/cleanup \
  -H "Content-Type: application/json" \
  -d '{"days": 30}'

# 3. Vacuum database
sqlite3 data/logs.db 'VACUUM;'

# 4. Archive old data
DATE=$(date -d '6 months ago' +%Y-%m-%d)
sqlite3 data/logs.db << SQL
.output archive_$DATE.sql
.dump
DELETE FROM message_logs WHERE created_at < '$DATE';
DELETE FROM api_logs WHERE created_at < '$DATE';
DELETE FROM system_logs WHERE created_at < '$DATE';
VACUUM;
SQL
```

---

## 🔴 SMTP Issues

### Problem: Authentication Failed

**Error:** `Invalid login: 535-5.7.8 Username and Password not accepted`

**Solutions:**

```bash
# For Gmail:
# 1. Enable 2-Factor Authentication
# 2. Generate App Password: https://myaccount.google.com/apppasswords
# 3. Use App Password (not your regular password)

# Update .env:
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password  # No spaces!

# 4. Restart application
pm2 restart email-blast-app

# 5. Test SMTP connection
curl http://localhost:3000/api/smtp/status
```

### Problem: Connection Timeout

**Error:** `Greeting never received`

**Solutions:**

```bash
# 1. Test port connectivity
telnet smtp.gmail.com 587

# 2. Try alternate port
# In .env:
SMTP_PORT=465
SMTP_SECURE=true

# 3. Check firewall
sudo ufw allow out 587/tcp
sudo ufw allow out 465/tcp

# 4. Try different SMTP provider
# See SMTP-CONFIGURATION.md for alternatives
```

### Problem: Emails Go to Spam

**Solutions:**

```bash
# 1. Use proper from address (same as SMTP_USER)
# Don't: from: "noreply@anydomain.com"
# Do:   from: "your-email@gmail.com"

# 2. Add SPF record (for custom domain)
# TXT record: v=spf1 include:_spf.google.com ~all

# 3. Setup DKIM (for production)
# See SMTP-CONFIGURATION.md

# 4. Avoid spam trigger words
# Don't use: FREE, WIN, CLICK HERE, etc.

# 5. Add unsubscribe link (for marketing)
```

### Problem: Email API Succeeds But Emails Not Sent (Plesk)

**Symptom:** API returns success (200 OK) but emails are never received. Works fine on VPS but fails on Plesk.

**Common Causes:**

1. **Plesk Firewall blocking outbound SMTP**
2. **Environment variables not loaded correctly**
3. **TLS/SSL certificate validation issues**
4. **Network restrictions in Plesk**

**Solutions:**

#### Step 1: Test SMTP Connection

```bash
# Test SMTP connection via API
curl -X GET http://your-domain.com/api/custom-emails/test-connection \
  -H "Authorization: Bearer YOUR_TOKEN"

# Or check status
curl -X GET http://your-domain.com/api/custom-emails/smtp-status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Step 2: Check Environment Variables in Plesk

Plesk may not load `.env` file automatically. Check:

1. **In Plesk Panel:**
   - Go to **Domains** → Your Domain → **Node.js**
   - Check **Environment Variables** section
   - Ensure all SMTP variables are set:
     - `SMTP_HOST`
     - `SMTP_PORT`
     - `SMTP_SECURE`
     - `SMTP_USER`
     - `SMTP_PASS`

2. **Or set in Plesk Node.js Environment:**
   ```bash
   # In Plesk Node.js settings, add:
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

#### Step 3: Configure Plesk Firewall

Plesk may block outbound SMTP connections:

1. **In Plesk Panel:**
   - Go to **Tools & Settings** → **Firewall**
   - Add outbound rule for SMTP ports:
     - Port **587** (STARTTLS)
     - Port **465** (SSL)
     - Port **25** (if needed)

2. **Or via SSH:**
   ```bash
   # Check if port is blocked
   telnet smtp.gmail.com 587
   
   # If connection fails, allow outbound SMTP
   # In Plesk Firewall settings, allow:
   # - Outbound TCP 587
   # - Outbound TCP 465
   ```

#### Step 4: Handle TLS/SSL Certificate Issues

If you see certificate errors:

```bash
# Add to .env or Plesk environment variables:
SMTP_TLS_REJECT_UNAUTHORIZED=false  # For testing only!
SMTP_TLS_MIN_VERSION=TLSv1.2
```

**⚠️ Warning:** Only use `SMTP_TLS_REJECT_UNAUTHORIZED=false` for testing. In production, fix certificate issues properly.

#### Step 5: Increase Connection Timeouts

Plesk may have slower network, increase timeouts:

```bash
# Add to .env or Plesk environment variables:
SMTP_CONNECTION_TIMEOUT=20000  # 20 seconds (default: 10s)
SMTP_GREETING_TIMEOUT=10000    # 10 seconds (default: 5s)
SMTP_SOCKET_TIMEOUT=60000      # 60 seconds (default: 30s)
```

#### Step 6: Enable Debug Logging

Enable detailed SMTP logging:

```bash
# Add to .env or Plesk environment variables:
SMTP_DEBUG=true
LOG_LEVEL=debug
```

Then check logs in Plesk:
- **Node.js** → **Logs** → View application logs
- Look for SMTP connection attempts and errors

#### Step 7: Test with Different SMTP Provider

If Gmail doesn't work, try alternative:

```bash
# Option 1: Use port 465 (SSL) instead of 587
SMTP_PORT=465
SMTP_SECURE=true

# Option 2: Try SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your-sendgrid-api-key
```

#### Step 8: Verify Email Actually Sent

Check if email was accepted by SMTP server:

```bash
# Send test email and check response
curl -X POST http://your-domain.com/api/custom-emails/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "to": [{"email": "test@example.com"}],
    "subject": "Test Email",
    "body": "<p>Test</p>"
  }'

# Check logs for:
# - "accepted" array (should contain recipient email)
# - "rejected" array (should be empty)
# - "response" field (should be "250 OK")
```

#### Step 9: Check Plesk Mail Server Conflicts

Plesk may have its own mail server that conflicts:

1. **Disable Plesk Mail Server** (if not using):
   - Go to **Mail** → **Mail Settings**
   - Disable mail server if you're using external SMTP

2. **Or configure Plesk to use external SMTP**:
   - Go to **Mail** → **Mail Settings**
   - Set **Outgoing Mail Mode** to **SMTP**
   - Configure SMTP settings

#### Quick Diagnostic Checklist

```bash
# 1. Check if environment variables are loaded
curl http://your-domain.com/api/custom-emails/smtp-status

# 2. Test SMTP connection
curl http://your-domain.com/api/custom-emails/test-connection

# 3. Check application logs in Plesk
# Plesk → Node.js → Logs

# 4. Test from server directly (SSH)
telnet smtp.gmail.com 587

# 5. Verify firewall allows outbound SMTP
# Plesk → Tools & Settings → Firewall
```

#### Common Plesk-Specific Errors

**Error: `ECONNREFUSED`**
- **Cause:** Plesk firewall blocking outbound SMTP
- **Fix:** Allow outbound TCP 587/465 in Plesk Firewall

**Error: `ETIMEDOUT`**
- **Cause:** Network timeout or firewall blocking
- **Fix:** Increase timeouts and check firewall

**Error: `self signed certificate`**
- **Cause:** TLS certificate validation failing
- **Fix:** Set `SMTP_TLS_REJECT_UNAUTHORIZED=false` (testing only)

**Error: API succeeds but no email received**
- **Cause:** Email accepted by SMTP but not delivered
- **Fix:** Check SMTP server logs, verify recipient email, check spam folder

### Problem: Template Email Works But Custom Email Fails

**Symptom:** Template-based emails (via `/api/messages/blast`) work fine, but custom emails (via `/api/custom-emails/send`) fail in Plesk.

**Cause:** Both services now use the same SMTP configuration with connection pooling. If this issue persists:

1. **Check if both use same SMTP service:**
   ```bash
   # Template emails use: smtpService (smtp.service.ts)
   # Custom emails use: CustomEmailService (custom-email.service.ts)
   # Both now have identical configuration including connection pooling
   ```

2. **Verify custom email service configuration:**
   ```bash
   # Test custom email SMTP connection
   curl -X GET http://your-domain.com/api/custom-emails/test-connection \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Check logs for differences:**
   - Template emails: Check `message.worker.ts` logs
   - Custom emails: Check `custom-email.service.ts` logs
   - Look for different error messages

4. **Ensure both services initialized correctly:**
   - Both should use same environment variables
   - Both should have connection pooling enabled
   - Both should use same timeout settings

---

## 🔴 WhatsApp/Qiscus Issues

### Problem: WhatsApp Messages Not Sending

**Error:** Message status stuck at "processing"

**Solutions:**

```bash
# 1. Check Qiscus credentials
curl http://localhost:3000/api/qiscus/webhook/status | jq

# 2. Verify in .env:
QISCUS_BASE_URL=https://multichannel.qiscus.com
QISCUS_APP_ID=your-app-id
QISCUS_SECRET_KEY=your-secret-key
QISCUS_CHANNEL_ID=your-channel-id

# 3. Test Qiscus API directly
curl -X POST https://multichannel.qiscus.com/api/v2/whatsapp/.../messages \
  -H "qiscus-app-id: $QISCUS_APP_ID" \
  -H "qiscus-secret-key: $QISCUS_SECRET_KEY"

# 4. Check phone number format
# Must be: 62xxx (no + sign, no leading 0)

# 5. Check template approval in Qiscus dashboard
```

### Problem: Webhook Not Receiving Updates

**Symptoms:**

- Message status doesn't update to "sent"
- No webhook logs in database

**Solutions:**

```bash
# 1. Check webhook URL is accessible
curl https://your-domain.com/webhooks/qiscus

# 2. Test webhook locally
curl -X POST http://localhost:3000/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# 3. For development, use ngrok
ngrok http 3000
# Copy HTTPS URL and update .env:
APP_URL=https://abc123.ngrok.io

# 4. Re-register webhook
# Restart application to auto-register

# 5. Check webhook logs
curl 'http://localhost:3000/api/logs/system?limit=20' \
  | jq '.logs[] | select(.message | contains("webhook"))'

# 6. Monitor webhooks in real-time
bash scripts/monitoring/monitor-webhooks.sh
```

---

## 🔴 Backup Issues

### Problem: Backup Fails

**Error:** Backup script returns error

**Solutions:**

```bash
# 1. Check disk space
df -h

# 2. Check database file exists
ls -lh data/logs.db

# 3. Check permissions
chmod 644 data/logs.db
chmod 755 backups/

# 4. Check database not locked
lsof data/logs.db

# 5. Try manual backup
sqlite3 data/logs.db ".backup backups/manual_$(date +%Y%m%d).db"

# 6. Check backup script logs
tail -f logs/backup.log
```

### Problem: Restore Fails

**Solutions:**

```bash
# 1. Check backup file integrity
gunzip -t backups/logs_20251103_100000.db.gz

# 2. Stop application before restore
pm2 stop email-blast-app

# 3. Verify backup is not corrupt
sqlite3 backups/logs_temp.db 'PRAGMA integrity_check;'

# 4. Try restore again
bash scripts/backup/restore-backup.sh 1
```

---

## 🔴 Performance Issues

### Problem: High Memory Usage

**Symptoms:**

- Application using >1GB RAM
- Slow response times
- Out of memory errors

**Solutions:**

```bash
# 1. Check current memory usage
pm2 monit

# 2. Restart application
pm2 restart email-blast-app

# 3. Check for memory leaks
node --inspect dist/index.js
# Open chrome://inspect

# 4. Reduce worker concurrency
# Edit workers: concurrency: 3 (from 5)

# 5. Clean up Redis memory
docker exec email-blast-redis redis-cli FLUSHDB

# 6. Vacuum database
sqlite3 data/logs.db 'VACUUM;'
```

### Problem: Slow API Response

**Symptoms:**

- API takes >3 seconds to respond
- Timeout errors

**Solutions:**

```bash
# 1. Check response times
sqlite3 data/logs.db << 'SQL'
SELECT
  endpoint,
  AVG(response_time_ms) as avg_ms,
  MAX(response_time_ms) as max_ms
FROM api_logs
GROUP BY endpoint
ORDER BY avg_ms DESC
LIMIT 10;
SQL

# 2. Add database indexes (already exist, verify)
sqlite3 data/logs.db '.indexes'

# 3. Optimize database
sqlite3 data/logs.db 'ANALYZE;'

# 4. Check queue size
curl http://localhost:3000/api/messages/stats

# 5. Increase rate limits if needed
# Edit .env:
RATE_LIMIT_MAX_REQUESTS=200
```

---

## 🔴 Testing Issues

### Problem: Tests Failing

**Solutions:**

```bash
# 1. Ensure server is running
curl http://localhost:3000/health

# 2. Ensure Redis is running
docker ps | grep redis

# 3. Clear test data
sqlite3 data/logs.db "DELETE FROM message_logs WHERE recipient_email LIKE '%@test%';"

# 4. Run tests with verbose output
bash -x scripts/testing/test-api.sh

# 5. Check individual endpoints
curl -v http://localhost:3000/api/templates
```

---

## 🔴 Production Issues

### Problem: High Load

**Symptoms:**

- CPU at 100%
- Many requests queuing
- Slow response

**Solutions:**

```bash
# 1. Check system resources
htop

# 2. Scale horizontally (multiple instances)
pm2 start dist/index.js -i 4  # 4 instances

# 3. Add load balancer (nginx)
# See README.md production deployment

# 4. Optimize queue concurrency
# Balance between throughput and CPU usage

# 5. Monitor with PM2
pm2 monit
pm2 logs
```

### Problem: SSL Certificate Issues

**Error:** Certificate expired or invalid

**Solutions:**

```bash
# 1. Check certificate
sudo certbot certificates

# 2. Renew certificate
sudo certbot renew

# 3. Test renewal
sudo certbot renew --dry-run

# 4. Auto-renewal (cron)
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🛠️ Debug Commands

### Comprehensive System Check

```bash
#!/bin/bash
# Save as: debug.sh

echo "=== SYSTEM DEBUG ==="
echo ""

echo "1. Server Status:"
curl -s http://localhost:3000/health | jq || echo "Server not responding"
echo ""

echo "2. Redis Status:"
docker exec email-blast-redis redis-cli ping || echo "Redis not responding"
echo ""

echo "3. Queue Stats:"
curl -s http://localhost:3000/api/messages/stats | jq '.stats' || echo "Queue stats unavailable"
echo ""

echo "4. Database Status:"
sqlite3 data/logs.db "SELECT 'OK' as status;" || echo "Database error"
echo ""

echo "5. Recent Errors:"
tail -20 logs/error.log
echo ""

echo "6. Disk Space:"
df -h | grep -E '^Filesystem|/$'
echo ""

echo "7. Memory Usage:"
free -h
echo ""

echo "8. Process Status:"
ps aux | grep -E 'node|redis' | grep -v grep
echo ""
```

---

## 📞 Getting Help

If you still have issues after trying these solutions:

1. **Check Logs:**

   ```bash
   # Application logs
   tail -100 logs/combined.log
   tail -50 logs/error.log

   # Docker logs
   docker-compose logs --tail=100

   # System logs
   journalctl -u email-blast-app --since "1 hour ago"
   ```

2. **Run Health Check:**

   ```bash
   bash scripts/monitoring/health-check.sh
   ```

3. **Gather Debug Info:**

   ```bash
   bash debug.sh > debug_output.txt
   ```

4. **Contact Support** with:
   - Error message
   - Logs (combined.log, error.log)
   - Health check output
   - System information (OS, Node version, etc.)

---

## 📋 Prevention Checklist

Prevent issues before they happen:

- [ ] Setup automatic backups
- [ ] Configure log rotation
- [ ] Monitor disk space (alert at 80%)
- [ ] Monitor queue size (alert if >1000)
- [ ] Setup health check monitoring
- [ ] Configure alerting (email/Slack)
- [ ] Regular database maintenance (weekly VACUUM)
- [ ] Keep logs for 30 days max
- [ ] Test backup restore monthly
- [ ] Update dependencies regularly

---

Last Updated: November 3, 2025  
Version: 1.0.0
