# 🚀 Deploy từ GitHub - Hướng dẫn Chi tiết

## ✅ Có thể deploy từ GitHub không?

**CÓ!** Đây là cách làm **chuyên nghiệp và tốt hơn** so với copy file trực tiếp.

---

## 📋 Tổng quan Quy trình

```
LOCAL                    GITHUB                    SERVER
─────────────────────────────────────────────────────────
1. Push code  ────────→  GitHub Repository
                         
2. Clone code  ←────────  GitHub Repository  ────────→  Server
                         
3. Setup trên server (database, .env, build, PM2)
```

---

## 🔧 BƯỚC 1: Push Code lên GitHub

### 1.1. Tạo Repository trên GitHub

1. Đăng nhập GitHub: https://github.com
2. Click **New Repository** (hoặc **+** → **New repository**)
3. Đặt tên: `hr-management-system` (hoặc tên khác)
4. Chọn **Private** (khuyến nghị) hoặc **Public**
5. **KHÔNG** check "Initialize with README"
6. Click **Create repository**

### 1.2. Push code từ Local lên GitHub

**Trên máy local, mở PowerShell/Git Bash:**

```powershell
# Di chuyển đến thư mục project
cd D:\Web-App-HR-Demo

# Kiểm tra Git đã có chưa
git status

# Nếu chưa có Git repository, khởi tạo
git init

# Thêm remote GitHub (thay YOUR_USERNAME và YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/hr-management-system.git

# Hoặc nếu dùng SSH:
# git remote add origin git@github.com:YOUR_USERNAME/hr-management-system.git
```

### 1.3. Tạo .gitignore (QUAN TRỌNG!)

**Kiểm tra file `.gitignore` đã có chưa:**

```powershell
# Xem nội dung .gitignore
cat .gitignore
```

**Đảm bảo `.gitignore` có các dòng sau:**

```gitignore
# Dependencies
node_modules/
backend/node_modules/
frontend/node_modules/

# Environment variables (QUAN TRỌNG!)
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
backend/.env
frontend/.env

# Build outputs
frontend/build/
backend/dist/

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Database backups (KHÔNG push backup lên GitHub!)
*.sql
*.dump
backup_*.sql
backup_*.dump

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Uploads (tùy chọn - có thể muốn giữ)
uploads/
```

**⚠️ LƯU Ý QUAN TRỌNG:**
- ✅ **KHÔNG** commit file `.env` (chứa password, API keys)
- ✅ **KHÔNG** commit file backup database
- ✅ **KHÔNG** commit `node_modules/`

### 1.4. Commit và Push code

```powershell
# Add tất cả files (trừ những gì trong .gitignore)
git add .

# Commit
git commit -m "Initial commit: HR Management System"

# Push lên GitHub (lần đầu)
git branch -M main
git push -u origin main
```

**Nhập username và password GitHub khi được hỏi**

**Lưu ý:** GitHub không dùng password nữa, dùng **Personal Access Token**:
- Settings → Developer settings → Personal access tokens → Tokens (classic)
- Generate new token → Chọn quyền `repo`
- Copy token và dùng thay cho password

---

## 🖥️ BƯỚC 2: Deploy từ GitHub lên Server

### 2.1. SSH vào Server

```bash
ssh root@103.56.161.203
```

### 2.2. Cài đặt Git (nếu chưa có)

```bash
# Kiểm tra Git
git --version

# Nếu chưa có, cài đặt
sudo apt update
sudo apt install git -y
```

### 2.3. Clone Code từ GitHub

```bash
# Tạo thư mục
sudo mkdir -p /var/www
cd /var/www

# Clone repository
sudo git clone https://github.com/YOUR_USERNAME/hr-management-system.git

# Đổi quyền sở hữu
sudo chown -R $USER:$USER /var/www/hr-management-system
cd /var/www/hr-management-system
```

**Nếu repository là Private, có 2 cách:**

**Cách 1: Dùng HTTPS với Personal Access Token**

```bash
# Khi clone, nhập username và token thay cho password
git clone https://github.com/YOUR_USERNAME/hr-management-system.git
# Username: YOUR_USERNAME
# Password: YOUR_PERSONAL_ACCESS_TOKEN
```

**Cách 2: Dùng SSH Key (Khuyến nghị)**

```bash
# Tạo SSH key trên server
ssh-keygen -t ed25519 -C "server@yourdomain.com"
# Nhấn Enter để chọn default location
# Nhấn Enter để không đặt passphrase (hoặc đặt nếu muốn)

# Xem public key
cat ~/.ssh/id_ed25519.pub

# Copy key này và add vào GitHub:
# Settings → SSH and GPG keys → New SSH key → Paste key
```

Sau đó clone bằng SSH:

```bash
git clone git@github.com:YOUR_USERNAME/hr-management-system.git
```

---

## 🗄️ BƯỚC 3: Setup Database trên Server

### 3.1. Tạo Database

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE "HR_Management_System" WITH ENCODING = 'UTF8';
CREATE USER hr_user WITH PASSWORD 'your_secure_password';
ALTER USER hr_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE "HR_Management_System" TO hr_user;
\q
```

### 3.2. Restore Database từ Local

**Cách 1: Upload backup file qua SCP/FileZilla**

```bash
# Trên server, tạo thư mục
mkdir -p /var/www/hr-management-system/backups

# Upload file backup_hr_management.sql từ local lên /var/www/hr-management-system/backups/
# (Dùng SCP hoặc FileZilla)

