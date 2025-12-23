-- ============================================================
-- ADD PAYMENT FIELDS TO TRAVEL EXPENSE REQUESTS
-- ============================================================
-- Migration: Thêm các trường cho giải ngân (Bước 8)
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'travel_expense_requests'
    ) THEN
        RAISE NOTICE 'Bắt đầu thêm các trường payment...';

        -- final_status
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'travel_expense_requests' 
            AND column_name = 'final_status'
        ) THEN
            ALTER TABLE travel_expense_requests 
            ADD COLUMN final_status VARCHAR(40);
            RAISE NOTICE '✓ Đã thêm cột final_status';
        ELSE
            RAISE NOTICE '⚠ Cột final_status đã tồn tại';
        END IF;

        -- final_reimbursement_amount
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'travel_expense_requests' 
            AND column_name = 'final_reimbursement_amount'
        ) THEN
            ALTER TABLE travel_expense_requests 
            ADD COLUMN final_reimbursement_amount NUMERIC(12, 2);
            RAISE NOTICE '✓ Đã thêm cột final_reimbursement_amount';
        ELSE
            RAISE NOTICE '⚠ Cột final_reimbursement_amount đã tồn tại';
        END IF;

        -- refund_amount (số tiền nhân viên cần hoàn trả nếu chi phí < tạm ứng)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'travel_expense_requests' 
            AND column_name = 'refund_amount'
        ) THEN
            ALTER TABLE travel_expense_requests 
            ADD COLUMN refund_amount NUMERIC(12, 2);
            RAISE NOTICE '✓ Đã thêm cột refund_amount';
        ELSE
            RAISE NOTICE '⚠ Cột refund_amount đã tồn tại';
        END IF;

        -- payment_confirmed_at
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'travel_expense_requests' 
            AND column_name = 'payment_confirmed_at'
        ) THEN
            ALTER TABLE travel_expense_requests 
            ADD COLUMN payment_confirmed_at TIMESTAMP WITHOUT TIME ZONE;
            RAISE NOTICE '✓ Đã thêm cột payment_confirmed_at';
        ELSE
            RAISE NOTICE '⚠ Cột payment_confirmed_at đã tồn tại';
        END IF;

        -- payment_method (phương thức thanh toán: BANK_TRANSFER, CASH, etc.)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'travel_expense_requests' 
            AND column_name = 'payment_method'
        ) THEN
            ALTER TABLE travel_expense_requests 
            ADD COLUMN payment_method VARCHAR(50);
            RAISE NOTICE '✓ Đã thêm cột payment_method';
        ELSE
            RAISE NOTICE '⚠ Cột payment_method đã tồn tại';
        END IF;

        -- payment_reference (số tham chiếu giao dịch, mã chuyển khoản, etc.)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'travel_expense_requests' 
            AND column_name = 'payment_reference'
        ) THEN
            ALTER TABLE travel_expense_requests 
            ADD COLUMN payment_reference VARCHAR(255);
            RAISE NOTICE '✓ Đã thêm cột payment_reference';
        ELSE
            RAISE NOTICE '⚠ Cột payment_reference đã tồn tại';
        END IF;

        -- payment_confirmed_by
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'travel_expense_requests' 
            AND column_name = 'payment_confirmed_by'
        ) THEN
            ALTER TABLE travel_expense_requests 
            ADD COLUMN payment_confirmed_by INTEGER;
            RAISE NOTICE '✓ Đã thêm cột payment_confirmed_by';
        ELSE
            RAISE NOTICE '⚠ Cột payment_confirmed_by đã tồn tại';
        END IF;

        RAISE NOTICE '========================================';
        RAISE NOTICE '✅ Hoàn thành thêm các trường payment';
        RAISE NOTICE '========================================';
    ELSE
        RAISE NOTICE 'Bảng travel_expense_requests không tồn tại, bỏ qua migration';
    END IF;
END $$;

