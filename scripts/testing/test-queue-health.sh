#!/bin/bash

# Comprehensive Queue Health Test

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost:3000"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Queue Health Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 1: Check if server is running
echo -e "${BLUE}1. Server Status${NC}"
if curl -f -s $BASE_URL/health > /dev/null 2>&1; then
  echo -e "   ${GREEN}✓ Server is running${NC}"
else
  echo -e "   ${RED}✗ Server is not running${NC}"
  echo -e "   ${YELLOW}Please start: npm run dev${NC}"
  exit 1
fi
echo ""

# Test 2: Check Redis connection
echo -e "${BLUE}2. Redis Status${NC}"
if docker exec email-blast-redis redis-cli ping 2>/dev/null | grep -q PONG; then
  echo -e "   ${GREEN}✓ Redis is connected${NC}"
else
  echo -e "   ${RED}✗ Redis is not connected${NC}"
  echo -e "   ${YELLOW}Please start: docker-compose up -d${NC}"
  exit 1
fi
echo ""

# Test 3: Get initial queue stats
echo -e "${BLUE}3. Initial Queue Statistics${NC}"
INITIAL_STATS=$(curl -s $BASE_URL/api/messages/stats)
echo "$INITIAL_STATS" | jq '.stats'

INITIAL_COMPLETED=$(echo "$INITIAL_STATS" | jq -r '.stats.completed // 0')
INITIAL_FAILED=$(echo "$INITIAL_STATS" | jq -r '.stats.failed // 0')
echo ""

# Test 4: Send test message (Email)
echo -e "${BLUE}4. Sending Test Email Message${NC}"
EMAIL_RESPONSE=$(curl -s -X POST $BASE_URL/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "name": "Queue Test User",
        "email": "test@example.com",
        "variables": {
          "invoiceNumber": "QUEUE-TEST-001",
          "period": "November 2025",
          "amount": "Rp 1,000,000"
        }
      }
    ],
    "channels": ["email"],
    "templateId": "invoicing_testing_v1_2",
    "globalVariables": {
      "companyName": "Queue Test Company"
    },
    "from": "noreply@test.com"
  }')

EMAIL_SUCCESS=$(echo "$EMAIL_RESPONSE" | jq -r '.success')
EMAIL_JOB_ID=$(echo "$EMAIL_RESPONSE" | jq -r '.jobIds[0]')

if [ "$EMAIL_SUCCESS" = "true" ]; then
  echo -e "   ${GREEN}✓ Email message queued${NC}"
  echo -e "   Job ID: ${YELLOW}$EMAIL_JOB_ID${NC}"
else
  echo -e "   ${RED}✗ Failed to queue email${NC}"
  echo "$EMAIL_RESPONSE" | jq
fi
echo ""

# Test 5: Send test message (WhatsApp)
echo -e "${BLUE}5. Sending Test WhatsApp Message${NC}"
WA_RESPONSE=$(curl -s -X POST $BASE_URL/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "name": "Queue Test User",
        "phone": "6281234567890",
        "variables": {
          "invoiceNumber": "QUEUE-TEST-002",
          "period": "November 2025",
          "amount": "Rp 2,000,000"
        }
      }
    ],
    "channels": ["whatsapp"],
    "templateId": "invoicing_testing_v1_2",
    "globalVariables": {
      "companyName": "Queue Test Company"
    }
  }')

WA_SUCCESS=$(echo "$WA_RESPONSE" | jq -r '.success')
WA_JOB_ID=$(echo "$WA_RESPONSE" | jq -r '.jobIds[0]')

if [ "$WA_SUCCESS" = "true" ]; then
  echo -e "   ${GREEN}✓ WhatsApp message queued${NC}"
  echo -e "   Job ID: ${YELLOW}$WA_JOB_ID${NC}"
else
  echo -e "   ${RED}✗ Failed to queue WhatsApp${NC}"
  echo "$WA_RESPONSE" | jq
fi
echo ""

# Test 6: Wait for processing
echo -e "${BLUE}6. Waiting for Queue Processing (10 seconds)${NC}"
for i in {10..1}; do
  echo -ne "   Waiting: ${YELLOW}$i${NC} seconds\r"
  sleep 1
done
echo -e "   ${GREEN}✓ Wait complete${NC}                    "
echo ""

# Test 7: Check queue stats after processing
echo -e "${BLUE}7. Queue Statistics After Processing${NC}"
AFTER_STATS=$(curl -s $BASE_URL/api/messages/stats)
echo "$AFTER_STATS" | jq '.stats'

AFTER_COMPLETED=$(echo "$AFTER_STATS" | jq -r '.stats.completed // 0')
AFTER_FAILED=$(echo "$AFTER_STATS" | jq -r '.stats.failed // 0')
AFTER_WAITING=$(echo "$AFTER_STATS" | jq -r '.stats.waiting // 0')
AFTER_ACTIVE=$(echo "$AFTER_STATS" | jq -r '.stats.active // 0')
echo ""

# Test 8: Calculate processing results
echo -e "${BLUE}8. Processing Results${NC}"
COMPLETED_DIFF=$((AFTER_COMPLETED - INITIAL_COMPLETED))
FAILED_DIFF=$((AFTER_FAILED - INITIAL_FAILED))

echo -e "   Completed: ${GREEN}+$COMPLETED_DIFF${NC}"
echo -e "   Failed: ${RED}+$FAILED_DIFF${NC}"
echo -e "   Waiting: ${YELLOW}$AFTER_WAITING${NC}"
echo -e "   Active: ${BLUE}$AFTER_ACTIVE${NC}"
echo ""

