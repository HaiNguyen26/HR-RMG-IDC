-- Migration: Cho phép team_lead_id trong attendance_adjustments có thể NULL
-- Lý do: Khi nhân viên không có quản lý trực tiếp (hoặc không tìm thấy), đơn vẫn được tạo và gửi trực tiếp cho HR.
-- Chạy: psql -U your_user -d your_db -f migrate_attendance_adjustments_allow_null_team_lead.sql
-- Idempotent: chạy nhiều lần không lỗi.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'attendance_adjustments' AND column_name = 'team_lead_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE attendance_adjustments ALTER COLUMN team_lead_id DROP NOT NULL;
        RAISE NOTICE 'attendance_adjustments.team_lead_id: đã cho phép NULL';
    ELSE
        RAISE NOTICE 'attendance_adjustments.team_lead_id: đã nullable, bỏ qua';
    END IF;
END $$;
