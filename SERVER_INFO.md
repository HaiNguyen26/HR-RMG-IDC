# Thông tin App IT Request Tracking trên Server

## 📋 Tổng quan

- **Server IP**: `27.71.16.15`
- **OS**: Ubuntu
- **Domain**: Chưa có (dùng IP trực tiếp)
- **URL truy cập**: `http://27.71.16.15`
- **Repository**: `https://github.com/HaiNguyen26/IT-Request.git`
- **Branch**: `main`

---

## 🔌 Ports đang sử dụng

### Backend API
- **Port**: `4000`
- **Protocol**: HTTP
- **Local URL**: `http://localhost:4000`
- **Public URL**: `http://27.71.16.15/api`

### Nginx Web Server
- **HTTP Port**: `80`
- **HTTPS Port**: `443` (chưa cấu hình SSL)
- **Public URL**: `http://27.71.16.15`

### Database
- **PostgreSQL Port**: `5432` (default)
- **Host**: `localhost`

---

## 📁 Thư mục và Đường dẫn

### Project Structure
```
/var/www/it-request-tracking/
├── server/
│   ├── dist/              # Backend build output
│   ├── src/               # Backend source code
│   ├── uploads/           # Uploaded files
│   ├── .env              # Environment variables
│   └── package.json
├── webapp/
│   ├── dist/             # Frontend build output
│   ├── src/              # Frontend source code
│   └── package.json
├── ecosystem.config.js    # PM2 configuration
└── package.json
```

### Các đường dẫn quan trọng
- **Project root**: `/var/www/it-request-tracking`
- **Backend build**: `/var/www/it-request-tracking/server/dist`
- **Frontend build**: `/var/www/it-request-tracking/webapp/dist`
- **Uploads directory**: `/var/www/it-request-tracking/server/uploads`
- **Environment file**: `/var/www/it-request-tracking/server/.env`

---

## 🔧 PM2 Configuration

### Process Information
- **Process name**: `it-request-api`
- **Script**: `./server/dist/index.js`
- **Working directory**: `/var/www/it-request-tracking`
- **Instances**: `1`
- **Exec mode**: `fork`
- **Auto restart**: `true`
- **Max memory**: `500M`

### PM2 Logs
- **Error log**: `/var/log/pm2/it-api-error.log`
- **Output log**: `/var/log/pm2/it-api-out.log`
- **Log format**: `YYYY-MM-DD HH:mm:ss Z`

### PM2 Commands
```bash
pm2 status                    # Xem trạng thái
pm2 logs it-request-api       # Xem logs
pm2 restart it-request-api     # Restart
pm2 stop it-request-api        # Dừng
pm2 delete it-request-api      # Xóa
pm2 save                      # Lưu cấu hình
pm2 startup                   # Thiết lập auto-start
```

---

## 🌐 Nginx Configuration

### Configuration Files
- **Available config**: `/etc/nginx/sites-available/it-request-tracking`
- **Enabled link**: `/etc/nginx/sites-enabled/it-request-tracking`
- **Default site**: Đã xóa (`/etc/nginx/sites-enabled/default`)

### Nginx Logs
- **Access log**: `/var/log/nginx/it-request-access.log`
- **Error log**: `/var/log/nginx/it-request-error.log`

### Nginx Configuration Details
```nginx
server {
    listen 80;
    server_name 27.71.16.15;
    
    root /var/www/it-request-tracking/webapp/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Nginx Commands
```bash
systemctl status nginx       # Trạng thái
systemctl restart nginx      # Restart
systemctl reload nginx       # Reload config
nginx -t                     # Test config
```

---

## 🗄️ Database Configuration

### Database Information
- **Database name**: `it_request_tracking`
- **Database user**: `it_user` (hoặc `postgres`)
- **Database host**: `localhost`
- **Database port**: `5432`
- **Connection string**: `postgresql://it_user:password@localhost:5432/it_request_tracking`

