# 🚀 Push Code lên GitHub - Hướng dẫn Nhanh

## ✅ Tình trạng hiện tại

Git đã được khởi tạo và có remote `origin/main`. Cần commit và push các thay đổi mới nhất.

---

## ⚠️ QUAN TRỌNG: Database Backup KHÔNG được push

**File backup database (`*.sql`) đã được thêm vào `.gitignore` và sẽ KHÔNG được push lên GitHub.**

**Lý do:**
- ❌ **Bảo mật:** Chứa dữ liệu nhạy cảm (thông tin nhân viên)
- ❌ **Kích thước:** File backup có thể rất lớn
- ❌ **Best Practice:** Database nên được backup và migrate riêng

**✅ Cách migrate database:** Xem `MIGRATE_DATABASE.md`

---

## 📤 BƯỚC 1: Commit và Push Code

### 1.1. Kiểm tra các thay đổi

```powershell
cd D:\Web-App-HR-Demo
git status
```

### 1.2. Add tất cả các thay đổi

```powershell
# Add tất cả files (file backup .sql sẽ tự động bị bỏ qua nhờ .gitignore)
git add .
```

### 1.3. Commit

```powershell
git commit -m "Update: HR Management System - Ready for deployment

- Add deployment documentation
- Update candidate management features
- Add GitHub deployment guides
- Clean up unused files
- Update notification system"
```

### 1.4. Push lên GitHub

```powershell
# Push lên GitHub
git push origin main
```

**Nếu yêu cầu authentication:**
- Username: `YOUR_GITHUB_USERNAME`
- Password: `YOUR_PERSONAL_ACCESS_TOKEN` (KHÔNG dùng password GitHub)

---

## 🔐 Tạo Personal Access Token (nếu chưa có)

### Cách 1: Tạo trên GitHub Web

1. Đăng nhập GitHub: https://github.com
2. Click avatar → **Settings**
3. Scroll xuống → **Developer settings**
4. Click **Personal access tokens** → **Tokens (classic)**
5. Click **Generate new token** → **Generate new token (classic)**
6. Đặt tên: `HR-System-Deploy`
7. Chọn scopes:
   - ✅ **repo** (Full control of private repositories)
8. Click **Generate token**
9. **Copy token ngay** (chỉ hiển thị 1 lần!)

### Cách 2: Dùng trong Terminal

Khi `git push` yêu cầu password, dán token vào thay cho password.

---

## ✅ Kiểm tra sau khi Push

1. Vào GitHub: https://github.com/YOUR_USERNAME/hr-management-system
2. Kiểm tra tất cả files đã được push
3. Kiểm tra file backup `.sql` KHÔNG có trong repository (đúng như mong muốn)

---

## 🗄️ Database: Xử lý riêng

### Nếu muốn migrate database từ local:

1. **Backup database trên local:**
   ```powershell
   pg_dump -U postgres -d HR_Management_System > backup_hr_management.sql
   ```

2. **Upload backup lên server bằng SCP/FileZilla** (KHÔNG push lên GitHub)

3. **Restore trên server** (xem `MIGRATE_DATABASE.md`)

---

## 📋 Checklist

- [ ] Đã kiểm tra `.gitignore` có `*.sql`
- [ ] Đã add tất cả files (`git add .`)
- [ ] Đã commit với message rõ ràng
- [ ] Đã có Personal Access Token
- [ ] Đã push thành công (`git push origin main`)
- [ ] Đã kiểm tra trên GitHub (code đã có, backup KHÔNG có)

---

## 🆘 Troubleshooting

**Lỗi: "remote origin already exists"**
- Repository đã được setup, tiếp tục push

**Lỗi: "Authentication failed"**
- Kiểm tra lại Personal Access Token
- Token phải có scope `repo`

**Lỗi: "Permission denied"**
- Kiểm tra repository là Private hay Public
- Kiểm tra bạn có quyền truy cập

---

**Sau khi push thành công, tiếp tục với `QUICK_DEPLOY.md` để deploy trên server!** 🎉

