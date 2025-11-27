# 🚀 HƯỚNG DẪN DEPLOY - Server Mới (27.71.16.15)

## 📋 Thông tin Server

- **Server IP:** 27.71.16.15
- **GitHub Repo:** https://github.com/HaiNguyen26/HR---RMG-IDC.git
- **App Name:** HR Management System (RMG-IDC)
- **Thư mục:** `/var/www/hr-rmg-idc` (phân biệt với app cũ)

## ⚠️ Lưu ý: Phân biệt với App Cũ

Server này đã có 1 app khác đang chạy. Để tránh xung đột:

- ✅ **Thư mục riêng:** `/var/www/hr-rmg-idc`
- ✅ **Port khác:** Backend chạy port 3001 (app cũ có thể dùng 3000)
- ✅ **Database riêng:** `HR_Management_System_RMG_IDC`
- ✅ **Nginx config riêng:** `/etc/nginx/sites-available/hr-rmg-idc`
- ✅ **PM2 ecosystem riêng:** `hr-rmg-idc`

---

## 📋 Mục lục

1. [SSH vào Server](#1-ssh-vào-server)
2. [Cài đặt Prerequisites](#2-cài-đặt-prerequisites)
3. [Clone Code](#3-clone-code)
4. [Setup Database](#4-setup-database)
5. [Cấu hình Environment](#5-cấu-hình-environment)
6. [Build và Deploy](#6-build-và-deploy)
7. [Cấu hình Nginx](#7-cấu-hình-nginx)
8. [Kiểm tra](#8-kiểm-tra)

---

## 1. SSH vào Server

```bash
ssh root@27.71.16.15
```

---

## 2. Cài đặt Prerequisites

### 2.1. Kiểm tra Node.js (cần >= v20)

```bash
node --version
```

Nếu chưa có hoặc < v20, cài đặt:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Kiểm tra lại
```

### 2.2. Kiểm tra PostgreSQL

```bash
psql --version
```

Nếu chưa có:

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2.3. Kiểm tra Git

```bash
git --version
```

Nếu chưa có:

```bash
sudo apt install git -y
```

### 2.4. Cài đặt PM2 (nếu chưa có)

```bash
npm install -g pm2
```

### 2.5. Cài đặt Nginx (nếu chưa có)

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 3. Clone Code

### 3.1. Tạo thư mục cho app mới

```bash
sudo mkdir -p /var/www/hr-rmg-idc
cd /var/www/hr-rmg-idc
```

### 3.2. Clone từ GitHub

```bash
git clone https://github.com/HaiNguyen26/HR---RMG-IDC.git .
```

---

## 4. Setup Database

### 4.1. Tạo Database và User

```bash
sudo -u postgres psql
```

Trong psql, chạy:

```sql
-- Tạo database mới (tên khác với app cũ)
CREATE DATABASE "HR_Management_System_RMG_IDC";

-- Tạo user mới
CREATE USER hr_user_rmg_idc WITH PASSWORD 'Hainguyen261097';

-- Cấp quyền
GRANT ALL PRIVILEGES ON DATABASE "HR_Management_System_RMG_IDC" TO hr_user_rmg_idc;

-- Thoát
\q
```

### 4.2. Cấp quyền cho database

```bash
sudo -u postgres psql -d HR_Management_System_RMG_IDC
```

```sql
-- Cấp quyền schema
GRANT ALL ON SCHEMA public TO hr_user_rmg_idc;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO hr_user_rmg_idc;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO hr_user_rmg_idc;

-- Thoát
\q
```

---

## 5. Cấu hình Environment

### 5.1. Tạo file .env cho Backend

```bash
cd /var/www/hr-rmg-idc/backend
nano .env
```

Nội dung:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=HR_Management_System_RMG_IDC
DB_USER=hr_user_rmg_idc
DB_PASSWORD=Hainguyen261097

# Server
PORT=3001
NODE_ENV=production

# Frontend URL
FRONTEND_URL=http://27.71.16.15:3002
```

Lưu: `Ctrl+O`, `Enter`, `Ctrl+X`

### 5.2. Tạo file .env cho Frontend

```bash
cd /var/www/hr-rmg-idc/frontend
nano .env
```

Nội dung:

```env
REACT_APP_API_URL=http://27.71.16.15:3001/api
```

Lưu: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## 6. Build và Deploy

### 6.1. Cài đặt Dependencies

```bash
cd /var/www/hr-rmg-idc

# Backend
cd backend
npm install --production

# Frontend
cd ../frontend
npm install
npm run build
```

### 6.2. Tạo PM2 Ecosystem Config

```bash
cd /var/www/hr-rmg-idc
nano ecosystem.config.js
```

Nội dung (đã có sẵn, chỉ cần kiểm tra):

```javascript
module.exports = {
  apps: [
    {
      name: 'hr-rmg-idc-backend',
      script: './backend/server.js',
      cwd: '/var/www/hr-rmg-idc',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/www/hr-rmg-idc/logs/backend-error.log',
      out_file: '/var/www/hr-rmg-idc/logs/backend-out.log',
      instances: 1,
      autorestart: true,
      watch: false
    },
    {
      name: 'hr-rmg-idc-frontend',
      script: 'serve',
      args: '-s build -l 3002',
      cwd: '/var/www/hr-rmg-idc/frontend',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/www/hr-rmg-idc/logs/frontend-error.log',
      out_file: '/var/www/hr-rmg-idc/logs/frontend-out.log',
      instances: 1,
      autorestart: true,
      watch: false
    }
  ]
};
```

### 6.3. Tạo thư mục logs

```bash
mkdir -p /var/www/hr-rmg-idc/logs
```

### 6.4. Cài đặt serve (cho frontend)

```bash
npm install -g serve
```

### 6.5. Khởi động với PM2

```bash
cd /var/www/hr-rmg-idc
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 7. Cấu hình Nginx

### 7.1. Tạo Nginx Config

```bash
sudo nano /etc/nginx/sites-available/hr-rmg-idc
```

Nội dung:

```nginx
# HR Management System - RMG-IDC
# App mới, phân biệt với app cũ

server {
    listen 80;
    server_name 27.71.16.15 hr-rmg-idc.example.com;

    # Frontend
    location / {
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

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Upload files
    location /uploads {
        alias /var/www/hr-rmg-idc/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Lưu: `Ctrl+O`, `Enter`, `Ctrl+X`

### 7.2. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/hr-rmg-idc /etc/nginx/sites-enabled/
```

### 7.3. Test và Reload Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. Kiểm tra

### 8.1. Kiểm tra PM2

```bash
pm2 list
pm2 logs hr-rmg-idc-backend
pm2 logs hr-rmg-idc-frontend
```

### 8.2. Kiểm tra Ports

```bash
netstat -tulpn | grep -E '3001|3002'
```

### 8.3. Truy cập App

Mở trình duyệt:
- **Frontend:** http://27.71.16.15
- **Backend API:** http://27.71.16.15/api

### 8.4. Kiểm tra Database

```bash
sudo -u postgres psql -d HR_Management_System_RMG_IDC -c "\dt"
```

---

## ✅ Hoàn thành!

App đã được deploy thành công tại: **http://27.71.16.15**

### Các lệnh hữu ích:

```bash
# Xem logs
pm2 logs hr-rmg-idc-backend
pm2 logs hr-rmg-idc-frontend

# Restart app
pm2 restart hr-rmg-idc-backend
pm2 restart hr-rmg-idc-frontend

# Stop app
pm2 stop hr-rmg-idc-backend
pm2 stop hr-rmg-idc-frontend

# Xem status
pm2 status
```

---

## 🔄 Cập nhật Code sau này

Xem file `UPDATE.md` để biết cách update code từ GitHub.

