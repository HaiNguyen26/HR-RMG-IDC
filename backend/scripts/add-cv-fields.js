require('dotenv').config();
const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function addCVFields() {
    try {
        console.log('Đang thêm 2 cột ngay_gui_cv và nguon_cv vào bảng candidates...');
        
        // Kiểm tra và thêm cột ngay_gui_cv
        const checkNgayGuiCV = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'candidates' AND column_name = 'ngay_gui_cv'
        `);
        
        if (checkNgayGuiCV.rows.length === 0) {
            await pool.query(`
                ALTER TABLE candidates ADD COLUMN ngay_gui_cv DATE;
            `);
            await pool.query(`
                COMMENT ON COLUMN candidates.ngay_gui_cv IS 'Ngày ứng viên gửi CV';
            `);
            console.log('✓ Đã thêm cột ngay_gui_cv');
        } else {
            console.log('✓ Cột ngay_gui_cv đã tồn tại');
        }
        
        // Kiểm tra và thêm cột nguon_cv
        const checkNguonCV = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'candidates' AND column_name = 'nguon_cv'
        `);
        
        if (checkNguonCV.rows.length === 0) {
            await pool.query(`
                ALTER TABLE candidates ADD COLUMN nguon_cv VARCHAR(255);
            `);
            await pool.query(`
                COMMENT ON COLUMN candidates.nguon_cv IS 'Nguồn CV (Website, Facebook, LinkedIn, v.v.)';
            `);
            console.log('✓ Đã thêm cột nguon_cv');
        } else {
            console.log('✓ Cột nguon_cv đã tồn tại');
        }
        
        // Tạo index cho ngay_gui_cv
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_candidates_ngay_gui_cv ON candidates(ngay_gui_cv DESC);
        `);
        console.log('✓ Đã tạo index cho ngay_gui_cv');
        
        console.log('\n✓ Hoàn thành thêm 2 cột mới!');
        
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Lỗi:', error);
        await pool.end();
        process.exit(1);
    }
}

addCVFields();


