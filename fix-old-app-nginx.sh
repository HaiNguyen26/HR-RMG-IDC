#!/bin/bash

# Script sửa nhanh để app cũ hoạt động đúng

echo "=========================================="
echo "Sửa App Cũ: Không Còn Trang Mặc Định"
echo "=========================================="

# 1. Kiểm tra config app cũ
echo ""
echo "[1/3] Kiểm tra config app cũ..."
OLD_CONFIG="/etc/nginx/sites-available/it-request-tracking"

if [ ! -f "$OLD_CONFIG" ]; then
    echo "  ❌ File config không tồn tại!"
    exit 1
fi

# Kiểm tra nội dung config
if ! sudo grep -q "location /" "$OLD_CONFIG"; then
    echo "  ❌ THIẾU location / - Đang sửa..."
    
    # Backup
    sudo cp "$OLD_CONFIG" "${OLD_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Sửa file config
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

    # App cũ - location / (QUAN TRỌNG!)
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
    echo "  ✅ Đã sửa file config"
else
    echo "  ✅ Có location /"
fi

# 2. Đảm bảo config được enable
echo ""
echo "[2/3] Kiểm tra config được enable..."
OLD_ENABLED="/etc/nginx/sites-enabled/it-request-tracking"

if [ ! -L "$OLD_ENABLED" ]; then
    echo "  ⚠️  Chưa enable - Đang enable..."
    sudo ln -s "$OLD_CONFIG" "$OLD_ENABLED"
    echo "  ✅ Đã enable"
else
    echo "  ✅ Đã được enable"
fi

# 3. Kiểm tra và xóa default config
echo ""
echo "[3/3] Kiểm tra default config..."
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    echo "  ⚠️  Default config đang enable - Đang xóa..."
    sudo rm /etc/nginx/sites-enabled/default
    echo "  ✅ Đã xóa default config"
else
    echo "  ✅ Default config không enable"
fi

# 4. Test và reload
echo ""
echo "Test và reload Nginx..."
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    sudo systemctl reload nginx
    echo "  ✅ Nginx đã reload"
    
    echo ""
    echo "=========================================="
    echo "✅ HOÀN TẤT"
    echo "=========================================="
    echo ""
    echo "Kiểm tra:"
    echo "  curl http://27.71.16.15/"
    echo "  Phải trả về HTML của app cũ, không phải 'Welcome to nginx!'"
    echo ""
else
    echo "  ❌ Config có lỗi!"
    sudo nginx -t
    exit 1
fi

