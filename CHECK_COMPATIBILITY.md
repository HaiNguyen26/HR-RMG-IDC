# Kiểm Tra Tương Thích - Đảm Bảo Không Xung Đột Với App Cũ

## Checklist Trước Khi Deploy

### ✅ 1. Kiểm Tra Ports

```bash
# Trên server, kiểm tra ports đang được sử dụng
sudo netstat -tulpn | grep LISTEN
# hoặc
sudo ss -tulpn | grep LISTEN
```

**Ứng dụng HR Management System sẽ dùng:**
- Backend: Port **3001**
- Frontend: Port **3002**

**Nếu port 3001 hoặc 3002 đã được sử dụng:**
- Thay đổi port trong `ecosystem.config.js`
- Thay đổi port trong `backend/.env`
- Chọn port khác (ví dụ: 3003, 3004, 4001, 4002...)

### ✅ 2. Kiểm Tra PM2 Apps

```bash
# Xem danh sách PM2 apps
pm2 list
```

**Ứng dụng HR Management System sẽ có tên:**
- `hr-rmg-idc-backend`
- `hr-rmg-idc-frontend`

**Nếu có tên trùng:**
- Đổi tên trong `ecosystem.config.js`

### ✅ 3. Kiểm Tra Thư Mục

```bash
# Xem các thư mục trong /var/www
ls -la /var/www/
```

**Ứng dụng HR Management System sẽ ở:**
- `/var/www/hr-rmg-idc`

**Nếu thư mục đã tồn tại:**
- Chọn thư mục khác (ví dụ: `/var/www/hr-management`)
- Hoặc backup và xóa thư mục cũ (nếu không cần)

### ✅ 4. Kiểm Tra Database

```bash
# Xem danh sách databases
sudo -u postgres psql -l
```

**Ứng dụng HR Management System sẽ dùng database:**
- `HR_Management_System`

**Nếu database đã tồn tại:**
- Database này là riêng, không ảnh hưởng đến database của app cũ
- Có thể có nhiều databases cùng lúc trong PostgreSQL

### ✅ 5. Kiểm Tra Nginx (nếu dùng)

```bash
# Xem các site đã cấu hình
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/
```

**Nếu app cũ đã dùng port 80:**
- Dùng subdomain hoặc path khác
- Hoặc dùng port khác (8080, 8081...)
- Hoặc không dùng Nginx, truy cập trực tiếp qua port

## Kết Quả Kiểm Tra

Sau khi kiểm tra, ghi chú lại:

- [ ] Ports không xung đột: `_____________`
- [ ] PM2 app names không trùng: `_____________`
- [ ] Thư mục riêng biệt: `_____________`
- [ ] Database riêng: `_____________`
- [ ] Nginx config không xung đột: `_____________`

## Xác Nhận An Toàn

Nếu tất cả các mục trên đều ✅, bạn có thể deploy an toàn mà không ảnh hưởng đến app cũ.

