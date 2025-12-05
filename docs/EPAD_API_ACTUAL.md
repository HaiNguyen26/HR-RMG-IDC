# 📋 API THỰC TẾ TỪ NHÀ CUNG CẤP EPAD

## 🎯 Thông tin API từ nhà cung cấp

Tài liệu này mô tả API thực tế mà nhà cung cấp EPAD đã cung cấp.

---

## 📡 1. THÔNG TIN API

### Base URL
```
{api_base_url}/api/v1/timelog
```

### Authentication
- **Method**: API Token trong Header
- **Header**: `API Token: {token}` (Token do THS cung cấp khi triển khai)

---

## 🔌 2. API ENDPOINT

### GET `/api/v1/timelog/GetAttendanceLogByEmployeeIdByPrivateToken`
Lấy dữ liệu log chấm công theo mã nhân viên

**Method:** `GET`

**Headers:**
```
API Token: {token_provided_by_THS}
Content-Type: application/json
Accept: application/json
```

**Query Parameters:**
| Tên tham số | Kiểu dữ liệu | Mô tả |
|------------|-------------|-------|
| `fromDate` | string | Lấy log từ ngày (format: YYYY-MM-DD) |
| `toDate` | string | Lấy log đến ngày (format: YYYY-MM-DD) |
| `employeeId` | string | Mã nhân viên (EmployeeATID) |

**Response:**
- **Success**: Status code = 200
- **Fail**: Status code <> 200

**Response Data Structure (`IC_AttendanceLog`):**
| Tên tham số | Kiểu dữ liệu | Mô tả |
|------------|-------------|-------|
| `EmployeeATID` | String | Mã chấm công |
| `Checktime` | Datetime | Thời gian chấm công |
| `InOutMode` | Short | Trạng thái vào/ra (1: vào, 2: ra) |
| `VerifyMode` | int | Chế độ xác thực |
| `MachineSerial` | string | Số Serial máy chấm công |
| `DeviceId` | string | Mã máy |
| `CheckTimeFormat` | string | Format thời gian (yyyyMMddhhmmss, ví dụ: 20230316164600) |

**Example Request:**
```
GET {api_base_url}/api/v1/timelog/GetAttendanceLogByEmployeeIdByPrivateToken?fromDate=2025-12-01&toDate=2025-12-31&employeeId=NV001
Headers:
  API Token: your_token_here
```

**Example Response:**
```json
[
  {
    "EmployeeATID": "NV001",
    "Checktime": "2025-12-02T08:00:00",
    "InOutMode": 1,
    "VerifyMode": 1,
    "MachineSerial": "ZHM2241300038",
    "DeviceId": "DEV001",
    "CheckTimeFormat": "20251202080000"
  },
  {
    "EmployeeATID": "NV001",
    "Checktime": "2025-12-02T17:30:00",
    "InOutMode": 2,
    "VerifyMode": 1,
    "MachineSerial": "ZHM2241300038",
    "DeviceId": "DEV001",
    "CheckTimeFormat": "20251202173000"
  }
]
```

---

## 🗄️ 3. DATABASE SCHEMA

### Bảng: `TA_TimeLog`
Bảng tích hợp dữ liệu điểm danh

| Column | Type | Description |
|--------|------|-------------|
| `EmployeeATID` | nvarchar(30) | Mã chấm công |
| `Time` | datetime | Giờ điểm danh |
| `CompanyIndex` | int | dành riêng cho ezHR9 |
| `MachineSerial` | nvarchar(20) | Máy chấm công |
| `InOutMode` | smallint | 1: vào, 2: ra |
| `SpecifiedMode` | smallint | Chế độ điểm danh |
| `Action` | varchar(5) | dành riêng cho Tinh Hoa |
| `UpdatedDate` | datetime | dành riêng cho Tinh Hoa |
| `UpdatedUser` | nvarchar(100) | dành riêng cho Tinh Hoa |
| `EventIndex` | bigint | dành riêng cho Tinh Hoa |
| `Suggest` | bit | dành riêng cho Tinh Hoa |

---

## 📝 4. MAPPING DỮ LIỆU

### Mapping từ API Response sang HR System

| API Field | HR System Field | Notes |
|-----------|----------------|-------|
| `EmployeeATID` | `employeeCode` | Mã nhân viên |
| `Checktime` | `checkInTime` / `checkOutTime` | Dựa vào `InOutMode` |
| `InOutMode` | `type` | 1 = CHECK_IN, 2 = CHECK_OUT |
| `VerifyMode` | `verifyMode` | Chế độ xác thực |
| `MachineSerial` | `deviceSerial` | Serial máy chấm công |
| `DeviceId` | `deviceId` | Mã máy |

### Logic xử lý:
1. **Check-in**: `InOutMode = 1` → Lưu vào `checkInTime`
2. **Check-out**: `InOutMode = 2` → Lưu vào `checkOutTime`
3. **Tính giờ làm việc**: `checkOutTime - checkInTime` (trong cùng ngày)
4. **Xác định trạng thái**: So sánh với giờ quy định để xác định muộn/sớm

