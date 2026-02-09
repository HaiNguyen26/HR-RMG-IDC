# Migration: Cho phép reset password không cần email

## Vấn đề
Trên server, bảng `password_reset_requests` có cột `email` là NOT NULL, khiến không thể reset password cho tài khoản chưa có email.

## Giải pháp
Chạy migration script để sửa schema cho phép `email` là NULL.

## Cách chạy trên server

### Cách 1: Chạy SQL script trực tiếp
```bash
# SSH vào server
ssh user@server

# Chạy migration script
cd /var/www/hr-management
psql -U hr_user -d hr_management -f database/migrate_password_reset_allow_null_email.sql
```

### Cách 2: Chạy SQL trực tiếp trong psql
```bash
# SSH vào server và connect database
psql -U hr_user -d hr_management

# Chạy các lệnh sau:
BEGIN;

-- Sửa cột email để cho phép NULL
ALTER TABLE password_reset_requests 
ALTER COLUMN email DROP NOT NULL;

COMMIT;

-- Kiểm tra kết quả
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'password_reset_requests'
AND column_name = 'email';
```

### Cách 3: Code tự động sửa (đã được thêm vào auth.js)
Code đã được cập nhật để tự động sửa schema khi chạy. Chỉ cần:
1. Pull code mới nhất lên server
2. Restart backend service
3. Gọi API forgot-password một lần, code sẽ tự động sửa schema

## Kiểm tra sau khi migration

```sql
-- Kiểm tra schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'password_reset_requests'
ORDER BY ordinal_position;

-- Kết quả mong đợi: is_nullable = 'YES' cho cột email
```

## Test
1. Tìm một tài khoản không có email
2. Gọi API `/api/auth/forgot-password` với mã nhân viên
3. Kiểm tra response không còn lỗi 400 về thiếu email
4. Tiếp tục reset password với token nhận được
