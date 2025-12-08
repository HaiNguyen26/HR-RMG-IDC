-- Migration: Thêm các field mới cho Bước 1 - Khởi tạo Yêu cầu Công tác
-- Thêm: company_name, company_address, requested_advance_amount, living_allowance_amount, living_allowance_currency, continent

DO $$ 
BEGIN
    -- Thêm company_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='company_name') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN company_name TEXT;
        RAISE NOTICE '✅ Đã thêm cột company_name';
    ELSE
        RAISE NOTICE '⚠ Cột company_name đã tồn tại';
    END IF;

    -- Thêm company_address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='company_address') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN company_address TEXT;
        RAISE NOTICE '✅ Đã thêm cột company_address';
    ELSE
        RAISE NOTICE '⚠ Cột company_address đã tồn tại';
    END IF;

    -- Thêm requested_advance_amount (Số tiền cần tạm ứng - người tạo tự điền)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='requested_advance_amount') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN requested_advance_amount NUMERIC(12, 2);
        RAISE NOTICE '✅ Đã thêm cột requested_advance_amount';
    ELSE
        RAISE NOTICE '⚠ Cột requested_advance_amount đã tồn tại';
    END IF;

    -- Thêm living_allowance_amount (Phí sinh hoạt tự động cấp)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='living_allowance_amount') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN living_allowance_amount NUMERIC(12, 2);
        RAISE NOTICE '✅ Đã thêm cột living_allowance_amount';
    ELSE
        RAISE NOTICE '⚠ Cột living_allowance_amount đã tồn tại';
    END IF;

    -- Thêm living_allowance_currency (Loại tiền phí sinh hoạt)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='living_allowance_currency') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN living_allowance_currency VARCHAR(10);
        RAISE NOTICE '✅ Đã thêm cột living_allowance_currency';
    ELSE
        RAISE NOTICE '⚠ Cột living_allowance_currency đã tồn tại';
    END IF;

    -- Thêm continent (Châu lục để xác định phí sinh hoạt)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='continent') THEN
        ALTER TABLE travel_expense_requests ADD COLUMN continent VARCHAR(50);
        RAISE NOTICE '✅ Đã thêm cột continent';
    ELSE
        RAISE NOTICE '⚠ Cột continent đã tồn tại';
    END IF;
END $$;

