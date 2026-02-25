# KẾ HOẠCH NÂNG CẤP HỆ THỐNG HRM-RMG (REWRITE 2026)

**Ngày cập nhật:** 2026  
**Mục tiêu:** Nâng cấp toàn diện stack công nghệ, chuẩn hóa kiến trúc và tự động hóa triển khai.

---

## 🏗️ 1. ARCHITECTURE TARGET (Mục tiêu kỹ thuật)

| Thành phần | Công nghệ |
|------------|-----------|
| **Frontend** | Vite + React + TypeScript + Tailwind + Shadcn UI |
| **Backend** | NestJS (Modular Architecture) + Prisma ORM |
| **Real-time** | Socket.io (Thông báo đơn từ, dashboard) |
| **DevOps** | Docker (Container) + GitHub Actions (CI/CD) |
| **Workflow** | Local Code → GitHub Push → Auto Deploy to Cloud |

---

## 📅 2. LỘ TRÌNH THỰC HIỆN (8 TUẦN)

### Giai đoạn 1: Database & Backend Foundation (Tuần 1–2)

Đây là bước quan trọng nhất để cố định cấu trúc dữ liệu.

- **Prisma Setup**
  - Kết nối DB Postgres hiện tại.
  - Chạy `npx prisma db pull` để lấy schema.

- **Refactor Schema**
  - Thêm quan hệ (relations), index để tối ưu truy vấn.

- **NestJS Core**
  - Khởi tạo project NestJS.
  - Cấu hình **PrismaService** (kết nối DB).
  - Cấu hình **Auth Module** (JWT, Passport) – bảo mật đơn từ.
  - Cấu hình **Global Validation Pipe** (tự động kiểm tra dữ liệu API đầu vào).

---

### Giai đoạn 2: Frontend Migration & UI (Tuần 3–4)

Chuyển từ giao diện cũ sang giao diện hiện đại, type-safe.

- **Vite + TypeScript Setup**
  - Khởi tạo project mới.
  - Tuyệt đối không dùng `any` trong TypeScript.

- **Shadcn UI Integration**
  - Cài đặt các component core (Table, Dialog, Form, Toast).

- **API Layer**
  - Dùng Axios kết hợp **TanStack Query (React Query)** để quản lý cache (thay cho gọi API trong `useEffect`).

- **Component Migration**
  - Chuyển logic từ CRA (`.js`) sang Vite (`.tsx`).

---

### Giai đoạn 3: Real-time & Logic hoàn thiện (Tuần 5–6)

- **Socket.io Gateway**
  - Dựng Gateway trên NestJS để phát sự kiện khi:
    - Có đơn xin nghỉ mới.
    - Admin duyệt đơn (thông báo về máy nhân viên).

- **Module Migration**
  - Chuyển nốt các logic còn lại (Tính lương, Check-in/out, Báo cáo).

- **Testing**
  - Viết Unit Test cho các hàm tính toán quan trọng để tránh sai sót.

---

### Giai đoạn 4: DevOps & CI/CD (Tuần 7–8)

Tự động hóa quy trình từ máy dev lên Cloud.

- **Dockerize**
  - Viết **Dockerfile** (multi-stage build để image nhẹ).
  - Viết **docker-compose.yml** (App, Postgres, Nginx).

- **GitHub Actions**
  - Khi `git push main`: chạy Test → Build Image → Đẩy lên Docker Hub (hoặc SSH vào server).
  - Server tự động kéo code mới và restart dịch vụ.

- **Monitoring**
  - Thiết lập logging đơn giản để theo dõi lỗi trên server.

---

## 🛠️ 3. CÁC THAY ĐỔI "SỐNG CÒN" TRONG CODE

### A. Database (`schema.prisma`)

Thay vì SQL tay, mọi thứ nằm ở schema Prisma:

```prisma
model Request {
  id        Int      @id @default(autoincrement())
  type      String   // Leave, OT, Late...
  status    String   @default("PENDING")
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}
```

