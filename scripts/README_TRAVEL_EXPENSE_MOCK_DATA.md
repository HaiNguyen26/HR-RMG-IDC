# Hướng Dẫn Chèn Mock Data - Quản Lý Kinh Phí Công Tác

## Mô Tả

Script này tạo **10 yêu cầu công tác mẫu** để test tính năng quản lý kinh phí công tác, bao gồm:

- **5 yêu cầu trong nước (DOMESTIC)**:
  1. Hà Nội - Chờ duyệt cấp 1
  2. Đà Nẵng - Đã duyệt cấp 1, chờ duyệt cấp 2
  3. TP.HCM - Đã duyệt hoàn toàn
  4. Hải Phòng - Đã từ chối
  5. Cần Thơ - Chờ duyệt cấp 1

- **5 yêu cầu ngoài nước (INTERNATIONAL)**:
  6. Singapore - Chờ duyệt cấp 1
  7. Tokyo, Nhật Bản - Đã duyệt cấp 1, chờ duyệt CEO
  8. Bangkok, Thái Lan - Đã duyệt hoàn toàn
  9. Seoul, Hàn Quốc - Đã từ chối bởi CEO
  10. Kuala Lumpur, Malaysia - Chờ duyệt cấp 1

## Yêu Cầu

- Database PostgreSQL đã được setup
- Bảng `employees` đã có ít nhất 5 nhân viên với `trang_thai = 'ACTIVE'` hoặc `trang_thai IS NULL`
- Bảng `travel_expense_requests` đã được tạo (script sẽ tự động tạo nếu chưa có)

## Cách Chạy

### Cách 1: Sử dụng Node.js (Khuyến nghị - Tránh vấn đề mật khẩu)

Script này sử dụng cấu hình database từ file `.env` của backend, không cần nhập mật khẩu thủ công.

**Yêu cầu**: Đảm bảo đã cài đặt dependencies trong thư mục `backend`:
```bash
cd backend
npm install
```

**Chạy script** (chọn một trong hai cách):

**Option A: Chạy từ thư mục backend (Đơn giản nhất)**
```bash
cd backend
node scripts/run-travel-expense-mock-data.js
```

**Option B: Chạy từ thư mục gốc**
```bash
# Từ thư mục gốc của project
node scripts/run-travel-expense-mock-data.js
```

**Lưu ý**: 
- Đảm bảo file `backend/.env` đã được cấu hình đúng với thông tin database của bạn
- Nếu gặp lỗi "Cannot find module 'pg'", hãy chạy từ thư mục backend (Option A)

### Cách 2: Sử dụng psql command line

**Lưu ý**: Kiểm tra user trong file `backend/.env` (thường là `postgres` hoặc `hr_user`)

**Option A: Sử dụng biến môi trường PGPASSWORD**

⚠️ **QUAN TRỌNG**: Phải chạy từ thư mục gốc của project (D:\Web-App-HR-Demo)

```bash
# Windows PowerShell
# Bước 1: Chuyển đến thư mục project
cd D:\Web-App-HR-Demo

# Bước 2: Set password và chạy script
$env:PGPASSWORD="Hainguyen261097"
psql -U postgres -d HR_Management_System -f scripts/insert-travel-expense-mock-data.sql

# Windows PowerShell (nếu dùng hr_user)
$env:PGPASSWORD="your_password"
psql -U hr_user -d HR_Management_System -f scripts/insert-travel-expense-mock-data.sql

# Windows CMD
# Bước 1: Chuyển đến thư mục project
cd D:\Web-App-HR-Demo

# Bước 2: Set password và chạy script
set PGPASSWORD=Hainguyen261097
psql -U postgres -d HR_Management_System -f scripts/insert-travel-expense-mock-data.sql

# Linux/Mac
# Bước 1: Chuyển đến thư mục project
cd /path/to/Web-App-HR-Demo

# Bước 2: Set password và chạy script
export PGPASSWORD="Hainguyen261097"
psql -U postgres -d HR_Management_System -f scripts/insert-travel-expense-mock-data.sql

# Hoặc dùng đường dẫn tuyệt đối (không cần cd)
export PGPASSWORD="Hainguyen261097"
psql -U postgres -d HR_Management_System -f D:\Web-App-HR-Demo\scripts\insert-travel-expense-mock-data.sql
```

**Option B: Tạo file `.pgpass` (Linux/Mac/Windows với WSL)**
1. Tạo file `~/.pgpass` (hoặc `%APPDATA%\postgresql\pgpass.conf` trên Windows)
2. Thêm dòng: `localhost:5432:HR_Management_System:hr_user:your_password`
3. Set quyền: `chmod 600 ~/.pgpass`
4. Chạy: `psql -U hr_user -d HR_Management_System -f scripts/insert-travel-expense-mock-data.sql`

### Cách 3: Sử dụng pgAdmin hoặc DBeaver

1. Mở pgAdmin hoặc DBeaver
2. Kết nối đến database `HR_Management_System`
3. Mở file `scripts/insert-travel-expense-mock-data.sql`
4. Chạy toàn bộ script

## Kiểm Tra Kết Quả

Sau khi chạy script, bạn có thể kiểm tra:

1. **Xem danh sách yêu cầu**:
   ```sql
   SELECT * FROM travel_expense_requests 
   WHERE title LIKE '%[MOCK]%' 
   ORDER BY created_at DESC;
   ```

2. **Thống kê theo loại và trạng thái**:
   ```sql
   SELECT 
       location_type,
       status,
       COUNT(*) as count,
       SUM(estimated_cost) as total_cost
   FROM travel_expense_requests
   WHERE title LIKE '%[MOCK]%'
   GROUP BY location_type, status
   ORDER BY location_type, status;
   ```

3. **Xem trong ứng dụng**:
   - Mở module "Phê duyệt công tác" để xem các yêu cầu chờ duyệt
   - Mở module "Quản lý công tác" để xem tất cả yêu cầu

## Xóa Mock Data (Nếu Cần)

Nếu muốn xóa tất cả mock data:

```sql
DELETE FROM travel_expense_requests WHERE title LIKE '%[MOCK]%';
```

## Lưu Ý

- Script sử dụng `OFFSET` để lấy các nhân viên khác nhau. Nếu database có ít hơn 5 nhân viên, một số yêu cầu có thể bị lỗi.
- Tất cả mock data có tiêu đề bắt đầu bằng `[MOCK]` để dễ nhận biết.
- Thời gian được set là tương lai (từ 5-55 ngày) để phù hợp với test.
- Chi phí ước tính được set theo mức hợp lý (trong nước: 2-6 triệu, ngoài nước: 18-35 triệu).

## Các Trạng Thái Được Test

- `PENDING_LEVEL_1`: Chờ duyệt quản lý trực tiếp
- `PENDING_LEVEL_2`: Chờ duyệt CEO (nước ngoài) hoặc Kế toán (trong nước)
- `APPROVED`: Đã duyệt hoàn toàn
- `REJECTED`: Đã từ chối

## Troubleshooting

**Lỗi: "relation employees does not exist"**
- Đảm bảo bảng `employees` đã được tạo và có dữ liệu

**Lỗi: "violates foreign key constraint"**
- Đảm bảo có ít nhất 5 nhân viên trong bảng `employees`

**Lỗi: "duplicate key value"**
- Nếu đã chạy script trước đó, xóa mock data cũ trước khi chạy lại:
  ```sql
  DELETE FROM travel_expense_requests WHERE title LIKE '%[MOCK]%';
  ```

