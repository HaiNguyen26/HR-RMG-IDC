# Hướng Dẫn Deploy HR Management System lên Cloud Server

## Thông tin Server
- **IP:** 27.71.16.15
- **Hệ điều hành:** Ubuntu Server 22.04 LTS
- **Repository:** https://github.com/HaiNguyen26/HR-RMG-IDC.git

## ⚠️ Lưu ý Quan Trọng

**Trên server này đã có app cũ đang chạy:**
- **App cũ:** `it-request-tracking` (PM2: `it-request-api`, Port: 4000)
- **Thư mục:** `/var/www/it-request-tracking`

**App mới (HR Management System) được cấu hình để KHÔNG xung đột:**
- **Ports:** 3001 (backend), 3002 (frontend) - khác với app cũ
- **PM2 Names:** `hr-rmg-idc-backend`, `hr-rmg-idc-frontend` - tên riêng biệt
- **Thư mục:** `/var/www/hr-rmg-idc` - thư mục riêng
- **Database:** `HR_Management_System` - database riêng

**✅ Cả 2 apps có thể chạy đồng thời mà không ảnh hưởng lẫn nhau!**

---

## PHẦN 1: BACKUP DATABASE LOCAL

### 1.1. Backup Database PostgreSQL

Trên máy local (Windows), mở PowerShell hoặc Command Prompt và chạy:

```bash
# Tạo thư mục backup nếu chưa có
mkdir backup

# Backup database (thay đổi thông tin kết nối nếu cần)
pg_dump -h localhost -U postgres -d HR_Management_System -F c -f backup/hr_management_backup_$(Get-Date -Format "yyyyMMdd_HHmmss").dump

# Hoặc backup dạng SQL
pg_dump -h localhost -U postgres -d HR_Management_System -f backup/hr_management_backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql
```

**Lưu ý:** Nhập password của PostgreSQL khi được yêu cầu.

### 1.2. Kiểm tra file backup

Đảm bảo file backup đã được tạo trong thư mục `backup/`. File backup sẽ được upload lên server sau.

---

## PHẦN 2: ĐƯA CODE LÊN GITHUB

### 2.1. Khởi tạo Git Repository (nếu chưa có)

```bash
# Kiểm tra xem đã có git chưa
git status

# Nếu chưa có, khởi tạo
git init

# Thêm remote repository
git remote add origin https://github.com/HaiNguyen26/HR-RMG-IDC.git
```

### 2.2. Tạo file .gitignore (nếu chưa có)

Tạo file `.gitignore` trong thư mục gốc với nội dung:

```
# Dependencies
node_modules/
frontend/node_modules/
backend/node_modules/

# Environment variables
.env
backend/.env
frontend/.env

# Build files
frontend/build/
dist/

# Logs
*.log
logs/
backend/logs/
frontend/logs/

# Database
*.sql
*.dump
backup/
database/*.sql
database/*.dump

# Uploads
backend/uploads/
frontend/uploads/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# PM2
.pm2/
ecosystem.config.js

# Temporary files
*.tmp
*.temp
```

### 2.3. Commit và Push code

```bash
# Thêm tất cả file (trừ những file trong .gitignore)
git add .

# Commit
git commit -m "Initial commit: HR Management System"

# Push lên GitHub (lần đầu)
git push -u origin main

# Hoặc nếu branch là master
git push -u origin master
```

**Lưu ý:** Nếu GitHub yêu cầu authentication, bạn cần:
- Tạo Personal Access Token trên GitHub
- Sử dụng token thay vì password khi push

---

## PHẦN 3: KIỂM TRA VÀ ĐẢM BẢO KHÔNG XUNG ĐỘT VỚI APP CŨ

### 3.1. Kết nối SSH vào server

```bash
ssh root@27.71.16.15
# hoặc
ssh username@27.71.16.15
```

### 3.2. Kiểm tra ứng dụng cũ đang chạy

**⚠️ QUAN TRỌNG: Kiểm tra trước khi deploy để đảm bảo không xung đột!**

```bash
# Kiểm tra PM2 apps đang chạy
pm2 list

# Kiểm tra ports đang được sử dụng (dùng ss trên Ubuntu 22.04)
sudo ss -tulpn | grep LISTEN

# Hoặc cài đặt netstat nếu muốn dùng (không bắt buộc)
# sudo apt install net-tools
# sudo netstat -tulpn | grep LISTEN

# Kiểm tra thư mục ứng dụng cũ
ls -la /var/www/

# Kiểm tra Nginx configs (nếu có)
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/
```