### Database Tables
- `employees` - Danh sách nhân viên
- `service_requests` - Phiếu yêu cầu
- `request_notes` - Ghi chú yêu cầu
- `note_attachments` - File đính kèm
- `management_accounts` - Tài khoản quản lý

### Database Commands
```bash
# Kiểm tra database
sudo -u postgres psql -l | grep it_request_tracking

# Kết nối database
sudo -u postgres psql -d it_request_tracking

# Backup database
pg_dump -U postgres -d it_request_tracking > backup.sql

# Restore database
psql -U postgres -d it_request_tracking < backup.sql
```

---

## 🔐 Environment Variables

### File Location
`/var/www/it-request-tracking/server/.env`

### Variables
```env
PORT=4000
DATABASE_URL=postgresql://it_user:your_password@localhost:5432/it_request_tracking
NODE_ENV=production
```

### Frontend Environment
- **VITE_API_URL**: `http://27.71.16.15/api` (set khi build)

---

## 📦 Dependencies & Versions

### Node.js
- **Version**: 18+ (cần kiểm tra: `node --version`)
- **Package manager**: npm

### Backend Dependencies (server/package.json)
- **express**: `^5.1.0`
- **pg**: `^8.16.3` (PostgreSQL client)
- **bcryptjs**: `^2.4.3`
- **cors**: `^2.8.5`
- **dotenv**: `^17.2.3`
- **multer**: `^2.0.2` (file upload)
- **uuid**: `^9.0.1`
- **zod**: `^4.1.12` (validation)
- **typescript**: `^5.9.3`
- **ts-node-dev**: `^2.0.0`

### Frontend Dependencies
- **React** + **Vite**
- **TypeScript**
- **Tailwind CSS**

---

## 🔥 Firewall (UFW)

### Ports đã mở
- **22/tcp** - SSH
- **80/tcp** - HTTP
- **443/tcp** - HTTPS (nếu có SSL)

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

### Build Commands
```bash
# Build cả server và webapp
npm run build

# Build riêng server
cd server && npm run build

# Build riêng webapp
cd webapp && export VITE_API_URL=http://27.71.16.15/api && npm run build
```

### Deploy Workflow
1. Pull code từ GitHub: `git pull origin main`
2. Install dependencies: `npm install && npm run postinstall`
3. Build: `npm run build`
4. Restart PM2: `pm2 restart it-request-api --update-env`
5. Reload Nginx: `systemctl reload nginx`

---

## 📡 API Endpoints

### Health Check
- **GET** `http://localhost:4000/health`
- **Response**: `{"status":"ok"}`

### Public Endpoints
- **Base URL**: `http://27.71.16.15/api`
- **Health**: `http://27.71.16.15/api/health`

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
- **User**: `it_user` hoặc `postgres`
- **Permissions**: Full access to `it_request_tracking` database

---

## 📝 Logs Locations

### PM2 Logs
- **Error**: `/var/log/pm2/it-api-error.log`
- **Output**: `/var/log/pm2/it-api-out.log`

### Nginx Logs
- **Access**: `/var/log/nginx/it-request-access.log`
- **Error**: `/var/log/nginx/it-request-error.log`

### System Logs
```bash
# Nginx system logs
journalctl -u nginx -f

# PM2 logs
pm2 logs it-request-api --lines 100
```

---

## 🔍 Kiểm tra Trạng thái

### Commands để kiểm tra
```bash
# Kiểm tra ports đang dùng
netstat -tulpn | grep LISTEN

# Kiểm tra PM2 processes
pm2 list
pm2 status

# Kiểm tra Nginx sites
ls -la /etc/nginx/sites-enabled/

# Kiểm tra databases
sudo -u postgres psql -l

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
systemctl status pm2-root
```

---

## ⚠️ Lưu ý khi Triển khai App Mới

