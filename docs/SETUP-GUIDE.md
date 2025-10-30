# Setup Guide - Email & WhatsApp Blast Application

## 📦 Prerequisites

- Node.js 20+ (untuk development)
- Docker & Docker Compose (untuk production)
- Terminal/Command Line
- Text Editor (VS Code, Sublime, dll)
- Postman/curl untuk testing (optional)

---

## 🚀 Setup Step-by-Step

### Step 1: Persiapan Project

```bash
# 1. Buat folder project
mkdir email-blast-app
cd email-blast-app

# 2. Buat struktur folder
mkdir -p src/{config,controllers,queues,routes,services,types,utils,workers}
mkdir logs
```

### Step 2: Copy Semua File

Copy semua file yang sudah saya berikan ke struktur folder berikut:

```
email-blast-app/
├── src/
│   ├── config/
│   │   └── redis.ts
│   ├── controllers/
│   │   ├── email.controller.ts
│   │   ├── email.controller.test.ts
│   │   ├── message.controller.ts
│   │   └── template.controller.ts
│   ├── queues/
│   │   ├── email.queue.ts
│   │   └── message.queue.ts
│   ├── routes/
│   │   ├── email.routes.ts
│   │   ├── message.routes.ts
│   │   └── template.routes.ts
│   ├── services/
│   │   └── template.service.ts
│   ├── types/
│   │   ├── email.types.ts
│   │   └── template.types.ts
│   ├── utils/
│   │   └── logger.ts
│   ├── workers/
│   │   ├── email.worker.ts
│   │   └── message.worker.ts
│   ├── app.ts
│   └── index.ts
├── logs/                    (akan auto-generate)
├── .dockerignore
├── .env
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── jest.config.js
├── package.json
├── tsconfig.json
├── test-api.sh
├── API-GUIDE.md
└── README.md
```

### Step 3: Install Dependencies (untuk development)

```bash
npm install
```

### Step 4: Setup dengan Docker (RECOMMENDED)

#### 4a. Build dan Run

```bash
# Build dan jalankan semua services
docker-compose up --build

# Atau run di background
docker-compose up -d --build
```

Tunggu sampai muncul log seperti ini:

```
email-blast-app  | Server running on port 3000
email-blast-app  | Environment: production
email-blast-app  | Email worker is active and processing jobs
email-blast-app  | Message worker is active and processing jobs
```

#### 4b. Verifikasi

```bash
# Check health
curl http://localhost:3000/health

# Expected response:
# {"status":"OK","timestamp":"2025-10-29T..."}
```

### Step 5: Testing API

#### Option A: Automated Testing (Recommended)

```bash
# Make script executable
chmod +x test-api.sh

# Run all tests
./test-api.sh
```

Script ini akan:

- ✅ Check server status
- ✅ Test semua template endpoints
- ✅ Test email blast
- ✅ Test WhatsApp blast
- ✅ Test kombinasi email + WhatsApp
- ✅ Test validations
- ✅ Create dan delete custom template

#### Option B: Manual Testing

**1. Lihat semua template:**

```bash
curl http://localhost:3000/api/templates
```

**2. Kirim email welcome:**

```bash
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "email": "john.doe@example.com",
        "name": "John Doe"
      }
    ],
    "channel": "email",
    "templateId": "email-welcome-001",
    "globalVariables": {
      "companyName": "TechCorp",
      "date": "29 Oktober 2025"
    },
    "from": "noreply@techcorp.com"
  }'
```

**3. Kirim WhatsApp promo:**

```bash
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "phone": "6281234567890",
        "name": "Ahmad Budiman"
      }
    ],
    "channel": "whatsapp",
    "templateId": "wa-promo-001",
    "globalVariables": {
      "discountPercent": "50",
      "promoCode": "PROMO50",
      "expiryDate": "31 Desember 2025",
      "shopUrl": "https://shop.example.com"
    }
  }'
```

**4. Kirim ke kedua channel:**

```bash
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "email": "customer@example.com",
        "phone": "6281234567890",
        "name": "Customer Name"
      }
    ],
    "channel": "both",
    "templateId": "email-reminder-001",
    "globalVariables": {
      "invoiceNumber": "INV-001",
      "amount": "1000000",
      "currency": "Rp",
      "dueDate": "15 November 2025"
    },
    "from": "billing@company.com"
  }'
```

**5. Check queue stats:**

```bash
curl http://localhost:3000/api/messages/stats
```

### Step 6: Monitoring

#### A. View Logs

```bash
# Real-time logs dari Docker
docker-compose logs -f app

# Atau lihat file log langsung
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log
```

#### B. Monitor Redis Queue

