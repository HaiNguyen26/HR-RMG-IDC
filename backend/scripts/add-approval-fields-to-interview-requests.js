require('dotenv').config();
const pool = require('../config/database');

async function addApprovalFields() {
    try {
        console.log('Đang thêm các cột approval vào bảng interview_requests...');

        // Thêm các cột nếu chưa có
        const columns = [
            { name: 'manager_approved', type: 'BOOLEAN DEFAULT FALSE' },
            { name: 'branch_director_approved', type: 'BOOLEAN DEFAULT FALSE' },
            { name: 'manager_approved_at', type: 'TIMESTAMP' },
            { name: 'branch_director_approved_at', type: 'TIMESTAMP' }
        ];

        for (const col of columns) {
            try {
                await pool.query(`
                    ALTER TABLE interview_requests 
                    ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};
                `);
                console.log(`✓ Đã thêm cột ${col.name}`);
            } catch (error) {
                console.log(`  Cột ${col.name} đã tồn tại hoặc có lỗi:`, error.message);
            }
        }

        console.log('\n✓ Hoàn thành!');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Lỗi:', error);
        await pool.end();
        process.exit(1);
    }
}

addApprovalFields();

