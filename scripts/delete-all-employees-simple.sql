-- Script xóa toàn bộ nhân viên
-- Chạy trực tiếp trong pgAdmin hoặc psql

-- Kiểm tra số lượng nhân viên hiện tại
SELECT COUNT(*) as total_employees FROM employees;

-- Xóa tất cả nhân viên
DELETE FROM employees;

-- Kiểm tra lại sau khi xóa
SELECT COUNT(*) as remaining_employees FROM employees;

-- Nếu có lỗi foreign key, có thể cần xóa các bảng liên quan trước:
-- DELETE FROM equipment_assignments;
-- Note: leave_requests, overtime_requests, attendance_adjustments tables may have been deleted
-- DELETE FROM employees;

