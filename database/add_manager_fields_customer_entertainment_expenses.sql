-- Migration script to add manager_id and manager_name fields to customer_entertainment_expense_requests table
-- This allows direct managers (like Hoàng Đình Sạch) to approve customer entertainment expenses

-- Add manager_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_entertainment_expense_requests' 
        AND column_name = 'manager_id'
    ) THEN
        ALTER TABLE customer_entertainment_expense_requests 
        ADD COLUMN manager_id INTEGER REFERENCES employees(id);
    END IF;
END $$;

-- Add manager_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_entertainment_expense_requests' 
        AND column_name = 'manager_name'
    ) THEN
        ALTER TABLE customer_entertainment_expense_requests 
        ADD COLUMN manager_name VARCHAR(255);
    END IF;
END $$;

-- Add manager_decision column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_entertainment_expense_requests' 
        AND column_name = 'manager_decision'
    ) THEN
        ALTER TABLE customer_entertainment_expense_requests 
        ADD COLUMN manager_decision VARCHAR(20);
    END IF;
END $$;

-- Add manager_notes column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_entertainment_expense_requests' 
        AND column_name = 'manager_notes'
    ) THEN
        ALTER TABLE customer_entertainment_expense_requests 
        ADD COLUMN manager_notes TEXT;
    END IF;
END $$;

-- Add manager_decision_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_entertainment_expense_requests' 
        AND column_name = 'manager_decision_at'
    ) THEN
        ALTER TABLE customer_entertainment_expense_requests 
        ADD COLUMN manager_decision_at TIMESTAMP WITHOUT TIME ZONE;
    END IF;
END $$;

-- Create index on manager_id for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_expense_manager ON customer_entertainment_expense_requests(manager_id);

COMMENT ON COLUMN customer_entertainment_expense_requests.manager_id IS 'ID của quản lý trực tiếp có thể duyệt (ví dụ: Hoàng Đình Sạch)';
COMMENT ON COLUMN customer_entertainment_expense_requests.manager_name IS 'Tên của quản lý trực tiếp';
COMMENT ON COLUMN customer_entertainment_expense_requests.manager_decision IS 'Quyết định của quản lý trực tiếp: APPROVED, REJECTED, REQUEST_CORRECTION';
COMMENT ON COLUMN customer_entertainment_expense_requests.manager_notes IS 'Ghi chú của quản lý trực tiếp khi duyệt';
COMMENT ON COLUMN customer_entertainment_expense_requests.manager_decision_at IS 'Thời gian quản lý trực tiếp đưa ra quyết định';
