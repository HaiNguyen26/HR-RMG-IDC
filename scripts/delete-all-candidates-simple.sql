-- ⚠️ CẢNH BÁO: Script này sẽ XÓA TOÀN BỘ ứng viên trong database
-- Chỉ chạy nếu bạn chắc chắn muốn xóa tất cả!

-- Xóa toàn bộ ứng viên
DELETE FROM candidates;

-- Kiểm tra kết quả
SELECT COUNT(*) as remaining_candidates FROM candidates;

