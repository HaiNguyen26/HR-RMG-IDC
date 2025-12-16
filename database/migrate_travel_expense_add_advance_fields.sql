DO $$
BEGIN
    -- Add actual_advance_amount column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='actual_advance_amount') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN actual_advance_amount NUMERIC(12, 2);
        RAISE NOTICE '✅ Đã thêm cột "actual_advance_amount" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "actual_advance_amount" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add advance_method column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='advance_method') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN advance_method VARCHAR(50);
        RAISE NOTICE '✅ Đã thêm cột "advance_method" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "advance_method" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add bank_account column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='bank_account') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN bank_account TEXT;
        RAISE NOTICE '✅ Đã thêm cột "bank_account" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "bank_account" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add advance_notes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='advance_notes') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN advance_notes TEXT;
        RAISE NOTICE '✅ Đã thêm cột "advance_notes" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "advance_notes" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add advance_status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='advance_status') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN advance_status VARCHAR(50);
        RAISE NOTICE '✅ Đã thêm cột "advance_status" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "advance_status" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add advance_transferred_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='advance_transferred_at') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN advance_transferred_at TIMESTAMP WITHOUT TIME ZONE;
        RAISE NOTICE '✅ Đã thêm cột "advance_transferred_at" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "advance_transferred_at" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add advance_transferred_by column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='advance_transferred_by') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN advance_transferred_by INTEGER;
        RAISE NOTICE '✅ Đã thêm cột "advance_transferred_by" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "advance_transferred_by" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

END $$;


