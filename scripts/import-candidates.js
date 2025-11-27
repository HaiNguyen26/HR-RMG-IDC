const pool = require('../backend/config/database');

// Đảm bảo encoding UTF-8
process.env.PGCLIENTENCODING = 'UTF8';

// Mapping từ tên vị trí/phòng ban sang giá trị trong hệ thống
const mapViTri = (viTri) => {
    if (!viTri) return null;
    const viTriLower = viTri.toLowerCase();

    if (viTriLower.includes('kỹ sư thiết kế cơ') || viTriLower.includes('khảo sát thiết kế')) {
        return 'KHAOSAT_THIETKE';
    }
    if (viTriLower.includes('plc') || viTriLower.includes('điện lập trình')) {
        return 'DIEN_LAPTRINH_PLC';
    }
    if (viTriLower.includes('cnc') || viTriLower.includes('vận hành cnc')) {
        return 'VANHANH_MAY_CNC';
    }
    if (viTriLower.includes('mua hàng') || viTriLower.includes('tts mua hàng')) {
        return 'MUAHANG';
    }
    if (viTriLower.includes('thiết kế máy tự động')) {
        return 'THIETKE_MAY_TUDONG';
    }

    return null;
};

const mapPhongBan = (phongBan) => {
    if (!phongBan) return null;
    const phongBanLower = phongBan.toLowerCase();

    if (phongBanLower.includes('thiết kế') || phongBanLower === 'thiết kế') {
        return 'KHAOSAT_THIETKE';
    }
    if (phongBanLower.includes('kỹ thuật') || phongBanLower === 'kỹ thuật') {
        return 'DICHVU_KYTHUAT';
    }
    if (phongBanLower.includes('tự động') || phongBanLower === 'tự động') {
        return 'TUDONG';
    }
    if (phongBanLower === 'cnc') {
        return 'CNC';
    }

    return null;
};

