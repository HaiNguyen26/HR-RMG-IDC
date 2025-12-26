-- ============================================================
-- Script để sửa các đơn có team_lead_id sai
-- Vấn đề: Khi có nhiều người cùng tên, các đơn cũ có thể có team_lead_id trỏ sai
-- Giải pháp: Tìm lại đúng manager dựa trên tên + chi_nhanh của nhân viên tạo đơn
-- ============================================================

BEGIN;

-- Function để normalize tên (loại bỏ dấu tiếng Việt)
CREATE OR REPLACE FUNCTION normalize_name(name_text TEXT)
RETURNS TEXT AS $$
BEGIN
    IF name_text IS NULL THEN
        RETURN '';
    END IF;
    RETURN lower(trim(regexp_replace(name_text, '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function để normalize chi_nhanh (bỏ dấu, lowercase, trim)
CREATE OR REPLACE FUNCTION normalize_chi_nhanh(chi_nhanh_text TEXT)
RETURNS TEXT AS $$
BEGIN
    IF chi_nhanh_text IS NULL THEN
        RETURN NULL;
    END IF;
    -- Bỏ dấu tiếng Việt
    RETURN lower(trim(translate(
        chi_nhanh_text,
        'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
        'aaaaaaaaaaaaaaaaaeeeeeeeeeeiiiiioooooooooooooooouuuuuuuuuuyyyyyd'
    )));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function để check match chi_nhanh
CREATE OR REPLACE FUNCTION chi_nhanh_matches(emp_chi_nhanh TEXT, user_chi_nhanh TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    normalized_emp TEXT;
    normalized_user TEXT;
BEGIN
    IF user_chi_nhanh IS NULL THEN
        RETURN TRUE; -- Nếu user không có chi_nhanh, match tất cả
    END IF;
    
    normalized_emp := normalize_chi_nhanh(emp_chi_nhanh);
    normalized_user := normalize_chi_nhanh(user_chi_nhanh);
    
    IF normalized_emp IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Exact match
    IF normalized_emp = normalized_user THEN
        RETURN TRUE;
    END IF;
    
    -- Partial match (một trong hai chứa phần còn lại)
    IF normalized_emp LIKE '%' || normalized_user || '%' OR normalized_user LIKE '%' || normalized_emp || '%' THEN
        -- Kiểm tra xem có từ chung không (để tránh false positive)
        -- Ví dụ: "ha noi" không nên match với "ho chi minh"
        -- Đơn giản hóa: chỉ match nếu có ít nhất 1 từ trùng
        RETURN (
            SELECT COUNT(*) > 0
            FROM (
                SELECT unnest(string_to_array(normalized_emp, ' ')) AS word1
            ) w1
            JOIN (
                SELECT unnest(string_to_array(normalized_user, ' ')) AS word2
            ) w2 ON w1.word1 = w2.word2
            WHERE length(w1.word1) > 1
        );
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 1. Fix leave_requests có team_lead_id sai
-- ============================================================

-- Tạo bảng tạm để lưu các đơn cần fix
CREATE TEMP TABLE IF NOT EXISTS leave_requests_to_fix AS
SELECT 
    lr.id,
    lr.employee_id,
    lr.team_lead_id AS current_team_lead_id,
    e.ho_ten AS employee_name,
    e.chi_nhanh AS employee_chi_nhanh,
    e.quan_ly_truc_tiep AS employee_manager_name,
    current_team_lead.ho_ten AS current_team_lead_name,
    current_team_lead.chi_nhanh AS current_team_lead_chi_nhanh
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.id
LEFT JOIN employees current_team_lead ON lr.team_lead_id = current_team_lead.id
WHERE e.quan_ly_truc_tiep IS NOT NULL 
  AND e.quan_ly_truc_tiep != ''
  AND lr.status = 'PENDING' -- Chỉ fix đơn đang chờ duyệt
ORDER BY lr.id;

-- Debug: Xem các đơn cần fix
SELECT 
    id,
    employee_name,
    employee_chi_nhanh,
    employee_manager_name,
    current_team_lead_name,
    current_team_lead_chi_nhanh
FROM leave_requests_to_fix
WHERE current_team_lead_name != employee_manager_name
   OR NOT (
       -- Kiểm tra xem chi_nhanh có match không
       chi_nhanh_matches(current_team_lead_chi_nhanh, employee_chi_nhanh)
       OR (employee_chi_nhanh IS NULL AND current_team_lead_chi_nhanh IS NULL)
   );

-- Tìm và update team_lead_id đúng
DO $$
DECLARE
    req RECORD;
    correct_manager_id INTEGER;
    normalized_manager_name TEXT;
    normalized_employee_chi_nhanh TEXT;
BEGIN
    FOR req IN 
        SELECT * FROM leave_requests_to_fix
        WHERE employee_manager_name IS NOT NULL
    LOOP
        normalized_manager_name := normalize_name(req.employee_manager_name);
        normalized_employee_chi_nhanh := normalize_chi_nhanh(req.employee_chi_nhanh);
        
        -- Tìm manager đúng dựa trên tên và chi_nhanh
        SELECT id INTO correct_manager_id
        FROM employees
        WHERE normalize_name(ho_ten) = normalized_manager_name
          AND (normalized_employee_chi_nhanh IS NULL OR chi_nhanh_matches(chi_nhanh, normalized_employee_chi_nhanh))
          AND (trang_thai = 'ACTIVE' OR trang_thai = 'PENDING' OR trang_thai IS NULL)
        ORDER BY 
            -- Ưu tiên match chi_nhanh nếu có nhiều kết quả
            CASE 
                WHEN normalized_employee_chi_nhanh IS NOT NULL 
                     AND chi_nhanh_matches(chi_nhanh, normalized_employee_chi_nhanh) 
                THEN 0 
                ELSE 1 
            END,
            id
        LIMIT 1;
        
        -- Nếu tìm thấy manager đúng và khác với team_lead_id hiện tại
        IF correct_manager_id IS NOT NULL AND correct_manager_id != req.current_team_lead_id THEN
            UPDATE leave_requests
            SET team_lead_id = correct_manager_id,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = req.id;
            
            RAISE NOTICE 'Fixed leave_request %: employee % (chi_nhanh: %) - changed team_lead from % to %', 
                req.id, req.employee_name, req.employee_chi_nhanh, req.current_team_lead_id, correct_manager_id;
        ELSIF correct_manager_id IS NULL THEN
            RAISE WARNING 'Could not find correct manager for leave_request %: employee % (chi_nhanh: %), manager_name: %', 
                req.id, req.employee_name, req.employee_chi_nhanh, req.employee_manager_name;
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- 2. Fix overtime_requests có team_lead_id sai
-- ============================================================

CREATE TEMP TABLE IF NOT EXISTS overtime_requests_to_fix AS
SELECT 
    orq.id,
    orq.employee_id,
    orq.team_lead_id AS current_team_lead_id,
    e.ho_ten AS employee_name,
    e.chi_nhanh AS employee_chi_nhanh,
    e.quan_ly_truc_tiep AS employee_manager_name,
    current_team_lead.ho_ten AS current_team_lead_name,
    current_team_lead.chi_nhanh AS current_team_lead_chi_nhanh
FROM overtime_requests orq
JOIN employees e ON orq.employee_id = e.id
LEFT JOIN employees current_team_lead ON orq.team_lead_id = current_team_lead.id
WHERE e.quan_ly_truc_tiep IS NOT NULL 
  AND e.quan_ly_truc_tiep != ''
  AND orq.status = 'PENDING' -- Chỉ fix đơn đang chờ duyệt
ORDER BY orq.id;

DO $$
DECLARE
    req RECORD;
    correct_manager_id INTEGER;
    normalized_manager_name TEXT;
    normalized_employee_chi_nhanh TEXT;
BEGIN
    FOR req IN 
        SELECT * FROM overtime_requests_to_fix
        WHERE employee_manager_name IS NOT NULL
    LOOP
        normalized_manager_name := normalize_name(req.employee_manager_name);
        normalized_employee_chi_nhanh := normalize_chi_nhanh(req.employee_chi_nhanh);
        
        SELECT id INTO correct_manager_id
        FROM employees
        WHERE normalize_name(ho_ten) = normalized_manager_name
          AND (normalized_employee_chi_nhanh IS NULL OR chi_nhanh_matches(chi_nhanh, normalized_employee_chi_nhanh))
          AND (trang_thai = 'ACTIVE' OR trang_thai = 'PENDING' OR trang_thai IS NULL)
        ORDER BY 
            CASE 
                WHEN normalized_employee_chi_nhanh IS NOT NULL 
                     AND chi_nhanh_matches(chi_nhanh, normalized_employee_chi_nhanh) 
                THEN 0 
                ELSE 1 
            END,
            id
        LIMIT 1;
        
        IF correct_manager_id IS NOT NULL AND correct_manager_id != req.current_team_lead_id THEN
            UPDATE overtime_requests
            SET team_lead_id = correct_manager_id,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = req.id;
            
            RAISE NOTICE 'Fixed overtime_request %: employee % (chi_nhanh: %) - changed team_lead from % to %', 
                req.id, req.employee_name, req.employee_chi_nhanh, req.current_team_lead_id, correct_manager_id;
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- 3. Fix attendance_requests có team_lead_id sai
-- ============================================================

CREATE TEMP TABLE IF NOT EXISTS attendance_requests_to_fix AS
SELECT 
    adj.id,
    adj.employee_id,
    adj.team_lead_id AS current_team_lead_id,
    e.ho_ten AS employee_name,
    e.chi_nhanh AS employee_chi_nhanh,
    e.quan_ly_truc_tiep AS employee_manager_name,
    current_team_lead.ho_ten AS current_team_lead_name,
    current_team_lead.chi_nhanh AS current_team_lead_chi_nhanh
FROM attendance_adjustments adj
JOIN employees e ON adj.employee_id = e.id
LEFT JOIN employees current_team_lead ON adj.team_lead_id = current_team_lead.id
WHERE e.quan_ly_truc_tiep IS NOT NULL 
  AND e.quan_ly_truc_tiep != ''
  AND adj.team_lead_id IS NOT NULL
  AND adj.status = 'PENDING' -- Chỉ fix đơn đang chờ duyệt
ORDER BY adj.id;

DO $$
DECLARE
    req RECORD;
    correct_manager_id INTEGER;
    normalized_manager_name TEXT;
    normalized_employee_chi_nhanh TEXT;
BEGIN
    FOR req IN 
        SELECT * FROM attendance_requests_to_fix
        WHERE employee_manager_name IS NOT NULL
    LOOP
        normalized_manager_name := normalize_name(req.employee_manager_name);
        normalized_employee_chi_nhanh := normalize_chi_nhanh(req.employee_chi_nhanh);
        
        SELECT id INTO correct_manager_id
        FROM employees
        WHERE normalize_name(ho_ten) = normalized_manager_name
          AND (normalized_employee_chi_nhanh IS NULL OR chi_nhanh_matches(chi_nhanh, normalized_employee_chi_nhanh))
          AND (trang_thai = 'ACTIVE' OR trang_thai = 'PENDING' OR trang_thai IS NULL)
        ORDER BY 
            CASE 
                WHEN normalized_employee_chi_nhanh IS NOT NULL 
                     AND chi_nhanh_matches(chi_nhanh, normalized_employee_chi_nhanh) 
                THEN 0 
                ELSE 1 
            END,
            id
        LIMIT 1;
        
        IF correct_manager_id IS NOT NULL AND correct_manager_id != req.current_team_lead_id THEN
            UPDATE attendance_adjustments
            SET team_lead_id = correct_manager_id,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = req.id;
            
            RAISE NOTICE 'Fixed attendance_request %: employee % (chi_nhanh: %) - changed team_lead from % to %', 
                req.id, req.employee_name, req.employee_chi_nhanh, req.current_team_lead_id, correct_manager_id;
        END IF;
    END LOOP;
END $$;

-- Cleanup: Drop temporary functions
DROP FUNCTION IF EXISTS normalize_name(TEXT);
DROP FUNCTION IF EXISTS normalize_chi_nhanh(TEXT);
DROP FUNCTION IF EXISTS chi_nhanh_matches(TEXT, TEXT);

COMMIT;

