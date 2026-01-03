const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcrypt');

const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'RMG123@';

let ensureChiNhanhColumnPromise = null;
const ensureChiNhanhColumn = async () => {
    if (ensureChiNhanhColumnPromise) {
        return ensureChiNhanhColumnPromise;
    }

    ensureChiNhanhColumnPromise = (async () => {
        const checkQuery = `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'employees'
            AND column_name = 'chi_nhanh'
            LIMIT 1
        `;

        const result = await pool.query(checkQuery);

        if (result.rowCount === 0) {
            await pool.query(`
                ALTER TABLE employees
                ADD COLUMN chi_nhanh VARCHAR(255);
            `);

            await pool.query(`
                COMMENT ON COLUMN employees.chi_nhanh IS 'Chi nhánh làm việc của nhân viên';
            `);
        }
    })().catch((error) => {
        ensureChiNhanhColumnPromise = null;
        console.error('Error ensuring chi_nhanh column exists:', error);
        throw error;
    });

    return ensureChiNhanhColumnPromise;
};

let ensurePhongBanConstraintPromise = null;
const ensurePhongBanConstraintDropped = async () => {
    if (ensurePhongBanConstraintPromise) {
        return ensurePhongBanConstraintPromise;
    }

    ensurePhongBanConstraintPromise = (async () => {
        const checkQuery = `
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'employees'
              AND constraint_type = 'CHECK'
              AND constraint_name = 'employees_phong_ban_check'
            LIMIT 1
        `;

        const result = await pool.query(checkQuery);
        if (result.rowCount > 0) {
            await pool.query('ALTER TABLE employees DROP CONSTRAINT employees_phong_ban_check');
        }
    })().catch((error) => {
        ensurePhongBanConstraintPromise = null;
        console.error('Error removing phong_ban check constraint:', error);
        throw error;
    });

    return ensurePhongBanConstraintPromise;
};

const sanitizeDepartment = (value) => {
    if (!value) return null;
    const raw = String(value).trim();
    return raw !== '' ? raw : null;
};

let ensureManagerColumnsPromise = null;
const ensureManagerColumns = async () => {
    if (ensureManagerColumnsPromise) {
        return ensureManagerColumnsPromise;
    }

    ensureManagerColumnsPromise = (async () => {
        const checkQuery = `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'employees'
              AND column_name IN ('quan_ly_truc_tiep', 'quan_ly_gian_tiep')
        `;

        const result = await pool.query(checkQuery);
        const existingColumns = new Set(result.rows.map((row) => row.column_name));

        if (!existingColumns.has('quan_ly_truc_tiep')) {
            await pool.query(`
                ALTER TABLE employees
                    ADD COLUMN quan_ly_truc_tiep VARCHAR(255)
            `);
        }

        if (!existingColumns.has('quan_ly_gian_tiep')) {
            await pool.query(`
                ALTER TABLE employees
                    ADD COLUMN quan_ly_gian_tiep VARCHAR(255)
            `);
        }
    })().catch((error) => {
        ensureManagerColumnsPromise = null;
        console.error('Error ensuring manager columns exist:', error);
        throw error;
    });

    return ensureManagerColumnsPromise;
};

