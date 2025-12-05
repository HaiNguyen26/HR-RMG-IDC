# 📋 YÊU CẦU CẤU TRÚC API CHO TÍCH HỢP EPAD

## 🎯 Mục đích
Tài liệu này mô tả cấu trúc API mong muốn để tích hợp hệ thống EPAD với HR Management System.

---

## 📡 1. CẤU TRÚC API TỔNG QUAN

### Base URL
```
http://115.73.210.113:4001/api
```

### API Versioning
Khuyến nghị sử dụng version trong URL:
```
/api/v1/attendance
/api/v1/employees
/api/v1/devices
```

---

## 🔐 2. AUTHENTICATION

### Phương thức: Bearer Token (JWT)
```
Authorization: Bearer {token}
```

### Request Headers
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json
```

### Token Expiry
- Access Token: Có thời hạn (ví dụ: 24 giờ)
- Refresh Token: Để renew access token (nếu có)

---

## 📊 3. RESPONSE FORMAT CHUẨN

### Success Response
```json
{
  "success": true,
  "data": {
    // Dữ liệu trả về
  },
  "message": "Thành công",
  "timestamp": "2025-12-02T07:49:11Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ATTENDANCE_NOT_FOUND",
    "message": "Không tìm thấy dữ liệu chấm công",
    "details": {}
  },
  "timestamp": "2025-12-02T07:49:11Z"
}
```

### Pagination Response
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 📋 4. API ENDPOINTS CẦN THIẾT

### 4.1. Authentication

#### POST `/api/auth/login`
Đăng nhập để lấy token

**Request:**
```json
{
  "username": "admin@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "refreshToken": "refresh_token_here"
  }
}
```

#### POST `/api/auth/refresh`
Làm mới access token bằng refresh token

**Request:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "new_access_token",
    "expiresIn": 86400
  }
}
```

---

### 4.2. Attendance (Chấm công)

#### GET `/api/attendance`
Lấy danh sách chấm công

**Query Parameters:**
```
page: 1 (số trang)
limit: 50 (số lượng mỗi trang)
startDate: 2025-12-01 (ngày bắt đầu, format: YYYY-MM-DD)
endDate: 2025-12-31 (ngày kết thúc, format: YYYY-MM-DD)
employeeId: 123 (ID nhân viên, optional)
deviceId: 456 (ID thiết bị, optional)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "employeeId": 123,
        "employeeCode": "NV001",
        "employeeName": "Nguyễn Văn A",
        "deviceId": 456,
        "deviceName": "ZKTeco SmartFace 680",
        "deviceIP": "192.168.1.226",
        "checkInTime": "2025-12-02T08:00:00Z",
        "checkOutTime": "2025-12-02T17:30:00Z",
        "date": "2025-12-02",
        "workHours": 9.5,
        "status": "COMPLETE", // COMPLETE, LATE, EARLY, MISSING_CHECKIN, MISSING_CHECKOUT
        "lateMinutes": 0, // Số phút muộn (nếu có)
        "earlyMinutes": 0, // Số phút sớm (nếu có)
        "verifyMode": "FACE", // FACE, FINGERPRINT, CARD, PASSWORD
        "notes": "", // Ghi chú (nếu có)
        "imageUrl": "", // URL hình ảnh chấm công (nếu thiết bị hỗ trợ)
        "createdAt": "2025-12-02T08:00:05Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2
    }
  }
}
```

