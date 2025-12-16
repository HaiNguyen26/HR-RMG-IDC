# Phân Tích Quy Trình Công Tác - So Sánh Với Hệ Thống Hiện Tại

## 📊 TỔNG QUAN

Hệ thống hiện tại đã hoàn thành **khoảng 50-55%** của quy trình đầy đủ. **BƯỚC 1: KHỞI TẠO YÊU CẦU CÔNG TÁC** đã được hoàn thành 100%. **BƯỚC 4: XỬ LÝ TẠM ỨNG** đã được cập nhật theo quy trình mới (bỏ phần Cấp Ngân sách, chỉ còn Xử lý Tạm ứng). Phần lớn đã hoàn thành là **GIAI ĐOẠN 1: KHỞI TẠO VÀ PHÊ DUYỆT** (Bước 1-4), nhưng còn thiếu module Kế toán xác nhận chuyển khoản và các bước tiếp theo.

---

## 📋 QUY TRÌNH MỚI - GIAI ĐOẠN 1: KHỞI TẠO VÀ PHÊ DUYỆT NGÂN SÁCH

### **BƯỚC 1: KHỞI TẠO YÊU CẦU CÔNG TÁC (Nhân viên)**

#### Hoạt động:
- **Tạo Yêu cầu Công tác Mới**: Nhập các thông tin:
  - Mục đích (`purpose`)
  - Tên công ty (`company_name`)
  - Địa chỉ công ty (`company_address`)
  - Địa điểm (Trong nước/Nước ngoài) (`location`, `location_type`)
  - Ngày/Giờ Bắt đầu và Kết thúc (`start_date`, `start_time`, `end_date`, `end_time`)
  - **Người tạo yêu cầu tự điền số tiền cần tạm ứng** (`requested_advance_amount`)
  - **Không nhập kinh phí** khi tạo yêu cầu

#### Logic Xử lý tự động:
- ✅ Hệ thống tự động kiểm tra: **Có qua đêm không** (qua 24h)? → `is_overnight`
- ✅ Hệ thống tự động kiểm tra: **Địa điểm có phải nước ngoài không**? → `location_type`, `requires_ceo`
- ✅ **Tự động cấp phí sinh hoạt dựa trên châu lục**:
  - Nếu là **Châu Âu – EU**: Tự động cấp **60 USD** phí sinh hoạt (`living_allowance_amount = 60`, `living_allowance_currency = 'USD'`)
  - Nếu là **Châu Á – Asian**: Tự động cấp **40 USD** phí sinh hoạt (`living_allowance_amount = 40`, `living_allowance_currency = 'USD'`)
  - Các châu lục khác: Cần xác định logic hoặc để trống

---

### **BƯỚC 2 & 2.1: PHÊ DUYỆT CẤP 1 & 2 (Quản lý Trực tiếp / Giám đốc Chi nhánh)**

#### Hoạt động:
- **Duyệt/Từ chối Yêu cầu**: 
  - Kiểm tra tính cần thiết và phù hợp của công việc
  - Có thể thêm ghi chú khi duyệt/từ chối

#### Logic Xử lý:
- Nếu **Duyệt** → Chuyển đến cấp phê duyệt tiếp theo dựa trên logic:
  - Nếu công tác **nước ngoài** → chuyển đến Tổng Giám đốc (Bước 3)
  - Nếu công tác **trong nước** → chuyển đến HR (Bước 4)
- Nếu **Từ chối** → Yêu cầu bị từ chối, không chuyển tiếp

#### Phân biệt Cấp 1 và Cấp 2:
- **Cấp 1**: Quản lý Trực tiếp (`PENDING_LEVEL_1`)
- **Cấp 2**: Giám đốc Chi nhánh (`PENDING_LEVEL_2`)
- Workflow: Cấp 1 duyệt → Chuyển đến Cấp 2 (nếu cần) → Sau đó mới chuyển đến CEO hoặc HR

---

### **BƯỚC 3: PHÊ DUYỆT CẤP ĐẶC BIỆT (Tổng Giám đốc)**

#### Hoạt động:
- **Duyệt/Từ chối Yêu cầu**: 
  - Chỉ xử lý nếu địa điểm là **Nước ngoài** và đã được **Cấp 1 duyệt**
  - Xem xét tính cần thiết của công tác nước ngoài

