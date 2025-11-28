# 🔧 GIẢI QUYẾT GIT CONFLICT - ecosystem.config.js

## ❌ Vấn đề

Có conflict trong file `ecosystem.config.js` sau khi pull. Cần giải quyết conflict và giữ phiên bản đúng.

## ✅ Giải pháp

### Bước 1: Xem conflict

```bash
cd /var/www/hr-rmg-idc
cat ecosystem.config.js
```

Bạn sẽ thấy các dòng conflict như:
```
<<<<<<< HEAD
args: '-s build -l 3002',  // Version trên server
=======
args: ['-s', 'build', '-l', '3002'],  // Version từ GitHub
>>>>>>> origin/main
```

### Bước 2: Giải quyết conflict

**Chọn phiên bản ĐÚNG (array format từ GitHub):**

```bash
cd /var/www/hr-rmg-idc
nano ecosystem.config.js
```

Tìm các dòng conflict và sửa như sau:

**Xóa:**
```
<<<<<<< HEAD
args: '-s build -l 3002',
=======
args: ['-s', 'build', '-l', '3002'],
>>>>>>> origin/main
```

**Giữ lại:**
```javascript
args: ['-s', 'build', '-l', '3002'],  // ✅ ĐÚNG - Array format
```

Lưu: `Ctrl+O`, `Enter`, `Ctrl+X`

### Bước 3: Hoặc dùng lệnh tự động (Nhanh hơn)

```bash
cd /var/www/hr-rmg-idc

# Chấp nhận phiên bản từ GitHub (origin/main) - Đúng format
git checkout --theirs ecosystem.config.js

# Kiểm tra đã đúng chưa
cat ecosystem.config.js | grep -A 2 "args:"
# Phải thấy: args: ['-s', 'build', '-l', '3002'],
```

### Bước 4: Commit và push

```bash
cd /var/www/hr-rmg-idc

# Add file đã giải quyết conflict
git add ecosystem.config.js

# Commit
git commit -m "Resolve conflict: Keep correct args format (array)"

# Push
git push origin main
```

## ✅ Giải pháp nhanh nhất (Copy-paste)

```bash
cd /var/www/hr-rmg-idc

# Chấp nhận phiên bản từ GitHub (có args đúng format)
git checkout --theirs ecosystem.config.js

# Kiểm tra
cat ecosystem.config.js | grep -A 2 "args:"

# Commit và push
git add ecosystem.config.js
git commit -m "Resolve conflict: Keep correct args format"
git push origin main
```

## 🔍 Giải thích các lệnh

- `git checkout --theirs`: Chấp nhận phiên bản từ remote (GitHub) - có `args` đúng format
- `git checkout --ours`: Chấp nhận phiên bản local (server) - có `args` sai format ❌
- `git add`: Đánh dấu file đã giải quyết conflict
- `git commit`: Hoàn tất merge

## ✅ Kết quả mong đợi

Sau khi giải quyết conflict:

```bash
# Kiểm tra file
cat ecosystem.config.js | grep -A 2 "args:"
```

Phải thấy:
```javascript
args: ['-s', 'build', '-l', '3002'],  // ✅ Array format
```

Không còn các dòng `<<<<<<<`, `=======`, `>>>>>>>`.

## 🔄 Sau khi push thành công

Nhớ restart frontend để áp dụng thay đổi:

```bash
cd /var/www/hr-rmg-idc

# Restart frontend
pm2 delete hr-rmg-idc-frontend
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend

# Kiểm tra
pm2 list
pm2 logs hr-rmg-idc-frontend --lines 10
```


