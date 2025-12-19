-- Migration: Add ALL missing columns to candidates table if they don't exist
-- This is a comprehensive migration to ensure all required columns exist

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates'
    ) THEN
        -- I. THÔNG TIN CÁ NHÂN
        
        -- noi_sinh
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'noi_sinh') THEN
            ALTER TABLE candidates ADD COLUMN noi_sinh VARCHAR(255);
            RAISE NOTICE 'Added column noi_sinh';
        END IF;
        
        -- nguyen_quan (old column, might be needed)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'nguyen_quan') THEN
            ALTER TABLE candidates ADD COLUMN nguyen_quan VARCHAR(255);
            RAISE NOTICE 'Added column nguyen_quan';
        END IF;
        
        -- so_dien_thoai_khac
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'so_dien_thoai_khac') THEN
            ALTER TABLE candidates ADD COLUMN so_dien_thoai_khac VARCHAR(20);
            RAISE NOTICE 'Added column so_dien_thoai_khac';
        END IF;
        
        -- II. TRÌNH ĐỘ HỌC VẤN
        
        -- trinh_do_van_hoa
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'trinh_do_van_hoa') THEN
            ALTER TABLE candidates ADD COLUMN trinh_do_van_hoa VARCHAR(100);
            RAISE NOTICE 'Added column trinh_do_van_hoa';
        END IF;
        
        -- trinh_do_chuyen_mon
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'trinh_do_chuyen_mon') THEN
            ALTER TABLE candidates ADD COLUMN trinh_do_chuyen_mon VARCHAR(255);
            RAISE NOTICE 'Added column trinh_do_chuyen_mon';
        END IF;
        
        -- chuyen_nganh
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'chuyen_nganh') THEN
            ALTER TABLE candidates ADD COLUMN chuyen_nganh VARCHAR(255);
            RAISE NOTICE 'Added column chuyen_nganh';
        END IF;
        
        -- III. THÔNG TIN ỨNG TUYỂN
        
        -- chi_nhanh
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'chi_nhanh') THEN
            ALTER TABLE candidates ADD COLUMN chi_nhanh VARCHAR(255);
            RAISE NOTICE 'Added column chi_nhanh';
        END IF;
        
        -- vi_tri_ung_tuyen
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'vi_tri_ung_tuyen') THEN
            ALTER TABLE candidates ADD COLUMN vi_tri_ung_tuyen VARCHAR(255);
            RAISE NOTICE 'Added column vi_tri_ung_tuyen';
        END IF;
        
        -- phong_ban
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'phong_ban') THEN
            ALTER TABLE candidates ADD COLUMN phong_ban VARCHAR(255);
            RAISE NOTICE 'Added column phong_ban';
        END IF;
        
        -- IV. FILE ĐÍNH KÈM
        
        -- anh_dai_dien_path
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'anh_dai_dien_path') THEN
            ALTER TABLE candidates ADD COLUMN anh_dai_dien_path VARCHAR(500);
            RAISE NOTICE 'Added column anh_dai_dien_path';
        END IF;
        
        -- cv_dinh_kem_path
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'cv_dinh_kem_path') THEN
            ALTER TABLE candidates ADD COLUMN cv_dinh_kem_path VARCHAR(500);
            RAISE NOTICE 'Added column cv_dinh_kem_path';
        END IF;
        
        RAISE NOTICE 'Migration completed for all missing columns';
    ELSE
        RAISE NOTICE 'Candidates table does not exist, skipping migration';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_candidates_chi_nhanh ON candidates(chi_nhanh);
CREATE INDEX IF NOT EXISTS idx_candidates_vi_tri_ung_tuyen ON candidates(vi_tri_ung_tuyen);
CREATE INDEX IF NOT EXISTS idx_candidates_phong_ban ON candidates(phong_ban);
