# ⚠️ CẢNH BÁO: File này dùng `pm2 kill` - Sẽ ảnh hưởng App Cũ!

**KHÔNG nên dùng file này nếu bạn có app cũ đang chạy!**

Xem **`FIX_FRONTEND_SAFE.md`** để sửa an toàn hơn.

---

# 🔄 Force Reload PM2 - Config đã đúng nhưng vẫn lỗi

## ✅ File config đã đúng

Bạn đã xác nhận `args: ['-s', 'build', '-l', '3002']` là array - **ĐÚNG RỒI!**

Nhưng PM2 vẫn chạy với config cũ → Cần **force reload**.

## 🚀 Các bước sửa

### Bước 1: Dừng hoàn toàn PM2

```bash
# Dừng và xóa process frontend
pm2 stop hr-rmg-idc-frontend
pm2 delete hr-rmg-idc-frontend

# Kill PM2 daemon (xóa toàn bộ cache)
pm2 kill

# Đợi 2 giây
sleep 2
```

### Bước 2: Kiểm tra PM2 đã dừng chưa

```bash
pm2 list
# Phải thấy: No process found
```

### Bước 3: Khởi động lại từ đầu

```bash
cd /var/www/hr-rmg-idc

# Khởi động lại cả backend và frontend từ config mới
pm2 start ecosystem.config.js

# Hoặc chỉ frontend
# pm2 start ecosystem.config.js --only hr-rmg-idc-frontend
```

### Bước 4: Kiểm tra

```bash
# Đợi 3 giây
sleep 3

# Kiểm tra status
pm2 list

# Xem log
pm2 logs hr-rmg-idc-frontend --lines 10 --nostream
```

## 🔧 Hoặc dùng PM2 Save và Resurrect

```bash
# 1. Dừng và xóa
pm2 stop all
pm2 delete all

# 2. Kill daemon
pm2 kill

# 3. Khởi động lại từ config
cd /var/www/hr-rmg-idc
pm2 start ecosystem.config.js

# 4. Save để PM2 nhớ
pm2 save

# 5. Kiểm tra
sleep 3
pm2 list
```

## ⚡ Script Tự động (Copy toàn bộ)

```bash
cd /var/www/hr-rmg-idc

# Dừng tất cả
pm2 stop all
pm2 delete all
pm2 kill

# Đợi
sleep 2

# Khởi động lại
pm2 start ecosystem.config.js

# Save
pm2 save

# Kiểm tra
sleep 3
echo "=== PM2 Status ==="
pm2 list
echo ""
echo "=== Frontend Logs ==="
pm2 logs hr-rmg-idc-frontend --lines 10 --nostream
```

## 🔍 Nếu vẫn lỗi

### Kiểm tra PM2 version

```bash
pm2 --version
```

### Kiểm tra xem có nhiều PM2 daemon không

```bash
ps aux | grep pm2
```

### Xóa toàn bộ PM2 và cài lại

```bash
# Dừng tất cả
pm2 kill

# Xóa PM2 (nếu cần)
npm uninstall -g pm2

# Cài lại
npm install -g pm2

# Khởi động lại
cd /var/www/hr-rmg-idc
pm2 start ecosystem.config.js
pm2 save
```

## 💡 Nguyên nhân có thể

1. PM2 daemon cache config cũ
2. Nhiều PM2 daemon chạy cùng lúc
3. PM2 version cũ có bug với args array

## ✅ Kết quả mong đợi

```
┌─────┬──────────────────────┬─────────┐
│ id  │ name                 │ status  │
├─────┼──────────────────────┼─────────┤
│ 0   │ hr-rmg-idc-frontend  │ online  │  <-- online (xanh)
└─────┴──────────────────────┴─────────┘
```

Logs phải thấy:
```
frontend: Serving!
frontend: http://localhost:3002
```

KHÔNG được thấy:
```
Error: getaddrinfo ENOTFOUND -l
```

