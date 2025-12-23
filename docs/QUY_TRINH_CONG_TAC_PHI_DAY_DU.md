# Quy Trình Công Tác Phí - Tài Liệu Đầy Đủ

## 📊 TỔNG QUAN

Tài liệu này mô tả đầy đủ quy trình công tác phí từ khởi tạo đến giải ngân, bao gồm flow hoạt động, các module đã triển khai, và chi tiết kỹ thuật.

**Trạng thái tổng thể**: Hệ thống đã hoàn thành **100%** của quy trình đầy đủ.

---

## 🔄 FLOW - QUY TRÌNH HOẠT ĐỘNG

### **TỔNG QUAN FLOW**

Quy trình công tác phí được chia thành 2 giai đoạn chính:

**GIAI ĐOẠN 1: KHỞI TẠO VÀ PHÊ DUYỆT** (Bước 1-4)
1. Nhân viên tạo yêu cầu công tác
2. Quản lý trực tiếp phê duyệt (Cấp 1)
3. Giám đốc Chi nhánh phê duyệt (Cấp 2)
4. Tổng Giám đốc phê duyệt (nếu công tác nước ngoài)
5. HR xử lý tạm ứng
6. Kế toán xác nhận chuyển khoản tạm ứng

**GIAI ĐOẠN 2: HOÀN ỨNG VÀ QUYẾT TOÁN** (Bước 5-7)
7. Nhân viên submit báo cáo hoàn ứng
8. HR xác nhận báo cáo
9. Kế toán kiểm tra, quyết toán và giải ngân (nếu đầy đủ chứng từ hợp lệ)
10. CEO/Admin phê duyệt ngoại lệ (nếu vượt ngân sách, sau đó kế toán giải ngân)

---

### **CHI TIẾT FLOW**

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUY TRÌNH CÔNG TÁC PHÍ                       │
└─────────────────────────────────────────────────────────────────┘

[1] KHỞI TẠO YÊU CẦU (Nhân viên)
    ├─ Nhập: Mục đích, Công ty, Địa điểm, Thời gian
    ├─ Tự nhập: Số tiền cần tạm ứng (requested_advance_amount)
    ├─ Tự động: Kiểm tra qua đêm, Kiểm tra nước ngoài
    └─ Tự động: Cấp phí sinh hoạt (EU: 60 USD, Asian: 40 USD)
          │
          ↓
    Status: PENDING_LEVEL_1

[2] PHÊ DUYỆT CẤP 1 (Quản lý Trực tiếp)
    ├─ Xem xét tính cần thiết
    ├─ Duyệt/Từ chối với ghi chú
    └─ Nếu Duyệt:
          │
          ↓
    Status: PENDING_LEVEL_2

[3] PHÊ DUYỆT CẤP 2 (Giám đốc Chi nhánh)
    ├─ Xem xét yêu cầu
    ├─ Duyệt/Từ chối với ghi chú
    └─ Nếu Duyệt:
          │
          ↓
    ┌─────┴─────┐
    │           │
    ↓           ↓
[Nước ngoài] [Trong nước]
    │           │
    ↓           ↓

[4] PHÊ DUYỆT CEO (Tổng Giám đốc) - CHỈ CÔNG TÁC NƯỚC NGOÀI
    ├─ Xem xét yêu cầu nước ngoài
    ├─ Duyệt/Từ chối với ghi chú
    └─ Nếu Duyệt:
          │
          ↓
    Status: PENDING_FINANCE
          │
          ↓ (hoặc từ Cấp 2 - Trong nước)

[5] XỬ LÝ TẠM ỨNG (HR)
    ├─ Xem số tiền nhân viên yêu cầu
    ├─ Chọn: HR đặt dịch vụ HOẶC Nhân viên tự đặt
    ├─ Xác nhận/Điều chỉnh số tiền tạm ứng
    ├─ Chọn hình thức thanh toán
    └─ Gửi yêu cầu cho Kế toán
          │
          ↓
    advance_status: PENDING_ACCOUNTANT

[6] XÁC NHẬN CHUYỂN KHOẢN TẠM ỨNG (Kế toán)
    ├─ Xem thông tin tạm ứng
    ├─ Thực hiện chuyển khoản
    └─ Xác nhận đã chuyển khoản
          │
          ↓
    advance_status: TRANSFERRED
    Status: PENDING_SETTLEMENT

[7] BÁO CÁO HOÀN ỨNG (Nhân viên)
    ├─ Nhập chi phí thực tế (actual_expense)
    ├─ Upload hóa đơn/chứng từ
    ├─ Ghi chú chi tiết
    └─ Submit báo cáo
          │
          ↓
    settlement_status: SUBMITTED

[8] XÁC NHẬN BÁO CÁO (HR)
    ├─ Xem báo cáo và chứng từ
    ├─ Xác nhận tính hợp lệ
    └─ Xác nhận báo cáo
          │
          ↓
    settlement_status: HR_CONFIRMED
    Status: PENDING_ACCOUNTANT

[9] KIỂM TRA, QUYẾT TOÁN & GIẢI NGÂN (Kế toán)
    ├─ Xem hóa đơn/chứng từ
    ├─ Đối chiếu: Chi phí thực tế vs Số tiền tạm ứng
    └─ Logic quyết định:
          │
          ├─ [Chi phí <= Tạm ứng + Đầy đủ chứng từ hợp lệ]
          │     ├─ Hoàn ứng = Chi phí thực tế
          │     ├─ Nếu Chi phí < Tạm ứng → Nhân viên hoàn trả phần dư
          │     ├─ Chọn phương thức thanh toán (Chuyển khoản/Tiền mặt/Khác)
          │     ├─ Nhập số tham chiếu giao dịch
          │     ├─ Xác nhận giải ngân ngay
          │     └─ Status: SETTLED
          │           │
          │           └─→ [HOÀN THÀNH QUY TRÌNH]
          │
          └─ [Chi phí > Tạm ứng]
                ├─ Hoàn ứng = Số tiền tạm ứng
                ├─ Phần vượt = Chi phí - Tạm ứng
                └─ Status: PENDING_EXCEPTION_APPROVAL
                      │
                      ↓

