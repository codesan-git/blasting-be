# Quick Start Guide - 5 Minutes ⚡

Get your Email & WhatsApp Blast application running in 5 minutes!

---

## 📋 Prerequisites

- **Node.js 18+** installed
- **Docker Desktop** running
- **Git** installed

---

## 🚀 Step-by-Step Setup

### Step 1: Clone & Install (2 minutes)

```bash
# Clone repository
git clone <your-repo-url>
cd email-blast-app

# Install dependencies
npm install
```

### Step 2: Setup Environment (1 minute)

```bash
# Create environment file
cp .env.example .env

# Edit .env (use default values for now)
# Minimal config for testing:
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
TZ=Asia/Jakarta
```

### Step 3: Organize Scripts (30 seconds)

```bash
# Create organized structure
mkdir -p scripts/{backup,monitoring,testing,setup}

# Move scripts (automated)
npm run organize-scripts
# Or manually:
# mv scripts/backup-database.sh scripts/backup/
# mv scripts/health-check.sh scripts/monitoring/
# mv scripts/test-api.sh scripts/testing/
```

### Step 4: Start Redis (30 seconds)

```bash
# Start Redis with Docker Compose
docker-compose up -d redis

# Verify Redis is running
docker ps | grep redis
```

### Step 5: Start Application (30 seconds)

```bash
# Development mode
npm run dev

# Wait for these messages:
# ✓ Server running on port 3000
# ✓ Redis connected successfully
# ✓ Email worker is active
# ✓ Message worker is active
```

### Step 6: Test Everything (1 minute)

```bash
# In a new terminal, run health check
curl http://localhost:3000/health

# Expected response:
# {"status":"OK","timestamp":"...","uptime":...}

# Run automated tests
bash scripts/testing/test-api.sh
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Server running at http://localhost:3000
- [ ] Redis container running
- [ ] Health check returns 200 OK
- [ ] Templates API works: `curl http://localhost:3000/api/templates`
- [ ] Logs directory created with files
- [ ] Database created: `ls data/logs.db`

---

## 🎯 First Test Message

Send your first email blast:

```bash
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "name": "Test User",
        "email": "test@example.com"
      }
    ],
    "channels": ["email"],
    "templateId": "email-welcome-001",
    "globalVariables": {
      "companyName": "My Company",
      "date": "2025-11-03"
    },
    "from": "noreply@example.com"
  }'
```

Expected response:

```json
{
  "success": true,
  "totalMessages": 1,
  "jobIds": ["..."]
}
```

Check queue stats:

```bash
curl http://localhost:3000/api/messages/stats | jq
```

---

## 🔧 Common Issues

### Redis Connection Failed

```bash
# Check if Redis is running
docker ps | grep redis

# If not running, start it
docker-compose up -d redis
```

### Port 3000 Already in Use

```bash
# Change port in .env
echo "PORT=3001" >> .env

# Restart application
```

### Permission Denied

```bash
# Make scripts executable
chmod +x scripts/**/*.sh

# Fix logs directory
mkdir -p logs
chmod 755 logs
```

---

## 📚 Next Steps

Now that your app is running:

1. **Configure SMTP** for real email sending → See [SMTP-CONFIGURATION.md](SMTP-CONFIGURATION.md)
2. **Setup WhatsApp** with Qiscus → See [WEBHOOK-INTEGRATION.md](WEBHOOK-INTEGRATION.md)
3. **Setup Backups** → See [BACKUP-RECOVERY.md](BACKUP-RECOVERY.md)
4. **Deploy to Production** → See README.md production section
5. **Run Complete Tests** → See [TESTING-GUIDE.md](TESTING-GUIDE.md)

---

## 🎉 You're Ready!

Your application is now:

- ✅ Running on http://localhost:3000
- ✅ Queue system active
- ✅ Database logging enabled
- ✅ Ready to send messages

**Useful Commands:**

```bash
# View logs
tail -f logs/combined.log

# Monitor queue
bash scripts/monitoring/monitor-realtime.sh

# Check health
bash scripts/monitoring/health-check.sh

# Run tests
bash scripts/testing/test-api.sh

# Stop application
# Press Ctrl+C

# Stop Redis
docker-compose down
```

---

## 📞 Need Help?

- **Health Issues:** Run `bash scripts/monitoring/health-check.sh`
- **Queue Problems:** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **API Questions:** See [API-DOCUMENTATION.md](API-DOCUMENTATION.md)
- **Architecture:** See [TECHNICAL-ARCHITECTURE.md](TECHNICAL-ARCHITECTURE.md)

---

**Setup Time:** ~5 minutes ✨  
**Status:** Production Ready 🚀

---

Last Updated: November 3, 2025
