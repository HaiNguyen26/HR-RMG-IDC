-- Script import danh sách ứng viên
-- Chạy file này trong PostgreSQL để import 109 ứng viên vào database

-- Xóa các ứng viên trùng lặp trước khi import (dựa trên số điện thoại)
-- Chạy script này với quyền admin

-- Mapping:
-- "Kỹ sư Thiết kế cơ" -> KHAOSAT_THIETKE
-- "PLC" hoặc "Kỹ sư điện - PLC" -> DIEN_LAPTRINH_PLC
-- "KTV vận hành CNC" -> VANHANH_MAY_CNC
-- "TTS mua hàng" hoặc "Mua hàng" -> MUAHANG
-- "Thiết kế" -> KHAOSAT_THIETKE (phòng ban)
-- "Kỹ thuật" -> DICHVU_KYTHUAT (phòng ban)
-- "Tự động" -> TUDONG (phòng ban)
-- "CNC" -> CNC (phòng ban)

-- Import danh sách ứng viên (chỉ insert nếu chưa tồn tại số điện thoại)
INSERT INTO candidates (ho_ten, vi_tri_ung_tuyen, phong_ban, so_dien_thoai, status, created_at, updated_at)
SELECT 
    ho_ten,
    vi_tri_ung_tuyen,
    phong_ban,
    so_dien_thoai,
    'PENDING_INTERVIEW'::varchar,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (VALUES
    ('Hà Duy Tuấn', 'KHAOSAT_THIETKE', 'KHAOSAT_THIETKE', '972415848'),
    ('Võ Thiện Nhựt', 'KHAOSAT_THIETKE', 'DICHVU_KYTHUAT', '342477716'),
    ('pham van viet', 'KHAOSAT_THIETKE', NULL, '358009020'),
    ('Lê Thanh Hùng', 'KHAOSAT_THIETKE', 'KHAOSAT_THIETKE', '355650058'),
    ('Nguyễn Đức Thành', 'KHAOSAT_THIETKE', 'KHAOSAT_THIETKE', '974195113'),
    ('Tấn Duy Võ', 'KHAOSAT_THIETKE', NULL, '344791927'),
    ('Phan Quốc Toản', 'KHAOSAT_THIETKE', NULL, '394954416'),
    ('Mai Khắc Ngọc', 'KHAOSAT_THIETKE', NULL, '397941520'),
    ('Nguyễn Thanh Tùng', 'KHAOSAT_THIETKE', NULL, '868480730'),
    ('Nguyễn Quang Linh', 'KHAOSAT_THIETKE', 'KHAOSAT_THIETKE', '966245720'),
    ('Trần Anh Sơn', 'KHAOSAT_THIETKE', NULL, '366686642'),
    ('Bùi Trọng Hiếu', 'KHAOSAT_THIETKE', NULL, '364248347'),
    ('Lâm Minh Thuyết', 'KHAOSAT_THIETKE', NULL, '0913300177'),
    ('Trần Minh Quân', 'KHAOSAT_THIETKE', NULL, '911423908'),
    ('Nguyễn Kim Thành', 'KHAOSAT_THIETKE', NULL, '363832114'),
    ('NGUYỄN THÀNH THUẬT', 'KHAOSAT_THIETKE', NULL, '389268589'),
    ('VÕ HUỲNH TIÊU KHÔI', 'KHAOSAT_THIETKE', NULL, '865350738'),
    ('Lê Thanh Lâm', 'KHAOSAT_THIETKE', NULL, '973675847'),
    ('Nguyễn Quốc Dũng', 'KHAOSAT_THIETKE', NULL, '869888776'),
    ('sơn nguyễn văn', 'KHAOSAT_THIETKE', NULL, '985500594'),
    ('Đoàn Hải Long', 'KHAOSAT_THIETKE', NULL, '397200299'),
    ('Phạm Đức Thành', 'KHAOSAT_THIETKE', NULL, '853411467'),
    ('ĐÀO XUÂN TRƯỜNG', 'KHAOSAT_THIETKE', NULL, '367315248'),
    ('Trần Tuấn Anh', 'KHAOSAT_THIETKE', NULL, '382050732'),
    ('Nguyễn Đình Việt Anh', 'KHAOSAT_THIETKE', NULL, '389333587'),
    ('Trường Đỗ', 'KHAOSAT_THIETKE', NULL, '333938570'),
    ('Trần Văn Độ', 'KHAOSAT_THIETKE', NULL, '963792034'),
    ('Phạm Văn Quỳnh', 'KHAOSAT_THIETKE', NULL, '965970697'),
    ('Vũ Văn Linh', 'KHAOSAT_THIETKE', NULL, '963032028'),
    ('Hoàng Thêm', 'KHAOSAT_THIETKE', NULL, '383302621'),
    ('Võ Lê Kiên', 'KHAOSAT_THIETKE', NULL, '869046459'),
    ('Nguyễn Hoàng Chính Trực', 'KHAOSAT_THIETKE', NULL, '795884923'),
    ('Phạm Thanh Tú', 'KHAOSAT_THIETKE', NULL, '368478343'),
    ('Đinh Trung Hậu', 'KHAOSAT_THIETKE', NULL, '399366315'),
    ('Trần Công Luyện', 'KHAOSAT_THIETKE', NULL, '813100402'),
    ('Phạm Đình Đồng', 'KHAOSAT_THIETKE', NULL, '522204006'),
    ('Nguyễn Ngọc Thức', 'KHAOSAT_THIETKE', NULL, '867476558'),
    ('Hoàng Lê Lợi', 'KHAOSAT_THIETKE', NULL, '969364832'),
    ('HẢI HOÀNG ĐÌNH', 'KHAOSAT_THIETKE', NULL, '944282658'),
    ('Nguyễn Đức Tú', 'KHAOSAT_THIETKE', NULL, '395690515'),
    ('Võ Thanh Quý', 'KHAOSAT_THIETKE', NULL, '817712410'),
    ('Thảo Ngô Tấn', 'KHAOSAT_THIETKE', NULL, '392294126'),
    ('dang Hoang Quoc', 'KHAOSAT_THIETKE', NULL, '387235728'),
    ('Võ Duy Hà', 'KHAOSAT_THIETKE', NULL, '339432177'),
    ('Nguyen Xuan Hoang', 'KHAOSAT_THIETKE', NULL, '382046500'),
    ('Nguyễn Quảng Hân', 'KHAOSAT_THIETKE', NULL, '345743046'),
    ('PHẠm anh dũng', 'KHAOSAT_THIETKE', NULL, '0967026652'),
    ('hua van khuyet', 'KHAOSAT_THIETKE', NULL, '339568200'),
    ('Huỳnh Lê Nguyên', 'KHAOSAT_THIETKE', NULL, '946784954'),
    ('Lê Minh Trọng', 'KHAOSAT_THIETKE', NULL, '898238479'),
    ('MAI ĐỨC KHÁNH', 'KHAOSAT_THIETKE', NULL, '867126361'),
    ('Phạm Trường An', 'KHAOSAT_THIETKE', NULL, '356225015'),
    ('TRẦN DUY KHANH', 'KHAOSAT_THIETKE', NULL, '768441646'),
    ('NGUYỄN VĂN MINH', 'KHAOSAT_THIETKE', NULL, '393341257'),
    ('Phí Hoàng Thắng', 'KHAOSAT_THIETKE', NULL, '337422703'),
    ('hoang dinh nguyen', 'KHAOSAT_THIETKE', NULL, '358872990'),
    ('Huỳnh Hữu Tuấn', 'KHAOSAT_THIETKE', NULL, '569151234'),
    ('NGUYỄN BẢO THANH', 'KHAOSAT_THIETKE', NULL, '336312059'),
    ('ĐẶNG MINH HIẾU', 'KHAOSAT_THIETKE', NULL, '971610398'),
    ('Nguyễn Đình Vũ', 'KHAOSAT_THIETKE', NULL, '902478934'),
    ('Phan Nguyễn Minh Triết', 'KHAOSAT_THIETKE', NULL, '347416187'),
    ('Trần Văn Nam', 'KHAOSAT_THIETKE', NULL, '866693603'),
    ('Đỗ Trọng Toàn', 'KHAOSAT_THIETKE', NULL, '385682742'),
    ('Pham Luong Hoan', 'KHAOSAT_THIETKE', NULL, '767781996'),
    ('Đào Ngọc Tuấn', 'KHAOSAT_THIETKE', NULL, '787018809'),
    ('Vũ Ngọc Chuyên', 'KHAOSAT_THIETKE', NULL, '962158032'),
    ('Nguyễn Hợp Trần', 'KHAOSAT_THIETKE', NULL, '359089652'),
    ('Bùi Quốc Hưng', 'KHAOSAT_THIETKE', NULL, '353233081'),
    ('TRẦN TRỌNG PHÚ', 'KHAOSAT_THIETKE', NULL, '398678432'),
    ('Nguyễn Văn Hân', 'KHAOSAT_THIETKE', NULL, '937211088'),
    ('Nguyễn Quốc Bảo', 'KHAOSAT_THIETKE', NULL, '824153878'),
    ('Trần Phát', 'KHAOSAT_THIETKE', NULL, '878894324'),
    ('Nguyen bao nhat', 'KHAOSAT_THIETKE', NULL, '931311792'),
    ('Lê Thế Hợp', 'KHAOSAT_THIETKE', NULL, '375072656'),
    ('Văn Thành', 'KHAOSAT_THIETKE', NULL, '901949765'),
    ('Huỳnh Lê Bảo Trọng', 'KHAOSAT_THIETKE', NULL, '982549207'),
    ('le van thuan', 'KHAOSAT_THIETKE', NULL, '943048167'),
    ('Sơn Trần Bửu', 'KHAOSAT_THIETKE', NULL, '394595394'),
    ('Hiển Thanh', 'KHAOSAT_THIETKE', NULL, '332226880'),
    ('DƯƠNG TRƯƠNG QUỐC', 'KHAOSAT_THIETKE', NULL, '949723991'),
    ('Nguyễn Thành Thuật', 'KHAOSAT_THIETKE', NULL, '389268589'),
    ('Duy Nguyen', 'KHAOSAT_THIETKE', NULL, '329227207'),
    ('Chì Dương', 'KHAOSAT_THIETKE', NULL, '385229584'),
    ('Nguyễn Hoàng Khương', 'KHAOSAT_THIETKE', NULL, '976279332'),
    ('toan phan', 'KHAOSAT_THIETKE', NULL, '969286570'),
    ('Trần Lê Khôi Nguyên', 'KHAOSAT_THIETKE', NULL, '344201781'),
    ('Trương Thị Xuân Hiệp', 'KHAOSAT_THIETKE', NULL, '938657552'),
    ('Phương Thảo Nguyễn', 'KHAOSAT_THIETKE', NULL, '963894061'),
    ('Thanh Thắng Nguyễn', 'KHAOSAT_THIETKE', NULL, '344553295'),
    ('Thaihoc Nguyen', 'KHAOSAT_THIETKE', NULL, '769404190'),
    ('Tai Nguyen Tien', 'KHAOSAT_THIETKE', NULL, '901452707'),
    ('Khoa Ho Ngoc Dang', 'KHAOSAT_THIETKE', NULL, '703164156'),
    ('Trịnh Hoàng Quốc Việt', 'KHAOSAT_THIETKE', NULL, '373024726'),
    ('Tuan Le', 'KHAOSAT_THIETKE', NULL, '866184160'),
    ('Đức Sầm', 'KHAOSAT_THIETKE', NULL, '326032536'),
    ('Nguyễn Quế Anh Tài', 'KHAOSAT_THIETKE', NULL, '333790331'),
    ('Duẩn NT', 'KHAOSAT_THIETKE', NULL, '379937608'),
    ('Tran Quoc', 'KHAOSAT_THIETKE', NULL, '937817479'),
    ('Duong Do', 'KHAOSAT_THIETKE', NULL, '398354709'),
    ('Đại Nghĩa Trần', 'KHAOSAT_THIETKE', NULL, '387238090'),
    ('Phan văn Cảnh', 'KHAOSAT_THIETKE', 'KHAOSAT_THIETKE', '908727461'),
    ('Trung Dương Nguyên', 'KHAOSAT_THIETKE', NULL, '981287657'),
    ('Lăng Kim', 'KHAOSAT_THIETKE', NULL, '817939112'),
    ('Phạm Nguyễn Duy Ân', 'DIEN_LAPTRINH_PLC', 'TUDONG', '903070214'),
    ('Đỗ Văn Hoài', 'KHAOSAT_THIETKE', NULL, '352274164'),
    ('Lương Quý Tuấn', 'VANHANH_MAY_CNC', 'CNC', '396700011'),
    ('Huỳnh Anh', 'DIEN_LAPTRINH_PLC', 'TUDONG', '345664844'),
    ('Nguyễn Thị Kiều Nhung', 'MUAHANG', NULL, '777133268'),
    ('Nguyễn Thanh Minh', 'MUAHANG', NULL, '376060043'),
    ('Nguyễn Thị Thắm', 'MUAHANG', NULL, '388128574')
) AS new_candidates(ho_ten, vi_tri_ung_tuyen, phong_ban, so_dien_thoai)
WHERE NOT EXISTS (
    SELECT 1 FROM candidates c 
    WHERE c.so_dien_thoai = new_candidates.so_dien_thoai
);

-- Kiểm tra số lượng đã import
SELECT COUNT(*) as total_imported FROM candidates WHERE created_at >= CURRENT_DATE;

