#!/bin/bash

echo "=== Checking Data ==="
echo ""

echo "1. Latest API Requests (blast endpoint):"
sqlite3 data/logs.db << SQL
.mode column
.headers on
SELECT 
  endpoint,
  method,
  response_status,
  substr(created_at, 1, 19) as time
FROM api_logs 
WHERE endpoint = '/api/messages/blast'
ORDER BY created_at DESC 
LIMIT 5;
SQL
echo ""

echo "2. Latest Messages:"
sqlite3 data/logs.db << SQL
.mode column
.headers on
SELECT 
  id,
  recipient_name,
  channel,
  status,
  substr(created_at, 1, 19) as time
FROM message_logs 
ORDER BY id DESC 
LIMIT 10;
SQL
echo ""

echo "3. Queue Stats:"
curl -s http://localhost:3000/api/messages/stats | jq '.stats'
echo ""

echo "4. Current Time:"
TZ=Asia/Jakarta date '+%Y-%m-%d %H:%M:%S WIB'
echo ""

