# 🗄️ Tùy chọn Database khi Deploy

## Câu hỏi thường gặp

**Q: Hướng dẫn deploy đang dùng database mới hay database hiện có?**  
**A: Hướng dẫn hiện tại đang hướng dẫn tạo DATABASE MỚI.** 

Nhưng bạn có thể chọn một trong 2 tùy chọn:

---

## 📊 Tùy chọn 1: Tạo Database MỚI (Mặc định)

### Khi nào dùng:
- ✅ Deploy lên server mới
- ✅ Bắt đầu từ đầu
- ✅ Môi trường production mới
- ✅ Không có dữ liệu cũ cần giữ

### Hướng dẫn hiện tại:
- Tạo database mới: `HR_Management_System`
- Tạo user mới: `hr_user`
- Import schema mới
- Database trống, không có dữ liệu

### File hướng dẫn:
- `DEPLOY_NOW.md` - Bước 2
- `docs/DEPLOYMENT_STEP_BY_STEP.md` - Bước 6

---

## 🔄 Tùy chọn 2: Dùng Database ĐÃ CÓ

### Khi nào dùng:
- ✅ Đã có database trên server
- ✅ Muốn giữ dữ liệu cũ
- ✅ Migrate từ server cũ sang server mới
- ✅ Khôi phục từ backup

### Các trường hợp:

#### Trường hợp A: Database trên cùng server

Nếu database đã tồn tại trên server:

```bash
# 1. Kiểm tra database có tồn tại không
psql -U postgres -c "\l" | grep HR_Management_System

# 2. Nếu có rồi, bỏ qua bước tạo database
# 3. Chỉ cần cập nhật .env file với thông tin database hiện có
```

**Cấu hình `.env` (backend/.env):**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=HR_Management_System  # Tên database hiện có
DB_USER=hr_user               # User hiện có
DB_PASSWORD=password_hien_co  # Password hiện có
```

#### Trường hợp B: Database trên server khác (Remote)

Nếu database ở server khác:

**Cấu hình `.env` (backend/.env):**
```env
DB_HOST=123.456.789.0        # IP server database
DB_PORT=5432
DB_NAME=HR_Management_System
DB_USER=hr_user
DB_PASSWORD=password_hien_co
```

**Cần cấu hình PostgreSQL để cho phép remote connection:**
1. Sửa `postgresql.conf`: `listen_addresses = '*'`
2. Sửa `pg_hba.conf`: Thêm rule cho phép kết nối từ IP server app

#### Trường hợp C: Restore từ Backup

Nếu muốn restore từ backup:

```bash
# 1. Tạo database mới (hoặc xóa database cũ nếu cần)
sudo -u postgres psql
DROP DATABASE IF EXISTS "HR_Management_System";
CREATE DATABASE "HR_Management_System";
\q

# 2. Restore từ backup
psql -U hr_user -d HR_Management_System < /path/to/backup_file.sql
```

---

## 📋 So sánh 2 Tùy chọn

| Tiêu chí | Database MỚI | Database ĐÃ CÓ |
|----------|--------------|----------------|
| **Dữ liệu** | Trống, bắt đầu từ đầu | Giữ nguyên dữ liệu cũ |
| **User** | Tạo user mới | Dùng user hiện có |
| **Schema** | Import schema mới | Đã có schema (hoặc migrate) |
| **Phù hợp** | Deploy mới, test | Production, migrate |
| **Bước bỏ qua** | Không có | Bỏ qua tạo database/user |

---

## 🎯 Hướng dẫn nhanh: Dùng Database ĐÃ CÓ

### Bước 1: Kiểm tra Database

```bash
# Kiểm tra database có tồn tại
psql -U postgres -c "\l" | grep HR_Management_System

# Kiểm tra user có tồn tại
psql -U postgres -c "\du" | grep hr_user
```

### Bước 2: Bỏ qua Bước tạo Database

Trong hướng dẫn `DEPLOY_NOW.md`, **BƯỚC 2** (Tạo Database), bạn có thể:
- ✅ Bỏ qua nếu database đã tồn tại
- ✅ Hoặc chỉ tạo user mới nếu chưa có user

### Bước 3: Cấu hình .env với thông tin Database hiện có

**File `backend/.env`:**
```env
DB_HOST=localhost              # hoặc IP server database
DB_PORT=5432
DB_NAME=HR_Management_System   # Tên database hiện có
DB_USER=hr_user                # User hiện có
DB_PASSWORD=password_hien_co   # Password hiện có
```

### Bước 4: Bỏ qua Import Schema (nếu đã có)

**BƯỚC 5** trong `DEPLOY_NOW.md` (Import Database Schema):
- ✅ Bỏ qua nếu schema đã có
- ✅ Hoặc chỉ chạy các migration mới nếu có

---

## 🔍 Làm sao biết nên dùng cách nào?

### Hỏi bản thân:

1. **Database đã tồn tại trên server chưa?**
   - ✅ Có → Dùng Database ĐÃ CÓ
   - ❌ Chưa → Tạo Database MỚI

2. **Có dữ liệu quan trọng cần giữ không?**
   - ✅ Có → Dùng Database ĐÃ CÓ hoặc Restore từ backup
   - ❌ Không → Tạo Database MỚI

3. **Đây là lần đầu deploy lên server này?**
   - ✅ Đúng → Tạo Database MỚI
   - ❌ Không → Có thể dùng Database ĐÃ CÓ

---

## ✅ Checklist cho Database ĐÃ CÓ

- [ ] Database đã tồn tại
- [ ] User đã có quyền truy cập database
- [ ] Schema đã được tạo (hoặc sẽ import)
- [ ] Đã cấu hình `.env` với thông tin database đúng
- [ ] Đã test kết nối database: `psql -U hr_user -d HR_Management_System`
- [ ] Đã backup database trước khi deploy (an toàn)

---

## 🆘 Cần hỗ trợ?

Nếu bạn:
- ✅ Muốn dùng database đã có → Làm theo **Tùy chọn 2**
- ✅ Muốn tạo database mới → Làm theo hướng dẫn **DEPLOY_NOW.md** (Bước 2)
- ✅ Không chắc → Hãy hỏi để được tư vấn cụ thể

---

## 📝 Tóm tắt

**Hướng dẫn hiện tại (`DEPLOY_NOW.md`) đang hướng dẫn tạo DATABASE MỚI.**

**Nhưng bạn có thể:**
1. ✅ Bỏ qua bước tạo database nếu đã có
2. ✅ Cấu hình `.env` với thông tin database hiện có
3. ✅ Bỏ qua import schema nếu đã có schema

**Kết quả:** App sẽ kết nối với database hiện có thay vì tạo mới.

