#!/bin/bash

# Quick Setup for Automatic Daily Backup

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Setup Automatic Daily Backup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get current directory
CURRENT_DIR=$(pwd)

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "scripts" ]; then
    echo -e "${RED}Error: Please run this script from the email-blast-app root directory${NC}"
    exit 1
fi

# Make scripts executable
echo -e "${BLUE}Making scripts executable...${NC}"
chmod +x scripts/backup-database.sh
chmod +x scripts/restore-backup.sh
echo -e "${GREEN}✓ Scripts are now executable${NC}"
echo ""

# Test backup script
echo -e "${BLUE}Testing backup script...${NC}"
bash scripts/backup-database.sh

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup script works!${NC}"
else
    echo -e "${RED}✗ Backup script failed. Please check the error above.${NC}"
    exit 1
fi

echo ""

# Setup crontab
echo -e "${BLUE}Setting up crontab...${NC}"
echo ""
echo -e "${YELLOW}Current crontab entries:${NC}"
crontab -l 2>/dev/null || echo "No crontab entries found"
echo ""

# Backup time selection
echo -e "${YELLOW}When should the backup run?${NC}"
echo "1. Daily at 2:00 AM (recommended)"
echo "2. Daily at 3:00 AM"
echo "3. Daily at 4:00 AM"
echo "4. Custom time"
echo ""

read -p "Select option (1-4): " TIME_OPTION

case $TIME_OPTION in
    1)
        CRON_TIME="0 2 * * *"
        TIME_DESC="2:00 AM"
        ;;
    2)
        CRON_TIME="0 3 * * *"
        TIME_DESC="3:00 AM"
        ;;
    3)
        CRON_TIME="0 4 * * *"
        TIME_DESC="4:00 AM"
        ;;
    4)
        read -p "Enter hour (0-23): " HOUR
        read -p "Enter minute (0-59): " MINUTE
        CRON_TIME="$MINUTE $HOUR * * *"
        TIME_DESC="${HOUR}:${MINUTE}"
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""

# Create cron job entry
CRON_JOB="$CRON_TIME cd $CURRENT_DIR && bash scripts/backup-database.sh >> logs/backup.log 2>&1"

echo -e "${YELLOW}The following cron job will be added:${NC}"
echo "$CRON_JOB"
echo ""
echo -e "${YELLOW}This will:${NC}"
echo "  - Run daily at $TIME_DESC"
echo "  - Backup database to backups/ folder"
echo "  - Keep last 30 days of backups"
echo "  - Log output to logs/backup.log"
echo ""

read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Setup cancelled${NC}"
    exit 0
fi

# Create logs directory if not exists
mkdir -p logs

# Add to crontab
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Cron job added successfully!${NC}"
    echo ""
    echo -e "${BLUE}Verify crontab:${NC}"
    crontab -l
    echo ""
else
    echo -e "${RED}✗ Failed to add cron job${NC}"
    exit 1
fi

# Create backup monitoring cron (weekly report)
echo ""
echo -e "${YELLOW}Add weekly backup monitoring report?${NC}"
echo "This will send a backup status report every Monday at 9 AM"
echo ""

read -p "Add monitoring report? (yes/no): " ADD_MONITOR

if [ "$ADD_MONITOR" = "yes" ]; then
    read -p "Enter email address for reports: " EMAIL
    
    MONITOR_CRON="0 9 * * 1 cd $CURRENT_DIR && bash scripts/backup-monitor.sh | mail -s 'Backup Report' $EMAIL"
    
    (crontab -l 2>/dev/null; echo "$MONITOR_CRON") | crontab -
    
    echo -e "${GREEN}✓ Monitoring report added${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${BLUE}Summary:${NC}"
echo "  ✓ Backup scripts installed"
echo "  ✓ Daily backup scheduled at $TIME_DESC"
echo "  ✓ Backup retention: 30 days"
echo "  ✓ Backup location: $CURRENT_DIR/backups/"
echo "  ✓ Backup logs: $CURRENT_DIR/logs/backup.log"
echo ""

echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Wait for first automatic backup (tomorrow at $TIME_DESC)"
echo "  2. Or run manual backup: bash scripts/backup-database.sh"
echo "  3. Check backup log: tail -f logs/backup.log"
echo "  4. List backups: ls -lht backups/"
echo "  5. Test restore: bash scripts/restore-backup.sh"
echo ""

echo -e "${YELLOW}Important:${NC}"
echo "  - First backup will run tomorrow at $TIME_DESC"
echo "  - Make sure your computer is on at that time"
echo "  - Or run manual backup now: bash scripts/backup-database.sh"
echo ""

exit 0