# 🗑️ XÓA TOÀN BỘ HR APP - Bao gồm cả Database

## ⚡ CHẠY NGAY TRÊN SERVER

### Cách 1: Dùng script tự động (Khuyến nghị)

```bash
# Upload và chạy script
cd /tmp
# Copy nội dung từ DELETE_HR_NOW.sh
nano delete-hr-complete.sh
# Paste script, sau đó:
chmod +x delete-hr-complete.sh
./delete-hr-complete.sh
```

### Cách 2: Copy-paste từng lệnh

SSH vào server và chạy:

```bash
# 1. Xóa PM2 processes
pm2 stop hr-rmg-idc-backend hr-rmg-idc-frontend 2>/dev/null || true
pm2 delete hr-rmg-idc-backend hr-rmg-idc-frontend 2>/dev/null || true
pm2 save

# 2. Xóa Nginx config
sudo rm -f /etc/nginx/sites-enabled/hr-rmg-idc
sudo rm -f /etc/nginx/sites-available/hr-rmg-idc
sudo nginx -t && sudo systemctl reload nginx

# 3. Xóa folder code (TOÀN BỘ)
sudo rm -rf /var/www/hr-rmg-idc

# 4. Xóa database (TOÀN BỘ)
sudo -u postgres psql -c 'DROP DATABASE IF EXISTS "HR_Management_System_RMG_IDC";' 2>/dev/null || true

# 5. Kiểm tra kết quả
echo "=== PM2 ==="
pm2 list | grep hr-rmg-idc || echo "✅ Không còn HR processes"
echo ""
echo "=== Folder ==="
ls -la /var/www | grep hr-rmg-idc || echo "✅ Không còn HR folder"
echo ""
echo "=== Nginx ==="
ls -la /etc/nginx/sites-enabled/ | grep hr-rmg-idc || echo "✅ Không còn HR config"
echo ""
echo "=== Database ==="
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='HR_Management_System_RMG_IDC'" 2>/dev/null || echo "✅ Database đã xóa"
echo ""
echo "✅ Hoàn tất! HR app đã được xóa hoàn toàn."
```

### Cách 2: Dùng script tự động

```bash
# Tạo script
cat > /tmp/delete-hr-now.sh << 'EOF'
#!/bin/bash
echo "🗑️  XÓA TOÀN BỘ HR APP..."
pm2 stop hr-rmg-idc-backend hr-rmg-idc-frontend 2>/dev/null || true
pm2 delete hr-rmg-idc-backend hr-rmg-idc-frontend 2>/dev/null || true
pm2 save
sudo rm -f /etc/nginx/sites-enabled/hr-rmg-idc
sudo rm -f /etc/nginx/sites-available/hr-rmg-idc
sudo nginx -t >/dev/null 2>&1 && sudo systemctl reload nginx
sudo rm -rf /var/www/hr-rmg-idc
sudo -u postgres psql -c 'DROP DATABASE IF EXISTS "HR_Management_System_RMG_IDC";' 2>/dev/null || true
echo "✅ Hoàn tất!"
pm2 list | grep hr-rmg-idc || echo "✅ Không còn HR processes"
ls -la /var/www | grep hr-rmg-idc || echo "✅ Không còn HR folder"
EOF

# Chạy script
chmod +x /tmp/delete-hr-now.sh
/tmp/delete-hr-now.sh
```

---

## ✅ Xóa gì?

- ✅ PM2 processes: `hr-rmg-idc-backend`, `hr-rmg-idc-frontend`
- ✅ Folder: `/var/www/hr-rmg-idc` (toàn bộ code)
- ✅ Nginx config: `/etc/nginx/sites-available/hr-rmg-idc` và symlink
- ✅ Database: `HR_Management_System_RMG_IDC`

## 🔒 Không ảnh hưởng

- ❌ App IT Request vẫn hoạt động bình thường
- ❌ Các PM2 processes khác không bị ảnh hưởng
- ❌ Nginx config của app khác không bị xóa

---

## 🚀 Sau khi xóa

Bạn có thể deploy lại HR app từ đầu theo hướng dẫn trong `DEPLOY_SERVER_NEW.md` hoặc `QUICK_DEPLOY.md`.

