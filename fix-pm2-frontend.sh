#!/bin/bash
# Script để sửa lỗi PM2 frontend (args phải là array)

echo "🔧 Sửa lỗi PM2 frontend config..."

# Đường dẫn file config
CONFIG_FILE="/var/www/hr-rmg-idc/ecosystem.config.js"

# Backup file cũ
cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Đã backup config cũ"

# Sửa args từ string sang array
sed -i "s/args: '-s build -l 3002'/args: ['-s', 'build', '-l', '3002']/" "$CONFIG_FILE"

echo "✅ Đã sửa ecosystem.config.js"

# Kiểm tra xem đã sửa đúng chưa
if grep -q "args: \['-s', 'build', '-l', '3002'\]" "$CONFIG_FILE"; then
    echo "✅ Xác nhận: args đã được sửa thành array"
else
    echo "❌ Cảnh báo: Có thể chưa sửa đúng. Vui lòng kiểm tra thủ công."
    echo "File location: $CONFIG_FILE"
    exit 1
fi

# Dừng và xóa process frontend cũ
echo "🛑 Dừng process frontend cũ..."
pm2 stop hr-rmg-idc-frontend 2>/dev/null || true
pm2 delete hr-rmg-idc-frontend 2>/dev/null || true

# Khởi động lại từ config mới
echo "🚀 Khởi động lại frontend..."
cd /var/www/hr-rmg-idc
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend

# Đợi 2 giây
sleep 2

# Kiểm tra status
echo ""
echo "📊 PM2 Status:"
pm2 list | grep hr-rmg-idc-frontend

echo ""
echo "📋 Logs (5 dòng cuối):"
pm2 logs hr-rmg-idc-frontend --lines 5 --nostream

echo ""
echo "✅ Hoàn tất! Kiểm tra status với: pm2 list"
echo "📋 Xem logs với: pm2 logs hr-rmg-idc-frontend"

