-- ============================================
-- MIGRATION: Thêm cột created_by_employee_id vào bảng recruitment_requests
-- ============================================
-- Mô tả: Bảng recruitment_requests có thể đã được tạo với schema cũ (từ create_interview_requests_schema.sql)
--        nhưng code mới cần cột created_by_employee_id. Migration này sẽ:
--        1. Kiểm tra xem cột đã tồn tại chưa
--        2. Thêm cột nếu chưa tồn tại
--        3. Thêm các cột khác còn thiếu nếu có
-- Created: 2025-01-XX

BEGIN;

-- Kiểm tra và thêm cột created_by_employee_id nếu chưa tồn tại
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recruitment_requests' 
        AND column_name = 'created_by_employee_id'
    ) THEN
        -- Thêm cột created_by_employee_id
        ALTER TABLE recruitment_requests 
        ADD COLUMN created_by_employee_id INTEGER;
        
        -- Thêm foreign key constraint nếu bảng employees tồn tại
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'employees'
        ) THEN
            ALTER TABLE recruitment_requests
            ADD CONSTRAINT fk_recruitment_requests_created_by_employee 
            FOREIGN KEY (created_by_employee_id) 
            REFERENCES employees(id) 
            ON DELETE CASCADE;
        END IF;
        
        RAISE NOTICE 'Đã thêm cột created_by_employee_id vào bảng recruitment_requests';
    ELSE
        RAISE NOTICE 'Cột created_by_employee_id đã tồn tại';
    END IF;
END $$;

-- Kiểm tra và thêm cột branch_director_id nếu chưa tồn tại
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recruitment_requests' 
        AND column_name = 'branch_director_id'
    ) THEN
        -- Thêm cột branch_director_id
        ALTER TABLE recruitment_requests 
        ADD COLUMN branch_director_id INTEGER;
        
        -- Thêm foreign key constraint nếu bảng employees tồn tại
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'employees'
        ) THEN
            ALTER TABLE recruitment_requests
            ADD CONSTRAINT fk_recruitment_requests_branch_director 
            FOREIGN KEY (branch_director_id) 
            REFERENCES employees(id) 
            ON DELETE SET NULL;
        END IF;
        
        RAISE NOTICE 'Đã thêm cột branch_director_id vào bảng recruitment_requests';
    ELSE
        RAISE NOTICE 'Cột branch_director_id đã tồn tại';
    END IF;
END $$;

-- Kiểm tra và thêm các cột khác còn thiếu
DO $$
BEGIN
    -- Thêm phong_ban_bo_phan nếu chưa có (có thể đã có phong_ban)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recruitment_requests' 
        AND column_name = 'phong_ban_bo_phan'
    ) THEN
        -- Kiểm tra xem có cột phong_ban không
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'recruitment_requests' 
            AND column_name = 'phong_ban'
        ) THEN
            -- Copy dữ liệu từ phong_ban sang phong_ban_bo_phan
            ALTER TABLE recruitment_requests 
            ADD COLUMN phong_ban_bo_phan VARCHAR(255);
            
            UPDATE recruitment_requests 
            SET phong_ban_bo_phan = phong_ban 
            WHERE phong_ban_bo_phan IS NULL AND phong_ban IS NOT NULL;
        ELSE
            ALTER TABLE recruitment_requests 
            ADD COLUMN phong_ban_bo_phan VARCHAR(255);
        END IF;
        
        RAISE NOTICE 'Đã thêm cột phong_ban_bo_phan';
    END IF;
    
    -- Thêm nguoi_quan_ly_gian_tiep nếu chưa có
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recruitment_requests' 
        AND column_name = 'nguoi_quan_ly_gian_tiep'
    ) THEN
        ALTER TABLE recruitment_requests 
        ADD COLUMN nguoi_quan_ly_gian_tiep VARCHAR(255);
        RAISE NOTICE 'Đã thêm cột nguoi_quan_ly_gian_tiep';
    END IF;
    
    -- Cập nhật mo_ta_cong_viec nếu đang là TEXT và cần là VARCHAR(20) với CHECK constraint
    -- Nhưng không thay đổi nếu đã có dữ liệu, chỉ thêm constraint nếu chưa có
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recruitment_requests' 
        AND column_name = 'mo_ta_cong_viec'
        AND data_type = 'text'
    ) THEN
        -- Không thay đổi type nếu đã có dữ liệu, chỉ đảm bảo có constraint
        -- Chỉ log thông báo
        RAISE NOTICE 'Cột mo_ta_cong_viec đang là TEXT (có thể cần chuyển sang VARCHAR(20) nếu chưa có dữ liệu)';
    END IF;
END $$;

