#!/bin/bash

# Script: Cập nhật Nginx config để prevent caching HTML files
# Mô tả: Thêm cache prevention headers cho HTML files trong location /hr

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

NGINX_CONFIG="/etc/nginx/sites-available/it-request-tracking"
BACKUP_FILE="/etc/nginx/sites-available/it-request-tracking.backup.$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CẬP NHẬT NGINX CONFIG - PREVENT CACHE HTML${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Kiểm tra file config có tồn tại không
if [ ! -f "$NGINX_CONFIG" ]; then
    echo -e "${RED}❌ Không tìm thấy file config: $NGINX_CONFIG${NC}"
    exit 1
fi

# Backup config hiện tại
echo -e "${YELLOW}[1/4] Backup config hiện tại...${NC}"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✓ Đã backup config vào: $BACKUP_FILE${NC}"
echo ""

# Kiểm tra xem đã có phần prevent cache HTML chưa
if grep -q "Prevent caching of HTML files" "$NGINX_CONFIG"; then
    echo -e "${YELLOW}⚠ Config đã có phần prevent cache HTML${NC}"
    echo -e "${YELLOW}Bạn có muốn cập nhật lại không? (y/n)${NC}"
    read -r response
    if [ "$response" != "y" ] && [ "$response" != "Y" ]; then
        echo -e "${BLUE}Đã hủy cập nhật${NC}"
        exit 0
    fi
fi

# Tìm vị trí location /hr block
echo -e "${YELLOW}[2/4] Tìm location /hr block...${NC}"
if ! grep -q "location /hr {" "$NGINX_CONFIG"; then
    echo -e "${RED}❌ Không tìm thấy location /hr block trong config${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Đã tìm thấy location /hr block${NC}"
echo ""

# Kiểm tra xem đã có phần prevent cache HTML chưa
if grep -q "location ~\* \\\.(html)\$" "$NGINX_CONFIG"; then
    echo -e "${YELLOW}⚠ Đã có phần prevent cache HTML, đang cập nhật...${NC}"
    # Xóa phần cũ nếu có
    sudo sed -i '/# Prevent caching of HTML files/,/^[[:space:]]*}/d' "$NGINX_CONFIG"
fi

# Tìm dòng cuối của location /hr block (trước dấu })
echo -e "${YELLOW}[3/4] Thêm cache prevention headers...${NC}"

# Tạo temp file với config mới
TEMP_FILE=$(mktemp)

# Đọc file và thêm phần prevent cache HTML vào trước dòng "}" cuối cùng của location /hr
awk '
    /location \/hr \{/ {
        in_hr_block = 1
        print
        next
    }
    in_hr_block && /^[[:space:]]*# Cache static assets/ {
        # Thêm phần prevent cache HTML trước phần cache static assets
        print "    # Prevent caching of HTML files"
        print "    location ~* \\\\.(html)$ {"
        print "        add_header Cache-Control \"no-cache, no-store, must-revalidate\";"
        print "        add_header Pragma \"no-cache\";"
        print "        add_header Expires \"0\";"
        print "    }"
        print ""
        print
        next
    }
    in_hr_block && /^[[:space:]]*\}/ {
        # Nếu chưa thêm phần prevent cache và gặp dấu } cuối cùng của location /hr
        if (!prevent_cache_added) {
            print "    # Prevent caching of HTML files"
            print "    location ~* \\\\.(html)$ {"
            print "        add_header Cache-Control \"no-cache, no-store, must-revalidate\";"
            print "        add_header Pragma \"no-cache\";"
            print "        add_header Expires \"0\";"
            print "    }"
            print ""
            prevent_cache_added = 1
        }
        in_hr_block = 0
        print
        next
    }
    {
        print
    }
' "$NGINX_CONFIG" > "$TEMP_FILE"

# Copy temp file về config
sudo cp "$TEMP_FILE" "$NGINX_CONFIG"
rm "$TEMP_FILE"

echo -e "${GREEN}✓ Đã thêm cache prevention headers${NC}"
echo ""

# Test nginx config
echo -e "${YELLOW}[4/4] Test nginx config...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✓ Nginx config hợp lệ${NC}"
    echo ""
    echo -e "${YELLOW}Bạn có muốn reload nginx ngay không? (y/n)${NC}"
    read -r response
    if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
        sudo systemctl reload nginx
        echo -e "${GREEN}✓ Đã reload nginx${NC}"
    else
        echo -e "${YELLOW}⚠ Chưa reload nginx. Bạn cần chạy: sudo systemctl reload nginx${NC}"
    fi
else
    echo -e "${RED}❌ Nginx config có lỗi!${NC}"
    echo -e "${YELLOW}Đang khôi phục từ backup...${NC}"
    sudo cp "$BACKUP_FILE" "$NGINX_CONFIG"
    echo -e "${GREEN}✓ Đã khôi phục từ backup${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ HOÀN THÀNH CẬP NHẬT NGINX CONFIG${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Đã thêm cache prevention headers cho HTML files"
echo "HTML files sẽ không bị cache, browser sẽ luôn tải version mới"
echo ""
