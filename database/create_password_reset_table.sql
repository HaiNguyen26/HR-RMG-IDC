-- Bảng để track password reset requests và OTP
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('employee', 'user')),
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    otp_expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL
);

-- Index để tìm reset requests theo user và tháng
CREATE INDEX IF NOT EXISTS idx_password_reset_user_month 
ON password_reset_requests(user_id, user_type, DATE_TRUNC('month', created_at));

-- Index để tìm OTP còn hiệu lực
CREATE INDEX IF NOT EXISTS idx_password_reset_otp 
ON password_reset_requests(otp, is_used, otp_expires_at);

COMMENT ON TABLE password_reset_requests IS 'Bảng lưu trữ các yêu cầu reset password và OTP';
COMMENT ON COLUMN password_reset_requests.user_type IS 'Loại user: employee hoặc user';
COMMENT ON COLUMN password_reset_requests.otp IS 'Mã OTP 6 chữ số';
COMMENT ON COLUMN password_reset_requests.otp_expires_at IS 'Thời gian hết hạn OTP (15 phút)';
COMMENT ON COLUMN password_reset_requests.is_used IS 'OTP đã được sử dụng chưa';
