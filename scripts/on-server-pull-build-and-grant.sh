#!/bin/bash

# Script: Pull code, grant permissions, build frontend và restart trên server
# Cách dùng: bash scripts/on-server-pull-build-and-grant.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PULL CODE, GRANT PERMISSIONS & BUILD${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Pull code
echo -e "${YELLOW}[1/5] Pull code từ git...${NC}"
cd "$PROJECT_DIR"
git pull origin main
echo -e "${GREEN}✓ Đã pull code${NC}"
echo ""

# 2. Tìm database
echo -e "${YELLOW}[2/5] Tìm database...${NC}"
DB_NAME="HR_Management_System"
DB_LIST=$(sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | tr -d ' ' | grep -v "^$" | grep -v "^Name$")

for test_db in "HR_Management_System" "hr_management" "hr-management" "HR_Management_System_RMG_IDC"; do
    if echo "$DB_LIST" | grep -qi "^${test_db}$"; then
        DB_NAME="$test_db"
        break
    fi
done

echo -e "${GREEN}✓ Database: $DB_NAME${NC}"
echo ""

# 3. Grant permissions cho password_reset_requests
echo -e "${YELLOW}[3/5] Grant permissions cho password_reset_requests...${NC}"
GRANT_FILE="$PROJECT_DIR/database/grant_permissions_password_reset.sql"
if [ -f "$GRANT_FILE" ]; then
    if sudo -u postgres psql -d "$DB_NAME" -f "$GRANT_FILE" 2>/dev/null; then
        echo -e "${GREEN}✓ Đã grant permissions${NC}"
    else
        echo -e "${YELLOW}⚠ Grant permissions có lỗi, thử SQL trực tiếp...${NC}"
        sudo -u postgres psql -d "$DB_NAME" << EOF
GRANT ALL PRIVILEGES ON TABLE password_reset_requests TO hr_user;
GRANT ALL PRIVILEGES ON SEQUENCE password_reset_requests_id_seq TO hr_user;
GRANT USAGE ON SCHEMA public TO hr_user;
EOF
        echo -e "${GREEN}✓ Đã grant permissions (SQL trực tiếp)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ File grant permissions không tìm thấy, chạy SQL trực tiếp...${NC}"
    sudo -u postgres psql -d "$DB_NAME" << EOF
GRANT ALL PRIVILEGES ON TABLE password_reset_requests TO hr_user;
GRANT ALL PRIVILEGES ON SEQUENCE password_reset_requests_id_seq TO hr_user;
GRANT USAGE ON SCHEMA public TO hr_user;
EOF
    echo -e "${GREEN}✓ Đã grant permissions${NC}"
fi
echo ""

# 4. Build frontend
echo -e "${YELLOW}[4/5] Build frontend...${NC}"
cd "$PROJECT_DIR/frontend"
REACT_APP_API_URL="/hr/api" npm run build
echo -e "${GREEN}✓ Đã build frontend${NC}"
echo ""

# 5. Restart backend
echo -e "${YELLOW}[5/5] Restart backend...${NC}"
cd "$PROJECT_DIR"
if command -v pm2 &> /dev/null; then
    pm2 restart hr-management-api || pm2 restart hr-backend || echo "PM2 không chạy"
    echo -e "${GREEN}✓ Đã restart PM2${NC}"
elif systemctl is-active --quiet hr-backend; then
    sudo systemctl restart hr-backend
    echo -e "${GREEN}✓ Đã restart systemd service${NC}"
else
    echo -e "${YELLOW}⚠ Không tìm thấy PM2 hoặc systemd service. Vui lòng restart thủ công.${NC}"
fi
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ HOÀN TẤT${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
