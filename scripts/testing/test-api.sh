#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Email & WhatsApp Blast API Test${NC}"
echo -e "${BLUE}  Complete Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if server is running
echo -e "${BLUE}Checking if server is running...${NC}"
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ Server is not running. Please start with: npm run dev${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Test 1: Get all templates
echo -e "${BLUE}📋 Test 1: Get All Templates${NC}"
curl -s http://localhost:3000/api/templates | jq '.templates[] | {id, name, channel, type}'
echo ""

# Test 2: Get email templates only
echo -e "${BLUE}📋 Test 2: Get Email Templates Only${NC}"
curl -s http://localhost:3000/api/templates?channel=email | jq '.count, .templates[].name'
echo ""

# Test 3: Get specific template
echo -e "${BLUE}📋 Test 3: Get Invoice Template (Multi-Channel)${NC}"
curl -s http://localhost:3000/api/templates/invoicing_testing_v1_2 | jq
echo ""

# Test 4: Send email blast (single recipient)
echo -e "${BLUE}📧 Test 4: Send Email Blast (Single Recipient)${NC}"
curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "name": "Satria",
        "email": "satria.agung@mmdn.co.id",
        "variables": {
          "invoiceNumber": "INV-TEST-001",
          "period": "November 2025",
          "amount": "Rp 1,500,000"
        }
      }
    ],
    "channels": ["email"],
    "templateId": "invoicing_testing_v1_2",
    "globalVariables": {
      "companyName": "PT Multi Media Digital Nusantara"
    },
    "from": "satrianugrahacode@gmail.com"
  }' | jq
echo ""

sleep 2

# Test 5: Send WhatsApp blast (single recipient)
echo -e "${BLUE}💬 Test 5: Send WhatsApp Blast (Single Recipient)${NC}"
curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "name": "Satria",
        "phone": "6285779579424",
        "variables": {
          "invoiceNumber": "INV-TEST-002",
          "period": "November 2025",
          "amount": "Rp 2,000,000"
        }
      }
    ],
    "channels": ["whatsapp"],
    "templateId": "invoicing_testing_v1_2",
    "globalVariables": {
      "companyName": "PT Multi Media Digital Nusantara"
    }
  }' | jq
echo ""

sleep 2

# Test 6: Multi-channel blast (3 recipients)
echo -e "${BLUE}📧💬 Test 6: Multi-Channel Blast (Email + WhatsApp - 3 Recipients)${NC}"
curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "channels": ["email", "whatsapp"],
    "templateId": "invoicing_testing_v1_2",
    "from": "satrianugrahacode@gmail.com",
    "globalVariables": {
      "companyName": "PT Multi Media Digital Nusantara",
      "period": "November 2025",
      "amount": "Rp 2,500,000"
    },
    "recipients": [
      {
        "name": "Satria",
        "email": "satria.agung@mmdn.co.id",
        "phone": "6285779579424",
        "variables": {
          "invoiceNumber": "INV-001"
        }
      },
      {
        "name": "Ageng",
        "email": "ageng.bagus@umn.ac.id",
        "phone": "6281213670721",
        "variables": {
          "invoiceNumber": "INV-002"
        }
      },
      {
        "name": "Woly",
        "email": "william.suanto@mmdn.co.id",
        "phone": "6289678537538",
        "variables": {
          "invoiceNumber": "INV-003"
        }
      }
    ]
  }' | jq
echo ""

sleep 3

# Test 7: Check queue statistics
echo -e "${BLUE}📊 Test 7: Queue Statistics${NC}"
curl -s http://localhost:3000/api/messages/stats | jq
echo ""

# Test 8: Dashboard statistics
echo -e "${BLUE}📊 Test 8: Dashboard Statistics${NC}"
curl -s http://localhost:3000/api/dashboard | jq '{
  messageStats: .dashboard.messageStats,
  queueStats: .dashboard.queueStats,
  recentLogsCount: (.dashboard.recentLogs | length)
}'
echo ""

# Test 9: Create custom template
echo -e "${BLUE}➕ Test 9: Create Custom Template (Payment Reminder)${NC}"
curl -s -X POST http://localhost:3000/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "id": "custom-payment-reminder-001",
    "name": "Payment Reminder",
    "type": "reminder",
    "channel": "email",
    "subject": "Reminder Pembayaran Invoice {{invoiceNumber}}",
    "body": "<h1>Halo {{name}}!</h1><p>Ini adalah pengingat pembayaran untuk Invoice <strong>{{invoiceNumber}}</strong> periode {{period}}.</p><p>Total: <strong>{{amount}}</strong></p><p>Mohon segera melakukan pembayaran sebelum jatuh tempo.</p><p>Terima kasih,<br>{{companyName}}</p>",
    "variables": ["name", "invoiceNumber", "period", "amount", "companyName"]
  }' | jq
