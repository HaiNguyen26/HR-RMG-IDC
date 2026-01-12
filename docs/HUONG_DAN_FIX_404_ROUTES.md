# Hướng dẫn khắc phục lỗi 404 cho routes mới

## Vấn đề
Lỗi 404 khi truy cập các endpoint:
- `/api/late-early-requests`
- `/api/meal-allowance-requests`

## Nguyên nhân
Code mới chưa được deploy lên server hoặc server chưa được restart sau khi pull code.

## Giải pháp

### Cách 1: Sử dụng script tự động (Khuyến nghị)

```bash
# SSH vào server
ssh root@27.71.16.15

# Di chuyển đến thư mục project
cd /var/www/hr-management

# Chạy script pull và migration (sẽ tự động restart PM2)
bash scripts/pull-and-migrate-on-server.sh
```

### Cách 2: Thực hiện thủ công

```bash
# 1. SSH vào server
ssh root@27.71.16.15

# 2. Di chuyển đến thư mục project
cd /var/www/hr-management

# 3. Pull code mới từ git
git pull origin main

# 4. Kiểm tra xem routes có tồn tại không
ls -la backend/routes/lateEarlyRequests.js
ls -la backend/routes/mealAllowanceRequests.js

# 5. Kiểm tra xem server.js có import routes không
grep -n "lateEarlyRequests\|mealAllowanceRequests" backend/server.js

# 6. Install dependencies (nếu cần)
cd backend
npm install
cd ..

# 7. Build frontend (nếu cần)
cd frontend
npm install
REACT_APP_API_URL="/hr/api" npm run build
cd ..

# 8. Restart PM2
pm2 restart hr-management-api

# 9. Kiểm tra logs
pm2 logs hr-management-api --lines 50
```

### Cách 3: Kiểm tra và sửa lỗi chi tiết

```bash
# 1. Kiểm tra PM2 status
pm2 status

# 2. Kiểm tra xem server có đang chạy không
pm2 logs hr-management-api --lines 100 | grep -i "error\|404\|cannot"

# 3. Kiểm tra xem routes có được load không
pm2 logs hr-management-api --lines 100 | grep -i "late-early\|meal-allowance"

# 4. Nếu có lỗi, xem chi tiết
pm2 logs hr-management-api --err --lines 200

# 5. Restart lại server
pm2 restart hr-management-api

# 6. Kiểm tra lại
curl http://localhost:3000/api/late-early-requests
curl http://localhost:3000/api/meal-allowance-requests
```

## Kiểm tra sau khi fix

### Cách 1: Sử dụng script tự động (Khuyến nghị)

```bash
# SSH vào server
ssh root@27.71.16.15

# Di chuyển đến thư mục project
cd /var/www/hr-management

# Chạy script kiểm tra
bash scripts/check-routes-on-server.sh
```

Script này sẽ kiểm tra:
- File routes có tồn tại không
- Routes có được import trong server.js không
- Routes có được mount không
- PM2 process có đang chạy không
- Database có bảng không
- API endpoints có hoạt động không

### Cách 2: Kiểm tra thủ công

1. **Kiểm tra endpoints hoạt động:**
```bash
# Trên server
curl http://localhost:3000/api/late-early-requests
curl http://localhost:3000/api/meal-allowance-requests
```

2. **Kiểm tra từ browser:**
- Mở Developer Tools (F12)
- Vào tab Network
- Reload trang
- Kiểm tra xem các request đến `/api/late-early-requests` và `/api/meal-allowance-requests` có trả về 200 không

3. **Kiểm tra logs PM2:**
```bash
pm2 logs hr-management-api --lines 50
```

4. **Kiểm tra database có bảng:**
```bash
sudo -u postgres psql -d HR_Management_System -c "\dt late_early_requests"
sudo -u postgres psql -d HR_Management_System -c "\dt meal_allowance_requests"
```

## Lưu ý

- Đảm bảo đã pull code mới nhất từ git
- Đảm bảo đã chạy migrations database (nếu cần)
- Đảm bảo PM2 đã restart sau khi pull code
- Nếu vẫn lỗi, kiểm tra logs PM2 để xem chi tiết lỗi

## Troubleshooting chi tiết

### Nếu script báo "Routes KHÔNG TỒN TẠI":
```bash
# Pull code mới
cd /var/www/hr-management
git pull origin main

# Kiểm tra lại
ls -la backend/routes/lateEarlyRequests.js
ls -la backend/routes/mealAllowanceRequests.js
```

### Nếu script báo "Routes KHÔNG được mount":
```bash
# Kiểm tra server.js
grep -n "late-early-requests\|meal-allowance-requests" backend/server.js

# Nếu không có, có thể file server.js chưa được cập nhật
git pull origin main
```

### Nếu script báo "Bảng KHÔNG TỒN TẠI":
```bash
# Chạy migrations
bash scripts/pull-and-migrate-on-server.sh
```

### Nếu script báo "Endpoint trả về 404":
```bash
# 1. Kiểm tra PM2 có chạy không
pm2 status

# 2. Restart PM2
pm2 restart hr-management-api

# 3. Kiểm tra logs xem có lỗi không
pm2 logs hr-management-api --err --lines 100

# 4. Kiểm tra xem server có listen đúng port không
netstat -tlnp | grep 3000
```

### Nếu vẫn lỗi sau khi làm tất cả:
```bash
# 1. Xem logs chi tiết
pm2 logs hr-management-api --lines 200

# 2. Kiểm tra xem có lỗi syntax không
cd /var/www/hr-management/backend
node -c routes/lateEarlyRequests.js
node -c routes/mealAllowanceRequests.js
node -c server.js

# 3. Thử restart lại từ đầu
pm2 delete hr-management-api
cd /var/www/hr-management
pm2 start ecosystem.hr.config.js
pm2 save
```

