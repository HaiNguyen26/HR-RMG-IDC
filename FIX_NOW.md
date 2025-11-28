# 🔧 SỬA NGAY - Lỗi Frontend PM2

## ❌ Vấn đề: Frontend vẫn bị `errored` sau khi sửa

Có thể file config trên server chưa được cập nhật đúng.

## ⚠️ QUAN TRỌNG

**Nếu bạn đã xác nhận config đúng** (`args: ['-s', 'build', '-l', '3002']`) nhưng vẫn lỗi → PM2 đang cache config cũ!

**Phải chạy `pm2 kill` để xóa cache hoàn toàn!**

## ✅ Giải pháp: Chạy lệnh sau trên Server

### Bước 1: Kiểm tra và sửa config

```bash
cd /var/www/hr-rmg-idc

# Kiểm tra file config hiện tại
cat ecosystem.config.js | grep -A 5 "hr-rmg-idc-frontend"

# Nếu thấy: args: '-s build -l 3002' (STRING) -> SAI
# Phải là:   args: ['-s', 'build', '-l', '3002'] (ARRAY) -> ĐÚNG
```

### Bước 2: Sửa nếu chưa đúng

```bash
cd /var/www/hr-rmg-idc

# Backup
cp ecosystem.config.js ecosystem.config.js.backup

# Sửa (quan trọng: dùng dấu nháy đơn trong sed)
sed -i "s/args: '-s build -l 3002'/args: ['-s', 'build', '-l', '3002']/" ecosystem.config.js

# Xác nhận đã sửa đúng
cat ecosystem.config.js | grep -A 3 "hr-rmg-idc-frontend" | grep args
# Phải thấy: args: ['-s', 'build', '-l', '3002']
```

### Bước 3: Xóa cache PM2 và khởi động lại

```bash
# Dừng hoàn toàn
pm2 stop hr-rmg-idc-frontend
pm2 delete hr-rmg-idc-frontend

# Xóa cache PM2 (quan trọng!)
pm2 kill
sleep 2

# Khởi động lại từ config mới
cd /var/www/hr-rmg-idc
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend

# Đợi và kiểm tra
sleep 3
pm2 list
```

### Bước 4: Kiểm tra log

```bash
pm2 logs hr-rmg-idc-frontend --lines 20
```

## 🎯 Hoặc dùng Script Tự động

```bash
cd /var/www/hr-rmg-idc

# Tạo script
cat > debug-and-fix.sh << 'EOF'
#!/bin/bash
CONFIG_FILE="/var/www/hr-rmg-idc/ecosystem.config.js"
cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
sed -i "s/args: '-s build -l 3002'/args: ['-s', 'build', '-l', '3002']/" "$CONFIG_FILE"
cat "$CONFIG_FILE" | grep -A 3 "hr-rmg-idc-frontend" | grep args
pm2 stop hr-rmg-idc-frontend 2>/dev/null || true
pm2 delete hr-rmg-idc-frontend 2>/dev/null || true
pm2 kill
sleep 2
cd /var/www/hr-rmg-idc
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend
sleep 3
pm2 list
pm2 logs hr-rmg-idc-frontend --lines 10 --nostream
EOF

chmod +x debug-and-fix.sh
./debug-and-fix.sh
```

## ✅ Kết quả mong đợi

```
┌─────┬──────────────────────┬─────────┐
│ id  │ name                 │ status  │
├─────┼──────────────────────┼─────────┤
│ 5   │ hr-rmg-idc-frontend  │ online  │  <-- Phải là online (xanh)
└─────┴──────────────────────┴─────────┘
```

## 🔍 Nếu vẫn lỗi

1. **Kiểm tra file config:**
   ```bash
   cat /var/www/hr-rmg-idc/ecosystem.config.js | grep -A 10 "hr-rmg-idc-frontend"
   ```

2. **Kiểm tra có dấu nháy đúng không:**
   - ❌ SAI: `args: '-s build -l 3002'`
   - ✅ ĐÚNG: `args: ['-s', 'build', '-l', '3002']`

3. **Xem log chi tiết:**
   ```bash
   pm2 logs hr-rmg-idc-frontend --err
   ```

4. **Test serve trực tiếp:**
   ```bash
   cd /var/www/hr-rmg-idc/frontend/build
   serve -s . -l 3002
   # Nếu chạy được -> vấn đề ở PM2 config
   # Nếu không chạy được -> vấn đề ở build hoặc serve
   ```

