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
-- Kiểm tra sự tồn tại của bảng trước khi xóa để tránh lỗi

-- Function helper để truncate table nếu tồn tại
DO $$
BEGIN
    -- 1. Xóa Request Items (phụ thuộc vào requests)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'request_items') THEN
        TRUNCATE TABLE request_items CASCADE;
        RAISE NOTICE '✅ Đã xóa dữ liệu từ request_items';
    END IF;

    -- 2. Xóa Notifications (phụ thuộc vào requests)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        TRUNCATE TABLE notifications CASCADE;
        RAISE NOTICE '✅ Đã xóa dữ liệu từ notifications';
    ELSE
        RAISE NOTICE '⚠️  Bảng notifications không tồn tại, bỏ qua';
    END IF;

    -- 3. Xóa Requests (phụ thuộc vào employees và users)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'requests') THEN
        TRUNCATE TABLE requests CASCADE;
        RAISE NOTICE '✅ Đã xóa dữ liệu từ requests';
    END IF;

    -- 4. Xóa Travel Expense Requests (phụ thuộc vào employees)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'travel_expense_requests') THEN
        TRUNCATE TABLE travel_expense_requests CASCADE;
        RAISE NOTICE '✅ Đã xóa dữ liệu từ travel_expense_requests';
    END IF;

    -- 5. Xóa Recruitment Requests (phụ thuộc vào employees)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recruitment_requests') THEN
        TRUNCATE TABLE recruitment_requests CASCADE;
        RAISE NOTICE '✅ Đã xóa dữ liệu từ recruitment_requests';
    END IF;

    -- 6. Xóa Interview Requests (phụ thuộc vào candidates và employees)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interview_requests') THEN
        TRUNCATE TABLE interview_requests CASCADE;
        RAISE NOTICE '✅ Đã xóa dữ liệu từ interview_requests';
    END IF;

    -- 7. Xóa Candidates (có thể độc lập hoặc phụ thuộc vào employees)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidates') THEN
        TRUNCATE TABLE candidates CASCADE;
        RAISE NOTICE '✅ Đã xóa dữ liệu từ candidates';
    END IF;

    -- 8. Xóa Overtime Requests (phụ thuộc vào employees)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'overtime_requests') THEN
        TRUNCATE TABLE overtime_requests CASCADE;
        RAISE NOTICE '✅ Đã xóa dữ liệu từ overtime_requests';
    END IF;

    -- 9. Xóa Attendance Adjustments (phụ thuộc vào employees)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_adjustments') THEN
        TRUNCATE TABLE attendance_adjustments CASCADE;
        RAISE NOTICE '✅ Đã xóa dữ liệu từ attendance_adjustments';
    END IF;

    -- 10. Xóa Leave Requests (phụ thuộc vào employees)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_requests') THEN
        TRUNCATE TABLE leave_requests CASCADE;
        RAISE NOTICE '✅ Đã xóa dữ liệu từ leave_requests';
    END IF;

    -- 11. Xóa Equipment Assignments (phụ thuộc vào employees)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_assignments') THEN
        TRUNCATE TABLE equipment_assignments CASCADE;
        RAISE NOTICE '✅ Đã xóa dữ liệu từ equipment_assignments';
    END IF;
END $$;

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