#### Logic Xử lý:
- **Điều kiện**: Chỉ hiển thị và xử lý yêu cầu có:
  - `location_type = 'INTERNATIONAL'` hoặc `requires_ceo = true`
  - `status = 'PENDING_CEO'` (đã được Cấp 1 duyệt)
- Nếu **Duyệt** → Chuyển đến cấp ngân sách (Bước 4)
- Nếu **Từ chối** → Yêu cầu bị từ chối, không chuyển tiếp

---

### **BƯỚC 4: XỬ LÝ TẠM ỨNG (HR & Kế toán)**

> **Lưu ý:** Quy trình mới đã bỏ phần "A. Xác định Ngân sách (HR)" vì nhân viên đã tự nhập số tiền tạm ứng (`requested_advance_amount`) khi tạo yêu cầu công tác.

#### Hoạt động - Xử lý Tạm ứng:

**Bước 4.1: HR Xử lý Tạm ứng**

**Trường hợp 1: HR đặt dịch vụ**
- HR đặt dịch vụ (vé máy bay, khách sạn, ...) và làm yêu cầu thanh toán
- HR nhập số tiền thực tế cần tạm ứng cho nhân viên (có thể khác với số tiền nhân viên yêu cầu)
- HR chọn hình thức tạm ứng (chuyển khoản, tiền mặt, thẻ công ty)
- HR nhập ghi chú về dịch vụ đã đặt
- Hệ thống gửi thông báo cho Kế toán để xử lý thanh toán

**Trường hợp 2: Nhân viên tự đặt**
- Nhân viên tự đặt dịch vụ và đã nhập số tiền tạm ứng (`requested_advance_amount`) khi tạo yêu cầu
- HR xem xét và xác nhận số tiền tạm ứng (có thể điều chỉnh nếu cần)
- HR chọn hình thức tạm ứng
- HR nhập ghi chú xác nhận
- Hệ thống gửi thông báo cho Kế toán để chuyển khoản cho nhân viên

**Bước 4.2: Kế toán Xác nhận Chuyển khoản**

**Hành động Kế toán:**
- Nhận thông báo yêu cầu tạm ứng từ HR
- Xem thông tin: Số tiền tạm ứng, Hình thức thanh toán, Tài khoản ngân hàng nhân viên, Ghi chú từ HR
- Thực hiện chuyển khoản cho nhân viên
- Xác nhận đã chuyển khoản trên hệ thống:
  - Cập nhật `advance_status = 'TRANSFERRED'`
  - Cập nhật `advance_transferred_at`, `advance_transferred_by`
- Sau khi xác nhận → Status tự động chuyển sang `PENDING_SETTLEMENT` để nhân viên có thể submit báo cáo hoàn ứng

---

## ✅ ĐÃ HOÀN THÀNH

### **BƯỚC 1: KHỞI TẠO YÊU CẦU CÔNG TÁC (Nhân viên)**

#### ✅ Đã có:
- ✅ Tạo yêu cầu với: Mục đích (`purpose`), Địa điểm (`location`), Ngày/Giờ Bắt đầu/Kết thúc (`start_time`, `end_time`)
- ✅ Logic tự động kiểm tra qua đêm (`is_overnight`) - tính toán nếu > 24h
- ✅ Logic tự động kiểm tra nước ngoài (`location_type`, `requires_ceo`) - dựa trên danh sách tỉnh thành Việt Nam
- ✅ Không nhập kinh phí khi tạo (đúng quy trình)
- ✅ **Tên công ty** (`company_name`) - đã có field trong database và form
- ✅ **Địa chỉ công ty** (`company_address`) - đã có field trong database và form
- ✅ **Số tiền cần tạm ứng** (`requested_advance_amount`) - đã có field trong database và form, người tạo tự điền
- ✅ **Tự động cấp phí sinh hoạt dựa trên châu lục**:
  - ✅ Xác định châu lục từ địa điểm (EU, Asian, ...) - logic đã được implement
  - ✅ Tự động cấp 60 USD cho Châu Âu – EU (`living_allowance_amount = 60`, `living_allowance_currency = 'USD'`)
  - ✅ Tự động cấp 40 USD cho Châu Á – Asian (`living_allowance_amount = 40`, `living_allowance_currency = 'USD'`)
  - ✅ Hiển thị phí sinh hoạt tự động trong form khi chọn địa điểm nước ngoài

