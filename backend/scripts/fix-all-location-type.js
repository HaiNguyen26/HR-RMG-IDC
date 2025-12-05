/**
 * Script sửa tất cả location_type sai trong travel_expense_requests
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
    'nha trang',
    'huế', 'hue',
    'vũng tàu', 'vung tau', 'vungtau',
    'quy nhon', 'quy nhơn',
    'phan thiết', 'phan thiet',
    'đà lạt', 'da lat', 'dalat',
    'quảng ninh', 'quang ninh',
    'bình dương', 'binh duong',
    'long an',
    'an giang',
    'hải phòng', 'hai phong',
    'bắc giang', 'bắc kạn', 'bạc liêu', 'bắc ninh', 'bến tre', 'bình định',
    'bình phước', 'bình thuận', 'cà mau', 'cao bằng', 'đắk lắk', 'đắk nông',
    'điện biên', 'đồng nai', 'đồng tháp', 'gia lai', 'hà giang', 'hà nam',
    'hà tĩnh', 'hải dương', 'hậu giang', 'hòa bình', 'hưng yên', 'khánh hòa',
    'kiên giang', 'kon tum', 'lai châu', 'lạng sơn', 'lào cai', 'lâm đồng',
    'nam định', 'nghệ an', 'ninh bình', 'ninh thuận', 'phú thọ', 'phú yên',
    'quảng bình', 'quảng nam', 'quảng ngãi', 'quảng trị', 'sóc trăng', 'sơn la',
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

async function fixAllLocationType() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Đang kiểm tra và sửa tất cả location_type...\n');
        
        // 1. Lấy tất cả các bản ghi
        const allRecords = await client.query(`
            SELECT id, location, location_type, title
            FROM travel_expense_requests
            WHERE title LIKE '%[MOCK]%'
            ORDER BY id
        `);
        
        console.log(`📊 Tìm thấy ${allRecords.rows.length} bản ghi mock data\n`);
        
        if (allRecords.rows.length === 0) {
            console.log('✅ Không có mock data nào để kiểm tra!');
            return;
        }
        
        // 2. Kiểm tra và sửa từng bản ghi
        let needFix = [];
        for (const row of allRecords.rows) {
            const shouldBeDomestic = isVietnameseLocation(row.location);
            const currentType = row.location_type;
            
            if (shouldBeDomestic && currentType !== 'DOMESTIC') {
                needFix.push({ ...row, shouldBe: 'DOMESTIC' });
            } else if (!shouldBeDomestic && currentType !== 'INTERNATIONAL') {
                needFix.push({ ...row, shouldBe: 'INTERNATIONAL' });
            }
        }
        
        if (needFix.length === 0) {
            console.log('✅ Tất cả các bản ghi đều đúng!');
            
            // Hiển thị thống kê
            const stats = await client.query(`
                SELECT 
                    location_type,
                    COUNT(*) as count
                FROM travel_expense_requests
                WHERE title LIKE '%[MOCK]%'
                GROUP BY location_type
                ORDER BY location_type
            `);
            
            console.log('\n📊 Thống kê:');
            stats.rows.forEach(row => {
                console.log(`   ${row.location_type}: ${row.count} bản ghi`);
            });
            
            return;
        }
        
        console.log(`⚠️  Cần sửa ${needFix.length} bản ghi:\n`);
        needFix.forEach(row => {
            console.log(`   ID ${row.id}: "${row.location}" - ${row.location_type} → ${row.shouldBe}`);
        });
        
        console.log(`\n🔧 Đang sửa ${needFix.length} bản ghi...\n`);
        
        // 3. Sửa từng bản ghi
        await client.query('BEGIN');
        
        let fixedCount = 0;
        for (const row of needFix) {
            try {
                await client.query(
                    'UPDATE travel_expense_requests SET location_type = $1 WHERE id = $2',
                    [row.shouldBe, row.id]
                );
                fixedCount++;
                console.log(`✓ Đã sửa ID ${row.id}: "${row.location}" → ${row.shouldBe}`);
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
        
        // 5. Hiển thị một số ví dụ
        const examples = await client.query(`
            SELECT location, location_type
            FROM travel_expense_requests
            WHERE title LIKE '%[MOCK]%'
            ORDER BY location_type, location
            LIMIT 10
        `);
        
        console.log('\n📋 Ví dụ:');
        examples.rows.forEach(row => {
            console.log(`   "${row.location}" → ${row.location_type}`);
        });
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Hoàn thành!');
        console.log(`   Đã sửa ${fixedCount} bản ghi`);
        console.log('='.repeat(60));
        
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('\n❌ Lỗi:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Chạy script
fixAllLocationType()
    .then(() => {
        console.log('\n✨ Script đã hoàn thành!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Lỗi không mong đợi:', error);
        process.exit(1);
    });



