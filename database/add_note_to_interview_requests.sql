-- ============================================================
-- ADD NOTE COLUMN TO INTERVIEW_REQUESTS TABLE
-- ============================================================
-- Migration: Thêm cột note vào bảng interview_requests
-- ============================================================
-- Description: Đảm bảo cột note tồn tại trong bảng interview_requests
-- ============================================================

DO $$
BEGIN
    -- Kiểm tra xem bảng interview_requests có tồn tại không
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'interview_requests'
    ) THEN
        -- Kiểm tra xem cột note đã tồn tại chưa
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'interview_requests' 
            AND column_name = 'note'
        ) THEN
            -- Thêm cột note
            ALTER TABLE interview_requests ADD COLUMN note TEXT;
            COMMENT ON COLUMN interview_requests.note IS 'Ghi chú cho yêu cầu phỏng vấn';
            RAISE NOTICE '✓ Đã thêm cột note vào bảng interview_requests';
        ELSE
            RAISE NOTICE '⚠ Cột note đã tồn tại trong bảng interview_requests';
        END IF;
    ELSE
        RAISE NOTICE '⚠ Bảng interview_requests chưa tồn tại, bỏ qua thêm cột note';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Lỗi khi thêm cột note: %', SQLERRM;
        RAISE;
END $$;
