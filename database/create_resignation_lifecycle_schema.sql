-- ============================================================
-- Schema: Quy trình xin nghỉ việc (Resignation Lifecycle)
-- Không Draft, không Reject, chỉ xác nhận tiếp nhận + deadline tự động
-- ============================================================

BEGIN;

-- Bảng chính: đơn xin nghỉ việc
CREATE TABLE IF NOT EXISTS resignation_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

    -- Thông tin đơn
    submitted_at DATE NOT NULL DEFAULT CURRENT_DATE,
    intended_last_work_date DATE NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,

    -- Trạng thái (lifecycle)
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN (
        'SUBMITTED',
        'HR_ACKNOWLEDGED',
        'PENDING_DIRECT_MANAGER',
        'PENDING_INDIRECT_MANAGER',
        'PENDING_BRANCH_DIRECTOR',
        'NOTICE_PERIOD_RUNNING',
        'PRE_EXIT_CLEARANCE',
        'LAST_WORKING_DAY',
        'CONTRACT_LIQUIDATION',
        'CLOSED'
    )),

    -- Deadline pháp lý (tính từ loại HĐ)
    required_notice_days INTEGER NOT NULL DEFAULT 30,
    contract_type VARCHAR(255),

    -- HR: xác nhận đã nhận
    hr_acknowledged_at TIMESTAMP,
    hr_acknowledged_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,

    -- Quản lý trực tiếp: xác nhận + dự án, người thay thế, rủi ro
    direct_manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    direct_manager_ack_at TIMESTAMP,
    direct_manager_notes TEXT,
    current_project TEXT,
    temporary_replacement TEXT,
    work_risk_notes TEXT,

    -- Quản lý gián tiếp
    indirect_manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    indirect_manager_ack_at TIMESTAMP,
    indirect_manager_notes TEXT,

    -- Giám đốc chi nhánh
    branch_director_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    branch_director_ack_at TIMESTAMP,
    branch_director_notes TEXT,

    -- Notice period bắt đầu
    notice_period_started_at TIMESTAMP,

    -- Pre-Exit Clearance (3 ngày trước ngày nghỉ)
    it_clearance_at TIMESTAMP,
    it_clearance_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    finance_clearance_at TIMESTAMP,
    finance_clearance_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,

    -- Ngày làm việc cuối
    last_working_day_at DATE,
    employee_made_inactive_at TIMESTAMP,

    -- Contract liquidation (14 ngày, tối đa 30)
    contract_liquidation_deadline DATE,
    contract_liquidation_extended BOOLEAN DEFAULT FALSE,
    contract_liquidation_completed_at TIMESTAMP,
    closed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resignation_requests_employee ON resignation_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_resignation_requests_status ON resignation_requests(status);
CREATE INDEX IF NOT EXISTS idx_resignation_requests_intended_date ON resignation_requests(intended_last_work_date);
CREATE INDEX IF NOT EXISTS idx_resignation_requests_hr_ack ON resignation_requests(hr_acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_resignation_requests_direct_manager ON resignation_requests(direct_manager_id);
CREATE INDEX IF NOT EXISTS idx_resignation_requests_indirect_manager ON resignation_requests(indirect_manager_id);
CREATE INDEX IF NOT EXISTS idx_resignation_requests_branch_director ON resignation_requests(branch_director_id);

-- Checklist bàn giao (bắt buộc trong notice period)
CREATE TABLE IF NOT EXISTS resignation_handover_items (
    id SERIAL PRIMARY KEY,
    resignation_request_id INTEGER NOT NULL REFERENCES resignation_requests(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    completed_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resignation_handover_request ON resignation_handover_items(resignation_request_id);

COMMIT;
