-- Quick migration: Add trang_thai column to candidates table if it doesn't exist
-- This column is essential for tracking candidate status

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates'
    ) THEN
        -- Add trang_thai column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'candidates' 
            AND column_name = 'trang_thai'
        ) THEN
            ALTER TABLE candidates ADD COLUMN trang_thai VARCHAR(50) DEFAULT 'NEW';
            RAISE NOTICE '✓ Added column trang_thai to candidates table';
            
            -- Add check constraint for trang_thai
            ALTER TABLE candidates 
            ADD CONSTRAINT candidates_trang_thai_check 
            CHECK (trang_thai IN (
                'NEW',
                'PENDING_INTERVIEW',
                'PENDING_MANAGER',
                'TRANSFERRED_TO_INTERVIEW',
                'WAITING_FOR_OTHER_APPROVAL',
                'READY_FOR_INTERVIEW',
                'PASSED',
                'FAILED',
                'ON_PROBATION'
            ));
            RAISE NOTICE '✓ Added check constraint for trang_thai';
        ELSE
            RAISE NOTICE 'Column trang_thai already exists in candidates table';
        END IF;
        
        -- Create index if it doesn't exist
        CREATE INDEX IF NOT EXISTS idx_candidates_trang_thai ON candidates(trang_thai);
        RAISE NOTICE '✓ Index idx_candidates_trang_thai ensured';
    ELSE
        RAISE NOTICE 'Candidates table does not exist, skipping migration';
    END IF;
END $$;
