# 🧪 Test Import Ứng viên trên Local

## 📋 Chuẩn bị

1. **Đảm bảo PostgreSQL đang chạy** trên máy local
2. **Database đã được tạo** (thường là `HR_Management_System`)
3. **Bảng `candidates` đã tồn tại** (tự động tạo khi backend chạy lần đầu)

## 🚀 Cách 1: Sử dụng Script (Nhanh nhất)

### Windows:
```powershell
cd D:\Web-App-HR-Demo\scripts
.\import-candidates-local.bat
```

### Linux/Mac:
```bash
cd /path/to/Web-App-HR-Demo/scripts
chmod +x import-candidates-local.sh
./import-candidates-local.sh
```

## 🔧 Cách 2: Sử dụng psql trực tiếp (Với UTF-8 encoding)

### Windows (PowerShell):
```powershell
cd D:\Web-App-HR-Demo

# Đặt encoding UTF-8 cho psql
$env:PGCLIENTENCODING='UTF8'

# Chạy file SQL UTF-8 (khuyến nghị)
psql -U postgres -d HR_Management_System -f scripts\import-candidates-utf8.sql

# Hoặc file SQL gốc (nếu đã chuyển sang UTF-8)
psql -U postgres -d HR_Management_System -f scripts\import-candidates.sql
```

**⚠️ Lưu ý về Encoding:**
- Nếu gặp lỗi encoding, xem file `scripts/FIX_ENCODING_AND_IMPORT.md`
- File `import-candidates-utf8.sql` đã được tạo sẵn với encoding đúng

### Linux/Mac:
```bash
cd /path/to/Web-App-HR-Demo
psql -U postgres -d HR_Management_System -f scripts/import-candidates.sql
```

## 🔧 Cách 3: Sử dụng pgAdmin

1. Mở **pgAdmin**
2. Kết nối với database local
3. Right-click vào database `HR_Management_System` → **Query Tool**
4. Mở file `scripts/import-candidates.sql`
5. Nhấn **F5** hoặc click **Execute**

## ✅ Kiểm tra kết quả

### Query 1: Đếm số ứng viên đã import
```sql
SELECT COUNT(*) as total_imported 
FROM candidates 
WHERE created_at >= CURRENT_DATE;
```

### Query 2: Xem danh sách ứng viên mới
```sql
SELECT 
    id,
    ho_ten,
    vi_tri_ung_tuyen,
    phong_ban,
    so_dien_thoai,
    status,
    created_at
FROM candidates 
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC
LIMIT 20;
```

### Query 3: Kiểm tra các trường NULL (cần HR cập nhật)
```sql
SELECT 
    ho_ten,
    so_dien_thoai,
    CASE WHEN ngay_sinh IS NULL THEN '✓ Thiếu' ELSE 'Đã có' END as ngay_sinh,
    CASE WHEN cccd IS NULL THEN '✓ Thiếu' ELSE 'Đã có' END as cccd,
    CASE WHEN ngay_gui_cv IS NULL THEN '✓ Thiếu' ELSE 'Đã có' END as ngay_gui_cv,
    CASE WHEN cv_file_path IS NULL THEN '✓ Thiếu' ELSE 'Đã có' END as cv_file
FROM candidates 
WHERE created_at >= CURRENT_DATE
ORDER BY ho_ten
LIMIT 20;
```

### Query 4: Thống kê theo vị trí ứng tuyển
```sql
SELECT 
    vi_tri_ung_tuyen,
    COUNT(*) as so_luong
FROM candidates 
WHERE created_at >= CURRENT_DATE
GROUP BY vi_tri_ung_tuyen
ORDER BY so_luong DESC;
```

### Query 5: Thống kê theo phòng ban
```sql
SELECT 
    COALESCE(phong_ban, 'Chưa xác định') as phong_ban,
    COUNT(*) as so_luong
FROM candidates 
WHERE created_at >= CURRENT_DATE
GROUP BY phong_ban
ORDER BY so_luong DESC;
```

## 🔍 Kiểm tra trên Frontend

1. **Khởi động backend và frontend** (nếu chưa chạy):
   ```bash
   # Terminal 1: Backend
   cd backend
   npm start

   # Terminal 2: Frontend  
   cd frontend
   npm start
   ```

2. **Đăng nhập vào ứng dụng** với tài khoản HR

3. **Vào module "Quản lý Ứng viên"**

4. **Kiểm tra:**
   - Danh sách ứng viên đã hiển thị
   - Có thể tìm kiếm theo tên/số điện thoại
   - Có thể click vào ứng viên để xem chi tiết
   - Có thể chỉnh sửa thông tin ứng viên

## 🧹 Xóa dữ liệu test (Nếu cần)

⚠️ **Cẩn thận**: Chỉ chạy lệnh này nếu muốn xóa dữ liệu test

```sql
-- Xóa các ứng viên được import hôm nay
DELETE FROM candidates 
WHERE created_at >= CURRENT_DATE;

-- Hoặc xóa theo điều kiện cụ thể
DELETE FROM candidates 
WHERE ho_ten IN ('Hà Duy Tuấn', 'Võ Thiện Nhựt', 'pham van viet');
```

## ❌ Xử lý lỗi

### Lỗi: "database does not exist"
```bash
# Tạo database nếu chưa có
createdb -U postgres HR_Management_System
```

### Lỗi: "relation candidates does not exist"
```bash
# Bảng chưa được tạo, chạy backend một lần để tự động tạo
cd backend
npm start
# Sau đó stop và chạy lại import
```

### Lỗi: "password authentication failed"
```bash
# Sử dụng user khác hoặc nhập password
psql -U postgres -d HR_Management_System -W
# Hoặc kiểm tra file .env trong backend/
```

### Lỗi: "permission denied"
```bash
# Đảm bảo user có quyền INSERT
# Hoặc sử dụng user postgres (superuser)
psql -U postgres -d HR_Management_System
```

## ✅ Checklist trước khi import lên server

Sau khi test thành công trên local:

- [ ] Đã kiểm tra số lượng ứng viên import đúng (109 ứng viên)
- [ ] Đã kiểm tra dữ liệu hiển thị đúng trên frontend
- [ ] Đã kiểm tra có thể chỉnh sửa ứng viên
- [ ] Đã kiểm tra không có lỗi duplicate
- [ ] Đã backup database trên server (nếu cần)

