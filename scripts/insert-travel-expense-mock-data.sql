-- Script chèn Mock Data cho Quản Lý Kinh Phí Công Tác
-- Bao gồm 10 yêu cầu: 5 trong nước và 5 ngoài nước
-- Các trạng thái khác nhau để test đầy đủ tính năng

-- Đảm bảo bảng tồn tại
CREATE TABLE IF NOT EXISTS travel_expense_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title TEXT,
    purpose TEXT,
    location TEXT NOT NULL,
    location_type VARCHAR(20) NOT NULL,
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    is_overnight BOOLEAN NOT NULL DEFAULT FALSE,
    requires_ceo BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(40) NOT NULL DEFAULT 'PENDING_LEVEL_2',
    current_step VARCHAR(40) NOT NULL DEFAULT 'LEVEL_1',
    estimated_cost NUMERIC(12, 2),
    requested_by INTEGER,
    manager_id INTEGER,
    manager_decision VARCHAR(20),
    manager_notes TEXT,
    manager_decision_at TIMESTAMP WITHOUT TIME ZONE,
    ceo_id INTEGER,
    ceo_decision VARCHAR(20),
    ceo_notes TEXT,
    ceo_decision_at TIMESTAMP WITHOUT TIME ZONE,
    finance_id INTEGER,
    finance_decision VARCHAR(20),
    finance_notes TEXT,
    finance_decision_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Xóa dữ liệu mock cũ nếu có (để tránh trùng lặp khi chạy lại)
DELETE FROM travel_expense_requests WHERE title LIKE '%[MOCK]%';

-- Lấy employee_id từ bảng employees (lấy 5 nhân viên đầu tiên)
-- Nếu không có nhân viên, script sẽ báo lỗi

-- ============================================
-- YÊU CẦU CÔNG TÁC TRONG NƯỚC (DOMESTIC)
-- ============================================