**📋 Thông tin app cũ trên server này (đã kiểm tra):**
- **Tên app:** `it-request-tracking`
- **PM2 app name:** `it-request-api`
- **Port:** `4000` (backend)
- **Thư mục:** `/var/www/it-request-tracking`
- **Nginx config:** `it-request-tracking` (port 80)
- **Database:** (cần kiểm tra riêng)

**✅ Xác nhận không xung đột:**
- App cũ dùng port 4000 → App mới dùng port 3001, 3002 ✅
- App cũ ở `/var/www/it-request-tracking` → App mới ở `/var/www/hr-rmg-idc` ✅
- App cũ PM2 name: `it-request-api` → App mới: `hr-rmg-idc-backend`, `hr-rmg-idc-frontend` ✅

**Ghi chú thêm (nếu có app khác):**
- Ports mà app khác đang dùng: `_____________`
- Tên PM2 apps khác: `_____________`
- Thư mục của app khác: `_____________`
- Database của app khác: `_____________`

### 3.3. Xác nhận cấu hình không xung đột

**Bảng so sánh:**

| Thành phần | App cũ (it-request-tracking) | App mới (HR Management System) | Xung đột? |
|------------|------------------------------|--------------------------------|-----------|
| **Backend Port** | 4000 | 3001 | ✅ Không |
| **Frontend Port** | - | 3002 | ✅ Không |
| **PM2 Backend** | `it-request-api` | `hr-rmg-idc-backend` | ✅ Không |
| **PM2 Frontend** | - | `hr-rmg-idc-frontend` | ✅ Không |
| **Thư mục** | `/var/www/it-request-tracking` | `/var/www/hr-rmg-idc` | ✅ Không |
| **Nginx Config** | `it-request-tracking` | `hr-rmg-idc` (tùy chọn) | ✅ Không |
| **Database** | (riêng) | `HR_Management_System` | ✅ Không |

**✅ KẾT LUẬN: Hoàn toàn không có xung đột! Có thể deploy an toàn.**

**Ứng dụng HR Management System mới sẽ sử dụng:**
- **Backend Port:** 3001 (khác với app cũ port 4000)
- **Frontend Port:** 3002 (app cũ không có frontend riêng)
- **PM2 App Names:** `hr-rmg-idc-backend`, `hr-rmg-idc-frontend` (tên riêng biệt)
- **Thư mục:** `/var/www/hr-rmg-idc` (thư mục riêng)
- **Database:** `HR_Management_System` (database riêng)

**Nếu trong tương lai có xung đột port:**
- Thay đổi port trong `ecosystem.config.js` và `backend/.env`
- Chọn port khác (ví dụ: 3003, 3004, 4001, 4002...)

### 3.4. Cập nhật hệ thống

```bash
sudo apt update
sudo apt upgrade -y
```

### 3.3. Cài đặt Node.js và npm

```bash
# Cài đặt Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Kiểm tra phiên bản
node --version
npm --version
```

### 3.5. Cài đặt PostgreSQL (nếu chưa có)

```bash
# Kiểm tra PostgreSQL đã được cài đặt chưa
psql --version

# Nếu chưa có, cài đặt
sudo apt install -y postgresql postgresql-contrib

# Khởi động PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Đặt password cho user postgres (nếu chưa đặt)
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your_secure_password';"

# Tạo database riêng cho HR Management System
sudo -u postgres psql -c "CREATE DATABASE \"HR_Management_System\";"
```

**Lưu ý:** 
- Thay `your_secure_password` bằng password mạnh
- Database `HR_Management_System` là database riêng, không ảnh hưởng đến database của app cũ

### 3.6. Cài đặt PM2 (nếu chưa có)

```bash
# Kiểm tra PM2 đã được cài đặt chưa
pm2 --version

# Nếu chưa có, cài đặt PM2 globally
sudo npm install -g pm2

# Khởi động PM2 khi server boot (chỉ cần làm 1 lần)
pm2 startup
# Chạy lệnh được hiển thị (thường là sudo env PATH=...)
```

