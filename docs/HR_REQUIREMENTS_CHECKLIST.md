# 📋 CHECKLIST YÊU CẦU TỪ PHÒNG HR

## 🎯 Mục đích
Tài liệu này giúp phòng HR xác định các yêu cầu cụ thể về dữ liệu chấm công cần tích hợp vào hệ thống HR Management System.

---

## 📊 1. DỮ LIỆU CHẤM CÔNG CẦN THIẾT

### 1.1. Thông tin cơ bản
- [ ] **Thời gian check-in** (giờ vào làm)
- [ ] **Thời gian check-out** (giờ ra về)
- [ ] **Ngày chấm công**
- [ ] **Tổng số giờ làm việc** trong ngày
- [ ] **Trạng thái chấm công** (Đúng giờ, Muộn, Sớm, Thiếu check-in/check-out)

### 1.2. Thông tin nhân viên
- [ ] **Mã nhân viên** (Employee Code)
- [ ] **Tên nhân viên**
- [ ] **Email nhân viên**
- [ ] **Phòng ban**
- [ ] **Chức vụ**

### 1.3. Thông tin thiết bị
- [ ] **Tên thiết bị chấm công**
- [ ] **IP address của thiết bị**
- [ ] **Vị trí đặt thiết bị** (Văn phòng Hà Nội, HCM, v.v.)
- [ ] **Phương thức xác thực** (Vân tay, Khuôn mặt, Thẻ, Mật khẩu)

### 1.4. Thông tin bổ sung
- [ ] **Thời gian muộn** (nếu có)
- [ ] **Thời gian sớm** (nếu có)
- [ ] **Ghi chú** (nếu có)
- [ ] **Hình ảnh chấm công** (nếu thiết bị hỗ trợ)

---

## 📅 2. BÁO CÁO VÀ THỐNG KÊ

### 2.1. Báo cáo theo thời gian
- [ ] **Báo cáo theo ngày**
- [ ] **Báo cáo theo tuần**
- [ ] **Báo cáo theo tháng**
- [ ] **Báo cáo theo quý**
- [ ] **Báo cáo theo năm**

### 2.2. Báo cáo theo đối tượng
- [ ] **Báo cáo theo nhân viên** (chi tiết từng nhân viên)
- [ ] **Báo cáo theo phòng ban**
- [ ] **Báo cáo theo chức vụ**
- [ ] **Báo cáo tổng hợp toàn công ty**

### 2.3. Thống kê cần thiết
- [ ] **Tổng số giờ làm việc** (theo ngày/tuần/tháng)
- [ ] **Số lần muộn** (theo thời gian)
- [ ] **Số lần sớm** (theo thời gian)
- [ ] **Số lần thiếu chấm công** (check-in hoặc check-out)
- [ ] **Tỷ lệ chấm công đúng giờ**
- [ ] **Giờ làm việc trung bình** (theo nhân viên/phòng ban)

---

## 🔄 3. TẦN SUẤT ĐỒNG BỘ DỮ LIỆU

### 3.1. Đồng bộ dữ liệu
- [ ] **Real-time** (ngay khi có chấm công mới)
- [ ] **Theo giờ** (mỗi giờ đồng bộ 1 lần)
- [ ] **Theo ngày** (mỗi ngày đồng bộ 1 lần, ví dụ: 8h sáng)
- [ ] **Thủ công** (chỉ khi HR yêu cầu)

### 3.2. Thời gian đồng bộ
- [ ] **Giờ đồng bộ**: _______________ (ví dụ: 8:00 AM)
- [ ] **Ngày đồng bộ**: _______________ (ví dụ: Hàng ngày, Thứ 2-6, v.v.)

---

## 📤 4. EXPORT DỮ LIỆU

### 4.1. Định dạng file
- [ ] **CSV** (để import vào Excel)
- [ ] **Excel** (.xlsx)
- [ ] **PDF** (cho báo cáo in)

### 4.2. Nội dung export
- [ ] **Export toàn bộ dữ liệu** trong khoảng thời gian
- [ ] **Export theo nhân viên** (chọn nhân viên cụ thể)
- [ ] **Export theo phòng ban**
- [ ] **Export báo cáo tổng hợp**

