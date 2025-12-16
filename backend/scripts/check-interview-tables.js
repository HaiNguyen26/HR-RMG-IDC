const pool = require('../config/database');

async function checkInterviewTables() {
    try {
        console.log('=== KIỂM TRA CÁC BẢNG LIÊN QUAN ĐẾN INTERVIEW/RECRUITMENT ===\n');

        // 1. Kiểm tra các bảng có tên chứa "interview" hoặc "recruitment"
        const tablesResult = await pool.query(
            `SELECT table_name 
             FROM information_schema.tables 
             WHERE table_schema = 'public' 
               AND (table_name LIKE '%interview%' OR table_name LIKE '%recruitment%')
             ORDER BY table_name`
        );
        
        console.log('1. CÁC BẢNG LIÊN QUAN:');
        if (tablesResult.rows.length > 0) {
            tablesResult.rows.forEach(row => {
                console.log(`  ✓ ${row.table_name}`);
            });
        } else {
            console.log('  ⚠️  Không tìm thấy bảng nào');
        }

        // 2. Kiểm tra cấu trúc bảng interview_requests nếu tồn tại
        if (tablesResult.rows.some(r => r.table_name === 'interview_requests')) {
            console.log('\n2. CẤU TRÚC BẢNG interview_requests:');
            const columnsResult = await pool.query(
                `SELECT column_name, data_type, is_nullable, column_default
                 FROM information_schema.columns 
                 WHERE table_name = 'interview_requests' 
                 ORDER BY ordinal_position`
            );
            columnsResult.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'N/A'})`);
            });
        } else {
            console.log('\n2. ⚠️  Bảng interview_requests không tồn tại');
        }

        // 3. Kiểm tra cấu trúc bảng recruitment_requests nếu tồn tại
        if (tablesResult.rows.some(r => r.table_name === 'recruitment_requests')) {
            console.log('\n3. CẤU TRÚC BẢNG recruitment_requests:');
            const columnsResult = await pool.query(
                `SELECT column_name, data_type, is_nullable, column_default
                 FROM information_schema.columns 
                 WHERE table_name = 'recruitment_requests' 
                 ORDER BY ordinal_position`
            );
            columnsResult.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'N/A'})`);
            });
        } else {
            console.log('\n3. ⚠️  Bảng recruitment_requests không tồn tại');
        }

        // 4. Kiểm tra các bảng candidates có các trường liên quan đến interview không
        console.log('\n4. KIỂM TRA BẢNG candidates:');
        const candidatesColumns = await pool.query(
            `SELECT column_name, data_type 
             FROM information_schema.columns 
             WHERE table_name = 'candidates' 
               AND (column_name LIKE '%interview%' OR column_name LIKE '%manager%' OR column_name LIKE '%request%')
             ORDER BY ordinal_position`
        );
        if (candidatesColumns.rows.length > 0) {
            candidatesColumns.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type}`);
            });
        } else {
            console.log('  ⚠️  Không tìm thấy cột liên quan đến interview/manager/request trong bảng candidates');
        }

    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

checkInterviewTables();

