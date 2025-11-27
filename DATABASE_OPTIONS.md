# 🗄️ Lựa chọn Database khi Deploy

## 📋 2 Trường hợp khác nhau

Khi deploy lên server, bạn có **2 lựa chọn** về database:

---

## 🆕 Trường hợp 1: Tạo Database MỚI (Trống)

### Khi nào dùng?

- ✅ **Lần đầu deploy** và chưa có dữ liệu
- ✅ **Test/Development** trên server mới
- ✅ **Không cần giữ dữ liệu** từ local

### Đặc điểm:

- 🔹 Database **hoàn toàn trống**
- 🔹 Chỉ có **schema** (cấu trúc bảng)
- 🔹 **Không có dữ liệu** nhân viên, ứng viên, etc.
- 🔹 Phải **nhập dữ liệu lại từ đầu**

### Quy trình:

1. Tạo database mới trên server
2. Import schema từ `database/database_schema_postgresql.sql`
3. Tạo user và cấp quyền
4. Dữ liệu sẽ được thêm vào sau khi sử dụng hệ thống

**Xem chi tiết:** `DEPLOY.md` - Bước 4 (Tùy chọn A)

---

## 📦 Trường hợp 2: Migrate Database từ Local (Có dữ liệu)

### Khi nào dùng?

- ✅ **Đã có database với dữ liệu** trên máy local
- ✅ **Cần giữ nguyên** tất cả dữ liệu nhân viên, ứng viên
- ✅ **Chuyển từ local lên production server**

### Đặc điểm:

- 🔹 Database có **đầy đủ dữ liệu**
- 🔹 Giữ nguyên **tất cả bản ghi** (employees, candidates, users, etc.)
- 🔹 **Không mất dữ liệu** khi deploy
- 🔹 Sẵn sàng sử dụng ngay

### Quy trình:

1. Backup database từ local: `pg_dump`
2. Upload file backup lên server
3. Tạo database mới trên server
4. Restore database từ backup file
5. Cấp quyền cho user

**Xem chi tiết:** `MIGRATE_DATABASE.md`

---

## ⚖️ So sánh 2 Trường hợp

| Tiêu chí | Database Mới (Trống) | Migrate từ Local (Có dữ liệu) |
|----------|---------------------|-------------------------------|
| **Dữ liệu** | Không có | Đầy đủ |
| **Nhân viên** | Phải thêm lại | Giữ nguyên |
| **Ứng viên** | Phải thêm lại | Giữ nguyên |
| **Tốc độ** | Nhanh | Chậm hơn (tùy size) |
| **Rủi ro** | Thấp | Cần cẩn thận khi restore |
| **Khi nào** | Test, Dev | Production |

---

## 🎯 Quyết định nhanh

### Chọn Database Mới nếu:

- ❓ Bạn chỉ muốn test hệ thống
- ❓ Chưa có dữ liệu quan trọng
- ❓ Sẵn sàng nhập dữ liệu lại

### Chọn Migrate Database nếu:

- ❓ Đã có dữ liệu nhân viên quan trọng
- ❓ Đã sử dụng hệ thống ở local
- ❓ Không muốn mất dữ liệu

---

## 📝 Ví dụ Cụ thể

### Ví dụ 1: Database Mới

**Tình huống:** 
- Bạn vừa phát triển xong hệ thống
- Chưa có dữ liệu thật
- Muốn deploy để HR team bắt đầu sử dụng

**Chọn:** Database Mới
- Tạo database trống
- Import schema
- HR team sẽ thêm dữ liệu khi sử dụng

---

### Ví dụ 2: Migrate Database

**Tình huống:**
- Bạn đã test hệ thống ở local
- Đã có 100+ nhân viên được thêm vào
- Muốn chuyển lên server production
- Không muốn mất dữ liệu

**Chọn:** Migrate Database
- Backup từ local
- Upload và restore trên server
- Giữ nguyên toàn bộ 100+ nhân viên

---

## 🔄 Sau khi Deploy

**Cả 2 trường hợp đều giống nhau:**
- ✅ Cấu hình .env
- ✅ Build và deploy ứng dụng
- ✅ Cập nhật code sau này (dùng `UPDATE.md`)

**Khác biệt duy nhất:** Dữ liệu ban đầu trong database

---

## 📚 Tài liệu liên quan

- **Deploy với Database Mới:** `DEPLOY.md` - Bước 4 (Tùy chọn A)
- **Migrate Database từ Local:** `MIGRATE_DATABASE.md`
- **Cập nhật sau này:** `UPDATE.md`

---

## ✅ Tóm tắt

| | Database Mới | Migrate Database |
|---|---|---|
| **Có dữ liệu?** | ❌ Không | ✅ Có |
| **File cần** | `database_schema_postgresql.sql` | `backup_hr_management.sql` |
| **Thời gian** | Nhanh (vài giây) | Chậm hơn (tùy size DB) |
| **Rủi ro** | Thấp | Trung bình (cần backup) |
| **Sử dụng** | Test, Development | Production |

---

**Chọn phương án phù hợp với nhu cầu của bạn!** 🎯

