# ===== Stage 1: Build =====
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency files
COPY package*.json tsconfig.json ./


# Install dependencies (include devDeps for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# ===== Stage 2: Run =====
FROM node:20-alpine AS runner
WORKDIR /app

# Copy only necessary files
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
RUN npm ci --omit=dev --prefer-offline

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy optional runtime assets
COPY .env.example .env.example

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

# Create directories for persistent data
RUN mkdir -p /app/logs /app/data /app/backups /app/uploads/attachments

# Command to run the app
CMD ["node", "dist/index.js"]
