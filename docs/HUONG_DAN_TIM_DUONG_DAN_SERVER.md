# Hướng Dẫn Tìm Đường Dẫn Project Trên Server

## Cách 1: Tìm qua PM2 Process (Khuyến nghị)

```bash
# Xem thông tin PM2 process
pm2 list
pm2 info hr-management-api

# Hoặc xem chi tiết
pm2 describe hr-management-api | grep "exec cwd"
```

## Cách 2: Tìm qua Git Repository

```bash
# Tìm tất cả git repository trên server
find / -name ".git" -type d 2>/dev/null | grep -i hr

# Hoặc tìm trong các thư mục thường dùng
find /var/www /home /opt -name "Web-App-HR-Demo" -o -name "HR-RMG-IDC" 2>/dev/null
```

## Cách 3: Tìm qua Process Node.js

```bash
# Tìm process Node.js đang chạy
ps aux | grep node

# Xem working directory của process
pwdx $(pgrep -f "hr-management-api")
```

## Cách 4: Kiểm tra các đường dẫn thường dùng

```bash
# Thử các đường dẫn phổ biến
ls -la /var/www/
ls -la /home/*/Web-App-HR-Demo
ls -la /opt/Web-App-HR-Demo
ls -la ~/Web-App-HR-Demo
```

## Sau khi tìm thấy đường dẫn

Ví dụ nếu đường dẫn là `/var/www/hr-management`:

```bash
cd /var/www/hr-management
chmod +x scripts/pull-and-migrate-on-server.sh
./scripts/pull-and-migrate-on-server.sh
```

## Hoặc chạy thủ công

```bash
# 1. Dừng PM2
pm2 stop hr-management-api

# 2. Pull code (thay YOUR_PATH bằng đường dẫn thực tế)
cd YOUR_PATH
git pull origin main

# 3. Chạy migrations
sudo -u postgres psql -d HR_Management_System -f database/migrate_attendance_adjustments_allow_null_reason.sql
sudo -u postgres psql -d HR_Management_System -f database/migrate_travel_expense_step1_fields.sql

# 4. Khởi động lại PM2
pm2 start hr-management-api
pm2 save
```

