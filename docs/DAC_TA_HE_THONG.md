# 📋 ĐẶC TẢ HỆ THỐNG - HR MANAGEMENT SYSTEM

## 🎯 TỔNG QUAN DỰ ÁN

**HR Management System** là hệ thống quản lý nhân sự toàn diện, hỗ trợ quản lý các quy trình nhân sự từ tuyển dụng, quản lý nhân viên, đến xử lý các yêu cầu công tác phí, chi phí tiếp khách, và các quy trình liên quan.

---

## 🛠️ CÔNG NGHỆ PHÁT TRIỂN

### **Frontend**
- **Framework:** React 18.2.0
- **Build Tool:** Create React App (react-scripts 5.0.1)
- **HTTP Client:** Axios 1.6.2
- **Date Picker:** react-datepicker 8.9.0
- **PDF Generation:** jsPDF 3.0.4, pdfmake 0.2.20, html2pdf.js 0.12.1
- **Excel Processing:** xlsx 0.18.5
- **Styling:** CSS3 (Custom CSS modules)

### **Backend**
- **Runtime:** Node.js
- **Framework:** Express.js 4.18.2
- **Database:** PostgreSQL (pg 8.11.3)
- **Authentication:** bcrypt 5.1.1
- **File Upload:** multer 2.0.2
- **Environment:** dotenv 16.3.1
- **CORS:** cors 2.8.5

### **Database**
- **Hệ quản trị:** PostgreSQL
- **ORM:** Native SQL queries (pg library)

### **DevOps & Tools**
- **Process Manager:** PM2 (production)
- **Web Server:** Nginx (reverse proxy)
- **Development:** Nodemon, Concurrently
- **Version Control:** Git

---

## 🏗️ KIẾN TRÚC HỆ THỐNG

```
┌─────────────────┐
│   Frontend      │  React App (Port 3001)
│   (React)       │
└────────┬────────┘
         │ HTTP/REST API
         │
┌────────▼────────┐
│   Backend       │  Express.js (Port 3000)
│   (Node.js)     │
└────────┬────────┘
         │ SQL Queries
         │
┌────────▼────────┐
│   Database      │  PostgreSQL
│   (PostgreSQL)  │
└─────────────────┘
```

### **Mô hình kiến trúc:**
- **Client-Server Architecture**
- **RESTful API**
- **Single Page Application (SPA)**
- **Layered Architecture** (Presentation → Business Logic → Data Access)

---

## 📦 CÁC MODULE CHÍNH

### **1. Quản Lý Nhân Viên (Employee Management)**
- Quản lý thông tin nhân viên
- Import/Export Excel
- Tìm kiếm và lọc nhân viên
- Quản lý thông tin cá nhân, phòng ban, chức danh

### **2. Tuyển Dụng (Recruitment)**
- Tạo yêu cầu tuyển dụng
- Quản lý ứng viên
- Đánh giá phỏng vấn
- Quản lý thử việc
- Xuất hợp đồng lao động

### **3. Quản Lý Yêu Cầu (Request Management)**
- **Nghỉ phép (Leave Requests)**
- **Làm thêm giờ (Overtime Requests)**
- **Điều chỉnh chấm công (Attendance Adjustments)**
- Workflow phê duyệt đa cấp

### **4. Công Tác Phí (Travel Expenses)**
- Tạo yêu cầu công tác (trong nước/ngoài nước)
- Phê duyệt đa cấp (Quản lý → Giám đốc → CEO)
- Xử lý tạm ứng
- Quyết toán và giải ngân
- Quản lý chứng từ và hóa đơn

### **5. Chi Phí Tiếp Khách (Customer Entertainment Expenses)**
- Tạo phiếu chi tiếp khách
- Phê duyệt đa cấp
- Xử lý thanh toán
- Quản lý chứng từ

### **6. Thống Kê & Báo Cáo (Statistics & Reports)**
- Dashboard tổng quan
- Thống kê nhân sự
- Báo cáo yêu cầu
- Xuất báo cáo PDF/Excel

### **7. Xác Thực & Phân Quyền (Authentication & Authorization)**
- Đăng nhập/Đăng xuất
- Phân quyền theo vai trò:
  - **ADMIN:** Toàn quyền
  - **HR:** Quản lý nhân sự, xử lý yêu cầu
  - **MANAGER:** Phê duyệt yêu cầu cấp 1
  - **BRANCH_DIRECTOR:** Phê duyệt yêu cầu cấp 2
  - **CEO:** Phê duyệt đặc biệt
  - **EMPLOYEE:** Tạo và theo dõi yêu cầu

---

## 🔄 QUY TRÌNH LÀM VIỆC CHÍNH

### **1. Quy Trình Công Tác Phí**

#### **Flow Trong Nước:**
```
Nhân viên tạo đơn
    ↓
Quản lý trực tiếp duyệt (Cấp 1)
    ↓
Giám đốc Chi nhánh duyệt (Cấp 2)
    ↓
HR xử lý tạm ứng
    ↓
Kế toán xác nhận chuyển khoản
    ↓
Nhân viên submit báo cáo hoàn ứng
    ↓
HR xác nhận báo cáo (+ đính kèm file)
    ↓
Kế toán quyết toán & giải ngân
```

