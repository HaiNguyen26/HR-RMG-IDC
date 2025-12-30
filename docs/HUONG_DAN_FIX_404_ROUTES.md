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

## Lưu ý

- Đảm bảo đã pull code mới nhất từ git
- Đảm bảo đã chạy migrations database (nếu cần)
- Đảm bảo PM2 đã restart sau khi pull code
- Nếu vẫn lỗi, kiểm tra logs PM2 để xem chi tiết lỗi

