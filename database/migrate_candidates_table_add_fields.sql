-- ============================================
-- MIGRATE CANDIDATES TABLE - ADD NEW FIELDS
-- ============================================
-- Migration: Thêm các trường mới vào bảng candidates
-- Created: 2025-01-XX
-- Description: Thêm các trường thông tin cá nhân, kinh nghiệm, đào tạo, ngoại ngữ

-- Add personal information columns
DO $$ 
BEGIN
    -- Personal information fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='gioi_tinh') THEN
        ALTER TABLE candidates ADD COLUMN gioi_tinh VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='noi_sinh') THEN
        ALTER TABLE candidates ADD COLUMN noi_sinh VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='tinh_trang_hon_nhan') THEN
        ALTER TABLE candidates ADD COLUMN tinh_trang_hon_nhan VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='dan_toc') THEN
        ALTER TABLE candidates ADD COLUMN dan_toc VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='quoc_tich') THEN
        ALTER TABLE candidates ADD COLUMN quoc_tich VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='ton_giao') THEN
        ALTER TABLE candidates ADD COLUMN ton_giao VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='so_dien_thoai_khac') THEN
        ALTER TABLE candidates ADD COLUMN so_dien_thoai_khac VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='email') THEN
        ALTER TABLE candidates ADD COLUMN email VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='nguyen_quan') THEN
        ALTER TABLE candidates ADD COLUMN nguyen_quan VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='dia_chi_tam_tru') THEN
        ALTER TABLE candidates ADD COLUMN dia_chi_tam_tru TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='trinh_do_van_hoa') THEN
        ALTER TABLE candidates ADD COLUMN trinh_do_van_hoa VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='trinh_do_chuyen_mon') THEN
        ALTER TABLE candidates ADD COLUMN trinh_do_chuyen_mon VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='chuyen_nganh') THEN
        ALTER TABLE candidates ADD COLUMN chuyen_nganh VARCHAR(255);
    END IF;
    
    -- JSONB columns for arrays (work experience, training, language proficiency)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='kinh_nghiem_lam_viec') THEN
        ALTER TABLE candidates ADD COLUMN kinh_nghiem_lam_viec JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='qua_trinh_dao_tao') THEN
        ALTER TABLE candidates ADD COLUMN qua_trinh_dao_tao JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='trinh_do_ngoai_ngu') THEN
        ALTER TABLE candidates ADD COLUMN trinh_do_ngoai_ngu JSONB;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN candidates.gioi_tinh IS 'Giới tính';
COMMENT ON COLUMN candidates.noi_sinh IS 'Nơi sinh';
COMMENT ON COLUMN candidates.tinh_trang_hon_nhan IS 'Tình trạng hôn nhân';
COMMENT ON COLUMN candidates.dan_toc IS 'Dân tộc';
COMMENT ON COLUMN candidates.quoc_tich IS 'Quốc tịch';
COMMENT ON COLUMN candidates.ton_giao IS 'Tôn giáo';
COMMENT ON COLUMN candidates.so_dien_thoai_khac IS 'Số điện thoại khác';
COMMENT ON COLUMN candidates.email IS 'Email';
COMMENT ON COLUMN candidates.nguyen_quan IS 'Nguyên quán';
COMMENT ON COLUMN candidates.dia_chi_tam_tru IS 'Địa chỉ tạm trú';
COMMENT ON COLUMN candidates.trinh_do_van_hoa IS 'Trình độ văn hóa';
COMMENT ON COLUMN candidates.trinh_do_chuyen_mon IS 'Trình độ chuyên môn';
COMMENT ON COLUMN candidates.chuyen_nganh IS 'Chuyên ngành';
COMMENT ON COLUMN candidates.kinh_nghiem_lam_viec IS 'Kinh nghiệm làm việc (JSONB array)';
COMMENT ON COLUMN candidates.qua_trinh_dao_tao IS 'Quá trình đào tạo (JSONB array)';
COMMENT ON COLUMN candidates.trinh_do_ngoai_ngu IS 'Trình độ ngoại ngữ (JSONB array)';

