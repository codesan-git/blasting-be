#!/bin/bash

# Auto Backup Script for Email Blast Database
# This script backs up the database daily and keeps last 30 days

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
DB_PATH="./data/logs.db"
BACKUP_DIR="./backups"
DATE=$(TZ=Asia/Jakarta date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/logs_${DATE}.db"
RETENTION_DAYS=30

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Database Backup${NC}"
echo -e "${BLUE}  $(TZ=Asia/Jakarta date '+%Y-%m-%d %H:%M:%S WIB')${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create backup directory if not exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}Creating backup directory...${NC}"
    mkdir -p "$BACKUP_DIR"
    echo -e "${GREEN}✓ Directory created: $BACKUP_DIR${NC}"
fi

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo -e "${RED}✗ Database file not found: $DB_PATH${NC}"
    exit 1
fi

# Get database size
DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
echo -e "${BLUE}Database size: ${NC}$DB_SIZE"

# Get record counts before backup
echo -e "${BLUE}Records summary:${NC}"
MESSAGE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM message_logs;" 2>/dev/null)
API_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM api_logs;" 2>/dev/null)
SYSTEM_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM system_logs;" 2>/dev/null)

echo -e "  Message logs: ${GREEN}$MESSAGE_COUNT${NC}"
echo -e "  API logs:     ${GREEN}$API_COUNT${NC}"
echo -e "  System logs:  ${GREEN}$SYSTEM_COUNT${NC}"
echo ""

# Perform backup using SQLite backup command
echo -e "${BLUE}Backing up database...${NC}"
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'" 2>/dev/null

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Backup successful${NC}"
    echo -e "${GREEN}  File: $BACKUP_FILE${NC}"
    echo -e "${GREEN}  Size: $BACKUP_SIZE${NC}"
    
    # Compress backup to save space
    echo -e "${BLUE}Compressing backup...${NC}"
    gzip "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        COMPRESSED_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
        echo -e "${GREEN}✓ Compression successful${NC}"
        echo -e "${GREEN}  File: ${BACKUP_FILE}.gz${NC}"
        echo -e "${GREEN}  Size: $COMPRESSED_SIZE${NC}"
    else
        echo -e "${YELLOW}⚠ Compression failed, keeping uncompressed backup${NC}"
    fi
else
    echo -e "${RED}✗ Backup failed${NC}"
    exit 1
fi

echo ""

# Clean up old backups
echo -e "${BLUE}Cleaning up old backups (older than $RETENTION_DAYS days)...${NC}"
DELETED_COUNT=$(find "$BACKUP_DIR" -name "logs_*.db.gz" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)

if [ "$DELETED_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Deleted $DELETED_COUNT old backup(s)${NC}"
else
    echo -e "${YELLOW}No old backups to delete${NC}"
fi

echo ""

# List recent backups
echo -e "${BLUE}Recent backups (last 5):${NC}"
ls -lht "$BACKUP_DIR"/logs_*.db.gz 2>/dev/null | head -5 | awk '{print "  " $9 " (" $5 ")"}'

echo ""

# Backup statistics
TOTAL_BACKUPS=$(ls -1 "$BACKUP_DIR"/logs_*.db.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

echo -e "${BLUE}Backup statistics:${NC}"
echo -e "  Total backups: ${GREEN}$TOTAL_BACKUPS${NC}"
echo -e "  Total size:    ${GREEN}$TOTAL_SIZE${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Backup completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"

# Optional: Send notification (uncomment and configure)
# curl -X POST https://your-webhook-url \
#   -H "Content-Type: application/json" \
#   -d "{\"text\": \"Database backup completed: $BACKUP_FILE.gz\"}"

exit 0