---

### **BƯỚC 2 & 2.1: PHÊ DUYỆT CẤP 1 & 2 (Quản lý Trực tiếp / Giám đốc Chi nhánh)**

#### ✅ Đã hoàn thành:
- ✅ Module "Phê duyệt công tác" (`TravelExpenseApproval`)
- ✅ Duyệt/Từ chối yêu cầu với ghi chú
- ✅ **Phân biệt Cấp 1 và Cấp 2**:
  - ✅ Status `PENDING_LEVEL_1` cho Cấp 1 (Quản lý Trực tiếp)
  - ✅ Status `PENDING_LEVEL_2` cho Cấp 2 (Giám đốc Chi nhánh)
- ✅ **Database fields cho Giám đốc Chi nhánh**:
  - ✅ `branch_director_id`, `branch_director_decision`, `branch_director_notes`, `branch_director_decision_at`
- ✅ **Xác định vai trò người dùng**:
  - ✅ Frontend xác định `MANAGER` (Quản lý Trực tiếp) dựa trên `quan_ly_truc_tiep` của employee
  - ✅ Frontend xác định `BRANCH_DIRECTOR` (Giám đốc Chi nhánh) dựa trên `chuc_danh` chứa "Giám đốc"
- ✅ **Workflow Cấp 1 → Cấp 2**:
  - ✅ Cấp 1 (Quản lý Trực tiếp) duyệt → chuyển đến `PENDING_LEVEL_2` (Cấp 2)
  - ✅ Cấp 2 (Giám đốc Chi nhánh) duyệt → chuyển đến CEO (nếu nước ngoài) hoặc HR/FINANCE (nếu trong nước)
- ✅ **Filter requests theo role**: Frontend chỉ hiển thị requests mà user có quyền duyệt
- ✅ **Backend API**: Xử lý đầy đủ logic cho `MANAGER` và `BRANCH_DIRECTOR` roles

---

### **BƯỚC 3: PHÊ DUYỆT CẤP ĐẶC BIỆT (Tổng Giám đốc)**

#### ✅ Đã hoàn thành:
- ✅ **Logic chỉ xử lý công tác nước ngoài** (`requires_ceo = true`)
- ✅ **Duyệt/Từ chối yêu cầu** với ghi chú
- ✅ **Logic chuyển đến cấp ngân sách (Bước 4)** sau khi duyệt (`PENDING_FINANCE`)
- ✅ **Backend validation**:
  - ✅ Kiểm tra `requires_ceo = true` (chỉ công tác nước ngoài)
  - ✅ Kiểm tra status phải là `PENDING_CEO`
  - ✅ Kiểm tra Cấp 1 (Quản lý Trực tiếp) đã duyệt (`manager_decision = 'APPROVE'`)
  - ✅ Kiểm tra Cấp 2 (Giám đốc Chi nhánh) đã duyệt (`branch_director_decision = 'APPROVE'`)
- ✅ **Frontend filter theo vai trò**: CEO chỉ thấy yêu cầu `PENDING_CEO`
- ✅ **UI phân biệt**: Title và subtitle hiển thị rõ đây là "Phê duyệt Cấp Đặc biệt"
- ✅ **Flow card**: Hiển thị đúng workflow cho CEO (đã được Cấp 1 & Cấp 2 duyệt)
- ✅ **Điều kiện**: Chỉ xử lý nếu địa điểm là Nước ngoài và đã được Cấp 1 & Cấp 2 duyệt

---

### **BƯỚC 4: XỬ LÝ TẠM ỨNG (HR & Kế toán)**

