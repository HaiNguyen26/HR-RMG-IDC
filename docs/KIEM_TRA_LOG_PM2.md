# Hướng Dẫn Kiểm Tra Log PM2 - Phân Biệt Log Cũ và Mới

## Cách 1: Xóa log cũ và xem log mới (Khuyến nghị)

```bash
# 1. Xóa tất cả log cũ của PM2
pm2 flush hr-management-api

# 2. Hoặc xóa log thủ công
rm /root/.pm2/logs/hr-management-api-error.log
rm /root/.pm2/logs/hr-management-api-out.log

# 3. Dừng app HR
pm2 stop hr-management-api
pm2 delete hr-management-api

# 4. Đảm bảo port 3000 sạch
kill -9 $(lsof -t -i:3000) 2>/dev/null || echo "Port đã sạch"

# 5. Khởi động lại app
cd /var/www/hr-management
pm2 start backend/server.js --name hr-management-api
pm2 save

# 6. Đợi 5 giây để app khởi động
sleep 5

# 7. Xem log MỚI (chỉ log sau khi khởi động lại)
pm2 logs hr-management-api --lines 50 --nostream

# 8. Hoặc xem log real-time
pm2 logs hr-management-api --lines 50
```

## Cách 2: Kiểm tra thời gian log

```bash
# Xem thời gian của log file
ls -lh /root/.pm2/logs/hr-management-api-error.log

# Xem dòng cuối cùng với timestamp
tail -20 /root/.pm2/logs/hr-management-api-error.log

# Xem log với timestamp đầy đủ
pm2 logs hr-management-api --lines 20 --timestamp
```

## Cách 3: Kiểm tra trạng thái app hiện tại

```bash
# Xem trạng thái PM2
pm2 list

# Xem thông tin chi tiết
pm2 describe hr-management-api

# Kiểm tra app có đang chạy không
pm2 status hr-management-api

# Test API endpoint
curl http://localhost:3000/api/health || echo "API không phản hồi"
```

## Cách 4: Kiểm tra cấu hình database trước khi khởi động

```bash
# Kiểm tra file .env
cd /var/www/hr-management/backend
cat .env | grep DB_

# Test kết nối database
node -e "
require('dotenv').config();
const pool = require('./config/database');
pool.query('SELECT NOW() as time')
  .then(r => {
    console.log('✅ Database OK:', r.rows[0].time);
    process.exit(0);
  })
  .catch(e => {
    console.error('❌ Database Error:', e.message);
    process.exit(1);
  });
"
```

## Sau khi xác định lỗi

Nếu log mới vẫn có lỗi `client password must be a string`:

1. **Kiểm tra file .env:**
```bash
cd /var/www/hr-management/backend
cat .env
```

2. **Đảm bảo DB_PASSWORD có giá trị:**
```bash
# Nếu thiếu, thêm vào
echo "DB_PASSWORD=your_password_here" >> .env
```

3. **Khởi động lại:**
```bash
pm2 restart hr-management-api
pm2 logs hr-management-api --lines 30
```


