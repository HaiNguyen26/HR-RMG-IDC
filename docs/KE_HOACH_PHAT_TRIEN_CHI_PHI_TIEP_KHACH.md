# Kế Hoạch Phát Triển Module Chi Phí Tiếp Khách

## Tổng Quan

Module **Chi Phí Tiếp Khách** (Customer Entertainment Expenses) là một quy trình 4 bước chính thức để phê duyệt và thanh toán các khoản chi phí tiếp khách của nhân viên.

## Quy Trình 4 Bước

### BƯỚC 1: Người Yêu Cầu Lập Phiếu Chi
- **Vai trò**: Người Yêu Cầu (Claimant)
- **Hành động**: 
  - Lập Phiếu Yêu Cầu (Phiếu Chi)
  - Bắt buộc đính kèm đầy đủ chứng từ, hóa đơn gốc
- **Kết quả**: Gửi Phiếu Chi đến Giám đốc Chi nhánh

### BƯỚC 2: Giám đốc Chi nhánh Duyệt Lần 1
- **Vai trò**: Giám đốc Chi nhánh (Branch Director)
- **Hành động**: 
  - Kiểm tra tính hợp lệ, hợp lý của khoản chi và chứng từ
  - Phê duyệt Lần 1 (Duyệt/Từ Chối)
- **Kết quả**: Nếu duyệt, chuyển Phiếu Chi cho Bộ phận Kế toán

### BƯỚC 3: Kế toán Tổng hợp & Tổng Giám đốc Duyệt Lần 2
- **Vai trò**: Kế toán & Tổng Giám đốc (TGĐ)
- **Hành động**: 
  - Kế toán tổng hợp các phiếu đã duyệt thành Báo cáo Tổng hợp
  - TGĐ xem xét Báo cáo và Phê duyệt Lần 2 (Duyệt/Từ Chối toàn bộ)
- **Kết quả**: Chuyển kết quả phê duyệt cuối cùng về cho Kế toán

### BƯỚC 4: Kế toán Thanh toán
- **Vai trò**: Kế toán (Accountant)
- **Hành động**: 
  - Sau khi nhận được duyệt cuối cùng từ TGĐ, tiến hành Thanh toán tiền (hoặc hoàn ứng) cho Người Yêu Cầu
- **Kết quả**: Hoàn tất quy trình chi phí

---

## Kế Hoạch Phát Triển

### Phase 1: Database Schema & Backend API (Tuần 1)

#### 1.1. Tạo Database Schema
**File**: `database/create_customer_entertainment_expenses_table.sql`

```sql
CREATE TABLE IF NOT EXISTS customer_entertainment_expenses (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Thông tin phiếu chi
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expense_date DATE NOT NULL,
    purpose TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'VND',
    
    -- Thông tin khách hàng/đối tác
    customer_name VARCHAR(255),
    customer_company VARCHAR(255),
    number_of_guests INTEGER DEFAULT 1,
    
    -- Chứng từ đính kèm
    attachments JSONB, -- [{filename, filepath, uploaded_at}]
    
    -- Quy trình duyệt
    status VARCHAR(50) DEFAULT 'PENDING_BRANCH_DIRECTOR',
    current_step VARCHAR(50) DEFAULT 'STEP_1',
    
    -- Bước 1: Người yêu cầu
    requested_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Bước 2: Giám đốc Chi nhánh
    branch_director_id INTEGER REFERENCES employees(id),
    branch_director_decision VARCHAR(20), -- 'APPROVED', 'REJECTED'
    branch_director_notes TEXT,
    branch_director_decision_at TIMESTAMP,
    
    -- Bước 3: Kế toán & Tổng Giám đốc
    accountant_id INTEGER REFERENCES employees(id),
    summary_report_id INTEGER, -- ID của báo cáo tổng hợp
    general_director_id INTEGER REFERENCES employees(id),
    general_director_decision VARCHAR(20), -- 'APPROVED', 'REJECTED'
    general_director_notes TEXT,
    general_director_decision_at TIMESTAMP,
    
    -- Bước 4: Thanh toán
    payment_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'REIMBURSED'
    payment_amount NUMERIC(12, 2),
    payment_date DATE,
    payment_method VARCHAR(50), -- 'CASH', 'BANK_TRANSFER', 'ADVANCE'
    payment_notes TEXT,
    paid_by INTEGER REFERENCES employees(id),
    paid_at TIMESTAMP,
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_entertainment_employee ON customer_entertainment_expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_customer_entertainment_status ON customer_entertainment_expenses(status);
CREATE INDEX IF NOT EXISTS idx_customer_entertainment_branch_director ON customer_entertainment_expenses(branch_director_id);
CREATE INDEX IF NOT EXISTS idx_customer_entertainment_general_director ON customer_entertainment_expenses(general_director_id);
```

