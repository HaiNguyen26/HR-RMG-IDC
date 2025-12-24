# Thông tin App HR Management System trên Server

## 📋 Tổng quan

- **Server IP**: `27.71.16.15`
- **OS**: Ubuntu Server 22.04 LTS
- **Domain**: Chưa có (dùng IP trực tiếp)
- **URL truy cập**: `http://27.71.16.15/hr`
- **Repository**: `https://github.com/HaiNguyen26/HR-RMG-IDC.git`
- **Branch**: `main`

---

## 🔌 Ports đang sử dụng

### Backend API
- **Port**: `3000`
- **Protocol**: HTTP
- **Local URL**: `http://localhost:3000`
- **Public URL**: `http://27.71.16.15/hr/api`

### Nginx Web Server
- **HTTP Port**: `80` (dùng chung với IT-Request app)
- **HTTPS Port**: `443` (chưa cấu hình SSL)
- **Public URL**: `http://27.71.16.15/hr` (path routing)

### Database
- **PostgreSQL Port**: `5432` (default)
- **Host**: `localhost`

---

## 📁 Thư mục và Đường dẫn

### Project Structure
```
/var/www/hr-management/
├── backend/
│   ├── routes/           # API routes
│   ├── middleware/      # Middleware
│   ├── server.js        # Entry point
│   ├── .env            # Environment variables
│   └── package.json
├── frontend/
│   ├── build/          # Frontend build output
│   ├── src/           # Frontend source code
│   ├── public/        # Static files
│   └── package.json
├── database/
│   ├── transfer_ownership_to_hr_user.sql
│   └── create_hr_user.sql
├── scripts/
│   ├── deploy-hr-to-server.sh
│   └── backup-hr-database.sh
├── ecosystem.hr.config.js  # PM2 configuration
└── package.json
```

### Các đường dẫn quan trọng
- **Project root**: `/var/www/hr-management`
- **Backend entry**: `/var/www/hr-management/backend/server.js`
- **Frontend build**: `/var/www/hr-management/frontend/build`
- **Environment file**: `/var/www/hr-management/backend/.env`
- **PM2 config**: `/var/www/hr-management/ecosystem.hr.config.js`

---

## 🔧 PM2 Configuration

### Process Information
- **Process name**: `hr-management-api`
- **Script**: `./backend/server.js`
- **Working directory**: `/var/www/hr-management`
- **Instances**: `1`
- **Exec mode**: `fork`
- **Auto restart**: `true`
- **Max memory**: `500M`

### PM2 Logs
- **Error log**: `/var/log/pm2/hr-api-error.log`
- **Output log**: `/var/log/pm2/hr-api-out.log`
- **Log format**: `YYYY-MM-DD HH:mm:ss Z`

### PM2 Commands
```bash
pm2 status                      # Xem trạng thái
pm2 logs hr-management-api      # Xem logs
pm2 restart hr-management-api   # Restart
pm2 stop hr-management-api      # Dừng
pm2 delete hr-management-api    # Xóa
pm2 save                        # Lưu cấu hình
pm2 startup                     # Thiết lập auto-start
```

---

## 🌐 Nginx Configuration

### Configuration Files
- **Config location**: `/etc/nginx/sites-available/it-request-tracking` (dùng chung với IT-Request)
- **Enabled link**: `/etc/nginx/sites-enabled/it-request-tracking`

### Nginx Configuration Details (HR App)
```nginx
# HR Management System - Path Routing
location /hr {
    alias /var/www/hr-management/frontend/build;
    try_files $uri $uri/ /hr/index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}

location /hr/api {
    proxy_pass http://localhost:3000/api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

### Nginx Commands
```bash
systemctl status nginx       # Trạng thái
systemctl restart nginx      # Restart
systemctl reload nginx      # Reload config
nginx -t                     # Test config
```

---

## 🗄️ Database Configuration

### Database Information
- **Database name**: `HR_Management_System`
- **Database user**: `hr_user`
- **Database password**: `Hainguyen261097`
- **Database host**: `localhost`
- **Database port**: `5432`
- **Connection string**: `postgresql://hr_user:Hainguyen261097@localhost:5432/HR_Management_System`

