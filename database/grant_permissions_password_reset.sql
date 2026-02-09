-- Grant permissions cho bảng password_reset_requests
-- Chạy với: sudo -u postgres psql -d HR_Management_System -f grant_permissions_password_reset.sql

BEGIN;

-- Đảm bảo bảng tồn tại trước
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('employee', 'user')),
    email VARCHAR(255),
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL
);

-- Tạo sequence nếu chưa có (cho SERIAL)
CREATE SEQUENCE IF NOT EXISTS password_reset_requests_id_seq OWNED BY password_reset_requests.id;

-- Grant tất cả quyền cho hr_user
GRANT ALL PRIVILEGES ON TABLE password_reset_requests TO hr_user;
GRANT ALL PRIVILEGES ON SEQUENCE password_reset_requests_id_seq TO hr_user;

-- Grant quyền cụ thể (để đảm bảo)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE password_reset_requests TO hr_user;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE password_reset_requests_id_seq TO hr_user;

-- Nếu có schema public, grant trên schema
GRANT USAGE ON SCHEMA public TO hr_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hr_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hr_user;

-- Set default privileges cho các bảng và sequence tương lai
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO hr_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO hr_user;

COMMIT;

-- Kiểm tra quyền
SELECT 
    grantee,
    privilege_type,
    table_name
FROM information_schema.role_table_grants
WHERE table_name = 'password_reset_requests'
AND grantee IN ('hr_user', 'public')
ORDER BY grantee, privilege_type;
