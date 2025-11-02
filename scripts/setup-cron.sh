#!/bin/bash
# scripts/setup-cron.sh
# Setup cron job untuk backup otomatis jam 2 pagi

PROJECT_DIR=$(pwd)
CRON_FILE="/tmp/email-blast-backup-cron"

echo "🔧 Setting up backup cron job..."
echo ""

# Create cron entry
cat > "$CRON_FILE" << EOF
# Email Blast App - Database Backup
# Runs every day at 2:00 AM (Jakarta time)
# 
# Cron format: minute hour day month weekday command
# 0 2 * * * = At 02:00 every day

# Set timezone for this cron job
CRON_TZ=Asia/Jakarta

# Backup at 2 AM daily
0 2 * * * cd $PROJECT_DIR && npm run backup >> $PROJECT_DIR/logs/backup-cron.log 2>&1

# Alternative: Use API trigger (if app is running)
# 0 2 * * * curl -X POST http://localhost:3000/api/backup/trigger >> $PROJECT_DIR/logs/backup-api.log 2>&1

EOF

echo "📄 Cron job configuration:"
cat "$CRON_FILE"
echo ""

# Install cron job
echo "📦 Installing cron job..."
crontab -l > /tmp/current-cron 2>/dev/null || true
cat "$CRON_FILE" >> /tmp/current-cron
crontab /tmp/current-cron

echo ""
echo "✅ Cron job installed successfully!"
echo ""
echo "📋 Current cron jobs:"
crontab -l
echo ""
echo "💡 Tips:"
echo "   - View cron logs: tail -f $PROJECT_DIR/logs/backup-cron.log"
echo "   - Edit cron: crontab -e"
echo "   - Remove cron: crontab -r"
echo "   - Test backup: npm run backup"
echo ""

# Create logs directory if not exists
mkdir -p "$PROJECT_DIR/logs"
touch "$PROJECT_DIR/logs/backup-cron.log"

echo "🎉 Setup complete!"
echo "   Next backup will run at 2:00 AM Jakarta time"