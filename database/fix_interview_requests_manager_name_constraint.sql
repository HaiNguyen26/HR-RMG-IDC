-- ============================================================
-- FIX INTERVIEW_REQUESTS.MANAGER_NAME CONSTRAINT
-- ============================================================
-- Migration: Drop NOT NULL constraint từ cột manager_name (nếu có)
-- ============================================================
-- Description: Cột manager_name không nên có NOT NULL vì có thể lấy từ JOIN với employees
-- ============================================================

DO $$
DECLARE
    is_nullable TEXT;
BEGIN
    -- Kiểm tra xem bảng interview_requests có tồn tại không
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'interview_requests'
    ) THEN
        -- Kiểm tra và sửa cột manager_name
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'interview_requests' 
            AND column_name = 'manager_name'
        ) THEN
            -- Kiểm tra xem cột có NOT NULL constraint không
            SELECT is_nullable INTO is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'interview_requests'
            AND column_name = 'manager_name';

            IF is_nullable = 'NO' THEN
                -- Drop NOT NULL constraint
                RAISE NOTICE 'Phát hiện cột manager_name có NOT NULL constraint, đang xóa constraint...';
                ALTER TABLE interview_requests ALTER COLUMN manager_name DROP NOT NULL;
                RAISE NOTICE '✓ Đã xóa NOT NULL constraint từ cột manager_name';
            ELSE
                RAISE NOTICE '✓ Cột manager_name đã nullable, không cần thay đổi';
            END IF;
        ELSE
            RAISE NOTICE '⚠ Cột manager_name không tồn tại, bỏ qua';
        END IF;

        -- Kiểm tra và sửa cột branch_director_name nếu có
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'interview_requests' 
            AND column_name = 'branch_director_name'
        ) THEN
            SELECT is_nullable INTO is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'interview_requests'
            AND column_name = 'branch_director_name';

            IF is_nullable = 'NO' THEN
                RAISE NOTICE 'Phát hiện cột branch_director_name có NOT NULL constraint, đang xóa constraint...';
                ALTER TABLE interview_requests ALTER COLUMN branch_director_name DROP NOT NULL;
                RAISE NOTICE '✓ Đã xóa NOT NULL constraint từ cột branch_director_name';
            ELSE
                RAISE NOTICE '✓ Cột branch_director_name đã nullable, không cần thay đổi';
            END IF;
        END IF;

        RAISE NOTICE '========================================';
        RAISE NOTICE '✅ Hoàn thành sửa constraints cho interview_requests';
        RAISE NOTICE '========================================';
    ELSE
        RAISE NOTICE '⚠ Bảng interview_requests chưa tồn tại, bỏ qua';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Lỗi khi sửa constraints: %', SQLERRM;
        RAISE;
END $$;
