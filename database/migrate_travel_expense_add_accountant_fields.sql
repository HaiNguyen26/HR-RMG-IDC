DO $$
BEGIN
    -- Add accountant_checked_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='accountant_checked_at') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN accountant_checked_at TIMESTAMP WITHOUT TIME ZONE;
        RAISE NOTICE '✅ Đã thêm cột "accountant_checked_at" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "accountant_checked_at" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add accountant_notes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='accountant_notes') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN accountant_notes TEXT;
        RAISE NOTICE '✅ Đã thêm cột "accountant_notes" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "accountant_notes" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add accountant_checked_by column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='accountant_checked_by') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN accountant_checked_by INTEGER;
        RAISE NOTICE '✅ Đã thêm cột "accountant_checked_by" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "accountant_checked_by" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add reimbursement_amount column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='reimbursement_amount') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN reimbursement_amount NUMERIC(12, 2);
        RAISE NOTICE '✅ Đã thêm cột "reimbursement_amount" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "reimbursement_amount" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add exceeds_budget column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='exceeds_budget') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN exceeds_budget BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Đã thêm cột "exceeds_budget" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "exceeds_budget" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add excess_amount column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='excess_amount') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN excess_amount NUMERIC(12, 2);
        RAISE NOTICE '✅ Đã thêm cột "excess_amount" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "excess_amount" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

END $$;


