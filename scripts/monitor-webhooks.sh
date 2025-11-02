#!/bin/bash

# Real-time Webhook Monitor

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Real-time Webhook Monitor${NC}"
echo -e "${BLUE}  Press Ctrl+C to stop${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

while true; do
  clear
  
  # Header
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}  Webhook Monitor - $(TZ=Asia/Jakarta date '+%Y-%m-%d %H:%M:%S WIB')${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
  
  # 1. Webhook Status
  echo -e "${BLUE}📡 Webhook Registration Status${NC}"
  WEBHOOK_STATUS=$(curl -s http://localhost:3000/api/qiscus/webhook/status 2>/dev/null)
  
  if [ -n "$WEBHOOK_STATUS" ]; then
    CONFIGURED=$(echo "$WEBHOOK_STATUS" | jq -r '.webhook.configured')
    WEBHOOK_URL=$(echo "$WEBHOOK_STATUS" | jq -r '.webhook.currentConfig.url // "Not configured"')
    
    if [ "$CONFIGURED" = "true" ]; then
      echo -e "  Status:     ${GREEN}✓ Configured${NC}"
      echo -e "  URL:        ${GREEN}$WEBHOOK_URL${NC}"
    else
      echo -e "  Status:     ${YELLOW}⚠ Not configured${NC}"
    fi
  else
    echo -e "  Status:     ${RED}✗ Cannot connect to server${NC}"
  fi
  echo ""
  
  # 2. Webhook Events Count
  echo -e "${BLUE}📊 Webhook Statistics (Today)${NC}"
  
  TOTAL_WEBHOOKS=$(sqlite3 data/logs.db "
    SELECT COUNT(*) 
    FROM system_logs 
    WHERE (message LIKE '%webhook%' OR message LIKE '%Received Qiscus%')
      AND DATE(created_at) = DATE('now', '+7 hours')
  " 2>/dev/null)
  
  WEBHOOK_RECEIVED=$(sqlite3 data/logs.db "
    SELECT COUNT(*) 
    FROM system_logs 
    WHERE message LIKE '%Received Qiscus webhook%'
      AND DATE(created_at) = DATE('now', '+7 hours')
  " 2>/dev/null)
  
  STATUS_UPDATES=$(sqlite3 data/logs.db "
    SELECT COUNT(*) 
    FROM system_logs 
    WHERE message LIKE '%Processing message status%'
      AND DATE(created_at) = DATE('now', '+7 hours')
  " 2>/dev/null)
  
  WEBHOOK_ERRORS=$(sqlite3 data/logs.db "
    SELECT COUNT(*) 
    FROM system_logs 
    WHERE level = 'error'
      AND message LIKE '%webhook%'
      AND DATE(created_at) = DATE('now', '+7 hours')
  " 2>/dev/null)
  
  echo -e "  Total Events:     ${GREEN}${TOTAL_WEBHOOKS}${NC}"
  echo -e "  Webhooks Received: ${GREEN}${WEBHOOK_RECEIVED}${NC}"
  echo -e "  Status Updates:    ${GREEN}${STATUS_UPDATES}${NC}"
  
  if [ "$WEBHOOK_ERRORS" -gt 0 ]; then
    echo -e "  Errors:            ${RED}${WEBHOOK_ERRORS}${NC}"
  else
    echo -e "  Errors:            ${GREEN}0${NC}"
  fi
  echo ""
  
  # 3. WhatsApp Message Status
  echo -e "${BLUE}💬 WhatsApp Messages (Today)${NC}"
  sqlite3 data/logs.db << 'EOF' 2>/dev/null
.mode column
.width 12 8 18
SELECT 
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN message_id IS NOT NULL THEN 1 END) as with_msg_id
FROM message_logs
WHERE channel = 'whatsapp'
  AND DATE(created_at) = DATE('now', '+7 hours')
GROUP BY status;
EOF
  echo ""
  
  # 4. Recent Webhook Events (Last 8)
  echo -e "${BLUE}📬 Recent Webhook Events (Last 8)${NC}"
  sqlite3 data/logs.db << 'EOF' 2>/dev/null
.mode column
.width 8 45 19
SELECT 
  level,
  SUBSTR(message, 1, 45) as event,
  SUBSTR(created_at, 1, 19) as time
FROM system_logs
WHERE message LIKE '%webhook%'
  OR message LIKE '%Qiscus%'
  OR message LIKE '%Message sent%'
  OR message LIKE '%Message delivered%'
  OR message LIKE '%Message read%'
ORDER BY created_at DESC
LIMIT 8;
EOF
  echo ""
  
  # 5. Recent Status Updates (Last 5)
  echo -e "${BLUE}🔄 Recent Status Updates (Last 5)${NC}"
  sqlite3 data/logs.db << 'EOF' 2>/dev/null
.mode column
.width 18 12 12 8 19
SELECT 
  SUBSTR(message_id, 1, 18) as msg_id,
  SUBSTR(recipient_phone, -10) as phone,
  status,
  attempts,
  SUBSTR(updated_at, 12, 8) as updated
FROM message_logs
WHERE channel = 'whatsapp'
  AND message_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;
EOF
  echo ""
  
  # 6. Errors (if any)
  if [ "$WEBHOOK_ERRORS" -gt 0 ]; then
    echo -e "${RED}⚠️  Recent Errors:${NC}"
    sqlite3 data/logs.db << 'EOF' 2>/dev/null
.mode column
.width 50 19
SELECT 
  SUBSTR(message, 1, 50) as error,
  SUBSTR(created_at, 1, 19) as time
FROM system_logs
WHERE level = 'error'
  AND message LIKE '%webhook%'
  AND DATE(created_at) = DATE('now', '+7 hours')
ORDER BY created_at DESC
LIMIT 3;
EOF
    echo ""
  fi
  
  # 7. Performance
  echo -e "${BLUE}⚡ Performance${NC}"
  
  AVG_WEBHOOK_TIME=$(sqlite3 data/logs.db "
    SELECT ROUND(AVG(JULIANDAY(updated_at) - JULIANDAY(created_at)) * 86400, 2)
    FROM message_logs
    WHERE channel = 'whatsapp'
      AND message_id IS NOT NULL
      AND status = 'sent'
      AND created_at >= datetime('now', '+7 hours', '-1 hour')
  " 2>/dev/null)
  
  if [ -n "$AVG_WEBHOOK_TIME" ] && [ "$AVG_WEBHOOK_TIME" != "" ]; then
    echo -e "  Avg time to update: ${GREEN}${AVG_WEBHOOK_TIME}s${NC}"
  else
    echo -e "  Avg time to update: ${YELLOW}N/A${NC}"
  fi
  
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo "Refreshing in 3 seconds... (Ctrl+C to stop)"
  
  sleep 3
done