```bash
# Connect ke Redis container
docker exec -it email-blast-redis redis-cli

# Check queue keys
KEYS bull:message-queue:*

# Check waiting jobs
LLEN bull:message-queue:wait

# Check completed jobs
ZCARD bull:message-queue:completed

# Exit
exit
```

#### C. Queue Statistics API

```bash
curl http://localhost:3000/api/messages/stats
```

---

## 🛠️ Development Mode (Local)

Jika ingin development tanpa Docker:

### 1. Install Redis

```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis

# Windows
# Download dari: https://redis.io/download
# Atau gunakan Docker: docker run -d -p 6379:6379 redis:7-alpine
```

### 2. Setup Environment

```bash
# Copy .env file
cat > .env << EOF
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development
EOF
```

### 3. Build TypeScript

```bash
npm run build
```

### 4. Run Application

```bash
# Production mode
npm start

# Development mode (dengan auto-reload)
npm run dev
```

---

## 📖 Dokumentasi Lengkap

- **API Documentation**: Lihat `API-GUIDE.md`
- **README**: Lihat `README.md`
- **Template System**: Lihat section Template di `API-GUIDE.md`

---

## 🎯 Use Cases

### Use Case 1: Welcome Email untuk User Baru

```bash
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {"email": "newuser@example.com", "name": "New User"}
    ],
    "channel": "email",
    "templateId": "email-welcome-001",
    "globalVariables": {
      "companyName": "My Company",
      "date": "'$(date +%Y-%m-%d)'"
    },
    "from": "noreply@mycompany.com"
  }'
```

### Use Case 2: Blast Promo ke Semua Customer

```bash
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {"email": "customer1@example.com", "phone": "6281234567890", "name": "Customer 1"},
      {"email": "customer2@example.com", "phone": "6289876543210", "name": "Customer 2"}
    ],
    "channel": "both",
    "templateId": "email-promo-001",
    "globalVariables": {
      "discountPercent": "70",
      "promoCode": "FLASH70",
      "expiryDate": "31 Dec 2025",
      "shopUrl": "https://shop.com/promo"
    },
    "from": "promo@shop.com"
  }'
```

### Use Case 3: Payment Reminder

```bash
curl -X POST http://localhost:3000/api/messages/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {
        "email": "customer@example.com",
        "phone": "6281234567890",
        "name": "John Doe",
        "variables": {
          "invoiceNumber": "INV-2025-001",
          "amount": "2500000",
          "dueDate": "5 November 2025"
        }
      }
    ],
    "channel": "both",
    "templateId": "email-reminder-001",
    "globalVariables": {
      "currency": "Rp"
    },
    "from": "billing@company.com"
  }'
```

---

## ❓ Troubleshooting

### Problem 1: Redis Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:**

```bash
# Check if Redis is running
docker ps | grep redis

# If not running, start it
docker-compose up -d redis

# Or if local Redis
redis-cli ping
# Should return: PONG
```

### Problem 2: Port 3000 Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**

```bash
# Option 1: Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Option 2: Change port in .env
echo "PORT=3001" >> .env

# Option 3: Change port in docker-compose.yml
# Edit ports section: - "3001:3000"
```

### Problem 3: Permission Denied on Logs

```
Error: EACCES: permission denied, mkdir 'logs'
```

**Solution:**

```bash
mkdir logs
chmod 755 logs
```

### Problem 4: Docker Build Failed

```
Error: Cannot connect to the Docker daemon
```

**Solution:**

```bash
# Start Docker daemon
sudo systemctl start docker

# Or on macOS
open -a Docker
```

---

## 🎉 Success Checklist

Setelah setup, pastikan:

- [ ] Server running di port 3000
- [ ] Redis connected (check logs)
- [ ] Health check returns 200
- [ ] Template endpoint returns list
- [ ] Email blast API works
- [ ] WhatsApp blast API works
- [ ] Queue stats accessible
- [ ] Logs writing to files
- [ ] Workers processing jobs

---

## 📞 Next Steps

1. **Customize Templates**: Edit templates di `src/services/template.service.ts`
2. **Add Real Email Service**: Replace simulasi di `src/workers/message.worker.ts` dengan SMTP real
3. **Add WhatsApp Integration**: Integrate dengan WhatsApp Business API
4. **Add Database**: Replace in-memory storage dengan PostgreSQL/MongoDB
5. **Add Authentication**: Implement JWT auth untuk API security
6. **Deploy**: Deploy ke production (AWS, GCP, Azure, dll)

---

## 🔗 Useful Links

- **BullMQ Docs**: https://docs.bullmq.io/
- **Express.js**: https://expressjs.com/
- **TypeScript**: https://www.typescriptlang.org/
- **Redis**: https://redis.io/
- **Docker**: https://docs.docker.com/

---

**Happy Coding! 🚀**
