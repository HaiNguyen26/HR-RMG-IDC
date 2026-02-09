-- Migration: Cho phép email NULL trong bảng password_reset_requests
-- Mục đích: Cho phép reset password ngay cả khi tài khoản chưa có email
-- Chạy trên server: psql -U hr_user -d hr_management -f migrate_password_reset_allow_null_email.sql

BEGIN;

-- Kiểm tra và sửa cột email để cho phép NULL
DO $$
BEGIN
    -- Kiểm tra xem bảng có tồn tại không
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'password_reset_requests'
    ) THEN
        -- Kiểm tra xem cột email có tồn tại và có constraint NOT NULL không
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'password_reset_requests' 
            AND column_name = 'email'
            AND is_nullable = 'NO'
        ) THEN
            -- Sửa cột để cho phép NULL
            ALTER TABLE password_reset_requests 
            ALTER COLUMN email DROP NOT NULL;
            
            RAISE NOTICE 'Đã sửa cột email để cho phép NULL';
        ELSE
            RAISE NOTICE 'Cột email đã cho phép NULL hoặc không tồn tại';
        END IF;
    ELSE
        -- Nếu bảng chưa tồn tại, tạo mới với email cho phép NULL
        CREATE TABLE password_reset_requests (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('employee', 'user')),
            email VARCHAR(255),
            is_used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP NULL
        );
        
        -- Tạo indexes
        CREATE INDEX IF NOT EXISTS idx_password_reset_user_month 
        ON password_reset_requests(user_id, user_type, DATE_TRUNC('month', created_at));
        
        RAISE NOTICE 'Đã tạo bảng password_reset_requests với email cho phép NULL';
    END IF;
END $$;

COMMIT;

-- Kiểm tra kết quả
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'password_reset_requests'
ORDER BY ordinal_position;
