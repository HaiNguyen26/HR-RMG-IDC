# 🚀 Migrate Database từ Local lên Server - Hướng dẫn Nhanh

## ✅ Tình huống của bạn

- ✅ Có database với **toàn bộ nhân viên** trên local
- ✅ Muốn deploy lên server và **giữ nguyên dữ liệu**
- ✅ Server hiện tại đang trống

## 🎯 Khuyến nghị: **MIGRATE DATABASE**

Vì bạn có dữ liệu quan trọng (toàn bộ nhân viên), bạn **NÊN migrate database** từ local lên server.

---

## 📋 Quy trình 6 Bước

### ✅ BƯỚC 1: Backup Database từ Local

**Trên máy local (Windows), mở PowerShell hoặc CMD:**

```powershell
# Di chuyển đến thư mục project
cd D:\Web-App-HR-Demo

# Backup database (nhập password khi được hỏi)
pg_dump -U postgres -d HR_Management_System > backup_hr_management.sql
```

**Hoặc nếu dùng Git Bash:**

```bash
cd /d/Web-App-HR-Demo
pg_dump -U postgres -d HR_Management_System > backup_hr_management.sql
```

**Kết quả:** File `backup_hr_management.sql` sẽ được tạo trong thư mục project

**Kiểm tra file đã tạo:**
```powershell
dir backup_hr_management.sql
```

---

### ✅ BƯỚC 2: Copy File Backup lên Server

**⚠️ QUAN TRỌNG: Tạo thư mục trên server TRƯỚC khi copy!**

**Bước 2.1: Tạo thư mục trên server**

```bash
# SSH vào server
ssh root@103.56.161.203

# Tạo thư mục (nếu chưa có)
mkdir -p /var/www/hr-management-system
chmod 755 /var/www/hr-management-system

# Thoát
exit
```

**Bước 2.2: Copy file lên server**

**Cách 1: Dùng SCP (từ máy local)**

```powershell
# Trên máy local, từ thư mục project
scp backup_hr_management.sql root@103.56.161.203:/var/www/hr-management-system/
```

**Nếu gặp lỗi "destination not found", tạo thư mục trên server trước:**
```bash
ssh root@103.56.161.203 "mkdir -p /var/www/hr-management-system && chmod 755 /var/www/hr-management-system"
```

**Cách 2: Copy vào home trước, rồi move**

```powershell
# Copy vào home (luôn tồn tại)
scp backup_hr_management.sql root@103.56.161.203:~/

# SSH vào server và move
ssh root@103.56.161.203
mkdir -p /var/www/hr-management-system
mv ~/backup_hr_management.sql /var/www/hr-management-system/
exit
```

**Cách 3: Dùng FileZilla/WinSCP (Khuyến nghị nếu SCP lỗi)**

1. Download FileZilla: https://filezilla-project.org/
2. Mở FileZilla
3. File → Site Manager → New Site:
   - Host: `103.56.161.203`
   - Protocol: `SFTP`
   - User: `root`
   - Password: (nhập password)
4. Connect
5. Tạo thư mục `/var/www/hr-management-system` nếu chưa có
6. Upload file `backup_hr_management.sql` vào thư mục đó

---

### ✅ BƯỚC 3: Deploy Code lên Server

**Làm theo hướng dẫn `DEPLOY_NOW.md` NHƯNG:**

✅ **Làm đầy đủ:**
- Bước 1: Cài đặt prerequisites
- Bước 2: Tạo database (trống) - **VẪN LÀM BƯỚC NÀY**
- Bước 3: Copy code lên server
- Bước 4: Cài đặt dependencies

⏭️ **BỎ QUA:**
- Bước 5: Import schema (vì sẽ restore từ backup có cả schema + data)

---

### ✅ BƯỚC 4: Restore Database trên Server

**Trên server (SSH vào server):**

```bash
# Kiểm tra file backup đã có chưa
ls -lh /var/www/hr-management-system/backup_hr_management.sql

# Restore database (nhập password khi được hỏi)
cd /var/www/hr-management-system
psql -U hr_user -d HR_Management_System < backup_hr_management.sql
```

**Nếu có lỗi về ownership/permissions, thử:**

```bash
sudo -u postgres psql -d HR_Management_System < backup_hr_management.sql
```

---

### ✅ BƯỚC 5: Kiểm tra Database đã Restore

**Trên server:**

```bash
# Kiểm tra số lượng nhân viên
psql -U hr_user -d HR_Management_System -c "SELECT COUNT(*) FROM employees;"

# Kiểm tra danh sách tables
psql -U hr_user -d HR_Management_System -c "\dt"

# Kiểm tra một vài nhân viên
psql -U hr_user -d HR_Management_System -c "SELECT id, ho_ten, chuc_danh FROM employees LIMIT 5;"
```