echo ""

# Test 10: Use custom template
echo -e "${BLUE}📧 Test 10: Send Blast with Custom Template (3 Recipients)${NC}"
curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "name": "Satria",
        "email": "satria.agung@mmdn.co.id",
        "variables": {
          "invoiceNumber": "INV-REMINDER-001",
          "amount": "Rp 1,750,000"
        }
      },
      {
        "name": "Ageng",
        "email": "ageng.bagus@umn.ac.id",
        "variables": {
          "invoiceNumber": "INV-REMINDER-002",
          "amount": "Rp 2,250,000"
        }
      },
      {
        "name": "Woly",
        "email": "william.suanto@mmdn.co.id",
        "variables": {
          "invoiceNumber": "INV-REMINDER-003",
          "amount": "Rp 3,000,000"
        }
      }
    ],
    "channels": ["email"],
    "templateId": "custom-payment-reminder-001",
    "globalVariables": {
      "companyName": "PT Multi Media Digital Nusantara",
      "period": "November 2025"
    },
    "from": "satrianugrahacode@gmail.com"
  }' | jq
echo ""

sleep 2

# Test 11: Send welcome email
echo -e "${BLUE}📧 Test 11: Send Welcome Email (Single)${NC}"
curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "name": "Satria",
        "email": "satria.agung@mmdn.co.id"
      }
    ],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "globalVariables": {
      "companyName": "PT Multi Media Digital Nusantara",
      "date": "1 November 2025"
    },
    "from": "satrianugrahacode@gmail.com"
  }' | jq
echo ""

sleep 2

# Test 12: Test template rendering
echo -e "${BLUE}🎨 Test 12: Test Template Rendering${NC}"
curl -s -X POST http://localhost:3000/api/templates/test-render \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "invoicing_testing_v1_2",
    "variables": {
      "name": "Satria",
      "period": "November 2025",
      "invoiceNumber": "INV-999",
      "amount": "Rp 5,000,000",
      "companyName": "PT Multi Media Digital Nusantara"
    }
  }' | jq
echo ""

# Test 13: Message logs
echo -e "${BLUE}📝 Test 13: Recent Message Logs${NC}"
curl -s "http://localhost:3000/api/logs/messages?limit=5" | jq '{
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
echo ""

# Test 14: Message stats by status
echo -e "${BLUE}📊 Test 14: Message Statistics by Status${NC}"
curl -s http://localhost:3000/api/logs/messages/stats | jq
echo ""

# Test 15: Message stats by date (last 7 days)
echo -e "${BLUE}📊 Test 15: Message Statistics by Date (Last 7 Days)${NC}"
curl -s "http://localhost:3000/api/logs/messages/stats/by-date?days=7" | jq
echo ""

# Test 16: API logs
echo -e "${BLUE}📝 Test 16: Recent API Logs${NC}"
curl -s "http://localhost:3000/api/logs/api?limit=5" | jq '{
  count,
  logs: .logs[] | {
    endpoint,
    method,
    response_status,
    response_time_ms,
    created_at
  }
}'
echo ""

# Test 17: Update template
echo -e "${BLUE}✏️  Test 17: Update Custom Template${NC}"
curl -s -X PUT http://localhost:3000/api/templates/custom-payment-reminder-001 \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "⚠️ Reminder Urgent - Pembayaran Invoice {{invoiceNumber}}"
  }' | jq
echo ""

# Test 18: Validation - Empty recipients
echo -e "${YELLOW}❌ Test 18: Validation - Empty Recipients (Should Fail)${NC}"
curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "from": "satrianugrahacode@gmail.com"
  }' | jq
echo ""

# Test 19: Validation - Invalid template
echo -e "${YELLOW}❌ Test 19: Validation - Invalid Template (Should Fail)${NC}"
curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "name": "Satria",
        "email": "satria.agung@mmdn.co.id"
      }
    ],
    "channels": ["email"],
    "templateId": "non-existent-template",
    "from": "satrianugrahacode@gmail.com"
  }' | jq
echo ""

# Test 20: Validation - Channel mismatch
echo -e "${YELLOW}❌ Test 20: Validation - Channel Mismatch (Should Fail)${NC}"
curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "name": "Satria",
        "phone": "6285779579424"
      }
    ],
    "channels": ["whatsapp"],
    "templateId": "email-welcome-001"
  }' | jq
echo ""

