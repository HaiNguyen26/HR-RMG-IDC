# ⚡ HƯỚNG DẪN TRIỂN KHAI NHANH - Deploy từ GitHub

## 🎯 Quy trình 3 Bước

---

## 📤 BƯỚC 1: Push Code lên GitHub

### 1.1. Kiểm tra Git Repository

**Trên máy local (PowerShell):**

```powershell
cd D:\Web-App-HR-Demo

# Kiểm tra trạng thái Git
git status
```

**Nếu chưa có Git repository:**
```powershell
git init
```

### 1.2. Tạo Repository trên GitHub

1. Đăng nhập: https://github.com
2. Click **+** → **New repository**
3. Tên repository: `hr-management-system` (hoặc tên khác)
4. Chọn **Private** (khuyến nghị) hoặc **Public**
5. **KHÔNG** check "Initialize with README"
6. Click **Create repository**

### 1.3. Thêm Remote và Push Code

```powershell
# Thêm remote GitHub (thay YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/hr-management-system.git

# Hoặc nếu đã có remote, kiểm tra:
git remote -v

# Add tất cả files (trừ những gì trong .gitignore)
git add .

# Commit
git commit -m "Initial commit: HR Management System - Full deployment ready"

# Đổi branch thành main (nếu chưa)
git branch -M main

# Push lên GitHub
git push -u origin main
```

**⚠️ LƯU Ý:**
- GitHub không dùng password, cần **Personal Access Token**
- Tạo token: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
- Chọn scope: `repo` (Full control of private repositories)
- Copy token và dùng thay cho password khi push

---

## 🗄️ BƯỚC 2: Chuẩn bị Database (QUAN TRỌNG!)

### ⚠️ Database KHÔNG được push lên GitHub

**Lý do:**
- ❌ Chứa dữ liệu nhạy cảm (thông tin nhân viên)
- ❌ File backup có thể rất lớn
- ❌ Bảo mật không tốt

### ✅ Cách xử lý Database:

**Tùy chọn A: Database mới trên Server (Không có dữ liệu)**
- Làm theo Bước 3, tạo database mới
- Import schema từ `database/database_schema_postgresql.sql`

**Tùy chọn B: Migrate Database từ Local (Có dữ liệu)**
- Backup database từ local:
  ```powershell
  pg_dump -U postgres -d HR_Management_System > backup_hr_management.sql
  ```
- Upload backup lên server bằng SCP/FileZilla
- Restore trên server (xem `MIGRATE_DATABASE.md`)

---

## 🚀 BƯỚC 3: Deploy trên Server

### 3.1. SSH vào Server

```bash
ssh root@103.56.161.203
# Hoặc: ssh user@your-server-ip
```

### 3.2. Cài đặt Node.js 20 LTS

```bash
# Cài Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Kiểm tra
node --version  # Phải >= v20
npm --version
```

### 3.3. Cài đặt PostgreSQL

```bash
# Cài PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# Khởi động PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3.4. Clone Code từ GitHub

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

**Nếu repository Private, dùng token:**
- Username: `YOUR_USERNAME`
- Password: `YOUR_PERSONAL_ACCESS_TOKEN`

### 3.5. Tạo Database

```bash
# Chuyển sang user postgres
sudo -u postgres psql
```

**Trong psql:**

```sql
CREATE DATABASE "HR_Management_System" WITH ENCODING = 'UTF8';
CREATE USER hr_user WITH PASSWORD 'your_secure_password_here';
ALTER USER hr_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE "HR_Management_System" TO hr_user;
\q
```

**Nếu có backup database từ local:**

```bash
# Restore database (thay đường dẫn file backup)
psql -U hr_user -d HR_Management_System < /path/to/backup_hr_management.sql
```

**Nếu tạo database mới:**

```bash
# Import schema
psql -U hr_user -d HR_Management_System < database/database_schema_postgresql.sql
```

### 3.6. Cấu hình Environment Variables

**Backend .env:**

```bash
cd /var/www/hr-management-system/backend
cp env.example .env
nano .env
```

**Chỉnh sửa:**

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=HR_Management_System
DB_USER=hr_user
DB_PASSWORD=your_secure_password_here

PORT=3000
NODE_ENV=production

DEFAULT_PASSWORD=RMG123@
```

