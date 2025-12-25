-- ============================================================
-- FIX INTERVIEW_REQUESTS.INTERVIEW_TIME TYPE
-- ============================================================
-- Migration: Đảm bảo cột interview_time có type TIMESTAMP (không phải TIME)
-- ============================================================
-- Description: Sửa type của cột interview_time từ TIME sang TIMESTAMP nếu cần
-- ============================================================

DO $$
DECLARE
    current_type TEXT;
BEGIN
    -- Kiểm tra xem bảng interview_requests có tồn tại không
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'interview_requests'
    ) THEN
        -- Kiểm tra type hiện tại của cột interview_time
        SELECT data_type INTO current_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'interview_requests'
        AND column_name = 'interview_time';

        IF current_type IS NOT NULL THEN
            IF current_type = 'time without time zone' OR current_type = 'time' THEN
                -- Nếu là type TIME, chuyển sang TIMESTAMP
                RAISE NOTICE 'Phát hiện cột interview_time có type TIME, đang chuyển sang TIMESTAMP...';
                
                -- Thêm cột tạm
                ALTER TABLE interview_requests ADD COLUMN interview_time_new TIMESTAMP;
                
                -- Copy dữ liệu (nếu có) - giả sử time là thời gian trong ngày hiện tại
                UPDATE interview_requests 
                SET interview_time_new = CURRENT_DATE + interview_time
                WHERE interview_time IS NOT NULL;
                
                -- Xóa cột cũ
                ALTER TABLE interview_requests DROP COLUMN interview_time;
                
                -- Đổi tên cột mới
                ALTER TABLE interview_requests RENAME COLUMN interview_time_new TO interview_time;
                
                RAISE NOTICE '✓ Đã chuyển cột interview_time từ TIME sang TIMESTAMP';
            ELSIF current_type = 'timestamp without time zone' OR current_type = 'timestamp' THEN
                RAISE NOTICE '✓ Cột interview_time đã có type TIMESTAMP, không cần thay đổi';
            ELSE
                RAISE NOTICE '⚠ Cột interview_time có type không xác định: %, cần kiểm tra thủ công', current_type;
            END IF;
        ELSE
            RAISE NOTICE '⚠ Cột interview_time không tồn tại, bỏ qua';
        END IF;
    ELSE
        RAISE NOTICE '⚠ Bảng interview_requests chưa tồn tại, bỏ qua';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Lỗi khi sửa type interview_time: %', SQLERRM;
        RAISE;
END $$;
