-- ============================================================
-- Script để kiểm tra logic matching manager
-- ============================================================

-- 1. Tất cả các Nguyễn Văn Nghiêm và chi_nhanh của họ
SELECT 
    id,
    ho_ten,
    chi_nhanh,
    chuc_danh,
    ma_nhan_vien
FROM employees
WHERE LOWER(TRIM(ho_ten)) LIKE '%nguyễn văn nghiêm%'
   OR LOWER(TRIM(ho_ten)) LIKE '%nguyen van nghiem%'
ORDER BY id;

-- 2. TẤT CẢ cấp dưới của từng Nguyễn Văn Nghiêm (phân loại theo chi_nhanh)
SELECT 
    m.id AS manager_id,
    m.ho_ten AS manager_name,
    m.chi_nhanh AS manager_chi_nhanh,
    e.chi_nhanh AS subordinate_chi_nhanh,
    COUNT(*) AS count_subordinates,
    -- Kiểm tra xem cấp dưới có cùng chi_nhanh với manager không
    CASE 
        WHEN LOWER(TRIM(m.chi_nhanh)) = LOWER(TRIM(e.chi_nhanh)) THEN 'CORRECT: Same chi_nhanh'
        WHEN m.chi_nhanh IS NULL OR e.chi_nhanh IS NULL THEN 'WARNING: NULL chi_nhanh'
        ELSE 'INCORRECT: Different chi_nhanh'
    END AS assignment_status,
    STRING_AGG(e.id::TEXT || ':' || e.ho_ten, ', ' ORDER BY e.id) AS subordinate_ids_and_names
