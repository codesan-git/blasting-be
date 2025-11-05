#!/bin/bash

# ============================================
# Quick Start - Minimal Setup
# ============================================
# For quick testing/development setup
# Usage: bash scripts/quick-start.sh

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Quick Start - Email Blast App${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env created${NC}"
    echo -e "${YELLOW}⚠ Please update .env with your credentials${NC}"
    echo ""
fi

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Start Docker
echo -e "${BLUE}Starting Docker services...${NC}"
docker-compose up -d
sleep 3
echo -e "${GREEN}✓ Docker started${NC}"
echo ""

# Setup database
echo -e "${BLUE}Setting up database...${NC}"
npm run create-tables > /dev/null 2>&1
npm run create-role-permissions > /dev/null 2>&1
echo -e "${GREEN}✓ Database ready${NC}"
echo ""

# Check if user exists
USER_COUNT=$(sqlite3 data/logs.db "SELECT COUNT(*) FROM users" 2>/dev/null || echo "0")

if [ "$USER_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}No users found. Creating default super admin...${NC}"
    echo ""
    echo "Creating user:"
    echo "  Email: admin@test.com"
    echo "  Password: admin123"
    echo "  Role: super_admin"
    echo ""
    
    # Create default user using Node.js
    node -e "
    const Database = require('better-sqlite3');
    const bcrypt = require('bcrypt');
    const path = require('path');
    
    async function createUser() {
        const db = new Database(path.join(process.cwd(), 'data', 'logs.db'));
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const now = new Date().toLocaleString('en-US', {timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false}).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '\$3-\$1-\$2 \$4:\$5:\$6');
        
        db.prepare('INSERT INTO users (id, email, password, name, roles, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
            userId,
            'admin@test.com',
            hashedPassword,
            'Super Admin',
            JSON.stringify(['super_admin']),
            1,
            now,
            now
        );
        
        db.close();
        console.log('✓ User created');
    }
    
    createUser().catch(console.error);
    "
    
    echo -e "${GREEN}✓ Default user created${NC}"
else
    echo -e "${GREEN}✓ User already exists${NC}"
fi
echo ""

# Build app
echo -e "${BLUE}Building application...${NC}"
npm run build > /dev/null 2>&1
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Start app
echo -e "${BLUE}Starting application...${NC}"
npm run dev &
APP_PID=$!

sleep 5

# Test health
HEALTH=$(curl -s http://localhost:3000/health 2>/dev/null)

if echo "$HEALTH" | grep -q "success"; then
    echo -e "${GREEN}✓ Application is running!${NC}"
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  🎉 Quick Start Complete!${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Access:${NC}"
    echo "  URL: http://localhost:3000"
    echo "  Health: http://localhost:3000/health"
    echo ""
    echo -e "${YELLOW}Default Credentials:${NC}"
    echo "  Email: admin@test.com"
    echo "  Password: admin123"
    echo ""
    echo -e "${YELLOW}Test Login:${NC}"
    echo "  curl -X POST http://localhost:3000/api/auth/login \\"
    echo '    -H "Content-Type: application/json" \\'
    echo "    -d '{\"email\":\"admin@test.com\",\"password\":\"admin123\"}'"
    echo ""
    echo -e "${YELLOW}Useful Commands:${NC}"
    echo "  npm run dev         - Start development server"
    echo "  npm start          - Start production server"
    echo "  npm run backup     - Create database backup"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    
    # Keep running
    wait $APP_PID
else
    echo -e "${RED}✗ Application failed to start${NC}"
    kill $APP_PID 2>/dev/null
    exit 1
fi