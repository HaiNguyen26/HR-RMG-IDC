# Hướng dẫn Import Danh sách Ứng viên

## 📋 Tổng quan

File `import-candidates.sql` chứa 109 ứng viên từ danh sách bạn cung cấp. Script sẽ:
- Import các trường: **Họ tên**, **Vị trí ứng tuyển**, **Phòng ban**, **Số điện thoại**
- Các trường khác để trống để HR tự cập nhật sau
- Tự động bỏ qua các ứng viên đã tồn tại (dựa trên số điện thoại)

## 🔧 Cách Import

### Cách 1: Sử dụng psql (Khuyến nghị)

```bash
# SSH vào server (nếu import trên server)
ssh root@103.56.161.203

# Chạy SQL file
psql -U hr_user -d HR_Management_System -f scripts/import-candidates.sql
```

### Cách 2: Sử dụng pgAdmin hoặc DBeaver

1. Mở pgAdmin hoặc DBeaver
2. Kết nối với database `HR_Management_System`
3. Mở file `scripts/import-candidates.sql`
4. Chạy toàn bộ script

### Cách 3: Copy & Paste vào psql

```bash
# SSH vào server
ssh root@103.56.161.203

# Kết nối psql
psql -U hr_user -d HR_Management_System

# Copy nội dung file scripts/import-candidates.sql và paste vào psql
```

## 📊 Mapping dữ liệu

### Vị trí ứng tuyển:
- `Kỹ sư Thiết kế cơ` → `KHAOSAT_THIETKE`
- `PLC` → `DIEN_LAPTRINH_PLC`
- `Kỹ sư điện - PLC` → `DIEN_LAPTRINH_PLC`
- `KTV vận hành CNC` → `VANHANH_MAY_CNC`
- `TTS mua hàng` / `Mua hàng` → `MUAHANG`

### Phòng ban:
- `Thiết kế` → `KHAOSAT_THIETKE`
- `Kỹ thuật` → `DICHVU_KYTHUAT`
- `Tự động` → `TUDONG`
- `CNC` → `CNC`

## ✅ Kiểm tra kết quả

Sau khi import, chạy query sau để kiểm tra:

```sql
-- Xem tổng số ứng viên đã import
SELECT COUNT(*) as total_candidates FROM candidates;

-- Xem các ứng viên mới được import (trong ngày)
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
ORDER BY created_at DESC;
```

## 🔄 Nếu cần import lại

Script đã được thiết kế để **không tạo trùng lặp**. Nếu chạy lại, các ứng viên có số điện thoại đã tồn tại sẽ được bỏ qua.

Nếu muốn xóa và import lại từ đầu (⚠️ Cẩn thận):

```sql
-- Xóa tất cả ứng viên được import hôm nay (nếu cần)
DELETE FROM candidates WHERE created_at >= CURRENT_DATE;

-- Sau đó chạy lại script import-candidates.sql
```

## 📝 Lưu ý

1. **Số điện thoại là duy nhất**: Script sử dụng số điện thoại để kiểm tra trùng lặp
2. **Status mặc định**: Tất cả ứng viên sẽ có status `PENDING_INTERVIEW`
3. **Trường trống**: Các trường như `ngay_sinh`, `cccd`, `ngay_gui_cv` sẽ để NULL - HR sẽ tự cập nhật sau
4. **Không có CV**: File CV để trống, HR có thể upload sau

## 🆘 Xử lý lỗi

Nếu gặp lỗi:

1. **Lỗi quyền truy cập**: Đảm bảo user `hr_user` có quyền INSERT vào bảng `candidates`
2. **Lỗi constraint**: Kiểm tra các giá trị `vi_tri_ung_tuyen` và `phong_ban` có đúng format không
3. **Lỗi encoding**: Đảm bảo database sử dụng encoding UTF-8

