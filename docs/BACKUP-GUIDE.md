# Database Backup Guide

## 📋 Overview

Sistem backup otomatis untuk database SQLite dengan fitur:

- ✅ Backup harian otomatis
- ✅ Kompresi otomatis (gzip)
- ✅ Retention 30 hari
- ✅ Restore mudah
- ✅ Verification setelah restore

---

## 🚀 Quick Start

### 1. Setup Backup Scripts

```bash
# Make scripts executable
chmod +x scripts/backup-database.sh
chmod +x scripts/restore-backup.sh

# Test manual backup
bash scripts/backup-database.sh
```

**Expected Output:**

```
========================================
  Database Backup
  2025-11-01 10:00:00
========================================

Database size: 2.3M
Records summary:
  Message logs: 150
  API logs:     2630
  System logs:  91

Backing up database...
✓ Backup successful
  File: ./backups/logs_20251101_100000.db
  Size: 2.3M

Compressing backup...
✓ Compression successful
  File: ./backups/logs_20251101_100000.db.gz
  Size: 512K

Recent backups (last 5):
  ./backups/logs_20251101_100000.db.gz (512K)

Backup statistics:
  Total backups: 1
  Total size:    512K

========================================
  Backup completed successfully!
========================================
```

---

## ⏰ Setup Automatic Daily Backup

### Option 1: Using Crontab (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add this line (backup every day at 2 AM)
0 2 * * * cd /path/to/email-blast-app && bash scripts/backup-database.sh >> logs/backup.log 2>&1

# Save and exit
```

**Verify crontab:**

```bash
crontab -l
```

### Option 2: Using PM2 (with cron module)

```bash
# Install PM2 and ecosystem
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'email-blast-api',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }],

  // Backup cron job
  cron_restart: '0 2 * * *',  // Daily at 2 AM
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 startup
pm2 startup
```

### Option 3: Using systemd Timer (Linux)

```bash
# Create service file
sudo nano /etc/systemd/system/email-blast-backup.service
```

```ini
[Unit]
Description=Email Blast Database Backup
After=network.target

[Service]
Type=oneshot
User=your-username
WorkingDirectory=/path/to/email-blast-app
ExecStart=/bin/bash /path/to/email-blast-app/scripts/backup-database.sh
StandardOutput=append:/var/log/email-blast-backup.log
StandardError=append:/var/log/email-blast-backup.error.log
```

```bash
# Create timer file
sudo nano /etc/systemd/system/email-blast-backup.timer
```

```ini
[Unit]
Description=Daily Email Blast Database Backup
Requires=email-blast-backup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# Enable and start timer
sudo systemctl daemon-reload
sudo systemctl enable email-blast-backup.timer
sudo systemctl start email-blast-backup.timer

# Check timer status
sudo systemctl status email-blast-backup.timer
sudo systemctl list-timers
```

---

## 🔄 Restore Database

### List Available Backups

```bash
bash scripts/restore-backup.sh
```

**Output:**

```
Available backups:

[1] 2025-11-01 10:00:00 (512K)
[2] 2025-10-31 02:00:00 (498K)
[3] 2025-10-30 02:00:00 (485K)

Usage:
  1. Restore by number: ./restore-backup.sh [number]
  2. Restore by file:   ./restore-backup.sh [path-to-backup.db.gz]

Example:
  ./restore-backup.sh 1
```

### Restore from Backup

```bash
# Restore latest backup (backup #1)
bash scripts/restore-backup.sh 1

# Or restore specific file
bash scripts/restore-backup.sh backups/logs_20251101_100000.db.gz
```

**Interactive Process:**

```
Selected backup:
  File: backups/logs_20251101_100000.db.gz
  Size: 512K

⚠️  WARNING ⚠️
This will replace the current database!
Current database will be backed up to: ./data/logs.db.pre-restore.backup

Continue? (yes/no): yes

Backing up current database...
✓ Current database backed up

Decompressing backup...
✓ Decompressed

Restoring database...
✓ Database restored successfully

Verifying restored database...
✓ Database verified

Restored data:
  Message logs: 150
  API logs:     2630
  System logs:  91

========================================
  Restore completed successfully!
========================================

Note: Previous database saved to:
  ./data/logs.db.pre-restore.backup
```

---

## 📁 Backup Directory Structure

```
email-blast-app/
├── data/
│   └── logs.db                           # Active database
├── backups/                              # Backup directory
│   ├── logs_20251101_100000.db.gz        # Compressed backup
│   ├── logs_20251031_020000.db.gz
│   ├── logs_20251030_020000.db.gz
│   └── ...                               # (30 days retention)
└── scripts/
    ├── backup-database.sh                # Backup script
    └── restore-backup.sh                 # Restore script
