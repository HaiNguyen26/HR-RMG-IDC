# 🗑️ XÓA TOÀN BỘ DỰ ÁN HR KHỎI SERVER

## ⚠️ CẢNH BÁO

Script này sẽ xóa:
- ✅ PM2 processes: `hr-rmg-idc-backend`, `hr-rmg-idc-frontend`
- ✅ Directory: `/var/www/hr-rmg-idc`
- ✅ Nginx config: `/etc/nginx/sites-available/hr-rmg-idc` và symlink
- ⚠️ Database: `HR_Management_System_RMG_IDC` (tùy chọn)

**KHÔNG ảnh hưởng đến:**
- ❌ App IT Request (it-request-api)
- ❌ Database của app khác
- ❌ Nginx config của app khác
- ❌ PM2 processes khác

---

## 🔍 BƯỚC 1: Kiểm tra trước khi xóa

### Kiểm tra PM2 Processes

```bash
# Xem tất cả PM2 processes
pm2 list

# Chỉ xem HR app processes
pm2 list | grep hr-rmg-idc
```

**Kết quả mong đợi:**
```
│ X │ hr-rmg-idc-backend    │ ... │
│ Y │ hr-rmg-idc-frontend   │ ... │
```

**Đảm bảo KHÔNG có:**
- `it-request-api` trong danh sách (hoặc giữ nguyên nếu có)

### Kiểm tra Directory

```bash
# Kiểm tra thư mục HR app
ls -la /var/www/hr-rmg-idc

# Kiểm tra thư mục app cũ (KHÔNG ĐỘNG VÀO)
ls -la /var/www | grep -v hr-rmg-idc
```

### Kiểm tra Nginx Config

```bash
# Kiểm tra Nginx config HR app
ls -la /etc/nginx/sites-available/hr-rmg-idc
ls -la /etc/nginx/sites-enabled/hr-rmg-idc

# Kiểm tra config app cũ (KHÔNG ĐỘNG VÀO)
ls -la /etc/nginx/sites-available/ | grep -v hr-rmg-idc
ls -la /etc/nginx/sites-enabled/ | grep -v hr-rmg-idc
```

### Kiểm tra Database

```bash
# Đăng nhập PostgreSQL
sudo -u postgres psql

# Xem danh sách databases
\l

# Tìm database HR
\l | grep HR_Management_System_RMG_IDC

# Thoát
\q
```

---

## 🗑️ BƯỚC 2: Xóa PM2 Processes

```bash
# Dừng và xóa HR backend process
pm2 stop hr-rmg-idc-backend 2>/dev/null || echo "Backend process not found"
pm2 delete hr-rmg-idc-backend 2>/dev/null || echo "Backend process not found"

# Dừng và xóa HR frontend process
pm2 stop hr-rmg-idc-frontend 2>/dev/null || echo "Frontend process not found"
pm2 delete hr-rmg-idc-frontend 2>/dev/null || echo "Frontend process not found"

# Kiểm tra lại
pm2 list
```

**✅ Kết quả:** Không còn `hr-rmg-idc-backend` và `hr-rmg-idc-frontend` trong danh sách.

**🔒 Đảm bảo:** App IT Request vẫn còn trong PM2 list (nếu có).

---

## 🗑️ BƯỚC 3: Xóa Nginx Config

```bash
# Xóa symlink (nếu có)
sudo rm -f /etc/nginx/sites-enabled/hr-rmg-idc

# Xóa config file (nếu có)
sudo rm -f /etc/nginx/sites-available/hr-rmg-idc

# Kiểm tra cấu hình Nginx (đảm bảo không lỗi)
sudo nginx -t

# Nếu OK, reload Nginx
sudo systemctl reload nginx
```

**✅ Kết quả:**
- Config HR app đã được xóa
- Nginx vẫn chạy bình thường
- App cũ vẫn truy cập được

---

## 🗑️ BƯỚC 4: Xóa Directory Code

