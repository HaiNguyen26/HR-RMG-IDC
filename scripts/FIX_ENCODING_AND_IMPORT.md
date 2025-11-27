# 🔧 Sửa Lỗi Encoding và Import Ứng viên

## ❌ Vấn đề gặp phải

1. **Lỗi encoding**: File SQL có encoding WIN1252 nhưng PostgreSQL cần UTF-8
2. **Lỗi kết nối**: Script Node.js cần cấu hình database

## ✅ Giải pháp: Sử dụng psql với encoding UTF-8

### Cách 1: Sử dụng file SQL UTF-8 (Khuyến nghị)

File `import-candidates-utf8.sql` đã được tạo với encoding UTF-8 và escape ký tự đặc biệt.

**Chạy lệnh sau:**

```powershell
# Đặt encoding UTF-8 cho psql
$env:PGCLIENTENCODING='UTF8'

# Chạy file SQL
psql -U postgres -d HR_Management_System -f scripts\import-candidates-utf8.sql
```

### Cách 2: Sử dụng file SQL gốc với client encoding

```powershell
# Đặt encoding UTF-8
$env:PGCLIENTENCODING='UTF8'

# Chạy file SQL gốc
psql -U postgres -d HR_Management_System -f scripts\import-candidates.sql
```

### Cách 3: Sử dụng pgAdmin (Không cần lo encoding)

1. Mở **pgAdmin**
2. Kết nối với database local
3. Right-click database → **Query Tool**
4. Mở file `scripts/import-candidates-utf8.sql`
5. **File → Encoding → UTF-8** (nếu có)
6. Nhấn **F5** để chạy

### Cách 4: Chuyển file sang UTF-8 trước

Nếu vẫn lỗi, chuyển file sang UTF-8:

**Sử dụng PowerShell:**
```powershell
# Đọc file với encoding hiện tại và lưu lại với UTF-8
$content = Get-Content scripts\import-candidates.sql -Encoding Default
$content | Out-File scripts\import-candidates-utf8.sql -Encoding UTF8

# Sau đó chạy file mới
$env:PGCLIENTENCODING='UTF8'
psql -U postgres -d HR_Management_System -f scripts\import-candidates-utf8.sql
```

**Hoặc sử dụng Notepad++:**
1. Mở file `scripts/import-candidates.sql` trong Notepad++
2. **Encoding → Convert to UTF-8**
3. Lưu file
4. Chạy lại với psql

## 🔍 Kiểm tra Encoding của file

**PowerShell:**
```powershell
# Kiểm tra encoding file
[System.IO.File]::ReadAllText("scripts\import-candidates.sql").Encoding
```

## ✅ Test nhanh

Sau khi import, kiểm tra:

```sql
-- Xem số lượng đã import
SELECT COUNT(*) as total_imported 
FROM candidates 
WHERE created_at >= CURRENT_DATE;

-- Xem vài ứng viên mới
SELECT ho_ten, vi_tri_ung_tuyen, phong_ban, so_dien_thoai 
FROM candidates 
WHERE created_at >= CURRENT_DATE 
LIMIT 10;
```

## 📝 Lưu ý

- File `import-candidates-utf8.sql` đã được escape ký tự đặc biệt bằng Unicode escape sequences (`\uXXXX`)
- Nếu vẫn gặp lỗi, có thể copy từng phần nhỏ của file và chạy thử
- Hoặc sử dụng pgAdmin để import vì nó tự động xử lý encoding

## 🎯 Kết quả mong đợi

Sau khi import thành công:
- 109 ứng viên được thêm vào database
- Các trường: Họ tên, Vị trí, Phòng ban, Số điện thoại đã được điền
- Các trường khác (ngày sinh, CCCD...) để NULL - HR sẽ cập nhật sau
- Status mặc định: `PENDING_INTERVIEW`

