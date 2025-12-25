-- ============================================================
-- GRANT PERMISSIONS FOR CANDIDATE RELATED TABLES
-- ============================================================
-- Migration: Cấp quyền cho database user trên các bảng liên quan đến candidates
-- ============================================================
-- Description: Đảm bảo hr_user có quyền SELECT, INSERT, UPDATE, DELETE trên các bảng:
--   - candidate_work_experiences
--   - candidate_training_processes
--   - candidate_foreign_languages
-- ============================================================

DO $$
BEGIN
    -- Cấp quyền cho candidate_work_experiences
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'candidate_work_experiences'
    ) THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON candidate_work_experiences TO hr_user;
        GRANT USAGE, SELECT ON SEQUENCE candidate_work_experiences_id_seq TO hr_user;
        RAISE NOTICE '✓ Đã cấp quyền cho candidate_work_experiences';
    ELSE
        RAISE NOTICE '⚠ Bảng candidate_work_experiences chưa tồn tại, bỏ qua cấp quyền';
    END IF;

    -- Cấp quyền cho candidate_training_processes
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'candidate_training_processes'
    ) THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON candidate_training_processes TO hr_user;
        GRANT USAGE, SELECT ON SEQUENCE candidate_training_processes_id_seq TO hr_user;
        RAISE NOTICE '✓ Đã cấp quyền cho candidate_training_processes';
    ELSE
        RAISE NOTICE '⚠ Bảng candidate_training_processes chưa tồn tại, bỏ qua cấp quyền';
    END IF;

    -- Cấp quyền cho candidate_foreign_languages
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'candidate_foreign_languages'
    ) THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON candidate_foreign_languages TO hr_user;
        GRANT USAGE, SELECT ON SEQUENCE candidate_foreign_languages_id_seq TO hr_user;
        RAISE NOTICE '✓ Đã cấp quyền cho candidate_foreign_languages';
    ELSE
        RAISE NOTICE '⚠ Bảng candidate_foreign_languages chưa tồn tại, bỏ qua cấp quyền';
    END IF;

    -- Cấp quyền cho bảng candidates (đảm bảo có quyền UPDATE)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'candidates'
    ) THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON candidates TO hr_user;
        GRANT USAGE, SELECT ON SEQUENCE candidates_id_seq TO hr_user;
        RAISE NOTICE '✓ Đã cấp quyền cho candidates';
    ELSE
        RAISE NOTICE '⚠ Bảng candidates chưa tồn tại, bỏ qua cấp quyền';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Hoàn thành cấp quyền cho các bảng liên quan đến candidates';
    RAISE NOTICE '========================================';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Lỗi khi cấp quyền: %', SQLERRM;
        RAISE;
END $$;