FROM employees m
JOIN employees e ON TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m.ho_ten))
WHERE (LOWER(TRIM(m.ho_ten)) LIKE '%nguyễn văn nghiêm%'
       OR LOWER(TRIM(m.ho_ten)) LIKE '%nguyen van nghiem%')
  AND (LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn văn nghiêm%'
       OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen van nghiem%')
GROUP BY m.id, m.ho_ten, m.chi_nhanh, e.chi_nhanh
ORDER BY m.id, e.chi_nhanh;

-- 3. Chi tiết TẤT CẢ cấp dưới của các Nguyễn Văn Nghiêm (không chỉ Hà Nội)
SELECT 
    e.id AS employee_id,
    e.ho_ten AS employee_name,
    e.chi_nhanh AS employee_chi_nhanh,
    e.quan_ly_truc_tiep AS quan_ly_truc_tiep_name,
    m.id AS matched_manager_id,
    m.ho_ten AS matched_manager_name,
    m.chi_nhanh AS matched_manager_chi_nhanh,
    CASE 
        WHEN m.id IS NULL THEN 'ERROR: NO_MANAGER_FOUND'
        WHEN LOWER(TRIM(m.chi_nhanh)) = LOWER(TRIM(e.chi_nhanh)) THEN 'CORRECT: Same chi_nhanh'
        WHEN m.chi_nhanh IS NULL OR e.chi_nhanh IS NULL THEN 'WARNING: NULL chi_nhanh'
        ELSE 'INCORRECT: Different chi_nhanh - Should be assigned to manager with same chi_nhanh'
    END AS match_status,
    -- Gợi ý manager đúng (nếu match sai)
    CASE 
        WHEN m.id IS NOT NULL AND LOWER(TRIM(m.chi_nhanh)) != LOWER(TRIM(e.chi_nhanh)) THEN
            (SELECT STRING_AGG(id::TEXT || ':' || ho_ten || '(' || chi_nhanh || ')', ', ')
             FROM employees m2
             WHERE LOWER(TRIM(m2.ho_ten)) = LOWER(TRIM(e.quan_ly_truc_tiep))
               AND LOWER(TRIM(m2.chi_nhanh)) = LOWER(TRIM(e.chi_nhanh))
             LIMIT 5)
        ELSE NULL
    END AS suggested_correct_manager
FROM employees e
LEFT JOIN employees m ON TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m.ho_ten))
WHERE (LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn văn nghiêm%'
       OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen van nghiem%')
ORDER BY 
    CASE 
        WHEN m.id IS NULL THEN 1
        WHEN LOWER(TRIM(m.chi_nhanh)) = LOWER(TRIM(e.chi_nhanh)) THEN 2
        ELSE 3
    END,
    m.id, e.chi_nhanh, e.id;

-- 4. Tổng hợp: Manager nào sẽ được chọn cho employee ở Hà Nội?
WITH employee_chi_nhanh AS (
    SELECT 'Hà Nội' AS chi_nhanh
),
all_managers AS (
    SELECT 
        id AS manager_id,
        ho_ten AS manager_name,
        chi_nhanh AS manager_chi_nhanh
    FROM employees
    WHERE LOWER(TRIM(ho_ten)) LIKE '%nguyễn văn nghiêm%'
       OR LOWER(TRIM(ho_ten)) LIKE '%nguyen van nghiem%'
)
SELECT 
    m.manager_id,
    m.manager_name,
    m.manager_chi_nhanh,
    -- Kiểm tra manager có chi_nhanh match không
    CASE 
        WHEN LOWER(TRIM(m.manager_chi_nhanh)) = LOWER(TRIM(e_ctx.chi_nhanh)) THEN TRUE
        WHEN LOWER(TRIM(m.manager_chi_nhanh)) LIKE '%' || LOWER(TRIM(e_ctx.chi_nhanh)) || '%' 
             OR LOWER(TRIM(e_ctx.chi_nhanh)) LIKE '%' || LOWER(TRIM(m.manager_chi_nhanh)) || '%' THEN TRUE
        ELSE FALSE
    END AS manager_chi_nhanh_matches,
    -- Đếm cấp dưới trong cùng chi_nhanh với employee
    (
        SELECT COUNT(*)
        FROM employees e
        WHERE TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m.manager_name))
          AND LOWER(TRIM(e.chi_nhanh)) = LOWER(TRIM(e_ctx.chi_nhanh))
    ) AS count_subordinates_in_employee_chi_nhanh,
    -- Xác định manager nào sẽ được chọn (theo logic mới)
    CASE 
        WHEN LOWER(TRIM(m.manager_chi_nhanh)) = LOWER(TRIM(e_ctx.chi_nhanh)) THEN 'PRIORITY_1: CHI_NHANH_MATCH'
        WHEN LOWER(TRIM(m.manager_chi_nhanh)) LIKE '%' || LOWER(TRIM(e_ctx.chi_nhanh)) || '%' 
             OR LOWER(TRIM(e_ctx.chi_nhanh)) LIKE '%' || LOWER(TRIM(m.manager_chi_nhanh)) || '%' THEN 'PRIORITY_1: CHI_NHANH_PARTIAL_MATCH'
        ELSE 'NOT_SELECTED: CHI_NHANH_NO_MATCH'
    END AS selection_priority,
    CASE 
        WHEN LOWER(TRIM(m.manager_chi_nhanh)) = LOWER(TRIM(e_ctx.chi_nhanh)) THEN 'YES'
        WHEN LOWER(TRIM(m.manager_chi_nhanh)) LIKE '%' || LOWER(TRIM(e_ctx.chi_nhanh)) || '%' 
             OR LOWER(TRIM(e_ctx.chi_nhanh)) LIKE '%' || LOWER(TRIM(m.manager_chi_nhanh)) || '%' THEN 'YES'
        ELSE 'NO'
    END AS will_be_selected
FROM all_managers m
CROSS JOIN employee_chi_nhanh e_ctx
ORDER BY 
    CASE 
        WHEN LOWER(TRIM(m.manager_chi_nhanh)) = LOWER(TRIM(e_ctx.chi_nhanh)) THEN 1
        WHEN LOWER(TRIM(m.manager_chi_nhanh)) LIKE '%' || LOWER(TRIM(e_ctx.chi_nhanh)) || '%' 
             OR LOWER(TRIM(e_ctx.chi_nhanh)) LIKE '%' || LOWER(TRIM(m.manager_chi_nhanh)) || '%' THEN 2
        ELSE 3
    END,
    count_subordinates_in_employee_chi_nhanh DESC;