#### ✅ Đã hoàn thành:
- ✅ Module "Quản lý kinh phí công tác" (`TravelExpenseManagement`) - **Đã cập nhật theo quy trình mới**
- ✅ **Bỏ Tab A: Cấp Ngân Sách** - Nhân viên đã tự nhập số tiền tạm ứng (`requested_advance_amount`) khi tạo yêu cầu
- ✅ **Module Xử Lý Tạm Ứng (HR)**:
  - ✅ **Hiển thị thông tin yêu cầu**:
    - ✅ Số tiền tạm ứng nhân viên yêu cầu (`requested_advance_amount`) - hiển thị để HR tham khảo
    - ✅ Tài khoản ngân hàng nhân viên (tự động lấy từ hồ sơ)
    - ✅ Thông tin yêu cầu công tác (mục đích, địa điểm, ngày giờ)
  - ✅ **Form Xử Lý Tạm Ứng với 2 trường hợp**:
    - ✅ **Trường hợp 1: HR đặt dịch vụ**:
      - ✅ HR nhập số tiền thực tế cần tạm ứng (`actual_advance_amount`)
      - ✅ HR chọn hình thức tạm ứng (`advance_method`: bank_transfer, cash, company_card)
      - ✅ HR nhập ghi chú về dịch vụ đã đặt (`advance_notes`)
    - ✅ **Trường hợp 2: Nhân viên tự đặt**:
      - ✅ HR xác nhận số tiền tạm ứng (mặc định = `requested_advance_amount`, có thể điều chỉnh)
      - ✅ HR chọn hình thức tạm ứng
      - ✅ HR nhập ghi chú xác nhận
  - ✅ **API xử lý tạm ứng** - `POST /api/travel-expenses/:id/advance`
  - ✅ **Lưu thông tin tạm ứng vào database**:
    - ✅ `actual_advance_amount`, `advance_method`, `bank_account`, `advance_notes`
    - ✅ `advance_status = 'PENDING_ACCOUNTANT'` (chờ Kế toán xác nhận chuyển khoản)
    - ✅ `advance_processed_at`, `advance_processed_by` (HR xử lý)
- ✅ **Module Xác nhận Chuyển khoản (Kế toán)**:
  - ✅ **Hiển thị danh sách yêu cầu tạm ứng** chờ xác nhận (`advance_status = 'PENDING_ACCOUNTANT'`)
  - ✅ **Xem thông tin chi tiết**:
    - ✅ Số tiền tạm ứng
    - ✅ Hình thức thanh toán
    - ✅ Tài khoản ngân hàng nhân viên
    - ✅ Ghi chú từ HR
  - ✅ **Xác nhận đã chuyển khoản**:
    - ✅ Cập nhật `advance_status = 'TRANSFERRED'`
    - ✅ Cập nhật `advance_transferred_at`, `advance_transferred_by`
    - ✅ Status tự động chuyển sang `PENDING_SETTLEMENT`
- ✅ **Database fields**:
  - ✅ `requested_advance_amount` (Số tiền nhân viên yêu cầu - đã có từ Bước 1)
  - ✅ `actual_advance_amount` (Số tiền thực tế tạm ứng)
  - ✅ `advance_method`, `bank_account`, `advance_notes`
  - ✅ `advance_status` (PENDING_ACCOUNTANT, TRANSFERRED)
  - ✅ `advance_processed_at`, `advance_processed_by` (HR xử lý)
  - ✅ `advance_transferred_at`, `advance_transferred_by` (Kế toán xác nhận)
- ✅ **Filter requests**: 
  - ✅ HR module chỉ hiển thị requests có `status = 'PENDING_FINANCE'`
  - ✅ Kế toán module chỉ hiển thị requests có `advance_status = 'PENDING_ACCOUNTANT'`
- ✅ **Lấy thông tin tài khoản ngân hàng**: Tự động lấy từ employee profile khi fetch requests

---

## ❌ CHƯA CÓ - GIAI ĐOẠN 2: HOÀN ỨNG VÀ QUYẾT TOÁN

### **BƯỚC 5: GHI NHẬN THỰC TẾ & HOÀN ỨNG (Nhân viên & HR)**

