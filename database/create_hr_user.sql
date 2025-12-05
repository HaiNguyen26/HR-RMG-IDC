-- ============================================================
-- Script tạo user hr_user cho HR Management System
-- Usage: sudo -u postgres psql -f database/create_hr_user.sql
-- ============================================================

-- Tạo user hr_user nếu chưa tồn tại
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'hr_user') THEN
        CREATE USER hr_user WITH PASSWORD 'Hainguyen261097';
        RAISE NOTICE 'User hr_user đã được tạo';
    ELSE
        RAISE NOTICE 'User hr_user đã tồn tại';
    END IF;
END $$;

-- Cấp quyền cho user hr_user
-- Quyền CREATEDB để có thể tạo database
ALTER USER hr_user CREATEDB;

-- Nếu database HR_Management_System đã tồn tại, cấp quyền
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_database WHERE datname = 'HR_Management_System') THEN
        -- Cấp quyền owner cho database
        ALTER DATABASE HR_Management_System OWNER TO hr_user;
        RAISE NOTICE 'Đã cấp quyền owner cho database HR_Management_System';
    END IF;
END $$;

-- Thông báo
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'User hr_user đã được cấu hình';
    RAISE NOTICE 'Password: Hainguyen261097';
    RAISE NOTICE '========================================';
END $$;

