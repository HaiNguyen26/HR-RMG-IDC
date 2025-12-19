-- Migration: Add address fields to candidates table if they don't exist
-- This migration adds dia_chi_tam_tru and nguyen_quan address columns

-- Check if candidates table exists first
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates'
    ) THEN
        -- Add dia_chi_tam_tru_so_nha
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'candidates' 
            AND column_name = 'dia_chi_tam_tru_so_nha'
        ) THEN
            ALTER TABLE candidates ADD COLUMN dia_chi_tam_tru_so_nha VARCHAR(255);
            RAISE NOTICE 'Added column dia_chi_tam_tru_so_nha';
        END IF;

        -- Add dia_chi_tam_tru_phuong_xa
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'candidates' 
            AND column_name = 'dia_chi_tam_tru_phuong_xa'
        ) THEN
            ALTER TABLE candidates ADD COLUMN dia_chi_tam_tru_phuong_xa VARCHAR(255);
            RAISE NOTICE 'Added column dia_chi_tam_tru_phuong_xa';
        END IF;

        -- Add dia_chi_tam_tru_quan_huyen
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'candidates' 
            AND column_name = 'dia_chi_tam_tru_quan_huyen'
        ) THEN
            ALTER TABLE candidates ADD COLUMN dia_chi_tam_tru_quan_huyen VARCHAR(255);
            RAISE NOTICE 'Added column dia_chi_tam_tru_quan_huyen';
        END IF;

        -- Add dia_chi_tam_tru_thanh_pho_tinh
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'candidates' 
            AND column_name = 'dia_chi_tam_tru_thanh_pho_tinh'
        ) THEN
            ALTER TABLE candidates ADD COLUMN dia_chi_tam_tru_thanh_pho_tinh VARCHAR(255);
            RAISE NOTICE 'Added column dia_chi_tam_tru_thanh_pho_tinh';
        END IF;

        -- Add nguyen_quan_so_nha
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'candidates' 
            AND column_name = 'nguyen_quan_so_nha'
        ) THEN
            ALTER TABLE candidates ADD COLUMN nguyen_quan_so_nha VARCHAR(255);
            RAISE NOTICE 'Added column nguyen_quan_so_nha';
        END IF;

        -- Add nguyen_quan_phuong_xa
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'candidates' 
            AND column_name = 'nguyen_quan_phuong_xa'
        ) THEN
            ALTER TABLE candidates ADD COLUMN nguyen_quan_phuong_xa VARCHAR(255);
            RAISE NOTICE 'Added column nguyen_quan_phuong_xa';
        END IF;

        -- Add nguyen_quan_quan_huyen
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'candidates' 
            AND column_name = 'nguyen_quan_quan_huyen'
        ) THEN
            ALTER TABLE candidates ADD COLUMN nguyen_quan_quan_huyen VARCHAR(255);
            RAISE NOTICE 'Added column nguyen_quan_quan_huyen';
        END IF;

        -- Add nguyen_quan_thanh_pho_tinh
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'candidates' 
            AND column_name = 'nguyen_quan_thanh_pho_tinh'
        ) THEN
            ALTER TABLE candidates ADD COLUMN nguyen_quan_thanh_pho_tinh VARCHAR(255);
            RAISE NOTICE 'Added column nguyen_quan_thanh_pho_tinh';
        END IF;

        RAISE NOTICE 'Migration completed for address fields';
    ELSE
        RAISE NOTICE 'Candidates table does not exist, skipping migration';
    END IF;
END $$;
