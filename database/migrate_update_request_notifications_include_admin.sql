-- ============================================
-- Migration: ensure request notifications also notify ADMIN users
-- ============================================
-- Run this script after deploying to update the trigger function
-- that creates notifications when a new request is inserted.

CREATE OR REPLACE FUNCTION create_request_notification()
RETURNS TRIGGER AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Tạo thông báo cho tất cả users của phòng ban target
    -- đồng thời gửi cho các ADMIN và cả người đã gửi yêu cầu
    -- để đảm bảo HR/ADMIN có thể theo dõi. Tới script này, file
    -- phải được lưu UTF-8 để tránh lỗi encoding trên Windows.
    FOR user_record IN 
        SELECT DISTINCT id FROM (
            SELECT id FROM users
            WHERE trang_thai = 'ACTIVE'
              AND (
                  role = NEW.target_department
                  OR role = 'ADMIN'
              )
            UNION ALL
            SELECT NEW.requested_by AS id
            FROM users
            WHERE NEW.requested_by IS NOT NULL
        ) AS recipients
    LOOP
        INSERT INTO notifications (user_id, request_id, type, title, message)
        VALUES (
            user_record.id,
            NEW.id,
            'NEW_REQUEST',
            'Yêu cầu mới từ HR',
            'Có yêu cầu mới: ' || NEW.title || ' cho nhân viên #' || NEW.employee_id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger đã tồn tại, chỉ cần đảm bảo nó trỏ tới function mới nhất
DROP TRIGGER IF EXISTS trg_create_request_notification ON requests;

CREATE TRIGGER trg_create_request_notification
    AFTER INSERT ON requests
    FOR EACH ROW
    EXECUTE FUNCTION create_request_notification();

