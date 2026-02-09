#!/bin/bash

# Script: Chạy TRÊN SERVER - Migration cho phép reset password không cần email
# Cách dùng: ssh vào server, cd /var/www/hr-management, bash scripts/on-server-migrate-password-reset.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATION_FILE="$PROJECT_DIR/database/migrate_password_reset_allow_null_email.sql"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}MIGRATION: CHO PHÉP RESET PASSWORD KHÔNG CẦN EMAIL${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Kiểm tra file migration
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Không tìm thấy file migration: $MIGRATION_FILE${NC}"
    exit 1
fi

# Kiểm tra biến môi trường database
if [ -z "$DB_USER" ] && [ -z "$PGUSER" ]; then
    DB_USER="hr_user"
else
    DB_USER="${DB_USER:-$PGUSER}"
fi

if [ -z "$DB_NAME" ] && [ -z "$PGDATABASE" ]; then
    DB_NAME="hr_management"
else
    DB_NAME="${DB_NAME:-$PGDATABASE}"
fi

echo -e "${YELLOW}Database: $DB_NAME${NC}"
echo -e "${YELLOW}User: $DB_USER${NC}"
echo ""

# Chạy migration
echo -e "${YELLOW}[1/2] Chạy migration script...${NC}"
if psql -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"; then
    echo -e "${GREEN}✓ Migration thành công${NC}"
else
    echo -e "${RED}❌ Migration thất bại${NC}"
    exit 1
fi
echo ""

# Kiểm tra kết quả
echo -e "${YELLOW}[2/2] Kiểm tra kết quả...${NC}"
psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'password_reset_requests'
AND column_name = 'email';
"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ MIGRATION HOÀN TẤT${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Lưu ý: Nếu cột email có is_nullable = 'YES' thì migration đã thành công.${NC}"
echo ""
