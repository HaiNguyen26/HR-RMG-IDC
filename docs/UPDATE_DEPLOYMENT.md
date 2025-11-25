# 🔄 Hướng dẫn Cập nhật Code lên Server đã Deploy

## ❓ Câu hỏi thường gặp

**Q: Sau này phát triển thêm code, hệ thống đã deploy có tự động thay đổi theo không?**  
**A: KHÔNG.** Code trên server không tự động cập nhật. Bạn cần thực hiện cập nhật thủ công.

## 📋 Quy trình Cập nhật

### Tùy chọn 1: Cập nhật Thủ công (Khuyến nghị)

#### Bước 1: Backup Database (QUAN TRỌNG!)

```bash
# SSH vào server
ssh user@your-server-ip

# Backup database trước khi cập nhật
pg_dump -U hr_user -d HR_Management_System > /var/backups/hr-db/hr_backup_before_update_$(date +%Y%m%d_%H%M%S).sql
```

#### Bước 2: Pull Code mới từ Git

```bash
cd /var/www/hr-management-system

# Pull code mới
git pull origin main
# hoặc
git pull origin master
```

**Nếu không dùng Git, bạn có thể:**
- Upload code mới qua SCP/SFTP
- Hoặc clone lại repository và copy code mới vào

#### Bước 3: Kiểm tra Thay đổi

```bash
# Kiểm tra xem có file .env mới không
# Nếu có thay đổi về environment variables, cần cập nhật
cat backend/.env.example
cat frontend/.env.example
```

#### Bước 4: Cập nhật Dependencies (nếu có)

```bash
# Cập nhật dependencies root (nếu có)
npm install

# Cập nhật backend dependencies
cd backend
npm install

# Cập nhật frontend dependencies
cd ../frontend
npm install
```

#### Bước 5: Chạy Database Migrations (nếu có)

```bash
# Kiểm tra xem có file migration mới không
ls -la database/*.sql

# Nếu có migration mới, chạy chúng
psql -U hr_user -d HR_Management_System -f database/migration_file_name.sql
```

**Lưu ý:** Chỉ chạy các migration chưa được chạy trước đó.

#### Bước 6: Build lại Frontend

```bash
cd /var/www/hr-management-system/frontend
npm run build
```

#### Bước 7: Restart Application

```bash
cd /var/www/hr-management-system

# Restart với PM2
pm2 restart all

# Hoặc restart từng service
pm2 restart hr-backend
pm2 restart hr-frontend
```

#### Bước 8: Kiểm tra

```bash
# Xem logs để đảm bảo không có lỗi
pm2 logs --lines 50

# Kiểm tra trạng thái
pm2 status

# Test API
curl http://localhost:3000/health

# Test Frontend (từ server)
curl http://localhost:3001
```

### Tùy chọn 2: Sử dụng Script Tự động

Tôi sẽ tạo script `update.sh` để tự động hóa quy trình này.

## 🔄 Quy trình Cập nhật Nhanh (Tóm tắt)

```bash
# 1. Backup database
pg_dump -U hr_user -d HR_Management_System > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Pull code
cd /var/www/hr-management-system && git pull

# 3. Cập nhật dependencies
npm install && cd backend && npm install && cd ../frontend && npm install

# 4. Chạy migrations (nếu có)
psql -U hr_user -d HR_Management_System -f database/new_migration.sql

# 5. Build frontend
cd frontend && npm run build

# 6. Restart
cd .. && pm2 restart all
```

## ⚠️ Lưu ý Quan trọng

### 1. Backup TRƯỚC KHI CẬP NHẬT

**LUÔN backup database trước khi cập nhật code!**

```bash
# Script backup nhanh
pg_dump -U hr_user -d HR_Management_System > /var/backups/hr-db/backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Kiểm tra Breaking Changes

Trước khi cập nhật, kiểm tra:
- [ ] Có thay đổi về database schema không?
- [ ] Có migration mới không?
- [ ] Có thay đổi về environment variables không?
- [ ] Có breaking changes trong API không?

### 3. Test trên Staging (Nếu có)

Nếu có môi trường staging/test, test ở đó trước:
```bash
# Deploy lên staging trước
# Test đầy đủ các tính năng
# Nếu OK, mới deploy lên production
```

### 4. Cập nhật Environment Variables

Nếu có thay đổi về `.env`:
```bash
# Backup .env cũ
cp backend/.env backend/.env.backup