**Lưu ý:** PM2 có thể quản lý nhiều ứng dụng cùng lúc. App mới sẽ có tên riêng và không ảnh hưởng đến app cũ.

### 3.7. Cài đặt serve (cho frontend)

```bash
# Kiểm tra serve đã được cài đặt chưa
serve --version

# Nếu chưa có, cài đặt
sudo npm install -g serve
```

### 3.8. Cài đặt Nginx (tùy chọn, để reverse proxy)

```bash
sudo apt install -y nginx

# Khởi động Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## PHẦN 4: CLONE CODE TỪ GITHUB

### 4.1. Tạo thư mục cho ứng dụng

```bash
# Tạo thư mục
sudo mkdir -p /var/www/hr-rmg-idc
sudo chown -R $USER:$USER /var/www/hr-rmg-idc

# Di chuyển vào thư mục
cd /var/www/hr-rmg-idc
```

### 4.2. Clone repository

```bash
# Clone code từ GitHub
git clone https://github.com/HaiNguyen26/HR-RMG-IDC.git .

# Hoặc nếu repository yêu cầu authentication
git clone https://YOUR_TOKEN@github.com/HaiNguyen26/HR-RMG-IDC.git .
```

### 4.3. Cài đặt dependencies

```bash
# Cài đặt dependencies cho backend
cd backend
npm install
cd ..

# Cài đặt dependencies cho frontend
cd frontend
npm install
cd ..
```

---

## PHẦN 5: RESTORE DATABASE

### 5.1. Upload file backup lên server

**⚠️ LƯU Ý:** Thay `username` bằng username thực tế (thường là `root` hoặc user có quyền SSH)

**Cách 1: Sử dụng SCP (từ máy local)**

```bash
# Trên máy local Windows (PowerShell)
# Thay 'root' bằng username thực tế của bạn
scp backup/hr_management_backup_*.dump root@27.71.16.15:/tmp/

# Hoặc file SQL
scp backup/hr_management_backup_*.sql root@27.71.16.15:/tmp/
```

**Nếu gặp lỗi "Permission denied":**
- Kiểm tra username đúng chưa (thường là `root`)
- Kiểm tra password đúng chưa
- Thử dùng SSH key thay vì password

**Cách 2: Sử dụng SFTP hoặc FileZilla**

1. Mở FileZilla hoặc WinSCP
2. Kết nối đến server:
   - Host: `27.71.16.15`
   - Username: `root` (hoặc username của bạn)
   - Password: (password SSH của bạn)
   - Port: `22`
3. Upload file backup vào thư mục `/tmp/`

**Cách 3: Sử dụng base64 encode (cho file nhỏ)**

Nếu file backup nhỏ (< 10MB), có thể dùng base64:

```bash
# Trên máy local - Encode file
certutil -encode backup/hr_management_backup_*.dump backup_encoded.txt

# Copy nội dung file backup_encoded.txt
# Trên server - Tạo file và decode
nano /tmp/backup_encoded.txt
# Paste nội dung, sau đó:
base64 -d /tmp/backup_encoded.txt > /tmp/hr_management_backup.dump
```

### 5.2. Restore database trên server

```bash
# Kết nối vào server (thay 'root' bằng username thực tế)
ssh root@27.71.16.15

# Kiểm tra file backup đã được upload
ls -lh /tmp/hr_management_backup_*

# Cách 1: Restore database mới (KHÔNG dùng flag -c) - Khuyến nghị cho database mới
# Dùng wildcard (tự động tìm file mới nhất)
pg_restore -h localhost -U postgres -d HR_Management_System /tmp/hr_management_backup_*.dump

# Cách 2: Dùng tên file cụ thể
# Ví dụ: file là hr_management_backup_20251128_133354.dump
pg_restore -h localhost -U postgres -d HR_Management_System /tmp/hr_management_backup_20251128_133354.dump

# Cách 3: Restore với --if-exists -c để bỏ qua lỗi nếu object không tồn tại
# Lưu ý: --if-exists PHẢI đi kèm với -c
pg_restore -h localhost -U postgres -d HR_Management_System --if-exists -c /tmp/hr_management_backup_*.dump