#### ✅ Đã hoàn thành:
- ✅ **Module tạo Báo cáo Hoàn ứng** (`TravelExpenseSettlement.js`) - Nhân viên có thể submit báo cáo hoàn ứng với chi phí thực tế
- ✅ **Upload Hóa đơn/Chứng từ** - File upload hỗ trợ PDF, DOC, DOCX, JPG, PNG (tối đa 10MB mỗi file, tối đa 10 files)
- ✅ **Quyết toán số tiền tạm ứng** - Form nhập chi phí thực tế và ghi chú chi tiết
- ✅ **Xác nhận từ cả Nhân viên và HR** - Workflow: Nhân viên submit → HR xác nhận → Chuyển sang Kế toán
- ✅ **Database fields**:
  - `actual_expense` (Chi phí thực tế)
  - `settlement_status` (Trạng thái quyết toán: SUBMITTED, HR_CONFIRMED)
  - `employee_confirmed_at` (Thời gian nhân viên xác nhận)
  - `hr_confirmed_at` (Thời gian HR xác nhận)
  - `hr_confirmed_by` (ID người HR xác nhận)
  - `settlement_notes` (Ghi chú về chi phí thực tế)
  - `travel_expense_attachments` (Bảng riêng cho file đính kèm)
- ✅ **API Endpoints**:
  - `POST /api/travel-expenses/:id/settlement` - Nhân viên submit settlement với file upload
  - `GET /api/travel-expenses/:id/attachments` - Lấy danh sách file đính kèm
  - `POST /api/travel-expenses/:id/settlement/confirm` - HR xác nhận settlement
- ✅ **Workflow**: Sau khi tạm ứng chuyển khoản thành công (`advance_status = 'TRANSFERRED'`), status tự động chuyển sang `PENDING_SETTLEMENT` để nhân viên có thể submit báo cáo hoàn ứng

---

### **BƯỚC 6: KIỂM TRA & QUYẾT TOÁN (Kế toán)**

#### ✅ Đã hoàn thành:
- ✅ **Module kiểm tra hóa đơn/chứng từ** (`TravelExpenseAccountant.js`) - Kế toán có thể xem và kiểm tra hóa đơn/chứng từ đã upload
- ✅ **Đối chiếu với ngân sách cố định** - Hiển thị so sánh chi phí thực tế với ngân sách được cấp
- ✅ **Logic hoàn ứng 2 trường hợp**:
  - ✅ Trường hợp 1: Chi phí Thực tế <= Ngân sách Cố định → Hoàn ứng tối đa bằng Chi phí Thực tế, status = `SETTLED`
  - ✅ Trường hợp 2: Chi phí Thực tế > Ngân sách Cố định → Từ chối phần vượt, chuyển sang Bước 6.1 (status = `PENDING_EXCEPTION_APPROVAL`)
- ✅ **Database fields**:
  - `accountant_checked_at` (Thời gian kế toán kiểm tra)
  - `accountant_checked_by` (ID kế toán kiểm tra)
  - `accountant_notes` (Ghi chú của kế toán)
  - `reimbursement_amount` (Số tiền hoàn ứng)
  - `exceeds_budget` (Boolean: có vượt ngân sách không)
  - `excess_amount` (Số tiền vượt ngân sách)
- ✅ **API Endpoints**:
  - `POST /api/travel-expenses/:id/accountant/check` - Kế toán kiểm tra và quyết toán với logic tự động tính toán
- ✅ **UI Features**:
  - Hiển thị so sánh chi phí thực tế vs ngân sách
  - Cảnh báo khi chi phí vượt ngân sách
  - Hiển thị số tiền hoàn ứng được tính tự động
  - Xem hóa đơn/chứng từ đã upload
  - Xem ghi chú từ nhân viên

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
-- Bước 1: Thông tin công ty và tạm ứng
company_name TEXT,
company_address TEXT,
requested_advance_amount NUMERIC(12, 2),        -- Số tiền cần tạm ứng (người tạo tự điền)
living_allowance_amount NUMERIC(12, 2),         -- Phí sinh hoạt tự động cấp (40 USD cho EU, 60 USD cho Asian)
living_allowance_currency VARCHAR(10),          -- Loại tiền phí sinh hoạt (USD)
continent VARCHAR(50),                           -- Châu lục (EU, ASIAN, ...) - để xác định phí sinh hoạt

