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

-- Tạo indexes nếu chưa tồn tại
CREATE INDEX IF NOT EXISTS idx_recruitment_requests_created_by 
ON recruitment_requests(created_by_employee_id);

CREATE INDEX IF NOT EXISTS idx_recruitment_requests_branch_director 
ON recruitment_requests(branch_director_id);

COMMIT;