### Database Tables
- `employees` - Danh sách nhân viên
- `users` - Tài khoản người dùng
- `leave_requests` - Đơn nghỉ phép
- `overtime_requests` - Đơn tăng ca
- `attendance_adjustments` - Đơn bổ sung chấm công
- `candidates` - Ứng viên
- `recruitment_requests` - Yêu cầu tuyển dụng
- `interview_requests` - Yêu cầu phỏng vấn
- `travel_expense_requests` - Đơn công tác
- `equipment_assignments` - Phân bổ thiết bị
- `notifications` - Thông báo
- `requests` - Yêu cầu tổng hợp
- `request_items` - Chi tiết yêu cầu

### Database Commands
```bash
# Kiểm tra database
sudo -u postgres psql -l | grep HR_Management_System

# Kết nối database với hr_user
PGPASSWORD=Hainguyen261097 psql -h localhost -U hr_user -d HR_Management_System

# Backup database
PGPASSWORD=Hainguyen261097 pg_dump -h localhost -U hr_user -d HR_Management_System > backup_HR_Management_System_$(date +%Y%m%d_%H%M%S).sql

# Restore database
# Bước 1: Restore với postgres user
sudo -u postgres psql -d HR_Management_System < backup_file.sql

# Bước 2: Chuyển ownership sang hr_user
sudo -u postgres psql -d HR_Management_System -f /var/www/hr-management/database/transfer_ownership_to_hr_user.sql
```

### Backup File
- **File backup hiện tại**: `backup_HR_Management_System_122025_03020PM.sql`
- **Location**: Upload trực tiếp lên server qua SCP/SFTP (không commit vào Git)

---

## 🔐 Environment Variables

### File Location
`/var/www/hr-management/backend/.env`

### Variables
```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=HR_Management_System
DB_USER=hr_user
DB_PASSWORD=Hainguyen261097
```

### Frontend Environment
- **REACT_APP_API_URL**: `/hr/api` (set khi build: `REACT_APP_API_URL="/hr/api" npm run build`)

---

## 📦 Dependencies & Versions

### Node.js
- **Version**: 18+ (cần kiểm tra: `node --version`)
- **Package manager**: npm

### Backend Dependencies (backend/package.json)
- **express**: `^4.x`
- **pg**: `^8.x` (PostgreSQL client)
- **bcryptjs**: `^2.x`
- **cors**: `^2.x`
- **dotenv**: `^16.x`
- **jsonwebtoken**: `^9.x`
- **react-datepicker**: `^4.x`

### Frontend Dependencies
- **React** + **Create React App**
- **react-router-dom**
- **axios**
- **react-datepicker**
- **Tailwind CSS** (nếu có)

---

## 🔥 Firewall (UFW)

### Ports đã mở
- **22/tcp** - SSH
- **80/tcp** - HTTP
- **443/tcp** - HTTPS (nếu có SSL)
- **3000/tcp** - HR Backend (chỉ localhost, không cần mở public)

### Firewall Commands
```bash
ufw status              # Kiểm tra trạng thái
ufw allow 22/tcp        # Mở port SSH
ufw allow 80/tcp        # Mở port HTTP
ufw allow 443/tcp       # Mở port HTTPS
ufw enable              # Enable firewall
```

---

## 🚀 Build & Deploy

### ⭐ DEPLOYMENT WORKFLOW CHUẨN (Sử dụng Script Tự động)

**Khi có code mới hoặc database migration mới, LUÔN LUÔN sử dụng script tự động:**

```bash
# Step 1: SSH vào server
ssh root@27.71.16.15

# Step 2: Navigate to project
cd /var/www/hr-management

# Step 3: Chạy script tự động
bash scripts/pull-and-migrate-on-server.sh

# Step 4: Verify (sau khi script hoàn tất)
pm2 status
pm2 logs hr-management-api --lines 20 --nostream
```

**Script sẽ tự động thực hiện:**
1. ✅ Dừng PM2 process
2. ✅ Pull code mới từ GitHub (main branch)
3. ✅ Build frontend với `REACT_APP_API_URL="/hr/api"`
4. ✅ Chạy SQL migrations
5. ✅ Restart PM2 và save config

**Thời gian deploy:** 2-5 phút (tùy vào kích thước build)

---

### Build Commands (Manual - CHỈ dùng khi cần thiết)
```bash
# Build frontend
cd /var/www/hr-management/frontend
REACT_APP_API_URL="/hr/api" npm run build

# Backend không cần build (chạy trực tiếp server.js)
```

### Deploy Script Khác (Tham khảo)
```bash
# Full deploy (setup lần đầu)
cd /var/www/hr-management
./scripts/deploy-hr-to-server.sh

# Pull code only (không build, không migrate)
cd /var/www/hr-management
./scripts/pull-code-on-server.sh
```

