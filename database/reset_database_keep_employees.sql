-- ============================================
-- RESET DATABASE - KEEP ONLY EMPLOYEES
-- ============================================
-- Script này sẽ xóa tất cả dữ liệu từ các bảng,
-- CHỈ GIỮ LẠI bảng employees và users
-- ============================================
-- WARNING: Đây là script hủy dữ liệu, chạy cẩn thận!
-- ============================================
-- LƯU Ý QUAN TRỌNG:
-- ✅ Script này CHỈ XÓA DỮ LIỆU (rows) trong các bảng
-- ✅ KHÔNG ảnh hưởng đến:
--    - PostgreSQL Roles/Users (database roles)
--    - Permissions/Grants (quyền truy cập)
--    - Table structure (cấu trúc bảng, columns, constraints, indexes)
--    - Database structure (schemas, functions, triggers)
--    - Bảng employees và users (giữ nguyên dữ liệu)
-- ✅ Chỉ sử dụng TRUNCATE TABLE - xóa rows, giữ nguyên schema
-- ============================================
-- Usage: 
--   psql -U postgres -d HR_Management_System -f reset_database_keep_employees.sql
--   Hoặc chạy từ pgAdmin/psql console
-- ============================================

BEGIN;

-- Xóa dữ liệu từ các bảng có foreign key (theo thứ tự dependency)
-- Sử dụng TRUNCATE CASCADE để tự động xóa các bảng con

-- 1. Xóa Request Items và Notifications trước (phụ thuộc vào requests)
TRUNCATE TABLE request_items CASCADE;
TRUNCATE TABLE notifications CASCADE;

-- 2. Xóa Requests (phụ thuộc vào employees và users)
TRUNCATE TABLE requests CASCADE;

-- 3. Xóa Travel Expense Requests (phụ thuộc vào employees)
TRUNCATE TABLE travel_expense_requests CASCADE;

-- 4. Xóa Recruitment Requests (phụ thuộc vào employees)
TRUNCATE TABLE recruitment_requests CASCADE;

-- 5. Xóa Interview Requests (phụ thuộc vào candidates và employees)
TRUNCATE TABLE interview_requests CASCADE;

-- 6. Xóa Candidates (có thể độc lập hoặc phụ thuộc vào employees)
TRUNCATE TABLE candidates CASCADE;

-- 7. Xóa Overtime Requests (phụ thuộc vào employees)
TRUNCATE TABLE overtime_requests CASCADE;

-- 8. Xóa Attendance Adjustments (phụ thuộc vào employees)
TRUNCATE TABLE attendance_adjustments CASCADE;

-- 9. Xóa Leave Requests (phụ thuộc vào employees)
TRUNCATE TABLE leave_requests CASCADE;

-- 10. Xóa Equipment Assignments (phụ thuộc vào employees)
TRUNCATE TABLE equipment_assignments CASCADE;

-- Xác nhận commit
COMMIT;

-- Hiển thị kết quả
DO $$
DECLARE
    emp_count INTEGER;
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO emp_count FROM employees;
    SELECT COUNT(*) INTO user_count FROM users;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Database đã được reset thành công!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 Số lượng nhân viên còn lại: %', emp_count;
    RAISE NOTICE '👤 Số lượng users còn lại: %', user_count;
    RAISE NOTICE '🗑️  Tất cả dữ liệu khác đã bị xóa:';
    RAISE NOTICE '   - candidates';
    RAISE NOTICE '   - interview_requests';
    RAISE NOTICE '   - recruitment_requests';
    RAISE NOTICE '   - leave_requests';
    RAISE NOTICE '   - overtime_requests';
    RAISE NOTICE '   - attendance_adjustments';
    RAISE NOTICE '   - travel_expense_requests';
    RAISE NOTICE '   - requests';
    RAISE NOTICE '   - request_items';
    RAISE NOTICE '   - notifications';
    RAISE NOTICE '   - equipment_assignments';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PostgreSQL Roles và Permissions vẫn được giữ nguyên';
    RAISE NOTICE '✅ Cấu trúc bảng (schema) vẫn được giữ nguyên';
    RAISE NOTICE '✅ Chỉ dữ liệu (rows) trong các bảng bị xóa';
    RAISE NOTICE '========================================';
END $$;

