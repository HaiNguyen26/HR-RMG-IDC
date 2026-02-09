#!/bin/bash

# Script: Grant permissions cho bảng password_reset_requests
# Cách dùng: bash scripts/on-server-grant-password-reset-permissions.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
GRANT_FILE="$PROJECT_DIR/database/grant_permissions_password_reset.sql"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}GRANT PERMISSIONS PASSWORD RESET${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Tìm database
DB_NAME="HR_Management_System"
DB_LIST=$(sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | tr -d ' ' | grep -v "^$" | grep -v "^Name$")

for test_db in "HR_Management_System" "hr_management" "hr-management" "HR_Management_System_RMG_IDC"; do
    if echo "$DB_LIST" | grep -qi "^${test_db}$"; then
        DB_NAME="$test_db"
        break
    fi
done

echo -e "${YELLOW}Database: $DB_NAME${NC}"
echo ""

# Kiểm tra file
if [ ! -f "$GRANT_FILE" ]; then
    echo -e "${RED}❌ Không tìm thấy file: $GRANT_FILE${NC}"
    exit 1
fi

# Chạy grant permissions
echo -e "${YELLOW}[1/2] Grant permissions...${NC}"
if sudo -u postgres psql -d "$DB_NAME" -f "$GRANT_FILE"; then
    echo -e "${GREEN}✓ Đã grant permissions${NC}"
else
    echo -e "${RED}❌ Grant permissions thất bại${NC}"
    exit 1
fi
echo ""

# Kiểm tra quyền
echo -e "${YELLOW}[2/2] Kiểm tra quyền...${NC}"
sudo -u postgres psql -d "$DB_NAME" -c "
SELECT 
    grantee,
    privilege_type,
    table_name
FROM information_schema.role_table_grants
WHERE table_name = 'password_reset_requests'
AND grantee IN ('hr_user', 'public')
ORDER BY grantee, privilege_type;
"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ HOÀN TẤT${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