let ensureAdditionalFieldsPromise = null;
const ensureAdditionalFields = async () => {
    if (ensureAdditionalFieldsPromise) {
        return ensureAdditionalFieldsPromise;
    }

    ensureAdditionalFieldsPromise = (async () => {
        const checkQuery = `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'employees'
              AND column_name IN ('ma_cham_cong', 'loai_hop_dong', 'dia_diem', 'tinh_thue', 'cap_bac')
        `;

        const result = await pool.query(checkQuery);
        const existingColumns = new Set(result.rows.map((row) => row.column_name));

        if (!existingColumns.has('ma_cham_cong')) {
            await pool.query(`
                ALTER TABLE employees
                    ADD COLUMN ma_cham_cong VARCHAR(255)
            `);
            await pool.query(`
                COMMENT ON COLUMN employees.ma_cham_cong IS 'Mã chấm công của nhân viên'
            `);
        }

        if (!existingColumns.has('loai_hop_dong')) {
            await pool.query(`
                ALTER TABLE employees
                    ADD COLUMN loai_hop_dong VARCHAR(255)
            `);
            await pool.query(`
                COMMENT ON COLUMN employees.loai_hop_dong IS 'Loại hợp đồng (VD: Chính thức, Thử việc, Thời vụ)'
            `);
        }

        if (!existingColumns.has('dia_diem')) {
            await pool.query(`
                ALTER TABLE employees
                    ADD COLUMN dia_diem VARCHAR(255)
            `);
            await pool.query(`
                COMMENT ON COLUMN employees.dia_diem IS 'Địa điểm làm việc'
            `);
        }

        if (!existingColumns.has('tinh_thue')) {
            await pool.query(`
                ALTER TABLE employees
                    ADD COLUMN tinh_thue VARCHAR(50)
            `);
            await pool.query(`
                COMMENT ON COLUMN employees.tinh_thue IS 'Tính thuế (VD: Có, Không)'
            `);
        }

        if (!existingColumns.has('cap_bac')) {
            await pool.query(`
                ALTER TABLE employees
                    ADD COLUMN cap_bac VARCHAR(255)
            `);
            await pool.query(`
                COMMENT ON COLUMN employees.cap_bac IS 'Cấp bậc của nhân viên'
            `);
        }

        // Tạo index cho mã chấm công
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_employees_ma_cham_cong 
            ON employees(ma_cham_cong) 
            WHERE ma_cham_cong IS NOT NULL
        `);
    })().catch((error) => {
        ensureAdditionalFieldsPromise = null;
        console.error('Error ensuring additional fields exist:', error);
        throw error;
    });

    return ensureAdditionalFieldsPromise;
};

/**
 * POST /api/employees/bulk - Tạo nhiều nhân viên từ danh sách
 */
router.post('/bulk', async (req, res) => {
    const client = await pool.connect();
    try {
        const { employees } = req.body; // Array of employee objects

        if (!Array.isArray(employees) || employees.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Danh sách nhân viên không hợp lệ'
            });
        }

        // Đảm bảo tất cả các cột cần thiết đều tồn tại
        await ensureChiNhanhColumn();
        await ensurePhongBanConstraintDropped();
        await ensureManagerColumns();
        await ensureAdditionalFields();

        // Kiểm tra lại các cột trước khi insert
        const checkColumnsQuery = `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'employees'
              AND table_schema = 'public'
              AND column_name IN (
                'ma_nhan_vien', 'ma_cham_cong', 'ho_ten', 'chuc_danh', 
                'phong_ban', 'bo_phan', 'chi_nhanh', 'ngay_gia_nhap',
                'loai_hop_dong', 'dia_diem', 'tinh_thue', 'cap_bac',
                'email', 'password', 'quan_ly_truc_tiep', 'quan_ly_gian_tiep', 'trang_thai'
              )
            ORDER BY column_name
        `;
        const columnsCheck = await pool.query(checkColumnsQuery);
        const existingColumns = new Set(columnsCheck.rows.map(r => r.column_name));
        const requiredColumns = [
            'ma_nhan_vien', 'ma_cham_cong', 'ho_ten', 'chuc_danh',
            'phong_ban', 'bo_phan', 'chi_nhanh', 'ngay_gia_nhap',
            'loai_hop_dong', 'dia_diem', 'tinh_thue', 'cap_bac',
            'email', 'password', 'quan_ly_truc_tiep', 'quan_ly_gian_tiep', 'trang_thai'
        ];
        const missingColumns = requiredColumns.filter(col => !existingColumns.has(col));

        if (missingColumns.length > 0) {
            console.error('[BulkImport] ❌ Missing columns:', missingColumns);
            return res.status(500).json({
                success: false,
                message: `Thiếu các cột trong database: ${missingColumns.join(', ')}. Vui lòng chạy migration script trước.`
            });
        }

        await client.query('BEGIN');

        const results = {
            success: [],
            failed: [],
            placeholders: []
        };

        for (let index = 0; index < employees.length; index++) {
            const empData = employees[index];
            const savepointName = `sp_employee_${index}`;

            if (index < 3) {
                console.log('[BulkImport] Incoming employee', index + 1, empData);
            }

            // Create savepoint for this employee
            try {
                await client.query(`SAVEPOINT ${savepointName}`);
            } catch (spError) {
                console.error(`[BulkImport] Error creating savepoint for employee ${index + 1}:`, spError.message);
                results.failed.push({
                    data: empData,
                    error: 'Lỗi khi tạo savepoint: ' + spError.message
                });
                continue;
            }

            try {
                const {
                    maNhanVien,
                    maChamCong,
                    hoTen,
                    chucDanh,
                    phongBan,
                    boPhan,
                    ngayGiaNhap,
                    loaiHopDong,
                    diaDiem,
                    tinhThue,
                    capBac,
                    email,
                    chiNhanh,
                    quanLyTrucTiep,
                    quanLyGianTiep
                } = empData;

                // Validation
                if (!hoTen || !hoTen.trim() || !phongBan || !phongBan.trim()) {
                    const missingFields = [];
                    if (!hoTen || !hoTen.trim()) missingFields.push('Họ tên');
                    if (!phongBan || !phongBan.trim()) missingFields.push('Phòng ban');

                    if (index < 5) {
                        console.log(`[BulkImport] Validation failed for employee ${index + 1}:`, {
                            hoTen: hoTen,
                            phongBan: phongBan,
                            missingFields: missingFields,
                            fullData: empData
                        });
                    }

                    results.failed.push({
                        data: empData,
                        error: `Thiếu thông tin bắt buộc: ${missingFields.join(', ')}`
                    });
                    continue;
                }

                // Trim values to ensure no empty strings
                const finalPhongBan = sanitizeDepartment(phongBan);
                const finalBoPhan = sanitizeDepartment(boPhan);
                const finalChiNhanh = chiNhanh && chiNhanh.trim() !== '' ? chiNhanh.trim() : null;
                const finalEmail = email && email.trim() !== '' ? email.trim() : null;
                const finalChucDanh = chucDanh && chucDanh.trim() !== '' ? chucDanh.trim() : null;
                const finalNgayGiaNhap = ngayGiaNhap && String(ngayGiaNhap).trim() !== ''
                    ? String(ngayGiaNhap).trim()
                    : null;
                const finalQuanLyTrucTiep = quanLyTrucTiep && quanLyTrucTiep.trim() !== '' ? quanLyTrucTiep.trim() : null;
                const finalQuanLyGianTiep = quanLyGianTiep && quanLyGianTiep.trim() !== '' ? quanLyGianTiep.trim() : null;
                const finalMaChamCong = maChamCong && maChamCong.trim() !== '' ? maChamCong.trim() : null;
                const finalLoaiHopDong = loaiHopDong && loaiHopDong.trim() !== '' ? loaiHopDong.trim() : null;
                const finalDiaDiem = diaDiem && diaDiem.trim() !== '' ? diaDiem.trim() : null;
                const finalTinhThue = tinhThue && tinhThue.trim() !== '' ? tinhThue.trim() : null;
                const finalCapBac = capBac && capBac.trim() !== '' ? capBac.trim() : null;

                // Check email uniqueness (case-insensitive)
                if (finalEmail) {
                    const checkEmailResult = await client.query(`
                        SELECT id FROM employees 
                        WHERE LOWER(email) = LOWER($1) 
                        AND email IS NOT NULL 
                        AND email != ''
                        AND (trang_thai = 'ACTIVE' OR trang_thai IS NULL)
                    `, [finalEmail]);

                    if (checkEmailResult.rows.length > 0) {
                        results.failed.push({
                            data: empData,
                            error: 'Email đã tồn tại trong hệ thống'
                        });
                        continue;
                    }
                }

                // Check mã nhân viên uniqueness
                if (maNhanVien && maNhanVien.trim() !== '') {
                    const checkMaNVResult = await client.query(`
                        SELECT id FROM employees 
                        WHERE ma_nhan_vien = $1 
                        AND ma_nhan_vien IS NOT NULL 
                        AND ma_nhan_vien != ''
                        AND (trang_thai = 'ACTIVE' OR trang_thai IS NULL)
                    `, [maNhanVien.trim()]);

                    if (checkMaNVResult.rows.length > 0) {
                        results.failed.push({
                            data: empData,
                            error: 'Mã nhân viên đã tồn tại'
                        });
                        continue;
                    }
                }

                // Clean up inactive records
                if (finalEmail) {
                    await client.query(`
                        DELETE FROM employees 
                        WHERE LOWER(email) = LOWER($1) 
                        AND email IS NOT NULL 
                        AND email != ''
                        AND (trang_thai != 'ACTIVE' OR trang_thai IS NULL)
                    `, [finalEmail]);
                }

                if (maNhanVien && maNhanVien.trim() !== '') {
                    await client.query(`
                        DELETE FROM employees 
                        WHERE ma_nhan_vien = $1 
                        AND ma_nhan_vien IS NOT NULL 
                        AND ma_nhan_vien != ''
                        AND (trang_thai != 'ACTIVE' OR trang_thai IS NULL)
                    `, [maNhanVien.trim()]);
                }

                // Hash password mặc định
                const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

                // Insert employee with PENDING status (chờ cập nhật vật dụng)
                // Đảm bảo số lượng cột và giá trị khớp nhau
                const insertQuery = `
                    INSERT INTO employees (
                        ma_nhan_vien,
                        ma_cham_cong,
                        ho_ten, 
                        chuc_danh, 
                        phong_ban, 
                        bo_phan, 
                        chi_nhanh, 
                        ngay_gia_nhap,
                        loai_hop_dong,
                        dia_diem,
                        tinh_thue,
                        cap_bac,
                        email, 
                        password, 
                        quan_ly_truc_tiep, 
                        quan_ly_gian_tiep, 
                        trang_thai
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                    RETURNING id, ma_nhan_vien, ho_ten, email
                `;

                const insertResult = await client.query(insertQuery, [
                    maNhanVien && maNhanVien.trim() ? maNhanVien.trim() : null,
                    finalMaChamCong,
                    hoTen.trim(),
                    finalChucDanh,
                    finalPhongBan,
                    finalBoPhan,
                    finalChiNhanh,
                    finalNgayGiaNhap,
                    finalLoaiHopDong,
                    finalDiaDiem,
                    finalTinhThue,
                    finalCapBac,
                    finalEmail,
                    hashedPassword,
                    finalQuanLyTrucTiep,
                    finalQuanLyGianTiep,
                    'PENDING'  // trang_thai
                ]);

                if (index < 3) {
                    console.log(`[BulkImport] ✅ Successfully inserted employee ${index + 1}:`, {
                        id: insertResult.rows[0].id,
                        maNhanVien: insertResult.rows[0].ma_nhan_vien,
                        hoTen: insertResult.rows[0].ho_ten
                    });
                }

                results.success.push(insertResult.rows[0]);

            } catch (error) {
                // Rollback to savepoint to continue with next employee
                try {
                    await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
                } catch (rollbackError) {
                    console.error(`[BulkImport] Error rolling back to savepoint for employee ${index + 1}:`, rollbackError.message);
                }

                // Enhanced error logging
                const errorInfo = {
                    code: error.code,
                    constraint: error.constraint,
                    detail: error.detail,
                    message: error.message,
                    table: error.table,
                    column: error.column
                };

                console.error(`[BulkImport] ❌ Error importing employee ${index + 1} (${empData.hoTen || empData.maNhanVien || 'N/A'}):`, error.message);

                if (index < 10 || error.code) {
                    console.error(`[BulkImport] Employee data:`, {
                        maNhanVien: empData.maNhanVien,
                        hoTen: empData.hoTen,
                        phongBan: empData.phongBan,
                        email: empData.email
                    });
                    console.error(`[BulkImport] Error details:`, errorInfo);
                }

                // Create user-friendly error message
                let userFriendlyError = error.message;
                if (error.code === '23505') { // Unique violation
                    if (error.constraint && error.constraint.includes('email')) {
                        userFriendlyError = 'Email đã tồn tại trong hệ thống';
                    } else if (error.constraint && error.constraint.includes('ma_nhan_vien')) {
                        userFriendlyError = 'Mã nhân viên đã tồn tại';
                    } else {
                        userFriendlyError = 'Dữ liệu trùng lặp: ' + (error.detail || error.message);
                    }
                } else if (error.code === '23502') { // Not null violation
                    userFriendlyError = 'Thiếu dữ liệu bắt buộc: ' + (error.column || '');
                } else if (error.code === '23503') { // Foreign key violation
                    userFriendlyError = 'Dữ liệu tham chiếu không hợp lệ: ' + (error.detail || error.message);
                } else if (error.code === '22007' || error.code === '22008') { // Invalid date/time
                    userFriendlyError = 'Định dạng ngày tháng không hợp lệ';
                }

                results.failed.push({
                    data: empData,
                    error: userFriendlyError
                });
            } finally {
                // Release savepoint
                try {
                    await client.query(`RELEASE SAVEPOINT ${savepointName}`);
                } catch (releaseError) {
                    // Ignore if savepoint was already released or doesn't exist
                }
            }
        }

        await client.query('COMMIT');

        console.log(`[BulkImport] ✅ Transaction committed. Success: ${results.success.length}, Failed: ${results.failed.length}`);

        res.json({
            success: true,
            message: `Đã import ${results.success.length} nhân viên thành công, ${results.failed.length} nhân viên thất bại`,
            data: {
                success: results.success,
                failed: results.failed,
                total: employees.length,
                successCount: results.success.length,
                failedCount: results.failed.length,
                placeholders: results.placeholders
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[BulkImport] ❌ Transaction rolled back due to error:', error);
        console.error('[BulkImport] Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        res.status(500).json({
            success: false,
            message: 'Lỗi khi import nhân viên: ' + error.message
        });
    } finally {
        client.release();
    }
});

/**
 * GET /api/employees - Lấy danh sách nhân viên
 */
router.get('/', async (req, res) => {
    try {
        await ensureChiNhanhColumn();
        await ensurePhongBanConstraintDropped();
        await ensureManagerColumns();
        await ensureAdditionalFields();

        const query = `
            SELECT 
                id, 
                ma_nhan_vien,
                ma_cham_cong,
                ho_ten, 
                chuc_danh, 
                phong_ban, 
                bo_phan, 
                chi_nhanh,
                ngay_gia_nhap, 
                loai_hop_dong,
                dia_diem,
                tinh_thue,
                cap_bac,
                email, 
                quan_ly_truc_tiep,
                quan_ly_gian_tiep,
                trang_thai,
                created_at,
                updated_at
            FROM employees 
            WHERE trang_thai IN ('ACTIVE', 'PENDING')
            ORDER BY created_at DESC
        `;

        const result = await pool.query(query);

        res.json({
            success: true,
            message: 'Danh sách nhân viên',
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách nhân viên: ' + error.message
        });
    }
});

/**
 * GET /api/employees/departments - Lấy danh sách phòng ban (DISTINCT)
 */
router.get('/departments', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT TRIM(phong_ban) as department
            FROM employees
            WHERE phong_ban IS NOT NULL AND TRIM(phong_ban) != ''
            ORDER BY TRIM(phong_ban) ASC
        `;
        const result = await pool.query(query);

        // Loại bỏ duplicate và normalize dữ liệu
        const departments = result.rows
            .map(row => row.department ? String(row.department).trim() : '')
            .filter(dept => dept !== '')
            .filter((dept, index, self) => {
                // Loại bỏ duplicate (case-insensitive)
                return self.findIndex(d => d.toLowerCase() === dept.toLowerCase()) === index;
            })
            .sort();

        res.json({
            success: true,
            data: departments
        });
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách phòng ban: ' + error.message
        });
    }
});

