#!/bin/bash

# Script xóa toàn bộ HR App trên server - Giữ lại app cũ
# Chạy trên server: sudo ./remove-hr-app-complete-server.sh

set -e

echo "=========================================="
echo "XÓA TOÀN BỘ HR APP TRÊN SERVER"
echo "=========================================="
echo ""
echo "⚠️  CẢNH BÁO: Script này sẽ xóa:"
echo "   - PM2 apps (hr-rmg-idc-backend, hr-rmg-idc-frontend)"
echo "   - Nginx config (a-hr-rmg-idc và location /hr)"
echo "   - Thư mục code (/var/www/hr-rmg-idc)"
echo "   - Database (HR_Management_System)"
echo "   - Database user (nếu có riêng)"
echo ""
echo "✅ GIỮ LẠI:"
echo "   - App cũ (it-request-tracking)"
echo "   - Database app cũ"
echo "   - PM2 app cũ (it-request-api)"
echo "   - Nginx config app cũ"
echo ""

read -p "Bạn có chắc chắn muốn tiếp tục? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Đã hủy."
    exit 0
fi

# Màu sắc
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Bước 1: Dừng và xóa PM2 apps
echo ""
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
sudo rm -f /etc/nginx/sites-enabled/a-hr-rmg-idc
sudo rm -f /etc/nginx/sites-available/a-hr-rmg-idc
echo -e "${GREEN}✓ Đã xóa Nginx config HR riêng${NC}"

# Xóa location /hr khỏi file it-request-tracking (nếu có)
if grep -q "location /hr" /etc/nginx/sites-available/it-request-tracking 2>/dev/null; then
    echo "  → Tìm thấy location /hr trong it-request-tracking, đang xóa..."
    
    # Backup file
    sudo cp /etc/nginx/sites-available/it-request-tracking /etc/nginx/sites-available/it-request-tracking.backup.$(date +%Y%m%d_%H%M%S)
    
    # Xóa location /hr và /hr/api
    sudo sed -i '/# HR Management System/,/^[[:space:]]*}/d' /etc/nginx/sites-available/it-request-tracking
    sudo sed -i '/location \/hr/,/^[[:space:]]*}/d' /etc/nginx/sites-available/it-request-tracking
    
    echo -e "${GREEN}✓ Đã xóa location /hr${NC}"
else
    echo -e "${GREEN}✓ Không có location /hr để xóa${NC}"
fi
echo ""

# Bước 3: Test và reload Nginx
echo -e "${YELLOW}[3/6] Test và reload Nginx...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✓ Nginx đã reload${NC}"
else
    echo -e "${RED}✗ Lỗi Nginx config! Kiểm tra: sudo nginx -t${NC}"
    exit 1
fi
echo ""

# Bước 4: Xóa thư mục code
echo -e "${YELLOW}[4/6] Xóa thư mục code...${NC}"
if [ -d "/var/www/hr-rmg-idc" ]; then
    echo "  → Đang xóa /var/www/hr-rmg-idc..."
    sudo rm -rf /var/www/hr-rmg-idc
    echo -e "${GREEN}✓ Đã xóa thư mục code${NC}"
else
    echo -e "${GREEN}✓ Thư mục không tồn tại${NC}"
fi
echo ""

# Bước 5: Xóa database
echo -e "${YELLOW}[5/6] Xóa database...${NC}"
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "HR_Management_System"; then
    echo "  → Đang xóa database HR_Management_System..."
    sudo -u postgres psql -c "DROP DATABASE \"HR_Management_System\";" 2>/dev/null || true
    echo -e "${GREEN}✓ Đã xóa database${NC}"
else
    echo -e "${GREEN}✓ Database không tồn tại${NC}"
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

# Kiểm tra database
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "HR_Management_System"; then
    echo -e "${RED}✗ Vẫn còn database HR_Management_System!${NC}"
else
    echo -e "${GREEN}✓ Database: Đã xóa HR_Management_System${NC}"
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
echo "   - Nginx config files (a-hr-rmg-idc)"
echo "   - Location /hr trong it-request-tracking"
echo "   - Thư mục /var/www/hr-rmg-idc"
echo "   - Database HR_Management_System"
echo ""
echo "✅ Đã giữ lại:"
echo "   - App cũ (it-request-tracking)"
echo "   - PM2 app cũ (it-request-api)"
echo "   - Nginx config app cũ (it-request-tracking)"
echo "   - Database app cũ"
echo ""
echo "✅ App cũ vẫn hoạt động bình thường tại: http://27.71.16.15/"
echo ""

