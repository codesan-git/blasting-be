#!/bin/bash

echo "📊 Backup Monitoring Report"
echo "=========================="
echo ""

# Latest backup
LATEST=$(ls -t backups/*.db.gz 2>/dev/null | head -1)

if [ -z "$LATEST" ]; then
    echo "❌ No backups found!"
    exit 1
fi

# Backup age
BACKUP_AGE=$(find "$LATEST" -mtime +1 | wc -l)
BACKUP_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$LATEST" 2>/dev/null || stat -c "%y" "$LATEST" 2>/dev/null)

echo "Latest Backup:"
echo "  File: $(basename $LATEST)"
echo "  Date: $BACKUP_DATE"
echo "  Size: $(du -h $LATEST | cut -f1)"

if [ "$BACKUP_AGE" -gt 0 ]; then
    echo "  Status: ⚠️  OUTDATED (> 1 day old)"
else
    echo "  Status: ✓ OK"
fi

echo ""

# Backup statistics
TOTAL_BACKUPS=$(ls -1 backups/*.db.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh backups/ 2>/dev/null | cut -f1)

echo "Statistics:"
echo "  Total backups: $TOTAL_BACKUPS"
echo "  Total size:    $TOTAL_SIZE"
echo "  Retention:     30 days"

echo ""

# Check backup health
OLDEST_BACKUP=$(ls -t backups/*.db.gz 2>/dev/null | tail -1)
if [ -n "$OLDEST_BACKUP" ]; then
    OLDEST_DATE=$(stat -f "%Sm" -t "%Y-%m-%d" "$OLDEST_BACKUP" 2>/dev/null || stat -c "%y" "$OLDEST_BACKUP" 2>/dev/null | cut -d' ' -f1)
    echo "Oldest backup: $OLDEST_DATE"
fi

echo ""
echo "=========================="