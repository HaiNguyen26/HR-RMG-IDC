/**
 * Script chạy SQL file để insert mock data cho Travel Expense
 * Sử dụng cấu hình database từ backend để tránh vấn đề mật khẩu
 */

const fs = require('fs');
const path = require('path');

// Thêm backend/node_modules vào module search path
const backendPath = path.join(__dirname, '../backend');
const backendNodeModules = path.join(backendPath, 'node_modules');

// Kiểm tra xem backend/node_modules có tồn tại không
if (!fs.existsSync(backendNodeModules)) {
    console.error('❌ Không tìm thấy backend/node_modules');
    console.error('💡 Vui lòng chạy: cd backend && npm install');
    process.exit(1);
}

// Thêm vào module.paths để Node.js tìm module ở đây
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain) {
    if (request === 'pg' || request === 'dotenv') {
        const backendModule = path.join(backendNodeModules, request);
        if (fs.existsSync(backendModule)) {
            try {
                return originalResolveFilename(backendModule, parent, isMain);
            } catch (e) {
                // Fallback to normal resolution
            }
        }
    }
    return originalResolveFilename(request, parent, isMain);
};

// Thêm backend/node_modules vào module.paths
if (!Module._nodeModulePaths) {
    Module._nodeModulePaths = function (from) {
        const paths = [];
        const parsed = path.parse(from);
        let cur = parsed.dir;
        while (cur !== parsed.root) {
            paths.push(path.join(cur, 'node_modules'));
            cur = path.dirname(cur);
        }
        paths.push(path.join(parsed.root, 'node_modules'));
        return paths;
    };
}

// Thêm backend/node_modules vào đầu danh sách
const originalNodeModulePaths = Module._nodeModulePaths;
Module._nodeModulePaths = function (from) {
    const paths = originalNodeModulePaths(from);
    if (!paths.includes(backendNodeModules)) {
        paths.unshift(backendNodeModules);
    }
    return paths;
};

// Bây giờ có thể require bình thường
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(backendPath, '.env') });

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

async function runSQLFile() {
    const client = await pool.connect();

    try {
        console.log('📝 Đang đọc file SQL...');
        const sqlFilePath = path.join(__dirname, 'insert-travel-expense-mock-data.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('🔄 Đang kết nối database...');
        console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   Database: ${process.env.DB_NAME || 'HR_Management_System'}`);
        console.log(`   User: ${process.env.DB_USER || 'postgres'}`);

        console.log('🚀 Bắt đầu thực thi SQL...\n');

        // Chia SQL thành các câu lệnh
        // Sử dụng regex để tách các câu lệnh, xử lý cả DO blocks và các câu lệnh thông thường
        const statements = [];
        let currentStatement = '';
        let inDoBlock = false;
        let doBlockDepth = 0;

        const lines = sqlContent.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Bỏ qua comment
            if (line.startsWith('--') || line === '') {
                continue;
            }

            currentStatement += line + '\n';

            // Xử lý DO blocks
            if (line.toUpperCase().includes('DO $$')) {
                inDoBlock = true;
                doBlockDepth = (line.match(/\$\$/g) || []).length;
            }

            if (inDoBlock) {
                const endMatches = (line.match(/\$\$/g) || []).length;
                if (endMatches > 0) {
                    doBlockDepth -= endMatches;
                    if (doBlockDepth <= 0) {
                        inDoBlock = false;
                        statements.push(currentStatement.trim());
                        currentStatement = '';
                    }
                }
            } else if (line.endsWith(';')) {
                statements.push(currentStatement.trim());
                currentStatement = '';
            }
        }

        if (currentStatement.trim()) {
            statements.push(currentStatement.trim());
        }

        console.log(`📊 Tìm thấy ${statements.length} câu lệnh SQL\n`);

        await client.query('BEGIN');

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (!statement || statement.length < 10) continue;

            try {
                const result = await client.query(statement);

                // Hiển thị thông tin cho các câu lệnh quan trọng
                if (statement.toUpperCase().includes('INSERT INTO')) {
                    const match = statement.match(/\[MOCK\]\s*([^-]+)/);
                    const title = match ? match[1].trim() : 'Yêu cầu công tác';
                    console.log(`✓ [${i + 1}/${statements.length}] ${title}`);
                } else if (statement.toUpperCase().includes('SELECT')) {
                    if (result.rows && result.rows.length > 0) {
                        console.log(`\n📋 Kết quả:`);
                        console.table(result.rows);
                    }
                } else if (statement.toUpperCase().includes('DELETE')) {
                    console.log(`✓ [${i + 1}/${statements.length}] Đã xóa mock data cũ`);
                } else if (statement.toUpperCase().includes('DO $$')) {
                    console.log(`✓ [${i + 1}/${statements.length}] Kiểm tra dữ liệu`);
                } else if (statement.toUpperCase().includes('CREATE TABLE')) {
                    console.log(`✓ [${i + 1}/${statements.length}] Tạo bảng (nếu chưa tồn tại)`);
                }

                successCount++;
            } catch (error) {
                // Bỏ qua lỗi "already exists" cho CREATE TABLE
                if (error.message.includes('already exists') || error.code === '42P07') {
                    console.log(`⚠ [${i + 1}/${statements.length}] Đã tồn tại (bỏ qua)`);
                    successCount++;
                } else {
                    console.error(`✗ [${i + 1}/${statements.length}] Lỗi:`, error.message);
                    errorCount++;
                    // Không throw để tiếp tục với các câu lệnh khác
                }
            }
        }

        // Kiểm tra kết quả
        console.log('\n📊 Kiểm tra kết quả...');
        const result = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN location_type = 'DOMESTIC' THEN 1 END) as domestic,
                COUNT(CASE WHEN location_type = 'INTERNATIONAL' THEN 1 END) as international
            FROM travel_expense_requests
            WHERE title LIKE '%[MOCK]%'
        `);

        if (result.rows.length > 0) {
            const stats = result.rows[0];
            console.log(`\n✅ Đã tạo thành công ${stats.total} yêu cầu công tác:`);
            console.log(`   - Trong nước: ${stats.domestic}`);
            console.log(`   - Ngoài nước: ${stats.international}`);
        }

        await client.query('COMMIT');

        console.log('\n' + '='.repeat(60));
        console.log('✨ Hoàn thành!');
        console.log('='.repeat(60));

    } catch (error) {
        await client.query('ROLLBACK').catch(() => { });
        console.error('\n❌ Lỗi khi thực thi script:', error.message);
        console.error('Chi tiết:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Chạy script
runSQLFile()
    .then(() => {
        console.log('\n✨ Script đã hoàn thành!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Lỗi không mong đợi:', error);
        process.exit(1);
    });

