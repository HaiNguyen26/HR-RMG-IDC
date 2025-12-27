-- Script để kiểm tra vấn đề quản lý trực tiếp
-- Vấn đề: Không tìm thấy quản lý trực tiếp "Huỳnh Công Tường" (chi_nhanh: Hồ Chí Minh) cho nhân viên "Huỳnh Đức Trọng Tài"

-- 1. Tìm nhân viên "Huỳnh Đức Trọng Tài"
SELECT 
    id,
    ho_ten,
    quan_ly_truc_tiep,
    chi_nhanh,
    phong_ban,
    chuc_danh
FROM employees
WHERE ho_ten ILIKE '%Huỳnh Đức Trọng Tài%'
   OR ho_ten ILIKE '%Huynh Duc Trong Tai%';

-- 2. Tìm tất cả nhân viên có tên gần giống "Huỳnh Công Tường" (quản lý trực tiếp)
SELECT 
    id,
    ho_ten,
    chi_nhanh,
    phong_ban,
    chuc_danh,
    quan_ly_truc_tiep,
    quan_ly_gian_tiep
FROM employees
WHERE ho_ten ILIKE '%Huỳnh Công%'
   OR ho_ten ILIKE '%Huynh Cong%'
   OR ho_ten ILIKE '%Công Tường%'
   OR ho_ten ILIKE '%Cong Tuong%'
   OR ho_ten ILIKE '%Công Tưởng%'
   OR ho_ten ILIKE '%Cong Tuong%'
ORDER BY ho_ten;

-- 3. Tìm tất cả nhân viên có chi_nhanh chứa "Hồ Chí Minh" hoặc "Ho Chi Minh" hoặc "HCM"
SELECT 
    id,
    ho_ten,
    chi_nhanh,
    phong_ban,
    chuc_danh
FROM employees
WHERE chi_nhanh ILIKE '%Hồ Chí Minh%'
   OR chi_nhanh ILIKE '%Ho Chi Minh%'
   OR chi_nhanh ILIKE '%HCM%'
   OR chi_nhanh ILIKE '%TP.HCM%'
   OR chi_nhanh ILIKE '%TP HCM%'
ORDER BY chi_nhanh, ho_ten;

-- 4. Tìm tất cả nhân viên có quan_ly_truc_tiep chứa "Huỳnh Công" hoặc "Huynh Cong"
SELECT 
    id,
    ho_ten,
    quan_ly_truc_tiep,
    chi_nhanh,
    phong_ban
FROM employees
WHERE quan_ly_truc_tiep ILIKE '%Huỳnh Công%'
   OR quan_ly_truc_tiep ILIKE '%Huynh Cong%'
   OR quan_ly_truc_tiep ILIKE '%Công Tường%'
   OR quan_ly_truc_tiep ILIKE '%Cong Tuong%'
   OR quan_ly_truc_tiep ILIKE '%Công Tưởng%'
ORDER BY quan_ly_truc_tiep, chi_nhanh;

-- 5. Kiểm tra xem có nhân viên nào có tên "Huỳnh Công Tường" VÀ chi_nhanh chứa "Hồ Chí Minh" không
SELECT 
    id,
    ho_ten,
    chi_nhanh,
    phong_ban,
    chuc_danh
FROM employees
WHERE (
    ho_ten ILIKE '%Huỳnh Công Tường%'
    OR ho_ten ILIKE '%Huynh Cong Tuong%'
    OR ho_ten ILIKE '%Huỳnh Công Tưởng%'
)
AND (
    chi_nhanh ILIKE '%Hồ Chí Minh%'
    OR chi_nhanh ILIKE '%Ho Chi Minh%'
    OR chi_nhanh ILIKE '%HCM%'
    OR chi_nhanh ILIKE '%TP.HCM%'
    OR chi_nhanh ILIKE '%TP HCM%'
);

-- 6. Đếm số nhân viên có tên gần giống "Huỳnh Công Tường" theo chi_nhanh
SELECT 
    chi_nhanh,
    COUNT(*) as so_luong,
    STRING_AGG(ho_ten, ', ' ORDER BY ho_ten) as danh_sach
FROM employees
WHERE ho_ten ILIKE '%Huỳnh Công%'
   OR ho_ten ILIKE '%Huynh Cong%'
GROUP BY chi_nhanh
ORDER BY chi_nhanh;