#### 1.2. Tạo Bảng Báo cáo Tổng hợp
**File**: `database/create_summary_reports_table.sql`

```sql
CREATE TABLE IF NOT EXISTS summary_reports (
    id SERIAL PRIMARY KEY,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'VND',
    expense_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'PENDING_GENERAL_DIRECTOR',
    
    -- Thông tin người tạo báo cáo
    created_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Thông tin Tổng Giám đốc
    general_director_id INTEGER REFERENCES employees(id),
    general_director_decision VARCHAR(20),
    general_director_notes TEXT,
    general_director_decision_at TIMESTAMP,
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS summary_report_expenses (
    id SERIAL PRIMARY KEY,
    summary_report_id INTEGER NOT NULL REFERENCES summary_reports(id) ON DELETE CASCADE,
    expense_id INTEGER NOT NULL REFERENCES customer_entertainment_expenses(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(summary_report_id, expense_id)
);

CREATE INDEX IF NOT EXISTS idx_summary_report_expenses_report ON summary_report_expenses(summary_report_id);
CREATE INDEX IF NOT EXISTS idx_summary_report_expenses_expense ON summary_report_expenses(expense_id);
```

#### 1.3. Backend API Routes
**File**: `backend/routes/customerEntertainmentExpenses.js`

**Endpoints cần tạo:**
- `POST /api/customer-entertainment-expenses` - Tạo phiếu chi mới (Bước 1)
- `GET /api/customer-entertainment-expenses` - Lấy danh sách phiếu chi (filter theo role)
- `GET /api/customer-entertainment-expenses/:id` - Lấy chi tiết phiếu chi
- `PUT /api/customer-entertainment-expenses/:id/approve` - Giám đốc Chi nhánh duyệt (Bước 2)
- `PUT /api/customer-entertainment-expenses/:id/reject` - Giám đốc Chi nhánh từ chối (Bước 2)
- `POST /api/customer-entertainment-expenses/summary-reports` - Kế toán tạo báo cáo tổng hợp (Bước 3)
- `GET /api/customer-entertainment-expenses/summary-reports` - Lấy danh sách báo cáo tổng hợp
- `GET /api/customer-entertainment-expenses/summary-reports/:id` - Lấy chi tiết báo cáo tổng hợp
- `PUT /api/customer-entertainment-expenses/summary-reports/:id/approve` - TGĐ duyệt báo cáo (Bước 3)
- `PUT /api/customer-entertainment-expenses/summary-reports/:id/reject` - TGĐ từ chối báo cáo (Bước 3)
- `PUT /api/customer-entertainment-expenses/:id/pay` - Kế toán thanh toán (Bước 4)
- `POST /api/customer-entertainment-expenses/:id/attachments` - Upload chứng từ
- `DELETE /api/customer-entertainment-expenses/:id/attachments/:attachmentId` - Xóa chứng từ

---

### Phase 2: Frontend Components - Bước 1 (Tuần 2)

#### 2.1. Component Người Yêu Cầu
**File**: `frontend/src/components/CustomerEntertainmentExpense/CustomerEntertainmentExpenseRequest.js`

**Chức năng:**
- Form tạo phiếu chi mới
- Upload chứng từ, hóa đơn (multiple files)
- Preview và xóa file đã upload
- Validation form
- Submit và gửi đến Giám đốc Chi nhánh

**Fields:**
- Ngày chi phí (expense_date) - Date picker
- Mục đích (purpose) - Textarea
- Số tiền (amount) - Number input
- Loại tiền tệ (currency) - Select (VND, USD, EUR)
- Tên khách hàng/đối tác (customer_name) - Text input
- Tên công ty khách hàng (customer_company) - Text input
- Số lượng khách (number_of_guests) - Number input
- Chứng từ đính kèm (attachments) - File upload (multiple)

#### 2.2. Component Danh sách Phiếu Chi của Người Yêu Cầu
**File**: `frontend/src/components/CustomerEntertainmentExpense/CustomerEntertainmentExpenseList.js`

**Chức năng:**
- Hiển thị danh sách phiếu chi đã tạo
- Filter theo trạng thái
- Xem chi tiết phiếu chi
- Hủy phiếu chi (nếu chưa được duyệt)

---

### Phase 3: Frontend Components - Bước 2 (Tuần 3)