#### **Flow Ngoài Nước:**
```
Nhân viên tạo đơn
    ↓
Quản lý trực tiếp duyệt (Cấp 1)
    ↓
Giám đốc Chi nhánh duyệt (Cấp 2)
    ↓
CEO duyệt (Cấp 3) ← BẮT BUỘC
    ↓
HR xử lý tạm ứng
    ↓
Kế toán xác nhận chuyển khoản
    ↓
Nhân viên submit báo cáo hoàn ứng
    ↓
HR xác nhận báo cáo (+ đính kèm file)
    ↓
Kế toán quyết toán & giải ngân
    (Nếu vượt ngân sách → CEO phê duyệt ngoại lệ)
```

### **2. Quy Trình Tuyển Dụng**
```
Tạo yêu cầu tuyển dụng
    ↓
Phê duyệt yêu cầu
    ↓
Quản lý ứng viên
    ↓
Đánh giá phỏng vấn
    ↓
Ký hợp đồng thử việc
    ↓
Quản lý thử việc
    ↓
Ký hợp đồng chính thức
```

### **3. Quy Trình Yêu Cầu Nhân Viên**
```
Nhân viên tạo yêu cầu
    ↓
Quản lý trực tiếp duyệt
    ↓
HR xử lý (nếu cần)
    ↓
Hoàn tất
```

---

## 📁 CẤU TRÚC DỰ ÁN

```
HR_Management_System/
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── components/       # React Components
│   │   │   ├── EmployeeTable/
│   │   │   ├── TravelExpense/
│   │   │   ├── RecruitmentManagement/
│   │   │   └── ...
│   │   ├── services/         # API Services
│   │   └── utils/            # Utility functions
│   └── public/
│
├── backend/                  # Node.js Backend
│   ├── routes/               # API Routes
│   │   ├── employees.js
│   │   ├── travelExpenses.js
│   │   ├── recruitmentRequests.js
│   │   └── ...
│   ├── config/              # Configuration
│   │   └── database.js
│   └── server.js            # Entry point
│
├── database/                 # Database Scripts
│   ├── database_schema_postgresql.sql
│   └── migrations/
│
├── docs/                     # Documentation
│   ├── QUY_TRINH_CONG_TAC_PHI_TONG_HOP.md
│   ├── HUONG_DAN_KHOI_DONG.md
│   └── ...
│
└── scripts/                  # Utility Scripts
    ├── fix-ports.js
    └── backup-hr-database.sh
```

---

## 🔐 BẢO MẬT

- **Authentication:** Session-based với bcrypt password hashing
- **Authorization:** Role-based access control (RBAC)
- **Data Validation:** Input validation ở cả frontend và backend
- **SQL Injection Prevention:** Parameterized queries
- **File Upload Security:** File type validation, size limits
- **CORS:** Configured cho production environment

---

## 📊 DATABASE SCHEMA

### **Bảng chính:**
- `employees` - Thông tin nhân viên
- `users` - Tài khoản người dùng
- `travel_expense_requests` - Yêu cầu công tác phí
- `customer_entertainment_expense_requests` - Chi phí tiếp khách
- `leave_requests` - Yêu cầu nghỉ phép
- `overtime_requests` - Yêu cầu làm thêm giờ
- `recruitment_requests` - Yêu cầu tuyển dụng
- `candidates` - Ứng viên
- `interview_requests` - Yêu cầu phỏng vấn
- `travel_expense_attachments` - File đính kèm công tác phí

---

## 🚀 DEPLOYMENT

### **Development:**
```bash
npm run dev          # Chạy cả frontend và backend
npm run dev:safe     # Tự động fix port trước khi chạy
```

### **Production:**
- **Backend:** PM2 process manager
- **Frontend:** Nginx reverse proxy
- **Database:** PostgreSQL trên server
- **File Storage:** Local filesystem (`uploads/`)

### **Environment Variables:**
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `REACT_APP_API_URL` - API endpoint cho frontend
- `PORT` - Server port (default: 3000)

---

## 📈 TÍNH NĂNG NỔI BẬT

1. **Workflow đa cấp:** Hỗ trợ phê duyệt nhiều cấp với logic tự động
2. **Tự động tính toán:** Phí sinh hoạt tự động theo địa điểm công tác
3. **Upload file:** Hỗ trợ upload và quản lý file đính kèm
4. **Export/Import:** Xuất nhập dữ liệu Excel
5. **Real-time updates:** Tự động refresh danh sách yêu cầu
6. **Responsive design:** Giao diện thân thiện, dễ sử dụng
7. **Multi-language support:** Hỗ trợ tiếng Việt

---

## 🔧 CÔNG CỤ PHÁT TRIỂN

- **IDE:** Visual Studio Code (khuyến nghị)
- **Database Tool:** pgAdmin 4
- **API Testing:** Postman / Browser DevTools
- **Version Control:** Git
- **Package Manager:** npm

---

## 📝 TÀI LIỆU THAM KHẢO

- `docs/QUY_TRINH_CONG_TAC_PHI_TONG_HOP.md` - Quy trình công tác phí & tiếp khách
- `docs/HUONG_DAN_KHOI_DONG.md` - Hướng dẫn khởi động
- `docs/README_API.md` - Tài liệu API
- `database/DATABASE_README.md` - Tài liệu database

---

## 📞 HỖ TRỢ

Để biết thêm chi tiết, vui lòng tham khảo các file trong thư mục `docs/`.

---

**Phiên bản:** 1.0.0  
**Cập nhật:** 2025

