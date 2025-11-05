#!/bin/bash

# ============================================
# Email Blast App - Fresh Deployment Script
# ============================================
# Run this script after: docker-compose up -d
# Usage: bash scripts/setup-fresh-deployment.sh

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
REQUIRED_NODE_VERSION="18"
APP_NAME="email-blast-app"

# ============================================
# Helper Functions
# ============================================

print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_command() {
    if command -v $1 &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_error "$1 is not installed"
        return 1
    fi
}

# ============================================
# Step 0: Pre-flight Checks
# ============================================

print_header "Pre-flight Checks"

print_step "Checking required software..."

MISSING_DEPS=0

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge "$REQUIRED_NODE_VERSION" ]; then
        print_success "Node.js $(node -v) installed"
    else
        print_error "Node.js version must be >= $REQUIRED_NODE_VERSION"
        MISSING_DEPS=1
    fi
else
    print_error "Node.js is not installed"
    MISSING_DEPS=1
fi

# Check npm
check_command "npm" || MISSING_DEPS=1

# Check Docker
check_command "docker" || MISSING_DEPS=1

# Check Docker Compose
if docker compose version &> /dev/null; then
    print_success "Docker Compose is installed"
elif docker-compose --version &> /dev/null; then
    print_success "Docker Compose (standalone) is installed"
else
    print_error "Docker Compose is not installed"
    MISSING_DEPS=1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the project root?"
    exit 1
fi

if [ $MISSING_DEPS -eq 1 ]; then
    echo ""
    print_error "Missing required dependencies. Please install them first."
    exit 1
fi

print_success "All required software is installed"

# ============================================
# Step 1: Environment Setup
# ============================================

print_header "Step 1: Environment Configuration"

if [ -f ".env" ]; then
    print_warning ".env file already exists"
    read -p "Do you want to recreate it? (y/n): " RECREATE_ENV
    
    if [ "$RECREATE_ENV" = "y" ] || [ "$RECREATE_ENV" = "Y" ]; then
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
        print_success "Backed up existing .env"
    else
        print_step "Using existing .env file"
        ENV_EXISTS=1
    fi
fi

