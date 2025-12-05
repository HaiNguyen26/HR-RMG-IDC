# 🚀 Hướng dẫn Triển khai HR Management System lên Server

## 📋 Tổng quan

Triển khai HR Management System lên server `27.71.16.15` cùng với IT-Request app đã có.

### Thông tin Server
- **Server IP**: `27.71.16.15`
- **OS**: Ubuntu Server 22.04 LTS
- **User**: `root`

### Cấu hình HR App
- **Backend Port**: `3000`
- **Frontend Path**: `/hr` (Nginx routing)
- **API Path**: `/hr/api`
- **Project Directory**: `/var/www/hr-management`
- **PM2 Name**: `hr-management-api`
- **Database**: `HR_Management_System`

### Cấu hình IT-Request App (đã có)
- **Backend Port**: `4000`
- **Frontend Path**: `/` (root)
- **API Path**: `/api`
- **Project Directory**: `/var/www/it-request-tracking`
- **PM2 Name**: `it-request-api`
- **Database**: `it_request_tracking`

---

## 📦 Bước 1: Backup Database (Local)

Trước khi deploy, **BẮT BUỘC** phải backup database từ local để restore lên server.

⚠️ **QUAN TRỌNG:** 
- File backup **KHÔNG được commit lên GitHub** (đã được ignore trong `.gitignore`)
- File backup sẽ được **upload trực tiếp lên server** qua SCP/SFTP
- Trên server, backup sẽ được restore bằng user `hr_user` (không dùng `postgres`)

### Windows
```bash
# Chạy script backup
scripts\backup-hr-database.bat
```

**Kết quả:**
- File backup sẽ được lưu tại: `database\backup_HR_Management_System_122025_02200PM.sql`
- Script sẽ yêu cầu nhập password PostgreSQL (password không hiển thị khi gõ)

### Linux/Mac
```bash
# Cấp quyền thực thi
chmod +x scripts/backup-hr-database.sh

# Chạy script backup
./scripts/backup-hr-database.sh
```

**Kết quả:**
- File backup sẽ được lưu tại: `database/backup_HR_Management_System_122025_02200PM.sql`

### Kiểm tra Backup thành công

Sau khi backup, kiểm tra:
```bash
# Windows
dir database\backup_HR_Management_System_122025_02200PM.sql

# Linux/Mac
ls -lh database/backup_HR_Management_System_122025_02200PM.sql
```

File backup phải có kích thước > 0 KB. Nếu file = 0 KB hoặc không tồn tại, backup đã thất bại.

---

## 🖥️ Bước 2: Kết nối Server

```bash
ssh root@27.71.16.15
```

---

## 📥 Bước 3: Upload Backup Database lên Server

### Option 1: SCP từ local (Khuyến nghị)

**Windows PowerShell:**
```powershell
# Upload file backup lên server
scp database\backup_HR_Management_System_122025_02200PM.sql root@27.71.16.15:/tmp/
```

**Windows Git Bash hoặc Linux/Mac:**
```bash
# Upload file backup lên server
scp database/backup_HR_Management_System_122025_02200PM.sql root@27.71.16.15:/tmp/
```

**Lưu ý:** 
- Lần đầu kết nối SSH sẽ hỏi xác nhận fingerprint, gõ `yes`
- Cần nhập password SSH của server

### Option 2: Upload qua GitHub (KHÔNG ĐƯỢC KHUYẾN NGHỊ - KHÔNG DÙNG)

❌ **KHÔNG NÊN:** File backup chứa dữ liệu nhạy cảm và đã được ignore trong `.gitignore`.

**Lý do không nên:**
- File backup chứa dữ liệu nhân viên nhạy cảm
- File backup có thể rất lớn
- `.gitignore` đã ignore `*.sql` và `backup_*.sql`
- Upload trực tiếp qua SCP/SFTP an toàn và nhanh hơn

**Nếu bắt buộc phải dùng (KHÔNG KHUYẾN NGHỊ):**
1. Tạm thời force add: `git add -f database/backup_HR_Management_System_122025_02200PM.sql`
2. Commit và push
3. Pull trên server
4. **Xóa file backup khỏi repo ngay sau khi deploy**
5. **Xóa file backup khỏi Git history** (nếu cần)

### Option 3: Upload thủ công qua SFTP

Dùng FileZilla, WinSCP hoặc SFTP client:
- **Host**: `27.71.16.15`
- **User**: `root`
- **Protocol**: SFTP
- **Remote path**: `/tmp/`
- **Local file**: `database/backup_HR_Management_System_122025_02200PM.sql`

