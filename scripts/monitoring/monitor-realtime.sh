#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to get queue stats
get_queue_stats() {
  curl -s http://localhost:3000/api/messages/stats 2>/dev/null | jq -r '.stats // {}'
}

# Function to get database stats
get_db_stats() {
  sqlite3 data/logs.db "
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM message_logs;
  " 2>/dev/null
}

# Main monitoring loop
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}  Real-time System Monitor${NC}"
echo -e "${BLUE}  Press Ctrl+C to stop${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

while true; do
  clear
  
  # Header with timestamp
  echo -e "${BLUE}=======================================${NC}"
  echo -e "${BLUE}  Real-time Monitor - $(TZ=Asia/Jakarta date '+%Y-%m-%d %H:%M:%S WIB')${NC}"
  echo -e "${BLUE}=======================================${NC}"
  echo ""
  
  # 1. Queue Statistics
  echo -e "${BLUE}📊 Queue Statistics${NC}"
  STATS=$(get_queue_stats)
  
  if [ -n "$STATS" ] && [ "$STATS" != "{}" ]; then
    WAITING=$(echo $STATS | jq -r '.waiting // 0')
    ACTIVE=$(echo $STATS | jq -r '.active // 0')
    COMPLETED=$(echo $STATS | jq -r '.completed // 0')
    FAILED=$(echo $STATS | jq -r '.failed // 0')
    
    echo -e "  Waiting:   ${YELLOW}${WAITING}${NC}"
    echo -e "  Active:    ${GREEN}${ACTIVE}${NC}"
    echo -e "  Completed: ${GREEN}${COMPLETED}${NC}"
    echo -e "  Failed:    ${RED}${FAILED}${NC}"
  else
    echo -e "  ${RED}Could not fetch queue stats${NC}"
  fi
  echo ""
  
  # 2. Database Statistics
  echo -e "${BLUE}💾 Database Statistics${NC}"
  DB_STATS=$(get_db_stats)
  
  if [ -n "$DB_STATS" ]; then
    TOTAL=$(echo $DB_STATS | cut -d'|' -f1)
    QUEUED=$(echo $DB_STATS | cut -d'|' -f2)
    PROCESSING=$(echo $DB_STATS | cut -d'|' -f3)
    SENT=$(echo $DB_STATS | cut -d'|' -f4)
    FAILED=$(echo $DB_STATS | cut -d'|' -f5)
    
    echo -e "  Total:      ${BLUE}${TOTAL}${NC}"
    echo -e "  Queued:     ${YELLOW}${QUEUED}${NC}"
    echo -e "  Processing: ${BLUE}${PROCESSING}${NC}"
    echo -e "  Sent:       ${GREEN}${SENT}${NC}"
    echo -e "  Failed:     ${RED}${FAILED}${NC}"
    
    # Calculate success rate
    if [ "$TOTAL" -gt 0 ]; then
      SUCCESS_RATE=$(echo "scale=2; ($SENT * 100) / ($SENT + $FAILED)" | bc 2>/dev/null)
      if [ -n "$SUCCESS_RATE" ]; then
        echo -e "  Success:    ${GREEN}${SUCCESS_RATE}%${NC}"
      fi
    fi
  else
    echo -e "  ${RED}Could not fetch database stats${NC}"
  fi
  echo ""
  
  # 3. Recent Messages (Last 8)
  echo -e "${BLUE}📬 Recent Messages (Last 8)${NC}"
  sqlite3 data/logs.db << EOF 2>/dev/null
.mode column
.width 15 8 22 10 8
SELECT 
  SUBSTR(job_id, 1, 15) as job_id,
  channel,
  CASE 
    WHEN recipient_email IS NOT NULL THEN SUBSTR(recipient_email, 1, 22)
    WHEN recipient_phone IS NOT NULL THEN recipient_phone
    ELSE 'N/A'
  END as recipient,
  status,
  SUBSTR(created_at, 12, 8) as time
FROM message_logs
ORDER BY created_at DESC
LIMIT 8;
EOF
  echo ""
  
  # 4. System Health
  echo -e "${BLUE}🔧 System Health${NC}"
  
  # Check server
  if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "  Server:    ${GREEN}✓ Running${NC}"
  else
    echo -e "  Server:    ${RED}✗ Down${NC}"
  fi
  
  # Check Redis
  if docker exec email-blast-redis redis-cli ping 2>/dev/null | grep -q PONG; then
    echo -e "  Redis:     ${GREEN}✓ Connected${NC}"
  else
    echo -e "  Redis:     ${RED}✗ Disconnected${NC}"
  fi
  
  # Check Database
  if sqlite3 data/logs.db 'SELECT 1;' > /dev/null 2>&1; then
    echo -e "  Database:  ${GREEN}✓ OK${NC}"
  else
    echo -e "  Database:  ${RED}✗ Error${NC}"
  fi
  
  echo ""
  
  # 5. Recent Errors (if any)
  ERROR_COUNT=$(sqlite3 data/logs.db "SELECT COUNT(*) FROM system_logs WHERE level='error' AND created_at >= datetime('now', '-5 minutes');" 2>/dev/null)
  
  if [ "$ERROR_COUNT" -gt 0 ]; then
    echo -e "${RED}⚠️  Recent Errors (Last 5 minutes): ${ERROR_COUNT}${NC}"
    sqlite3 data/logs.db << EOF 2>/dev/null
.mode column
.width 8 50 19
SELECT 
  level,
  SUBSTR(message, 1, 50) as message,
  SUBSTR(created_at, 1, 19) as time
FROM system_logs
WHERE level IN ('error', 'warn')
  AND created_at >= datetime('now', '-5 minutes')
ORDER BY created_at DESC
LIMIT 3;
EOF
    echo ""
  fi
  
  # 6. Performance
  echo -e "${BLUE}⚡ Performance${NC}"
  
  # API response time
  AVG_RESPONSE=$(sqlite3 data/logs.db "SELECT ROUND(AVG(response_time_ms), 0) FROM api_logs WHERE created_at >= datetime('now', '-5 minutes');" 2>/dev/null)
  if [ -n "$AVG_RESPONSE" ] && [ "$AVG_RESPONSE" != "" ]; then
    echo -e "  Avg API Response: ${GREEN}${AVG_RESPONSE}ms${NC}"
  fi
  
  # Message processing time
  AVG_PROCESS=$(sqlite3 data/logs.db "SELECT ROUND(AVG(JULIANDAY(updated_at) - JULIANDAY(created_at)) * 86400, 1) FROM message_logs WHERE status IN ('sent', 'failed') AND created_at >= datetime('now', '-5 minutes');" 2>/dev/null)
  if [ -n "$AVG_PROCESS" ] && [ "$AVG_PROCESS" != "" ]; then
    echo -e "  Avg Processing:   ${GREEN}${AVG_PROCESS}s${NC}"
  fi
  
  echo ""
  echo -e "${BLUE}=======================================${NC}"
  echo -e "Refreshing in 2 seconds... (Ctrl+C to stop)"
  
  sleep 2
done