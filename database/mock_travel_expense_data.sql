-- ============================================
-- MOCK DATA CHO TRAVEL EXPENSE REQUESTS
-- Để test các bước từ 1 đến 6
-- ============================================

-- Lưu ý: Script này sử dụng employee_id giả định
-- Nếu bạn có employees thật trong database, hãy thay thế các giá trị employee_id bằng ID thực tế

-- Xóa dữ liệu cũ (tùy chọn - comment nếu muốn giữ lại)
-- DELETE FROM travel_expense_attachments;
-- DELETE FROM travel_expense_requests;

-- ============================================
-- BƯỚC 1: YÊU CẦU MỚI (PENDING_LEVEL_1)
-- ============================================
INSERT INTO travel_expense_requests (
    employee_id, purpose, location, location_type, 
    start_time, end_time, is_overnight, requires_ceo,
    status, current_step,
    company_name, company_address, requested_advance_amount,
    living_allowance_amount, living_allowance_currency, continent,
    created_at
) VALUES 
-- Request 1: Công tác trong nước
(
    1, -- employee_id (thay bằng ID thực tế)
    'Họp với đối tác tại Hà Nội về hợp đồng mới',
    'Hà Nội, Việt Nam',
    'DOMESTIC',
    CURRENT_TIMESTAMP + INTERVAL '5 days',
    CURRENT_TIMESTAMP + INTERVAL '6 days',
    TRUE,
    FALSE,
    'PENDING_LEVEL_1',
    'LEVEL_1',
    'Công ty ABC',
    '123 Đường ABC, Quận 1, Hà Nội',
    5000000, -- 5 triệu VND
    NULL,
    NULL,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '2 days'
),
-- Request 2: Công tác nước ngoài - Châu Á
(
    1,
    'Tham dự hội nghị công nghệ tại Tokyo',
    'Tokyo, Japan',
    'INTERNATIONAL',
    CURRENT_TIMESTAMP + INTERVAL '10 days',
    CURRENT_TIMESTAMP + INTERVAL '15 days',
    TRUE,
    TRUE,
    'PENDING_LEVEL_1',
    'LEVEL_1',
    'Tech Conference Japan',
    'Tokyo Convention Center',
    20000000, -- 20 triệu VND
    40, -- USD (Châu Á)
    'USD',
    'ASIAN',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
),
-- Request 3: Công tác nước ngoài - Châu Âu
(
    2, -- employee_id khác
    'Đào tạo tại trụ sở chính ở Paris',
    'Paris, France',
    'INTERNATIONAL',
    CURRENT_TIMESTAMP + INTERVAL '20 days',
    CURRENT_TIMESTAMP + INTERVAL '25 days',
    TRUE,
    TRUE,
    'PENDING_LEVEL_1',
    'LEVEL_1',
    'Headquarters Paris',
    '123 Avenue des Champs-Élysées, Paris',
    50000000, -- 50 triệu VND
    60, -- USD (Châu Âu)
    'USD',
    'EU',
    CURRENT_TIMESTAMP - INTERVAL '3 hours'
);

-- ============================================
-- BƯỚC 2: ĐÃ DUYỆT CẤP 1 (PENDING_LEVEL_2)
-- ============================================
INSERT INTO travel_expense_requests (
    employee_id, purpose, location, location_type,
    start_time, end_time, is_overnight, requires_ceo,
    status, current_step,
    company_name, company_address, requested_advance_amount,
    living_allowance_amount, living_allowance_currency, continent,
    manager_id, manager_decision, manager_notes, manager_decision_at,
    created_at
) VALUES 
(
    1,
    'Họp khách hàng tại TP.HCM',
    'TP.HCM, Việt Nam',
    'DOMESTIC',
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    CURRENT_TIMESTAMP + INTERVAL '8 days',
    TRUE,
    FALSE,
    'PENDING_LEVEL_2',
    'LEVEL_2',
    'Công ty XYZ',
    '456 Đường XYZ, Quận 3, TP.HCM',
    3000000,
    NULL,
    NULL,
    NULL,
    2, -- manager_id (thay bằng ID thực tế)
    'APPROVE',
    'Đồng ý cho công tác này',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '3 days'
);

