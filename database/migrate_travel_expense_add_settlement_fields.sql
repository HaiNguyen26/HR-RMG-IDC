DO $$
BEGIN
    -- Add actual_expense column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='actual_expense') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN actual_expense NUMERIC(12, 2);
        RAISE NOTICE '✅ Đã thêm cột "actual_expense" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "actual_expense" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add settlement_status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='settlement_status') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN settlement_status VARCHAR(50);
        RAISE NOTICE '✅ Đã thêm cột "settlement_status" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "settlement_status" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add employee_confirmed_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='employee_confirmed_at') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN employee_confirmed_at TIMESTAMP WITHOUT TIME ZONE;
        RAISE NOTICE '✅ Đã thêm cột "employee_confirmed_at" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "employee_confirmed_at" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add hr_confirmed_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='hr_confirmed_at') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN hr_confirmed_at TIMESTAMP WITHOUT TIME ZONE;
        RAISE NOTICE '✅ Đã thêm cột "hr_confirmed_at" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "hr_confirmed_at" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add hr_confirmed_by column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='hr_confirmed_by') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN hr_confirmed_by INTEGER;
        RAISE NOTICE '✅ Đã thêm cột "hr_confirmed_by" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "hr_confirmed_by" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add settlement_notes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='settlement_notes') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN settlement_notes TEXT;
        RAISE NOTICE '✅ Đã thêm cột "settlement_notes" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "settlement_notes" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Create attachments table if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='travel_expense_attachments') THEN
        CREATE TABLE travel_expense_attachments (
            id SERIAL PRIMARY KEY,
            travel_expense_request_id INTEGER NOT NULL REFERENCES travel_expense_requests(id) ON DELETE CASCADE,
            file_name VARCHAR(255) NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER,
            file_type VARCHAR(100),
            uploaded_by INTEGER,
            uploaded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            description TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_travel_expense_attachments_request ON travel_expense_attachments(travel_expense_request_id);
        RAISE NOTICE '✅ Đã tạo bảng "travel_expense_attachments" để lưu file đính kèm.';
    ELSE
        RAISE NOTICE '⚠ Bảng "travel_expense_attachments" đã tồn tại.';
    END IF;

END $$;

