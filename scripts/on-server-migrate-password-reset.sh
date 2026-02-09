#!/bin/bash

# Script: Chạy TRÊN SERVER - Migration cho phép reset password không cần email
# Cách dùng: ssh vào server, cd /var/www/hr-management, bash scripts/on-server-migrate-password-reset.sh

# Không dùng set -e để có thể thử nhiều cách authentication
# set -e

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
    # Thử các tên database phổ biến theo thứ tự ưu tiên
    # 1. HR_Management_System (tên trên server thực tế)
    # 2. hr_management (tên thường dùng)
    # 3. hr-management (tên với dấu gạch ngang)
    DB_NAME="HR_Management_System"
else
    DB_NAME="${DB_NAME:-$PGDATABASE}"
fi

echo -e "${YELLOW}Database: $DB_NAME${NC}"
echo -e "${YELLOW}User: $DB_USER${NC}"
echo ""

# Kiểm tra database có tồn tại không
echo -e "${YELLOW}[0/2] Kiểm tra database có tồn tại...${NC}"
DB_EXISTS=false
DB_LIST=$(sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | tr -d ' ' | grep -v "^$" | grep -v "^Name$")

# Thử các tên database phổ biến
for test_db in "HR_Management_System" "hr_management" "hr-management" "HR_Management_System_RMG_IDC"; do
    if echo "$DB_LIST" | grep -qi "^${test_db}$"; then
        DB_NAME="$test_db"
        DB_EXISTS=true
        echo -e "${GREEN}✓ Database '$DB_NAME' tồn tại${NC}"
        break
    fi
done

if [ "$DB_EXISTS" = false ]; then
    echo -e "${YELLOW}⚠ Database '$DB_NAME' không tồn tại. Đang liệt kê các database có sẵn...${NC}"
    echo -e "${BLUE}Các database có sẵn:${NC}"
    echo "$DB_LIST" | head -10
    echo ""
    read -p "Nhập tên database đúng (hoặc Enter để bỏ qua migration): " -r
    if [ -n "$REPLY" ]; then
        DB_NAME="$REPLY"
        DB_EXISTS=true
        echo -e "${GREEN}✓ Sử dụng database: $DB_NAME${NC}"
    else
        echo -e "${YELLOW}⚠ Bỏ qua migration. Bạn có thể chạy sau khi xác định đúng tên database.${NC}"
        exit 0
    fi
fi
echo ""

# Chạy migration với nhiều cách thử
echo -e "${YELLOW}[1/2] Chạy migration script...${NC}"
MIGRATION_SUCCESS=false

# Cách 1: Thử với user hiện tại (nếu là postgres hoặc có quyền)
if psql -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓ Migration thành công (cách 1)${NC}"
    MIGRATION_SUCCESS=true
# Cách 2: Thử với sudo -u postgres
elif sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓ Migration thành công (cách 2: với postgres user)${NC}"
    MIGRATION_SUCCESS=true
# Cách 3: Thử với PGPASSWORD nếu có
elif [ -n "$PGPASSWORD" ] && PGPASSWORD="$PGPASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -h localhost -f "$MIGRATION_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓ Migration thành công (cách 3: với password)${NC}"
    MIGRATION_SUCCESS=true
# Cách 4: Chạy SQL trực tiếp với postgres user
elif sudo -u postgres psql -d "$DB_NAME" -c "ALTER TABLE password_reset_requests ALTER COLUMN email DROP NOT NULL;" 2>/dev/null; then
    echo -e "${GREEN}✓ Migration thành công (cách 4: SQL trực tiếp)${NC}"
    MIGRATION_SUCCESS=true
else
    echo -e "${YELLOW}⚠ Không thể chạy migration tự động. Vui lòng chạy thủ công:${NC}"
    echo -e "${BLUE}sudo -u postgres psql -d $DB_NAME -f $MIGRATION_FILE${NC}"
    echo -e "${BLUE}hoặc${NC}"
    echo -e "${BLUE}sudo -u postgres psql -d $DB_NAME -c \"ALTER TABLE password_reset_requests ALTER COLUMN email DROP NOT NULL;\"${NC}"
    echo ""
    read -p "Bạn có muốn thử chạy với sudo -u postgres? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION_FILE"; then
            echo -e "${GREEN}✓ Migration thành công${NC}"
            MIGRATION_SUCCESS=true
        else
            echo -e "${RED}❌ Migration thất bại${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠ Bỏ qua migration. Bạn có thể chạy sau.${NC}"
        MIGRATION_SUCCESS=true  # Không fail script, chỉ cảnh báo
    fi
fi

if [ "$MIGRATION_SUCCESS" = false ]; then
    echo -e "${RED}❌ Migration thất bại${NC}"
    exit 1
fi
echo ""

# Kiểm tra kết quả
echo -e "${YELLOW}[2/2] Kiểm tra kết quả...${NC}"
if psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'password_reset_requests'
AND column_name = 'email';
" 2>/dev/null; then
    echo ""
elif sudo -u postgres psql -d "$DB_NAME" -c "
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'password_reset_requests'
AND column_name = 'email';
" 2>/dev/null; then
    echo ""
else
    echo -e "${YELLOW}⚠ Không thể kiểm tra kết quả tự động. Vui lòng kiểm tra thủ công:${NC}"
    echo -e "${BLUE}sudo -u postgres psql -d $DB_NAME -c \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'password_reset_requests' AND column_name = 'email';\"${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ MIGRATION HOÀN TẤT${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Lưu ý: Nếu cột email có is_nullable = 'YES' thì migration đã thành công.${NC}"
echo ""
