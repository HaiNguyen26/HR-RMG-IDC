require('dotenv').config();
const pool = require('../config/database');

async function addProbationStartDate() {
    try {
        console.log('Đang thêm cột probation_start_date vào bảng candidates...');
        
        // Kiểm tra và thêm cột probation_start_date
        const checkProbationStartDate = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'candidates' AND column_name = 'probation_start_date'
        `);
        
        if (checkProbationStartDate.rows.length === 0) {
            await pool.query(`
                ALTER TABLE candidates ADD COLUMN probation_start_date DATE;
            `);
            await pool.query(`
                COMMENT ON COLUMN candidates.probation_start_date IS 'Ngày bắt đầu thử việc của ứng viên';
            `);
            console.log('✓ Đã thêm cột probation_start_date');
        } else {
            console.log('✓ Cột probation_start_date đã tồn tại');
        }
        
        // Tạo index cho probation_start_date để tối ưu query
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_candidates_probation_start_date ON candidates(probation_start_date DESC);
        `);
        console.log('✓ Đã tạo index cho probation_start_date');
        
        console.log('\n✓ Hoàn thành! Cột probation_start_date đã sẵn sàng sử dụng.');
        
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Lỗi:', error);
        await pool.end();
        process.exit(1);
    }
}

addProbationStartDate();


