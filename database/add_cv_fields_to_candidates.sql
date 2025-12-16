-- Thêm 2 cột mới vào bảng candidates: ngay_gui_cv và nguon_cv

-- Kiểm tra và thêm cột ngay_gui_cv
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'candidates' AND column_name = 'ngay_gui_cv'
    ) THEN
        ALTER TABLE candidates ADD COLUMN ngay_gui_cv DATE;
        COMMENT ON COLUMN candidates.ngay_gui_cv IS 'Ngày ứng viên gửi CV';
    END IF;
END $$;

-- Kiểm tra và thêm cột nguon_cv
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'candidates' AND column_name = 'nguon_cv'
    ) THEN
        ALTER TABLE candidates ADD COLUMN nguon_cv VARCHAR(255);
        COMMENT ON COLUMN candidates.nguon_cv IS 'Nguồn CV (Website, Facebook, LinkedIn, v.v.)';
    END IF;
END $$;

-- Tạo index cho ngay_gui_cv để tối ưu tìm kiếm
CREATE INDEX IF NOT EXISTS idx_candidates_ngay_gui_cv ON candidates(ngay_gui_cv DESC);