### Kiểm tra file đã upload

Trên server:
```bash
ls -lh /tmp/backup_HR_Management_System_122025_02200PM.sql
```

File phải tồn tại và có kích thước > 0 KB.

---

## 🚀 Bước 4: Deploy Code lên Server

### Option 1: Dùng Script Deploy (Khuyến nghị)

Trên server:
```bash
cd /tmp
wget https://raw.githubusercontent.com/HaiNguyen26/HR-RMG-IDC/main/scripts/deploy-hr-to-server.sh
chmod +x deploy-hr-to-server.sh
./deploy-hr-to-server.sh
```

### Option 2: Deploy Thủ công

#### 4.1. Tạo thư mục project
```bash
mkdir -p /var/www/hr-management
cd /var/www/hr-management
```

#### 4.2. Clone repository
```bash
git clone https://github.com/HaiNguyen26/HR-RMG-IDC.git .
git checkout main
```

#### 4.3. Install dependencies
```bash
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

#### 4.4. Tạo database user hr_user
```bash
# Tạo user hr_user và cấp quyền
sudo -u postgres psql -f database/create_hr_user.sql

# Hoặc tạo thủ công
sudo -u postgres psql -c "CREATE USER hr_user WITH PASSWORD 'Hainguyen261097' CREATEDB;"
```

#### 4.5. Tạo file `.env` cho backend
```bash
cat > backend/.env << EOF
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=HR_Management_System
DB_USER=hr_user
DB_PASSWORD=Hainguyen261097
EOF
```

#### 4.6. Setup database

**Quan trọng:** Nếu đã có backup database từ local, restore backup TRƯỚC khi import schema.

```bash
# Tạo database với owner là hr_user (nếu chưa có)
sudo -u postgres psql -c "CREATE DATABASE HR_Management_System OWNER hr_user;" 2>/dev/null || echo "Database already exists"

# Cấp quyền owner nếu database đã tồn tại
sudo -u postgres psql -c "ALTER DATABASE HR_Management_System OWNER TO hr_user;" 2>/dev/null || true

# Restore từ backup - Làm TRƯỚC khi import schema
BACKUP_FILE="/tmp/backup_HR_Management_System_122025_02200PM.sql"

if [ -f "$BACKUP_FILE" ]; then
    echo "Found backup: $BACKUP_FILE"
    echo "Restoring from backup..."
    
    # Bước 1: Restore bằng postgres user (vì backup có thể có owner là postgres)
    sudo -u postgres psql -d HR_Management_System < "$BACKUP_FILE" 2>&1 | grep -v "ERROR:" | grep -v "WARNING:" || true
    
    echo "Transferring ownership to hr_user..."
    
    # Bước 2: Chuyển ownership sang hr_user
    if [ -f "database/transfer_ownership_to_hr_user.sql" ]; then
        sudo -u postgres psql -d HR_Management_System -f database/transfer_ownership_to_hr_user.sql
    else
        # Chuyển ownership thủ công
        sudo -u postgres psql -d HR_Management_System -c "ALTER DATABASE HR_Management_System OWNER TO hr_user;"
        sudo -u postgres psql -d HR_Management_System -c "ALTER SCHEMA public OWNER TO hr_user;"
    fi
    
    echo "✓ Database restored from backup and ownership transferred to hr_user"
else
    echo "Backup file not found: $BACKUP_FILE"
    echo "Please upload backup file first!"
    exit 1
fi

# Kiểm tra database
PGPASSWORD=Hainguyen261097 psql -h localhost -U hr_user -d HR_Management_System -c "SELECT COUNT(*) FROM employees;" || echo "⚠ Database may be empty"
```

**Lưu ý:**
- ✅ Backup đã có đầy đủ schema và dữ liệu, KHÔNG cần import schema nữa
- ✅ **QUAN TRỌNG:** 
  - Restore backup bằng `postgres` user trước (vì backup có owner là postgres)
  - Sau đó chuyển ownership tất cả objects sang `hr_user` để app có thể sử dụng
  - App sẽ kết nối database bằng `hr_user` với password `Hainguyen261097`
- ✅ File backup được upload trực tiếp từ local lên server qua SCP/SFTP (KHÔNG qua Git)

#### 4.7. Build frontend
```bash
cd frontend
REACT_APP_API_URL="/hr/api" npm run build
cd ..
```

#### 4.8. Setup PM2
```bash
# Copy ecosystem config
cp ecosystem.hr.config.js ecosystem.config.js