# Hoặc restore từ file SQL
psql -h localhost -U postgres -d HR_Management_System -f /tmp/hr_management_backup_*.sql
```

**Lưu ý:** 
- **Database mới:** Không dùng flag `-c` (sẽ gây lỗi vì không có gì để xóa)
- **Database đã có dữ liệu:** Dùng flag `-c` hoặc `--if-exists -c` để xóa trước khi restore
- Dùng wildcard `*` để tự động tìm file backup (khuyến nghị)
- Hoặc copy tên file chính xác từ kết quả `ls -lh /tmp/hr_management_backup_*`
- Nhập password của PostgreSQL (`Hainguyen261097`) khi được yêu cầu

**Nếu gặp lỗi khi restore:**

**Lỗi "relation does not exist":**
- Nguyên nhân: Dùng flag `-c` trên database mới (chưa có bảng)
- Giải pháp: Bỏ flag `-c` hoặc dùng `--if-exists -c`

**Lỗi "function already exists":**
- Nguyên nhân: Database đã có functions từ code tự động tạo schema
- Giải pháp: Dùng `--if-exists` hoặc bỏ qua lỗi (không ảnh hưởng đến dữ liệu)

```bash
# Kiểm tra file có tồn tại không
ls -la /tmp/hr_management_backup_*

# Kiểm tra quyền file
chmod 644 /tmp/hr_management_backup_*.dump

# Thử restore không dùng -c (cho database mới) - Khuyến nghị
pg_restore -h localhost -U postgres -d HR_Management_System /tmp/hr_management_backup_*.dump

# Nếu gặp lỗi "already exists", dùng --if-exists -c để bỏ qua
# Lưu ý: --if-exists PHẢI đi kèm với -c
pg_restore -h localhost -U postgres -d HR_Management_System --if-exists -c /tmp/hr_management_backup_*.dump

# Hoặc dùng --no-owner --no-acl để bỏ qua một số lỗi về ownership
pg_restore -h localhost -U postgres -d HR_Management_System --no-owner --no-acl /tmp/hr_management_backup_*.dump

# Hoặc kết hợp cả hai
pg_restore -h localhost -U postgres -d HR_Management_System --if-exists -c --no-owner --no-acl /tmp/hr_management_backup_*.dump

# Thử restore với verbose để xem lỗi chi tiết
pg_restore -h localhost -U postgres -d HR_Management_System -v /tmp/hr_management_backup_*.dump

# Nếu vẫn lỗi, có thể bỏ qua lỗi functions (chỉ restore dữ liệu)
# Các functions sẽ được tạo lại tự động khi ứng dụng chạy
```

**Lưu ý về lỗi "function already exists":**
- Lỗi này thường không ảnh hưởng đến dữ liệu
- Functions sẽ được tạo lại tự động khi ứng dụng chạy lần đầu
- Có thể bỏ qua và tiếp tục deploy

### 5.3. Kiểm tra database đã restore

```bash
# Kết nối vào PostgreSQL
sudo -u postgres psql -d HR_Management_System

# Kiểm tra các bảng
\dt

# Đếm số bản ghi trong một số bảng quan trọng
SELECT COUNT(*) FROM employees;
SELECT COUNT(*) FROM candidates;
SELECT COUNT(*) FROM leave_requests;

# Thoát
\q
```

---

## PHẦN 6: CẤU HÌNH MÔI TRƯỜNG

### 6.1. Tạo file .env cho backend

```bash
cd /var/www/hr-rmg-idc/backend
nano .env
```

Nội dung file `.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=HR_Management_System
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Server Configuration
PORT=3001
NODE_ENV=production

# Default Password for New Employees
DEFAULT_PASSWORD=RMG123@
```

**Lưu ý:** Thay `your_secure_password` bằng password PostgreSQL đã đặt ở bước 3.4.

### 6.2. Build frontend

```bash
cd /var/www/hr-rmg-idc/frontend

# Build production
npm run build

# Kiểm tra thư mục build đã được tạo
ls -la build/
```

---

## PHẦN 7: CẤU HÌNH PM2

### 7.1. Tạo file ecosystem.config.js

File `ecosystem.config.js` đã có trong repository. Kiểm tra và cập nhật nếu cần:

```bash
cd /var/www/hr-rmg-idc
cat ecosystem.config.js
```

### 7.2. Tạo thư mục logs

```bash
mkdir -p /var/www/hr-rmg-idc/logs
```

### 7.3. Kiểm tra lại trước khi khởi động

```bash
# Kiểm tra ports không bị chiếm (dùng ss thay vì netstat trên Ubuntu 22.04)
sudo ss -tulpn | grep :3001
sudo ss -tulpn | grep :3002