---

## 🔍 5. TÌM KIẾM VÀ LỌC DỮ LIỆU

### 5.1. Tìm kiếm
- [ ] **Tìm theo tên nhân viên**
- [ ] **Tìm theo mã nhân viên**
- [ ] **Tìm theo phòng ban**
- [ ] **Tìm theo ngày**

### 5.2. Lọc dữ liệu
- [ ] **Lọc theo khoảng thời gian** (từ ngày X đến ngày Y)
- [ ] **Lọc theo phòng ban**
- [ ] **Lọc theo trạng thái** (Đúng giờ, Muộn, Sớm, Thiếu)
- [ ] **Lọc theo thiết bị chấm công**

---

## ⚙️ 6. TÍNH NĂNG ĐẶC BIỆT

### 6.1. Tính công
- [ ] **Tính số giờ làm việc** tự động
- [ ] **Tính giờ làm thêm** (OT) nếu có
- [ ] **Tính công theo ca** (nếu có nhiều ca làm việc)
- [ ] **Tính công theo ngày nghỉ** (nghỉ lễ, nghỉ phép)

### 6.2. Cảnh báo
- [ ] **Cảnh báo muộn** (nếu check-in sau giờ quy định)
- [ ] **Cảnh báo thiếu chấm công** (nếu thiếu check-in hoặc check-out)
- [ ] **Cảnh báo giờ làm việc không đủ** (nếu số giờ làm < quy định)

### 6.3. Tích hợp với các module khác
- [ ] **Tích hợp với module nghỉ phép** (để tính công chính xác)
- [ ] **Tích hợp với module tăng ca** (để tính giờ OT)
- [ ] **Tích hợp với module lương** (để tính lương theo công)

---

## 📱 7. GIAO DIỆN VÀ TRẢI NGHIỆM

### 7.1. Xem dữ liệu
- [ ] **Xem lịch sử chấm công** của từng nhân viên
- [ ] **Xem bảng chấm công** (dạng bảng, giống Excel)
- [ ] **Xem biểu đồ thống kê** (giờ làm việc, tỷ lệ muộn, v.v.)
- [ ] **Xem chi tiết** từng lần chấm công

### 7.2. Quyền truy cập
- [ ] **Nhân viên** chỉ xem được dữ liệu của mình
- [ ] **Quản lý** xem được dữ liệu của nhân viên trong phòng ban
- [ ] **HR** xem được toàn bộ dữ liệu

---

## 🔔 8. THÔNG BÁO VÀ CẢNH BÁO

### 8.1. Thông báo
- [ ] **Thông báo khi có chấm công mới** (real-time)
- [ ] **Thông báo báo cáo chấm công hàng ngày/tuần/tháng**
- [ ] **Thông báo khi có nhân viên muộn**

### 8.2. Cảnh báo
- [ ] **Cảnh báo khi nhân viên muộn nhiều lần**
- [ ] **Cảnh báo khi thiếu chấm công**
- [ ] **Cảnh báo khi giờ làm việc không đủ**

---

## 📋 9. CÁC YÊU CẦU KHÁC

### 9.1. Yêu cầu đặc biệt
- [ ] _________________________________________________
- [ ] _________________________________________________
- [ ] _________________________________________________

### 9.2. Lưu ý
- [ ] _________________________________________________
- [ ] _________________________________________________
- [ ] _________________________________________________

---

## ✅ 10. CHECKLIST HOÀN THÀNH

Sau khi điền xong checklist này, vui lòng:
- [ ] Xem lại tất cả các mục đã đánh dấu
- [ ] Ghi chú thêm các yêu cầu đặc biệt (nếu có)
- [ ] Gửi lại cho bộ phận IT để tích hợp

---

## 📞 LIÊN HỆ

Nếu có thắc mắc về checklist này, vui lòng liên hệ:
- **Bộ phận IT**: [Email/Phone]
- **Phòng HR**: [Email/Phone]

---

**Ngày tạo:** 2025-12-02  
**Phiên bản:** 1.0

