#!/bin/bash

# Script: Kiểm tra routes trên server
# Mô tả: Kiểm tra xem các routes mới có được đăng ký và hoạt động không

set -e

# Màu sắc cho output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Đường dẫn
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}KIỂM TRA ROUTES TRÊN SERVER${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Kiểm tra file routes có tồn tại không
echo -e "${YELLOW}[1/6] Kiểm tra file routes...${NC}"
if [ -f "$PROJECT_DIR/backend/routes/lateEarlyRequests.js" ]; then
    echo -e "${GREEN}✓ lateEarlyRequests.js tồn tại${NC}"
else
    echo -e "${RED}❌ lateEarlyRequests.js KHÔNG TỒN TẠI${NC}"
    exit 1
fi

if [ -f "$PROJECT_DIR/backend/routes/mealAllowanceRequests.js" ]; then
    echo -e "${GREEN}✓ mealAllowanceRequests.js tồn tại${NC}"
else
    echo -e "${RED}❌ mealAllowanceRequests.js KHÔNG TỒN TẠI${NC}"
    exit 1
fi
echo ""

# 2. Kiểm tra server.js có import routes không
echo -e "${YELLOW}[2/6] Kiểm tra server.js có import routes...${NC}"
if grep -q "lateEarlyRequests" "$PROJECT_DIR/backend/server.js"; then
    echo -e "${GREEN}✓ lateEarlyRequests được import trong server.js${NC}"
else
    echo -e "${RED}❌ lateEarlyRequests KHÔNG được import trong server.js${NC}"
    exit 1
fi

if grep -q "mealAllowanceRequests" "$PROJECT_DIR/backend/server.js"; then
    echo -e "${GREEN}✓ mealAllowanceRequests được import trong server.js${NC}"
else
    echo -e "${RED}❌ mealAllowanceRequests KHÔNG được import trong server.js${NC}"
    exit 1
fi
echo ""

# 3. Kiểm tra routes có được mount không
echo -e "${YELLOW}[3/6] Kiểm tra routes có được mount không...${NC}"
if grep -q "/api/late-early-requests" "$PROJECT_DIR/backend/server.js"; then
    echo -e "${GREEN}✓ /api/late-early-requests được mount${NC}"
else
    echo -e "${RED}❌ /api/late-early-requests KHÔNG được mount${NC}"
    exit 1
fi

if grep -q "/api/meal-allowance-requests" "$PROJECT_DIR/backend/server.js"; then
    echo -e "${GREEN}✓ /api/meal-allowance-requests được mount${NC}"
else
    echo -e "${RED}❌ /api/meal-allowance-requests KHÔNG được mount${NC}"
    exit 1
fi
echo ""

# 4. Kiểm tra PM2 status
echo -e "${YELLOW}[4/6] Kiểm tra PM2 status...${NC}"
if pm2 list | grep -q "hr-management-api"; then
    PM2_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="hr-management-api") | .pm2_env.status')
    if [ "$PM2_STATUS" == "online" ]; then
        echo -e "${GREEN}✓ PM2 process hr-management-api đang chạy (status: $PM2_STATUS)${NC}"
    else
        echo -e "${YELLOW}⚠ PM2 process hr-management-api có status: $PM2_STATUS${NC}"
    fi
else
    echo -e "${RED}❌ PM2 process hr-management-api KHÔNG TỒN TẠI${NC}"
    exit 1
fi
echo ""

# 5. Kiểm tra database có bảng không
echo -e "${YELLOW}[5/6] Kiểm tra database có bảng không...${NC}"
DB_NAME="HR_Management_System"
DB_USER="hr_user"

LATE_EARLY_EXISTS=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'late_early_requests');" 2>/dev/null | xargs)
MEAL_ALLOWANCE_EXISTS=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meal_allowance_requests');" 2>/dev/null | xargs)

if [ "$LATE_EARLY_EXISTS" == "t" ]; then
    echo -e "${GREEN}✓ Bảng late_early_requests tồn tại${NC}"
else
    echo -e "${RED}❌ Bảng late_early_requests KHÔNG TỒN TẠI - Cần chạy migration${NC}"
fi

if [ "$MEAL_ALLOWANCE_EXISTS" == "t" ]; then
    echo -e "${GREEN}✓ Bảng meal_allowance_requests tồn tại${NC}"
else
    echo -e "${RED}❌ Bảng meal_allowance_requests KHÔNG TỒN TẠI - Cần chạy migration${NC}"
fi
echo ""

# 6. Test API endpoints
echo -e "${YELLOW}[6/6] Test API endpoints...${NC}"
BACKEND_PORT=3000

# Test late-early-requests
LATE_EARLY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/api/late-early-requests 2>/dev/null || echo "000")
if [ "$LATE_EARLY_RESPONSE" == "200" ] || [ "$LATE_EARLY_RESPONSE" == "401" ] || [ "$LATE_EARLY_RESPONSE" == "403" ]; then
    echo -e "${GREEN}✓ /api/late-early-requests trả về HTTP $LATE_EARLY_RESPONSE (endpoint hoạt động)${NC}"
elif [ "$LATE_EARLY_RESPONSE" == "404" ]; then
    echo -e "${RED}❌ /api/late-early-requests trả về HTTP 404 (endpoint KHÔNG TỒN TẠI)${NC}"
else
    echo -e "${YELLOW}⚠ /api/late-early-requests trả về HTTP $LATE_EARLY_RESPONSE (có thể server không chạy)${NC}"
fi

# Test meal-allowance-requests
MEAL_ALLOWANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/api/meal-allowance-requests 2>/dev/null || echo "000")
if [ "$MEAL_ALLOWANCE_RESPONSE" == "200" ] || [ "$MEAL_ALLOWANCE_RESPONSE" == "401" ] || [ "$MEAL_ALLOWANCE_RESPONSE" == "403" ]; then
    echo -e "${GREEN}✓ /api/meal-allowance-requests trả về HTTP $MEAL_ALLOWANCE_RESPONSE (endpoint hoạt động)${NC}"
elif [ "$MEAL_ALLOWANCE_RESPONSE" == "404" ]; then
    echo -e "${RED}❌ /api/meal-allowance-requests trả về HTTP 404 (endpoint KHÔNG TỒN TẠI)${NC}"
else
    echo -e "${YELLOW}⚠ /api/meal-allowance-requests trả về HTTP $MEAL_ALLOWANCE_RESPONSE (có thể server không chạy)${NC}"
fi
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}KẾT QUẢ KIỂM TRA${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Nếu có lỗi 404:"
echo "  1. Đảm bảo đã pull code mới: git pull origin main"
echo "  2. Đảm bảo đã chạy migrations: bash scripts/pull-and-migrate-on-server.sh"
echo "  3. Đảm bảo PM2 đã restart: pm2 restart hr-management-api"
echo "  4. Kiểm tra logs: pm2 logs hr-management-api --lines 100"
echo ""

