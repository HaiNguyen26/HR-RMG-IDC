-- ============================================================
-- ADD APPROVAL COLUMNS TO INTERVIEW_REQUESTS
-- ============================================================
-- Migration: Thêm các cột liên quan đến duyệt phỏng vấn
-- ============================================================
-- Description: Thêm các cột:
--   - manager_approved (BOOLEAN DEFAULT FALSE)
--   - branch_director_approved (BOOLEAN DEFAULT FALSE)
--   - manager_approved_at (TIMESTAMP)
--   - branch_director_approved_at (TIMESTAMP)
-- ============================================================

DO $$
BEGIN
    -- Kiểm tra xem bảng interview_requests có tồn tại không
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'interview_requests'
    ) THEN
        -- Thêm cột manager_approved nếu chưa có
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'interview_requests' 
            AND column_name = 'manager_approved'
        ) THEN
            ALTER TABLE interview_requests 
            ADD COLUMN manager_approved BOOLEAN DEFAULT FALSE;
            RAISE NOTICE '✓ Đã thêm cột manager_approved';
        ELSE
            RAISE NOTICE '✓ Cột manager_approved đã tồn tại';
        END IF;

        -- Thêm cột branch_director_approved nếu chưa có
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'interview_requests' 
            AND column_name = 'branch_director_approved'
        ) THEN
            ALTER TABLE interview_requests 
            ADD COLUMN branch_director_approved BOOLEAN DEFAULT FALSE;
            RAISE NOTICE '✓ Đã thêm cột branch_director_approved';
        ELSE
            RAISE NOTICE '✓ Cột branch_director_approved đã tồn tại';
        END IF;

        -- Thêm cột manager_approved_at nếu chưa có
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'interview_requests' 
            AND column_name = 'manager_approved_at'
        ) THEN
            ALTER TABLE interview_requests 
            ADD COLUMN manager_approved_at TIMESTAMP;
            RAISE NOTICE '✓ Đã thêm cột manager_approved_at';
        ELSE
            RAISE NOTICE '✓ Cột manager_approved_at đã tồn tại';
        END IF;

        -- Thêm cột branch_director_approved_at nếu chưa có
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'interview_requests' 
            AND column_name = 'branch_director_approved_at'
        ) THEN
            ALTER TABLE interview_requests 
            ADD COLUMN branch_director_approved_at TIMESTAMP;
            RAISE NOTICE '✓ Đã thêm cột branch_director_approved_at';
        ELSE
            RAISE NOTICE '✓ Cột branch_director_approved_at đã tồn tại';
        END IF;

        RAISE NOTICE '========================================';
        RAISE NOTICE '✅ Hoàn thành thêm các cột approval cho interview_requests';
        RAISE NOTICE '========================================';
    ELSE
        RAISE NOTICE '⚠ Bảng interview_requests chưa tồn tại, bỏ qua';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Lỗi khi thêm các cột approval: %', SQLERRM;
        RAISE;
END $$;
