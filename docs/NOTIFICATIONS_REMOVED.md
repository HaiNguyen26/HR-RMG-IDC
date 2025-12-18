# Ghi chú: Chức năng thông báo Windows đã bị xóa

**Ngày xóa:** 18/12/2025

## Lý do
Chức năng thông báo Windows đã được tạm thời gỡ bỏ để phát triển lại trong tương lai với kiến trúc tốt hơn.

## Các file đã xóa

### Frontend
- `frontend/src/hooks/useGlobalNotifications.js` - Hook chính cho notification polling
- `frontend/src/utils/browserNotifications.js` - Utility functions cho Web Notifications API
- `frontend/public/test-notifications.html` - Trang test thông báo

### Scripts & Documentation
- `scripts/check-windows-notifications.ps1` - Script kiểm tra Windows settings
- `HUONG_DAN_THONG_BAO.md` - Hướng dẫn khắc phục lỗi thông báo
- `docs/DEBUG_NOTIFICATIONS.md` - Tài liệu debug notifications
- `docs/BROWSER_NOTIFICATIONS_SETUP.md` - Setup guide

### Code changes
- Xóa import và usage của `useGlobalNotifications` trong `App.js`
- Xóa comments liên quan đến notifications trong `LeaveApprovals.js`

## Kế hoạch phát triển lại (Future)

Khi phát triển lại chức năng notifications, nên cân nhắc:

### 1. Backend-driven notifications
Thay vì polling từ frontend, nên sử dụng:
- **WebSocket** hoặc **Server-Sent Events (SSE)** để push notifications real-time
- Backend track và gửi notifications khi có sự kiện mới

### 2. Notification Service riêng
- Tạo service riêng để quản lý notifications
- Database table để lưu notification history
- API endpoints để fetch/mark read notifications

### 3. Multiple notification channels
- **In-app notifications** (UI bell icon với dropdown)
- **Browser notifications** (Windows native notifications)
- **Email notifications** (cho những thông báo quan trọng)

### 4. Better UX
- Notification center trong UI
- Mark as read/unread
- Filter by type
- Notification settings/preferences

### 5. Scalability
- Queue system cho việc gửi notifications (Redis/RabbitMQ)
- Batch processing
- Rate limiting

## Tham khảo kỹ thuật

### WebSocket Implementation (Recommended)
```javascript
// Backend (Node.js + Socket.io)
io.on('connection', (socket) => {
  socket.on('authenticate', (userId) => {
    socket.join(`user:${userId}`);
  });
});

// Khi có đơn mới
io.to(`user:${managerId}`).emit('new_request', requestData);
```

### Server-Sent Events (Alternative)
```javascript
// Backend
app.get('/api/notifications/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  // Send events...
});

// Frontend
const eventSource = new EventSource('/api/notifications/stream');
eventSource.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  // Show notification
};
```

### Database Schema
```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type VARCHAR(50), -- 'leave_request', 'overtime_request', etc.
  title VARCHAR(255),
  message TEXT,
  data JSONB, -- Additional data
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

CREATE INDEX idx_notifications_user_unread 
ON notifications(user_id, read) 
WHERE read = FALSE;
```

## Notes
- Codebase hiện tại vẫn hoạt động bình thường sau khi xóa notifications
- Không có breaking changes cho users
- Có thể phát triển lại notification system mà không ảnh hưởng đến code hiện tại