**Kỳ vọng:** Số lượng nhân viên phải khớp với database local

---

### ✅ BƯỚC 6: Tiếp tục Deploy Code

**Tiếp tục các bước còn lại trong `DEPLOY_NOW.md`:**

- ✅ Bước 6: Cấu hình backend `.env` (đã có thông tin database rồi)
- ✅ Bước 7: Cấu hình frontend `.env`
- ✅ Bước 8: Build frontend
- ✅ Bước 9: Cấu hình Nginx
- ✅ Bước 10: Khởi động với PM2
- ✅ Bước 11: Kiểm tra

---

## 🔍 Checklist

Trước khi bắt đầu:
- [ ] Đã có PostgreSQL trên local
- [ ] Biết password PostgreSQL trên local
- [ ] Đã SSH được vào server
- [ ] Đã có quyền root/sudo trên server

Các bước migrate:
- [ ] Bước 1: Đã backup database từ local
- [ ] Bước 2: Đã copy file backup lên server
- [ ] Bước 3: Đã deploy code lên server
- [ ] Bước 4: Đã restore database trên server
- [ ] Bước 5: Đã kiểm tra dữ liệu đúng
- [ ] Bước 6: Đã hoàn tất deploy

Sau khi deploy:
- [ ] Đăng nhập được vào app trên server
- [ ] Thấy đầy đủ nhân viên trong danh sách
- [ ] Tất cả chức năng hoạt động bình thường

---

## ⚠️ Lưu ý quan trọng

### 1. Backup Database Local TRƯỚC

```powershell
# Luôn backup database local trước khi làm gì
pg_dump -U postgres -d HR_Management_System > backup_local_before_migrate.sql
```

### 2. Database Local vẫn giữ nguyên

- ✅ Backup chỉ là **copy**, không xóa database local
- ✅ Database local vẫn hoạt động bình thường
- ✅ Bạn có thể tiếp tục develop trên local

### 3. Nếu Restore bị lỗi

**Lỗi thường gặp:**

```bash
# Lỗi: permission denied
# Giải pháp: Dùng sudo
sudo -u postgres psql -d HR_Management_System < backup_hr_management.sql

# Lỗi: database does not exist
# Giải pháp: Tạo database trước
sudo -u postgres psql
CREATE DATABASE "HR_Management_System";
\q

# Lỗi: connection refused
# Giải pháp: Kiểm tra PostgreSQL đang chạy
sudo systemctl status postgresql
```

### 4. Nếu file backup quá lớn

```bash
# Nén file trước khi copy
gzip backup_hr_management.sql

# Copy file đã nén
scp backup_hr_management.sql.gz user@server:/var/www/hr-management-system/

# Trên server, giải nén
gunzip backup_hr_management.sql.gz

# Restore như bình thường
```

---

## 🎯 Tóm tắt Quy trình

```
LOCAL                           SERVER
──────────────────────────────────────────────
1. Backup database
   pg_dump → backup.sql
                               
2. Copy backup                → /var/www/hr-management-system/
                               
3. Deploy code                → Deploy code (bỏ qua import schema)
                               
4. Restore database           → psql < backup.sql
                               
5. Kiểm tra                   → SELECT COUNT(*) FROM employees;
                               
6. Deploy tiếp                → Build, Nginx, PM2
```

---

## 🆘 Nếu gặp vấn đề

### File backup không tạo được

```powershell
# Kiểm tra PostgreSQL đang chạy
# Windows: Services → PostgreSQL

# Kiểm tra database name đúng chưa
psql -U postgres -l

# Thử backup với format khác
pg_dump -U postgres -d HR_Management_System -F c -f backup.dump
```

### Không copy được file lên server

- Kiểm tra kết nối SSH: `ssh user@server-ip`
- Kiểm tra thư mục tồn tại: `ls -la /var/www/hr-management-system/`
- Dùng FileZilla/WinSCP thay vì SCP

### Database restore bị lỗi

- Kiểm tra file backup: `head backup_hr_management.sql`
- Kiểm tra encoding: File phải là UTF-8
- Restore từng phần nếu cần

---

## ✅ Xong!

Sau khi hoàn tất, bạn sẽ có:
- ✅ Database trên server với **toàn bộ nhân viên** từ local
- ✅ App chạy trên server, giữ nguyên dữ liệu
- ✅ Database local vẫn hoạt động để tiếp tục develop

**Chúc bạn migrate thành công!** 🎉

