-- ============================================================
-- Script để truy vấn các nhân viên tại Hà Nội và Manager ID của họ
-- ============================================================

-- Query 1: Tất cả nhân viên tại Hà Nội và Manager ID của họ
SELECT 
    e.id AS employee_id,
    e.ho_ten AS employee_name,
    e.chi_nhanh AS employee_chi_nhanh,
    e.quan_ly_truc_tiep AS quan_ly_truc_tiep_name,
    e.chuc_danh AS employee_chuc_danh,
    e.ma_nhan_vien AS employee_ma_nhan_vien,
    -- Manager được match (theo JOIN logic hiện tại)
    m_matched.id AS matched_manager_id,
    m_matched.ho_ten AS matched_manager_name,
    m_matched.chi_nhanh AS matched_manager_chi_nhanh,
    m_matched.chuc_danh AS matched_manager_chuc_danh,
    -- Kiểm tra nếu là Nguyễn Văn Nghiêm
    CASE 
        WHEN LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn%văn%nghiêm%'
             OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen%van%nghiem%' THEN 'YES'
        ELSE 'NO'
    END AS has_nguyen_van_nghiem_manager,
    -- Status
    CASE 
        WHEN m_matched.id IS NULL THEN 'ERROR: No manager found'
        WHEN LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn%văn%nghiêm%'
             OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen%van%nghiem%' THEN
            CASE 
                WHEN m_matched.id = 705 THEN 'CORRECT: Matched to ID 705 (Hà Nội)'
                WHEN m_matched.id = 882 THEN 'INCORRECT: Matched to ID 882 (Quảng Ngãi) instead of ID 705 (Hà Nội)'
                ELSE 'WARNING: Matched to ID ' || m_matched.id || ' (not 705 or 882)'
            END
        ELSE 'OK'
    END AS match_status
FROM employees e
LEFT JOIN employees m_matched ON TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m_matched.ho_ten))
WHERE LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) LIKE '%hà nội%'
   OR LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) = 'ha noi'
ORDER BY 
    CASE 
        WHEN LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn%văn%nghiêm%'
             OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen%van%nghiem%' THEN 1
        ELSE 2
    END,
    e.ho_ten;

-- Query 2: Tập trung vào nhân viên Hà Nội có quan_ly_truc_tiep = "Nguyễn Văn Nghiêm"
SELECT 
    e.id AS employee_id,
    e.ho_ten AS employee_name,
    e.chi_nhanh AS employee_chi_nhanh,
    e.quan_ly_truc_tiep AS quan_ly_truc_tiep_raw,
    e.chuc_danh AS employee_chuc_danh,
    e.ma_nhan_vien AS employee_ma_nhan_vien,
    -- Manager được match (theo JOIN logic hiện tại - có thể sai)
    m_matched.id AS matched_manager_id,
    m_matched.ho_ten AS matched_manager_name,
    m_matched.chi_nhanh AS matched_manager_chi_nhanh,
    m_matched.chuc_danh AS matched_manager_chuc_danh,
    -- Manager ĐÚNG (nên là ID 705 - Hà Nội)
    m_correct.id AS correct_manager_id,
    m_correct.ho_ten AS correct_manager_name,
    m_correct.chi_nhanh AS correct_manager_chi_nhanh,
    -- So sánh
    CASE 
        WHEN m_matched.id IS NULL THEN 'ERROR: No manager found by name match'
        WHEN m_correct.id IS NULL THEN 'ERROR: No manager ID 705 (Hà Nội) found'
        WHEN m_matched.id = 705 THEN 'CORRECT: Matched to ID 705 (Hà Nội) ✓'
        WHEN m_matched.id = 882 THEN '❌ INCORRECT: Matched to ID 882 (Quảng Ngãi) but should be ID 705 (Hà Nội)'
        WHEN m_matched.id != m_correct.id THEN '❌ INCORRECT: Matched to ID ' || m_matched.id || ' (' || m_matched.chi_nhanh || ') but should be ID ' || m_correct.id || ' (' || m_correct.chi_nhanh || ')'
        ELSE 'OK: Matched correctly'
    END AS match_status
FROM employees e
-- JOIN với manager theo tên (logic hiện tại - có thể match sai với ID 882)
LEFT JOIN employees m_matched ON TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m_matched.ho_ten))
-- Tìm manager ĐÚNG (ID 705 - Hà Nội)
LEFT JOIN employees m_correct ON 
    m_correct.id = 705
    AND TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m_correct.ho_ten))
WHERE (LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) LIKE '%hà nội%'
       OR LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) = 'ha noi')
  AND (LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn%văn%nghiêm%'
       OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen%van%nghiem%')
ORDER BY 
    CASE 
        WHEN m_matched.id = 882 THEN 1
        WHEN m_matched.id IS NULL THEN 2
        WHEN m_matched.id != 705 THEN 3
        ELSE 4
    END,
    e.ho_ten;

-- Query 3: Tổng hợp - Thống kê nhân viên Hà Nội theo Manager ID
SELECT 
    COALESCE(m_matched.id, 0) AS manager_id,
    COALESCE(m_matched.ho_ten, '(No Manager)') AS manager_name,
    COALESCE(m_matched.chi_nhanh, 'N/A') AS manager_chi_nhanh,
    COUNT(*) AS count_employees_in_ha_noi,
    -- Số nhân viên có quan_ly_truc_tiep = "Nguyễn Văn Nghiêm"
    COUNT(CASE 
        WHEN LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn%văn%nghiêm%'
             OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen%van%nghiem%' THEN 1
    END) AS count_with_nguyen_van_nghiem,
    -- Danh sách nhân viên có quan_ly_truc_tiep = "Nguyễn Văn Nghiêm"
    STRING_AGG(
        CASE 
            WHEN LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn%văn%nghiêm%'
                 OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen%van%nghiem%' 
            THEN e.id::TEXT || ':' || e.ho_ten
            ELSE NULL
        END, 
        ', ' 
        ORDER BY e.id
    ) AS employees_with_nguyen_van_nghiem
FROM employees e
LEFT JOIN employees m_matched ON TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m_matched.ho_ten))
WHERE LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) LIKE '%hà nội%'
   OR LOWER(TRIM(COALESCE(e.chi_nhanh, ''))) = 'ha noi'
GROUP BY m_matched.id, m_matched.ho_ten, m_matched.chi_nhanh
ORDER BY 
    CASE 
        WHEN m_matched.id = 705 THEN 1
        WHEN m_matched.id = 882 THEN 2
        WHEN m_matched.id IS NULL THEN 999
        ELSE 3
    END,
    count_employees_in_ha_noi DESC;
