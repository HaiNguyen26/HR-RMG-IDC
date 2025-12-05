# Phân Tích Quy Trình Công Tác - So Sánh Với Hệ Thống Hiện Tại

## 📊 TỔNG QUAN

Hệ thống hiện tại đã hoàn thành **khoảng 30-40%** của quy trình đầy đủ. Phần lớn đã hoàn thành là **GIAI ĐOẠN 1: KHỞI TẠO VÀ PHÊ DUYỆT NGÂN SÁCH** (Bước 1-4), nhưng còn thiếu nhiều tính năng quan trọng.

---

## ✅ ĐÃ HOÀN THÀNH

### **BƯỚC 1: KHỞI TẠO YÊU CẦU CÔNG TÁC (Nhân viên)**

#### ✅ Đã có:
- ✅ Tạo yêu cầu với: Mục đích (`purpose`), Địa điểm (`location`), Ngày/Giờ Bắt đầu/Kết thúc (`start_time`, `end_time`)
- ✅ Logic tự động kiểm tra qua đêm (`is_overnight`) - tính toán nếu > 24h
- ✅ Logic tự động kiểm tra nước ngoài (`location_type`, `requires_ceo`) - dựa trên danh sách tỉnh thành Việt Nam
- ✅ Không nhập kinh phí khi tạo (đúng quy trình)

#### ❌ Thiếu:
- ❌ **Tên công ty** (`company_name`) - chưa có field trong database
- ❌ **Địa chỉ công ty** (`company_address`) - chưa có field trong database

---

### **BƯỚC 2: PHÊ DUYỆT CẤP 1 (Quản lý Trực tiếp)**

#### ✅ Đã có:
- ✅ Module "Phê duyệt công tác" (`TravelExpenseApproval`)
- ✅ Duyệt/Từ chối yêu cầu với ghi chú
- ✅ Logic chuyển đến cấp tiếp theo:
  - Nếu công tác nước ngoài → chuyển đến CEO (Bước 3)
  - Nếu công tác trong nước → chuyển đến HR (Bước 4)

#### ❌ Thiếu:
- ❌ **Phân biệt Cấp 1 và Cấp 2** - hiện tại chỉ có `PENDING_LEVEL_1`, không có `PENDING_LEVEL_2`
- ❌ **Giám đốc Chi nhánh** - chưa có logic xử lý riêng cho cấp này
- ❌ **Xác định vai trò người dùng** - frontend chưa truyền `actorRole` và `actorId` khi gọi API

---

### **BƯỚC 3: PHÊ DUYỆT CẤP ĐẶC BIỆT (Tổng Giám đốc)**

#### ✅ Đã có:
- ✅ Logic chỉ xử lý công tác nước ngoài (`requires_ceo = true`)
- ✅ Duyệt/Từ chối yêu cầu
- ✅ Logic chuyển đến cấp ngân sách (Bước 4) sau khi duyệt

#### ❌ Thiếu:
- ❌ **Module riêng cho CEO** - hiện tại dùng chung module với quản lý
- ❌ **Filter theo vai trò** - CEO chỉ thấy yêu cầu `PENDING_CEO`

---

### **BƯỚC 4: CẤP NGÂN SÁCH & TẠM ỨNG (HR & Kế toán)**

#### ✅ Đã có (một phần):
- ✅ Module "Quản lý kinh phí công tác" (`TravelExpenseManagement`)
- ✅ Tab A: **Cấp Ngân Sách Tối Đa**
  - ✅ Nhập Trợ cấp Cố định / Ngân sách Tối đa (`budgetAmount`)
  - ✅ Nhập Loại tiền (`currencyType`: VND, USD, ...)
  - ✅ Nhập Tỷ giá áp dụng (`exchangeRate`)
  - ✅ Tính toán quy đổi tự động

#### ❌ Thiếu (nhiều):
- ❌ **Lưu ngân sách vào database** - hiện tại chỉ có form, chưa có API để lưu
- ❌ **Trạng thái "Đã Duyệt Ngân sách"** - chưa có status này
- ❌ **Tab B: Xử Lý Tạm ứng** - đã có form nhưng chưa hoàn chỉnh:
  - ❌ Số tiền Thực Tạm ứng (`actualAmount`)
  - ❌ Hình thức Tạm ứng (`advanceMethod`)
  - ❌ Tài khoản Ngân hàng nhận (từ hồ sơ nhân viên)
  - ❌ Ghi chú (Nội dung Chuyển khoản)
