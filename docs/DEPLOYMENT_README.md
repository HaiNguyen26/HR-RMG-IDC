# 🚀 Hướng dẫn Triển khai HR Management System

## 📋 Tổng quan

Tài liệu này hướng dẫn bạn triển khai HR Management System lên Ubuntu cloud server để HR có thể sử dụng.

## ✅ Đánh giá Tính năng

**Hệ thống HOÀN TOÀN SẴN SÀNG cho HR sử dụng!**

Ứng dụng đã có đầy đủ các tính năng:
- ✅ Quản lý nhân viên (CRUD đầy đủ)
- ✅ Quản lý ứng viên và tuyển dụng
- ✅ Xử lý các yêu cầu (nghỉ phép, tăng ca, điều chỉnh chấm công, chi phí công tác)
- ✅ Dashboard và thống kê
- ✅ Hệ thống thông báo
- ✅ Phân quyền và bảo mật

Xem chi tiết: [Đánh giá Tính năng HR](HR_FEATURES_ASSESSMENT.md)

## 📚 Tài liệu Triển khai

### 1. Hướng dẫn Nhanh (5-10 phút)
👉 [DEPLOYMENT_QUICK_START.md](DEPLOYMENT_QUICK_START.md)

**Dành cho:** Người đã có kinh nghiệm với Linux/Ubuntu và muốn triển khai nhanh.

### 2. Hướng dẫn Chi tiết (30-60 phút)
👉 [DEPLOYMENT_UBUNTU.md](DEPLOYMENT_UBUNTU.md)

**Dành cho:** Người mới hoặc muốn hiểu rõ từng bước, bao gồm:
- Cài đặt đầy đủ các dependencies
- Cấu hình database chi tiết
- Cấu hình Nginx reverse proxy
- Cài đặt SSL certificate
- Setup backup tự động
- Troubleshooting

### 3. Hướng dẫn Cập nhật Code (Sau khi deploy)
👉 [UPDATE_DEPLOYMENT.md](UPDATE_DEPLOYMENT.md)

**Dành cho:** Cập nhật code mới lên server đã deploy, bao gồm:
- Quy trình cập nhật code
- Backup database trước khi cập nhật
- Xử lý migrations
- Rollback nếu có lỗi
- Script tự động cập nhật

## 🔧 Công cụ Hỗ trợ

### 1. Script Deploy Tự động
File `deploy.sh` ở thư mục root giúp tự động hóa quá trình triển khai.

**Sử dụng:**
```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

**Lưu ý:** 
- Script này giả định bạn đã cài đặt các dependencies cơ bản (Node.js, PostgreSQL, Nginx)
- Bạn cần cấu hình database và environment files trước

### 2. PM2 Ecosystem Config
File `ecosystem.config.js` ở thư mục root cấu hình PM2 để quản lý processes.

**Sử dụng:**
```bash
pm2 start ecosystem.config.js
```

## 📋 Checklist Trước khi Triển khai

### Yêu cầu Server
- [ ] Ubuntu Server 18.04+ (20.04 hoặc 22.04 khuyến nghị)
- [ ] Tối thiểu 2GB RAM
- [ ] Tối thiểu 10GB dung lượng ổ cứng
- [ ] Quyền root hoặc sudo
- [ ] Kết nối internet ổn định

### Yêu cầu Kiến thức
- [ ] Hiểu cơ bản về Linux command line
- [ ] Biết cách sử dụng SSH
- [ ] Hiểu cơ bản về PostgreSQL
- [ ] (Tùy chọn) Có domain name nếu muốn dùng SSL

## 🎯 Các Bước Chính

1. **Chuẩn bị Server** → Cài đặt Node.js, PostgreSQL, Nginx, PM2
2. **Cấu hình Database** → Tạo database và import schema
3. **Clone/Copy Code** → Upload code lên server
4. **Cài đặt Dependencies** → npm install cho backend và frontend
5. **Cấu hình Environment** → Tạo .env files với thông tin đúng
6. **Build Frontend** → npm run build cho production
7. **Cấu hình Nginx** → Setup reverse proxy
8. **Khởi động với PM2** → Chạy ứng dụng với process manager
9. **Cài đặt SSL** → (Tùy chọn) Thiết lập HTTPS
10. **Kiểm tra** → Test các tính năng và đảm bảo hoạt động đúng

## 🆘 Hỗ trợ

### Nếu gặp lỗi:

1. **Xem logs:**
   ```bash
   pm2 logs
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Kiểm tra trạng thái services:**
   ```bash
   pm2 status
   sudo systemctl status postgresql
   sudo systemctl status nginx
   ```

3. **Kiểm tra ports:**
   ```bash
   sudo netstat -tulpn | grep :3000
   sudo netstat -tulpn | grep :3001
   ```

4. **Xem tài liệu troubleshooting trong DEPLOYMENT_UBUNTU.md**

## 📞 Liên hệ & Feedback

Nếu bạn gặp vấn đề khi triển khai hoặc có đề xuất cải thiện, vui lòng tạo issue trên repository.

## ✅ Sau khi Triển khai

Sau khi triển khai thành công:

1. **Đổi mật khẩu mặc định:**
   - Tất cả tài khoản mặc định có password: `RMG123@`
   - Vui lòng đổi ngay sau lần đăng nhập đầu tiên

2. **Thiết lập backup tự động:**
   - Xem hướng dẫn backup trong DEPLOYMENT_UBUNTU.md

3. **Training nhân viên HR:**
   - Hướng dẫn nhân viên sử dụng hệ thống
   - Xem tài liệu tính năng trong HR_FEATURES_ASSESSMENT.md

4. **Monitor và theo dõi:**
   - Kiểm tra logs thường xuyên
   - Monitor performance với PM2: `pm2 monit`

---

**Chúc bạn triển khai thành công! 🎉**