-- Bước 4: Xử lý Tạm ứng (Quy trình mới - đã bỏ phần Cấp Ngân sách)
-- requested_advance_amount đã có từ Bước 1 (nhân viên tự nhập)
actual_advance_amount NUMERIC(12, 2),         -- Số tiền thực tế tạm ứng (HR xử lý)
advance_method VARCHAR(50),                   -- Hình thức tạm ứng (bank_transfer, cash, company_card)
bank_account TEXT,                            -- Tài khoản ngân hàng nhận (tự động lấy từ employee)
advance_notes TEXT,                           -- Ghi chú từ HR về dịch vụ đã đặt hoặc xác nhận
advance_status VARCHAR(50),                   -- Trạng thái: PENDING_ACCOUNTANT, TRANSFERRED
advance_processed_at TIMESTAMP,               -- Thời gian HR xử lý tạm ứng
advance_processed_by INTEGER,                 -- ID người HR xử lý
advance_transferred_at TIMESTAMP,             -- Thời gian Kế toán chuyển khoản
advance_transferred_by INTEGER,                -- ID người Kế toán chuyển khoản

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

### **1. Module Tạo Yêu Cầu Công Tác (Nhân viên) - ✅ ĐÃ HOÀN THÀNH:**
- ✅ Thêm field: Tên công ty (`company_name`), Địa chỉ công ty (`company_address`)
- ✅ Thêm field: Số tiền cần tạm ứng (`requested_advance_amount`) - người tạo tự điền
- ✅ Thêm logic: Tự động xác định châu lục từ địa điểm và cấp phí sinh hoạt:
  - Châu Âu – EU: 60 USD (`living_allowance_amount = 60`, `living_allowance_currency = 'USD'`)
  - Châu Á – Asian: 40 USD (`living_allowance_amount = 40`, `living_allowance_currency = 'USD'`)
- ✅ Thêm fields: `living_allowance_amount`, `living_allowance_currency`, `continent`
- ✅ Database migration: `migrate_travel_expense_step1_fields.sql`
- ✅ Frontend form: Đã cập nhật với các field mới và hiển thị phí sinh hoạt tự động
- ✅ Backend API: Đã cập nhật để nhận và lưu các field mới

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
| **Bước 1: Khởi tạo** | 100% | ✅ Đã hoàn thành: Tên công ty, Địa chỉ công ty, Số tiền tạm ứng, Logic tự động cấp phí sinh hoạt (EU: 60 USD, Asian: 40 USD) |
| **Bước 2: Phê duyệt Cấp 1** | 70% | Thiếu: actorRole, Cấp 2, Giám đốc Chi nhánh |
| **Bước 3: Phê duyệt CEO** | 60% | Thiếu: Module riêng, Filter theo vai trò |
| **Bước 4: Xử lý Tạm ứng** | 80% | ✅ Đã có module HR xử lý tạm ứng, ⏳ Cần module Kế toán xác nhận chuyển khoản |
| **Bước 5: Hoàn ứng** | 0% | Chưa có |
| **Bước 6: Quyết toán** | 0% | Chưa có |
| **Bước 6.1: Phê duyệt ngoại lệ** | 0% | Chưa có |
| **Bước 7: Giải ngân** | 0% | Chưa có |
| **TỔNG CỘNG** | **~35%** | |

---

## 🚀 KHUYẾN NGHỊ PHÁT TRIỂN

### **Phase 1: Hoàn thiện Giai đoạn 1 (Ưu tiên cao)**
1. ⏳ Sửa lỗi `actorRole` trong module phê duyệt
2. ✅ **HOÀN THÀNH** - Thêm fields: Tên công ty (`company_name`), Địa chỉ công ty (`company_address`)
3. ✅ **HOÀN THÀNH** - Thêm field: Số tiền cần tạm ứng (`requested_advance_amount`) - người tạo tự điền
4. ✅ **HOÀN THÀNH** - Thêm logic: Tự động xác định châu lục và cấp phí sinh hoạt (EU: 60 USD, Asian: 40 USD)
5. ✅ **HOÀN THÀNH** - Bỏ Tab A (Cấp Ngân sách), cập nhật quy trình mới
6. ✅ **HOÀN THÀNH** - Module HR xử lý Tạm ứng với 2 trường hợp
7. ⏳ **ĐANG PHÁT TRIỂN** - Module Kế toán xác nhận chuyển khoản

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