-- ============================================
-- BƯỚC 2.1 & 3: ĐÃ DUYỆT CẤP 2, CHỜ CEO (PENDING_CEO)
-- ============================================
INSERT INTO travel_expense_requests (
    employee_id, purpose, location, location_type,
    start_time, end_time, is_overnight, requires_ceo,
    status, current_step,
    company_name, company_address, requested_advance_amount,
    living_allowance_amount, living_allowance_currency, continent,
    manager_id, manager_decision, manager_notes, manager_decision_at,
    branch_director_id, branch_director_decision, branch_director_notes, branch_director_decision_at,
    created_at
) VALUES 
(
    2,
    'Tham dự triển lãm công nghệ tại Singapore',
    'Singapore',
    'INTERNATIONAL',
    CURRENT_TIMESTAMP + INTERVAL '12 days',
    CURRENT_TIMESTAMP + INTERVAL '16 days',
    TRUE,
    TRUE,
    'PENDING_CEO',
    'CEO',
    'Tech Expo Singapore',
    'Marina Bay Sands Convention Center',
    25000000,
    40,
    'USD',
    'ASIAN',
    3, -- manager_id
    'APPROVE',
    'Đồng ý cho công tác',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    4, -- branch_director_id (thay bằng ID thực tế)
    'APPROVE',
    'Đồng ý, cần CEO phê duyệt',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '4 days'
);

-- ============================================
-- BƯỚC 3: ĐÃ DUYỆT CEO, CHỜ CẤP NGÂN SÁCH (PENDING_FINANCE)
-- ============================================
INSERT INTO travel_expense_requests (
    employee_id, purpose, location, location_type,
    start_time, end_time, is_overnight, requires_ceo,
    status, current_step,
    company_name, company_address, requested_advance_amount,
    living_allowance_amount, living_allowance_currency, continent,
    manager_id, manager_decision, manager_notes, manager_decision_at,
    branch_director_id, branch_director_decision, branch_director_notes, branch_director_decision_at,
    ceo_id, ceo_decision, ceo_notes, ceo_decision_at,
    created_at
) VALUES 
-- Request 1: International - đã duyệt CEO
(
    1,
    'Đào tạo chuyên sâu tại London',
    'London, UK',
    'INTERNATIONAL',
    CURRENT_TIMESTAMP + INTERVAL '18 days',
    CURRENT_TIMESTAMP + INTERVAL '23 days',
    TRUE,
    TRUE,
    'PENDING_FINANCE',
    'FINANCE',
    'Training Center London',
    '123 Oxford Street, London',
    60000000,
    60,
    'USD',
    'EU',
    2,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    4,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '4 days',
    5, -- ceo_id (thay bằng ID thực tế)
    'APPROVE',
    'Đồng ý cho công tác này',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '7 days'
),
-- Request 2: Domestic - không cần CEO
(
    2,
    'Họp với đối tác tại Đà Nẵng',
    'Đà Nẵng, Việt Nam',
    'DOMESTIC',
    CURRENT_TIMESTAMP + INTERVAL '8 days',
    CURRENT_TIMESTAMP + INTERVAL '9 days',
    TRUE,
    FALSE,
    'PENDING_FINANCE',
    'FINANCE',
    'Công ty DEF',
    '789 Đường DEF, Đà Nẵng',
    4000000,
    NULL,
    NULL,
    NULL,
    3,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    4,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    NULL,
    NULL,
    NULL,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '5 days'
);

