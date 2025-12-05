-- ============================================
-- CLEANUP OLD ENUM VALUES FROM CANDIDATES
-- ============================================
-- Script này sẽ xóa các bản ghi candidates có giá trị code enum cũ
-- (ví dụ: TAPVU_NAUAN, HANHCHINH) và chỉ giữ lại các giá trị tên đầy đủ
-- ============================================

BEGIN;

-- Xóa các placeholder candidates có giá trị code enum cũ trong phòng ban
DELETE FROM candidates 
WHERE ((phong_ban LIKE '%_%' AND phong_ban ~ '^[A-Z0-9_]+$')
   OR phong_ban IN ('TAPVU_NAUAN', 'HANHCHINH'))
   AND (ho_ten LIKE '[Placeholder%' OR notes = 'Dữ liệu mẫu cho dropdown phòng ban');

-- Xóa các placeholder candidates có giá trị code enum cũ trong vị trí ứng tuyển
DELETE FROM candidates 
WHERE ((vi_tri_ung_tuyen LIKE '%_%' AND vi_tri_ung_tuyen ~ '^[A-Z0-9_]+$')
   OR vi_tri_ung_tuyen IN ('TAPVU_NAUAN'))
   AND (ho_ten LIKE '[Placeholder%' OR notes = 'Dữ liệu mẫu cho dropdown vị trí ứng tuyển');

-- Cập nhật các bản ghi candidates thật (không phải placeholder) có giá trị code enum cũ
-- Thay thế bằng giá trị tên đầy đủ tương ứng
UPDATE candidates
SET phong_ban = CASE
    WHEN phong_ban = 'TAPVU_NAUAN' THEN 'Tạp vụ & nấu ăn'
    WHEN phong_ban = 'HANHCHINH' THEN 'Hành chính'
    ELSE phong_ban
END
WHERE phong_ban IN ('TAPVU_NAUAN', 'HANHCHINH')
  AND ho_ten NOT LIKE '[Placeholder%';

UPDATE candidates
SET vi_tri_ung_tuyen = CASE
    WHEN vi_tri_ung_tuyen = 'TAPVU_NAUAN' THEN 'Tạp vụ & nấu ăn'
    WHEN vi_tri_ung_tuyen = 'MUAHANG' THEN 'Mua hàng'
    WHEN vi_tri_ung_tuyen = 'HAN_BOMACH' THEN 'Hàn bo mạch'
    WHEN vi_tri_ung_tuyen = 'CHATLUONG' THEN 'Chất lượng'
    WHEN vi_tri_ung_tuyen = 'KHAOSAT_THIETKE' THEN 'Khảo sát thiết kế'
    WHEN vi_tri_ung_tuyen = 'ADMIN_DUAN' THEN 'Admin dự án'
    WHEN vi_tri_ung_tuyen = 'LAPRAP' THEN 'Lắp ráp'
    WHEN vi_tri_ung_tuyen = 'LAPRAP_JIG_PALLET' THEN 'Lắp ráp JIG, Pallet'
    WHEN vi_tri_ung_tuyen = 'DIEN_LAPTRINH_PLC' THEN 'Điện lập trình PLC'
    WHEN vi_tri_ung_tuyen = 'THIETKE_MAY_TUDONG' THEN 'Thiết kế máy tự động'
    WHEN vi_tri_ung_tuyen = 'VANHANH_MAY_CNC' THEN 'Vận hành máy CNC'
    WHEN vi_tri_ung_tuyen = 'DICHVU_KYTHUAT' THEN 'Dịch vụ Kỹ thuật'
    WHEN vi_tri_ung_tuyen = 'KETOAN_NOIBO' THEN 'Kế toán nội bộ'
    WHEN vi_tri_ung_tuyen = 'KETOAN_BANHANG' THEN 'Kế toán bán hàng'
    ELSE vi_tri_ung_tuyen
END
WHERE vi_tri_ung_tuyen ~ '^[A-Z0-9_]+$'
  AND ho_ten NOT LIKE '[Placeholder%';

COMMIT;

-- Hiển thị kết quả
DO $$
DECLARE
    dept_count INTEGER;
    pos_count INTEGER;
    old_dept_count INTEGER;
    old_pos_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT phong_ban) INTO dept_count 
    FROM candidates 
    WHERE phong_ban IS NOT NULL AND phong_ban != ''
      AND NOT (phong_ban ~ '^[A-Z0-9_]+$');
    
    SELECT COUNT(DISTINCT vi_tri_ung_tuyen) INTO pos_count 
    FROM candidates 
    WHERE vi_tri_ung_tuyen IS NOT NULL AND vi_tri_ung_tuyen != ''
      AND NOT (vi_tri_ung_tuyen ~ '^[A-Z0-9_]+$');

    SELECT COUNT(*) INTO old_dept_count 
    FROM candidates 
    WHERE phong_ban IS NOT NULL AND phong_ban ~ '^[A-Z0-9_]+$';
    
    SELECT COUNT(*) INTO old_pos_count 
    FROM candidates 
    WHERE vi_tri_ung_tuyen IS NOT NULL AND vi_tri_ung_tuyen ~ '^[A-Z0-9_]+$';

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Đã dọn dẹp dữ liệu code enum cũ!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 Số lượng phòng ban hợp lệ: %', dept_count;
    RAISE NOTICE '📊 Số lượng vị trí hợp lệ: %', pos_count;
    RAISE NOTICE '⚠️  Còn lại phòng ban code cũ: %', old_dept_count;
    RAISE NOTICE '⚠️  Còn lại vị trí code cũ: %', old_pos_count;
    RAISE NOTICE '========================================';
END $$;

