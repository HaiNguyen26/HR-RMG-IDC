const pool = require('../config/database');

async function checkJobTitlesDuplicates() {
    try {
        console.log('=== Kiểm tra duplicate chức danh ===\n');

        // Lấy tất cả chức danh từ database
        const query = `
            SELECT chuc_danh, COUNT(*) as count
            FROM employees
            WHERE chuc_danh IS NOT NULL AND TRIM(chuc_danh) != ''
            GROUP BY chuc_danh
            ORDER BY chuc_danh ASC
        `;

        const result = await pool.query(query);

        console.log(`Tổng số chức danh unique trong database: ${result.rows.length}\n`);

        // Kiểm tra các chức danh có thể bị duplicate sau khi normalize
        const normalizedMap = new Map();
        const duplicates = [];

        for (const row of result.rows) {
            const jobTitle = row.chuc_danh;

            // Normalize giống như trong API
            let normalized = String(jobTitle)
                .trim()
                .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (!normalized) continue;

            // Tạo key để so sánh
            const key = normalized
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '')
                .trim();

            if (normalizedMap.has(key)) {
                // Tìm thấy duplicate
                const existing = normalizedMap.get(key);
                duplicates.push({
                    key: key,
                    original1: existing,
                    original2: normalized,
                    raw1: existing,
                    raw2: jobTitle
                });
            } else {
                normalizedMap.set(key, normalized);
            }
        }

        // Hiển thị kết quả
        console.log('=== Các chức danh có thể bị duplicate sau khi normalize ===\n');

        if (duplicates.length === 0) {
            console.log('✓ Không tìm thấy duplicate sau khi normalize!\n');
        } else {
            console.log(`⚠ Tìm thấy ${duplicates.length} cặp có thể bị duplicate:\n`);
            duplicates.forEach((dup, index) => {
                console.log(`${index + 1}. Key: "${dup.key}"`);
                console.log(`   - Giá trị 1: "${dup.original1}"`);
                console.log(`   - Giá trị 2: "${dup.original2}"`);
                console.log(`   - Raw 1: "${dup.raw1}"`);
                console.log(`   - Raw 2: "${dup.raw2}"`);

                // Kiểm tra chi tiết các ký tự
                const chars1 = Array.from(dup.original1).map(c => {
                    return `'${c}' (U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`;
                });
                const chars2 = Array.from(dup.original2).map(c => {
                    return `'${c}' (U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`;
                });
                console.log(`   - Ký tự 1: [${chars1.join(', ')}]`);
                console.log(`   - Ký tự 2: [${chars2.join(', ')}]`);
                console.log('');
            });
        }

        // Kiểm tra các chức danh cụ thể mà người dùng báo
        console.log('\n=== Kiểm tra các chức danh cụ thể ===\n');
        const specificTitles = ['Giám đốc Chi nhánh', 'Kỹ sư Bán hàng'];

        for (const title of specificTitles) {
            const querySpecific = `
                SELECT chuc_danh, COUNT(*) as count
                FROM employees
                WHERE chuc_danh LIKE $1
                GROUP BY chuc_danh
                ORDER BY chuc_danh ASC
            `;

            const resultSpecific = await pool.query(querySpecific, [`%${title}%`]);

            if (resultSpecific.rows.length > 0) {
                console.log(`"${title}":`);
                resultSpecific.rows.forEach(row => {
                    console.log(`  - "${row.chuc_danh}" (${row.count} lần)`);
                    // Hiển thị mã hex của từng ký tự
                    const hexCodes = Array.from(row.chuc_danh).map(c =>
                        c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')
                    );
                    console.log(`    Hex: [${hexCodes.join(', ')}]`);
                });
                console.log('');
            }
        }

        // Kiểm tra tất cả các chức danh có chứa "Giám đốc" hoặc "Kỹ sư"
        console.log('\n=== Tất cả chức danh có chứa "Giám đốc" hoặc "Kỹ sư" ===\n');
        const queryAll = `
            SELECT DISTINCT chuc_danh
            FROM employees
            WHERE (chuc_danh LIKE '%Giám đốc%' OR chuc_danh LIKE '%Kỹ sư%')
            AND chuc_danh IS NOT NULL AND TRIM(chuc_danh) != ''
            ORDER BY chuc_danh ASC
        `;

        const resultAll = await pool.query(queryAll);
        resultAll.rows.forEach((row, index) => {
            console.log(`${index + 1}. "${row.chuc_danh}"`);
        });

        await pool.end();
        console.log('\n=== Hoàn thành kiểm tra ===');
    } catch (error) {
        console.error('Lỗi:', error);
        await pool.end();
        process.exit(1);
    }
}

checkJobTitlesDuplicates();