#### 3.1. Component Giám đốc Chi nhánh
**File**: `frontend/src/components/CustomerEntertainmentExpense/CustomerEntertainmentExpenseBranchDirector.js`

**Chức năng:**
- Xem danh sách phiếu chi chờ duyệt
- Xem chi tiết phiếu chi và chứng từ
- Duyệt/Từ chối phiếu chi
- Nhập ghi chú khi từ chối
- Filter và search

**Workflow:**
- Hiển thị badge số lượng phiếu chờ duyệt
- Click vào phiếu để xem chi tiết
- Có nút "Duyệt" và "Từ chối"
- Khi từ chối, hiển thị textarea để nhập lý do

---

### Phase 4: Frontend Components - Bước 3 (Tuần 4)

#### 4.1. Component Kế toán - Tạo Báo cáo Tổng hợp
**File**: `frontend/src/components/CustomerEntertainmentExpense/CustomerEntertainmentExpenseAccountant.js`

**Chức năng:**
- Xem danh sách phiếu chi đã được Giám đốc Chi nhánh duyệt
- Chọn nhiều phiếu để tạo báo cáo tổng hợp
- Tạo báo cáo tổng hợp theo kỳ (tuần/tháng)
- Xem danh sách báo cáo đã tạo
- Xem chi tiết báo cáo

**Features:**
- Checkbox để chọn phiếu chi
- Tự động tính tổng số tiền
- Chọn kỳ báo cáo (period_start, period_end)
- Preview báo cáo trước khi gửi

#### 4.2. Component Tổng Giám đốc
**File**: `frontend/src/components/CustomerEntertainmentExpense/CustomerEntertainmentExpenseGeneralDirector.js`

**Chức năng:**
- Xem danh sách báo cáo tổng hợp chờ duyệt
- Xem chi tiết báo cáo và danh sách phiếu chi trong báo cáo
- Duyệt/Từ chối toàn bộ báo cáo
- Nhập ghi chú khi từ chối

**Workflow:**
- Hiển thị badge số lượng báo cáo chờ duyệt
- Click vào báo cáo để xem chi tiết
- Hiển thị bảng tổng hợp các phiếu chi
- Có nút "Duyệt Tất Cả" và "Từ Chối Tất Cả"

---

### Phase 5: Frontend Components - Bước 4 (Tuần 5)

#### 5.1. Component Kế toán - Thanh toán
**File**: `frontend/src/components/CustomerEntertainmentExpense/CustomerEntertainmentExpensePayment.js`

**Chức năng:**
- Xem danh sách phiếu chi đã được TGĐ duyệt, chờ thanh toán
- Thực hiện thanh toán cho từng phiếu chi
- Nhập thông tin thanh toán:
  - Số tiền thanh toán
  - Phương thức thanh toán (Tiền mặt, Chuyển khoản, Hoàn ứng)
  - Số tài khoản ngân hàng (nếu chuyển khoản)
  - Ghi chú
- Xem lịch sử thanh toán

**Features:**
- Badge số lượng phiếu chờ thanh toán
- Form thanh toán với validation
- Hiển thị thông tin người nhận tiền
- Xác nhận trước khi thanh toán

---

### Phase 6: Integration & Testing (Tuần 6)

#### 6.1. Sidebar Integration
- Thêm menu item "Chi phí Tiếp khách" vào Sidebar
- Badge hiển thị số lượng phiếu chờ xử lý theo từng role

#### 6.2. Routing
- Thêm routes trong `App.js`:
  - `/customer-entertainment-expense-request` - Người yêu cầu
  - `/customer-entertainment-expense-branch-director` - Giám đốc Chi nhánh
  - `/customer-entertainment-expense-accountant` - Kế toán
  - `/customer-entertainment-expense-general-director` - Tổng Giám đốc
  - `/customer-entertainment-expense-payment` - Thanh toán

#### 6.3. API Service
**File**: `frontend/src/services/api.js`

