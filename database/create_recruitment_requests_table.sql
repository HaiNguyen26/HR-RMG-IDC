-- ============================================
-- CREATE RECRUITMENT REQUESTS TABLE
-- ============================================
-- Migration: Tạo bảng recruitment_requests cho module Yêu cầu tuyển dụng
-- Created: 2025-01-XX
-- Description: Bảng lưu trữ các yêu cầu tuyển dụng từ các phòng ban (direct/indirect managers)

CREATE TABLE IF NOT EXISTS recruitment_requests (
    id SERIAL PRIMARY KEY,
    manager_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    manager_type VARCHAR(20) NOT NULL CHECK (manager_type IN ('DIRECT', 'INDIRECT')),
    
    -- PHẦN I: VỊ TRÍ TUYỂN DỤNG
    chuc_danh_can_tuyen VARCHAR(255) NOT NULL,
    so_luong_yeu_cau INTEGER NOT NULL,
    phong_ban VARCHAR(255) NOT NULL,
    nguoi_quan_ly_truc_tiep VARCHAR(255),
    mo_ta_cong_viec VARCHAR(20) CHECK (mo_ta_cong_viec IN ('co', 'chua_co')),
    loai_lao_dong VARCHAR(20) CHECK (loai_lao_dong IN ('thoi_vu', 'toan_thoi_gian')),
    ly_do_tuyen JSONB,
    ly_do_khac_ghi_chu TEXT,
    
    -- PHẦN II: TIÊU CHUẨN TUYỂN CHỌN
    tieu_chuan_tuyen_chon JSONB,
    
    -- Status
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recruitment_requests_manager_id ON recruitment_requests(manager_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_requests_status ON recruitment_requests(status);
CREATE INDEX IF NOT EXISTS idx_recruitment_requests_created_at ON recruitment_requests(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE recruitment_requests IS 'Bảng lưu trữ yêu cầu tuyển dụng từ các phòng ban';
COMMENT ON COLUMN recruitment_requests.manager_id IS 'ID của manager (direct hoặc indirect) gửi yêu cầu';
COMMENT ON COLUMN recruitment_requests.manager_type IS 'Loại manager: DIRECT hoặc INDIRECT';
COMMENT ON COLUMN recruitment_requests.ly_do_tuyen IS 'JSONB chứa lý do tuyển: {tuyenThayThe: bool, tenNguoiThayThe: string, nhuCauTang: bool, viTriCongViecMoi: bool}';
COMMENT ON COLUMN recruitment_requests.tieu_chuan_tuyen_chon IS 'JSONB chứa tiêu chuẩn tuyển chọn (PHẦN II)';
COMMENT ON COLUMN recruitment_requests.status IS 'Trạng thái: PENDING, APPROVED, REJECTED, IN_PROGRESS, COMPLETED';

