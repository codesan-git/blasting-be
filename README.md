# Email Blast Application

**Multi-Channel Message Broadcasting System with BullMQ, Redis, and SQLite**

A production-ready email and WhatsApp blast application built with Node.js, Express, TypeScript, BullMQ for queue management, Redis for job storage, and SQLite for logging.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5.62-red.svg)](https://docs.bullmq.io/)
[![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Scripts](#-scripts)
- [Monitoring](#-monitoring)
- [Webhooks](#-webhooks)
- [Database](#-database)
- [Backup & Recovery](#-backup--recovery)
- [Testing](#-testing)
- [Production Deployment](#-production-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### Core Capabilities

- **Multi-Channel Support**: Email, WhatsApp, SMS (planned), Push Notifications (planned)
- **Template Management**: Dynamic templates with variable substitution
- **Queue-Based Processing**: Reliable message delivery with retry mechanism
- **Rate Limiting**: Prevents API abuse and manages sending rate
- **Webhook Integration**: Real-time status updates from Qiscus WhatsApp API
- **Comprehensive Logging**: SQLite database for all activities
- **Automatic Backups**: Scheduled database backups with compression
- **Real-time Monitoring**: Live system health and queue statistics

### Email Features

- SMTP integration (Gmail, SendGrid, or any SMTP server)
- HTML email templates
- Bulk email sending with queue management
- Automatic retry on failure

### WhatsApp Features

- Qiscus WhatsApp Business API integration
- Template-based messaging (WhatsApp approved templates)
- Message status tracking (sent, delivered, read)
- Webhook for real-time status updates

### System Features

- **Rate Limiting**: Configurable limits per endpoint
- **Error Handling**: Comprehensive error logging and retry logic
- **Database Backup**: Automatic scheduled backups
- **Health Monitoring**: Real-time system health checks
- **API Logging**: Track all API requests and responses
- **Timezone Support**: Jakarta (WIB/UTC+7) timezone

---

## 🏗 Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP Request
       ▼
┌─────────────┐
│   Express   │ ◄─── Rate Limiter
│   API       │
└──────┬──────┘
       │
       ├─────────────┐
       │             │
       ▼             ▼
┌──────────┐  ┌──────────┐
│  Email   │  │ WhatsApp │
│  Queue   │  │  Queue   │
│ (BullMQ) │  │ (BullMQ) │
└────┬─────┘  └────┬─────┘
     │             │
     │     ┌───────┴────────┐
     │     │                │
     ▼     ▼                ▼
┌──────────┐        ┌──────────────┐
│   SMTP   │        │    Qiscus    │
│  Server  │        │  WhatsApp    │
└──────────┘        └──────┬───────┘
                           │
                    Webhook│Status
                           ▼
                    ┌──────────────┐
                    │   Webhook    │
                    │   Handler    │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    SQLite    │
                    │   Database   │
                    │   (Logging)  │
                    └──────────────┘
```

### Components

1. **Express API Server**: REST API endpoints for all operations
2. **BullMQ Workers**: Process email and WhatsApp messages asynchronously
3. **Redis**: Job queue storage and management
4. **SQLite**: Persistent logging (messages, API calls, system logs)
5. **SMTP Service**: Email delivery (configurable)
6. **Qiscus Service**: WhatsApp message delivery
7. **Webhook Handler**: Process status updates from Qiscus
8. **Backup Service**: Automatic database backups

---

## 🛠 Tech Stack

### Backend

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.9
- **Framework**: Express 5.1
- **Queue**: BullMQ 5.62 + Redis (ioredis)
- **Database**: SQLite (better-sqlite3)
- **Email**: Nodemailer 7.0
- **Logging**: Winston 3.18

### Development

- **Testing**: Jest 30.2
- **Package Manager**: npm
- **Build Tool**: TypeScript Compiler

---

## 📦 Prerequisites

Before installation, ensure you have:

- **Node.js** 18 or higher
- **Docker** and Docker Compose (for Redis)
- **Git** (for cloning repository)

Optional but recommended:

- **SMTP credentials** (Gmail, SendGrid, etc.) for email sending
- **Qiscus WhatsApp API** credentials for WhatsApp sending

---

## 🚀 Installation

### 1. Clone Repository

```bash
git clone https://github.com/codesan-git/email-blast-app.git
cd email-blast-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Redis

```bash
# Start Redis using Docker Compose
docker-compose up -d

# Verify Redis is running
docker ps
```

### 4. Setup Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 5. Organize Scripts (Recommended)

```bash
# Create organized directory structure
mkdir -p scripts/{backup,monitoring,testing,setup}

# Move scripts to appropriate folders
mv scripts/backup-database.sh scripts/backup/
mv scripts/restore-backup.sh scripts/backup/
mv scripts/backup-monitor.sh scripts/backup/
mv scripts/setup-backup-cron.sh scripts/backup/

mv scripts/health-check.sh scripts/monitoring/
mv scripts/monitor-realtime.sh scripts/monitoring/
mv scripts/monitor-webhooks.sh scripts/monitoring/

mv scripts/test-api.sh scripts/testing/
mv scripts/test-webhook.sh scripts/testing/
mv scripts/test-queue-health.sh scripts/testing/

mv scripts/setup-timezone.sh scripts/setup/

# Make scripts executable
chmod +x scripts/**/*.sh
```

---

## ⚙️ Configuration

### Environment Variables

Edit `.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Timezone (Jakarta/WIB - UTC+7)
TZ=Asia/Jakarta

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000        # 1 minute
RATE_LIMIT_MAX_REQUESTS=1000      # Max requests per window

# SMTP Configuration (Optional - will simulate if not set)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Qiscus WhatsApp Configuration (Optional)
QISCUS_BASE_URL=https://multichannel.qiscus.com/api/v2
QISCUS_APP_ID=your-app-id
QISCUS_SECRET_KEY=your-secret-key
QISCUS_CHANNEL_ID=your-channel-id

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_INTERVAL_HOURS=24
BACKUP_COMPRESSED=true
BACKUP_SCHEDULED_TIME=02:00       # Daily at 2 AM WIB
MAX_BACKUPS=30                    # Keep last 30 backups

# Logging
LOG_LEVEL=info
LOG_RETENTION_DAYS=30
```

### SMTP Setup (Gmail Example)

1. Enable 2-Factor Authentication in Google Account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the generated password in `SMTP_PASS`

---

## 💻 Usage

### Development Mode

```bash
# Start application
npm run dev

# Server will start at http://localhost:3000
```

### Production Mode

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

### Check Health

```bash
curl http://localhost:3000/health
```

---

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api
```

### Endpoints

#### 1. Send Message Blast

Send messages via email, WhatsApp, or both channels.

**Endpoint**: `POST /api/messages/blast`

**Request Body**:

```json
{
  "recipients": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "6281234567890",
      "variables": {
        "invoiceNumber": "INV-001",
        "amount": "Rp 1,500,000"
      }
    }
  ],
  "channels": ["email", "whatsapp"],
  "templateId": "invoicing_testing_v1_2",
  "globalVariables": {
    "companyName": "PT Example Company",
    "period": "November 2025"
  },
  "from": "noreply@example.com"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Message blast queued successfully",
  "totalMessages": 2,
  "channels": ["email", "whatsapp"],
  "template": {
    "id": "invoicing_testing_v1_2",
    "name": "Invoice Notification"
  },
  "jobIds": ["job-123", "job-124"]
}
```

#### 2. Get Templates

**Endpoint**: `GET /api/templates`

**Query Parameters**:

- `channel`: Filter by channel (email, whatsapp)
- `type`: Filter by type (welcome, invoice, etc.)

**Response**:

```json
{
  "success": true,
  "count": 3,
  "templates": [
    {
      "id": "email-welcome-001",
      "name": "Welcome Email",
      "type": "welcome",
      "channel": "email",
      "variables": ["name", "companyName", "email", "date"]
    }
  ]
}
```

#### 3. Create Template

**Endpoint**: `POST /api/templates`

**Request Body**:

```json
{
  "id": "custom-reminder-001",
  "name": "Payment Reminder",
  "type": "reminder",
  "channel": "email",
  "subject": "Payment Reminder - {{invoiceNumber}}",
  "body": "<h1>Hello {{name}}</h1><p>Reminder for invoice {{invoiceNumber}}</p>",
  "variables": ["name", "invoiceNumber"]
}
```

#### 4. Get Queue Statistics

**Endpoint**: `GET /api/messages/stats`

**Response**:

```json
{
  "success": true,
  "stats": {
    "waiting": 5,
    "active": 2,
    "completed": 150,
    "failed": 3
  }
}
```

#### 5. Get Message Logs

**Endpoint**: `GET /api/logs/messages`

**Query Parameters**:

- `status`: Filter by status (queued, sent, failed)
- `channel`: Filter by channel
- `limit`: Number of records (default: 100)
- `offset`: Pagination offset

#### 6. Get Dashboard Statistics

**Endpoint**: `GET /api/dashboard`

**Response**: Complete dashboard statistics including message stats, queue stats, and recent logs.

#### 7. Backup Operations

**Create Backup**: `POST /api/backup/create`
**List Backups**: `GET /api/backup/list`
**Restore Backup**: `POST /api/backup/restore`

---

## 🔧 Scripts

Scripts are now organized by category for easier management.

### Backup Scripts (`scripts/backup/`)

```bash
# Manual backup
bash scripts/backup/backup-database.sh

# Setup automatic daily backup
bash scripts/backup/setup-backup-cron.sh

# Restore from backup
bash scripts/backup/restore-backup.sh

# Monitor backup status
bash scripts/backup/backup-monitor.sh
```

### Monitoring Scripts (`scripts/monitoring/`)

```bash
# Complete health check
bash scripts/monitoring/health-check.sh

# Real-time system monitor (updates every 2s)
bash scripts/monitoring/monitor-realtime.sh

# Real-time webhook monitor
bash scripts/monitoring/monitor-webhooks.sh
```

### Testing Scripts (`scripts/testing/`)

```bash
# Complete API test suite
bash scripts/testing/test-api.sh

# Test webhook functionality
bash scripts/testing/test-webhook.sh

# Test queue health
bash scripts/testing/test-queue-health.sh
```

### Setup Scripts (`scripts/setup/`)

```bash
# Setup timezone to Jakarta (one-time)
bash scripts/setup/setup-timezone.sh
```

### NPM Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build TypeScript
npm start                # Start production server

# Testing
npm test                 # Run Jest tests
npm run test:watch       # Watch mode

# Backup
npm run backup           # Manual database backup
```

---

## 📊 Monitoring

### Health Check

```bash
# Quick health check
curl http://localhost:3000/health

# Comprehensive health check
bash scripts/monitoring/health-check.sh
```

**Health Check includes:**

- Server status
- Database connection
- Redis connection
- Queue statistics
- Success rate
- Recent activity
- Performance metrics

### Real-time Monitoring

```bash
# Monitor system in real-time (refreshes every 2s)
bash scripts/monitoring/monitor-realtime.sh
```

**Displays:**

- Queue statistics (waiting, active, completed, failed)
- Database statistics by status
- Recent messages
- System health
- Performance metrics

### Webhook Monitoring

```bash
# Monitor webhook events in real-time
bash scripts/monitoring/monitor-webhooks.sh
```

**Shows:**

- Webhook registration status
- Webhook event counts
- WhatsApp message status
- Recent webhook events
- Performance metrics

### Log Files

```bash
# View combined logs
tail -f logs/combined.log

# View error logs only
tail -f logs/error.log

# View backup logs
tail -f logs/backup.log
```

---

## 🔔 Webhooks

### Qiscus WhatsApp Webhook

The application automatically registers a webhook endpoint with Qiscus to receive real-time message status updates.

**Webhook URL**: `http://your-domain.com/webhooks/qiscus`

**Supported Events**:

1. **message_status**: Message delivery status

   - `sent`: Message sent to WhatsApp server
   - `delivered`: Message delivered to recipient
   - `read`: Message read by recipient
   - `failed`: Message delivery failed

2. **incoming_message**: Customer replies (logged but not processed)

### Webhook Flow

```
Qiscus WhatsApp API
       │
       │ POST /webhooks/qiscus
       ▼
Webhook Handler
       │
       ├─► Parse payload
       ├─► Validate message_id
       ├─► Update database
       └─► Log event
```

### Testing Webhooks

```bash
# Test webhook endpoint
bash scripts/testing/test-webhook.sh

# Check webhook status
curl http://localhost:3000/api/qiscus/webhook/status

# View webhook logs
curl http://localhost:3000/api/webhooks/debug
```

---

## 💾 Database

### Schema

The application uses SQLite with three main tables:

#### 1. message_logs

Stores all sent messages with status tracking.

**Columns**:

- `id`: Auto-increment primary key
- `job_id`: BullMQ job ID
- `channel`: email/whatsapp/sms
- `recipient_email`: Email address (if email)
- `recipient_phone`: Phone number (if WhatsApp)
- `recipient_name`: Recipient name
- `template_id`: Template used
- `template_name`: Template name
- `subject`: Email subject
- `status`: queued/processing/sent/failed
- `error_message`: Error details (if failed)
- `message_id`: External message ID (from SMTP/Qiscus)
- `attempts`: Number of retry attempts
- `created_at`: Creation timestamp (Jakarta time)
- `updated_at`: Last update timestamp

#### 2. api_logs

Tracks all API requests.

**Columns**:

- `id`: Auto-increment primary key
- `endpoint`: API endpoint path
- `method`: HTTP method
- `ip_address`: Client IP
- `request_body`: Request payload (JSON)
- `response_status`: HTTP status code
- `response_time_ms`: Response time in milliseconds
- `error_message`: Error details (if any)
- `created_at`: Timestamp

#### 3. system_logs

General system event logs.

**Columns**:

- `id`: Auto-increment primary key
- `level`: error/warn/info/debug
- `message`: Log message
- `metadata`: Additional data (JSON)
- `created_at`: Timestamp

### Database Location

```
data/logs.db
```

### Querying Database

```bash
# Open SQLite CLI
sqlite3 data/logs.db

# View recent messages
SELECT * FROM message_logs ORDER BY created_at DESC LIMIT 10;

# Count by status
SELECT status, COUNT(*) FROM message_logs GROUP BY status;

# View API logs
SELECT * FROM api_logs ORDER BY created_at DESC LIMIT 10;
```

---

## 💾 Backup & Recovery

### Automatic Backups

Backups run automatically based on `.env` configuration:

```env
BACKUP_ENABLED=true
BACKUP_SCHEDULED_TIME=02:00    # Daily at 2 AM WIB
BACKUP_COMPRESSED=true
MAX_BACKUPS=30                 # Keep last 30 days
```

**Backup Location**: `backups/`

**Backup Format**:

- Uncompressed: `logs_backup_YYYY-MM-DD_HH-MM-SS.db`
- Compressed: `logs_backup_YYYY-MM-DD_HH-MM-SS.db.gz`

### Manual Backup

```bash
# Via script
bash scripts/backup/backup-database.sh

# Via npm
npm run backup

# Via API
curl -X POST http://localhost:3000/api/backup/create \
  -H "Content-Type: application/json" \
  -d '{"compressed": true}'
```

### Restore Backup

```bash
# List available backups
bash scripts/backup/restore-backup.sh

# Restore specific backup
bash scripts/backup/restore-backup.sh 1

# Or by filename
bash scripts/backup/restore-backup.sh backups/logs_backup_2025-11-02_14-30-00.db.gz
```

### Setup Automatic Backup

```bash
# Interactive setup
bash scripts/backup/setup-backup-cron.sh

# Choose backup time (e.g., 2:00 AM)
# Configures crontab automatically
```

### Monitor Backups

```bash
# Check backup status
bash scripts/backup/backup-monitor.sh

# List backups via API
curl http://localhost:3000/api/backup/list
```

---

## 🧪 Testing

### Run All Tests

```bash
# Run Jest test suite
npm test

# Watch mode
npm run test:watch
```

### API Testing

```bash
# Complete API test (26 tests)
bash scripts/testing/test-api.sh
```

**Tests include**:

- Template management (list, get, create, update, delete)
- Single email blast
- Single WhatsApp blast
- Multi-channel blast
- Bulk sending (3 recipients)
- Queue statistics
- Dashboard statistics
- Message logs and stats
- Validation tests
- Error handling

### Webhook Testing

```bash
# Test webhook functionality
bash scripts/testing/test-webhook.sh
```

**Tests include**:

- Webhook configuration check
- Message status simulation (sent, delivered, read, failed)
- Incoming message handling
- Database integration
- Real message sending with tracking

### Queue Health Testing

```bash
# Test queue system health
bash scripts/testing/test-queue-health.sh
```

**Tests include**:

- Server connectivity
- Redis connection
- Queue statistics
- Message processing
- Performance metrics
- Optional stress test (10 messages)

---

## 🚀 Production Deployment

### Prerequisites

1. **VPS/Server** with Node.js 18+
2. **Domain name** for webhook URL
3. **SSL Certificate** (Let's Encrypt recommended)
4. **Process Manager** (PM2 recommended)

### Deployment Steps

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Docker & Docker Compose
sudo apt install -y docker.io docker-compose

# Install PM2 globally
sudo npm install -g pm2
```

#### 2. Clone and Install

```bash
# Clone repository
git clone https://github.com/yourusername/email-blast-app.git
cd email-blast-app

# Install dependencies
npm install

# Build TypeScript
npm run build
```

#### 3. Configure Environment

```bash
# Create production .env
cp .env.example .env

# Edit with production values
nano .env

# Important: Set production URLs
APP_URL=https://your-domain.com
NODE_ENV=production
```

#### 4. Start Services

```bash
# Start Redis
docker-compose up -d

# Start application with PM2
pm2 start npm --name "email-blast-app" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

#### 5. Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/email-blast-app
```

**Nginx Configuration**:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/email-blast-app /etc/nginx/sites-enabled/

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

#### 6. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

#### 7. Setup Automatic Backup

```bash
# Run setup script
bash scripts/backup/setup-backup-cron.sh

# Verify cron job
crontab -l
```

### Production Monitoring

```bash
# View PM2 logs
pm2 logs email-blast-app

# Monitor with PM2
pm2 monit

# Health check
curl https://your-domain.com/health

# View system logs
tail -f logs/combined.log
```

### Production Maintenance

```bash
# Restart application
pm2 restart email-blast-app

# Stop application
pm2 stop email-blast-app

# Update application
git pull
npm install
npm run build
pm2 restart email-blast-app

# Check status
pm2 status
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Redis Connection Failed

**Problem**: Cannot connect to Redis
**Solution**:

```bash
# Check if Redis is running
docker ps

# Restart Redis
docker-compose restart redis

# Check Redis logs
docker logs email-blast-redis
```

#### 2. SMTP Authentication Failed

**Problem**: Email sending fails
**Solution**:

- Verify SMTP credentials in `.env`
- Enable "Less secure app access" (Gmail)
- Use App Password instead of account password
- Check SMTP port (587 for TLS, 465 for SSL)

#### 3. WhatsApp Messages Not Sending

**Problem**: WhatsApp messages fail
**Solution**:

- Verify Qiscus credentials in `.env`
- Check template name matches exactly
- Ensure phone number format is correct (62xxx)
- Check Qiscus dashboard for template approval

#### 4. Webhook Not Receiving Updates

**Problem**: Message status not updating
**Solution**:

```bash
# Check webhook registration
curl http://localhost:3000/api/qiscus/webhook/status

# Verify webhook URL is accessible
curl -X POST https://your-domain.com/webhooks/qiscus

# Check webhook logs
curl http://localhost:3000/api/webhooks/debug

# Monitor webhook events
bash scripts/monitoring/monitor-webhooks.sh
```

#### 5. Database Locked

**Problem**: SQLite database locked error
**Solution**:

```bash
# Close all connections
pm2 restart email-blast-app

# Check for zombie processes
ps aux | grep node

# If issue persists, rebuild database
sqlite3 data/logs.db "PRAGMA integrity_check;"
```

#### 6. High Queue Backlog

**Problem**: Too many jobs waiting in queue
**Solution**:

```bash
# Check queue health
bash scripts/testing/test-queue-health.sh

# Increase worker concurrency in workers/*.ts:
# concurrency: 10 (from 5)

# Clear failed jobs
curl -X DELETE http://localhost:3000/api/messages/stats

# Restart workers
pm2 restart email-blast-app
```

### Debug Mode

Enable debug logging:

```bash
# Set in .env
LOG_LEVEL=debug

# Restart application
pm2 restart email-blast-app

# Watch debug logs
tail -f logs/combined.log
```

### Get Support

1. Check logs: `tail -f logs/combined.log`
2. Run health check: `bash scripts/monitoring/health-check.sh`
3. Check GitHub Issues
4. Contact maintainer

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### Development Setup

```bash
# Fork and clone
git clone https://github.com/codesan-git/email-blast-app.git
cd email-blast-app

# Create feature branch
git checkout -b feature/your-feature

# Install dependencies
npm install

# Make changes and test
npm run dev
npm test

# Commit with conventional commits
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/your-feature
```

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Write tests for new features
- Update documentation
- Use meaningful commit messages

### Pull Request Process

1. Update README if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG
5. Request review

---

## 📄 License

This project is licensed under the ISC License.

---

## 👨‍💻 Author

**PT Multi Media Digital Nusantara**

- Email: satria.agung@mmdn.co.id
- GitHub: [@codesan-git](https://github.com/codesan-git)

---

## 🙏 Acknowledgments

- [BullMQ](https://docs.bullmq.io/) - Robust job queue
- [Qiscus](https://www.qiscus.com/) - WhatsApp Business API
- [Nodemailer](https://nodemailer.com/) - Email sending
- [Express](https://expressjs.com/) - Web framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety

---

## 📈 Roadmap

- [ ] Web dashboard UI
- [ ] SMS channel integration
- [ ] Push notification support
- [ ] Advanced analytics
- [ ] Multi-tenant support
- [ ] API authentication (JWT)
- [ ] Webhook retry mechanism
- [ ] Email template builder
- [ ] Scheduled messages
- [ ] A/B testing support

---

## 📞 Support

For bug reports and feature requests, please [open an issue](https://github.com/codesan-git/email-blast-app/issues).

For questions and discussions, please use [GitHub Discussions](https://github.com/codesan-git/email-blast-app/discussions).

---

**Made with ❤️ by PT Multi Media Digital Nusantara**