-- Kiểm tra và thêm TẤT CẢ các cột còn thiếu một lần
DO $$
BEGIN
    -- Các cột thông tin cơ bản
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'chuc_danh_can_tuyen') THEN
        ALTER TABLE recruitment_requests ADD COLUMN chuc_danh_can_tuyen VARCHAR(255);
        RAISE NOTICE 'Đã thêm cột chuc_danh_can_tuyen';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'nguoi_quan_ly_truc_tiep') THEN
        ALTER TABLE recruitment_requests ADD COLUMN nguoi_quan_ly_truc_tiep VARCHAR(255);
        RAISE NOTICE 'Đã thêm cột nguoi_quan_ly_truc_tiep';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'mo_ta_cong_viec') THEN
        ALTER TABLE recruitment_requests ADD COLUMN mo_ta_cong_viec VARCHAR(20);
        RAISE NOTICE 'Đã thêm cột mo_ta_cong_viec';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'yeu_cau_chi_tiet_cong_viec') THEN
        ALTER TABLE recruitment_requests ADD COLUMN yeu_cau_chi_tiet_cong_viec TEXT;
        RAISE NOTICE 'Đã thêm cột yeu_cau_chi_tiet_cong_viec';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'ly_do_khac_ghi_chu') THEN
        ALTER TABLE recruitment_requests ADD COLUMN ly_do_khac_ghi_chu TEXT;
        RAISE NOTICE 'Đã thêm cột ly_do_khac_ghi_chu';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'so_luong_yeu_cau') THEN
        ALTER TABLE recruitment_requests ADD COLUMN so_luong_yeu_cau INTEGER DEFAULT 1;
        RAISE NOTICE 'Đã thêm cột so_luong_yeu_cau';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'loai_lao_dong') THEN
        ALTER TABLE recruitment_requests ADD COLUMN loai_lao_dong VARCHAR(20);
        RAISE NOTICE 'Đã thêm cột loai_lao_dong';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'ly_do_tuyen') THEN
        ALTER TABLE recruitment_requests ADD COLUMN ly_do_tuyen VARCHAR(20);
        RAISE NOTICE 'Đã thêm cột ly_do_tuyen';
    END IF;

    -- Các cột tiêu chuẩn tuyển dụng
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'gioi_tinh') THEN
        ALTER TABLE recruitment_requests ADD COLUMN gioi_tinh VARCHAR(20) DEFAULT 'bat_ky';
        RAISE NOTICE 'Đã thêm cột gioi_tinh';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'do_tuoi') THEN
        ALTER TABLE recruitment_requests ADD COLUMN do_tuoi VARCHAR(50);
        RAISE NOTICE 'Đã thêm cột do_tuoi';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'trinh_do_hoc_van_yeu_cau') THEN
        ALTER TABLE recruitment_requests ADD COLUMN trinh_do_hoc_van_yeu_cau TEXT;
        RAISE NOTICE 'Đã thêm cột trinh_do_hoc_van_yeu_cau';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'kinh_nghiem_chuyen_mon') THEN
        ALTER TABLE recruitment_requests ADD COLUMN kinh_nghiem_chuyen_mon VARCHAR(20) DEFAULT 'khong_yeu_cau';
        RAISE NOTICE 'Đã thêm cột kinh_nghiem_chuyen_mon';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'chi_tiet_kinh_nghiem') THEN
        ALTER TABLE recruitment_requests ADD COLUMN chi_tiet_kinh_nghiem TEXT;
        RAISE NOTICE 'Đã thêm cột chi_tiet_kinh_nghiem';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'kien_thuc_chuyen_mon_khac') THEN
        ALTER TABLE recruitment_requests ADD COLUMN kien_thuc_chuyen_mon_khac TEXT;
        RAISE NOTICE 'Đã thêm cột kien_thuc_chuyen_mon_khac';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'yeu_cau_ngoai_ngu') THEN
        ALTER TABLE recruitment_requests ADD COLUMN yeu_cau_ngoai_ngu TEXT;
        RAISE NOTICE 'Đã thêm cột yeu_cau_ngoai_ngu';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'yeu_cau_vi_tinh_ky_nang_khac') THEN
        ALTER TABLE recruitment_requests ADD COLUMN yeu_cau_vi_tinh_ky_nang_khac TEXT;
        RAISE NOTICE 'Đã thêm cột yeu_cau_vi_tinh_ky_nang_khac';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'ky_nang_giao_tiep') THEN
        ALTER TABLE recruitment_requests ADD COLUMN ky_nang_giao_tiep TEXT;
        RAISE NOTICE 'Đã thêm cột ky_nang_giao_tiep';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'thai_do_lam_viec') THEN
        ALTER TABLE recruitment_requests ADD COLUMN thai_do_lam_viec TEXT;
        RAISE NOTICE 'Đã thêm cột thai_do_lam_viec';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'ky_nang_quan_ly') THEN
        ALTER TABLE recruitment_requests ADD COLUMN ky_nang_quan_ly TEXT;
        RAISE NOTICE 'Đã thêm cột ky_nang_quan_ly';
    END IF;

    -- Các cột trạng thái
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'status') THEN
        ALTER TABLE recruitment_requests ADD COLUMN status VARCHAR(20) DEFAULT 'PENDING';
        RAISE NOTICE 'Đã thêm cột status';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'rejection_reason') THEN
        ALTER TABLE recruitment_requests ADD COLUMN rejection_reason TEXT;
        RAISE NOTICE 'Đã thêm cột rejection_reason';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'approved_at') THEN
        ALTER TABLE recruitment_requests ADD COLUMN approved_at TIMESTAMP;
        RAISE NOTICE 'Đã thêm cột approved_at';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'rejected_at') THEN
        ALTER TABLE recruitment_requests ADD COLUMN rejected_at TIMESTAMP;
        RAISE NOTICE 'Đã thêm cột rejected_at';
    END IF;

    -- Các cột timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'created_at') THEN
        ALTER TABLE recruitment_requests ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Đã thêm cột created_at';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruitment_requests' AND column_name = 'updated_at') THEN
        ALTER TABLE recruitment_requests ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Đã thêm cột updated_at';
    END IF;
END $$;

-- Tạo indexes nếu chưa tồn tại
CREATE INDEX IF NOT EXISTS idx_recruitment_requests_created_by 
ON recruitment_requests(created_by_employee_id);

CREATE INDEX IF NOT EXISTS idx_recruitment_requests_branch_director 
ON recruitment_requests(branch_director_id);

COMMIT;
