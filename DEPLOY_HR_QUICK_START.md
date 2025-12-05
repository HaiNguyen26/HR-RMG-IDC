# 🚀 Quick Start: Deploy HR Management System

## 📋 Tóm tắt

Triển khai HR Management System lên server `27.71.16.15` cùng với IT-Request app.

## ⚡ Các bước nhanh

### 1. Backup Database (Local)
```bash
# Windows
scripts\backup-hr-database.bat

# Linux/Mac
./scripts/backup-hr-database.sh
```

### 2. Upload Backup lên Server
```bash
scp database/backup_HR_Management_System_*.sql root@27.71.16.15:/tmp/
```

### 3. Deploy trên Server
```bash
ssh root@27.71.16.15
cd /tmp
wget https://raw.githubusercontent.com/HaiNguyen26/HR-RMG-IDC/main/scripts/deploy-hr-to-server.sh
chmod +x deploy-hr-to-server.sh
./deploy-hr-to-server.sh
```

### 4. Cấu hình Nginx
Thêm vào `/etc/nginx/sites-available/it-request-tracking` (xem `nginx/hr-management.conf`)

### 5. Test
- Frontend: http://27.71.16.15/hr
- API: http://27.71.16.15/hr/api/health

## 📚 Chi tiết

Xem `docs/DEPLOY_HR.md` để biết hướng dẫn đầy đủ.

## 📊 Phân tích

Xem `docs/PHAN_TICH_TRIEN_KHAI_HR.md` để biết phân tích chi tiết.

