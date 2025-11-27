-- Script import danh sach ung vien
-- Encoding: UTF-8
-- Chay file nay trong PostgreSQL de import 109 ung vien vao database

-- Mapping:
-- "Ky su Thiet ke co" -> KHAOSAT_THIETKE
-- "PLC" hoac "Ky su dien - PLC" -> DIEN_LAPTRINH_PLC
-- "KTV van hanh CNC" -> VANHANH_MAY_CNC
-- "TTS mua hang" hoac "Mua hang" -> MUAHANG
-- "Thiet ke" -> KHAOSAT_THIETKE (phong ban)
-- "Ky thuat" -> DICHVU_KYTHUAT (phong ban)
-- "Tu dong" -> TUDONG (phong ban)
-- "CNC" -> CNC (phong ban)

-- Set client encoding to UTF8
SET client_encoding = 'UTF8';

-- Import danh sach ung vien (chi insert neu chua ton tai so dien thoai)
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
    (E'H\u00e0 Duy Tu\u1ea5n', 'KHAOSAT_THIETKE', 'KHAOSAT_THIETKE', '972415848'),
    (E'V\u00f5 Thi\u1ec7n Nh\u1ef1t', 'KHAOSAT_THIETKE', 'DICHVU_KYTHUAT', '342477716'),
    ('pham van viet', 'KHAOSAT_THIETKE', NULL, '358009020'),
    (E'L\u00ea Thanh H\u00f9ng', 'KHAOSAT_THIETKE', 'KHAOSAT_THIETKE', '355650058'),
    (E'Nguy\u1ec5n \u0110\u1ee9c Th\u00e0nh', 'KHAOSAT_THIETKE', 'KHAOSAT_THIETKE', '974195113'),
    (E'T\u1ea5n Duy V\u00f5', 'KHAOSAT_THIETKE', NULL, '344791927'),
    (E'Phan Qu\u1ed1c To\u1ea3n', 'KHAOSAT_THIETKE', NULL, '394954416'),
    (E'Mai Kh\u1eafc Ng\u1ecdc', 'KHAOSAT_THIETKE', NULL, '397941520'),
    (E'Nguy\u1ec5n Thanh T\u00f9ng', 'KHAOSAT_THIETKE', NULL, '868480730'),
    (E'Nguy\u1ec5n Quang Linh', 'KHAOSAT_THIETKE', 'KHAOSAT_THIETKE', '966245720'),
    (E'Tr\u1ea7n Anh S\u01a1n', 'KHAOSAT_THIETKE', NULL, '366686642'),
    (E'B\u00f9i Tr\u1ecdng Hi\u1ebfu', 'KHAOSAT_THIETKE', NULL, '364248347'),
    (E'L\u00e2m Minh Thuy\u1ebft', 'KHAOSAT_THIETKE', NULL, '0913300177'),
    (E'Tr\u1ea7n Minh Qu\u00e2n', 'KHAOSAT_THIETKE', NULL, '911423908'),
    (E'Nguy\u1ec5n Kim Th\u00e0nh', 'KHAOSAT_THIETKE', NULL, '363832114'),
    ('NGUYEN THANH THUAT', 'KHAOSAT_THIETKE', NULL, '389268589'),
    ('VO HUYNH TIEU KHOI', 'KHAOSAT_THIETKE', NULL, '865350738'),
    (E'L\u00ea Thanh L\u00e2m', 'KHAOSAT_THIETKE', NULL, '973675847'),
    (E'Nguy\u1ec5n Qu\u1ed1c D\u0169ng', 'KHAOSAT_THIETKE', NULL, '869888776'),
    ('son nguyen van', 'KHAOSAT_THIETKE', NULL, '985500594'),
    (E'\u0110o\u00e0n H\u1ea3i Long', 'KHAOSAT_THIETKE', NULL, '397200299'),
    (E'Ph\u1ea1m \u0110\u1ee9c Th\u00e0nh', 'KHAOSAT_THIETKE', NULL, '853411467'),
    ('DAO XUAN TRUONG', 'KHAOSAT_THIETKE', NULL, '367315248'),
    (E'Tr\u1ea7n Tu\u1ea5n Anh', 'KHAOSAT_THIETKE', NULL, '382050732'),
    (E'Nguy\u1ec5n \u0110\u00ecnh Vi\u1ec7t Anh', 'KHAOSAT_THIETKE', NULL, '389333587'),
    (E'Tr\u01b0\u1eddng \u0110\u1ed7', 'KHAOSAT_THIETKE', NULL, '333938570'),
    (E'Tr\u1ea7n V\u0103n \u0110\u1ed9', 'KHAOSAT_THIETKE', NULL, '963792034'),
    (E'Ph\u1ea1m V\u0103n Qu\u1ef3nh', 'KHAOSAT_THIETKE', NULL, '965970697'),
    (E'V\u0169 V\u0103n Linh', 'KHAOSAT_THIETKE', NULL, '963032028'),
    (E'Ho\u00e0ng Th\u00eam', 'KHAOSAT_THIETKE', NULL, '383302621'),
    (E'V\u00f5 L\u00ea Ki\u00ean', 'KHAOSAT_THIETKE', NULL, '869046459'),
    (E'Nguy\u1ec5n Ho\u00e0ng Ch\u00ednh Tr\u1ef1c', 'KHAOSAT_THIETKE', NULL, '795884923'),
    (E'Ph\u1ea1m Thanh T\u00fa', 'KHAOSAT_THIETKE', NULL, '368478343'),
    (E'\u0110inh Trung H\u1eadu', 'KHAOSAT_THIETKE', NULL, '399366315'),
    (E'Tr\u1ea7n C\u00f4ng Luy\u1ec7n', 'KHAOSAT_THIETKE', NULL, '813100402'),
    (E'Ph\u1ea1m \u0110\u00ecnh \u0110\u1ed3ng', 'KHAOSAT_THIETKE', NULL, '522204006'),
    (E'Nguy\u1ec5n Ng\u1ecdc Th\u1ee9c', 'KHAOSAT_THIETKE', NULL, '867476558'),
    (E'Ho\u00e0ng L\u00ea L\u1ee3i', 'KHAOSAT_THIETKE', NULL, '969364832'),
    ('HAI HOANG DINH', 'KHAOSAT_THIETKE', NULL, '944282658'),
    (E'Nguy\u1ec5n \u0110\u1ee9c T\u00fa', 'KHAOSAT_THIETKE', NULL, '395690515'),
    (E'V\u00f5 Thanh Qu\u00fd', 'KHAOSAT_THIETKE', NULL, '817712410'),
    (E'Th\u1ea3o Ng\u00f4 T\u1ea5n', 'KHAOSAT_THIETKE', NULL, '392294126'),
    ('dang Hoang Quoc', 'KHAOSAT_THIETKE', NULL, '387235728'),
    (E'V\u00f5 Duy H\u00e0', 'KHAOSAT_THIETKE', NULL, '339432177'),
    ('Nguyen Xuan Hoang', 'KHAOSAT_THIETKE', NULL, '382046500'),
    (E'Nguy\u1ec5n Qu\u1ea3ng H\u00e2n', 'KHAOSAT_THIETKE', NULL, '345743046'),
    ('PHAm anh dung', 'KHAOSAT_THIETKE', NULL, '0967026652'),
    ('hua van khuyet', 'KHAOSAT_THIETKE', NULL, '339568200'),
    (E'Hu\u1ef3nh L\u00ea Nguy\u00ean', 'KHAOSAT_THIETKE', NULL, '946784954'),
    (E'L\u00ea Minh Tr\u1ecdng', 'KHAOSAT_THIETKE', NULL, '898238479'),
    ('MAI DUC KHANH', 'KHAOSAT_THIETKE', NULL, '867126361'),
    (E'Ph\u1ea1m Tr\u01b0\u1eddng An', 'KHAOSAT_THIETKE', NULL, '356225015'),
    ('TRAN DUY KHANH', 'KHAOSAT_THIETKE', NULL, '768441646'),
    ('NGUYEN VAN MINH', 'KHAOSAT_THIETKE', NULL, '393341257'),
    (E'Ph\u00ed Ho\u00e0ng Th\u1eafng', 'KHAOSAT_THIETKE', NULL, '337422703'),
    ('hoang dinh nguyen', 'KHAOSAT_THIETKE', NULL, '358872990'),
    (E'Hu\u1ef3nh H\u1eefu Tu\u1ea5n', 'KHAOSAT_THIETKE', NULL, '569151234'),
    ('NGUYEN BAO THANH', 'KHAOSAT_THIETKE', NULL, '336312059'),
    ('DANG MINH HIEU', 'KHAOSAT_THIETKE', NULL, '971610398'),
    (E'Nguy\u1ec5n \u0110\u00ecnh V\u0169', 'KHAOSAT_THIETKE', NULL, '902478934'),
    (E'Phan Nguy\u1ec5n Minh Tri\u1ebft', 'KHAOSAT_THIETKE', NULL, '347416187'),
    (E'Tr\u1ea7n V\u0103n Nam', 'KHAOSAT_THIETKE', NULL, '866693603'),
    (E'\u0110\u1ed7 Tr\u1ecdng To\u00e0n', 'KHAOSAT_THIETKE', NULL, '385682742'),
    ('Pham Luong Hoan', 'KHAOSAT_THIETKE', NULL, '767781996'),
    (E'\u0110\u00e0o Ng\u1ecdc Tu\u1ea5n', 'KHAOSAT_THIETKE', NULL, '787018809'),
    (E'V\u0169 Ng\u1ecdc Chuy\u00ean', 'KHAOSAT_THIETKE', NULL, '962158032'),
    (E'Nguy\u1ec5n H\u1ee3p Tr\u1ea7n', 'KHAOSAT_THIETKE', NULL, '359089652'),
    (E'B\u00f9i Qu\u1ed1c H\u01b0ng', 'KHAOSAT_THIETKE', NULL, '353233081'),
    ('TRAN TRONG PHU', 'KHAOSAT_THIETKE', NULL, '398678432'),
    (E'Nguy\u1ec5n V\u0103n H\u00e2n', 'KHAOSAT_THIETKE', NULL, '937211088'),
    (E'Nguy\u1ec5n Qu\u1ed1c B\u1ea3o', 'KHAOSAT_THIETKE', NULL, '824153878'),
    (E'Tr\u1ea7n Ph\u00e1t', 'KHAOSAT_THIETKE', NULL, '878894324'),
    ('Nguyen bao nhat', 'KHAOSAT_THIETKE', NULL, '931311792'),
    (E'L\u00ea Th\u1ebf H\u1ee3p', 'KHAOSAT_THIETKE', NULL, '375072656'),
    (E'V\u0103n Th\u00e0nh', 'KHAOSAT_THIETKE', NULL, '901949765'),
    (E'Hu\u1ef3nh L\u00ea B\u1ea3o Tr\u1ecdng', 'KHAOSAT_THIETKE', NULL, '982549207'),
    ('le van thuan', 'KHAOSAT_THIETKE', NULL, '943048167'),
    (E'S\u01a1n Tr\u1ea7n B\u1eedu', 'KHAOSAT_THIETKE', NULL, '394595394'),
    (E'Hi\u1ec3n Thanh', 'KHAOSAT_THIETKE', NULL, '332226880'),
    ('DUONG TRUONG QUOC', 'KHAOSAT_THIETKE', NULL, '949723991'),
    (E'Nguy\u1ec5n Th\u00e0nh Thu\u1eadt', 'KHAOSAT_THIETKE', NULL, '389268589'),
    ('Duy Nguyen', 'KHAOSAT_THIETKE', NULL, '329227207'),
    (E'Ch\u00ec D\u01b0\u01a1ng', 'KHAOSAT_THIETKE', NULL, '385229584'),
    (E'Nguy\u1ec5n Ho\u00e0ng Kh\u01b0\u01a1ng', 'KHAOSAT_THIETKE', NULL, '976279332'),
    ('toan phan', 'KHAOSAT_THIETKE', NULL, '969286570'),
    (E'Tr\u1ea7n L\u00ea Kh\u00f4i Nguy\u00ean', 'KHAOSAT_THIETKE', NULL, '344201781'),
    (E'Tr\u01b0\u01a1ng Th\u1ecb Xu\u00e2n Hi\u1ec7p', 'KHAOSAT_THIETKE', NULL, '938657552'),
    (E'Ph\u01b0\u01a1ng Th\u1ea3o Nguy\u1ec5n', 'KHAOSAT_THIETKE', NULL, '963894061'),
    (E'Thanh Th\u1eafng Nguy\u1ec5n', 'KHAOSAT_THIETKE', NULL, '344553295'),
    ('Thaihoc Nguyen', 'KHAOSAT_THIETKE', NULL, '769404190'),
    ('Tai Nguyen Tien', 'KHAOSAT_THIETKE', NULL, '901452707'),
    ('Khoa Ho Ngoc Dang', 'KHAOSAT_THIETKE', NULL, '703164156'),
    (E'Tr\u1ecbnh Ho\u00e0ng Qu\u1ed1c Vi\u1ec7t', 'KHAOSAT_THIETKE', NULL, '373024726'),
    ('Tuan Le', 'KHAOSAT_THIETKE', NULL, '866184160'),
    (E'\u0110\u1ee9c S\u1ea7m', 'KHAOSAT_THIETKE', NULL, '326032536'),
    (E'Nguy\u1ec5n Qu\u1ebf Anh T\u00e0i', 'KHAOSAT_THIETKE', NULL, '333790331'),
    (E'Du\u1eabn NT', 'KHAOSAT_THIETKE', NULL, '379937608'),
    ('Tran Quoc', 'KHAOSAT_THIETKE', NULL, '937817479'),
    ('Duong Do', 'KHAOSAT_THIETKE', NULL, '398354709'),
    (E'\u0110\u1ea1i Ngh\u0129a Tr\u1ea7n', 'KHAOSAT_THIETKE', NULL, '387238090'),
    (E'Phan v\u0103n C\u1ea3nh', 'KHAOSAT_THIETKE', 'KHAOSAT_THIETKE', '908727461'),
    (E'Trung D\u01b0\u01a1ng Nguy\u00ean', 'KHAOSAT_THIETKE', NULL, '981287657'),
    (E'L\u0103ng Kim', 'KHAOSAT_THIETKE', NULL, '817939112'),
    (E'Ph\u1ea1m Nguy\u1ec5n Duy \u00c2n', 'DIEN_LAPTRINH_PLC', 'TUDONG', '903070214'),
    (E'\u0110\u1ed7 V\u0103n Ho\u00e0i', 'KHAOSAT_THIETKE', NULL, '352274164'),
    (E'L\u01b0\u01a1ng Qu\u00fd Tu\u1ea5n', 'VANHANH_MAY_CNC', 'CNC', '396700011'),
    (E'Hu\u1ef3nh Anh', 'DIEN_LAPTRINH_PLC', 'TUDONG', '345664844'),
    (E'Nguy\u1ec5n Th\u1ecb Ki\u1ec1u Nhung', 'MUAHANG', NULL, '777133268'),
    (E'Nguy\u1ec5n Thanh Minh', 'MUAHANG', NULL, '376060043'),
    (E'Nguy\u1ec5n Th\u1ecb Th\u1eafm', 'MUAHANG', NULL, '388128574')
) AS new_candidates(ho_ten, vi_tri_ung_tuyen, phong_ban, so_dien_thoai)
WHERE NOT EXISTS (
    SELECT 1 FROM candidates c 
    WHERE c.so_dien_thoai = new_candidates.so_dien_thoai
);

-- Kiem tra so luong da import
SELECT COUNT(*) as total_imported FROM candidates WHERE created_at >= CURRENT_DATE;

