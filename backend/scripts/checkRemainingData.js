const pool = require('../config/database');

async function checkRemainingData() {
    try {
        // Check candidates
        const candidatesResult = await pool.query('SELECT COUNT(*) FROM candidates');
        console.log(`Candidates: ${candidatesResult.rows[0].count}`);

        // Check interview_requests
        const interviewRequestsResult = await pool.query('SELECT COUNT(*) FROM interview_requests');
        console.log(`Interview Requests: ${interviewRequestsResult.rows[0].count}`);

        console.log('\n✅ Check completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkRemainingData();

