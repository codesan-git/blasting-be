#!/bin/bash

echo "📊 Email Queue Monitor"
echo "====================="
echo ""

while true; do
  clear
  echo "📊 Email Queue Monitor - $(date '+%H:%M:%S')"
  echo "=========================================="
  echo ""
  
  # Queue stats
  STATS=$(curl -s http://localhost:3000/api/messages/stats)
  echo "Queue Statistics:"
  echo "$STATS" | jq '.stats'
  echo ""
  
  # Recent logs
  echo "Recent Activity (last 5):"
  tail -5 logs/combined.log | grep -E "(Email sent|failed)" | tail -5
  echo ""
  
  # Redis queue count
  echo "Redis Queue Details:"
  docker exec email-blast-redis redis-cli LLEN bull:message-queue:wait | xargs echo "Waiting: "
  docker exec email-blast-redis redis-cli LLEN bull:message-queue:active | xargs echo "Active: "
  docker exec email-blast-redis redis-cli ZCARD bull:message-queue:completed | xargs echo "Completed: "
  docker exec email-blast-redis redis-cli ZCARD bull:message-queue:failed | xargs echo "Failed: "
  
  echo ""
  echo "Press Ctrl+C to stop"
  sleep 2
done