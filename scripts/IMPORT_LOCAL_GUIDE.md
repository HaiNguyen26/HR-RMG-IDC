# 📝 Hướng dẫn Import Ứng viên trên Local

## 🎯 Mục tiêu

Import 109 ứng viên vào database local với các trường:
- ✅ Họ tên
- ✅ Vị trí ứng tuyển  
- ✅ Phòng ban
- ✅ Số điện thoại
- ⚪ Các trường khác để trống (HR sẽ cập nhật sau)

## 🚀 Cách 1: Sử dụng pgAdmin (Khuyến nghị - Dễ nhất, không cần code)

1. Mở **pgAdmin** (hoặc pgAdmin 4)
2. Kết nối với PostgreSQL local
3. Right-click vào database `HR_Management_System` → **Query Tool**
4. Mở file `scripts/import-candidates-utf8.sql` trong Notepad/editor
5. Copy toàn bộ nội dung và paste vào Query Tool
6. Nhấn **F5** hoặc click **Execute** ▶️

**Done!** ✅ Không cần cấu hình gì thêm.

---

## 🚀 Cách 2: Sử dụng Script Node.js (Nếu có file .env)

### Bước 1: Đảm bảo có file `.env` trong thư mục `backend/`

File `backend/.env` cần có:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=HR_Management_System
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### Bước 2: Chạy script

```powershell
cd D:\Web-App-HR-Demo
node scripts/import-local-simple.js
```

### Kết quả mong đợi:
```
🔌 Đang kết nối database...
✅ Kết nối thành công!

📋 Bắt đầu import 109 ứng viên...

  [10/109] Đã import: 10 ứng viên...
  [20/109] Đã import: 20 ứng viên...
  ...

==================================================
📊 KẾT QUẢ IMPORT
==================================================
Tổng số:      109
✓ Thành công: 109
⊘ Đã tồn tại: 0
✗ Lỗi:        0

Tổng số ứng viên trong database: 109
==================================================
```

## 🔧 Cách 3: Sử dụng psql với UTF-8

```powershell
# Đặt encoding UTF-8
$env:PGCLIENTENCODING='UTF8'

# Chạy file SQL
psql -U postgres -d HR_Management_System -f scripts\import-candidates-utf8.sql
```

## ✅ Kiểm tra kết quả

### Trong psql/pgAdmin:
```sql
-- Đếm số ứng viên đã import
SELECT COUNT(*) as total_imported 
FROM candidates 
WHERE created_at >= CURRENT_DATE;

-- Xem danh sách
SELECT ho_ten, vi_tri_ung_tuyen, phong_ban, so_dien_thoai 
FROM candidates 
WHERE created_at >= CURRENT_DATE 
LIMIT 10;
```

### Trên Frontend:
1. Chạy backend: `cd backend && npm start`
2. Chạy frontend: `cd frontend && npm start`
3. Đăng nhập và vào **"Quản lý Ứng viên"**
4. Kiểm tra danh sách ứng viên

## ❌ Xử lý lỗi

### Lỗi: "Cannot find module 'pg'"
```powershell
cd backend
npm install pg
```

### Lỗi: "password authentication failed"
- Kiểm tra file `backend/.env` có đúng password không
- Hoặc sử dụng pgAdmin nếu không nhớ password

### Lỗi: "database does not exist"
```sql
-- Tạo database nếu chưa có
CREATE DATABASE "HR_Management_System";
```

### Lỗi: "relation candidates does not exist"
- Chạy backend một lần để tự động tạo bảng:
  ```powershell
  cd backend
  npm start
  ```
- Sau đó stop và chạy lại script import

## 🎯 File nào sử dụng?

| File | Mô tả | Khi nào dùng |
|------|-------|--------------|
| `import-candidates-utf8.sql` | File SQL UTF-8 | ⭐ **Khuyến nghị** - Dùng với pgAdmin, dễ nhất |
| `import-local-simple.js` | Script Node.js | Dùng nếu có file .env |
| `import-candidates-utf8.sql` | File SQL với encoding UTF-8 | Dùng với pgAdmin hoặc psql |
| `import-candidates.sql` | File SQL gốc | Cần set encoding UTF-8 trước khi chạy |

## 📝 Lưu ý

- Script tự động **bỏ qua ứng viên trùng lặp** (dựa trên số điện thoại)
- Nếu chạy lại, các ứng viên đã tồn tại sẽ được bỏ qua
- Tất cả ứng viên sẽ có status `PENDING_INTERVIEW`
- Các trường như ngày sinh, CCCD... để NULL - HR sẽ cập nhật sau

## 🎉 Sau khi import thành công

Bạn có thể:
- ✅ Xem danh sách ứng viên trong app
- ✅ Tìm kiếm ứng viên theo tên/số điện thoại
- ✅ Chỉnh sửa thông tin ứng viên (tính năng đã thêm)
- ✅ Bổ sung các thông tin còn thiếu

