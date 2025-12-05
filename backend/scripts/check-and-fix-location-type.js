/**
 * Script kiểm tra và sửa location_type sai trong travel_expense_requests
 * Chạy từ thư mục backend
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'HR_Management_System',
    user: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD || ''),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Danh sách các tỉnh/thành phố Việt Nam (normalized)
const VIETNAMESE_LOCATIONS = [
    'hà nội', 'ha noi', 'hanoi',
    'ho chi minh', 'hồ chí minh', 'tp.hcm', 'tp hcm', 'hcm', 'hochiminh',
    'hải phòng', 'hai phong', 'haiphong',
    'đà nẵng', 'da nang', 'danang',
    'cần thơ', 'can tho', 'cantho',
    'an giang', 'bà rịa', 'vũng tàu', 'bắc giang', 'bắc kạn', 'bạc liêu',
    'bắc ninh', 'bến tre', 'bình định', 'bình dương', 'bình phước', 'bình thuận',
    'cà mau', 'cao bằng', 'đắk lắk', 'đắk nông', 'điện biên', 'đồng nai',
    'đồng tháp', 'gia lai', 'hà giang', 'hà nam', 'hà tĩnh', 'hải dương',
    'hậu giang', 'hòa bình', 'hưng yên', 'khánh hòa', 'kiên giang', 'kon tum',
    'lai châu', 'lạng sơn', 'lào cai', 'lâm đồng', 'long an', 'nam định',
    'nghệ an', 'ninh bình', 'ninh thuận', 'phú thọ', 'phú yên', 'quảng bình',
    'quảng nam', 'quảng ngãi', 'quảng ninh', 'quảng trị', 'sóc trăng', 'sơn la',
    'tây ninh', 'thái bình', 'thái nguyên', 'thanh hóa', 'thừa thiên', 'huế',
    'tiền giang', 'trà vinh', 'tuyên quang', 'vĩnh long', 'vĩnh phúc', 'yên bái'
];

function normalizeText(text) {
    if (!text) return '';
    return text
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

function isVietnameseLocation(location) {
    const normalized = normalizeText(location);
    if (!normalized) return false;

    // Kiểm tra từng tỉnh/thành phố
    for (const vietLocation of VIETNAMESE_LOCATIONS) {
        const normalizedViet = normalizeText(vietLocation);
        if (normalized.includes(normalizedViet) || normalizedViet.includes(normalized)) {
            return true;
        }
    }

    return false;
}

async function checkAndFix() {
    const client = await pool.connect();

    try {
        console.log('🔍 Đang kiểm tra dữ liệu...\n');

        // 1. Lấy tất cả các bản ghi có location_type = INTERNATIONAL
        const checkResult = await client.query(`
            SELECT id, location, location_type, title
            FROM travel_expense_requests
            WHERE location_type = 'INTERNATIONAL'
            ORDER BY id
        `);

        console.log(`📊 Tìm thấy ${checkResult.rows.length} bản ghi có location_type = 'INTERNATIONAL'\n`);

        if (checkResult.rows.length === 0) {
            console.log('✅ Không có bản ghi nào cần sửa!');
            return;
        }

        // 2. Kiểm tra từng bản ghi
        let needFix = [];
        for (const row of checkResult.rows) {
            if (isVietnameseLocation(row.location)) {
                needFix.push(row);
                console.log(`⚠️  ID ${row.id}: "${row.location}" nên là DOMESTIC nhưng đang là INTERNATIONAL`);
            }
        }

        if (needFix.length === 0) {
            console.log('\n✅ Tất cả các bản ghi đều đúng!');
            return;
        }

        console.log(`\n🔧 Cần sửa ${needFix.length} bản ghi...\n`);

        // 3. Sửa từng bản ghi
        await client.query('BEGIN');

        let fixedCount = 0;
        for (const row of needFix) {
            try {
                await client.query(
                    'UPDATE travel_expense_requests SET location_type = $1 WHERE id = $2',
                    ['DOMESTIC', row.id]
                );
                fixedCount++;
                console.log(`✓ Đã sửa ID ${row.id}: "${row.location}" → DOMESTIC`);
            } catch (error) {
                console.error(`✗ Lỗi khi sửa ID ${row.id}:`, error.message);
            }
        }

        await client.query('COMMIT');

        // 4. Kiểm tra lại
        console.log('\n📊 Kiểm tra lại sau khi sửa...\n');
        const verifyResult = await client.query(`
            SELECT 
                location_type,
                COUNT(*) as count
            FROM travel_expense_requests
            WHERE title LIKE '%[MOCK]%'
            GROUP BY location_type
            ORDER BY location_type
        `);

        console.log('Thống kê theo location_type:');
        verifyResult.rows.forEach(row => {
            console.log(`   ${row.location_type}: ${row.count} bản ghi`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('✅ Hoàn thành!');
        console.log(`   Đã sửa ${fixedCount} bản ghi`);
        console.log('='.repeat(60));

    } catch (error) {
        await client.query('ROLLBACK').catch(() => { });
        console.error('\n❌ Lỗi:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Chạy script
checkAndFix()
    .then(() => {
        console.log('\n✨ Script đã hoàn thành!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Lỗi không mong đợi:', error);
        process.exit(1);
    });

