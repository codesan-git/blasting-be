#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Email & WhatsApp Blast API Test${NC}"
echo -e "${BLUE}  Complete Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if server is running
echo -e "${BLUE}Checking if server is running...${NC}"
if ! curl -s $BASE_URL/health > /dev/null; then
    echo -e "${RED}❌ Server is not running. Please start with: npm run dev${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Test 1: Health Check
echo -e "${BLUE}🏥 Test 1: Health Check${NC}"
curl -s $BASE_URL/health | jq
echo -e "\n"

# Test 2: SMTP Status
echo -e "${BLUE}📧 Test 2: SMTP Status${NC}"
curl -s $BASE_URL/api/smtp/status | jq
echo -e "\n"

# Test 3: Get all templates
echo -e "${BLUE}📋 Test 3: Get All Templates${NC}"
curl -s $BASE_URL/api/templates | jq '{count, templates: .templates[] | {id, name, channel, type, qiscusEnabled: (.qiscusConfig != null)}}'
echo -e "\n"

# Test 4: Get email templates only
echo -e "${BLUE}📋 Test 4: Get Email Templates Only${NC}"
curl -s "$BASE_URL/api/templates?channel=email" | jq '{count, templates: .templates[].name}'
echo -e "\n"

# Test 5: Get WhatsApp templates only
echo -e "${BLUE}📋 Test 5: Get WhatsApp Templates Only${NC}"
curl -s "$BASE_URL/api/templates?channel=whatsapp" | jq '{count, templates: .templates[].name}'
echo -e "\n"

# Test 6: Get specific template (Invoice template with Qiscus)
echo -e "${BLUE}📋 Test 6: Get Invoice Template (Multi-Channel)${NC}"
curl -s $BASE_URL/api/templates/invoicing_testing_v1_2 | jq
echo -e "\n"

# Test 7: Test template rendering
echo -e "${BLUE}🎨 Test 7: Test Template Rendering${NC}"
curl -s -X POST $BASE_URL/api/templates/test-render \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "email-welcome-001",
    "variables": {
      "name": "John Doe",
      "companyName": "TechCorp",
      "email": "john@example.com",
      "date": "2025-11-01"
    }
  }' | jq
echo -e "\n"

# Test 8: Send email blast (single channel)
echo -e "${BLUE}📧 Test 8: Send Email Blast${NC}"
curl -s -X POST $BASE_URL/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "email": "john.doe@example.com",
        "name": "John Doe",
        "variables": {
          "companyName": "TechCorp Indonesia"
        }
      },
      {
        "email": "jane.smith@example.com",
        "name": "Jane Smith",
        "variables": {
          "companyName": "TechCorp Indonesia"
        }
      }
    ],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "globalVariables": {
      "date": "1 November 2025"
    },
    "from": "noreply@techcorp.id"
  }' | jq
echo -e "\n"

sleep 2

# Test 9: Send WhatsApp blast (Qiscus template)
echo -e "${BLUE}💬 Test 9: Send WhatsApp Blast (Qiscus Template)${NC}"
curl -s -X POST $BASE_URL/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "phone": "6281234567890",
        "name": "Ahmad Budiman",
        "variables": {
          "period": "Oktober 2025",
          "invoiceNumber": "INV-2025-001",
          "amount": "Rp 2,500,000"
        }
      },
      {
        "phone": "6289876543210",
        "name": "Siti Nurhaliza",
        "variables": {
          "period": "Oktober 2025",
          "invoiceNumber": "INV-2025-002",
          "amount": "Rp 3,750,000"
        }
      }
    ],
    "channels": ["whatsapp"],
    "templateId": "invoicing_testing_v1_2",
    "globalVariables": {
      "companyName": "PT Tech Indonesia"
    }
  }' | jq
echo -e "\n"

sleep 2

# Test 10: Send multi-channel blast (Email + WhatsApp)
echo -e "${BLUE}📧💬 Test 10: Multi-Channel Blast (Email + WhatsApp)${NC}"
curl -s -X POST $BASE_URL/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "email": "customer@example.com",
        "phone": "6281234567890",
        "name": "Budi Santoso",
        "variables": {
          "period": "Oktober 2025",
          "invoiceNumber": "INV-2025-003",
          "amount": "Rp 5,000,000"
        }
      }
    ],
    "channels": ["email", "whatsapp"],
    "templateId": "invoicing_testing_v1_2",
    "globalVariables": {
      "companyName": "PT Tech Indonesia"
    },
    "from": "billing@techcorp.id"
  }' | jq
echo -e "\n"

sleep 3

# Test 11: Queue statistics
echo -e "${BLUE}📊 Test 11: Queue Statistics${NC}"
curl -s $BASE_URL/api/messages/stats | jq
echo -e "\n"

# Test 12: Dashboard statistics
echo -e "${BLUE}📊 Test 12: Dashboard Statistics${NC}"
curl -s $BASE_URL/api/dashboard | jq '{
  messageStats: .dashboard.messageStats,
  queueStats: .dashboard.queueStats,
  recentLogsCount: (.dashboard.recentLogs | length)
}'
echo -e "\n"

# Test 13: Message logs
echo -e "${BLUE}📝 Test 13: Recent Message Logs${NC}"
curl -s "$BASE_URL/api/logs/messages?limit=5" | jq '{
  count,
  logs: .logs[] | {
    id,
    channel,
    recipient: (if .recipient_email then .recipient_email else .recipient_phone end),
    recipient_name,
    template_name,
    status,
    created_at
  }
}'
echo -e "\n"

# Test 14: Message stats by status
echo -e "${BLUE}📊 Test 14: Message Statistics by Status${NC}"
curl -s $BASE_URL/api/logs/messages/stats | jq
echo -e "\n"

