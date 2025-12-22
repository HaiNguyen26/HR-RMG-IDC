-- ============================================================
-- RESET TẤT CẢ ĐƠN TỪ - CHỈ GIỮ LẠI EMPLOYEES VÀ CANDIDATES
-- ============================================================
-- Script này sẽ xóa tất cả dữ liệu từ các bảng đơn từ,
-- CHỈ GIỮ LẠI:
--   ✓ employees (nhân viên)
--   ✓ candidates (ứng viên) - bao gồm các bảng con:
--     - candidate_work_experiences
--     - candidate_training_processes
--     - candidate_foreign_languages
-- ============================================================
-- WARNING: Script này sẽ XÓA VĨNH VIỄN dữ liệu các đơn từ!
-- ============================================================
-- Usage: 
--   sudo -u postgres psql -d HR_Management_System -f database/reset_requests_keep_employees_candidates.sql
-- ============================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Bắt đầu reset database...';
    RAISE NOTICE 'Giữ lại: employees, candidates';
    RAISE NOTICE 'Xóa: tất cả đơn từ';
    RAISE NOTICE '========================================';
    
    -- ============================================================
    -- XÓA CÁC BẢNG ĐƠN TỪ (theo thứ tự dependency)
    -- ============================================================
    
    -- 1. Xóa Notifications (phụ thuộc vào requests)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        TRUNCATE TABLE notifications CASCADE;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ notifications';
    END IF;
    
    -- 2. Xóa Request Items (phụ thuộc vào requests)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'request_items') THEN
        TRUNCATE TABLE request_items CASCADE;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ request_items';
    END IF;
    
    -- 3. Xóa Requests (đơn từ HR đến các phòng ban)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'requests') THEN
        TRUNCATE TABLE requests CASCADE;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ requests';
    END IF;
    
    -- 4. Xóa Interview Evaluations (phụ thuộc vào interview_requests và candidates)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'interview_evaluations') THEN
        TRUNCATE TABLE interview_evaluations CASCADE;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ interview_evaluations';
    END IF;
    
    -- 5. Xóa Interview Requests (phụ thuộc vào candidates và employees)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'interview_requests') THEN
        TRUNCATE TABLE interview_requests CASCADE;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ interview_requests';
    END IF;
    
    -- 6. Xóa Recruitment Requests (phụ thuộc vào employees)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recruitment_requests') THEN
        TRUNCATE TABLE recruitment_requests CASCADE;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ recruitment_requests';
    END IF;
    
    -- 7. Xóa Customer Entertainment Expenses (phụ thuộc vào employees)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customer_entertainment_expenses') THEN
        TRUNCATE TABLE customer_entertainment_expenses CASCADE;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ customer_entertainment_expenses';
    END IF;
    
    -- 8. Xóa Travel Expense Requests (phụ thuộc vào employees)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travel_expense_requests') THEN
        TRUNCATE TABLE travel_expense_requests CASCADE;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ travel_expense_requests';
    END IF;
    
    -- 9. Xóa Attendance Adjustments (phụ thuộc vào employees)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_adjustments') THEN
        TRUNCATE TABLE attendance_adjustments CASCADE;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ attendance_adjustments';
    END IF;
    
    -- 10. Xóa Overtime Requests (phụ thuộc vào employees)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'overtime_requests') THEN
        TRUNCATE TABLE overtime_requests CASCADE;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ overtime_requests';
    END IF;
    
    -- 11. Xóa Leave Requests (phụ thuộc vào employees)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_requests') THEN
        TRUNCATE TABLE leave_requests CASCADE;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ leave_requests';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Đã xóa tất cả dữ liệu đơn từ!';
    RAISE NOTICE '========================================';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Lỗi khi xóa dữ liệu: %', SQLERRM;
        RAISE;
END $$;