#### GET `/api/attendance/:id`
Lấy chi tiết một bản ghi chấm công

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "employeeId": 123,
    "employeeCode": "NV001",
    "employeeName": "Nguyễn Văn A",
    "deviceId": 456,
    "deviceName": "ZKTeco SmartFace 680",
    "deviceIP": "192.168.1.226",
    "checkInTime": "2025-12-02T08:00:00Z",
    "checkOutTime": "2025-12-02T17:30:00Z",
    "date": "2025-12-02",
    "workHours": 9.5,
    "status": "COMPLETE",
    "verifyMode": "FACE",
    "createdAt": "2025-12-02T08:00:05Z"
  }
}
```

#### GET `/api/attendance/export`
Export dữ liệu chấm công (CSV/Excel/PDF)

**Query Parameters:**
```
startDate: 2025-12-01
endDate: 2025-12-31
format: csv | excel | pdf (default: csv)
employeeIds: 123,456,789 (optional, comma-separated)
departmentIds: 1,2,3 (optional, comma-separated)
status: COMPLETE | LATE | EARLY | MISSING_CHECKIN | MISSING_CHECKOUT (optional)
```

**Response:**
- File download (CSV, Excel hoặc PDF)

#### GET `/api/attendance/statistics`
Thống kê chấm công

**Query Parameters:**
```
startDate: 2025-12-01
endDate: 2025-12-31
employeeId: 123 (optional)
departmentId: 1 (optional)
groupBy: day | week | month (default: day)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCheckIns": 2000,
      "totalEmployees": 100,
      "averageWorkHours": 8.5,
      "totalLateCheckIns": 50,
      "totalEarlyCheckOuts": 30,
      "totalMissingCheckIns": 10,
      "totalMissingCheckOuts": 5,
      "onTimeRate": 95.5
    },
    "details": [
      {
        "date": "2025-12-02",
        "checkIns": 100,
        "averageWorkHours": 8.5,
        "lateCheckIns": 5,
        "earlyCheckOuts": 3,
        "missingCheckIns": 1,
        "missingCheckOuts": 0
      }
    ]
  }
}
```

---

### 4.3. Employees (Nhân viên)

#### GET `/api/employees`
Lấy danh sách nhân viên

**Query Parameters:**
```
page: 1
limit: 50
search: "Nguyễn" (tìm kiếm theo tên)
status: ACTIVE | INACTIVE (optional)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 123,
        "employeeCode": "NV001",
        "name": "Nguyễn Văn A",
        "email": "nguyenvana@example.com",
        "department": "IT",
        "position": "Developer",
        "status": "ACTIVE",
        "registeredDevices": [456, 457] // IDs của các thiết bị đã đăng ký
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 200
    }
  }
}
```

#### GET `/api/employees/:id`
Lấy thông tin chi tiết một nhân viên

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "employeeCode": "NV001",
    "name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "phone": "0901234567",
    "department": "IT",
    "position": "Developer",
    "status": "ACTIVE",
    "registeredDevices": [
      {
        "deviceId": 456,
        "deviceName": "ZKTeco SmartFace 680",
        "deviceIP": "192.168.1.226",
        "registeredAt": "2025-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### 4.4. Devices (Thiết bị)

#### GET `/api/devices`
Lấy danh sách thiết bị chấm công

**Query Parameters:**
```
page: 1
limit: 50
status: ONLINE | OFFLINE (optional)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 456,
        "deviceCode": "ZHM2241300038",
        "deviceName": "ZKTeco SmartFace 680",
        "deviceType": "SMARTFACE_680",
        "ipAddress": "192.168.1.226",
        "port": 4370,
        "status": "ONLINE",
        "location": "Văn phòng Hà Nội",
        "lastSync": "2025-12-02T07:49:11Z",
        "registeredEmployees": 50
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 5
    }
  }
}
```

#### GET `/api/devices/:id`
Lấy thông tin chi tiết một thiết bị

---

### 4.5. Reports (Báo cáo)

#### GET `/api/reports/attendance-summary`
Báo cáo tổng hợp chấm công

**Query Parameters:**
```
startDate: 2025-12-01
endDate: 2025-12-31
employeeIds: 123,456 (optional)
departmentIds: 1,2 (optional)
groupBy: day | week | month | quarter | year (default: day)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalEmployees": 100,
      "totalCheckIns": 2000,
      "averageWorkHours": 8.5,
      "lateCheckIns": 50,
      "earlyCheckOuts": 30,
      "missingCheckIns": 10,
      "missingCheckOuts": 5,
      "onTimeRate": 95.5
    },
    "details": [
      {
        "date": "2025-12-02",
        "totalCheckIns": 100,
        "averageWorkHours": 8.5,
        "lateCheckIns": 5,
        "earlyCheckOuts": 3,
        "missingCheckIns": 1,
        "missingCheckOuts": 0
      }
    ]
  }
}
```

#### GET `/api/reports/employee-attendance`
Báo cáo chấm công theo nhân viên

**Query Parameters:**
```
employeeId: 123 (required)
startDate: 2025-12-01
endDate: 2025-12-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "employee": {
      "id": 123,
      "employeeCode": "NV001",
      "name": "Nguyễn Văn A",
      "department": "IT"
    },
    "summary": {
      "totalWorkDays": 22,
      "totalWorkHours": 176,
      "averageWorkHours": 8.0,
      "lateCheckIns": 2,
      "earlyCheckOuts": 1,
      "missingCheckIns": 0,
      "missingCheckOuts": 0
    },
    "attendance": [
      {
        "date": "2025-12-02",
        "checkInTime": "2025-12-02T08:00:00Z",
        "checkOutTime": "2025-12-02T17:00:00Z",
        "workHours": 8.0,
        "status": "COMPLETE"
      }
    ]
  }
}
```

#### GET `/api/reports/department-attendance`
Báo cáo chấm công theo phòng ban

**Query Parameters:**
```
departmentId: 1 (optional, nếu không có thì trả về tất cả)
startDate: 2025-12-01
endDate: 2025-12-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "department": {
      "id": 1,
      "name": "IT"
    },
    "summary": {
      "totalEmployees": 20,
      "totalCheckIns": 440,
      "averageWorkHours": 8.2,
      "lateCheckIns": 10,
      "earlyCheckOuts": 5
    },
    "employees": [
      {
        "employeeId": 123,
        "employeeCode": "NV001",
        "name": "Nguyễn Văn A",
        "totalWorkHours": 176,
        "lateCheckIns": 2
      }
    ]
  }
}
```

---

## 🔄 5. WEBHOOK (Nếu hỗ trợ)

### 5.1. Webhook Configuration
Cho phép đăng ký webhook để nhận dữ liệu real-time

#### POST `/api/webhooks`
Đăng ký webhook

**Request:**
```json
{
  "url": "https://hr-system.example.com/api/webhooks/attendance",
  "events": ["attendance.created", "attendance.updated"],
  "secret": "webhook_secret_key"
}
```

### 5.2. Webhook Payload
Khi có sự kiện chấm công mới, EPAD sẽ gửi POST request đến URL đã đăng ký:

```json
{
  "event": "attendance.created",
  "timestamp": "2025-12-02T08:00:05Z",
  "data": {
    "id": 1,
    "employeeId": 123,
    "employeeCode": "NV001",
    "employeeName": "Nguyễn Văn A",
    "deviceId": 456,
    "checkInTime": "2025-12-02T08:00:00Z",
    "verifyMode": "FACE"
  },
  "signature": "hmac_sha256_signature"
}
```

---

## 📝 6. QUY ƯỚC CHUNG

### 6.1. HTTP Methods
- `GET`: Lấy dữ liệu
- `POST`: Tạo mới
- `PUT`: Cập nhật toàn bộ
- `PATCH`: Cập nhật một phần
- `DELETE`: Xóa

### 6.2. Status Codes
- `200 OK`: Thành công
- `201 Created`: Tạo mới thành công
- `400 Bad Request`: Request không hợp lệ
- `401 Unauthorized`: Chưa xác thực
- `403 Forbidden`: Không có quyền
- `404 Not Found`: Không tìm thấy
- `500 Internal Server Error`: Lỗi server

### 6.3. Date/Time Format
- Format: ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`)
- Timezone: UTC (hoặc có thể chỉ định timezone)

