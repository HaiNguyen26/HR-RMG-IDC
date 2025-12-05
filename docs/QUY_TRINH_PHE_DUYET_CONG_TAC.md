# Quy Trình Phê Duyệt Công Tác - Tình Trạng Hiện Tại

## 📋 Tổng Quan

Module "Phê duyệt công tác" cho phép quản lý phê duyệt các yêu cầu kinh phí công tác từ nhân viên.

## ✅ Đã Hoàn Thành

### 1. Backend API (`backend/routes/travelExpenses.js`)

#### ✅ Database Schema
- Bảng `travel_expense_requests` đã có đầy đủ các trường:
  - `status`: PENDING_LEVEL_1, PENDING_CEO, PENDING_FINANCE, APPROVED, REJECTED
  - `current_step`: LEVEL_1, CEO, FINANCE, COMPLETED
  - `manager_id`, `manager_decision`, `manager_notes`, `manager_decision_at`
  - `ceo_id`, `ceo_decision`, `ceo_notes`, `ceo_decision_at`
  - `finance_id`, `finance_decision`, `finance_notes`, `finance_decision_at`

#### ✅ API Endpoints
- `GET /travel-expenses`: Lấy danh sách yêu cầu (có filter theo status)
- `GET /travel-expenses/:id`: Lấy chi tiết yêu cầu
- `POST /travel-expenses`: Tạo yêu cầu mới
- `POST /travel-expenses/:id/decision`: Phê duyệt/từ chối yêu cầu

#### ✅ Logic Phê Duyệt Backend
- **MANAGER**: 
  - Chỉ xử lý khi `status = PENDING_LEVEL_1`
  - Nếu APPROVE:
    - Nếu `requires_ceo = true` → chuyển sang `PENDING_CEO`, `current_step = CEO`
    - Nếu `requires_ceo = false` → chuyển sang `PENDING_FINANCE`, `current_step = FINANCE`
  - Nếu REJECT → `status = REJECTED`, `current_step = MANAGER`

- **CEO**:
  - Chỉ xử lý khi `status = PENDING_CEO` và `requires_ceo = true`
  - Nếu APPROVE → chuyển sang `PENDING_FINANCE`, `current_step = FINANCE`
  - Nếu REJECT → `status = REJECTED`, `current_step = CEO`

- **FINANCE**:
  - Chỉ xử lý khi `status = PENDING_FINANCE`
  - Nếu APPROVE → `status = APPROVED`, `current_step = COMPLETED`
  - Nếu REJECT → `status = REJECTED`, `current_step = FINANCE`

#### ✅ Approval Flow Mapping
- Hàm `mapRowToResponse()` trả về `approvalFlow` array với các bước:
  1. STEP_EMPLOYEE: Nhân viên gửi yêu cầu (COMPLETED)
  2. STEP_MANAGER: Quản lý phê duyệt (PENDING/APPROVED/REJECTED)
  3. STEP_CEO: Tổng Giám đốc phê duyệt (nếu requires_ceo = true)
  4. STEP_FINANCE: Kế toán/HR phê duyệt cuối (PENDING/APPROVED/REJECTED)

### 2. Frontend Component (`frontend/src/components/TravelExpenseApproval/`)

#### ✅ UI Layout
- Header với tiêu đề "Phê duyệt công tác"
- Container cố định chiều cao 951px (giống TravelExpenseManagement)
- Layout 2 cột:
  - **Cột trái (33%)**: Danh sách yêu cầu chờ duyệt
  - **Cột phải (67%)**: Chi tiết yêu cầu và form phê duyệt

#### ✅ Danh Sách Yêu Cầu
- Hiển thị các yêu cầu có `status = PENDING_LEVEL_1` hoặc `PENDING_LEVEL_2`
- Hiển thị: Mã yêu cầu, Tên nhân viên, Chi nhánh, Tag (Trong nước/Nước ngoài)
- Tìm kiếm theo mã, tên, chi nhánh
- Danh sách có thể cuộn

#### ✅ Chi Tiết Yêu Cầu
- Thẻ phân loại luồng (Công tác Nội địa/Nước ngoài)
- Thông tin chi tiết: Mã, Tên nhân viên, Chi nhánh, Địa điểm, Ngày bắt đầu/kết thúc
- Mục đích chi tiết & căn cứ

#### ✅ Form Phê Duyệt
- Textarea để nhập ghi chú
- 2 nút: "DUYỆT" (màu xanh) và "TỪ CHỐI" (màu đỏ)
- Validation: Yêu cầu nhập ghi chú trước khi duyệt/từ chối

## ❌ Còn Thiếu / Cần Phát Triển

### 1. ⚠️ Vấn Đề Quan Trọng: Frontend chưa truyền `actorRole` và `actorId`

