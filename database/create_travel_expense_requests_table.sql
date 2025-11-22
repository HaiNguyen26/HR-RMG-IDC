-- ============================================
-- CREATE TRAVEL EXPENSE REQUESTS TABLE
-- ============================================
-- Migration: Tạo bảng travel_expense_requests cho module Quản lý Chi phí Công tác
-- Created: 2025-01-XX
-- Description: Bảng lưu trữ các yêu cầu chi phí công tác

CREATE TABLE IF NOT EXISTS travel_expense_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title TEXT,
    purpose TEXT,
    location TEXT NOT NULL,
    location_type VARCHAR(20) NOT NULL CHECK (location_type IN ('DOMESTIC', 'INTERNATIONAL')),
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    is_overnight BOOLEAN NOT NULL DEFAULT FALSE,
    requires_ceo BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(40) NOT NULL DEFAULT 'PENDING_LEVEL_1',
    current_step VARCHAR(40) NOT NULL DEFAULT 'LEVEL_1',
    estimated_cost NUMERIC(12, 2),
    requested_by INTEGER,
    manager_id INTEGER,
    manager_decision VARCHAR(20),
    manager_notes TEXT,
    manager_decision_at TIMESTAMP WITHOUT TIME ZONE,
    ceo_id INTEGER,
    ceo_decision VARCHAR(20),
    ceo_notes TEXT,
    ceo_decision_at TIMESTAMP WITHOUT TIME ZONE,
    finance_id INTEGER,
    finance_decision VARCHAR(20),
    finance_notes TEXT,
    finance_decision_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_travel_expense_status ON travel_expense_requests(status);
CREATE INDEX IF NOT EXISTS idx_travel_expense_employee ON travel_expense_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_travel_expense_location_type ON travel_expense_requests(location_type);
CREATE INDEX IF NOT EXISTS idx_travel_expense_created_at ON travel_expense_requests(created_at DESC);

-- Add comments
COMMENT ON TABLE travel_expense_requests IS 'Bảng lưu trữ yêu cầu chi phí công tác';
COMMENT ON COLUMN travel_expense_requests.employee_id IS 'ID của nhân viên yêu cầu';
COMMENT ON COLUMN travel_expense_requests.location_type IS 'Loại địa điểm: DOMESTIC (Trong nước) hoặc INTERNATIONAL (Nước ngoài)';
COMMENT ON COLUMN travel_expense_requests.status IS 'Trạng thái: PENDING_LEVEL_1, PENDING_LEVEL_2, APPROVED, REJECTED, etc.';
COMMENT ON COLUMN travel_expense_requests.current_step IS 'Bước hiện tại trong quy trình duyệt';
COMMENT ON COLUMN travel_expense_requests.requires_ceo IS 'Yêu cầu duyệt từ CEO (true nếu là nước ngoài hoặc chi phí cao)';