### 6.4. Pagination
- Mặc định: `page=1`, `limit=50`
- Tối đa: `limit=1000`

### 6.5. Filtering & Sorting
```
?filter[status]=ACTIVE
&filter[department]=IT
&filter[startDate]=2025-12-01
&filter[endDate]=2025-12-31
&sort=createdAt:desc
&sort=name:asc
```

### 6.6. Search
Tìm kiếm trong các endpoints:
```
?search=Nguyễn (tìm kiếm theo tên nhân viên, mã nhân viên)
?search=NV001 (tìm kiếm theo mã nhân viên)
```

---

## 🔒 7. SECURITY

### 7.1. Rate Limiting
- Khuyến nghị: 100 requests/phút/IP
- Response khi vượt limit:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Quá nhiều requests. Vui lòng thử lại sau.",
    "retryAfter": 60
  }
}
```

### 7.2. CORS
Cho phép CORS từ domain của HR system:
```
Access-Control-Allow-Origin: https://hr-system.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

---

## 📞 8. LIÊN HỆ

Nếu có thắc mắc về cấu trúc API này, vui lòng liên hệ:
- Email: [email của bạn]
- Phone: [số điện thoại]

---

## ✅ 9. CHECKLIST

Nhà cung cấp EPAD cần cung cấp:

