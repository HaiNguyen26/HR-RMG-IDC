-- ============================================================
-- Cấp quyền cho database user trên các bảng late_early_requests và meal_allowance_requests
-- ============================================================

BEGIN;

-- Cấp quyền cho hr_user trên bảng late_early_requests
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE late_early_requests TO hr_user;
GRANT USAGE, SELECT ON SEQUENCE late_early_requests_id_seq TO hr_user;

-- Cấp quyền cho hr_user trên bảng meal_allowance_requests
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE meal_allowance_requests TO hr_user;
GRANT USAGE, SELECT ON SEQUENCE meal_allowance_requests_id_seq TO hr_user;

-- Cấp quyền cho hr_user trên bảng meal_allowance_items
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE meal_allowance_items TO hr_user;
GRANT USAGE, SELECT ON SEQUENCE meal_allowance_items_id_seq TO hr_user;

COMMIT;

-- ============================================================
-- Thông báo
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Đã cấp quyền cho hr_user trên các bảng:';
    RAISE NOTICE '  - late_early_requests';
    RAISE NOTICE '  - meal_allowance_requests';
    RAISE NOTICE '  - meal_allowance_items';
    RAISE NOTICE '========================================';
END $$;

