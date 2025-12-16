# Hướng dẫn sử dụng Mock Data cho Travel Expense

## Tổng quan

Có 2 script SQL để tạo mock data cho việc test các bước từ 1 đến 6 của quy trình công tác:

1. **`mock_travel_expense_data.sql`** - Script chi tiết với hướng dẫn, cần thay thế employee IDs thủ công
2. **`insert_mock_travel_expense_data.sql`** - Script tự động lấy employee IDs từ database (khuyến nghị)

## Cách sử dụng

### Cách 1: Script Node.js (Khuyến nghị - Không cần password)

Script Node.js sẽ tự động sử dụng thông tin database từ file `.env`:

```bash
# Từ thư mục gốc của project
cd backend
node scripts/insert-mock-travel-expense-data.js
```

Hoặc từ thư mục backend:

```bash
node scripts/insert-mock-travel-expense-data.js
```

**Ưu điểm**: 
- Không cần nhập password
- Tự động sử dụng thông tin từ `.env`
- Hiển thị kết quả chi tiết

### Cách 2: Script SQL trực tiếp với psql

Nếu bạn muốn chạy trực tiếp với psql:

```bash
# Thay thế your_username và your_database bằng thông tin thực tế
psql -U your_username -d your_database -f database/insert_mock_travel_expense_data.sql

# Hoặc nếu bạn đã kết nối vào database
\i database/insert_mock_travel_expense_data.sql
```

### Cách 2: Script thủ công

Nếu bạn muốn kiểm soát chính xác employee IDs nào được sử dụng:

1. Kiểm tra employee IDs trong database:
```sql
SELECT id, ho_ten, email FROM employees LIMIT 10;
```

2. Mở file `database/mock_travel_expense_data.sql` và thay thế các giá trị:
   - `employee_id` (1, 2, ...)
   - `manager_id` (2, 3, ...)
   - `branch_director_id` (4, ...)
   - `ceo_id` (5, ...)
   - `hr_id` (6, ...)

3. Chạy script:
```bash
psql -U your_username -d your_database -f database/mock_travel_expense_data.sql
```

## Dữ liệu được tạo

Script sẽ tạo các travel expense requests với các trạng thái khác nhau:

### BƯỚC 1: Yêu cầu mới (PENDING_LEVEL_1)
- 3 requests chờ quản lý trực tiếp duyệt
- Bao gồm: trong nước, nước ngoài (Châu Á), nước ngoài (Châu Âu)

### BƯỚC 2: Đã duyệt cấp 1 (PENDING_LEVEL_2)
- 1 request đã được quản lý duyệt, chờ giám đốc chi nhánh

### BƯỚC 2.1 & 3: Chờ CEO (PENDING_CEO)
- 1 request đã được quản lý và giám đốc chi nhánh duyệt, chờ CEO phê duyệt (nước ngoài)

### BƯỚC 3: Chờ cấp ngân sách (PENDING_FINANCE)
- 2 requests đã được duyệt đầy đủ, chờ HR/Kế toán cấp ngân sách
- Bao gồm: trong nước và nước ngoài

### BƯỚC 4: Chờ báo cáo hoàn ứng (PENDING_SETTLEMENT)
- 2 requests đã được cấp ngân sách và chuyển tạm ứng
- 1 request chờ nhân viên gửi báo cáo
- 1 request nhân viên đã gửi báo cáo

### BƯỚC 5: Chờ kế toán kiểm tra (PENDING_ACCOUNTANT)
- 3 requests đã được HR xác nhận, chờ kế toán quyết toán
- Bao gồm các trường hợp:
  - Chi phí thực tế < Ngân sách
  - Chi phí thực tế > Ngân sách (sẽ chuyển sang PENDING_EXCEPTION_APPROVAL)
  - Chi phí thực tế = Ngân sách

### BƯỚC 6: Đã quyết toán (SETTLED)
- 1 request đã được kế toán quyết toán xong

### BƯỚC 6.1: Chờ phê duyệt ngoại lệ (PENDING_EXCEPTION_APPROVAL)
- 1 request có chi phí vượt ngân sách, chờ phê duyệt ngoại lệ

## Kiểm tra kết quả

Sau khi chạy script, kiểm tra dữ liệu:

```sql
-- Xem tất cả requests theo trạng thái
SELECT 
    id,
    employee_id,
    status,
    location,
    approved_budget_amount,
    actual_expense,
    reimbursement_amount,
    exceeds_budget,
    created_at
FROM travel_expense_requests
ORDER BY created_at DESC;

-- Đếm số lượng theo trạng thái
SELECT status, COUNT(*) as count
FROM travel_expense_requests
GROUP BY status
ORDER BY count DESC;

-- Xem các requests chờ kế toán kiểm tra (BƯỚC 6)
SELECT 
    id,
    employee_id,
    location,
    approved_budget_amount,
    actual_expense,
    (actual_expense - approved_budget_amount) as excess,
    settlement_status
FROM travel_expense_requests
WHERE status = 'PENDING_ACCOUNTANT';
```

## Xóa dữ liệu mock (nếu cần)

Nếu muốn xóa tất cả mock data:

```sql
-- Xóa attachments trước (do foreign key constraint)
DELETE FROM travel_expense_attachments;

-- Xóa travel expense requests
DELETE FROM travel_expense_requests;

-- Reset sequence (tùy chọn)
ALTER SEQUENCE travel_expense_requests_id_seq RESTART WITH 1;
ALTER SEQUENCE travel_expense_attachments_id_seq RESTART WITH 1;
```

## Lưu ý

1. **Employee IDs**: Script tự động sẽ lấy các employee IDs đầu tiên từ database. Nếu bạn muốn sử dụng employees cụ thể, hãy chỉnh sửa script hoặc sử dụng script thủ công.

2. **Timestamps**: Các timestamps được tính toán dựa trên `CURRENT_TIMESTAMP`, vì vậy:
   - Các requests trong tương lai sẽ có `start_time` và `end_time` ở tương lai
   - Các requests đã hoàn thành sẽ có `start_time` và `end_time` ở quá khứ

3. **Attachments**: Script không tự động tạo file attachments thật. Bạn cần upload file thật qua UI hoặc tạo file giả trong thư mục `uploads/travel-expenses/`.

4. **Ngân sách và Chi phí**: 
   - Ngân sách được cấp (`approved_budget_amount`) thường bằng số tiền tạm ứng (`requested_advance_amount`)
   - Chi phí thực tế (`actual_expense`) có thể nhỏ hơn, bằng, hoặc lớn hơn ngân sách để test các trường hợp khác nhau

## Test các bước

Sau khi chạy script, bạn có thể test các module:

1. **BƯỚC 1**: Module "Đăng ký kinh phí công tác" - Tạo yêu cầu mới
2. **BƯỚC 2 & 2.1**: Module "Duyệt đơn công tác" - Duyệt yêu cầu
3. **BƯỚC 3**: Module "Duyệt đơn công tác" (với role CEO) - Duyệt yêu cầu nước ngoài
4. **BƯỚC 4**: Module "Quản lý kinh phí công tác" - Cấp ngân sách và tạm ứng
5. **BƯỚC 5**: Module "Báo cáo Hoàn ứng" - Nhân viên gửi báo cáo, HR xác nhận
6. **BƯỚC 6**: Module "Kiểm tra & Quyết toán" - Kế toán kiểm tra và quyết toán

