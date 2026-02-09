# Hướng dẫn Deploy Fix Reset Password Không Cần Email

## Bước 1: Push code lên Git

**Lưu ý:** Nếu gặp lỗi "Permission denied" với file `.git/index.lock`, hãy:
1. Đóng tất cả các ứng dụng Git (VS Code, Git GUI, etc.)
2. Xóa file lock: `Remove-Item .git\index.lock -Force`
3. Chạy lại các lệnh sau:

```powershell
cd d:\HRM-RMG

# Xóa file lock nếu có
Remove-Item .git\index.lock -Force -ErrorAction SilentlyContinue

# Add các file đã thay đổi
git add backend/routes/auth.js
git add database/migrate_password_reset_allow_null_email.sql
git add database/MIGRATE_PASSWORD_RESET_README.md
git add scripts/on-server-migrate-password-reset.sh

# Commit
git commit -m "Fix: Allow password reset without email - support reset by employee code"

# Push
git push origin main
```

## Bước 2: Pull và chạy migration trên Server

SSH vào server và chạy các lệnh sau:

```bash
# 1. Pull code mới nhất
cd /var/www/hr-management
git pull origin main

# 2. Chạy migration để sửa schema database
bash scripts/on-server-migrate-password-reset.sh

# 3. Restart backend service (nếu cần)
# Tùy thuộc vào cách bạn chạy backend (PM2, systemd, etc.)
# Ví dụ với PM2:
pm2 restart hr-backend

# Hoặc với systemd:
sudo systemctl restart hr-backend
```

## Hoặc chạy migration SQL trực tiếp (nếu script không chạy được)

```bash
# SSH vào server
psql -U hr_user -d hr_management

# Chạy lệnh sau:
ALTER TABLE password_reset_requests ALTER COLUMN email DROP NOT NULL;

# Kiểm tra kết quả
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'password_reset_requests'
AND column_name = 'email';
```

## Kiểm tra sau khi deploy

1. Tìm một tài khoản không có email
2. Gọi API `/api/auth/forgot-password` với mã nhân viên
3. Kiểm tra response không còn lỗi 400 về thiếu email
4. Tiếp tục reset password với token nhận được

## Các file đã thay đổi

- `backend/routes/auth.js` - Code tự động sửa schema và cho phép reset không cần email
- `database/migrate_password_reset_allow_null_email.sql` - Migration script SQL
- `scripts/on-server-migrate-password-reset.sh` - Script bash để chạy migration
- `database/MIGRATE_PASSWORD_RESET_README.md` - Hướng dẫn chi tiết
