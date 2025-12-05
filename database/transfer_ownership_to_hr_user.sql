-- ============================================================
-- Script chuyển ownership tất cả objects sang hr_user
-- Chạy sau khi restore backup (nếu backup được restore bằng postgres)
-- Usage: sudo -u postgres psql -d HR_Management_System -f database/transfer_ownership_to_hr_user.sql
-- ============================================================

-- Chuyển ownership của database
ALTER DATABASE "HR_Management_System" OWNER TO hr_user;

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
        BEGIN
            EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO hr_user';
            RAISE NOTICE 'Changed owner of table: %', r.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error changing owner of table %: %', r.tablename, SQLERRM;
        END;
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
        BEGIN
            EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequence_name) || ' OWNER TO hr_user';
            RAISE NOTICE 'Changed owner of sequence: %', r.sequence_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error changing owner of sequence %: %', r.sequence_name, SQLERRM;
        END;
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
        BEGIN
            EXECUTE 'ALTER VIEW public.' || quote_ident(r.table_name) || ' OWNER TO hr_user';
            RAISE NOTICE 'Changed owner of view: %', r.table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error changing owner of view %: %', r.table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Chuyển ownership của tất cả indexes
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE 'ALTER INDEX public.' || quote_ident(r.indexname) || ' OWNER TO hr_user';
            RAISE NOTICE 'Changed owner of index: %', r.indexname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error changing owner of index %: %', r.indexname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Chuyển ownership của tất cả functions
DO $$
DECLARE
    r RECORD;
    func_signature TEXT;
BEGIN
    FOR r IN 
        SELECT 
            p.proname,
            pg_get_function_identity_arguments(p.oid) as args,
            p.oid
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
    LOOP
        BEGIN
            func_signature := quote_ident(r.proname) || '(' || COALESCE(r.args, '') || ')';
            EXECUTE 'ALTER FUNCTION public.' || func_signature || ' OWNER TO hr_user';
            RAISE NOTICE 'Changed owner of function: %', func_signature;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error changing owner of function %: %', func_signature, SQLERRM;
        END;
    END LOOP;
END $$;

-- Thông báo
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Đã chuyển ownership tất cả objects sang hr_user';
    RAISE NOTICE '========================================';
END $$;