- ❌ **Trường hợp 1**: HR đặt dịch vụ và làm yêu cầu thanh toán
- ❌ **Trường hợp 2**: Nhân viên tự đặt và báo số tiền tạm ứng cho HR
- ❌ **Hành động Kế toán**: Nhận thông báo, chuyển khoản, xác nhận đã chuyển khoản

---

## ❌ CHƯA CÓ - GIAI ĐOẠN 2: HOÀN ỨNG VÀ QUYẾT TOÁN

### **BƯỚC 5: GHI NHẬN THỰC TẾ & HOÀN ỨNG (Nhân viên & HR)**

#### ❌ Hoàn toàn chưa có:
- ❌ **Module tạo Báo cáo Hoàn ứng**
- ❌ **Upload Hóa đơn/Chứng từ** - chưa có file upload
- ❌ **Quyết toán số tiền tạm ứng** - chưa có form nhập chi phí thực tế
- ❌ **Xác nhận từ cả Nhân viên và HR** - chưa có workflow xác nhận
- ❌ **Database fields**:
  - `actual_expense` (Chi phí thực tế)
  - `settlement_status` (Trạng thái quyết toán)
  - `employee_confirmed_at` (Thời gian nhân viên xác nhận)
  - `hr_confirmed_at` (Thời gian HR xác nhận)
  - `attachments` (JSONB hoặc bảng riêng cho file đính kèm)

---

### **BƯỚC 6: KIỂM TRA & QUYẾT TOÁN (Kế toán)**

#### ❌ Hoàn toàn chưa có:
- ❌ **Module kiểm tra hóa đơn/chứng từ**
- ❌ **Đối chiếu với ngân sách cố định**
- ❌ **Logic hoàn ứng 2 trường hợp**:
  - ❌ Trường hợp 1: Chi phí Thực tế <= Ngân sách Cố định → Hoàn ứng tối đa bằng Chi phí Thực tế
  - ❌ Trường hợp 2: Chi phí Thực tế > Ngân sách Cố định → Từ chối phần vượt, chuyển sang Bước 6.1
- ❌ **Database fields**:
  - `accountant_checked_at` (Thời gian kế toán kiểm tra)
  - `accountant_notes` (Ghi chú của kế toán)
  - `reimbursement_amount` (Số tiền hoàn ứng)
  - `exceeds_budget` (Boolean: có vượt ngân sách không)
  - `excess_amount` (Số tiền vượt ngân sách)

---

### **BƯỚC 6.1: PHÊ DUYỆT NGOẠI LỆ VƯỢT NGÂN SÁCH (Quản lý Cấp cao / TGĐ)**

#### ❌ Hoàn toàn chưa có:
- ❌ **Module phê duyệt ngoại lệ**
- ❌ **Xem xét Lý do Vượt Ngân sách**
- ❌ **Xem các chứng từ liên quan**
- ❌ **Duyệt/Từ chối khoản chi phí vượt mức**
- ❌ **Logic xử lý**:
  - ❌ Nếu Duyệt: Kế toán hoàn ứng khoản chênh lệch đã duyệt
  - ❌ Nếu Từ chối: Kế toán chỉ hoàn ứng tối đa bằng Ngân sách Cố định
- ❌ **Database fields**:
  - `exception_approval_status` (PENDING_EXCEPTION, APPROVED_EXCEPTION, REJECTED_EXCEPTION)
  - `exception_approver_id` (ID người phê duyệt ngoại lệ)
  - `exception_approval_notes` (Ghi chú phê duyệt ngoại lệ)
  - `exception_approval_at` (Thời gian phê duyệt ngoại lệ)
  - `approved_excess_amount` (Số tiền vượt được duyệt)

---

### **BƯỚC 7: GIẢI NGÂN (Kế toán)**

