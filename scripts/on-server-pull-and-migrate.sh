#!/bin/bash

# Script: Chạy TRÊN SERVER - Pull code và chạy migration password reset
# Cách dùng: ssh vào server, cd /var/www/hr-management, bash scripts/on-server-pull-and-migrate.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PULL CODE & MIGRATE PASSWORD RESET${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Pull code
echo -e "${YELLOW}[1/3] Pull code từ git...${NC}"
cd "$PROJECT_DIR"
git pull origin main
echo -e "${GREEN}✓ Đã pull code${NC}"
echo ""

# 2. Chạy migration
echo -e "${YELLOW}[2/3] Chạy migration password reset...${NC}"
if [ -f "$SCRIPT_DIR/on-server-migrate-password-reset.sh" ]; then
    bash "$SCRIPT_DIR/on-server-migrate-password-reset.sh"
else
    echo -e "${YELLOW}⚠ Script migration không tìm thấy, chạy SQL trực tiếp...${NC}"
    MIGRATION_FILE="$PROJECT_DIR/database/migrate_password_reset_allow_null_email.sql"
    if [ -f "$MIGRATION_FILE" ]; then
        DB_USER="${DB_USER:-hr_user}"
        DB_NAME="${DB_NAME:-hr_management}"
        psql -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"
        echo -e "${GREEN}✓ Đã chạy migration${NC}"
    else
        echo -e "${RED}❌ Không tìm thấy file migration${NC}"
        exit 1
    fi
fi
echo ""

# 3. Restart backend (nếu cần)
echo -e "${YELLOW}[3/3] Restart backend service...${NC}"
echo -e "${YELLOW}Lưu ý: Bạn cần restart backend service thủ công${NC}"
echo -e "${YELLOW}Ví dụ:${NC}"
echo -e "${BLUE}  pm2 restart hr-backend${NC}"
echo -e "${BLUE}  hoặc${NC}"
echo -e "${BLUE}  sudo systemctl restart hr-backend${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ HOÀN TẤT${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
