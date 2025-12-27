-- Fix: Cập nhật tên quản lý trong database
-- Vấn đề: Trong database quản lý có ho_ten = "Huỳnh Công Tường" (sai) nhưng tên đúng là "Huỳnh Công Tưởng" (có dấu hỏi)
-- Nhân viên "Huỳnh Đức Trọng Tài" đã có quan_ly_truc_tiep = "Huỳnh Công Tưởng" (đúng)

-- Bước 1: Kiểm tra quản lý hiện tại
SELECT 
    id,
    ho_ten,
    chi_nhanh,
    phong_ban,
    chuc_danh
FROM employees
WHERE ho_ten ILIKE '%Huỳnh Công Tường%'
   OR ho_ten ILIKE '%Huỳnh Công Tưởng%';

-- Bước 2: Cập nhật tên quản lý trong database (từ "Huỳnh Công Tường" → "Huỳnh Công Tưởng")
UPDATE employees
SET ho_ten = 'Huỳnh Công Tưởng'  -- Tên đúng (có dấu hỏi)
WHERE ho_ten = 'Huỳnh Công Tường'  -- Tên sai (không dấu hỏi)
  AND id = 731;  -- Đảm bảo chỉ update đúng quản lý này

-- Bước 3: Kiểm tra sau khi sửa
SELECT 
    id,
    ho_ten,
    chi_nhanh,
    phong_ban,
    chuc_danh
FROM employees
WHERE ho_ten ILIKE '%Huỳnh Công Tưởng%';

-- Bước 4: Kiểm tra nhân viên "Huỳnh Đức Trọng Tài" để đảm bảo quan_ly_truc_tiep khớp
SELECT 
    id,
    ho_ten,
    quan_ly_truc_tiep,
    chi_nhanh
FROM employees
WHERE ho_ten ILIKE '%Huỳnh Đức Trọng Tài%';

-- Lưu ý: Sau khi chạy script này, cần restart backend để clear cache:
-- pm2 restart hr-management-api

