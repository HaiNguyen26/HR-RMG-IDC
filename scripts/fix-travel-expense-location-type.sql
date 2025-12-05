-- Script sửa location_type sai trong travel_expense_requests
-- Các địa điểm Việt Nam phải là DOMESTIC, không phải INTERNATIONAL

-- Danh sách các tỉnh/thành phố Việt Nam
UPDATE travel_expense_requests
SET location_type = 'DOMESTIC'
WHERE location_type = 'INTERNATIONAL'
    AND (
        -- Các thành phố lớn
        LOWER(TRIM(location)) LIKE '%hà nội%'
        OR LOWER(TRIM(location)) LIKE '%ho chi minh%'
        OR LOWER(TRIM(location)) LIKE '%hồ chí minh%'
        OR LOWER(TRIM(location)) LIKE '%hai phong%'
        OR LOWER(TRIM(location)) LIKE '%hải phòng%'
        OR LOWER(TRIM(location)) LIKE '%da nang%'
        OR LOWER(TRIM(location)) LIKE '%đà nẵng%'
        OR LOWER(TRIM(location)) LIKE '%can tho%'
        OR LOWER(TRIM(location)) LIKE '%cần thơ%'
        
        -- Các tỉnh
        OR LOWER(TRIM(location)) LIKE '%an giang%'
        OR LOWER(TRIM(location)) LIKE '%bà rịa%'
        OR LOWER(TRIM(location)) LIKE '%vũng tàu%'
        OR LOWER(TRIM(location)) LIKE '%bắc giang%'
        OR LOWER(TRIM(location)) LIKE '%bắc kan%'
        OR LOWER(TRIM(location)) LIKE '%bắc kạn%'
        OR LOWER(TRIM(location)) LIKE '%bạc liêu%'
        OR LOWER(TRIM(location)) LIKE '%bắc ninh%'
        OR LOWER(TRIM(location)) LIKE '%bến tre%'
        OR LOWER(TRIM(location)) LIKE '%bình định%'
        OR LOWER(TRIM(location)) LIKE '%bình dương%'
        OR LOWER(TRIM(location)) LIKE '%bình phước%'
        OR LOWER(TRIM(location)) LIKE '%bình thuận%'
        OR LOWER(TRIM(location)) LIKE '%cà mau%'
        OR LOWER(TRIM(location)) LIKE '%cao bằng%'
        OR LOWER(TRIM(location)) LIKE '%đắk lắk%'
        OR LOWER(TRIM(location)) LIKE '%đắk nông%'
        OR LOWER(TRIM(location)) LIKE '%điện biên%'
        OR LOWER(TRIM(location)) LIKE '%đồng nai%'
        OR LOWER(TRIM(location)) LIKE '%đồng tháp%'
        OR LOWER(TRIM(location)) LIKE '%gia lai%'
        OR LOWER(TRIM(location)) LIKE '%hà giang%'
        OR LOWER(TRIM(location)) LIKE '%hà nam%'
        OR LOWER(TRIM(location)) LIKE '%hà tĩnh%'
        OR LOWER(TRIM(location)) LIKE '%hải dương%'
        OR LOWER(TRIM(location)) LIKE '%hậu giang%'
        OR LOWER(TRIM(location)) LIKE '%hòa bình%'
        OR LOWER(TRIM(location)) LIKE '%hưng yên%'
        OR LOWER(TRIM(location)) LIKE '%khánh hòa%'
        OR LOWER(TRIM(location)) LIKE '%kiên giang%'
        OR LOWER(TRIM(location)) LIKE '%kon tum%'
        OR LOWER(TRIM(location)) LIKE '%lai châu%'
        OR LOWER(TRIM(location)) LIKE '%lạng sơn%'
        OR LOWER(TRIM(location)) LIKE '%lào cai%'
        OR LOWER(TRIM(location)) LIKE '%lâm đồng%'
        OR LOWER(TRIM(location)) LIKE '%long an%'
        OR LOWER(TRIM(location)) LIKE '%nam định%'
        OR LOWER(TRIM(location)) LIKE '%nghệ an%'
        OR LOWER(TRIM(location)) LIKE '%ninh bình%'
        OR LOWER(TRIM(location)) LIKE '%ninh thuận%'
        OR LOWER(TRIM(location)) LIKE '%phú thọ%'
        OR LOWER(TRIM(location)) LIKE '%phú yên%'
        OR LOWER(TRIM(location)) LIKE '%quảng bình%'
        OR LOWER(TRIM(location)) LIKE '%quảng nam%'
        OR LOWER(TRIM(location)) LIKE '%quảng ngãi%'
        OR LOWER(TRIM(location)) LIKE '%quảng ninh%'
        OR LOWER(TRIM(location)) LIKE '%quảng trị%'
        OR LOWER(TRIM(location)) LIKE '%sóc trăng%'
        OR LOWER(TRIM(location)) LIKE '%sơn la%'
        OR LOWER(TRIM(location)) LIKE '%tây ninh%'
        OR LOWER(TRIM(location)) LIKE '%thái bình%'
        OR LOWER(TRIM(location)) LIKE '%thái nguyên%'
        OR LOWER(TRIM(location)) LIKE '%thanh hóa%'
        OR LOWER(TRIM(location)) LIKE '%thừa thiên%'
        OR LOWER(TRIM(location)) LIKE '%huế%'
        OR LOWER(TRIM(location)) LIKE '%tiền giang%'
        OR LOWER(TRIM(location)) LIKE '%trà vinh%'
        OR LOWER(TRIM(location)) LIKE '%tuyên quang%'
        OR LOWER(TRIM(location)) LIKE '%vĩnh long%'
        OR LOWER(TRIM(location)) LIKE '%vĩnh phúc%'
        OR LOWER(TRIM(location)) LIKE '%yên bái%'
        
        -- Các cách viết khác
        OR LOWER(TRIM(location)) = 'hà nội'
        OR LOWER(TRIM(location)) = 'ha noi'
        OR LOWER(TRIM(location)) = 'hanoi'
        OR LOWER(TRIM(location)) = 'tp.hcm'
        OR LOWER(TRIM(location)) = 'tp hcm'
        OR LOWER(TRIM(location)) = 'thành phố hồ chí minh'
        OR LOWER(TRIM(location)) = 'thanh pho ho chi minh'
        OR LOWER(TRIM(location)) = 'hochiminh'
        OR LOWER(TRIM(location)) = 'hcm'
    );

-- Hiển thị kết quả
SELECT 
    id,
    location,
    location_type,
    title
FROM travel_expense_requests
WHERE title LIKE '%[MOCK]%'
ORDER BY location_type, location;

-- Thống kê sau khi sửa
SELECT 
    location_type,
    COUNT(*) as count
FROM travel_expense_requests
WHERE title LIKE '%[MOCK]%'
GROUP BY location_type;

