-- Migration: Cho phép cột reason trong attendance_adjustments có thể NULL
-- Ngày tạo: 2025-01-XX
-- Mô tả: Cập nhật bảng attendance_adjustments để cho phép reason là NULL
--         vì các loại bổ sung chấm công không cần lý do

-- ============================================================
-- 1. Kiểm tra và cập nhật cột reason
-- ============================================================

DO $$
BEGIN
    -- Kiểm tra xem cột reason có tồn tại không
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'attendance_adjustments' 
        AND column_name = 'reason'
    ) THEN
        -- Cập nhật các giá trị NULL hiện tại thành empty string (nếu có)
        UPDATE attendance_adjustments 
        SET reason = '' 
        WHERE reason IS NULL;
        
        -- Thay đổi cột reason từ NOT NULL thành cho phép NULL
        ALTER TABLE attendance_adjustments 
        ALTER COLUMN reason DROP NOT NULL;
        
        RAISE NOTICE '✓ Đã cập nhật cột reason trong attendance_adjustments để cho phép NULL';
    ELSE
        RAISE NOTICE '⚠ Cột reason không tồn tại trong bảng attendance_adjustments';
    END IF;
END $$;

-- ============================================================
-- 2. Kiểm tra kết quả
-- ============================================================

DO $$
BEGIN
    -- Kiểm tra constraint của cột reason
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'attendance_adjustments' 
        AND column_name = 'reason'
        AND is_nullable = 'YES'
    ) THEN
        RAISE NOTICE '✅ Cột reason đã được cập nhật thành công - cho phép NULL';
    ELSE
        RAISE NOTICE '⚠ Cột reason vẫn còn NOT NULL constraint';
    END IF;
END $$;

