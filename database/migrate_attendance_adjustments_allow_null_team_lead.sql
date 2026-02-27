-- Migration: Cho phép team_lead_id trong attendance_adjustments có thể NULL
-- Lý do: Khi nhân viên không có quản lý trực tiếp (hoặc không tìm thấy), đơn vẫn được tạo và gửi trực tiếp cho HR.
-- Chạy: psql -U your_user -d your_db -f migrate_attendance_adjustments_allow_null_team_lead.sql

BEGIN;

ALTER TABLE attendance_adjustments
    ALTER COLUMN team_lead_id DROP NOT NULL;

COMMIT;
