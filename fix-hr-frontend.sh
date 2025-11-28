#!/bin/bash

# Script sửa lỗi frontend HR trắng

echo "=========================================="
echo "Sửa Lỗi Frontend HR Trắng"
echo "=========================================="

# 1. Kiểm tra frontend đã build chưa
echo ""
echo "[1/4] Kiểm tra frontend đã build chưa..."
if [ -d "/var/www/hr-rmg-idc/frontend/build" ]; then
    echo "  ✅ Thư mục build tồn tại"
    if [ -f "/var/www/hr-rmg-idc/frontend/build/index.html" ]; then
        echo "  ✅ File index.html tồn tại"
        
        # Kiểm tra homepage trong package.json
        if grep -q '"homepage": "/hr"' /var/www/hr-rmg-idc/frontend/package.json; then
            echo "  ✅ Homepage đã đúng: /hr"
        else
            echo "  ⚠️  Homepage chưa đúng - Cần rebuild"
        fi
    else
        echo "  ❌ File index.html không tồn tại - Cần build"
    fi
else
    echo "  ❌ Thư mục build không tồn tại - Cần build"
fi

# 2. Kiểm tra PM2 frontend
echo ""
echo "[2/4] Kiểm tra PM2 frontend..."
if pm2 list | grep -q "hr-rmg-idc-frontend.*online"; then
    echo "  ✅ PM2 frontend đang chạy"
    pm2 list | grep hr-rmg-idc-frontend
else
    echo "  ❌ PM2 frontend không chạy hoặc offline"
    pm2 list | grep hr-rmg-idc-frontend
fi

# 3. Kiểm tra backend
echo ""
echo "[3/4] Kiểm tra backend..."
if pm2 list | grep -q "hr-rmg-idc-backend.*online"; then
    echo "  ✅ PM2 backend đang chạy"
    
    # Test API
    echo "  → Test API:"
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "    ✅ Backend API hoạt động"
    else
        echo "    ❌ Backend API không phản hồi"
    fi
else
    echo "  ❌ PM2 backend không chạy hoặc offline"
fi

# 4. Kiểm tra Nginx config
echo ""
echo "[4/4] Kiểm tra Nginx config..."
if sudo grep -q "location /hr" /etc/nginx/sites-available/it-request-tracking; then
    echo "  ✅ Nginx có location /hr"
    
    # Kiểm tra có proxy_pass đúng không
    if sudo grep -A 5 "location /hr" /etc/nginx/sites-available/it-request-tracking | grep -q "proxy_pass http://localhost:3002"; then
        echo "  ✅ Proxy pass đúng: localhost:3002"
    else
        echo "  ⚠️  Proxy pass có thể sai"
    fi
else
    echo "  ❌ Nginx không có location /hr"
fi

echo ""
echo "=========================================="
echo "Hướng Dẫn Sửa"
echo "=========================================="
echo ""
echo "Nếu frontend chưa build hoặc homepage sai:"
echo "  1. cd /var/www/hr-rmg-idc/frontend"
echo "  2. Kiểm tra package.json có homepage='/hr'"
echo "  3. npm run build"
echo "  4. pm2 restart hr-rmg-idc-frontend"
echo ""
echo "Nếu PM2 không chạy:"
echo "  pm2 start ecosystem.config.js"
echo ""
echo "Nếu backend không hoạt động:"
echo "  pm2 restart hr-rmg-idc-backend"
echo "  Kiểm tra: curl http://localhost:3001/api/health"
echo ""
echo "Kiểm tra logs:"
echo "  pm2 logs hr-rmg-idc-frontend"
echo "  pm2 logs hr-rmg-idc-backend"
echo ""

