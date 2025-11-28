# 🚀 Sửa Nhanh Frontend - Copy Paste

## 📋 Chạy trên Server (Copy toàn bộ)

```bash
cd /var/www/hr-rmg-idc

# 1. Sửa ecosystem.config.js
cp ecosystem.config.js ecosystem.config.js.backup
sed -i "s/args: '-s build -l 3002'/args: ['-s', 'build', '-l', '3002']/" ecosystem.config.js

# 2. Kiểm tra và build frontend (nếu cần)
cd frontend
if [ ! -d "build" ]; then
    echo "Building frontend..."
    npm run build
fi
cd ..

# 3. Cài serve (nếu chưa có)
npm install -g serve || true

# 4. Giải phóng port 3002 (nếu cần)
lsof -ti :3002 | xargs kill -9 2>/dev/null || true

# 5. Xóa và khởi động lại
pm2 delete hr-rmg-idc-frontend || true
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend

# 6. Đợi và kiểm tra
sleep 3
pm2 list
pm2 logs hr-rmg-idc-frontend --lines 10
```

## ✅ Hoặc dùng script tự động

```bash
cd /var/www/hr-rmg-idc

# Tạo script
cat > check-and-fix-frontend.sh << 'SCRIPT'
#!/bin/bash
cd /var/www/hr-rmg-idc
cp ecosystem.config.js ecosystem.config.js.backup
sed -i "s/args: '-s build -l 3002'/args: ['-s', 'build', '-l', '3002']/" ecosystem.config.js
cd frontend && [ ! -d "build" ] && npm run build
cd .. && npm install -g serve 2>/dev/null || true
lsof -ti :3002 | xargs kill -9 2>/dev/null || true
pm2 delete hr-rmg-idc-frontend 2>/dev/null || true
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend
sleep 3
pm2 list
SCRIPT

chmod +x check-and-fix-frontend.sh
./check-and-fix-frontend.sh
```

## 🔍 Kiểm tra kết quả

```bash
# Status phải là "online" (màu xanh)
pm2 list

# Xem log
pm2 logs hr-rmg-idc-frontend

# Test local
curl http://localhost:3002
```

