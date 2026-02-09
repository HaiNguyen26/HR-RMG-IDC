#!/bin/bash

# Script: Chạy TRÊN SERVER - Pull code và áp dụng block Nginx HR từ repo
# Cách dùng: ssh vào server, cd /var/www/hr-management, bash scripts/on-server-pull-and-apply-nginx.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NGINX_SERVER="/etc/nginx/sites-available/it-request-tracking"
NGINX_REPO="$PROJECT_DIR/nginx/hr-management.conf"
BACKUP_FILE="/etc/nginx/sites-available/it-request-tracking.backup.$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PULL CODE & ÁP DỤNG NGINX CONFIG HR${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Pull code
echo -e "${YELLOW}[1/4] Pull code từ git...${NC}"
cd "$PROJECT_DIR"
git pull origin main
echo -e "${GREEN}✓ Đã pull code${NC}"
echo ""

# 2. Kiểm tra file
if [ ! -f "$NGINX_REPO" ]; then
    echo -e "${RED}❌ Không tìm thấy $NGINX_REPO${NC}"
    exit 1
fi

if [ ! -f "$NGINX_SERVER" ]; then
    echo -e "${RED}❌ Không tìm thấy config Nginx server: $NGINX_SERVER${NC}"
    exit 1
fi

# 3. Backup
echo -e "${YELLOW}[2/4] Backup và áp dụng block Nginx HR...${NC}"
sudo cp "$NGINX_SERVER" "$BACKUP_FILE"
echo -e "${GREEN}✓ Đã backup: $BACKUP_FILE${NC}"

# Nội dung block HR mới (bỏ 4 dòng comment đầu file repo)
HR_BLOCK=$(mktemp)
tail -n +5 "$NGINX_REPO" > "$HR_BLOCK"

# Thay block cũ bằng block mới: từ "# HR Management System" đến hết "location /hr/api" block
# awk đọc file 1 = config server, file 2 = block mới
TEMP_OUT=$(mktemp)
awk '
BEGIN {
    while ((getline < ARGV[2]) > 0)
        block = block $0 "\n"
    close(ARGV[2])
    ARGV[2] = ""
}
/^# HR Management System/ {
    skip = 1
    printed = 0
    next
}
skip && /^[[:space:]]*location \// && !/^[[:space:]]*location \/hr/ {
    if (!printed) { printf "%s", block; printed = 1 }
    skip = 0
    print
    next
}
skip { next }
{ print }
' "$NGINX_SERVER" "$HR_BLOCK" > "$TEMP_OUT"

# Kiểm tra đã thay được chưa (có client_max_body_size trong output)
if grep -q "client_max_body_size" "$TEMP_OUT"; then
    sudo cp "$TEMP_OUT" "$NGINX_SERVER"
    echo -e "${GREEN}✓ Đã thay block Nginx HR bằng config từ repo${NC}"
else
    # Fallback: chỉ chèn client_max_body_size vào location /hr/api nếu chưa có
    echo -e "${YELLOW}⚠ Giữ config cũ, chỉ thêm client_max_body_size nếu thiếu...${NC}"
    sudo cp "$BACKUP_FILE" "$NGINX_SERVER"
    if ! grep -q "client_max_body_size" "$NGINX_SERVER"; then
        sudo sed -i '/location \/hr\/api {/a\    client_max_body_size 100M;' "$NGINX_SERVER"
        echo -e "${GREEN}✓ Đã thêm client_max_body_size 100M vào location /hr/api${NC}"
    fi
fi

rm -f "$HR_BLOCK" "$TEMP_OUT"
echo ""

# 4. Test và reload nginx
echo -e "${YELLOW}[3/4] Test cấu hình Nginx...${NC}"
if ! sudo nginx -t 2>/dev/null; then
    echo -e "${RED}❌ Nginx config lỗi. Khôi phục backup...${NC}"
    sudo cp "$BACKUP_FILE" "$NGINX_SERVER"
    exit 1b
fi
echo -e "${GREEN}✓ Config hợp lệ${NC}"
echo ""

echo -e "${YELLOW}[4/4] Reload Nginx...${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✓ Đã reload Nginx${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ XONG. Nginx đã dùng config HR (client_max_body_size 100M, cache prevention).${NC}"
echo -e "${GREEN}========================================${NC}"
