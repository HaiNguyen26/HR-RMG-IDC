# Hướng dẫn Triển khai lên Ubuntu Cloud Server

## 📋 Tổng quan

Hướng dẫn này sẽ giúp bạn triển khai HR Management System lên Ubuntu cloud server để HR có thể sử dụng.

## 🎯 Các bước triển khai

### Bước 1: Chuẩn bị Server Ubuntu

#### 1.1. Kết nối SSH vào server
```bash
ssh root@your-server-ip
# hoặc
ssh username@your-server-ip
```

#### 1.2. Cập nhật hệ thống
```bash
sudo apt update && sudo apt upgrade -y
```

#### 1.3. Cài đặt Node.js v20 LTS (Khuyến nghị)
```bash
# Sử dụng NodeSource repository - Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# HOẶC nếu muốn dùng Node.js 22 (phiên bản mới nhất)
# curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
# sudo apt-get install -y nodejs

# Kiểm tra phiên bản
node --version
npm --version
```

**⚠️ Lưu ý:** Node.js 18.x đã hết hỗ trợ và không nhận cập nhật bảo mật. Khuyến nghị dùng Node.js v20 LTS (hỗ trợ đến 2026) hoặc v22.

#### 1.4. Cài đặt PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y

# Khởi động PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Kiểm tra trạng thái
sudo systemctl status postgresql
```

#### 1.5. Cài đặt Nginx (Reverse Proxy)
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 1.6. Cài đặt PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

#### 1.7. Cài đặt Git
```bash
sudo apt install git -y
```

### Bước 2: Cấu hình Database PostgreSQL

#### 2.1. Tạo database và user
```bash
sudo -u postgres psql
```

Trong PostgreSQL prompt:
```sql
-- Tạo database
CREATE DATABASE HR_Management_System
WITH ENCODING = 'UTF8'
LC_COLLATE = 'en_US.UTF-8'
LC_CTYPE = 'en_US.UTF-8';

-- Tạo user (thay đổi password)
CREATE USER hr_user WITH PASSWORD 'your_secure_password_here';
ALTER USER hr_user CREATEDB;

-- Cấp quyền
GRANT ALL PRIVILEGES ON DATABASE HR_Management_System TO hr_user;

-- Thoát
\q
```

#### 2.2. Cấu hình PostgreSQL cho remote access (nếu cần)
```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
```

Tìm và sửa:
```
listen_addresses = 'localhost'  # hoặc '*' nếu cần remote access
```

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Thêm dòng:
```
host    HR_Management_System    hr_user    127.0.0.1/32    md5
```

Khởi động lại PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### Bước 3: Clone và Cài đặt Application

#### 3.1. Clone repository
```bash
cd /var/www
sudo git clone https://github.com/your-repo/hr-management-system.git
# hoặc upload code lên server qua SCP/SFTP

# Đổi quyền sở hữu
sudo chown -R $USER:$USER /var/www/hr-management-system
cd /var/www/hr-management-system
```

#### 3.2. Cài đặt dependencies
```bash
# Cài đặt dependencies cho root
npm install

# Cài đặt backend dependencies
cd backend
npm install

# Cài đặt frontend dependencies
cd ../frontend
npm install

# Build frontend cho production
npm run build
```

### Bước 4: Cấu hình Environment Variables

#### 4.1. Backend .env file
```bash
cd /var/www/hr-management-system/backend
cp env.example .env
nano .env
```

Nội dung file `.env`:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=HR_Management_System
DB_USER=hr_user
DB_PASSWORD=your_secure_password_here

# Server Configuration
PORT=3000
NODE_ENV=production

# Default Password for New Employees
DEFAULT_PASSWORD=RMG123@

# JWT Secret (tạo một chuỗi ngẫu nhiên mạnh)
JWT_SECRET=your_jwt_secret_here
```

#### 4.2. Frontend .env file
```bash
cd /var/www/hr-management-system/frontend
nano .env
```

Nội dung file `.env`:
```env
REACT_APP_API_URL=http://your-domain.com/api
# hoặc
REACT_APP_API_URL=http://your-server-ip/api
```

**Quan trọng:** Sau khi thay đổi `.env`, cần build lại frontend:
```bash
npm run build
```

### Bước 5: Tạo PM2 Ecosystem File

Tạo file `ecosystem.config.js` ở thư mục root:

```javascript
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
```

Cài đặt `serve` để serve static files:
```bash
sudo npm install -g serve
```

### Bước 6: Cấu hình Nginx Reverse Proxy

Tạo file cấu hình Nginx:
```bash
sudo nano /etc/nginx/sites-available/hr-management-system
```

Nội dung:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # hoặc your-server-ip

    # Redirect HTTP to HTTPS (sau khi cài SSL)
    # return 301 https://$server_name$request_uri;

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
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # File upload size limit
    client_max_body_size 10M;
}
```

Kích hoạt site:
```bash
sudo ln -s /etc/nginx/sites-available/hr-management-system /etc/nginx/sites-enabled/
sudo nginx -t  # Kiểm tra cấu hình
sudo systemctl restart nginx
```

### Bước 7: Khởi động Application với PM2

#### 7.1. Tạo thư mục logs
```bash
cd /var/www/hr-management-system
mkdir -p logs
```

#### 7.2. Khởi động với PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Tạo script khởi động tự động khi server reboot
```

