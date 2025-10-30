# Email Blast Application with BullMQ & Redis

Aplikasi email blast menggunakan Express.js, TypeScript, BullMQ, dan Redis untuk mengirim email secara massal dengan sistem queue.

## Fitur

- ✅ Email blast dengan sistem antrian (BullMQ)
- ✅ Background job processing dengan worker
- ✅ Retry mechanism untuk email yang gagal
- ✅ Logging lengkap menggunakan Winston
- ✅ Test case dengan Jest dan Supertest
- ✅ Docker & Docker Compose ready
- ✅ TypeScript untuk type safety
- ✅ Queue statistics monitoring

## Struktur Folder

```
.
├── src/
│   ├── config/          # Konfigurasi Redis
│   ├── controllers/     # Controller untuk handle request
│   ├── queues/          # BullMQ queue configuration
│   ├── routes/          # Express routes
│   ├── types/           # TypeScript types
│   ├── utils/           # Utilities (logger)
│   ├── workers/         # BullMQ workers
│   ├── app.ts           # Express app configuration
│   └── index.ts         # Entry point
├── logs/                # Log files (auto-generated)
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── jest.config.js
```

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm atau yarn

## Instalasi & Menjalankan

### Cara 1: Menggunakan Docker (Recommended)

1. **Clone atau buat project dengan semua file yang sudah disediakan**

2. **Build dan jalankan dengan Docker Compose:**

```bash
docker-compose up --build
```

Aplikasi akan berjalan di `http://localhost:3000`

### Cara 2: Menjalankan Lokal (Development)

1. **Install dependencies:**

```bash
npm install
```

2. **Pastikan Redis sudah running:**

```bash
# Menggunakan Docker
docker run -d -p 6379:6379 redis:7-alpine

# Atau install Redis di sistem Anda
```

3. **Setup environment variables:**

Buat file `.env` di root project:

```env
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development
```

4. **Build TypeScript:**

```bash
npm run build
```

5. **Jalankan aplikasi:**

```bash
# Production mode
npm start

# Development mode (dengan ts-node)
npm run dev
```

## Menjalankan Test

### Test dengan Docker

```bash
# Pastikan Redis running
docker run -d -p 6379:6379 redis:7-alpine

# Install dependencies jika belum
npm install

# Jalankan test
npm test
```

### Test Scenarios

Test mencakup:

- ✅ Email blast ke multiple recipients
- ✅ Validasi input (empty recipients, missing fields)
- ✅ Large volume blast (100 recipients)
- ✅ Queue statistics
- ✅ Health check endpoint

## API Endpoints

### 1. Send Email Blast

**POST** `/api/email/blast`

Request Body:

```json
{
  "recipients": [
    { "email": "user1@example.com", "name": "User One" },
    { "email": "user2@example.com", "name": "User Two" }
  ],
  "subject": "Test Email",
  "body": "This is a test email",
  "from": "noreply@example.com"
}
```

Response:

```json
{
  "success": true,
  "message": "Email blast queued successfully",
  "totalEmails": 2,
  "jobIds": ["1", "2"]
}
```

### 2. Get Queue Statistics

**GET** `/api/email/stats`

Response:

```json
{
  "success": true,
  "stats": {
    "waiting": 10,
    "active": 5,
    "completed": 100,
    "failed": 2
  }
}
```

### 3. Health Check

**GET** `/health`

Response:

```json
{
  "status": "OK",
  "timestamp": "2025-10-29T12:00:00.000Z"
}
```

## Testing dengan cURL atau Postman

### Contoh cURL:

```bash
# Send email blast
curl -X POST http://localhost:3000/api/email/blast \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {"email": "test1@example.com", "name": "Test User 1"},
      {"email": "test2@example.com", "name": "Test User 2"},
      {"email": "test3@example.com", "name": "Test User 3"}
    ],
    "subject": "Test Email Blast",
    "body": "Hello! This is a test email.",
    "from": "noreply@example.com"
  }'

# Get queue stats
curl http://localhost:3000/api/email/stats

# Health check
curl http://localhost:3000/health
```

## Logs

Logs tersimpan di folder `logs/`:

- `combined.log` - Semua log
- `error.log` - Error log saja

## Monitoring Queue

Untuk melihat queue di Redis secara langsung:

```bash
# Connect ke Redis container
docker exec -it email-blast-redis redis-cli

# List all keys
KEYS *

# Get queue info
LLEN bull:email-queue:wait
LLEN bull:email-queue:active
```

## Konfigurasi Worker

Worker dikonfigurasi di `src/workers/email.worker.ts`:

- **Concurrency**: 5 (memproses 5 email sekaligus)
- **Retry**: 3 attempts dengan exponential backoff
- **Delay**: 2 detik untuk retry pertama

## Troubleshooting

### Redis connection refused

Pastikan Redis running dan port 6379 tidak digunakan aplikasi lain.

### Port 3000 already in use

Ubah PORT di `.env` atau `docker-compose.yml`

### Test gagal

Pastikan Redis running sebelum menjalankan test.

## License

MIT
