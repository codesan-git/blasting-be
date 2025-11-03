# Comprehensive Testing Guide

Complete guide to test all components of the Email & WhatsApp Blast application.

---

## 📋 Table of Contents

- [Quick Test](#quick-test)
- [Component Tests](#component-tests)
- [Integration Tests](#integration-tests)
- [Performance Tests](#performance-tests)
- [Security Tests](#security-tests)
- [Automated Testing](#automated-testing)
- [Troubleshooting Tests](#troubleshooting-tests)

---

## ⚡ Quick Test (2 Minutes)

Run this to verify everything works:

```bash
# 1. Health check
bash scripts/monitoring/health-check.sh

# 2. Automated API tests
bash scripts/testing/test-api.sh

# 3. Check results
curl http://localhost:3000/api/messages/stats | jq
```

**Expected Results:**

- ✅ Server running
- ✅ Redis connected
- ✅ Database accessible
- ✅ All API tests pass
- ✅ Queue processing jobs

---

## 🧪 Component Tests

### Test 1: Database Operations

#### 1A. Test Database Structure

```bash
# Connect to SQLite
sqlite3 data/logs.db

# Check tables exist
.tables
# Expected: api_logs  message_logs  system_logs

# Check message_logs schema
.schema message_logs

# Check indexes
.indexes message_logs

# Exit
.exit
```

**Expected Output:**

```sql
CREATE TABLE message_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  ...
);

CREATE INDEX idx_job_id ON message_logs(job_id);
CREATE INDEX idx_status ON message_logs(status);
...
```

#### 1B. Test Database CRUD Operations

```bash
# Test INSERT
sqlite3 data/logs.db << 'SQL'
INSERT INTO message_logs (
  job_id, channel, recipient_email, recipient_name,
  template_id, template_name, status, created_at, updated_at
) VALUES (
  'test-job-001', 'email', 'test@example.com', 'Test User',
  'test-template', 'Test Template', 'queued',
  datetime('now', '+7 hours'), datetime('now', '+7 hours')
);
SQL

# Test SELECT
sqlite3 data/logs.db << 'SQL'
SELECT * FROM message_logs
WHERE job_id = 'test-job-001';
SQL

# Test UPDATE
sqlite3 data/logs.db << 'SQL'
UPDATE message_logs
SET status = 'sent', updated_at = datetime('now', '+7 hours')
WHERE job_id = 'test-job-001';
SQL

# Test DELETE (cleanup)
sqlite3 data/logs.db << 'SQL'
DELETE FROM message_logs
WHERE job_id = 'test-job-001';
SQL
```

#### 1C. Test Database via API

```bash
# Send test message (triggers DB insert)
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {"name": "DB Test", "email": "dbtest@example.com"}
    ],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "globalVariables": {"companyName": "Test", "date": "2025-11-03"},
    "from": "test@example.com"
  }'

# Wait 2 seconds
sleep 2

# Check if logged to database
sqlite3 data/logs.db << 'SQL'
SELECT job_id, status, recipient_email, created_at
FROM message_logs
WHERE recipient_email = 'dbtest@example.com'
ORDER BY created_at DESC
LIMIT 1;
SQL

# Cleanup
sqlite3 data/logs.db "DELETE FROM message_logs WHERE recipient_email = 'dbtest@example.com';"
```

---

### Test 2: Queue System

#### 2A. Test Redis Connection

```bash
# Test Redis ping
docker exec email-blast-redis redis-cli ping
# Expected: PONG

# Check Redis memory
docker exec email-blast-redis redis-cli INFO memory | grep used_memory_human

# Check Redis keys
docker exec email-blast-redis redis-cli KEYS "bull:*"
```

#### 2B. Test Queue Operations

```bash
# Terminal 1: Monitor queue
watch -n 1 'curl -s http://localhost:3000/api/messages/stats | jq .stats'

# Terminal 2: Send messages
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {"name": "Queue Test 1", "email": "queue1@test.com"},
      {"name": "Queue Test 2", "email": "queue2@test.com"},
      {"name": "Queue Test 3", "email": "queue3@test.com"}
    ],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "from": "test@example.com"
  }'

# Observe in Terminal 1:
# - waiting: 3 (initially)
# - active: 1-2 (processing)
# - completed: 3 (after ~2-3 seconds)
```

#### 2C. Test Queue Retry Logic

```bash
# Create invalid SMTP config to force failures
echo "SMTP_PASS=invalid-password" >> .env.test
npm run dev -- --env-file=.env.test

# Send message (will fail)
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [{"name": "Retry Test", "email": "retry@test.com"}],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "from": "test@example.com"
  }'

# Check attempts in database
sqlite3 data/logs.db << 'SQL'
SELECT job_id, status, attempts, error_message
FROM message_logs
WHERE recipient_email = 'retry@test.com';
SQL

# Should show attempts: 3 and status: 'failed'

# Restore correct config
rm .env.test
npm run dev
```

---

### Test 3: SMTP Service

#### 3A. Test SMTP Configuration

```bash
# Check SMTP status
curl http://localhost:3000/api/smtp/status | jq

# Expected response:
# {
#   "success": true,
#   "smtp": {
#     "configured": true,
#     "host": "smtp.gmail.com",
#     "user": "your-email@gmail.com"
#   }
# }
```

#### 3B. Test Email Sending

```bash
# Test with simulation mode (no SMTP configured)
# Should succeed with simulated message ID

curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {"name": "SMTP Test", "email": "smtp-test@example.com"}
    ],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "globalVariables": {"companyName": "Test Co", "date": "2025-11-03"},
    "from": "test@example.com"
  }'

# Check logs
tail -20 logs/combined.log | grep "Email\|SMTP"

# Check database
sqlite3 data/logs.db << 'SQL'
SELECT status, message_id, recipient_email
FROM message_logs
WHERE recipient_email = 'smtp-test@example.com';
SQL
```

#### 3C. Test Real SMTP (if configured)

```bash
# Send to your own email
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {"name": "Your Name", "email": "your-email@gmail.com"}
    ],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "globalVariables": {
      "companyName": "Test Company",
      "date": "2025-11-03"
    },
    "from": "your-email@gmail.com"
  }'

# Check your email inbox!
# Should receive email within seconds
```

---

### Test 4: WhatsApp/Qiscus Service

#### 4A. Test Qiscus Configuration

```bash
# Check Qiscus status
curl http://localhost:3000/api/qiscus/webhook/status | jq

# Expected (if configured):
# {
#   "success": true,
#   "webhook": {
#     "configured": true,
#     "baseUrl": "https://multichannel.qiscus.com",
#     "appId": "your-app-id",
#     ...
#   }
# }
```

#### 4B. Test WhatsApp Sending

```bash
# Test WhatsApp message (simulated if not configured)
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {"name": "WA Test", "phone": "6281234567890"}
    ],
    "channels": ["whatsapp"],
    "templateId": "invoicing_testing_v1_2",
    "globalVariables": {
      "companyName": "Test Co",
      "period": "November 2025",
      "invoiceNumber": "INV-001",
      "amount": "Rp 1,000,000"
    }
  }'

# Check database
sqlite3 data/logs.db << 'SQL'
SELECT status, message_id, recipient_phone
FROM message_logs
WHERE recipient_phone = '6281234567890'
ORDER BY created_at DESC
LIMIT 1;
SQL
```

---

### Test 5: Webhook System

#### 5A. Test Webhook Endpoint

```bash
# Test webhook endpoint is accessible
curl http://localhost:3000/webhooks/qiscus

# Expected:
# {
#   "success": true,
#   "message": "Qiscus webhook endpoint is ready",
#   ...
# }

# Test webhook with mock data
curl -X POST http://localhost:3000/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{
    "test": "webhook",
    "timestamp": "2025-11-03T10:00:00Z"
  }'
```

#### 5B. Simulate Webhook Status Update

```bash
# First, send a WhatsApp message to get message_id
RESPONSE=$(curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [{"name": "Webhook Test", "phone": "6281234567890"}],
    "channels": ["whatsapp"],
    "templateId": "invoicing_testing_v1_2",
    "globalVariables": {"period": "Nov 2025", "invoiceNumber": "001", "amount": "1000000"}
  }')

echo "$RESPONSE" | jq

# Get the message_id from database
MESSAGE_ID=$(sqlite3 data/logs.db "SELECT message_id FROM message_logs WHERE recipient_phone = '6281234567890' ORDER BY created_at DESC LIMIT 1;")

echo "Message ID: $MESSAGE_ID"

# Simulate status webhook
curl -X POST http://localhost:3000/webhooks/qiscus \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"message_status\",
    \"payload\": {
      \"message_id\": \"$MESSAGE_ID\",
      \"status\": \"delivered\",
      \"timestamp\": \"2025-11-03T10:00:00Z\",
      \"from\": \"6281234567890\"
    }
  }"

# Check if status updated
sqlite3 data/logs.db << SQL
SELECT status, message_id, updated_at
FROM message_logs
WHERE message_id = '$MESSAGE_ID';
SQL
```

#### 5C. Test Webhook Monitoring

```bash
# Run webhook monitor
bash scripts/monitoring/monitor-webhooks.sh

# In another terminal, send webhooks
curl -X POST http://localhost:3000/webhooks/qiscus \
  -H "Content-Type: application/json" \
  -d '{
    "type": "message_status",
    "payload": {
      "message_id": "test-123",
      "status": "sent",
      "timestamp": "2025-11-03T10:00:00Z"
    }
  }'

# Check monitor shows webhook received
```

---

### Test 6: Template System

#### 6A. Test Template CRUD

```bash
# List all templates
curl http://localhost:3000/api/templates | jq '.count, .templates[].name'

# Get specific template
curl http://localhost:3000/api/templates/email-welcome-001 | jq

# Create custom template
curl -X POST http://localhost:3000/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-template-001",
    "name": "Test Template",
    "type": "notification",
    "channel": "email",
    "subject": "Test {{name}}",
    "body": "<h1>Hello {{name}}!</h1><p>This is {{message}}</p>",
    "variables": ["name", "message"]
  }'

# Update template
curl -X PUT http://localhost:3000/api/templates/test-template-001 \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Updated: Test {{name}}"
  }'

# Test template rendering
curl -X POST http://localhost:3000/api/templates/test-render \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "test-template-001",
    "variables": {
      "name": "John Doe",
      "message": "This is a test message"
    }
  }' | jq

# Delete template
curl -X DELETE http://localhost:3000/api/templates/test-template-001
```

#### 6B. Test Template Variables

```bash
# Test with all variables
curl -X POST http://localhost:3000/api/templates/test-render \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "invoicing_testing_v1_2",
    "variables": {
      "name": "John Doe",
      "period": "November 2025",
      "invoiceNumber": "INV-999",
      "amount": "Rp 5,000,000",
      "companyName": "Test Company"
    }
  }' | jq '.rendered'

# Test with missing variables (should show {{variable}})
curl -X POST http://localhost:3000/api/templates/test-render \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "invoicing_testing_v1_2",
    "variables": {
      "name": "John Doe"
    }
  }' | jq '.rendered.body' | grep -o "{{[^}]*}}"
```

---

### Test 7: Backup System

#### 7A. Test Manual Backup

```bash
# Create backup
bash scripts/backup/backup-database.sh

# Check backup created
ls -lht backups/ | head -5

# Get backup stats
curl http://localhost:3000/api/backup/stats | jq
```

#### 7B. Test Backup via API

```bash
# Create backup via API
curl -X POST http://localhost:3000/api/backup/create \
  -H "Content-Type: application/json" \
  -d '{"compressed": true}' | jq

# List backups
curl http://localhost:3000/api/backup/list | jq '.backups[] | {filename, size, created}'

# Check backup scheduler status
curl http://localhost:3000/api/backup/scheduler/status | jq
```

#### 7C. Test Backup Restore

```bash
# List available backups
bash scripts/backup/restore-backup.sh

# Test restore (will prompt for confirmation)
# Choose backup #1
bash scripts/backup/restore-backup.sh 1

# Verify data after restore
sqlite3 data/logs.db "SELECT COUNT(*) FROM message_logs;"
```

---

## 🔗 Integration Tests

### Test 8: End-to-End Message Flow

```bash
#!/bin/bash
# Save as: test-e2e-flow.sh

echo "🧪 End-to-End Message Flow Test"
echo "================================="
echo ""

# 1. Clear test data
echo "1️⃣ Cleaning up previous test data..."
sqlite3 data/logs.db "DELETE FROM message_logs WHERE recipient_email LIKE '%@e2etest.com';"
echo "   ✓ Cleaned"
echo ""

# 2. Check initial state
echo "2️⃣ Checking initial state..."
INITIAL_STATS=$(curl -s http://localhost:3000/api/messages/stats)
INITIAL_COMPLETED=$(echo "$INITIAL_STATS" | jq -r '.stats.completed')
echo "   Initial completed jobs: $INITIAL_COMPLETED"
echo ""

# 3. Send test messages
echo "3️⃣ Sending test messages..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "name": "E2E Test User 1",
        "email": "user1@e2etest.com",
        "variables": {"invoiceNumber": "E2E-001", "amount": "1000000"}
      },
      {
        "name": "E2E Test User 2",
        "email": "user2@e2etest.com",
        "variables": {"invoiceNumber": "E2E-002", "amount": "2000000"}
      }
    ],
    "channels": ["email"],
    "templateId": "invoicing_testing_v1_2",
    "globalVariables": {
      "companyName": "E2E Test Company",
      "period": "November 2025"
    },
    "from": "test@e2etest.com"
  }')

echo "$RESPONSE" | jq
JOB_IDS=$(echo "$RESPONSE" | jq -r '.jobIds[]')
echo "   Job IDs: $JOB_IDS"
echo ""

# 4. Wait for processing
echo "4️⃣ Waiting for queue to process (5 seconds)..."
for i in {5..1}; do
  echo -ne "   $i...\r"
  sleep 1
done
echo "   ✓ Done waiting"
echo ""

# 5. Check queue stats
echo "5️⃣ Queue Statistics After Processing:"
FINAL_STATS=$(curl -s http://localhost:3000/api/messages/stats)
echo "$FINAL_STATS" | jq '.stats'
FINAL_COMPLETED=$(echo "$FINAL_STATS" | jq -r '.stats.completed')
PROCESSED=$((FINAL_COMPLETED - INITIAL_COMPLETED))
echo "   Processed in this test: $PROCESSED"
echo ""

# 6. Check database logs
echo "6️⃣ Database Logs:"
sqlite3 data/logs.db << 'SQL'
.mode column
.headers on
SELECT
  job_id,
  recipient_email,
  status,
  message_id,
  attempts,
  SUBSTR(created_at, 1, 19) as created,
  SUBSTR(updated_at, 1, 19) as updated
FROM message_logs
WHERE recipient_email LIKE '%@e2etest.com'
ORDER BY created_at DESC;
SQL
echo ""

# 7. Verify all steps completed
echo "7️⃣ Verification:"
SENT_COUNT=$(sqlite3 data/logs.db "SELECT COUNT(*) FROM message_logs WHERE recipient_email LIKE '%@e2etest.com' AND status='sent';")
FAILED_COUNT=$(sqlite3 data/logs.db "SELECT COUNT(*) FROM message_logs WHERE recipient_email LIKE '%@e2etest.com' AND status='failed';")

echo "   Sent: $SENT_COUNT"
echo "   Failed: $FAILED_COUNT"

if [ "$SENT_COUNT" -eq 2 ]; then
  echo "   ✅ All messages sent successfully!"
else
  echo "   ⚠️  Some messages failed"
fi
echo ""

# 8. Check API logs
echo "8️⃣ API Logs:"
sqlite3 data/logs.db << 'SQL'
SELECT
  endpoint,
  method,
  response_status,
  response_time_ms
FROM api_logs
WHERE endpoint = '/api/messages/blast'
ORDER BY created_at DESC
LIMIT 1;
SQL
echo ""

# 9. Check system logs for errors
echo "9️⃣ Recent System Errors:"
ERROR_COUNT=$(sqlite3 data/logs.db "SELECT COUNT(*) FROM system_logs WHERE level='error' AND created_at >= datetime('now', '-1 minute');")
echo "   Errors in last minute: $ERROR_COUNT"

if [ "$ERROR_COUNT" -gt 0 ]; then
  sqlite3 data/logs.db << 'SQL'
SELECT level, message, created_at
FROM system_logs
WHERE level='error'
  AND created_at >= datetime('now', '-1 minute')
ORDER BY created_at DESC;
SQL
fi
echo ""

# 10. Summary
echo "========================================="
echo "✅ End-to-End Test Complete!"
echo "========================================="
echo ""
echo "📊 Summary:"
echo "  - Messages sent: 2"
echo "  - Messages delivered: $SENT_COUNT"
echo "  - Queue processed: $PROCESSED jobs"
echo "  - Errors: $ERROR_COUNT"
echo ""

# Cleanup
echo "🧹 Cleanup:"
read -p "Delete test data? (y/n): " CLEANUP
if [ "$CLEANUP" = "y" ]; then
  sqlite3 data/logs.db "DELETE FROM message_logs WHERE recipient_email LIKE '%@e2etest.com';"
  echo "   ✓ Test data deleted"
fi
echo ""
```

```bash
# Make executable and run
chmod +x test-e2e-flow.sh
bash test-e2e-flow.sh
```

---

### Test 9: Multi-Channel Test

```bash
# Test sending to both email and WhatsApp
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "name": "Multi-Channel User",
        "email": "multi@test.com",
        "phone": "6281234567890",
        "variables": {
          "invoiceNumber": "MULTI-001",
          "amount": "Rp 3,000,000"
        }
      }
    ],
    "channels": ["email", "whatsapp"],
    "templateId": "invoicing_testing_v1_2",
    "globalVariables": {
      "companyName": "Multi Test Co",
      "period": "November 2025"
    },
    "from": "multi@test.com"
  }'

# Wait for processing
sleep 3

# Check both channels in database
sqlite3 data/logs.db << 'SQL'
SELECT
  channel,
  COALESCE(recipient_email, recipient_phone) as recipient,
  status,
  message_id
FROM message_logs
WHERE recipient_email = 'multi@test.com'
   OR recipient_phone = '6281234567890'
ORDER BY created_at DESC
LIMIT 2;
SQL
```

---

## ⚡ Performance Tests

### Test 10: Load Test

```bash
#!/bin/bash
# Save as: test-load.sh

echo "⚡ Load Test - Sending 100 messages"
echo "===================================="
echo ""

START_TIME=$(date +%s)

# Send 100 messages (10 per second to respect rate limit)
for i in {1..100}; do
  curl -s -X POST http://localhost:3000/api/messages/blast \
    -H "Content-Type: application/json" \
    -d "{
      \"recipients\": [{
        \"name\": \"Load Test User $i\",
        \"email\": \"loadtest$i@test.com\"
      }],
      \"channels\": [\"email\"],
      \"templateId\": \"email-welcome-001\",
      \"globalVariables\": {
        \"companyName\": \"Load Test\",
        \"date\": \"2025-11-03\"
      },
      \"from\": \"loadtest@test.com\"
    }" > /dev/null &

  # Rate limit: 10 requests per second
  if [ $((i % 10)) -eq 0 ]; then
    echo "Sent $i messages..."
    sleep 1
  fi
done

wait

END_TIME=$(date +%s)
SEND_DURATION=$((END_TIME - START_TIME))

echo ""
echo "✓ All messages queued in ${SEND_DURATION}s"
echo ""
echo "Waiting for processing (30 seconds)..."
sleep 30

# Check results
STATS=$(curl -s http://localhost:3000/api/messages/stats)
echo ""
echo "Queue Statistics:"
echo "$STATS" | jq '.stats'

# Database stats
sqlite3 data/logs.db << 'SQL'
SELECT
  status,
  COUNT(*) as count
FROM message_logs
WHERE recipient_email LIKE 'loadtest%@test.com'
GROUP BY status;
SQL

# Calculate success rate
TOTAL=$(sqlite3 data/logs.db "SELECT COUNT(*) FROM message_logs WHERE recipient_email LIKE 'loadtest%@test.com';")
SUCCESS=$(sqlite3 data/logs.db "SELECT COUNT(*) FROM message_logs WHERE recipient_email LIKE 'loadtest%@test.com' AND status='sent';")
SUCCESS_RATE=$(echo "scale=2; ($SUCCESS * 100) / $TOTAL" | bc)

echo ""
echo "📊 Results:"
echo "  Total sent: 100"
echo "  Successful: $SUCCESS"
echo "  Success rate: ${SUCCESS_RATE}%"
echo "  Time to send: ${SEND_DURATION}s"
echo "  Rate: $(echo "scale=2; 100 / $SEND_DURATION" | bc) msg/s"
echo ""

# Cleanup
read -p "Delete test data? (y/n): " CLEANUP
if [ "$CLEANUP" = "y" ]; then
  sqlite3 data/logs.db "DELETE FROM message_logs WHERE recipient_email LIKE 'loadtest%@test.com';"
  echo "✓ Test data deleted"
fi
```

```bash
chmod +x test-load.sh
bash test-load.sh
```

---

### Test 11: Stress Test

```bash
# Test with 500 concurrent requests
# WARNING: This may overwhelm the system

echo "Running stress test..."

# Use GNU parallel if available
if command -v parallel &> /dev/null; then
  seq 1 500 | parallel -j 50 "
    curl -s -X POST http://localhost:3000/api/messages/blast \
      -H 'Content-Type: application/json' \
      -d '{
        \"recipients\": [{\"name\": \"Stress {}\", \"email\": \"stress{}@test.com\"}],
        \"channels\": [\"email\"],
        \"templateId\": \"email-welcome-001\",
        \"from\": \"stress@test.com\"
      }' > /dev/null
  "
else
  # Fallback to basic loop
  for i in {1..500}; do
    curl -s -X POST http://localhost:3000/api/messages/blast \
      -H "Content-Type: application/json" \
      -d "{
        \"recipients\": [{\"name\": \"Stress $i\", \"email\": \"stress$i@test.com\"}],
        \"channels\": [\"email\"],
        \"templateId\": \"email-welcome-001\",
        \"from\": \"stress@test.com\"
      }" > /dev/null &
  done
  wait
fi

echo "Stress test complete. Check system health:"
bash scripts/monitoring/health-check.sh
```

---

## 🔒 Security Tests

### Test 12: Rate Limiting

```bash
# Test API rate limit (100 requests per 15 min)
echo "Testing rate limiting..."

for i in {1..105}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/templates)
  echo "Request $i: HTTP $STATUS"

  if [ "$STATUS" = "429" ]; then
    echo "✓ Rate limit working! Got 429 after $i requests"
    break
  fi

  sleep 0.1
done
```

### Test 13: Input Validation

```bash
# Test with invalid inputs

# 1. Empty recipients
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "from": "test@example.com"
  }'
# Expected: 400 error

# 2. Invalid email format
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [{"name": "Test", "email": "invalid-email"}],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "from": "test@example.com"
  }'

# 3. Non-existent template
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [{"name": "Test", "email": "test@example.com"}],
    "channels": ["email"],
    "templateId": "non-existent",
    "from": "test@example.com"
  }'
# Expected: 404 error

# 4. Missing required field
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [{"name": "Test", "email": "test@example.com"}],
    "channels": ["email"],
    "templateId": "email-welcome-001"
  }'
# Expected: 400 error (missing 'from')
```

---

## 🤖 Automated Testing

### Test 14: Complete Test Suite

```bash
# Run complete automated test suite
bash scripts/testing/test-api.sh

# This runs 26+ tests including:
# - Template operations
# - Email sending
# - WhatsApp sending
# - Multi-channel
# - Validations
# - Queue stats
# - Dashboard
```

### Test 15: Queue Health Test

```bash
# Test queue system health
bash scripts/testing/test-queue-health.sh

# Tests:
# - Server connectivity
# - Redis connection
# - Queue operations
# - Message processing
# - Performance metrics
```

### Test 16: Webhook Test

```bash
# Test webhook system
bash scripts/testing/test-webhook.sh

# Tests:
# - Webhook configuration
# - Status updates (sent, delivered, read, failed)
# - Incoming messages
# - Database integration
```

---

## 🐛 Troubleshooting Tests

### Test 17: Debug Failing Tests

```bash
#!/bin/bash
# Save as: debug-test.sh

echo "🔍 Debug Test Runner"
echo "===================="
echo ""

# Function to test and report
test_component() {
  local name=$1
  local command=$2

  echo -n "Testing $name... "
  if eval "$command" > /dev/null 2>&1; then
    echo "✅ PASS"
    return 0
  else
    echo "❌ FAIL"
    echo "   Command: $command"
    echo "   Running with verbose output:"
    eval "$command"
    echo ""
    return 1
  fi
}

# Test each component
test_component "Server Health" "curl -f http://localhost:3000/health"
test_component "Redis Connection" "docker exec email-blast-redis redis-cli ping | grep -q PONG"
test_component "Database Access" "sqlite3 data/logs.db 'SELECT 1;'"
test_component "Queue Stats API" "curl -f -s http://localhost:3000/api/messages/stats"
test_component "Templates API" "curl -f -s http://localhost:3000/api/templates"
test_component "Dashboard API" "curl -f -s http://localhost:3000/api/dashboard"

echo ""
echo "Debug complete!"
```

```bash
chmod +x debug-test.sh
bash debug-test.sh
```

### Test 18: Verify All Services

```bash
#!/bin/bash
# Comprehensive service verification

echo "🔍 Service Verification"
echo "======================="
echo ""

# 1. Check server is running
echo "1. Server Status:"
if curl -f -s http://localhost:3000/health > /dev/null; then
  echo "   ✅ Server is running"
  curl -s http://localhost:3000/health | jq
else
  echo "   ❌ Server is not running"
  echo "   Solution: npm run dev"
fi
echo ""

# 2. Check Redis
echo "2. Redis Status:"
if docker exec email-blast-redis redis-cli ping 2>/dev/null | grep -q PONG; then
  echo "   ✅ Redis is connected"
  docker exec email-blast-redis redis-cli INFO server | grep redis_version
else
  echo "   ❌ Redis is not connected"
  echo "   Solution: docker-compose up -d redis"
fi
echo ""

# 3. Check Database
echo "3. Database Status:"
if [ -f "data/logs.db" ]; then
  echo "   ✅ Database file exists"
  DB_SIZE=$(du -h data/logs.db | cut -f1)
  echo "   Size: $DB_SIZE"

  # Check tables
  TABLES=$(sqlite3 data/logs.db ".tables")
  echo "   Tables: $TABLES"

  # Check record count
  MSG_COUNT=$(sqlite3 data/logs.db "SELECT COUNT(*) FROM message_logs;")
  echo "   Message logs: $MSG_COUNT"
else
  echo "   ❌ Database file not found"
  echo "   Solution: Database will be created on first run"
fi
echo ""

# 4. Check Queue
echo "4. Queue Status:"
QUEUE_STATS=$(curl -s http://localhost:3000/api/messages/stats)
if [ $? -eq 0 ]; then
  echo "   ✅ Queue is accessible"
  echo "$QUEUE_STATS" | jq '.stats'
else
  echo "   ❌ Queue not accessible"
fi
echo ""

# 5. Check SMTP
echo "5. SMTP Status:"
SMTP_STATUS=$(curl -s http://localhost:3000/api/smtp/status)
if [ $? -eq 0 ]; then
  CONFIGURED=$(echo "$SMTP_STATUS" | jq -r '.smtp.configured')
  if [ "$CONFIGURED" = "true" ]; then
    echo "   ✅ SMTP configured"
    echo "$SMTP_STATUS" | jq '.smtp'
  else
    echo "   ⚠️  SMTP not configured (simulation mode)"
  fi
else
  echo "   ❌ SMTP status not available"
fi
echo ""

# 6. Check Qiscus
echo "6. Qiscus Status:"
QISCUS_STATUS=$(curl -s http://localhost:3000/api/qiscus/webhook/status)
if [ $? -eq 0 ]; then
  CONFIGURED=$(echo "$QISCUS_STATUS" | jq -r '.webhook.configured')
  if [ "$CONFIGURED" = "true" ]; then
    echo "   ✅ Qiscus configured"
    echo "$QISCUS_STATUS" | jq '.webhook'
  else
    echo "   ⚠️  Qiscus not configured (simulation mode)"
  fi
else
  echo "   ❌ Qiscus status not available"
fi
echo ""

# 7. Check Logs
echo "7. Logs Status:"
if [ -d "logs" ]; then
  echo "   ✅ Logs directory exists"
  if [ -f "logs/combined.log" ]; then
    LOG_SIZE=$(du -h logs/combined.log | cut -f1)
    LOG_LINES=$(wc -l < logs/combined.log)
    echo "   Combined log: $LOG_SIZE ($LOG_LINES lines)"
  fi
  if [ -f "logs/error.log" ]; then
    ERROR_SIZE=$(du -h logs/error.log | cut -f1)
    ERROR_LINES=$(wc -l < logs/error.log)
    echo "   Error log: $ERROR_SIZE ($ERROR_LINES lines)"
  fi
else
  echo "   ⚠️  Logs directory not found"
fi
echo ""

# 8. Check Backups
echo "8. Backup Status:"
if [ -d "backups" ]; then
  BACKUP_COUNT=$(ls -1 backups/*.db* 2>/dev/null | wc -l)
  if [ "$BACKUP_COUNT" -gt 0 ]; then
    echo "   ✅ Backup directory exists"
    echo "   Backups found: $BACKUP_COUNT"
    LATEST=$(ls -t backups/*.db* 2>/dev/null | head -1)
    if [ -n "$LATEST" ]; then
      echo "   Latest: $(basename $LATEST)"
    fi
  else
    echo "   ⚠️  No backups found"
  fi
else
  echo "   ⚠️  Backup directory not found"
fi
echo ""

# Summary
echo "======================="
echo "✅ Verification Complete"
echo "======================="
```

---

## 📊 Test Reports

### Test 19: Generate Test Report

```bash
#!/bin/bash
# Save as: generate-test-report.sh

REPORT_FILE="test-report-$(date +%Y%m%d-%H%M%S).txt"

{
  echo "=========================================="
  echo "TEST REPORT"
  echo "Generated: $(date)"
  echo "=========================================="
  echo ""

  echo "1. SYSTEM HEALTH"
  echo "----------------"
  bash scripts/monitoring/health-check.sh
  echo ""

  echo "2. DATABASE STATISTICS"
  echo "---------------------"
  sqlite3 data/logs.db << 'SQL'
SELECT
  'Total Messages' as metric,
  COUNT(*) as value
FROM message_logs
UNION ALL
SELECT
  'Sent Messages',
  COUNT(*)
FROM message_logs
WHERE status = 'sent'
UNION ALL
SELECT
  'Failed Messages',
  COUNT(*)
FROM message_logs
WHERE status = 'failed'
UNION ALL
SELECT
  'Success Rate',
  ROUND(100.0 * SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) / COUNT(*), 2)
FROM message_logs
WHERE status IN ('sent', 'failed');
SQL
  echo ""

  echo "3. QUEUE STATISTICS"
  echo "------------------"
  curl -s http://localhost:3000/api/messages/stats | jq '.stats'
  echo ""

  echo "4. API PERFORMANCE"
  echo "-----------------"
  sqlite3 data/logs.db << 'SQL'
SELECT
  endpoint,
  COUNT(*) as requests,
  ROUND(AVG(response_time_ms), 2) as avg_ms,
  MAX(response_time_ms) as max_ms
FROM api_logs
GROUP BY endpoint
ORDER BY requests DESC
LIMIT 10;
SQL
  echo ""

  echo "5. RECENT ERRORS"
  echo "---------------"
  sqlite3 data/logs.db << 'SQL'
SELECT
  level,
  message,
  created_at
FROM system_logs
WHERE level IN ('error', 'warn')
ORDER BY created_at DESC
LIMIT 10;
SQL
  echo ""

  echo "6. SMTP STATUS"
  echo "-------------"
  curl -s http://localhost:3000/api/smtp/status | jq
  echo ""

  echo "7. WEBHOOK STATUS"
  echo "----------------"
  curl -s http://localhost:3000/api/qiscus/webhook/status | jq
  echo ""

  echo "=========================================="
  echo "END OF REPORT"
  echo "=========================================="

} > "$REPORT_FILE"

echo "✅ Report generated: $REPORT_FILE"
cat "$REPORT_FILE"
```

```bash
chmod +x generate-test-report.sh
bash generate-test-report.sh
```

---

## ✅ Test Success Criteria

Your application passes all tests if:

### Critical (Must Pass)

- [x] Server responds to `/health` with 200
- [x] Redis PING returns PONG
- [x] Database queries execute successfully
- [x] Queue accepts and processes jobs
- [x] Messages are logged to database
- [x] API endpoints return expected responses

### Important (Should Pass)

- [x] SMTP connection verified (if configured)
- [x] Webhooks receive and process updates
- [x] Templates render correctly
- [x] Backups create successfully
- [x] Success rate > 90%
- [x] Average response time < 3s

### Optional (Nice to Have)

- [x] Load test handles 100+ messages
- [x] Rate limiting works correctly
- [x] Monitoring scripts execute
- [x] Reports generate successfully

---

## 📋 Pre-Deployment Testing Checklist

Before deploying to production:

### Functional Tests

- [ ] All API endpoints tested
- [ ] Email sending works (SMTP configured)
- [ ] WhatsApp sending works (Qiscus configured)
- [ ] Webhooks receiving updates
- [ ] Templates rendering correctly
- [ ] Queue processing jobs
- [ ] Database logging working
- [ ] Backups creating successfully

### Performance Tests

- [ ] Load test with 100 messages passes
- [ ] Response time < 3 seconds
- [ ] Success rate > 95%
- [ ] No memory leaks after 1000 messages
- [ ] Queue doesn't back up under load

### Security Tests

- [ ] Rate limiting working
- [ ] Input validation working
- [ ] Credentials not exposed in logs
- [ ] HTTPS configured (production)
- [ ] Environment variables secure

### Integration Tests

- [ ] End-to-end flow works
- [ ] Multi-channel sending works
- [ ] Webhook integration works
- [ ] Backup restore works
- [ ] Monitoring works

### Documentation

- [ ] All docs updated
- [ ] API documentation accurate
- [ ] Setup guide works
- [ ] Troubleshooting guide helpful

---

## 🚀 Continuous Testing

### Daily Tests (Automated)

```bash
# Add to crontab
0 9 * * * cd /path/to/app && bash scripts/testing/daily-test.sh

# scripts/testing/daily-test.sh:
#!/bin/bash
{
  echo "Daily Test - $(date)"
  bash scripts/monitoring/health-check.sh
  bash generate-test-report.sh
} | mail -s "Daily Test Report" admin@example.com
```

### Weekly Tests (Manual)

```bash
# Every Monday
- Run full test suite
- Review error logs
- Check backup integrity
- Verify SMTP/Qiscus credentials
- Update dependencies
```

### Monthly Tests (Comprehensive)

```bash
# First day of month
- Full end-to-end test
- Load testing
- Security audit
- Backup restore test
- Performance benchmarking
- Documentation review
```

---

## 📞 Support

If tests fail:

1. **Check logs:**

   ```bash
   tail -100 logs/error.log
   ```

2. **Run debug script:**

   ```bash
   bash debug-test.sh
   ```

3. **Verify services:**

   ```bash
   bash scripts/monitoring/health-check.sh
   ```

4. **Review troubleshooting:**
   See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

5. **Generate report:**
   ```bash
   bash generate-test-report.sh
   ```

---

## 📚 Additional Resources

- **API Testing:** [API-DOCUMENTATION.md](API-DOCUMENTATION.md)
- **Webhook Testing:** [WEBHOOK-INTEGRATION.md](WEBHOOK-INTEGRATION.md)
- **SMTP Testing:** [SMTP-CONFIGURATION.md](SMTP-CONFIGURATION.md)
- **Performance:** [TECHNICAL-ARCHITECTURE.md](TECHNICAL-ARCHITECTURE.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 🎯 Summary

### Test Categories

| Category          | Tests | Priority | Time   |
| ----------------- | ----- | -------- | ------ |
| Quick Test        | 1     | P0       | 2 min  |
| Component Tests   | 7     | P1       | 15 min |
| Integration Tests | 3     | P2       | 10 min |
| Performance Tests | 2     | P2       | 15 min |
| Security Tests    | 2     | P1       | 5 min  |
| Automated Tests   | 3     | P0       | 5 min  |
| Troubleshooting   | 2     | P3       | 5 min  |
| Reports           | 1     | P3       | 2 min  |

**Total:** 21 comprehensive tests covering all aspects

---

Last Updated: November 3, 2025  
Version: 1.0.0
