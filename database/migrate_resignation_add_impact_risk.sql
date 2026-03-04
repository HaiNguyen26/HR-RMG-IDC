-- Bổ sung cột Impact & Risk cho quản lý trực tiếp (Impact Confirmation)
ALTER TABLE resignation_requests ADD COLUMN IF NOT EXISTS impact_level VARCHAR(20);
ALTER TABLE resignation_requests ADD COLUMN IF NOT EXISTS handover_plan TEXT;
ALTER TABLE resignation_requests ADD COLUMN IF NOT EXISTS handover_deadline DATE;
ALTER TABLE resignation_requests ADD COLUMN IF NOT EXISTS risk_has_replacement BOOLEAN DEFAULT FALSE;
ALTER TABLE resignation_requests ADD COLUMN IF NOT EXISTS risk_urgent_hire BOOLEAN DEFAULT FALSE;
ALTER TABLE resignation_requests ADD COLUMN IF NOT EXISTS risk_revenue BOOLEAN DEFAULT FALSE;
ALTER TABLE resignation_requests ADD COLUMN IF NOT EXISTS risk_customer BOOLEAN DEFAULT FALSE;
