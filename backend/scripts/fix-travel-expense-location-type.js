/**
 * Script sửa location_type sai trong travel_expense_requests
 * Chạy từ thư mục backend
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
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

async function fixLocationType() {
    const client = await pool.connect();

    try {
        console.log('🔍 Đang kiểm tra và sửa location_type...\n');

        // Đọc SQL file
        const sqlFilePath = path.join(__dirname, '../../scripts/fix-travel-expense-location-type.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        // Chia thành các câu lệnh
        const statements = sqlContent
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        await client.query('BEGIN');

        let updatedCount = 0;

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (!statement || statement.length < 10) continue;

            if (statement.toUpperCase().includes('UPDATE')) {
                try {
                    const result = await client.query(statement);
                    updatedCount = result.rowCount || 0;
                    console.log(`✓ Đã sửa ${updatedCount} bản ghi có location_type sai`);
                } catch (error) {
                    console.error(`✗ Lỗi khi UPDATE:`, error.message);
                }
            } else if (statement.toUpperCase().includes('SELECT')) {
                try {
                    const result = await client.query(statement);
                    if (result.rows && result.rows.length > 0) {
                        console.log(`\n📋 Kết quả:`);
                        console.table(result.rows);
                    }
                } catch (error) {
                    console.error(`✗ Lỗi khi SELECT:`, error.message);
                }
            }
        }

        await client.query('COMMIT');

        console.log('\n' + '='.repeat(60));
        console.log('✅ Hoàn thành!');
        console.log(`   Đã sửa ${updatedCount} bản ghi`);
        console.log('='.repeat(60));

    } catch (error) {
        await client.query('ROLLBACK').catch(() => { });
        console.error('\n❌ Lỗi:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Chạy script
fixLocationType()
    .then(() => {
        console.log('\n✨ Script đã hoàn thành!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Lỗi không mong đợi:', error);
        process.exit(1);
    });