**Vấn đề hiện tại:**
```javascript
// Frontend đang gọi:
await travelExpensesAPI.decide(selectedRequestId, {
  decision: 'APPROVE',
  notes: approvalNote
});

// Nhưng Backend yêu cầu:
{
  actorRole: 'MANAGER' | 'CEO' | 'FINANCE',
  actorId: currentUser.id,
  decision: 'APPROVE' | 'REJECT',
  notes: string
}
```

**Cần sửa:**
- Xác định `actorRole` dựa trên:
  - `currentUser.role` (EMPLOYEE, HR, ADMIN)
  - `selectedRequest.status` (PENDING_LEVEL_1 → MANAGER, PENDING_CEO → CEO, PENDING_FINANCE → FINANCE)
  - Hoặc kiểm tra xem user có phải là quản lý trực tiếp của nhân viên không

### 2. 🔍 Xác Định Vai Trò Người Dùng

**Cần phát triển logic:**
- **MANAGER**: 
  - User có `role = 'EMPLOYEE'` và là quản lý trực tiếp của nhân viên tạo yêu cầu
  - Hoặc user có `role = 'MANAGER'` (nếu có trong hệ thống)
  - Chỉ thấy các yêu cầu có `status = PENDING_LEVEL_1`

- **CEO**:
  - User có `role = 'ADMIN'` hoặc `role = 'CEO'` (nếu có)
  - Chỉ thấy các yêu cầu có `status = PENDING_CEO` và `requires_ceo = true`

- **FINANCE/HR**:
  - User có `role = 'HR'`
  - Chỉ thấy các yêu cầu có `status = PENDING_FINANCE`

### 3. 📊 Hiển Thị Approval Flow

**Cần thêm:**
- Hiển thị timeline/flow chart cho thấy:
  - Bước nào đã hoàn thành (✓)
  - Bước nào đang chờ (⏳)
  - Bước nào bị từ chối (✗)
- Hiển thị thông tin người phê duyệt, thời gian, ghi chú

### 4. 🔄 Filter Theo Trạng Thái

**Cần thêm:**
- Filter tabs để xem:
  - Tất cả yêu cầu chờ duyệt
  - Chờ quản lý duyệt (PENDING_LEVEL_1)
  - Chờ CEO duyệt (PENDING_CEO) - nếu user là CEO
  - Chờ HR duyệt (PENDING_FINANCE) - nếu user là HR

### 5. 📝 Hiển Thị Lịch Sử Phê Duyệt

**Cần thêm:**
- Hiển thị các quyết định đã được đưa ra:
  - Quản lý: Đã duyệt/từ chối vào ngày nào, ghi chú gì
  - CEO: Đã duyệt/từ chối vào ngày nào, ghi chú gì
  - HR: Đã duyệt/từ chối vào ngày nào, ghi chú gì

### 6. 🎯 Phân Quyền Theo Vai Trò

**Cần phát triển:**
- Mỗi vai trò chỉ thấy và xử lý các yêu cầu phù hợp:
  - MANAGER: Chỉ thấy yêu cầu từ nhân viên trong team của mình
  - CEO: Chỉ thấy yêu cầu công tác nước ngoài
  - HR: Thấy tất cả yêu cầu đã được duyệt bởi quản lý/CEO

### 7. 🔔 Thông Báo

**Cần thêm:**
- Thông báo khi có yêu cầu mới cần phê duyệt
- Thông báo khi yêu cầu được duyệt/từ chối
- Badge hiển thị số lượng yêu cầu chờ duyệt

## 🎯 Các Bước Tiếp Theo Để Hoàn Thiện

### Bước 1: Sửa API Call (Ưu tiên cao)
- Thêm logic xác định `actorRole` trong `TravelExpenseApproval.js`
- Truyền `actorRole` và `actorId` vào API `decide()`

### Bước 2: Xác Định Vai Trò Người Dùng
- Tạo helper function để xác định user hiện tại là MANAGER, CEO hay FINANCE
- Dựa trên `currentUser.role` và mối quan hệ với nhân viên tạo yêu cầu

### Bước 3: Filter Theo Vai Trò
- Chỉ hiển thị các yêu cầu phù hợp với vai trò của user
- Thêm filter tabs để dễ dàng chuyển đổi giữa các trạng thái

### Bước 4: Hiển Thị Approval Flow
- Thêm component hiển thị timeline/flow chart
- Hiển thị thông tin chi tiết về từng bước phê duyệt

### Bước 5: Phân Quyền Chi Tiết
- Kiểm tra quyền truy cập dựa trên mối quan hệ quản lý
- Đảm bảo mỗi user chỉ thấy và xử lý các yêu cầu phù hợp

## 📝 Ghi Chú

- Module hiện tại đã có UI hoàn chỉnh và backend logic đầy đủ
- Vấn đề chính là frontend chưa truyền đúng tham số `actorRole` và `actorId` cho API
- Cần xác định rõ cách phân biệt vai trò MANAGER, CEO, FINANCE trong hệ thống

