/**
 * Script xóa toàn bộ dữ liệu: Ứng viên, Đơn nghỉ, Ứng viên thử việc
 * CHỈ GIỮ LẠI: Danh sách nhân viên (employees)
 * 
 * CẢNH BÁO: Script này sẽ XÓA VĨNH VIỄN tất cả dữ liệu từ các bảng:
 *   - candidates (ứng viên)
 *   - leave_requests (đơn nghỉ phép)
 *   - overtime_requests (đơn tăng ca)
 *   - attendance_adjustments (bổ sung chấm công)
 *   - travel_expense_requests (đơn công tác)
 *   - interview_requests (phỏng vấn)
 *   - recruitment_requests (tuyển dụng)
 *   - notifications (thông báo)
 *   - request_items (chi tiết đơn)
 * 
 * GIỮ LẠI:
 *   - employees (nhân viên) ✓
 *   - users (người dùng hệ thống) ✓
 *   - equipment_assignments (phân công vật dụng) ✓
 */

const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'HR_Management_System',
    user: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD || ''),
});

const TABLES_TO_CLEAN = [
    'notifications',
    'request_items',
    'leave_requests',
    'overtime_requests',
    'attendance_adjustments',
    'travel_expense_requests',
    'interview_requests',
    'recruitment_requests',
    'candidates',
];

const TABLES_TO_KEEP = [
    'employees',
    'users',
    'equipment_assignments',
];

async function cleanDatabase() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log('========================================');
        console.log('Bắt đầu xóa dữ liệu...');
        console.log('========================================\n');
        
        // Đếm số lượng records trước khi xóa
        console.log('Đếm số lượng records trước khi xóa:');
        for (const table of TABLES_TO_CLEAN) {
            try {
                const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = parseInt(result.rows[0].count);
                console.log(`  - ${table}: ${count} records`);
            } catch (err) {
                console.log(`  - ${table}: Bảng không tồn tại hoặc lỗi`);
            }
        }
        
        console.log('\nĐếm số lượng nhân viên (GIỮ LẠI):');
        try {
            const result = await client.query('SELECT COUNT(*) as count FROM employees');
            const employeeCount = parseInt(result.rows[0].count);
            console.log(`  - employees: ${employeeCount} records ✓`);
        } catch (err) {
            console.log(`  - employees: Lỗi - ${err.message}`);
        }
        
        console.log('\n========================================');
        console.log('Xóa dữ liệu từ các bảng...');
        console.log('========================================\n');
        
        // Xóa dữ liệu từ các bảng
        for (const table of TABLES_TO_CLEAN) {
            try {
                const result = await client.query(`DELETE FROM ${table}`);
                console.log(`✓ Đã xóa ${result.rowCount} records từ ${table}`);
            } catch (err) {
                if (err.message.includes('does not exist')) {
                    console.log(`⚠ Bảng ${table} không tồn tại, bỏ qua`);
                } else {
                    console.log(`✗ Lỗi khi xóa ${table}: ${err.message}`);
                }
            }
        }
        
        // Reset sequences
        console.log('\n========================================');
        console.log('Reset sequences...');
        console.log('========================================\n');
        
        const sequences = [
            'notifications_id_seq',
            'request_items_id_seq',
            'leave_requests_id_seq',
            'overtime_requests_id_seq',
            'attendance_adjustments_id_seq',
            'travel_expense_requests_id_seq',
            'interview_requests_id_seq',
            'recruitment_requests_id_seq',
            'candidates_id_seq',
        ];
        
        for (const seq of sequences) {
            try {
                await client.query(`ALTER SEQUENCE IF EXISTS ${seq} RESTART WITH 1`);
                console.log(`✓ Reset ${seq}`);
            } catch (err) {
                console.log(`⚠ Sequence ${seq} không tồn tại hoặc lỗi`);
            }
        }
        
        await client.query('COMMIT');
        
        // Kiểm tra kết quả
        console.log('\n========================================');
        console.log('Kiểm tra kết quả sau khi xóa:');
        console.log('========================================\n');
        
        for (const table of TABLES_TO_CLEAN) {
            try {
                const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = parseInt(result.rows[0].count);
                if (count === 0) {
                    console.log(`✓ ${table}: 0 records (đã xóa sạch)`);
                } else {
                    console.log(`⚠ ${table}: ${count} records (còn sót lại)`);
                }
            } catch (err) {
                console.log(`⚠ ${table}: Không thể kiểm tra`);
            }
        }
        
        console.log('\nKiểm tra bảng giữ lại:');
        for (const table of TABLES_TO_KEEP) {
            try {
                const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = parseInt(result.rows[0].count);
                console.log(`✓ ${table}: ${count} records (GIỮ LẠI)`);
            } catch (err) {
                console.log(`⚠ ${table}: Lỗi - ${err.message}`);
            }
        }
        
        console.log('\n========================================');
        console.log('Hoàn thành!');
        console.log('========================================');
        console.log('Đã xóa toàn bộ dữ liệu từ các bảng:');
        TABLES_TO_CLEAN.forEach(table => console.log(`  - ${table}`));
        console.log('\nĐã giữ lại:');
        TABLES_TO_KEEP.forEach(table => console.log(`  ✓ ${table}`));
        console.log('========================================\n');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n✗ Lỗi:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Chạy script
cleanDatabase().catch(console.error);

