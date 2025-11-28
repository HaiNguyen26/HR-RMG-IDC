# 🔧 Sửa Frontend - KHÔNG Ảnh hưởng App Cũ

## ⚠️ QUAN TRỌNG

**KHÔNG dùng các lệnh:**
- ❌ `pm2 kill` - Sẽ dừng TẤT CẢ processes (kể cả app cũ)
- ❌ `pm2 stop all` - Sẽ dừng TẤT CẢ processes
- ❌ `pm2 delete all` - Sẽ xóa TẤT CẢ processes

**CHỈ thao tác với process của app MỚI:**
- ✅ `pm2 stop hr-rmg-idc-frontend`
- ✅ `pm2 delete hr-rmg-idc-frontend`
- ✅ `pm2 start ecosystem.config.js --only hr-rmg-idc-frontend`

## ✅ Cách sửa AN TOÀN (không ảnh hưởng app cũ)

### Bước 1: Sửa ecosystem.config.js

```bash
cd /var/www/hr-rmg-idc
nano ecosystem.config.js
```

**Tìm phần frontend và sửa:**

**TỪ:**
```javascript
{
  name: 'hr-rmg-idc-frontend',
  script: 'serve',
  args: ['-s', 'build', '-l', '3002'],
```

**THÀNH:**
```javascript
{
  name: 'hr-rmg-idc-frontend',
  script: 'npx',
  args: ['serve', '-s', 'build', '-l', '3002'],
```

**Lưu:** `Ctrl+O`, `Enter`, `Ctrl+X`

### Bước 2: Dừng và xóa CHỈ process frontend của app mới

```bash
# CHỈ dừng và xóa process của app mới
pm2 stop hr-rmg-idc-frontend
pm2 delete hr-rmg-idc-frontend

# Đợi 1 giây
sleep 1
```

### Bước 3: Khởi động lại CHỈ process frontend

```bash
cd /var/www/hr-rmg-idc
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend

# Đợi và kiểm tra
sleep 3
pm2 list
pm2 logs hr-rmg-idc-frontend --lines 10 --nostream
```

## ✅ Hoặc dùng Shell Script (Chắc chắn hơn)

### Bước 1: Tạo script riêng

```bash
cd /var/www/hr-rmg-idc
cat > start-frontend.sh << 'EOF'
#!/bin/bash
cd /var/www/hr-rmg-idc/frontend
exec serve -s build -l 3002
EOF

chmod +x start-frontend.sh
```

### Bước 2: Sửa ecosystem.config.js

```bash
nano ecosystem.config.js
```

**Sửa phần frontend thành:**

```javascript
{
  name: 'hr-rmg-idc-frontend',
  script: './start-frontend.sh',
  cwd: '/var/www/hr-rmg-idc',
  interpreter: '/bin/bash',
  env: {
    NODE_ENV: 'production'
  },
  error_file: '/var/www/hr-rmg-idc/logs/frontend-error.log',
  out_file: '/var/www/hr-rmg-idc/logs/frontend-out.log',
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  merge_logs: true,
  instances: 1,
  autorestart: true,
  watch: false
}
```

### Bước 3: Dừng và khởi động lại CHỈ frontend

```bash
# CHỈ dừng process của app mới
pm2 stop hr-rmg-idc-frontend
pm2 delete hr-rmg-idc-frontend

# Khởi động lại
cd /var/www/hr-rmg-idc
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend

# Kiểm tra
sleep 3
pm2 list
```

## 📋 Kiểm tra App Cũ vẫn chạy

Sau khi sửa, kiểm tra app cũ vẫn online:

```bash
pm2 list
# it-request-api phải vẫn là "online" (màu xanh)
```

## ✅ Script Tự động (AN TOÀN)

```bash
cd /var/www/hr-rmg-idc

# 1. Sửa config (nếu chưa sửa)
sed -i "s/script: 'serve',/script: 'npx',/" ecosystem.config.js
sed -i "s/args: \['-s', 'build', '-l', '3002'\],/args: ['serve', '-s', 'build', '-l', '3002'],/" ecosystem.config.js

# 2. Dừng CHỈ process frontend của app mới
pm2 stop hr-rmg-idc-frontend 2>/dev/null || true
pm2 delete hr-rmg-idc-frontend 2>/dev/null || true

# 3. Khởi động lại CHỈ frontend
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend

# 4. Kiểm tra
sleep 3
echo "=== PM2 Status (App mới) ==="
pm2 list | grep hr-rmg-idc

echo ""
echo "=== PM2 Status (App cũ - phải vẫn online) ==="
pm2 list | grep it-request

echo ""
echo "=== Frontend Logs ==="
pm2 logs hr-rmg-idc-frontend --lines 10 --nostream
```

## ⚠️ Lưu ý

- **KHÔNG** chạy `pm2 kill` - sẽ dừng app cũ
- **KHÔNG** chạy `pm2 stop all` - sẽ dừng app cũ
- **CHỈ** dùng `pm2 stop/delete hr-rmg-idc-frontend` - chỉ ảnh hưởng app mới