-- ============================================
-- BƯỚC 4: ĐÃ CẤP NGÂN SÁCH & TẠM ỨNG (PENDING_SETTLEMENT)
-- ============================================
INSERT INTO travel_expense_requests (
    employee_id, purpose, location, location_type,
    start_time, end_time, is_overnight, requires_ceo,
    status, current_step,
    company_name, company_address, requested_advance_amount,
    living_allowance_amount, living_allowance_currency, continent,
    manager_id, manager_decision, manager_notes, manager_decision_at,
    branch_director_id, branch_director_decision, branch_director_notes, branch_director_decision_at,
    ceo_id, ceo_decision, ceo_notes, ceo_decision_at,
    approved_budget_amount, approved_budget_currency, approved_budget_exchange_rate,
    budget_approved_at, budget_approved_by,
    actual_advance_amount, advance_method, bank_account, advance_notes,
    advance_status, advance_transferred_at, advance_transferred_by,
    settlement_status,
    created_at
) VALUES 
-- Request 1: Đã chuyển tạm ứng, chờ nhân viên gửi báo cáo
(
    1,
    'Họp khách hàng tại Hà Nội',
    'Hà Nội, Việt Nam',
    'DOMESTIC',
    CURRENT_TIMESTAMP - INTERVAL '2 days', -- Đã đi công tác
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    TRUE,
    FALSE,
    'PENDING_SETTLEMENT',
    'SETTLEMENT',
    'Công ty GHI',
    '321 Đường GHI, Hà Nội',
    5000000,
    NULL,
    NULL,
    NULL,
    2,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    4,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '9 days',
    NULL,
    NULL,
    NULL,
    NULL,
    5000000, -- Ngân sách đã cấp
    'VND',
    1.0,
    CURRENT_TIMESTAMP - INTERVAL '8 days',
    6, -- budget_approved_by (HR/Kế toán)
    5000000, -- Đã chuyển tạm ứng
    'BANK_TRANSFER',
    '1234567890 - Ngân hàng ABC',
    'Đã chuyển khoản',
    'TRANSFERRED',
    CURRENT_TIMESTAMP - INTERVAL '7 days',
    6,
    'PENDING_EMPLOYEE_SUBMISSION',
    CURRENT_TIMESTAMP - INTERVAL '12 days'
),
-- Request 2: International - đã chuyển tạm ứng
(
    2,
    'Tham dự hội nghị tại Bangkok',
    'Bangkok, Thailand',
    'INTERNATIONAL',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    TRUE,
    TRUE,
    'PENDING_SETTLEMENT',
    'SETTLEMENT',
    'Conference Center Bangkok',
    'Siam Paragon, Bangkok',
    20000000,
    40,
    'USD',
    'ASIAN',
    3,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    4,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '14 days',
    5,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '12 days',
    20000000, -- Ngân sách
    'VND',
    1.0,
    CURRENT_TIMESTAMP - INTERVAL '11 days',
    6,
    20000000, -- Đã chuyển
    'BANK_TRANSFER',
    '9876543210 - Ngân hàng XYZ',
    'Đã chuyển khoản',
    'TRANSFERRED',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    6,
    'SUBMITTED', -- Nhân viên đã gửi báo cáo
    CURRENT_TIMESTAMP - INTERVAL '18 days'
);

