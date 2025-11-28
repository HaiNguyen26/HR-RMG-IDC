# Hướng Dẫn Xóa Toàn Bộ Cấu Hình App HR

## ⚠️ MỤC ĐÍCH
Xóa toàn bộ cấu hình app HR để app IT request hoạt động bình thường trở lại, chuẩn bị làm lại từ đầu.

## 📋 CÁC BƯỚC XÓA

### Bước 1: Dừng PM2 apps của HR

```bash
# Dừng các PM2 apps của HR
pm2 stop hr-rmg-idc-backend
pm2 stop hr-rmg-idc-frontend

# Xóa các PM2 apps
pm2 delete hr-rmg-idc-backend
pm2 delete hr-rmg-idc-frontend

# Lưu lại cấu hình PM2 (chỉ lưu app IT request)
pm2 save

# Kiểm tra chỉ còn app IT request
pm2 list
```

### Bước 2: Xóa file Nginx config của HR

```bash
# Xóa symlink trong sites-enabled
sudo rm /etc/nginx/sites-enabled/hr-rmg-idc 2>/dev/null || true
sudo rm /etc/nginx/sites-enabled/a-hr-rmg-idc 2>/dev/null || true

# Xóa file config trong sites-available
sudo rm /etc/nginx/sites-available/hr-rmg-idc 2>/dev/null || true
sudo rm /etc/nginx/sites-available/a-hr-rmg-idc 2>/dev/null || true

# Kiểm tra đã xóa
ls -la /etc/nginx/sites-enabled/ | grep hr
ls -la /etc/nginx/sites-available/ | grep hr
```

### Bước 3: Xóa location /hr khỏi file it-request-tracking (nếu có)

```bash
# Kiểm tra xem có location /hr trong file it-request-tracking không
cat /etc/nginx/sites-available/it-request-tracking | grep -A 10 "location /hr"

# Nếu có, mở file và xóa
sudo nano /etc/nginx/sites-available/it-request-tracking
```

**Xóa các dòng sau (nếu có):**
```nginx
    # HR Management System - Backend API
    location /hr/api {
        ...
    }

    # HR Management System - Frontend
    location /hr {
        ...
    }
```

**Lưu file:** `Ctrl+O`, `Enter`, `Ctrl+X`

### Bước 4: Test và reload Nginx

```bash
# Test config
sudo nginx -t

# Nếu test thành công, reload Nginx
sudo systemctl reload nginx

# Kiểm tra không còn warning
sudo nginx -t

# Kiểm tra location /hr đã bị xóa
sudo nginx -T | grep "location /hr"
# Nếu không có output → đã xóa thành công
```

### Bước 5: Kiểm tra app IT request hoạt động bình thường

```bash
# Kiểm tra PM2 apps
pm2 list
# Chỉ nên thấy: it-request-api

# Kiểm tra Nginx
sudo systemctl status nginx

# Test truy cập app IT request
curl -I http://localhost/
# Hoặc truy cập: http://27.71.16.15/
```

### Bước 6: (Tùy chọn) Xóa thư mục code HR

**⚠️ CẨN THẬN:** Chỉ xóa nếu chắc chắn không cần code nữa!

```bash
# Backup trước khi xóa (khuyến nghị)
sudo tar -czf /root/hr-rmg-idc-backup-$(date +%Y%m%d).tar.gz /var/www/hr-rmg-idc

# Xóa thư mục (nếu muốn)
# sudo rm -rf /var/www/hr-rmg-idc
```

## ✅ XÁC NHẬN ĐÃ XÓA SẠCH

Sau khi hoàn thành, kiểm tra:

```bash
# 1. PM2 chỉ còn app IT request
pm2 list | grep -v it-request-api
# Không nên có output

# 2. Nginx không còn config HR
ls -la /etc/nginx/sites-enabled/ | grep hr
# Không nên có output

# 3. File it-request-tracking không còn location /hr
cat /etc/nginx/sites-available/it-request-tracking | grep "location /hr"
# Không nên có output

# 4. Nginx test không có warning
sudo nginx -t
# Chỉ nên thấy: "syntax is ok" và "test is successful"
```

## 🔄 LÀM LẠI TỪ ĐẦU

Sau khi xóa sạch, có thể làm lại theo hướng dẫn trong `DEPLOY.md` phần 8.2 - Cách 1 (Tạo file config riêng).

