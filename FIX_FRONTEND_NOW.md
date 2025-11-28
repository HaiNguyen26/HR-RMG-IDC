# 🔧 SỬA LỖI FRONTEND ERROred NGAY

## ❌ Vấn đề

`hr-rmg-idc-frontend` đang bị `errored` với 15+ restarts.

## ✅ Giải pháp nhanh (Copy-paste)

```bash
cd /var/www/hr-rmg-idc

# 1. Kiểm tra args format
cat ecosystem.config.js | grep -A 1 "args:"

# 2. Sửa args từ string thành array
sed -i "s/args: '-s build -l 3002'/args: ['-s', 'build', '-l', '3002']/" ecosystem.config.js

# 3. Kiểm tra đã sửa đúng chưa
cat ecosystem.config.js | grep -A 1 "args:"
# Phải thấy: args: ['-s', 'build', '-l', '3002']  ✅

# 4. Xóa process cũ
pm2 delete hr-rmg-idc-frontend

# 5. Start lại với config mới
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend

# 6. Kiểm tra
pm2 list

# 7. Xem logs nếu vẫn lỗi
pm2 logs hr-rmg-idc-frontend --lines 20
```

## ✅ Kết quả mong đợi

Sau khi sửa, `pm2 list` phải hiển thị:
```
│ 6 │ hr-rmg-idc-frontend  │ online │  (không còn errored)
```

## 🐛 Nếu vẫn lỗi

Kiểm tra thêm:

```bash
# Kiểm tra build folder có tồn tại không
ls -la /var/www/hr-rmg-idc/frontend/build

# Nếu không có, build lại:
cd /var/www/hr-rmg-idc/frontend
npm run build

# Kiểm tra serve đã được cài đặt global chưa
which serve || npm install -g serve

# Start lại
cd /var/www/hr-rmg-idc
pm2 delete hr-rmg-idc-frontend
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend
```

