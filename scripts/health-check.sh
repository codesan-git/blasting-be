#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  System Health Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check service
check_service() {
  local name=$1
  local command=$2
  
  echo -n "Checking $name... "
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
    return 0
  else
    echo -e "${RED}✗ FAILED${NC}"
    return 1
  fi
}

# Function to check and display value
check_value() {
  local name=$1
  local command=$2
  
  echo -n "$name: "
  result=$(eval "$command" 2>/dev/null)
  if [ $? -eq 0 ] && [ -n "$result" ]; then
    echo -e "${GREEN}$result${NC}"
  else
    echo -e "${RED}N/A${NC}"
  fi
}

# 1. Server Health
echo -e "${BLUE}1. Server Status${NC}"
check_service "Server" "curl -f -s http://localhost:3000/health"
echo ""

# 2. Database
echo -e "${BLUE}2. Database${NC}"
check_service "Database connection" "sqlite3 data/logs.db 'SELECT 1;'"
check_value "Total messages" "sqlite3 data/logs.db 'SELECT COUNT(*) FROM message_logs;'"
check_value "Sent messages" "sqlite3 data/logs.db 'SELECT COUNT(*) FROM message_logs WHERE status=\"sent\";'"
check_value "Failed messages" "sqlite3 data/logs.db 'SELECT COUNT(*) FROM message_logs WHERE status=\"failed\";'"
check_value "Queued messages" "sqlite3 data/logs.db 'SELECT COUNT(*) FROM message_logs WHERE status=\"queued\";'"
echo ""

# 3. Redis & Queue
echo -e "${BLUE}3. Queue System${NC}"
check_service "Redis" "docker exec email-blast-redis redis-cli ping | grep -q PONG"

