#!/bin/bash

# Script gộp 2 config Nginx vào 1 server block

echo "=========================================="
echo "Gộp Config Nginx: Cả 2 Apps Trong 1 Server Block"
echo "=========================================="

# Backup configs hiện tại
echo ""
echo "[1/3] Backup configs hiện tại..."
sudo cp /etc/nginx/sites-available/it-request-tracking /etc/nginx/sites-available/it-request-tracking.backup.$(date +%Y%m%d_%H%M%S)
sudo cp /etc/nginx/sites-available/a-hr-rmg-idc /etc/nginx/sites-available/a-hr-rmg-idc.backup.$(date +%Y%m%d_%H%M%S)
echo "  ✅ Đã backup"

# Tạo config mới gộp cả 2 apps
echo ""
echo "[2/3] Tạo config mới gộp cả 2 apps..."
sudo tee /etc/nginx/sites-available/it-request-tracking > /dev/null << 'EOF'
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

    # HR Management System - Backend API (phải đặt TRƯỚC /hr)
    location /hr/api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        rewrite ^/hr/api/(.*)$ /api/$1 break;
    }

    # HR Management System - Frontend (phải đặt TRƯỚC /)
    location /hr {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # IT Request Tracking - Frontend
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=3600";
    }

    # IT Request Tracking - API
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
echo "  ✅ Đã tạo config mới"

# Disable config HR riêng (vì đã gộp vào it-request-tracking)
echo ""
echo "[3/3] Disable config HR riêng..."
sudo rm -f /etc/nginx/sites-enabled/a-hr-rmg-idc
echo "  ✅ Đã disable config HR riêng"

# Đảm bảo config it-request-tracking được enable
sudo ln -sf /etc/nginx/sites-available/it-request-tracking /etc/nginx/sites-enabled/it-request-tracking

# Test và reload
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
    echo "  - App cũ: curl http://27.71.16.15/"
    echo "  - App HR: curl http://27.71.16.15/hr"
    echo ""
    echo "⚠️  Lưu ý: Config HR riêng (a-hr-rmg-idc) đã được disable"
    echo "   Vì đã gộp vào config it-request-tracking"
    echo ""
else
    echo "  ❌ Config có lỗi!"
    sudo nginx -t
    exit 1
fi