# Start với PM2
pm2 start ecosystem.hr.config.js
pm2 save
pm2 startup  # Nếu chưa setup auto-start
```

---

## 🌐 Bước 5: Cấu hình Nginx

### 5.1. Tạo Nginx config cho HR app

```bash
cat > /etc/nginx/sites-available/hr-management << 'EOF'
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
EOF
```

### 5.2. Thêm vào config IT-Request hiện có

Mở file `/etc/nginx/sites-available/it-request-tracking` và thêm vào trong block `server { ... }`:

```bash
nano /etc/nginx/sites-available/it-request-tracking
```

Thêm vào cuối file (trước dấu `}`):

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

### 5.3. Test và reload Nginx

```bash
# Test config
nginx -t

# Reload Nginx
systemctl reload nginx
```

---

## ✅ Bước 6: Kiểm tra Triển khai

### 6.1. Kiểm tra PM2
```bash
pm2 status
pm2 logs hr-management-api
```

### 6.2. Kiểm tra Backend API
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/employees
```

### 6.3. Kiểm tra Frontend
```bash
# Kiểm tra build
ls -la /var/www/hr-management/frontend/build/

# Test từ browser
# http://27.71.16.15/hr
```

### 6.4. Kiểm tra Database
```bash
PGPASSWORD=Hainguyen261097 psql -h localhost -U hr_user -d HR_Management_System -c "SELECT COUNT(*) FROM employees;"
```

---

## 🔄 Bước 7: Update Code (Lần sau)

Khi có code mới:

```bash
cd /var/www/hr-management
git pull origin main
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd frontend && REACT_APP_API_URL="/hr/api" npm run build && cd ..
pm2 restart hr-management-api
```

---

## 🗄️ Bước 8: Restore Database từ Backup

### Restore trong quá trình deploy

Nếu đã upload backup ở Bước 3, restore sẽ được thực hiện tự động ở Bước 4.5.

### Restore sau khi deploy (nếu cần)

Nếu cần restore lại database sau khi đã deploy:

```bash
# 1. Upload backup lên server từ local (nếu chưa có)
# Từ máy local:
scp database/backup_HR_Management_System_122025_02200PM.sql root@27.71.16.15:/tmp/

# 2. Trên server - Dừng app tạm thời (optional)
pm2 stop hr-management-api

# 3. Restore database (dùng postgres để restore, sau đó chuyển ownership)
# Bước 3a: Restore bằng postgres user
sudo -u postgres psql -d HR_Management_System < /tmp/backup_HR_Management_System_122025_02200PM.sql 2>&1 | grep -v "ERROR:" | grep -v "WARNING:" || true

# Bước 3b: Chuyển ownership sang hr_user
if [ -f "database/transfer_ownership_to_hr_user.sql" ]; then
    sudo -u postgres psql -d HR_Management_System -f database/transfer_ownership_to_hr_user.sql
else
    sudo -u postgres psql -d HR_Management_System -c "ALTER DATABASE HR_Management_System OWNER TO hr_user;"
    sudo -u postgres psql -d HR_Management_System -c "ALTER SCHEMA public OWNER TO hr_user;"
fi

# 5. Kiểm tra restore thành công
PGPASSWORD=Hainguyen261097 psql -h localhost -U hr_user -d HR_Management_System -c "SELECT COUNT(*) FROM employees;"

# 6. Khởi động lại app
pm2 start hr-management-api
```

**Lưu ý quan trọng:**
- ✅ Luôn dùng user `hr_user` để restore (KHÔNG dùng `postgres`)
- ✅ File backup được upload trực tiếp từ local lên server (KHÔNG qua Git)
- ✅ File backup KHÔNG được commit lên GitHub

### Restore từ backup khác

Nếu cần restore từ file backup khác:

```bash
# Bước 1: Restore bằng postgres user (vì backup có owner là postgres)
sudo -u postgres psql -d HR_Management_System < /tmp/backup_HR_Management_System_122025_02200PM.sql 2>&1 | grep -v "ERROR:" | grep -v "WARNING:" || true

# Bước 2: Chuyển ownership sang hr_user
if [ -f "database/transfer_ownership_to_hr_user.sql" ]; then
    sudo -u postgres psql -d HR_Management_System -f database/transfer_ownership_to_hr_user.sql
else
    sudo -u postgres psql -d HR_Management_System -c "ALTER DATABASE HR_Management_System OWNER TO hr_user;"
    sudo -u postgres psql -d HR_Management_System -c "ALTER SCHEMA public OWNER TO hr_user;"
fi
```

