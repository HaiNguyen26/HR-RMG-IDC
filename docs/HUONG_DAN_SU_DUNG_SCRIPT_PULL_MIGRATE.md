# Hướng Dẫn Sử Dụng Script Tự Động Pull Code và Migration

## 📋 Tổng Quan

Script `pull-and-migrate-on-server.sh` tự động thực hiện các bước:
1. ✅ Dừng PM2 process
2. ✅ Pull code mới từ git
3. ✅ Build lại frontend
4. ✅ Chạy migration database
5. ✅ Khởi động lại PM2

## 🚀 Cách Sử Dụng

### Bước 1: SSH vào server

```bash
ssh root@your-server-ip
```

### Bước 2: Vào thư mục project

```bash
cd /var/www/hr-management
```

### Bước 3: Pull code mới (nếu script chưa có)

```bash
git pull origin main
```

### Bước 4: Cấp quyền thực thi cho script (chỉ cần làm 1 lần)

```bash
chmod +x scripts/pull-and-migrate-on-server.sh
```

### Bước 5: Chạy script

```bash
./scripts/pull-and-migrate-on-server.sh
```

## 📝 Chi Tiết Các Bước Script Thực Hiện

Script sẽ tự động:

1. **Dừng PM2**: Dừng app HR để tránh conflict khi pull code và chạy migration
2. **Pull code**: Lấy code mới nhất từ repository
3. **Build frontend**: 
   - Tạo file `.env` nếu chưa có
   - Build React app với `REACT_APP_API_URL="/hr/api"`
   - Tạo thư mục `build/` với code đã build
4. **Chạy migrations**:
   - `migrate_attendance_adjustments_allow_null_reason.sql`
   - `migrate_travel_expense_step1_fields.sql`
   - (Tự động tìm và chạy các migration mới)
5. **Khởi động lại PM2**: Restart app với code mới

## ⚠️ Lưu Ý Quan Trọng

1. **Script chỉ dừng app HR**, không ảnh hưởng đến app IT-request
2. **Thời gian build frontend** có thể mất 2-5 phút tùy vào server
3. **Database migrations** sẽ được chạy tự động, không cần xác nhận
4. **Nếu có lỗi**, script sẽ dừng và báo lỗi, bạn cần kiểm tra và sửa thủ công

## 🔍 Kiểm Tra Sau Khi Chạy Script

```bash
# 1. Kiểm tra PM2 đã chạy chưa
pm2 list

# 2. Xem log để đảm bảo không có lỗi
pm2 logs hr-management-api --lines 50

# 3. Kiểm tra frontend đã được build chưa
ls -la frontend/build/

# 4. Test API
curl http://localhost:3000/health
```

## 🛠️ Xử Lý Lỗi

### Lỗi: "Permission denied"
```bash
chmod +x scripts/pull-and-migrate-on-server.sh
```

### Lỗi: "Script not found"
```bash
# Kiểm tra script có tồn tại không
ls -la scripts/pull-and-migrate-on-server.sh

# Nếu không có, pull code mới
git pull origin main
```

### Lỗi: "Build failed"
```bash
# Kiểm tra node_modules
cd frontend
npm install

# Build lại thủ công
REACT_APP_API_URL="/hr/api" npm run build
```

### Lỗi: "Migration failed"
```bash
# Kiểm tra file migration có tồn tại không
ls -la database/migrate_*.sql

# Chạy migration thủ công
sudo -u postgres psql -d HR_Management_System -f database/migrate_travel_expense_step1_fields.sql
```

## 📋 Script Thủ Công (Nếu Script Tự Động Không Hoạt Động)

Nếu script tự động gặp vấn đề, bạn có thể chạy thủ công:

```bash
# 1. Dừng PM2
pm2 stop hr-management-api

# 2. Pull code
cd /var/www/hr-management
git pull origin main

# 3. Build frontend
cd frontend
if [ ! -f .env ]; then
    echo "REACT_APP_API_URL=/hr/api" > .env
fi
REACT_APP_API_URL="/hr/api" npm run build
cd ..

# 4. Chạy migrations
sudo -u postgres psql -d HR_Management_System -f database/migrate_attendance_adjustments_allow_null_reason.sql
sudo -u postgres psql -d HR_Management_System -f database/migrate_travel_expense_step1_fields.sql

# 5. Khởi động lại PM2
pm2 start hr-management-api
pm2 save

# 6. Kiểm tra
pm2 logs hr-management-api --lines 30
```

## 🎯 Khi Nào Cần Chạy Script?

Chạy script này khi:
- ✅ Có code mới được push lên git
- ✅ Có migration database mới
- ✅ Cần cập nhật frontend với code mới
- ✅ Sau khi deploy code mới lên server

## 📞 Hỗ Trợ

Nếu gặp vấn đề, kiểm tra:
1. File `.env` trong `backend/` có đúng không
2. Database connection có OK không
3. PM2 process có chạy không
4. Frontend build có thành công không

