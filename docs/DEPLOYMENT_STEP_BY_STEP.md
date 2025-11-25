# 🚀 Hướng dẫn Deploy Từng Bước - Ubuntu Server

## ✅ Bạn đã SSH vào server rồi? Bắt đầu thôi!

---

## 📋 BƯỚC 1: Kiểm tra Hệ thống

### 1.1. Kiểm tra phiên bản Ubuntu

```bash
lsb_release -a
```

**Kỳ vọng:** Ubuntu 18.04, 20.04 hoặc 22.04

### 1.2. Cập nhật hệ thống

```bash
sudo apt update && sudo apt upgrade -y
```

**Thời gian:** 2-5 phút tùy tốc độ mạng

### 1.3. Kiểm tra Node.js đã có chưa

```bash
node --version
npm --version
```

**Nếu chưa có Node.js, chuyển sang Bước 2.**

**Nếu đã có, kiểm tra phiên bản >= 18 (khuyến nghị >= 20):**
```bash
node -v | grep -oE 'v[0-9]+' | grep -oE '[0-9]+'
```

**Lưu ý:** Node.js 18.x đã hết hỗ trợ. Nếu số < 20, khuyến nghị nâng cấp lên Node.js v20 LTS hoặc v22.

---

## 📦 BƯỚC 2: Cài đặt Node.js (nếu chưa có)

### 2.1. Cài đặt Node.js v20 LTS (Khuyến nghị)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Lưu ý:** Node.js 18.x đã hết hỗ trợ. Khuyến nghị dùng v20 LTS hoặc v22.

**Nếu muốn dùng Node.js 22 (phiên bản mới nhất):**
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2.2. Kiểm tra lại

```bash
node --version
npm --version
```

**Kỳ vọng:** Node.js v20.x.x hoặc v22.x.x (hoặc cao hơn)

---

## 🗄️ BƯỚC 3: Cài đặt PostgreSQL

### 3.1. Kiểm tra PostgreSQL đã có chưa

```bash
psql --version
```

**Nếu chưa có, cài đặt:**

```bash
sudo apt install postgresql postgresql-contrib -y
```

### 3.2. Khởi động PostgreSQL

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3.3. Kiểm tra trạng thái

```bash
sudo systemctl status postgresql
```

**Nhấn `q` để thoát nếu thấy "active (running)"**

---

## 🌐 BƯỚC 4: Cài đặt Nginx

### 4.1. Cài đặt Nginx

```bash
sudo apt install nginx -y
```

### 4.2. Khởi động Nginx

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4.3. Kiểm tra Nginx

```bash
sudo systemctl status nginx
```

**Nhấn `q` để thoát**

---

## ⚙️ BƯỚC 5: Cài đặt PM2

```bash
sudo npm install -g pm2
```

### Kiểm tra PM2

```bash
pm2 --version
```

---

## 📂 BƯỚC 6: Tạo Database và User

### 6.1. Chuyển sang user postgres

```bash
sudo -u postgres psql
```

**Bạn sẽ thấy prompt: `postgres=#`**

### 6.2. Tạo database

```sql
CREATE DATABASE "HR_Management_System"
WITH ENCODING = 'UTF8'
LC_COLLATE = 'en_US.UTF-8'
LC_CTYPE = 'en_US.UTF-8';
```

### 6.3. Tạo user và cấp quyền

**Thay `your_secure_password` bằng mật khẩu mạnh của bạn:**

```sql
CREATE USER hr_user WITH PASSWORD 'your_secure_password';
ALTER USER hr_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE "HR_Management_System" TO hr_user;
```

### 6.4. Thoát PostgreSQL

```sql
\q
```

**Bạn sẽ quay lại bash prompt**

---

## 📁 BƯỚC 7: Clone/Copy Code vào Server

### Tùy chọn A: Clone từ Git (nếu có repository)

```bash
cd /var/www
sudo git clone https://your-repository-url/hr-management-system.git
sudo chown -R $USER:$USER /var/www/hr-management-system
cd /var/www/hr-management-system
```

### Tùy chọn B: Upload code qua SCP (từ máy local)

**Trên máy local (Windows/Mac/Linux), chạy:**

```bash
# Từ thư mục chứa project
scp -r . user@your-server-ip:/var/www/hr-management-system
```

