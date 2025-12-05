# Tình Trạng Hiện Tại & Khuyến Nghị Phát Triển - Quy Trình Công Tác

## 📊 TỔNG QUAN TỶ LỆ HOÀN THÀNH

**Tổng thể: ~45% quy trình đã hoàn thành**

| Giai Đoạn | Tỷ Lệ | Trạng Thái |
|-----------|-------|------------|
| **Bước 1: Khởi tạo** | 80% | ✅ Gần hoàn thiện |
| **Bước 2: Phê duyệt Cấp 1** | 85% | ✅ Đã có logic, đã test cơ bản |
| **Bước 3: Phê duyệt CEO** | 70% | ✅ Đã tích hợp vào module phê duyệt |
| **Bước 4: Cấp ngân sách** | 80% | ✅ Tab A hoàn thiện, Tab B chưa hoàn thiện |
| **Bước 5: Hoàn ứng** | 0% | ❌ Chưa có |
| **Bước 6: Quyết toán** | 0% | ❌ Chưa có |
| **Bước 6.1: Phê duyệt ngoại lệ** | 0% | ❌ Chưa có |
| **Bước 7: Giải ngân** | 0% | ❌ Chưa có |

---

## ✅ ĐÃ HOÀN THÀNH

### **1. Backend API - Cơ bản hoàn chỉnh**
- ✅ Database schema với các trường cơ bản
- ✅ API endpoints: GET, POST, decision
- ✅ **MỚI**: API endpoint `POST /:id/budget` để lưu ngân sách
- ✅ **MỚI**: Database fields cho ngân sách:
  - `approved_budget_amount`, `approved_budget_currency`
  - `approved_budget_exchange_rate`, `budget_approved_at`, `budget_approved_by`
- ✅ Logic phê duyệt cho MANAGER, CEO, FINANCE
- ✅ Approval flow mapping
- ✅ Tự động xác định `requires_ceo` (công tác nước ngoài)
- ✅ Tự động xác định `is_overnight` (> 24h)
- ✅ **MỚI**: Tự động cập nhật status và current_step sau khi cấp ngân sách

### **2. Frontend - Module Phê Duyệt**
- ✅ Module "Phê duyệt công tác" (`TravelExpenseApproval`)
- ✅ **HOÀN THIỆN**: Tự động xác định `actorRole` dựa trên:
  - Tổng giám đốc: "Lê Thanh Tùng" → CEO
  - Kế toán: "Nguyễn Thị Ngọc Thúy" (Kế toán Trưởng) → FINANCE
  - Giám đốc chi nhánh: Chức danh chứa "Giám đốc" → MANAGER
  - Quản lý trực tiếp: Dựa vào `quan_ly_truc_tiep` → MANAGER
- ✅ UI layout 2 cột (danh sách + chi tiết) với container cố định chiều cao 951px
- ✅ Form phê duyệt với validation đầy đủ
- ✅ Tự động truyền `actorRole` và `actorId` vào API
- ✅ Hiển thị approval flow (Domestic/International) với trạng thái từng bước
- ✅ Tự động filter requests theo vai trò người dùng

### **3. Frontend - Module Quản Lý Kinh Phí (HR)**
- ✅ Module "Quản lý kinh phí công tác" (`TravelExpenseManagement`)
- ✅ **Tab A: Cấp Ngân Sách** - HOÀN THIỆN:
  - ✅ Form nhập ngân sách (Loại tiền, Tỷ giá, Số tiền)
  - ✅ Kết nối với API để lưu ngân sách vào database
  - ✅ Tự động load ngân sách đã cấp khi chọn request
  - ✅ Tự động cập nhật status → `PENDING_FINANCE` sau khi cấp ngân sách
  - ✅ Hiển thị ngân sách đã cấp trong form
  - ✅ Validation đầy đủ cho các trường nhập liệu
- ✅ Tab B: Form tạm ứng (đã có UI, chưa kết nối API)
- ✅ Container cố định chiều cao 951px, scrollable list
- ✅ Hiển thị danh sách yêu cầu chờ cấp ngân sách với scroll

### **4. Frontend - Module Tạo Yêu Cầu (Nhân viên)**
- ✅ Module tạo yêu cầu công tác (`TravelExpense`)
- ✅ Logic tự động kiểm tra qua đêm (>24h), nước ngoài
- ✅ Tự động xác định `location_type` (DOMESTIC/INTERNATIONAL)
- ✅ Validation form đầy đủ

