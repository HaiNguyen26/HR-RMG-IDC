-- ============================================
-- Migration: Đảm bảo các bảng liên quan đến candidates tồn tại
-- ============================================
-- Script này đảm bảo các bảng candidate_work_experiences, 
-- candidate_training_processes, và candidate_foreign_languages tồn tại
-- ============================================

-- Bảng: candidate_work_experiences (Kinh nghiệm làm việc)
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

-- Bảng: candidate_training_processes (Quá trình đào tạo)
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

-- Bảng: candidate_foreign_languages (Trình độ ngoại ngữ)
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
-- Trigger: Tự động cập nhật updated_at (nếu chưa tồn tại)
-- ============================================
-- Tạo function nếu chưa tồn tại
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Tạo trigger cho candidate_work_experiences (DROP IF EXISTS trước khi tạo)
DROP TRIGGER IF EXISTS update_work_experiences_updated_at ON candidate_work_experiences;
CREATE TRIGGER update_work_experiences_updated_at BEFORE UPDATE ON candidate_work_experiences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tạo trigger cho candidate_training_processes
DROP TRIGGER IF EXISTS update_training_processes_updated_at ON candidate_training_processes;
CREATE TRIGGER update_training_processes_updated_at BEFORE UPDATE ON candidate_training_processes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tạo trigger cho candidate_foreign_languages
DROP TRIGGER IF EXISTS update_foreign_languages_updated_at ON candidate_foreign_languages;
CREATE TRIGGER update_foreign_languages_updated_at BEFORE UPDATE ON candidate_foreign_languages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Hoàn thành
-- ============================================
SELECT 'Migration completed: candidate_work_experiences, candidate_training_processes, candidate_foreign_languages tables ensured' AS result;

