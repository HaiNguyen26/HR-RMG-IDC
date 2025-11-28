#!/bin/bash

# Script xóa toàn bộ HR App - Chỉ giữ lại database backup
# Chạy trên server: sudo ./remove-hr-app-complete.sh

set -e

echo "=========================================="
echo "XÓA TOÀN BỘ HR APP - GIỮ LẠI DATABASE BACKUP"
echo "=========================================="
echo ""

# Màu sắc
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Bước 1: Dừng và xóa PM2 apps
echo -e "${YELLOW}[1/6] Dừng và xóa PM2 apps...${NC}"
pm2 stop hr-rmg-idc-backend 2>/dev/null || true
pm2 stop hr-rmg-idc-frontend 2>/dev/null || true
pm2 delete hr-rmg-idc-backend 2>/dev/null || true
pm2 delete hr-rmg-idc-frontend 2>/dev/null || true
pm2 save
echo -e "${GREEN}✓ Đã xóa PM2 apps${NC}"
echo ""

# Bước 2: Xóa Nginx config
echo -e "${YELLOW}[2/6] Xóa Nginx config...${NC}"
sudo rm -f /etc/nginx/sites-enabled/hr-rmg-idc
sudo rm -f /etc/nginx/sites-enabled/a-hr-rmg-idc
sudo rm -f /etc/nginx/sites-available/hr-rmg-idc
sudo rm -f /etc/nginx/sites-available/a-hr-rmg-idc
echo -e "${GREEN}✓ Đã xóa Nginx config${NC}"
echo ""

# Bước 3: Xóa location /hr khỏi file it-request-tracking (nếu có)
echo -e "${YELLOW}[3/6] Kiểm tra và xóa location /hr khỏi it-request-tracking...${NC}"
if grep -q "location /hr" /etc/nginx/sites-available/it-request-tracking 2>/dev/null; then
    echo "  → Tìm thấy location /hr, đang xóa..."
    sudo sed -i '/# HR Management System/,/^[[:space:]]*}/d' /etc/nginx/sites-available/it-request-tracking
    sudo sed -i '/location \/hr/,/^[[:space:]]*}/d' /etc/nginx/sites-available/it-request-tracking
    echo -e "${GREEN}✓ Đã xóa location /hr${NC}"
else
    echo -e "${GREEN}✓ Không có location /hr để xóa${NC}"
fi
echo ""

# Bước 4: Test và reload Nginx
echo -e "${YELLOW}[4/6] Test và reload Nginx...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✓ Nginx đã reload${NC}"
else
    echo -e "${RED}✗ Lỗi Nginx config! Kiểm tra: sudo nginx -t${NC}"
    exit 1
fi
echo ""

# Bước 5: Xóa thư mục code (giữ lại database backup)
echo -e "${YELLOW}[5/6] Xóa thư mục code...${NC}"
if [ -d "/var/www/hr-rmg-idc" ]; then
    echo "  → Đang xóa /var/www/hr-rmg-idc..."
    sudo rm -rf /var/www/hr-rmg-idc
    echo -e "${GREEN}✓ Đã xóa thư mục code${NC}"
else
    echo -e "${GREEN}✓ Thư mục không tồn tại${NC}"
fi
echo ""

# Bước 6: Xác nhận đã xóa sạch
echo -e "${YELLOW}[6/6] Xác nhận đã xóa sạch...${NC}"
echo ""

# Kiểm tra PM2
if pm2 list | grep -q "hr-rmg-idc"; then
    echo -e "${RED}✗ Vẫn còn PM2 apps HR!${NC}"
    pm2 list | grep hr-rmg-idc
else
    echo -e "${GREEN}✓ PM2: Không còn HR apps${NC}"
fi

# Kiểm tra Nginx
if ls /etc/nginx/sites-enabled/ 2>/dev/null | grep -q "hr"; then
    echo -e "${RED}✗ Vẫn còn Nginx config HR!${NC}"
    ls -la /etc/nginx/sites-enabled/ | grep hr
else
    echo -e "${GREEN}✓ Nginx: Không còn HR config${NC}"
fi

# Kiểm tra folder
if [ -d "/var/www/hr-rmg-idc" ]; then
    echo -e "${RED}✗ Vẫn còn thư mục /var/www/hr-rmg-idc!${NC}"
else
    echo -e "${GREEN}✓ Folder: Đã xóa /var/www/hr-rmg-idc${NC}"
fi

# Kiểm tra location /hr
if sudo nginx -T 2>/dev/null | grep -q "location /hr"; then
    echo -e "${RED}✗ Vẫn còn location /hr trong Nginx!${NC}"
else
    echo -e "${GREEN}✓ Nginx: Không còn location /hr${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}HOÀN TẤT XÓA HR APP${NC}"
echo "=========================================="
echo ""
echo "✅ Đã xóa:"
echo "   - PM2 apps (hr-rmg-idc-backend, hr-rmg-idc-frontend)"
echo "   - Nginx config files"
echo "   - Thư mục /var/www/hr-rmg-idc"
echo ""
echo "✅ Đã giữ lại:"
echo "   - Database backup files (nếu có trong /root hoặc /home)"
echo ""
echo "✅ App cũ (it-request-tracking) vẫn hoạt động bình thường"
echo ""
echo "📝 Tiếp theo: Làm theo hướng dẫn trong DEPLOY_HR_CLEAN.md"

