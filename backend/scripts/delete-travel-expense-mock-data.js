/**
 * Script xóa toàn bộ mock data trong travel_expense_requests
 * Chạy từ thư mục backend
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'HR_Management_System',
    user: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD || ''),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function deleteMockData() {
    const client = await pool.connect();

    try {
        console.log('🗑️  Đang xóa toàn bộ mock data...\n');

        // Đếm số lượng trước khi xóa
        const countBefore = await client.query(`
            SELECT COUNT(*) as count 
            FROM travel_expense_requests 
            WHERE title LIKE '%[MOCK]%'
        `);

        const count = parseInt(countBefore.rows[0].count);

        if (count === 0) {
            console.log('✅ Không có mock data nào để xóa!');
            return;
        }

        console.log(`📊 Tìm thấy ${count} bản ghi mock data\n`);

        // Xóa tất cả mock data
        await client.query('BEGIN');

        const deleteResult = await client.query(`
            DELETE FROM travel_expense_requests 
            WHERE title LIKE '%[MOCK]%'
        `);

        await client.query('COMMIT');

        console.log(`✅ Đã xóa ${deleteResult.rowCount} bản ghi mock data`);

        // Kiểm tra lại
        const countAfter = await client.query(`
            SELECT COUNT(*) as count 
            FROM travel_expense_requests 
            WHERE title LIKE '%[MOCK]%'
        `);

        const remaining = parseInt(countAfter.rows[0].count);

        if (remaining === 0) {
            console.log('\n✅ Đã xóa sạch tất cả mock data!');
        } else {
            console.log(`\n⚠️  Vẫn còn ${remaining} bản ghi (có thể do lỗi)`);
        }

        // Hiển thị thống kê tổng
        const totalResult = await client.query(`
            SELECT COUNT(*) as total 
            FROM travel_expense_requests
        `);

        console.log(`\n📊 Tổng số yêu cầu công tác còn lại: ${totalResult.rows[0].total}`);

        console.log('\n' + '='.repeat(60));
        console.log('✨ Hoàn thành!');
        console.log('='.repeat(60));

    } catch (error) {
        await client.query('ROLLBACK').catch(() => { });
        console.error('\n❌ Lỗi:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Chạy script
deleteMockData()
    .then(() => {
        console.log('\n✨ Script đã hoàn thành!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Lỗi không mong đợi:', error);
        process.exit(1);
    });

