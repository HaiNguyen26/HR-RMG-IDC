# 🔄 Cập nhật Hệ thống - Code và Database

## 📋 File duy nhất để cập nhật mọi thứ

File này bao gồm:
- ✅ Cập nhật code mới
- ✅ Cập nhật database (migrations)
- ✅ Tất cả trong 1 quy trình

---

## 🚀 Quy trình Cập nhật Hoàn chỉnh

### 📤 BƯỚC 1: Push Code mới lên GitHub (Máy Local)

```powershell
cd D:\Web-App-HR-Demo

# Xem các file đã thay đổi
git status

# Add và commit
git add .
git commit -m "Update: [Mô tả thay đổi]

- Tính năng mới: ...
- Sửa lỗi: ...
- Migration: ..."

# Push lên GitHub
git push origin main
```

---

### 🖥️ BƯỚC 2: Cập nhật trên Server

**SSH vào server:**

```bash
ssh root@103.56.161.203
cd /var/www/hr-management-system
```

---

### 📥 BƯỚC 3: Pull Code mới

```bash
git pull origin main
```

---

### 🗄️ BƯỚC 4: Apply Database Migrations (Nếu có)

**Kiểm tra có migrations mới không:**

```bash
# Nếu có file migrations
if [ -d "database/migrations" ] && [ "$(ls -A database/migrations/*.sql 2>/dev/null)" ]; then
    echo "🔄 Đang apply database migrations..."
    
    # Backup database trước (khuyến nghị)
    sudo -u postgres pg_dump HR_Management_System > /tmp/backup_before_migration_$(date +%Y%m%d_%H%M%S).sql
    echo "✅ Đã backup database"
    
    # Apply từng migration
    for migration_file in $(ls -1 database/migrations/*.sql | sort); do
        echo "📝 Đang chạy: $(basename $migration_file)"
        sudo -u postgres psql -d HR_Management_System -f $migration_file
        
        if [ $? -eq 0 ]; then
            echo "✅ Thành công: $(basename $migration_file)"
        else
            echo "❌ Lỗi: $(basename $migration_file)"
            exit 1
        fi
    done
    
    echo "✅ Hoàn tất migrations!"
else
    echo "ℹ️  Không có migrations mới"
fi
```

**Hoặc chạy migration cụ thể:**

```bash
# Ví dụ: Apply migration file cụ thể
sudo -u postgres psql -d HR_Management_System -f database/migrations/005_add_email_to_users.sql
```

---

### 📦 BƯỚC 5: Cài Dependencies (Nếu có thay đổi)

#### Backend Dependencies

```bash
cd /var/www/hr-management-system/backend
npm install
```

#### Frontend Dependencies

```bash
cd /var/www/hr-management-system/frontend
npm install
```

---

### 🔨 BƯỚC 6: Build Frontend

```bash
cd /var/www/hr-management-system/frontend
npm run build
```

**Lưu ý:** Build có thể mất vài phút.

---

### 🔄 BƯỚC 7: Restart Ứng dụng

```bash
pm2 restart all

# Kiểm tra logs
pm2 logs --lines 20

# Kiểm tra status
pm2 status
```

---

### ✅ BƯỚC 8: Kiểm tra

```bash
# Kiểm tra backend
curl http://localhost:3000/health

# Kiểm tra logs
pm2 logs --lines 30
```

**Truy cập browser:** `http://103.56.161.203` và kiểm tra tính năng mới.

---

## ⚡ Script Tự động (Tất cả trong 1 lệnh)

### Tạo script trên Server

```bash
nano /var/www/hr-management-system/update.sh
```

**Paste nội dung này:**

```bash
#!/bin/bash

echo "🔄 Bắt đầu cập nhật hệ thống..."

cd /var/www/hr-management-system

# 1. Pull code mới
echo "⬇️  Đang pull code từ GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Lỗi khi pull code!"
    exit 1
fi

# 2. Backup database (nếu có migrations)
if [ -d "database/migrations" ] && [ "$(ls -A database/migrations/*.sql 2>/dev/null)" ]; then
    echo "📦 Đang backup database..."
    BACKUP_FILE="/tmp/backup_before_update_$(date +%Y%m%d_%H%M%S).sql"
    sudo -u postgres pg_dump HR_Management_System > $BACKUP_FILE
    echo "✅ Đã backup: $BACKUP_FILE"
    
    # Apply migrations
    echo "🔄 Đang apply database migrations..."
    for migration_file in $(ls -1 database/migrations/*.sql | sort); do
        migration_name=$(basename $migration_file)
        echo "📝 Chạy migration: $migration_name"
        
        sudo -u postgres psql -d HR_Management_System -f $migration_file >> /tmp/migration.log 2>&1
        
        if [ $? -eq 0 ]; then
            echo "✅ Thành công: $migration_name"
        else
            echo "❌ Lỗi: $migration_name"
            echo "Xem log: /tmp/migration.log"
            exit 1
        fi
    done
    echo "✅ Hoàn tất migrations!"
fi

# 3. Cài backend dependencies
echo "📦 Đang cài backend dependencies..."
cd backend
npm install

# 4. Cài frontend dependencies
echo "📦 Đang cài frontend dependencies..."
cd ../frontend
npm install

# 5. Build frontend
echo "🔨 Đang build frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Lỗi khi build frontend!"
    exit 1
fi

# 6. Restart ứng dụng
echo "🔄 Đang restart ứng dụng..."
cd ..
pm2 restart all

# 7. Kiểm tra status
echo "✅ Kiểm tra trạng thái..."
sleep 3
pm2 status

echo ""
echo "✅ Cập nhật hoàn tất!"
echo "📝 Xem logs: pm2 logs"
echo "🌐 Truy cập: http://103.56.161.203"
```

