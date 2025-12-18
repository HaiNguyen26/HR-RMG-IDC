-- ============================================
-- SCHEMA: CANDIDATES (Ứng viên)
-- ============================================

-- Bảng chính: candidates (Ứng viên)
CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    
    -- I. THÔNG TIN CÁ NHÂN
    ho_ten VARCHAR(255) NOT NULL,
    gioi_tinh VARCHAR(10) DEFAULT 'Nam' CHECK (gioi_tinh IN ('Nam', 'Nữ', 'Khác')),
    ngay_sinh DATE,
    noi_sinh VARCHAR(255),
    tinh_trang_hon_nhan VARCHAR(20) DEFAULT 'Độc thân' CHECK (tinh_trang_hon_nhan IN ('Độc thân', 'Đã kết hôn', 'Ly hôn')),
    dan_toc VARCHAR(50),
    quoc_tich VARCHAR(100) DEFAULT 'Việt Nam',
    ton_giao VARCHAR(100),
    so_cccd VARCHAR(20),
    ngay_cap_cccd DATE,
    noi_cap_cccd VARCHAR(255),
    nguyen_quan VARCHAR(255),
    
    -- Thông tin liên lạc
    so_dien_thoai VARCHAR(20) NOT NULL,
    so_dien_thoai_khac VARCHAR(20),
    email VARCHAR(255) NOT NULL,
    
    -- Địa chỉ Tạm trú
    dia_chi_tam_tru_so_nha VARCHAR(255),
    dia_chi_tam_tru_phuong_xa VARCHAR(255),
    dia_chi_tam_tru_quan_huyen VARCHAR(255),
    dia_chi_tam_tru_thanh_pho_tinh VARCHAR(255),
    
    -- Nguyên quán
    nguyen_quan_so_nha VARCHAR(255),
    nguyen_quan_phuong_xa VARCHAR(255),
    nguyen_quan_quan_huyen VARCHAR(255),
    nguyen_quan_thanh_pho_tinh VARCHAR(255),
    
    -- Trình độ học vấn
    trinh_do_van_hoa VARCHAR(100),
    trinh_do_chuyen_mon VARCHAR(255),
    chuyen_nganh VARCHAR(255),
    
    -- Thông tin ứng tuyển
    chi_nhanh VARCHAR(255),
    vi_tri_ung_tuyen VARCHAR(255),
    phong_ban VARCHAR(255),
    
    -- File đính kèm (đường dẫn)
    anh_dai_dien_path VARCHAR(500),
    cv_dinh_kem_path VARCHAR(500),
    ngay_gui_cv DATE,
    nguon_cv VARCHAR(255),
    
    -- Trạng thái ứng viên
    trang_thai VARCHAR(50) DEFAULT 'NEW' CHECK (trang_thai IN (
        'NEW',                    -- Ứng viên mới
        'PENDING_INTERVIEW',      -- Chờ phỏng vấn
        'PENDING_MANAGER',        -- Đang chờ quản lý phỏng vấn
        'PASSED',                 -- Đã đậu
        'FAILED',                 -- Đã rớt
        'ON_PROBATION'            -- Đang thử việc
    )),
    
    -- Metadata
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT unique_email UNIQUE(email),
    CONSTRAINT unique_cccd UNIQUE(so_cccd)
);

-- Indexes cho bảng candidates
CREATE INDEX IF NOT EXISTS idx_candidates_ho_ten ON candidates(ho_ten);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_trang_thai ON candidates(trang_thai);
CREATE INDEX IF NOT EXISTS idx_candidates_chi_nhanh ON candidates(chi_nhanh);
CREATE INDEX IF NOT EXISTS idx_candidates_vi_tri_ung_tuyen ON candidates(vi_tri_ung_tuyen);
CREATE INDEX IF NOT EXISTS idx_candidates_phong_ban ON candidates(phong_ban);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates(created_at DESC);

-- Comments
COMMENT ON TABLE candidates IS 'Bảng lưu thông tin ứng viên';
COMMENT ON COLUMN candidates.trang_thai IS 'Trạng thái: NEW (Ứng viên mới), PENDING_INTERVIEW (Chờ phỏng vấn), PENDING_MANAGER (Đang chờ quản lý phỏng vấn), PASSED (Đã đậu), FAILED (Đã rớt)';

-- ============================================
-- Bảng: candidate_work_experiences (Kinh nghiệm làm việc)
-- ============================================
CREATE TABLE IF NOT EXISTS candidate_work_experiences (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    ngay_bat_dau DATE,
    ngay_ket_thuc DATE,
    cong_ty VARCHAR(255),
    chuc_danh VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_work_experiences_candidate_id ON candidate_work_experiences(candidate_id);

COMMENT ON TABLE candidate_work_experiences IS 'Bảng lưu kinh nghiệm làm việc của ứng viên';

-- ============================================
-- Bảng: candidate_training_processes (Quá trình đào tạo)
-- ============================================
CREATE TABLE IF NOT EXISTS candidate_training_processes (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    ngay_bat_dau DATE,
    ngay_ket_thuc DATE,
    truong_dao_tao VARCHAR(255),
    chuyen_nganh VARCHAR(255),
    van_bang VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_training_processes_candidate_id ON candidate_training_processes(candidate_id);

COMMENT ON TABLE candidate_training_processes IS 'Bảng lưu quá trình đào tạo của ứng viên';

-- ============================================
-- Bảng: candidate_foreign_languages (Trình độ ngoại ngữ)
-- ============================================
CREATE TABLE IF NOT EXISTS candidate_foreign_languages (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    ngoai_ngu VARCHAR(100),
    chung_chi VARCHAR(255),
    diem VARCHAR(50),
    kha_nang_su_dung VARCHAR(50) DEFAULT 'A: Giỏi',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_foreign_languages_candidate_id ON candidate_foreign_languages(candidate_id);

COMMENT ON TABLE candidate_foreign_languages IS 'Bảng lưu trình độ ngoại ngữ của ứng viên';

-- ============================================
-- Trigger: Tự động cập nhật updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_experiences_updated_at BEFORE UPDATE ON candidate_work_experiences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_processes_updated_at BEFORE UPDATE ON candidate_training_processes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_foreign_languages_updated_at BEFORE UPDATE ON candidate_foreign_languages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