# Hoặc kiểm tra tất cả ports đang listen
sudo ss -tulpn | grep LISTEN

# Kiểm tra PM2 apps hiện tại
pm2 list

# Đảm bảo không có app nào trùng tên
pm2 list | grep hr-rmg-idc
```

### 7.4. Khởi động ứng dụng với PM2

```bash
cd /var/www/hr-rmg-idc

# Khởi động ứng dụng (chỉ start apps trong ecosystem.config.js)
pm2 start ecosystem.config.js

# Kiểm tra trạng thái (sẽ thấy cả app cũ và app mới)
pm2 status

# Xem logs của app mới
pm2 logs hr-rmg-idc-backend
pm2 logs hr-rmg-idc-frontend

# Lưu cấu hình PM2 (lưu tất cả apps)
pm2 save
```

**Nếu frontend gặp lỗi "getaddrinfo ENOTFOUND -l":**

Lỗi này xảy ra khi PM2 không parse đúng args. Giải pháp: Dùng shell script.

```bash
# 1. Tạo shell script để chạy serve
cd /var/www/hr-rmg-idc
cat > start-frontend.sh << 'EOF'
#!/bin/bash
# Shell script để chạy serve cho frontend
cd /var/www/hr-rmg-idc/frontend
exec npx serve -s build -l 3002
EOF

# 2. Cấp quyền thực thi
chmod +x start-frontend.sh

# 3. Xóa frontend app cũ
pm2 delete hr-rmg-idc-frontend

# 4. Khởi động lại từ config mới (đã dùng shell script)
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend

# 5. Kiểm tra lại
pm2 status
pm2 logs hr-rmg-idc-frontend --lines 20
```

**Lưu ý:** File `start-frontend.sh` đã được tạo trong repository, chỉ cần pull code và chạy các bước trên.

**Kiểm tra frontend có chạy đúng:**

```bash
# 1. Kiểm tra port 3002 đang listen
sudo ss -tulpn | grep :3002

# 2. Xóa log cũ và xem log mới (nếu vẫn thấy lỗi cũ)
pm2 flush hr-rmg-idc-frontend
pm2 logs hr-rmg-idc-frontend --lines 10

# 3. Test truy cập frontend
curl http://localhost:3002
# Hoặc từ máy khác: curl http://27.71.16.15:3002
```

**Nếu thấy log "Accepting connections at http://localhost:3002":**
- ✅ Frontend đã chạy thành công!
- Lỗi "getaddrinfo ENOTFOUND -l" có thể là log cũ từ lần chạy trước
- Dùng `pm2 flush` để xóa log cũ và xem log mới

**✅ Xác nhận thành công:**
- ✅ App cũ (`it-request-api` trên port 4000) vẫn đang chạy bình thường
- ✅ App mới (`hr-rmg-idc-backend` trên port 3001, `hr-rmg-idc-frontend` trên port 3002) đã khởi động thành công
- ✅ Port 3002 đang listen và serve content đúng cách
- ✅ Không có xung đột port, PM2 name, hoặc thư mục
- ✅ Cả 2 apps có thể chạy đồng thời mà không ảnh hưởng lẫn nhau
- ✅ Frontend có thể truy cập tại: `http://27.71.16.15:3002`
- ✅ Backend API có thể truy cập tại: `http://27.71.16.15:3001/api`

---

## PHẦN 8: CẤU HÌNH NGINX (TÙY CHỌN)

### 8.1. Kiểm tra Nginx config của app cũ

```bash
# Xem các site đã được cấu hình
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/

# Xem nội dung config của app cũ (nếu có)
# Ví dụ: app cũ là it-request-tracking
cat /etc/nginx/sites-enabled/it-request-tracking

# Hoặc xem tất cả configs
cat /etc/nginx/sites-enabled/*
```

**📋 Thông tin app cũ trên server này:**
- **Nginx config:** `it-request-tracking` (port 80)
- **Server name:** `27.71.16.15`
- **Frontend:** `/var/www/it-request-tracking/webapp/dist` (root path `/`)
- **Backend API:** `http://127.0.0.1:4000/api/` (path `/api/`)
- **Không có default site** (đã bị xóa hoặc không enable)

