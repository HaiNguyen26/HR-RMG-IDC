# 📊 Phân tích Triển khai HR Management System

## 🎯 Mục tiêu

Triển khai HR Management System lên server `27.71.16.15` cùng với IT-Request app đã có, đảm bảo cả 2 app hoạt động độc lập và không xung đột.

---

## 📋 Phân tích Hiện trạng

### IT-Request App (Đã có)
| Thông số | Giá trị |
|----------|---------|
| **Backend Port** | 4000 |
| **Frontend Path** | `/` (root) |
| **API Path** | `/api` |
| **Project Directory** | `/var/www/it-request-tracking` |
| **PM2 Name** | `it-request-api` |
| **Database** | `it_request_tracking` |
| **Nginx Config** | `/etc/nginx/sites-available/it-request-tracking` |

### HR Management App (Cần triển khai)
| Thông số | Giá trị đề xuất |
|----------|-----------------|
| **Backend Port** | 3000 ✅ (không conflict) |
| **Frontend Path** | `/hr` ✅ (path routing) |
| **API Path** | `/hr/api` ✅ (path routing) |
| **Project Directory** | `/var/www/hr-management` ✅ (riêng biệt) |
| **PM2 Name** | `hr-management-api` ✅ (không conflict) |
| **Database** | `HR_Management_System` ✅ (riêng biệt) |
| **Nginx Config** | Thêm vào config IT-Request ✅ |

---

## 🔍 Phân tích Xung đột

### ✅ Không có xung đột

1. **Ports**
   - IT-Request: 4000
   - HR: 3000
   - ✅ Không conflict

2. **Database**
   - IT-Request: `it_request_tracking`
   - HR: `HR_Management_System`
   - ✅ Không conflict

3. **PM2 Process Names**
   - IT-Request: `it-request-api`
   - HR: `hr-management-api`
   - ✅ Không conflict

4. **Project Directories**
   - IT-Request: `/var/www/it-request-tracking`
   - HR: `/var/www/hr-management`
   - ✅ Không conflict

5. **Nginx Routing**
   - IT-Request: `/` → root path
   - HR: `/hr` → sub-path
   - ✅ Không conflict (dùng path routing)

---

## 🏗️ Kiến trúc Triển khai

### Network Architecture

```
Internet
   │
   └─── 27.71.16.15:80 (Nginx)
         │
         ├─── / → IT-Request Frontend (port 4000 backend)
         │
         └─── /hr → HR Management Frontend (port 3000 backend)
               └─── /hr/api → HR Management API Proxy
```

### Directory Structure

```
/var/www/
├── it-request-tracking/          # IT-Request App
│   ├── server/                    # Backend (port 4000)
│   └── webapp/                    # Frontend build
│
└── hr-management/                 # HR Management App
    ├── backend/                   # Backend (port 3000)
    │   ├── server.js
    │   └── .env
    ├── frontend/
    │   └── build/                 # Frontend build
    └── database/                  # SQL scripts
```

### PM2 Processes

```
┌─────────────────────┐
│  it-request-api     │  → Port 4000
│  (IT-Request)       │
└─────────────────────┘

┌─────────────────────┐
│  hr-management-api  │  → Port 3000
│  (HR Management)    │
└─────────────────────┘
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name 27.71.16.15;
    
    # IT-Request Frontend (root)
    root /var/www/it-request-tracking/webapp/dist;
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # IT-Request API
    location /api {
        proxy_pass http://localhost:4000;
    }
    
    # HR Management Frontend (sub-path)
    location /hr {
        alias /var/www/hr-management/frontend/build;
        try_files $uri $uri/ /hr/index.html;
    }
    
    # HR Management API (sub-path)
    location /hr/api {
        proxy_pass http://localhost:3000/api;
    }
}
```

---

## 📦 Dependencies & Requirements

### Server Requirements