/**
 * GET /api/employees/bo-phan - Lấy danh sách bộ phận (DISTINCT)
 * Phải đặt trước route /:id để tránh conflict
 */
router.get('/bo-phan', async (req, res) => {
    try {
        // Kiểm tra tổng số employees trước
        const countResult = await pool.query('SELECT COUNT(*) as total FROM employees');
        console.log(`[API] GET /bo-phan: Total employees in DB: ${countResult.rows[0].total}`);

        // Debug: Kiểm tra tất cả giá trị bo_phan (không filter)
        const debugQuery = `
            SELECT bo_phan, COUNT(*) as count
            FROM employees
            GROUP BY bo_phan
            ORDER BY count DESC
            LIMIT 10
        `;
        const debugResult = await pool.query(debugQuery);
        console.log(`[API] GET /bo-phan: Debug - All bo_phan values (top 10):`, debugResult.rows);

        // Kiểm tra số lượng có bo_phan
        const withBoPhanResult = await pool.query(`
            SELECT COUNT(*) as total 
            FROM employees 
            WHERE bo_phan IS NOT NULL AND bo_phan != ''
        `);
        console.log(`[API] GET /bo-phan: Employees with bo_phan (not null and not empty): ${withBoPhanResult.rows[0].total}`);

        // Kiểm tra số lượng có bo_phan không null (kể cả empty string)
        const withBoPhanNotNullResult = await pool.query(`
            SELECT COUNT(*) as total 
            FROM employees 
            WHERE bo_phan IS NOT NULL
        `);
        console.log(`[API] GET /bo-phan: Employees with bo_phan (not null, including empty): ${withBoPhanNotNullResult.rows[0].total}`);

        // Query đơn giản - chỉ filter NULL và empty string
        // Không dùng TRIM trong WHERE để tránh loại bỏ dữ liệu hợp lệ
        // Dùng quotes cho alias để giữ nguyên case
        const query = `
            SELECT DISTINCT bo_phan as "boPhan"
            FROM employees
            WHERE bo_phan IS NOT NULL 
              AND bo_phan != ''
            ORDER BY bo_phan ASC
        `;
        const result = await pool.query(query);
        console.log(`[API] GET /bo-phan: Query returned ${result.rows.length} rows`);

        if (result.rows.length > 0) {
            console.log(`[API] GET /bo-phan: Sample rows (first 5):`, result.rows.slice(0, 5));
            console.log(`[API] GET /bo-phan: First row structure:`, JSON.stringify(result.rows[0], null, 2));
            console.log(`[API] GET /bo-phan: First row keys:`, Object.keys(result.rows[0]));
        } else {
            console.warn(`[API] GET /bo-phan: ⚠️ Query returned 0 rows!`);
            console.warn(`[API] GET /bo-phan: Debug query result:`, debugResult.rows);
        }

        const finalResult = result;

        console.log(`[API] GET /bo-phan: finalResult.rows.length: ${finalResult.rows.length}`);
        if (finalResult.rows.length > 0) {
            console.log(`[API] GET /bo-phan: First row before mapping:`, finalResult.rows[0]);
            console.log(`[API] GET /bo-phan: First row keys:`, Object.keys(finalResult.rows[0]));
            console.log(`[API] GET /bo-phan: First row.boPhan:`, finalResult.rows[0].boPhan);
            console.log(`[API] GET /bo-phan: First row.bo_phan:`, finalResult.rows[0].bo_phan);
        }

        // PostgreSQL trả về key với case như trong alias (nếu dùng quotes)
        // Nhưng có thể trả về lowercase nếu không dùng quotes
        console.log(`[API] GET /bo-phan: Processing ${finalResult.rows.length} rows`);
        if (finalResult.rows.length > 0) {
            console.log(`[API] GET /bo-phan: First row keys:`, Object.keys(finalResult.rows[0]));
            console.log(`[API] GET /bo-phan: First row full:`, finalResult.rows[0]);
        }

        // Map dữ liệu từ PostgreSQL result
        // PostgreSQL với quotes trong alias sẽ trả về key đúng case: "boPhan"
        // Nhưng để an toàn, thử tất cả các biến thể
        const boPhanList = finalResult.rows
            .map((row, index) => {
                // Lấy tất cả keys trong row
                const keys = Object.keys(row);

                // Thử tất cả các biến thể có thể có (với quotes, PostgreSQL giữ nguyên case)
                let value = row.boPhan || row.bophan || row.bo_phan ||
                    row['boPhan'] || row['bophan'] || row['bo_phan'] ||
                    row['BoPhan'] || row['Bo_Phan'] || row['BO_PHAN'];

                // Nếu vẫn không tìm thấy, lấy giá trị đầu tiên trong object
                if (!value && keys.length > 0) {
                    value = row[keys[0]];
                    console.log(`[API] GET /bo-phan: Row ${index} - Using first key "${keys[0]}" with value:`, value);
                }

                // Log chi tiết cho 5 rows đầu để debug
                if (index < 5) {
                    console.log(`[API] GET /bo-phan: Row ${index}:`, {
                        keys: keys,
                        allValues: keys.map(k => ({ key: k, value: row[k] })),
                        selectedValue: value,
                        valueType: typeof value
                    });
                }

                return value;
            })
            .filter(bp => {
                // Filter: loại bỏ null, undefined, và empty string (sau khi trim)
                const isValid = bp != null && bp !== undefined && String(bp).trim() !== '';
                if (!isValid && finalResult.rows.length <= 10) {
                    console.log(`[API] GET /bo-phan: Filtered out value:`, bp);
                }
                return isValid;
            })
            .map(bp => String(bp).trim())
            .filter((bp, index, self) => {
                // Remove duplicates
                const isDuplicate = self.indexOf(bp) !== index;
                if (isDuplicate && finalResult.rows.length <= 10) {
                    console.log(`[API] GET /bo-phan: Removed duplicate:`, bp);
                }
                return !isDuplicate;
            });

        console.log(`[API] GET /bo-phan: After cleaning: ${boPhanList.length} distinct bo phan values`);
        if (boPhanList.length > 0) {
            console.log(`[API] GET /bo-phan: Sample:`, boPhanList.slice(0, 5));
        } else {
            console.warn(`[API] GET /bo-phan: ⚠️ No bo phan data found after cleaning!`);
            console.warn(`[API] GET /bo-phan: Raw rows:`, finalResult.rows.slice(0, 3));
        }

        res.json({
            success: true,
            data: boPhanList
        });
    } catch (error) {
        console.error('[API] GET /bo-phan: Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách bộ phận: ' + error.message
        });
    }
});

