# Quick Start - Deploy HR Management System

## Tóm tắt nhanh

1. **Backup database local:**
   ```bash
   # Windows PowerShell
   .\scripts\backup-database.ps1
   ```

2. **Push code lên GitHub:**
   ```bash
   git add .
   git commit -m "Deploy to production"
   git push origin main
   ```

3. **Trên server Ubuntu (27.71.16.15):**
   - Clone code từ GitHub
   - Cài đặt dependencies
   - Restore database từ backup
   - Cấu hình .env
   - Build frontend
   - Chạy với PM2

**Xem hướng dẫn chi tiết trong file [DEPLOY.md](./DEPLOY.md)**

