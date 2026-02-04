# Sửa lỗi 413 khi submit hóa đơn hoàn ứng

## Nguyên nhân
- Nginx mặc định giới hạn kích thước request body là **1MB** (`client_max_body_size`).
- Khi nhân viên submit hóa đơn hoàn ứng (travel expense settlement) có nhiều file đính kèm hoặc dữ liệu lớn → request vượt 1MB → Nginx trả về **413 Request Entity Too Large** trước khi request đến backend.

## Đã sửa trong code
- **Backend** (`server.js`): Đã cấu hình `express.json({ limit: '100mb' })` và `express.urlencoded({ limit: '100mb' })`.
- **Nginx** (`nginx/hr-management.conf`): Đã thêm `client_max_body_size 100M;` trong `location /hr/api`.

## Áp dụng trên server

### Bước 1: Pull code mới
```bash
cd /var/www/hr-management
git pull origin main
```

### Bước 2: Cập nhật Nginx config
Mở file config Nginx:
```bash
sudo nano /etc/nginx/sites-available/it-request-tracking
```

Tìm block **`location /hr/api {`** và thêm dòng **ngay sau** `location /hr/api {`:
```nginx
    # Allow large request body (hóa đơn hoàn ứng, file uploads, etc.)
    client_max_body_size 100M;
```

Ví dụ block sau khi sửa:
```nginx
location /hr/api {
    client_max_body_size 100M;

    proxy_pass http://localhost:3000/api;
    proxy_http_version 1.1;
    # ... các dòng còn lại giữ nguyên
}
```

### Bước 3: Test và reload Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

Sau khi reload, submit hóa đơn hoàn ứng sẽ không còn lỗi 413 (tối đa 100MB request body).
