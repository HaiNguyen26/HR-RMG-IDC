-- ============================================
-- Migration: Đảm bảo đầy đủ schema cho candidates
-- ============================================
-- Script này đảm bảo:
-- 1. Tất cả các cột trong bảng candidates tồn tại (bao gồm anh_dai_dien_path, cv_dinh_kem_path)
-- 2. Các bảng liên quan tồn tại (candidate_work_experiences, candidate_training_processes, candidate_foreign_languages)
-- 3. Các indexes và constraints cần thiết
-- ============================================
-- An toàn để chạy nhiều lần - chỉ thêm các cột/bảng chưa tồn tại
-- ============================================

-- Bước 1: Đảm bảo các cột trong bảng candidates tồn tại
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates'
    ) THEN
        RAISE NOTICE 'Starting migration for candidates table...';
        
        -- File đính kèm (QUAN TRỌNG - cần cho cập nhật ứng viên)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'anh_dai_dien_path') THEN
            ALTER TABLE candidates ADD COLUMN anh_dai_dien_path VARCHAR(500);
            RAISE NOTICE '✓ Added column anh_dai_dien_path';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'cv_dinh_kem_path') THEN
            ALTER TABLE candidates ADD COLUMN cv_dinh_kem_path VARCHAR(500);
            RAISE NOTICE '✓ Added column cv_dinh_kem_path';
        END IF;
        
        -- Các cột khác (nếu chưa có)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'ngay_gui_cv') THEN
            ALTER TABLE candidates ADD COLUMN ngay_gui_cv DATE;
            RAISE NOTICE '✓ Added column ngay_gui_cv';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'nguon_cv') THEN
            ALTER TABLE candidates ADD COLUMN nguon_cv VARCHAR(255);
            RAISE NOTICE '✓ Added column nguon_cv';
        END IF;
        
        -- Đảm bảo các cột thông tin cá nhân tồn tại
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'gioi_tinh') THEN
            ALTER TABLE candidates ADD COLUMN gioi_tinh VARCHAR(10) DEFAULT 'Nam';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'ngay_sinh') THEN
            ALTER TABLE candidates ADD COLUMN ngay_sinh DATE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'noi_sinh') THEN
            ALTER TABLE candidates ADD COLUMN noi_sinh VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'tinh_trang_hon_nhan') THEN
            ALTER TABLE candidates ADD COLUMN tinh_trang_hon_nhan VARCHAR(20) DEFAULT 'Độc thân';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'dan_toc') THEN
            ALTER TABLE candidates ADD COLUMN dan_toc VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'quoc_tich') THEN
            ALTER TABLE candidates ADD COLUMN quoc_tich VARCHAR(100) DEFAULT 'Việt Nam';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'ton_giao') THEN
            ALTER TABLE candidates ADD COLUMN ton_giao VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'so_cccd') THEN
            ALTER TABLE candidates ADD COLUMN so_cccd VARCHAR(20);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'ngay_cap_cccd') THEN
            ALTER TABLE candidates ADD COLUMN ngay_cap_cccd DATE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'noi_cap_cccd') THEN
            ALTER TABLE candidates ADD COLUMN noi_cap_cccd VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'nguyen_quan') THEN
            ALTER TABLE candidates ADD COLUMN nguyen_quan VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'so_dien_thoai_khac') THEN
            ALTER TABLE candidates ADD COLUMN so_dien_thoai_khac VARCHAR(20);
        END IF;
        
        -- Địa chỉ tạm trú
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'dia_chi_tam_tru_so_nha') THEN
            ALTER TABLE candidates ADD COLUMN dia_chi_tam_tru_so_nha VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'dia_chi_tam_tru_phuong_xa') THEN
            ALTER TABLE candidates ADD COLUMN dia_chi_tam_tru_phuong_xa VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'dia_chi_tam_tru_quan_huyen') THEN
            ALTER TABLE candidates ADD COLUMN dia_chi_tam_tru_quan_huyen VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'dia_chi_tam_tru_thanh_pho_tinh') THEN
            ALTER TABLE candidates ADD COLUMN dia_chi_tam_tru_thanh_pho_tinh VARCHAR(255);
        END IF;
        
        -- Nguyên quán
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'nguyen_quan_so_nha') THEN
            ALTER TABLE candidates ADD COLUMN nguyen_quan_so_nha VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'nguyen_quan_phuong_xa') THEN
            ALTER TABLE candidates ADD COLUMN nguyen_quan_phuong_xa VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'nguyen_quan_quan_huyen') THEN
            ALTER TABLE candidates ADD COLUMN nguyen_quan_quan_huyen VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'nguyen_quan_thanh_pho_tinh') THEN
            ALTER TABLE candidates ADD COLUMN nguyen_quan_thanh_pho_tinh VARCHAR(255);
        END IF;
        
        -- Trình độ học vấn
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'trinh_do_van_hoa') THEN
            ALTER TABLE candidates ADD COLUMN trinh_do_van_hoa VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'trinh_do_chuyen_mon') THEN
            ALTER TABLE candidates ADD COLUMN trinh_do_chuyen_mon VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'chuyen_nganh') THEN
            ALTER TABLE candidates ADD COLUMN chuyen_nganh VARCHAR(255);
        END IF;
        
        -- Thông tin ứng tuyển
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'chi_nhanh') THEN
            ALTER TABLE candidates ADD COLUMN chi_nhanh VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'vi_tri_ung_tuyen') THEN
            ALTER TABLE candidates ADD COLUMN vi_tri_ung_tuyen VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'phong_ban') THEN
            ALTER TABLE candidates ADD COLUMN phong_ban VARCHAR(255);
        END IF;
        
        -- Trạng thái
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'trang_thai') THEN
            ALTER TABLE candidates ADD COLUMN trang_thai VARCHAR(50) DEFAULT 'NEW';
        END IF;
        
        -- Metadata
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'created_at') THEN
            ALTER TABLE candidates ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'updated_at') THEN
            ALTER TABLE candidates ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'created_by') THEN
            ALTER TABLE candidates ADD COLUMN created_by INTEGER;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'probation_start_date') THEN
            ALTER TABLE candidates ADD COLUMN probation_start_date DATE;
        END IF;
        
        RAISE NOTICE '✓ Candidates table columns migration completed';
    ELSE
        RAISE NOTICE 'Candidates table does not exist, skipping column migration';
    END IF;
END $$;

-- Bước 2: Đảm bảo các bảng liên quan tồn tại (từ ensure_candidate_related_tables.sql)
\i database/ensure_candidate_related_tables.sql

-- Bước 3: Đảm bảo indexes tồn tại
CREATE INDEX IF NOT EXISTS idx_candidates_ho_ten ON candidates(ho_ten);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_trang_thai ON candidates(trang_thai);
CREATE INDEX IF NOT EXISTS idx_candidates_chi_nhanh ON candidates(chi_nhanh);
CREATE INDEX IF NOT EXISTS idx_candidates_vi_tri_ung_tuyen ON candidates(vi_tri_ung_tuyen);
CREATE INDEX IF NOT EXISTS idx_candidates_phong_ban ON candidates(phong_ban);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_ngay_gui_cv ON candidates(ngay_gui_cv DESC);

-- Bước 4: Đảm bảo trigger updated_at tồn tại
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_candidates_updated_at ON candidates;
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Hoàn thành
-- ============================================
SELECT 'Migration completed: All candidate tables, columns, indexes, and triggers ensured' AS result;