### B. Deployment (`docker-compose.yml`)

Môi trường Local và Cloud giống nhau:

```yaml
services:
  api:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: ${DATABASE_URL}

  web:
    build: ./frontend
    ports:
      - "80:80"
```

---

## 📋 4. CHIẾN LƯỢC ROLLOUT (TRIỂN KHAI)

| Bước | Nội dung |
|------|----------|
| **Bước 1** | Chạy song song Backend mới (port 3001) và Backend cũ (port 3000). |
| **Bước 2** | Chuyển từng module trên Frontend sang dùng API của Backend mới. |
| **Bước 3** | Khi toàn bộ ổn định, tắt Backend cũ và chuyển domain sang hệ thống mới. |

---

## 🧪 5. CHIẾN LƯỢC TEST & WORKFLOW (Tối ưu nhất: dùng CẢ HAI)

**Kết luận:** Cách tối ưu nhất là **kết hợp cả hai** – dùng **npm run dev** khi đang code, và **docker-compose up** trước khi git push. Mỗi cách phục vụ một mục đích khác nhau.

---

### 5.1. Test bằng `npm run dev` (Trong lúc đang code)

Đây là cách **chính và nhanh nhất** khi bạn đang viết code.

| Thành phần | Lệnh | Ghi chú |
|------------|------|--------|
| **Frontend (Vite)** | `npm run dev` | HMR (Hot Module Replacement): sửa code → trình duyệt cập nhật trong vài mili giây. |
| **Backend (NestJS)** | `npm run start:dev` | Tự động restart server mỗi khi lưu file (Ctrl+S). |
| **Database** | Postgres local hoặc **chỉ DB chạy Docker** | Nên chạy riêng DB bằng Docker để tránh rác máy, App chạy ngoài Docker. |

**Mục đích:** Kiểm tra nhanh logic, giao diện và bắt lỗi cú pháp. Dùng hàng ngày.

---

### 5.2. Test bằng `docker-compose up` (Trước khi Git Push)

Bước **bắt buộc** trước khi push để CI/CD deploy lên Cloud. Quy trình cũ thường bỏ qua bước này.

**Cách làm:** Chạy `docker-compose up --build` ở root project.

**Lý do nên làm:**

- Đảm bảo biến môi trường (`.env`) đúng trong container.
- Kiểm tra Frontend và Backend **giao tiếp đúng** trong môi trường container (network, CORS, URL).
- Đảm bảo **Dockerfile** không lỗi build (dependency, copy file, multi-stage).
- Giống môi trường Cloud → **"Chạy được trên máy tôi thì chạy được trên Cloud"**.

**Mục đích:** Đảm bảo build và chạy trong container ổn định trước khi deploy.

---

### 5.3. Workflow đề xuất (Tối ưu)

```
Hàng ngày khi code:
  → npm run dev (frontend) + npm run start:dev (backend) + DB (Docker hoặc local)
  → Sửa code → HMR/restart → Test nhanh

Trước khi git push (đặc biệt lên main):
  → docker-compose up --build
  → Test flow chính (login, tạo đơn, duyệt đơn...)
  → Nếu OK → git push
```

---

## ✅ 6. CHECKLIST CẦN LÀM NGAY

- [ ] Cài đặt Docker Desktop trên máy Local.
- [ ] Khởi tạo Repository mới trên GitHub (hoặc dùng repo hiện tại).
- [ ] Chạy `npx prisma init` trong folder backend để kết nối DB hiện tại.
- [ ] Tạo branch `develop` để code, `main` chỉ dùng để deploy.

---

## 📚 Tài liệu liên quan

- [HUONG_DAN_SU_DUNG.md](./HUONG_DAN_SU_DUNG.md) – Hướng dẫn sử dụng hệ thống
- [HUONG_DAN_SU_DUNG_SCRIPT_PULL_MIGRATE.md](./HUONG_DAN_SU_DUNG_SCRIPT_PULL_MIGRATE.md) – Script pull & migrate trên server
