-- ============================================================
-- CREATE CANDIDATE RELATED TABLES
-- ============================================================
-- Migration: Tạo các bảng liên quan đến candidates
--   - candidate_work_experiences (Kinh nghiệm làm việc)
--   - candidate_training_processes (Quá trình đào tạo)
--   - candidate_foreign_languages (Trình độ ngoại ngữ)
-- ============================================================
-- Description: Đảm bảo các bảng con của candidates tồn tại
-- ============================================================

-- Tạo function update_updated_at_column trước (bên ngoài DO block)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DO $$
BEGIN
    -- Kiểm tra xem bảng candidates có tồn tại không
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'candidates'
    ) THEN
        RAISE NOTICE 'Bảng candidates không tồn tại, bỏ qua tạo các bảng con';
    ELSE
        RAISE NOTICE 'Bắt đầu tạo các bảng liên quan đến candidates...';

        -- ============================================================
        -- Bảng: candidate_work_experiences (Kinh nghiệm làm việc)
        -- ============================================================
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'candidate_work_experiences'
        ) THEN
            CREATE TABLE candidate_work_experiences (
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
            
            RAISE NOTICE '✓ Đã tạo bảng candidate_work_experiences';
        ELSE
            RAISE NOTICE '⚠ Bảng candidate_work_experiences đã tồn tại';
        END IF;

        -- ============================================================
        -- Bảng: candidate_training_processes (Quá trình đào tạo)
        -- ============================================================
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'candidate_training_processes'
        ) THEN
            CREATE TABLE candidate_training_processes (
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
            
            RAISE NOTICE '✓ Đã tạo bảng candidate_training_processes';
        ELSE
            RAISE NOTICE '⚠ Bảng candidate_training_processes đã tồn tại';
        END IF;

        -- ============================================================
        -- Bảng: candidate_foreign_languages (Trình độ ngoại ngữ)
        -- ============================================================
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'candidate_foreign_languages'
        ) THEN
            CREATE TABLE candidate_foreign_languages (
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
            
            RAISE NOTICE '✓ Đã tạo bảng candidate_foreign_languages';
        ELSE
            RAISE NOTICE '⚠ Bảng candidate_foreign_languages đã tồn tại';
        END IF;

        RAISE NOTICE '✓ Đã tạo/kiểm tra function update_updated_at_column';

        -- ============================================================
        -- Tạo triggers cho các bảng (chỉ tạo nếu bảng tồn tại)
        -- ============================================================
        
        -- Trigger cho candidate_work_experiences
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'candidate_work_experiences'
        ) THEN
            DROP TRIGGER IF EXISTS update_work_experiences_updated_at ON candidate_work_experiences;
            CREATE TRIGGER update_work_experiences_updated_at 
                BEFORE UPDATE ON candidate_work_experiences
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            RAISE NOTICE '✓ Đã tạo trigger update_work_experiences_updated_at';
        END IF;

        -- Trigger cho candidate_training_processes
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'candidate_training_processes'
        ) THEN
            DROP TRIGGER IF EXISTS update_training_processes_updated_at ON candidate_training_processes;
            CREATE TRIGGER update_training_processes_updated_at 
                BEFORE UPDATE ON candidate_training_processes
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            RAISE NOTICE '✓ Đã tạo trigger update_training_processes_updated_at';
        END IF;

        -- Trigger cho candidate_foreign_languages
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'candidate_foreign_languages'
        ) THEN
            DROP TRIGGER IF EXISTS update_foreign_languages_updated_at ON candidate_foreign_languages;
            CREATE TRIGGER update_foreign_languages_updated_at 
                BEFORE UPDATE ON candidate_foreign_languages
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            RAISE NOTICE '✓ Đã tạo trigger update_foreign_languages_updated_at';
        END IF;

        RAISE NOTICE '========================================';
        RAISE NOTICE '✅ Hoàn thành tạo các bảng liên quan đến candidates';
        RAISE NOTICE '========================================';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Lỗi khi tạo các bảng: %', SQLERRM;
        RAISE;
END $$;
