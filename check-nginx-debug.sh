#!/bin/bash

# Script kiểm tra chi tiết Nginx config

echo "=========================================="
echo "Kiểm Tra Chi Tiết Nginx Config"
echo "=========================================="

# 1. Kiểm tra tất cả config đang enable
echo ""
echo "[1] Tất cả config đang enable:"
ls -la /etc/nginx/sites-enabled/

# 2. Kiểm tra config nào đang match location /
echo ""
echo "[2] Config nào đang match location /:"
sudo nginx -T 2>/dev/null | grep -B 10 -A 5 "location /" | head -30

# 3. Kiểm tra server blocks
echo ""
echo "[3] Tất cả server blocks:"
sudo nginx -T 2>/dev/null | grep -E "^[[:space:]]*server[[:space:]]*{" -A 20 | head -50

# 4. Kiểm tra default config
echo ""
echo "[4] Kiểm tra default config:"
if [ -f "/etc/nginx/sites-available/default" ]; then
    echo "  File default tồn tại: /etc/nginx/sites-available/default"
    if [ -L "/etc/nginx/sites-enabled/default" ]; then
        echo "  ❌ Default config ĐANG được enable!"
        echo "  → Xóa: sudo rm /etc/nginx/sites-enabled/default"
    else
        echo "  ✅ Default config không được enable"
    fi
else
    echo "  ✅ Không có file default"
fi

# 5. Kiểm tra config it-request-tracking
echo ""
echo "[5] Kiểm tra config it-request-tracking:"
if [ -f "/etc/nginx/sites-available/it-request-tracking" ]; then
    echo "  ✅ File config tồn tại"
    if [ -L "/etc/nginx/sites-enabled/it-request-tracking" ]; then
        echo "  ✅ Đã được enable"
    else
        echo "  ❌ CHƯA được enable!"
        echo "  → Enable: sudo ln -s /etc/nginx/sites-available/it-request-tracking /etc/nginx/sites-enabled/it-request-tracking"
    fi
    
    echo ""
    echo "  Nội dung config:"
    sudo cat /etc/nginx/sites-available/it-request-tracking
else
    echo "  ❌ File config KHÔNG tồn tại!"
fi

# 6. Kiểm tra thứ tự load
echo ""
echo "[6] Thứ tự load config (theo alphabet):"
ls -1 /etc/nginx/sites-enabled/ | sort

# 7. Test Nginx
echo ""
echo "[7] Test Nginx config:"
sudo nginx -t

echo ""
echo "=========================================="
echo "Kết Quả Kiểm Tra"
echo "=========================================="