-- 1. Công tác Hà Nội - Chờ duyệt cấp 1 (Quản lý trực tiếp)
INSERT INTO travel_expense_requests (
    employee_id,
    title,
    purpose,
    location,
    location_type,
    start_time,
    end_time,
    is_overnight,
    requires_ceo,
    status,
    current_step,
    estimated_cost,
    created_at
) VALUES (
    (SELECT id FROM employees ORDER BY id LIMIT 1 OFFSET 0),
    '[MOCK] Công tác Hà Nội - Họp với đối tác',
    'Tham gia cuộc họp quan trọng với đối tác chiến lược tại Hà Nội để bàn về hợp tác dài hạn và ký kết hợp đồng mới.',
    'Hà Nội',
    'DOMESTIC',
    (CURRENT_TIMESTAMP + INTERVAL '5 days'),
    (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    true,
    false,
    'PENDING_LEVEL_1',
    'LEVEL_1',
    5000000.00,
    CURRENT_TIMESTAMP - INTERVAL '2 days'
);

-- 2. Công tác Đà Nẵng - Đã duyệt cấp 1, chờ duyệt cấp 2 (Kế toán)
INSERT INTO travel_expense_requests (
    employee_id,
    title,
    purpose,
    location,
    location_type,
    start_time,
    end_time,
    is_overnight,
    requires_ceo,
    status,
    current_step,
    estimated_cost,
    manager_id,
    manager_decision,
    manager_notes,
    manager_decision_at,
    created_at
) VALUES (
    (SELECT id FROM employees ORDER BY id LIMIT 1 OFFSET 1),
    '[MOCK] Công tác Đà Nẵng - Đào tạo nhân viên',
    'Thực hiện chương trình đào tạo kỹ năng cho đội ngũ nhân viên tại chi nhánh Đà Nẵng về quy trình làm việc mới và công nghệ mới.',
    'Đà Nẵng',
    'DOMESTIC',
    (CURRENT_TIMESTAMP + INTERVAL '10 days'),
    (CURRENT_TIMESTAMP + INTERVAL '12 days'),
    true,
    false,
    'PENDING_LEVEL_2',
    'LEVEL_2',
    3500000.00,
    (SELECT id FROM employees ORDER BY id LIMIT 1),
    'APPROVED',
    'Đồng ý cho công tác. Đây là hoạt động quan trọng cho phát triển nhân sự.',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '3 days'
);

-- 3. Công tác TP.HCM - Đã duyệt hoàn toàn
INSERT INTO travel_expense_requests (
    employee_id,
    title,
    purpose,
    location,
    location_type,
    start_time,
    end_time,
    is_overnight,
    requires_ceo,
    status,
    current_step,
    estimated_cost,
    manager_id,
    manager_decision,
    manager_notes,
    manager_decision_at,
    finance_id,
    finance_decision,
    finance_notes,
    finance_decision_at,
    created_at
) VALUES (
    (SELECT id FROM employees ORDER BY id LIMIT 1 OFFSET 2),
    '[MOCK] Công tác TP.HCM - Triển lãm công nghệ',
    'Tham gia triển lãm công nghệ quốc tế tại TP.HCM để tìm hiểu các giải pháp mới và mở rộng mạng lưới đối tác.',
    'Thành phố Hồ Chí Minh',
    'DOMESTIC',
    (CURRENT_TIMESTAMP + INTERVAL '15 days'),
    (CURRENT_TIMESTAMP + INTERVAL '17 days'),
    true,
    false,
    'APPROVED',
    'COMPLETED',
    6000000.00,
    (SELECT id FROM employees ORDER BY id LIMIT 1),
    'APPROVED',
    'Đồng ý. Đây là cơ hội tốt để học hỏi và phát triển.',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    (SELECT id FROM employees ORDER BY id LIMIT 1),
    'APPROVED',
    'Đã duyệt chi phí. Vui lòng chuẩn bị hóa đơn sau khi hoàn thành.',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    CURRENT_TIMESTAMP - INTERVAL '7 days'
);

-- 4. Công tác Hải Phòng - Đã từ chối
INSERT INTO travel_expense_requests (
    employee_id,
    title,
    purpose,
    location,
    location_type,
    start_time,
    end_time,
    is_overnight,
    requires_ceo,
    status,
    current_step,
    estimated_cost,
    manager_id,
    manager_decision,
    manager_notes,
    manager_decision_at,
    created_at
) VALUES (
    (SELECT id FROM employees ORDER BY id LIMIT 1 OFFSET 3),
    '[MOCK] Công tác Hải Phòng - Khảo sát thị trường',
    'Thực hiện khảo sát thị trường tại Hải Phòng để đánh giá tiềm năng mở rộng kinh doanh.',
    'Hải Phòng',
    'DOMESTIC',
    (CURRENT_TIMESTAMP + INTERVAL '8 days'),
    (CURRENT_TIMESTAMP + INTERVAL '9 days'),
    false,
    false,
    'REJECTED',
    'REJECTED',
    2000000.00,
    (SELECT id FROM employees ORDER BY id LIMIT 1),
    'REJECTED',
    'Từ chối do ngân sách đã được phân bổ cho các hoạt động khác. Có thể xem xét lại vào quý sau.',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '4 days'
);

-- 5. Công tác Cần Thơ - Chờ duyệt cấp 1 (mới tạo)
INSERT INTO travel_expense_requests (
    employee_id,
    title,
    purpose,
    location,
    location_type,
    start_time,
    end_time,
    is_overnight,
    requires_ceo,
    status,
    current_step,
    estimated_cost,
    created_at
) VALUES (
    (SELECT id FROM employees ORDER BY id LIMIT 1 OFFSET 4),
    '[MOCK] Công tác Cần Thơ - Kiểm tra dự án',
    'Kiểm tra tiến độ và chất lượng dự án đang triển khai tại Cần Thơ, đảm bảo đúng tiến độ và chất lượng.',
    'Cần Thơ',
    'DOMESTIC',
    (CURRENT_TIMESTAMP + INTERVAL '20 days'),
    (CURRENT_TIMESTAMP + INTERVAL '22 days'),
    true,
    false,
    'PENDING_LEVEL_1',
    'LEVEL_1',
    4000000.00,
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
);

-- ============================================
-- YÊU CẦU CÔNG TÁC NGOÀI NƯỚC (INTERNATIONAL)
-- ============================================

-- 6. Công tác Singapore - Chờ duyệt cấp 1 (Quản lý trực tiếp)
INSERT INTO travel_expense_requests (
    employee_id,
    title,
    purpose,
    location,
    location_type,
    start_time,
    end_time,
    is_overnight,
    requires_ceo,
    status,
    current_step,
    estimated_cost,
    created_at
) VALUES (
    (SELECT id FROM employees ORDER BY id LIMIT 1 OFFSET 0),
    '[MOCK] Công tác Singapore - Hội nghị quốc tế',
    'Tham gia hội nghị công nghệ quốc tế tại Singapore để cập nhật xu hướng mới nhất và kết nối với các chuyên gia hàng đầu.',
    'Singapore',
    'INTERNATIONAL',
    (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    (CURRENT_TIMESTAMP + INTERVAL '35 days'),
    true,
    true,
    'PENDING_LEVEL_1',
    'LEVEL_1',
    25000000.00,
    CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- 7. Công tác Tokyo, Nhật Bản - Đã duyệt cấp 1, chờ duyệt CEO
INSERT INTO travel_expense_requests (
    employee_id,
    title,
    purpose,
    location,
    location_type,
    start_time,
    end_time,
    is_overnight,
    requires_ceo,
    status,
    current_step,
    estimated_cost,
    manager_id,
    manager_decision,
    manager_notes,
    manager_decision_at,
    created_at
) VALUES (
    (SELECT id FROM employees ORDER BY id LIMIT 1 OFFSET 1),
    '[MOCK] Công tác Tokyo - Đàm phán hợp đồng',
    'Tham gia đàm phán hợp đồng quan trọng với đối tác Nhật Bản về hợp tác dài hạn và đầu tư vào dự án mới.',
    'Tokyo, Nhật Bản',
    'INTERNATIONAL',
    (CURRENT_TIMESTAMP + INTERVAL '25 days'),
    (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    true,
    true,
    'PENDING_LEVEL_2',
    'LEVEL_2',
    35000000.00,
    (SELECT id FROM employees ORDER BY id LIMIT 1),
    'APPROVED',
    'Đồng ý. Đây là cơ hội quan trọng để mở rộng thị trường. Cần phê duyệt của CEO.',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '5 days'
);

-- 8. Công tác Bangkok, Thái Lan - Đã duyệt hoàn toàn
INSERT INTO travel_expense_requests (
    employee_id,
    title,
    purpose,
    location,
    location_type,
    start_time,
    end_time,
    is_overnight,
    requires_ceo,
    status,
    current_step,
    estimated_cost,
    manager_id,
    manager_decision,
    manager_notes,
    manager_decision_at,
    ceo_id,
    ceo_decision,
    ceo_notes,
    ceo_decision_at,
    finance_id,
    finance_decision,
    finance_notes,
    finance_decision_at,
    created_at
) VALUES (
    (SELECT id FROM employees ORDER BY id LIMIT 1 OFFSET 2),
    '[MOCK] Công tác Bangkok - Đào tạo chuyên sâu',
    'Tham gia khóa đào tạo chuyên sâu về quản lý dự án và công nghệ mới tại Bangkok do đối tác quốc tế tổ chức.',
    'Bangkok, Thái Lan',
    'INTERNATIONAL',
    (CURRENT_TIMESTAMP + INTERVAL '40 days'),
    (CURRENT_TIMESTAMP + INTERVAL '45 days'),
    true,
    true,
    'APPROVED',
    'COMPLETED',
    18000000.00,
    (SELECT id FROM employees ORDER BY id LIMIT 1),
    'APPROVED',
    'Đồng ý. Khóa học này sẽ nâng cao năng lực của nhân viên.',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    (SELECT id FROM employees ORDER BY id LIMIT 1),
    'APPROVED',
    'Đồng ý. Đầu tư vào phát triển nhân sự là ưu tiên.',
    CURRENT_TIMESTAMP - INTERVAL '8 days',
    (SELECT id FROM employees ORDER BY id LIMIT 1),
    'APPROVED',
    'Đã duyệt. Vui lòng lưu giữ tất cả hóa đơn để thanh toán sau.',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '12 days'
);

-- 9. Công tác Seoul, Hàn Quốc - Đã từ chối bởi CEO
INSERT INTO travel_expense_requests (
    employee_id,
    title,
    purpose,
    location,
    location_type,
    start_time,
    end_time,
    is_overnight,
    requires_ceo,
    status,
    current_step,
    estimated_cost,
    manager_id,
    manager_decision,
    manager_notes,
    manager_decision_at,
    ceo_id,
    ceo_decision,
    ceo_notes,
    ceo_decision_at,
    created_at
) VALUES (
    (SELECT id FROM employees ORDER BY id LIMIT 1 OFFSET 3),
    '[MOCK] Công tác Seoul - Hội thảo công nghệ',
    'Tham gia hội thảo công nghệ tại Seoul để tìm hiểu các xu hướng mới và công nghệ tiên tiến.',
    'Seoul, Hàn Quốc',
    'INTERNATIONAL',
    (CURRENT_TIMESTAMP + INTERVAL '18 days'),
    (CURRENT_TIMESTAMP + INTERVAL '22 days'),
    true,
    true,
    'REJECTED',
    'REJECTED',
    28000000.00,
    (SELECT id FROM employees ORDER BY id LIMIT 1),
    'APPROVED',
    'Đồng ý. Tuy nhiên cần phê duyệt của CEO do chi phí cao.',
    CURRENT_TIMESTAMP - INTERVAL '4 days',
    (SELECT id FROM employees ORDER BY id LIMIT 1),
    'REJECTED',
    'Từ chối do ngân sách đã được phân bổ cho các hoạt động khác trong quý này. Có thể xem xét lại vào quý sau.',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '6 days'
);

-- 10. Công tác Kuala Lumpur, Malaysia - Chờ duyệt cấp 1 (mới tạo)
INSERT INTO travel_expense_requests (
    employee_id,
    title,
    purpose,
    location,
    location_type,
    start_time,
    end_time,
    is_overnight,
    requires_ceo,
    status,
    current_step,
    estimated_cost,
    created_at
) VALUES (
    (SELECT id FROM employees ORDER BY id LIMIT 1 OFFSET 4),
    '[MOCK] Công tác Kuala Lumpur - Triển lãm thương mại',
    'Tham gia triển lãm thương mại quốc tế tại Kuala Lumpur để giới thiệu sản phẩm và tìm kiếm đối tác mới.',
    'Kuala Lumpur, Malaysia',
    'INTERNATIONAL',
    (CURRENT_TIMESTAMP + INTERVAL '50 days'),
    (CURRENT_TIMESTAMP + INTERVAL '55 days'),
    true,
    true,
    'PENDING_LEVEL_1',
    'LEVEL_1',
    22000000.00,
    CURRENT_TIMESTAMP - INTERVAL '30 minutes'
);

-- Hiển thị kết quả
SELECT 
    id,
    (SELECT ho_ten FROM employees WHERE id = travel_expense_requests.employee_id) as employee_name,
    title,
    location,
    location_type,
    status,
    current_step,
    estimated_cost,
    start_time,
    end_time,
    created_at
FROM travel_expense_requests
WHERE title LIKE '%[MOCK]%'
ORDER BY created_at DESC;

-- Kiểm tra số lượng theo location_type và status
SELECT 
    location_type,
    status,
    COUNT(*) as count
FROM travel_expense_requests
WHERE title LIKE '%[MOCK]%'
GROUP BY location_type, status
ORDER BY location_type, status;

-- Kiểm tra các yêu cầu chờ duyệt (PENDING_LEVEL_1, PENDING_LEVEL_2)
SELECT 
    id,
    location,
    location_type,
    status,
    title
FROM travel_expense_requests
WHERE title LIKE '%[MOCK]%'
    AND status IN ('PENDING_LEVEL_1', 'PENDING_LEVEL_2')
ORDER BY location_type, created_at DESC;

-- Thống kê
SELECT 
    location_type,
    status,
    COUNT(*) as count,
    SUM(estimated_cost) as total_cost
FROM travel_expense_requests
WHERE title LIKE '%[MOCK]%'
GROUP BY location_type, status
ORDER BY location_type, status;