---

## ⚠️ CẦN HOÀN THIỆN

### **Phase 1: Hoàn thiện Giai đoạn 1 (Ưu tiên CAO)**

#### **1.1. Bổ sung thông tin công ty (Bước 1)**
- ⚠️ Frontend đã có UI: `partnerCompany` và `companyAddress` trong form
- ❌ Chưa có fields: `company_name`, `company_address` trong database
- ❌ Chưa kết nối form submit với API (hiện tại chỉ có placeholder)
- ❌ Chưa cập nhật API endpoint để nhận và lưu thông tin công ty
- **Trạng thái**: UI đã có, cần hoàn thiện backend và kết nối
- **Ước tính**: 2-3 giờ
- **Ghi chú**: Theo yêu cầu trước đó, task này được defer vì "thông tin công ty khi nào có dự án thì nhân viên mới biết"

#### **1.2. Lưu ngân sách vào database (Bước 4 - Tab A)** ✅ HOÀN THÀNH
- ✅ Tạo API endpoint `POST /:id/budget` để lưu ngân sách đã duyệt
- ✅ Thêm fields vào database:
  - `approved_budget_amount`
  - `approved_budget_currency`
  - `approved_budget_exchange_rate`
  - `budget_approved_at`
  - `budget_approved_by`
- ✅ Tự động cập nhật status: `PENDING_LEVEL_1/LEVEL_2/CEO` → `PENDING_FINANCE`
- ✅ Tự động cập nhật current_step: `LEVEL_1/LEVEL_2/CEO` → `FINANCE`
- ✅ Kết nối form Tab A với API
- ✅ Tự động load ngân sách đã cấp khi chọn request
- ✅ Cập nhật `mapRowToResponse` để bao gồm `approvedBudget`
- ✅ Validation đầy đủ cho budget amount, currency, exchange rate
- ✅ Toast notification khi lưu thành công/thất bại
- **Đã hoàn thành**: 4-5 giờ

#### **1.3. Hoàn thiện Tab B: Tạm ứng (Bước 4)**
- ❌ Tạo API endpoint để xử lý tạm ứng
- ❌ Thêm fields vào database:
  - `advance_amount`
  - `advance_method`
  - `advance_requested_at`
  - `advance_transferred_at`
  - `advance_transferred_by`
  - `advance_confirmed_at`
- ❌ Fetch tài khoản ngân hàng từ hồ sơ nhân viên
- ❌ Kết nối form Tab B với API
- **Ước tính**: 5-6 giờ

#### **1.4. Module Xử Lý Tạm Ứng (Kế toán)**
- ❌ Tạo module mới cho kế toán
- ❌ Hiển thị danh sách yêu cầu cần chuyển khoản
- ❌ Form xác nhận đã chuyển khoản
- **Ước tính**: 6-8 giờ

#### **1.5. Phân biệt Cấp 1 và Cấp 2 (Bước 2)**
- ⚠️ Logic xác định khi nào cần Cấp 2 (Giám đốc chi nhánh) - Cần làm rõ quy tắc
- ❌ Thêm status `PENDING_LEVEL_2` vào database và logic
- ❌ Filter requests theo cấp phê duyệt trong module phê duyệt
- **Ước tính**: 3-4 giờ
- **Ghi chú**: Hiện tại module phê duyệt đã hỗ trợ cả Cấp 1 và CEO, cần làm rõ khi nào cần Cấp 2

---

### **Phase 2: Phát triển Giai đoạn 2 (Ưu tiên TRUNG BÌNH)**

#### **2.1. Module Báo Cáo Hoàn Ứng (Bước 5)**
- ❌ Tạo module cho nhân viên và HR
- ❌ Upload hóa đơn/chứng từ (file upload)
- ❌ Form nhập chi phí thực tế
- ❌ Xác nhận từ cả nhân viên và HR
- ❌ Thêm fields vào database:
  - `actual_expense_amount`
  - `settlement_status`
  - `employee_confirmed_at`
  - `hr_confirmed_at`
  - `attachments` (JSONB)
- **Ước tính**: 10-12 giờ

