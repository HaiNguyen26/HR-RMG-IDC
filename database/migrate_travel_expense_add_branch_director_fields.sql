DO $$
BEGIN
    -- Add branch_director_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='branch_director_id') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN branch_director_id INTEGER;
        RAISE NOTICE '✅ Đã thêm cột "branch_director_id" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "branch_director_id" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add branch_director_decision column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='branch_director_decision') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN branch_director_decision VARCHAR(20);
        RAISE NOTICE '✅ Đã thêm cột "branch_director_decision" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "branch_director_decision" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add branch_director_notes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='branch_director_notes') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN branch_director_notes TEXT;
        RAISE NOTICE '✅ Đã thêm cột "branch_director_notes" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "branch_director_notes" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

    -- Add branch_director_decision_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='branch_director_decision_at') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN branch_director_decision_at TIMESTAMP WITHOUT TIME ZONE;
        RAISE NOTICE '✅ Đã thêm cột "branch_director_decision_at" vào bảng "travel_expense_requests".';
    ELSE
        RAISE NOTICE '⚠ Cột "branch_director_decision_at" đã tồn tại trong bảng "travel_expense_requests".';
    END IF;

END $$;


