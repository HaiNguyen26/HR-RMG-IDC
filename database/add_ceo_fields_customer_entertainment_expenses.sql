-- Migration script to add CEO fields to customer_entertainment_expense_requests table
-- This allows CEO (Lê Thanh Tùng) to approve customer entertainment expenses

-- Add ceo_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_entertainment_expense_requests' 
        AND column_name = 'ceo_id'
    ) THEN
        ALTER TABLE customer_entertainment_expense_requests 
        ADD COLUMN ceo_id INTEGER REFERENCES employees(id);
    END IF;
END $$;

-- Add ceo_decision column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_entertainment_expense_requests' 
        AND column_name = 'ceo_decision'
    ) THEN
        ALTER TABLE customer_entertainment_expense_requests 
        ADD COLUMN ceo_decision VARCHAR(20);
    END IF;
END $$;

-- Add ceo_notes column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_entertainment_expense_requests' 
        AND column_name = 'ceo_notes'
    ) THEN
        ALTER TABLE customer_entertainment_expense_requests 
        ADD COLUMN ceo_notes TEXT;
    END IF;
END $$;

-- Add ceo_decision_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_entertainment_expense_requests' 
        AND column_name = 'ceo_decision_at'
    ) THEN
        ALTER TABLE customer_entertainment_expense_requests 
        ADD COLUMN ceo_decision_at TIMESTAMP WITHOUT TIME ZONE;
    END IF;
END $$;

-- Create index on ceo_id for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_expense_ceo ON customer_entertainment_expense_requests(ceo_id);

COMMENT ON COLUMN customer_entertainment_expense_requests.ceo_id IS 'ID của Tổng Giám đốc (Lê Thanh Tùng) có thể duyệt';
COMMENT ON COLUMN customer_entertainment_expense_requests.ceo_decision IS 'Quyết định của Tổng Giám đốc: APPROVED, REJECTED';
COMMENT ON COLUMN customer_entertainment_expense_requests.ceo_notes IS 'Ghi chú của Tổng Giám đốc khi duyệt';
COMMENT ON COLUMN customer_entertainment_expense_requests.ceo_decision_at IS 'Thời gian Tổng Giám đốc đưa ra quyết định';

