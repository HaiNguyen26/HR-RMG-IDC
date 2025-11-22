-- ============================================
-- CREATE INTERVIEW REQUESTS TABLE
-- ============================================
-- Migration: Tạo bảng interview_requests cho module Duyệt Yêu cầu Phỏng vấn
-- Created: 2025-01-XX
-- Description: Bảng lưu trữ các yêu cầu phỏng vấn ứng viên từ HR

CREATE TABLE IF NOT EXISTS interview_requests (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    manager_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    manager_name VARCHAR(255) NOT NULL,
    indirect_manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    indirect_manager_name VARCHAR(255),
    interview_date DATE,
    interview_time TIME,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PENDING_EVALUATION')),
    notes TEXT,
    created_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add evaluation columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_requests' AND column_name='indirect_manager_id') THEN
        ALTER TABLE interview_requests ADD COLUMN indirect_manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_requests' AND column_name='indirect_manager_name') THEN
        ALTER TABLE interview_requests ADD COLUMN indirect_manager_name VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_requests' AND column_name='interview_date') THEN
        ALTER TABLE interview_requests ADD COLUMN interview_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_requests' AND column_name='interview_time') THEN
        ALTER TABLE interview_requests ADD COLUMN interview_time TIME;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_requests' AND column_name='evaluation_criteria_1') THEN
        ALTER TABLE interview_requests ADD COLUMN evaluation_criteria_1 BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_requests' AND column_name='evaluation_criteria_2') THEN
        ALTER TABLE interview_requests ADD COLUMN evaluation_criteria_2 BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_requests' AND column_name='evaluation_criteria_3') THEN
        ALTER TABLE interview_requests ADD COLUMN evaluation_criteria_3 BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_requests' AND column_name='evaluation_criteria_4') THEN
        ALTER TABLE interview_requests ADD COLUMN evaluation_criteria_4 BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_requests' AND column_name='evaluation_criteria_5') THEN
        ALTER TABLE interview_requests ADD COLUMN evaluation_criteria_5 BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_requests' AND column_name='evaluation_notes') THEN
        ALTER TABLE interview_requests ADD COLUMN evaluation_notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_requests' AND column_name='direct_manager_evaluated') THEN
        ALTER TABLE interview_requests ADD COLUMN direct_manager_evaluated BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_requests' AND column_name='direct_manager_evaluation_data') THEN
        ALTER TABLE interview_requests ADD COLUMN direct_manager_evaluation_data JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_requests' AND column_name='indirect_manager_evaluated') THEN
        ALTER TABLE interview_requests ADD COLUMN indirect_manager_evaluated BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='interview_requests' AND column_name='indirect_manager_evaluation_data') THEN
        ALTER TABLE interview_requests ADD COLUMN indirect_manager_evaluation_data JSONB;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_interview_requests_candidate_id ON interview_requests(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interview_requests_manager_id ON interview_requests(manager_id);
CREATE INDEX IF NOT EXISTS idx_interview_requests_status ON interview_requests(status);
CREATE INDEX IF NOT EXISTS idx_interview_requests_indirect_manager_id ON interview_requests(indirect_manager_id);

-- Add comments
COMMENT ON TABLE interview_requests IS 'Bảng lưu trữ yêu cầu phỏng vấn ứng viên từ HR';
COMMENT ON COLUMN interview_requests.candidate_id IS 'ID của ứng viên cần phỏng vấn';
COMMENT ON COLUMN interview_requests.manager_id IS 'ID của manager (direct hoặc indirect) được yêu cầu phỏng vấn';
COMMENT ON COLUMN interview_requests.status IS 'Trạng thái: PENDING, APPROVED, REJECTED, PENDING_EVALUATION';
COMMENT ON COLUMN interview_requests.direct_manager_evaluation_data IS 'JSONB chứa dữ liệu đánh giá từ direct manager';
COMMENT ON COLUMN interview_requests.indirect_manager_evaluation_data IS 'JSONB chứa dữ liệu đánh giá từ indirect manager';