```bash
# Xóa toàn bộ thư mục HR app
sudo rm -rf /var/www/hr-rmg-idc

# Kiểm tra đã xóa
ls -la /var/www | grep hr-rmg-idc
```

**✅ Kết quả:** Không còn thư mục `/var/www/hr-rmg-idc`

**🔒 Đảm bảo:** Các thư mục app khác (như `/var/www/m-fmg-tdc` hoặc tương tự) vẫn còn.

---

## 🗑️ BƯỚC 5: Xóa Database (TÙY CHỌN)

⚠️ **CẢNH BÁO:** Nếu bạn muốn giữ lại database để backup, bỏ qua bước này.

```bash
# Đăng nhập PostgreSQL
sudo -u postgres psql

# Xóa database
DROP DATABASE IF EXISTS "HR_Management_System_RMG_IDC";

# Xóa user (nếu chỉ dùng cho HR app)
-- DROP USER IF EXISTS hr_user;  -- ⚠️ CHỈ XÓA NẾU CHẮC CHẮN USER NÀY KHÔNG DÙNG CHO APP KHÁC

# Kiểm tra
\l | grep HR_Management_System_RMG_IDC

# Thoát
\q
```

**✅ Kết quả:** Database đã được xóa (hoặc giữ lại nếu bỏ qua).

---

## ✅ BƯỚC 6: Kiểm tra hoàn tất

```bash
# 1. Kiểm tra PM2 (không còn HR processes)
echo "=== PM2 Processes ==="
pm2 list

# 2. Kiểm tra Directory (không còn HR folder)
echo ""
echo "=== /var/www ==="
ls -la /var/www | grep hr-rmg-idc || echo "✅ HR folder đã xóa"

# 3. Kiểm tra Nginx config (không còn HR config)
echo ""
echo "=== Nginx Configs ==="
ls -la /etc/nginx/sites-enabled/ | grep hr-rmg-idc || echo "✅ HR Nginx config đã xóa"
ls -la /etc/nginx/sites-available/ | grep hr-rmg-idc || echo "✅ HR Nginx config đã xóa"

# 4. Kiểm tra Ports (ports 3001, 3002 đã giải phóng)
echo ""
echo "=== Ports 3001, 3002 ==="
netstat -tulpn | grep -E "3001|3002" || echo "✅ Ports 3001, 3002 đã giải phóng"

# 5. Kiểm tra App IT Request vẫn chạy (nếu có)
echo ""
echo "=== App IT Request (nếu có) ==="
pm2 list | grep -i "it-request\|request" || echo "Không tìm thấy it-request process"
```

---

## 🚀 SCRIPT TỰ ĐỘNG (Copy-paste)

```bash
#!/bin/bash

echo "🗑️  BẮT ĐẦU XÓA HR APP..."
echo ""

# Kiểm tra PM2 processes HR app
echo "📋 Kiểm tra PM2 processes..."
pm2 list | grep hr-rmg-idc

echo ""
read -p "⚠️  Bạn có chắc muốn xóa HR app? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Hủy bỏ!"
    exit 1
fi

# Bước 1: Xóa PM2 processes
echo ""
echo "1️⃣  Xóa PM2 processes..."
pm2 stop hr-rmg-idc-backend 2>/dev/null || true
pm2 delete hr-rmg-idc-backend 2>/dev/null || true
pm2 stop hr-rmg-idc-frontend 2>/dev/null || true
pm2 delete hr-rmg-idc-frontend 2>/dev/null || true
pm2 save
echo "✅ Đã xóa PM2 processes"

# Bước 2: Xóa Nginx config
echo ""
echo "2️⃣  Xóa Nginx config..."
sudo rm -f /etc/nginx/sites-enabled/hr-rmg-idc
sudo rm -f /etc/nginx/sites-available/hr-rmg-idc
sudo nginx -t && sudo systemctl reload nginx
echo "✅ Đã xóa Nginx config"

# Bước 3: Xóa directory
echo ""
echo "3️⃣  Xóa directory code..."
sudo rm -rf /var/www/hr-rmg-idc
echo "✅ Đã xóa directory"

# Bước 4: Hỏi xóa database
echo ""
read -p "🗄️  Bạn có muốn xóa database HR_Management_System_RMG_IDC? (yes/no): " delete_db

if [ "$delete_db" == "yes" ]; then
    echo "Xóa database..."
    sudo -u postgres psql -c 'DROP DATABASE IF EXISTS "HR_Management_System_RMG_IDC";'
    echo "✅ Đã xóa database"
else
    echo "⏭️  Giữ lại database"
fi

# Kiểm tra kết quả
echo ""
echo "🔍 Kiểm tra kết quả..."
echo ""
echo "=== PM2 Processes ==="
pm2 list

echo ""
echo "=== /var/www ==="
ls -la /var/www | grep hr-rmg-idc || echo "✅ HR folder đã xóa"

echo ""
echo "=== Nginx Configs ==="
ls -la /etc/nginx/sites-enabled/ | grep hr-rmg-idc || echo "✅ HR Nginx config đã xóa"

echo ""
echo "🎉 HOÀN TẤT! HR app đã được xóa khỏi server."
echo "✅ App IT Request vẫn hoạt động bình thường."
```

