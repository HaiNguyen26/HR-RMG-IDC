#!/bin/bash

# Script sửa hoàn chỉnh lỗi HR app

echo "=========================================="
echo "Sửa Hoàn Chỉnh Lỗi HR App"
echo "=========================================="

# 1. Xóa config HR riêng (nếu còn) để tránh conflict
echo ""
echo "[1/5] Xóa config HR riêng để tránh conflict..."
if [ -L "/etc/nginx/sites-enabled/a-hr-rmg-idc" ]; then
    echo "  ⚠️  Tìm thấy config HR riêng - Đang xóa..."
    sudo rm /etc/nginx/sites-enabled/a-hr-rmg-idc
    echo "  ✅ Đã xóa config HR riêng"
else
    echo "  ✅ Không có config HR riêng"
fi

# 2. Kiểm tra config it-request-tracking có đầy đủ không
echo ""
echo "[2/5] Kiểm tra config it-request-tracking..."
if sudo grep -q "location /hr" /etc/nginx/sites-available/it-request-tracking; then
    echo "  ✅ Có location /hr"
else
    echo "  ❌ THIẾU location /hr - Cần chạy merge-nginx-config.sh"
    exit 1
fi

# 3. Kiểm tra backend endpoint
echo ""
echo "[3/5] Kiểm tra backend endpoints..."
echo "  → Test /health (endpoint đúng):"
if curl -s http://localhost:3001/health | grep -q "OK" 2>/dev/null; then
    echo "    ✅ Backend hoạt động (/health)"
else
    echo "    ⚠️  /health không phản hồi"
    echo "    → Kiểm tra: curl http://localhost:3001/health"
fi

echo "  → Test /api/employees:"
if curl -s http://localhost:3001/api/employees > /dev/null 2>&1; then
    echo "    ✅ Backend API hoạt động (/api/employees)"
else
    echo "    ⚠️  /api/employees không phản hồi"
    echo "    → Kiểm tra: curl http://localhost:3001/api/employees"
fi

# 4. Kiểm tra frontend
echo ""
echo "[4/5] Kiểm tra frontend..."
if curl -s http://localhost:3002 | grep -q "<!DOCTYPE html>" 2>/dev/null; then
    echo "  ✅ Frontend serve HTML"
else
    echo "  ⚠️  Frontend không serve HTML đúng"
    echo "  → Kiểm tra: curl http://localhost:3002"
fi

# 5. Test và reload Nginx
echo ""
echo "[5/5] Test và reload Nginx..."
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    # Kiểm tra warnings
    if sudo nginx -t 2>&1 | grep -q "conflicting server name"; then
        echo "  ⚠️  Vẫn còn conflicting server name warnings"
        echo "  → Kiểm tra: sudo nginx -t"
    else
        echo "  ✅ Không có warnings"
    fi
    
    sudo systemctl reload nginx
    echo "  ✅ Nginx đã reload"
else
    echo "  ❌ Config có lỗi!"
    sudo nginx -t
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ HOÀN TẤT"
echo "=========================================="
echo ""
echo "Kiểm tra:"
echo "  1. Backend: curl http://localhost:3001/api/employees"
echo "  2. Frontend: curl http://localhost:3002"
echo "  3. App HR qua Nginx: curl http://27.71.16.15/hr"
echo ""
echo "Nếu vẫn trắng, kiểm tra browser console (F12) để xem lỗi JavaScript"
echo ""

