-- Migration: Add CCCD (Citizen ID) fields to candidates table if they don't exist
-- This migration adds so_cccd, ngay_cap_cccd, and noi_cap_cccd columns

-- Check if candidates table exists first
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates'
    ) THEN
        -- Add so_cccd column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'candidates' 
            AND column_name = 'so_cccd'
        ) THEN
            ALTER TABLE candidates 
            ADD COLUMN so_cccd VARCHAR(20);
            
            COMMENT ON COLUMN candidates.so_cccd IS 'Số CCCD/CMND của ứng viên';
            
            RAISE NOTICE 'Added column so_cccd to candidates table';
        ELSE
            RAISE NOTICE 'Column so_cccd already exists in candidates table';
        END IF;
    ELSE
        RAISE NOTICE 'Candidates table does not exist, skipping migration';
    END IF;
END $$;

-- Add ngay_cap_cccd column if it doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'candidates' 
            AND column_name = 'ngay_cap_cccd'
        ) THEN
            ALTER TABLE candidates 
            ADD COLUMN ngay_cap_cccd DATE;
            
            COMMENT ON COLUMN candidates.ngay_cap_cccd IS 'Ngày cấp CCCD/CMND';
            
            RAISE NOTICE 'Added column ngay_cap_cccd to candidates table';
        ELSE
            RAISE NOTICE 'Column ngay_cap_cccd already exists in candidates table';
        END IF;
    END IF;
END $$;

-- Add noi_cap_cccd column if it doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'candidates' 
            AND column_name = 'noi_cap_cccd'
        ) THEN
            ALTER TABLE candidates 
            ADD COLUMN noi_cap_cccd VARCHAR(255);
            
            COMMENT ON COLUMN candidates.noi_cap_cccd IS 'Nơi cấp CCCD/CMND';
            
            RAISE NOTICE 'Added column noi_cap_cccd to candidates table';
        ELSE
            RAISE NOTICE 'Column noi_cap_cccd already exists in candidates table';
        END IF;
    END IF;
END $$;

-- Add unique constraint for so_cccd if it doesn't exist and column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates'
    ) THEN
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'candidates' 
            AND column_name = 'so_cccd'
        ) AND NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE table_schema = 'public'
            AND table_name = 'candidates' 
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
                
                RAISE NOTICE 'Added unique constraint unique_cccd to candidates table';
            ELSE
                RAISE NOTICE 'Cannot add unique_cccd constraint: duplicate values found';
            END IF;
        ELSE
            RAISE NOTICE 'Column so_cccd does not exist or constraint unique_cccd already exists';
        END IF;
    END IF;
END $$;
