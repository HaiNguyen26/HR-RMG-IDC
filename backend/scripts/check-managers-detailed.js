const pool = require('../config/database');

async function checkManagersDetailed() {
    try {
        console.log('=== KIỂM TRA QUẢN LÝ TRỰC TIẾP VÀ GIÁM ĐỐC CHI NHÁNH ===\n');

        // 1. Lấy danh sách quản lý trực tiếp (từ quan_ly_truc_tiep)
        console.log('1. QUẢN LÝ TRỰC TIẾP (từ quan_ly_truc_tiep):');
        console.log('─'.repeat(80));
        const directManagersResult = await pool.query(
            `SELECT DISTINCT quan_ly_truc_tiep, COUNT(*) as so_nhan_vien
             FROM employees 
             WHERE quan_ly_truc_tiep IS NOT NULL 
             GROUP BY quan_ly_truc_tiep
             ORDER BY quan_ly_truc_tiep`
        );
        console.log(`Tổng số quản lý trực tiếp: ${directManagersResult.rows.length}`);
        directManagersResult.rows.forEach((row, index) => {
            console.log(`  ${index + 1}. ${row.quan_ly_truc_tiep} (quản lý ${row.so_nhan_vien} nhân viên)`);
        });

        // 2. Lấy danh sách giám đốc chi nhánh (từ chuc_danh)
        console.log('\n2. GIÁM ĐỐC CHI NHÁNH (từ chuc_danh):');
        console.log('─'.repeat(80));
        const branchDirectorsResult = await pool.query(
            `SELECT ho_ten, chuc_danh, chi_nhanh, email
             FROM employees 
             WHERE chuc_danh ILIKE '%giám đốc chi nhánh%' 
                OR chuc_danh ILIKE '%giam doc chi nhanh%'
             ORDER BY ho_ten`
        );
        console.log(`Tổng số giám đốc chi nhánh: ${branchDirectorsResult.rows.length}`);
        if (branchDirectorsResult.rows.length === 0) {
            console.log('  ⚠️  Không tìm thấy giám đốc chi nhánh từ chuc_danh');
        } else {
            branchDirectorsResult.rows.forEach((row, index) => {
                console.log(`  ${index + 1}. ${row.ho_ten}`);
                console.log(`     - Chức danh: ${row.chuc_danh || 'N/A'}`);
                console.log(`     - Chi nhánh: ${row.chi_nhanh || 'N/A'}`);
                console.log(`     - Email: ${row.email || 'N/A'}`);
            });
        }

        // 3. Kiểm tra 3 giám đốc chi nhánh cụ thể (theo danh sách hardcode)
        console.log('\n3. KIỂM TRA 3 GIÁM ĐỐC CHI NHÁNH CỤ THỂ:');
        console.log('─'.repeat(80));
        const specificDirectors = [
            'Châu Quang Hải',
            'Nguyễn Ngọc Luyễn',
            'Nguyễn Văn Khải'
        ];
        
        for (const directorName of specificDirectors) {
            const directorResult = await pool.query(
                `SELECT ho_ten, chuc_danh, chi_nhanh, email, quan_ly_truc_tiep, quan_ly_gian_tiep
                 FROM employees 
                 WHERE ho_ten ILIKE $1
                 ORDER BY ho_ten`,
                [`%${directorName}%`]
            );
            
            if (directorResult.rows.length > 0) {
                directorResult.rows.forEach(row => {
                    console.log(`  ✓ ${row.ho_ten}:`);
                    console.log(`     - Chức danh: ${row.chuc_danh || 'N/A'}`);
                    console.log(`     - Chi nhánh: ${row.chi_nhanh || 'N/A'}`);
                    console.log(`     - Email: ${row.email || 'N/A'}`);
                    console.log(`     - Quản lý trực tiếp: ${row.quan_ly_truc_tiep || 'N/A'}`);
                    console.log(`     - Quản lý gián tiếp: ${row.quan_ly_gian_tiep || 'N/A'}`);
                });
            } else {
                console.log(`  ✗ Không tìm thấy: ${directorName}`);
            }
        }

        // 4. Lấy thông tin chi tiết các quản lý trực tiếp
        console.log('\n4. THÔNG TIN CHI TIẾT CÁC QUẢN LÝ TRỰC TIẾP:');
        console.log('─'.repeat(80));
        const managerDetailsResult = await pool.query(
            `SELECT e.ho_ten, e.chuc_danh, e.chi_nhanh, e.email,
                    COUNT(DISTINCT e2.id) as so_nhan_vien_quan_ly
             FROM employees e
             INNER JOIN employees e2 ON e2.quan_ly_truc_tiep = e.ho_ten
             GROUP BY e.id, e.ho_ten, e.chuc_danh, e.chi_nhanh, e.email
             ORDER BY e.ho_ten`
        );
        console.log(`Tổng số quản lý trực tiếp (có nhân viên): ${managerDetailsResult.rows.length}`);
        managerDetailsResult.rows.forEach((row, index) => {
            console.log(`  ${index + 1}. ${row.ho_ten}`);
            console.log(`     - Chức danh: ${row.chuc_danh || 'N/A'}`);
            console.log(`     - Chi nhánh: ${row.chi_nhanh || 'N/A'}`);
            console.log(`     - Email: ${row.email || 'N/A'}`);
            console.log(`     - Số nhân viên quản lý: ${row.so_nhan_vien_quan_ly}`);
        });

        // 5. So sánh quan_ly_gian_tiep với giám đốc chi nhánh
        console.log('\n5. QUẢN LÝ GIÁN TIẾP (quan_ly_gian_tiep) - KHÔNG PHẢI GIÁM ĐỐC CHI NHÁNH:');
        console.log('─'.repeat(80));
        const indirectManagersResult = await pool.query(
            `SELECT DISTINCT quan_ly_gian_tiep, COUNT(*) as so_nhan_vien
             FROM employees 
             WHERE quan_ly_gian_tiep IS NOT NULL 
             GROUP BY quan_ly_gian_tiep
             ORDER BY quan_ly_gian_tiep`
        );
        console.log(`Tổng số quản lý gián tiếp: ${indirectManagersResult.rows.length}`);
        console.log('⚠️  Lưu ý: Quản lý gián tiếp KHÔNG PHẢI là giám đốc chi nhánh');
        indirectManagersResult.rows.forEach((row, index) => {
            console.log(`  ${index + 1}. ${row.quan_ly_gian_tiep} (quản lý gián tiếp ${row.so_nhan_vien} nhân viên)`);
        });

    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

checkManagersDetailed();

