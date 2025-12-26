-- ============================================================
-- Script để tìm TẤT CẢ cấp dưới của các Nguyễn Văn Nghiêm
-- và kiểm tra họ đang được trỏ đến manager nào
-- ============================================================

-- Tìm TẤT CẢ nhân viên có quan_ly_truc_tiep = "Nguyễn Văn Nghiêm"
-- và kiểm tra manager nào được match (theo logic JOIN hiện tại)
SELECT 
    e.id AS employee_id,
    e.ho_ten AS employee_name,
    e.chi_nhanh AS employee_chi_nhanh,
    e.quan_ly_truc_tiep AS quan_ly_truc_tiep_name,
    -- Manager được match (theo tên - có thể match sai)
    m.id AS matched_manager_id,
    m.ho_ten AS matched_manager_name,
    m.chi_nhanh AS matched_manager_chi_nhanh,
    -- Manager ĐÚNG (cùng chi_nhanh với employee)
    m_correct.id AS correct_manager_id,
    m_correct.ho_ten AS correct_manager_name,
    m_correct.chi_nhanh AS correct_manager_chi_nhanh,
    -- Status
    CASE 
        WHEN m.id IS NULL THEN 'ERROR: NO_MANAGER_FOUND'
        WHEN m.id = m_correct.id THEN 'CORRECT: Matched to correct manager'
        WHEN m_correct.id IS NULL THEN 'ERROR: No manager with same chi_nhanh found'
        ELSE 'INCORRECT: Should be matched to manager ID ' || m_correct.id || ' (' || m_correct.chi_nhanh || ') instead of ' || m.id || ' (' || m.chi_nhanh || ')'
    END AS match_status
FROM employees e
-- JOIN với manager theo tên (logic hiện tại - có thể match sai)
LEFT JOIN employees m ON TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m.ho_ten))
-- Tìm manager ĐÚNG (cùng tên VÀ cùng chi_nhanh)
LEFT JOIN employees m_correct ON 
    TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m_correct.ho_ten))
    AND LOWER(TRIM(m_correct.chi_nhanh)) = LOWER(TRIM(e.chi_nhanh))
WHERE (LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn văn nghiêm%'
       OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen van nghiem%')
ORDER BY 
    CASE 
        WHEN m.id IS NULL THEN 1
        WHEN m.id = m_correct.id THEN 2
        WHEN m_correct.id IS NULL THEN 3
        ELSE 4
    END,
    e.chi_nhanh, e.id;

-- Tổng hợp: Nhân viên nào đang bị trỏ SAI (trỏ về ID 882 thay vì ID 705)
SELECT 
    'Nhân viên đang bị trỏ SAI' AS summary_type,
    COUNT(*) AS count_incorrect,
    STRING_AGG(e.id::TEXT || ':' || e.ho_ten || '(' || e.chi_nhanh || ')', ', ' ORDER BY e.id) AS incorrect_assignments
FROM employees e
LEFT JOIN employees m ON TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m.ho_ten))
LEFT JOIN employees m_correct ON 
    TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m_correct.ho_ten))
    AND LOWER(TRIM(m_correct.chi_nhanh)) = LOWER(TRIM(e.chi_nhanh))
WHERE (LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn văn nghiêm%'
       OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen van nghiem%')
  AND m.id IS NOT NULL
  AND m_correct.id IS NOT NULL
  AND m.id != m_correct.id;
