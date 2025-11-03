#!/bin/bash

# Setup Timezone to Jakarta (WIB - UTC+7)

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Setup Timezone to Jakarta (WIB)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Update .env file
echo -e "${BLUE}1. Updating .env file...${NC}"

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found, creating...${NC}"
    cp .env.example .env 2>/dev/null || touch .env
fi

# Check if TZ already exists
if grep -q "^TZ=" .env; then
    # Update existing TZ
    sed -i.bak 's/^TZ=.*/TZ=Asia\/Jakarta/' .env
    echo -e "${GREEN}✓ Updated existing TZ in .env${NC}"
else
    # Add new TZ
    echo "" >> .env
    echo "# Timezone Configuration" >> .env
    echo "TZ=Asia/Jakarta" >> .env
    echo -e "${GREEN}✓ Added TZ to .env${NC}"
fi

echo ""

# 2. Update shell profile
echo -e "${BLUE}2. Updating shell profile...${NC}"

# Detect shell
SHELL_RC=""
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
else
    # Default to bashrc
    SHELL_RC="$HOME/.bashrc"
fi

echo -e "   Detected shell config: ${SHELL_RC}"

if [ -f "$SHELL_RC" ]; then
    if grep -q "export TZ=Asia/Jakarta" "$SHELL_RC"; then
        echo -e "${YELLOW}   TZ already set in $SHELL_RC${NC}"
    else
        echo "" >> "$SHELL_RC"
        echo "# Set timezone to Jakarta (WIB - UTC+7)" >> "$SHELL_RC"
        echo "export TZ=Asia/Jakarta" >> "$SHELL_RC"
        echo -e "${GREEN}✓ Added TZ to $SHELL_RC${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Shell config not found, skipping${NC}"
fi

echo ""

# 3. Set for current session
echo -e "${BLUE}3. Setting timezone for current session...${NC}"
export TZ=Asia/Jakarta
echo -e "${GREEN}✓ TZ set to Asia/Jakarta${NC}"

echo ""

# 4. Update package.json (optional)
echo -e "${BLUE}4. Checking package.json scripts...${NC}"

if [ -f package.json ]; then
    # Check if TZ is already in scripts
    if grep -q "TZ=Asia/Jakarta" package.json; then
        echo -e "${YELLOW}   TZ already in package.json scripts${NC}"
    else
        echo -e "${YELLOW}   To add TZ to package.json scripts, update manually:${NC}"
        echo -e '   "dev": "TZ=Asia/Jakarta ts-node src/index.ts"'
        echo -e '   "start": "TZ=Asia/Jakarta node dist/index.js"'
    fi
else
    echo -e "${YELLOW}   package.json not found${NC}"
fi

echo ""

# 5. Verify timezone
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

CURRENT_TIME=$(TZ=Asia/Jakarta date '+%Y-%m-%d %H:%M:%S %Z')
echo -e "Current time (Jakarta): ${GREEN}${CURRENT_TIME}${NC}"

# Node.js verification
if command -v node &> /dev/null; then
    NODE_TIME=$(TZ=Asia/Jakarta node -e "console.log(new Date().toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'}))")
    echo -e "Node.js time (Jakarta): ${GREEN}${NODE_TIME}${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Timezone Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Restart your terminal or run:"
echo "   source $SHELL_RC"
echo ""
echo "2. Restart the application:"
echo "   npm run dev"
echo ""
echo "3. Verify timezone in app:"
echo "   - Check startup logs for timezone info"
echo "   - All timestamps should show Jakarta time"
echo ""

echo -e "${BLUE}Note:${NC}"
echo "- Database timestamps: Already in local time"
echo "- API responses: Will show Jakarta time"
echo "- Logs: Will show Jakarta time"
echo "- Monitoring: Will show Jakarta time (WIB)"
echo ""

exit 0