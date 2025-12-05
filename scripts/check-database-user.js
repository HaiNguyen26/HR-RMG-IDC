/**
 * Script kiểm tra tài khoản database đang sử dụng
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function checkDatabaseUser() {
    console.log('='.repeat(60));
    console.log('KIỂM TRA CẤU HÌNH DATABASE');
    console.log('='.repeat(60));

    // 1. Kiểm tra file .env
    const envPath = path.join(__dirname, '../backend/.env');
    console.log('\n📄 Kiểm tra file .env:');
    console.log(`   Đường dẫn: ${envPath}`);

    if (fs.existsSync(envPath)) {
        console.log('   ✅ File .env tồn tại');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const dbUserMatch = envContent.match(/DB_USER\s*=\s*(.+)/);
        const dbPasswordMatch = envContent.match(/DB_PASSWORD\s*=\s*(.+)/);

        if (dbUserMatch) {
            const dbUser = dbUserMatch[1].trim();
            console.log(`   📌 DB_USER trong .env: ${dbUser}`);
        } else {
            console.log('   ⚠️  Không tìm thấy DB_USER trong .env');
        }

        if (dbPasswordMatch) {
            const dbPassword = dbPasswordMatch[1].trim();
            console.log(`   📌 DB_PASSWORD trong .env: ${dbPassword.length > 0 ? '*'.repeat(dbPassword.length) : '(trống)'}`);
        } else {
            console.log('   ⚠️  Không tìm thấy DB_PASSWORD trong .env');
        }
    } else {
        console.log('   ❌ File .env không tồn tại');
        console.log('   💡 Tạo file .env từ .env.example');
    }

    // 2. Kiểm tra giá trị từ process.env
    console.log('\n🔧 Giá trị từ process.env:');
    const dbUser = process.env.DB_USER || 'postgres';
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 5432;
    const dbName = process.env.DB_NAME || 'HR_Management_System';
    const dbPassword = process.env.DB_PASSWORD || '';

    console.log(`   DB_HOST: ${dbHost}`);
    console.log(`   DB_PORT: ${dbPort}`);
    console.log(`   DB_NAME: ${dbName}`);
    console.log(`   DB_USER: ${dbUser} ${dbUser === 'postgres' ? '(mặc định)' : ''}`);
    console.log(`   DB_PASSWORD: ${dbPassword.length > 0 ? '*'.repeat(dbPassword.length) : '(trống)'}`);

    // 3. Thử kết nối để xác nhận
    console.log('\n🔌 Thử kết nối database...');
    const pool = new Pool({
        host: dbHost,
        port: dbPort,
        database: dbName,
        user: dbUser,
        password: String(dbPassword),
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    try {
        const client = await pool.connect();
        console.log('   ✅ Kết nối thành công!');

        // Lấy thông tin user hiện tại
        const userResult = await client.query('SELECT current_user, current_database(), version()');
        const currentUser = userResult.rows[0].current_user;
        const currentDatabase = userResult.rows[0].current_database;
        const version = userResult.rows[0].version.split('\n')[0];

        console.log('\n📊 Thông tin kết nối:');
        console.log(`   User hiện tại: ${currentUser}`);
        console.log(`   Database: ${currentDatabase}`);
        console.log(`   PostgreSQL: ${version}`);

        // Kiểm tra xem user có quyền gì
        const privilegesResult = await client.query(`
            SELECT 
                has_database_privilege($1, $2, 'CREATE') as can_create,
                has_database_privilege($1, $2, 'CONNECT') as can_connect,
                has_database_privilege($1, $2, 'TEMPORARY') as can_temp
        `, [currentUser, currentDatabase]);

        const privs = privilegesResult.rows[0];
        console.log('\n🔐 Quyền của user:');
        console.log(`   CREATE: ${privs.can_create ? '✅' : '❌'}`);
        console.log(`   CONNECT: ${privs.can_connect ? '✅' : '❌'}`);
        console.log(`   TEMPORARY: ${privs.can_temp ? '✅' : '❌'}`);

        // Kiểm tra xem có user hr_user không
        const hrUserCheck = await client.query(`
            SELECT usename 
            FROM pg_user 
            WHERE usename = 'hr_user'
        `);

        console.log('\n👤 Kiểm tra user hr_user:');
        if (hrUserCheck.rows.length > 0) {
            console.log('   ✅ User hr_user tồn tại trong PostgreSQL');
        } else {
            console.log('   ❌ User hr_user không tồn tại');
            console.log('   💡 Tạo user hr_user bằng lệnh:');
            console.log('      CREATE USER hr_user WITH PASSWORD \'your_password\';');
            console.log('      GRANT ALL PRIVILEGES ON DATABASE HR_Management_System TO hr_user;');
        }

        client.release();
        await pool.end();

        console.log('\n' + '='.repeat(60));
        console.log('✨ KẾT LUẬN:');
        console.log(`   Bạn đang sử dụng tài khoản: ${currentUser}`);
        if (currentUser === 'postgres') {
            console.log('   💡 Đây là superuser, có toàn quyền');
        } else if (currentUser === 'hr_user') {
            console.log('   💡 Đây là user chuyên dụng cho HR system');
        }
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Lỗi kết nối database:');
        console.error(`   ${error.message}`);
        console.log('\n💡 Gợi ý:');
        console.log('   1. Kiểm tra PostgreSQL đã chạy chưa');
        console.log('   2. Kiểm tra thông tin trong file .env');
        console.log('   3. Kiểm tra mật khẩu có đúng không');
        await pool.end();
        process.exit(1);
    }
}

// Chạy script
checkDatabaseUser()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Lỗi không mong đợi:', error);
        process.exit(1);
    });

