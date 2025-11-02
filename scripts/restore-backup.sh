#!/bin/bash

# Restore Database from Backup
# Usage: ./restore-backup.sh [backup-file]

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
DB_PATH="./data/logs.db"
BACKUP_DIR="./backups"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Database Restore${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# List available backups
if [ -z "$1" ]; then
    echo -e "${BLUE}Available backups:${NC}"
    echo ""
    
    BACKUPS=($(ls -t "$BACKUP_DIR"/logs_*.db.gz 2>/dev/null))
    
    if [ ${#BACKUPS[@]} -eq 0 ]; then
        echo -e "${RED}No backups found in $BACKUP_DIR${NC}"
        exit 1
    fi
    
    for i in "${!BACKUPS[@]}"; do
        BACKUP_FILE="${BACKUPS[$i]}"
        BACKUP_NAME=$(basename "$BACKUP_FILE")
        BACKUP_DATE=$(echo "$BACKUP_NAME" | sed 's/logs_\(.*\)\.db\.gz/\1/')
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        
        # Format date
        YEAR=${BACKUP_DATE:0:4}
        MONTH=${BACKUP_DATE:4:2}
        DAY=${BACKUP_DATE:6:2}
        HOUR=${BACKUP_DATE:9:2}
        MIN=${BACKUP_DATE:11:2}
        SEC=${BACKUP_DATE:13:2}
        
        FORMATTED_DATE="$YEAR-$MONTH-$DAY $HOUR:$MIN:$SEC"
        
        echo -e "${GREEN}[$((i+1))]${NC} $FORMATTED_DATE ($BACKUP_SIZE)"
    done
    
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  1. Restore by number: ./restore-backup.sh [number]"
    echo "  2. Restore by file:   ./restore-backup.sh [path-to-backup.db.gz]"
    echo ""
    echo -e "${YELLOW}Example:${NC}"
    echo "  ./restore-backup.sh 1"
    echo ""
    exit 0
fi

# Check if input is a number (selecting from list)
if [[ "$1" =~ ^[0-9]+$ ]]; then
    BACKUPS=($(ls -t "$BACKUP_DIR"/logs_*.db.gz 2>/dev/null))
    INDEX=$((1 - 1))
    
    if [ $INDEX -lt 0 ] || [ $INDEX -ge ${#BACKUPS[@]} ]; then
        echo -e "${RED}Invalid backup number${NC}"
        exit 1
    fi
    
    BACKUP_FILE="${BACKUPS[$INDEX]}"
else
    # Input is a file path
    BACKUP_FILE="$1"
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "${BLUE}Selected backup:${NC}"
echo -e "  File: $BACKUP_FILE"
echo -e "  Size: $BACKUP_SIZE"
echo ""

# Warning
echo -e "${RED}⚠️  WARNING ⚠️${NC}"
echo -e "${YELLOW}This will replace the current database!${NC}"
echo -e "${YELLOW}Current database will be backed up to: ${DB_PATH}.pre-restore.backup${NC}"
echo ""

# Confirm
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Restore cancelled${NC}"
    exit 0
fi

echo ""

# Backup current database
if [ -f "$DB_PATH" ]; then
    echo -e "${BLUE}Backing up current database...${NC}"
    cp "$DB_PATH" "${DB_PATH}.pre-restore.backup"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Current database backed up${NC}"
    else
        echo -e "${RED}✗ Failed to backup current database${NC}"
        exit 1
    fi
fi

echo ""

# Decompress backup
echo -e "${BLUE}Decompressing backup...${NC}"
TEMP_FILE="${BACKUP_FILE%.gz}"
gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to decompress backup${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Decompressed${NC}"

# Restore database
echo -e "${BLUE}Restoring database...${NC}"
cp "$TEMP_FILE" "$DB_PATH"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database restored successfully${NC}"
    
    # Verify restored database
    echo -e "${BLUE}Verifying restored database...${NC}"
    MESSAGE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM message_logs;" 2>/dev/null)
    API_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM api_logs;" 2>/dev/null)
    SYSTEM_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM system_logs;" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database verified${NC}"
        echo ""
        echo -e "${BLUE}Restored data:${NC}"
        echo -e "  Message logs: ${GREEN}$MESSAGE_COUNT${NC}"
        echo -e "  API logs:     ${GREEN}$API_COUNT${NC}"
        echo -e "  System logs:  ${GREEN}$SYSTEM_COUNT${NC}"
    else
        echo -e "${RED}✗ Database verification failed${NC}"
    fi
else
    echo -e "${RED}✗ Failed to restore database${NC}"
    
    # Restore from pre-restore backup
    if [ -f "${DB_PATH}.pre-restore.backup" ]; then
        echo -e "${YELLOW}Restoring previous database...${NC}"
        cp "${DB_PATH}.pre-restore.backup" "$DB_PATH"
        echo -e "${GREEN}✓ Previous database restored${NC}"
    fi
    
    exit 1
fi

# Cleanup temp file
rm -f "$TEMP_FILE"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Restore completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Note: Previous database saved to:${NC}"
echo -e "  ${DB_PATH}.pre-restore.backup"
echo ""

exit 0