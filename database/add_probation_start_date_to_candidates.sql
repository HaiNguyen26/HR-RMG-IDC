-- Migration: Add probation_start_date column to candidates table
-- This column stores the start date of the probation period for candidates

-- Add probation_start_date column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'candidates' 
        AND column_name = 'probation_start_date'
    ) THEN
        ALTER TABLE candidates 
        ADD COLUMN probation_start_date DATE;
        
        COMMENT ON COLUMN candidates.probation_start_date IS 'Ngày bắt đầu thử việc của ứng viên';
    END IF;
END $$;


