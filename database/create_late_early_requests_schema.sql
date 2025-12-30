-- ============================================================
-- Schema cho quy trình xin đi trễ về sớm
-- Quy trình: Nhân viên -> Quản lý trực tiếp (duyệt/từ chối) -> Nhân viên xem kết quả
-- ============================================================

BEGIN;

-- ============================================================
-- BẢNG: late_early_requests (Đơn xin đi trễ về sớm)
-- ============================================================
CREATE TABLE IF NOT EXISTS late_early_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    team_lead_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Thông tin đơn
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('LATE', 'EARLY')),
    request_date DATE NOT NULL,
    time_value TIME NOT NULL, -- Thời gian đi trễ hoặc về sớm
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
CREATE INDEX IF NOT EXISTS idx_late_early_requests_employee ON late_early_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_late_early_requests_team_lead ON late_early_requests(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_late_early_requests_status ON late_early_requests(status);
CREATE INDEX IF NOT EXISTS idx_late_early_requests_request_type ON late_early_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_late_early_requests_request_date ON late_early_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_late_early_requests_created_at ON late_early_requests(created_at DESC);

-- ============================================================
-- TRIGGER để tự động cập nhật updated_at
-- ============================================================
-- Function để cập nhật updated_at (nếu chưa có)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger cho late_early_requests
DROP TRIGGER IF EXISTS trg_late_early_requests_updated ON late_early_requests;
CREATE TRIGGER trg_late_early_requests_updated
    BEFORE UPDATE ON late_early_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================================
-- Thông báo
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Da tao xong schema cho quy trinh xin di tre ve som';
    RAISE NOTICE 'Bang da tao: late_early_requests';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Quy trinh:';
    RAISE NOTICE '   1. Nhan vien tao va gui don -> Status: PENDING';
    RAISE NOTICE '   2. Quan ly truc tiep duyet/tu choi -> Status: APPROVED/REJECTED';
    RAISE NOTICE '   3. Nhan vien xem ket qua trong lich su don tu';
    RAISE NOTICE '========================================';
END $$;

