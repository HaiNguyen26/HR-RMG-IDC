const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'HR_Management_System',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function insertMockData() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Bắt đầu chèn mock data cho travel expense...\n');
        await client.query('BEGIN');

        // Kiểm tra xem có employees trong database không
        console.log('📋 Đang kiểm tra employees trong database...');
        const empResult = await client.query('SELECT COUNT(*) as count FROM employees');
        const empCount = parseInt(empResult.rows[0].count);
        
        if (empCount < 1) {
            throw new Error('Cần ít nhất 1 employee trong database. Vui lòng thêm employees trước.');
        }

        console.log(`✅ Tìm thấy ${empCount} employee(s) trong database`);
        console.log('   (SQL script sẽ tự động lấy employee IDs)\n');

        // Đọc và thực thi SQL từ file
        const sqlFile = path.join(__dirname, '../../database/insert_mock_travel_expense_data.sql');
        
        if (!fs.existsSync(sqlFile)) {
            throw new Error(`Không tìm thấy file: ${sqlFile}`);
        }

        console.log('📝 Đang đọc SQL file...');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');
        
        // Tìm và thực thi block DO $$ ... END $$;
        // PostgreSQL DO blocks cần được thực thi như một câu lệnh duy nhất
        const doBlockMatch = sqlContent.match(/DO \$\$[\s\S]*?END \$\$/);
        
        if (doBlockMatch) {
            console.log('📝 Đang thực thi SQL script...\n');
            try {
                // Thực thi DO block (file SQL đã tự động lấy employee IDs)
                await client.query(doBlockMatch[0]);
                console.log('✅ Đã thực thi SQL script thành công\n');
            } catch (error) {
                console.error('⚠ Lỗi khi thực thi SQL:', error.message);
                if (error.detail) {
                    console.error('   Chi tiết:', error.detail);
                }
                if (error.position) {
                    console.error('   Vị trí lỗi:', error.position);
                }
                throw error;
            }
        } else {
            throw new Error('Không tìm thấy DO block trong SQL file');
        }

        await client.query('COMMIT');
        
        // Kiểm tra kết quả
        const countResult = await client.query(`
            SELECT status, COUNT(*) as count
            FROM travel_expense_requests
            GROUP BY status
            ORDER BY count DESC
        `);

        console.log('\n📊 Kết quả chèn mock data:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        countResult.rows.forEach(row => {
            console.log(`  ${row.status.padEnd(30)} : ${row.count} requests`);
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const totalResult = await client.query('SELECT COUNT(*) as total FROM travel_expense_requests');
        console.log(`✅ Đã chèn thành công ${totalResult.rows[0].total} travel expense requests!\n`);

    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('❌ Lỗi khi chèn mock data:', error.message);
        console.error(error.stack);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Chạy script
insertMockData()
    .then(() => {
        console.log('✅ Hoàn tất!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script thất bại:', error);
        process.exit(1);
    });

