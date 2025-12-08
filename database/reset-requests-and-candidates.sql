-- Script: Reset dữ liệu các đơn từ và ứng viên
-- Mô tả: Xóa tất cả dữ liệu từ các bảng đơn từ và ứng viên, giữ lại employees và users
-- Ngày tạo: 2025-01-XX

DO $$
DECLARE
    rec_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'BẮT ĐẦU RESET DỮ LIỆU ĐƠN TỪ VÀ ỨNG VIÊN';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- 1. Xóa đơn xin nghỉ (leave_requests)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_requests') THEN
        DELETE FROM leave_requests;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '✓ Đã xóa % bản ghi từ leave_requests', rec_count;
    ELSE
        RAISE NOTICE '⚠ Bảng leave_requests không tồn tại, bỏ qua';
    END IF;

    -- 2. Xóa đơn tăng ca (overtime_requests)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'overtime_requests') THEN
        DELETE FROM overtime_requests;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '✓ Đã xóa % bản ghi từ overtime_requests', rec_count;
    ELSE
        RAISE NOTICE '⚠ Bảng overtime_requests không tồn tại, bỏ qua';
    END IF;

    -- 3. Xóa bổ sung chấm công (attendance_adjustments)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_adjustments') THEN
        DELETE FROM attendance_adjustments;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '✓ Đã xóa % bản ghi từ attendance_adjustments', rec_count;
    ELSE
        RAISE NOTICE '⚠ Bảng attendance_adjustments không tồn tại, bỏ qua';
    END IF;

    -- 4. Xóa đơn nghỉ việc (resign_requests - nếu có)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resign_requests') THEN
        DELETE FROM resign_requests;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '✓ Đã xóa % bản ghi từ resign_requests', rec_count;
    ELSE
        RAISE NOTICE '⚠ Bảng resign_requests không tồn tại, bỏ qua';
    END IF;

    -- 5. Xóa đơn kinh phí công tác (travel_expense_requests)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'travel_expense_requests') THEN
        DELETE FROM travel_expense_requests;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '✓ Đã xóa % bản ghi từ travel_expense_requests', rec_count;
    ELSE
        RAISE NOTICE '⚠ Bảng travel_expense_requests không tồn tại, bỏ qua';
    END IF;

    -- 6. Xóa yêu cầu phỏng vấn (interview_requests)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interview_requests') THEN
        DELETE FROM interview_requests;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '✓ Đã xóa % bản ghi từ interview_requests', rec_count;
    ELSE
        RAISE NOTICE '⚠ Bảng interview_requests không tồn tại, bỏ qua';
    END IF;

    -- 7. Xóa yêu cầu tuyển dụng (recruitment_requests)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recruitment_requests') THEN
        DELETE FROM recruitment_requests;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '✓ Đã xóa % bản ghi từ recruitment_requests', rec_count;
    ELSE
        RAISE NOTICE '⚠ Bảng recruitment_requests không tồn tại, bỏ qua';
    END IF;

    -- 8. Xóa ứng viên (candidates)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidates') THEN
        DELETE FROM candidates;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '✓ Đã xóa % bản ghi từ candidates', rec_count;
    ELSE
        RAISE NOTICE '⚠ Bảng candidates không tồn tại, bỏ qua';
    END IF;

    -- 9. Xóa IT requests (requests - nếu có)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'requests') THEN
        DELETE FROM requests;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '✓ Đã xóa % bản ghi từ requests', rec_count;
    ELSE
        RAISE NOTICE '⚠ Bảng requests không tồn tại, bỏ qua';
    END IF;

    -- 10. Xóa request items (request_items - nếu có)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'request_items') THEN
        DELETE FROM request_items;
        GET DIAGNOSTICS rec_count = ROW_COUNT;
        RAISE NOTICE '✓ Đã xóa % bản ghi từ request_items', rec_count;
    ELSE
        RAISE NOTICE '⚠ Bảng request_items không tồn tại, bỏ qua';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESET SEQUENCES';
    RAISE NOTICE '========================================';

    -- Reset sequences
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

    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'resign_requests_id_seq') THEN
        ALTER SEQUENCE resign_requests_id_seq RESTART WITH 1;
        RAISE NOTICE '✓ Reset resign_requests_id_seq';
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

    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'requests_id_seq') THEN
        ALTER SEQUENCE requests_id_seq RESTART WITH 1;
        RAISE NOTICE '✓ Reset requests_id_seq';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'request_items_id_seq') THEN
        ALTER SEQUENCE request_items_id_seq RESTART WITH 1;
        RAISE NOTICE '✓ Reset request_items_id_seq';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'KIỂM TRA KẾT QUẢ';
    RAISE NOTICE '========================================';

    -- Kiểm tra số lượng bản ghi còn lại
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

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidates') THEN
        SELECT COUNT(*) INTO rec_count FROM candidates;
        RAISE NOTICE 'candidates: % records', rec_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interview_requests') THEN
        SELECT COUNT(*) INTO rec_count FROM interview_requests;
        RAISE NOTICE 'interview_requests: % records', rec_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recruitment_requests') THEN
        SELECT COUNT(*) INTO rec_count FROM recruitment_requests;
        RAISE NOTICE 'recruitment_requests: % records', rec_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'travel_expense_requests') THEN
        SELECT COUNT(*) INTO rec_count FROM travel_expense_requests;
        RAISE NOTICE 'travel_expense_requests: % records', rec_count;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✅ HOÀN THÀNH RESET DỮ LIỆU ĐƠN TỪ VÀ ỨNG VIÊN';
    RAISE NOTICE '   - Đã giữ lại: employees, users, equipment_assignments';
    RAISE NOTICE '   - Đã xóa: tất cả đơn từ và ứng viên';
    RAISE NOTICE '========================================';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ LỖI: %', SQLERRM;
        RAISE;
END $$;