**⚠️ LƯU Ý:** 
- **KHUYÊN DÙNG:** `pull-and-migrate-on-server.sh` (tự động hóa hoàn toàn)
- Không deploy thủ công trừ khi script gặp lỗi

---

## 📡 API Endpoints

### Base URLs
- **Local Backend**: `http://localhost:3000/api`
- **Public API**: `http://27.71.16.15/hr/api`

### Main Endpoints
- **Employees**: `GET /api/employees`, `POST /api/employees`, etc.
- **Leave Requests**: `GET /api/leave-requests`, `POST /api/leave-requests`, etc.
- **Overtime Requests**: `GET /api/overtime-requests`, `POST /api/overtime-requests`, etc.
- **Attendance Adjustments**: `GET /api/attendance-requests`, `POST /api/attendance-requests`, etc.
- **Candidates**: `GET /api/candidates`, `POST /api/candidates`, etc.
- **Users**: `GET /api/users`, `POST /api/users`, etc.

---

## 👤 User & Permissions

### System User
- **User**: `root`
- **Group**: `root`

### Project Permissions
- **Owner**: `root:root`
- **Directory permissions**: `755`
- **File permissions**: `644`

### Database User
- **User**: `hr_user`
- **Password**: `Hainguyen261097`
- **Permissions**: Owner of `HR_Management_System` database và tất cả objects trong đó

---

## 📝 Logs Locations

### PM2 Logs
- **Error**: `/var/log/pm2/hr-api-error.log`
- **Output**: `/var/log/pm2/hr-api-out.log`

### Nginx Logs (dùng chung với IT-Request)
- **Access**: `/var/log/nginx/it-request-access.log`
- **Error**: `/var/log/nginx/it-request-error.log`

### System Logs
```bash
# Nginx system logs
journalctl -u nginx -f

# PM2 logs
pm2 logs hr-management-api --lines 100
```

---

## 🔍 Kiểm tra Trạng thái

### Commands để kiểm tra
```bash
# Kiểm tra ports đang dùng
netstat -tulpn | grep LISTEN | grep 3000

# Kiểm tra PM2 processes
pm2 list
pm2 status hr-management-api

# Kiểm tra Nginx config
nginx -t
cat /etc/nginx/sites-available/it-request-tracking | grep -A 10 "/hr"

# Kiểm tra database
PGPASSWORD=Hainguyen261097 psql -h localhost -U hr_user -d HR_Management_System -c "SELECT COUNT(*) FROM employees;"

# Kiểm tra Node version
node --version
npm --version

# Kiểm tra disk space
df -h

# Kiểm tra memory
free -h

# Kiểm tra services
systemctl status nginx
systemctl status postgresql
pm2 status
```

---

## ⚠️ Lưu ý khi Triển khai

### Ports đang sử dụng trên Server
- ✅ **Port 3000** - HR Management backend (localhost only)
- ✅ **Port 4000** - IT Request backend (localhost only)
- ✅ **Port 80** - Nginx (dùng chung cho cả 2 apps)
- ✅ **Port 5432** - PostgreSQL (dùng chung, database khác nhau)

### Path Routing
- **IT Request**: `http://27.71.16.15/` (root)
- **HR Management**: `http://27.71.16.15/hr` (path routing)

### Database Separation
- **IT Request DB**: `it_request_tracking` (user: `it_user` hoặc `postgres`)
- **HR Management DB**: `HR_Management_System` (user: `hr_user`)

---

## 📞 Troubleshooting

### Kiểm tra Backend
```bash
# Kiểm tra PM2
pm2 status
pm2 logs hr-management-api --lines 50

# Test API
curl http://localhost:3000/api/employees | head -20
curl http://27.71.16.15/hr/api/employees | head -20
```

### Kiểm tra Frontend
```bash
# Kiểm tra build
ls -la /var/www/hr-management/frontend/build/

# Kiểm tra Nginx
nginx -t
systemctl status nginx
tail -f /var/log/nginx/it-request-error.log | grep hr
```

### Kiểm tra Database
```bash
# Kiểm tra PostgreSQL
systemctl status postgresql

# Test connection với hr_user
PGPASSWORD=Hainguyen261097 psql -h localhost -U hr_user -d HR_Management_System -c "SELECT COUNT(*) FROM employees;"

# Kiểm tra ownership
sudo -u postgres psql -d HR_Management_System -c "SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public' AND tableowner != 'hr_user';"
```

### Lỗi thường gặp

