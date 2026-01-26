#!/bin/bash

# Script: Pull code mới và build frontend (KHÔNG migrate DB)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PULL CODE (NO MIGRATE)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}[1/4] Dừng PM2 process...${NC}"
pm2 stop hr-management-api || echo "PM2 process không chạy hoặc không tìm thấy"
echo -e "${GREEN}✓ Đã dừng PM2${NC}"
echo ""

echo -e "${YELLOW}[2/4] Pull code mới từ git...${NC}"
cd "$PROJECT_DIR"
git pull origin main
echo -e "${GREEN}✓ Đã pull code thành công${NC}"
echo ""

echo -e "${YELLOW}[3/4] Install dependencies và Build lại frontend...${NC}"
cd "$PROJECT_DIR/frontend"

if [ ! -f .env ]; then
    echo "REACT_APP_API_URL=/hr/api" > .env
    echo -e "${BLUE}→ Đã tạo file .env cho frontend${NC}"
fi

echo "Đang install dependencies..."
npm install || echo -e "${YELLOW}⚠ Lỗi install, tiếp tục build...${NC}"

echo "Đang build frontend (có thể mất vài phút)..."
REACT_APP_API_URL="/hr/api" npm run build || echo -e "${YELLOW}⚠ Lỗi build, tiếp tục...${NC}"
echo ""

echo -e "${YELLOW}[4/4] Khởi động lại PM2...${NC}"
pm2 start hr-management-api
pm2 save
echo -e "${GREEN}✓ Đã khởi động lại PM2${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ HOÀN THÀNH PULL (NO MIGRATE)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
