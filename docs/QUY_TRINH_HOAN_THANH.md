# Các Quy Trình Đã Hoàn Thành - HR Management System

## 1. Quy Trình Yêu Cầu & Duyệt Đơn

### 1.1. Đơn Xin Nghỉ Phép (Leave Request)
- **Nhân viên**: Tạo và gửi đơn xin nghỉ phép
- **Quản lý trực tiếp**: Duyệt/từ chối đơn
- **Trạng thái**: PENDING → APPROVED/REJECTED/CANCELLED
- **Tính năng**: Xem lịch sử, hủy đơn đang chờ duyệt

### 1.2. Đơn Xin Tăng Ca (Overtime Request)
- **Nhân viên**: Tạo và gửi đơn xin tăng ca
- **Quản lý trực tiếp**: Duyệt/từ chối đơn
- **Trạng thái**: PENDING → APPROVED/REJECTED/CANCELLED
- **Tính năng**: Xem lịch sử, hủy đơn đang chờ duyệt

### 1.3. Điều Chỉnh Chấm Công (Attendance Adjustment)
- **Nhân viên**: Tạo yêu cầu điều chỉnh chấm công
- **Quản lý trực tiếp**: Duyệt/từ chối yêu cầu
- **Trạng thái**: PENDING → APPROVED/REJECTED/CANCELLED
- **Tính năng**: Xem lịch sử, hủy yêu cầu đang chờ duyệt

### 1.4. Module Duyệt Đơn (Leave Approvals)
- **Quản lý trực tiếp**: Xem danh sách đơn cần duyệt
- **Tính năng**: 
  - Lọc theo trạng thái (Chờ duyệt, Đã duyệt, Đã từ chối, Tất cả)
  - Duyệt/từ chối với ghi chú
  - Xem chi tiết đơn
  - Tự động hiển thị cho quản lý trực tiếp (dựa trên `quan_ly_truc_tiep`)

## 2. Quy Trình Tuyển Dụng

### 2.1. Quản Lý Ứng Viên (Candidate Management)
- **HR/Admin**: 
  - Thêm/sửa/xóa ứng viên
  - Upload CV
  - Quản lý trạng thái ứng viên
  - Xem chi tiết hồ sơ
- **Trạng thái**: MỚI → ĐANG XỬ LÝ → ĐÃ PHỎNG VẤN → ĐÃ DUYỆT → ĐANG THỬ VIỆC → ĐẠT/KHÔNG ĐẠT

### 2.2. Yêu Cầu Phỏng Vấn (Interview Request)
- **HR**: Tạo yêu cầu phỏng vấn cho ứng viên
- **Chọn**: Quản lý trực tiếp và quản lý gián tiếp
- **Trạng thái**: PENDING → PENDING_EVALUATION → APPROVED/REJECTED

### 2.3. Duyệt Phỏng Vấn (Interview Approvals)
- **Quản lý trực tiếp**: 
  - Duyệt/từ chối yêu cầu phỏng vấn (PENDING)
  - Đánh giá ứng viên sau phỏng vấn (PENDING_EVALUATION)
- **Quản lý gián tiếp**: 
  - Đánh giá ứng viên sau khi quản lý trực tiếp đã đánh giá
- **Tính năng**:
  - Thống kê số lượng đơn theo trạng thái
  - Badge nhấp nháy khi có đơn chờ xử lý
  - Lọc theo trạng thái với số lượng hiển thị

### 2.4. Xuất Thư Tuyển Dụng (Job Offer Letter)
- **HR**: Điền form thông tin và xuất PDF thư tuyển dụng
- **Tính năng**:
  - Form nhập đầy đủ thông tin (lương, phụ cấp, ngày nghỉ, nhiệm vụ...)
  - Format VND tự động khi nhập
  - Xác nhận trước khi xuất PDF
  - Tự động chuyển trạng thái ứng viên thành "Đang thử việc" sau khi xuất PDF
  - PDF có định dạng chuyên nghiệp với font tiếng Việt

