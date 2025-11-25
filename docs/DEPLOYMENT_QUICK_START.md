# Hướng dẫn Triển khai Nhanh - Ubuntu Server

## 🚀 Tóm tắt nhanh

Để triển khai HR Management System lên Ubuntu cloud server, làm theo các bước sau:

### Bước 1: Chuẩn bị Server

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Node.js v20 LTS (Khuyến nghị - đang được hỗ trợ)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Lưu ý: Node.js 18.x đã hết hỗ trợ. Khuyến nghị dùng v20 LTS hoặc v22

# Cài đặt PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Cài đặt Nginx
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Cài đặt PM2
sudo npm install -g pm2

# Cài đặt Git
sudo apt install git -y
```

### Bước 2: Cấu hình Database

```bash
sudo -u postgres psql
```

Trong PostgreSQL:
```sql
CREATE DATABASE HR_Management_System WITH ENCODING = 'UTF8';
CREATE USER hr_user WITH PASSWORD 'your_secure_password';
ALTER USER hr_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE HR_Management_System TO hr_user;
\q
```

Import schema:
```bash
psql -U hr_user -d HR_Management_System -f /var/www/hr-management-system/database/database_schema_postgresql.sql
```

### Bước 3: Clone và Cài đặt App

```bash
# Clone hoặc copy code vào server
cd /var/www
sudo git clone https://your-repo/hr-management-system.git
# hoặc upload code qua SCP/SFTP

cd /var/www/hr-management-system
sudo chown -R $USER:$USER /var/www/hr-management-system

# Cài đặt dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# Build frontend
cd frontend && npm run build
```

### Bước 4: Cấu hình Environment

**Backend** (`backend/.env`):
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

**Frontend** (`frontend/.env`):
```env
REACT_APP_API_URL=http://your-domain.com/api
```

**Quan trọng:** Sau khi thay đổi `.env` frontend, build lại:
```bash
cd frontend && npm run build
```

### Bước 5: Cấu hình Nginx

```bash
sudo nano /etc/nginx/sites-available/hr-management-system
```

Nội dung:
```nginx
server {
    listen 80;
    server_name your-domain.com;

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
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    client_max_body_size 10M;
}
```

Kích hoạt:
```bash
sudo ln -s /etc/nginx/sites-available/hr-management-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Bước 6: Khởi động với PM2

```bash
cd /var/www/hr-management-system

# Tạo logs directory
mkdir -p logs

# Khởi động với PM2
pm2 start ecosystem.config.js

# Lưu cấu hình
pm2 save

# Tạo startup script
pm2 startup
```

### Bước 7: Cài đặt SSL (Tùy chọn)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

### Bước 8: Kiểm tra

1. Kiểm tra PM2:
```bash
pm2 status
pm2 logs
```

2. Kiểm tra Nginx:
```bash
sudo systemctl status nginx
```

3. Truy cập ứng dụng:
- Frontend: `http://your-domain.com`
- API Health: `http://your-domain.com/api/health`

## 📋 Checklist

- [ ] Node.js v18+ đã cài đặt
- [ ] PostgreSQL đã cài đặt và chạy
- [ ] Database đã được tạo và schema đã import
- [ ] Nginx đã cài đặt và cấu hình
- [ ] PM2 đã cài đặt
- [ ] Code đã được clone/copy vào server
- [ ] Dependencies đã được cài đặt
- [ ] Frontend đã được build
- [ ] Environment variables đã được cấu hình
- [ ] PM2 processes đang chạy
- [ ] Nginx đang chạy và cấu hình đúng
- [ ] Ứng dụng có thể truy cập từ bên ngoài

## 🔧 Sử dụng Script Deploy Tự động

Nếu đã chuẩn bị xong database và environment files:

```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

## 📚 Tài liệu chi tiết

Xem `docs/DEPLOYMENT_UBUNTU.md` để biết hướng dẫn chi tiết đầy đủ.

## 🆘 Troubleshooting

**Lỗi kết nối database:**
```bash
sudo systemctl status postgresql
psql -U hr_user -d HR_Management_System -h localhost
```

**Xem logs:**
```bash
pm2 logs
sudo tail -f /var/log/nginx/error.log
```

**Khởi động lại:**
```bash
pm2 restart all
sudo systemctl restart nginx
```

## 🔄 Cập nhật Code Sau Khi Deploy

**Q: Sau này phát triển thêm code, hệ thống có tự động cập nhật không?**  
**A: KHÔNG.** Bạn cần cập nhật thủ công hoặc dùng script.

### Cập nhật Nhanh

```bash
# Sử dụng script tự động (Khuyến nghị)
cd /var/www/hr-management-system
chmod +x update.sh
sudo ./update.sh
```

### Cập nhật Thủ công

```bash
cd /var/www/hr-management-system

# 1. Backup database (QUAN TRỌNG!)
pg_dump -U hr_user -d HR_Management_System > /var/backups/hr-db/backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Pull code mới
git pull origin main

# 3. Cập nhật dependencies
npm install && cd backend && npm install && cd ../frontend && npm install

# 4. Build frontend
cd frontend && npm run build

# 5. Restart
cd .. && pm2 restart all
```

**Xem hướng dẫn chi tiết:** [UPDATE_DEPLOYMENT.md](UPDATE_DEPLOYMENT.md)

## ✅ Kết luận

Sau khi hoàn thành các bước trên, ứng dụng sẽ sẵn sàng cho HR sử dụng!

**Đăng nhập mặc định:**
- Username: `hr`
- Password: `RMG123@`

**⚠️ Lưu ý:** Nhớ đổi mật khẩu sau lần đăng nhập đầu tiên!

