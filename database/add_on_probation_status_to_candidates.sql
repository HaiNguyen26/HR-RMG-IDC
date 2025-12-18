-- Migration: Add ON_PROBATION status to candidates table constraint
-- This allows candidates to have ON_PROBATION status when starting probation period

-- Drop the existing constraint
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_trang_thai_check;

-- Add the constraint with ON_PROBATION status included
ALTER TABLE candidates 
ADD CONSTRAINT candidates_trang_thai_check 
CHECK (trang_thai IN (
    'NEW',                    -- Ứng viên mới
    'PENDING_INTERVIEW',      -- Chờ phỏng vấn
    'PENDING_MANAGER',        -- Đang chờ quản lý phỏng vấn
    'PASSED',                 -- Đã đậu
    'FAILED',                 -- Đã rớt
    'ON_PROBATION'            -- Đang thử việc
));


