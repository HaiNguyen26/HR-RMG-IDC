-- Option 2: Nếu quản lý ở "Head Office" có thể quản lý nhân viên ở các chi nhánh khác
-- Thì cần sửa logic trong backend, HOẶC cập nhật chi_nhanh của quản lý

-- Kiểm tra: Có bao nhiêu nhân viên có quan_ly_truc_tiep = "Huỳnh Công Tường" và chi_nhanh khác "Head Office"?
SELECT 
    id,
    ho_ten,
    quan_ly_truc_tiep,
    chi_nhanh,
    phong_ban
FROM employees
WHERE quan_ly_truc_tiep = 'Huỳnh Công Tường'
ORDER BY chi_nhanh, ho_ten;

-- Nếu quản lý "Huỳnh Công Tường" thực sự quản lý nhân viên ở "Hồ Chí Minh",
-- thì có thể cần cập nhật chi_nhanh của quản lý thành "Hồ Chí Minh" HOẶC để "Head Office"
-- Tùy thuộc vào quy tắc nghiệp vụ thực tế.

-- Option A: Cập nhật chi_nhanh của quản lý thành "Hồ Chí Minh" (nếu quản lý thực sự ở HCM)
-- UPDATE employees
-- SET chi_nhanh = 'Hồ Chí Minh'
-- WHERE id = 731 AND ho_ten = 'Huỳnh Công Tường';

-- Option B: Giữ nguyên "Head Office" và sửa logic backend để cho phép quản lý ở "Head Office" 
-- quản lý nhân viên ở các chi nhánh khác (cần sửa code)

