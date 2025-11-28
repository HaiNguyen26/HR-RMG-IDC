# ⚡ Sửa Nhanh Lỗi PM2 Frontend

## ❌ Lỗi: `getaddrinfo ENOTFOUND -l`

## ⚠️ QUAN TRỌNG: Xóa PM2 Cache

PM2 có thể cache config cũ. Phải chạy `pm2 kill` trước khi khởi động lại!

## 🚀 Cách Sửa Nhanh (Copy-paste Toàn bộ)

**Chạy trên server (Copy tất cả và dán):**

```bash
cd /var/www/hr-rmg-idc

# 1. Backup và sửa config (args từ string -> array)
cp ecosystem.config.js ecosystem.config.js.backup
sed -i "s/args: '-s build -l 3002'/args: ['-s', 'build', '-l', '3002']/" ecosystem.config.js

# 2. Build frontend (nếu chưa có thư mục build)
cd frontend
if [ ! -d "build" ]; then
    echo "Building frontend..."
    npm run build
fi
cd ..

# 3. Cài serve (nếu chưa có)
npm install -g serve 2>/dev/null || echo "serve already installed"

# 4. Giải phóng port 3002 (nếu đang bị chiếm)
lsof -ti :3002 | xargs kill -9 2>/dev/null || echo "Port 3002 is free"

# 5. Xóa process cũ, xóa cache PM2 và khởi động lại
pm2 delete hr-rmg-idc-frontend 2>/dev/null || echo "Process not found"
pm2 kill  # Xóa cache PM2 (QUAN TRỌNG!)
sleep 2
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend

# 6. Đợi và kiểm tra
sleep 3
echo ""
echo "=== PM2 Status ==="
pm2 list
echo ""
echo "=== Frontend Logs (10 dòng cuối) ==="
pm2 logs hr-rmg-idc-frontend --lines 10 --nostream
```

## ✅ Kết quả mong đợi

```
┌─────┬──────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                 │ status  │ ...     │          │
├─────┼──────────────────────┼─────────┼─────────┼──────────┤
│ 3   │ hr-rmg-idc-frontend  │ online  │ ...     │          │
└─────┴──────────────────────┴─────────┴─────────┴──────────┘
```

Status phải là **`online`** (màu xanh), không phải `errored`.

## 🔍 Kiểm tra thêm

```bash
# Kiểm tra port 3002 đang listen
netstat -tulpn | grep 3002

# Test từ local
curl http://localhost:3002
```

## 📝 Giải thích

- **Nguyên nhân:** PM2 parse `args` là string `'-s build -l 3002'` sai, coi `-l` như hostname
- **Giải pháp:** Dùng array `['-s', 'build', '-l', '3002']` để PM2 parse đúng

## 🐛 Nếu vẫn lỗi

Xem log chi tiết:
```bash
pm2 logs hr-rmg-idc-frontend --err
```

Kiểm tra file config đã đúng chưa:
```bash
cat /var/www/hr-rmg-idc/ecosystem.config.js | grep -A 2 "hr-rmg-idc-frontend"
# Phải thấy: args: ['-s', 'build', '-l', '3002']
```

Kiểm tra build có tồn tại không:
```bash
ls -la /var/www/hr-rmg-idc/frontend/build
```

Kiểm tra serve có chạy được không:
```bash
cd /var/www/hr-rmg-idc/frontend/build
serve -s . -l 3002
# Nhấn Ctrl+C sau khi test
```

