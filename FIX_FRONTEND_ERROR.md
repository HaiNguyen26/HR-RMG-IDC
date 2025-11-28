# 🔧 Sửa Lỗi Frontend (PM2 Errored)

## ❌ Vấn đề

`hr-rmg-idc-frontend` đang bị lỗi (errored, đã restart 15 lần).

## 🔍 Kiểm tra Log

Chạy các lệnh sau trên server để xem log chi tiết:

```bash
# Xem log lỗi frontend
pm2 logs hr-rmg-idc-frontend --err

# Hoặc xem file log trực tiếp
tail -f /var/www/hr-rmg-idc/logs/frontend-error.log
```

## 🛠️ Các Nguyên nhân và Cách Sửa

### 1. Chưa Build Frontend

**Kiểm tra:**
```bash
ls -la /var/www/hr-rmg-idc/frontend/build
```

**Nếu thư mục `build` không tồn tại hoặc rỗng:**

```bash
cd /var/www/hr-rmg-idc/frontend

# Đảm bảo có .env với base path
cat .env
# Phải có: REACT_APP_API_URL=http://27.71.16.15/hr-rmg-idc/api

# Build lại
npm run build

# Kiểm tra build thành công
ls -la build/
```

### 2. Package `serve` chưa được cài đặt

**Kiểm tra:**
```bash
which serve
# Hoặc
serve --version
```

**Nếu chưa có:**

```bash
# Cài đặt serve globally
npm install -g serve

# Hoặc cài local trong frontend
cd /var/www/hr-rmg-idc/frontend
npm install serve --save-dev
```

**Nếu dùng local, sửa `ecosystem.config.js`:**

```javascript
{
  name: 'hr-rmg-idc-frontend',
  script: 'npx',
  args: ['serve', '-s', 'build', '-l', '3002'],  // Dùng array, không dùng string
  cwd: '/var/www/hr-rmg-idc/frontend',
  // ...
}
```

**⚠️ LỖI PHỔ BIẾN: `getaddrinfo ENOTFOUND -l`**

Nếu thấy lỗi này, nguyên nhân là `args` đang dùng **string** thay vì **array**. PM2 sẽ parse sai và coi `-l` như hostname.

**Sửa:**
```javascript
// ❌ SAI
args: '-s build -l 3002'

// ✅ ĐÚNG
args: ['-s', 'build', '-l', '3002']
```

### 3. Port 3002 đã được sử dụng

**Kiểm tra:**
```bash
sudo lsof -i :3002
# Hoặc
sudo netstat -tulpn | grep 3002
```

**Nếu port đã được dùng:**

- Option 1: Tắt process đang dùng port:
```bash
sudo kill -9 <PID>
```

- Option 2: Đổi port trong `ecosystem.config.js` (ví dụ: 3003) và cập nhật Nginx config tương ứng.

### 4. Cấu hình serve với Base Path

Vì đã thêm `"homepage": "/hr-rmg-idc"` vào `package.json`, React build sẽ tạo paths với prefix `/hr-rmg-idc`.

**Kiểm tra `package.json`:**
```bash
cd /var/www/hr-rmg-idc/frontend
cat package.json | grep homepage
# Phải có: "homepage": "/hr-rmg-idc"
```

**Nếu đúng, rebuild:**
```bash
npm run build
```

**Kiểm tra file `build/index.html`:**
```bash
cat build/index.html | grep href
# Phải thấy: /hr-rmg-idc/static/...
```

## 🔄 Sau khi Sửa - Khởi động lại

```bash
# Stop frontend
pm2 stop hr-rmg-idc-frontend

# Xóa process cũ
pm2 delete hr-rmg-idc-frontend

# Khởi động lại từ ecosystem.config.js
cd /var/www/hr-rmg-idc
pm2 start ecosystem.config.js

# Kiểm tra status
pm2 list

# Xem log real-time
pm2 logs hr-rmg-idc-frontend
```

## ✅ Kiểm tra Frontend hoạt động

```bash
# Kiểm tra port 3002 đang listen
curl http://localhost:3002

# Hoặc từ browser trên server (nếu có GUI)
# Hoặc từ máy local:
curl http://27.71.16.15/hr-rmg-idc
```

## 🎯 Quy trình đầy đủ (Nếu cần làm lại từ đầu)

```bash
# 1. Vào thư mục frontend
cd /var/www/hr-rmg-idc/frontend

# 2. Kiểm tra .env
cat .env
# Phải có: REACT_APP_API_URL=http://27.71.16.15/hr-rmg-idc/api

# 3. Kiểm tra package.json có homepage
cat package.json | grep homepage
# Phải có: "homepage": "/hr-rmg-idc"

# 4. Xóa build cũ (nếu có)
rm -rf build

# 5. Build lại
npm run build

# 6. Kiểm tra build thành công
ls -la build/

# 7. Cài serve (nếu chưa có)
npm install -g serve

# 8. Test serve trực tiếp (tạm thời)
cd build
serve -s . -l 3002
# Nhấn Ctrl+C sau khi test xong

# 9. Khởi động lại với PM2
cd /var/www/hr-rmg-idc
pm2 restart hr-rmg-idc-frontend

# 10. Kiểm tra
pm2 list
pm2 logs hr-rmg-idc-frontend
```

## 📝 Lưu ý

- Nếu dùng `serve` global, đảm bảo PATH của PM2 có thể tìm thấy `serve`
- Nếu dùng `npx serve`, đảm bảo có `package.json` với `serve` trong `devDependencies`
- Đảm bảo file `ecosystem.config.js` đúng đường dẫn `cwd`

