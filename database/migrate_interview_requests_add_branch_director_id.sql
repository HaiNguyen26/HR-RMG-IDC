-- ============================================
-- MIGRATION: Thêm các cột còn thiếu vào bảng interview_requests
-- ============================================
-- Mô tả: Bảng interview_requests có thể đã được tạo với schema cũ nhưng code mới cần các cột:
--        - branch_director_id
--        - recruitment_request_id
--        Migration này sẽ:
--        1. Kiểm tra xem các cột đã tồn tại chưa
--        2. Thêm cột nếu chưa tồn tại
--        3. Thêm foreign key constraint nếu có thể
--        4. Tạo index nếu chưa có
-- Created: 2025-01-XX

BEGIN;

-- Kiểm tra và thêm cột branch_director_id nếu chưa tồn tại
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'interview_requests' 
        AND column_name = 'branch_director_id'
    ) THEN
        -- Thêm cột branch_director_id
        ALTER TABLE interview_requests 
        ADD COLUMN branch_director_id INTEGER;
        
        -- Thêm foreign key constraint nếu bảng employees tồn tại
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'employees'
        ) THEN
            ALTER TABLE interview_requests
            ADD CONSTRAINT fk_interview_requests_branch_director 
            FOREIGN KEY (branch_director_id) 
            REFERENCES employees(id) 
            ON DELETE SET NULL;
        END IF;
        
        RAISE NOTICE 'Đã thêm cột branch_director_id vào bảng interview_requests';
    ELSE
        RAISE NOTICE 'Cột branch_director_id đã tồn tại';
    END IF;
END $$;

-- Kiểm tra và thêm cột recruitment_request_id nếu chưa tồn tại
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'interview_requests' 
        AND column_name = 'recruitment_request_id'
    ) THEN
        -- Thêm cột recruitment_request_id
        ALTER TABLE interview_requests 
        ADD COLUMN recruitment_request_id INTEGER;
        
        -- Thêm foreign key constraint nếu bảng recruitment_requests tồn tại
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'recruitment_requests'
        ) THEN
            ALTER TABLE interview_requests
            ADD CONSTRAINT fk_interview_requests_recruitment_request 
            FOREIGN KEY (recruitment_request_id) 
            REFERENCES recruitment_requests(id) 
            ON DELETE SET NULL;
        END IF;
        
        RAISE NOTICE 'Đã thêm cột recruitment_request_id vào bảng interview_requests';
    ELSE
        RAISE NOTICE 'Cột recruitment_request_id đã tồn tại';
    END IF;
END $$;

-- Tạo indexes nếu chưa tồn tại
CREATE INDEX IF NOT EXISTS idx_interview_requests_director 
ON interview_requests(branch_director_id);

COMMIT;