**Lưu ý:** 
- Restore bằng `postgres` user trước (vì backup có owner là postgres)
- Sau đó chuyển ownership sang `hr_user` để app có thể sử dụng
- Thay tên file backup trong lệnh trên nếu dùng file khác

### Lưu ý khi restore

⚠️ **Cảnh báo:** Restore sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại trong database!

- Backup database hiện tại trước khi restore (nếu cần)
- Đảm bảo app đã được dừng hoặc người dùng đã được thông báo
- Kiểm tra file backup có đầy đủ dữ liệu trước khi restore

---

## 🔧 Troubleshooting

### PM2 không chạy
```bash
pm2 status
pm2 logs hr-management-api --lines 50
pm2 restart hr-management-api
```

### Nginx không load được frontend
```bash
# Kiểm tra config
nginx -t

# Kiểm tra logs
tail -f /var/log/nginx/it-request-error.log

# Kiểm tra permissions
ls -la /var/www/hr-management/frontend/build/
chown -R root:root /var/www/hr-management/frontend/build/
```

### Database connection error
```bash
# Kiểm tra PostgreSQL
systemctl status postgresql

# Kiểm tra database
PGPASSWORD=Hainguyen261097 psql -h localhost -U hr_user -l | grep HR_Management_System

# Test connection
PGPASSWORD=Hainguyen261097 psql -h localhost -U hr_user -d HR_Management_System -c "SELECT 1;"
```

### Port đã được sử dụng
```bash
# Kiểm tra port 3000
netstat -tulpn | grep 3000

# Kill process nếu cần
kill -9 <PID>
```

---

## 📝 Cấu trúc Thư mục trên Server

```
/var/www/
├── it-request-tracking/          # IT-Request app (đã có)
│   ├── server/
│   └── webapp/
└── hr-management/                 # HR Management app (mới)
    ├── backend/
    │   ├── server.js
    │   ├── .env
    │   └── ...
    ├── frontend/
    │   ├── build/                # Frontend build output
    │   └── ...
    ├── database/
    ├── ecosystem.hr.config.js
    └── ...
```

---

## 🌐 URLs

### IT-Request App
- **Frontend**: `http://27.71.16.15/`
- **API**: `http://27.71.16.15/api`

### HR Management App
- **Frontend**: `http://27.71.16.15/hr`
- **API**: `http://27.71.16.15/hr/api`

---

## 🔐 Security Notes

1. **Database Password**: Đổi password trong `backend/.env` sau khi deploy
2. **File Permissions**: Đảm bảo `.env` không public readable
3. **Firewall**: Port 3000 chỉ cần accessible từ localhost (qua Nginx)
4. **SSL**: Cân nhắc setup SSL/HTTPS cho production

---

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra logs: `pm2 logs hr-management-api`
2. Kiểm tra Nginx: `tail -f /var/log/nginx/it-request-error.log`
3. Kiểm tra database: `PGPASSWORD=Hainguyen261097 psql -h localhost -U hr_user -d HR_Management_System`

---

---

## 📋 Checklist Triển khai

### Trước khi Deploy
- [ ] Backup database local thành công
- [ ] Kiểm tra file backup có kích thước > 0 KB
- [ ] Code đã được commit và push lên GitHub
- [ ] Có quyền truy cập SSH vào server

### Trong quá trình Deploy
- [ ] Upload backup database lên server qua SCP/SFTP (KHÔNG qua Git)
- [ ] Clone repository thành công (từ GitHub, KHÔNG có file backup)
- [ ] Install dependencies thành công
- [ ] Tạo user `hr_user` với password `Hainguyen261097`
- [ ] Tạo database với owner là `hr_user`
- [ ] Restore backup bằng user `hr_user` (KHÔNG dùng `postgres`)
- [ ] Build frontend thành công
- [ ] PM2 process chạy thành công với `hr_user` trong `.env`
- [ ] Cấu hình Nginx đúng

### Sau khi Deploy
- [ ] Test backend API: `curl http://localhost:3000/health`
- [ ] Test frontend: Truy cập `http://27.71.16.15/hr`
- [ ] Test database: Kiểm tra số lượng employees
- [ ] Test đăng nhập và các chức năng chính
- [ ] Kiểm tra logs không có lỗi

---

**Last Updated**: 2025-01-20

