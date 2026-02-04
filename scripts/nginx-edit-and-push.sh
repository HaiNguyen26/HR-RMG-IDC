#!/bin/bash

# Script: Tự động đảm bảo block Nginx HR đúng, commit và push lên git
# Chạy trên máy local (Git Bash hoặc WSL) sau khi đã chỉnh nginx/hr-management.conf

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}NGINX EDIT BLOCK & PUSH GIT${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

cd "$PROJECT_DIR"

# Kiểm tra có thay đổi không
echo -e "${YELLOW}[1/3] Kiểm tra thay đổi...${NC}"
if ! git diff --quiet nginx/ 2>/dev/null && ! git diff --quiet --cached nginx/ 2>/dev/null; then
    echo -e "${GREEN}✓ Có thay đổi trong nginx/${NC}"
elif ! git diff --quiet scripts/ docs/ 2>/dev/null; then
    echo -e "${GREEN}✓ Có thay đổi trong scripts/ hoặc docs/${NC}"
else
    echo -e "${YELLOW}⚠ Không có thay đổi chưa commit. Đang kiểm tra trạng thái git...${NC}"
fi

# Đảm bảo block HR có client_max_body_size và cache prevention
NGINX_HR="$PROJECT_DIR/nginx/hr-management.conf"
if [ ! -f "$NGINX_HR" ]; then
    echo -e "${RED}❌ Không tìm thấy $NGINX_HR${NC}"
    exit 1
fi

if ! grep -q "client_max_body_size" "$NGINX_HR"; then
    echo -e "${YELLOW}⚠ Chưa có client_max_body_size trong nginx config. Vui lòng thêm thủ công rồi chạy lại script.${NC}"
    exit 1
fi

if ! grep -q "Prevent caching of HTML" "$NGINX_HR"; then
    echo -e "${YELLOW}⚠ Chưa có block prevent cache HTML. Vui lòng cập nhật nginx/hr-management.conf rồi chạy lại.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Nginx block HR đã đủ client_max_body_size và cache prevention${NC}"
echo ""

# Add và commit
echo -e "${YELLOW}[2/3] Git add & commit...${NC}"
git add nginx/ scripts/ docs/ 2>/dev/null || true
git add -u nginx/ scripts/ docs/ 2>/dev/null || true

if git diff --cached --quiet 2>/dev/null; then
    echo -e "${YELLOW}⚠ Không có thay đổi để commit. (Có thể đã commit rồi.)${NC}"
    echo -e "${BLUE}Đang push nếu có commit chưa push...${NC}"
else
    git commit -m "Nginx: client_max_body_size 100M, prevent cache HTML cho /hr"
    echo -e "${GREEN}✓ Đã commit${NC}"
fi
echo ""

# Push
echo -e "${YELLOW}[3/3] Push lên git...${NC}"
git push origin main
echo -e "${GREEN}✓ Đã push lên origin main${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ XONG. Trên server chạy: bash scripts/on-server-pull-and-apply-nginx.sh${NC}"
echo -e "${GREEN}========================================${NC}"
