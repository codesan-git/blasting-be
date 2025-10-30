#!/bin/bash

DB_PATH="./data/logs.db"

echo "📊 EMAIL BLAST REPORT"
echo "===================="
echo ""

sqlite3 "$DB_PATH" << EOF
.mode column
.headers on

SELECT '📈 OVERVIEW' as section;
SELECT 
  COUNT(*) as total_emails,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2) || '%' as success_rate
FROM message_logs;

SELECT '' as section;
SELECT '📧 BY TEMPLATE' as section;
SELECT 
  template_name,
  COUNT(*) as count,
  ROUND(100.0 * SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2) || '%' as success_rate
FROM message_logs
GROUP BY template_name;

SELECT '' as section;
SELECT '📅 BY DATE' as section;
SELECT 
  DATE(created_at) as date,
  COUNT(*) as emails_sent
FROM message_logs
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 7;

SELECT '' as section;
SELECT '❌ RECENT FAILURES' as section;
SELECT 
  recipient_email,
  error_message,
  attempts,
  created_at
FROM message_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 5;
EOF