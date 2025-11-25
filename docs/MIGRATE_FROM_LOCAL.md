# 🔄 Migrate từ Local lên Server

## Tình huống của bạn

- ✅ **Máy local:** Đã có database và dự án đang chạy
- ✅ **Server:** Trống, chưa có gì
- ✅ **Mục tiêu:** Deploy lên server và tiếp tục phát triển

## ❓ Câu hỏi: Nên dùng database mới hay migrate database từ local?

### Câu trả lời: **Phụ thuộc vào dữ liệu của bạn**

---

## 📊 Tùy chọn 1: Migrate Database từ Local (Khuyến nghị nếu có dữ liệu)

### Khi nào nên chọn:
- ✅ Database local có **dữ liệu quan trọng** (nhân viên, ứng viên, yêu cầu, etc.)
- ✅ Muốn **giữ nguyên dữ liệu** khi chuyển lên server
- ✅ Database local đã được test và hoạt động tốt
- ✅ Không muốn nhập lại dữ liệu

### Lợi ích:
- ✅ Giữ nguyên tất cả dữ liệu
- ✅ Không mất thời gian nhập lại
- ✅ Liên tục trong quá trình phát triển

### Nhược điểm:
- ⚠️ Phải backup và restore database
- ⚠️ Mất thời gian migrate (10-30 phút tùy size)

---

## 🆕 Tùy chọn 2: Tạo Database MỚI trên Server

### Khi nào nên chọn:
- ✅ Database local chỉ là **dữ liệu test/demo**
- ✅ Không có dữ liệu quan trọng cần giữ
- ✅ Muốn **bắt đầu lại từ đầu** trên server
- ✅ Database local đã cũ/lỗi thời

### Lợi ích:
- ✅ Database sạch, không có dữ liệu test
- ✅ Nhanh hơn, không cần migrate
- ✅ Phù hợp cho production mới

### Nhược điểm:
- ⚠️ Mất tất cả dữ liệu trên local
- ⚠️ Phải nhập lại dữ liệu nếu cần

---

## 🎯 Khuyến nghị

### Nếu database local có dữ liệu quan trọng:
👉 **Chọn Tùy chọn 1: Migrate Database từ Local**

### Nếu database local chỉ là test/demo:
👉 **Chọn Tùy chọn 2: Tạo Database MỚI**

---

## 📋 Hướng dẫn: Migrate Database từ Local lên Server

### Bước 1: Backup Database từ Local

**Trên máy local (Windows), mở PowerShell hoặc CMD:**

```bash
# Backup database
pg_dump -U postgres -d HR_Management_System -F c -f backup_hr_management.dump

# HOẶC backup dạng SQL (dễ restore hơn)
pg_dump -U postgres -d HR_Management_System > backup_hr_management.sql
```

**Nhập password PostgreSQL khi được hỏi**

### Bước 2: Copy Backup File lên Server

**Cách 1: Dùng SCP (từ máy local)**

```bash
# Từ máy local, copy file backup lên server
scp backup_hr_management.sql user@your-server-ip:/var/www/hr-management-system/
```

**Cách 2: Dùng FTP/SFTP Client**
- FileZilla, WinSCP, etc.
- Upload file backup lên server vào `/var/www/hr-management-system/`

**Cách 3: Dùng Cloud Storage**
- Upload lên Google Drive, Dropbox, etc.
- Download lại trên server

### Bước 3: Deploy Code lên Server

Làm theo hướng dẫn `DEPLOY_NOW.md` nhưng:
- ✅ Bước 2: **Vẫn tạo database** (trống) trên server
- ✅ Bước 5: **Bỏ qua import schema** (sẽ restore từ backup)

### Bước 4: Restore Database trên Server

**Trên server:**

```bash
# SSH vào server
ssh user@your-server-ip

# Tạo database trống (nếu chưa tạo)
sudo -u postgres psql
CREATE DATABASE "HR_Management_System" WITH ENCODING = 'UTF8';
CREATE USER hr_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE "HR_Management_System" TO hr_user;
\q

# Restore database từ backup
cd /var/www/hr-management-system

# Nếu backup dạng SQL
psql -U hr_user -d HR_Management_System < backup_hr_management.sql

# HOẶC nếu backup dạng .dump
pg_restore -U hr_user -d HR_Management_System backup_hr_management.dump
```

**Nhập password khi được hỏi**

### Bước 5: Kiểm tra Database đã Restore

