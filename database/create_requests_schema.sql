-- ============================================================
-- Schema mới cho quy trình xin phép
-- Quy trình: Nhân viên -> Quản lý trực tiếp (duyệt/từ chối) -> Nhân viên xem kết quả
-- ============================================================

BEGIN;

-- ============================================================
-- BẢNG: leave_requests (Đơn xin nghỉ phép)
-- ============================================================
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    team_lead_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Thông tin đơn
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('LEAVE', 'RESIGN')),
    start_date DATE NOT NULL,
    end_date DATE,
    reason TEXT NOT NULL,
    notes TEXT,
    
    -- Trạng thái đơn
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
    ),
    
    -- Hành động của quản lý
    team_lead_action VARCHAR(20) CHECK (team_lead_action IN ('APPROVE', 'REJECT')),
    team_lead_action_at TIMESTAMP,
    team_lead_comment TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BẢNG: overtime_requests (Đơn xin tăng ca)
-- ============================================================
CREATE TABLE IF NOT EXISTS overtime_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    team_lead_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Thông tin đơn
    request_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration TEXT,
    reason TEXT NOT NULL,
    notes TEXT,
    
    -- Trạng thái đơn
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
    ),
    
    -- Hành động của quản lý
    team_lead_action VARCHAR(20) CHECK (team_lead_action IN ('APPROVE', 'REJECT')),
    team_lead_action_at TIMESTAMP,
    team_lead_comment TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BẢNG: attendance_adjustments (Đơn bổ sung chấm công)
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_adjustments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    team_lead_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Thông tin đơn
    adjustment_date DATE NOT NULL,
    check_type VARCHAR(20) NOT NULL CHECK (check_type IN ('CHECK_IN', 'CHECK_OUT', 'BOTH')),
    check_in_time TIME,
    check_out_time TIME,
    reason TEXT NOT NULL,
    notes TEXT,
    
    -- Trạng thái đơn
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
    ),
    
    -- Hành động của quản lý
    team_lead_action VARCHAR(20) CHECK (team_lead_action IN ('APPROVE', 'REJECT')),
    team_lead_action_at TIMESTAMP,
    team_lead_comment TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES cho hiệu suất
-- ============================================================
-- Leave requests indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_team_lead ON leave_requests(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_created_at ON leave_requests(created_at DESC);

-- Overtime requests indexes
CREATE INDEX IF NOT EXISTS idx_overtime_requests_employee ON overtime_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_team_lead ON overtime_requests(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_status ON overtime_requests(status);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_created_at ON overtime_requests(created_at DESC);

-- Attendance adjustments indexes
CREATE INDEX IF NOT EXISTS idx_attendance_adjustments_employee ON attendance_adjustments(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_adjustments_team_lead ON attendance_adjustments(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_attendance_adjustments_status ON attendance_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_attendance_adjustments_created_at ON attendance_adjustments(created_at DESC);

-- ============================================================
-- TRIGGERS để tự động cập nhật updated_at
-- ============================================================
-- Function để cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers cho leave_requests
DROP TRIGGER IF EXISTS trg_leave_requests_updated ON leave_requests;
CREATE TRIGGER trg_leave_requests_updated
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers cho overtime_requests
DROP TRIGGER IF EXISTS trg_overtime_requests_updated ON overtime_requests;
CREATE TRIGGER trg_overtime_requests_updated
    BEFORE UPDATE ON overtime_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers cho attendance_adjustments
DROP TRIGGER IF EXISTS trg_attendance_adjustments_updated ON attendance_adjustments;
CREATE TRIGGER trg_attendance_adjustments_updated
    BEFORE UPDATE ON attendance_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================================
-- Thông báo
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Da tao xong schema moi cho quy trinh xin phep';
    RAISE NOTICE 'Cac bang da tao:';
    RAISE NOTICE '   - leave_requests';
    RAISE NOTICE '   - overtime_requests';
    RAISE NOTICE '   - attendance_adjustments';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Quy trinh:';
    RAISE NOTICE '   1. Nhan vien tao va gui don -> Status: PENDING';
    RAISE NOTICE '   2. Quan ly truc tiep duyet/tu choi -> Status: APPROVED/REJECTED';
    RAISE NOTICE '   3. Nhan vien xem ket qua trong lich su don tu';
    RAISE NOTICE '========================================';
END $$;


