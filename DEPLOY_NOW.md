# 🚀 DEPLOY NGAY - Server 27.71.16.15

## ⚡ Bắt đầu triển khai

### Bước 1: SSH vào server

```bash
ssh root@27.71.16.15
```

### Bước 2: Chạy script tự động

```bash
# Clone code
git clone https://github.com/HaiNguyen26/HR---RMG-IDC.git /var/www/hr-rmg-idc
cd /var/www/hr-rmg-idc

# Chạy script deploy tự động
chmod +x deploy-new-server.sh
sudo ./deploy-new-server.sh
```

**Script sẽ tự động:**
- ✅ Cài đặt Node.js, PostgreSQL, PM2, Nginx
- ✅ Clone code từ GitHub
- ✅ Tạo database `HR_Management_System_RMG_IDC`
- ✅ Cấu hình environment files
- ✅ Build frontend
- ✅ Deploy với PM2 (ports: backend 3001, frontend 3002)
- ✅ Cấu hình Nginx
- ✅ Xóa các file hướng dẫn cũ

### Bước 3: Kiểm tra

Sau khi script chạy xong:
- **Truy cập:** http://27.71.16.15
- **Xem logs:** `pm2 logs`

## 📝 Lưu ý

- **Database:** `HR_Management_System_RMG_IDC` (riêng biệt với app cũ)
- **Thư mục:** `/var/www/hr-rmg-idc` (riêng biệt)
- **Ports:** 3001 (backend), 3002 (frontend) (khác app cũ)

## 🔄 Cập nhật sau này

```bash
cd /var/www/hr-rmg-idc
git pull origin main
cd backend && npm install --production
cd ../frontend && npm install && npm run build
cd ..
pm2 restart all
```

Xem thêm: `UPDATE.md`

