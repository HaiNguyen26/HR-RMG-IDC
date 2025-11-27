#!/bin/bash

# Script deploy tự động cho Server mới (27.71.16.15)
# HR Management System - RMG-IDC

set -e  # Dừng nếu có lỗi

echo "=========================================="
echo "🚀 DEPLOY HR MANAGEMENT SYSTEM - RMG-IDC"
echo "Server: 27.71.16.15"
echo "=========================================="
echo ""

# Màu sắc
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Thông tin
APP_NAME="hr-rmg-idc"
APP_DIR="/var/www/hr-rmg-idc"
DB_NAME="HR_Management_System_RMG_IDC"
DB_USER="hr_user_rmg_idc"
DB_PASSWORD="Hainguyen261097"
BACKEND_PORT=3001
FRONTEND_PORT=3002
GITHUB_REPO="https://github.com/HaiNguyen26/HR---RMG-IDC.git"

# Kiểm tra đang chạy với quyền root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}⚠️  Vui lòng chạy với quyền root (sudo)${NC}"
    exit 1
fi

echo "📋 Thông tin deploy:"
echo "   App Name: $APP_NAME"
echo "   Thư mục: $APP_DIR"
echo "   Database: $DB_NAME"
echo "   Backend Port: $BACKEND_PORT"
echo "   Frontend Port: $FRONTEND_PORT"
echo ""

# Bước 1: Kiểm tra và cài Prerequisites
echo "📦 Bước 1: Kiểm tra Prerequisites..."

# Node.js
if ! command -v node &> /dev/null; then
    echo "   ⏳ Cài đặt Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    NODE_VERSION=$(node --version)
    echo "   ✅ Node.js: $NODE_VERSION"
fi

# PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "   ⏳ Cài đặt PostgreSQL..."
    apt update
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
else
    echo "   ✅ PostgreSQL đã cài đặt"
fi

# Git
if ! command -v git &> /dev/null; then
    echo "   ⏳ Cài đặt Git..."
    apt install -y git
else
    echo "   ✅ Git đã cài đặt"
fi

# PM2
if ! command -v pm2 &> /dev/null; then
    echo "   ⏳ Cài đặt PM2..."
    npm install -g pm2
else
    echo "   ✅ PM2 đã cài đặt"
fi

# serve (cho frontend)
if ! command -v serve &> /dev/null; then
    echo "   ⏳ Cài đặt serve..."
    npm install -g serve
else
    echo "   ✅ serve đã cài đặt"
fi

# Nginx
if ! command -v nginx &> /dev/null; then
    echo "   ⏳ Cài đặt Nginx..."
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
else
    echo "   ✅ Nginx đã cài đặt"
fi

echo ""

# Bước 2: Clone/Update Code
echo "📥 Bước 2: Clone/Update Code từ GitHub..."

if [ -d "$APP_DIR" ]; then
    echo "   📂 Thư mục đã tồn tại, đang pull code mới..."
    cd $APP_DIR
    git pull origin main
else
    echo "   📂 Clone code mới..."
    mkdir -p $APP_DIR
    cd $APP_DIR
    git clone $GITHUB_REPO .
fi

# Xóa các file hướng dẫn cũ từ server cũ (nếu có)
echo "   🗑️  Xóa các file hướng dẫn cũ..."
cd $APP_DIR
rm -f DEPLOY_NOW.md PUSH_TO_GITHUB.md QUICK_DEPLOY_OLD.md 2>/dev/null || true

echo ""

# Bước 3: Setup Database
echo "🗄️  Bước 3: Setup Database..."

# Tạo database nếu chưa có
sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || {
    echo "   ⏳ Tạo database $DB_NAME..."
    sudo -u postgres psql -c "CREATE DATABASE \"$DB_NAME\" WITH ENCODING = 'UTF8';"
}

# Tạo user nếu chưa có
sudo -u postgres psql -c "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'" | grep -q 1 || {
    echo "   ⏳ Tạo user $DB_USER..."
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO $DB_USER;"
}

# Cấp quyền schema
echo "   ⏳ Cấp quyền schema..."
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;"

echo ""

# Bước 4: Cấu hình Environment
echo "⚙️  Bước 4: Cấu hình Environment..."

# Backend .env
echo "   📝 Tạo backend/.env..."
cat > $APP_DIR/backend/.env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

PORT=$BACKEND_PORT
NODE_ENV=production

FRONTEND_URL=http://27.71.16.15:$FRONTEND_PORT
EOF

# Frontend .env
echo "   📝 Tạo frontend/.env..."
cat > $APP_DIR/frontend/.env << EOF
REACT_APP_API_URL=http://27.71.16.15:$BACKEND_PORT/api
EOF

echo ""

# Bước 5: Cài Dependencies và Build
echo "📦 Bước 5: Cài Dependencies và Build..."

# Backend
echo "   ⏳ Cài backend dependencies..."
cd $APP_DIR/backend
npm install --production

# Frontend
echo "   ⏳ Cài frontend dependencies và build..."
cd $APP_DIR/frontend
npm install
npm run build

echo ""

# Bước 6: Tạo thư mục logs
echo "📁 Bước 6: Tạo thư mục logs..."
mkdir -p $APP_DIR/logs

# Bước 7: Deploy với PM2
echo "🚀 Bước 7: Deploy với PM2..."

cd $APP_DIR

# Stop app cũ nếu đang chạy
pm2 stop hr-rmg-idc-backend hr-rmg-idc-frontend 2>/dev/null || true
pm2 delete hr-rmg-idc-backend hr-rmg-idc-frontend 2>/dev/null || true

# Start app mới
pm2 start ecosystem.config.js
pm2 save

echo ""

# Bước 8: Cấu hình Nginx
echo "🌐 Bước 8: Cấu hình Nginx..."

# Tạo config file
cat > /etc/nginx/sites-available/$APP_NAME << EOF
# HR Management System - RMG-IDC
server {
    listen 80;
    server_name 27.71.16.15;

    # Frontend
    location / {
        proxy_pass http://localhost:$FRONTEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Upload files
    location /uploads {
        alias $APP_DIR/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/

# Test và reload
nginx -t && systemctl reload nginx

echo ""

# Hoàn thành
echo "=========================================="
echo -e "${GREEN}✅ DEPLOY THÀNH CÔNG!${NC}"
echo "=========================================="
echo ""
echo "📊 Thông tin:"
echo "   🌐 Frontend: http://27.71.16.15"
echo "   🔌 Backend API: http://27.71.16.15/api"
echo ""
echo "📝 Lệnh hữu ích:"
echo "   pm2 status"
echo "   pm2 logs hr-rmg-idc-backend"
echo "   pm2 logs hr-rmg-idc-frontend"
echo "   pm2 restart all"
echo ""
echo "🎉 Xong! Truy cập: http://27.71.16.15"