#### 7.3. Các lệnh PM2 hữu ích
```bash
pm2 status              # Xem trạng thái
pm2 logs                # Xem logs
pm2 logs hr-backend     # Xem logs backend
pm2 logs hr-frontend    # Xem logs frontend
pm2 restart all         # Khởi động lại tất cả
pm2 stop all            # Dừng tất cả
pm2 monit               # Monitor realtime
```

### Bước 8: Cấu hình Firewall

```bash
# Cài đặt UFW (nếu chưa có)
sudo apt install ufw -y

# Cho phép SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Kích hoạt firewall
sudo ufw enable
sudo ufw status
```

### Bước 9: Cài đặt SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

Sau khi cài SSL, cập nhật lại file `.env` frontend:
```env
REACT_APP_API_URL=https://your-domain.com/api
```

Và build lại frontend:
```bash
cd /var/www/hr-management-system/frontend
npm run build
pm2 restart hr-frontend
```

### Bước 10: Kiểm tra và Test

1. **Kiểm tra Backend:**
```bash
curl http://localhost:3000/health
# Hoặc từ bên ngoài:
curl http://your-domain.com/api/health
```

2. **Kiểm tra Frontend:**
Mở trình duyệt và truy cập: `http://your-domain.com`

3. **Kiểm tra logs:**
```bash
pm2 logs
# hoặc
tail -f /var/www/hr-management-system/logs/backend-out.log
tail -f /var/www/hr-management-system/logs/frontend-out.log
```

## 🔄 Cập nhật Application

### Cập nhật Thủ công

Khi có code mới:

```bash
cd /var/www/hr-management-system

# 1. Backup database (QUAN TRỌNG!)
pg_dump -U hr_user -d HR_Management_System > /var/backups/hr-db/backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Pull code mới
git pull origin main

# 3. Cài đặt dependencies mới (nếu có)
cd backend && npm install
cd ../frontend && npm install

# 4. Build lại frontend
cd frontend
npm run build

# 5. Khởi động lại application
pm2 restart all
```

### Sử dụng Script Tự động

Sử dụng script `update.sh` để tự động hóa quá trình cập nhật:

```bash
cd /var/www/hr-management-system
chmod +x update.sh
sudo ./update.sh
```

Script sẽ tự động:
- ✅ Backup database
- ✅ Pull code mới
- ✅ Cập nhật dependencies
- ✅ Build frontend
- ✅ Restart application

**Xem hướng dẫn chi tiết:** [UPDATE_DEPLOYMENT.md](UPDATE_DEPLOYMENT.md)

## 📝 Checklist Sau khi Deploy

- [ ] PostgreSQL đang chạy
- [ ] Database đã được tạo và schema đã import
- [ ] Backend đang chạy trên port 3000
- [ ] Frontend đã được build và đang chạy
- [ ] PM2 đang quản lý processes
- [ ] Nginx đang chạy và cấu hình đúng
- [ ] Firewall đã được cấu hình
- [ ] SSL certificate đã được cài đặt (nếu có domain)
- [ ] Application có thể truy cập từ bên ngoài
- [ ] Có thể đăng nhập và sử dụng các chức năng

## 🛠️ Troubleshooting

### Lỗi kết nối database:
```bash
# Kiểm tra PostgreSQL
sudo systemctl status postgresql

# Kiểm tra kết nối
psql -U hr_user -d HR_Management_System -h localhost
```

### Lỗi port đã được sử dụng:
```bash
# Kiểm tra port
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :3001

# Kill process nếu cần
sudo kill -9 <PID>
```

### Xem logs chi tiết:
```bash
# PM2 logs
pm2 logs --lines 100

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

## 🔒 Bảo mật

1. **Đổi mật khẩu mặc định:**
   - Đổi password PostgreSQL user
   - Đổi password admin/HR accounts trong ứng dụng

2. **Cấu hình firewall:**
   - Chỉ mở các port cần thiết (80, 443, 22)

3. **SSL/HTTPS:**
   - Luôn sử dụng HTTPS cho production

4. **Backup database:**
   - Thiết lập backup tự động cho PostgreSQL

## 💾 Backup Database

Tạo script backup:
```bash
sudo nano /usr/local/bin/backup-hr-db.sh
```

Nội dung:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/hr-db"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U hr_user -d HR_Management_System > $BACKUP_DIR/hr_backup_$DATE.sql
# Giữ chỉ 7 bản backup gần nhất
ls -t $BACKUP_DIR/hr_backup_*.sql | tail -n +8 | xargs rm -f
```

Cấp quyền thực thi:
```bash
sudo chmod +x /usr/local/bin/backup-hr-db.sh
```

Thêm vào crontab để backup hàng ngày:
```bash
crontab -e
# Thêm dòng:
0 2 * * * /usr/local/bin/backup-hr-db.sh
```