```bash
# Kiểm tra tables
psql -U hr_user -d HR_Management_System -c "\dt"

# Kiểm tra dữ liệu (ví dụ: số lượng nhân viên)
psql -U hr_user -d HR_Management_System -c "SELECT COUNT(*) FROM employees;"
```

### Bước 6: Tiếp tục Deploy

Tiếp tục các bước còn lại trong `DEPLOY_NOW.md`:
- Cấu hình `.env`
- Build frontend
- Cấu hình Nginx
- Khởi động với PM2

---

## 📋 Hướng dẫn: Tạo Database MỚI trên Server

Nếu chọn tạo database mới:

### Bước 1: Deploy Code lên Server

Làm theo `DEPLOY_NOW.md` từ đầu đến cuối, bao gồm:
- ✅ Bước 2: Tạo database mới
- ✅ Bước 5: Import schema

### Bước 2: (Tùy chọn) Nhập dữ liệu mẫu

Nếu cần, có thể:
- Import dữ liệu mẫu từ file Excel
- Thêm nhân viên, phòng ban, etc. qua giao diện web

---

## 🔍 Checklist Quyết định

Trả lời các câu hỏi sau:

- [ ] Database local có bao nhiêu nhân viên?
  - Nhiều (>10) → **Migrate**
  - Ít (<10) hoặc 0 → **Database mới**

- [ ] Database local có ứng viên/quy trình tuyển dụng không?
  - Có → **Migrate**
  - Không → **Database mới**

- [ ] Database local có yêu cầu/đơn từ quan trọng không?
  - Có → **Migrate**
  - Không → **Database mới**

- [ ] Đây là môi trường production hay test?
  - Production → **Migrate**
  - Test/Development → **Database mới** (hoặc Migrate nếu có dữ liệu test tốt)

---

## 💡 Khuyến nghị cụ thể

### Tình huống: Database local đang dùng để test/develop

**Nên chọn:** **Tạo Database MỚI trên Server**

**Lý do:**
- Database test thường có dữ liệu không sạch
- Tạo database mới giúp production sạch sẽ
- Có thể giữ database local để tiếp tục develop

### Tình huống: Database local có dữ liệu thật/quan trọng

**Nên chọn:** **Migrate Database từ Local**

**Lý do:**
- Giữ nguyên dữ liệu quan trọng
- Không mất thời gian nhập lại
- Liên tục trong quá trình chuyển đổi

---

## 🎯 Quy trình Khuyến nghị

### Nếu Migrate Database:

1. ✅ **Backup database local** → `backup_hr_management.sql`
2. ✅ **Deploy code lên server** (theo `DEPLOY_NOW.md`)
3. ✅ **Tạo database trống trên server** (Bước 2 trong DEPLOY_NOW.md)
4. ✅ **Copy backup file lên server**
5. ✅ **Restore database trên server**
6. ✅ **Bỏ qua import schema** (đã có trong backup)
7. ✅ **Tiếp tục các bước deploy còn lại**

### Nếu Tạo Database Mới:

1. ✅ **Deploy code lên server** (theo `DEPLOY_NOW.md`)
2. ✅ **Tạo database mới** (Bước 2)
3. ✅ **Import schema** (Bước 5)
4. ✅ **Nhập dữ liệu qua giao diện** (nếu cần)
5. ✅ **Tiếp tục các bước deploy còn lại**

---

## 🆘 Câu hỏi thường gặp

**Q: Nếu migrate, database local vẫn giữ nguyên chứ?**  
A: Có! Backup chỉ là copy, không xóa database local.

**Q: Có thể vừa dùng database local, vừa dùng database server không?**  
A: Có! Database local và server hoàn toàn độc lập. Bạn có thể:
- Develop trên local với database local
- Production trên server với database server

**Q: Làm sao đồng bộ dữ liệu giữa local và server?**  
A: Không tự động. Bạn phải:
- Backup từ nơi này → Restore sang nơi khác
- Hoặc chỉ dùng server cho production, local cho develop

**Q: Nên backup database local thường xuyên không?**  
A: Có! Đặc biệt trước khi deploy hoặc thay đổi lớn.

---

## ✅ Tóm tắt

**Tình huống của bạn:** Server trống, có database và dự án trên local

**Khuyến nghị:**
1. **Nếu database local có dữ liệu quan trọng** → Migrate database từ local
2. **Nếu database local chỉ là test** → Tạo database mới trên server

**Hướng dẫn chi tiết:** Làm theo các bước trong tài liệu này.

