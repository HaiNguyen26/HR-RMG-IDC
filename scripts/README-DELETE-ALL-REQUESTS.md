# Hướng dẫn xóa toàn bộ quy trình xin phép

## ⚠️ CẢNH BÁO QUAN TRỌNG

**Trước khi chạy script này:**
- ✅ **BACKUP DATABASE** nếu có dữ liệu quan trọng
- ✅ Đảm bảo bạn muốn xóa **HOÀN TOÀN** tất cả
- ✅ Bạn sẵn sàng thiết kế lại từ đầu

## 📋 Script có sẵn

### `delete-all-requests-complete-clean.sql`
**Mục đích:** XÓA HOÀN TOÀN tất cả database liên quan đến quy trình xin phép

**Sẽ xóa:**
- ✅ Tất cả bảng: `leave_requests`, `overtime_requests`, `attendance_adjustments`
- ✅ Tất cả triggers liên quan
- ✅ Tất cả functions liên quan
- ✅ Tất cả indexes liên quan
- ✅ Tất cả sequences liên quan
- ✅ **KHÔNG THỂ PHỤC HỒI** sau khi chạy

## 🚀 Cách chạy

### Option 1: Chạy trong pgAdmin
1. Mở pgAdmin
2. Kết nối đến database `HR_Management_System`
3. Mở Query Tool
4. Mở file `scripts/delete-all-requests-complete-clean.sql`
5. Chạy script (F5)
6. Kiểm tra kết quả

### Option 2: Chạy trong psql
```bash
# Windows (PowerShell)
psql -U postgres -d HR_Management_System -f scripts/delete-all-requests-complete-clean.sql

# Hoặc nếu có password
$env:PGPASSWORD='your_password'; psql -U postgres -d HR_Management_System -f scripts/delete-all-requests-complete-clean.sql
```

### Option 3: Chạy trực tiếp trong psql
```sql
-- Kết nối đến database
\c HR_Management_System

-- Chạy script
\i scripts/delete-all-requests-complete-clean.sql
```

## ✅ Kiểm tra kết quả

Sau khi chạy, script sẽ hiển thị:
- ✅ Danh sách các bảng đã xóa
- ✅ Trạng thái của từng bảng (ĐÃ XÓA hoặc CÒN TỒN TẠI)

## 📝 Sau khi xóa

### 1. Database
- ✅ Tất cả bảng đã bị xóa
- ✅ Bạn có thể tạo lại với schema mới

### 2. Backend Code
**Các file cần xem xét:**
- `backend/routes/leaveRequests.js` - Có thể giữ lại để tham khảo hoặc xóa
- `backend/routes/overtimeRequests.js` - Có thể giữ lại để tham khảo hoặc xóa
- `backend/routes/attendanceRequests.js` - Có thể giữ lại để tham khảo hoặc xóa

**Lưu ý:** Nếu giữ lại code, bạn sẽ cần:
- Sửa lại logic để phù hợp với schema mới
- Cập nhật các endpoints
- Test lại các chức năng

### 3. Frontend Code
**Các file cần xem xét:**
- `frontend/src/components/LeaveRequest/` - Component tạo đơn xin nghỉ
- `frontend/src/components/LeaveApprovals/` - Component duyệt đơn
- `frontend/src/components/OvertimeRequest/` - Component tạo đơn tăng ca
- `frontend/src/components/AttendanceAdjustment/` - Component bổ sung chấm công
- `frontend/src/components/Common/FloatingNotificationBell.js` - Notification bell

**Lưu ý:** Các component này có thể:
- Giữ lại để tham khảo
- Xóa và tạo lại từ đầu
- Sửa lại để phù hợp với API mới

## 🔄 Bước tiếp theo

### 1. Thiết kế lại database schema
- Tạo file SQL mới với schema mới
- Chạy script để tạo bảng

### 2. Cập nhật backend
- Sửa lại các routes để phù hợp với schema mới
- Test các endpoints

### 3. Cập nhật frontend
- Sửa lại các components để phù hợp với API mới
- Test các chức năng

### 4. Test toàn bộ
- Test tạo đơn
- Test duyệt đơn
- Test các chức năng khác

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra lại script đã chạy đúng chưa
2. Kiểm tra database connection
3. Kiểm tra permissions
4. Xem logs trong backend console

