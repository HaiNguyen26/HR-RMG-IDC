# 🔄 Giải pháp Thay thế - PM2 Config với Full Command

## ❌ Vấn đề

Mặc dù config đã đúng `args: ['-s', 'build', '-l', '3002']` nhưng PM2 vẫn parse sai.

## ✅ Giải pháp: Dùng Full Command

Thay vì dùng `script: 'serve'` + `args`, dùng **full command** trong script.

## 🔧 Cách sửa

### Trên Server:

```bash
cd /var/www/hr-rmg-idc
nano ecosystem.config.js
```

### Sửa phần frontend từ:

```javascript
{
  name: 'hr-rmg-idc-frontend',
  script: 'serve',
  args: ['-s', 'build', '-l', '3002'],
  cwd: '/var/www/hr-rmg-idc/frontend',
  // ...
}
```

### Thành:

```javascript
{
  name: 'hr-rmg-idc-frontend',
  script: 'npx',
  args: ['serve', '-s', 'build', '-l', '3002'],
  cwd: '/var/www/hr-rmg-idc/frontend',
  // ...
}
```

### HOẶC dùng shell script:

```javascript
{
  name: 'hr-rmg-idc-frontend',
  script: 'serve',
  args: '-s build -l 3002',
  interpreter: '/bin/bash',
  cwd: '/var/www/hr-rmg-idc/frontend',
  // ...
}
```

### HOẶC tốt nhất - dùng full path:

```javascript
{
  name: 'hr-rmg-idc-frontend',
  script: '/usr/bin/serve',
  args: ['-s', 'build', '-l', '3002'],
  cwd: '/var/www/hr-rmg-idc/frontend',
  // ...
}
```

## 🚀 Hoặc Tạo Shell Script

### Bước 1: Tạo script start-frontend.sh

```bash
cd /var/www/hr-rmg-idc
cat > start-frontend.sh << 'EOF'
#!/bin/bash
cd /var/www/hr-rmg-idc/frontend
serve -s build -l 3002
EOF

chmod +x start-frontend.sh
```

### Bước 2: Sửa ecosystem.config.js

```javascript
{
  name: 'hr-rmg-idc-frontend',
  script: './start-frontend.sh',
  cwd: '/var/www/hr-rmg-idc',
  interpreter: '/bin/bash',
  env: {
    NODE_ENV: 'production'
  },
  error_file: '/var/www/hr-rmg-idc/logs/frontend-error.log',
  out_file: '/var/www/hr-rmg-idc/logs/frontend-out.log',
  instances: 1,
  autorestart: true,
  watch: false
}
```

### Bước 3: Khởi động lại

```bash
pm2 delete hr-rmg-idc-frontend
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend
pm2 list
```

## ✅ Cách Tốt Nhất: Kiểm tra Serve trước

```bash
# Test serve có chạy được không
cd /var/www/hr-rmg-idc/frontend/build

# Nếu không có build, build lại
cd .. && npm run build && cd build

# Test serve trực tiếp
serve -s . -l 3002

# Nếu chạy được -> vấn đề ở PM2 config
# Nếu không chạy -> vấn đề ở serve hoặc build
```

