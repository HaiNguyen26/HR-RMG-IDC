-- ============================================================
-- FIX INTERVIEW_REQUESTS.STATUS CONSTRAINT
-- ============================================================
-- Migration: Cập nhật check constraint cho cột status
-- ============================================================
-- Description: Đảm bảo constraint cho phép các giá trị:
--   - PENDING_INTERVIEW
--   - WAITING_FOR_OTHER_APPROVAL
--   - READY_FOR_INTERVIEW
--   - APPROVED
--   - REJECTED
-- ============================================================

DO $$
BEGIN
    -- Kiểm tra xem bảng interview_requests có tồn tại không
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'interview_requests'
    ) THEN
        -- Drop constraint cũ nếu có
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_schema = 'public'
            AND table_name = 'interview_requests'
            AND constraint_name = 'interview_requests_status_check'
        ) THEN
            RAISE NOTICE 'Phát hiện constraint interview_requests_status_check, đang xóa...';
            ALTER TABLE interview_requests DROP CONSTRAINT interview_requests_status_check;
            RAISE NOTICE '✓ Đã xóa constraint cũ';
        END IF;

        -- Thêm constraint mới với đầy đủ các giá trị status
        RAISE NOTICE 'Đang thêm constraint mới với đầy đủ các giá trị status...';
        ALTER TABLE interview_requests
        ADD CONSTRAINT interview_requests_status_check
        CHECK (status IN (
            'PENDING_INTERVIEW',
            'WAITING_FOR_OTHER_APPROVAL',
            'READY_FOR_INTERVIEW',
            'APPROVED',
            'REJECTED'
        ));
        RAISE NOTICE '✓ Đã thêm constraint mới';

        RAISE NOTICE '========================================';
        RAISE NOTICE '✅ Hoàn thành cập nhật constraint cho interview_requests.status';
        RAISE NOTICE '========================================';
    ELSE
        RAISE NOTICE '⚠ Bảng interview_requests chưa tồn tại, bỏ qua';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Lỗi khi cập nhật constraint: %', SQLERRM;
        RAISE;
END $$;
