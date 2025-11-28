# 🔄 Khởi động lại App Cũ (it-request-api)

## ❌ Nếu gặp lỗi: "Process or Namespace it-request-api not found"

App cũ không có trong PM2. Xem **`CHECK_OLD_APP.md`** để kiểm tra app đang chạy bằng cách nào.

## 🔍 Kiểm tra App Cũ trước

```bash
# Xem tất cả PM2 processes
pm2 list

# Kiểm tra process Node.js
ps aux | grep node

# Kiểm tra port (ví dụ: 3000)
netstat -tulpn | grep 3000
```

## ✅ Các cách khởi động lại App Cũ

### Cách 1: Restart (Nhanh nhất)

```bash
# Restart app cũ
pm2 restart it-request-api

# Kiểm tra status
pm2 list
```

### Cách 2: Stop và Start lại

```bash
# Dừng app cũ
pm2 stop it-request-api

# Khởi động lại
pm2 start it-request-api

# Kiểm tra
pm2 list
```

### Cách 3: Reload (Zero-downtime)

```bash
# Reload app cũ (không có downtime)
pm2 reload it-request-api

# Kiểm tra
pm2 list
```

## 🔍 Kiểm tra Status

```bash
# Xem status tất cả apps
pm2 list

# Xem log app cũ
pm2 logs it-request-api

# Xem log real-time
pm2 logs it-request-api --lines 50
```

## ⚡ Lệnh Nhanh (Copy-paste)

```bash
# Restart app cũ
pm2 restart it-request-api

# Đợi 2 giây và kiểm tra
sleep 2
pm2 list | grep it-request

# Xem log
pm2 logs it-request-api --lines 10 --nostream
```

## 📋 Kết quả mong đợi

```
┌─────┬──────────────────┬─────────┬─────────┬──────────┐
│ id  │ name             │ status  │ uptime  │ ...      │
├─────┼──────────────────┼─────────┼─────────┼──────────┤
│ 0   │ it-request-api   │ online  │ 5s      │ ...      │  <-- online (xanh)
└─────┴──────────────────┴─────────┴─────────┴──────────┘
```

## 🔧 Nếu app cũ không có trong PM2 list

Nếu app cũ không có trong `pm2 list`, có thể:

1. **App cũ đang chạy bằng cách khác** (systemd, screen, tmux, v.v.)
2. **App cũ chưa được thêm vào PM2**

Để kiểm tra:
```bash
# Kiểm tra process đang chạy
ps aux | grep -i "it-request\|node.*3000\|api"

# Kiểm tra port app cũ đang dùng (ví dụ: 3000)
netstat -tulpn | grep 3000
# hoặc
lsof -i :3000
```

## 💡 Lưu ý

- `pm2 restart`: Dừng và khởi động lại (có downtime ngắn)
- `pm2 reload`: Reload với zero-downtime (chỉ có với cluster mode)
- `pm2 stop` + `pm2 start`: Giống restart nhưng tách thành 2 lệnh

## ✅ Sau khi restart

Kiểm tra app cũ hoạt động:
- Truy cập URL app cũ (ví dụ: http://27.71.16.15)
- Kiểm tra log: `pm2 logs it-request-api`