#### **2.2. Module Kiểm Tra & Quyết Toán (Bước 6)**
- ❌ Tạo module cho kế toán
- ❌ Kiểm tra tính hợp lệ của hóa đơn/chứng từ
- ❌ Đối chiếu với ngân sách cố định
- ❌ Logic hoàn ứng 2 trường hợp:
  - Trường hợp 1: Chi phí <= Ngân sách → Hoàn ứng tối đa bằng chi phí
  - Trường hợp 2: Chi phí > Ngân sách → Từ chối phần vượt, chuyển Bước 6.1
- ❌ Thêm fields vào database:
  - `accountant_checked_at`
  - `accountant_notes`
  - `reimbursement_amount`
  - `exceeds_budget`
  - `excess_amount`
- **Ước tính**: 12-15 giờ

#### **2.3. Module Phê Duyệt Ngoại Lệ (Bước 6.1)**
- ❌ Tạo module cho quản lý cấp cao/TGĐ
- ❌ Hiển thị lý do vượt ngân sách
- ❌ Xem các chứng từ liên quan
- ❌ Duyệt/từ chối khoản chi phí vượt mức
- ❌ Logic xử lý:
  - Duyệt → Kế toán hoàn ứng khoản chênh lệch
  - Từ chối → Chỉ hoàn ứng bằng ngân sách ban đầu
- ❌ Thêm fields vào database:
  - `exception_approval_status`
  - `exception_approver_id`
  - `exception_approval_notes`
  - `exception_approval_at`
  - `approved_excess_amount`
- **Ước tính**: 8-10 giờ

#### **2.4. Module Giải Ngân (Bước 7)**
- ❌ Tạo module cho kế toán
- ❌ Xác nhận giải ngân
- ❌ Ghi nhận vào hệ thống
- ❌ Xử lý hoàn trả nếu dư tạm ứng
- ❌ Trạng thái cuối: "Đã Quyết toán"
- ❌ Thêm fields vào database:
  - `final_status`
  - `final_reimbursement_amount`
  - `refund_amount`
  - `payment_confirmed_at`
  - `payment_method`
  - `payment_reference`
- **Ước tính**: 6-8 giờ

---

## 🎯 KHUYẾN NGHỊ PHÁT TRIỂN

### **Lộ trình đề xuất (theo thứ tự ưu tiên)**

#### **Sprint 1: Hoàn thiện Bước 1-4 (2-3 tuần)**
1. [ ] Bổ sung thông tin công ty (Bước 1)
2. [x] Lưu ngân sách vào database (Bước 4 - Tab A) ✅ HOÀN THÀNH
3. [ ] Hoàn thiện Tab B: Tạm ứng (Bước 4)
4. [ ] Module Xử Lý Tạm Ứng (Kế toán)
5. [ ] Phân biệt Cấp 1 và Cấp 2 (Bước 2)

**Kết quả**: Giai đoạn 1 hoàn chỉnh, có thể sử dụng trong production

#### **Sprint 2: Phát triển Bước 5-6 (2-3 tuần)**
1. ✅ Module Báo Cáo Hoàn Ứng (Bước 5)
2. ✅ Module Kiểm Tra & Quyết Toán (Bước 6)

**Kết quả**: Có thể quyết toán cơ bản

#### **Sprint 3: Hoàn thiện Bước 6.1-7 (1-2 tuần)**
1. ✅ Module Phê Duyệt Ngoại Lệ (Bước 6.1)
2. ✅ Module Giải Ngân (Bước 7)

**Kết quả**: Quy trình hoàn chỉnh

---

## 📋 CHECKLIST PHÁT TRIỂN

### **Database Migration**
- [ ] Thêm fields cho thông tin công ty (Bước 1)
- [x] Thêm fields cho ngân sách (Bước 4) ✅
- [ ] Thêm fields cho tạm ứng (Bước 4)
- [ ] Thêm fields cho hoàn ứng (Bước 5)
- [ ] Thêm fields cho quyết toán (Bước 6)
- [ ] Thêm fields cho phê duyệt ngoại lệ (Bước 6.1)
- [ ] Thêm fields cho giải ngân (Bước 7)

