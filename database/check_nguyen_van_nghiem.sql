-- ============================================================
-- Script để kiểm tra các Nguyễn Văn Nghiêm và cấp dưới của họ
-- ============================================================

-- 1. Tìm tất cả các Nguyễn Văn Nghiêm trong hệ thống
SELECT 
    id,
    ho_ten,
    chi_nhanh,
    chuc_danh,
    email,
    ma_nhan_vien,
    trang_thai
FROM employees
WHERE LOWER(TRIM(ho_ten)) LIKE '%nguyễn văn nghiêm%'
   OR LOWER(TRIM(ho_ten)) LIKE '%nguyen van nghiem%'
ORDER BY id;

-- 2. Tìm tất cả cấp dưới của các Nguyễn Văn Nghiêm
SELECT 
    e.id AS employee_id,
    e.ho_ten AS employee_name,
    e.chi_nhanh AS employee_chi_nhanh,
    e.quan_ly_truc_tiep,
    m.id AS manager_id,
    m.ho_ten AS manager_name,
    m.chi_nhanh AS manager_chi_nhanh
FROM employees e
LEFT JOIN employees m ON TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m.ho_ten))
WHERE LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn văn nghiêm%'
   OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen van nghiem%'
ORDER BY m.id, e.chi_nhanh, e.ho_ten;

-- 3. Tổng hợp theo manager và chi_nhanh
SELECT 
    m.id AS manager_id,
    m.ho_ten AS manager_name,
    m.chi_nhanh AS manager_chi_nhanh,
    e.chi_nhanh AS subordinate_chi_nhanh,
    COUNT(*) AS count_subordinates
FROM employees e
LEFT JOIN employees m ON TRIM(LOWER(e.quan_ly_truc_tiep)) = TRIM(LOWER(m.ho_ten))
WHERE LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyễn văn nghiêm%'
   OR LOWER(TRIM(e.quan_ly_truc_tiep)) LIKE '%nguyen van nghiem%'
GROUP BY m.id, m.ho_ten, m.chi_nhanh, e.chi_nhanh
ORDER BY m.id, e.chi_nhanh;