-- ============================================
-- BƯỚC 5: ĐÃ GỬI BÁO CÁO, HR ĐÃ XÁC NHẬN (PENDING_ACCOUNTANT)
-- ============================================
INSERT INTO travel_expense_requests (
    employee_id, purpose, location, location_type,
    start_time, end_time, is_overnight, requires_ceo,
    status, current_step,
    company_name, company_address, requested_advance_amount,
    living_allowance_amount, living_allowance_currency, continent,
    manager_id, manager_decision, manager_notes, manager_decision_at,
    branch_director_id, branch_director_decision, branch_director_notes, branch_director_decision_at,
    ceo_id, ceo_decision, ceo_notes, ceo_decision_at,
    approved_budget_amount, approved_budget_currency, approved_budget_exchange_rate,
    budget_approved_at, budget_approved_by,
    actual_advance_amount, advance_method, bank_account, advance_notes,
    advance_status, advance_transferred_at, advance_transferred_by,
    actual_expense, settlement_status, settlement_notes,
    employee_confirmed_at, hr_confirmed_at, hr_confirmed_by,
    created_at
) VALUES 
-- Request 1: Chi phí thực tế <= Ngân sách (sẽ được quyết toán đầy đủ)
(
    1,
    'Công tác tại TP.HCM',
    'TP.HCM, Việt Nam',
    'DOMESTIC',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '8 days',
    TRUE,
    FALSE,
    'PENDING_ACCOUNTANT',
    'ACCOUNTANT',
    'Công ty JKL',
    '456 Đường JKL, TP.HCM',
    6000000,
    NULL,
    NULL,
    NULL,
    2,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    4,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '19 days',
    NULL,
    NULL,
    NULL,
    NULL,
    6000000, -- Ngân sách đã cấp
    'VND',
    1.0,
    CURRENT_TIMESTAMP - INTERVAL '18 days',
    6,
    6000000, -- Đã chuyển tạm ứng
    'BANK_TRANSFER',
    '1112223334 - Ngân hàng ABC',
    'Đã chuyển khoản',
    'TRANSFERRED',
    CURRENT_TIMESTAMP - INTERVAL '17 days',
    6,
    5500000, -- Chi phí thực tế: 5.5 triệu (nhỏ hơn ngân sách 6 triệu)
    'HR_CONFIRMED',
    'Đã kiểm tra hóa đơn và chứng từ, hợp lệ',
    CURRENT_TIMESTAMP - INTERVAL '7 days', -- Nhân viên đã xác nhận
    CURRENT_TIMESTAMP - INTERVAL '2 days', -- HR đã xác nhận
    6, -- hr_confirmed_by
    CURRENT_TIMESTAMP - INTERVAL '22 days'
),
-- Request 2: Chi phí thực tế > Ngân sách (sẽ chuyển sang PENDING_EXCEPTION_APPROVAL)
(
    2,
    'Công tác tại Tokyo',
    'Tokyo, Japan',
    'INTERNATIONAL',
    CURRENT_TIMESTAMP - INTERVAL '12 days',
    CURRENT_TIMESTAMP - INTERVAL '7 days',
    TRUE,
    TRUE,
    'PENDING_ACCOUNTANT',
    'ACCOUNTANT',
    'Tech Company Tokyo',
    'Shibuya, Tokyo',
    30000000,
    40,
    'USD',
    'ASIAN',
    3,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '25 days',
    4,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '24 days',
    5,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '22 days',
    30000000, -- Ngân sách đã cấp: 30 triệu
    'VND',
    1.0,
    CURRENT_TIMESTAMP - INTERVAL '21 days',
    6,
    30000000, -- Đã chuyển tạm ứng
    'BANK_TRANSFER',
    '5556667778 - Ngân hàng XYZ',
    'Đã chuyển khoản',
    'TRANSFERRED',
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    6,
    35000000, -- Chi phí thực tế: 35 triệu (vượt ngân sách 5 triệu)
    'HR_CONFIRMED',
    'Chi phí có phần vượt ngân sách, cần kế toán kiểm tra',
    CURRENT_TIMESTAMP - INTERVAL '6 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    6,
    CURRENT_TIMESTAMP - INTERVAL '27 days'
),
-- Request 3: Chi phí thực tế = Ngân sách (quyết toán đầy đủ)
(
    1,
    'Họp tại Hà Nội',
    'Hà Nội, Việt Nam',
    'DOMESTIC',
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    CURRENT_TIMESTAMP - INTERVAL '13 days',
    TRUE,
    FALSE,
    'PENDING_ACCOUNTANT',
    'ACCOUNTANT',
    'Công ty MNO',
    '789 Đường MNO, Hà Nội',
    4000000,
    NULL,
    NULL,
    NULL,
    2,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '28 days',
    4,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '27 days',
    NULL,
    NULL,
    NULL,
    NULL,
    4000000, -- Ngân sách
    'VND',
    1.0,
    CURRENT_TIMESTAMP - INTERVAL '26 days',
    6,
    4000000, -- Đã chuyển
    'BANK_TRANSFER',
    '9998887776 - Ngân hàng ABC',
    'Đã chuyển khoản',
    'TRANSFERRED',
    CURRENT_TIMESTAMP - INTERVAL '25 days',
    6,
    4000000, -- Chi phí thực tế = ngân sách
    'HR_CONFIRMED',
    'Chi phí đúng với ngân sách',
    CURRENT_TIMESTAMP - INTERVAL '14 days',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    6,
    CURRENT_TIMESTAMP - INTERVAL '30 days'
);

