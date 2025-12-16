const pool = require('../config/database');

async function testChucDanhEncoding() {
    try {
        console.log('=== KIỂM TRA ENCODING CỦA CHUC_DANH ===\n');

        // 1. Tìm tất cả các chuc_danh có chứa "giám đốc" hoặc "giam doc"
        console.log('1. Tìm chuc_danh có chứa "giám đốc" (với các cách query khác nhau):');
        console.log('─'.repeat(80));

        // Query 1: ILIKE với dấu đầy đủ
        const query1 = await pool.query(
            `SELECT ho_ten, chuc_danh, 
                    LENGTH(chuc_danh) as do_dai,
                    encode(chuc_danh::bytea, 'hex') as hex_encoding
             FROM employees 
             WHERE chuc_danh ILIKE '%giám đốc%'
             ORDER BY ho_ten`
        );
        console.log(`Query 1 (ILIKE '%giám đốc%'): ${query1.rows.length} kết quả`);
        query1.rows.forEach(row => {
            console.log(`  - ${row.ho_ten}: "${row.chuc_danh}" (độ dài: ${row.do_dai}, hex: ${row.hex_encoding.substring(0, 50)}...)`);
        });

        // Query 2: ILIKE không dấu
        const query2 = await pool.query(
            `SELECT ho_ten, chuc_danh
             FROM employees 
             WHERE chuc_danh ILIKE '%giam doc%'
             ORDER BY ho_ten`
        );
        console.log(`\nQuery 2 (ILIKE '%giam doc%'): ${query2.rows.length} kết quả`);
        query2.rows.forEach(row => {
            console.log(`  - ${row.ho_ten}: "${row.chuc_danh}"`);
        });

        // Query 3: Tìm tất cả chuc_danh có chứa "đốc"
        const query3 = await pool.query(
            `SELECT ho_ten, chuc_danh
             FROM employees 
             WHERE chuc_danh ILIKE '%đốc%' OR chuc_danh ILIKE '%doc%'
             ORDER BY ho_ten`
        );
        console.log(`\nQuery 3 (ILIKE '%đốc%' OR '%doc%'): ${query3.rows.length} kết quả`);
        query3.rows.forEach(row => {
            console.log(`  - ${row.ho_ten}: "${row.chuc_danh}"`);
        });

        // Query 4: Tìm 3 giám đốc chi nhánh cụ thể
        console.log('\n2. Tìm 3 giám đốc chi nhánh cụ thể:');
        console.log('─'.repeat(80));
        const specificDirectors = ['Châu Quang Hải', 'Nguyễn Ngọc Luyễn', 'Nguyễn Văn Khải'];
        for (const name of specificDirectors) {
            const result = await pool.query(
                `SELECT ho_ten, chuc_danh, 
                        chuc_danh ILIKE '%giám đốc%' as match_voi_dau,
                        chuc_danh ILIKE '%giam doc%' as match_khong_dau,
                        chuc_danh ILIKE '%đốc%' as match_dooc,
                        chuc_danh ILIKE '%doc%' as match_doc
                 FROM employees 
                 WHERE ho_ten ILIKE $1`,
                [`%${name}%`]
            );
            if (result.rows.length > 0) {
                result.rows.forEach(row => {
                    console.log(`  ${row.ho_ten}:`);
                    console.log(`    - chuc_danh: "${row.chuc_danh}"`);
                    console.log(`    - Match với dấu (giám đốc): ${row.match_voi_dau}`);
                    console.log(`    - Match không dấu (giam doc): ${row.match_khong_dau}`);
                    console.log(`    - Match "đốc": ${row.match_dooc}`);
                    console.log(`    - Match "doc": ${row.match_doc}`);
                });
            }
        }

        // Query 5: So sánh encoding
        console.log('\n3. So sánh encoding của chuc_danh:');
        console.log('─'.repeat(80));
        const encodingTest = await pool.query(
            `SELECT ho_ten, chuc_danh,
                    chuc_danh = 'Giám đốc Chi nhánh' as exact_match_1,
                    chuc_danh = 'Giám đốc Chi nhánh' as exact_match_2,
                    chuc_danh ILIKE 'Giám đốc%' as ilike_match_1,
                    chuc_danh ILIKE 'Giám đốc%' as ilike_match_2,
                    unaccent(chuc_danh) ILIKE unaccent('Giám đốc%') as unaccent_match
             FROM employees 
             WHERE ho_ten IN ('Châu Quang Hải', 'Nguyễn Ngọc Luyễn', 'Nguyễn Văn Khải')
             ORDER BY ho_ten`
        );
        encodingTest.rows.forEach(row => {
            console.log(`  ${row.ho_ten}:`);
            console.log(`    - chuc_danh: "${row.chuc_danh}"`);
            console.log(`    - Exact match "Giám đốc": ${row.exact_match_1}`);
            console.log(`    - Exact match "Giám đốc": ${row.exact_match_2}`);
            console.log(`    - ILIKE "Giám đốc%": ${row.ilike_match_1}`);
            console.log(`    - ILIKE "Giám đốc%": ${row.ilike_match_2}`);
            console.log(`    - Unaccent match: ${row.unaccent_match}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
        if (error.message.includes('unaccent')) {
            console.error('\n⚠️  Extension "unaccent" chưa được cài đặt trong database.');
            console.error('   Có thể bỏ qua phần unaccent_match.');
        }
    } finally {
        await pool.end();
    }
}

testChucDanhEncoding();

