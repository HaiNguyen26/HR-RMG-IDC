// Script để xóa toàn bộ đơn chi phí tiếp khách và các phiếu duyệt
const path = require('path');
const pool = require(path.join(__dirname, '../backend/config/database'));

async function deleteAllCustomerEntertainmentExpenses() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('🔄 Đang xóa dữ liệu...');

        // 1. Xóa tất cả các file đính kèm
        const filesResult = await client.query('DELETE FROM customer_entertainment_expense_files');
        console.log(`✅ Đã xóa ${filesResult.rowCount} file đính kèm`);

        // 2. Xóa tất cả các item chi phí
        const itemsResult = await client.query('DELETE FROM customer_entertainment_expense_items');
        console.log(`✅ Đã xóa ${itemsResult.rowCount} item chi phí`);

        // 3. Xóa tất cả các đơn chi phí tiếp khách
        const requestsResult = await client.query('DELETE FROM customer_entertainment_expense_requests');
        console.log(`✅ Đã xóa ${requestsResult.rowCount} đơn chi phí tiếp khách`);

        // 4. Reset sequence
        await client.query('ALTER SEQUENCE customer_entertainment_expense_requests_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE customer_entertainment_expense_items_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE customer_entertainment_expense_files_id_seq RESTART WITH 1');
        console.log('✅ Đã reset sequence');

        await client.query('COMMIT');

        // Kiểm tra kết quả
        const checkRequests = await client.query('SELECT COUNT(*) as count FROM customer_entertainment_expense_requests');
        const checkItems = await client.query('SELECT COUNT(*) as count FROM customer_entertainment_expense_items');
        const checkFiles = await client.query('SELECT COUNT(*) as count FROM customer_entertainment_expense_files');

        console.log('\n📊 Kết quả kiểm tra:');
        console.log(`   - Requests: ${checkRequests.rows[0].count}`);
        console.log(`   - Items: ${checkItems.rows[0].count}`);
        console.log(`   - Files: ${checkFiles.rows[0].count}`);

        console.log('\n✅ Hoàn thành! Đã xóa toàn bộ đơn chi phí tiếp khách và các phiếu duyệt.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Lỗi:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

deleteAllCustomerEntertainmentExpenses()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Lỗi khi xóa dữ liệu:', error);
        process.exit(1);
    });