-- ============================================
-- BƯỚC 6: ĐÃ QUYẾT TOÁN (SETTLED)
-- ============================================
INSERT INTO travel_expense_requests (
    employee_id, purpose, location, location_type,
    start_time, end_time, is_overnight, requires_ceo,
    status, current_step,
    company_name, company_address, requested_advance_amount,
    living_allowance_amount, living_allowance_currency, continent,
    manager_id, manager_decision, manager_notes, manager_decision_at,
    branch_director_id, branch_director_decision, branch_director_notes, branch_director_decision_at,
    ceo_id, ceo_decision, ceo_notes, ceo_decision_at,
    approved_budget_amount, approved_budget_currency, approved_budget_exchange_rate,
    budget_approved_at, budget_approved_by,
    actual_advance_amount, advance_method, bank_account, advance_notes,
    advance_status, advance_transferred_at, advance_transferred_by,
    actual_expense, settlement_status, settlement_notes,
    employee_confirmed_at, hr_confirmed_at, hr_confirmed_by,
    accountant_checked_at, accountant_notes, reimbursement_amount, exceeds_budget, excess_amount,
    created_at
) VALUES 
-- Request 1: Đã quyết toán xong (chi phí <= ngân sách)
(
    2,
    'Công tác tại Đà Nẵng',
    'Đà Nẵng, Việt Nam',
    'DOMESTIC',
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    CURRENT_TIMESTAMP - INTERVAL '18 days',
    TRUE,
    FALSE,
    'SETTLED',
    'SETTLED',
    'Công ty PQR',
    '123 Đường PQR, Đà Nẵng',
    3500000,
    NULL,
    NULL,
    NULL,
    3,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '35 days',
    4,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '34 days',
    NULL,
    NULL,
    NULL,
    NULL,
    3500000,
    'VND',
    1.0,
    CURRENT_TIMESTAMP - INTERVAL '33 days',
    6,
    3500000,
    'BANK_TRANSFER',
    '1234567890 - Ngân hàng ABC',
    'Đã chuyển khoản',
    'TRANSFERRED',
    CURRENT_TIMESTAMP - INTERVAL '32 days',
    6,
    3200000, -- Chi phí thực tế: 3.2 triệu
    'HR_CONFIRMED',
    'Đã kiểm tra và xác nhận',
    CURRENT_TIMESTAMP - INTERVAL '19 days',
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    6,
    CURRENT_TIMESTAMP - INTERVAL '5 days', -- Kế toán đã kiểm tra
    'Đã kiểm tra hóa đơn, hợp lệ. Hoàn ứng đầy đủ chi phí thực tế.',
    3200000, -- Hoàn ứng = chi phí thực tế
    FALSE, -- Không vượt ngân sách
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '37 days'
);

