const pool = require('../config/database');

async function verifyDelete() {
    const client = await pool.connect();
    try {
        // Check candidates count
        const candidatesResult = await client.query('SELECT COUNT(*) as count FROM candidates');
        const candidatesCount = parseInt(candidatesResult.rows[0].count);

        // Check interview_requests count
        const interviewResult = await client.query('SELECT COUNT(*) as count FROM interview_requests');
        const interviewCount = parseInt(interviewResult.rows[0].count);

        console.log('\n📊 Kiểm tra dữ liệu còn lại:');
        console.log(`   - Candidates: ${candidatesCount}`);
        console.log(`   - Interview Requests: ${interviewCount}`);

        if (candidatesCount === 0 && interviewCount === 0) {
            console.log('\n✅ Đã xóa toàn bộ ứng viên và dữ liệu liên quan!');
        } else {
            console.log('\n⚠️  Vẫn còn dữ liệu trong database');
        }

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

verifyDelete();