[10] PHÊ DUYỆT NGOẠI LỆ (CEO/Admin)
     ├─ Xem thông tin vượt ngân sách
     ├─ Xem chứng từ liên quan
     ├─ Duyệt/Từ chối khoản vượt
     └─ Logic:
           │
           ├─ [Duyệt]
           │     ├─ Hoàn ứng = Tạm ứng + Khoản vượt được duyệt
           │     └─ Status: SETTLED (chuyển lại cho Kế toán giải ngân)
           │
           └─ [Từ chối]
                 ├─ Hoàn ứng = Số tiền tạm ứng (không hoàn phần vượt)
                 └─ Status: SETTLED (chuyển lại cho Kế toán giải ngân)

     [Sau khi CEO duyệt/từ chối, Kế toán giải ngân tương tự như trường hợp Chi phí <= Tạm ứng]
     
     [HOÀN THÀNH QUY TRÌNH]
```

---

## ✅ CÁC BƯỚC ĐÃ HOÀN THÀNH

### **BƯỚC 1: KHỞI TẠO YÊU CẦU CÔNG TÁC (Nhân viên) - 100%**

#### Module: `TravelExpense` (`travel-expense`)

**Hoạt động:**
- Tạo yêu cầu với đầy đủ thông tin:
  - Mục đích (`purpose`)
  - Tên công ty (`company_name`)
  - Địa chỉ công ty (`company_address`)
  - Địa điểm (Trong nước/Nước ngoài) (`location`, `location_type`)
  - Ngày/Giờ Bắt đầu và Kết thúc (`start_time`, `end_time`)
  - **Số tiền cần tạm ứng** (`requested_advance_amount`) - người tạo tự điền

**Logic tự động:**
- ✅ Kiểm tra qua đêm (`is_overnight`) - tính toán nếu > 24h
- ✅ Kiểm tra nước ngoài (`location_type`, `requires_ceo`)
- ✅ Tự động cấp phí sinh hoạt dựa trên châu lục:
  - Châu Âu – EU: 60 USD (`living_allowance_amount = 60`, `living_allowance_currency = 'USD'`)
  - Châu Á – Asian: 40 USD (`living_allowance_amount = 40`, `living_allowance_currency = 'USD'`)

**Status sau khi tạo:** `PENDING_LEVEL_1`

**Sidebar Menu**: "Yêu cầu công tác" (Nhân viên)

---

### **BƯỚC 2 & 2.1: PHÊ DUYỆT CẤP 1 & 2 (Quản lý Trực tiếp / Giám đốc Chi nhánh) - 100%**

#### Module: `TravelExpenseApproval` (`travel-expense-approval`)

**BƯỚC 2: PHÊ DUYỆT CẤP 1 (Quản lý Trực tiếp)**
- ✅ Duyệt/Từ chối yêu cầu với ghi chú
- ✅ Status: `PENDING_LEVEL_1` → Nếu duyệt: `PENDING_LEVEL_2`
- ✅ Database fields: `manager_id`, `manager_decision`, `manager_notes`, `manager_decision_at`
- ✅ Xác định vai trò tự động dựa trên `quan_ly_truc_tiep` của employee

**BƯỚC 2.1: PHÊ DUYỆT CẤP 2 (Giám đốc Chi nhánh)**
- ✅ Duyệt/Từ chối yêu cầu với ghi chú
- ✅ Status: `PENDING_LEVEL_2` → Nếu duyệt:
  - Công tác nước ngoài: `PENDING_CEO` (chuyển đến Bước 3 - CEO duyệt)
  - Công tác trong nước: `PENDING_FINANCE` (chuyển thẳng đến Bước 4 - Xử lý tạm ứng, **BỎ QUA bước CEO**)
- ✅ Database fields: `branch_director_id`, `branch_director_decision`, `branch_director_notes`, `branch_director_decision_at`
- ✅ Xác định vai trò tự động dựa trên `chuc_danh` chứa "Giám đốc"

**Workflow:** Cấp 1 duyệt → Chuyển đến Cấp 2 → Sau đó mới chuyển đến CEO hoặc HR

**Sidebar Menu**: "Phê duyệt công tác" (Manager/CEO) - có badge đếm số yêu cầu chờ duyệt

---

### **BƯỚC 3: PHÊ DUYỆT CẤP ĐẶC BIỆT (Tổng Giám đốc) - 100%**

#### Module: `TravelExpenseApproval` (`travel-expense-approval`) - Dùng chung với Bước 2

**Hoạt động:**
- ✅ Chỉ xử lý công tác nước ngoài (`requires_ceo = true`)
- ✅ Duyệt/Từ chối yêu cầu với ghi chú
- ✅ Status: `PENDING_CEO` → Nếu duyệt: `PENDING_FINANCE`

**Điều kiện:**
- Phải là công tác nước ngoài (`location_type = 'INTERNATIONAL'`)
- Đã được Cấp 1 (Quản lý Trực tiếp) duyệt
- Đã được Cấp 2 (Giám đốc Chi nhánh) duyệt

**Sidebar Menu**: "Phê duyệt công tác" (CEO) - có badge đếm số yêu cầu chờ duyệt

---

### **BƯỚC 4: XỬ LÝ TẠM ỨNG (HR & Kế toán) - 90%**

#### Module HR: `TravelExpenseAdvanceProcessing` (`travel-expense-advance-processing`)

**BƯỚC 4.1: HR XỬ LÝ TẠM ỨNG**

**Trường hợp 1: HR đặt dịch vụ**
- ✅ HR nhập số tiền thực tế cần tạm ứng (`actual_advance_amount`)
- ✅ HR chọn hình thức tạm ứng (`advance_method`)
- ✅ HR nhập ghi chú về dịch vụ đã đặt

**Trường hợp 2: Nhân viên tự đặt**
- ✅ HR xác nhận số tiền tạm ứng (mặc định = `requested_advance_amount`, có thể điều chỉnh)
- ✅ HR chọn hình thức tạm ứng
- ✅ HR nhập ghi chú xác nhận

**Kết quả:**
- Status: `PENDING_FINANCE` → Giữ nguyên (đã ở trạng thái này)
- `advance_status`: `PENDING_ACCOUNTANT` (chờ Kế toán xác nhận)

**BƯỚC 4.2: KẾ TOÁN XÁC NHẬN CHUYỂN KHOẢN**

**Hoạt động:**
- ✅ Hiển thị danh sách yêu cầu tạm ứng chờ xác nhận (`advance_status = 'PENDING_ACCOUNTANT'`)
- ✅ Xem thông tin: Số tiền tạm ứng, Hình thức thanh toán, Tài khoản ngân hàng, Ghi chú từ HR
- ✅ Xác nhận đã chuyển khoản

**Kết quả:**
- `advance_status`: `TRANSFERRED`
- `advance_transferred_at`, `advance_transferred_by`: Ghi nhận thời gian và người xác nhận
- Status: `PENDING_SETTLEMENT` (chuyển sang Bước 5)

**Sidebar Menu**: "Xử lý tạm ứng" (HR/Finance)

---

### **BƯỚC 5: GHI NHẬN THỰC TẾ & HOÀN ỨNG (Nhân viên & HR) - 100%**

#### Module: `TravelExpenseSettlement` (`travel-expense-settlement`)

**BƯỚC 5.1: NHÂN VIÊN SUBMIT BÁO CÁO HOÀN ỨNG**

**Hoạt động:**
- ✅ Nhập chi phí thực tế (`actual_expense`)
- ✅ Upload Hóa đơn/Chứng từ (PDF, DOC, DOCX, JPG, PNG - tối đa 10MB/file, tối đa 10 files)
- ✅ Ghi chú chi tiết về các khoản chi

**Kết quả:**
- `settlement_status`: `SUBMITTED`
- Status: `PENDING_SETTLEMENT` → Giữ nguyên (chờ HR xác nhận)

**BƯỚC 5.2: HR XÁC NHẬN BÁO CÁO**

**Hoạt động:**
- ✅ Xem báo cáo và chứng từ đã upload
- ✅ Xác nhận tính hợp lệ
- ✅ Xác nhận báo cáo

**Kết quả:**
- `settlement_status`: `HR_CONFIRMED`
- `hr_confirmed_at`, `hr_confirmed_by`: Ghi nhận thời gian và người xác nhận
- Status: `PENDING_ACCOUNTANT` (chuyển sang Bước 6)

**Sidebar Menu**: "Quyết toán công tác" (Nhân viên)

---

### **BƯỚC 6: KIỂM TRA, QUYẾT TOÁN & GIẢI NGÂN (Kế toán) - 100%**

#### Module: `TravelExpenseAccountant` (`travel-expense-accountant`) - Tab "Kiểm tra"

**Hoạt động:**
- ✅ Xem hóa đơn/chứng từ đã upload
- ✅ Đối chiếu chi phí thực tế với số tiền tạm ứng
- ✅ Kiểm tra tính hợp lệ của chứng từ
- ✅ Tính toán và quyết toán hoàn ứng
- ✅ **Giải ngân ngay nếu đầy đủ chứng từ hợp lệ**

**Logic quyết toán:**

**Trường hợp 1: Chi phí Thực tế <= Số tiền Tạm ứng + Đầy đủ chứng từ hợp lệ**
- Hoàn ứng = Chi phí thực tế
- Nếu Chi phí < Tạm ứng → `refund_amount` = Tạm ứng - Chi phí (nhân viên cần hoàn trả)
- `reimbursement_amount` = Chi phí thực tế
- **Giải ngân ngay:**
  - Chọn phương thức thanh toán (Chuyển khoản/Tiền mặt/Khác)
  - Nhập số tham chiếu giao dịch (`payment_reference`)
  - Xác nhận giải ngân
- `payment_confirmed_at`, `payment_confirmed_by`: Ghi nhận thời gian và người xác nhận
- `final_reimbursement_amount` = `reimbursement_amount`
- Tính toán `final_status`:
  - Nếu Chi phí < Tạm ứng → `final_status` = `REFUND_REQUIRED`
  - Ngược lại → `final_status` = `SETTLED`
- Status: `SETTLED` → **HOÀN THÀNH QUY TRÌNH**

**Trường hợp 2: Chi phí Thực tế > Số tiền Tạm ứng**
- Hoàn ứng tạm thời = Số tiền tạm ứng
- `excess_amount` = Chi phí - Tạm ứng
- `exceeds_budget` = `true`
- `reimbursement_amount` = Số tiền tạm ứng
- Status: `PENDING_EXCEPTION_APPROVAL` → Chuyển sang Bước 6.1 (Phê duyệt ngoại lệ)

**Sidebar Menu**: "Kiểm tra quyết toán công tác" (Kế toán) - Tab "Kiểm tra"

---

### **BƯỚC 6.1: PHÊ DUYỆT NGOẠI LỆ VƯỢT NGÂN SÁCH (Quản lý Cấp cao / TGĐ) - 100%**

#### Module: Tích hợp vào `TravelExpenseApproval` (`travel-expense-approval`)

**Hoạt động:**
- ✅ Xem xét lý do vượt ngân sách (hiển thị cảnh báo với thông tin chi tiết)
- ✅ Xem các chứng từ liên quan (thông qua settlement attachments)
- ✅ Duyệt/Từ chối khoản chi phí vượt mức

**Logic xử lý:**

**Nếu Duyệt:**
- `exception_approval_status`: `APPROVED_EXCEPTION`
- `approved_excess_amount`: Toàn bộ hoặc một phần khoản vượt được duyệt
- `reimbursement_amount`: `advance_amount` + `approved_excess_amount`
- Status: `SETTLED` → Chuyển lại cho Kế toán giải ngân (tương tự như Trường hợp 1 ở Bước 6)

**Nếu Từ chối:**
- `exception_approval_status`: `REJECTED_EXCEPTION`
- `approved_excess_amount`: `NULL`
- `reimbursement_amount`: Giữ nguyên = `advance_amount` (chỉ hoàn ứng số tiền tạm ứng)
- Status: `SETTLED` → Chuyển lại cho Kế toán giải ngân (tương tự như Trường hợp 1 ở Bước 6)

**Lưu ý:** Sau khi CEO/Admin duyệt/từ chối, Kế toán sẽ giải ngân với số tiền đã được quyết toán (tương tự như Trường hợp 1 ở Bước 6).

**Sidebar Menu**: "Phê duyệt công tác" (CEO/Admin) - Hiển thị cả `PENDING_CEO` và `PENDING_EXCEPTION_APPROVAL`

---

### **BƯỚC 7: QUẢN LÝ CÔNG TÁC (HR) - 100%**

#### Module: `TravelExpenseManagement` (`travel-expense-management`)

**Hoạt động:**
- ✅ Quản lý toàn bộ các yêu cầu công tác
- ✅ Hiển thị danh sách yêu cầu với đầy đủ thông tin
- ✅ Filter và tìm kiếm theo nhiều tiêu chí
- ✅ Xem chi tiết yêu cầu

**Sidebar Menu**: "Quản lý công tác" (HR/Finance)

---


---

## 📋 BACKEND API

### Routes đã đăng ký
- ✅ Route: `/api/travel-expenses` trong `server.js`

### API Endpoints

#### GET Endpoints
- ✅ `GET /api/travel-expenses` - Lấy danh sách yêu cầu (có filter theo `employeeId`, `status`)
- ✅ `GET /api/travel-expenses/:id` - Lấy chi tiết yêu cầu
- ✅ `GET /api/travel-expenses/:id/attachments` - Lấy danh sách file đính kèm

#### POST Endpoints
- ✅ `POST /api/travel-expenses` - Tạo yêu cầu mới
- ✅ `POST /api/travel-expenses/:id/decision` - Phê duyệt/từ chối yêu cầu (cần `actorRole`, `actorId`, `decision`, `notes`)
- ✅ `POST /api/travel-expenses/:id/budget` - Phê duyệt ngân sách (deprecated - không dùng trong quy trình mới)
- ✅ `POST /api/travel-expenses/:id/advance` - Xác nhận chuyển khoản tạm ứng
- ✅ `POST /api/travel-expenses/:id/advance/process` - Xử lý tạm ứng (HR/Finance)
- ✅ `POST /api/travel-expenses/:id/settlement` - Gửi quyết toán (với file đính kèm)
- ✅ `POST /api/travel-expenses/:id/settlement/confirm` - Xác nhận quyết toán
- ✅ `POST /api/travel-expenses/:id/accountant/check` - Kiểm tra quyết toán và giải ngân (Kế toán) - Tích hợp cả giải ngân trong một bước
- ✅ `POST /api/travel-expenses/:id/exception-approval` - Phê duyệt ngoại lệ vượt ngân sách (CEO/Admin)

---

## 📋 FRONTEND COMPONENTS

### Components đã tạo

1. ✅ **`TravelExpense`** - Tạo yêu cầu công tác (Nhân viên)
   - Route: `travel-expense`
   - Sidebar: "Yêu cầu công tác"

2. ✅ **`TravelExpenseApproval`** - Phê duyệt yêu cầu (Manager/CEO/Finance)
   - Route: `travel-expense-approval`
   - Sidebar: "Phê duyệt công tác" (có badge)
   - **Tích hợp**: Phê duyệt Cấp 1, Cấp 2, CEO, và Exception Approval

3. ✅ **`TravelExpenseManagement`** - Quản lý yêu cầu (HR/Admin)
   - Route: `travel-expense-management`
   - Sidebar: "Quản lý công tác"

4. ✅ **`TravelExpenseAdvanceProcessing`** - Xử lý tạm ứng (HR/Finance)
   - Route: `travel-expense-advance-processing`
   - Sidebar: "Xử lý tạm ứng"

5. ✅ **`TravelExpenseSettlement`** - Quyết toán (Nhân viên)
   - Route: `travel-expense-settlement`
   - Sidebar: "Quyết toán công tác"

6. ✅ **`TravelExpenseAccountant`** - Kiểm tra quyết toán và giải ngân (Kế toán)
   - Route: `travel-expense-accountant`
   - Sidebar: "Kiểm tra quyết toán công tác"
   - **Tích hợp**: Tab "Kiểm tra" (Bước 6) - Bao gồm cả chức năng giải ngân

### Routes trong App.js
- ✅ Tất cả 6 routes đã được đăng ký đầy đủ

---

## 📋 DATABASE SCHEMA

### Bảng `travel_expense_requests`

#### Đã có đầy đủ các trường:

**Basic Fields:**
- ✅ `id`, `employee_id`, `title`, `purpose`, `location`, `location_type`

**Company & Time:**
- ✅ `company_name`, `company_address`
- ✅ `start_time`, `end_time`, `is_overnight`

**Status & Flow:**
- ✅ `status`, `current_step`, `requires_ceo`

**Manager Approval (Bước 2):**
- ✅ `manager_id`, `manager_decision`, `manager_notes`, `manager_decision_at`

**Branch Director Approval (Bước 2.1):**
- ✅ `branch_director_id`, `branch_director_decision`, `branch_director_notes`, `branch_director_decision_at`

**CEO Approval (Bước 3):**
- ✅ `ceo_id`, `ceo_decision`, `ceo_notes`, `ceo_decision_at`

**Finance Fields:**
- ✅ `finance_id`, `finance_decision`, `finance_notes`, `finance_decision_at`

**Advance Processing (Bước 4):**
- ✅ `requested_advance_amount` (Nhân viên tự nhập ở Bước 1)
- ✅ `actual_advance_amount` (HR xác nhận)
- ✅ `advance_method`, `bank_account`, `advance_notes`
- ✅ `advance_status` (PENDING_ACCOUNTANT, TRANSFERRED)
- ✅ `advance_processed_at`, `advance_processed_by`
- ✅ `advance_transferred_at`, `advance_transferred_by`

**Living Allowance (Bước 1):**
- ✅ `living_allowance_amount`, `living_allowance_currency`, `continent`

**Settlement (Bước 5):**
- ✅ `actual_expense`, `settlement_status` (SUBMITTED, HR_CONFIRMED)
- ✅ `employee_confirmed_at`, `hr_confirmed_at`, `hr_confirmed_by`
- ✅ `settlement_notes`

**Accountant Check (Bước 6):**
- ✅ `accountant_checked_at`, `accountant_checked_by`, `accountant_notes`
- ✅ `reimbursement_amount`, `exceeds_budget`, `excess_amount`

**Exception Approval (Bước 6.1):**
- ✅ `exception_approval_status` (APPROVED_EXCEPTION, REJECTED_EXCEPTION)
- ✅ `exception_approver_id`, `exception_approval_notes`, `exception_approval_at`
- ✅ `approved_excess_amount`

**Payment (Tích hợp vào Bước 6 - Giải ngân):**
- ✅ `final_status` (SETTLED, REFUND_REQUIRED)
- ✅ `final_reimbursement_amount`, `refund_amount`
- ✅ `payment_confirmed_at`, `payment_confirmed_by`
- ✅ `payment_method` (BANK_TRANSFER, CASH, OTHER)
- ✅ `payment_reference`
- ⚠️ **Lưu ý:** Các trường payment được điền khi Kế toán giải ngân ngay trong Bước 6 (kiểm tra và quyết toán), không phải ở bước riêng biệt.

**Timestamps:**
- ✅ `created_at`, `updated_at`

### Bảng `travel_expense_attachments`
- ✅ Bảng riêng cho file đính kèm quyết toán
- ✅ Fields: `id`, `travel_expense_request_id`, `file_name`, `file_path`, `file_size`, `file_type`, `uploaded_by`, `uploaded_at`, `description`

---

## 📊 TỶ LỆ HOÀN THÀNH

| Bước | Tỷ Lệ | Trạng thái | Module |
|------|-------|------------|--------|
| **Bước 1: Khởi tạo** | 100% | ✅ Hoàn thành | `TravelExpense` |
| **Bước 2: Phê duyệt Cấp 1** | 100% | ✅ Hoàn thành | `TravelExpenseApproval` |
| **Bước 2.1: Phê duyệt Cấp 2** | 100% | ✅ Hoàn thành | `TravelExpenseApproval` |
| **Bước 3: Phê duyệt CEO** | 100% | ✅ Hoàn thành | `TravelExpenseApproval` |
| **Bước 4: Xử lý Tạm ứng** | 90% | ✅ Hoàn thành (có thể cải thiện UI) | `TravelExpenseAdvanceProcessing` |
| **Bước 5: Hoàn ứng** | 100% | ✅ Hoàn thành | `TravelExpenseSettlement` |
| **Bước 6: Kiểm tra, Quyết toán & Giải ngân** | 100% | ✅ Hoàn thành | `TravelExpenseAccountant` (Tab "Kiểm tra") |
| **Bước 6.1: Phê duyệt ngoại lệ** | 100% | ✅ Hoàn thành | `TravelExpenseApproval` |
| **Bước 7: Quản lý công tác** | 100% | ✅ Hoàn thành | `TravelExpenseManagement` |
| **TỔNG CỘNG** | **100%** | ✅ **Hoàn thành đầy đủ** | |

---

## 📝 SIDEBAR MENU ITEMS

### Nhân viên (EMPLOYEE)
- ✅ "Yêu cầu công tác" → `travel-expense` (Bước 1)
- ✅ "Quyết toán công tác" → `travel-expense-settlement` (Bước 5)

### Manager/CEO (EMPLOYEE với quyền duyệt)
- ✅ "Phê duyệt công tác" → `travel-expense-approval` (Bước 2, 2.1, 3, 6.1) - có badge đếm số yêu cầu chờ duyệt

### HR/Finance (HR)
- ✅ "Quản lý công tác" → `travel-expense-management` (Bước 7)
- ✅ "Xử lý tạm ứng" → `travel-expense-advance-processing` (Bước 4.1)

### Kế toán (Kế toán)
- ✅ "Kiểm tra quyết toán công tác" → `travel-expense-accountant` (Bước 4.2, 6)
  - Tab "Kiểm tra": Bước 6 - Kiểm tra, quyết toán và giải ngân (nếu đầy đủ chứng từ hợp lệ)

---

## 🚀 KHUYẾN NGHỊ PHÁT TRIỂN

### **Phase 1: Tối ưu và bổ sung (Ưu tiên cao)**

1. **Thông báo real-time**
   - Thông báo cho nhân viên khi yêu cầu được duyệt/từ chối
   - Thông báo cho quản lý khi có yêu cầu mới cần duyệt
   - Thông báo cho HR/Kế toán khi có yêu cầu cần xử lý

2. **Export báo cáo**
   - Export danh sách yêu cầu công tác
   - Export báo cáo quyết toán
   - Export báo cáo giải ngân

3. **Dashboard thống kê**
   - Thống kê số lượng yêu cầu theo trạng thái
   - Thống kê chi phí công tác theo tháng/quý/năm
   - Biểu đồ xu hướng chi phí

4. **Lịch sử thay đổi**
   - Ghi nhận lịch sử thay đổi status
   - Lịch sử phê duyệt/từ chối
   - Audit trail đầy đủ

5. **Cải thiện UI/UX**
   - Tối ưu hiệu suất rendering
   - Cải thiện responsive design
   - Thêm animation và transition

---

## 🧪 HƯỚNG DẪN KIỂM THỬ (TEST CASES)

### **QUY TRÌNH TEST TỔNG QUÁT**

#### **Chuẩn bị tài khoản test:**
1. **Nhân viên** (EMPLOYEE) - Tạo yêu cầu công tác
2. **Quản lý trực tiếp** (EMPLOYEE có `quan_ly_truc_tiep`) - Duyệt Cấp 1
3. **Giám đốc Chi nhánh** (EMPLOYEE có `chuc_danh` chứa "Giám đốc") - Duyệt Cấp 2
4. **Tổng Giám đốc/Admin** (CEO/ADMIN role) - Duyệt CEO và Exception
5. **HR** (HR role) - Xử lý tạm ứng, xác nhận báo cáo
6. **Kế toán** (Kế toán role) - Xác nhận chuyển khoản, kiểm tra quyết toán, giải ngân

---

### **TEST CASE 1: CÔNG TÁC TRONG NƯỚC (BỎ QUA CEO)**

#### **Mục tiêu:** Kiểm tra quy trình công tác trong nước không cần CEO duyệt

**Bước 1: Nhân viên tạo yêu cầu**
- [ ] Đăng nhập với tài khoản **Nhân viên**
- [ ] Vào module "Yêu cầu công tác"
- [ ] Tạo yêu cầu mới với:
  - **Địa điểm**: "Hà Nội" hoặc "TP. Hồ Chí Minh" (Trong nước)
  - **Location Type**: "Trong nước" / "DOMESTIC"
  - Nhập đầy đủ thông tin: Mục đích, Công ty, Ngày bắt đầu/kết thúc
  - **Số tiền tạm ứng**: Ví dụ 5,000,000 VND
- [ ] **Kiểm tra:** Status = `PENDING_LEVEL_1`

**Bước 2: Quản lý trực tiếp duyệt (Cấp 1)**
- [ ] Đăng nhập với tài khoản **Quản lý trực tiếp** của nhân viên
- [ ] Vào module "Phê duyệt công tác"
- [ ] Xem yêu cầu vừa tạo, kiểm tra hiển thị đầy đủ thông tin
- [ ] **Duyệt** yêu cầu với ghi chú
- [ ] **Kiểm tra:** Status = `PENDING_LEVEL_2`
- [ ] **Kiểm tra:** `manager_decision` = `APPROVE`, có `manager_notes`, `manager_decision_at`

**Bước 2.1: Giám đốc Chi nhánh duyệt (Cấp 2)**
- [ ] Đăng nhập với tài khoản **Giám đốc Chi nhánh**
- [ ] Vào module "Phê duyệt công tác"
- [ ] Xem yêu cầu ở trạng thái `PENDING_LEVEL_2`
- [ ] **Duyệt** yêu cầu với ghi chú
- [ ] **Kiểm tra:** Status = `PENDING_FINANCE` (⚠️ **QUAN TRỌNG: KHÔNG phải PENDING_CEO**)
- [ ] **Kiểm tra:** `branch_director_decision` = `APPROVE`
- [ ] **Kiểm tra:** Yêu cầu KHÔNG xuất hiện ở module "Phê duyệt công tác" của CEO

**Bước 4: HR xử lý tạm ứng**
- [ ] Đăng nhập với tài khoản **HR**
- [ ] Vào module "Xử lý tạm ứng"
- [ ] Xem yêu cầu ở trạng thái `PENDING_FINANCE`
- [ ] Chọn yêu cầu, nhập thông tin:
  - Số tiền tạm ứng (có thể điều chỉnh từ số tiền nhân viên yêu cầu)
  - Hình thức thanh toán (Chuyển khoản/Tiền mặt/Thẻ công ty)
  - Ghi chú
- [ ] Xác nhận xử lý
- [ ] **Kiểm tra:** `advance_status` = `PENDING_ACCOUNTANT`
- [ ] **Kiểm tra:** Status vẫn = `PENDING_FINANCE`

**Bước 4.2: Kế toán xác nhận chuyển khoản**
- [ ] Đăng nhập với tài khoản **Kế toán**
- [ ] Vào module "Kiểm tra quyết toán công tác"
- [ ] Xem danh sách yêu cầu tạm ứng chờ xác nhận
- [ ] Xác nhận đã chuyển khoản
- [ ] **Kiểm tra:** `advance_status` = `TRANSFERRED`
- [ ] **Kiểm tra:** Status = `PENDING_SETTLEMENT`

**Bước 5: Nhân viên submit báo cáo hoàn ứng**
- [ ] Đăng nhập lại với tài khoản **Nhân viên**
- [ ] Vào module "Quyết toán công tác"
- [ ] Chọn yêu cầu có status = `PENDING_SETTLEMENT`
- [ ] Nhập chi phí thực tế (ví dụ: 4,500,000 VND - nhỏ hơn tạm ứng)
- [ ] Upload hóa đơn/chứng từ (PDF, JPG, PNG)
- [ ] Nhập ghi chú chi tiết
- [ ] Submit báo cáo
- [ ] **Kiểm tra:** `settlement_status` = `SUBMITTED`

**Bước 5.2: HR xác nhận báo cáo**
- [ ] Đăng nhập với tài khoản **HR**
- [ ] Xem báo cáo và chứng từ đã upload
- [ ] Xác nhận báo cáo
- [ ] **Kiểm tra:** `settlement_status` = `HR_CONFIRMED`
- [ ] **Kiểm tra:** Status = `PENDING_ACCOUNTANT`

**Bước 6: Kế toán kiểm tra, quyết toán và giải ngân**
- [ ] Đăng nhập với tài khoản **Kế toán**
- [ ] Vào module "Kiểm tra quyết toán công tác", Tab "Kiểm tra"
- [ ] Chọn yêu cầu có status = `PENDING_ACCOUNTANT`
- [ ] Xem hóa đơn/chứng từ
- [ ] Kiểm tra tính hợp lệ của chứng từ
- [ ] Kiểm tra quyết toán (Chi phí thực tế < Tạm ứng)
- [ ] **Giải ngân ngay** (vì đầy đủ chứng từ hợp lệ):
  - Chọn phương thức thanh toán (Chuyển khoản)
  - Nhập số tham chiếu giao dịch
  - Xác nhận giải ngân
- [ ] **Kiểm tra:** `reimbursement_amount` = Chi phí thực tế
- [ ] **Kiểm tra:** `refund_amount` = Tạm ứng - Chi phí thực tế (nhân viên cần hoàn trả)
- [ ] **Kiểm tra:** `payment_confirmed_at` có giá trị
- [ ] **Kiểm tra:** `final_status` = `REFUND_REQUIRED` (vì chi phí < tạm ứng)
- [ ] **Kiểm tra:** Status = `SETTLED`
- [ ] **Kiểm tra:** Quy trình đã hoàn thành

---

### **TEST CASE 2: CÔNG TÁC NƯỚC NGOÀI (CÓ CEO DUYỆT)**

#### **Mục tiêu:** Kiểm tra quy trình công tác nước ngoài cần CEO duyệt

**Bước 1-2: Tạo và duyệt Cấp 1 (giống Test Case 1)**
- [ ] Nhân viên tạo yêu cầu với **Địa điểm**: "Tokyo, Japan" hoặc "New York, USA"
- [ ] **Location Type**: "Nước ngoài" / "INTERNATIONAL"
- [ ] **Kiểm tra:** `requires_ceo` = `true`
- [ ] **Kiểm tra:** Tự động cấp phí sinh hoạt (EU: 60 USD, Asian: 40 USD)
- [ ] Quản lý trực tiếp duyệt → Status = `PENDING_LEVEL_2`

**Bước 2.1: Giám đốc Chi nhánh duyệt (Cấp 2)**
- [ ] Giám đốc Chi nhánh duyệt yêu cầu
- [ ] **Kiểm tra:** Status = `PENDING_CEO` (⚠️ **QUAN TRỌNG: KHÁC với công tác trong nước**)
- [ ] **Kiểm tra:** `branch_director_decision` = `APPROVE`

**Bước 3: CEO duyệt (Cấp Đặc biệt)**
- [ ] Đăng nhập với tài khoản **CEO/Admin**
- [ ] Vào module "Phê duyệt công tác"
- [ ] Xem yêu cầu ở trạng thái `PENDING_CEO`
- [ ] **Kiểm tra:** Tiêu đề hiển thị "Phê duyệt công tác - Cấp Đặc biệt"
- [ ] **Duyệt** yêu cầu với ghi chú
- [ ] **Kiểm tra:** Status = `PENDING_FINANCE`
- [ ] **Kiểm tra:** `ceo_decision` = `APPROVE`, có `ceo_notes`, `ceo_decision_at`

**Bước 4-6: Tiếp tục như Test Case 1**
- [ ] HR xử lý tạm ứng
- [ ] Kế toán xác nhận chuyển khoản
- [ ] Nhân viên submit báo cáo
- [ ] HR xác nhận báo cáo
- [ ] Kế toán kiểm tra, quyết toán và giải ngân

---

### **TEST CASE 3: TRƯỜNG HỢP CHI PHÍ VƯỢT TẠM ỨNG (Exception Approval)**

#### **Mục tiêu:** Kiểm tra quy trình phê duyệt ngoại lệ khi chi phí thực tế vượt số tiền tạm ứng

**Bước 1-6: Thực hiện đến bước Kiểm tra & Quyết toán**
- [ ] Thực hiện các bước như Test Case 1 hoặc 2
- [ ] Ở **Bước 5**: Nhân viên submit báo cáo với **Chi phí thực tế LỚN HƠN** số tiền tạm ứng
  - Ví dụ: Tạm ứng = 5,000,000 VND, Chi phí thực tế = 7,000,000 VND
- [ ] Ở **Bước 6**: Kế toán kiểm tra quyết toán
- [ ] **Kiểm tra:** Status = `PENDING_EXCEPTION_APPROVAL`
- [ ] **Kiểm tra:** `exceeds_budget` = `true`
- [ ] **Kiểm tra:** `excess_amount` = Chi phí thực tế - Tạm ứng

**Bước 6.1: CEO/Admin phê duyệt ngoại lệ**
- [ ] Đăng nhập với tài khoản **CEO/Admin**
- [ ] Vào module "Phê duyệt công tác"
- [ ] Xem yêu cầu ở trạng thái `PENDING_EXCEPTION_APPROVAL`
- [ ] **Kiểm tra:** Tiêu đề hiển thị "Phê duyệt ngoại lệ vượt ngân sách"
- [ ] **Kiểm tra:** Hiển thị cảnh báo với thông tin:
  - Số tiền tạm ứng (`advanceAmount`)
  - Chi phí thực tế (`actualExpense`)
  - Số tiền vượt (`excessAmount`)
- [ ] Xem chứng từ đã upload
- [ ] **Duyệt** ngoại lệ với ghi chú
- [ ] **Kiểm tra:** `exception_approval_status` = `APPROVED_EXCEPTION`
- [ ] **Kiểm tra:** `approved_excess_amount` có giá trị
- [ ] **Kiểm tra:** `reimbursement_amount` = Tạm ứng + Số tiền vượt được duyệt
- [ ] **Kiểm tra:** Status = `SETTLED`

**Test từ chối ngoại lệ:**
- [ ] Tạo lại test case tương tự
- [ ] Ở **Bước 6.1**: CEO/Admin **Từ chối** ngoại lệ
- [ ] **Kiểm tra:** `exception_approval_status` = `REJECTED_EXCEPTION`
- [ ] **Kiểm tra:** `approved_excess_amount` = `NULL`
- [ ] **Kiểm tra:** `reimbursement_amount` = Số tiền tạm ứng (không hoàn phần vượt)
- [ ] **Kiểm tra:** Status = `SETTLED`

**Sau khi CEO duyệt/từ chối ngoại lệ:**
- [ ] Kế toán giải ngân với số tiền đã được quyết toán (tương tự như Trường hợp 1 ở Bước 6)
- [ ] **Kiểm tra:** `payment_confirmed_at` có giá trị
- [ ] **Kiểm tra:** Status = `SETTLED`
- [ ] **Kiểm tra:** Quy trình đã hoàn thành

---

### **TEST CASE 4: TỪ CHỐI YÊU CẦU**

#### **Mục tiêu:** Kiểm tra quy trình từ chối yêu cầu ở các bước

**Test từ chối ở Cấp 1:**
- [ ] Nhân viên tạo yêu cầu
- [ ] Quản lý trực tiếp **Từ chối** yêu cầu với ghi chú
- [ ] **Kiểm tra:** Status = `REJECTED`
- [ ] **Kiểm tra:** `manager_decision` = `REJECT`
- [ ] **Kiểm tra:** Yêu cầu không xuất hiện ở module duyệt Cấp 2

**Test từ chối ở Cấp 2:**
- [ ] Tạo yêu cầu mới, duyệt Cấp 1
- [ ] Giám đốc Chi nhánh **Từ chối** yêu cầu
- [ ] **Kiểm tra:** Status = `REJECTED`
- [ ] **Kiểm tra:** `branch_director_decision` = `REJECT`

**Test từ chối ở CEO:**
- [ ] Tạo yêu cầu công tác nước ngoài, duyệt Cấp 1 và Cấp 2
- [ ] CEO **Từ chối** yêu cầu
- [ ] **Kiểm tra:** Status = `REJECTED`
- [ ] **Kiểm tra:** `ceo_decision` = `REJECT`

---

### **TEST CASE 5: KIỂM TRA UI VÀ VALIDATION**

**Test validation khi tạo yêu cầu:**
- [ ] Thử tạo yêu cầu thiếu các trường bắt buộc (địa điểm, thời gian)
- [ ] **Kiểm tra:** Hiển thị thông báo lỗi
- [ ] Thử nhập ngày kết thúc < ngày bắt đầu
- [ ] **Kiểm tra:** Hiển thị thông báo lỗi

**Test hiển thị thông tin:**
- [ ] Kiểm tra hiển thị đầy đủ thông tin ở các modal chi tiết
- [ ] **Kiểm tra:** Ngày Bắt Đầu và Ngày Kết Thúc hiển thị đúng format (dd/mm/yyyy - HH:mm)
- [ ] Kiểm tra hiển thị số tiền với định dạng VND
- [ ] Kiểm tra hiển thị trạng thái với badge màu sắc phù hợp

**Test tìm kiếm và filter:**
- [ ] Test tìm kiếm theo mã yêu cầu, tên nhân viên
- [ ] Test filter theo trạng thái
- [ ] Test filter theo khoảng thời gian

**Test upload file:**
- [ ] Test upload file PDF (< 10MB)
- [ ] Test upload file hình ảnh (JPG, PNG < 10MB)
- [ ] Test upload nhiều file (tối đa 10 files)
- [ ] **Kiểm tra:** Hiển thị lỗi khi file quá lớn hoặc định dạng không đúng

---

### **TEST CASE 6: KIỂM TRA PHÂN QUYỀN**

**Test quyền truy cập module:**
- [ ] Nhân viên chỉ thấy: "Yêu cầu công tác", "Quyết toán công tác"
- [ ] Manager chỉ thấy: "Phê duyệt công tác" (khi có yêu cầu cần duyệt)
- [ ] CEO/Admin thấy: "Phê duyệt công tác" (công tác nước ngoài và exception)
- [ ] HR thấy: "Quản lý công tác", "Xử lý tạm ứng"
- [ ] Kế toán thấy: "Kiểm tra quyết toán công tác"

**Test badge đếm số yêu cầu:**
- [ ] Kiểm tra badge hiển thị số yêu cầu chờ duyệt ở menu "Phê duyệt công tác"
- [ ] Kiểm tra badge cập nhật sau khi duyệt/từ chối

---

### **TEST CASE 7: KIỂM TRA WORKFLOW STATUS**

**Kiểm tra các chuyển đổi status hợp lệ:**
- [ ] `PENDING_LEVEL_1` → `PENDING_LEVEL_2` (sau khi Manager duyệt - trường hợp bình thường)
- [ ] `PENDING_LEVEL_1` → `PENDING_CEO` (sau khi Manager duyệt - Manager cũng là Branch Director, công tác nước ngoài)
- [ ] `PENDING_LEVEL_1` → `PENDING_FINANCE` (sau khi Manager duyệt - Manager cũng là Branch Director, công tác trong nước)
- [ ] `PENDING_LEVEL_2` → `PENDING_CEO` (công tác nước ngoài, sau khi Branch Director duyệt)
- [ ] `PENDING_LEVEL_2` → `PENDING_FINANCE` (công tác trong nước, sau khi Branch Director duyệt)
- [ ] `PENDING_CEO` → `PENDING_FINANCE` (sau khi CEO duyệt)
- [ ] `PENDING_FINANCE` → `PENDING_SETTLEMENT` (sau khi Kế toán xác nhận chuyển khoản)
- [ ] `PENDING_SETTLEMENT` → `PENDING_ACCOUNTANT` (sau khi HR xác nhận báo cáo)
- [ ] `PENDING_ACCOUNTANT` → `SETTLED` (chi phí <= tạm ứng + đầy đủ chứng từ, sau khi Kế toán quyết toán và giải ngân ngay)
- [ ] `PENDING_ACCOUNTANT` → `PENDING_EXCEPTION_APPROVAL` (chi phí > tạm ứng)
- [ ] `PENDING_EXCEPTION_APPROVAL` → `SETTLED` (sau khi CEO/Admin duyệt/từ chối, sau đó Kế toán giải ngân)

---

### **TEST CASE 8: KIỂM TRA TRƯỜNG HỢP MANAGER = BRANCH DIRECTOR**

#### **Mục tiêu:** Kiểm tra logic tự động bỏ qua bước Cấp 2 khi cùng một người đảm nhiệm cả 2 vai trò

**Chuẩn bị:**
- [ ] Tạo hoặc xác định một employee có `quan_ly_truc_tiep` là một người có `chuc_danh` chứa "Giám đốc" (ví dụ: "Giám đốc Chi nhánh Hà Nội")

**Test Case 8.1: Công tác trong nước - Manager = Branch Director**
- [ ] Nhân viên tạo yêu cầu công tác trong nước
- [ ] Đăng nhập với tài khoản Manager (người này có `chuc_danh` chứa "Giám đốc")
- [ ] Vào module "Phê duyệt công tác"
- [ ] Xem yêu cầu ở status `PENDING_LEVEL_1`
- [ ] **Duyệt** yêu cầu với ghi chú
- [ ] **Kiểm tra:** Status = `PENDING_FINANCE` (⚠️ **QUAN TRỌNG: BỎ QUA PENDING_LEVEL_2**)
- [ ] **Kiểm tra:** `manager_decision` = `APPROVE`, `manager_id` có giá trị
- [ ] **Kiểm tra:** `branch_director_decision` = `APPROVE`, `branch_director_id` có giá trị (⚠️ **TỰ ĐỘNG LƯU**)
- [ ] **Kiểm tra:** Yêu cầu KHÔNG xuất hiện ở module "Phê duyệt công tác" với status `PENDING_LEVEL_2`

**Test Case 8.2: Công tác nước ngoài - Manager = Branch Director**
- [ ] Nhân viên tạo yêu cầu công tác nước ngoài
- [ ] Đăng nhập với tài khoản Manager (người này có `chuc_danh` chứa "Giám đốc")
- [ ] Duyệt yêu cầu
- [ ] **Kiểm tra:** Status = `PENDING_CEO` (⚠️ **BỎ QUA PENDING_LEVEL_2**)
- [ ] **Kiểm tra:** Cả `manager_*` và `branch_director_*` fields đều được lưu
- [ ] **Kiểm tra:** Yêu cầu xuất hiện ở module "Phê duyệt công tác" của CEO với status `PENDING_CEO`

**Test Case 8.3: Manager ≠ Branch Director (trường hợp bình thường)**
- [ ] Nhân viên tạo yêu cầu với Manager KHÔNG phải là Branch Director
- [ ] Manager duyệt yêu cầu
- [ ] **Kiểm tra:** Status = `PENDING_LEVEL_2` (không bỏ qua)
- [ ] **Kiểm tra:** Chỉ `manager_*` fields được lưu, `branch_director_*` fields = NULL
- [ ] Branch Director duyệt → Status = `PENDING_CEO` hoặc `PENDING_FINANCE`

---

### **CHECKLIST TỔNG HỢP**

Sau khi test, đảm bảo:

- [ ] ✅ Công tác trong nước **BỎ QUA** bước CEO, chuyển thẳng từ Cấp 2 → PENDING_FINANCE
- [ ] ✅ Công tác nước ngoài **CẦN** CEO duyệt, chuyển từ Cấp 2 → PENDING_CEO → PENDING_FINANCE
- [ ] ✅ **BỎ BƯỚC 8 RIÊNG BIỆT** - Giải ngân được tích hợp vào Bước 6 (Kế toán kiểm tra, quyết toán và giải ngân ngay nếu đầy đủ chứng từ hợp lệ)
- [ ] ✅ Tất cả các bước trong workflow hoạt động đúng
- [ ] ✅ Validation và error handling hoạt động đúng
- [ ] ✅ UI hiển thị đầy đủ và đúng format
- [ ] ✅ Phân quyền hoạt động đúng
- [ ] ✅ Database lưu đầy đủ thông tin
- [ ] ✅ API endpoints hoạt động đúng
- [ ] ✅ Exception approval hoạt động đúng khi chi phí vượt tạm ứng

---

## 📝 GHI CHÚ

- ✅ **Tất cả các module đã hoàn thành** - Hệ thống đã triển khai đầy đủ quy trình công tác phí từ khởi tạo đến giải ngân
- ✅ Tất cả database fields đã được thêm đầy đủ
- ✅ Tất cả API endpoints đã được triển khai
- ✅ Tất cả menu items đã được thêm vào Sidebar với đầy đủ phân quyền
- ✅ UI hoàn chỉnh cho tất cả các bước trong quy trình
- ✅ **Logic mới:** Công tác trong nước bỏ qua bước CEO, chuyển thẳng sang xử lý tạm ứng
- 🔄 Có thể tiếp tục tối ưu và bổ sung các tính năng nâng cao (notifications, reports, dashboard, etc.)

---

**Ngày cập nhật**: 2025-01-XX  
**Trạng thái**: ✅ **Hoàn thành 100%** - Quy trình công tác phí đã được triển khai đầy đủ  
**Thay đổi gần nhất**: Bỏ bước 8 (Giải ngân riêng biệt), tích hợp giải ngân vào Bước 6 (Kế toán kiểm tra, quyết toán và giải ngân ngay nếu đầy đủ chứng từ hợp lệ)
