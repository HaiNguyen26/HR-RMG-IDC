# 🚀 THỬ NGAY - Giải pháp Mới cho Frontend PM2

## ⚠️ QUAN TRỌNG: Không ảnh hưởng App Cũ

**KHÔNG dùng:**
- ❌ `pm2 kill` - Sẽ dừng TẤT CẢ (kể cả app cũ)
- ❌ `pm2 stop all` - Sẽ dừng TẤT CẢ

**CHỈ dùng:**
- ✅ `pm2 stop hr-rmg-idc-frontend` - Chỉ dừng frontend app mới
- ✅ `pm2 delete hr-rmg-idc-frontend` - Chỉ xóa frontend app mới

## ❌ Vấn đề

Config đã đúng nhưng PM2 vẫn không chạy được `serve` với args array.

## ✅ Giải pháp: Dùng `npx serve` thay vì `serve` trực tiếp

### Cách 1: Sửa ecosystem.config.js (Nhanh nhất)

**Trên server:**

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

**Khởi động lại:**
```bash
pm2 delete hr-rmg-idc-frontend
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend
sleep 3
pm2 list
pm2 logs hr-rmg-idc-frontend --lines 10 --nostream
```

## ✅ Cách 2: Tạo Shell Script (Chắc chắn nhất)

### Bước 1: Tạo script

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

**Lưu và khởi động lại:**
```bash
pm2 delete hr-rmg-idc-frontend
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend
pm2 list
```

## ✅ Cách 3: Kiểm tra Serve có hoạt động không

**Trước tiên, test serve trực tiếp:**

```bash
# Đảm bảo đã build
cd /var/www/hr-rmg-idc/frontend
npm run build

# Test serve
cd build
npx serve -s . -l 3002
# Hoặc
serve -s . -l 3002
```

**Nếu chạy được** → Vấn đề ở PM2 config  
**Nếu không chạy** → Vấn đề ở serve hoặc build

## 🎯 Khuyến nghị

**Thử Cách 1 trước (đơn giản nhất):**
- Đổi `script: 'serve'` thành `script: 'npx'`
- Giữ nguyên `args: ['serve', '-s', 'build', '-l', '3002']`

Nếu không được, dùng **Cách 2** (shell script) - chắc chắn hơn.

