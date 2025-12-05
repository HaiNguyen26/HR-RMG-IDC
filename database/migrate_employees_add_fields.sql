-- Migration: Thêm các trường mới vào bảng employees
-- Các trường: Mã Chấm Công, Loại Hợp Đồng, Địa điểm, Tính Thuế, Cấp Bậc

-- Thêm cột Mã Chấm Công
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'ma_cham_cong'
    ) THEN
        ALTER TABLE employees ADD COLUMN ma_cham_cong VARCHAR(255);
        COMMENT ON COLUMN employees.ma_cham_cong IS 'Mã chấm công của nhân viên';
    END IF;
END $$;

-- Thêm cột Loại Hợp Đồng
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'loai_hop_dong'
    ) THEN
        ALTER TABLE employees ADD COLUMN loai_hop_dong VARCHAR(255);
        COMMENT ON COLUMN employees.loai_hop_dong IS 'Loại hợp đồng (VD: Chính thức, Thử việc, Thời vụ)';
    END IF;
END $$;

-- Thêm cột Địa điểm
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'dia_diem'
    ) THEN
        ALTER TABLE employees ADD COLUMN dia_diem VARCHAR(255);
        COMMENT ON COLUMN employees.dia_diem IS 'Địa điểm làm việc';
    END IF;
END $$;

-- Thêm cột Tính Thuế
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'tinh_thue'
    ) THEN
        ALTER TABLE employees ADD COLUMN tinh_thue VARCHAR(50);
        COMMENT ON COLUMN employees.tinh_thue IS 'Tính thuế (VD: Có, Không)';
    END IF;
END $$;

-- Thêm cột Cấp Bậc
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'cap_bac'
    ) THEN
        ALTER TABLE employees ADD COLUMN cap_bac VARCHAR(255);
        COMMENT ON COLUMN employees.cap_bac IS 'Cấp bậc của nhân viên';
    END IF;
END $$;

-- Tạo index cho mã chấm công nếu cần
CREATE INDEX IF NOT EXISTS idx_employees_ma_cham_cong ON employees(ma_cham_cong) WHERE ma_cham_cong IS NOT NULL;

