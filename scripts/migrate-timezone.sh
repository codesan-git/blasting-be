#!/bin/bash

# Migrate existing database timestamps to Jakarta timezone

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

DB_PATH="./data/logs.db"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Migrate Database to Jakarta Timezone${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo -e "${RED}✗ Database not found: $DB_PATH${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING ⚠️${NC}"
echo -e "${YELLOW}This will update ALL timestamps in the database${NC}"
echo -e "${YELLOW}Current UTC timestamps will be converted to Jakarta time (UTC+7)${NC}"
echo ""

# Show sample data
echo -e "${BLUE}Sample current timestamps:${NC}"
sqlite3 "$DB_PATH" << 'EOF'
.mode column
SELECT 
  id,
  recipient_name,
  created_at,
  datetime(created_at, '+7 hours') as jakarta_time
FROM message_logs 
ORDER BY created_at DESC 
LIMIT 3;
EOF

echo ""

read -p "Continue with migration? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Migration cancelled${NC}"
    exit 0
fi

echo ""

# Backup database first
echo -e "${BLUE}Creating backup...${NC}"
BACKUP_FILE="${DB_PATH}.pre-timezone-migration.backup"
cp "$DB_PATH" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${RED}✗ Failed to create backup${NC}"
    exit 1
fi

echo ""

# Get counts before migration
echo -e "${BLUE}Getting record counts...${NC}"
MESSAGE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM message_logs;")
API_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM api_logs;")
SYSTEM_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM system_logs;")

echo -e "  Message logs: ${GREEN}$MESSAGE_COUNT${NC}"
echo -e "  API logs:     ${GREEN}$API_COUNT${NC}"
echo -e "  System logs:  ${GREEN}$SYSTEM_COUNT${NC}"

echo ""

# Perform migration
echo -e "${BLUE}Migrating timestamps...${NC}"

sqlite3 "$DB_PATH" << 'EOF'
BEGIN TRANSACTION;

-- Update message_logs
UPDATE message_logs 
SET created_at = datetime(created_at, '+7 hours'),
    updated_at = datetime(updated_at, '+7 hours');

-- Update api_logs
UPDATE api_logs 
SET created_at = datetime(created_at, '+7 hours');

-- Update system_logs
UPDATE system_logs 
SET created_at = datetime(created_at, '+7 hours');

COMMIT;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Timestamps migrated successfully${NC}"
else
    echo -e "${RED}✗ Migration failed${NC}"
    echo -e "${YELLOW}Restoring from backup...${NC}"
    cp "$BACKUP_FILE" "$DB_PATH"
    exit 1
fi

echo ""

# Verify migration
echo -e "${BLUE}Verifying migration...${NC}"
echo -e "${BLUE}Sample migrated timestamps:${NC}"
sqlite3 "$DB_PATH" << 'EOF'
.mode column
SELECT 
  id,
  recipient_name,
  created_at as jakarta_time
FROM message_logs 
ORDER BY created_at DESC 
LIMIT 3;
EOF

echo ""

# Verify counts
MESSAGE_COUNT_AFTER=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM message_logs;")
API_COUNT_AFTER=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM api_logs;")
SYSTEM_COUNT_AFTER=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM system_logs;")

echo -e "${BLUE}Record counts after migration:${NC}"
echo -e "  Message logs: ${GREEN}$MESSAGE_COUNT_AFTER${NC}"
echo -e "  API logs:     ${GREEN}$API_COUNT_AFTER${NC}"
echo -e "  System logs:  ${GREEN}$SYSTEM_COUNT_AFTER${NC}"

echo ""

# Check if counts match
if [ "$MESSAGE_COUNT" -eq "$MESSAGE_COUNT_AFTER" ] && \
   [ "$API_COUNT" -eq "$API_COUNT_AFTER" ] && \
   [ "$SYSTEM_COUNT" -eq "$SYSTEM_COUNT_AFTER" ]; then
    echo -e "${GREEN}✓ All records migrated successfully${NC}"
else
    echo -e "${RED}✗ Warning: Record counts don't match!${NC}"
    echo -e "${YELLOW}Please check the database${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Migration Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${BLUE}Summary:${NC}"
echo "  ✓ Backup created: $BACKUP_FILE"
echo "  ✓ All timestamps converted to Jakarta time (UTC+7)"
echo "  ✓ $MESSAGE_COUNT message logs migrated"
echo "  ✓ $API_COUNT API logs migrated"
echo "  ✓ $SYSTEM_COUNT system logs migrated"
echo ""

echo -e "${YELLOW}Important:${NC}"
echo "  - Backup file saved at: $BACKUP_FILE"
echo "  - All new records will automatically use Jakarta timezone"
echo "  - Restart the application for changes to take effect"
echo ""

echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Restart application: npm run dev"
echo "  2. Verify timestamps: bash scripts/monitor-realtime.sh"
echo "  3. If something wrong, restore: cp $BACKUP_FILE $DB_PATH"
echo ""

exit 0