### 9.1. Tài liệu và Hỗ trợ
- [ ] API Documentation đầy đủ
- [ ] Sample code/Postman collection
- [ ] Test credentials để test API
- [ ] Hỗ trợ kỹ thuật tích hợp

### 9.2. Authentication
- [ ] Authentication method (Bearer Token)
- [ ] Refresh token mechanism
- [ ] Token expiry handling

### 9.3. Attendance Endpoints
- [ ] Endpoint để lấy danh sách attendance (với pagination)
- [ ] Endpoint để lấy chi tiết attendance
- [ ] Endpoint để export attendance (CSV/Excel/PDF)
- [ ] Endpoint để thống kê attendance
- [ ] Hỗ trợ filter theo: ngày, nhân viên, phòng ban, trạng thái
- [ ] Hỗ trợ search theo tên/mã nhân viên

### 9.4. Employees Endpoints
- [ ] Endpoint để lấy danh sách employees
- [ ] Endpoint để lấy chi tiết employee
- [ ] Hỗ trợ filter và search

### 9.5. Devices Endpoints
- [ ] Endpoint để lấy danh sách devices
- [ ] Endpoint để lấy chi tiết device
- [ ] Thông tin trạng thái thiết bị (ONLINE/OFFLINE)

### 9.6. Reports Endpoints
- [ ] Endpoint báo cáo tổng hợp
- [ ] Endpoint báo cáo theo nhân viên
- [ ] Endpoint báo cáo theo phòng ban
- [ ] Hỗ trợ groupBy: day/week/month/quarter/year

### 9.7. Tính năng
- [ ] Pagination support
- [ ] Filtering & Sorting support
- [ ] Search support
- [ ] Error handling chuẩn
- [ ] Rate limiting information
- [ ] Webhook support (nếu có)
- [ ] Real-time sync (nếu có)

### 9.8. Dữ liệu cần thiết
- [ ] Thời gian check-in/check-out chính xác
- [ ] Tổng số giờ làm việc
- [ ] Trạng thái chấm công (Đúng giờ, Muộn, Sớm, Thiếu)
- [ ] Số phút muộn/sớm
- [ ] Phương thức xác thực (Vân tay, Khuôn mặt, Thẻ)
- [ ] Thông tin thiết bị (Tên, IP, Vị trí)
- [ ] Hình ảnh chấm công (nếu có)

---

---

## 📌 10. LƯU Ý QUAN TRỌNG

### 10.1. Đồng bộ dữ liệu
- **Real-time sync**: Ưu tiên nếu có webhook để nhận dữ liệu ngay khi có chấm công mới
- **Scheduled sync**: Nếu không có webhook, cần API để đồng bộ định kỳ (theo giờ/ngày)
- **Manual sync**: Cho phép đồng bộ thủ công khi cần

### 10.2. Tính công tự động
- Tính số giờ làm việc dựa trên check-in và check-out
- Xác định trạng thái: Đúng giờ, Muộn, Sớm, Thiếu check-in/check-out
- Tính giờ làm thêm (OT) nếu có

### 10.3. Cảnh báo
- Cảnh báo khi nhân viên muộn
- Cảnh báo khi thiếu chấm công
- Cảnh báo khi giờ làm việc không đủ

### 10.4. Tích hợp với các module khác
- Tích hợp với module nghỉ phép để tính công chính xác
- Tích hợp với module tăng ca để tính giờ OT
- Tích hợp với module lương để tính lương theo công

---

---

## 📄 11. THAM KHẢO API THỰC TẾ

Nhà cung cấp EPAD đã cung cấp API thực tế. Xem chi tiết trong file:
- `docs/EPAD_API_ACTUAL.md` - API thực tế từ nhà cung cấp

**Tóm tắt API thực tế:**
- Endpoint: `GET /api/v1/timelog/GetAttendanceLogByEmployeeIdByPrivateToken`
- Authentication: API Token trong Header
- Parameters: `fromDate`, `toDate`, `employeeId`
- Response: Array of `IC_AttendanceLog` objects

**Lưu ý:** API thực tế khác với yêu cầu ban đầu. Cần điều chỉnh tích hợp cho phù hợp.

---

**Tài liệu này được tạo ngày:** 2025-12-02  
**Cập nhật lần cuối:** 2025-12-02  
**Phiên bản:** 1.2

