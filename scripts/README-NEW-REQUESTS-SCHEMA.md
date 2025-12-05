# Hướng dẫn tạo schema mới cho quy trình xin phép

## 📋 Quy trình mới

### 1. Nhân viên
- Tạo và gửi phiếu các yêu cầu nghỉ phép, tăng ca, bổ sung công
- Lưu vào lịch sử đơn từ
- Chờ Quản lý trực tiếp duyệt
- Yêu cầu được gửi kèm lý do và thời gian
- Nhân viên sẽ nhận kết quả duyệt hoặc từ chối từ quản lý tại lịch sử đơn từ

### 2. Quản lý trực tiếp
- Nhận được đơn
- Duyệt hoặc từ chối

## 🗄️ Schema Database

### Các bảng được tạo:
1. **leave_requests** - Đơn xin nghỉ phép
2. **overtime_requests** - Đơn xin tăng ca
3. **attendance_adjustments** - Đơn bổ sung chấm công

### Status values:
- `PENDING` - Chờ quản lý trực tiếp duyệt
- `APPROVED` - Đã được duyệt
- `REJECTED` - Đã bị từ chối
- `CANCELLED` - Đã hủy (bởi nhân viên)

## 🚀 Cách chạy

### Bước 1: Xóa schema cũ (nếu có)
```bash
psql -U postgres -d HR_Management_System -f scripts/delete-all-requests-complete-clean.sql
```

### Bước 2: Tạo schema mới
```bash
psql -U postgres -d HR_Management_System -f database/create_requests_schema.sql
```

### Hoặc chạy trong pgAdmin:
1. Mở pgAdmin
2. Kết nối đến database `HR_Management_System`
3. Mở Query Tool
4. Mở file `database/create_requests_schema.sql`
5. Chạy script (F5)

## 📝 Cấu trúc bảng

### leave_requests
- `id` - Primary key
- `employee_id` - ID nhân viên
- `team_lead_id` - ID quản lý trực tiếp
- `request_type` - Loại đơn (LEAVE, RESIGN)
- `start_date` - Ngày bắt đầu
- `end_date` - Ngày kết thúc
- `reason` - Lý do
- `notes` - Ghi chú
- `status` - Trạng thái (PENDING, APPROVED, REJECTED, CANCELLED)
- `team_lead_action` - Hành động của quản lý (APPROVE, REJECT)
- `team_lead_action_at` - Thời gian quản lý xử lý
- `team_lead_comment` - Comment của quản lý
- `created_at` - Thời gian tạo
- `updated_at` - Thời gian cập nhật

### overtime_requests
- Tương tự leave_requests nhưng có thêm:
- `request_date` - Ngày tăng ca
- `start_time` - Giờ bắt đầu
- `end_time` - Giờ kết thúc
- `duration` - Thời lượng

### attendance_adjustments
- Tương tự nhưng có thêm:
- `adjustment_date` - Ngày điều chỉnh
- `check_type` - Loại chấm công (CHECK_IN, CHECK_OUT, BOTH)
- `check_in_time` - Giờ vào
- `check_out_time` - Giờ ra

## ✅ Sau khi tạo schema

1. **Backend**: Cần cập nhật các routes để phù hợp với schema mới
2. **Frontend**: Cần cập nhật các components để hiển thị và xử lý đơn
3. **Test**: Test tạo đơn, duyệt đơn, xem lịch sử

## 📞 Lưu ý

- Schema này đơn giản hơn schema cũ
- Chỉ có 4 status: PENDING, APPROVED, REJECTED, CANCELLED
- Không có quản lý gián tiếp, không có HR approval
- Quy trình: Nhân viên -> Quản lý trực tiếp -> Kết thúc

