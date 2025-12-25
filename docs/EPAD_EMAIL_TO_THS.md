# Email Gửi THS - Yêu cầu Tích hợp EPAD

---

**Subject**: Yêu cầu Tích hợp Hệ thống Chấm công EPAD - HR Management System

---

Kính gửi Anh/Chị THS,

Tinh Hoa Software hiện đang phát triển Hệ thống Quản lý Nhân sự (HR Management System) và muốn tích hợp với hệ thống chấm công EPAD của quý công ty.

Để đảm bảo việc tích hợp diễn ra suôn sẻ, chúng tôi cần một số thông tin và tài liệu kỹ thuật từ phía EPAD. Dưới đây là các yêu cầu chính:

## 📋 Thông tin Cần Thiết

### 1. API Documentation
- Tài liệu API chi tiết (Swagger/OpenAPI nếu có)
- Postman Collection (nếu có)
- Danh sách tất cả API endpoints cần thiết
- Cấu trúc dữ liệu request/response cho từng API

### 2. Thông tin Xác thực
- **Token test** cho API log chấm công (THS gửi cho Tinh Hoa)
- **Token test** cho API thông tin khác: nhân viên, phòng ban, chức vụ, thiết bị (Tinh Hoa gửi cho THS)
- Format sử dụng token (Authorization header, API Key, etc.)
- URL test endpoint

### 3. API Endpoints Cần Thiết

Chúng tôi cần các API sau:
1. **API Lấy Log Chấm Công**: Lấy dữ liệu chấm công theo khoảng thời gian
2. **API Lấy Danh sách Nhân viên**: Lấy thông tin nhân viên (cần có mã nhân viên để mapping)
3. **API Lấy Danh sách Phòng ban**
4. **API Lấy Danh sách Chức vụ**
5. **API Lấy Danh sách Thiết bị Chấm công**

### 4. Định dạng và Chuẩn Dữ liệu
- **Date format**: YYYY-MM-DD (đã xác nhận)
- **DateTime format**: ISO 8601 với timezone GMT+7 (cần xác nhận format chính xác)
- **VerifyMode mapping**: 1=Finger, 2=Pin, 3=Password, 4=Card, 15=FaceTemplate (cần xác nhận đầy đủ)
- Cách phân biệt check-in và check-out trong log chấm công

### 5. Mapping Dữ liệu
- **Quan trọng**: Cần field `employeeCode` (mã nhân viên) trong API để mapping với hệ thống HR (dựa vào `ma_cham_cong`)
- Nếu không có `employeeCode`, cần thống nhất cách mapping khác

### 6. Đồng bộ Dữ liệu
- Tần suất tối đa được phép gọi API (để tránh ảnh hưởng hiệu suất)
- Cơ chế pagination (nếu có)
- Cách xử lý duplicate data khi đồng bộ lại

### 7. Dữ liệu Test
- Dữ liệu test nhân viên (ít nhất 5-10 nhân viên)
- Dữ liệu test log chấm công (ít nhất 100 records)
- Dữ liệu test thiết bị (ít nhất 2-3 thiết bị)
- Dữ liệu test phòng ban và chức vụ

## 📎 Tài liệu Chi tiết

Đính kèm là tài liệu chi tiết về các yêu cầu kỹ thuật:
- **EPAD_INTEGRATION_REQUIREMENTS.md**: Tài liệu đầy đủ về cấu trúc dữ liệu, format API, và các yêu cầu kỹ thuật

## ❓ Câu hỏi Cần Làm Rõ

1. **Cấu trúc Response**: Format response của các API có đúng như trong tài liệu đính kèm không? Nếu khác, xin cung cấp format chính xác.

2. **Mapping Nhân viên**: Làm thế nào để map `employeeCode` từ EPAD với mã chấm công trong hệ thống HR? Có field nào khác có thể dùng để mapping không?

3. **Check-in/Check-out**: Làm sao phân biệt check-in và check-out trong log chấm công? Có field `inOut` không?

4. **Tần suất API**: Tần suất tối đa được phép gọi API là bao nhiêu? (Chúng tôi đề xuất: Chấm công mỗi 30 phút - 1 giờ, Thông tin khác mỗi ngày)

5. **Export File**: Nếu không dùng API, có thể xuất file tự động không? Nếu có, format file, cấu trúc dữ liệu, và folder path như thế nào?

## 📅 Timeline Dự Kiến

- **Giai đoạn 1 (1-2 tuần)**: Nhận tài liệu và test API
- **Giai đoạn 2 (2-3 tuần)**: Phát triển module tích hợp
- **Giai đoạn 3 (1 tuần)**: Testing
- **Giai đoạn 4 (1 tuần)**: Production deployment

## 📞 Thông tin Liên hệ

Nếu có bất kỳ câu hỏi nào, xin vui lòng liên hệ:
- **Người phụ trách**: [Tên người phụ trách]
- **Email**: [Email]
- **Số điện thoại**: [Số điện thoại]

Chúng tôi mong nhận được phản hồi sớm từ quý công ty để có thể bắt đầu triển khai tích hợp.

Trân trọng cảm ơn!

---

**Tinh Hoa Software**