# Test 9: Check database logs
echo -e "${BLUE}9. Database Logs (Last 2 messages)${NC}"
DB_LOGS=$(curl -s "$BASE_URL/api/logs/messages?limit=2")
echo "$DB_LOGS" | jq '.logs[] | {
  job_id,
  channel,
  recipient: (if .recipient_email then .recipient_email else .recipient_phone end),
  status,
  created_at,
  updated_at
}'
echo ""

# Test 10: Performance check
echo -e "${BLUE}10. Queue Performance${NC}"

# Get average processing time
AVG_TIME=$(sqlite3 data/logs.db "
  SELECT ROUND(AVG(JULIANDAY(updated_at) - JULIANDAY(created_at)) * 86400, 2)
  FROM message_logs
  WHERE status IN ('sent', 'failed')
    AND created_at >= datetime('now', '-5 minutes')
" 2>/dev/null)

if [ -n "$AVG_TIME" ] && [ "$AVG_TIME" != "" ]; then
  echo -e "   Avg processing time: ${GREEN}${AVG_TIME}s${NC}"
else
  echo -e "   Avg processing time: ${YELLOW}N/A${NC}"
fi

# Get success rate
SUCCESS_RATE=$(sqlite3 data/logs.db "
  SELECT ROUND(100.0 * SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2)
  FROM message_logs
  WHERE status IN ('sent', 'failed')
" 2>/dev/null)

if [ -n "$SUCCESS_RATE" ] && [ "$SUCCESS_RATE" != "" ]; then
  echo -e "   Success rate: ${GREEN}${SUCCESS_RATE}%${NC}"
else
  echo -e "   Success rate: ${YELLOW}N/A${NC}"
fi
echo ""

# Test 11: Stress test (optional)
echo -e "${BLUE}11. Stress Test (10 messages)${NC}"
read -p "   Run stress test? (y/n): " RUN_STRESS

if [ "$RUN_STRESS" = "y" ]; then
  echo -e "   ${YELLOW}Sending 10 messages...${NC}"
  
  STRESS_RESPONSE=$(curl -s -X POST $BASE_URL/api/messages/blast \
    -H "Content-Type: application/json" \
    -d '{
      "recipients": [
        {"name": "User 1", "email": "user1@test.com"},
        {"name": "User 2", "email": "user2@test.com"},
        {"name": "User 3", "email": "user3@test.com"},
        {"name": "User 4", "email": "user4@test.com"},
        {"name": "User 5", "email": "user5@test.com"},
        {"name": "User 6", "email": "user6@test.com"},
        {"name": "User 7", "email": "user7@test.com"},
        {"name": "User 8", "email": "user8@test.com"},
        {"name": "User 9", "email": "user9@test.com"},
        {"name": "User 10", "email": "user10@test.com"}
      ],
      "channels": ["email"],
      "templateId": "email-welcome-001",
      "globalVariables": {
        "companyName": "Stress Test",
        "date": "2025-11-01"
      },
      "from": "noreply@test.com"
    }')
  
  STRESS_SUCCESS=$(echo "$STRESS_RESPONSE" | jq -r '.success')
  STRESS_TOTAL=$(echo "$STRESS_RESPONSE" | jq -r '.totalMessages')
  
  if [ "$STRESS_SUCCESS" = "true" ]; then
    echo -e "   ${GREEN}✓ $STRESS_TOTAL messages queued${NC}"
    
    echo -e "   ${YELLOW}Waiting 15 seconds for processing...${NC}"
    sleep 15
    
    STRESS_STATS=$(curl -s $BASE_URL/api/messages/stats)
    echo -e "   ${GREEN}✓ Stress test complete${NC}"
    echo "$STRESS_STATS" | jq '.stats'
  else
    echo -e "   ${RED}✗ Stress test failed${NC}"
  fi
else
  echo -e "   ${YELLOW}Skipped${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Queue Health Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

HEALTH_SCORE=0
MAX_SCORE=5

# Check 1: Server running
curl -f -s $BASE_URL/health > /dev/null 2>&1 && ((HEALTH_SCORE++))

# Check 2: Redis connected
docker exec email-blast-redis redis-cli ping 2>/dev/null | grep -q PONG && ((HEALTH_SCORE++))

# Check 3: Messages processed
[ "$COMPLETED_DIFF" -gt 0 ] && ((HEALTH_SCORE++))

# Check 4: No stuck jobs
[ "$AFTER_WAITING" -lt 100 ] && ((HEALTH_SCORE++))

# Check 5: Success rate > 50%
SUCCESS_NUM=$(echo "$SUCCESS_RATE" | cut -d'.' -f1)
[ -n "$SUCCESS_NUM" ] && [ "$SUCCESS_NUM" -gt 50 ] 2>/dev/null && ((HEALTH_SCORE++))

HEALTH_PERCENT=$((HEALTH_SCORE * 100 / MAX_SCORE))

if [ $HEALTH_PERCENT -ge 80 ]; then
  echo -e "Status: ${GREEN}✓ HEALTHY${NC}"
elif [ $HEALTH_PERCENT -ge 60 ]; then
  echo -e "Status: ${YELLOW}⚠ WARNING${NC}"
else
  echo -e "Status: ${RED}✗ CRITICAL${NC}"
fi

echo -e "Score: ${HEALTH_SCORE}/${MAX_SCORE} (${HEALTH_PERCENT}%)"
echo ""

echo -e "${GREEN}✅ Queue health test completed!${NC}"
echo ""

echo -e "${BLUE}Recommendations:${NC}"
echo "• Monitor queue: bash scripts/monitor-realtime.sh"
echo "• Check logs: tail -f logs/combined.log"
echo "• View stats: curl $BASE_URL/api/messages/stats | jq"
echo ""