---

## 🔄 5. QUY TRÌNH TÍCH HỢP

### Bước 1: Lấy dữ liệu từ EPAD API
```javascript
// Gọi API để lấy attendance logs
const response = await fetch(
  `${API_BASE_URL}/api/v1/timelog/GetAttendanceLogByEmployeeIdByPrivateToken?` +
  `fromDate=2025-12-01&toDate=2025-12-31&employeeId=NV001`,
  {
    headers: {
      'API Token': EPAD_API_TOKEN
    }
  }
);

const logs = await response.json();
```

### Bước 2: Xử lý và chuyển đổi dữ liệu
```javascript
// Nhóm logs theo ngày và nhân viên
const attendanceByDate = {};
logs.forEach(log => {
  const date = log.Checktime.split('T')[0];
  const key = `${log.EmployeeATID}_${date}`;
  
  if (!attendanceByDate[key]) {
    attendanceByDate[key] = {
      employeeCode: log.EmployeeATID,
      date: date,
      checkIns: [],
      checkOuts: []
    };
  }
  
  if (log.InOutMode === 1) {
    attendanceByDate[key].checkIns.push(log.Checktime);
  } else if (log.InOutMode === 2) {
    attendanceByDate[key].checkOuts.push(log.Checktime);
  }
});
```

### Bước 3: Tính toán và lưu vào database
```javascript
// Tính giờ làm việc và lưu vào HR system
Object.values(attendanceByDate).forEach(attendance => {
  const checkInTime = attendance.checkIns[0]; // Lấy check-in đầu tiên
  const checkOutTime = attendance.checkOuts[attendance.checkOuts.length - 1]; // Lấy check-out cuối cùng
  
  const workHours = calculateWorkHours(checkInTime, checkOutTime);
  const status = determineStatus(checkInTime, checkOutTime);
  
  // Lưu vào database HR system
  saveAttendanceRecord({
    employeeCode: attendance.employeeCode,
    date: attendance.date,
    checkInTime,
    checkOutTime,
    workHours,
    status
  });
});
```

---

## ⚠️ 6. LƯU Ý QUAN TRỌNG

### 6.1. Authentication
- Token được cung cấp bởi THS khi triển khai
- Token có thể có thời hạn hoặc không (cần xác nhận với nhà cung cấp)
- Cần bảo mật token, không commit vào code

### 6.2. Rate Limiting
- Chưa có thông tin về rate limiting
- Cần hỏi nhà cung cấp về giới hạn số lượng requests

### 6.3. Date Format
- API nhận `fromDate` và `toDate` dạng string
- Format: `YYYY-MM-DD` (cần xác nhận)
- Response `Checktime` là Datetime
- `CheckTimeFormat` là string format `yyyyMMddhhmmss`

### 6.4. InOutMode
- `1` = Vào (Check-in)
- `2` = Ra (Check-out)
- Một nhân viên có thể có nhiều lần check-in/check-out trong ngày

### 6.5. VerifyMode
- Chưa có thông tin chi tiết về các giá trị
- Cần hỏi nhà cung cấp về mapping:
  - 1 = Vân tay?
  - 2 = Khuôn mặt?
  - 3 = Thẻ?
  - v.v.

### 6.6. Pagination
- API không có pagination
- Cần lấy dữ liệu theo từng nhân viên và khoảng thời gian
- Nếu có nhiều nhân viên, cần gọi API nhiều lần

---

## ❓ 7. CÂU HỎI CẦN LÀM RÕ VỚI NHÀ CUNG CẤP

1. **API Token**:
   - Token có thời hạn không?
   - Có refresh token không?
   - Cách lấy token mới nếu hết hạn?

2. **Rate Limiting**:
   - Có giới hạn số lượng requests/phút không?
   - Có cách nào để tăng limit không?

3. **Date Format**:
   - Format chính xác của `fromDate` và `toDate`?
   - Timezone nào được sử dụng?

4. **VerifyMode**:
   - Mapping chi tiết các giá trị VerifyMode?
   - 1 = ?, 2 = ?, 3 = ?, v.v.

5. **Pagination**:
   - Có API nào hỗ trợ lấy tất cả nhân viên không?
   - Có giới hạn số lượng records trả về không?

6. **Các API khác**:
   - Có API nào khác không? (lấy danh sách nhân viên, thiết bị, v.v.)
   - Có webhook để nhận dữ liệu real-time không?

7. **Error Handling**:
   - Format của error response?
   - Các error codes?

---

## 📞 8. LIÊN HỆ

**Nhà cung cấp:** THS (Tinh Hoa Solutions)  
**API Base URL:** `{api_base_url}` (cần xác nhận)  
**API Token:** Được cung cấp khi triển khai

---

**Tài liệu này được tạo ngày:** 2025-12-02  
**Phiên bản:** 1.0  
**Nguồn:** Nhà cung cấp EPAD

