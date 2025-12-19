-- Migration: Ensure ALL columns exist in candidates table
-- This comprehensive migration adds all missing columns based on the full schema
-- Safe to run multiple times - only adds columns that don't exist

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates'
    ) THEN
        RAISE NOTICE 'Starting comprehensive migration for candidates table...';
        
        -- I. THÔNG TIN CÁ NHÂN
        
        -- gioi_tinh
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'gioi_tinh') THEN
            ALTER TABLE candidates ADD COLUMN gioi_tinh VARCHAR(10) DEFAULT 'Nam';
            RAISE NOTICE '✓ Added column gioi_tinh';
        END IF;
        
        -- ngay_sinh
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'ngay_sinh') THEN
            ALTER TABLE candidates ADD COLUMN ngay_sinh DATE;
            RAISE NOTICE '✓ Added column ngay_sinh';
        END IF;
        
        -- noi_sinh
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'noi_sinh') THEN
            ALTER TABLE candidates ADD COLUMN noi_sinh VARCHAR(255);
            RAISE NOTICE '✓ Added column noi_sinh';
        END IF;
        
        -- tinh_trang_hon_nhan
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'tinh_trang_hon_nhan') THEN
            ALTER TABLE candidates ADD COLUMN tinh_trang_hon_nhan VARCHAR(20) DEFAULT 'Độc thân';
            RAISE NOTICE '✓ Added column tinh_trang_hon_nhan';
        END IF;
        
        -- dan_toc
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'dan_toc') THEN
            ALTER TABLE candidates ADD COLUMN dan_toc VARCHAR(50);
            RAISE NOTICE '✓ Added column dan_toc';
        END IF;
        
        -- quoc_tich
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'quoc_tich') THEN
            ALTER TABLE candidates ADD COLUMN quoc_tich VARCHAR(100) DEFAULT 'Việt Nam';
            RAISE NOTICE '✓ Added column quoc_tich';
        END IF;
        
        -- ton_giao
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'ton_giao') THEN
            ALTER TABLE candidates ADD COLUMN ton_giao VARCHAR(100);
            RAISE NOTICE '✓ Added column ton_giao';
        END IF;
        
        -- so_cccd
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'so_cccd') THEN
            ALTER TABLE candidates ADD COLUMN so_cccd VARCHAR(20);
            RAISE NOTICE '✓ Added column so_cccd';
        END IF;
        
        -- ngay_cap_cccd
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'ngay_cap_cccd') THEN
            ALTER TABLE candidates ADD COLUMN ngay_cap_cccd DATE;
            RAISE NOTICE '✓ Added column ngay_cap_cccd';
        END IF;
        
        -- noi_cap_cccd
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'noi_cap_cccd') THEN
            ALTER TABLE candidates ADD COLUMN noi_cap_cccd VARCHAR(255);
            RAISE NOTICE '✓ Added column noi_cap_cccd';
        END IF;
        
        -- nguyen_quan
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'nguyen_quan') THEN
            ALTER TABLE candidates ADD COLUMN nguyen_quan VARCHAR(255);
            RAISE NOTICE '✓ Added column nguyen_quan';
        END IF;
        
        -- so_dien_thoai_khac
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'so_dien_thoai_khac') THEN
            ALTER TABLE candidates ADD COLUMN so_dien_thoai_khac VARCHAR(20);
            RAISE NOTICE '✓ Added column so_dien_thoai_khac';
        END IF;
        
        -- II. ĐỊA CHỈ TẠM TRÚ
        
        -- dia_chi_tam_tru_so_nha
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'dia_chi_tam_tru_so_nha') THEN
            ALTER TABLE candidates ADD COLUMN dia_chi_tam_tru_so_nha VARCHAR(255);
            RAISE NOTICE '✓ Added column dia_chi_tam_tru_so_nha';
        END IF;
        
        -- dia_chi_tam_tru_phuong_xa
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'dia_chi_tam_tru_phuong_xa') THEN
            ALTER TABLE candidates ADD COLUMN dia_chi_tam_tru_phuong_xa VARCHAR(255);
            RAISE NOTICE '✓ Added column dia_chi_tam_tru_phuong_xa';
        END IF;
        
        -- dia_chi_tam_tru_quan_huyen
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'dia_chi_tam_tru_quan_huyen') THEN
            ALTER TABLE candidates ADD COLUMN dia_chi_tam_tru_quan_huyen VARCHAR(255);
            RAISE NOTICE '✓ Added column dia_chi_tam_tru_quan_huyen';
        END IF;
        
        -- dia_chi_tam_tru_thanh_pho_tinh
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'dia_chi_tam_tru_thanh_pho_tinh') THEN
            ALTER TABLE candidates ADD COLUMN dia_chi_tam_tru_thanh_pho_tinh VARCHAR(255);
            RAISE NOTICE '✓ Added column dia_chi_tam_tru_thanh_pho_tinh';
        END IF;
        
        -- III. NGUYÊN QUÁN
        
        -- nguyen_quan_so_nha
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'nguyen_quan_so_nha') THEN
            ALTER TABLE candidates ADD COLUMN nguyen_quan_so_nha VARCHAR(255);
            RAISE NOTICE '✓ Added column nguyen_quan_so_nha';
        END IF;
        
        -- nguyen_quan_phuong_xa
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'nguyen_quan_phuong_xa') THEN
            ALTER TABLE candidates ADD COLUMN nguyen_quan_phuong_xa VARCHAR(255);
            RAISE NOTICE '✓ Added column nguyen_quan_phuong_xa';
        END IF;
        
        -- nguyen_quan_quan_huyen
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'nguyen_quan_quan_huyen') THEN
            ALTER TABLE candidates ADD COLUMN nguyen_quan_quan_huyen VARCHAR(255);
            RAISE NOTICE '✓ Added column nguyen_quan_quan_huyen';
        END IF;
        
        -- nguyen_quan_thanh_pho_tinh
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'nguyen_quan_thanh_pho_tinh') THEN
            ALTER TABLE candidates ADD COLUMN nguyen_quan_thanh_pho_tinh VARCHAR(255);
            RAISE NOTICE '✓ Added column nguyen_quan_thanh_pho_tinh';
        END IF;
        
        -- IV. TRÌNH ĐỘ HỌC VẤN
        
        -- trinh_do_van_hoa
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'trinh_do_van_hoa') THEN
            ALTER TABLE candidates ADD COLUMN trinh_do_van_hoa VARCHAR(100);
            RAISE NOTICE '✓ Added column trinh_do_van_hoa';
        END IF;
        
        -- trinh_do_chuyen_mon
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'trinh_do_chuyen_mon') THEN
            ALTER TABLE candidates ADD COLUMN trinh_do_chuyen_mon VARCHAR(255);
            RAISE NOTICE '✓ Added column trinh_do_chuyen_mon';
        END IF;
        
        -- chuyen_nganh
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'chuyen_nganh') THEN
            ALTER TABLE candidates ADD COLUMN chuyen_nganh VARCHAR(255);
            RAISE NOTICE '✓ Added column chuyen_nganh';
        END IF;
        
        -- V. THÔNG TIN ỨNG TUYỂN
        
        -- chi_nhanh
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'chi_nhanh') THEN
            ALTER TABLE candidates ADD COLUMN chi_nhanh VARCHAR(255);
            RAISE NOTICE '✓ Added column chi_nhanh';
        END IF;
        
        -- vi_tri_ung_tuyen
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'vi_tri_ung_tuyen') THEN
            ALTER TABLE candidates ADD COLUMN vi_tri_ung_tuyen VARCHAR(255);
            RAISE NOTICE '✓ Added column vi_tri_ung_tuyen';
        END IF;
        
        -- phong_ban
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'phong_ban') THEN
            ALTER TABLE candidates ADD COLUMN phong_ban VARCHAR(255);
            RAISE NOTICE '✓ Added column phong_ban';
        END IF;
        
        -- VI. FILE ĐÍNH KÈM
        
        -- anh_dai_dien_path
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'anh_dai_dien_path') THEN
            ALTER TABLE candidates ADD COLUMN anh_dai_dien_path VARCHAR(500);
            RAISE NOTICE '✓ Added column anh_dai_dien_path';
        END IF;
        
        -- cv_dinh_kem_path
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'cv_dinh_kem_path') THEN
            ALTER TABLE candidates ADD COLUMN cv_dinh_kem_path VARCHAR(500);
            RAISE NOTICE '✓ Added column cv_dinh_kem_path';
        END IF;
        
        -- ngay_gui_cv
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'ngay_gui_cv') THEN
            ALTER TABLE candidates ADD COLUMN ngay_gui_cv DATE;
            RAISE NOTICE '✓ Added column ngay_gui_cv';
        END IF;
        
        -- nguon_cv
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'nguon_cv') THEN
            ALTER TABLE candidates ADD COLUMN nguon_cv VARCHAR(255);
            RAISE NOTICE '✓ Added column nguon_cv';
        END IF;
        
        -- VII. TRẠNG THÁI
        
        -- trang_thai
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'trang_thai') THEN
            ALTER TABLE candidates ADD COLUMN trang_thai VARCHAR(50) DEFAULT 'NEW';
            RAISE NOTICE '✓ Added column trang_thai';
        END IF;
        
        -- VIII. METADATA
        
        -- created_at
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'created_at') THEN
            ALTER TABLE candidates ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
            RAISE NOTICE '✓ Added column created_at';
        END IF;
        
        -- updated_at
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'updated_at') THEN
            ALTER TABLE candidates ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
            RAISE NOTICE '✓ Added column updated_at';
        END IF;
        
        -- created_by
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'created_by') THEN
            ALTER TABLE candidates ADD COLUMN created_by INTEGER;
            RAISE NOTICE '✓ Added column created_by';
        END IF;
        
        -- probation_start_date
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'probation_start_date') THEN
            ALTER TABLE candidates ADD COLUMN probation_start_date DATE;
            RAISE NOTICE '✓ Added column probation_start_date';
        END IF;
        
        RAISE NOTICE 'Migration completed for all candidate columns';
    ELSE
        RAISE NOTICE 'Candidates table does not exist, skipping migration';
    END IF;
