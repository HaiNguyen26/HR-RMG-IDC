require('dotenv').config();
const pool = require('../config/database');

async function addOnProbationStatus() {
    try {
        console.log('Đang thêm trạng thái ON_PROBATION vào bảng candidates...');
        
        // Drop existing constraint
        await pool.query(`
            ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_trang_thai_check;
        `);
        console.log('✓ Đã xóa constraint cũ');
        
        // Add new constraint with ON_PROBATION
        await pool.query(`
            ALTER TABLE candidates 
            ADD CONSTRAINT candidates_trang_thai_check 
            CHECK (trang_thai IN (
                'NEW',
                'PENDING_INTERVIEW',
                'PENDING_MANAGER',
                'PASSED',
                'FAILED',
                'ON_PROBATION'
            ));
        `);
        console.log('✓ Đã thêm constraint mới với ON_PROBATION');
        
        console.log('\n✓ Hoàn thành! Trạng thái ON_PROBATION đã được thêm vào constraint.');
        
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Lỗi:', error);
        await pool.end();
        process.exit(1);
    }
}

addOnProbationStatus();


