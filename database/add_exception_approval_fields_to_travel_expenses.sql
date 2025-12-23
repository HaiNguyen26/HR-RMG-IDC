-- ============================================================
-- ADD EXCEPTION APPROVAL FIELDS TO TRAVEL EXPENSE REQUESTS
-- ============================================================
-- Migration: Thêm các trường cho phê duyệt ngoại lệ vượt ngân sách
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'travel_expense_requests'
    ) THEN
        RAISE NOTICE 'Bắt đầu thêm các trường exception approval...';

        -- exception_approval_status
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'travel_expense_requests' 
            AND column_name = 'exception_approval_status'
        ) THEN
            ALTER TABLE travel_expense_requests 
            ADD COLUMN exception_approval_status VARCHAR(40);
            RAISE NOTICE '✓ Đã thêm cột exception_approval_status';
        ELSE
            RAISE NOTICE '⚠ Cột exception_approval_status đã tồn tại';
        END IF;

        -- exception_approver_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'travel_expense_requests' 
            AND column_name = 'exception_approver_id'
        ) THEN
            ALTER TABLE travel_expense_requests 
            ADD COLUMN exception_approver_id INTEGER;
            RAISE NOTICE '✓ Đã thêm cột exception_approver_id';
        ELSE
            RAISE NOTICE '⚠ Cột exception_approver_id đã tồn tại';
        END IF;

        -- exception_approval_notes
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'travel_expense_requests' 
            AND column_name = 'exception_approval_notes'
        ) THEN
            ALTER TABLE travel_expense_requests 
            ADD COLUMN exception_approval_notes TEXT;
            RAISE NOTICE '✓ Đã thêm cột exception_approval_notes';
        ELSE
            RAISE NOTICE '⚠ Cột exception_approval_notes đã tồn tại';
        END IF;

        -- exception_approval_at
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'travel_expense_requests' 
            AND column_name = 'exception_approval_at'
        ) THEN
            ALTER TABLE travel_expense_requests 
            ADD COLUMN exception_approval_at TIMESTAMP WITHOUT TIME ZONE;
            RAISE NOTICE '✓ Đã thêm cột exception_approval_at';
        ELSE
            RAISE NOTICE '⚠ Cột exception_approval_at đã tồn tại';
        END IF;

        -- approved_excess_amount
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'travel_expense_requests' 
            AND column_name = 'approved_excess_amount'
        ) THEN
            ALTER TABLE travel_expense_requests 
            ADD COLUMN approved_excess_amount NUMERIC(12, 2);
            RAISE NOTICE '✓ Đã thêm cột approved_excess_amount';
        ELSE
            RAISE NOTICE '⚠ Cột approved_excess_amount đã tồn tại';
        END IF;

        RAISE NOTICE '========================================';
        RAISE NOTICE '✅ Hoàn thành thêm các trường exception approval';
        RAISE NOTICE '========================================';
    ELSE
        RAISE NOTICE 'Bảng travel_expense_requests không tồn tại, bỏ qua migration';
    END IF;
END $$;

