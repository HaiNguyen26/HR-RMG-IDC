-- ============================================
-- MIGRATE RECRUITMENT REQUESTS TABLE
-- ============================================
-- Allow nguoi_quan_ly_truc_tiep to be NULL
-- ============================================

BEGIN;

-- Remove NOT NULL constraint from nguoi_quan_ly_truc_tiep
DO $$
BEGIN
    ALTER TABLE recruitment_requests 
    ALTER COLUMN nguoi_quan_ly_truc_tiep DROP NOT NULL;
    
    RAISE NOTICE '✅ Đã cho phép nguoi_quan_ly_truc_tiep NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Lỗi khi alter column: %', SQLERRM;
END $$;

COMMIT;