// Danh sách ứng viên từ các hình ảnh
const candidates = [
    // Hình 1
    { hoTen: 'Hà Duy Tuấn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: 'Thiết kế', soDienThoai: '972415848' },
    { hoTen: 'Võ Thiện Nhựt', viTri: 'Kỹ sư Thiết kế cơ', phongBan: 'Kỹ thuật', soDienThoai: '342477716' },
    { hoTen: 'pham van viet', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '358009020' },
    { hoTen: 'Lê Thanh Hùng', viTri: 'Kỹ sư Thiết kế cơ', phongBan: 'Thiết kế', soDienThoai: '355650058' },
    { hoTen: 'Nguyễn Đức Thành', viTri: 'Kỹ sư Thiết kế cơ', phongBan: 'Thiết kế', soDienThoai: '974195113' },
    { hoTen: 'Tấn Duy Võ', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '344791927' },
    { hoTen: 'Phan Quốc Toản', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '394954416' },
    { hoTen: 'Mai Khắc Ngọc', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '397941520' },
    { hoTen: 'Nguyễn Thanh Tùng', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '868480730' },
    { hoTen: 'Nguyễn Quang Linh', viTri: 'Kỹ sư Thiết kế cơ', phongBan: 'Thiết kế', soDienThoai: '966245720' },

    // Hình 2
    { hoTen: 'Trần Anh Sơn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '366686642' },
    { hoTen: 'Bùi Trọng Hiếu', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '364248347' },
    { hoTen: 'Lâm Minh Thuyết', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '0913300177' },
    { hoTen: 'Trần Minh Quân', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '911423908' },
    { hoTen: 'Nguyễn Kim Thành', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '363832114' },
    { hoTen: 'NGUYỄN THÀNH THUẬT', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '389268589' },
    { hoTen: 'VÕ HUỲNH TIÊU KHÔI', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '865350738' },
    { hoTen: 'Lê Thanh Lâm', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '973675847' },
    { hoTen: 'Nguyễn Quốc Dũng', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '869888776' },

    // Hình 3
    { hoTen: 'sơn nguyễn văn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '985500594' },
    { hoTen: 'Đoàn Hải Long', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '397200299' },
    { hoTen: 'Phạm Đức Thành', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '853411467' },
    { hoTen: 'ĐÀO XUÂN TRƯỜNG', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '367315248' },
    { hoTen: 'Trần Tuấn Anh', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '382050732' },
    { hoTen: 'Nguyễn Đình Việt Anh', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '389333587' },
    { hoTen: 'Trường Đỗ', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '333938570' },
    { hoTen: 'Trần Văn Độ', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '963792034' },
    { hoTen: 'Phạm Văn Quỳnh', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '965970697' },
    { hoTen: 'Vũ Văn Linh', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '963032028' },
    { hoTen: 'Hoàng Thêm', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '383302621' },

    // Hình 4
    { hoTen: 'Vũ Văn Linh', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '963032028' },
    { hoTen: 'Hoàng Thêm', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '383302621' },
    { hoTen: 'Võ Lê Kiên', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '869046459' },
    { hoTen: 'Nguyễn Hoàng Chính Trực', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '795884923' },
    { hoTen: 'Phạm Thanh Tú', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '368478343' },
    { hoTen: 'Đinh Trung Hậu', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '399366315' },
    { hoTen: 'Trần Công Luyện', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '813100402' },
    { hoTen: 'Phạm Đình Đồng', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '522204006' },
    { hoTen: 'Nguyễn Ngọc Thức', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '867476558' },

    // Hình 5
    { hoTen: 'Hoàng Lê Lợi', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '969364832' },
    { hoTen: 'HẢI HOÀNG ĐÌNH', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '944282658' },
    { hoTen: 'Nguyễn Đức Tú', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '395690515' },
    { hoTen: 'Võ Thanh Quý', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '817712410' },
    { hoTen: 'Thảo Ngô Tấn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '392294126' },
    { hoTen: 'dang Hoang Quoc', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '387235728' },
    { hoTen: 'Võ Duy Hà', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '339432177' },
    { hoTen: 'Nguyen Xuan Hoang', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '382046500' },
    { hoTen: 'Nguyễn Quảng Hân', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '345743046' },

    // Hình 6
    { hoTen: 'Trần Anh Sơn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '366686642' },
    { hoTen: 'PHẠm anh dũng', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '0967026652' },
    { hoTen: 'hua van khuyet', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '339568200' },
    { hoTen: 'Huỳnh Lê Nguyên', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '946784954' },
    { hoTen: 'Lê Minh Trọng', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '898238479' },
    { hoTen: 'MAI ĐỨC KHÁNH', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '867126361' },
    { hoTen: 'Phạm Trường An', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '356225015' },
    { hoTen: 'TRẦN DUY KHANH', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '768441646' },
    { hoTen: 'NGUYỄN VĂN MINH', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '393341257' },
    { hoTen: 'Phí Hoàng Thắng', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '337422703' },

    // Hình 7
    { hoTen: 'hoang dinh nguyen', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '358872990' },
    { hoTen: 'Huỳnh Hữu Tuấn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '569151234' },
    { hoTen: 'NGUYỄN BẢO THANH', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '336312059' },
    { hoTen: 'ĐẶNG MINH HIẾU', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '971610398' },
    { hoTen: 'Nguyễn Đình Vũ', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '902478934' },
    { hoTen: 'Phan Nguyễn Minh Triết', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '347416187' },
    { hoTen: 'Trần Văn Nam', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '866693603' },
    { hoTen: 'Đỗ Trọng Toàn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '385682742' },
    { hoTen: 'Pham Luong Hoan', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '767781996' },

    // Hình 8
    { hoTen: 'Đào Ngọc Tuấn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '787018809' },
    { hoTen: 'Vũ Ngọc Chuyên', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '962158032' },
    { hoTen: 'Nguyễn Hợp Trần', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '359089652' },
    { hoTen: 'Bùi Quốc Hưng', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '353233081' },
    { hoTen: 'TRẦN TRỌNG PHÚ', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '398678432' },
    { hoTen: 'Phan Nguyễn Minh Triết', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '347416187' },
    { hoTen: 'Nguyễn Văn Hân', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '937211088' },
    { hoTen: 'Nguyễn Quốc Bảo', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '824153878' },
    { hoTen: 'Trần Phát', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '878894324' },
    { hoTen: 'Nguyen bao nhat', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '931311792' },

    // Hình 9
    { hoTen: 'Lê Thế Hợp', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '375072656' },
    { hoTen: 'TRẦN DUY KHANH', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '768441646' },
    { hoTen: 'Văn Thành', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '901949765' },
    { hoTen: 'Huỳnh Lê Bảo Trọng', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '982549207' },
    { hoTen: 'le van thuan', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '943048167' },
    { hoTen: 'Sơn Trần Bửu', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '394595394' },
    { hoTen: 'Hiển Thanh', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '332226880' },
    { hoTen: 'Nguyễn Quốc Dũng', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '869888776' },
    { hoTen: 'DƯƠNG TRƯƠNG QUỐC', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '949723991' },
    { hoTen: 'Nguyễn Thành Thuật', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '389268589' },
    { hoTen: 'Duy Nguyen', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '329227207' },

    // Hình 10
    { hoTen: 'Chì Dương', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '385229584' },
    { hoTen: 'Nguyễn Hoàng Khương', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '976279332' },
    { hoTen: 'toan phan', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '969286570' },
    { hoTen: 'Trần Lê Khôi Nguyên', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '344201781' },
    { hoTen: 'Trương Thị Xuân Hiệp', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '938657552' },
    { hoTen: 'Phương Thảo Nguyễn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '963894061' },
    { hoTen: 'sơn nguyễn văn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '985500594' },
    { hoTen: 'Thanh Thắng Nguyễn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '344553295' },
    { hoTen: 'Thaihoc Nguyen', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '769404190' },
    { hoTen: 'Tai Nguyen Tien', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '901452707' },
    { hoTen: 'Khoa Ho Ngoc Dang', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '703164156' },

    // Hình 11
    { hoTen: 'Trịnh Hoàng Quốc Việt', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '373024726' },
    { hoTen: 'Tuan Le', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '866184160' },
    { hoTen: 'Thành Đức', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '853411467' },
    { hoTen: 'Đức Sầm', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '326032536' },
    { hoTen: 'Nguyễn Quế Anh Tài', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '333790331' },
    { hoTen: 'Duẩn NT', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '379937608' },
    { hoTen: 'Quang Linh Nguyễn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '966245720' },
    { hoTen: 'Tran Quoc', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '937817479' },
    { hoTen: 'Duong Do', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '398354709' },
    { hoTen: 'Đại Nghĩa Trần', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '387238090' },
    { hoTen: 'Phan văn Cảnh', viTri: 'Kỹ sư Thiết kế cơ', phongBan: 'Thiết kế', soDienThoai: '908727461' },

    // Hình 12
    { hoTen: 'Phan văn Cảnh', viTri: 'Kỹ sư Thiết kế cơ', phongBan: 'Thiết kế', soDienThoai: '908727461' },
    { hoTen: 'Trung Dương Nguyên', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '981287657' },
    { hoTen: 'Lăng Kim', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '817939112' },
    { hoTen: 'Phạm Nguyễn Duy Ân', viTri: 'PLC', phongBan: 'Tự động', soDienThoai: '903070214' },
    { hoTen: 'Đỗ Văn Hoài', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '352274164' },
    { hoTen: 'Lương Quý Tuấn', viTri: 'KTV vận hành CNC', phongBan: 'CNC', soDienThoai: '396700011' },
    { hoTen: 'Huỳnh Anh', viTri: 'Kỹ sư điện - PLC', phongBan: 'Tự động', soDienThoai: '345664844' },
    { hoTen: 'Nguyễn Thị Kiều Nhung', viTri: 'TTS mua hàng', phongBan: null, soDienThoai: '777133268' },
    { hoTen: 'Nguyễn Thanh Minh', viTri: 'TTS mua hàng', phongBan: null, soDienThoai: '376060043' },
    { hoTen: 'Nguyễn Thị Thắm', viTri: 'Mua hàng', phongBan: null, soDienThoai: '388128574' },
];

// Loại bỏ trùng lặp dựa trên số điện thoại
const uniqueCandidates = [];
const seenPhones = new Set();

for (const candidate of candidates) {
    // Chuẩn hóa số điện thoại (loại bỏ khoảng trắng và dấu chấm)
    const normalizedPhone = candidate.soDienThoai.replace(/[\s.]/g, '');

    if (!seenPhones.has(normalizedPhone)) {
        seenPhones.add(normalizedPhone);
        candidate.soDienThoai = normalizedPhone; // Cập nhật số đã chuẩn hóa
        uniqueCandidates.push(candidate);
    }
}

async function importCandidates() {
    try {
        console.log(`Bắt đầu import ${uniqueCandidates.length} ứng viên...`);

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const candidate of uniqueCandidates) {
            try {
                // Kiểm tra xem ứng viên đã tồn tại chưa (theo số điện thoại)
                const checkResult = await pool.query(
                    'SELECT id FROM candidates WHERE so_dien_thoai = $1',
                    [candidate.soDienThoai]
                );

                if (checkResult.rows.length > 0) {
                    console.log(`✓ Đã tồn tại: ${candidate.hoTen} (${candidate.soDienThoai})`);
                    continue;
                }

                // Map vị trí và phòng ban
                const viTriUngTuyen = mapViTri(candidate.viTri);
                const phongBan = mapPhongBan(candidate.phongBan);

                // Insert ứng viên
                const insertQuery = `
                    INSERT INTO candidates (
                        ho_ten,
                        vi_tri_ung_tuyen,
                        phong_ban,
                        so_dien_thoai,
                        status,
                        created_at,
                        updated_at
                    ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING id
                `;

                const result = await pool.query(insertQuery, [
                    candidate.hoTen.trim(),
                    viTriUngTuyen,
                    phongBan,
                    candidate.soDienThoai,
                    'PENDING_INTERVIEW'
                ]);

                console.log(`✓ Đã thêm: ${candidate.hoTen} (ID: ${result.rows[0].id})`);
                successCount++;

            } catch (error) {
                console.error(`✗ Lỗi khi thêm ${candidate.hoTen}:`, error.message);
                errors.push({ candidate: candidate.hoTen, error: error.message });
                errorCount++;
            }
        }

        console.log('\n=== KẾT QUẢ IMPORT ===');
        console.log(`Tổng số ứng viên: ${uniqueCandidates.length}`);
        console.log(`Thành công: ${successCount}`);
        console.log(`Lỗi: ${errorCount}`);
        console.log(`Đã tồn tại: ${uniqueCandidates.length - successCount - errorCount}`);

        if (errors.length > 0) {
            console.log('\n=== CÁC LỖI ===');
            errors.forEach(({ candidate, error }) => {
                console.log(`- ${candidate}: ${error}`);
            });
        }

    } catch (error) {
        console.error('Lỗi khi import:', error);
    } finally {
        await pool.end();
    }
}

// Chạy import
importCandidates();