# Test 21: Validation - Missing email from
echo -e "${YELLOW}❌ Test 21: Validation - Missing Email From (Should Fail)${NC}"
curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "name": "Satria",
        "email": "satria.agung@mmdn.co.id"
      }
    ],
    "channels": ["email"],
    "templateId": "email-welcome-001"
  }' | jq
echo ""

# Test 22: Bulk send - Email only (3 recipients)
echo -e "${BLUE}📧 Test 22: Bulk Email Send (3 Recipients)${NC}"
curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "name": "Satria",
        "email": "satria.agung@mmdn.co.id",
        "variables": {
          "invoiceNumber": "INV-BULK-001",
          "amount": "Rp 1,500,000"
        }
      },
      {
        "name": "Ageng",
        "email": "ageng.bagus@umn.ac.id",
        "variables": {
          "invoiceNumber": "INV-BULK-002",
          "amount": "Rp 2,000,000"
        }
      },
      {
        "name": "Woly",
        "email": "william.suanto@mmdn.co.id",
        "variables": {
          "invoiceNumber": "INV-BULK-003",
          "amount": "Rp 2,500,000"
        }
      }
    ],
    "channels": ["email"],
    "templateId": "invoicing_testing_v1_2",
    "globalVariables": {
      "companyName": "PT Multi Media Digital Nusantara",
      "period": "November 2025"
    },
    "from": "satrianugrahacode@gmail.com"
  }' | jq
echo ""

sleep 2

# Test 23: Bulk send - WhatsApp only (3 recipients)
echo -e "${BLUE}💬 Test 23: Bulk WhatsApp Send (3 Recipients)${NC}"
curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "name": "Satria",
        "phone": "6285779579424",
        "variables": {
          "invoiceNumber": "INV-WA-001",
          "amount": "Rp 1,750,000"
        }
      },
      {
        "name": "Ageng",
        "phone": "6281213670721",
        "variables": {
          "invoiceNumber": "INV-WA-002",
          "amount": "Rp 2,250,000"
        }
      },
      {
        "name": "Woly",
        "phone": "6289678537538",
        "variables": {
          "invoiceNumber": "INV-WA-003",
          "amount": "Rp 3,000,000"
        }
      }
    ],
    "channels": ["whatsapp"],
    "templateId": "invoicing_testing_v1_2",
    "globalVariables": {
      "companyName": "PT Multi Media Digital Nusantara",
      "period": "November 2025"
    }
  }' | jq
echo ""

sleep 2

# Test 24: Final queue stats
echo -e "${BLUE}📊 Test 24: Final Queue Statistics${NC}"
curl -s http://localhost:3000/api/messages/stats | jq
echo ""

# Test 25: System logs
echo -e "${BLUE}📝 Test 25: System Logs (Errors only)${NC}"
curl -s "http://localhost:3000/api/logs/system?level=error&limit=5" | jq '{
  count,
  logs: .logs[] | {
    level,
    message,
    created_at
  }
}'
echo ""

# Test 26: Delete custom template
echo -e "${BLUE}🗑️  Test 26: Delete Custom Template${NC}"
curl -s -X DELETE http://localhost:3000/api/templates/custom-payment-reminder-001 | jq
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ All Tests Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${BLUE}📊 Summary:${NC}"
echo "- 26 tests executed"
echo "- Tested: Templates, Email, WhatsApp, Multi-channel, Validations"
echo "- Tested: Queue stats, Logs, Dashboard"
echo "- Real data: PT Multi Media Digital Nusantara"
echo "- Recipients: Satria, Ageng, Woly"
echo ""

echo -e "${BLUE}💡 Next Steps:${NC}"
echo "1. Check logs: tail -f logs/combined.log"
echo "2. View queue: curl http://localhost:3000/api/messages/stats | jq"
echo "3. Check database: sqlite3 data/logs.db"
echo "4. Check your email inbox (satria.agung@mmdn.co.id, etc.)"
echo "5. Check WhatsApp messages"
echo ""

echo -e "${BLUE}🔍 Useful Commands:${NC}"
echo "# View all message logs:"
echo "curl -s 'http://localhost:3000/api/logs/messages?limit=50' | jq"
echo ""
echo "# Filter by status:"
echo "curl -s 'http://localhost:3000/api/logs/messages?status=sent' | jq"
echo ""
echo "# Filter by email:"
echo "curl -s 'http://localhost:3000/api/logs/messages?email=satria.agung@mmdn.co.id' | jq"
echo ""
echo "# Get stats:"
echo "curl -s 'http://localhost:3000/api/logs/messages/stats' | jq"
echo ""

echo -e "${GREEN}✨ Testing with real company data completed!${NC}"
echo ""