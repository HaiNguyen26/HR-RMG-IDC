// Script import với nhập thông tin database thủ công
// Chạy: node scripts/import-local-manual.js

const readline = require('readline');
const { Pool } = require('pg');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

// Danh sách ứng viên
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
    // ... (giữ nguyên danh sách 109 người như file import-local-simple.js)
    // Tôi sẽ chỉ giữ một vài ví dụ để script ngắn gọn, bạn có thể copy từ file kia
];

// Mapping functions
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

async function importWithManualConfig() {
    try {
        console.log('📝 Nhập thông tin kết nối database:\n');

        const host = await askQuestion('Host (mặc định: localhost): ') || 'localhost';
        const port = await askQuestion('Port (mặc định: 5432): ') || '5432';
        const database = await askQuestion('Database (mặc định: HR_Management_System): ') || 'HR_Management_System';
        const user = await askQuestion('User (mặc định: postgres): ') || 'postgres';
        const password = await askQuestion('Password: ');

        console.log('\n🔌 Đang kết nối...');

        const pool = new Pool({
            host,
            port: parseInt(port),
            database,
            user,
            password: password || '',
            max: 5,
        });

        await pool.query('SELECT 1');
        console.log('✅ Kết nối thành công!\n');

        console.log(`📋 Import ${candidates.length} ứng viên...\n`);

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (let i = 0; i < candidates.length; i++) {
            const c = candidates[i];
            const phone = c.soDienThoai.replace(/[\s.]/g, '');

            try {
                const check = await pool.query('SELECT id FROM candidates WHERE so_dien_thoai = $1', [phone]);
                if (check.rows.length > 0) {
                    skipCount++;
                    continue;
                }

                await pool.query(
                    `INSERT INTO candidates (ho_ten, vi_tri_ung_tuyen, phong_ban, so_dien_thoai, status, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [c.hoTen.trim(), mapViTri(c.viTri), mapPhongBan(c.phongBan), phone, 'PENDING_INTERVIEW']
                );

                successCount++;
                if (successCount % 10 === 0) {
                    console.log(`  [${i + 1}/${candidates.length}] Đã import: ${successCount}...`);
                }
            } catch (error) {
                errorCount++;
                console.error(`  ✗ ${c.hoTen}: ${error.message}`);
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📊 KẾT QUẢ:');
        console.log(`✓ Thành công: ${successCount}`);
        console.log(`⊘ Đã tồn tại: ${skipCount}`);
        console.log(`✗ Lỗi: ${errorCount}`);
        console.log('='.repeat(50));

        await pool.end();

    } catch (error) {
        console.error('\n❌ Lỗi:', error.message);
    } finally {
        rl.close();
    }
}

importWithManualConfig();

