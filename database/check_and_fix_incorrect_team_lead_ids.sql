-- ============================================================
-- Script để kiểm tra và sửa các request đang trỏ sai team_lead_id
-- ============================================================

-- Helper functions
CREATE OR REPLACE FUNCTION normalize_name(name_text TEXT) RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(TRIM(name_text));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION normalize_chi_nhanh(chi_nhanh_text TEXT) RETURNS TEXT AS $$
BEGIN
    IF chi_nhanh_text IS NULL OR TRIM(chi_nhanh_text) = '' THEN
        RETURN NULL;
    END IF;
    -- Bỏ dấu và lowercase (simplified version - PostgreSQL không có hàm removeVietnameseAccents built-in)
    -- Sử dụng translate để bỏ một số dấu phổ biến
    RETURN LOWER(TRIM(REGEXP_REPLACE(chi_nhanh_text, '[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]', '', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION chi_nhanh_matches(chi_nhanh1 TEXT, chi_nhanh2 TEXT) RETURNS BOOLEAN AS $$
DECLARE
    norm1 TEXT;
    norm2 TEXT;
BEGIN
    norm1 := normalize_chi_nhanh(chi_nhanh1);
    norm2 := normalize_chi_nhanh(chi_nhanh2);
    
    IF norm1 IS NULL OR norm2 IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Exact match
    IF norm1 = norm2 THEN
        RETURN TRUE;
    END IF;
    
    -- Partial match: nếu một trong hai chứa phần còn lại
    IF norm1 LIKE '%' || norm2 || '%' OR norm2 LIKE '%' || norm1 || '%' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 1. Kiểm tra các leave_requests đang trỏ sai
-- ============================================================
SELECT 
    'leave_requests' AS table_name,
    lr.id AS request_id,
    e.id AS employee_id,
    e.ho_ten AS employee_name,
    e.chi_nhanh AS employee_chi_nhanh,
    e.quan_ly_truc_tiep AS quan_ly_truc_tiep_name,
    lr.team_lead_id AS current_team_lead_id,
    m_current.ho_ten AS current_team_lead_name,
    m_current.chi_nhanh AS current_team_lead_chi_nhanh,
    -- Manager ĐÚNG (cùng chi_nhanh với employee)
    m_correct.id AS correct_team_lead_id,
    m_correct.ho_ten AS correct_team_lead_name,
    m_correct.chi_nhanh AS correct_team_lead_chi_nhanh,
    CASE 
        WHEN m_correct.id IS NULL THEN 'ERROR: No manager found with same chi_nhanh'
        WHEN lr.team_lead_id = m_correct.id THEN 'CORRECT'
        WHEN lr.team_lead_id = 882 AND m_correct.id = 705 THEN 'INCORRECT: Should be ID 705 (Hà Nội) instead of ID 882 (Quảng Ngãi)'
        ELSE 'INCORRECT: Should be ID ' || m_correct.id || ' instead of ID ' || lr.team_lead_id
    END AS status
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.id
LEFT JOIN employees m_current ON lr.team_lead_id = m_current.id
LEFT JOIN employees m_correct ON 
    TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m_correct.ho_ten))
    AND chi_nhanh_matches(m_correct.chi_nhanh, e.chi_nhanh)
WHERE e.quan_ly_truc_tiep IS NOT NULL
  AND (LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn%văn%nghiêm%'
       OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen%van%nghiem%')
  AND (LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) LIKE '%hà nội%'
       OR LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) = 'ha noi')
ORDER BY 
    CASE 
        WHEN lr.team_lead_id = 882 AND m_correct.id = 705 THEN 1
        WHEN lr.team_lead_id != m_correct.id THEN 2
        ELSE 3
    END,
    lr.id;

-- ============================================================
-- 2. Tổng hợp: Có bao nhiêu request đang trỏ sai?
-- ============================================================
SELECT 
    'leave_requests' AS table_name,
    COUNT(*) AS total_requests,
    COUNT(CASE WHEN lr.team_lead_id != m_correct.id THEN 1 END) AS incorrect_count,
    COUNT(CASE WHEN lr.team_lead_id = 882 AND m_correct.id = 705 THEN 1 END) AS incorrect_882_to_705
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.id
LEFT JOIN employees m_correct ON 
    TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m_correct.ho_ten))
    AND chi_nhanh_matches(m_correct.chi_nhanh, e.chi_nhanh)
