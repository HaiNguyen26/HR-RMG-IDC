-- Migration: Add CCCD (Citizen ID) fields to candidates table if they don't exist
-- This migration adds so_cccd, ngay_cap_cccd, and noi_cap_cccd columns

-- Add so_cccd column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'candidates' 
        AND column_name = 'so_cccd'
    ) THEN
        ALTER TABLE candidates 
        ADD COLUMN so_cccd VARCHAR(20);
        
        COMMENT ON COLUMN candidates.so_cccd IS 'Số CCCD/CMND của ứng viên';
        
        -- Add unique constraint if table has data
        -- Note: We use a conditional unique constraint to avoid conflicts with existing NULL values
        IF EXISTS (SELECT 1 FROM candidates WHERE so_cccd IS NOT NULL) THEN
            -- Only add unique constraint if there are non-null values
            -- For now, we'll create the column without constraint first
            -- The unique constraint will be added in a separate step if needed
        END IF;
    END IF;
END $$;

-- Add ngay_cap_cccd column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'candidates' 
        AND column_name = 'ngay_cap_cccd'
    ) THEN
        ALTER TABLE candidates 
        ADD COLUMN ngay_cap_cccd DATE;
        
        COMMENT ON COLUMN candidates.ngay_cap_cccd IS 'Ngày cấp CCCD/CMND';
    END IF;
END $$;

-- Add noi_cap_cccd column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'candidates' 
        AND column_name = 'noi_cap_cccd'
    ) THEN
        ALTER TABLE candidates 
        ADD COLUMN noi_cap_cccd VARCHAR(255);
        
        COMMENT ON COLUMN candidates.noi_cap_cccd IS 'Nơi cấp CCCD/CMND';
    END IF;
END $$;

-- Add unique constraint for so_cccd if it doesn't exist and column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'candidates' 
        AND column_name = 'so_cccd'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'candidates' 
        AND constraint_name = 'unique_cccd'
    ) THEN
        -- Only add unique constraint if there are no duplicate non-null values
        IF NOT EXISTS (
            SELECT so_cccd 
            FROM candidates 
            WHERE so_cccd IS NOT NULL 
            GROUP BY so_cccd 
            HAVING COUNT(*) > 1
        ) THEN
            ALTER TABLE candidates 
            ADD CONSTRAINT unique_cccd UNIQUE(so_cccd);
        END IF;
    END IF;
END $$;
