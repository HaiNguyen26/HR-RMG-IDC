# 🔧 SỬA LỖI ARGS NGAY - Frontend vẫn bị lỗi

## ❌ Vấn đề

Frontend vẫn bị lỗi `getaddrinfo ENOTFOUND -l` dù đã restart. File `ecosystem.config.js` trên server vẫn có `args` sai format.

## ✅ Giải pháp

### Bước 1: Kiểm tra file trên server

```bash
cd /var/www/hr-rmg-idc
cat ecosystem.config.js | grep -A 5 "hr-rmg-idc-frontend"
```

**Nếu thấy:**
```javascript
args: '-s build -l 3002',  // ❌ SAI - String format
```

**Phải là:**
```javascript
args: ['-s', 'build', '-l', '3002'],  // ✅ ĐÚNG - Array format
```

### Bước 2: Sửa file

**Cách 1: Dùng sed (tự động)**

```bash
cd /var/www/hr-rmg-idc

# Sửa args thành array
sed -i "s/args: '-s build -l 3002'/args: ['-s', 'build', '-l', '3002']/" ecosystem.config.js

# Kiểm tra đã sửa đúng chưa
cat ecosystem.config.js | grep -A 2 "args:"
```

**Cách 2: Sửa thủ công bằng nano**

```bash
cd /var/www/hr-rmg-idc
nano ecosystem.config.js
```

Tìm dòng:
```javascript
args: '-s build -l 3002',
```

Sửa thành:
```javascript
args: ['-s', 'build', '-l', '3002'],
```

Lưu: `Ctrl+O`, `Enter`, `Ctrl+X`

### Bước 3: Restart frontend

```bash
cd /var/www/hr-rmg-idc

# Xóa process cũ
pm2 delete hr-rmg-idc-frontend

# Start lại với config mới
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend

# Kiểm tra logs (không còn lỗi)
pm2 logs hr-rmg-idc-frontend --lines 10

# Kiểm tra status
pm2 list
```

### Bước 4: Đảm bảo file trên GitHub cũng đúng

```bash
cd /var/www/hr-rmg-idc

# Kiểm tra thay đổi
git status

# Commit và push
git add ecosystem.config.js
git commit -m "Fix PM2 args format to array"
git push origin main
```

## ✅ Kết quả mong đợi

Sau khi sửa:

1. **Kiểm tra file:**
```bash
cat ecosystem.config.js | grep -A 2 "args:"
```
Phải thấy: `args: ['-s', 'build', '-l', '3002'],`

2. **Kiểm tra logs:**
```bash
pm2 logs hr-rmg-idc-frontend --lines 5
```
Không còn lỗi `getaddrinfo ENOTFOUND -l`

3. **Kiểm tra status:**
```bash
pm2 list
```
Frontend phải `online` và không restart lại.

## 🐛 Nếu vẫn lỗi

### Kiểm tra file có nhiều dòng args không

```bash
cd /var/www/hr-rmg-idc
grep -n "args:" ecosystem.config.js
```

Nếu có nhiều dòng, sửa từng dòng một.

### Kiểm tra format file có vấn đề không

```bash
cd /var/www/hr-rmg-idc
node -c ecosystem.config.js
```

Nếu có lỗi syntax, sửa lại file.

### Xóa cache PM2 và restart

```bash
cd /var/www/hr-rmg-idc

# Xóa process
pm2 delete hr-rmg-idc-frontend

# Xóa và start lại
pm2 kill  # ⚠️ Cẩn thận: Dừng tất cả PM2 processes
pm2 resurrect  # Khởi động lại tất cả (nếu có save trước đó)

# Hoặc đơn giản hơn, chỉ restart frontend
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend
```

---

**💡 Lưu ý:** File `ecosystem.config.js` trong repo GitHub đã đúng format. Nếu server pull từ GitHub nhưng vẫn sai, có thể file trên GitHub chưa được push. Đảm bảo push file đúng lên GitHub trước.