# Get queue stats
STATS=$(curl -s http://localhost:3000/api/messages/stats 2>/dev/null)
if [ $? -eq 0 ]; then
  echo -e "Queue waiting: ${GREEN}$(echo $STATS | jq -r '.stats.waiting // 0')${NC}"
  echo -e "Queue active: ${GREEN}$(echo $STATS | jq -r '.stats.active // 0')${NC}"
  echo -e "Queue completed: ${GREEN}$(echo $STATS | jq -r '.stats.completed // 0')${NC}"
  echo -e "Queue failed: ${YELLOW}$(echo $STATS | jq -r '.stats.failed // 0')${NC}"
else
  echo -e "${RED}Could not fetch queue stats${NC}"
fi
echo ""

# 4. API Logs
echo -e "${BLUE}4. API Logs${NC}"
check_value "Total API requests" "sqlite3 data/logs.db 'SELECT COUNT(*) FROM api_logs;'"
check_value "Requests today" "sqlite3 data/logs.db 'SELECT COUNT(*) FROM api_logs WHERE DATE(created_at) = DATE(\"now\");'"
check_value "Average response time" "sqlite3 data/logs.db 'SELECT ROUND(AVG(response_time_ms), 2) || \" ms\" FROM api_logs WHERE response_time_ms IS NOT NULL;'"
echo ""

# 5. System Logs
echo -e "${BLUE}5. System Logs${NC}"
check_value "Total system logs" "sqlite3 data/logs.db 'SELECT COUNT(*) FROM system_logs;'"
check_value "Errors today" "sqlite3 data/logs.db 'SELECT COUNT(*) FROM system_logs WHERE level=\"error\" AND DATE(created_at) = DATE(\"now\");'"
check_value "Warnings today" "sqlite3 data/logs.db 'SELECT COUNT(*) FROM system_logs WHERE level=\"warn\" AND DATE(created_at) = DATE(\"now\");'"
echo ""

# 6. Success Rate
echo -e "${BLUE}6. Performance Metrics${NC}"
SUCCESS_RATE=$(sqlite3 data/logs.db "
  SELECT ROUND(100.0 * SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2) || '%'
  FROM message_logs
  WHERE status IN ('sent', 'failed');
" 2>/dev/null)

if [ -n "$SUCCESS_RATE" ] && [ "$SUCCESS_RATE" != "%" ]; then
  echo -e "Success rate: ${GREEN}${SUCCESS_RATE}${NC}"
else
  echo -e "Success rate: ${YELLOW}N/A (no data)${NC}"
fi

AVG_TIME=$(sqlite3 data/logs.db "
  SELECT ROUND(AVG(JULIANDAY(updated_at) - JULIANDAY(created_at)) * 86400, 2) || 's'
  FROM message_logs
  WHERE status IN ('sent', 'failed')
    AND created_at >= datetime('now', '-1 hour');
" 2>/dev/null)

if [ -n "$AVG_TIME" ] && [ "$AVG_TIME" != "s" ]; then
  echo -e "Avg processing time: ${GREEN}${AVG_TIME}${NC}"
else
  echo -e "Avg processing time: ${YELLOW}N/A${NC}"
fi
echo ""

# 7. Recent Activity
echo -e "${BLUE}7. Recent Activity (Last 5 messages)${NC}"
sqlite3 data/logs.db << EOF
.mode column
.headers on
SELECT 
  SUBSTR(job_id, 1, 12) || '...' as job_id,
  channel,
  CASE 
    WHEN recipient_email IS NOT NULL THEN SUBSTR(recipient_email, 1, 20)
    WHEN recipient_phone IS NOT NULL THEN recipient_phone
    ELSE 'N/A'
  END as recipient,
  status,
  SUBSTR(created_at, 12, 8) as time
FROM message_logs
ORDER BY created_at DESC
LIMIT 5;
EOF
echo ""

# 8. Health Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Health Summary${NC}"
echo -e "${BLUE}========================================${NC}"

# Calculate health score
HEALTH_SCORE=0
MAX_SCORE=6

# Check 1: Server running
curl -f -s http://localhost:3000/health > /dev/null 2>&1 && ((HEALTH_SCORE++))

# Check 2: Database accessible
sqlite3 data/logs.db 'SELECT 1;' > /dev/null 2>&1 && ((HEALTH_SCORE++))

# Check 3: Redis running
docker exec email-blast-redis redis-cli ping 2>/dev/null | grep -q PONG && ((HEALTH_SCORE++))

# Check 4: Queue working (has processed jobs)
COMPLETED=$(curl -s http://localhost:3000/api/messages/stats 2>/dev/null | jq -r '.stats.completed // 0')
[ "$COMPLETED" -gt 0 ] 2>/dev/null && ((HEALTH_SCORE++))

# Check 5: Success rate > 80%
SUCCESS_NUM=$(sqlite3 data/logs.db "SELECT ROUND(100.0 * SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 0) FROM message_logs WHERE status IN ('sent', 'failed');" 2>/dev/null)
[ -n "$SUCCESS_NUM" ] && [ "$SUCCESS_NUM" -gt 80 ] 2>/dev/null && ((HEALTH_SCORE++))

# Check 6: No critical errors in last hour
ERROR_COUNT=$(sqlite3 data/logs.db "SELECT COUNT(*) FROM system_logs WHERE level='error' AND created_at >= datetime('now', '-1 hour');" 2>/dev/null)
[ "$ERROR_COUNT" -lt 10 ] 2>/dev/null && ((HEALTH_SCORE++))

# Display health status
HEALTH_PERCENT=$((HEALTH_SCORE * 100 / MAX_SCORE))

if [ $HEALTH_PERCENT -ge 80 ]; then
  echo -e "Status: ${GREEN}HEALTHY${NC}"
  echo -e "Score: ${GREEN}${HEALTH_SCORE}/${MAX_SCORE} (${HEALTH_PERCENT}%)${NC}"
elif [ $HEALTH_PERCENT -ge 50 ]; then
  echo -e "Status: ${YELLOW}WARNING${NC}"
  echo -e "Score: ${YELLOW}${HEALTH_SCORE}/${MAX_SCORE} (${HEALTH_PERCENT}%)${NC}"
else
  echo -e "Status: ${RED}CRITICAL${NC}"
  echo -e "Score: ${RED}${HEALTH_SCORE}/${MAX_SCORE} (${HEALTH_PERCENT}%)${NC}"
fi

echo ""
echo -e "${BLUE}💡 Tips:${NC}"
echo "  - Run: npm run dev (to start server)"
echo "  - Run: bash scripts/test-api-complete.sh (to test all APIs)"
echo "  - Run: bash scripts/email-report.sh (for detailed report)"
echo "  - Run: tail -f logs/combined.log (to monitor real-time)"
echo ""