```

---

## 🔍 Backup Management

### Check Backup Status

```bash
# List all backups
ls -lht backups/

# Count backups
ls -1 backups/*.db.gz | wc -l

# Total backup size
du -sh backups/

# Oldest backup
ls -lt backups/ | tail -1

# Newest backup
ls -lt backups/ | head -2
```

### Manual Backup Before Important Operations

```bash
# Before major changes
bash scripts/backup-database.sh

# Before deployment
bash scripts/backup-database.sh

# Before database migration
bash scripts/backup-database.sh
```

### Verify Backup Integrity

```bash
# Check if backup can be decompressed
gunzip -t backups/logs_20251101_100000.db.gz

# If OK, output nothing
# If corrupted, shows error
```

### Delete Old Backups Manually

```bash
# Delete backups older than 60 days
find backups/ -name "logs_*.db.gz" -mtime +60 -delete

# Delete specific backup
rm backups/logs_20251001_020000.db.gz
```

---

## 📊 Backup Monitoring

### Create Monitoring Script

Save as `scripts/backup-monitor.sh`:

```bash
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
```

```bash
chmod +x scripts/backup-monitor.sh
bash scripts/backup-monitor.sh
```

### Add to Crontab (Weekly Report)

```bash
# Email backup report every Monday at 9 AM
0 9 * * 1 cd /path/to/email-blast-app && bash scripts/backup-monitor.sh | mail -s "Backup Report" admin@example.com
```

---

## 🔐 Backup Security

### Encrypt Backups (Optional)

```bash
# Install GPG
# Mac: brew install gnupg
# Linux: sudo apt install gnupg

# Encrypt backup
gpg --symmetric --cipher-algo AES256 backups/logs_20251101_100000.db.gz

# This creates: logs_20251101_100000.db.gz.gpg

# Decrypt when restoring
gpg --decrypt backups/logs_20251101_100000.db.gz.gpg > backups/logs_20251101_100000.db.gz
```

### Remote Backup (S3, Google Drive, etc.)

```bash
# Example: Sync to AWS S3
aws s3 sync backups/ s3://your-bucket/email-blast-backups/

# Example: Sync to Google Drive (using rclone)
rclone sync backups/ gdrive:email-blast-backups/

# Add to backup script
```

---

## 🚨 Disaster Recovery

### Complete Recovery Process

1. **Install fresh system**

   ```bash
   git clone <repo>
   cd email-blast-app
   npm install
   ```

2. **Restore latest backup**

   ```bash
   # Copy backup file to backups/
   # Or download from remote storage

   bash scripts/restore-backup.sh 1
   ```

3. **Verify data**

   ```bash
   sqlite3 data/logs.db "SELECT COUNT(*) FROM message_logs;"
   ```

4. **Start application**
   ```bash
   npm run dev
   ```

---

## ✅ Backup Checklist

Daily:

- [ ] Automatic backup runs at 2 AM
- [ ] Backup completes successfully
- [ ] Old backups cleaned (>30 days)

Weekly:

- [ ] Verify backup integrity
- [ ] Check backup size growth
- [ ] Review backup logs

Monthly:

- [ ] Test restore process
- [ ] Review retention policy
- [ ] Update backup scripts if needed

---

## 📞 Troubleshooting

### Backup fails

```bash
# Check disk space
df -h

# Check permissions
ls -la data/logs.db
ls -la backups/

# Check database is not locked
lsof data/logs.db

# Try manual backup
sqlite3 data/logs.db ".backup backups/manual_backup.db"
```

### Restore fails

```bash
# Check backup file integrity
gunzip -t backups/logs_20251101_100000.db.gz

# Check if database is locked
lsof data/logs.db

# Stop application before restore
pm2 stop email-blast-api

# Try restore again
bash scripts/restore-backup.sh 1
```

### Cron job not running

```bash
# Check cron service
sudo systemctl status cron

# Check cron logs
grep CRON /var/log/syslog

# Test script manually
bash scripts/backup-database.sh

# Check user permissions
sudo crontab -l -u your-username
```

---

## 📈 Best Practices

1. **Test Restores Regularly**

   - Monthly restore test
   - Verify data integrity
   - Document recovery time

2. **Monitor Backup Size**

   - Track growth trend
   - Alert if size increases suddenly
   - Consider data retention

3. **Multiple Backup Locations**

   - Local backups (fast recovery)
   - Remote backups (disaster recovery)
   - Off-site backups (maximum safety)

4. **Backup Before Changes**

   - Before deployment
   - Before schema changes
   - Before bulk operations

5. **Document Procedures**
   - Keep this guide updated
   - Document custom modifications
   - Train team on restore process

---

**Last Updated:** November 1, 2025  
**Version:** 1.0.0
