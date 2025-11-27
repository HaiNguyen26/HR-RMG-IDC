# ⚡ DEPLOY NHANH - Server 27.71.16.15

## 🚀 Cách 1: Tự động (Khuyến nghị)

```bash
# SSH vào server
ssh root@27.71.16.15

# Clone và chạy script tự động
git clone https://github.com/HaiNguyen26/HR---RMG-IDC.git /var/www/hr-rmg-idc
cd /var/www/hr-rmg-idc
chmod +x deploy-new-server.sh
sudo ./deploy-new-server.sh
```

Script sẽ tự động:
- ✅ Cài đặt tất cả prerequisites
- ✅ Clone code từ GitHub
- ✅ Setup database
- ✅ Cấu hình environment
- ✅ Build và deploy với PM2
- ✅ Cấu hình Nginx

## 📖 Cách 2: Thủ công (Từng bước)

Xem file **`DEPLOY_SERVER_NEW.md`** để có hướng dẫn chi tiết.

## 🎯 Thông tin Quan trọng

| Item | Giá trị |
|------|---------|
| **Server IP** | 27.71.16.15 |
| **Thư mục** | `/var/www/hr-rmg-idc` |
| **Database** | `HR_Management_System_RMG_IDC` |
| **DB User** | `hr_user_rmg_idc` |
| **Backend Port** | 3001 |
| **Frontend Port** | 3002 |
| **URL** | http://27.71.16.15 |

## ⚠️ Phân biệt với App Cũ

App này được setup **tách biệt** với app cũ:
- ✅ Thư mục riêng
- ✅ Database riêng  
- ✅ Ports riêng
- ✅ PM2 apps riêng

## ✅ Sau khi Deploy

Truy cập: **http://27.71.16.15**

Kiểm tra:
```bash
pm2 status
pm2 logs hr-rmg-idc-backend
pm2 logs hr-rmg-idc-frontend
```

