require('dotenv').config();
const pool = require('../config/database');

async function addTransferredStatus() {
    try {
        console.log('Đang cập nhật constraint trang_thai cho bảng candidates...');

        // Kiểm tra constraint hiện tại
        const checkConstraint = await pool.query(`
            SELECT constraint_name, check_clause
            FROM information_schema.check_constraints
            WHERE constraint_name = 'candidates_trang_thai_check';
        `);

        console.log('Constraint hiện tại:', checkConstraint.rows);

        // Drop constraint cũ
        await pool.query(`
            ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_trang_thai_check;
        `);
        console.log('✓ Đã xóa constraint cũ');

        // Thêm constraint mới với trạng thái TRANSFERRED_TO_INTERVIEW và READY_FOR_INTERVIEW
        await pool.query(`
            ALTER TABLE candidates 
            ADD CONSTRAINT candidates_trang_thai_check 
            CHECK (trang_thai IN ('NEW', 'PENDING_INTERVIEW', 'PENDING_MANAGER', 'TRANSFERRED_TO_INTERVIEW', 'WAITING_FOR_OTHER_APPROVAL', 'READY_FOR_INTERVIEW', 'PASSED', 'FAILED'));
        `);
        console.log('✓ Đã thêm constraint mới với trạng thái TRANSFERRED_TO_INTERVIEW');

        // Kiểm tra lại
        const verifyConstraint = await pool.query(`
            SELECT constraint_name, check_clause
            FROM information_schema.check_constraints
            WHERE constraint_name = 'candidates_trang_thai_check';
        `);

        console.log('\nConstraint mới:', verifyConstraint.rows);
        console.log('\n✓ Hoàn thành cập nhật constraint!');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Lỗi:', error);
        await pool.end();
        process.exit(1);
    }
}

addTransferredStatus();

