#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost:3000"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Qiscus Webhook Testing${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 1: Check webhook status
echo -e "${BLUE}📊 Test 1: Check Webhook Configuration${NC}"
curl -s $BASE_URL/api/qiscus/webhook/status | jq
echo -e "\n"

# Test 2: Test webhook endpoint
echo -e "${BLUE}🧪 Test 2: Test Webhook Endpoint${NC}"
curl -s -X POST $BASE_URL/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{
    "test": "webhook",
    "timestamp": "2025-11-01T10:00:00Z"
  }' | jq
echo -e "\n"

# Test 3: Simulate message_status webhook (sent)
echo -e "${BLUE}📨 Test 3: Simulate Message Status - SENT${NC}"
curl -s -X POST $BASE_URL/webhooks/qiscus \
  -H "Content-Type: application/json" \
  -d '{
    "type": "message_status",
    "payload": {
      "from": "6281234567890",
      "id": "wamid.test123sent",
      "message_id": "wamid.test123sent",
      "status": "sent",
      "timestamp": "2025-11-01T10:00:00Z",
      "recipient_id": "6281234567890"
    }
  }' | jq
echo -e "\n"

# Test 4: Simulate message_status webhook (delivered)
echo -e "${BLUE}📨 Test 4: Simulate Message Status - DELIVERED${NC}"
curl -s -X POST $BASE_URL/webhooks/qiscus \
  -H "Content-Type: application/json" \
  -d '{
    "type": "message_status",
    "payload": {
      "from": "6281234567890",
      "id": "wamid.test123delivered",
      "message_id": "wamid.test123delivered",
      "status": "delivered",
      "timestamp": "2025-11-01T10:01:00Z",
      "recipient_id": "6281234567890"
    }
  }' | jq
echo -e "\n"

# Test 5: Simulate message_status webhook (read)
echo -e "${BLUE}📨 Test 5: Simulate Message Status - READ${NC}"
curl -s -X POST $BASE_URL/webhooks/qiscus \
  -H "Content-Type: application/json" \
  -d '{
    "type": "message_status",
    "payload": {
      "from": "6281234567890",
      "id": "wamid.test123read",
      "message_id": "wamid.test123read",
      "status": "read",
      "timestamp": "2025-11-01T10:02:00Z",
      "recipient_id": "6281234567890"
    }
  }' | jq
echo -e "\n"

# Test 6: Simulate message_status webhook (failed)
echo -e "${YELLOW}❌ Test 6: Simulate Message Status - FAILED${NC}"
curl -s -X POST $BASE_URL/webhooks/qiscus \
  -H "Content-Type: application/json" \
  -d '{
    "type": "message_status",
    "payload": {
      "from": "6281234567890",
      "id": "wamid.test123failed",
      "message_id": "wamid.test123failed",
      "status": "failed",
      "timestamp": "2025-11-01T10:03:00Z",
      "recipient_id": "6281234567890",
      "error": "Invalid phone number"
    }
  }' | jq
echo -e "\n"

# Test 7: Simulate incoming_message webhook
echo -e "${BLUE}💬 Test 7: Simulate Incoming Message${NC}"
curl -s -X POST $BASE_URL/webhooks/qiscus \
  -H "Content-Type: application/json" \
  -d '{
    "type": "incoming_message",
    "payload": {
      "from": "6281234567890",
      "id": "wamid.incoming123",
      "timestamp": "2025-11-01T10:04:00Z",
      "type": "text",
      "message": {
        "text": "Halo, terima kasih atas informasinya",
        "type": "text"
      }
    }
  }' | jq
echo -e "\n"

# Test 8: Check system logs for webhook events
echo -e "${BLUE}📝 Test 8: Recent Webhook Logs${NC}"
curl -s "$BASE_URL/api/logs/system?limit=10" | jq '.logs[] | select(.message | contains("webhook")) | {level, message, created_at}'
echo -e "\n"

# Test 9: Send actual message and track status
echo -e "${BLUE}📧 Test 9: Send Real Message & Track Status${NC}"
echo "Sending WhatsApp message..."

RESPONSE=$(curl -s -X POST $BASE_URL/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "phone": "6281234567890",
        "name": "Test User",
        "variables": {
          "period": "November 2025",
          "invoiceNumber": "TEST-001",
          "amount": "Rp 1,000,000"
        }
      }
    ],
    "channels": ["whatsapp"],
    "templateId": "invoicing_testing_v1_2",
    "globalVariables": {
      "companyName": "Test Company"
    }
  }')

echo "$RESPONSE" | jq

# Extract job ID
JOB_ID=$(echo "$RESPONSE" | jq -r '.jobIds[0]')

if [ "$JOB_ID" != "null" ] && [ -n "$JOB_ID" ]; then
  echo -e "\n${GREEN}Job ID: $JOB_ID${NC}"
  echo "Waiting for message to be processed..."
  sleep 3
  
  # Check message status
  echo -e "\n${BLUE}Message Status:${NC}"
  curl -s "$BASE_URL/api/logs/messages?limit=1" | jq '.logs[0] | {
    job_id,
    message_id,
    status,
    recipient_phone,
    template_name,
    created_at,
    updated_at
  }'
else
  echo -e "${RED}Failed to send message${NC}"
fi

echo -e "\n"

# Test 10: Webhook statistics
echo -e "${BLUE}📊 Test 10: Message Statistics${NC}"
curl -s $BASE_URL/api/logs/messages/stats | jq '.stats.whatsapp'
echo -e "\n"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ Webhook Tests Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${BLUE}💡 Next Steps:${NC}"
echo "1. Check if webhook URL is accessible: curl $BASE_URL/webhooks/qiscus"
echo "2. Verify webhook registered in Qiscus dashboard"
echo "3. Monitor real webhook events: tail -f logs/combined.log | grep webhook"
echo "4. Check database: sqlite3 data/logs.db 'SELECT * FROM message_logs WHERE message_id IS NOT NULL'"
echo ""

echo -e "${BLUE}🔍 Useful Commands:${NC}"
echo "# Watch webhook events in real-time:"
echo "watch -n 2 'curl -s $BASE_URL/api/logs/system?limit=5 | jq'"
echo ""
echo "# Count webhooks received today:"
echo "sqlite3 data/logs.db \"SELECT COUNT(*) FROM system_logs WHERE message LIKE '%webhook%' AND DATE(created_at) = DATE('now')\""
echo ""