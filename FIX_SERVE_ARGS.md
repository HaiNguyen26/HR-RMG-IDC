# 🔧 Sửa Lỗi: getaddrinfo ENOTFOUND -l

## ❌ Lỗi

```
Error: getaddrinfo ENOTFOUND -l
```

## 🔍 Nguyên nhân

Trong `ecosystem.config.js`, `args` đang dùng **string** thay vì **array**. PM2 sẽ parse sai và coi `-l` như một hostname để DNS lookup.

## ✅ Cách sửa

### Cách 1: Dùng Script Tự động (Khuyến nghị)

**Trên server, chạy:**

```bash
cd /var/www/hr-rmg-idc

# Tạo script
cat > fix-pm2-frontend.sh << 'EOF'
#!/bin/bash
CONFIG_FILE="/var/www/hr-rmg-idc/ecosystem.config.js"
cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
sed -i "s/args: '-s build -l 3002'/args: ['-s', 'build', '-l', '3002']/" "$CONFIG_FILE"
pm2 stop hr-rmg-idc-frontend 2>/dev/null || true
pm2 delete hr-rmg-idc-frontend 2>/dev/null || true
cd /var/www/hr-rmg-idc
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend
sleep 2
pm2 list | grep hr-rmg-idc-frontend
EOF

chmod +x fix-pm2-frontend.sh
./fix-pm2-frontend.sh
```

### Cách 2: Sửa Thủ công

**Trên Server:**

**1. Sửa file `ecosystem.config.js`:**

```bash
nano /var/www/hr-rmg-idc/ecosystem.config.js
```

**2. Tìm và sửa phần frontend:**

**❌ SAI (String):**
```javascript
{
  name: 'hr-rmg-idc-frontend',
  script: 'serve',
  args: '-s build -l 3002',  // ❌ String - PM2 parse sai
  // ...
}
```

**✅ ĐÚNG (Array):**
```javascript
{
  name: 'hr-rmg-idc-frontend',
  script: 'serve',
  args: ['-s', 'build', '-l', '3002'],  // ✅ Array - PM2 parse đúng
  // ...
}
```

**3. Lưu file:** `Ctrl+O`, `Enter`, `Ctrl+X`

**4. Xóa process cũ và khởi động lại:**

```bash
# Xóa process frontend cũ
pm2 delete hr-rmg-idc-frontend

# Khởi động lại từ config mới
cd /var/www/hr-rmg-idc
pm2 start ecosystem.config.js

# Kiểm tra
pm2 list
pm2 logs hr-rmg-idc-frontend
```

## ✅ Kết quả

Sau khi sửa, frontend sẽ chạy đúng:
- Status: `online` (màu xanh)
- Không còn lỗi `ENOTFOUND -l`
- Port 3002 đang listen

## 📝 Lưu ý

Luôn dùng **array** cho `args` trong PM2 ecosystem config, không dùng string!

```javascript
// ✅ Đúng
args: ['arg1', 'arg2', 'arg3']

// ❌ Sai
args: 'arg1 arg2 arg3'
```

