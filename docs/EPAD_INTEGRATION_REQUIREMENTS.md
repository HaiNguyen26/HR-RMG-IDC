# Tài liệu Yêu cầu Tích hợp EPAD - HR Management System

**Ngày tạo**: 2025-01-XX  
**Phiên bản**: 1.0  
**Đơn vị**: Tinh Hoa Software  
**Nhà cung cấp**: THS (EPAD System)

---

## 📋 Mục đích

Tài liệu này mô tả chi tiết các yêu cầu về API, cấu trúc dữ liệu và các thông tin kỹ thuật cần thiết để tích hợp hệ thống chấm công EPAD vào HR Management System.

---

## 1. 🔐 Thông tin Xác thực (Authentication)

### 1.1. API Token

#### Token cho API Log Chấm Công
- **Mục đích**: Lấy dữ liệu chấm công (attendance logs)
- **Cách cung cấp**: THS gửi token cho Tinh Hoa
- **Thời hạn**: Token không có thời hạn (permanent)
- **Yêu cầu**: Cần cung cấp token test và token production riêng biệt

#### Token cho API Thông tin Khác
- **Mục đích**: Lấy thông tin nhân viên, phòng ban, chức vụ, thiết bị
- **Cách cung cấp**: Tinh Hoa gửi token cho THS
- **Thời hạn**: Token không có thời hạn (permanent)
- **Yêu cầu**: Cần cung cấp token test và token production riêng biệt

### 1.2. Cách sử dụng Token
- **Header format**: `Authorization: Bearer {token}` hoặc `X-API-Key: {token}`
- **Yêu cầu**: Xác nhận format chính xác từ THS

---

## 2. 🌐 Thông tin API Endpoints

### 2.1. API Base URL

#### Môi trường Test
- **URL**: `http://115.73.210.113:4001` (hoặc URL test khác do THS cung cấp)
- **Yêu cầu**: Cần xác nhận URL chính xác trước khi triển khai

#### Môi trường Production
- **URL**: Sẽ được cập nhật khi triển khai
- **Yêu cầu**: Cần thông báo trước khi chuyển sang production

### 2.2. API Endpoints cần thiết

#### 2.2.1. API Lấy Log Chấm Công (Attendance Logs)

**Endpoint**: `GET /api/attendance/logs` (hoặc endpoint do THS cung cấp)

**Query Parameters**:
```
- employeeId (optional): ID nhân viên (nếu không có, lấy tất cả)
- fromDate (required): YYYY-MM-DD
- toDate (required): YYYY-MM-DD
- deviceId (optional): ID thiết bị chấm công
- page (optional): Số trang (nếu có pagination)
- limit (optional): Số records mỗi trang
```

**Yêu cầu Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "id": "log_id",
      "employeeId": "employee_id_from_epad",
      "employeeCode": "NV001",  // Mã nhân viên (nếu có)
      "employeeName": "Nguyễn Văn A",  // Tên nhân viên (nếu có)
      "deviceId": "device_id",
      "deviceName": "Máy chấm công A1",  // Tên thiết bị (nếu có)
      "checkTime": "2025-01-15T08:30:00+07:00",  // ISO 8601 format
      "verifyMode": 1,  // 1=Finger, 2=Pin, 3=Password, 4=Card, 15=FaceTemplate
      "inOut": "IN",  // "IN" hoặc "OUT"
      "location": "Văn phòng chính"  // Vị trí (nếu có)
    }
  ],
  "total": 100,  // Tổng số records (nếu có pagination)
  "page": 1,
  "limit": 50
}
```

**Yêu cầu bổ sung**:
- Cần biết cách phân biệt check-in và check-out (có field `inOut` không?)
- Timezone: Tất cả thời gian phải là GMT+7 (UTC+7)
- Format thời gian: ISO 8601 (`YYYY-MM-DDTHH:mm:ss+07:00`)

#### 2.2.2. API Lấy Danh sách Nhân viên

**Endpoint**: `GET /api/employees` (hoặc endpoint do THS cung cấp)

**Query Parameters**:
```
- employeeId (optional): ID nhân viên cụ thể (nếu có, lấy chi tiết 1 nhân viên)
- departmentId (optional): ID phòng ban (nếu có)
- page (optional): Số trang
- limit (optional): Số records mỗi trang
```

**Yêu cầu Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "id": "employee_id_from_epad",
      "employeeCode": "NV001",  // Mã nhân viên (bắt buộc để mapping)
      "fullName": "Nguyễn Văn A",
      "email": "nguyenvana@company.com",  // Email (nếu có)
      "phone": "0901234567",  // Số điện thoại (nếu có)
      "departmentId": "dept_01",  // ID phòng ban
      "departmentName": "Phòng IT",  // Tên phòng ban
      "positionId": "pos_01",  // ID chức vụ
      "positionName": "Nhân viên",  // Tên chức vụ
      "status": "ACTIVE",  // ACTIVE, INACTIVE, RESIGNED
      "createdAt": "2024-01-01T00:00:00+07:00",
      "updatedAt": "2025-01-15T00:00:00+07:00"
    }
  ],
  "total": 50
}
```

