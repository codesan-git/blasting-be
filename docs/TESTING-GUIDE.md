# Comprehensive Testing Guide

## 📋 Cara Memastikan Logging, Queueing, dan Database Bekerja

---

## 🧪 Test 1: Database Logging

### A. Check Database Structure

```bash
# Masuk ke SQLite
sqlite3 data/logs.db

# Check tables
.tables
# Expected: api_logs  message_logs  system_logs

# Check message_logs structure
.schema message_logs

# Exit
.exit
```

### B. Test Manual Insert

```bash
sqlite3 data/logs.db

# Insert test data
INSERT INTO message_logs (
  job_id, channel, recipient_email, recipient_name,
  template_id, template_name, status
) VALUES (
  'test-job-123', 'email', 'test@example.com', 'Test User',
  'test-template', 'Test Template', 'queued'
);

# Verify insert
SELECT * FROM message_logs WHERE job_id = 'test-job-123';

.exit
```

### C. Test via API

```bash
# Send a test message
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "email": "test@example.com",
        "name": "Test User"
      }
    ],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "from": "test@example.com"
  }'

# Check if logged to database
sqlite3 data/logs.db "SELECT * FROM message_logs ORDER BY created_at DESC LIMIT 1;"
```

**Expected Result:**

```
1|job-id-xxx|email|test@example.com||Test User|email-welcome-001|Welcome Email|Welcome to...|queued||1|2025-11-01 10:00:00|2025-11-01 10:00:00
```

---

## 🔄 Test 2: Queue System

### A. Check Redis Connection

```bash
# Test Redis ping
redis-cli ping
# Expected: PONG

# Or if using Docker
docker exec email-blast-redis redis-cli ping
```

### B. Check Queue Keys

```bash
# View all BullMQ keys
redis-cli KEYS "bull:*"
# Or with Docker
docker exec email-blast-redis redis-cli KEYS "bull:*"

# Expected output:
# bull:message-queue:id
# bull:message-queue:wait
# bull:message-queue:active
# bull:message-queue:completed
# bull:message-queue:failed
```

### C. Monitor Queue in Real-time

```bash
# Terminal 1: Monitor Redis
watch -n 1 'docker exec email-blast-redis redis-cli LLEN bull:message-queue:wait'

# Terminal 2: Send messages
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {"email": "user1@example.com", "name": "User 1"},
      {"email": "user2@example.com", "name": "User 2"},
      {"email": "user3@example.com", "name": "User 3"}
    ],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "from": "test@example.com"
  }'
```

**Expected:**

- Wait count increases (3 jobs)
- Wait count decreases as worker processes
- Jobs move to completed

### D. Check Queue Stats via API

```bash
curl http://localhost:3000/api/messages/stats | jq
```

**Expected Response:**

```json
{
  "success": true,
  "stats": {
    "waiting": 0,
    "active": 0,
    "completed": 3,
    "failed": 0
  }
}
```

---

## 📊 Test 3: Complete Flow (End-to-End)

### Script: Complete Flow Test

