-- ============================================
-- Migration: Đảm bảo các cột file đính kèm tồn tại trong bảng candidates
-- ============================================
-- Script này đảm bảo các cột anh_dai_dien_path và cv_dinh_kem_path tồn tại
-- Cần thiết cho chức năng cập nhật ứng viên và hiển thị file đính kèm
-- ============================================
-- An toàn để chạy nhiều lần - chỉ thêm các cột chưa tồn tại
-- ============================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates'
    ) THEN
        RAISE NOTICE 'Starting migration for candidate file fields...';
        
        -- Cột ảnh đại diện (QUAN TRỌNG)
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'candidates' 
            AND column_name = 'anh_dai_dien_path'
        ) THEN
            ALTER TABLE candidates ADD COLUMN anh_dai_dien_path VARCHAR(500);
            COMMENT ON COLUMN candidates.anh_dai_dien_path IS 'Đường dẫn file ảnh đại diện của ứng viên';
            RAISE NOTICE '✓ Added column anh_dai_dien_path';
        ELSE
            RAISE NOTICE '✓ Column anh_dai_dien_path already exists';
        END IF;
        
        -- Cột CV đính kèm (QUAN TRỌNG)
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'candidates' 
            AND column_name = 'cv_dinh_kem_path'
        ) THEN
            ALTER TABLE candidates ADD COLUMN cv_dinh_kem_path VARCHAR(500);
            COMMENT ON COLUMN candidates.cv_dinh_kem_path IS 'Đường dẫn file CV đính kèm của ứng viên';
            RAISE NOTICE '✓ Added column cv_dinh_kem_path';
        ELSE
            RAISE NOTICE '✓ Column cv_dinh_kem_path already exists';
        END IF;
        
        -- Các cột liên quan khác (nếu chưa có)
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'candidates' 
            AND column_name = 'ngay_gui_cv'
        ) THEN
            ALTER TABLE candidates ADD COLUMN ngay_gui_cv DATE;
            COMMENT ON COLUMN candidates.ngay_gui_cv IS 'Ngày ứng viên gửi CV';
            RAISE NOTICE '✓ Added column ngay_gui_cv';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'candidates' 
            AND column_name = 'nguon_cv'
        ) THEN
            ALTER TABLE candidates ADD COLUMN nguon_cv VARCHAR(255);
            COMMENT ON COLUMN candidates.nguon_cv IS 'Nguồn CV (Website, Facebook, LinkedIn, v.v.)';
            RAISE NOTICE '✓ Added column nguon_cv';
        END IF;
        
        -- Đảm bảo index cho ngay_gui_cv
        CREATE INDEX IF NOT EXISTS idx_candidates_ngay_gui_cv ON candidates(ngay_gui_cv DESC);
        
        RAISE NOTICE 'Migration completed for candidate file fields';
    ELSE
        RAISE NOTICE 'Candidates table does not exist, skipping migration';
    END IF;
END $$;

-- ============================================
-- Hoàn thành
-- ============================================
SELECT 'Migration completed: Candidate file fields (anh_dai_dien_path, cv_dinh_kem_path) ensured' AS result;