### **Backend API**
- [x] API lưu ngân sách (Bước 4 - Tab A) ✅
- [ ] API xử lý tạm ứng (Bước 4 - Tab B)
- [ ] API xác nhận chuyển khoản (Kế toán)
- [ ] API upload hóa đơn/chứng từ (Bước 5)
- [ ] API báo cáo hoàn ứng (Bước 5)
- [ ] API kiểm tra & quyết toán (Bước 6)
- [ ] API phê duyệt ngoại lệ (Bước 6.1)
- [ ] API giải ngân (Bước 7)

### **Frontend Components**
- [ ] Bổ sung fields công ty vào form tạo yêu cầu
- [x] Kết nối Tab A với API lưu ngân sách ✅
- [ ] Kết nối Tab B với API tạm ứng
- [ ] Module Xử Lý Tạm Ứng (Kế toán)
- [ ] Module Báo Cáo Hoàn Ứng (Nhân viên & HR)
- [ ] Module Kiểm Tra & Quyết Toán (Kế toán)
- [ ] Module Phê Duyệt Ngoại Lệ (Quản lý/TGĐ)
- [ ] Module Giải Ngân (Kế toán)

### **Testing & Validation**
- [ ] Test flow hoàn chỉnh Bước 1-4
- [ ] Test flow hoàn chỉnh Bước 5-7
- [ ] Test các edge cases
- [ ] Test phân quyền theo vai trò
- [ ] Test file upload

---

## 📊 ƯỚC TÍNH TỔNG THỜI GIAN

| Phase | Thời gian ước tính |
|-------|-------------------|
| **Phase 1** (Bước 1-4) | 16-21 giờ (~2-3 ngày) - Đã hoàn thành Tab A (4-5h) |
| **Phase 2** (Bước 5-6) | 22-27 giờ (~3-4 ngày) |
| **Phase 3** (Bước 6.1-7) | 14-18 giờ (~2 ngày) |
| **Tổng cộng** | **56-71 giờ (~8-10 ngày làm việc)** |

---

## 🚀 BƯỚC TIẾP THEO NGAY LẬP TỨC

### **1. Hoàn thiện Bước 1: Thêm thông tin công ty** ⚠️ DEFERRED
- ⚠️ Frontend đã có UI (`partnerCompany`, `companyAddress`)
- ❌ Thêm 2 fields vào database (`company_name`, `company_address`)
- ❌ Cập nhật API endpoint để nhận và lưu thông tin công ty
- ❌ Kết nối form submit với API thật (hiện tại chỉ có placeholder)
- **Thời gian**: 2-3 giờ
- **Ghi chú**: Task này được defer theo yêu cầu trước đó

### **2. Hoàn thiện Bước 4 - Tab A: Lưu ngân sách** ✅ HOÀN THÀNH
- ✅ Migration database (5 fields)
- ✅ Tạo API endpoint `POST /:id/budget`
- ✅ Kết nối form với API
- ✅ Tự động load ngân sách đã cấp
- ✅ Tự động cập nhật status và current_step
- **Đã hoàn thành**: 4-5 giờ

### **3. Test Module Phê Duyệt**
- Test với các vai trò khác nhau
- Verify `actorRole` được xác định đúng
- **Thời gian**: 1-2 giờ

---

## 📝 GHI CHÚ QUAN TRỌNG

1. **Phân quyền**: Đảm bảo mỗi vai trò chỉ thấy và xử lý các yêu cầu phù hợp
2. **Validation**: Backend phải validate `actorRole` phù hợp với `status` của yêu cầu
3. **File Upload**: Cần xử lý upload hóa đơn/chứng từ (Bước 5)
4. **Thông báo**: Cân nhắc thêm thông báo real-time khi có yêu cầu mới
5. **Audit Trail**: Lưu lại lịch sử thay đổi cho mỗi yêu cầu

---

---

## 📌 CẬP NHẬT GẦN ĐÂY

### **Tháng 12/2025**
- ✅ Hoàn thiện Tab A: Cấp Ngân Sách (Bước 4)
- ✅ Tích hợp API lưu ngân sách vào database
- ✅ Cải thiện UI/UX cho module phê duyệt và quản lý kinh phí
- ✅ Tối ưu container heights và scrolling behavior
- ✅ Tự động xác định actorRole trong module phê duyệt

---

**Cập nhật lần cuối**: Tháng 12/2025 - Sau khi hoàn thành lưu ngân sách vào database (Tab A)