-- Reset sequences về 1
DO $$
BEGIN
    RAISE NOTICE 'Đang reset sequences...';
    
    -- Reset các sequences của bảng đã xóa
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notifications_id_seq') THEN
        ALTER SEQUENCE notifications_id_seq RESTART WITH 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'request_items_id_seq') THEN
        ALTER SEQUENCE request_items_id_seq RESTART WITH 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'requests_id_seq') THEN
        ALTER SEQUENCE requests_id_seq RESTART WITH 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'interview_evaluations_id_seq') THEN
        ALTER SEQUENCE interview_evaluations_id_seq RESTART WITH 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'interview_requests_id_seq') THEN
        ALTER SEQUENCE interview_requests_id_seq RESTART WITH 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'recruitment_requests_id_seq') THEN
        ALTER SEQUENCE recruitment_requests_id_seq RESTART WITH 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'customer_entertainment_expenses_id_seq') THEN
        ALTER SEQUENCE customer_entertainment_expenses_id_seq RESTART WITH 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'travel_expense_requests_id_seq') THEN
        ALTER SEQUENCE travel_expense_requests_id_seq RESTART WITH 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'attendance_adjustments_id_seq') THEN
        ALTER SEQUENCE attendance_adjustments_id_seq RESTART WITH 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'overtime_requests_id_seq') THEN
        ALTER SEQUENCE overtime_requests_id_seq RESTART WITH 1;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'leave_requests_id_seq') THEN
        ALTER SEQUENCE leave_requests_id_seq RESTART WITH 1;
    END IF;
    
    RAISE NOTICE '✓ Đã reset tất cả sequences';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Lỗi khi reset sequences: %', SQLERRM;
END $$;

COMMIT;

-- Hiển thị kết quả
DO $$
DECLARE
    emp_count INTEGER := 0;
    candidate_count INTEGER := 0;
    leave_count INTEGER := 0;
    overtime_count INTEGER := 0;
    attendance_count INTEGER := 0;
    travel_count INTEGER := 0;
    interview_count INTEGER := 0;
    recruitment_count INTEGER := 0;
    request_count INTEGER := 0;
BEGIN
    -- Đếm records còn lại
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
        SELECT COUNT(*) INTO emp_count FROM employees;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidates') THEN
        SELECT COUNT(*) INTO candidate_count FROM candidates;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_requests') THEN
        SELECT COUNT(*) INTO leave_count FROM leave_requests;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'overtime_requests') THEN
        SELECT COUNT(*) INTO overtime_count FROM overtime_requests;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_adjustments') THEN
        SELECT COUNT(*) INTO attendance_count FROM attendance_adjustments;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travel_expense_requests') THEN
        SELECT COUNT(*) INTO travel_count FROM travel_expense_requests;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'interview_requests') THEN
        SELECT COUNT(*) INTO interview_count FROM interview_requests;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recruitment_requests') THEN
        SELECT COUNT(*) INTO recruitment_count FROM recruitment_requests;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'requests') THEN
        SELECT COUNT(*) INTO request_count FROM requests;
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ RESET DATABASE HOÀN TẤT!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 Số lượng dữ liệu còn lại:';
    RAISE NOTICE '   ✓ employees: % records (GIỮ LẠI)', emp_count;
    RAISE NOTICE '   ✓ candidates: % records (GIỮ LẠI)', candidate_count;
    RAISE NOTICE '';
    RAISE NOTICE '🗑️  Các đơn từ đã bị xóa:';
    RAISE NOTICE '   - leave_requests: % records', leave_count;
    RAISE NOTICE '   - overtime_requests: % records', overtime_count;
    RAISE NOTICE '   - attendance_adjustments: % records', attendance_count;
    RAISE NOTICE '   - travel_expense_requests: % records', travel_count;
    RAISE NOTICE '   - interview_requests: % records', interview_count;
    RAISE NOTICE '   - recruitment_requests: % records', recruitment_count;
    RAISE NOTICE '   - requests: % records', request_count;
    RAISE NOTICE '   - request_items: (đã xóa)';
    RAISE NOTICE '   - notifications: (đã xóa)';
    RAISE NOTICE '   - interview_evaluations: (đã xóa)';
    RAISE NOTICE '   - customer_entertainment_expenses: (đã xóa)';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Cấu trúc bảng (schema) vẫn được giữ nguyên';
    RAISE NOTICE '✅ Chỉ dữ liệu (rows) trong các bảng đơn từ bị xóa';
    RAISE NOTICE '========================================';
END $$;