**Sau đó trên server:**

```bash
cd /var/www/hr-management-system
sudo chown -R $USER:$USER /var/www/hr-management-system
```

### Tùy chọn C: Tạo thư mục và copy code

```bash
sudo mkdir -p /var/www/hr-management-system
sudo chown -R $USER:$USER /var/www/hr-management-system
cd /var/www/hr-management-system
```

Sau đó upload code lên server bằng FTP/SFTP client (FileZilla, WinSCP, etc.)

---

## 📦 BƯỚC 8: Cài đặt Dependencies

### 8.1. Cài đặt dependencies root

```bash
cd /var/www/hr-management-system
npm install
```

**Thời gian:** 1-3 phút

### 8.2. Cài đặt backend dependencies

```bash
cd backend
npm install
```

**Thời gian:** 1-3 phút

### 8.3. Cài đặt frontend dependencies

```bash
cd ../frontend
npm install
```

**Thời gian:** 2-5 phút (có thể lâu hơn)

---

## 🗄️ BƯỚC 9: Import Database Schema

### 9.1. Kiểm tra file schema có tồn tại

```bash
cd /var/www/hr-management-system
ls -la database/database_schema_postgresql.sql
```

### 9.2. Import schema

```bash
psql -U hr_user -d HR_Management_System -f database/database_schema_postgresql.sql
```

**Nhập password bạn đã tạo ở Bước 6.3**

### 9.3. Kiểm tra tables đã tạo

```bash
psql -U hr_user -d HR_Management_System -c "\dt"
```

**Kỳ vọng:** Thấy danh sách các bảng (employees, users, etc.)

---

## ⚙️ BƯỚC 10: Cấu hình Environment Variables

### 10.1. Tạo backend .env file

```bash
cd /var/www/hr-management-system/backend
cp env.example .env
nano .env
```

### 10.2. Chỉnh sửa nội dung .env

**Thay đổi các giá trị sau (dùng password bạn đã tạo ở Bước 6.3):**

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=HR_Management_System
DB_USER=hr_user
DB_PASSWORD=your_secure_password

PORT=3000
NODE_ENV=production