```bash
#!/bin/bash
# save as: test-complete-flow.sh

echo "🧪 Complete Flow Test"
echo "===================="
echo ""

# 1. Clear old data (optional)
echo "1️⃣ Clearing old test data..."
sqlite3 data/logs.db "DELETE FROM message_logs WHERE recipient_email LIKE '%@test.flow%';"
echo "   ✓ Cleared"
echo ""

# 2. Send test messages
echo "2️⃣ Sending test messages..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "email": "user1@test.flow",
        "name": "Flow Test User 1"
      },
      {
        "email": "user2@test.flow",
        "name": "Flow Test User 2"
      }
    ],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "globalVariables": {
      "companyName": "Test Company",
      "date": "2025-11-01"
    },
    "from": "test@test.flow"
  }')

echo "$RESPONSE" | jq
JOB_IDS=$(echo "$RESPONSE" | jq -r '.jobIds[]')
echo ""

# 3. Wait for processing
echo "3️⃣ Waiting for queue to process (5 seconds)..."
sleep 5
echo "   ✓ Done waiting"
echo ""

# 4. Check queue stats
echo "4️⃣ Queue Statistics:"
curl -s http://localhost:3000/api/messages/stats | jq '.stats'
echo ""

# 5. Check database logs
echo "5️⃣ Database Logs:"
sqlite3 data/logs.db << EOF
.mode column
.headers on
SELECT
  job_id,
  recipient_email,
  status,
  created_at,
  updated_at
FROM message_logs
WHERE recipient_email LIKE '%@test.flow%'
ORDER BY created_at DESC;
EOF
echo ""

# 6. Check message stats
echo "6️⃣ Message Statistics:"
curl -s http://localhost:3000/api/logs/messages/stats | jq '.stats.email'
echo ""

# 7. Check API logs
echo "7️⃣ Recent API Logs:"
sqlite3 data/logs.db << EOF
.mode column
.headers on
SELECT
  endpoint,
  method,
  response_status,
  response_time_ms
FROM api_logs
WHERE endpoint = '/api/messages/blast'
ORDER BY created_at DESC
LIMIT 3;
EOF
echo ""

# 8. Check system logs
echo "8️⃣ Recent System Logs:"
sqlite3 data/logs.db << EOF
.mode column
.headers on
SELECT
  level,
  message,
  created_at
FROM system_logs
ORDER BY created_at DESC
LIMIT 5;
EOF
echo ""

echo "✅ Complete Flow Test Done!"
echo ""
echo "🔍 Verification Checklist:"
echo "  [ ] Messages sent successfully (jobIds returned)"
echo "  [ ] Queue stats show completed jobs"
echo "  [ ] Database has message logs with 'sent' status"
echo "  [ ] API logs recorded the request"
echo "  [ ] System logs show processing events"
```

```bash
# Make executable
chmod +x test-complete-flow.sh

# Run test
./test-complete-flow.sh
```

---

## 🎯 Test 4: Specific Component Tests

### A. Test Logging System

```bash
# 1. Test API Logging
curl http://localhost:3000/health

# Check API logs
sqlite3 data/logs.db "SELECT * FROM api_logs ORDER BY created_at DESC LIMIT 1;"

# Expected: Log entry with endpoint='/health', status=200
```

```bash
# 2. Test System Logging
# System logs are created on important events
# Check recent system logs
curl http://localhost:3000/api/logs/system?limit=10 | jq
```

### B. Test Database Operations

```bash
# Test all CRUD operations
sqlite3 data/logs.db << 'EOF'
.mode column
.headers on

-- Test INSERT (already done by sending message)

-- Test SELECT with filters
SELECT COUNT(*) as total_messages FROM message_logs;
SELECT COUNT(*) as sent_messages FROM message_logs WHERE status = 'sent';
SELECT COUNT(*) as failed_messages FROM message_logs WHERE status = 'failed';

-- Test stats aggregation
SELECT
  channel,
  status,
  COUNT(*) as count
FROM message_logs
GROUP BY channel, status;

-- Test date-based queries
SELECT
  DATE(created_at) as date,
  COUNT(*) as count
FROM message_logs
WHERE created_at >= datetime('now', '-7 days')
GROUP BY DATE(created_at)
ORDER BY date DESC;

EOF
```

### C. Test Worker Processing

```bash
# Monitor worker logs in real-time
tail -f logs/combined.log | grep "Worker\|Processing\|completed\|failed"

# In another terminal, send a message
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [{"email": "worker-test@example.com", "name": "Worker Test"}],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "from": "test@example.com"
  }'

# You should see in logs:
# - "Processing message job"
# - "Email sent successfully" or "simulated"
# - "Worker completed job"
```

---

## 📈 Test 5: Performance & Load Test

### A. Send Multiple Messages

