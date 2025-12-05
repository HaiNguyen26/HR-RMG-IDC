-- ============================================================
-- Script sửa constraint cho tất cả các bảng requests
-- Xóa constraint cũ và tạo lại với giá trị đúng
-- ============================================================

BEGIN;

-- ============================================================
-- 1. LEAVE_REQUESTS
-- ============================================================
ALTER TABLE leave_requests 
DROP CONSTRAINT IF EXISTS leave_requests_status_check;

ALTER TABLE leave_requests 
ADD CONSTRAINT leave_requests_status_check 
CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));

-- ============================================================
-- 2. OVERTIME_REQUESTS
-- ============================================================
ALTER TABLE overtime_requests 
DROP CONSTRAINT IF EXISTS overtime_requests_status_check;

ALTER TABLE overtime_requests 
ADD CONSTRAINT overtime_requests_status_check 
CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));

-- ============================================================
-- 3. ATTENDANCE_ADJUSTMENTS
-- ============================================================
ALTER TABLE attendance_adjustments 
DROP CONSTRAINT IF EXISTS attendance_adjustments_status_check;

ALTER TABLE attendance_adjustments 
ADD CONSTRAINT attendance_adjustments_status_check 
CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));

COMMIT;

-- ============================================================
-- Kiểm tra lại tất cả constraints
-- ============================================================
SELECT 
    'leave_requests' as table_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'leave_requests'::regclass
    AND contype = 'c'
    AND conname LIKE '%status%'

UNION ALL

SELECT 
    'overtime_requests' as table_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'overtime_requests'::regclass
    AND contype = 'c'
    AND conname LIKE '%status%'

UNION ALL

SELECT 
    'attendance_adjustments' as table_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'attendance_adjustments'::regclass
    AND contype = 'c'
    AND conname LIKE '%status%';

-- Thông báo
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Đã sửa constraint cho tất cả các bảng requests';
    RAISE NOTICE 'Constraint mới: status IN (PENDING, APPROVED, REJECTED, CANCELLED)';
    RAISE NOTICE '========================================';
END $$;