**⚠️ QUAN TRỌNG:** 
- App cũ (`it-request-tracking`) đã chiếm:
  - Port 80 (root path `/`)
  - Path `/api/` (backend API)
- **App mới KHÔNG thể dùng cùng path `/api/`** vì sẽ xung đột
- Bạn có thể:
  - **Tùy chọn 1:** Dùng path riêng (ví dụ: `/hr` và `/hr/api`) - **Khuyến nghị**
  - **Tùy chọn 2:** Dùng port khác (ví dụ: 8080)
  - **Tùy chọn 3:** Không dùng Nginx, truy cập trực tiếp qua port 3002 (đơn giản nhất)

### 8.2. Cấu hình Nginx để truy cập app HR qua link riêng

**🎯 Mục tiêu:** App cũ truy cập qua `http://27.71.16.15/`, app HR truy cập qua `http://27.71.16.15/hr`

**✅ Cách đơn giản nhất: Thêm vào config của app cũ**

**Bước 1: Sửa file config của app cũ**

```bash
sudo nano /etc/nginx/sites-available/it-request-tracking
```

**Bước 2: Thêm vào TRƯỚC location `/` (quan trọng!)**

⚠️ **QUAN TRỌNG:** Location `/hr` phải được đặt TRƯỚC location `/` để Nginx match đúng. Nếu đặt sau, location `/` sẽ match trước và `/hr` sẽ không hoạt động.

Tìm dòng `location / {` và thêm TRƯỚC nó:

```nginx
    # HR Management System - Backend API (phải đặt TRƯỚC location /)
    location /hr/api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        rewrite ^/hr/api/(.*)$ /api/$1 break;
    }

    # HR Management System - Frontend (phải đặt TRƯỚC location /)
    location /hr {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Không dùng rewrite, để serve trực tiếp từ serve
    }
    
    # HR Management System - Static files (JS, CSS, images)
    location /hr/static {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Đảm bảo MIME types đúng
        add_header Content-Type application/javascript;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Location / của app cũ (giữ nguyên)
    location / {
        # ... existing config ...
```

**Bước 3: Test và reload Nginx**

```bash
# Test cấu hình Nginx
sudo nginx -t

# Nếu test thành công, reload Nginx
sudo systemctl reload nginx

# Kiểm tra lại
sudo systemctl status nginx

# Kiểm tra xem location /hr đã được thêm chưa
sudo nginx -T | grep -A 10 "location /hr"
```

**Nếu vẫn không hoạt động, kiểm tra:**

```bash
# Xem toàn bộ config để đảm bảo location /hr đặt trước location /
sudo nginx -T | grep -B 5 -A 10 "location /hr"

# Kiểm tra xem có location nào khác match /hr không
sudo nginx -T | grep "location"
```

**Bước 4: Kiểm tra truy cập**

- App cũ: `http://27.71.16.15/` ✅
- App HR Frontend: `http://27.71.16.15/hr` ✅
- App HR Backend API: `http://27.71.16.15/hr/api` ✅

**Nếu gặp lỗi MIME type (Refused to execute script/apply style):**

Lỗi này xảy ra khi static files (JS, CSS) được serve với MIME type sai. Có thể do:
1. Rewrite rule không đúng
2. Serve không serve đúng static files

**Giải pháp: Sửa lại location /hr (bỏ rewrite):**

```nginx
    # HR Management System - Frontend (KHÔNG dùng rewrite)
    location /hr {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # BỎ rewrite ^/hr/(.*)$ /$1 break; - để serve trực tiếp
    }
```

Sau đó:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

**⚠️ Lưu ý:** Sau khi cấu hình, cần cập nhật frontend để dùng API path `/hr/api` thay vì `/api`. Xem phần 8.3 bên dưới.

---

### 8.3. Cập nhật Frontend để dùng API path mới

Sau khi cấu hình Nginx với path `/hr/api`, cần cập nhật frontend để gọi API đúng path.

**Cách 1: Sửa file API config (khuyến nghị)**

```bash
cd /var/www/hr-rmg-idc/frontend/src
nano services/api.js
```

