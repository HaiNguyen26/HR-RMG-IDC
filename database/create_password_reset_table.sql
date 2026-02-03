-- Bảng để track password reset requests (không dùng OTP nữa, chỉ track số lần reset)
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('employee', 'user')),
    email VARCHAR(255) NOT NULL,
    is_used BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index để tìm reset requests theo user và tháng (để giới hạn 2 lần/tháng)
CREATE INDEX IF NOT EXISTS idx_password_reset_user_month 
ON password_reset_requests(user_id, user_type, DATE_TRUNC('month', created_at));

COMMENT ON TABLE password_reset_requests IS 'Bảng lưu trữ các yêu cầu reset password để track số lần reset trong tháng';
COMMENT ON COLUMN password_reset_requests.user_type IS 'Loại user: employee hoặc user';
COMMENT ON COLUMN password_reset_requests.is_used IS 'Đã được sử dụng (luôn TRUE vì không cần OTP)';
COMMENT ON COLUMN password_reset_requests.created_at IS 'Thời gian tạo yêu cầu reset';
COMMENT ON COLUMN password_reset_requests.used_at IS 'Thời gian reset password thành công';
