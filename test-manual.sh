#!/bin/bash

echo "🧪 Testing Email Blast API..."
echo ""

# Test 1: Health Check
echo "1️⃣ Testing Health Check..."
curl -s http://localhost:3000/health | jq
echo ""

# Test 2: Email Blast - Small
echo "2️⃣ Testing Email Blast (3 recipients)..."
curl -s -X POST http://localhost:3000/api/email/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {"email": "user1@example.com", "name": "User One"},
      {"email": "user2@example.com", "name": "User Two"},
      {"email": "user3@example.com", "name": "User Three"}
    ],
    "subject": "Test Email Blast",
    "body": "Hello! This is a test email blast.",
    "from": "noreply@example.com"
  }' | jq
echo ""

# Wait for processing
echo "⏳ Waiting 3 seconds for processing..."
sleep 3

# Test 3: Queue Stats
echo "3️⃣ Testing Queue Stats..."
curl -s http://localhost:3000/api/email/stats | jq
echo ""

# Test 4: Email Blast - Empty Recipients (should fail)
echo "4️⃣ Testing Empty Recipients (should fail)..."
curl -s -X POST http://localhost:3000/api/email/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [],
    "subject": "Test",
    "body": "Test",
    "from": "test@example.com"
  }' | jq
echo ""

# Test 5: Email Blast - Missing Fields (should fail)
echo "5️⃣ Testing Missing Fields (should fail)..."
curl -s -X POST http://localhost:3000/api/email/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [{"email": "test@example.com", "name": "Test"}]
  }' | jq
echo ""

# Test 6: Large Blast
echo "6️⃣ Testing Large Email Blast (10 recipients)..."
curl -s -X POST http://localhost:3000/api/email/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {"email": "user1@example.com", "name": "User 1"},
      {"email": "user2@example.com", "name": "User 2"},
      {"email": "user3@example.com", "name": "User 3"},
      {"email": "user4@example.com", "name": "User 4"},
      {"email": "user5@example.com", "name": "User 5"},
      {"email": "user6@example.com", "name": "User 6"},
      {"email": "user7@example.com", "name": "User 7"},
      {"email": "user8@example.com", "name": "User 8"},
      {"email": "user9@example.com", "name": "User 9"},
      {"email": "user10@example.com", "name": "User 10"}
    ],
    "subject": "Large Test Email Blast",
    "body": "Testing large volume email blast",
    "from": "noreply@example.com"
  }' | jq
echo ""

# Wait for processing
echo "⏳ Waiting 5 seconds for processing..."
sleep 5

# Final Stats
echo "7️⃣ Final Queue Stats..."
curl -s http://localhost:3000/api/email/stats | jq
echo ""

echo "✅ All manual tests completed!"