-- ============================================================
-- Script XOA HOAN TOAN tat ca database lien quan den quy trinh xin phep
-- Chay script nay de xoa sach va thiet ke lai tu dau
-- ============================================================

BEGIN;

-- ============================================================
-- BUOC 1: Xoa cac triggers
-- ============================================================
DROP TRIGGER IF EXISTS trg_leave_requests_updated ON leave_requests CASCADE;
DROP TRIGGER IF EXISTS trg_overtime_requests_updated ON overtime_requests CASCADE;
DROP TRIGGER IF EXISTS trg_attendance_adjustments_updated ON attendance_adjustments CASCADE;

-- ============================================================
-- BUOC 2: Xoa cac functions
-- ============================================================
DROP FUNCTION IF EXISTS update_leave_requests_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_overtime_requests_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_attendance_adjustments_updated_at() CASCADE;

-- ============================================================
-- BUOC 3: Xoa tat ca indexes
-- ============================================================
-- Leave requests indexes
DROP INDEX IF EXISTS idx_leave_requests_employee CASCADE;
DROP INDEX IF EXISTS idx_leave_requests_team_lead CASCADE;
DROP INDEX IF EXISTS idx_leave_requests_branch_manager CASCADE;
DROP INDEX IF EXISTS idx_leave_requests_status CASCADE;
DROP INDEX IF EXISTS idx_leave_requests_created_at CASCADE;
DROP INDEX IF EXISTS idx_leave_requests_due_at CASCADE;

-- Overtime requests indexes
DROP INDEX IF EXISTS idx_overtime_requests_employee CASCADE;
DROP INDEX IF EXISTS idx_overtime_requests_team_lead CASCADE;
DROP INDEX IF EXISTS idx_overtime_requests_branch_manager CASCADE;
DROP INDEX IF EXISTS idx_overtime_requests_status CASCADE;
DROP INDEX IF EXISTS idx_overtime_requests_created_at CASCADE;
DROP INDEX IF EXISTS idx_overtime_requests_due_at CASCADE;

-- Attendance adjustments indexes
DROP INDEX IF EXISTS idx_attendance_adjustments_employee CASCADE;
DROP INDEX IF EXISTS idx_attendance_adjustments_team_lead CASCADE;
DROP INDEX IF EXISTS idx_attendance_adjustments_branch_manager CASCADE;
DROP INDEX IF EXISTS idx_attendance_adjustments_status CASCADE;
DROP INDEX IF EXISTS idx_attendance_adjustments_created_at CASCADE;
DROP INDEX IF EXISTS idx_attendance_adjustments_due_at CASCADE;

-- ============================================================
-- BUOC 4: XOA HOAN TOAN CAC BANG (CAN THAN!)
-- ============================================================
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS overtime_requests CASCADE;
DROP TABLE IF EXISTS attendance_adjustments CASCADE;

-- ============================================================
-- BUOC 5: Xoa sequences (neu con ton tai)
-- ============================================================
DROP SEQUENCE IF EXISTS leave_requests_id_seq CASCADE;
DROP SEQUENCE IF EXISTS overtime_requests_id_seq CASCADE;
DROP SEQUENCE IF EXISTS attendance_adjustments_id_seq CASCADE;

COMMIT;

-- ============================================================
-- Thong bao ket qua
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Da xoa hoan toan tat ca database lien quan den quy trinh xin phep';
    RAISE NOTICE 'Cac bang da bi xoa:';
    RAISE NOTICE '   - leave_requests';
    RAISE NOTICE '   - overtime_requests';
    RAISE NOTICE '   - attendance_adjustments';
    RAISE NOTICE 'Cac triggers, functions, indexes, sequences da bi xoa';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tat ca du lieu va cau truc da bi xoa vinh vien!';
    RAISE NOTICE 'Ban co the bat dau thiet ke lai tu dau';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================
-- Kiem tra xem cac bang da bi xoa chua
-- ============================================================
SELECT 
    'leave_requests' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'leave_requests'
    ) THEN 'CON TON TAI' ELSE 'DA XOA' END as status
UNION ALL
SELECT 
    'overtime_requests' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'overtime_requests'
    ) THEN 'CON TON TAI' ELSE 'DA XOA' END as status
UNION ALL
SELECT 
    'attendance_adjustments' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'attendance_adjustments'
    ) THEN 'CON TON TAI' ELSE 'DA XOA' END as status;
