require('dotenv').config();
const pool = require('../config/database');

async function addUpdatedAtColumn() {
    try {
        console.log('Đang thêm cột updated_at vào bảng interview_requests...');

        // Kiểm tra xem cột đã tồn tại chưa
        const checkColumn = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'interview_requests' AND column_name = 'updated_at';
        `);

        if (checkColumn.rows.length > 0) {
            console.log('✓ Cột updated_at đã tồn tại');
        } else {
            // Thêm cột updated_at
            await pool.query(`
                ALTER TABLE interview_requests 
                ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            `);
            console.log('✓ Đã thêm cột updated_at');
        }

        // Tạo trigger để tự động cập nhật updated_at khi có thay đổi
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_interview_requests_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);
        console.log('✓ Đã tạo function update_interview_requests_updated_at');

        // Tạo trigger nếu chưa có
        await pool.query(`
            DROP TRIGGER IF EXISTS update_interview_requests_updated_at ON interview_requests;
        `);

        await pool.query(`
            CREATE TRIGGER update_interview_requests_updated_at 
            BEFORE UPDATE ON interview_requests
            FOR EACH ROW 
            EXECUTE FUNCTION update_interview_requests_updated_at();
        `);
        console.log('✓ Đã tạo trigger update_interview_requests_updated_at');

        console.log('\n✓ Hoàn thành!');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Lỗi:', error);
        await pool.end();
        process.exit(1);
    }
}

addUpdatedAtColumn();