WHERE e.quan_ly_truc_tiep IS NOT NULL
  AND (LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn%văn%nghiêm%'
       OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen%van%nghiem%')
  AND (LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) LIKE '%hà nội%'
       OR LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) = 'ha noi')
  AND m_correct.id IS NOT NULL;

-- ============================================================
-- 3. Kiểm tra attendance_requests và overtime_requests
-- ============================================================

-- Kiểm tra attendance_requests (hoặc attendance_adjustments)
SELECT 
    'attendance_adjustments' AS table_name,
    adj.id AS request_id,
    e.id AS employee_id,
    e.ho_ten AS employee_name,
    e.chi_nhanh AS employee_chi_nhanh,
    e.quan_ly_truc_tiep AS quan_ly_truc_tiep_name,
    adj.team_lead_id AS current_team_lead_id,
    m_current.ho_ten AS current_team_lead_name,
    m_current.chi_nhanh AS current_team_lead_chi_nhanh,
    m_correct.id AS correct_team_lead_id,
    m_correct.ho_ten AS correct_team_lead_name,
    m_correct.chi_nhanh AS correct_team_lead_chi_nhanh,
    CASE 
        WHEN m_correct.id IS NULL THEN 'ERROR: No manager found'
        WHEN adj.team_lead_id = m_correct.id THEN 'CORRECT'
        WHEN adj.team_lead_id = 882 AND m_correct.id = 705 THEN 'INCORRECT: Should be ID 705'
        ELSE 'INCORRECT: Should be ID ' || m_correct.id
    END AS status
FROM attendance_adjustments adj
JOIN employees e ON adj.employee_id = e.id
LEFT JOIN employees m_current ON adj.team_lead_id = m_current.id
LEFT JOIN employees m_correct ON 
    TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m_correct.ho_ten))
    AND chi_nhanh_matches(m_correct.chi_nhanh, e.chi_nhanh)
WHERE e.quan_ly_truc_tiep IS NOT NULL
  AND (LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn%văn%nghiêm%'
       OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen%van%nghiem%')
  AND (LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) LIKE '%hà nội%'
       OR LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) = 'ha noi')
ORDER BY 
    CASE 
        WHEN adj.team_lead_id = 882 AND m_correct.id = 705 THEN 1
        WHEN adj.team_lead_id != m_correct.id THEN 2
        ELSE 3
    END,
    adj.id;

-- Kiểm tra overtime_requests
SELECT 
    'overtime_requests' AS table_name,
    orq.id AS request_id,
    e.id AS employee_id,
    e.ho_ten AS employee_name,
    e.chi_nhanh AS employee_chi_nhanh,
    e.quan_ly_truc_tiep AS quan_ly_truc_tiep_name,
    orq.team_lead_id AS current_team_lead_id,
    m_current.ho_ten AS current_team_lead_name,
    m_current.chi_nhanh AS current_team_lead_chi_nhanh,
    m_correct.id AS correct_team_lead_id,
    m_correct.ho_ten AS correct_team_lead_name,
    m_correct.chi_nhanh AS correct_team_lead_chi_nhanh,
    CASE 
        WHEN m_correct.id IS NULL THEN 'ERROR: No manager found'
        WHEN orq.team_lead_id = m_correct.id THEN 'CORRECT'
        WHEN orq.team_lead_id = 882 AND m_correct.id = 705 THEN 'INCORRECT: Should be ID 705'
        ELSE 'INCORRECT: Should be ID ' || m_correct.id
    END AS status
FROM overtime_requests orq
JOIN employees e ON orq.employee_id = e.id
LEFT JOIN employees m_current ON orq.team_lead_id = m_current.id
LEFT JOIN employees m_correct ON 
    TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m_correct.ho_ten))
    AND chi_nhanh_matches(m_correct.chi_nhanh, e.chi_nhanh)