Thêm các API methods:
```javascript
customerEntertainmentExpensesAPI: {
  create: (data) => api.post('/customer-entertainment-expenses', data),
  getAll: (params) => api.get('/customer-entertainment-expenses', { params }),
  getById: (id) => api.get(`/customer-entertainment-expenses/${id}`),
  approve: (id, data) => api.put(`/customer-entertainment-expenses/${id}/approve`, data),
  reject: (id, data) => api.put(`/customer-entertainment-expenses/${id}/reject`, data),
  pay: (id, data) => api.put(`/customer-entertainment-expenses/${id}/pay`, data),
  uploadAttachment: (id, formData) => api.post(`/customer-entertainment-expenses/${id}/attachments`, formData),
  deleteAttachment: (id, attachmentId) => api.delete(`/customer-entertainment-expenses/${id}/attachments/${attachmentId}`),
  // Summary Reports
  createSummaryReport: (data) => api.post('/customer-entertainment-expenses/summary-reports', data),
  getSummaryReports: (params) => api.get('/customer-entertainment-expenses/summary-reports', { params }),
  getSummaryReportById: (id) => api.get(`/customer-entertainment-expenses/summary-reports/${id}`),
  approveSummaryReport: (id, data) => api.put(`/customer-entertainment-expenses/summary-reports/${id}/approve`, data),
  rejectSummaryReport: (id, data) => api.put(`/customer-entertainment-expenses/summary-reports/${id}/reject`, data),
}
```

#### 6.4. Testing
- Unit tests cho các components
- Integration tests cho API endpoints
- E2E tests cho quy trình 4 bước
- Test với dữ liệu mock

---

## Status Flow

```
PENDING_BRANCH_DIRECTOR (Bước 1 → Bước 2)
    ↓
APPROVED_BY_BRANCH_DIRECTOR (Bước 2 → Bước 3)
    ↓
IN_SUMMARY_REPORT (Đã thêm vào báo cáo tổng hợp)
    ↓
APPROVED_BY_GENERAL_DIRECTOR (Bước 3 → Bước 4)
    ↓
PAID (Bước 4 - Hoàn tất)

REJECTED_BY_BRANCH_DIRECTOR (Bước 2 - Từ chối)
REJECTED_BY_GENERAL_DIRECTOR (Bước 3 - Từ chối)
CANCELLED (Người yêu cầu hủy)
```

---

## File Structure

```
frontend/src/components/CustomerEntertainmentExpense/
├── CustomerEntertainmentExpenseRequest.js      # Bước 1: Người yêu cầu
├── CustomerEntertainmentExpenseRequest.css
├── CustomerEntertainmentExpenseList.js         # Danh sách phiếu chi
├── CustomerEntertainmentExpenseList.css
├── CustomerEntertainmentExpenseBranchDirector.js  # Bước 2: Giám đốc Chi nhánh
├── CustomerEntertainmentExpenseBranchDirector.css
├── CustomerEntertainmentExpenseAccountant.js   # Bước 3: Kế toán
├── CustomerEntertainmentExpenseAccountant.css
├── CustomerEntertainmentExpenseGeneralDirector.js  # Bước 3: Tổng Giám đốc
├── CustomerEntertainmentExpenseGeneralDirector.css
├── CustomerEntertainmentExpensePayment.js      # Bước 4: Thanh toán
├── CustomerEntertainmentExpensePayment.css
└── components/
    ├── ExpenseForm.js                          # Form chung
    ├── ExpenseForm.css
    ├── ExpenseDetailModal.js                   # Modal chi tiết
    ├── ExpenseDetailModal.css
    ├── AttachmentViewer.js                     # Xem chứng từ
    ├── AttachmentViewer.css
    ├── SummaryReportForm.js                    # Form báo cáo tổng hợp
    └── SummaryReportForm.css
```

---

## Dependencies

- File upload: `multer` (backend), `FormData` (frontend)
- Date picker: Sử dụng component có sẵn hoặc `react-datepicker`
- Currency formatting: `Intl.NumberFormat`
- PDF generation: Có thể dùng `jsPDF` hoặc `pdfkit` để tạo báo cáo PDF

---

## Timeline Tổng Quan

- **Tuần 1**: Database Schema + Backend API
- **Tuần 2**: Frontend Bước 1 (Người yêu cầu)
- **Tuần 3**: Frontend Bước 2 (Giám đốc Chi nhánh)
- **Tuần 4**: Frontend Bước 3 (Kế toán & Tổng Giám đốc)
- **Tuần 5**: Frontend Bước 4 (Thanh toán)
- **Tuần 6**: Integration, Testing, Bug fixes

**Tổng thời gian dự kiến: 6 tuần**

---

## Notes

1. **File Upload**: Cần xử lý upload file an toàn, validate file type và size
2. **Security**: Kiểm tra quyền truy cập ở mỗi bước
3. **Notifications**: Gửi thông báo khi có phiếu chi mới, khi được duyệt/từ chối
4. **Audit Trail**: Lưu lại lịch sử thay đổi trạng thái
5. **Export**: Có thể thêm tính năng export Excel/PDF cho báo cáo