#### ❌ Hoàn toàn chưa có:
- ❌ **Module giải ngân**
- ❌ **Xác nhận giải ngân và ghi nhận vào hệ thống**
- ❌ **Quy trình chuyển tiền hoàn ứng** (hoặc nhận tiền hoàn trả nếu dư tạm ứng)
- ❌ **Trạng thái cuối: "Đã Quyết toán"**
- ❌ **Database fields**:
  - `final_status` (SETTLED, REFUND_REQUIRED)
  - `final_reimbursement_amount` (Số tiền hoàn ứng cuối cùng)
  - `refund_amount` (Số tiền nhân viên phải hoàn trả nếu dư tạm ứng)
  - `payment_confirmed_at` (Thời gian xác nhận thanh toán)
  - `payment_method` (Phương thức thanh toán)
  - `payment_reference` (Số tham chiếu giao dịch)

---

## 📋 TÓM TẮT CÁC FIELD CẦN THÊM VÀO DATABASE

### **Bảng `travel_expense_requests` - Cần thêm:**

```sql
-- Bước 1: Thông tin công ty
company_name TEXT,
company_address TEXT,

-- Bước 4: Ngân sách và Tạm ứng
approved_budget_amount NUMERIC(12, 2),        -- Ngân sách đã duyệt
approved_budget_currency VARCHAR(10),        -- Loại tiền (VND, USD, ...)
approved_budget_exchange_rate NUMERIC(10, 4), -- Tỷ giá
budget_approved_at TIMESTAMP,                 -- Thời gian duyệt ngân sách
budget_approved_by INTEGER,                   -- ID người duyệt ngân sách
advance_amount NUMERIC(12, 2),                -- Số tiền tạm ứng
advance_method VARCHAR(50),                   -- Hình thức tạm ứng
advance_requested_at TIMESTAMP,               -- Thời gian yêu cầu tạm ứng
advance_transferred_at TIMESTAMP,             -- Thời gian chuyển khoản
advance_transferred_by INTEGER,                -- ID người chuyển khoản
advance_confirmed_at TIMESTAMP,               -- Thời gian xác nhận chuyển khoản

-- Bước 5: Hoàn ứng
actual_expense_amount NUMERIC(12, 2),        -- Chi phí thực tế
settlement_status VARCHAR(40),               -- Trạng thái quyết toán
employee_confirmed_at TIMESTAMP,             -- Thời gian nhân viên xác nhận
hr_confirmed_at TIMESTAMP,                    -- Thời gian HR xác nhận
attachments JSONB,                            -- Danh sách file đính kèm

-- Bước 6: Kiểm tra và Quyết toán
accountant_checked_at TIMESTAMP,              -- Thời gian kế toán kiểm tra
accountant_notes TEXT,                        -- Ghi chú của kế toán
reimbursement_amount NUMERIC(12, 2),          -- Số tiền hoàn ứng
exceeds_budget BOOLEAN DEFAULT FALSE,         -- Có vượt ngân sách không
excess_amount NUMERIC(12, 2),                 -- Số tiền vượt ngân sách

-- Bước 6.1: Phê duyệt ngoại lệ
exception_approval_status VARCHAR(40),        -- PENDING_EXCEPTION, APPROVED_EXCEPTION, REJECTED_EXCEPTION
exception_approver_id INTEGER,                -- ID người phê duyệt ngoại lệ
exception_approval_notes TEXT,                -- Ghi chú phê duyệt ngoại lệ
exception_approval_at TIMESTAMP,              -- Thời gian phê duyệt ngoại lệ
approved_excess_amount NUMERIC(12, 2),        -- Số tiền vượt được duyệt

-- Bước 7: Giải ngân
final_status VARCHAR(40),                     -- SETTLED, REFUND_REQUIRED
final_reimbursement_amount NUMERIC(12, 2),    -- Số tiền hoàn ứng cuối cùng
refund_amount NUMERIC(12, 2),                 -- Số tiền nhân viên phải hoàn trả
payment_confirmed_at TIMESTAMP,               -- Thời gian xác nhận thanh toán
payment_method VARCHAR(50),                   -- Phương thức thanh toán
payment_reference VARCHAR(100)                 -- Số tham chiếu giao dịch
```

---

## 🎯 CÁC MODULE CẦN PHÁT TRIỂN

