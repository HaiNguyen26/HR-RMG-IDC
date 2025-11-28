#!/bin/bash

# Script xóa HR App khỏi server
# Không ảnh hưởng đến App IT Request

set -e  # Dừng nếu có lỗi

echo "🗑️  BẮT ĐẦU XÓA HR APP..."
echo ""

# Kiểm tra PM2 processes HR app
echo "📋 Kiểm tra PM2 processes HR app..."
pm2 list | grep hr-rmg-idc || echo "Không tìm thấy HR processes trong PM2"

echo ""
echo "📋 Kiểm tra App IT Request (đảm bảo vẫn còn)..."
pm2 list | grep -i "it-request\|request" || echo "⚠️  Không tìm thấy it-request process"

echo ""
read -p "⚠️  Bạn có chắc muốn xóa HR app? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Hủy bỏ!"
    exit 1
fi

# Bước 1: Xóa PM2 processes
echo ""
echo "1️⃣  Xóa PM2 processes..."
pm2 stop hr-rmg-idc-backend 2>/dev/null || echo "   Backend process không tồn tại"
pm2 delete hr-rmg-idc-backend 2>/dev/null || echo "   Backend process không tồn tại"
pm2 stop hr-rmg-idc-frontend 2>/dev/null || echo "   Frontend process không tồn tại"
pm2 delete hr-rmg-idc-frontend 2>/dev/null || echo "   Frontend process không tồn tại"
pm2 save
echo "✅ Đã xóa PM2 processes"

# Bước 2: Xóa Nginx config
echo ""
echo "2️⃣  Xóa Nginx config..."
if [ -f "/etc/nginx/sites-enabled/hr-rmg-idc" ] || [ -L "/etc/nginx/sites-enabled/hr-rmg-idc" ]; then
    sudo rm -f /etc/nginx/sites-enabled/hr-rmg-idc
    echo "   Đã xóa symlink"
else
    echo "   Symlink không tồn tại"
fi

if [ -f "/etc/nginx/sites-available/hr-rmg-idc" ]; then
    sudo rm -f /etc/nginx/sites-available/hr-rmg-idc
    echo "   Đã xóa config file"
else
    echo "   Config file không tồn tại"
fi

# Kiểm tra và reload Nginx
if sudo nginx -t 2>/dev/null; then
    sudo systemctl reload nginx
    echo "✅ Đã xóa Nginx config và reload"
else
    echo "⚠️  Nginx config có lỗi, kiểm tra lại!"
    sudo nginx -t
fi

# Bước 3: Xóa directory
echo ""
echo "3️⃣  Xóa directory code..."
if [ -d "/var/www/hr-rmg-idc" ]; then
    sudo rm -rf /var/www/hr-rmg-idc
    echo "✅ Đã xóa directory /var/www/hr-rmg-idc"
else
    echo "⚠️  Directory /var/www/hr-rmg-idc không tồn tại"
fi

# Bước 4: Hỏi xóa database
echo ""
read -p "🗄️  Bạn có muốn xóa database HR_Management_System_RMG_IDC? (yes/no): " delete_db

if [ "$delete_db" == "yes" ]; then
    echo "   Xóa database..."
    sudo -u postgres psql -c 'DROP DATABASE IF EXISTS "HR_Management_System_RMG_IDC";' 2>/dev/null || echo "   Database không tồn tại hoặc lỗi"
    echo "✅ Đã xóa database (hoặc database không tồn tại)"
else
    echo "⏭️  Giữ lại database"
fi

# Kiểm tra kết quả
echo ""
echo "========================================"
echo "🔍 KIỂM TRA KẾT QUẢ"
echo "========================================"
echo ""

echo "=== PM2 Processes ==="
pm2 list
echo ""

echo "=== /var/www ==="
if ls -la /var/www 2>/dev/null | grep -q hr-rmg-idc; then
    echo "⚠️  Vẫn còn thư mục hr-rmg-idc!"
else
    echo "✅ HR folder đã xóa"
fi
echo ""

echo "=== Nginx Configs ==="
if ls -la /etc/nginx/sites-enabled/ 2>/dev/null | grep -q hr-rmg-idc; then
    echo "⚠️  Vẫn còn HR config trong sites-enabled!"
else
    echo "✅ HR Nginx config đã xóa"
fi

if ls -la /etc/nginx/sites-available/ 2>/dev/null | grep -q hr-rmg-idc; then
    echo "⚠️  Vẫn còn HR config trong sites-available!"
else
    echo "✅ HR Nginx config file đã xóa"
fi
echo ""

echo "=== Ports 3001, 3002 ==="
if netstat -tulpn 2>/dev/null | grep -qE ":3001|:3002"; then
    echo "⚠️  Vẫn còn process trên port 3001 hoặc 3002:"
    netstat -tulpn | grep -E ":3001|:3002"
else
    echo "✅ Ports 3001, 3002 đã giải phóng"
fi
echo ""

echo "=== App IT Request (kiểm tra vẫn hoạt động) ==="
pm2 list | grep -i "it-request\|request" || echo "⚠️  Không tìm thấy it-request process"
echo ""

echo "========================================"
echo "🎉 HOÀN TẤT!"
echo "========================================"
echo ""
echo "✅ HR app đã được xóa khỏi server."
echo "✅ App IT Request vẫn hoạt động bình thường (nếu có)."
echo ""
echo "Bạn có thể deploy lại HR app từ đầu! 🚀"

