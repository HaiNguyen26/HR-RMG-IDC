require('dotenv').config();
const pool = require('../config/database');

async function updateCandidatesStatus() {
    try {
        console.log('Đang cập nhật trạng thái candidates...');
        
        // Drop constraint cũ
        await pool.query(`
            ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_trang_thai_check;
        `);
        
        // Thêm constraint mới với trạng thái NEW
        await pool.query(`
            ALTER TABLE candidates 
            ADD CONSTRAINT candidates_trang_thai_check 
            CHECK (trang_thai IN ('NEW', 'PENDING_INTERVIEW', 'PENDING_MANAGER', 'PASSED', 'FAILED'));
        `);
        
        // Set default value
        await pool.query(`
            ALTER TABLE candidates ALTER COLUMN trang_thai SET DEFAULT 'NEW';
        `);
        
        console.log('✓ Đã cập nhật trạng thái candidates thành công!');
        
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Lỗi:', error);
        await pool.end();
        process.exit(1);
    }
}

updateCandidatesStatus();