/**
 * GET /api/employees/job-titles - Lấy danh sách chức danh (DISTINCT)
 * Phải đặt trước route /:id để tránh conflict
 */
router.get('/job-titles', async (req, res) => {
    try {
        // Lấy tất cả chức danh từ database và normalize ngay trong SQL
        const query = `
            SELECT 
                REGEXP_REPLACE(
                    REGEXP_REPLACE(
                        TRIM(chuc_danh),
                        '\\s+', ' ', 'g'
                    ),
                    '[\\u00A0\\u2000-\\u200B\\u202F\\u205F\\u3000\\uFEFF]', ' ', 'g'
                ) as job_title
            FROM employees
            WHERE chuc_danh IS NOT NULL AND TRIM(chuc_danh) != ''
        `;
        console.log('[GET /api/employees/job-titles] Executing query...');
        const result = await pool.query(query);
        console.log(`[GET /api/employees/job-titles] Found ${result.rows.length} raw job titles`);

        // Loại bỏ duplicate và normalize dữ liệu
        const seen = new Set();
        const jobTitlesMap = new Map(); // Map để lưu giá trị đã normalize

        for (const row of result.rows) {
            if (!row.job_title) continue;

            // Normalize: chuẩn hóa về NFC trước, sau đó loại bỏ khoảng trắng thừa
            let normalized = String(row.job_title)
                .normalize('NFC') // Chuẩn hóa về NFC (composed form) - dấu tích hợp vào ký tự
                .trim()
                .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ') // Loại bỏ các loại khoảng trắng đặc biệt
                .replace(/\s+/g, ' ') // Thay nhiều khoảng trắng thành 1 khoảng
                .trim();

            if (!normalized) continue;

            // Tạo key để so sánh (lowercase, normalize về NFC, loại bỏ dấu)
            const key = normalized
                .toLowerCase()
                .normalize('NFC') // Đảm bảo cùng form
                .normalize('NFD') // Decompose để loại bỏ dấu
                .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu
                .replace(/[^a-z0-9]/g, '') // Chỉ giữ chữ và số
                .trim();

            // Chỉ thêm nếu chưa thấy (so sánh bằng key)
            if (!seen.has(key)) {
                seen.add(key);
                jobTitlesMap.set(key, normalized); // Lưu giá trị đã normalize
            }
        }

        // Chuyển Map thành mảng và sắp xếp
        const jobTitles = Array.from(jobTitlesMap.values());
        jobTitles.sort((a, b) => a.localeCompare(b, 'vi'));

        // Debug: Kiểm tra các giá trị có thể bị duplicate
        const debugDuplicates = [];
        const checkSeen = new Set();
        jobTitles.forEach(title => {
            const checkKey = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
            if (checkSeen.has(checkKey)) {
                debugDuplicates.push(title);
            }
            checkSeen.add(checkKey);
        });

        if (debugDuplicates.length > 0) {
            console.warn('[GET /api/employees/job-titles] Found potential duplicates after processing:', debugDuplicates);
        }

        console.log(`[GET /api/employees/job-titles] Returning ${jobTitles.length} unique job titles:`, jobTitles.slice(0, 10));
        res.json({
            success: true,
            data: jobTitles
        });
    } catch (error) {
        console.error('[GET /api/employees/job-titles] Error:', error);
        console.error('[GET /api/employees/job-titles] Error details:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách chức danh: ' + error.message
        });
    }
});

/**
 * GET /api/employees/branches - Lấy danh sách chi nhánh (DISTINCT)
 * Phải đặt trước route /:id để tránh conflict
 */
router.get('/branches', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT chi_nhanh as branch
            FROM employees
            WHERE chi_nhanh IS NOT NULL AND chi_nhanh != ''
            ORDER BY chi_nhanh ASC
        `;
        const result = await pool.query(query);
        res.json({
            success: true,
            data: result.rows.map(row => row.branch)
        });
    } catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách chi nhánh: ' + error.message
        });
    }
});

/**
 * GET /api/employees/contract-types - Lấy danh sách loại hợp đồng (DISTINCT)
 * Phải đặt trước route /:id để tránh conflict
 */
router.get('/contract-types', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT loai_hop_dong as contract_type
            FROM employees
            WHERE loai_hop_dong IS NOT NULL AND loai_hop_dong != ''
            ORDER BY loai_hop_dong ASC
        `;
        const result = await pool.query(query);
        res.json({
            success: true,
            data: result.rows.map(row => row.contract_type)
        });
    } catch (error) {
        console.error('Error fetching contract types:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách loại hợp đồng: ' + error.message
        });
    }
});

/**
 * GET /api/employees/locations - Lấy danh sách địa điểm (DISTINCT)
 * Phải đặt trước route /:id để tránh conflict
 */
router.get('/locations', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT dia_diem as location
            FROM employees
            WHERE dia_diem IS NOT NULL AND dia_diem != ''
            ORDER BY dia_diem ASC
        `;
        const result = await pool.query(query);
        res.json({
            success: true,
            data: result.rows.map(row => row.location)
        });
    } catch (error) {
        console.error('Error fetching locations:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách địa điểm: ' + error.message
        });
    }
});

/**
 * GET /api/employees/tax-statuses - Lấy danh sách tính thuế (DISTINCT)
 * Phải đặt trước route /:id để tránh conflict
 */
router.get('/tax-statuses', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT tinh_thue as tax_status
            FROM employees
            WHERE tinh_thue IS NOT NULL AND tinh_thue != ''
            ORDER BY tinh_thue ASC
        `;
        const result = await pool.query(query);
        res.json({
            success: true,
            data: result.rows.map(row => row.tax_status)
        });
    } catch (error) {
        console.error('Error fetching tax statuses:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách tính thuế: ' + error.message
        });
    }
});

/**
 * GET /api/employees/ranks - Lấy danh sách cấp bậc (DISTINCT)
 * Phải đặt trước route /:id để tránh conflict
 */
