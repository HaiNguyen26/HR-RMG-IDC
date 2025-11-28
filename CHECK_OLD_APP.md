# 🔍 Kiểm tra App Cũ đang chạy như thế nào

## ❌ Lỗi: "Process or Namespace it-request-api not found"

App cũ không có trong PM2, có thể đang chạy bằng cách khác.

## 🔍 Bước 1: Kiểm tra PM2 List

```bash
# Xem tất cả process trong PM2
pm2 list

# Xem tất cả process (kể cả stopped)
pm2 list --no-color
```

## 🔍 Bước 2: Kiểm tra Process đang chạy

```bash
# Kiểm tra tất cả process Node.js đang chạy
ps aux | grep node

# Hoặc chi tiết hơn
ps aux | grep -E "node|npm|pm2"
```

## 🔍 Bước 3: Kiểm tra Port App Cũ đang dùng

**Giả sử app cũ chạy trên port 3000:**

```bash
# Kiểm tra port 3000
netstat -tulpn | grep 3000

# Hoặc
lsof -i :3000

# Hoặc
ss -tulpn | grep 3000
```

**Tìm process đang listen trên port:**
```bash
# Tìm process trên port bất kỳ
sudo netstat -tulpn | grep LISTEN
```

## 🔍 Bước 4: Kiểm tra Systemd Service

App cũ có thể chạy bằng systemd:

```bash
# Kiểm tra systemd services
systemctl list-units --type=service | grep -i "node\|api\|app"

# Hoặc tìm service có tên liên quan
systemctl list-units --type=service | grep -i "request\|it-request"
```

## 🔍 Bước 5: Kiểm tra Screen/Tmux

App có thể chạy trong screen hoặc tmux:

```bash
# Kiểm tra screen sessions
screen -ls

# Kiểm tra tmux sessions
tmux ls
```

## 🔍 Bước 6: Kiểm tra Nginx Config

Xem Nginx config để biết app cũ đang chạy ở đâu:

```bash
# Xem nginx config
cat /etc/nginx/sites-available/default | grep proxy_pass

# Hoặc
ls /etc/nginx/sites-available/
cat /etc/nginx/sites-available/* | grep proxy_pass
```

## ✅ Sau khi tìm thấy

### Nếu app chạy bằng PM2 nhưng tên khác:

```bash
# Xem tất cả process PM2
pm2 list

# Restart với tên đúng
pm2 restart <tên-đúng>
```

### Nếu app chạy bằng systemd:

```bash
# Tìm tên service
systemctl list-units --type=service | grep -i "node\|api"

# Restart service
sudo systemctl restart <tên-service>

# Hoặc
sudo systemctl status <tên-service>
```

### Nếu app chạy trực tiếp (node/npm):

```bash
# Tìm process ID từ port
lsof -i :3000
# Hoặc
netstat -tulpn | grep 3000

# Kill và khởi động lại (nếu biết cách khởi động)
kill <PID>
cd /path/to/app
npm start
# hoặc
node server.js
```

### Nếu app chạy trong screen/tmux:

```bash
# Vào screen session
screen -r <session-name>

# Hoặc tmux
tmux attach -t <session-name>

# Trong session, nhấn Ctrl+C để dừng, rồi khởi động lại
```

## 🚀 Script Kiểm tra Tự động

```bash
echo "=== PM2 Processes ==="
pm2 list

echo ""
echo "=== Node.js Processes ==="
ps aux | grep node | grep -v grep

echo ""
echo "=== Ports đang listen ==="
netstat -tulpn | grep LISTEN | grep -E "3000|3001|3002|80|443"

echo ""
echo "=== Systemd Services (Node.js) ==="
systemctl list-units --type=service | grep -i node

echo ""
echo "=== Screen Sessions ==="
screen -ls 2>/dev/null || echo "No screen sessions"

echo ""
echo "=== Tmux Sessions ==="
tmux ls 2>/dev/null || echo "No tmux sessions"
```

## 💡 Lưu ý

- App cũ có thể có tên khác trong PM2
- App cũ có thể chạy trên port khác (không phải 3000)
- App cũ có thể không dùng PM2

## 📋 Sau khi tìm thấy cách app chạy

Hãy cho tôi biết:
1. App đang chạy bằng cách nào? (PM2/systemd/node trực tiếp/screen/tmux)
2. Tên process/service là gì?
3. Port nào đang được dùng?

Tôi sẽ hướng dẫn cách restart cụ thể.