Tìm dòng `baseURL` hoặc `API_BASE_URL` và sửa thành:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || '/hr/api';
```

**Cách 2: Dùng environment variable (tốt hơn)**

```bash
cd /var/www/hr-rmg-idc/frontend
nano .env
```

Thêm hoặc sửa:

```
REACT_APP_API_URL=/hr/api
```

Sau đó rebuild frontend:

```bash
npm run build
pm2 restart hr-rmg-idc-frontend
```

**Kiểm tra:**
- Truy cập `http://27.71.16.15/hr`
- Mở Developer Tools (F12) → Network tab
- Xem các API calls có dùng path `/hr/api` không

---

**Tùy chọn khác: Tạo config riêng (nếu muốn tách biệt hoàn toàn)**

```bash
sudo nano /etc/nginx/sites-available/hr-rmg-idc
```

Nội dung:

```nginx
server {
    listen 80;
    server_name 27.71.16.15;

    # HR Management System - Frontend
    location /hr {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        rewrite ^/hr/(.*)$ /$1 break;
    }

    # HR Management System - Backend API
    location /hr/api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        rewrite ^/hr/api/(.*)$ /api/$1 break;
    }
}
```

**Tùy chọn B: Dùng port riêng (8080)**

```bash
sudo nano /etc/nginx/sites-available/hr-rmg-idc
```

Nội dung:

```nginx
server {
    listen 8080;
    server_name 27.71.16.15;

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
    }
}
```

### 8.3. Kích hoạt site (chỉ nếu dùng Nginx)

```bash
# Tạo symbolic link
sudo ln -s /etc/nginx/sites-available/hr-rmg-idc /etc/nginx/sites-enabled/

# Kiểm tra cấu hình
sudo nginx -t

# Nếu có lỗi, kiểm tra xung đột với app cũ
# Reload Nginx
sudo systemctl reload nginx
```

**Lưu ý:** Nếu không dùng Nginx, bạn có thể truy cập trực tiếp:
- Frontend: http://27.71.16.15:3002
- Backend API: http://27.71.16.15:3001/api

---

## PHẦN 9: KIỂM TRA VÀ BẢO MẬT

### 9.1. Kiểm tra ứng dụng hoạt động

```bash
# Kiểm tra backend
curl http://localhost:3001/api/employees

# Kiểm tra frontend
curl http://localhost:3002

# Kiểm tra từ bên ngoài (nếu có Nginx)
curl http://27.71.16.15
```

### 9.2. Cấu hình Firewall

```bash
# Kiểm tra firewall hiện tại
sudo ufw status

# Cho phép SSH (nếu chưa có)
sudo ufw allow 22/tcp

# Cho phép HTTP và HTTPS (nếu dùng Nginx, và chưa có)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Cho phép port backend và frontend của app mới
sudo ufw allow 3001/tcp
sudo ufw allow 3002/tcp

# Nếu dùng Nginx với port riêng (ví dụ 8080)
sudo ufw allow 8080/tcp

# Kích hoạt firewall (nếu chưa kích hoạt)
sudo ufw enable

# Kiểm tra trạng thái
sudo ufw status
```

**Lưu ý:** Chỉ thêm rules mới, không xóa rules của app cũ.

### 9.3. Cấu hình PostgreSQL để chỉ chấp nhận localhost

```bash
# Chỉnh sửa file cấu hình
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Đảm bảo chỉ có dòng này cho IPv4 local connections:
host    all             all             127.0.0.1/32            scram-sha-256

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## PHẦN 10: CÁC LỆNH QUẢN LÝ THƯỜNG DÙNG

### 10.1. PM2 Commands

```bash
# Xem trạng thái
pm2 status

# Xem logs
pm2 logs
pm2 logs hr-rmg-idc-backend
pm2 logs hr-rmg-idc-frontend

# Restart ứng dụng
pm2 restart all
pm2 restart hr-rmg-idc-backend
pm2 restart hr-rmg-idc-frontend

# Stop ứng dụng
pm2 stop all

# Xóa ứng dụng khỏi PM2
pm2 delete all
```

### 10.2. Update code từ GitHub

```bash
cd /var/www/hr-rmg-idc

# Pull code mới
git pull origin main

# Cài đặt dependencies mới (nếu có)
cd backend && npm install && cd ..
cd frontend && npm install && npm run build && cd ..

