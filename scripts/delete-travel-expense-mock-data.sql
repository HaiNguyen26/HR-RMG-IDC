-- Script xóa toàn bộ mock data trong travel_expense_requests

-- Đếm số lượng trước khi xóa
SELECT COUNT(*) as count_before 
FROM travel_expense_requests 
WHERE title LIKE '%[MOCK]%';

-- Xóa tất cả mock data
DELETE FROM travel_expense_requests 
WHERE title LIKE '%[MOCK]%';

-- Kiểm tra lại
SELECT COUNT(*) as count_after 
FROM travel_expense_requests 
WHERE title LIKE '%[MOCK]%';

-- Hiển thị thống kê tổng
SELECT COUNT(*) as total_remaining 
FROM travel_expense_requests;