- ✅ **Node.js**: 18+ (đã có)
- ✅ **PostgreSQL**: Đã cài đặt
- ✅ **PM2**: Đã cài đặt
- ✅ **Nginx**: Đã cài đặt và cấu hình
- ✅ **Git**: Đã có

### HR App Dependencies

**Backend:**
- express
- pg (PostgreSQL client)
- bcrypt
- cors
- dotenv
- multer
- pdfkit
- xlsx

**Frontend:**
- react
- react-dom
- react-scripts
- axios
- react-datepicker
- xlsx

---

## 🔄 Workflow Triển khai

### Phase 1: Chuẩn bị (Local)

1. ✅ Backup database HR từ local
2. ✅ Commit code lên GitHub
3. ✅ Tạo scripts deploy

### Phase 2: Triển khai (Server)

1. ✅ Kết nối SSH vào server
2. ✅ Upload backup database
3. ✅ Clone repository
4. ✅ Install dependencies
5. ✅ Setup database (create + restore backup)
6. ✅ Build frontend
7. ✅ Configure PM2
8. ✅ Configure Nginx
9. ✅ Test và verify

### Phase 3: Kiểm tra

1. ✅ Test backend API
2. ✅ Test frontend
3. ✅ Test database connection
4. ✅ Test Nginx routing
5. ✅ Verify cả 2 app hoạt động

---

## 🚨 Rủi ro & Giải pháp

### Rủi ro 1: Port conflict
- **Khả năng**: Thấp
- **Giải pháp**: Dùng port 3000 (không conflict với 4000)

### Rủi ro 2: Database conflict
- **Khả năng**: Không có
- **Giải pháp**: Dùng database riêng `HR_Management_System`

### Rủi ro 3: Nginx config sai
- **Khả năng**: Trung bình
- **Giải pháp**: Test config trước khi reload (`nginx -t`)

### Rủi ro 4: Frontend routing sai
- **Khả năng**: Trung bình
- **Giải pháp**: Đã config `homepage: "/hr"` trong package.json

### Rủi ro 5: API URL sai
- **Khả năng**: Thấp
- **Giải pháp**: Đã config `REACT_APP_API_URL="/hr/api"` khi build

---

## ✅ Checklist Triển khai

### Pre-deployment
- [x] Backup database local
- [x] Commit code lên GitHub
- [x] Tạo scripts deploy
- [x] Tạo PM2 config
- [x] Tạo Nginx config
- [x] Tạo documentation

### Deployment
- [ ] SSH vào server
- [ ] Upload backup database
- [ ] Clone repository
- [ ] Install dependencies
- [ ] Setup database
- [ ] Build frontend
- [ ] Configure PM2
- [ ] Configure Nginx
- [ ] Test backend
- [ ] Test frontend
- [ ] Verify cả 2 app

### Post-deployment
- [ ] Monitor logs
- [ ] Test các chức năng chính
- [ ] Update documentation
- [ ] Setup monitoring (optional)

---

## 📊 So sánh Cấu hình

| Aspect | IT-Request | HR Management | Status |
|--------|------------|---------------|--------|
| Backend Port | 4000 | 3000 | ✅ OK |
| Frontend Path | `/` | `/hr` | ✅ OK |
| API Path | `/api` | `/hr/api` | ✅ OK |
| Database | `it_request_tracking` | `HR_Management_System` | ✅ OK |
| PM2 Name | `it-request-api` | `hr-management-api` | ✅ OK |
| Directory | `/var/www/it-request-tracking` | `/var/www/hr-management` | ✅ OK |

---

## 🎯 Kết luận

✅ **Có thể triển khai song song** - Không có xung đột về:
- Ports
- Databases
- PM2 processes
- Directories
- Nginx routing

✅ **Giải pháp**: Dùng path routing (`/hr`) cho HR app, giữ nguyên IT-Request ở root (`/`)

✅ **Risk Level**: **LOW** - Triển khai an toàn, không ảnh hưởng đến IT-Request app

---

**Last Updated**: 2025-01-XX