**Yêu cầu bổ sung**:
- Field `employeeCode` là **BẮT BUỘC** để mapping với hệ thống HR (dựa vào `ma_cham_cong` trong bảng `employees`)
- Nếu không có `employeeCode`, cần thống nhất cách mapping khác (ví dụ: email, phone, hoặc tên)

#### 2.2.3. API Lấy Danh sách Phòng ban

**Endpoint**: `GET /api/departments` (hoặc endpoint do THS cung cấp)

**Yêu cầu Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "id": "dept_01",
      "code": "IT",  // Mã phòng ban
      "name": "Phòng IT",
      "parentId": null,  // ID phòng ban cha (nếu có cấu trúc phân cấp)
      "description": "Phòng Công nghệ Thông tin"
    }
  ]
}
```

#### 2.2.4. API Lấy Danh sách Chức vụ

**Endpoint**: `GET /api/positions` (hoặc endpoint do THS cung cấp)

**Yêu cầu Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "id": "pos_01",
      "code": "NV",  // Mã chức vụ
      "name": "Nhân viên",
      "level": 1,  // Cấp độ (nếu có)
      "description": "Nhân viên"
    }
  ]
}
```

#### 2.2.5. API Lấy Danh sách Thiết bị Chấm Công

**Endpoint**: `GET /api/devices` (hoặc endpoint do THS cung cấp)