```bash
# Send 100 messages
for i in {1..100}; do
  curl -s -X POST http://localhost:3000/api/messages/blast \
    -H "Content-Type: application/json" \
    -d "{
      \"recipients": [{
        \"email\": \"user${i}@loadtest.com\",
        \"name\": \"Load Test User ${i}\"
      }],
      \"channels\": [\"email\"],
      \"templateId\": \"email-welcome-001\",
      \"from\": \"test@example.com\"
    }" > /dev/null &

  # Rate limit: 10 requests per second
  if [ $((i % 10)) -eq 0 ]; then
    sleep 1
  fi
done

wait

echo "✅ Sent 100 messages"

# Wait for processing
sleep 10

# Check results
curl http://localhost:3000/api/messages/stats | jq
```

### B. Check Processing Speed

```bash
# Calculate average processing time
sqlite3 data/logs.db << 'EOF'
SELECT
  AVG(JULIANDAY(updated_at) - JULIANDAY(created_at)) * 86400 as avg_processing_time_seconds,
  MIN(JULIANDAY(updated_at) - JULIANDAY(created_at)) * 86400 as min_processing_time_seconds,
  MAX(JULIANDAY(updated_at) - JULIANDAY(created_at)) * 86400 as max_processing_time_seconds
FROM message_logs
WHERE status IN ('sent', 'failed')
  AND created_at >= datetime('now', '-1 hour');
EOF
```

---

## 🔍 Test 6: Error Handling

### A. Test Invalid Input

```bash
# 1. Empty recipients
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "from": "test@example.com"
  }' | jq

# Expected: 400 error with validation message
```

```bash
# 2. Invalid template
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [{"email": "test@example.com", "name": "Test"}],
    "channels": ["email"],
    "templateId": "non-existent-template",
    "from": "test@example.com"
  }' | jq

# Expected: 404 error "Template not found"
```

### B. Test Worker Retry Logic

```bash
# Check failed jobs with retry attempts
sqlite3 data/logs.db << 'EOF'
SELECT
  job_id,
  recipient_email,
  status,
  attempts,
  error_message
FROM message_logs
WHERE attempts > 1
ORDER BY created_at DESC
LIMIT 10;
EOF
```

---

## 📊 Test 7: Dashboard & Reports

### A. Test Dashboard API

```bash
curl http://localhost:3000/api/dashboard | jq
```

**Expected Response:**

```json
{
  "success": true,
  "dashboard": {
    "messageStats": [...],
    "messageStatsByDate": [...],
    "queueStats": {
      "waiting": 0,
      "active": 0,
      "completed": 150,
      "failed": 3
    },
    "recentLogs": [...]
  }
}
```

### B. Generate Report

```bash
# Use the email-report.sh script
bash scripts/email-report.sh
```

**Expected Output:**

```
📊 EMAIL BLAST REPORT
====================

📈 OVERVIEW
total_emails  sent  failed  success_rate
100          95    5       95.0%

📧 BY TEMPLATE
template_name       count  success_rate
Welcome Email       50     98.0%
Invoice            30     93.33%

📅 BY DATE
date         emails_sent
2025-11-01   100

❌ RECENT FAILURES
recipient_email          error_message        attempts
user@example.com        SMTP timeout         3
```

---

## ✅ Verification Checklist

### Database ✓

- [ ] Tables created (message_logs, api_logs, system_logs)
- [ ] Indexes working (queries fast)
- [ ] Insert operations successful
- [ ] Update operations successful
- [ ] Select with filters working
- [ ] Aggregation queries working
- [ ] Cleanup function working

### Queue ✓

- [ ] Redis connected
- [ ] Jobs added to queue
- [ ] Workers processing jobs
- [ ] Retry logic working
- [ ] Failed jobs tracked
- [ ] Completed jobs recorded

### Logging ✓

- [ ] API requests logged
- [ ] System events logged
- [ ] Error messages logged
- [ ] Timestamps accurate
- [ ] Log levels correct
- [ ] Database logs persisted

