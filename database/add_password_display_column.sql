-- Thêm cột password_display để lưu mật khẩu plaintext cho HR xem
-- Chỉ áp dụng cho bảng employees

DO $$
BEGIN
    -- Kiểm tra và thêm cột password_display nếu chưa tồn tại
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'employees' 
        AND column_name = 'password_display'
    ) THEN
        ALTER TABLE employees
        ADD COLUMN password_display VARCHAR(255);

        COMMENT ON COLUMN employees.password_display IS 'Mật khẩu plaintext để HR xem (chỉ cập nhật khi nhân viên đổi mật khẩu)';
    END IF;
END $$;
