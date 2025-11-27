# 🗑️ Hướng dẫn Xóa Ứng viên

## ⚠️ CẢNH BÁO

Script này sẽ **XÓA TOÀN BỘ** ứng viên trong database. Hành động này **KHÔNG THỂ HOÀN TÁC**!

## 🚀 Cách 1: Sử dụng Script Node.js (An toàn - Có xác nhận)

Script sẽ hỏi xác nhận trước khi xóa:

```powershell
node scripts/delete-all-candidates.js
```

Script sẽ:
- Hiển thị số lượng ứng viên hiện có
- Yêu cầu xác nhận bằng cách gõ "XOA"
- Xóa tất cả ứng viên
- Hiển thị kết quả

## 🔧 Cách 2: Sử dụng pgAdmin

1. Mở **pgAdmin**
2. Kết nối database
3. **Query Tool**
4. Chạy lệnh:
   ```sql
   DELETE FROM candidates;
   ```

## 🔧 Cách 3: Sử dụng psql

```powershell
psql -U postgres -d HR_Management_System -c "DELETE FROM candidates;"
```

## 📝 Lưu ý

### Nếu có lỗi Foreign Key:

Có thể có dữ liệu liên quan trong bảng `interview_requests`. Trong trường hợp này, xóa theo thứ tự:

```sql
-- Xóa interview requests trước
DELETE FROM interview_requests;

-- Sau đó xóa ứng viên
DELETE FROM candidates;
```

### Xóa chỉ các ứng viên được import hôm nay:

Nếu chỉ muốn xóa ứng viên vừa import (không phải tất cả):

```sql
-- Xóa ứng viên được tạo hôm nay
DELETE FROM candidates 
WHERE created_at >= CURRENT_DATE;
```

### Backup trước khi xóa (Khuyến nghị):

```sql
-- Backup trước khi xóa
\copy (SELECT * FROM candidates) TO 'backup_candidates.csv' CSV HEADER;

-- Sau đó mới xóa
DELETE FROM candidates;
```

## ✅ Kiểm tra sau khi xóa

```sql
-- Đếm số ứng viên còn lại
SELECT COUNT(*) FROM candidates;

-- Nếu = 0 thì đã xóa hết
```