**Cấp quyền:**

```bash
chmod +x /var/www/hr-management-system/update.sh
```

---

## 🎯 Sử dụng Script Tự động

**Chỉ cần 1 lệnh:**

```bash
cd /var/www/hr-management-system && ./update.sh
```

**Script sẽ tự động:**
1. ✅ Pull code mới từ GitHub
2. ✅ Backup database (nếu có migrations)
3. ✅ Apply database migrations
4. ✅ Cài dependencies (backend + frontend)
5. ✅ Build frontend
6. ✅ Restart ứng dụng
7. ✅ Kiểm tra trạng thái

---

## 📝 Quy trình Nhanh (Copy & Paste)

**Nếu KHÔNG có migrations và dependencies mới:**

```bash
cd /var/www/hr-management-system
git pull origin main
cd frontend && npm run build
cd ..
pm2 restart all
pm2 logs --lines 10
```

**Nếu CÓ migrations:**

```bash
cd /var/www/hr-management-system
git pull origin main

# Backup database
sudo -u postgres pg_dump HR_Management_System > /tmp/backup_$(date +%Y%m%d_%H%M%S).sql

# Apply migrations
for file in database/migrations/*.sql; do
    sudo -u postgres psql -d HR_Management_System -f $file
done

# Build và restart
cd frontend && npm run build && cd ..
pm2 restart all
```

---

## 🗄️ Tạo Migration Mới

**Khi cần thay đổi database:**

### Bước 1: Tạo migration file

**Trên máy local:**

```powershell
# Tạo file mới trong database/migrations/
# Ví dụ: database/migrations/005_add_email_to_users.sql
```

**Nội dung:**

```sql
-- Migration: Add email column to users table
-- Date: 2025-01-XX

BEGIN;

-- Thêm cột email
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email'
    ) THEN
        ALTER TABLE users ADD COLUMN email VARCHAR(255);
        COMMENT ON COLUMN users.email IS 'Email của user';
    END IF;
END $$;

COMMIT;
```

### Bước 2: Test trên local

```powershell
psql -U postgres -d HR_Management_System -f database\migrations\005_add_email_to_users.sql
```

### Bước 3: Commit và push

```powershell
git add database/migrations/005_add_email_to_users.sql
git commit -m "Migration: Add email column to users"
git push origin main
```

### Bước 4: Apply trên server

**Chạy script update hoặc thủ công:**

```bash
sudo -u postgres psql -d HR_Management_System -f database/migrations/005_add_email_to_users.sql
```

---

## 🆘 Troubleshooting

### Lỗi: Git conflict

```bash
# Xem file conflict
git status

# Xử lý conflict
git reset --hard HEAD  # Cẩn thận: Mất thay đổi local
git pull origin main
```

### Lỗi: Migration fail

```bash
# Xem log
cat /tmp/migration.log

# Restore từ backup
sudo -u postgres psql -d HR_Management_System < /tmp/backup_before_update_*.sql
```

### Lỗi: Build frontend fail

```bash
cd /var/www/hr-management-system/frontend
rm -rf node_modules build
npm install
npm run build
```

### Lỗi: Backend không start

```bash
pm2 logs hr-backend --lines 50
pm2 restart hr-backend

# Kiểm tra .env
cat backend/.env
```

---

## 📋 Checklist Cập nhật

**Trước khi cập nhật:**
- [ ] Code đã được test trên local
- [ ] Migration đã được test trên local (nếu có)
- [ ] Đã commit và push lên GitHub

**Trong khi cập nhật:**
- [ ] Pull code thành công
- [ ] Backup database (nếu có migrations)
- [ ] Apply migrations thành công
- [ ] Cài dependencies thành công
- [ ] Build frontend thành công
- [ ] Restart ứng dụng thành công

**Sau khi cập nhật:**
- [ ] Ứng dụng chạy bình thường
- [ ] Tính năng mới hoạt động
- [ ] Không có lỗi trong logs
- [ ] Database đã được cập nhật đúng

---

## 🎯 Tóm tắt

**File duy nhất này (`UPDATE.md`) bao gồm:**

1. ✅ **Cập nhật Code:** Pull, build, restart
2. ✅ **Cập nhật Database:** Apply migrations tự động
3. ✅ **Script tự động:** 1 lệnh làm tất cả
4. ✅ **Troubleshooting:** Xử lý lỗi thường gặp

---

## ⚡ Cách nhanh nhất

**Sử dụng script tự động:**

```bash
cd /var/www/hr-management-system && ./update.sh
```

**Hoặc quy trình thủ công nhanh:**

```bash
cd /var/www/hr-management-system
git pull origin main
./update.sh  # Nếu đã tạo script
```

---

**Từ giờ chỉ cần nhớ 1 file này: `UPDATE.md`!** 🎉