WHERE e.quan_ly_truc_tiep IS NOT NULL
  AND (LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn%văn%nghiêm%'
       OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen%van%nghiem%')
  AND (LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) LIKE '%hà nội%'
       OR LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) = 'ha noi')
ORDER BY 
    CASE 
        WHEN orq.team_lead_id = 882 AND m_correct.id = 705 THEN 1
        WHEN orq.team_lead_id != m_correct.id THEN 2
        ELSE 3
    END,
    orq.id;

-- ============================================================
-- 4. Script để SỬA các request đang trỏ sai (CHẠY SAU KHI KIỂM TRA)
-- LƯU Ý: Chỉ sửa các request có status = 'PENDING' để không ảnh hưởng đến đơn đã được duyệt
-- ============================================================

-- Sửa leave_requests
BEGIN;
UPDATE leave_requests lr
SET team_lead_id = m_correct.id,
    updated_at = CURRENT_TIMESTAMP
FROM employees e
LEFT JOIN employees m_correct ON 
    TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m_correct.ho_ten))
    AND chi_nhanh_matches(m_correct.chi_nhanh, e.chi_nhanh)
WHERE lr.employee_id = e.id
  AND e.quan_ly_truc_tiep IS NOT NULL
  AND (LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn%văn%nghiêm%'
       OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen%van%nghiem%')
  AND (LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) LIKE '%hà nội%'
       OR LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) = 'ha noi')
  AND m_correct.id IS NOT NULL
  AND lr.team_lead_id != m_correct.id
  AND lr.status = 'PENDING'; -- Chỉ sửa đơn đang chờ duyệt

-- Kiểm tra số lượng đã sửa
SELECT 'leave_requests' AS table_name, COUNT(*) AS fixed_count
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.id
LEFT JOIN employees m_correct ON 
    TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m_correct.ho_ten))
    AND chi_nhanh_matches(m_correct.chi_nhanh, e.chi_nhanh)
WHERE e.quan_ly_truc_tiep IS NOT NULL
  AND (LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn%văn%nghiêm%'
       OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen%van%nghiem%')
  AND (LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) LIKE '%hà nội%'
       OR LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) = 'ha noi')
  AND m_correct.id IS NOT NULL
  AND lr.team_lead_id = m_correct.id
  AND lr.status = 'PENDING';

-- Sửa attendance_adjustments
UPDATE attendance_adjustments adj
SET team_lead_id = m_correct.id,
    updated_at = CURRENT_TIMESTAMP
FROM employees e
LEFT JOIN employees m_correct ON 
    TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m_correct.ho_ten))
    AND chi_nhanh_matches(m_correct.chi_nhanh, e.chi_nhanh)
WHERE adj.employee_id = e.id
  AND e.quan_ly_truc_tiep IS NOT NULL
  AND (LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn%văn%nghiêm%'
       OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen%van%nghiem%')
  AND (LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) LIKE '%hà nội%'
       OR LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) = 'ha noi')
  AND m_correct.id IS NOT NULL
  AND adj.team_lead_id != m_correct.id
  AND adj.status = 'PENDING';

-- Sửa overtime_requests
UPDATE overtime_requests orq
SET team_lead_id = m_correct.id,
    updated_at = CURRENT_TIMESTAMP
FROM employees e
LEFT JOIN employees m_correct ON 
    TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m_correct.ho_ten))
    AND chi_nhanh_matches(m_correct.chi_nhanh, e.chi_nhanh)
WHERE orq.employee_id = e.id
  AND e.quan_ly_truc_tiep IS NOT NULL
  AND (LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn%văn%nghiêm%'
       OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen%van%nghiem%')
  AND (LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) LIKE '%hà nội%'
       OR LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) = 'ha noi')
  AND m_correct.id IS NOT NULL
  AND orq.team_lead_id != m_correct.id
  AND orq.status = 'PENDING';

COMMIT;

-- Cleanup functions
DROP FUNCTION IF EXISTS normalize_name(TEXT);
DROP FUNCTION IF EXISTS normalize_chi_nhanh(TEXT);
DROP FUNCTION IF EXISTS chi_nhanh_matches(TEXT, TEXT);
