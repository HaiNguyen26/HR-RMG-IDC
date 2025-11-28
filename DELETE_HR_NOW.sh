#!/bin/bash

# Script xóa TOÀN BỘ HR App khỏi server - Bao gồm cả database
# An toàn, KHÔNG ảnh hưởng App IT Request

echo "🗑️  XÓA TOÀN BỘ HR APP (Bao gồm cả database)..."
echo ""
echo "⚠️  CẢNH BÁO: Script này sẽ xóa:"
echo "   - PM2 processes: hr-rmg-idc-backend, hr-rmg-idc-frontend"
echo "   - Directory: /var/www/hr-rmg-idc"
echo "   - Nginx config: /etc/nginx/sites-available/hr-rmg-idc"
echo "   - Database: HR_Management_System_RMG_IDC"
echo ""
read -p "Bạn có chắc chắn muốn xóa? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Hủy bỏ!"
    exit 1
fi

echo ""
echo "🚀 Bắt đầu xóa..."

# 1. Xóa PM2 processes
echo ""
echo "1️⃣  Xóa PM2 processes..."
pm2 stop hr-rmg-idc-backend 2>/dev/null || true
pm2 delete hr-rmg-idc-backend 2>/dev/null || true
pm2 stop hr-rmg-idc-frontend 2>/dev/null || true
pm2 delete hr-rmg-idc-frontend 2>/dev/null || true
pm2 save
echo "✅ Đã xóa PM2 processes"

# 2. Xóa Nginx config
echo ""
echo "2️⃣  Xóa Nginx config..."
sudo rm -f /etc/nginx/sites-enabled/hr-rmg-idc
sudo rm -f /etc/nginx/sites-available/hr-rmg-idc
if sudo nginx -t >/dev/null 2>&1; then
    sudo systemctl reload nginx
    echo "✅ Đã xóa Nginx config và reload"
else
    echo "⚠️  Nginx config có lỗi, kiểm tra lại"
fi

# 3. Xóa directory code
echo ""
echo "3️⃣  Xóa folder /var/www/hr-rmg-idc..."
if [ -d "/var/www/hr-rmg-idc" ]; then
    sudo rm -rf /var/www/hr-rmg-idc
    echo "✅ Đã xóa folder code"
else
    echo "⚠️  Folder không tồn tại"
fi

# 4. Xóa database
echo ""
echo "4️⃣  Xóa database HR_Management_System_RMG_IDC..."
sudo -u postgres psql -c 'DROP DATABASE IF EXISTS "HR_Management_System_RMG_IDC";' 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Đã xóa database"
else
    echo "⚠️  Database không tồn tại hoặc lỗi"
fi

# 5. Kiểm tra kết quả
echo ""
echo "========================================"
echo "🔍 KIỂM TRA KẾT QUẢ"
echo "========================================"
echo ""

echo "=== PM2 Processes ==="
if pm2 list 2>/dev/null | grep -q hr-rmg-idc; then
    echo "⚠️  Vẫn còn HR processes:"
    pm2 list | grep hr-rmg-idc
else
    echo "✅ Không còn HR processes"
fi

echo ""
echo "=== /var/www ==="
if ls -la /var/www 2>/dev/null | grep -q hr-rmg-idc; then
    echo "⚠️  Vẫn còn HR folder:"
    ls -la /var/www | grep hr-rmg-idc
else
    echo "✅ Không còn HR folder"
fi

echo ""
echo "=== Nginx Configs ==="
if ls -la /etc/nginx/sites-enabled/ 2>/dev/null | grep -q hr-rmg-idc; then
    echo "⚠️  Vẫn còn HR config trong sites-enabled"
else
    echo "✅ Không còn HR Nginx config"
fi

if ls -la /etc/nginx/sites-available/ 2>/dev/null | grep -q hr-rmg-idc; then
    echo "⚠️  Vẫn còn HR config trong sites-available"
else
    echo "✅ Không còn HR Nginx config file"
fi

echo ""
echo "=== Database ==="
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='HR_Management_System_RMG_IDC'" 2>/dev/null)
if [ "$DB_EXISTS" = "1" ]; then
    echo "⚠️  Database vẫn tồn tại"
else
    echo "✅ Database đã được xóa"
fi

echo ""
echo "=== App IT Request (Kiểm tra không bị ảnh hưởng) ==="
if pm2 list 2>/dev/null | grep -q "it-request"; then
    echo "✅ App IT Request vẫn chạy bình thường:"
    pm2 list | grep "it-request"
else
    echo "ℹ️  Không tìm thấy it-request process"
fi

echo ""
echo "========================================"
echo "🎉 HOÀN TẤT!"
echo "========================================"
echo ""
echo "✅ HR app đã được xóa hoàn toàn khỏi server."
echo "✅ Database đã được xóa."
echo "✅ App IT Request vẫn hoạt động bình thường."
echo ""
echo "Bạn có thể deploy lại HR app từ đầu! 🚀"