# Restart CHỈ ứng dụng HR Management System (không restart app cũ)
pm2 restart hr-rmg-idc-backend
pm2 restart hr-rmg-idc-frontend

# Hoặc restart tất cả (nếu muốn)
# pm2 restart all
```

### 10.3. Backup database trên server

```bash
# Tạo backup
pg_dump -h localhost -U postgres -d HR_Management_System -F c -f /var/www/hr-rmg-idc/backup/hr_management_$(date +%Y%m%d_%H%M%S).dump

# Hoặc backup SQL
pg_dump -h localhost -U postgres -d HR_Management_System -f /var/www/hr-rmg-idc/backup/hr_management_$(date +%Y%m%d_%H%M%S).sql
```

---

## PHẦN 11: XỬ LÝ SỰ CỐ

### 11.1. Ứng dụng không khởi động

```bash
# Kiểm tra logs
pm2 logs

# Kiểm tra port đã được sử dụng chưa
sudo ss -tulpn | grep :3001
sudo ss -tulpn | grep :3002

# Kiểm tra file .env
cat backend/.env
```

### 11.2. Database connection error

```bash
# Kiểm tra PostgreSQL đang chạy
sudo systemctl status postgresql

# Kiểm tra kết nối
sudo -u postgres psql -d HR_Management_System

# Kiểm tra file .env có đúng thông tin không
cat backend/.env
```

### 11.3. Frontend không load

```bash
# Kiểm tra thư mục build
ls -la frontend/build/

# Rebuild frontend
cd frontend
npm run build
cd ..

# Restart frontend
pm2 restart hr-rmg-idc-frontend
```

---

## PHẦN 12: THÔNG TIN QUAN TRỌNG

### 12.1. Đường dẫn quan trọng

- **Code:** `/var/www/hr-rmg-idc`
- **Backend:** `/var/www/hr-rmg-idc/backend`
- **Frontend:** `/var/www/hr-rmg-idc/frontend`
- **Logs:** `/var/www/hr-rmg-idc/logs`
- **Backup:** `/var/www/hr-rmg-idc/backup`

### 12.2. Ports và PM2 Apps

**HR Management System (App mới):**
- **Backend Port:** 3001
- **Frontend Port:** 3002
- **PM2 Backend:** `hr-rmg-idc-backend`
- **PM2 Frontend:** `hr-rmg-idc-frontend`
- **Database:** `HR_Management_System`
- **Thư mục:** `/var/www/hr-rmg-idc`

**App cũ (it-request-tracking):**
- **Backend Port:** 4000
- **PM2 App:** `it-request-api`
- **Thư mục:** `/var/www/it-request-tracking`
- **Nginx:** `it-request-tracking` (port 80)

**✅ Không có xung đột giữa 2 apps!**

### 12.3. Truy cập ứng dụng

- **HR Management System (trực tiếp):** http://27.71.16.15:3002
- **HR Management System (qua Nginx):** http://27.71.16.15:8080 (nếu cấu hình)
- **Backend API:** http://27.71.16.15:3001/api

### 12.4. Quản lý riêng biệt

**Chỉ quản lý app HR Management System:**
```bash
# Xem status
pm2 list | grep hr-rmg-idc

# Restart
pm2 restart hr-rmg-idc-backend
pm2 restart hr-rmg-idc-frontend

# Stop
pm2 stop hr-rmg-idc-backend
pm2 stop hr-rmg-idc-frontend

# Xem logs
pm2 logs hr-rmg-idc-backend
pm2 logs hr-rmg-idc-frontend
```

**⚠️ LƯU Ý:** 
- Không dùng `pm2 delete all` - sẽ xóa cả app cũ!
- Chỉ dùng `pm2 restart all` nếu muốn restart tất cả apps
- Luôn chỉ định tên app khi muốn thao tác riêng

---

## KẾT LUẬN

Sau khi hoàn thành tất cả các bước trên, ứng dụng HR Management System sẽ được deploy và chạy trên cloud server. 

**Lưu ý quan trọng:**
- Đảm bảo backup database thường xuyên
- Giữ bí mật thông tin trong file `.env`
- Cập nhật code thường xuyên từ GitHub
- Monitor logs để phát hiện lỗi sớm

