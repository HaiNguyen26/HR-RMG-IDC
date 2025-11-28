# Hướng Dẫn Deploy HR App - Tách Biệt Hoàn Toàn

## 🎯 Mục Tiêu
- Truy cập: `http://27.71.16.15/hr`
- Tách biệt hoàn toàn với app cũ (it-request-tracking)
- Khác port, PM2 name, folder, database
- Không xung đột bất cứ thứ gì

## ⚠️ Thông Tin App Cũ (Để Tránh Xung Đột)
- **Port:** 4000
- **PM2:** `it-request-api`
- **Folder:** `/var/www/it-request-tracking`
- **Nginx:** `it-request-tracking`
- **URL:** `http://27.71.16.15/`

## ✅ Thông Tin App HR Mới
- **Backend Port:** 3001
- **Frontend Port:** 3002
- **PM2 Backend:** `hr-rmg-idc-backend`
- **PM2 Frontend:** `hr-rmg-idc-frontend`
- **Folder:** `/var/www/hr-rmg-idc`
- **Database:** `HR_Management_System`
- **Nginx:** `a-hr-rmg-idc` (tên bắt đầu bằng 'a' để load trước)
- **URL:** `http://27.71.16.15/hr`

---

## BƯỚC 1: XÓA TOÀN BỘ HR APP CŨ (Nếu có)

**Trên server, chạy:**

```bash
# Upload file remove-hr-app-complete.sh lên server
# Chạy script
chmod +x remove-hr-app-complete.sh
sudo ./remove-hr-app-complete.sh
```

**Hoặc xóa thủ công:**

```bash
# 1. Dừng PM2
pm2 stop hr-rmg-idc-backend hr-rmg-idc-frontend
pm2 delete hr-rmg-idc-backend hr-rmg-idc-frontend
pm2 save

# 2. Xóa Nginx config
sudo rm -f /etc/nginx/sites-enabled/a-hr-rmg-idc
sudo rm -f /etc/nginx/sites-available/a-hr-rmg-idc

# 3. Xóa folder
sudo rm -rf /var/www/hr-rmg-idc

# 4. Reload Nginx
sudo nginx -t && sudo systemctl reload nginx
```

---

## BƯỚC 2: CLONE CODE TỪ GITHUB

**Trên server:**

```bash
# Clone code
cd /var/www
sudo git clone https://github.com/HaiNguyen26/HR-RMG-IDC.git hr-rmg-idc
cd hr-rmg-idc

# Cấp quyền
sudo chown -R $USER:$USER /var/www/hr-rmg-idc
```

---

## BƯỚC 3: KIỂM TRA DATABASE

**Trên server:**

```bash
# Kiểm tra database đã có dữ liệu chưa
sudo -u postgres psql -d HR_Management_System -c "\dt"
```

**Nếu thấy có bảng (ví dụ: employees, candidates, leave_requests...):**
- ✅ Database đã có dữ liệu → **Bỏ qua restore, tiếp tục BƯỚC 4**

**Nếu không có bảng hoặc cần restore lại:**
- Upload file backup từ máy local lên server và restore

---

## BƯỚC 4: CẤU HÌNH BACKEND

**Trên server:**

```bash
cd /var/www/hr-rmg-idc/backend

# Tạo file .env
nano .env
```

**Paste nội dung:**

```env
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=HR_Management_System
DB_USER=postgres
DB_PASSWORD=your_postgres_password
JWT_SECRET=your_jwt_secret_key
UPLOAD_DIR=./uploads
```

**Lưu:** `Ctrl+O`, `Enter`, `Ctrl+X`

**Cài đặt dependencies:**

```bash
cd /var/www/hr-rmg-idc/backend
npm install --production
```

---

## BƯỚC 5: CẤU HÌNH FRONTEND

**Trên server:**

```bash
cd /var/www/hr-rmg-idc/frontend

# Kiểm tra package.json có homepage="/hr" chưa
cat package.json | grep homepage

# Nếu chưa có hoặc khác, sửa:
nano package.json
# Tìm "homepage" và đổi thành: "homepage": "/hr"
```

**Build frontend:**

```bash
cd /var/www/hr-rmg-idc/frontend
npm install --production
npm run build
```

**Tạo script start frontend:**

```bash
cd /var/www/hr-rmg-idc
nano start-frontend.sh
```

**Paste nội dung:**

```bash
#!/bin/bash
cd /var/www/hr-rmg-idc/frontend
npx serve -s build -l 3002
```

**Lưu và cấp quyền:**

```bash
chmod +x start-frontend.sh
```

---

## BƯỚC 6: CẤU HÌNH PM2

**Trên server:**

```bash
cd /var/www/hr-rmg-idc

# Kiểm tra ecosystem.config.js
cat ecosystem.config.js

# Tạo thư mục logs
mkdir -p logs

# Start PM2
pm2 start ecosystem.config.js
pm2 save

# Kiểm tra
pm2 list
# Phải thấy:
# - hr-rmg-idc-backend (port 3001)
# - hr-rmg-idc-frontend (port 3002)
```

**Kiểm tra backend:**

```bash
curl http://localhost:3001/api/health
# Hoặc
curl http://localhost:3001/api/employees
```

**Kiểm tra frontend:**

```bash
curl http://localhost:3002
```

---

## BƯỚC 7: CẤU HÌNH NGINX

**Trên server:**

