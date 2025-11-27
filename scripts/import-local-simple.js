// Script import ứng viên đơn giản cho Local
// Chạy: node scripts/import-local-simple.js

// Sử dụng pool từ backend config
const pool = require('../backend/config/database');

// Đảm bảo password là string
if (pool.options && pool.options.password === undefined) {
    pool.options.password = '';
}


// Mapping vị trí và phòng ban
const mapViTri = (viTri) => {
    if (!viTri) return null;
    const v = viTri.toLowerCase();
    if (v.includes('kỹ sư thiết kế cơ') || v.includes('khảo sát thiết kế')) return 'KHAOSAT_THIETKE';
    if (v.includes('plc') || v.includes('điện lập trình')) return 'DIEN_LAPTRINH_PLC';
    if (v.includes('cnc') || v.includes('vận hành cnc')) return 'VANHANH_MAY_CNC';
    if (v.includes('mua hàng') || v.includes('tts mua hàng')) return 'MUAHANG';
    return null;
};

const mapPhongBan = (phongBan) => {
    if (!phongBan) return null;
    const p = phongBan.toLowerCase();
    if (p.includes('thiết kế')) return 'KHAOSAT_THIETKE';
    if (p.includes('kỹ thuật')) return 'DICHVU_KYTHUAT';
    if (p.includes('tự động')) return 'TUDONG';
    if (p === 'cnc') return 'CNC';
    return null;
};

