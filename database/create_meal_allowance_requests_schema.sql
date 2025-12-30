-- ============================================================
-- Schema cho quy trình xin phụ cấp cơm công trình
-- Quy trình: Nhân viên -> Quản lý trực tiếp (duyệt/từ chối) -> HR
-- ============================================================

BEGIN;

-- ============================================================
-- BẢNG: meal_allowance_requests (Đơn xin phụ cấp cơm công trình)
-- ============================================================
CREATE TABLE IF NOT EXISTS meal_allowance_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    team_lead_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Thông tin đơn
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
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
-- BẢNG: meal_allowance_items (Chi tiết các mục cơm)
-- ============================================================
CREATE TABLE IF NOT EXISTS meal_allowance_items (
    id SERIAL PRIMARY KEY,
    meal_allowance_request_id INTEGER NOT NULL REFERENCES meal_allowance_requests(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    content TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES cho hiệu suất
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_meal_allowance_requests_employee ON meal_allowance_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_meal_allowance_requests_team_lead ON meal_allowance_requests(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_meal_allowance_requests_status ON meal_allowance_requests(status);
CREATE INDEX IF NOT EXISTS idx_meal_allowance_requests_created_at ON meal_allowance_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meal_allowance_items_request ON meal_allowance_items(meal_allowance_request_id);
CREATE INDEX IF NOT EXISTS idx_meal_allowance_items_expense_date ON meal_allowance_items(expense_date);

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

-- Trigger cho meal_allowance_requests
DROP TRIGGER IF EXISTS trg_meal_allowance_requests_updated ON meal_allowance_requests;
CREATE TRIGGER trg_meal_allowance_requests_updated
    BEFORE UPDATE ON meal_allowance_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================================
-- Thông báo
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Da tao xong schema cho quy trinh xin phu cap com cong trinh';
    RAISE NOTICE 'Bang da tao: meal_allowance_requests, meal_allowance_items';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Quy trinh:';
    RAISE NOTICE '   1. Nhan vien tao don voi nhieu muc com -> Status: PENDING';
    RAISE NOTICE '   2. Quan ly truc tiep duyet/tu choi -> Status: APPROVED/REJECTED';
    RAISE NOTICE '   3. HR xem va xu ly don da duoc duyet';
    RAISE NOTICE '========================================';
END $$;



