# Script tự động edit block Nginx, push git, pull và áp dụng trên server

## Luồng tổng quát

1. **Local**: Chỉnh `nginx/hr-management.conf` (nếu cần) → chạy script → **tự động commit & push**.
2. **Server**: SSH vào server → chạy script → **tự động pull & áp dụng block HR vào Nginx & reload**.

---

## Bước 1 – Trên máy local (sau khi sửa nginx block)

### Cách A: Git Bash / WSL / Linux

```bash
cd D:/HRM-RMG   # hoặc đường dẫn repo của bạn
bash scripts/nginx-edit-and-push.sh
```

### Cách B: PowerShell (Windows)

```powershell
cd D:\HRM-RMG
.\scripts\nginx-edit-and-push.ps1
```

Script sẽ:
- Kiểm tra `nginx/hr-management.conf` có `client_max_body_size` và block prevent cache HTML.
- `git add` nginx/, scripts/, docs/
- `git commit` (nếu có thay đổi).
- `git push origin main`.

---

## Bước 2 – Trên server (pull và áp dụng Nginx)

```bash
ssh root@27.71.16.15
cd /var/www/hr-management
bash scripts/on-server-pull-and-apply-nginx.sh
```

Script sẽ:
1. **Pull** code từ git (`git pull origin main`).
2. **Backup** config Nginx hiện tại.
3. **Thay** block HR (từ `# HR Management System` đến hết `location /hr/api`) bằng nội dung từ `nginx/hr-management.conf` trong repo.
4. **Test** Nginx (`nginx -t`).
5. **Reload** Nginx (`systemctl reload nginx`).

Nếu không tìm được block để thay, script sẽ fallback: chỉ **thêm** `client_max_body_size 100M;` vào `location /hr/api` nếu chưa có.

---

## Lưu ý

- **Local**: Cần quyền push (đã cấu hình git remote, SSH hoặc PAT).
- **Server**: Cần quyền `sudo` để sửa `/etc/nginx/sites-available/...` và reload nginx.
- Config Nginx đầy đủ HR (frontend + API, cache, `client_max_body_size`) nằm trong repo tại `nginx/hr-management.conf`; mọi chỉnh sửa block HR nên làm ở file này rồi dùng script để push và áp dụng.