**Yêu cầu Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "id": "device_01",
      "code": "DEV001",  // Mã thiết bị
      "name": "Máy chấm công A1",
      "ipAddress": "192.168.1.100",  // IP address
      "location": "Tầng 1 - Phòng IT",  // Vị trí lắp đặt
      "status": "ACTIVE",  // ACTIVE, INACTIVE, MAINTENANCE
      "deviceType": "Fingerprint",  // Loại thiết bị
      "createdAt": "2024-01-01T00:00:00+07:00"
    }
  ]
}
```

---

## 3. 📅 Định dạng Ngày tháng và Thời gian

### 3.1. Date Format
- **Format**: `YYYY-MM-DD` (ví dụ: `2025-01-15`)
- **Timezone**: GMT+7 (UTC+7)
- **Áp dụng cho**: `fromDate`, `toDate` trong query parameters

### 3.2. DateTime Format
- **Format**: ISO 8601 với timezone: `YYYY-MM-DDTHH:mm:ss+07:00`
- **Ví dụ**: `2025-01-15T08:30:00+07:00`
- **Timezone**: Tất cả thời gian từ máy chấm công mặc định là GMT+7

---

## 4. 🔢 VerifyMode Mapping

| Giá trị | Mô tả | Ghi chú |
|---------|-------|---------|
| 1 | Finger | Vân tay |
| 2 | Pin | Mã PIN |
| 3 | Password | Mật khẩu |
| 4 | Card | Thẻ từ |
| 15 | FaceTemplate | Nhận diện khuôn mặt |

**Yêu cầu**: Xác nhận đây là danh sách đầy đủ, không còn giá trị nào khác.

---

## 5. 📊 Pagination

### 5.1. Yêu cầu hiện tại
- **Giới hạn records**: Chưa có (có thể customize nếu cần)
- **Yêu cầu**: Nếu API trả về nhiều records (ví dụ: >1000), cần có pagination để tránh timeout

### 5.2. Format Pagination (nếu có)
```json
{
  "data": [...],
  "pagination": {
    "total": 1000,
    "page": 1,
    "limit": 50,
    "totalPages": 20,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 6. 🔄 Đồng bộ Dữ liệu

### 6.1. Phương thức Đồng bộ
- **Webhook**: ❌ Không hỗ trợ
- **Polling**: ✅ Sử dụng API polling (gọi API định kỳ)

### 6.2. Tần suất Đồng bộ đề xuất
- **Chấm công**: Mỗi 30 phút hoặc 1 giờ
- **Nhân viên/Phòng ban/Chức vụ**: Mỗi ngày 1 lần (vào buổi sáng)
- **Thiết bị**: Mỗi ngày 1 lần

**Yêu cầu**: Xác nhận tần suất tối đa được phép gọi API để không ảnh hưởng hiệu suất hệ thống EPAD.

### 6.3. Cơ chế Đồng bộ
- **Lần đầu**: Lấy toàn bộ dữ liệu từ ngày bắt đầu đến hiện tại
- **Lần sau**: Chỉ lấy dữ liệu mới (từ lần đồng bộ cuối đến hiện tại)
- **Yêu cầu**: API cần hỗ trợ filter theo `fromDate` và `toDate`

---

## 7. 📤 Export Dữ liệu (Tùy chọn)

### 7.1. Yêu cầu hiện tại
- API không hỗ trợ export trực tiếp
- Nếu cần, THS có thể xuất file tự động ra folder trên server

### 7.2. Thông tin cần xác nhận (nếu sử dụng phương án export file)
- **Format file**: CSV, Excel, JSON, hoặc format khác?
- **Tên file pattern**: Ví dụ: `attendance_YYYYMMDD.csv`
- **Cấu trúc dữ liệu trong file**: Các cột/các trường có trong file
- **Folder path trên server**: Đường dẫn folder sẽ lưu file
- **Tần suất export**: Mỗi ngày, mỗi giờ, hoặc real-time?
- **Xóa file cũ**: File sẽ được xóa sau bao lâu?

**Lưu ý**: Nếu có thể, ưu tiên sử dụng API hơn export file để đảm bảo real-time và tự động hóa tốt hơn.

---

## 8. 🔗 Mapping Dữ liệu

### 8.1. Mapping Nhân viên
- **Field mapping**: `employeeCode` từ EPAD ↔ `ma_cham_cong` trong HR System
- **Yêu cầu**: Đảm bảo `employeeCode` trong EPAD khớp với `ma_cham_cong` trong HR System
- **Xử lý khi không khớp**: Cần có cơ chế báo lỗi hoặc cảnh báo khi không tìm thấy mapping

### 8.2. Mapping Phòng ban
- **Field mapping**: `departmentCode` hoặc `departmentName` từ EPAD ↔ `phong_ban` trong HR System
- **Xử lý khi không khớp**: Tạo mới hoặc bỏ qua (cần thống nhất)

### 8.3. Mapping Chức vụ
- **Field mapping**: `positionCode` hoặc `positionName` từ EPAD ↔ `chuc_danh` trong HR System
- **Xử lý khi không khớp**: Tạo mới hoặc bỏ qua (cần thống nhất)

---

## 9. ⚠️ Xử lý Lỗi và Edge Cases

### 9.1. Error Response Format
**Yêu cầu**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mô tả lỗi bằng tiếng Việt hoặc tiếng Anh",
    "details": {}  // Chi tiết lỗi (nếu có)
  }
}
```

### 9.2. Các trường hợp cần xử lý
1. **Token hết hạn hoặc không hợp lệ**: HTTP 401 Unauthorized
2. **Dữ liệu không tìm thấy**: HTTP 404 Not Found
3. **Lỗi server**: HTTP 500 Internal Server Error
4. **Rate limiting**: HTTP 429 Too Many Requests
5. **Tham số không hợp lệ**: HTTP 400 Bad Request

### 9.3. Các Edge Cases
- **Nhân viên không tồn tại trong HR System**: Cần có cơ chế báo cảnh báo
- **Dữ liệu trùng lặp**: Làm sao xử lý khi đồng bộ lại dữ liệu đã có?
- **Dữ liệu thiếu**: Làm sao xử lý khi thiếu thông tin nhân viên/phòng ban?

---

## 10. 🧪 Môi trường Test

### 10.1. Yêu cầu
- **Test URL**: Cần cung cấp URL test nội bộ từ Tinh Hoa
- **Test Token**: Cần cung cấp token test riêng (không dùng token production)
- **Test Data**: Cần có dữ liệu test đầy đủ (nhân viên, thiết bị, log chấm công)

### 10.2. Checklist Test
- [ ] Test API lấy log chấm công
- [ ] Test API lấy danh sách nhân viên
- [ ] Test API lấy danh sách phòng ban
- [ ] Test API lấy danh sách chức vụ
- [ ] Test API lấy danh sách thiết bị
- [ ] Test với các tham số filter (fromDate, toDate, employeeId, deviceId)
- [ ] Test với dữ liệu lớn (nhiều records)
- [ ] Test error handling (token invalid, không tìm thấy dữ liệu)
- [ ] Test timezone (đảm bảo đúng GMT+7)

---

## 11. 📝 Tài liệu API (API Documentation)

### 11.1. Yêu cầu
- **Swagger/OpenAPI**: Nếu có, cung cấp file Swagger JSON/YAML
- **Postman Collection**: Nếu có, cung cấp Postman collection
- **API Reference**: Tài liệu chi tiết về từng endpoint, parameters, response format

### 11.2. Nội dung cần có
- URL endpoint đầy đủ
- HTTP method (GET, POST, PUT, DELETE)
- Request headers (Authorization, Content-Type, etc.)
- Query parameters / Request body
- Response format (success và error)
- Example requests và responses
- Error codes và ý nghĩa

---

## 12. 🚀 Kế hoạch Triển khai

### 12.1. Giai đoạn 1: Chuẩn bị (1-2 tuần)
- [ ] Nhận API documentation từ THS
- [ ] Nhận token test từ THS
- [ ] Test các API endpoints cơ bản
- [ ] Thống nhất cấu trúc dữ liệu

### 12.2. Giai đoạn 2: Phát triển (2-3 tuần)
- [ ] Xây dựng module tích hợp EPAD
- [ ] Tạo database schema cho attendance logs
- [ ] Xây dựng API endpoints để lấy dữ liệu từ EPAD
- [ ] Xây dựng scheduled job để đồng bộ dữ liệu
- [ ] Xây dựng UI để xem/quản lý dữ liệu chấm công

### 12.3. Giai đoạn 3: Testing (1 tuần)
- [ ] Test tích hợp với dữ liệu test
- [ ] Test với dữ liệu thực (nếu có môi trường staging)
- [ ] Fix bugs và optimize

### 12.4. Giai đoạn 4: Production (1 tuần)
- [ ] Deploy lên production
- [ ] Nhận token production từ THS
- [ ] Đồng bộ dữ liệu lịch sử
- [ ] Monitor và xử lý sự cố

---

## 13. 📞 Thông tin Liên hệ

### 13.1. Bên Tinh Hoa
- **Người phụ trách**: [Tên người phụ trách]
- **Email**: [Email]
- **Số điện thoại**: [Số điện thoại]

### 13.2. Bên THS (EPAD)
- **Người phụ trách**: [Tên người phụ trách]
- **Email**: [Email]
- **Số điện thoại**: [Số điện thoại]

---

## 14. ✅ Checklist Yêu cầu từ THS

### 14.1. Tài liệu và Thông tin
- [ ] API Documentation chi tiết (Swagger/OpenAPI nếu có)
- [ ] Postman Collection (nếu có)
- [ ] Danh sách tất cả API endpoints
- [ ] Cấu trúc dữ liệu chi tiết cho từng API
- [ ] Error codes và ý nghĩa

### 14.2. Credentials
- [ ] Token test cho API log chấm công
- [ ] Token test cho API thông tin khác (nhân viên, phòng ban, etc.)
- [ ] Token production (sẽ cung cấp khi deploy)
- [ ] Test URL endpoint
- [ ] Production URL endpoint (sẽ cung cấp khi deploy)

### 14.3. Dữ liệu Test
- [ ] Dữ liệu test nhân viên (ít nhất 5-10 nhân viên)
- [ ] Dữ liệu test log chấm công (ít nhất 100 records)
- [ ] Dữ liệu test thiết bị (ít nhất 2-3 thiết bị)
- [ ] Dữ liệu test phòng ban
- [ ] Dữ liệu test chức vụ

### 14.4. Xác nhận Kỹ thuật
- [ ] Xác nhận format date/time
- [ ] Xác nhận timezone (GMT+7)
- [ ] Xác nhận mapping VerifyMode
- [ ] Xác nhận cách phân biệt check-in/check-out
- [ ] Xác nhận tần suất tối đa gọi API
- [ ] Xác nhận cách xử lý pagination (nếu có)
- [ ] Xác nhận cách xử lý duplicate data

---

## 15. 📌 Lưu ý Quan trọng

1. **Cấu trúc dữ liệu**: Cần thống nhất cấu trúc dữ liệu trước khi bắt đầu phát triển
2. **Mapping nhân viên**: Field `employeeCode` là quan trọng nhất để mapping, cần đảm bảo khớp với `ma_cham_cong` trong HR System
3. **Timezone**: Tất cả thời gian phải đúng GMT+7, cần xác nhận từ EPAD
4. **Test trước**: Luôn test kỹ trên môi trường test trước khi deploy production
5. **Error handling**: Cần xử lý đầy đủ các trường hợp lỗi và edge cases
6. **Documentation**: Cần cập nhật documentation khi có thay đổi API

---

**Ngày cập nhật cuối**: 2025-01-XX  
**Phiên bản**: 1.0  
**Trạng thái**: ⏳ Đang chờ phản hồi từ THS