// Danh sách ứng viên (109 người, đã loại trùng)
const candidates = [
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
    { hoTen: 'Trần Anh Sơn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '366686642' },
    { hoTen: 'Bùi Trọng Hiếu', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '364248347' },
    { hoTen: 'Lâm Minh Thuyết', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '0913300177' },
    { hoTen: 'Trần Minh Quân', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '911423908' },
    { hoTen: 'Nguyễn Kim Thành', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '363832114' },
    { hoTen: 'NGUYỄN THÀNH THUẬT', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '389268589' },
    { hoTen: 'VÕ HUỲNH TIÊU KHÔI', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '865350738' },
    { hoTen: 'Lê Thanh Lâm', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '973675847' },
    { hoTen: 'Nguyễn Quốc Dũng', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '869888776' },
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
    { hoTen: 'Võ Lê Kiên', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '869046459' },
    { hoTen: 'Nguyễn Hoàng Chính Trực', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '795884923' },
    { hoTen: 'Phạm Thanh Tú', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '368478343' },
    { hoTen: 'Đinh Trung Hậu', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '399366315' },
    { hoTen: 'Trần Công Luyện', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '813100402' },
    { hoTen: 'Phạm Đình Đồng', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '522204006' },
    { hoTen: 'Nguyễn Ngọc Thức', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '867476558' },
    { hoTen: 'Hoàng Lê Lợi', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '969364832' },
    { hoTen: 'HẢI HOÀNG ĐÌNH', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '944282658' },
    { hoTen: 'Nguyễn Đức Tú', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '395690515' },
    { hoTen: 'Võ Thanh Quý', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '817712410' },
    { hoTen: 'Thảo Ngô Tấn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '392294126' },
    { hoTen: 'dang Hoang Quoc', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '387235728' },
    { hoTen: 'Võ Duy Hà', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '339432177' },
    { hoTen: 'Nguyen Xuan Hoang', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '382046500' },
    { hoTen: 'Nguyễn Quảng Hân', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '345743046' },
    { hoTen: 'PHẠm anh dũng', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '0967026652' },
    { hoTen: 'hua van khuyet', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '339568200' },
    { hoTen: 'Huỳnh Lê Nguyên', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '946784954' },
    { hoTen: 'Lê Minh Trọng', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '898238479' },
    { hoTen: 'MAI ĐỨC KHÁNH', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '867126361' },
    { hoTen: 'Phạm Trường An', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '356225015' },
    { hoTen: 'TRẦN DUY KHANH', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '768441646' },
    { hoTen: 'NGUYỄN VĂN MINH', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '393341257' },
    { hoTen: 'Phí Hoàng Thắng', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '337422703' },
    { hoTen: 'hoang dinh nguyen', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '358872990' },
    { hoTen: 'Huỳnh Hữu Tuấn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '569151234' },
    { hoTen: 'NGUYỄN BẢO THANH', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '336312059' },
    { hoTen: 'ĐẶNG MINH HIẾU', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '971610398' },
    { hoTen: 'Nguyễn Đình Vũ', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '902478934' },
    { hoTen: 'Phan Nguyễn Minh Triết', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '347416187' },
    { hoTen: 'Trần Văn Nam', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '866693603' },
    { hoTen: 'Đỗ Trọng Toàn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '385682742' },
    { hoTen: 'Pham Luong Hoan', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '767781996' },
    { hoTen: 'Đào Ngọc Tuấn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '787018809' },
    { hoTen: 'Vũ Ngọc Chuyên', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '962158032' },
    { hoTen: 'Nguyễn Hợp Trần', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '359089652' },
    { hoTen: 'Bùi Quốc Hưng', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '353233081' },
    { hoTen: 'TRẦN TRỌNG PHÚ', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '398678432' },
    { hoTen: 'Nguyễn Văn Hân', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '937211088' },
    { hoTen: 'Nguyễn Quốc Bảo', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '824153878' },
    { hoTen: 'Trần Phát', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '878894324' },
    { hoTen: 'Nguyen bao nhat', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '931311792' },
    { hoTen: 'Lê Thế Hợp', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '375072656' },
    { hoTen: 'Văn Thành', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '901949765' },
    { hoTen: 'Huỳnh Lê Bảo Trọng', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '982549207' },
    { hoTen: 'le van thuan', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '943048167' },
    { hoTen: 'Sơn Trần Bửu', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '394595394' },
    { hoTen: 'Hiển Thanh', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '332226880' },
    { hoTen: 'DƯƠNG TRƯƠNG QUỐC', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '949723991' },
    { hoTen: 'Nguyễn Thành Thuật', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '389268589' },
    { hoTen: 'Duy Nguyen', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '329227207' },
    { hoTen: 'Chì Dương', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '385229584' },
    { hoTen: 'Nguyễn Hoàng Khương', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '976279332' },
    { hoTen: 'toan phan', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '969286570' },
    { hoTen: 'Trần Lê Khôi Nguyên', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '344201781' },
    { hoTen: 'Trương Thị Xuân Hiệp', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '938657552' },
    { hoTen: 'Phương Thảo Nguyễn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '963894061' },
    { hoTen: 'Thanh Thắng Nguyễn', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '344553295' },
    { hoTen: 'Thaihoc Nguyen', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '769404190' },
    { hoTen: 'Tai Nguyen Tien', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '901452707' },
    { hoTen: 'Khoa Ho Ngoc Dang', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '703164156' },
    { hoTen: 'Trịnh Hoàng Quốc Việt', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '373024726' },
    { hoTen: 'Tuan Le', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '866184160' },
    { hoTen: 'Đức Sầm', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '326032536' },
    { hoTen: 'Nguyễn Quế Anh Tài', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '333790331' },
    { hoTen: 'Duẩn NT', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '379937608' },
    { hoTen: 'Tran Quoc', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '937817479' },
    { hoTen: 'Duong Do', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '398354709' },
    { hoTen: 'Đại Nghĩa Trần', viTri: 'Kỹ sư Thiết kế cơ', phongBan: null, soDienThoai: '387238090' },
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

async function importCandidates() {
    try {
        console.log('🔌 Đang kết nối database...');
        await pool.query('SELECT 1'); // Test connection
        console.log('✅ Kết nối thành công!\n');
        
        console.log(`📋 Bắt đầu import ${candidates.length} ứng viên...\n`);
        
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];
            const progress = `[${i + 1}/${candidates.length}]`;
            
            try {
                // Chuẩn hóa số điện thoại
                const phone = candidate.soDienThoai.replace(/[\s.]/g, '');
                
                // Kiểm tra trùng lặp
                const checkResult = await pool.query(
                    'SELECT id FROM candidates WHERE so_dien_thoai = $1',
                    [phone]
                );
                
                if (checkResult.rows.length > 0) {
                    skipCount++;
                    continue;
                }
                
                // Map vị trí và phòng ban
                const viTriUngTuyen = mapViTri(candidate.viTri);
                const phongBan = mapPhongBan(candidate.phongBan);
                
                // Insert
                await pool.query(
                    `INSERT INTO candidates (
                        ho_ten, vi_tri_ung_tuyen, phong_ban, so_dien_thoai, 
                        status, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [
                        candidate.hoTen.trim(),
                        viTriUngTuyen,
                        phongBan,
                        phone,
                        'PENDING_INTERVIEW'
                    ]
                );
                
                successCount++;
                if (successCount % 10 === 0) {
                    console.log(`  ${progress} Đã import: ${successCount} ứng viên...`);
                }
                
            } catch (error) {
                errorCount++;
                console.error(`  ${progress} ✗ ${candidate.hoTen}: ${error.message}`);
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 KẾT QUẢ IMPORT');
        console.log('='.repeat(50));
        console.log(`Tổng số:      ${candidates.length}`);
        console.log(`✓ Thành công: ${successCount}`);
        console.log(`⊘ Đã tồn tại: ${skipCount}`);
        console.log(`✗ Lỗi:        ${errorCount}`);
        
        // Kiểm tra tổng số
        const totalResult = await pool.query('SELECT COUNT(*) as total FROM candidates');
        console.log(`\nTổng số ứng viên trong database: ${totalResult.rows[0].total}`);
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('\n❌ Lỗi:', error.message);
        if (error.message.includes('password')) {
            console.log('\n💡 Tip: Kiểm tra file backend/.env có đúng thông tin database không?');
        }
    } finally {
        await pool.end();
        process.exit(0);
    }
}

importCandidates();

