# HR Management System - RMG-IDC

Hệ thống quản lý nhân sự - Web Application với Node.js, React.js và PostgreSQL

**🚀 Deploy:** [QUICK_DEPLOY.md](QUICK_DEPLOY.md) | [DEPLOY_SERVER_NEW.md](DEPLOY_SERVER_NEW.md)  
**📍 Server:** 27.71.16.15

## 🚀 Khởi động nhanh

### 1. Kiểm tra Database
- Tạo database `HR_Management_System` trong PostgreSQL
- Import schema từ `database/database_schema_postgresql.sql`

### 2. Chạy ứng dụng

**🎯 Cách đơn giản nhất - Một lệnh duy nhất:**
```bash
# Từ thư mục gốc (d:\Web-App-HR-Demo)
npm run dev
```
Lệnh này sẽ chạy cả Backend và Frontend cùng lúc!

**Hoặc dùng script:**
```bash
# Git Bash
./start.sh

# Hoặc Windows
start.bat
```

**Hoặc chạy thủ công (2 terminal):**
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

### 3. Truy cập
- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:3000

## 📁 Cấu trúc Project

```
HR-Management-System/
├── backend/              # Node.js + Express API
├── frontend/             # React.js Frontend
├── database/             # Database scripts (.sql)
│   ├── database_schema_postgresql.sql
│   ├── database_add_users_table.sql
│   └── database_add_employee_code.sql
├── docs/                 # Documentation files
├── scripts/              # Utility scripts
│   ├── fix-ports.js
│   ├── fix_port.bat
│   └── fix_port.sh
├── start_dev.bat         # Chạy npm run dev (Windows)
├── start_dev.sh          # Chạy npm run dev (Git Bash)
├── start.bat             # Script khởi động (Windows - 2 cửa sổ)
├── start.sh              # Script khởi động (Git Bash - background)
├── package.json          # Root package.json (chạy cả 2 cùng lúc)
└── README.md
```

## 🔧 Tech Stack

- **Backend:** Node.js + Express.js
- **Frontend:** React.js
- **Database:** PostgreSQL
- **Password Hashing:** bcrypt

## 📚 Tài liệu

### Development
- [Hướng dẫn khởi động chi tiết](docs/HUONG_DAN_KHOI_DONG.md)
- [Hướng dẫn chạy trong PowerShell/CMD](docs/CHAY_POWERSHELL_CMD.md)
- [Chạy nhanh](docs/CHAY_NHANH.md)
- [Setup Guide](docs/README_SETUP.md)
- [API Documentation](docs/README_API.md)
- [Database Documentation](docs/DATABASE_README.md)
- [Login Credentials](docs/LOGIN_CREDENTIALS.md)

### Deployment
- [🚀 DEPLOY - Hướng dẫn từng bước](DEPLOY.md) ⭐ **BẮT ĐẦU TỪ ĐÂY**
- [🔄 WORKFLOW - Code và Deploy hàng ngày](WORKFLOW.md) ⭐ **WORKFLOW HÀNG NGÀY - ĐỌC FILE NÀY**
- [🔄 UPDATE - Cập nhật Code & Database (Chi tiết)](UPDATE.md)
- [🗄️ Lựa chọn Database](DATABASE_OPTIONS.md) - Database mới hay Migrate?
- [📦 Migrate Database từ Local](MIGRATE_DATABASE.md) - **Nếu có database ở local**

## ⚙️ Cấu hình

File `.env` trong `backend/`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=HR_Management_System
DB_USER=postgres
DB_PASSWORD=Hainguyen261097
PORT=3000
```

## 📝 Lưu ý

- Đảm bảo PostgreSQL đang chạy
- Đảm bảo database đã được tạo và schema đã import
- Logo cần có trong `frontend/public/LogoRMG.png`

---

Xem [Hướng dẫn khởi động chi tiết](docs/HUONG_DAN_KHOI_DONG.md) để biết thêm chi tiết!
