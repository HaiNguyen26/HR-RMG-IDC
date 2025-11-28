#!/bin/bash

# Script sửa nhanh Nginx để cả 2 apps hoạt động

echo "=========================================="
echo "Sửa Nginx: Cả 2 Apps Hoạt Động"
echo "=========================================="

# 1. Kiểm tra và sửa config app cũ
echo ""
echo "[1/4] Kiểm tra config app cũ..."
OLD_CONFIG="/etc/nginx/sites-available/it-request-tracking"
OLD_ENABLED="/etc/nginx/sites-enabled/it-request-tracking"

if [ ! -f "$OLD_CONFIG" ]; then
    echo "  ❌ File config không tồn tại - Đang tạo..."
    sudo tee "$OLD_CONFIG" > /dev/null << 'EOF'
server {
    listen 80;
    server_name 27.71.16.15;

    access_log /var/log/nginx/it-request-access.log;
    error_log /var/log/nginx/it-request-error.log;

    root /var/www/it-request-tracking/webapp/dist;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # App cũ - location /
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=3600";
    }

    # App cũ - API
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api/uploads {
        proxy_pass http://127.0.0.1:4000/api/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
    echo "  ✅ Đã tạo file config"
else
    echo "  ✅ File config tồn tại"
    
    # Kiểm tra có location / chưa
    if ! sudo grep -q "^[[:space:]]*location /[[:space:]]*{" "$OLD_CONFIG"; then
        echo "  ⚠️  THIẾU location / - Cần kiểm tra thủ công"
        echo "     Mở file: sudo nano $OLD_CONFIG"
        echo "     Đảm bảo có location / để serve app cũ"
    else
        echo "  ✅ Có location /"
    fi
fi

# Enable app cũ nếu chưa enable
if [ ! -L "$OLD_ENABLED" ]; then
    echo "  ⚠️  Chưa enable - Đang enable..."
    sudo ln -s "$OLD_CONFIG" "$OLD_ENABLED"
    echo "  ✅ Đã enable"
else
    echo "  ✅ Đã được enable"
fi

# 2. Kiểm tra config HR app
echo ""
echo "[2/4] Kiểm tra config HR app..."
HR_CONFIG="/etc/nginx/sites-available/a-hr-rmg-idc"
HR_ENABLED="/etc/nginx/sites-enabled/a-hr-rmg-idc"

if [ ! -f "$HR_CONFIG" ]; then
    echo "  ❌ File config không tồn tại!"
    echo "     Tạo file theo hướng dẫn trong DEPLOY_HR_CLEAN.md"
else
    echo "  ✅ File config tồn tại"
    
    # Kiểm tra KHÔNG có location / (sai)
    if sudo grep -q "^[[:space:]]*location /[[:space:]]*{" "$HR_CONFIG"; then
        echo "  ❌ CÓ location / trong config HR (SAI!)"
        echo "     Config HR chỉ được có location /hr và /hr/api"
        echo "     Sửa file: sudo nano $HR_CONFIG"
    else
        echo "  ✅ Không có location / (đúng)"
    fi
fi

# Enable HR app nếu chưa enable
if [ ! -L "$HR_ENABLED" ]; then
    echo "  ⚠️  Chưa enable - Đang enable..."
    sudo ln -s "$HR_CONFIG" "$HR_ENABLED"
    echo "  ✅ Đã enable"
else
    echo "  ✅ Đã được enable"
fi

# 3. Kiểm tra default config (có thể gây conflict)
echo ""
echo "[3/4] Kiểm tra default config..."
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    echo "  ⚠️  Default config đang được enable - Có thể gây conflict"
    echo "     Disable: sudo rm /etc/nginx/sites-enabled/default"
    read -p "     Bạn có muốn disable default config? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo rm /etc/nginx/sites-enabled/default
        echo "  ✅ Đã disable default config"
    fi
else
    echo "  ✅ Default config không được enable"
fi

# 4. Test và reload Nginx
echo ""
echo "[4/4] Test và reload Nginx..."
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo "  ✅ Config syntax OK"
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
echo "  - App cũ: http://27.71.16.15/"
echo "  - App HR: http://27.71.16.15/hr"
echo ""

