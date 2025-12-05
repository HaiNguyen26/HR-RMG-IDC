-- ============================================================
-- Script XOA TOAN BO DU LIEU: Ứng viên, Đơn nghỉ, Ứng viên thử việc
-- CHI GIU LAI: Danh sách nhân viên (employees)
-- ============================================================
-- 
-- CẢNH BÁO: Script này sẽ XÓA VĨNH VIỄN tất cả dữ liệu từ các bảng:
--   - candidates (ứng viên)
--   - leave_requests (đơn nghỉ phép)
--   - overtime_requests (đơn tăng ca)
--   - attendance_adjustments (bổ sung chấm công)
--   - travel_expense_requests (đơn công tác)
--   - interview_requests (phỏng vấn)
--   - recruitment_requests (tuyển dụng)
--   - notifications (thông báo)
--   - request_items (chi tiết đơn)
--
-- GIỮ LẠI:
--   - employees (nhân viên) ✓
--   - users (người dùng hệ thống) ✓
--   - equipment_assignments (phân công vật dụng) ✓
--
-- ============================================================

-- ============================================================
-- XÓA DỮ LIỆU TỪ CÁC BẢNG (KHÔNG XÓA CẤU TRÚC BẢNG)
-- Sử dụng DO block để xử lý lỗi từng bảng riêng biệt
-- ============================================================

DO $$
BEGIN
    -- 1. Xóa thông báo (notifications) - liên quan đến các đơn
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        DELETE FROM notifications;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ notifications';
    ELSE
        RAISE NOTICE '⚠ Bảng notifications không tồn tại, bỏ qua';
    END IF;

    -- 2. Xóa chi tiết đơn (request_items) - liên quan đến các đơn
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'request_items') THEN
        DELETE FROM request_items;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ request_items';
    ELSE
        RAISE NOTICE '⚠ Bảng request_items không tồn tại, bỏ qua';
    END IF;

    -- 3. Xóa đơn nghỉ phép (leave_requests)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_requests') THEN
        DELETE FROM leave_requests;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ leave_requests';
    ELSE
        RAISE NOTICE '⚠ Bảng leave_requests không tồn tại, bỏ qua';
    END IF;

    -- 4. Xóa đơn tăng ca (overtime_requests)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'overtime_requests') THEN
        DELETE FROM overtime_requests;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ overtime_requests';
    ELSE
        RAISE NOTICE '⚠ Bảng overtime_requests không tồn tại, bỏ qua';
    END IF;

    -- 5. Xóa bổ sung chấm công (attendance_adjustments)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_adjustments') THEN
        DELETE FROM attendance_adjustments;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ attendance_adjustments';
    ELSE
        RAISE NOTICE '⚠ Bảng attendance_adjustments không tồn tại, bỏ qua';
    END IF;

    -- 6. Xóa đơn công tác (travel_expense_requests)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'travel_expense_requests') THEN
        DELETE FROM travel_expense_requests;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ travel_expense_requests';
    ELSE
        RAISE NOTICE '⚠ Bảng travel_expense_requests không tồn tại, bỏ qua';
    END IF;

    -- 7. Xóa phỏng vấn (interview_requests)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interview_requests') THEN
        DELETE FROM interview_requests;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ interview_requests';
    ELSE
        RAISE NOTICE '⚠ Bảng interview_requests không tồn tại, bỏ qua';
    END IF;

    -- 8. Xóa tuyển dụng (recruitment_requests)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recruitment_requests') THEN
        DELETE FROM recruitment_requests;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ recruitment_requests';
    ELSE
        RAISE NOTICE '⚠ Bảng recruitment_requests không tồn tại, bỏ qua';
    END IF;

    -- 9. Xóa ứng viên thử việc (probation data trong candidates)
    -- Lưu ý: Xóa tất cả candidates, không phân biệt thử việc hay không
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidates') THEN
        DELETE FROM candidates;
        RAISE NOTICE '✓ Đã xóa dữ liệu từ candidates';
    ELSE
        RAISE NOTICE '⚠ Bảng candidates không tồn tại, bỏ qua';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Lỗi: %', SQLERRM;
        -- Tiếp tục thực hiện các bảng khác
END $$;

-- ============================================================
-- Reset sequences về 1 (tùy chọn - để ID bắt đầu từ 1)
-- ============================================================