**Cách dùng:**
```bash
# Copy script vào server và chạy
nano /tmp/delete-hr-app.sh
# Paste script trên
chmod +x /tmp/delete-hr-app.sh
/tmp/delete-hr-app.sh
```

---

## 📋 LỆNH NHANH (Copy-paste từng bước)

Nếu không muốn dùng script tự động, chạy từng lệnh:

```bash
# 1. Xóa PM2 processes
pm2 stop hr-rmg-idc-backend hr-rmg-idc-frontend
pm2 delete hr-rmg-idc-backend hr-rmg-idc-frontend
pm2 save

# 2. Xóa Nginx config
sudo rm -f /etc/nginx/sites-enabled/hr-rmg-idc
sudo rm -f /etc/nginx/sites-available/hr-rmg-idc
sudo nginx -t && sudo systemctl reload nginx

# 3. Xóa directory
sudo rm -rf /var/www/hr-rmg-idc

# 4. Xóa database (nếu muốn)
sudo -u postgres psql -c 'DROP DATABASE IF EXISTS "HR_Management_System_RMG_IDC";'

# 5. Kiểm tra
pm2 list
ls -la /var/www | grep hr-rmg-idc
ls -la /etc/nginx/sites-enabled/ | grep hr-rmg-idc
```

---

## 🔒 ĐẢM BẢO AN TOÀN

Trước khi xóa, đảm bảo:

1. ✅ **App IT Request vẫn chạy:**
   ```bash
   pm2 list | grep -i "it-request\|request"
   curl http://27.71.16.15/  # App cũ vẫn truy cập được
   ```

2. ✅ **Không có lệnh nào ảnh hưởng app khác:**
   - Không dùng `pm2 stop all` hoặc `pm2 delete all`
   - Chỉ xóa `hr-rmg-idc-backend` và `hr-rmg-idc-frontend`
   - Không xóa database khác

3. ✅ **Backup trước khi xóa (nếu cần):**
   ```bash
   # Backup database
   sudo -u postgres pg_dump HR_Management_System_RMG_IDC > /tmp/hr-app-backup.sql
   
   # Backup code (nếu cần)
   tar -czf /tmp/hr-app-code-backup.tar.gz /var/www/hr-rmg-idc
   ```

---

## 🎯 Kết quả

Sau khi hoàn tất:

- ✅ HR app đã được xóa hoàn toàn
- ✅ PM2 processes HR đã dừng và xóa
- ✅ Directory `/var/www/hr-rmg-idc` đã xóa
- ✅ Nginx config HR đã xóa
- ✅ Ports 3001, 3002 đã giải phóng
- ✅ Database đã xóa (nếu chọn)
- ✅ **App IT Request vẫn hoạt động bình thường**

Giờ bạn có thể deploy lại HR app từ đầu! 🚀

