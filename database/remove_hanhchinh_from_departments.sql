-- ============================================
-- REMOVE HANHCHINH FROM DEPARTMENTS
-- ============================================
-- Script này sẽ xóa trực tiếp giá trị HANHCHINH khỏi database
-- ============================================

BEGIN;

-- Xóa các placeholder candidates có phòng ban = HANHCHINH
DELETE FROM candidates 
WHERE phong_ban = 'HANHCHINH'
  AND (ho_ten LIKE '[Placeholder%' OR notes = 'Dữ liệu mẫu cho dropdown phòng ban');

-- Nếu có candidates thật có phòng ban = HANHCHINH, cập nhật thành 'Hành chính'
UPDATE candidates
SET phong_ban = 'Hành chính'
WHERE phong_ban = 'HANHCHINH'
  AND ho_ten NOT LIKE '[Placeholder%';

COMMIT;

-- Kiểm tra kết quả
DO $$
DECLARE
    hanhchinh_count INTEGER;
    hanh_chinh_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO hanhchinh_count 
    FROM candidates 
    WHERE phong_ban = 'HANHCHINH';
    
    SELECT COUNT(DISTINCT phong_ban) INTO hanh_chinh_count 
    FROM candidates 
    WHERE phong_ban = 'Hành chính';

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Đã xóa HANHCHINH khỏi database!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '⚠️  Còn lại HANHCHINH: %', hanhchinh_count;
    RAISE NOTICE '✅ Số lượng "Hành chính": %', hanh_chinh_count;
    RAISE NOTICE '========================================';
END $$;