DEFAULT_PASSWORD=RMG123@
```

**Trong nano:**
- Chỉnh sửa: Sửa trực tiếp
- Lưu và thoát: `Ctrl + O` (Enter), rồi `Ctrl + X`

### 10.3. Tạo frontend .env file

```bash
cd ../frontend
nano .env
```

### 10.4. Thêm nội dung frontend .env

**Thay `your-domain-or-ip` bằng domain hoặc IP server của bạn:**

```env
REACT_APP_API_URL=http://your-domain-or-ip/api
```

**Ví dụ nếu dùng IP:**
```env
REACT_APP_API_URL=http://123.456.789.0/api
```

**Ví dụ nếu dùng domain:**
```env
REACT_APP_API_URL=http://hr.company.com/api
```

**Lưu và thoát:** `Ctrl + O` (Enter), rồi `Ctrl + X`

---

## 🏗️ BƯỚC 11: Build Frontend

```bash
cd /var/www/hr-management-system/frontend
npm run build
```

**Thời gian:** 2-5 phút

**Kỳ vọng:** Thấy "Build complete" hoặc tương tự, và có thư mục `build/`

### Kiểm tra build thành công

```bash
ls -la build
```

**Kỳ vọng:** Thấy các file trong thư mục build

---

## 🔧 BƯỚC 12: Cấu hình Nginx

### 12.1. Tạo file cấu hình Nginx

```bash
sudo nano /etc/nginx/sites-available/hr-management-system
```

### 12.2. Thêm nội dung sau

**Thay `your-domain-or-ip` bằng domain hoặc IP server của bạn:**

```nginx
server {
    listen 80;
    server_name your-domain-or-ip;

    # Frontend
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

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
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

**Lưu và thoát:** `Ctrl + O` (Enter), rồi `Ctrl + X`

### 12.3. Kích hoạt site

```bash
sudo ln -s /etc/nginx/sites-available/hr-management-system /etc/nginx/sites-enabled/
```

### 12.4. Xóa default site (tùy chọn)

```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 12.5. Kiểm tra cấu hình Nginx

```bash
sudo nginx -t
```

**Kỳ vọng:** "syntax is ok" và "test is successful"

### 12.6. Khởi động lại Nginx

```bash
sudo systemctl restart nginx
```

---

## 🚀 BƯỚC 13: Tạo Thư mục Logs

```bash
cd /var/www/hr-management-system
mkdir -p logs
```

---

## ⚡ BƯỚC 14: Khởi động Application với PM2

### 14.1. Kiểm tra ecosystem.config.js

```bash
ls -la ecosystem.config.js
```

**Nếu file không tồn tại, tạo nó (xem Bước 14.2)**

### 14.2. Nếu chưa có ecosystem.config.js, tạo nó:

```bash
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
```

### 14.3. Cài đặt serve (để serve static files)

```bash
sudo npm install -g serve
```

### 14.4. Khởi động với PM2

```bash
cd /var/www/hr-management-system
pm2 start ecosystem.config.js
```

### 14.5. Lưu cấu hình PM2

```bash
pm2 save
```

### 14.6. Tạo startup script để tự khởi động khi server reboot

```bash
pm2 startup
```

**Chạy lệnh mà PM2 hiển thị (sẽ có dạng `sudo env PATH=...`)**

### 14.7. Kiểm tra trạng thái

```bash
pm2 status
```

**Kỳ vọng:** Thấy `hr-backend` và `hr-frontend` đều ở trạng thái "online"

---

## 🔍 BƯỚC 15: Kiểm tra và Test

### 15.1. Kiểm tra Backend API

```bash
curl http://localhost:3000/health
```

**Kỳ vọng:** `{"status":"OK","message":"Server is running"}`

### 15.2. Kiểm tra Frontend

```bash
curl http://localhost:3001
```

**Kỳ vọng:** Thấy HTML content

### 15.3. Kiểm tra qua Nginx

**Thay `your-domain-or-ip` bằng domain/IP của bạn:**

```bash
curl http://your-domain-or-ip/api/health
```

**Kỳ vọng:** `{"status":"OK","message":"Server is running"}`

### 15.4. Xem logs nếu có lỗi

```bash
pm2 logs --lines 50
```

**Nhấn `Ctrl + C` để thoát**

---

## 🔒 BƯỚC 16: Cấu hình Firewall (Nếu cần)

### 16.1. Cho phép HTTP và HTTPS

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

### 16.2. Kiểm tra firewall

```bash
sudo ufw status
```

---

## 🌐 BƯỚC 17: Test từ Browser

### 17.1. Mở trình duyệt và truy cập:

```
http://your-domain-or-ip
```

**Thay `your-domain-or-ip` bằng domain hoặc IP server của bạn**

### 17.2. Đăng nhập với tài khoản mặc định:

- **Username:** `hr`
- **Password:** `RMG123@`

---

## ✅ BƯỚC 18: Kiểm tra Checklist

- [ ] Backend API hoạt động: `http://your-domain-or-ip/api/health`
- [ ] Frontend hiển thị: `http://your-domain-or-ip`
- [ ] Có thể đăng nhập
- [ ] Dashboard hiển thị
- [ ] PM2 processes đang chạy: `pm2 status`
- [ ] Nginx đang chạy: `sudo systemctl status nginx`
- [ ] PostgreSQL đang chạy: `sudo systemctl status postgresql`

---

## 🆘 Nếu có lỗi

### Xem logs Backend

```bash
pm2 logs hr-backend --lines 100
```

### Xem logs Frontend

```bash
pm2 logs hr-frontend --lines 100
```

### Xem logs Nginx

```bash
sudo tail -f /var/log/nginx/error.log
```

### Khởi động lại services

```bash
pm2 restart all
sudo systemctl restart nginx
sudo systemctl restart postgresql
```

---

## 🎉 Hoàn thành!

Nếu tất cả các bước trên thành công, ứng dụng của bạn đã được deploy và sẵn sàng sử dụng!

**Đừng quên:**
- ✅ Đổi mật khẩu mặc định sau lần đăng nhập đầu tiên
- ✅ Thiết lập backup database tự động
- ✅ Cài đặt SSL certificate (nếu có domain)

**Tài liệu tham khảo:**
- Cập nhật code: `docs/UPDATE_DEPLOYMENT.md`
- Troubleshooting: `docs/DEPLOYMENT_UBUNTU.md`