# Cập nhật .env theo .env.example mới
nano backend/.env

# Tương tự cho frontend
cp frontend/.env frontend/.env.backup
nano frontend/.env

# Sau khi thay đổi frontend .env, build lại
cd frontend && npm run build
```

### 5. Migration Database

Nếu có migration mới:
```bash
# Xem danh sách migrations
ls -la database/*.sql

# Chạy migration (kiểm tra kỹ trước khi chạy!)
psql -U hr_user -d HR_Management_System -f database/new_migration.sql

# Hoặc từ PostgreSQL prompt
psql -U hr_user -d HR_Management_System
\i database/new_migration.sql
```

## 🔍 Kiểm tra Sau Khi Cập nhật

### 1. Kiểm tra Logs

```bash
# Xem logs real-time
pm2 logs

# Xem logs của backend
pm2 logs hr-backend --lines 100

# Xem logs của frontend
pm2 logs hr-frontend --lines 100

# Kiểm tra logs Nginx
sudo tail -f /var/log/nginx/error.log
```

### 2. Kiểm tra Services

```bash
# Kiểm tra PM2 status
pm2 status

# Kiểm tra PostgreSQL
sudo systemctl status postgresql

# Kiểm tra Nginx
sudo systemctl status nginx
```

### 3. Test Functionality

- [ ] Đăng nhập thành công
- [ ] Dashboard hiển thị đúng
- [ ] CRUD nhân viên hoạt động
- [ ] Các tính năng mới hoạt động đúng
- [ ] Không có lỗi JavaScript trong browser console
- [ ] API endpoints hoạt động đúng

### 4. Rollback Nếu Cần

Nếu có vấn đề, có thể rollback:

```bash
# 1. Rollback code về version trước
cd /var/www/hr-management-system
git reset --hard HEAD~1  # Hoặc commit hash cụ thể

# 2. Restore database (nếu cần)
psql -U hr_user -d HR_Management_System < /var/backups/hr-db/backup_YYYYMMDD_HHMMSS.sql

# 3. Build lại và restart
cd frontend && npm run build
cd .. && pm2 restart all
```

## 📅 Khuyến nghị Lịch Cập nhật

### Best Practices

1. **Cập nhật vào giờ thấp điểm:** Tránh giờ làm việc
2. **Thông báo trước:** Thông báo HR trước khi cập nhật
3. **Backup thường xuyên:** Backup database hàng ngày
4. **Test trước:** Test trên staging trước khi deploy production
5. **Document thay đổi:** Ghi lại các thay đổi quan trọng

### Lịch Backup

```bash
# Backup hàng ngày (thêm vào crontab)
0 2 * * * pg_dump -U hr_user -d HR_Management_System > /var/backups/hr-db/daily_backup_$(date +\%Y\%m\%d).sql

# Backup trước khi cập nhật (thủ công)
pg_dump -U hr_user -d HR_Management_System > /var/backups/hr-db/pre_update_backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql
```

## 🚀 Tự động hóa với Script

Sử dụng script `update.sh` để tự động hóa quy trình cập nhật.

Xem file `update.sh` ở thư mục root để biết chi tiết.

## ❓ FAQ

**Q: Có thể cập nhật mà không downtime không?**  
A: Có thể với một số bước chuẩn bị. Xem phần "Zero Downtime Deployment" trong DEPLOYMENT_UBUNTU.md

**Q: Làm sao biết có code mới?**  
A: Có thể setup webhook hoặc cron job để check git repository. Hoặc kiểm tra thủ công định kỳ.

**Q: Có thể tự động deploy khi push code không?**  
A: Có, với CI/CD pipeline (GitHub Actions, GitLab CI, etc.). Đây là chủ đề nâng cao.

**Q: Nên cập nhật bao lâu một lần?**  
A: Tùy vào tần suất phát triển. Khuyến nghị: khi có tính năng quan trọng hoặc bug fix khẩn cấp.

---

**Nhớ: Luôn backup trước khi cập nhật!** 💾


