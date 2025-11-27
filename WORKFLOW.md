# 🔄 Workflow Phát triển - Code và Deploy

## 📋 Tình trạng hiện tại

- ✅ **Database đã deploy** và đang chạy trên server
- ✅ **Mọi dữ liệu** đều được thao tác trực tiếp trên server
- ✅ **Từ giờ chỉ cần:** Code tính năng mới + Update lên server

---

## 🎯 Workflow Hàng ngày

### Khi có tính năng mới hoặc sửa lỗi:

```
1. Code trên Local
   ↓
2. Test trên Local
   ↓
3. Commit & Push lên GitHub
   ↓
4. Update trên Server (1 lệnh)
   ↓
5. Done! ✅
```

---

## 📝 Quy trình Chi tiết

### BƯỚC 1: Code trên Local

**Phát triển tính năng mới hoặc sửa lỗi trên máy local:**

```powershell
cd D:\Web-App-HR-Demo

# Code các file cần thiết
# - Frontend: frontend/src/...
# - Backend: backend/routes/..., backend/services/...
```

---

### BƯỚC 2: Test trên Local

**Chạy ứng dụng trên local để test:**

```powershell
# Chạy ứng dụng
npm run dev

# Test các tính năng mới
# - Frontend: http://localhost:3001
# - Backend: http://localhost:3000
```

**Kiểm tra:**
- ✅ Tính năng hoạt động đúng
- ✅ Không có lỗi trong console
- ✅ UI hiển thị đúng

---

### BƯỚC 3: Commit & Push lên GitHub

```powershell
# Xem các file đã thay đổi
git status

# Add các file
git add .

# Commit với message mô tả rõ ràng
git commit -m "Add: Tính năng mới - [Tên tính năng]

- Thêm chức năng A
- Sửa lỗi B
- Cải tiến C"

# Push lên GitHub
git push origin main
```

---

### BƯỚC 4: Update trên Server

**SSH vào server và chạy 1 lệnh:**

```bash
ssh root@103.56.161.203
cd /var/www/hr-management-system && ./update.sh
```

**Script `update.sh` sẽ tự động:**
1. ✅ Pull code mới từ GitHub
2. ✅ Backup database (nếu có migrations)
3. ✅ Apply database migrations (nếu có)
4. ✅ Cài dependencies mới
5. ✅ Build frontend
6. ✅ Restart ứng dụng

**Xong!** Tính năng mới đã có trên server.

---

## 🗄️ Nếu có thay đổi Database

### ⚠️ Cách làm của bạn: Backup/Restore từ Local

**Bạn không dùng migration scripts - luôn có database đầy đủ ở local trước!**

### Khi cần cập nhật Database trên Server:

### 1. Cập nhật Database trên Local

**Thêm/sửa dữ liệu hoặc cấu trúc database trên máy local của bạn:**
```powershell
# Thao tác trực tiếp với database local
# - Thêm nhân viên mới
# - Sửa cấu trúc bảng
# - Thêm dữ liệu mới
```

### 2. Backup Database từ Local

```powershell
cd D:\Web-App-HR-Demo

# Backup database
pg_dump -U postgres -d HR_Management_System > backup_hr_management_$(Get-Date -Format "yyyyMMdd_HHmmss").sql

# Hoặc tên đơn giản
pg_dump -U postgres -d HR_Management_System > backup_hr_management.sql
```

### 3. Upload Backup lên Server

```powershell
# Upload file backup lên server (KHÔNG qua GitHub)
scp backup_hr_management.sql root@103.56.161.203:/tmp/
```

### 4. Restore Database trên Server

**SSH vào server:**
```bash
ssh root@103.56.161.203

# Backup database cũ trên server (để đề phòng)
sudo -u postgres pg_dump HR_Management_System > /tmp/backup_server_$(date +%Y%m%d_%H%M%S).sql

# Restore database mới
sudo -u postgres psql -d HR_Management_System < /tmp/backup_hr_management.sql
```

**Xong!** Database trên server đã được cập nhật.

---

## ⚡ Tóm tắt Workflow

### Hàng ngày:

```bash
# 1. Code trên Local
# 2. Test trên Local  
# 3. Commit & Push
git add .
git commit -m "Update: ..."
git push origin main

# 4. Update Server (1 lệnh)
ssh root@103.56.161.203
cd /var/www/hr-management-system && ./update.sh
```

### Nếu có thay đổi Database:

```bash
# 1. Cập nhật database trên Local
# 2. Backup database từ Local
pg_dump -U postgres -d HR_Management_System > backup_hr_management.sql

# 3. Upload lên Server (SCP)
scp backup_hr_management.sql root@103.56.161.203:/tmp/

# 4. Restore trên Server
ssh root@103.56.161.203
sudo -u postgres psql -d HR_Management_System < /tmp/backup_hr_management.sql
```

---

## ✅ Checklist

**Trước khi Push:**
- [ ] Code đã được test trên local
- [ ] Không có lỗi trong console
- [ ] Tính năng hoạt động đúng

**Sau khi Update Server:**
- [ ] Ứng dụng chạy bình thường
- [ ] Tính năng mới hoạt động
- [ ] Không có lỗi trong logs (`pm2 logs`)

**Nếu có thay đổi Database:**
- [ ] Database đã được backup từ local
- [ ] File backup đã upload lên server
- [ ] Database trên server đã được restore

---

## 🆘 Nếu có lỗi sau khi Update

### Kiểm tra logs:

```bash
pm2 logs --lines 50
```

### Rollback nếu cần:

```bash
cd /var/www/hr-management-system

# Rollback code về commit trước
git log  # Xem các commit
git reset --hard <commit-hash>  # Về commit trước

# Restart
pm2 restart all
```

### Rollback Database:

```bash
# Restore từ backup cũ (nếu đã backup trước khi restore)
sudo -u postgres psql -d HR_Management_System < /tmp/backup_server_*.sql
```

---

## 📚 Tài liệu liên quan

- **Cập nhật chi tiết:** `UPDATE.md`
- **Deploy ban đầu:** `DEPLOY.md`
- **Migrate database:** `MIGRATE_DATABASE.md`

---

## 🎯 Lưu ý quan trọng

1. ✅ **Luôn test trên local trước** khi push lên GitHub
2. ✅ **Commit message rõ ràng** để dễ theo dõi
3. ✅ **Backup database server** trước khi restore database mới
4. ✅ **Kiểm tra logs** sau khi update để đảm bảo không có lỗi

---

**Từ giờ chỉ cần nhớ workflow này! Đơn giản và rõ ràng!** 🎉

