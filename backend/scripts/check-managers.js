const pool = require('../config/database');

async function checkManagers() {
    try {
        // 1. Lấy danh sách quản lý trực tiếp
        console.log('=== QUẢN LÝ TRỰC TIẾP ===');
        const directManagersResult = await pool.query(
            `SELECT DISTINCT quan_ly_truc_tiep 
             FROM employees 
             WHERE quan_ly_truc_tiep IS NOT NULL 
             ORDER BY quan_ly_truc_tiep`
        );
        directManagersResult.rows.forEach(row => {
            console.log(`  - ${row.quan_ly_truc_tiep}`);
        });

        // 2. Lấy danh sách quản lý gián tiếp / giám đốc chi nhánh
        console.log('\n=== QUẢN LÝ GIÁN TIẾP / GIÁM ĐỐC CHI NHÁNH ===');
        const indirectManagersResult = await pool.query(
            `SELECT DISTINCT quan_ly_gian_tiep 
             FROM employees 
             WHERE quan_ly_gian_tiep IS NOT NULL 
             ORDER BY quan_ly_gian_tiep`
        );
        indirectManagersResult.rows.forEach(row => {
            console.log(`  - ${row.quan_ly_gian_tiep}`);
        });

        // 3. Lấy nhân viên có chức danh giám đốc chi nhánh
        console.log('\n=== NHÂN VIÊN CÓ CHỨC DANH GIÁM ĐỐC CHI NHÁNH ===');
        const directorsResult = await pool.query(
            `SELECT ho_ten, chuc_danh, chi_nhanh, quan_ly_truc_tiep, quan_ly_gian_tiep 
             FROM employees 
             WHERE chuc_danh ILIKE '%giám đốc chi nhánh%' 
                OR chuc_danh ILIKE '%giam doc chi nhanh%'
             ORDER BY ho_ten`
        );
        directorsResult.rows.forEach(row => {
            console.log(`  - ${row.ho_ten} | ${row.chuc_danh || 'N/A'} | ${row.chi_nhanh || 'N/A'} | QLTT: ${row.quan_ly_truc_tiep || 'N/A'} | QLGT: ${row.quan_ly_gian_tiep || 'N/A'}`);
        });

        // 4. Lấy thông tin các quản lý trực tiếp
        console.log('\n=== THÔNG TIN CÁC QUẢN LÝ TRỰC TIẾP ===');
        const managerInfoResult = await pool.query(
            `SELECT ho_ten, chuc_danh, chi_nhanh 
             FROM employees 
             WHERE ho_ten IN (
                 SELECT DISTINCT quan_ly_truc_tiep 
                 FROM employees 
                 WHERE quan_ly_truc_tiep IS NOT NULL
             )
             ORDER BY ho_ten`
        );
        managerInfoResult.rows.forEach(row => {
            console.log(`  - ${row.ho_ten} | ${row.chuc_danh || 'N/A'} | ${row.chi_nhanh || 'N/A'}`);
        });

        // 5. Lấy thông tin các giám đốc chi nhánh (quan_ly_gian_tiep)
        console.log('\n=== THÔNG TIN CÁC GIÁM ĐỐC CHI NHÁNH (quan_ly_gian_tiep) ===');
        const branchDirectorInfoResult = await pool.query(
            `SELECT ho_ten, vi_tri, chi_nhanh 
             FROM employees 
             WHERE ho_ten IN (
                 SELECT DISTINCT quan_ly_gian_tiep 
                 FROM employees 
                 WHERE quan_ly_gian_tiep IS NOT NULL
             )
             ORDER BY ho_ten`
        );
        branchDirectorInfoResult.rows.forEach(row => {
            console.log(`  - ${row.ho_ten} | ${row.vi_tri || 'N/A'} | ${row.chi_nhanh || 'N/A'}`);
        });

        // 6. Kiểm tra role MANAGER trong users
        console.log('\n=== USERS CÓ ROLE MANAGER ===');
        const managerUsersResult = await pool.query(
            `SELECT id, username, ho_ten, role 
             FROM users 
             WHERE role = 'MANAGER' 
             ORDER BY ho_ten`
        );
        managerUsersResult.rows.forEach(row => {
            console.log(`  - ${row.ho_ten || row.username} | ${row.role}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkManagers();