**Lưu:** `Ctrl + O`, Enter, `Ctrl + X`

**Frontend .env:**

```bash
cd ../frontend
nano .env
```

**Thêm:**

```env
REACT_APP_API_URL=http://103.56.161.203/api
```

**Hoặc nếu có domain:**

```env
REACT_APP_API_URL=http://yourdomain.com/api
```

### 3.7. Cài đặt Dependencies và Build

```bash
cd /var/www/hr-management-system

# Root dependencies
npm install

# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install

# Build frontend
npm run build
```

### 3.8. Cài đặt PM2

```bash
# Cài PM2 globally
sudo npm install -g pm2

# Khởi động backend với PM2
cd /var/www/hr-management-system/backend
pm2 start server.js --name "hr-backend"

# Khởi động frontend với PM2
cd ../frontend/build
pm2 serve . 3001 --name "hr-frontend" --spa

# Lưu cấu hình PM2
pm2 save
pm2 startup
```

**Hoặc dùng file ecosystem.config.js:**

```bash
cd /var/www/hr-management-system
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3.9. Cấu hình Nginx

```bash
# Cài Nginx
sudo apt install nginx -y

# Tạo file cấu hình
sudo nano /etc/nginx/sites-available/hr-management
```

**Thêm nội dung:**

```nginx
server {
    listen 80;
    server_name 103.56.161.203;  # Hoặc yourdomain.com

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
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

**Kích hoạt cấu hình:**

```bash
# Tạo symbolic link
sudo ln -s /etc/nginx/sites-available/hr-management /etc/nginx/sites-enabled/

# Xóa default config
sudo rm /etc/nginx/sites-enabled/default

# Kiểm tra cấu hình
sudo nginx -t

# Khởi động lại Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 3.10. Hoàn thành!

**Truy cập ứng dụng:**
- HTTP: `http://103.56.161.203`
- Hoặc: `http://yourdomain.com`

**Kiểm tra logs:**
```bash
pm2 logs
pm2 status
```

---

## 🔄 Cập nhật Code sau này

**Trên server:**

```bash
cd /var/www/hr-management-system

# Pull code mới
git pull origin main

# Cài dependencies mới (nếu có)
cd backend && npm install
cd ../frontend && npm install && npm run build

# Restart application
pm2 restart all
```

**Hoặc dùng script:**

```bash
./update.sh
```

---

## ✅ Checklist nhanh

**Trước khi push:**
- [ ] Đã tạo `.gitignore` đầy đủ
- [ ] Đã kiểm tra không commit file `.env`
- [ ] Đã kiểm tra không commit `node_modules/`
- [ ] Đã tạo GitHub repository
- [ ] Đã có Personal Access Token

**Trên server:**
- [ ] Đã cài Node.js 20 LTS
- [ ] Đã cài PostgreSQL
- [ ] Đã clone repository
- [ ] Đã tạo database
- [ ] Đã restore/import database
- [ ] Đã cấu hình `.env` files
- [ ] Đã cài dependencies và build
- [ ] Đã cấu hình PM2
- [ ] Đã cấu hình Nginx
- [ ] App đã chạy thành công

---

## 🆘 Troubleshooting

**Lỗi: Permission denied (publickey)**
- Tạo SSH key và add vào GitHub

**Lỗi: Authentication failed**
- Dùng Personal Access Token thay cho password

**Lỗi: Cannot connect to database**
- Kiểm tra PostgreSQL đang chạy: `sudo systemctl status postgresql`
- Kiểm tra `.env` file có đúng không
- Kiểm tra user và password trong database

**Lỗi: Port already in use**
- Kiểm tra port: `sudo netstat -tulpn | grep :3000`
- Kill process nếu cần: `sudo kill -9 <PID>`

---

## 📚 Tài liệu chi tiết

- **Deploy từ GitHub chi tiết:** `docs/DEPLOY_FROM_GITHUB.md`
- **Migrate Database:** `MIGRATE_DATABASE.md`
- **Deploy từng bước:** `DEPLOY_NOW.md`

---

**Xong! Chúc bạn triển khai thành công!** 🎉

