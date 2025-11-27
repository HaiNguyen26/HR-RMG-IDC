# 📤 Các Cách Đưa Code và Database lên Server

## ❓ Câu hỏi: Code và Database có cần qua GitHub không?

---

## 💻 CODE: Có 2 cách

### ✅ Cách 1: Qua GitHub (Khuyến nghị)

**Quy trình:**
```
Local → GitHub → Server
```

**Ưu điểm:**
- ✅ **Version Control:** Theo dõi thay đổi, có thể rollback
- ✅ **Backup tự động:** Code được backup trên GitHub
- ✅ **Collaboration:** Nhiều người làm việc cùng
- ✅ **An toàn:** Có thể review trước khi deploy
- ✅ **Dễ cập nhật:** Chỉ cần `git pull` trên server

**Nhược điểm:**
- ❌ Cần commit và push trước

**Khi nào dùng:**
- ✅ **Production** - Luôn dùng cách này
- ✅ **Team work** - Nhiều người cùng làm
- ✅ **Quan trọng** - Cần theo dõi thay đổi

**Cách làm:**
```powershell
# Local
git add .
git commit -m "Update: ..."
git push origin main

# Server
git pull origin main
```

---

### 🔄 Cách 2: Đưa trực tiếp từ Local (Không qua GitHub)

**Quy trình:**
```
Local → Server (SCP/FTP)
```

**Ưu điểm:**
- ✅ Nhanh hơn (không cần push/pull)
- ✅ Phù hợp test nhanh

**Nhược điểm:**
- ❌ Không có version control
- ❌ Không có backup tự động
- ❌ Khó rollback
- ❌ Không phù hợp production

**Khi nào dùng:**
- ⚠️ Chỉ khi **test nhanh** một thay đổi nhỏ
- ⚠️ **KHÔNG khuyến nghị** cho production

**Cách làm:**
```powershell
# Upload file trực tiếp
scp -r frontend/src root@103.56.161.203:/var/www/hr-management-system/frontend/

# Hoặc dùng FileZilla/WinSCP
```

---

## 🗄️ DATABASE: Có 2 cách

### ✅ Cách 1: Đưa trực tiếp từ Local (Khuyến nghị)

**Quy trình:**
```
Local → Backup SQL → Upload lên Server → Restore
```

**Ưu điểm:**
- ✅ **Bảo mật:** Database KHÔNG lên GitHub (tránh lộ dữ liệu)
- ✅ **Nhanh:** Trực tiếp, không qua bước trung gian
- ✅ **An toàn:** Dữ liệu nhạy cảm không bị expose

**Nhược điểm:**
- ❌ Phải upload file backup thủ công

**Khi nào dùng:**
- ✅ **Lần đầu migrate** database từ local
- ✅ **Restore** database khi cần
- ✅ **Backup/Restore** thường xuyên

**Cách làm:**
```powershell
# Local: Backup
pg_dump -U postgres -d HR_Management_System > backup.sql

# Upload lên server
scp backup.sql root@103.56.161.203:/tmp/

# Server: Restore
sudo -u postgres psql -d HR_Management_System < /tmp/backup.sql
```

---

### ⚠️ Cách 2: Qua GitHub (KHÔNG khuyến nghị)

**Quy trình:**
```
Local → Commit backup.sql → GitHub → Server → Restore
```

**Nhược điểm:**
- ❌ **Rủi ro bảo mật:** File backup chứa dữ liệu nhạy cảm
- ❌ **Kích thước lớn:** File backup có thể rất lớn
- ❌ **Best practice:** Database backup không nên commit vào Git

**Khi nào KHÔNG nên:**
- ❌ **KHÔNG** đưa file backup lên GitHub
- ❌ **KHÔNG** commit file `.sql` có dữ liệu thật

**Lưu ý:**
- ✅ Migration scripts (schema, không có data) → **CÓ THỂ** đưa lên GitHub
- ❌ Backup files (có data thật) → **KHÔNG** đưa lên GitHub

---

## 🎯 Khuyến nghị

### Code:
```
✅ Luôn qua GitHub → Server
   Local → GitHub → Server (git pull)
```

### Database:

**Lần đầu (Migrate):**
```
✅ Đưa trực tiếp từ Local
   Local → pg_dump → SCP → Server → Restore
```

**Sau này (Thay đổi schema):**
```
✅ Migration scripts qua GitHub
   Local → Migration SQL → GitHub → Server → Apply
   
❌ KHÔNG đưa backup có data qua GitHub
```

---

## 📋 So sánh

| | Code | Database (Backup) | Database (Migration) |
|---|---|---|---|
| **Qua GitHub?** | ✅ Nên | ❌ KHÔNG | ✅ Có thể |
| **Lý do** | Version control | Bảo mật | Chỉ schema, không có data |
| **Cách làm** | git push/pull | SCP trực tiếp | git push/pull |
| **Khi nào** | Luôn | Lần đầu migrate | Thay đổi schema |

---

## 🔒 Lưu ý Bảo mật

### ✅ NÊN đưa lên GitHub:

- ✅ **Source code** (frontend, backend)
- ✅ **Migration scripts** (schema only, không có data)
- ✅ **Documentation**
- ✅ **Config files** (example, không có secret)

### ❌ KHÔNG đưa lên GitHub:

- ❌ **File backup database** (chứa dữ liệu nhạy cảm)
- ❌ **File .env** (chứa password, API keys)
- ❌ **File log** (có thể chứa thông tin nhạy cảm)
- ❌ **File upload** của users

**Đã có trong `.gitignore`** - Đừng lo!

---

## 📝 Tóm tắt

### Code:
```
✅ LUÔN qua GitHub
Local → GitHub → Server (git pull)
```

### Database:

**Lần đầu migrate:**
```
✅ Đưa trực tiếp từ Local
Local → pg_dump → SCP → Server
```

**Thay đổi schema sau này:**
```
✅ Migration scripts qua GitHub
Local → database/migrations/*.sql → GitHub → Server
```

**Backup/Restore:**
```
✅ Đưa trực tiếp (KHÔNG qua GitHub)
Local → pg_dump → SCP → Server
```

---

## 🎯 Workflow Đúng

### Code mới:
```
1. Code trên Local
2. Test trên Local
3. Commit & Push lên GitHub ← QUA GITHUB
4. Server: git pull ← QUA GITHUB
5. Restart app
```

### Database Migration:
```
1. Tạo migration script: database/migrations/005_add_table.sql
2. Commit & Push lên GitHub ← MIGRATION SCRIPT QUA GITHUB
3. Server: git pull
4. Server: Apply migration (script tự động)
```

### Database Backup/Restore:
```
1. Local: pg_dump → backup.sql
2. SCP upload lên server ← TRỰC TIẾP, KHÔNG QUA GITHUB
3. Server: Restore từ backup
```

---

**Tóm lại: Code qua GitHub, Database backup trực tiếp, Migration scripts qua GitHub!** ✅