### **1. Module Tạo Yêu Cầu Công Tác (Nhân viên) - Cần bổ sung:**
- Thêm field: Tên công ty, Địa chỉ công ty

### **2. Module Phê Duyệt Công Tác (Quản lý/CEO) - Cần hoàn thiện:**
- Sửa lỗi: Truyền `actorRole` và `actorId` khi gọi API
- Thêm: Phân biệt Cấp 1 và Cấp 2
- Thêm: Logic cho Giám đốc Chi nhánh

### **3. Module Quản Lý Kinh Phí Công Tác (HR) - Cần hoàn thiện:**
- **Tab A**: Lưu ngân sách vào database, cập nhật status
- **Tab B**: Hoàn thiện form tạm ứng, tích hợp với database
- Thêm: Xử lý 2 trường hợp tạm ứng (HR đặt dịch vụ / Nhân viên tự đặt)

### **4. Module Xử Lý Tạm Ứng (Kế toán) - Cần tạo mới:**
- Nhận thông báo yêu cầu tạm ứng
- Xác nhận chuyển khoản
- Cập nhật trạng thái đã chuyển khoản

### **5. Module Báo Cáo Hoàn Ứng (Nhân viên & HR) - Cần tạo mới:**
- Upload hóa đơn/chứng từ
- Nhập chi phí thực tế
- Xác nhận từ nhân viên và HR

### **6. Module Kiểm Tra & Quyết Toán (Kế toán) - Cần tạo mới:**
- Kiểm tra tính hợp lệ của hóa đơn/chứng từ
- Đối chiếu với ngân sách cố định
- Logic hoàn ứng (2 trường hợp)

### **7. Module Phê Duyệt Ngoại Lệ (Quản lý Cấp cao/TGĐ) - Cần tạo mới:**
- Xem xét lý do vượt ngân sách
- Duyệt/từ chối khoản chi phí vượt mức

### **8. Module Giải Ngân (Kế toán) - Cần tạo mới:**
- Xác nhận giải ngân
- Ghi nhận vào hệ thống
- Xử lý hoàn trả nếu dư tạm ứng

---

## 📊 TỶ LỆ HOÀN THÀNH

| Giai Đoạn | Tỷ Lệ | Ghi Chú |
|-----------|-------|---------|
| **Bước 1: Khởi tạo** | 80% | Thiếu: Tên công ty, Địa chỉ công ty |
| **Bước 2: Phê duyệt Cấp 1** | 70% | Thiếu: actorRole, Cấp 2, Giám đốc Chi nhánh |
| **Bước 3: Phê duyệt CEO** | 60% | Thiếu: Module riêng, Filter theo vai trò |
| **Bước 4: Cấp ngân sách** | 50% | Có form nhưng chưa lưu DB, thiếu tạm ứng |
| **Bước 5: Hoàn ứng** | 0% | Chưa có |
| **Bước 6: Quyết toán** | 0% | Chưa có |
| **Bước 6.1: Phê duyệt ngoại lệ** | 0% | Chưa có |
| **Bước 7: Giải ngân** | 0% | Chưa có |
| **TỔNG CỘNG** | **~35%** | |

---

## 🚀 KHUYẾN NGHỊ PHÁT TRIỂN

### **Phase 1: Hoàn thiện Giai đoạn 1 (Ưu tiên cao)**
1. ✅ Sửa lỗi `actorRole` trong module phê duyệt
2. ✅ Thêm fields: Tên công ty, Địa chỉ công ty
3. ✅ Lưu ngân sách vào database (Tab A)
4. ✅ Hoàn thiện Tab B: Tạm ứng

### **Phase 2: Phát triển Giai đoạn 2 (Ưu tiên trung bình)**
1. ✅ Module Báo cáo Hoàn ứng
2. ✅ Module Kiểm tra & Quyết toán
3. ✅ Module Phê duyệt Ngoại lệ
4. ✅ Module Giải ngân

### **Phase 3: Tối ưu và bổ sung (Ưu tiên thấp)**
1. ✅ Thông báo real-time
2. ✅ Export báo cáo
3. ✅ Dashboard thống kê
4. ✅ Lịch sử thay đổi

