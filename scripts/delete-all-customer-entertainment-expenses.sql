-- Script để xóa toàn bộ đơn chi phí tiếp khách và các phiếu duyệt
-- Lưu ý: Thao tác này không thể hoàn tác!

-- Xóa tất cả các file đính kèm (sẽ tự động xóa khi xóa items do CASCADE)
-- Nhưng để chắc chắn, ta sẽ xóa từng bảng theo thứ tự

-- 1. Xóa tất cả các file đính kèm
DELETE FROM customer_entertainment_expense_files;

-- 2. Xóa tất cả các item chi phí
DELETE FROM customer_entertainment_expense_items;

-- 3. Xóa tất cả các đơn chi phí tiếp khách (sẽ tự động xóa items và files do CASCADE)
DELETE FROM customer_entertainment_expense_requests;

-- Reset sequence (tùy chọn - để ID bắt đầu lại từ 1)
ALTER SEQUENCE customer_entertainment_expense_requests_id_seq RESTART WITH 1;
ALTER SEQUENCE customer_entertainment_expense_items_id_seq RESTART WITH 1;
ALTER SEQUENCE customer_entertainment_expense_files_id_seq RESTART WITH 1;

-- Kiểm tra kết quả
SELECT 
    (SELECT COUNT(*) FROM customer_entertainment_expense_requests) as requests_count,
    (SELECT COUNT(*) FROM customer_entertainment_expense_items) as items_count,
    (SELECT COUNT(*) FROM customer_entertainment_expense_files) as files_count;

