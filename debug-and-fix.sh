#!/bin/bash
# Script debug và sửa lỗi frontend

echo "🔍 Debug Frontend PM2 Error"
echo "=========================="
echo ""

CONFIG_FILE="/var/www/hr-rmg-idc/ecosystem.config.js"

# 1. Kiểm tra nội dung file config hiện tại
echo "1️⃣  Kiểm tra ecosystem.config.js hiện tại:"
echo "----------------------------------------"
grep -A 5 "hr-rmg-idc-frontend" "$CONFIG_FILE" | head -10
echo ""

# 2. Kiểm tra args có phải string không
echo "2️⃣  Kiểm tra args:"
if grep -q "args: '-s build -l 3002'" "$CONFIG_FILE"; then
    echo "   ❌ Args đang là STRING (sai)"
    echo "   Đang sửa..."
    cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    sed -i "s/args: '-s build -l 3002'/args: ['-s', 'build', '-l', '3002']/" "$CONFIG_FILE"
    echo "   ✅ Đã sửa thành ARRAY"
elif grep -q "args: \['-s', 'build', '-l', '3002'\]" "$CONFIG_FILE"; then
    echo "   ✅ Args đã là ARRAY (đúng)"
else
    echo "   ⚠️  Không tìm thấy args pattern, kiểm tra thủ công"
    echo "   Nội dung args hiện tại:"
    grep "args:" "$CONFIG_FILE" | grep -A 1 "hr-rmg-idc-frontend"
fi
echo ""

# 3. Kiểm tra lại sau khi sửa
echo "3️⃣  Nội dung sau khi sửa:"
echo "----------------------------------------"
grep -A 5 "hr-rmg-idc-frontend" "$CONFIG_FILE" | head -10
echo ""

# 4. Dừng hoàn toàn và xóa
echo "4️⃣  Dừng và xóa process cũ:"
pm2 stop hr-rmg-idc-frontend 2>/dev/null || true
pm2 delete hr-rmg-idc-frontend 2>/dev/null || true
echo "   ✅ Đã xóa"
echo ""

# 5. Xóa PM2 cache (nếu có)
echo "5️⃣  Xóa PM2 cache:"
pm2 kill 2>/dev/null || true
sleep 1
echo "   ✅ Đã xóa cache"
echo ""

# 6. Khởi động lại
echo "6️⃣  Khởi động lại từ config mới:"
cd /var/www/hr-rmg-idc
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend
sleep 3
echo ""

# 7. Kiểm tra kết quả
echo "7️⃣  Kết quả:"
echo "----------------------------------------"
pm2 list | grep hr-rmg-idc-frontend
echo ""

# 8. Xem log
echo "8️⃣  Logs (10 dòng cuối):"
echo "----------------------------------------"
pm2 logs hr-rmg-idc-frontend --lines 10 --nostream
echo ""

# 9. Kiểm tra file config một lần nữa
echo "9️⃣  Xác nhận file config cuối cùng:"
echo "----------------------------------------"
cat "$CONFIG_FILE" | grep -A 3 "hr-rmg-idc-frontend" | grep -A 3 "name:"
echo ""

echo "✅ Hoàn tất!"
echo ""
echo "Nếu vẫn lỗi, hãy chạy:"
echo "  cat $CONFIG_FILE | grep -A 10 'hr-rmg-idc-frontend'"

