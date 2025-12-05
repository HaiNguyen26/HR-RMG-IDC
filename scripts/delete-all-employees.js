// Script xóa toàn bộ nhân viên
// Chạy: node scripts/delete-all-employees.js

const readline = require('readline');
const pool = require('../backend/config/database');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function deleteAllEmployees() {
    try {
        // Đếm số lượng nhân viên hiện tại
        const countResult = await pool.query('SELECT COUNT(*) as total FROM employees');
        const totalEmployees = parseInt(countResult.rows[0].total);

        if (totalEmployees === 0) {
            console.log('✅ Database đã trống, không có nhân viên nào để xóa.');
            rl.close();
            await pool.end();
            return;
        }

        console.log('⚠️  CẢNH BÁO: Bạn sắp XÓA TOÀN BỘ nhân viên!');
        console.log(`📊 Hiện tại có: ${totalEmployees} nhân viên trong database\n`);

        const confirm = await askQuestion('Bạn có chắc chắn muốn xóa tất cả? (gõ "XOA" để xác nhận): ');

        if (confirm !== 'XOA') {
            console.log('\n❌ Đã hủy. Không có gì bị xóa.');
            rl.close();
            await pool.end();
            return;
        }

        console.log('\n🗑️  Đang xóa...');

        // Xóa tất cả nhân viên
        const deleteResult = await pool.query('DELETE FROM employees');
        const deletedCount = deleteResult.rowCount;

        console.log(`\n✅ Đã xóa ${deletedCount} nhân viên!`);

        // Kiểm tra lại
        const checkResult = await pool.query('SELECT COUNT(*) as total FROM employees');
        const remaining = parseInt(checkResult.rows[0].total);

        if (remaining === 0) {
            console.log('✅ Database đã trống hoàn toàn.');
        } else {
            console.log(`⚠️  Còn lại ${remaining} nhân viên (có thể do foreign key constraints).`);
        }

    } catch (error) {
        console.error('\n❌ Lỗi:', error.message);

        if (error.message.includes('foreign key')) {
            console.log('\n💡 Tip: Có thể có dữ liệu liên quan (equipment_assignments, requests...)');
            console.log('   Bạn có thể cần xóa các bảng liên quan trước.');
        }
    } finally {
        rl.close();
        await pool.end();
        process.exit(0);
    }
}

deleteAllEmployees();

