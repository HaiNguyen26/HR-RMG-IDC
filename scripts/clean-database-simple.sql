-- Simple script to delete data from tables
-- Keep only: employees, users, equipment_assignments

-- Delete from tables (ignore if table doesn't exist)
DO $$
BEGIN
    -- Delete notifications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        DELETE FROM notifications;
    END IF;

    -- Delete request_items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'request_items') THEN
        DELETE FROM request_items;
    END IF;

    -- Delete leave_requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_requests') THEN
        DELETE FROM leave_requests;
    END IF;

    -- Delete overtime_requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'overtime_requests') THEN
        DELETE FROM overtime_requests;
    END IF;

    -- Delete attendance_adjustments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_adjustments') THEN
        DELETE FROM attendance_adjustments;
    END IF;

    -- Delete travel_expense_requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'travel_expense_requests') THEN
        DELETE FROM travel_expense_requests;
    END IF;

    -- Delete interview_requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interview_requests') THEN
        DELETE FROM interview_requests;
    END IF;

    -- Delete recruitment_requests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recruitment_requests') THEN
        DELETE FROM recruitment_requests;
    END IF;

    -- Delete candidates
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidates') THEN
        DELETE FROM candidates;
    END IF;

END $$;

-- Reset sequences
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notifications_id_seq') THEN
        ALTER SEQUENCE notifications_id_seq RESTART WITH 1;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'request_items_id_seq') THEN
        ALTER SEQUENCE request_items_id_seq RESTART WITH 1;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'leave_requests_id_seq') THEN
        ALTER SEQUENCE leave_requests_id_seq RESTART WITH 1;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'overtime_requests_id_seq') THEN
        ALTER SEQUENCE overtime_requests_id_seq RESTART WITH 1;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'attendance_adjustments_id_seq') THEN
        ALTER SEQUENCE attendance_adjustments_id_seq RESTART WITH 1;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'travel_expense_requests_id_seq') THEN
        ALTER SEQUENCE travel_expense_requests_id_seq RESTART WITH 1;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'interview_requests_id_seq') THEN
        ALTER SEQUENCE interview_requests_id_seq RESTART WITH 1;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'recruitment_requests_id_seq') THEN
        ALTER SEQUENCE recruitment_requests_id_seq RESTART WITH 1;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'candidates_id_seq') THEN
        ALTER SEQUENCE candidates_id_seq RESTART WITH 1;
    END IF;
END $$;

-- Check results
SELECT 'leave_requests' as table_name, COUNT(*) as count FROM leave_requests
UNION ALL SELECT 'overtime_requests', COUNT(*) FROM overtime_requests
UNION ALL SELECT 'attendance_adjustments', COUNT(*) FROM attendance_adjustments
UNION ALL SELECT 'travel_expense_requests', COUNT(*) FROM travel_expense_requests
UNION ALL SELECT 'interview_requests', COUNT(*) FROM interview_requests
UNION ALL SELECT 'recruitment_requests', COUNT(*) FROM recruitment_requests
UNION ALL SELECT 'candidates', COUNT(*) FROM candidates
UNION ALL SELECT 'employees', COUNT(*) FROM employees;

