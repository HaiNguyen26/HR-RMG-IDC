# 🚀 Kế Hoạch Nâng Cấp Stack HRM-RMG - Complete Guide

**Ngày tạo:** 27/01/2026  
**Mục tiêu:** Nâng cấp toàn bộ stack công nghệ để cải thiện performance, maintainability và scalability

---

## 📋 Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Timeline & Ưu Tiên](#timeline--ưu-tiên)
3. [Phase 1: Frontend Migration](#phase-1-frontend-migration)
4. [Phase 2: Database Layer](#phase-2-database-layer)
5. [Phase 3: Backend Migration](#phase-3-backend-migration)
6. [Phase 4: Deployment](#phase-4-deployment)
7. [Phase 5: WebSocket/Socket.io](#phase-5-websocketsocketio)
8. [Risk Assessment](#risk-assessment)
9. [Success Criteria](#success-criteria)
10. [Quick Start Guide](#quick-start-guide)
11. [Checklist](#checklist)

---

## 📋 Tổng Quan

### Hiện Trạng
- **Frontend:** Create React App (CRA) + JavaScript
- **Backend:** Express.js + pg (raw SQL)
- **Database:** PostgreSQL (raw queries)
- **Deployment:** PM2 + Shell scripts

### Mục Tiêu
- **Frontend:** Vite + React + TypeScript + Tailwind + Shadcn UI
- **Backend:** NestJS + Prisma ORM
- **Database:** Prisma ORM với migrations
- **Deployment:** Docker + Docker Compose + CI/CD
- **Real-time:** WebSocket/Socket.io

### So Sánh Trước/Sau

| Aspect | Hiện Tại | Sau Nâng Cấp |
|--------|----------|--------------|
| **Frontend** | CRA + JS | Vite + TS + Tailwind + Shadcn |
| **Backend** | Express + pg | NestJS + Prisma |
| **Database** | Raw SQL | Prisma ORM |
| **Deployment** | PM2 + Scripts | Docker + CI/CD |
| **Dev Speed** | ~5s startup | <1s startup |
| **Build Time** | ~2-3 phút | ~30 giây |
| **Type Safety** | ❌ | ✅ 100% |
| **Code Quality** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## ⏱️ Timeline & Ưu Tiên

```
Week 1-3:   Frontend Migration (CRA → Vite + TS) - 🔴 ƯU TIÊN CAO
Week 4-5:   Database Layer (Prisma Setup) - 🟡 BẮT BUỘC
Week 6-9:   Backend Migration (Express → NestJS) - 🟢 RẤT NÊN
Week 10:    Deployment (Docker + CI/CD) - 🔵 NÊN
Week 11-13: WebSocket/Socket.io (Real-time) - 🟣 REAL-TIME

Total: 10-13 tuần
```

### Ưu Tiên

1. **🔴 ƯU TIÊN CAO:** Frontend Migration
   - Impact: Dev experience tốt hơn ngay lập tức
   - Risk: Thấp (có thể test song song)

2. **🟡 BẮT BUỘC:** Database Layer (Prisma)
   - Impact: Type safety, dễ maintain
   - Risk: Trung bình (cần test migrations)

3. **🟢 RẤT NÊN:** Backend Migration (NestJS)
   - Impact: Code quality, scalability
   - Risk: Cao (refactor nhiều code)

4. **🔵 NÊN:** Deployment (Docker + CI/CD)
   - Impact: Deploy dễ dàng, consistent
   - Risk: Thấp (có thể test trên staging)

5. **🟣 REAL-TIME:** WebSocket/Socket.io
   - Impact: Real-time notifications, better UX
   - Risk: Trung bình (cần test connection stability)

---

## 📅 Phase 1: Frontend Migration (CRA → Vite + TS)

### 1.1 Setup Vite Project (Tuần 1 - Ngày 1-2)

**Mục tiêu:** Tạo project Vite mới và migrate cấu trúc cơ bản

**Tasks:**
- [ ] Tạo branch mới: `feature/vite-migration`
- [ ] Setup Vite + React + TypeScript:
  ```bash
  npm create vite@latest frontend-vite -- --template react-ts
  ```
- [ ] Copy dependencies từ `package.json` hiện tại
- [ ] Migrate cấu trúc thư mục:
  - `src/components/` → giữ nguyên
  - `src/services/` → giữ nguyên
  - `src/utils/` → giữ nguyên
  - `public/` → giữ nguyên
- [ ] Setup path aliases trong `vite.config.ts`:
  ```ts
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
    }
  }
  ```
- [ ] Migrate `index.html` và entry point
- [ ] Test build và dev server

**Deliverables:**
- ✅ Vite project chạy được với cấu trúc cũ
- ✅ Dev server start < 1s
- ✅ Hot Module Replacement (HMR) hoạt động

---

### 1.2 TypeScript Migration (Tuần 1 - Ngày 3-5)

**Mục tiêu:** Convert toàn bộ JavaScript → TypeScript

**Tasks:**
- [ ] Setup `tsconfig.json` với strict mode:
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "noImplicitAny": true,
      "strictNullChecks": true,
      "strictFunctionTypes": true
    }
  }
  ```
- [ ] Convert từng component theo thứ tự:
  1. `src/utils/` (utilities, helpers)
  2. `src/services/api.js` → `api.ts`
  3. `src/components/Common/` (shared components)
  4. `src/components/Dashboard/`
  5. `src/components/EmployeeTable/`
  6. `src/components/LeaveApprovals/`
  7. `src/components/RequestManagement/`
  8. `src/App.js` → `App.tsx`
- [ ] Tạo type definitions:
  - `src/types/employee.ts`
  - `src/types/request.ts`
  - `src/types/auth.ts`
  - `src/types/api.ts`
- [ ] Fix TypeScript errors từng bước
- [ ] Test từng component sau khi convert

**Deliverables:**
- ✅ 100% TypeScript, không còn `.js` files
- ✅ Type-safe API calls
- ✅ Type-safe component props

---

### 1.3 Tailwind CSS Setup (Tuần 2 - Ngày 1-2)

**Mục tiêu:** Setup Tailwind CSS và migrate styles

**Tasks:**
- [ ] Install Tailwind CSS:
  ```bash
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  ```
- [ ] Configure `tailwind.config.js`:
  ```js
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors từ design system hiện tại
      }
    }
  }
  ```
- [ ] Setup `src/index.css` với Tailwind directives
- [ ] Migrate CSS files từng component:
  - Bắt đầu với components nhỏ
  - Convert CSS classes → Tailwind utilities
  - Giữ lại custom CSS cho animations/complex styles
- [ ] Test responsive design

**Deliverables:**
- ✅ Tailwind CSS hoạt động
- ✅ Responsive design được maintain
- ✅ Custom theme colors được setup

---

### 1.4 Shadcn UI Integration (Tuần 2 - Ngày 3-5)

**Mục tiêu:** Setup Shadcn UI và migrate components

**Tasks:**
- [ ] Setup Shadcn UI:
  ```bash
  npx shadcn-ui@latest init
  ```
- [ ] Configure `components.json`
- [ ] Install components cần thiết:
  ```bash
  npx shadcn-ui@latest add button input select dialog table dropdown-menu toast form
  ```
- [ ] Migrate custom components → Shadcn UI:
  - `CustomSelect` → Shadcn `Select`
  - `Toast` → Shadcn `Toast`
  - `Modal` → Shadcn `Dialog`
  - `Button` → Shadcn `Button`
- [ ] Customize theme để match design hiện tại
- [ ] Test tất cả UI components

**Deliverables:**
- ✅ Shadcn UI components được sử dụng
- ✅ Design consistency được maintain
- ✅ Accessibility được cải thiện

---

### 1.5 Testing & Optimization (Tuần 3)

**Mục tiêu:** Test toàn bộ và optimize performance

**Tasks:**
- [ ] Test tất cả features
- [ ] Performance testing:
  - Lighthouse score > 90
  - First Contentful Paint < 1.5s
  - Time to Interactive < 3s
- [ ] Bundle size optimization:
  - Code splitting
  - Tree shaking
  - Lazy loading routes
- [ ] Fix bugs và edge cases
- [ ] Update documentation

**Deliverables:**
- ✅ Tất cả features hoạt động như cũ
- ✅ Performance tốt hơn CRA
- ✅ Bundle size nhỏ hơn

---

## 🗄️ Phase 2: Database Layer (Prisma ORM)

### 2.1 Prisma Setup (Tuần 4 - Ngày 1-2)

**Mục tiêu:** Setup Prisma và generate schema từ database hiện tại

**Tasks:**
- [ ] Install Prisma:
  ```bash
  npm install -D prisma
  npm install @prisma/client
  ```
- [ ] Init Prisma:
  ```bash
  npx prisma init
  ```
- [ ] Introspect database hiện tại:
  ```bash
  npx prisma db pull
  ```
- [ ] Review và refine `schema.prisma`:
  - Thêm relations
  - Thêm indexes
  - Thêm constraints
  - Thêm comments
- [ ] Generate Prisma Client:
  ```bash
  npx prisma generate
  ```

**Deliverables:**
- ✅ `schema.prisma` đầy đủ và chính xác
- ✅ Prisma Client được generate

---

### 2.2 Migration Strategy (Tuần 4 - Ngày 3-5)

**Mục tiêu:** Tạo migration scripts và test

**Tasks:**
- [ ] Tạo baseline migration:
  ```bash
  npx prisma migrate dev --name init
  ```
- [ ] Review migration files
- [ ] Test migrations trên dev database
- [ ] Setup migration scripts trong `package.json`
- [ ] Document migration process

**Deliverables:**
- ✅ Migration system hoạt động
- ✅ Scripts để deploy migrations

---

### 2.3 Prisma Client Integration (Tuần 5)

**Mục tiêu:** Tạo Prisma service và test queries

**Tasks:**
- [ ] Tạo `backend/src/prisma/prisma.service.ts`
- [ ] Convert một route đơn giản để test
- [ ] Test CRUD operations
- [ ] Test transactions
- [ ] Test relations và joins
- [ ] Document best practices

**Deliverables:**
- ✅ Prisma Client được setup
- ✅ Một route mẫu đã được convert
- ✅ Performance benchmarks

---

## 🔧 Phase 3: Backend Migration (Express → NestJS)

### 3.1 NestJS Project Setup (Tuần 6 - Ngày 1-3)

**Mục tiêu:** Tạo NestJS project và setup cấu trúc cơ bản

**Tasks:**
- [ ] Install NestJS CLI
- [ ] Tạo NestJS project
- [ ] Setup cấu trúc thư mục
- [ ] Install dependencies
- [ ] Setup Prisma module
- [ ] Setup Config module
- [ ] Setup CORS và security

**Deliverables:**
- ✅ NestJS project structure
- ✅ Basic modules setup
- ✅ Prisma integration

---

### 3.2 Auth Module Migration (Tuần 6 - Ngày 4-5)

**Mục tiêu:** Migrate authentication system

**Tasks:**
- [ ] Create Auth module
- [ ] Migrate login logic
- [ ] Create guards
- [ ] Create decorators
- [ ] Test authentication flow

**Deliverables:**
- ✅ Auth module hoạt động
- ✅ JWT authentication
- ✅ Role-based access control

---

### 3.3 Employees Module Migration (Tuần 7)

**Mục tiêu:** Migrate employee management

**Tasks:**
- [ ] Create Employees module
- [ ] Migrate routes
- [ ] Convert SQL queries → Prisma
- [ ] Add DTOs và validation
- [ ] Test tất cả endpoints

**Deliverables:**
- ✅ Employees module hoàn chỉnh
- ✅ Type-safe DTOs
- ✅ Validation

---

### 3.4 Requests Modules Migration (Tuần 8)

**Mục tiêu:** Migrate tất cả request types

**Tasks:**
- [ ] Create Requests module structure
- [ ] Migrate từng request type
- [ ] Convert SQL queries → Prisma
- [ ] Add DTOs và validation
- [ ] Test approval workflows

**Deliverables:**
- ✅ Tất cả request types được migrate
- ✅ Approval workflows hoạt động

---

### 3.5 Dashboard & Statistics (Tuần 9 - Ngày 1-2)

**Mục tiêu:** Migrate dashboard và statistics

**Tasks:**
- [ ] Create Dashboard module
- [ ] Migrate statistics queries
- [ ] Optimize queries với Prisma aggregations
- [ ] Add caching nếu cần
- [ ] Test performance

**Deliverables:**
- ✅ Dashboard API hoạt động
- ✅ Performance tốt

---

### 3.6 Testing & Refactoring (Tuần 9 - Ngày 3-5)

**Mục tiêu:** Test toàn bộ và refactor

**Tasks:**
- [ ] Unit tests cho services
- [ ] Integration tests cho controllers
- [ ] E2E tests cho critical flows
- [ ] Code review và refactoring
- [ ] Performance optimization
- [ ] Error handling improvement
- [ ] Documentation

**Deliverables:**
- ✅ Test coverage > 70%
- ✅ Code quality tốt
- ✅ Documentation đầy đủ

---

## 🐳 Phase 4: Deployment (Docker + CI/CD)

### 4.1 Docker Setup (Tuần 10 - Ngày 1-2)

**Mục tiêu:** Containerize application

**Tasks:**
- [ ] Create `Dockerfile` cho frontend
- [ ] Create `Dockerfile` cho backend
- [ ] Create `docker-compose.yml`
- [ ] Create `.dockerignore` files
- [ ] Test build và run locally

**Deliverables:**
- ✅ Docker images build thành công
- ✅ Docker Compose chạy được
- ✅ Services communicate với nhau

---

### 4.2 CI/CD Setup (Tuần 10 - Ngày 3-4)

**Mục tiêu:** Setup GitHub Actions cho CI/CD

**Tasks:**
- [ ] Create `.github/workflows/ci.yml`
- [ ] Create `.github/workflows/deploy.yml`
- [ ] Setup GitHub Secrets
- [ ] Test CI/CD pipeline

**Deliverables:**
- ✅ CI pipeline chạy trên mỗi PR
- ✅ CD pipeline deploy tự động
- ✅ Rollback strategy

---

### 4.3 Production Deployment (Tuần 10 - Ngày 5)

**Mục tiêu:** Deploy lên production

**Tasks:**
- [ ] Setup production environment variables
- [ ] Configure nginx reverse proxy
- [ ] Setup SSL certificates
- [ ] Setup monitoring và logging
- [ ] Create backup strategy
- [ ] Document deployment process
- [ ] Test production deployment

**Deliverables:**
- ✅ Production environment chạy ổn định
- ✅ Monitoring và logging
- ✅ Backup strategy

---

## 🔌 Phase 5: WebSocket/Socket.io (Real-time Updates)

### 5.1 Backend Socket.io Setup (Tuần 11 - Ngày 1-3)

**Mục tiêu:** Setup Socket.io server và integrate vào Express

**Tasks:**
- [ ] Install socket.io
- [ ] Setup Socket.io server trong `server.js`
- [ ] Create SocketService helper class
- [ ] Setup room-based messaging (user rooms, role rooms, branch rooms)
- [ ] Add authentication middleware cho Socket.io
- [ ] Test basic connection

**Deliverables:**
- ✅ Socket.io server running
- ✅ Connection handling working
- ✅ Room management working

**Code Example:**
```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  socket.on('join', (data) => {
    socket.join(`user:${data.userId}`);
    if (data.role === 'HR' || data.role === 'ADMIN') {
      socket.join('hr-room');
    }
  });
});

module.exports = { io, server };
```

---

### 5.2 Integrate vào Request Routes (Tuần 11 - Ngày 4-5)

**Mục tiêu:** Emit events khi có thay đổi đơn từ

**Tasks:**
- [ ] Integrate vào `leaveRequests.js`
- [ ] Integrate vào `overtimeRequests.js`
- [ ] Integrate vào `attendanceRequests.js`
- [ ] Integrate vào `lateEarlyRequests.js`
- [ ] Integrate vào `mealAllowanceRequests.js`
- [ ] Test tất cả events

**Deliverables:**
- ✅ Tất cả request routes emit events
- ✅ Events được gửi đúng rooms

**Code Example:**
```javascript
const SocketService = require('../services/socketService');

router.post('/', async (req, res) => {
  // ... create request ...
  SocketService.notifyNewRequest(newRequest, newRequest.team_lead_id);
  res.json({ success: true, data: newRequest });
});
```

---

### 5.3 Frontend Socket.io Client (Tuần 12 - Ngày 1-3)

**Mục tiêu:** Setup Socket.io client và hooks

**Tasks:**
- [ ] Install socket.io-client
- [ ] Create SocketContext provider
- [ ] Create `useRequestNotifications` hook
- [ ] Create `useDashboardStats` hook
- [ ] Integrate vào App.js
- [ ] Test connection và events

**Deliverables:**
- ✅ Socket.io client connected
- ✅ Hooks working
- ✅ Context provider setup

**Code Example:**
```javascript
import { io } from 'socket.io-client';

export const SocketProvider = ({ children, currentUser }) => {
  const [socket, setSocket] = useState(null);
  
  useEffect(() => {
    if (!currentUser) return;
    const newSocket = io('http://localhost:3000');
    newSocket.emit('join', {
      userId: currentUser.id,
      role: currentUser.role
    });
    setSocket(newSocket);
    return () => newSocket.close();
  }, [currentUser]);
  
  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
```

---

### 5.4 Update Components (Tuần 12 - Ngày 4-5)

**Mục tiêu:** Update components để nhận real-time updates

**Tasks:**
- [ ] Update `LeaveApprovals.js`
- [ ] Update `Dashboard.js`
- [ ] Update `RequestManagement.js`
- [ ] Add connection status indicator
- [ ] Test all features

**Deliverables:**
- ✅ Components update real-time
- ✅ Notifications working
- ✅ UI updates automatically

---

### 5.5 Advanced Features (Tuần 13)

**Mục tiêu:** Thêm features nâng cao

**Tasks:**
- [ ] Presence system (online/offline users)
- [ ] Typing indicators
- [ ] Conflict prevention (lock requests)
- [ ] Rate limiting
- [ ] Error handling và reconnection
- [ ] Performance optimization

**Deliverables:**
- ✅ Advanced features working
- ✅ Performance tốt
- ✅ Security measures in place

---

## 📊 Risk Assessment & Mitigation

### Risks

1. **Breaking Changes trong Migration**
   - **Risk:** Features có thể bị break trong quá trình migration
   - **Mitigation:** 
     - Migrate từng module một
     - Test kỹ sau mỗi migration
     - Giữ branch cũ để rollback

2. **Performance Issues**
   - **Risk:** NestJS/Prisma có thể chậm hơn Express/raw SQL
   - **Mitigation:**
     - Benchmark trước khi migrate
     - Optimize queries
     - Add caching nếu cần

3. **Learning Curve**
   - **Risk:** Team cần học NestJS/Prisma/TypeScript
   - **Mitigation:**
     - Training sessions
     - Code reviews
     - Documentation

4. **Database Migration Issues**
   - **Risk:** Prisma migrations có thể fail trên production
   - **Mitigation:**
     - Test migrations trên staging
     - Backup database trước khi migrate
     - Rollback plan

---

## ✅ Success Criteria

### Phase 1 (Frontend)
- ✅ Dev server start < 1s
- ✅ Build time < 30s
- ✅ Lighthouse score > 90
- ✅ TypeScript coverage 100%
- ✅ All features working

### Phase 2 (Database)
- ✅ Prisma schema đầy đủ
- ✅ Migrations hoạt động
- ✅ Performance tốt hơn hoặc bằng raw SQL

### Phase 3 (Backend)
- ✅ All endpoints migrated
- ✅ Test coverage > 70%
- ✅ Code quality tốt
- ✅ Performance tốt

### Phase 4 (Deployment)
- ✅ Docker images build thành công
- ✅ CI/CD pipeline hoạt động
- ✅ Production deployment thành công
- ✅ Monitoring và logging setup

### Phase 5 (WebSocket)
- ✅ Real-time notifications working
- ✅ Dashboard updates automatically
- ✅ Request list refreshes on changes
- ✅ No performance degradation
- ✅ Connection stable

---

## 📝 Quick Start Guide

### Phase 1: Frontend
```bash
# 1. Create Vite project
npm create vite@latest frontend-vite -- --template react-ts

# 2. Install dependencies
cd frontend-vite
npm install

# 3. Setup Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 4. Setup Shadcn UI
npx shadcn-ui@latest init
```

### Phase 2: Database
```bash
# 1. Install Prisma
npm install -D prisma
npm install @prisma/client

# 2. Init Prisma
npx prisma init

# 3. Introspect database
npx prisma db pull

# 4. Generate client
npx prisma generate
```

### Phase 3: Backend
```bash
# 1. Install NestJS CLI
npm install -g @nestjs/cli

# 2. Create project
nest new backend-nestjs

# 3. Install dependencies
npm install @nestjs/config @nestjs/jwt @prisma/client
```

### Phase 4: Deployment
```bash
# 1. Create Dockerfiles
# 2. Create docker-compose.yml
# 3. Test locally
docker-compose up --build
```

### Phase 5: WebSocket
```bash
# Backend
npm install socket.io

# Frontend
npm install socket.io-client
```

---

## ✅ Checklist

### Phase 1: Frontend (Week 1-3)
- [ ] Week 1 Day 1-2: Setup Vite project, migrate structure
- [ ] Week 1 Day 3-5: Convert JS → TypeScript, create types
- [ ] Week 2 Day 1-2: Setup Tailwind CSS, migrate styles
- [ ] Week 2 Day 3-5: Integrate Shadcn UI, migrate components
- [ ] Week 3: Test all features, performance optimization

### Phase 2: Database (Week 4-5)
- [ ] Week 4 Day 1-2: Install Prisma, introspect DB
- [ ] Week 4 Day 3-5: Create migrations, test
- [ ] Week 5: Create Prisma service, convert sample route, test performance

### Phase 3: Backend (Week 6-9)
- [ ] Week 6 Day 1-3: Setup NestJS project structure
- [ ] Week 6 Day 4-5: Migrate Auth module
- [ ] Week 7: Migrate all employee endpoints, add DTOs
- [ ] Week 8: Migrate all request types, test approval workflows
- [ ] Week 9 Day 1-2: Migrate dashboard
- [ ] Week 9 Day 3-5: Testing & refactoring

### Phase 4: Deployment (Week 10)
- [ ] Week 10 Day 1-2: Create Dockerfiles, docker-compose
- [ ] Week 10 Day 3-4: Setup GitHub Actions CI/CD
- [ ] Week 10 Day 5: Production deployment

### Phase 5: WebSocket (Week 11-13)
- [ ] Week 11 Day 1-3: Setup Socket.io server, SocketService
- [ ] Week 11 Day 4-5: Integrate vào request routes
- [ ] Week 12 Day 1-3: Setup SocketContext, hooks
- [ ] Week 12 Day 4-5: Update components
- [ ] Week 13: Advanced features, testing & optimization

### Pre-Migration Checklist
- [ ] Backup database
- [ ] Create feature branch
- [ ] Document current architecture
- [ ] Setup test environment
- [ ] Review dependencies

### Rollback Plan
- [ ] Keep old branch active
- [ ] Test rollback procedure
- [ ] Document rollback steps
- [ ] Monitor production closely

---

## 📚 Resources

- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn UI](https://ui.shadcn.com/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Socket.io Documentation](https://socket.io/docs/)

---

## 🎯 Next Steps

1. Review và approve kế hoạch này
2. Setup project tracking (Jira/Trello/GitHub Projects)
3. Assign tasks cho team members
4. Bắt đầu Phase 1: Frontend Migration

---

**Last Updated:** 27/01/2026
