// Script để tạo các bảng candidates
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function createCandidatesTables() {
    try {
        console.log('Đang tạo các bảng candidates...');
        
        // Đọc file SQL
        const sqlFile = path.join(__dirname, '../../database/create_candidates_schema.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        // Thực thi SQL
        await pool.query(sql);
        
        console.log('✓ Đã tạo các bảng candidates thành công!');
        console.log('  - candidates');
        console.log('  - candidate_work_experiences');
        console.log('  - candidate_training_processes');
        console.log('  - candidate_foreign_languages');
        
        // Kiểm tra các bảng đã được tạo
        const checkTables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'candidate%'
            ORDER BY table_name;
        `);
        
        console.log('\nCác bảng đã được tạo:');
        checkTables.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });
        
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Lỗi khi tạo bảng:', error);
        await pool.end();
        process.exit(1);
    }
}

createCandidatesTables();


