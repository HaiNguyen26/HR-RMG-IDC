-- ============================================
-- Script cập nhật quản lý trực tiếp cho nhân viên
-- ============================================
-- 
-- Usage:
-- 1. Thay thế 'Tên Quản Lý Trực Tiếp' bằng tên quản lý thực tế
-- 2. Thay thế 'Lê Thanh Tùng' bằng tên nhân viên cần cập nhật (nếu khác)
-- 3. Chạy script này trong PostgreSQL
--
-- ============================================

-- Cập nhật quản lý trực tiếp cho nhân viên "Lê Thanh Tùng"
UPDATE employees
SET quan_ly_truc_tiep = 'Tên Quản Lý Trực Tiếp',  -- ⚠️ THAY ĐỔI TÊN NÀY
    updated_at = CURRENT_TIMESTAMP
WHERE ho_ten = 'Lê Thanh Tùng'  -- ⚠️ THAY ĐỔI TÊN NÀY NẾU CẦN
  AND (quan_ly_truc_tiep IS NULL OR quan_ly_truc_tiep = '');

-- Kiểm tra kết quả
SELECT 
    id,
    ma_nhan_vien,
    ho_ten,
    quan_ly_truc_tiep,
    updated_at
FROM employees
WHERE ho_ten = 'Lê Thanh Tùng';  -- ⚠️ THAY ĐỔI TÊN NÀY NẾU CẦN

-- ============================================
-- Lưu ý:
-- - Tên quản lý trực tiếp phải khớp chính xác với tên trong bảng employees
-- - Nếu không chắc chắn tên quản lý, chạy query sau để xem danh sách:
-- ============================================

-- Xem danh sách tất cả nhân viên để tìm tên quản lý
-- SELECT DISTINCT ho_ten 
-- FROM employees 
-- WHERE ho_ten IS NOT NULL 
-- ORDER BY ho_ten;