if [ -z "$ENV_EXISTS" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "Created .env from .env.example"
    else
        print_error ".env.example not found"
        exit 1
    fi
    
    # Generate JWT secret
    print_step "Generating JWT secret..."
    if command -v openssl &> /dev/null; then
        JWT_SECRET=$(openssl rand -base64 32)
        sed -i "s/your-secret-key-change-this/$JWT_SECRET/g" .env 2>/dev/null || \
        sed -i '' "s/your-secret-key-change-this/$JWT_SECRET/g" .env
        print_success "JWT secret generated"
    else
        print_warning "OpenSSL not found. Please set JWT_SECRET manually in .env"
    fi
    
    # Set timezone
    sed -i "s/# TZ=/TZ=/g" .env 2>/dev/null || \
    sed -i '' "s/# TZ=/TZ=/g" .env
    
    print_success ".env file configured"
    print_warning "Please review and update .env with your credentials:"
    echo "   - SMTP settings (if using email)"
    echo "   - Qiscus settings (if using WhatsApp)"
    echo "   - APP_URL (must be publicly accessible)"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

# ============================================
# Step 2: Install Dependencies
# ============================================

print_header "Step 2: Install Dependencies"

print_step "Installing npm packages..."
npm install

if [ $? -eq 0 ]; then
    print_success "Dependencies installed"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# ============================================
# Step 3: Docker Services
# ============================================

print_header "Step 3: Docker Services"

print_step "Checking Docker containers..."

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found"
    exit 1
fi

# Check if Redis container is running
REDIS_CONTAINER=$(docker ps --format '{{.Names}}' | grep redis | head -1)

if [ -z "$REDIS_CONTAINER" ]; then
    print_warning "Redis container not running"
    print_step "Starting Docker services..."
    
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        print_success "Docker services started"
        sleep 3
        REDIS_CONTAINER=$(docker ps --format '{{.Names}}' | grep redis | head -1)
    else
        print_error "Failed to start Docker services"
        exit 1
    fi
else
    print_success "Redis container is already running: $REDIS_CONTAINER"
fi

# Test Redis connection
print_step "Testing Redis connection..."
if docker exec $REDIS_CONTAINER redis-cli ping | grep -q PONG; then
    print_success "Redis is responding"
else
    print_error "Redis is not responding"
    exit 1
fi

# ============================================
# Step 4: Database Setup
# ============================================

print_header "Step 4: Database Initialization"

# Create data directory
print_step "Creating data directory..."
mkdir -p data
print_success "Data directory ready"

# Create tables
print_step "Creating database tables..."
npm run create-tables

if [ $? -eq 0 ]; then
    print_success "Database tables created"
else
    print_error "Failed to create database tables"
    exit 1
fi

# Create role permissions table
print_step "Setting up role permissions..."
npm run create-role-permissions

if [ $? -eq 0 ]; then
    print_success "Role permissions configured"
else
    print_error "Failed to setup role permissions"
    exit 1
fi

# Verify database
print_step "Verifying database setup..."
npm run check-db

# ============================================
# Step 5: Create First User
# ============================================

print_header "Step 5: Create Super Admin User"

print_step "Checking existing users..."
USER_COUNT=$(sqlite3 data/logs.db "SELECT COUNT(*) FROM users" 2>/dev/null || echo "0")

if [ "$USER_COUNT" -gt 0 ]; then
    print_warning "Database already has $USER_COUNT user(s)"
    read -p "Do you want to create another user? (y/n): " CREATE_USER
    
    if [ "$CREATE_USER" != "y" ] && [ "$CREATE_USER" != "Y" ]; then
        print_step "Skipping user creation"
        USER_CREATED=1
    fi
fi

if [ -z "$USER_CREATED" ]; then
    echo ""
    echo -e "${YELLOW}You will now create the first Super Admin user.${NC}"
    echo -e "${YELLOW}This user will have full access to the system.${NC}"
    echo ""
    
    npm run setup-auth
    
    if [ $? -eq 0 ]; then
        print_success "User created successfully"
    else
        print_error "Failed to create user"
        print_warning "You can create a user later with: npm run setup-auth"
    fi
fi

# ============================================
# Step 6: Build Application
# ============================================

print_header "Step 6: Build Application"

print_step "Compiling TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Application built successfully"
else
    print_error "Build failed"
    exit 1
fi

# ============================================
# Step 7: Setup Backup
# ============================================

print_header "Step 7: Backup Configuration"

read -p "Do you want to setup automatic daily backup? (y/n): " SETUP_BACKUP

if [ "$SETUP_BACKUP" = "y" ] || [ "$SETUP_BACKUP" = "Y" ]; then
    print_step "Setting up backup..."
    
    # Make backup scripts executable
    chmod +x scripts/backup/*.sh 2>/dev/null
    
    if [ -f "scripts/backup/setup-backup-cron.sh" ]; then
        bash scripts/backup/setup-backup-cron.sh
    else
        print_warning "Backup setup script not found"
        print_step "You can setup backup later with:"
        echo "   bash scripts/backup/setup-backup-cron.sh"
    fi
else
    print_step "Skipping backup setup"
    print_warning "To setup backup later, run:"
    echo "   bash scripts/backup/setup-backup-cron.sh"
fi

# ============================================
# Step 8: Test System
# ============================================

print_header "Step 8: System Testing"

print_step "Starting application for testing..."

# Start app in background
npm start &
APP_PID=$!

# Wait for app to start
print_step "Waiting for application to start..."
sleep 5

# Test health endpoint
print_step "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health 2>/dev/null)

if echo "$HEALTH_RESPONSE" | grep -q "success"; then
    print_success "Application is responding"
    
    # Test login if user was created
    if [ -z "$USER_CREATED" ]; then
        print_step "You can now test login with:"
        echo ""
        echo "curl -X POST http://localhost:3000/api/auth/login \\"
        echo '  -H "Content-Type: application/json" \\'
        echo "  -d '{"
        echo '    "email": "YOUR_EMAIL",'
        echo '    "password": "YOUR_PASSWORD"'
        echo "  }'"
        echo ""
    fi
else
    print_warning "Application may not be responding correctly"
fi

# Stop test app
kill $APP_PID 2>/dev/null

# ============================================
# Step 9: Production Setup
# ============================================

print_header "Step 9: Production Setup (Optional)"

read -p "Are you deploying to production? (y/n): " IS_PRODUCTION

if [ "$IS_PRODUCTION" = "y" ] || [ "$IS_PRODUCTION" = "Y" ]; then
    print_step "Checking PM2..."
    
    if command -v pm2 &> /dev/null; then
        print_success "PM2 is installed"
        
        read -p "Start application with PM2? (y/n): " START_PM2
        
        if [ "$START_PM2" = "y" ] || [ "$START_PM2" = "Y" ]; then
            print_step "Starting with PM2..."
            pm2 start npm --name "$APP_NAME" -- start
            pm2 save
            
            print_success "Application started with PM2"
            print_step "Useful PM2 commands:"
            echo "   pm2 status              - Check status"
            echo "   pm2 logs $APP_NAME      - View logs"
            echo "   pm2 restart $APP_NAME   - Restart app"
            echo "   pm2 stop $APP_NAME      - Stop app"
        fi
    else
        print_warning "PM2 is not installed"
        echo ""
        echo "To install PM2:"
        echo "   npm install -g pm2"
        echo ""
        echo "To start manually:"
        echo "   npm start"
    fi
    
    # Nginx setup reminder
    echo ""
    print_step "Don't forget to setup Nginx reverse proxy!"
    echo "   1. Create nginx config in /etc/nginx/sites-available/$APP_NAME"
    echo "   2. Enable site: sudo ln -s /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/"
    echo "   3. Test config: sudo nginx -t"
    echo "   4. Reload nginx: sudo systemctl reload nginx"
    echo "   5. Setup SSL: sudo certbot --nginx -d yourdomain.com"
fi

# ============================================
# Final Summary
# ============================================

print_header "🎉 Deployment Complete!"

echo -e "${GREEN}✅ Database initialized${NC}"
echo -e "${GREEN}✅ User created${NC}"
echo -e "${GREEN}✅ Application built${NC}"
echo -e "${GREEN}✅ Docker services running${NC}"

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Next Steps${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

echo -e "${YELLOW}1. Start Application:${NC}"
echo "   Development:  npm run dev"
echo "   Production:   npm start"
echo "   With PM2:     pm2 start npm --name $APP_NAME -- start"
echo ""

echo -e "${YELLOW}2. Test System:${NC}"
echo "   Health check: curl http://localhost:3000/health"
echo "   Full test:    bash scripts/testing/test-api.sh"
echo "   Monitor:      bash scripts/monitoring/health-check.sh"
echo ""

echo -e "${YELLOW}3. Configure Services (if needed):${NC}"
echo "   - Update SMTP settings in .env"
echo "   - Update Qiscus settings in .env"
echo "   - Update APP_URL in .env"
echo "   - Setup Nginx reverse proxy"
echo "   - Setup SSL certificate"
echo ""

echo -e "${YELLOW}4. Monitoring:${NC}"
echo "   Real-time:    bash scripts/monitoring/monitor-realtime.sh"
echo "   Webhooks:     bash scripts/monitoring/monitor-webhooks.sh"
echo "   Logs:         tail -f logs/combined.log"
echo ""

echo -e "${YELLOW}5. Backup:${NC}"
echo "   Manual:       npm run backup"
echo "   List:         bash scripts/backup/backup-monitor.sh"
echo "   Restore:      bash scripts/backup/restore-backup.sh"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  📚 Documentation${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Full documentation: README.md"
echo "API endpoints: docs/API.md"
echo ""

print_success "Fresh deployment completed successfully!"
echo ""