# 🚀 HƯỚNG DẪN DEPLOY - Từng Bước Một

## 📋 Mục lục

1. [Push Code lên GitHub](#1-push-code-lên-github)
2. [Chuẩn bị Server](#2-chuẩn-bị-server)
3. [Clone Code và Setup](#3-clone-code-và-setup)
4. [Database](#4-database)
5. [Cấu hình và Build](#5-cấu-hình-và-build)
6. [Deploy với PM2](#6-deploy-với-pm2)
7. [Cấu hình Nginx](#7-cấu-hình-nginx)
8. [Hoàn thành](#8-hoàn-thành)

---

## 1. Push Code lên GitHub

### ✅ Đã hoàn thành!

Code đã được push lên: **https://github.com/HaiNguyen26/HR-RMG**

---

## 2. Chuẩn bị Server

**SSH vào server:**
```bash
ssh root@103.56.161.203
```

### Bước 2.1: Cài Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Kiểm tra: phải >= v20
```

### Bước 2.2: Cài PostgreSQL

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Bước 2.3: Cài Git

```bash
sudo apt install git -y
```

---

## 3. Clone Code và Setup

```bash
cd /var/www
sudo git clone https://github.com/HaiNguyen26/HR-RMG.git hr-management-system
sudo chown -R $USER:$USER /var/www/hr-management-system
cd /var/www/hr-management-system
```

---

## 4. Database

### ⚠️ Quan trọng: Chọn loại Database

Bạn có **2 lựa chọn:**
- **A. Tạo Database Mới (Trống)** - Nếu chưa có dữ liệu
- **B. Migrate Database từ Local** - Nếu đã có dữ liệu ở local

**Không chắc chọn gì?** Xem `DATABASE_OPTIONS.md` để so sánh 2 phương án.

---

### ⚠️ Lưu ý về Password

**KHÔNG cần dùng password của PgAdmin (máy local)!**

- ✅ Trên server, bạn sẽ tạo **password mới** cho PostgreSQL user
- ✅ Password này **độc lập** với password trên máy local
- ✅ Bạn có thể đặt password **bất kỳ** (nên dùng mạnh và an toàn)
- ✅ **QUAN TRỌNG:** Password này phải khớp với password trong file `backend/.env` (bước 5.1)

**Ví dụ password:** `RMG123@hr2025` (hoặc bất kỳ password nào bạn muốn)

---

### Tùy chọn A: Tạo Database Mới (Không có dữ liệu)

```bash
# Tạo database và user
sudo -u postgres psql
```

**Trong psql, chạy:**
```sql
CREATE DATABASE "HR_Management_System" WITH ENCODING = 'UTF8';
CREATE USER hr_user WITH PASSWORD 'Hainguyen261097';
ALTER USER hr_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE "HR_Management_System" TO hr_user;
\q
```

**Password:** `Hainguyen261097` (sẽ dùng trong file `.env` ở bước 5.1)

**Import schema:**
```bash
# Dùng sudo -u postgres để tránh lỗi authentication
sudo -u postgres psql -d HR_Management_System < database/database_schema_postgresql.sql
```

### Tùy chọn B: Migrate Database từ Local (Có dữ liệu)

**Trên máy local (Windows PowerShell):**
```powershell
# Di chuyển đến thư mục project
cd D:\Web-App-HR-Demo

# Backup database với encoding UTF-8 (QUAN TRỌNG!)
pg_dump -U postgres -d HR_Management_System --encoding=UTF8 --no-owner --no-acl > backup_hr_management.sql

# Upload lên server (QUAN TRỌNG: Phải ở đúng thư mục có file backup!)
scp backup_hr_management.sql root@103.56.161.203:/tmp/
```

**Lưu ý:** Nếu file backup đã có sẵn ở `D:\Web-App-HR-Demo\backup_hr_management.sql`, chỉ cần:
```powershell
cd D:\Web-App-HR-Demo
scp backup_hr_management.sql root@103.56.161.203:/tmp/
```

**Trên server:**
```bash
# Tạo database (như Tùy chọn A)
sudo -u postgres psql
# (Chạy các lệnh CREATE DATABASE và CREATE USER như trên)
# \q

# Restore database (dùng sudo -u postgres để tránh lỗi authentication)
sudo -u postgres psql -d HR_Management_System < /tmp/backup_hr_management.sql
```

**Hoặc nếu muốn dùng user hr_user:**
```bash
PGPASSWORD='Hainguyen261097' psql -U hr_user -h localhost -d HR_Management_System < /tmp/backup_hr_management.sql
```

---

## 5. Cấu hình và Build

### Bước 5.1: Backend .env

```bash
cd /var/www/hr-management-system/backend
cp env.example .env
nano .env
```

**Chỉnh sửa thành:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=HR_Management_System
DB_USER=hr_user
DB_PASSWORD=Hainguyen261097

PORT=3000
NODE_ENV=production

DEFAULT_PASSWORD=RMG123@
```

**Lưu:** `Ctrl + O`, Enter, `Ctrl + X`

### Bước 5.2: Frontend .env

```bash
cd ../frontend
nano .env
```

**Thêm:**
```env
REACT_APP_API_URL=http://103.56.161.203/api
```

**Lưu:** `Ctrl + O`, Enter, `Ctrl + X`

### Bước 5.3: Cài Dependencies

```bash
cd /var/www/hr-management-system

# Root
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Bước 5.4: Build Frontend

```bash
cd /var/www/hr-management-system/frontend
npm run build
```

---

## 6. Deploy với PM2

### Bước 6.1: Cài PM2

```bash
sudo npm install -g pm2
```

### Bước 6.2: Khởi động Backend

```bash
cd /var/www/hr-management-system/backend
pm2 start server.js --name "hr-backend"
```

### Bước 6.3: Khởi động Frontend

```bash
cd /var/www/hr-management-system/frontend/build
pm2 serve . 3001 --name "hr-frontend" --spa
```

### Bước 6.4: Lưu PM2

```bash
pm2 save
pm2 startup
# Chạy lệnh mà PM2 đưa ra (copy và paste)
```

**Kiểm tra:**
```bash
pm2 status
pm2 logs
```

---

## 7. Cấu hình Nginx

### Bước 7.1: Tạo File Cấu hình

```bash
sudo nano /etc/nginx/sites-available/hr-management
```

**Thêm nội dung:**
```nginx
server {
    listen 80;
    server_name 103.56.161.203;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3000;
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
```

**Lưu:** `Ctrl + O`, Enter, `Ctrl + X`

### Bước 7.2: Kích hoạt Nginx

```bash
# Tạo link
sudo ln -s /etc/nginx/sites-available/hr-management /etc/nginx/sites-enabled/

# Xóa default
sudo rm /etc/nginx/sites-enabled/default

# Kiểm tra
sudo nginx -t

# Khởi động lại
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 8. Hoàn thành

### Kiểm tra

**Truy cập:** `http://103.56.161.203`

**Kiểm tra logs:**
```bash
pm2 logs
pm2 status
sudo systemctl status nginx
```

### Tài khoản đăng nhập mặc định

- **Username:** `hr001`
- **Password:** `RMG123@`

---

## 🔄 Cập nhật Code sau này

**Xem hướng dẫn chi tiết:** `UPDATE_CODE.md`

**Quy trình nhanh:**

```bash
cd /var/www/hr-management-system
git pull origin main
cd backend && npm install
cd ../frontend && npm install && npm run build
cd ..
pm2 restart all
pm2 logs --lines 10
```

---

## 🆘 Sửa lỗi thường gặp

### Lỗi: Cannot connect to database
```bash
# Kiểm tra PostgreSQL
sudo systemctl status postgresql
# Kiểm tra .env file có đúng không
cat backend/.env
```

### Lỗi: Port already in use
```bash
# Tìm process
sudo netstat -tulpn | grep :3000
# Kill process
sudo kill -9 <PID>
```

### Lỗi: Peer authentication failed
```bash
# Dùng sudo -u postgres thay vì -U hr_user
sudo -u postgres psql -d HR_Management_System < database/database_schema_postgresql.sql

# Hoặc dùng PGPASSWORD với localhost
PGPASSWORD='Hainguyen261097' psql -U hr_user -h localhost -d HR_Management_System < database/database_schema_postgresql.sql
```

### Lỗi: Permission denied
```bash
# Đổi quyền
sudo chown -R $USER:$USER /var/www/hr-management-system
```

---

## ✅ Checklist

- [ ] Cài Node.js 20
- [ ] Cài PostgreSQL
- [ ] Clone code từ GitHub
- [ ] Tạo/Restore database
- [ ] Cấu hình .env files
- [ ] Cài dependencies và build
- [ ] Khởi động với PM2
- [ ] Cấu hình Nginx
- [ ] Truy cập được http://103.56.161.203
- [ ] Đăng nhập thành công

---

**Xong! Chúc bạn thành công!** 🎉