### 2.5. Danh Sách Thử Việc (Probation List)
- **Quản lý trực tiếp/HR**: Xem danh sách ứng viên đang thử việc
- **Tính năng**:
  - Hiển thị ngày xuất thư và số ngày đã trôi qua
  - Đánh giá thử việc sau 45 ngày (Đạt/Không đạt)
  - Nút "Đánh giá" bị vô hiệu hóa trước 45 ngày, hiển thị "Còn X ngày"
  - Ứng viên "Đang thử việc" không thể chỉnh sửa

## 3. Quy Trình Quản Lý Nhân Viên

### 3.1. Quản Lý Hồ Sơ Nhân Viên (Employee Management)
- **HR/Admin**: 
  - Thêm/sửa/xóa nhân viên
  - Quản lý thông tin cá nhân, công việc, tổ chức
  - Upload ảnh đại diện
- **Tính năng**:
  - Dropdown động cho các trường: Chức danh, Chi nhánh, Loại hợp đồng, Địa điểm, Thuế, Cấp bậc, Quản lý trực tiếp/gián tiếp
  - Dữ liệu lấy từ database
  - Validation đầy đủ

### 3.2. Dashboard Nhân Viên (Employee Dashboard)
- **Nhân viên**: Xem thông tin cá nhân và các yêu cầu
- **Tính năng**:
  - Thẻ thông tin cá nhân
  - Thống kê đơn đã gửi
  - Truy cập nhanh các module

## 4. Quy Trình Quản Lý Vật Dụng

### 4.1. Yêu Cầu/Cấp Vật Dụng (Equipment Request)
- **IT/HR/Accounting/Admin**: Quản lý yêu cầu vật dụng
- **Tính năng**: 
  - Xem danh sách yêu cầu
  - Lọc theo loại, trạng thái, ngày
  - Tìm kiếm
  - Hiển thị dạng modal

### 4.2. Cập Nhật Vật Dụng (Equipment Assignment)
- **IT/HR**: Cập nhật vật dụng cho nhân viên
- **Tính năng**:
  - Hiển thị thông tin nhân viên
  - Quản lý danh sách vật dụng đã cấp
  - Hiển thị dạng modal

## 5. Quy Trình Phê Duyệt Công Tác

### 5.1. Phê Duyệt Công Tác (Travel Expense Approval)
- **Quản lý**: Duyệt các yêu cầu công tác
- **Tính năng**: 
  - Xem danh sách yêu cầu công tác
  - Duyệt/từ chối
  - Header với gradient theme

## 6. Tính Năng Hệ Thống

### 6.1. Xác Thực & Phân Quyền
- **Đăng nhập/Đăng xuất**
- **Phân quyền**: ADMIN, HR, IT, ACCOUNTING, EMPLOYEE
- **Quản lý trực tiếp**: Tự động xác định dựa trên `quan_ly_truc_tiep` trong bảng employees

### 6.2. Thông Báo & Xác Nhận
- **Toast notifications**: Thông báo thành công/lỗi/cảnh báo
- **Confirm modal**: Xác nhận trước các hành động quan trọng
- **Badge nhấp nháy**: Thông báo số lượng đơn chờ xử lý

### 6.3. UI/UX
- **Theme**: "Calm Integrity" với gradient xanh dương và xanh lá
- **Responsive**: Tương thích mobile và desktop
- **Animations**: Hiệu ứng mượt mà, badge nhấp nháy
- **Dropdown**: Tự động mở lên trên khi cần

## 7. Tích Hợp Ngoài (Đang Phát Triển)

### 7.1. Máy Chấm Công ZKTeco SmartFace 680
- **Trạng thái**: Đã nghiên cứu và chuẩn bị
- **Phương án**: Tích hợp qua EPAD Web API
- **Tài liệu**: 
  - API Requirements
  - HR Requirements Checklist
  - Email templates để liên hệ vendor

---

**Lưu ý**: Tất cả các quy trình trên đã được triển khai và hoạt động ổn định trong hệ thống.

