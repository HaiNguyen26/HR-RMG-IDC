-- ============================================
-- SCHEMA: INTERVIEW REQUESTS (Yêu cầu phỏng vấn)
-- ============================================

-- Bảng: interview_requests (Yêu cầu phỏng vấn)
CREATE TABLE IF NOT EXISTS interview_requests (
    id SERIAL PRIMARY KEY,
    
    -- Thông tin ứng viên
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    
    -- Thông tin quản lý
    manager_id INTEGER, -- Quản lý trực tiếp (từ employees.id)
    branch_director_id INTEGER, -- Giám đốc chi nhánh (từ employees.id)
    
    -- Thông tin phỏng vấn
    interview_date DATE,
    interview_time TIME,
    interview_location VARCHAR(255),
    
    -- Trạng thái và đánh giá
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',              -- Chờ duyệt
        'PENDING_EVALUATION',    -- Chờ đánh giá tiêu chí
        'APPROVED',              -- Đã duyệt
        'REJECTED'               -- Đã từ chối
    )),
    
    -- Đánh giá của quản lý trực tiếp
    direct_manager_evaluated BOOLEAN DEFAULT FALSE,
    direct_manager_evaluation JSONB, -- Lưu đánh giá chi tiết (criteria, strengths, etc.)
    direct_manager_evaluated_at TIMESTAMP WITHOUT TIME ZONE,
    
    -- Đánh giá của giám đốc chi nhánh
    branch_director_evaluated BOOLEAN DEFAULT FALSE,
    branch_director_evaluation JSONB,
    branch_director_evaluated_at TIMESTAMP WITHOUT TIME ZONE,
    
    -- Ghi chú
    notes TEXT,
    rejection_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_interview_requests_candidate_id ON interview_requests(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interview_requests_manager_id ON interview_requests(manager_id);
CREATE INDEX IF NOT EXISTS idx_interview_requests_branch_director_id ON interview_requests(branch_director_id);
CREATE INDEX IF NOT EXISTS idx_interview_requests_status ON interview_requests(status);
CREATE INDEX IF NOT EXISTS idx_interview_requests_created_at ON interview_requests(created_at DESC);

-- Comments
COMMENT ON TABLE interview_requests IS 'Bảng lưu yêu cầu phỏng vấn ứng viên';
COMMENT ON COLUMN interview_requests.manager_id IS 'ID quản lý trực tiếp (từ employees.id)';
COMMENT ON COLUMN interview_requests.branch_director_id IS 'ID giám đốc chi nhánh (từ employees.id)';
COMMENT ON COLUMN interview_requests.status IS 'Trạng thái: PENDING, PENDING_EVALUATION, APPROVED, REJECTED';
COMMENT ON COLUMN interview_requests.direct_manager_evaluation IS 'JSON chứa đánh giá chi tiết của quản lý trực tiếp';
COMMENT ON COLUMN interview_requests.branch_director_evaluation IS 'JSON chứa đánh giá chi tiết của giám đốc chi nhánh';

-- Trigger: Tự động cập nhật updated_at
CREATE TRIGGER update_interview_requests_updated_at BEFORE UPDATE ON interview_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SCHEMA: RECRUITMENT REQUESTS (Yêu cầu tuyển dụng)
-- ============================================

-- Bảng: recruitment_requests (Yêu cầu tuyển dụng)
CREATE TABLE IF NOT EXISTS recruitment_requests (
    id SERIAL PRIMARY KEY,
    
    -- Thông tin yêu cầu
    chuc_danh_can_tuyen VARCHAR(255) NOT NULL,
    so_luong_yeu_cau INTEGER NOT NULL,
    phong_ban VARCHAR(255),
    nguoi_quan_ly_truc_tiep VARCHAR(255),
    
    -- Mô tả công việc
    mo_ta_cong_viec TEXT,
    loai_lao_dong VARCHAR(50), -- 'thoi_vu' hoặc 'toan_thoi_gian'
    
    -- Lý do tuyển
    ly_do_tuyen JSONB, -- Lưu các lý do (tuyenThayThe, nhuCauTang, etc.)
    ly_do_khac_ghi_chu TEXT,
    
    -- Tiêu chuẩn tuyển chọn
    tieu_chuan_tuyen_chon JSONB, -- Lưu toàn bộ tiêu chuẩn
    
    -- Trạng thái
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',      -- Chờ duyệt
        'APPROVED',     -- Đã duyệt
        'REJECTED'      -- Đã từ chối
    )),
    
    -- Duyệt bởi giám đốc chi nhánh
    branch_director_id INTEGER, -- ID giám đốc chi nhánh duyệt
    branch_director_decision VARCHAR(20), -- 'APPROVED' hoặc 'REJECTED'
    branch_director_notes TEXT,
    branch_director_decision_at TIMESTAMP WITHOUT TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recruitment_requests_status ON recruitment_requests(status);
CREATE INDEX IF NOT EXISTS idx_recruitment_requests_branch_director_id ON recruitment_requests(branch_director_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_requests_created_at ON recruitment_requests(created_at DESC);

-- Comments
COMMENT ON TABLE recruitment_requests IS 'Bảng lưu yêu cầu tuyển dụng';
COMMENT ON COLUMN recruitment_requests.branch_director_id IS 'ID giám đốc chi nhánh duyệt yêu cầu';

-- Trigger: Tự động cập nhật updated_at
CREATE TRIGGER update_recruitment_requests_updated_at BEFORE UPDATE ON recruitment_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

