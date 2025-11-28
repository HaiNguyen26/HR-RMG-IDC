# 🔧 SỬA LỖI GIT DIVERGENT BRANCHES

## ❌ Vấn đề

Git báo lỗi: "You have divergent branches and need to specify how to reconcile them"

Điều này có nghĩa:
- Local branch và remote branch có commit khác nhau
- Cần quyết định cách merge chúng lại

## ✅ Giải pháp

### Cách 1: Pull với Merge (Khuyến nghị - An toàn)

```bash
cd /var/www/hr-rmg-idc

# Pull code từ GitHub và merge
git pull origin main --no-rebase

# Nếu có conflict, giải quyết conflict rồi:
git add .
git commit -m "Merge remote changes"

# Sau đó push
git push origin main
```

### Cách 2: Pull với Rebase (Giữ lịch sử sạch hơn)

```bash
cd /var/www/hr-rmg-idc

# Pull và rebase
git pull origin main --rebase

# Nếu có conflict, giải quyết conflict rồi:
git add .
git rebase --continue

# Sau đó push
git push origin main
```

### Cách 3: Force Push (⚠️ CẨN THẬN - Chỉ dùng nếu chắc chắn local đúng)

**⚠️ CẢNH BÁO:** Force push sẽ ghi đè lịch sử trên remote. Chỉ dùng nếu:
- Bạn chắc chắn commit trên server là đúng
- Không có người khác đang làm việc với repo
- Bạn chấp nhận mất commit trên remote

```bash
cd /var/www/hr-rmg-idc

# Force push (ghi đè remote)
git push origin main --force

# Hoặc an toàn hơn, force-with-lease (kiểm tra trước khi ghi đè)
git push origin main --force-with-lease
```

### Cách 4: Cấu hình mặc định (Tránh lỗi sau này)

```bash
cd /var/www/hr-rmg-idc

# Cấu hình mặc định dùng merge (khuyến nghị)
git config pull.rebase false

# Hoặc cấu hình global cho tất cả repos
git config --global pull.rebase false

# Sau đó pull và push bình thường
git pull origin main
git push origin main
```

## 🎯 Khuyến nghị

**Nếu bạn đã sửa `ecosystem.config.js` trên server và muốn push lên:**

```bash
cd /var/www/hr-rmg-idc

# 1. Xem thay đổi
git status
git log --oneline -5

# 2. Pull với merge
git pull origin main --no-rebase

# 3. Nếu không có conflict, push
git push origin main

# 4. Nếu có conflict, xem conflict và giải quyết
git status
# Sửa file conflict, sau đó:
git add .
git commit -m "Merge conflicts resolved"
git push origin main
```

**Hoặc đơn giản hơn - Cấu hình mặc định:**

```bash
cd /var/www/hr-rmg-idc

# Cấu hình mặc định
git config pull.rebase false

# Pull và push
git pull origin main
git push origin main
```

## 💡 Giải thích

- **Merge**: Tạo merge commit, giữ nguyên cả 2 lịch sử
- **Rebase**: Đặt commit local lên trên commit remote, lịch sử thẳng hơn
- **Force push**: Ghi đè remote, mất commit trên remote

## 🔍 Kiểm tra sau khi fix

```bash
cd /var/www/hr-rmg-idc

# Kiểm tra status
git status

# Kiểm tra log
git log --oneline -5

# Kiểm tra remote
git remote -v
```

