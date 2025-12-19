-- Quick migration: Add chi_nhanh column to candidates table if it doesn't exist
-- This is a simple, focused migration to fix the immediate error

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates'
    ) THEN
        -- Add chi_nhanh column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'candidates' 
            AND column_name = 'chi_nhanh'
        ) THEN
            ALTER TABLE candidates ADD COLUMN chi_nhanh VARCHAR(255);
            RAISE NOTICE '✓ Added column chi_nhanh to candidates table';
        ELSE
            RAISE NOTICE 'Column chi_nhanh already exists in candidates table';
        END IF;
        
        -- Create index if it doesn't exist
        CREATE INDEX IF NOT EXISTS idx_candidates_chi_nhanh ON candidates(chi_nhanh);
        RAISE NOTICE '✓ Index idx_candidates_chi_nhanh ensured';
    ELSE
        RAISE NOTICE 'Candidates table does not exist, skipping migration';
    END IF;
END $$;