### Integration ✓

- [ ] Send message → Queue → Worker → Database
- [ ] Status updates: queued → processing → sent/failed
- [ ] Error handling graceful
- [ ] Performance acceptable (< 5s per message)
- [ ] No memory leaks
- [ ] Clean shutdown

---

## 🚨 Troubleshooting

### Problem: Queue not processing

```bash
# Check worker is running
ps aux | grep "ts-node\|node" | grep -v grep

# Check Redis connection
redis-cli ping

# Check queue count
docker exec email-blast-redis redis-cli LLEN bull:message-queue:wait

# Restart worker
# Ctrl+C and npm run dev
```

### Problem: Database not logging

```bash
# Check database file exists
ls -lh data/logs.db

# Check permissions
chmod 644 data/logs.db

# Check database not locked
lsof data/logs.db

# Try manual insert
sqlite3 data/logs.db "INSERT INTO system_logs (level, message) VALUES ('info', 'test');"
```

### Problem: High error rate

```bash
# Check recent errors
curl http://localhost:3000/api/logs/messages?status=failed&limit=20 | jq

# Check error patterns
sqlite3 data/logs.db "
  SELECT
    error_message,
    COUNT(*) as count
  FROM message_logs
  WHERE status = 'failed'
  GROUP BY error_message
  ORDER BY count DESC;
"

# Check SMTP status
curl http://localhost:3000/api/smtp/status | jq
```

---

## 📝 Automated Testing Script

Save as `run-all-tests.sh`:

```bash
#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

passed=0
failed=0

test_case() {
  echo -n "Testing: $1... "
  if eval "$2" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((passed++))
  else
    echo -e "${RED}✗ FAILED${NC}"
    ((failed++))
  fi
}

echo "🧪 Running All Tests"
echo "===================="
echo ""

# Test 1: Server health
test_case "Server health" "curl -f http://localhost:3000/health"

# Test 2: Database connection
test_case "Database connection" "sqlite3 data/logs.db 'SELECT 1;'"

# Test 3: Redis connection
test_case "Redis connection" "docker exec email-blast-redis redis-cli ping | grep -q PONG"

# Test 4: Queue stats API
test_case "Queue stats API" "curl -f http://localhost:3000/api/messages/stats"

# Test 5: Send test message
test_case "Send test message" "curl -f -X POST http://localhost:3000/api/messages/blast -H 'Content-Type: application/json' -d '{\"recipients\":[{\"email\":\"test@test.com\",\"name\":\"Test\"}],\"channels\":[\"email\"],\"templateId\":\"email-welcome-001\",\"from\":\"test@test.com\"}'"

# Test 6: Dashboard API
test_case "Dashboard API" "curl -f http://localhost:3000/api/dashboard"

# Test 7: Message logs
test_case "Message logs" "curl -f http://localhost:3000/api/logs/messages?limit=1"

# Test 8: Database has data
test_case "Database has data" "sqlite3 data/logs.db 'SELECT COUNT(*) FROM message_logs;' | grep -v '^0$'"

echo ""
echo "===================="
echo -e "Results: ${GREEN}${passed} passed${NC}, ${RED}${failed} failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed!"
  exit 1
fi
```

```bash
chmod +x run-all-tests.sh
./run-all-tests.sh
```

---

## 🎯 Success Criteria

Sistem dianggap bekerja dengan baik jika:

1. ✅ Semua API endpoints response 200 OK
2. ✅ Queue stats menunjukkan jobs completed > 0
3. ✅ Database logs terisi dengan status 'sent' atau 'failed'
4. ✅ API logs merekam semua requests
5. ✅ System logs tidak ada error kritis
6. ✅ Average processing time < 5 detik
7. ✅ Success rate > 90%
8. ✅ No memory leaks setelah 1000+ messages

---

**Last Updated:** November 1, 2025  
**Version:** 1.0.0
