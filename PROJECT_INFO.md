# Mô tả dự án HR Management System

## 1) Tổng quan
- Hệ thống quản lý nhân sự (HR) gồm Backend API (Node.js/Express) và Frontend (React).
- Cơ sở dữ liệu: PostgreSQL.
- Chạy đồng thời Backend + Frontend từ thư mục gốc bằng một lệnh.
- **GitHub:** https://github.com/HaiNguyen26/HR-RMG-IDC.git

## 2) Tech Stack
- **Backend:** Node.js, Express, PostgreSQL (`pg`), bcrypt, multer
- **Frontend:** React (Create React App), axios
- **Công cụ:** npm, scripts hỗ trợ trong thư mục `scripts/`

## 3) Lệnh cần thiết (Local)
### Cài dependencies
```bash
# cài tất cả dependencies (root + backend + frontend)
npm run install:all

# hoặc cài riêng
cd backend && npm install
cd ../frontend && npm install
```

### Chạy dev
```bash
# chạy cả backend + frontend
npm run dev

# chạy riêng
cd backend && npm run dev
cd ../frontend && npm run dev
```

### Nếu `npm run dev` không tự mở trình duyệt
- Mở thủ công: `http://localhost:3001`
- Hoặc chạy riêng frontend để tự mở browser:
```bash
cd frontend && npm run dev
```
- Trên Windows có thể mở nhanh bằng:
```bash
start http://localhost:3001
```

### Chạy dev an toàn (tự fix port)
```bash
npm run dev:safe
```

### Chạy production local (start)
```bash
npm run start
```

## 4) Cấu hình môi trường
### Backend
- File mẫu: `backend/env.example`
- Tạo file thực tế: `backend/.env`
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=HR_Management_System
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3000
```

### Frontend
- Khi build để deploy server: `REACT_APP_API_URL="/hr/api"`

## 5) Database
### Tạo database + import schema
```bash
# tạo DB (PostgreSQL)
createdb -U postgres HR_Management_System

# import schema
psql -U postgres -d HR_Management_System -f database/database_schema_postgresql.sql
```

### Cấu hình DB (.env)
`backend/.env`
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=HR_Management_System
DB_USER=postgres
DB_PASSWORD=Hainguyen261097
```

### Chạy lệnh DB trên Windows
#### Git Bash
```bash
createdb -U postgres HR_Management_System
psql -U postgres -d HR_Management_System -f database/database_schema_postgresql.sql
```

#### PowerShell
```powershell
 $env:PGPASSWORD = "Hainguyen261097"
createdb -U postgres HR_Management_System
psql -U postgres -d HR_Management_System -f database\database_schema_postgresql.sql
```

## 6) Thông tin server (production)
**Tham khảo chi tiết:** `HR_SERVER_INFO.md`  
**Lưu ý:** File này có thông tin nhạy cảm (password). Không public.

### Tóm tắt nhanh
- **Server IP:** `27.71.16.15`
- **OS:** Ubuntu Server 22.04 LTS
- **Public URL:** `http://27.71.16.15/hr`
- **Backend port:** `3000` (local)
- **Nginx:** Path routing `/hr` → frontend build
- **PM2 process:** `hr-management-api`
- **Project root:** `/var/www/hr-management`
- **Backend entry:** `/var/www/hr-management/backend/server.js`
- **Frontend build:** `/var/www/hr-management/frontend/build`
- **Backend env:** `/var/www/hr-management/backend/.env`
- **DB name:** `HR_Management_System`

### Lệnh trên server (production)
```bash
# SSH vào server
ssh root@27.71.16.15

# Di chuyển vào project
cd /var/www/hr-management

# Deploy chuẩn (pull + build + migrate + restart)
bash scripts/pull-and-migrate-on-server.sh

# Restart nhanh (không migrate)
pm2 restart hr-management-api
systemctl reload nginx

# Xem trạng thái
pm2 status
systemctl status nginx

# Xem log
pm2 logs hr-management-api --lines 50
tail -f /var/log/nginx/it-request-error.log | grep hr
```

## 7) Khi chuyển dự án qua máy laptop khác
### Cần cài đặt
- **Node.js 18+** (kèm npm)
- **PostgreSQL 14+**
- **Git**
- (Nếu deploy server) **PM2**: `npm i -g pm2`

### Các bước chuẩn
```bash
# 1) Clone dự án
git clone https://github.com/HaiNguyen26/HR-RMG-IDC.git
cd Web-App-HR-Demo

# 2) Cài dependencies
npm run install:all

# 3) Tạo và cấu hình DB (Tên DB: HR_Management_System)
createdb -U postgres HR_Management_System
psql -U postgres -d HR_Management_System -f database/database_schema_postgresql.sql

# 4) Tạo file .env cho backend
copy backend/env.example backend/.env

# 5) Chạy dự án
npm run dev
```

## 8) Tài liệu liên quan
- `README.md` (tổng quan + lệnh chạy nhanh)
- `docs/README_SETUP.md` (setup chi tiết)
- `docs/HUONG_DAN_KHOI_DONG.md` (khởi động)
- `docs/README_API.md` (API)
- `HR_SERVER_INFO.md` (server production)