DO $$
BEGIN
    -- Reset sequence cho các bảng đã xóa dữ liệu
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notifications_id_seq') THEN
        ALTER SEQUENCE notifications_id_seq RESTART WITH 1;
        RAISE NOTICE '✓ Reset notifications_id_seq';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'request_items_id_seq') THEN
        ALTER SEQUENCE request_items_id_seq RESTART WITH 1;
        RAISE NOTICE '✓ Reset request_items_id_seq';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'leave_requests_id_seq') THEN
        ALTER SEQUENCE leave_requests_id_seq RESTART WITH 1;
        RAISE NOTICE '✓ Reset leave_requests_id_seq';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'overtime_requests_id_seq') THEN
        ALTER SEQUENCE overtime_requests_id_seq RESTART WITH 1;
        RAISE NOTICE '✓ Reset overtime_requests_id_seq';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'attendance_adjustments_id_seq') THEN
        ALTER SEQUENCE attendance_adjustments_id_seq RESTART WITH 1;
        RAISE NOTICE '✓ Reset attendance_adjustments_id_seq';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'travel_expense_requests_id_seq') THEN
        ALTER SEQUENCE travel_expense_requests_id_seq RESTART WITH 1;
        RAISE NOTICE '✓ Reset travel_expense_requests_id_seq';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'interview_requests_id_seq') THEN
        ALTER SEQUENCE interview_requests_id_seq RESTART WITH 1;
        RAISE NOTICE '✓ Reset interview_requests_id_seq';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'recruitment_requests_id_seq') THEN
        ALTER SEQUENCE recruitment_requests_id_seq RESTART WITH 1;
        RAISE NOTICE '✓ Reset recruitment_requests_id_seq';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'candidates_id_seq') THEN
        ALTER SEQUENCE candidates_id_seq RESTART WITH 1;
        RAISE NOTICE '✓ Reset candidates_id_seq';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Lỗi khi reset sequences: %', SQLERRM;
END $$;

-- ============================================================
-- KIỂM TRA KẾT QUẢ
-- ============================================================

-- Đếm số lượng records còn lại trong các bảng đã xóa
DO $$
DECLARE
    rec_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Kiểm tra kết quả sau khi xóa:';
    RAISE NOTICE '========================================';
    
    -- Kiểm tra từng bảng
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        SELECT COUNT(*) INTO rec_count FROM notifications;
        RAISE NOTICE 'notifications: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'request_items') THEN
        SELECT COUNT(*) INTO rec_count FROM request_items;
        RAISE NOTICE 'request_items: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_requests') THEN
        SELECT COUNT(*) INTO rec_count FROM leave_requests;
        RAISE NOTICE 'leave_requests: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'overtime_requests') THEN
        SELECT COUNT(*) INTO rec_count FROM overtime_requests;
        RAISE NOTICE 'overtime_requests: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_adjustments') THEN
        SELECT COUNT(*) INTO rec_count FROM attendance_adjustments;
        RAISE NOTICE 'attendance_adjustments: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'travel_expense_requests') THEN
        SELECT COUNT(*) INTO rec_count FROM travel_expense_requests;
        RAISE NOTICE 'travel_expense_requests: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interview_requests') THEN
        SELECT COUNT(*) INTO rec_count FROM interview_requests;
        RAISE NOTICE 'interview_requests: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recruitment_requests') THEN
        SELECT COUNT(*) INTO rec_count FROM recruitment_requests;
        RAISE NOTICE 'recruitment_requests: % records', rec_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidates') THEN
        SELECT COUNT(*) INTO rec_count FROM candidates;
        RAISE NOTICE 'candidates: % records', rec_count;
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Kiểm tra bảng giữ lại:';
    RAISE NOTICE '========================================';
    
    -- Kiểm tra employees
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        SELECT COUNT(*) INTO rec_count FROM employees;
        RAISE NOTICE 'employees: % records (✓ GIỮ LẠI)', rec_count;
    ELSE
        RAISE NOTICE 'employees: Bảng không tồn tại!';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- ============================================================
-- THÔNG BÁO KẾT QUẢ
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Đã xóa toàn bộ dữ liệu từ các bảng:';
    RAISE NOTICE '   - notifications';
    RAISE NOTICE '   - request_items';
    RAISE NOTICE '   - leave_requests';
    RAISE NOTICE '   - overtime_requests';
    RAISE NOTICE '   - attendance_adjustments';
    RAISE NOTICE '   - travel_expense_requests';
    RAISE NOTICE '   - interview_requests';
    RAISE NOTICE '   - recruitment_requests';
    RAISE NOTICE '   - candidates';
    RAISE NOTICE '';
    RAISE NOTICE 'Đã giữ lại:';
    RAISE NOTICE '   ✓ employees (nhân viên)';
    RAISE NOTICE '   ✓ users (người dùng hệ thống)';
    RAISE NOTICE '   ✓ equipment_assignments (phân công vật dụng)';
    RAISE NOTICE '';
    RAISE NOTICE 'Các sequences đã được reset về 1';
    RAISE NOTICE '========================================';
END $$;

