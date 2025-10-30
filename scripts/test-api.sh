#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Email & WhatsApp Blast API Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if server is running
echo -e "${BLUE}Checking if server is running...${NC}"
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ Server is not running. Please start with: docker-compose up${NC}"
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
echo -e "${BLUE}📋 Test 3: Get Welcome Email Template${NC}"
curl -s http://localhost:3000/api/templates/email-welcome-001 | jq
echo ""

# Test 4: Send email blast
echo -e "${BLUE}📧 Test 4: Send Email Blast (Welcome)${NC}"
curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "email": "john.doe@example.com",
        "name": "John Doe"
      },
      {
        "email": "jane.smith@example.com",
        "name": "Jane Smith"
      }
    ],
    "channel": "email",
    "templateId": "email-welcome-001",
    "globalVariables": {
      "companyName": "TechCorp Indonesia",
      "date": "29 Oktober 2025"
    },
    "from": "noreply@techcorp.id"
  }' | jq
echo ""

sleep 2

# Test 5: Send WhatsApp blast
echo -e "${BLUE}💬 Test 5: Send WhatsApp Blast (Promotion)${NC}"
curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "phone": "6281234567890",
        "name": "Ahmad Budiman"
      },
      {
        "phone": "6289876543210",
        "name": "Siti Nurhaliza"
      }
    ],
    "channel": "whatsapp",
    "templateId": "wa-promo-001",
    "globalVariables": {
      "discountPercent": "70",
      "promoCode": "HARBOLNAS70",
      "expiryDate": "31 Desember 2025",
      "shopUrl": "https://tokoku.id/promo"
    }
  }' | jq
echo ""

sleep 2

# Test 6: Send both email and WhatsApp
echo -e "${BLUE}📧💬 Test 6: Send Both Email & WhatsApp (Reminder)${NC}"
curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "email": "customer@example.com",
        "phone": "6281234567890",
        "name": "Budi Santoso",
        "variables": {
          "invoiceNumber": "INV-2025-001",
          "amount": "2500000",
          "dueDate": "5 November 2025"
        }
      }
    ],
    "channel": "both",
    "templateId": "email-reminder-001",
    "globalVariables": {
      "currency": "Rp"
    },
    "from": "billing@company.id"
  }' | jq
echo ""

sleep 3

# Test 7: Check queue statistics
echo -e "${BLUE}📊 Test 7: Queue Statistics${NC}"
curl -s http://localhost:3000/api/messages/stats | jq
echo ""

# Test 8: Create custom template
echo -e "${BLUE}➕ Test 8: Create Custom Template${NC}"
curl -s -X POST http://localhost:3000/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "id": "custom-order-001",
    "name": "Order Confirmation",
    "type": "notification",
    "channel": "email",
    "subject": "Order Confirmation #{{orderNumber}}",
    "body": "<h1>Terima kasih {{name}}!</h1><p>Pesanan Anda #{{orderNumber}} telah diterima.</p><p>Total: {{currency}}{{amount}}</p>",
    "variables": ["name", "orderNumber", "amount", "currency"]
  }' | jq
echo ""

# Test 9: Use custom template
echo -e "${BLUE}📧 Test 9: Use Custom Template${NC}"
curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "email": "customer1@example.com",
        "name": "Customer One",
        "variables": {
          "orderNumber": "ORD-001",
          "amount": "150000"
        }
      },
      {
        "email": "customer2@example.com",
        "name": "Customer Two",
        "variables": {
          "orderNumber": "ORD-002",
          "amount": "350000"
        }
      }
    ],
    "channel": "email",
    "templateId": "custom-order-001",
    "globalVariables": {
      "currency": "Rp"
    },
    "from": "orders@shop.id"
  }' | jq
echo ""

sleep 2

# Test 10: Validation test - Empty recipients
echo -e "${BLUE}❌ Test 10: Validation - Empty Recipients (should fail)${NC}"
curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [],
    "channel": "email",
    "templateId": "email-welcome-001",
    "from": "test@example.com"
  }' | jq
echo ""

# Test 11: Validation test - Invalid template
echo -e "${BLUE}❌ Test 11: Validation - Invalid Template (should fail)${NC}"
curl -s -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [{"email": "test@example.com", "name": "Test"}],
    "channel": "email",
    "templateId": "non-existent-template",
    "from": "test@example.com"
  }' | jq
echo ""

# Test 12: Final queue stats
echo -e "${BLUE}📊 Test 12: Final Queue Statistics${NC}"
curl -s http://localhost:3000/api/messages/stats | jq
echo ""

# Test 13: Delete custom template
echo -e "${BLUE}🗑️  Test 13: Delete Custom Template${NC}"
curl -s -X DELETE http://localhost:3000/api/templates/custom-order-001 | jq
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ All Tests Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}💡 Tips:${NC}"
echo "- Check logs: docker-compose logs -f app"
echo "- View detailed logs: tail -f logs/combined.log"
echo "- Monitor Redis: docker exec -it email-blast-redis redis-cli"
echo ""