### Ports cần tránh
- ❌ **Port 4000** - Đã dùng cho IT Request backend
- ❌ **Port 80** - Đã dùng cho Nginx (có thể dùng domain khác)
- ❌ **Port 443** - Đã dùng cho HTTPS (có thể dùng domain khác)
- ❌ **Port 5432** - PostgreSQL (có thể dùng database khác)

### Ports có thể dùng
- ✅ **4001, 4002** - Backend ports
- ✅ **5000, 5001** - Backend ports
- ✅ **8000, 8001** - Backend ports
- ✅ **3000, 3001** - Backend ports

### Thư mục cần tránh
- ❌ `/var/www/it-request-tracking` - Đã dùng

### Thư mục có thể dùng
- ✅ `/var/www/app-moi` - Thư mục mới
- ✅ `/var/www/[tên-app]` - Tên khác

### PM2 Names cần tránh
- ❌ `it-request-api` - Đã dùng

### PM2 Names có thể dùng
- ✅ `app-moi-api` - Tên mới
- ✅ `[tên-app]-api` - Tên khác

### Database Names cần tránh
- ❌ `it_request_tracking` - Đã dùng

### Database Names có thể dùng
- ✅ `app_moi_db` - Database mới
- ✅ `[tên_app]_db` - Tên khác

### Nginx Config cần tránh
- ❌ `/etc/nginx/sites-available/it-request-tracking` - Đã dùng
- ❌ `/etc/nginx/sites-enabled/it-request-tracking` - Đã dùng

### Nginx Config có thể dùng
- ✅ `/etc/nginx/sites-available/app-moi` - Config mới
- ✅ Dùng domain/subdomain khác
- ✅ Dùng path routing (ví dụ: `/app-moi`)

---

## 🎯 Gợi ý Cấu hình cho App Mới

### Option 1: Dùng Domain/Subdomain khác
```
IT Request:  http://27.71.16.15 (hoặc it-request.rmg123.com)
App Mới:     URL / HRM
```

### Option 2: Dùng Port khác cho Backend
```
IT Request Backend:  Port 4000
App Mới Backend:     Port 4001
```

### Option 3: Dùng Path Routing
```
IT Request:  http://27.71.16.15/
App Mới:     http://27.71.16.15/app-moi/
```

### Cấu hình đề xuất cho App Mới
- **Backend port**: `4001` hoặc `5000`
- **Thư mục**: `/var/www/app-moi`
- **PM2 name**: `app-moi-api`
- **Database**: `app_moi_db`
- **Nginx**: Dùng domain riêng hoặc path routing

---

## 📞 Troubleshooting

### Kiểm tra Backend
```bash
# Kiểm tra PM2
pm2 status
pm2 logs it-request-api

# Test API
curl http://localhost:4000/health
curl http://27.71.16.15/api/health
```

### Kiểm tra Frontend
```bash
# Kiểm tra build
ls -la /var/www/it-request-tracking/webapp/dist/

# Kiểm tra Nginx
nginx -t
systemctl status nginx
tail -f /var/log/nginx/it-request-error.log
```

### Kiểm tra Database
```bash
# Kiểm tra PostgreSQL
systemctl status postgresql

# Test connection
sudo -u postgres psql -d it_request_tracking -c "SELECT COUNT(*) FROM employees;"
```

---

## 📅 Last Updated
- **Date**: 2024-11-28
- **Status**: Production
- **Version**: 1.0.0

---

## 📌 Quick Reference

### Restart App
```bash
cd /var/www/it-request-tracking
pm2 restart it-request-api --update-env
systemctl reload nginx
```

### Check Status
```bash
pm2 status
systemctl status nginx
curl http://localhost:4000/health
```

### View Logs
```bash
pm2 logs it-request-api
tail -f /var/log/nginx/it-request-error.log
```

---

**Lưu ý**: File này chứa thông tin nhạy cảm (passwords, connection strings). Không commit vào Git hoặc chia sẻ công khai.

