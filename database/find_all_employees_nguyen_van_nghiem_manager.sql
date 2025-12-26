-- ============================================================
-- Script để tìm TẤT CẢ nhân viên có quan_ly_truc_tiep = "Nguyễn Văn Nghiêm"
-- và kiểm tra họ đang được JOIN với manager nào (vấn đề có thể ở đây)
-- ============================================================

-- Query 1: Tìm TẤT CẢ nhân viên có quan_ly_truc_tiep chứa "Nguyễn Văn Nghiêm" (không phân biệt hoa thường, dấu)
SELECT 
    e.id AS employee_id,
    e.ho_ten AS employee_name,
    e.chi_nhanh AS employee_chi_nhanh,
    e.quan_ly_truc_tiep AS quan_ly_truc_tiep_raw,
    -- Tìm TẤT CẢ managers có tên "Nguyễn Văn Nghiêm" (không phân biệt hoa thường, dấu)
    (SELECT STRING_AGG(id::TEXT || ':' || ho_ten || '(' || COALESCE(chi_nhanh, 'NULL') || ')', ' | ' ORDER BY id)
     FROM employees m
     WHERE TRIM(LOWER(m.ho_ten)) LIKE '%nguyễn%văn%nghiêm%'
        OR TRIM(LOWER(m.ho_ten)) LIKE '%nguyen%van%nghiem%') AS all_nguyen_van_nghiem_managers,
    -- Manager được match (theo JOIN logic - chỉ match tên, không match chi_nhanh)
    m_matched.id AS matched_manager_id,
    m_matched.ho_ten AS matched_manager_name,
    m_matched.chi_nhanh AS matched_manager_chi_nhanh,
    -- Manager ĐÚNG (cùng tên VÀ cùng chi_nhanh với employee)
    m_correct.id AS correct_manager_id,
    m_correct.ho_ten AS correct_manager_name,
    m_correct.chi_nhanh AS correct_manager_chi_nhanh,
    -- So sánh
    CASE 
        WHEN m_matched.id IS NULL THEN 'ERROR: No manager found by name match'
        WHEN m_correct.id IS NULL THEN 'ERROR: No manager found with same chi_nhanh'
        WHEN m_matched.id = m_correct.id THEN 'CORRECT: Matched to correct manager'
        WHEN m_matched.id = 882 AND m_correct.id = 705 THEN 'INCORRECT: Currently matched to ID 882 (Quảng Ngãi) but should be ID 705 (Hà Nội)'
        ELSE 'INCORRECT: Matched to ID ' || m_matched.id || ' but should be ID ' || m_correct.id
    END AS match_status
FROM employees e
-- JOIN với manager theo tên (logic hiện tại - có thể match sai với ID 882)
LEFT JOIN employees m_matched ON 
    TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m_matched.ho_ten))
-- Tìm manager ĐÚNG (cùng tên VÀ cùng chi_nhanh)
LEFT JOIN employees m_correct ON 
    TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m_correct.ho_ten))
    AND LOWER(TRIM(COALESCE(m_correct.chi_nhanh, ''))) = LOWER(TRIM(COALESCE(e.chi_nhanh, '')))
WHERE (
    -- Tìm nhân viên có quan_ly_truc_tiep chứa "Nguyễn Văn Nghiêm" (nhiều cách viết)
    TRIM(LOWER(e.quan_ly_truc_tiep)) LIKE '%nguyễn%văn%nghiêm%'
    OR TRIM(LOWER(e.quan_ly_truc_tiep)) LIKE '%nguyen%van%nghiem%'
    OR TRIM(LOWER(e.quan_ly_truc_tiep)) LIKE '%nguyễn văn nghiêm%'
    OR TRIM(LOWER(e.quan_ly_truc_tiep)) LIKE '%nguyen van nghiem%'
)
ORDER BY 
    CASE 
        WHEN m_matched.id = 882 AND m_correct.id = 705 THEN 1
        WHEN m_matched.id IS NULL THEN 2
        WHEN m_matched.id != m_correct.id THEN 3
        ELSE 4
    END,
    e.chi_nhanh, e.id;

-- Query 2: Tổng hợp theo manager được match
SELECT 
    m_matched.id AS matched_manager_id,
    m_matched.ho_ten AS matched_manager_name,
    m_matched.chi_nhanh AS matched_manager_chi_nhanh,
    COUNT(*) AS count_employees_matched_to_this_manager,
    COUNT(CASE WHEN m_correct.id = m_matched.id THEN 1 END) AS count_correctly_matched,
    COUNT(CASE WHEN m_correct.id != m_matched.id THEN 1 END) AS count_incorrectly_matched,
    STRING_AGG(
        CASE 
            WHEN m_correct.id != m_matched.id THEN e.id::TEXT || ':' || e.ho_ten || '(' || e.chi_nhanh || ')->should be ' || m_correct.id::TEXT
            ELSE NULL
        END, 
        ', ' 
        ORDER BY e.id
    ) AS incorrectly_matched_employees
FROM employees e
LEFT JOIN employees m_matched ON TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m_matched.ho_ten))
LEFT JOIN employees m_correct ON 
    TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m_correct.ho_ten))
    AND LOWER(TRIM(COALESCE(m_correct.chi_nhanh, ''))) = LOWER(TRIM(COALESCE(e.chi_nhanh, '')))
WHERE (
    TRIM(LOWER(e.quan_ly_truc_tiep)) LIKE '%nguyễn%văn%nghiêm%'
    OR TRIM(LOWER(e.quan_ly_truc_tiep)) LIKE '%nguyen%van%nghiem%'
    OR TRIM(LOWER(e.quan_ly_truc_tiep)) LIKE '%nguyễn văn nghiêm%'
    OR TRIM(LOWER(e.quan_ly_truc_tiep)) LIKE '%nguyen van nghiem%'
)
  AND m_matched.id IS NOT NULL
GROUP BY m_matched.id, m_matched.ho_ten, m_matched.chi_nhanh
ORDER BY m_matched.id;