# Restore
psql -U hr_user -d HR_Management_System < /var/www/hr-management-system/backups/backup_hr_management.sql
```

**Cách 2: Copy file qua SCP từ local**

```powershell
# Trên máy local
scp backup_hr_management.sql root@103.56.161.203:/var/www/hr-management-system/backups/
```

**Sau đó trên server:**

```bash
psql -U hr_user -d HR_Management_System < /var/www/hr-management-system/backups/backup_hr_management.sql
```

---

## ⚙️ BƯỚC 4: Cấu hình Environment Variables

### 4.1. Backend .env

```bash
cd /var/www/hr-management-system/backend
cp env.example .env
nano .env
```

**Chỉnh sửa:**

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=HR_Management_System
DB_USER=hr_user
DB_PASSWORD=your_secure_password

PORT=3000
NODE_ENV=production

DEFAULT_PASSWORD=RMG123@
```

**Lưu:** `Ctrl + O`, Enter, `Ctrl + X`

### 4.2. Frontend .env

```bash
cd ../frontend
nano .env
```

**Thêm:**

```env
REACT_APP_API_URL=http://103.56.161.203/api
```

**Hoặc nếu có domain:**

```env
REACT_APP_API_URL=http://yourdomain.com/api
```

---

## 📦 BƯỚC 5: Cài đặt Dependencies và Build

```bash
cd /var/www/hr-management-system

# Cài root dependencies
npm install

# Cài backend dependencies
cd backend
npm install

# Cài frontend dependencies
cd ../frontend
npm install

# Build frontend
npm run build
```

---

## 🚀 BƯỚC 6: Cấu hình Nginx và PM2

**Làm theo các bước trong `DEPLOY_NOW.md`:**

- ✅ Bước 9: Cấu hình Nginx
- ✅ Bước 10: Khởi động với PM2

---

## 🔄 BƯỚC 7: Cập nhật Code trong tương lai

### Khi có code mới trên GitHub:

**Trên server:**

```bash
cd /var/www/hr-management-system

# Pull code mới
git pull origin main

# Cài dependencies mới (nếu có)
cd backend && npm install
cd ../frontend && npm install

# Build lại frontend (nếu có thay đổi)
cd ../frontend && npm run build

# Restart application
pm2 restart all
```

**Hoặc dùng script tự động:** `update.sh` (đã có sẵn)

---

## ✅ Lợi ích của Deploy từ GitHub

1. ✅ **Version Control:** Theo dõi thay đổi code
2. ✅ **Dễ cập nhật:** Chỉ cần `git pull` trên server
3. ✅ **Backup tự động:** Code đã được backup trên GitHub
4. ✅ **Collaboration:** Nhiều người có thể làm việc cùng nhau
5. ✅ **Rollback dễ dàng:** Có thể quay lại version cũ bất cứ lúc nào

---

## ⚠️ Lưu ý Bảo mật

### KHÔNG commit:

- ❌ File `.env` (chứa password, API keys)
- ❌ File backup database
- ❌ File log chứa thông tin nhạy cảm
- ❌ File chứa credentials

### Nên commit:

- ✅ Source code
- ✅ Package.json files
- ✅ Config files (example)
- ✅ Documentation

---

## 🔐 Tạo Personal Access Token (GitHub)

**Nếu GitHub yêu cầu token thay vì password:**

1. Vào GitHub: Settings → Developer settings
2. Personal access tokens → Tokens (classic)
3. Generate new token (classic)
4. Chọn scopes:
   - ✅ `repo` (Full control of private repositories)
5. Generate token
6. **Copy token ngay** (chỉ hiển thị 1 lần!)
7. Dùng token thay cho password khi clone/push

---

## 📋 Checklist

Trước khi push:
- [ ] Đã tạo `.gitignore` đầy đủ
- [ ] Đã kiểm tra không commit file `.env`
- [ ] Đã kiểm tra không commit `node_modules/`
- [ ] Đã tạo GitHub repository
- [ ] Đã có Personal Access Token (nếu dùng HTTPS)

Trên server:
- [ ] Đã cài Git
- [ ] Đã clone repository
- [ ] Đã setup database
- [ ] Đã restore database từ backup
- [ ] Đã cấu hình `.env` files
- [ ] Đã cài dependencies và build
- [ ] Đã cấu hình Nginx
- [ ] Đã khởi động với PM2
- [ ] App đã chạy thành công

---

## 🎯 Tóm tắt Quy trình

```
1. LOCAL → Push code lên GitHub
   git add .
   git commit -m "Initial commit"
   git push origin main

2. SERVER → Clone code từ GitHub
   git clone https://github.com/USERNAME/repo.git

3. SERVER → Setup (database, .env, build)

4. SERVER → Deploy (Nginx, PM2)

5. SERVER → Update (git pull + restart)
   git pull origin main
   npm install
   npm run build
   pm2 restart all
```

---

## 🆘 Troubleshooting

**Lỗi: Permission denied (publickey)**

```bash
# Tạo SSH key và add vào GitHub
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# Copy và add vào GitHub Settings → SSH keys
```

**Lỗi: Repository not found**

- Kiểm tra tên repository đúng chưa
- Kiểm tra quyền truy cập (Private repo cần SSH key hoặc token)
- Kiểm tra username đúng chưa

**Lỗi: Authentication failed**

- Dùng Personal Access Token thay cho password
- Hoặc setup SSH key

---

**Xong! Bây giờ bạn có thể deploy từ GitHub rồi!** 🎉