# Test 15: Message stats by date (last 7 days)
echo -e "${BLUE}📊 Test 15: Message Statistics by Date (Last 7 Days)${NC}"
curl -s "$BASE_URL/api/logs/messages/stats/by-date?days=7" | jq
echo -e "\n"

# Test 16: API logs
echo -e "${BLUE}📝 Test 16: Recent API Logs${NC}"
curl -s "$BASE_URL/api/logs/api?limit=5" | jq '{
  count,
  logs: .logs[] | {
    endpoint,
    method,
    response_status,
    response_time_ms,
    created_at
  }
}'
echo -e "\n"

# Test 17: Create custom template
echo -e "${BLUE}➕ Test 17: Create Custom Template${NC}"
curl -s -X POST $BASE_URL/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "id": "custom-promo-001",
    "name": "Flash Sale Promotion",
    "type": "promotion",
    "channel": "email",
    "subject": "🔥 Flash Sale {{discountPercent}}% - {{productName}}",
    "body": "<h1>Halo {{name}}!</h1><p>Jangan lewatkan <strong>Flash Sale {{discountPercent}}%</strong> untuk {{productName}}!</p><p>Gunakan kode: <strong>{{promoCode}}</strong></p><p>Berlaku sampai: {{expiryDate}}</p>",
    "variables": ["name", "discountPercent", "productName", "promoCode", "expiryDate"]
  }' | jq
echo -e "\n"

# Test 18: Use custom template
echo -e "${BLUE}📧 Test 18: Send Blast with Custom Template${NC}"
curl -s -X POST $BASE_URL/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "email": "customer1@example.com",
        "name": "Customer One",
        "variables": {
          "productName": "iPhone 15 Pro"
        }
      },
      {
        "email": "customer2@example.com",
        "name": "Customer Two",
        "variables": {
          "productName": "MacBook Air M3"
        }
      }
    ],
    "channels": ["email"],
    "templateId": "custom-promo-001",
    "globalVariables": {
      "discountPercent": "50",
      "promoCode": "FLASH50",
      "expiryDate": "5 November 2025"
    },
    "from": "promo@shop.id"
  }' | jq
echo -e "\n"

sleep 2

# Test 19: Update template
echo -e "${BLUE}✏️  Test 19: Update Template${NC}"
curl -s -X PUT $BASE_URL/api/templates/custom-promo-001 \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "🎉 Mega Flash Sale {{discountPercent}}% - {{productName}}"
  }' | jq
echo -e "\n"

# Test 20: Validation - Empty recipients
echo -e "${YELLOW}❌ Test 20: Validation - Empty Recipients (Should Fail)${NC}"
curl -s -X POST $BASE_URL/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "from": "test@example.com"
  }' | jq
echo -e "\n"

# Test 21: Validation - Invalid template
echo -e "${YELLOW}❌ Test 21: Validation - Invalid Template (Should Fail)${NC}"
curl -s -X POST $BASE_URL/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [{"email": "test@example.com", "name": "Test"}],
    "channels": ["email"],
    "templateId": "non-existent-template",
    "from": "test@example.com"
  }' | jq
echo -e "\n"

# Test 22: Validation - Channel mismatch
echo -e "${YELLOW}❌ Test 22: Validation - Channel Mismatch (Should Fail)${NC}"
curl -s -X POST $BASE_URL/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [{"phone": "6281234567890", "name": "Test"}],
    "channels": ["whatsapp"],
    "templateId": "email-welcome-001"
  }' | jq
echo -e "\n"

# Test 23: Validation - Missing required field
echo -e "${YELLOW}❌ Test 23: Validation - Missing Email From (Should Fail)${NC}"
curl -s -X POST $BASE_URL/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [{"email": "test@example.com", "name": "Test"}],
    "channels": ["email"],
    "templateId": "email-welcome-001"
  }' | jq
echo -e "\n"

# Test 24: Final queue stats
echo -e "${BLUE}📊 Test 24: Final Queue Statistics${NC}"
curl -s $BASE_URL/api/messages/stats | jq
echo -e "\n"

# Test 25: System logs
echo -e "${BLUE}📝 Test 25: System Logs (Errors only)${NC}"
curl -s "$BASE_URL/api/logs/system?level=error&limit=5" | jq '{
  count,
  logs: .logs[] | {
    level,
    message,
    created_at
  }
}'
echo -e "\n"

# Test 26: Delete custom template
echo -e "${BLUE}🗑️  Test 26: Delete Custom Template${NC}"
curl -s -X DELETE $BASE_URL/api/templates/custom-promo-001 | jq
echo -e "\n"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ All Tests Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${BLUE}📊 Summary:${NC}"
echo "- 26 tests executed"
echo "- Tested: Templates, Email, WhatsApp, Multi-channel, Validations"
echo "- Tested: Queue stats, Logs, Dashboard"
echo ""

echo -e "${BLUE}💡 Next Steps:${NC}"
echo "1. Check logs: tail -f logs/combined.log"
echo "2. View queue: npm run monitor (if available)"
echo "3. Check database: sqlite3 data/logs.db"
echo "4. Monitor Redis: docker exec -it email-blast-redis redis-cli"
echo ""

echo -e "${BLUE}🔍 Useful Commands:${NC}"
echo "# View all message logs:"
echo "curl -s '$BASE_URL/api/logs/messages?limit=50' | jq"
echo ""
echo "# Filter by status:"
echo "curl -s '$BASE_URL/api/logs/messages?status=failed' | jq"
echo ""
echo "# Filter by channel:"
echo "curl -s '$BASE_URL/api/logs/messages?channel=email' | jq"
echo ""
echo "# Get stats by date:"
echo "curl -s '$BASE_URL/api/logs/messages/stats/by-date?days=30' | jq"
echo ""