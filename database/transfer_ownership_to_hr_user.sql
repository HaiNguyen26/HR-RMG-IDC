-- ============================================================
-- Script chuyển ownership tất cả objects sang hr_user
-- Chạy sau khi restore backup (nếu backup được restore bằng postgres)
-- Usage: sudo -u postgres psql -d HR_Management_System -f database/transfer_ownership_to_hr_user.sql
-- ============================================================

-- Chuyển ownership của database
ALTER DATABASE HR_Management_System OWNER TO hr_user;

-- Chuyển ownership của schema public
ALTER SCHEMA public OWNER TO hr_user;

-- Chuyển ownership của tất cả tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO hr_user';
    END LOOP;
END $$;

-- Chuyển ownership của tất cả sequences
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequence_name) || ' OWNER TO hr_user';
    END LOOP;
END $$;

-- Chuyển ownership của tất cả views
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public'
    LOOP
        EXECUTE 'ALTER VIEW public.' || quote_ident(r.table_name) || ' OWNER TO hr_user';
    END LOOP;
END $$;

-- Chuyển ownership của tất cả functions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc 
        WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        EXECUTE 'ALTER FUNCTION public.' || quote_ident(r.proname) || '(' || r.args || ') OWNER TO hr_user';
    END LOOP;
END $$;

-- Thông báo
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Đã chuyển ownership tất cả objects sang hr_user';
    RAISE NOTICE '========================================';
END $$;