#### 1. Lỗi ownership database
```bash
# Chuyển ownership lại
sudo -u postgres psql -d HR_Management_System -f /var/www/hr-management/database/transfer_ownership_to_hr_user.sql
```

#### 2. Lỗi Nginx config
```bash
# Test config
nginx -t

# Xem log chi tiết
tail -f /var/log/nginx/it-request-error.log
```

#### 3. Backend không khởi động
```bash
# Xem log chi tiết
pm2 logs hr-management-api --lines 100

# Kiểm tra .env file
cat /var/www/hr-management/backend/.env

# Test kết nối database
PGPASSWORD=Hainguyen261097 psql -h localhost -U hr_user -d HR_Management_System -c "SELECT 1;"
```

---

## 🔄 Deployment History & Workflow

### Latest Deployment
- **Date**: 2025-12-18
- **Commit**: `b3977ec` - Major Update: Login by Employee Code + Branch Director Logic + CEO Tracking + User Info Card
- **Method**: Automated script (`pull-and-migrate-on-server.sh`)
- **Status**: ✅ Success

### Standard Deployment Procedure
```bash
# 1. SSH to server
ssh root@27.71.16.15

# 2. Navigate & Deploy
cd /var/www/hr-management
bash scripts/pull-and-migrate-on-server.sh

# 3. Verify
pm2 status
pm2 logs hr-management-api --lines 20 --nostream
curl http://localhost:3000/api/employees | head -5
```

### Quick Verification Checklist
- [ ] PM2 status = **online**
- [ ] No errors in logs (last 50 lines)
- [ ] Backend API responds: `curl http://localhost:3000/api/employees`
- [ ] Public API responds: `curl http://27.71.16.15/hr/api/employees`
- [ ] Browser: `http://27.71.16.15/hr` loads correctly
- [ ] Login works with Employee Code
- [ ] New features visible (User Info Card, CEO Tracking, etc.)

---

## 📅 Version Information
- **Date**: 2025-12-18
- **Status**: Production
- **Version**: 1.1.0
- **Last Deployment**: 2025-12-18
- **Deploy Method**: Automated Script

---

## 📌 Quick Reference

### ⭐ Deploy Update (Code mới / Database mới)
```bash
# ============================================
# WORKFLOW CHUẨN - LUÔN LUÔN SỬ DỤNG SCRIPT NÀY
# ============================================
ssh root@27.71.16.15
cd /var/www/hr-management
bash scripts/pull-and-migrate-on-server.sh

# Verify sau khi script hoàn tất
pm2 status
pm2 logs hr-management-api --lines 20 --nostream
```

### Check Status
```bash
pm2 status hr-management-api
systemctl status nginx
curl http://localhost:3000/api/employees | head -5
curl http://27.71.16.15/hr/api/employees | head -5
```

### View Logs
```bash
pm2 logs hr-management-api
tail -f /var/log/pm2/hr-api-error.log
tail -f /var/log/nginx/it-request-error.log | grep hr
```

### Restart App (Chỉ restart, không deploy)
```bash
cd /var/www/hr-management
pm2 restart hr-management-api
systemctl reload nginx
```

### Backup Database
```bash
# Trên server
PGPASSWORD=Hainguyen261097 pg_dump -h localhost -U hr_user -d HR_Management_System > /tmp/backup_HR_Management_System_$(date +%Y%m%d_%H%M%S).sql

# Download về local
scp root@27.71.16.15:/tmp/backup_HR_Management_System_*.sql database/
```

### Auto Update với Migration (KHUYẾN NGHỊ)
```bash
cd /var/www/hr-management
bash scripts/pull-and-migrate-on-server.sh
```

Script này sẽ tự động:
1. Dừng PM2
2. Pull code mới từ git
3. Install dependencies và build lại frontend
4. Chạy tất cả migration SQL scripts (bao gồm Migration 11 & 12 cho travel expense)
5. Tạo/cấp quyền thư mục uploads
6. Khởi động lại PM2

### Manual Update (CHỈ khi script lỗi)
```bash
cd /var/www/hr-management
pm2 stop hr-management-api
git pull origin main
cd frontend && REACT_APP_API_URL="/hr/api" npm run build && cd ..
pm2 start hr-management-api
pm2 save
```

**LƯU Ý**: Manual update không chạy migration database. Nếu có thay đổi database schema, phải chạy migration thủ công hoặc dùng script tự động.

---

**Lưu ý**: File này chứa thông tin nhạy cảm (passwords, connection strings). Không commit vào Git hoặc chia sẻ công khai.