router.get('/ranks', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT cap_bac as rank
            FROM employees
            WHERE cap_bac IS NOT NULL AND cap_bac != ''
            ORDER BY cap_bac ASC
        `;
        const result = await pool.query(query);
        res.json({
            success: true,
            data: result.rows.map(row => row.rank)
        });
    } catch (error) {
        console.error('Error fetching ranks:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách cấp bậc: ' + error.message
        });
    }
});

/**
 * GET /api/employees/managers - Lấy danh sách quản lý trực tiếp (từ cột quan_ly_truc_tiep)
 * Phải đặt trước route /:id để tránh conflict
 */
router.get('/managers', async (req, res) => {
    try {
        // Lấy DISTINCT từ cột quan_ly_truc_tiep, normalize ngay trong SQL
        const query = `
            SELECT DISTINCT 
                TRIM(REGEXP_REPLACE(quan_ly_truc_tiep, '\\s+', ' ', 'g')) as manager_name
            FROM employees
            WHERE quan_ly_truc_tiep IS NOT NULL 
              AND TRIM(quan_ly_truc_tiep) != ''
              AND TRIM(quan_ly_truc_tiep) != 'Chưa cập nhật'
            ORDER BY manager_name ASC
        `;

        try {
            const result = await pool.query(query);
            // Normalize và loại bỏ duplicate: trim, normalize whitespace, case-insensitive
            const managerSet = new Set();
            const managers = [];
            const seenNames = new Map(); // Map để lưu normalized -> original name (giữ format đẹp nhất)

            for (const row of result.rows) {
                const name = row.manager_name;
                if (!name) continue;

                // Normalize mạnh mẽ hơn: trim, normalize whitespace, loại bỏ ký tự đặc biệt thừa
                const normalized = String(name)
                    .trim()
                    .replace(/\s+/g, ' ') // Nhiều space thành 1 space
                    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Loại bỏ zero-width characters
                    .trim();

                if (!normalized || normalized === '') continue;

                // Case-insensitive và normalize unicode để so sánh
                const lowerNormalized = normalized.toLowerCase()
                    .normalize('NFD') // Decompose unicode
                    .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu để so sánh
                    .replace(/đ/g, 'd')
                    .replace(/Đ/g, 'd');

                // Chỉ thêm nếu chưa có
                if (!managerSet.has(lowerNormalized)) {
                    managerSet.add(lowerNormalized);
                    // Giữ format đẹp nhất (ưu tiên format có chữ hoa đúng)
                    if (!seenNames.has(lowerNormalized) ||
                        (normalized[0] === normalized[0].toUpperCase() && seenNames.get(lowerNormalized)[0] !== seenNames.get(lowerNormalized)[0].toUpperCase())) {
                        seenNames.set(lowerNormalized, normalized);
                    }
                }
            }

            // Lấy danh sách từ seenNames và sort
            const uniqueManagers = Array.from(seenNames.values());
            uniqueManagers.sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));

            console.log(`✅ Fetched ${uniqueManagers.length} unique managers from quan_ly_truc_tiep column (from ${result.rows.length} rows)`);
            res.json({
                success: true,
                data: uniqueManagers
            });
        } catch (dbError) {
            if (dbError.code === '42P01' || dbError.code === '42703') {
                console.warn('⚠️ Employees table or columns not found, returning empty array:', dbError.message);
                res.json({
                    success: true,
                    data: []
                });
            } else {
                throw dbError;
            }
        }
    } catch (error) {
        console.error('❌ Error fetching managers:', error);
        res.json({
            success: true,
            data: [],
            warning: 'Không thể tải danh sách quản lý: ' + error.message
        });
    }
});

/**
 * GET /api/employees/indirect-managers - Get list of indirect managers (quan_ly_gian_tiep)
 */
router.get('/indirect-managers', async (req, res) => {
    try {
        // Lấy DISTINCT từ cột quan_ly_gian_tiep, normalize ngay trong SQL
        const query = `
            SELECT DISTINCT 
                TRIM(REGEXP_REPLACE(quan_ly_gian_tiep, '\\s+', ' ', 'g')) as manager_name
            FROM employees
            WHERE quan_ly_gian_tiep IS NOT NULL 
              AND TRIM(quan_ly_gian_tiep) != ''
              AND TRIM(quan_ly_gian_tiep) != 'Chưa cập nhật'
            ORDER BY manager_name ASC
        `;

        try {
            const result = await pool.query(query);
            // Normalize và loại bỏ duplicate: trim, normalize whitespace, case-insensitive
            const managerSet = new Set();
            const managers = [];
            const seenNames = new Map(); // Map để lưu normalized -> original name (giữ format đẹp nhất)

            for (const row of result.rows) {
                const name = row.manager_name;
                if (!name) continue;

                // Normalize mạnh mẽ hơn: trim, normalize whitespace, loại bỏ ký tự đặc biệt thừa
                const normalized = String(name)
                    .trim()
                    .replace(/\s+/g, ' ') // Nhiều space thành 1 space
                    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Loại bỏ zero-width characters
                    .trim();

                if (!normalized || normalized === '') continue;

                // Case-insensitive và normalize unicode để so sánh
                const lowerNormalized = normalized.toLowerCase()
                    .normalize('NFD') // Decompose unicode
                    .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu để so sánh
                    .replace(/đ/g, 'd')
                    .replace(/Đ/g, 'd');

                // Chỉ thêm nếu chưa có
                if (!managerSet.has(lowerNormalized)) {
                    managerSet.add(lowerNormalized);
                    // Giữ format đẹp nhất (ưu tiên format có chữ hoa đúng)
                    if (!seenNames.has(lowerNormalized) ||
                        (normalized[0] === normalized[0].toUpperCase() && seenNames.get(lowerNormalized)[0] !== seenNames.get(lowerNormalized)[0].toUpperCase())) {
                        seenNames.set(lowerNormalized, normalized);
                    }
                }
            }

            // Lấy danh sách từ seenNames và sort
            const uniqueManagers = Array.from(seenNames.values());
            uniqueManagers.sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));

            console.log(`✅ Fetched ${uniqueManagers.length} unique indirect managers from quan_ly_gian_tiep column (from ${result.rows.length} rows)`);
            res.json({
                success: true,
                data: uniqueManagers
            });
        } catch (dbError) {
            if (dbError.code === '42P01' || dbError.code === '42703') {
                console.warn('⚠️ Employees table or columns not found, returning empty array:', dbError.message);
                res.json({
                    success: true,
                    data: []
                });
            } else {
                throw dbError;
            }
        }
    } catch (error) {
        console.error('❌ Error fetching indirect managers:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách quản lý gián tiếp: ' + error.message
        });
    }
});

/**
 * GET /api/employees/:id - Lấy thông tin một nhân viên theo ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const numericId = parseInt(id, 10);

        if (isNaN(numericId) || numericId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ID nhân viên không hợp lệ'
            });
        }

        await ensureChiNhanhColumn();
        await ensurePhongBanConstraintDropped();
        await ensureManagerColumns();
        await ensureAdditionalFields();

        const query = `
            SELECT 
                id, 
                ma_nhan_vien,
                ma_cham_cong,
                ho_ten, 
                chuc_danh, 
                phong_ban, 
                bo_phan, 
                chi_nhanh,
                ngay_gia_nhap,
                loai_hop_dong,
                dia_diem,
                tinh_thue,
                cap_bac,
                email, 
                quan_ly_truc_tiep,
                quan_ly_gian_tiep,
                trang_thai,
                created_at,
                updated_at
            FROM employees 
            WHERE id = $1
            AND trang_thai IN ('ACTIVE', 'PENDING')
        `;

        const result = await pool.query(query, [numericId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên'
            });
        }

        res.json({
            success: true,
            message: 'Thông tin nhân viên',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin nhân viên: ' + error.message
        });
    }
});

/**
 * POST /api/employees - Tạo nhân viên mới
 */
router.post('/', async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            maNhanVien,
            maChamCong,
            hoTen,
            chucDanh,
            phongBan,
            boPhan,
            chiNhanh,
            ngayGiaNhap,
            loaiHopDong,
            diaDiem,
            tinhThue,
            capBac,
            email,
            quanLyTrucTiep,
            quanLyGianTiep
        } = req.body;

        await ensureChiNhanhColumn();
        await ensurePhongBanConstraintDropped();
        await ensureManagerColumns();
        await ensureAdditionalFields();

        // Validate input
        const required = ['hoTen', 'chucDanh', 'phongBan', 'boPhan', 'ngayGiaNhap'];
        for (const field of required) {
            if (!req.body[field]) {
                return res.status(400).json({
                    success: false,
                    message: `Thiếu thông tin: ${field}`
                });
            }
        }

        // Validate email format
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Email không hợp lệ'
                });
            }
        }

        // Validate phong_ban
        const sanitizedPhongBan = sanitizeDepartment(phongBan) || 'Chưa cập nhật';

        await client.query('BEGIN');

        // Check email đã tồn tại chưa (trong cả employees và users) - case-insensitive
        // Chỉ check employees có status ACTIVE hoặc không có status (backward compatibility)
        const checkEmailEmployeesQuery = `
            SELECT id, email, trang_thai FROM employees 
            WHERE LOWER(email) = LOWER($1) 
            AND email IS NOT NULL 
            AND email != ''
        `;
        const checkEmailEmployeesResult = await client.query(checkEmailEmployeesQuery, [email]);

        // Filter only ACTIVE employees (or NULL status for backward compatibility)
        const activeEmployees = checkEmailEmployeesResult.rows.filter(emp =>
            !emp.trang_thai || emp.trang_thai === 'ACTIVE'
        );

        if (email && activeEmployees.length > 0) {
            await client.query('ROLLBACK');
            console.log(`Email conflict in employees: ${email}`, activeEmployees);
            return res.status(400).json({
                success: false,
                message: 'Email đã tồn tại trong hệ thống'
            });
        }

        // Check email trong bảng users (case-insensitive)
        // Chỉ check users có status ACTIVE
        const checkEmailUsersQuery = `
            SELECT id, email, trang_thai FROM users 
            WHERE LOWER(email) = LOWER($1) 
            AND email IS NOT NULL 
            AND email != ''
        `;
        const checkEmailUsersResult = await client.query(checkEmailUsersQuery, [email]);

        // Filter only ACTIVE users (or NULL status for backward compatibility)
        const activeUsers = checkEmailUsersResult.rows.filter(user =>
            !user.trang_thai || user.trang_thai === 'ACTIVE'
        );

        if (email && activeUsers.length > 0) {
            await client.query('ROLLBACK');
            console.log(`Email conflict in users: ${email}`, activeUsers);
            return res.status(400).json({
                success: false,
                message: 'Email đã được sử dụng bởi tài khoản hệ thống'
            });
        }

        // Hash password mặc định
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        // Check mã nhân viên đã tồn tại chưa (nếu có nhập)
        // Chỉ kiểm tra các record có status ACTIVE
        if (maNhanVien && maNhanVien.trim() !== '') {
            const checkMaNVQuery = `
                SELECT id, ma_nhan_vien, trang_thai FROM employees 
                WHERE ma_nhan_vien = $1 
                AND ma_nhan_vien IS NOT NULL 
                AND ma_nhan_vien != ''
            `;
            const checkMaNVResult = await client.query(checkMaNVQuery, [maNhanVien.trim()]);

            // Filter only ACTIVE employees (or NULL status for backward compatibility)
            const activeEmployeesWithMaNV = checkMaNVResult.rows.filter(emp =>
                !emp.trang_thai || emp.trang_thai === 'ACTIVE'
            );

            if (activeEmployeesWithMaNV.length > 0) {
                await client.query('ROLLBACK');
                console.log(`Mã nhân viên conflict: ${maNhanVien.trim()}`, activeEmployeesWithMaNV);
                return res.status(400).json({
                    success: false,
                    message: 'Mã nhân viên đã tồn tại'
                });
            }

            // Clean up: Delete any employees with the same ma_nhan_vien that are not ACTIVE
            // This prevents unique constraint violation on ma_nhan_vien
            // We already checked that no ACTIVE employees have this ma_nhan_vien above
            await client.query(`
                DELETE FROM employees 
                WHERE ma_nhan_vien = $1 
                AND ma_nhan_vien IS NOT NULL 
                AND ma_nhan_vien != ''
                AND (trang_thai != 'ACTIVE' OR trang_thai IS NULL)
            `, [maNhanVien.trim()]);
        }

        // Clean up: Delete any employees with the same email that are not ACTIVE
        // This prevents unique constraint violation on email
        // We already checked that no ACTIVE employees have this email above
        if (email) {
            await client.query(`
                DELETE FROM employees 
                WHERE LOWER(email) = LOWER($1) 
                AND email IS NOT NULL 
                AND email != ''
                AND (trang_thai != 'ACTIVE' OR trang_thai IS NULL)
            `, [email]);
        }

        // Insert employee
        const insertQuery = `
            INSERT INTO employees (
                ma_nhan_vien,
                ma_cham_cong,
                ho_ten, 
                chuc_danh, 
                phong_ban, 
                bo_phan, 
                chi_nhanh,
                ngay_gia_nhap,
                loai_hop_dong,
                dia_diem,
                tinh_thue,
                cap_bac,
                email, 
                password,
                quan_ly_truc_tiep,
                quan_ly_gian_tiep,
                trang_thai
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'PENDING')
            RETURNING id, ma_nhan_vien, ma_cham_cong, ho_ten, chuc_danh, phong_ban, bo_phan, chi_nhanh, ngay_gia_nhap, loai_hop_dong, dia_diem, tinh_thue, cap_bac, email, quan_ly_truc_tiep, quan_ly_gian_tiep, trang_thai
        `;

        const insertResult = await client.query(insertQuery, [
            maNhanVien && maNhanVien.trim() !== '' ? maNhanVien.trim() : null,
            maChamCong && maChamCong.trim() !== '' ? maChamCong.trim() : null,
            hoTen.trim(),
            chucDanh.trim(),
            sanitizedPhongBan,
            boPhan.trim(),
            chiNhanh && chiNhanh.trim() !== '' ? chiNhanh.trim() : null,
            ngayGiaNhap || new Date().toISOString().split('T')[0],
            loaiHopDong && loaiHopDong.trim() !== '' ? loaiHopDong.trim() : null,
            diaDiem && diaDiem.trim() !== '' ? diaDiem.trim() : null,
            tinhThue && tinhThue.trim() !== '' ? tinhThue.trim() : null,
            capBac && capBac.trim() !== '' ? capBac.trim() : null,
            email && email.trim() !== '' ? email.trim() : null,
            hashedPassword,
            quanLyTrucTiep && quanLyTrucTiep.trim() !== '' ? quanLyTrucTiep.trim() : null,
            quanLyGianTiep && quanLyGianTiep.trim() !== '' ? quanLyGianTiep.trim() : null
        ]);

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Tạo nhân viên thành công',
            data: insertResult.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo nhân viên: ' + error.message
        });
    } finally {
        client.release();
    }
});

/**
 * PUT /api/employees/:id - Cập nhật thông tin nhân viên
 */
router.put('/:id', async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        const {
            hoTen,
            chucDanh,
            phongBan,
            boPhan,
            chiNhanh,
            ngayGiaNhap,
            maChamCong,
            loaiHopDong,
            diaDiem,
            tinhThue,
            capBac,
            email,
            quanLyTrucTiep,
            quanLyGianTiep,
            trang_thai
        } = req.body;

        await ensureChiNhanhColumn();
        await ensurePhongBanConstraintDropped();
        await ensureManagerColumns();
        await ensureAdditionalFields();

        // Check employee exists (allow ACTIVE or PENDING)
        const checkEmployeeQuery = 'SELECT id, trang_thai FROM employees WHERE id = $1';
        const checkEmployeeResult = await client.query(checkEmployeeQuery, [id]);

        if (checkEmployeeResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên'
            });
        }

        await client.query('BEGIN');

        const existingEmployee = checkEmployeeResult.rows[0];

        // Nếu chỉ cập nhật trạng thái (không có các trường khác)
        const hasOtherFields = (
            hoTen !== undefined ||
            chucDanh !== undefined ||
            phongBan !== undefined ||
            boPhan !== undefined ||
            chiNhanh !== undefined ||
            ngayGiaNhap !== undefined ||
            email !== undefined
        );

        if (trang_thai && !hasOtherFields) {
            // Validate trạng thái
            const validStatuses = ['ACTIVE', 'PENDING', 'INACTIVE'];
            if (!validStatuses.includes(trang_thai)) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Trạng thái không hợp lệ'
                });
            }

            const updateQuery = `
                UPDATE employees 
                SET trang_thai = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING id, ma_nhan_vien, ma_cham_cong, ho_ten, chuc_danh, phong_ban, bo_phan, chi_nhanh, ngay_gia_nhap, loai_hop_dong, dia_diem, tinh_thue, cap_bac, email, trang_thai
            `;

            const updateResult = await client.query(updateQuery, [trang_thai, id]);
            await client.query('COMMIT');

            return res.json({
                success: true,
                message: 'Cập nhật trạng thái nhân viên thành công',
                data: updateResult.rows[0]
            });
        }

        // Validate input cho cập nhật đầy đủ
        const required = ['hoTen', 'chucDanh', 'phongBan', 'boPhan', 'ngayGiaNhap'];
        for (const field of required) {
            if (!req.body[field]) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: `Thiếu thông tin: ${field}`
                });
            }
        }

        // Validate email format
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Email không hợp lệ'
                });
            }
        }

        // Validate phong_ban - chỉ kiểm tra không rỗng, cho phép bất kỳ giá trị nào từ database
        if (phongBan !== undefined && (!phongBan || !String(phongBan).trim())) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Phòng ban không được để trống'
            });
        }

        // Check email đã tồn tại chưa (trừ chính nhân viên này) - trong cả employees và users (case-insensitive)
        // Chỉ check employees có status ACTIVE
        const checkEmailEmployeesQuery = `
            SELECT id FROM employees 
            WHERE LOWER(email) = LOWER($1) 
            AND id != $2
            AND email IS NOT NULL 
            AND email != ''
            AND (trang_thai = 'ACTIVE' OR trang_thai IS NULL)
        `;
        const checkEmailEmployeesResult = await client.query(checkEmailEmployeesQuery, [email, id]);

        if (email && checkEmailEmployeesResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Email đã tồn tại trong hệ thống'
            });
        }

        // Check email trong bảng users (case-insensitive)
        // Chỉ check users có status ACTIVE
        const checkEmailUsersQuery = `
            SELECT id FROM users 
            WHERE LOWER(email) = LOWER($1) 
            AND email IS NOT NULL 
            AND email != ''
            AND (trang_thai = 'ACTIVE' OR trang_thai IS NULL)
        `;
        const checkEmailUsersResult = await client.query(checkEmailUsersQuery, [email]);

        if (email && checkEmailUsersResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Email đã được sử dụng bởi tài khoản hệ thống'
            });
        }

        // Update employee với tất cả các trường
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (hoTen) {
            updateFields.push(`ho_ten = $${paramIndex++}`);
            updateValues.push(hoTen);
        }
        if (chucDanh) {
            updateFields.push(`chuc_danh = $${paramIndex++}`);
            updateValues.push(chucDanh);
        }
        if (phongBan) {
            updateFields.push(`phong_ban = $${paramIndex++}`);
            updateValues.push(sanitizeDepartment(phongBan) || 'Chưa cập nhật');
        }
        if (boPhan) {
            updateFields.push(`bo_phan = $${paramIndex++}`);
            updateValues.push(boPhan);
        }
        if (chiNhanh !== undefined) {
            updateFields.push(`chi_nhanh = $${paramIndex++}`);
            updateValues.push(chiNhanh && chiNhanh.trim() !== '' ? chiNhanh.trim() : null);
        }
        if (ngayGiaNhap) {
            updateFields.push(`ngay_gia_nhap = $${paramIndex++}`);
            updateValues.push(ngayGiaNhap);
        }
        if (email) {
            updateFields.push(`email = $${paramIndex++}`);
            updateValues.push(email);
        }
        if (quanLyTrucTiep !== undefined) {
            updateFields.push(`quan_ly_truc_tiep = $${paramIndex++}`);
            updateValues.push(quanLyTrucTiep && quanLyTrucTiep.trim() !== '' ? quanLyTrucTiep.trim() : null);
        }
        if (quanLyGianTiep !== undefined) {
            updateFields.push(`quan_ly_gian_tiep = $${paramIndex++}`);
            updateValues.push(quanLyGianTiep && quanLyGianTiep.trim() !== '' ? quanLyGianTiep.trim() : null);
        }
        if (maChamCong !== undefined) {
            updateFields.push(`ma_cham_cong = $${paramIndex++}`);
            updateValues.push(maChamCong && maChamCong.trim() !== '' ? maChamCong.trim() : null);
        }
        if (loaiHopDong !== undefined) {
            updateFields.push(`loai_hop_dong = $${paramIndex++}`);
            updateValues.push(loaiHopDong && loaiHopDong.trim() !== '' ? loaiHopDong.trim() : null);
        }
        if (diaDiem !== undefined) {
            updateFields.push(`dia_diem = $${paramIndex++}`);
            updateValues.push(diaDiem && diaDiem.trim() !== '' ? diaDiem.trim() : null);
        }
        if (tinhThue !== undefined) {
            updateFields.push(`tinh_thue = $${paramIndex++}`);
            updateValues.push(tinhThue && tinhThue.trim() !== '' ? tinhThue.trim() : null);
        }
        if (capBac !== undefined) {
            updateFields.push(`cap_bac = $${paramIndex++}`);
            updateValues.push(capBac && capBac.trim() !== '' ? capBac.trim() : null);
        }
        if (trang_thai) {
            updateFields.push(`trang_thai = $${paramIndex++}`);
            updateValues.push(trang_thai);
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(id);

        const updateQuery = `
            UPDATE employees 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING id, ma_nhan_vien, ho_ten, chuc_danh, phong_ban, bo_phan, chi_nhanh, ngay_gia_nhap, email, quan_ly_truc_tiep, quan_ly_gian_tiep, trang_thai
        `;

        const updateResult = await client.query(updateQuery, updateValues);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Cập nhật nhân viên thành công',
            data: updateResult.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật nhân viên: ' + error.message
        });
    } finally {
        client.release();
    }
});


/**
 * POST /api/employees/bulk-delete - Xóa nhiều nhân viên cùng lúc (hard delete)
 * Using POST instead of DELETE to ensure request body is properly received
 */
router.post('/bulk-delete', async (req, res) => {
    const client = await pool.connect();

    try {
        const { ids } = req.body;
        console.log('[POST /employees/bulk-delete] Received request:', { body: req.body, ids });

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp danh sách ID nhân viên cần xóa'
            });
        }

        // Validate all IDs are numbers
        const validIds = ids.filter(id => {
            const numId = parseInt(id, 10);
            return !isNaN(numId) && numId > 0;
        }).map(id => parseInt(id, 10));

        if (validIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có ID hợp lệ'
            });
        }

        await client.query('BEGIN');

        // Get all employees to be deleted (for response)
        const employeesResult = await client.query(
            'SELECT id, ma_nhan_vien, ho_ten, email FROM employees WHERE id = ANY($1::int[])',
            [validIds]
        );

        if (employeesResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên nào'
            });
        }

        const employeesToDelete = employeesResult.rows;
        const employeeIds = employeesToDelete.map(emp => emp.id);
        const employeeEmails = employeesToDelete
            .map(emp => emp.email)
            .filter(email => email && email.trim() !== '');

        // Delete related records for all employees
        // 1. Delete equipment assignments
        await client.query('DELETE FROM equipment_assignments WHERE employee_id = ANY($1::int[])', [employeeIds]);

        // 2. Delete requests and related data
        const requestIdsResult = await client.query('SELECT id FROM requests WHERE employee_id = ANY($1::int[])', [employeeIds]);
        const requestIds = requestIdsResult.rows.map(row => row.id);

        if (requestIds.length > 0) {
            // Delete request_items for these requests
            await client.query('DELETE FROM request_items WHERE request_id = ANY($1::int[])', [requestIds]);
            // Delete requests
            await client.query('DELETE FROM requests WHERE employee_id = ANY($1::int[])', [employeeIds]);
        }

        // 3. Update or delete customer entertainment expense requests
        // Set NULL for foreign keys that reference these employees
        // Use SAVEPOINT to handle errors gracefully
        try {
            await client.query('SAVEPOINT before_customer_expense_update');
            await client.query(`
                UPDATE customer_entertainment_expense_requests 
                SET branch_director_id = NULL, 
                    manager_id = NULL, 
                    accountant_id = NULL, 
                    ceo_id = NULL, 
                    payment_processed_by = NULL
                WHERE branch_director_id = ANY($1::int[])
                   OR manager_id = ANY($1::int[])
                   OR accountant_id = ANY($1::int[])
                   OR ceo_id = ANY($1::int[])
                   OR payment_processed_by = ANY($1::int[])
            `, [employeeIds]);
            await client.query('RELEASE SAVEPOINT before_customer_expense_update');
        } catch (err) {
            await client.query('ROLLBACK TO SAVEPOINT before_customer_expense_update');
            await client.query('RELEASE SAVEPOINT before_customer_expense_update');
            console.log('[Bulk delete] Skipping customer_entertainment_expense_requests update:', err.message);
        }

        // 4. Update or delete travel expense requests
        // Set NULL for foreign keys that reference these employees
        try {
            await client.query('SAVEPOINT before_travel_expense_update');
            await client.query(`
                UPDATE travel_expense_requests 
                SET manager_id = NULL, 
                    ceo_id = NULL, 
                    finance_id = NULL, 
                    requested_by = NULL, 
                    budget_approved_by = NULL
                WHERE manager_id = ANY($1::int[])
                   OR ceo_id = ANY($1::int[])
                   OR finance_id = ANY($1::int[])
                   OR requested_by = ANY($1::int[])
                   OR budget_approved_by = ANY($1::int[])
            `, [employeeIds]);
            await client.query('RELEASE SAVEPOINT before_travel_expense_update');
        } catch (err) {
            await client.query('ROLLBACK TO SAVEPOINT before_travel_expense_update');
            await client.query('RELEASE SAVEPOINT before_travel_expense_update');
            console.log('[Bulk delete] Skipping travel_expense_requests update:', err.message);
        }

        // 5. Update recruitment requests
        // Only update columns that exist: created_by_employee_id, branch_director_id
        try {
            await client.query('SAVEPOINT before_recruitment_update');
            await client.query(`
                UPDATE recruitment_requests 
                SET created_by_employee_id = NULL, 
                    branch_director_id = NULL
                WHERE created_by_employee_id = ANY($1::int[])
                   OR branch_director_id = ANY($1::int[])
            `, [employeeIds]);
            await client.query('RELEASE SAVEPOINT before_recruitment_update');
        } catch (err) {
            await client.query('ROLLBACK TO SAVEPOINT before_recruitment_update');
            await client.query('RELEASE SAVEPOINT before_recruitment_update');
            console.log('[Bulk delete] Skipping recruitment_requests update:', err.message);
        }

        // 6. Update interview requests
        try {
            await client.query('SAVEPOINT before_interview_update');
            await client.query(`
                UPDATE interview_requests 
                SET manager_id = NULL, 
                    branch_director_id = NULL
                WHERE manager_id = ANY($1::int[])
                   OR branch_director_id = ANY($1::int[])
            `, [employeeIds]);
            await client.query('RELEASE SAVEPOINT before_interview_update');
        } catch (err) {
            await client.query('ROLLBACK TO SAVEPOINT before_interview_update');
            await client.query('RELEASE SAVEPOINT before_interview_update');
            console.log('[Bulk delete] Skipping interview_requests update:', err.message);
        }

        // 7. Delete user accounts if exist
        if (employeeEmails.length > 0) {
            for (const email of employeeEmails) {
                await client.query('DELETE FROM users WHERE LOWER(email) = LOWER($1) AND email IS NOT NULL', [email]);
            }
        }

        // 6. Finally, delete the employees
        const deleteResult = await client.query(
            `DELETE FROM employees 
             WHERE id = ANY($1::int[])
             RETURNING id, ma_nhan_vien, ho_ten`,
            [employeeIds]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `Đã xóa ${deleteResult.rows.length} nhân viên và tất cả dữ liệu liên quan`,
            data: {
                deletedCount: deleteResult.rows.length,
                deletedEmployees: deleteResult.rows
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error bulk deleting employees:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa nhân viên: ' + error.message
        });
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/employees/:id - Xóa nhân viên (hard delete - xóa hoàn toàn khỏi database)
 */
router.delete('/:id', async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        await client.query('BEGIN');

        // Check employee exists
        const checkEmployeeQuery = 'SELECT id, email FROM employees WHERE id = $1';
        const checkEmployeeResult = await client.query(checkEmployeeQuery, [id]);

        if (checkEmployeeResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên'
            });
        }

        const employee = checkEmployeeResult.rows[0];

        // Get email for deletion (handle null/empty email)
        const employeeEmail = employee.email || '';

        // Delete related records manually (even though CASCADE should handle it, we do it explicitly for clarity)
        // 1. Delete equipment assignments
        await client.query('DELETE FROM equipment_assignments WHERE employee_id = $1', [id]);

        // 2. Delete requests and related data
        // First, get all request IDs for this employee
        const requestIdsResult = await client.query('SELECT id FROM requests WHERE employee_id = $1', [id]);
        const requestIds = requestIdsResult.rows.map(row => row.id);

        if (requestIds.length > 0) {
            // Notification system removed

            // Delete request_items for these requests
            await client.query('DELETE FROM request_items WHERE request_id = ANY($1::int[])', [requestIds]);

            // Delete requests (CASCADE will handle request_items, but we delete explicitly for clarity)
            await client.query('DELETE FROM requests WHERE employee_id = $1', [id]);
        } else {
            // No requests, but still check and delete if any exist
            await client.query('DELETE FROM requests WHERE employee_id = $1', [id]);
        }

        // 3. Update customer entertainment expense requests
        // Set NULL for foreign keys that reference this employee
        try {
            await client.query('SAVEPOINT before_customer_expense_update');
            await client.query(`
                UPDATE customer_entertainment_expense_requests 
                SET branch_director_id = NULL, 
                    manager_id = NULL, 
                    accountant_id = NULL, 
                    ceo_id = NULL, 
                    payment_processed_by = NULL
                WHERE branch_director_id = $1
                   OR manager_id = $1
                   OR accountant_id = $1
                   OR ceo_id = $1
                   OR payment_processed_by = $1
            `, [id]);
            await client.query('RELEASE SAVEPOINT before_customer_expense_update');
        } catch (err) {
            await client.query('ROLLBACK TO SAVEPOINT before_customer_expense_update');
            await client.query('RELEASE SAVEPOINT before_customer_expense_update');
            console.log('[Delete employee] Skipping customer_entertainment_expense_requests update:', err.message);
        }

        // 4. Update travel expense requests
        // Set NULL for foreign keys that reference this employee
        try {
            await client.query('SAVEPOINT before_travel_expense_update');
            await client.query(`
                UPDATE travel_expense_requests 
                SET manager_id = NULL, 
                    ceo_id = NULL, 
                    finance_id = NULL, 
                    requested_by = NULL, 
                    budget_approved_by = NULL
                WHERE manager_id = $1
                   OR ceo_id = $1
                   OR finance_id = $1
                   OR requested_by = $1
                   OR budget_approved_by = $1
            `, [id]);
            await client.query('RELEASE SAVEPOINT before_travel_expense_update');
        } catch (err) {
            await client.query('ROLLBACK TO SAVEPOINT before_travel_expense_update');
            await client.query('RELEASE SAVEPOINT before_travel_expense_update');
            console.log('[Delete employee] Skipping travel_expense_requests update:', err.message);
        }

        // 5. Update recruitment requests
        // Only update columns that exist: created_by_employee_id, branch_director_id
        try {
            await client.query('SAVEPOINT before_recruitment_update');
            await client.query(`
                UPDATE recruitment_requests 
                SET created_by_employee_id = NULL, 
                    branch_director_id = NULL
                WHERE created_by_employee_id = $1
                   OR branch_director_id = $1
            `, [id]);
            await client.query('RELEASE SAVEPOINT before_recruitment_update');
        } catch (err) {
            await client.query('ROLLBACK TO SAVEPOINT before_recruitment_update');
            await client.query('RELEASE SAVEPOINT before_recruitment_update');
            console.log('[Delete employee] Skipping recruitment_requests update:', err.message);
        }

        // 6. Update interview requests
        try {
            await client.query('SAVEPOINT before_interview_update');
            await client.query(`
                UPDATE interview_requests 
                SET manager_id = NULL, 
                    branch_director_id = NULL
                WHERE manager_id = $1
                   OR branch_director_id = $1
            `, [id]);
            await client.query('RELEASE SAVEPOINT before_interview_update');
        } catch (err) {
            await client.query('ROLLBACK TO SAVEPOINT before_interview_update');
            await client.query('RELEASE SAVEPOINT before_interview_update');
            console.log('[Delete employee] Skipping interview_requests update:', err.message);
        }

        // 7. Delete user account if exists (users table may have email reference)
        // Delete all users with matching email (case-insensitive to handle any case variations)
        // Only delete if email exists and is not empty
        if (employeeEmail && employeeEmail.trim() !== '') {
            await client.query('DELETE FROM users WHERE LOWER(email) = LOWER($1) AND email IS NOT NULL', [employeeEmail]);
        }

        // 6. Finally, delete the employee (hard delete)
        const deleteQuery = `
            DELETE FROM employees 
            WHERE id = $1
            RETURNING id, ma_nhan_vien, ho_ten
        `;

        const deleteResult = await client.query(deleteQuery, [id]);

        if (deleteResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Không thể xóa nhân viên'
            });
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Đã xóa nhân viên và tất cả dữ liệu liên quan khỏi database',
            data: deleteResult.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting employee:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa nhân viên: ' + error.message
        });
    } finally {
        client.release();
    }
});

module.exports = router;
