# 🚀 DEPLOY NGAY - Copy & Paste Từng Bước

## Bạn đã SSH vào server? Bắt đầu thôi!

---

## ⚠️ Lưu ý trước khi bắt đầu

**Nếu bạn đã có database và dự án trên máy local và muốn migrate lên server:**
👉 Xem hướng dẫn chi tiết: [`docs/MIGRATE_FROM_LOCAL.md`](docs/MIGRATE_FROM_LOCAL.md)

**Tóm tắt:**
- **Có dữ liệu quan trọng trên local?** → Migrate database từ local lên server
- **Database local chỉ là test?** → Tạo database mới trên server (theo hướng dẫn bên dưới)

---

## ✅ BƯỚC 1: Kiểm tra & Cài đặt Prerequisites

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Node.js v20 LTS (Khuyến nghị - đang được hỗ trợ)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# HOẶC nếu muốn dùng Node.js 22 (phiên bản mới nhất)
# curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
# sudo apt-get install -y nodejs

# Kiểm tra Node.js
node --version
npm --version

# Cài đặt PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Cài đặt Nginx
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Cài đặt PM2
sudo npm install -g pm2
```

---

## 🗄️ BƯỚC 2: Tạo Database

**⚠️ Lưu ý:** Bước này tạo **DATABASE MỚI**. Nếu bạn đã có database và muốn dùng database đó, xem: `docs/DATABASE_OPTIONS.md`

```bash
# Kiểm tra database có tồn tại chưa
psql -U postgres -c "\l" | grep HR_Management_System

# Vào PostgreSQL
sudo -u postgres psql
```

**Trong PostgreSQL (sau khi thấy prompt `postgres=#`), chạy:**

```sql
-- Tạo database MỚI (bỏ qua nếu đã có)
CREATE DATABASE "HR_Management_System" WITH ENCODING = 'UTF8' LC_COLLATE = 'en_US.UTF-8' LC_CTYPE = 'en_US.UTF-8';

-- Tạo user MỚI (bỏ qua nếu đã có)
CREATE USER hr_user WITH PASSWORD 'ThayBangMatKhauManhCuaBan123!';
ALTER USER hr_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE "HR_Management_System" TO hr_user;
\q
```

**Nhớ password bạn vừa đặt (ví dụ: `ThayBangMatKhauManhCuaBan123!`)**

**Nếu đã có database:** Xem hướng dẫn dùng database hiện có trong `docs/DATABASE_OPTIONS.md`

---

## 📁 BƯỚC 3: Clone/Copy Code

### ⭐ Cách 1: Clone từ GitHub (Khuyến nghị)

**Nếu bạn đã push code lên GitHub:**

```bash
# Cài Git (nếu chưa có)
sudo apt install git -y

# Clone repository
cd /var/www
sudo git clone https://github.com/YOUR_USERNAME/hr-management-system.git

# Đổi quyền
sudo chown -R $USER:$USER /var/www/hr-management-system
cd /var/www/hr-management-system
```

**Lợi ích:** Dễ cập nhật sau này, chỉ cần `git pull`

**Xem hướng dẫn chi tiết:** `docs/DEPLOY_FROM_GITHUB.md`

### Cách 2: Upload code qua SCP (từ máy local)

```bash
# Trên máy local, chạy lệnh này:
# scp -r . user@your-server-ip:/var/www/hr-management-system

# Sau đó trên server:
cd /var/www/hr-management-system
sudo chown -R $USER:$USER /var/www/hr-management-system
```

---

## 📦 BƯỚC 4: Cài đặt Dependencies

```bash
cd /var/www/hr-management-system

# Cài root dependencies
npm install

# Cài backend dependencies
cd backend
npm install

# Cài frontend dependencies
cd ../frontend
npm install
```

---

## 🗄️ BƯỚC 5: Import Database Schema

```bash
cd /var/www/hr-management-system
psql -U hr_user -d HR_Management_System -f database/database_schema_postgresql.sql
```

**Nhập password bạn đã tạo ở Bước 2**

---

## ⚙️ BƯỚC 6: Cấu hình Backend .env

```bash
cd /var/www/hr-management-system/backend
cp env.example .env
nano .env
```

**Sửa các dòng sau (thay password của bạn):**
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=HR_Management_System
DB_USER=hr_user
DB_PASSWORD=ThayBangMatKhauManhCuaBan123!
PORT=3000
NODE_ENV=production
DEFAULT_PASSWORD=RMG123@
```

**Lưu:** `Ctrl + O`, Enter, rồi `Ctrl + X`

---

## ⚙️ BƯỚC 7: Cấu hình Frontend .env

```bash
cd /var/www/hr-management-system/frontend
nano .env
```

**Thêm nội dung (thay IP hoặc domain của server):**
```
REACT_APP_API_URL=http://YOUR_SERVER_IP/api
```

**Lưu:** `Ctrl + O`, Enter, rồi `Ctrl + X`

---

## 🏗️ BƯỚC 8: Build Frontend

```bash
cd /var/www/hr-management-system/frontend
npm run build
```

**Chờ 2-5 phút**

---

## 🔧 BƯỚC 9: Cấu hình Nginx

```bash
sudo nano /etc/nginx/sites-available/hr-management-system
```

**Copy toàn bộ nội dung sau vào (thay YOUR_SERVER_IP bằng IP server của bạn):**

```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP;

    location / {
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

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    client_max_body_size 10M;
}
```

**Lưu:** `Ctrl + O`, Enter, rồi `Ctrl + X`

**Kích hoạt:**
```bash
sudo ln -s /etc/nginx/sites-available/hr-management-system /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🚀 BƯỚC 10: Khởi động App

```bash
cd /var/www/hr-management-system

# Tạo thư mục logs
mkdir -p logs

# Cài serve
sudo npm install -g serve

# Tạo ecosystem.config.js nếu chưa có
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'hr-backend',
      script: './backend/server.js',
      cwd: '/var/www/hr-management-system',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false
    },
    {
      name: 'hr-frontend',
      script: 'serve',
      args: '-s build -l 3001',
      cwd: '/var/www/hr-management-system/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/www/hr-management-system/logs/frontend-error.log',
      out_file: '/var/www/hr-management-system/logs/frontend-out.log',
      autorestart: true,
      watch: false
    }
  ]
};
EOF

# Khởi động với PM2
pm2 start ecosystem.config.js

# Lưu cấu hình
pm2 save

# Tạo startup script
pm2 startup
# (Chạy lệnh mà PM2 hiển thị)

# Kiểm tra
pm2 status
```

---

## ✅ BƯỚC 11: Kiểm tra

```bash
# Test backend
curl http://localhost:3000/health

# Test qua Nginx (thay YOUR_SERVER_IP)
curl http://YOUR_SERVER_IP/api/health

# Xem logs
pm2 logs --lines 30
```

**Nhấn `Ctrl + C` để thoát logs**

---

## 🌐 BƯỚC 12: Test từ Browser

Mở trình duyệt và truy cập:
```
http://YOUR_SERVER_IP
```

**Đăng nhập:**
- Username: `hr`
- Password: `RMG123@`

---

## 🎉 XONG!

Nếu tất cả OK, app đã chạy!

**Xem hướng dẫn chi tiết:** `docs/DEPLOYMENT_STEP_BY_STEP.md`