```bash
# Tạo file config
sudo nano /etc/nginx/sites-available/a-hr-rmg-idc
```

**Paste nội dung:**

```nginx
server {
    listen 80;
    server_name 27.71.16.15;

    # HR Management System - Backend API
    location /hr/api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        rewrite ^/hr/api/(.*)$ /api/$1 break;
    }

    # HR Management System - Frontend
    location /hr {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Lưu:** `Ctrl+O`, `Enter`, `Ctrl+X`

**Enable config:**

```bash
# Tạo symlink
sudo ln -s /etc/nginx/sites-available/a-hr-rmg-idc /etc/nginx/sites-enabled/a-hr-rmg-idc

# Test config
sudo nginx -t

# Nếu OK, reload
sudo systemctl reload nginx
```

**⚠️ QUAN TRỌNG:** Tên file bắt đầu bằng `a-` để đảm bảo Nginx load file này TRƯỚC file `it-request-tracking`, giúp `location /hr` được match trước `location /`.

---

## BƯỚC 8: KIỂM TRA

**1. Kiểm tra PM2:**

```bash
pm2 list
# Phải thấy:
# - hr-rmg-idc-backend (online, port 3001)
# - hr-rmg-idc-frontend (online, port 3002)
# - it-request-api (online, port 4000) - app cũ
```

**2. Kiểm tra Nginx:**

```bash
# Kiểm tra config đã load
sudo nginx -T | grep -E "^[[:space:]]*location" | head -10

# Phải thấy:
# - location /hr/api
# - location /hr
# - location / (từ it-request-tracking)
```

**3. Kiểm tra ports:**

```bash
sudo ss -tulpn | grep -E ":(3001|3002|4000|80)"
# Phải thấy:
# - 3001 (backend HR)
# - 3002 (frontend HR)
# - 4000 (backend app cũ)
# - 80 (Nginx)
```

**4. Test truy cập:**

```bash
# Test app cũ
curl -I http://27.71.16.15/
# Phải trả về 200 OK

# Test app HR
curl -I http://27.71.16.15/hr
# Phải trả về 200 OK

# Test API HR
curl http://27.71.16.15/hr/api/health
# Phải trả về JSON
```

**5. Truy cập từ browser:**

- **App cũ:** http://27.71.16.15/
- **App HR:** http://27.71.16.15/hr

---

## TÓM TẮT CẤU HÌNH

### App Cũ (it-request-tracking)
- Port: 4000
- PM2: `it-request-api`
- Folder: `/var/www/it-request-tracking`
- Nginx: `it-request-tracking`
- URL: `http://27.71.16.15/`

### App HR (hr-rmg-idc)
- Backend Port: 3001
- Frontend Port: 3002
- PM2: `hr-rmg-idc-backend`, `hr-rmg-idc-frontend`
- Folder: `/var/www/hr-rmg-idc`
- Database: `HR_Management_System`
- Nginx: `a-hr-rmg-idc`
- URL: `http://27.71.16.15/hr`

### ✅ Tách Biệt Hoàn Toàn
- ✅ Khác port (3001, 3002 vs 4000)
- ✅ Khác PM2 name
- ✅ Khác folder
- ✅ Khác database
- ✅ Nginx config riêng biệt
- ✅ Không xung đột

---

## XỬ LÝ LỖI

### Lỗi: Port đã được sử dụng

```bash
# Kiểm tra port
sudo ss -tulpn | grep -E ":(3001|3002)"

# Nếu port đã dùng, đổi trong ecosystem.config.js và backend/.env
```

### Lỗi: PM2 name trùng

```bash
# Kiểm tra PM2
pm2 list

# Nếu trùng, đổi trong ecosystem.config.js
```

### Lỗi: Nginx vẫn trỏ vào app cũ

```bash
# Kiểm tra thứ tự load config
ls -la /etc/nginx/sites-enabled/

# File a-hr-rmg-idc phải load trước it-request-tracking
# Nếu không, đổi tên file a-hr-rmg-idc thành z-hr-rmg-idc (tên bắt đầu bằng chữ cái đầu tiên trong bảng chữ cái)
```

### Lỗi: Database không kết nối được

```bash
# Kiểm tra PostgreSQL
sudo systemctl status postgresql

# Kiểm tra database
sudo -u postgres psql -l | grep HR_Management_System

# Kiểm tra .env
cat /var/www/hr-rmg-idc/backend/.env
```

---

## QUẢN LÝ SAU KHI DEPLOY

### Restart app HR:

```bash
pm2 restart hr-rmg-idc-backend
pm2 restart hr-rmg-idc-frontend
```

### Xem logs:

```bash
pm2 logs hr-rmg-idc-backend
pm2 logs hr-rmg-idc-frontend
```

### Update code:

```bash
cd /var/www/hr-rmg-idc
git pull origin main
cd backend && npm install --production
cd ../frontend && npm install --production && npm run build
pm2 restart hr-rmg-idc-backend hr-rmg-idc-frontend
```

---

## ✅ HOÀN TẤT

Sau khi hoàn thành tất cả các bước, bạn sẽ có:

- ✅ App cũ hoạt động tại: `http://27.71.16.15/`
- ✅ App HR hoạt động tại: `http://27.71.16.15/hr`
- ✅ Tách biệt hoàn toàn, không xung đột
- ✅ Database đầy đủ dữ liệu
- ✅ Tất cả chức năng hoạt động bình thường

