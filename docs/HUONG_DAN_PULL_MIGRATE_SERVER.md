# Hướng Dẫn Pull Code và Chạy Migration Trên Server

## Bước 1: Kiểm tra và Pull Code

```bash
# Vào thư mục project
cd /var/www/hr-management

# Kiểm tra git status
git status

# Pull code mới từ repository
git pull origin main
```

## Bước 2: Kiểm tra file migration đã có chưa

```bash
# Kiểm tra file migration
ls -la database/migrate_attendance_adjustments_allow_null_reason.sql
ls -la database/migrate_travel_expense_step1_fields.sql

# Kiểm tra script (nếu có)
ls -la scripts/pull-and-migrate-on-server.sh
```

## Bước 3: Chạy Migration Thủ Công (Khuyến nghị)

Nếu script chưa có, chạy thủ công:

```bash
# 1. Dừng PM2
pm2 stop hr-management-api

# 2. Pull code (nếu chưa pull)
git pull origin main

# 3. Chạy migration 1
sudo -u postgres psql -d HR_Management_System -f database/migrate_attendance_adjustments_allow_null_reason.sql

# 4. Chạy migration 2
sudo -u postgres psql -d HR_Management_System -f database/migrate_travel_expense_step1_fields.sql

# 5. Khởi động lại PM2
pm2 start hr-management-api
pm2 save
```

## Bước 4: Kiểm tra kết quả

```bash
# Kiểm tra PM2 đã chạy chưa
pm2 list
pm2 logs hr-management-api --lines 50
```

