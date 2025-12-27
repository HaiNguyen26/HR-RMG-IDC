# Fix 413 Request Entity Too Large Error

## Vấn đề
Khi nộp đơn chi phí tiếp khách với file đính kèm lớn, gặp lỗi **413 Request Entity Too Large**.

## Nguyên nhân
- Nginx mặc định giới hạn request body size là **1MB**
- Backend Express mặc định giới hạn body size là **100KB**
- File upload có thể lên đến **10MB/file** và tối đa **20 files** (tổng ~200MB)

## Giải pháp

### 1. Backend (Đã fix trong code)
✅ Đã tăng limit trong `backend/server.js`:
- `express.json({ limit: '50mb' })`
- `express.urlencoded({ extended: true, limit: '50mb' })`

### 2. Nginx (Cần chạy trên server)

#### Cách 1: Sử dụng script tự động (KHUYẾN NGHỊ)
```bash
# SSH vào server
ssh root@27.71.16.15

# Chạy script
cd /var/www/hr-management
bash scripts/fix-nginx-upload-limit.sh
```

Script sẽ:
- ✅ Backup config hiện tại
- ✅ Thêm `client_max_body_size 50M;` vào nginx config
- ✅ Test config trước khi apply
- ✅ Reload nginx nếu config hợp lệ

#### Cách 2: Sửa thủ công
```bash
# SSH vào server
ssh root@27.71.16.15

# Backup config
cp /etc/nginx/sites-available/it-request-tracking /etc/nginx/sites-available/it-request-tracking.backup

# Edit config
nano /etc/nginx/sites-available/it-request-tracking
```

Thêm vào **server block** (sau dòng `server {`):
```nginx
server {
    client_max_body_size 50M;  # Thêm dòng này
    
    # ... các config khác
}
```

Và thêm vào **location /hr/api** block:
```nginx
location /hr/api {
    client_max_body_size 50M;  # Thêm dòng này
    proxy_pass http://localhost:3000/api;
    # ... các config khác
}
```

Sau đó:
```bash
# Test config
nginx -t

# Reload nginx
systemctl reload nginx
```

## Kiểm tra
Sau khi fix, test lại bằng cách:
1. Nộp đơn chi phí tiếp khách với file đính kèm
2. Kiểm tra console không còn lỗi 413
3. Kiểm tra request thành công

## Lưu ý
- **50MB** là giới hạn an toàn cho hầu hết trường hợp
- Nếu cần upload file lớn hơn, có thể tăng lên `100M` hoặc `200M`
- Multer đã set limit **10MB/file**, tổng có thể lên đến **200MB** (20 files × 10MB)