-- ============================================
-- BƯỚC 6.1: CHỜ PHÊ DUYỆT NGOẠI LỆ (PENDING_EXCEPTION_APPROVAL)
-- ============================================
INSERT INTO travel_expense_requests (
    employee_id, purpose, location, location_type,
    start_time, end_time, is_overnight, requires_ceo,
    status, current_step,
    company_name, company_address, requested_advance_amount,
    living_allowance_amount, living_allowance_currency, continent,
    manager_id, manager_decision, manager_notes, manager_decision_at,
    branch_director_id, branch_director_decision, branch_director_notes, branch_director_decision_at,
    ceo_id, ceo_decision, ceo_notes, ceo_decision_at,
    approved_budget_amount, approved_budget_currency, approved_budget_exchange_rate,
    budget_approved_at, budget_approved_by,
    actual_advance_amount, advance_method, bank_account, advance_notes,
    advance_status, advance_transferred_at, advance_transferred_by,
    actual_expense, settlement_status, settlement_notes,
    employee_confirmed_at, hr_confirmed_at, hr_confirmed_by,
    accountant_checked_at, accountant_notes, reimbursement_amount, exceeds_budget, excess_amount,
    created_at
) VALUES 
(
    1,
    'Công tác tại Paris',
    'Paris, France',
    'INTERNATIONAL',
    CURRENT_TIMESTAMP - INTERVAL '18 days',
    CURRENT_TIMESTAMP - INTERVAL '13 days',
    TRUE,
    TRUE,
    'PENDING_EXCEPTION_APPROVAL',
    'EXCEPTION_APPROVAL',
    'Headquarters Paris',
    '123 Avenue des Champs-Élysées, Paris',
    70000000,
    60,
    'USD',
    'EU',
    2,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '40 days',
    4,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '39 days',
    5,
    'APPROVE',
    'Đồng ý',
    CURRENT_TIMESTAMP - INTERVAL '37 days',
    70000000, -- Ngân sách: 70 triệu
    'VND',
    1.0,
    CURRENT_TIMESTAMP - INTERVAL '36 days',
    6,
    70000000, -- Đã chuyển
    'BANK_TRANSFER',
    '1112223334 - Ngân hàng ABC',
    'Đã chuyển khoản',
    'TRANSFERRED',
    CURRENT_TIMESTAMP - INTERVAL '35 days',
    6,
    80000000, -- Chi phí thực tế: 80 triệu (vượt 10 triệu)
    'HR_CONFIRMED',
    'Chi phí vượt ngân sách, cần phê duyệt ngoại lệ',
    CURRENT_TIMESTAMP - INTERVAL '17 days',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    6,
    CURRENT_TIMESTAMP - INTERVAL '4 days', -- Kế toán đã kiểm tra
    'Chi phí thực tế vượt ngân sách 10 triệu. Đã hoàn ứng 70 triệu theo ngân sách. Phần vượt cần phê duyệt ngoại lệ.',
    70000000, -- Hoàn ứng = ngân sách
    TRUE, -- Vượt ngân sách
    10000000, -- Số tiền vượt: 10 triệu
    CURRENT_TIMESTAMP - INTERVAL '42 days'
);

-- ============================================
-- TẠO MỘT SỐ ATTACHMENTS MẪU (cho các requests đã có settlement)
-- ============================================
-- Lưu ý: Cần thay thế travel_expense_request_id bằng ID thực tế sau khi insert

-- Ví dụ: Insert attachments cho request có settlement_status = 'HR_CONFIRMED'
-- (Bạn cần chạy query này sau khi biết ID của các requests vừa insert)

/*
INSERT INTO travel_expense_attachments (
    travel_expense_request_id, file_name, file_path, file_size, file_type, description
) VALUES 
(
    (SELECT id FROM travel_expense_requests WHERE settlement_status = 'HR_CONFIRMED' LIMIT 1),
    'invoice_001.pdf',
    'uploads/travel-expenses/invoice_001.pdf',
    245760,
    'application/pdf',
    'Hóa đơn khách sạn'
),
(
    (SELECT id FROM travel_expense_requests WHERE settlement_status = 'HR_CONFIRMED' LIMIT 1),
    'receipt_001.jpg',
    'uploads/travel-expenses/receipt_001.jpg',
    153600,
    'image/jpeg',
    'Biên lai taxi'
);
*/

-- ============================================
-- HƯỚNG DẪN SỬ DỤNG:
-- ============================================
-- 1. Kiểm tra employee_id trong database của bạn:
--    SELECT id, ho_ten, email FROM employees LIMIT 10;
--
-- 2. Thay thế các giá trị employee_id (1, 2, 3, 4, 5, 6) bằng ID thực tế
--
-- 3. Chạy script này:
--    psql -U your_username -d your_database -f database/mock_travel_expense_data.sql
--
-- 4. Kiểm tra kết quả:
--    SELECT id, employee_id, status, location, created_at 
--    FROM travel_expense_requests 
--    ORDER BY created_at DESC;
--
-- 5. Để test từng bước, bạn có thể:
--    - Xem requests PENDING_LEVEL_1 trong module "Duyệt đơn công tác"
--    - Xem requests PENDING_ACCOUNTANT trong module "Kiểm tra & Quyết toán"
--    - Xem requests SETTLED để kiểm tra kết quả cuối cùng

