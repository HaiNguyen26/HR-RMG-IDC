#!/bin/bash

# Script: Fix permissions cho late_early_requests và meal_allowance_requests
# Mô tả: Cấp quyền cho hr_user trên các bảng mới

set -e

# Màu sắc cho output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Thông tin database
DB_NAME="HR_Management_System"
DB_USER="hr_user"

# Đường dẫn
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}FIX PERMISSIONS CHO CÁC BẢNG MỚI${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Kiểm tra file migration có tồn tại không
echo -e "${YELLOW}[1/3] Kiểm tra file migration...${NC}"
MIGRATION_FILE="$PROJECT_DIR/database/grant_permissions_late_early_meal_allowance.sql"
if [ -f "$MIGRATION_FILE" ]; then
    echo -e "${GREEN}✓ File migration tồn tại: $MIGRATION_FILE${NC}"
else
    echo -e "${RED}❌ File migration KHÔNG TỒN TẠI: $MIGRATION_FILE${NC}"
    echo -e "${YELLOW}Đang pull code mới...${NC}"
    cd "$PROJECT_DIR"
    git pull origin main
    if [ ! -f "$MIGRATION_FILE" ]; then
        echo -e "${RED}❌ Vẫn không tìm thấy file migration sau khi pull${NC}"
        exit 1
    fi
fi
echo ""

# 2. Chạy migration
echo -e "${YELLOW}[2/3] Chạy migration cấp quyền...${NC}"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migration thành công - Đã cấp quyền cho hr_user${NC}"
else
    echo -e "${RED}❌ Lỗi khi chạy migration${NC}"
    exit 1
fi
echo ""

# 3. Kiểm tra quyền đã được cấp chưa
echo -e "${YELLOW}[3/3] Kiểm tra quyền đã được cấp...${NC}"

# Kiểm tra quyền trên late_early_requests
LATE_EARLY_PERMISSIONS=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT has_table_privilege('hr_user', 'late_early_requests', 'SELECT');" 2>/dev/null | xargs)
if [ "$LATE_EARLY_PERMISSIONS" == "t" ]; then
    echo -e "${GREEN}✓ hr_user có quyền SELECT trên late_early_requests${NC}"
else
    echo -e "${RED}❌ hr_user KHÔNG có quyền SELECT trên late_early_requests${NC}"
fi

# Kiểm tra quyền trên meal_allowance_requests
MEAL_ALLOWANCE_PERMISSIONS=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT has_table_privilege('hr_user', 'meal_allowance_requests', 'SELECT');" 2>/dev/null | xargs)
if [ "$MEAL_ALLOWANCE_PERMISSIONS" == "t" ]; then
    echo -e "${GREEN}✓ hr_user có quyền SELECT trên meal_allowance_requests${NC}"
else
    echo -e "${RED}❌ hr_user KHÔNG có quyền SELECT trên meal_allowance_requests${NC}"
fi

# Kiểm tra quyền trên meal_allowance_items
MEAL_ITEMS_PERMISSIONS=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT has_table_privilege('hr_user', 'meal_allowance_items', 'SELECT');" 2>/dev/null | xargs)
if [ "$MEAL_ITEMS_PERMISSIONS" == "t" ]; then
    echo -e "${GREEN}✓ hr_user có quyền SELECT trên meal_allowance_items${NC}"
else
    echo -e "${RED}❌ hr_user KHÔNG có quyền SELECT trên meal_allowance_items${NC}"
fi
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}✅ HOÀN THÀNH FIX PERMISSIONS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Bây giờ hãy test lại API endpoints:"
echo "  curl http://localhost:3000/api/late-early-requests"
echo "  curl http://localhost:3000/api/meal-allowance-requests"
echo ""