END $$;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_candidates_ho_ten ON candidates(ho_ten);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_trang_thai ON candidates(trang_thai);
CREATE INDEX IF NOT EXISTS idx_candidates_chi_nhanh ON candidates(chi_nhanh);
CREATE INDEX IF NOT EXISTS idx_candidates_vi_tri_ung_tuyen ON candidates(vi_tri_ung_tuyen);
CREATE INDEX IF NOT EXISTS idx_candidates_phong_ban ON candidates(phong_ban);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_ngay_gui_cv ON candidates(ngay_gui_cv DESC);

-- Ensure constraints exist (safe - will skip if already exists)
DO $$
BEGIN
    -- Add unique_email constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates' 
        AND constraint_name = 'unique_email'
    ) THEN
        -- Only add if no duplicate emails exist
        IF NOT EXISTS (
            SELECT email FROM candidates 
            WHERE email IS NOT NULL 
            GROUP BY email 
            HAVING COUNT(*) > 1
        ) THEN
            ALTER TABLE candidates ADD CONSTRAINT unique_email UNIQUE(email);
            RAISE NOTICE '✓ Added unique_email constraint';
        END IF;
    END IF;
    
    -- Add unique_cccd constraint if column exists and constraint doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates' 
        AND column_name = 'so_cccd'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates' 
        AND constraint_name = 'unique_cccd'
    ) THEN
        -- Only add if no duplicate CCCD exist
        IF NOT EXISTS (
            SELECT so_cccd FROM candidates 
            WHERE so_cccd IS NOT NULL 
            GROUP BY so_cccd 
            HAVING COUNT(*) > 1
        ) THEN
            ALTER TABLE candidates ADD CONSTRAINT unique_cccd UNIQUE(so_cccd);
            RAISE NOTICE '✓ Added unique_cccd constraint';
        END IF;
    END IF;
    
    -- Ensure trang_thai check constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates' 
        AND column_name = 'trang_thai'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates' 
        AND constraint_name = 'candidates_trang_thai_check'
    ) THEN
        ALTER TABLE candidates 
        ADD CONSTRAINT candidates_trang_thai_check 
        CHECK (trang_thai IN (
            'NEW',
            'PENDING_INTERVIEW',
            'PENDING_MANAGER',
            'TRANSFERRED_TO_INTERVIEW',
            'WAITING_FOR_OTHER_APPROVAL',
            'READY_FOR_INTERVIEW',
            'PASSED',
            'FAILED',
            'ON_PROBATION'
        ));
        RAISE NOTICE '✓ Added candidates_trang_thai_check constraint';
    END IF;
END $$;
