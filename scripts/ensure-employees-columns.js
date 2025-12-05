// Script đảm bảo tất cả các cột cần thiết đều tồn tại trong bảng employees
// Chạy: node scripts/ensure-employees-columns.js

const pool = require('../backend/config/database');

async function ensureColumns() {
    const client = await pool.connect();

    try {
        console.log('🔄 Đang kiểm tra và tạo các cột cần thiết...\n');

        // Danh sách các cột cần thiết
        const requiredColumns = [
            { name: 'ma_nhan_vien', type: 'VARCHAR(255)', unique: true },
            { name: 'ma_cham_cong', type: 'VARCHAR(255)' },
            { name: 'ho_ten', type: 'VARCHAR(255)', notNull: true },
            { name: 'chi_nhanh', type: 'VARCHAR(255)' },
            { name: 'phong_ban', type: 'VARCHAR(255)', notNull: true },
            { name: 'bo_phan', type: 'VARCHAR(255)' },
            { name: 'chuc_danh', type: 'VARCHAR(255)' },
            { name: 'ngay_gia_nhap', type: 'DATE' },
            { name: 'loai_hop_dong', type: 'VARCHAR(255)' },
            { name: 'dia_diem', type: 'VARCHAR(255)' },
            { name: 'tinh_thue', type: 'VARCHAR(50)' },
            { name: 'cap_bac', type: 'VARCHAR(255)' },
            { name: 'quan_ly_truc_tiep', type: 'VARCHAR(255)' },
            { name: 'quan_ly_gian_tiep', type: 'VARCHAR(255)' },
            { name: 'email', type: 'VARCHAR(255)' },
        ];

        // Kiểm tra các cột hiện có
        const checkQuery = `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'employees'
              AND table_schema = 'public'
        `;
        const result = await client.query(checkQuery);
        const existingColumns = new Set(result.rows.map(r => r.column_name));

        console.log(`📊 Tìm thấy ${existingColumns.size} cột hiện có trong bảng employees\n`);

        // Tạo các cột còn thiếu
        let createdCount = 0;
        for (const col of requiredColumns) {
            if (!existingColumns.has(col.name)) {
                try {
                    let alterQuery = `ALTER TABLE employees ADD COLUMN ${col.name} ${col.type}`;

                    if (col.unique) {
                        // Thêm UNIQUE constraint sau khi tạo cột
                        await client.query(alterQuery);
                        try {
                            await client.query(`ALTER TABLE employees ADD CONSTRAINT employees_${col.name}_key UNIQUE (${col.name})`);
                        } catch (e) {
                            // Constraint có thể đã tồn tại
                        }
                    } else {
                        await client.query(alterQuery);
                    }

                    console.log(`✅ Đã tạo cột: ${col.name}`);
                    createdCount++;
                } catch (error) {
                    console.error(`❌ Lỗi khi tạo cột ${col.name}:`, error.message);
                }
            } else {
                console.log(`✓ Cột đã tồn tại: ${col.name}`);
            }
        }

        // Kiểm tra lại
        const finalCheck = await client.query(checkQuery);
        const finalColumns = new Set(finalCheck.rows.map(r => r.column_name));

        console.log(`\n📊 Tổng số cột sau khi kiểm tra: ${finalColumns.size}`);
        console.log(`✅ Đã tạo ${createdCount} cột mới\n`);

        // Hiển thị danh sách cột
        console.log('📋 Danh sách các cột trong bảng employees:');
        finalCheck.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row.column_name}`);
        });

        console.log('\n✅ Hoàn tất! Bảng employees đã sẵn sàng cho import.\n');

    } catch (error) {
        console.error('\n❌ Lỗi:', error.message);
        if (error.detail) {
            console.error('Chi tiết:', error.detail);
        }
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

ensureColumns();

