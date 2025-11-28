# Hướng Dẫn Deploy HR Management System lên Cloud Server

## Thông tin Server
- **IP:** 27.71.16.15
- **Hệ điều hành:** Ubuntu Server 22.04 LTS
- **Repository:** https://github.com/HaiNguyen26/HR-RMG-IDC.git

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

# Kiểm tra ports đang được sử dụng
sudo netstat -tulpn | grep LISTEN
# hoặc
sudo ss -tulpn | grep LISTEN

# Kiểm tra thư mục ứng dụng cũ
ls -la /var/www/

# Kiểm tra Nginx configs (nếu có)
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/
```

**Ghi chú lại:**
- Ports mà app cũ đang dùng: `_____________`
- Tên PM2 apps của app cũ: `_____________`
- Thư mục của app cũ: `_____________`
- Database của app cũ: `_____________`

### 3.3. Xác nhận cấu hình không xung đột

**Ứng dụng HR Management System mới sẽ sử dụng:**
- **Backend Port:** 3001 (đảm bảo không trùng với app cũ)
- **Frontend Port:** 3002 (đảm bảo không trùng với app cũ)
- **PM2 App Names:** `hr-rmg-idc-backend`, `hr-rmg-idc-frontend` (tên riêng biệt)
- **Thư mục:** `/var/www/hr-rmg-idc` (thư mục riêng)
- **Database:** `HR_Management_System` (database riêng)

**Nếu có xung đột port:**
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

**Cách 1: Sử dụng SCP (từ máy local)**

```bash
# Trên máy local Windows (PowerShell)
scp backup/hr_management_backup_*.dump username@27.71.16.15:/tmp/

# Hoặc file SQL
scp backup/hr_management_backup_*.sql username@27.71.16.15:/tmp/
```

**Cách 2: Sử dụng SFTP hoặc FileZilla**

Kết nối đến server và upload file backup vào thư mục `/tmp/`.

### 5.2. Restore database trên server

```bash
# Kết nối vào server
ssh username@27.71.16.15

# Restore từ file dump
pg_restore -h localhost -U postgres -d HR_Management_System -c /tmp/hr_management_backup_*.dump

# Hoặc restore từ file SQL
psql -h localhost -U postgres -d HR_Management_System -f /tmp/hr_management_backup_*.sql
```

**Lưu ý:** Nhập password của PostgreSQL khi được yêu cầu.

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
# Kiểm tra ports không bị chiếm
sudo netstat -tulpn | grep :3001
sudo netstat -tulpn | grep :3002

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

**✅ Xác nhận:**
- App cũ vẫn đang chạy bình thường
- App mới đã khởi động thành công
- Không có xung đột port

---

## PHẦN 8: CẤU HÌNH NGINX (TÙY CHỌN)

### 8.1. Kiểm tra Nginx config của app cũ

```bash
# Xem các site đã được cấu hình
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/

# Xem nội dung config của app cũ (nếu có)
cat /etc/nginx/sites-enabled/default
# hoặc
cat /etc/nginx/sites-enabled/[tên-app-cũ]
```

**⚠️ QUAN TRỌNG:** 
- Nếu app cũ đã dùng port 80, bạn có thể:
  - Dùng subdomain hoặc path khác
  - Hoặc dùng port khác (ví dụ: 8080)
  - Hoặc không dùng Nginx, truy cập trực tiếp qua port 3002

### 8.2. Tạo file cấu hình Nginx (chỉ nếu cần)

**Tùy chọn A: Dùng subdomain hoặc path riêng**

```bash
sudo nano /etc/nginx/sites-available/hr-rmg-idc
```

Nội dung (ví dụ dùng path `/hr`):

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
sudo netstat -tulpn | grep :3001
sudo netstat -tulpn | grep :3002

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

**App cũ:**
- Ghi chú lại thông tin app cũ để tránh nhầm lẫn: `_____________`

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

