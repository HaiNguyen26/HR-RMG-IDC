const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// ============================================================
// STATUS CONSTANTS
// ============================================================
const STATUSES = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    CANCELLED: 'CANCELLED'
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// Cache cho danh sách employees
let employeesCache = null;
let employeesCacheTime = null;
const EMPLOYEES_CACHE_TTL = 5 * 60 * 1000; // 5 phút

const getEmployeesCache = async () => {
    const now = Date.now();
    if (employeesCache && employeesCacheTime && (now - employeesCacheTime) < EMPLOYEES_CACHE_TTL) {
        return employeesCache;
    }

    const result = await pool.query(
        `SELECT id, ho_ten, email, quan_ly_truc_tiep, quan_ly_gian_tiep, chuc_danh, chi_nhanh, trang_thai
         FROM employees 
         WHERE (trang_thai = 'ACTIVE' OR trang_thai = 'PENDING' OR trang_thai IS NULL)
         ORDER BY ho_ten`
    );

    employeesCache = result.rows;
    employeesCacheTime = now;

    return employeesCache;
};

// Helper function để normalize tên (loại bỏ dấu tiếng Việt)
const removeVietnameseAccents = (str) => {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
};

// Tìm giám đốc chi nhánh từ tên
const findBranchDirector = async (branchDirectorName) => {
    try {
        const employees = await getEmployeesCache();
        if (!branchDirectorName || !branchDirectorName.trim()) return null;

        const normalizedName = (branchDirectorName || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
        const normalizedWithoutAccents = removeVietnameseAccents(normalizedName);

        // Tìm exact match trước
        let match = employees.find(emp => {
            const empName = (emp.ho_ten || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
            const empNameNoAccents = removeVietnameseAccents(empName);
            return empName === normalizedName || empNameNoAccents === normalizedWithoutAccents;
        });

        // Nếu không tìm thấy exact match, thử fuzzy match
        if (!match) {
            match = employees.find(emp => {
                const empName = (emp.ho_ten || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                const empNameNoAccents = removeVietnameseAccents(empName);
                return empName.includes(normalizedName) || normalizedName.includes(empName) ||
                    empNameNoAccents.includes(normalizedWithoutAccents) || normalizedWithoutAccents.includes(empNameNoAccents);
            });
        }

        return match || null;
    } catch (error) {
        console.error('[findBranchDirector] Error:', error);
        return null; // Trả về null nếu có lỗi, không throw
    }
};

// Ensure recruitment_requests table exists
const ensureRecruitmentRequestsTable = async () => {
    try {
        // Kiểm tra xem bảng employees có tồn tại không
        const employeesTableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'employees'
            );
        `);

        if (!employeesTableCheck.rows[0].exists) {
            console.warn('[ensureRecruitmentRequestsTable] Bảng employees chưa tồn tại! Tạo recruitment_requests table mà không có foreign key constraint.');
            // Tạo bảng mà không có foreign key constraint nếu employees chưa tồn tại
            await pool.query(`
                CREATE TABLE IF NOT EXISTS recruitment_requests (
                    id SERIAL PRIMARY KEY,
                    created_by_employee_id INTEGER,
                    branch_director_id INTEGER,
                    chuc_danh_can_tuyen VARCHAR(255) NOT NULL,
                    phong_ban_bo_phan VARCHAR(255) NOT NULL,
                    nguoi_quan_ly_truc_tiep VARCHAR(255) NOT NULL,
                    nguoi_quan_ly_gian_tiep VARCHAR(255),
                    mo_ta_cong_viec VARCHAR(20) NOT NULL CHECK (mo_ta_cong_viec IN ('co', 'chua_co')),
                    yeu_cau_chi_tiet_cong_viec TEXT,
                    ly_do_khac_ghi_chu TEXT,
                    so_luong_yeu_cau INTEGER DEFAULT 1,
                    loai_lao_dong VARCHAR(20) NOT NULL CHECK (loai_lao_dong IN ('toan_thoi_gian', 'thoi_vu')),
                    ly_do_tuyen VARCHAR(20) NOT NULL CHECK (ly_do_tuyen IN ('thay_the', 'nhu_cau_tang', 'vi_tri_moi')),
                    gioi_tinh VARCHAR(20) DEFAULT 'bat_ky' CHECK (gioi_tinh IN ('bat_ky', 'nam', 'nu')),
                    do_tuoi VARCHAR(50),
                    trinh_do_hoc_van_yeu_cau TEXT,
                    kinh_nghiem_chuyen_mon VARCHAR(20) DEFAULT 'khong_yeu_cau' CHECK (kinh_nghiem_chuyen_mon IN ('khong_yeu_cau', 'co_yeu_cau')),
                    chi_tiet_kinh_nghiem TEXT,
                    kien_thuc_chuyen_mon_khac TEXT,
                    yeu_cau_ngoai_ngu TEXT,
                    yeu_cau_vi_tinh_ky_nang_khac TEXT,
                    ky_nang_giao_tiep TEXT,
                    thai_do_lam_viec TEXT,
                    ky_nang_quan_ly TEXT,
                    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
                    rejection_reason TEXT,
                    approved_at TIMESTAMP NULL,
                    rejected_at TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Tạo indexes
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_recruitment_requests_created_by ON recruitment_requests(created_by_employee_id);
                CREATE INDEX IF NOT EXISTS idx_recruitment_requests_branch_director ON recruitment_requests(branch_director_id);
                CREATE INDEX IF NOT EXISTS idx_recruitment_requests_status ON recruitment_requests(status);
                CREATE INDEX IF NOT EXISTS idx_recruitment_requests_created_at ON recruitment_requests(created_at DESC);
            `);

            return; // Return early để không tạo lại bảng
        }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS recruitment_requests (
                id SERIAL PRIMARY KEY,
                created_by_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                branch_director_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
                chuc_danh_can_tuyen VARCHAR(255) NOT NULL,
                phong_ban_bo_phan VARCHAR(255) NOT NULL,
                nguoi_quan_ly_truc_tiep VARCHAR(255) NOT NULL,
                nguoi_quan_ly_gian_tiep VARCHAR(255),
                mo_ta_cong_viec VARCHAR(20) NOT NULL CHECK (mo_ta_cong_viec IN ('co', 'chua_co')),
                yeu_cau_chi_tiet_cong_viec TEXT,
                ly_do_khac_ghi_chu TEXT,
                so_luong_yeu_cau INTEGER DEFAULT 1,
                loai_lao_dong VARCHAR(20) NOT NULL CHECK (loai_lao_dong IN ('toan_thoi_gian', 'thoi_vu')),
                ly_do_tuyen VARCHAR(20) NOT NULL CHECK (ly_do_tuyen IN ('thay_the', 'nhu_cau_tang', 'vi_tri_moi')),
                gioi_tinh VARCHAR(20) DEFAULT 'bat_ky' CHECK (gioi_tinh IN ('bat_ky', 'nam', 'nu')),
                do_tuoi VARCHAR(50),
                trinh_do_hoc_van_yeu_cau TEXT,
                kinh_nghiem_chuyen_mon VARCHAR(20) DEFAULT 'khong_yeu_cau' CHECK (kinh_nghiem_chuyen_mon IN ('khong_yeu_cau', 'co_yeu_cau')),
                chi_tiet_kinh_nghiem TEXT,
                kien_thuc_chuyen_mon_khac TEXT,
                yeu_cau_ngoai_ngu TEXT,
                yeu_cau_vi_tinh_ky_nang_khac TEXT,
                ky_nang_giao_tiep TEXT,
                thai_do_lam_viec TEXT,
                ky_nang_quan_ly TEXT,
                status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
                rejection_reason TEXT,
                approved_at TIMESTAMP NULL,
                rejected_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tạo indexes riêng biệt
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_recruitment_requests_created_by ON recruitment_requests(created_by_employee_id)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_recruitment_requests_branch_director ON recruitment_requests(branch_director_id)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_recruitment_requests_status ON recruitment_requests(status)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_recruitment_requests_created_at ON recruitment_requests(created_at DESC)
        `);
    } catch (error) {
        console.error('Error ensuring recruitment_requests table:', error);
        throw error;
    }
};

// Initialize table on module load
ensureRecruitmentRequestsTable().catch(err => {
    console.error('Failed to initialize recruitment_requests table:', err);
});

// ============================================================
// API ROUTES
// ============================================================

// GET /api/recruitment-requests - Lấy danh sách yêu cầu tuyển dụng
router.get('/', async (req, res) => {
    try {
        console.log('[GET /api/recruitment-requests] Request received');
        console.log('[GET /api/recruitment-requests] Query params:', req.query);

        // Đảm bảo bảng tồn tại, nhưng không throw error nếu có vấn đề
        try {
            await ensureRecruitmentRequestsTable();
            console.log('[GET /api/recruitment-requests] Table ensured');
        } catch (tableError) {
            console.error('[GET /api/recruitment-requests] Error ensuring table:', tableError);
            // Nếu bảng chưa thể tạo, trả về danh sách rỗng thay vì lỗi
            return res.json({
                success: true,
                data: []
            });
        }

        const { employeeId, branchDirectorId, status, forHr } = req.query;

        const conditions = [];
        const params = [];
        let paramIndex = 1;

        // Nhân viên xem yêu cầu của mình
        if (employeeId) {
            conditions.push(`rr.created_by_employee_id = $${paramIndex}`);
            params.push(parseInt(employeeId, 10));
            paramIndex += 1;
        }

        // Giám đốc chi nhánh xem yêu cầu gửi đến mình
        if (branchDirectorId) {
            conditions.push(`rr.branch_director_id = $${paramIndex}`);
            params.push(parseInt(branchDirectorId, 10));
            paramIndex += 1;
        }

        // HR xem các yêu cầu đã được duyệt
        if (forHr === 'true') {
            conditions.push(`rr.status = $${paramIndex}`);
            params.push(STATUSES.APPROVED);
            paramIndex += 1;
        }

        // Filter theo status
        if (status && forHr !== 'true') {
            if (status === 'ALL') {
                // Không filter
            } else {
                conditions.push(`rr.status = $${paramIndex}`);
                params.push(status);
                paramIndex += 1;
            }
        } else if (branchDirectorId && !status) {
            // Mặc định giám đốc chi nhánh chỉ thấy PENDING
            conditions.push(`rr.status = $${paramIndex}`);
            params.push(STATUSES.PENDING);
            paramIndex += 1;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Kiểm tra xem bảng employees có tồn tại không trước khi JOIN
        let query;
        let hasEmployeesTable = false;

        try {
            const employeesTableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'employees'
                );
            `);
            hasEmployeesTable = employeesTableCheck.rows[0].exists;
            console.log('[GET /api/recruitment-requests] Employees table exists:', hasEmployeesTable);
        } catch (checkError) {
            console.error('[GET /api/recruitment-requests] Error checking employees table:', checkError.message);
            hasEmployeesTable = false;
        }

        if (hasEmployeesTable) {
            query = `
                SELECT 
                    rr.*,
                    e1.ho_ten as created_by_name,
                    e2.ho_ten as branch_director_name
                FROM recruitment_requests rr
                LEFT JOIN employees e1 ON rr.created_by_employee_id = e1.id
                LEFT JOIN employees e2 ON rr.branch_director_id = e2.id
                ${whereClause}
                ORDER BY rr.created_at DESC
            `;
        } else {
            // Nếu bảng employees chưa tồn tại, chỉ query từ recruitment_requests
            console.warn('[GET /api/recruitment-requests] Bảng employees chưa tồn tại, query không có JOIN');
            query = `
                SELECT 
                    rr.*,
                    NULL::text as created_by_name,
                    NULL::text as branch_director_name
                FROM recruitment_requests rr
                ${whereClause}
                ORDER BY rr.created_at DESC
            `;
        }

        console.log('[GET /api/recruitment-requests] Executing query:', query);
        console.log('[GET /api/recruitment-requests] Query params:', params);

        let result;
        try {
            result = await pool.query(query, params);
            console.log('[GET /api/recruitment-requests] Query result rows:', result.rows.length);
        } catch (queryError) {
            console.error('[GET /api/recruitment-requests] Query execution error:', queryError);
            console.error('[GET /api/recruitment-requests] Query error name:', queryError.name);
            console.error('[GET /api/recruitment-requests] Query error message:', queryError.message);
            console.error('[GET /api/recruitment-requests] Query error code:', queryError.code);

            // Nếu bảng chưa tồn tại (42P01), trả về danh sách rỗng
            if (queryError.code === '42P01') {
                console.warn('[GET /api/recruitment-requests] Table does not exist, returning empty array');
                return res.json({
                    success: true,
                    data: []
                });
            }

            // Với các lỗi khác, vẫn throw để được catch ở ngoài
            throw queryError;
        }

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('[GET /api/recruitment-requests] ========== ERROR START ==========');
        console.error('[GET /api/recruitment-requests] Error name:', error.name);
        console.error('[GET /api/recruitment-requests] Error message:', error.message);
        console.error('[GET /api/recruitment-requests] Error code:', error.code);
        console.error('[GET /api/recruitment-requests] Error detail:', error.detail);
        console.error('[GET /api/recruitment-requests] Error constraint:', error.constraint);
        console.error('[GET /api/recruitment-requests] Error stack:', error.stack);
        console.error('[GET /api/recruitment-requests] Query params:', req.query);
        console.error('[GET /api/recruitment-requests] ========== ERROR END ==========');

        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách yêu cầu tuyển dụng: ' + error.message,
            errorCode: error.code,
            errorDetail: error.detail,
            errorConstraint: error.constraint,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// GET /api/recruitment-requests/:id - Lấy chi tiết yêu cầu
router.get('/:id', async (req, res) => {
    try {
        await ensureRecruitmentRequestsTable();

        const { id } = req.params;

        const result = await pool.query(`
            SELECT 
                rr.*,
                e1.ho_ten as created_by_name,
                e2.ho_ten as branch_director_name
            FROM recruitment_requests rr
            LEFT JOIN employees e1 ON rr.created_by_employee_id = e1.id
            LEFT JOIN employees e2 ON rr.branch_director_id = e2.id
            WHERE rr.id = $1
        `, [parseInt(id, 10)]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu tuyển dụng'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('[GET /api/recruitment-requests/:id] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết yêu cầu: ' + error.message
        });
    }
});

// POST /api/recruitment-requests - Tạo yêu cầu tuyển dụng mới
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        await ensureRecruitmentRequestsTable();
        await client.query('BEGIN');

        const userId = req.headers['user-id'] || req.body.userId;
        console.log('[POST /api/recruitment-requests] User ID from headers/body:', userId);

        if (!userId) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin người dùng'
            });
        }

        // Tìm employee từ user ID - thử tìm theo ID trước, nếu không có thì tìm theo tên
        let employeeResult = await client.query(
            `SELECT id, ho_ten, chi_nhanh FROM employees WHERE id = $1 AND (trang_thai = 'ACTIVE' OR trang_thai = 'PENDING' OR trang_thai IS NULL)`,
            [parseInt(userId, 10)]
        );

        // Nếu không tìm thấy theo ID, thử tìm theo tên
        if (employeeResult.rows.length === 0) {
            console.log('[POST /api/recruitment-requests] Employee not found by ID, trying to find by name...');
            // Lấy tên từ request body nếu có
            const userName = req.body.userName || req.body.hoTen || userId;
            employeeResult = await client.query(
                `SELECT id, ho_ten, chi_nhanh FROM employees 
                 WHERE (LOWER(ho_ten) = LOWER($1) OR LOWER(ho_ten) LIKE LOWER($2)) 
                 AND (trang_thai = 'ACTIVE' OR trang_thai = 'PENDING' OR trang_thai IS NULL)
                 LIMIT 1`,
                [userName.trim(), `%${userName.trim()}%`]
            );
        }

        if (employeeResult.rows.length === 0) {
            await client.query('ROLLBACK');
            console.error('[POST /api/recruitment-requests] Employee not found for userId:', userId);
            console.error('[POST /api/recruitment-requests] Request body:', JSON.stringify(req.body, null, 2));
            return res.status(404).json({
                success: false,
                message: `Không tìm thấy nhân viên với ID/tên: ${userId}. Vui lòng kiểm tra lại thông tin đăng nhập.`
            });
        }

        const employee = employeeResult.rows[0];
        console.log('[POST /api/recruitment-requests] Found employee:', {
            id: employee.id,
            ho_ten: employee.ho_ten,
            chi_nhanh: employee.chi_nhanh
        });

        const {
            chucDanhCanTuyen,
            phongBanBoPhan,
            nguoiQuanLyTrucTiep,
            nguoiQuanLyGianTiep,
            moTaCongViec,
            yeuCauChiTietCongViec,
            lyDoKhacGhiChu,
            soLuongYeuCau,
            loaiLaoDong,
            lyDoTuyen,
            gioiTinh,
            doTuoi,
            trinhDoHocVanYeuCau,
            kinhNghiemChuyenMon,
            chiTietKinhNghiem,
            kienThucChuyenMonKhac,
            yeuCauNgoaiNgu,
            yeuCauViTinhKyNangKhac,
            kyNangGiaoTiep,
            thaiDoLamViec,
            kyNangQuanLy
        } = req.body;

        // Validate required fields
        const missingFields = [];
        if (!chucDanhCanTuyen || chucDanhCanTuyen.trim() === '') missingFields.push('chucDanhCanTuyen');
        if (!phongBanBoPhan || phongBanBoPhan.trim() === '') missingFields.push('phongBanBoPhan');
        if (!nguoiQuanLyTrucTiep || nguoiQuanLyTrucTiep.trim() === '') missingFields.push('nguoiQuanLyTrucTiep');
        if (!moTaCongViec || moTaCongViec.trim() === '') missingFields.push('moTaCongViec');
        if (!soLuongYeuCau || parseInt(soLuongYeuCau, 10) <= 0) missingFields.push('soLuongYeuCau');
        if (!loaiLaoDong || loaiLaoDong.trim() === '') missingFields.push('loaiLaoDong');
        if (!lyDoTuyen || lyDoTuyen.trim() === '') missingFields.push('lyDoTuyen');

        if (missingFields.length > 0) {
            await client.query('ROLLBACK');
            console.error('[POST /api/recruitment-requests] Missing required fields:', missingFields);
            return res.status(400).json({
                success: false,
                message: `Thiếu thông tin bắt buộc: ${missingFields.join(', ')}`
            });
        }

        // Tìm giám đốc chi nhánh từ trường nguoiQuanLyGianTiep (đây chính là giám đốc chi nhánh)
        let branchDirectorId = null;
        const nguoiQuanLyGianTiepValue = nguoiQuanLyGianTiep ? String(nguoiQuanLyGianTiep).trim() : '';
        if (nguoiQuanLyGianTiepValue !== '') {
            console.log('[POST /api/recruitment-requests] Looking for branch director (nguoiQuanLyGianTiep):', nguoiQuanLyGianTiepValue);
            try {
                const branchDirector = await findBranchDirector(nguoiQuanLyGianTiepValue);
                if (branchDirector) {
                    branchDirectorId = branchDirector.id;
                    console.log('[POST /api/recruitment-requests] Found branch director:', {
                        id: branchDirector.id,
                        name: branchDirector.ho_ten
                    });
                } else {
                    console.warn('[POST /api/recruitment-requests] Branch director not found for:', nguoiQuanLyGianTiepValue);
                    console.warn('[POST /api/recruitment-requests] Will continue without branch_director_id (optional field)');
                    // Không throw error, chỉ log warning vì đây là optional field
                }
            } catch (error) {
                console.error('[POST /api/recruitment-requests] Error finding branch director:', error);
                // Không throw error, chỉ log vì đây là optional field
            }
        } else {
            console.log('[POST /api/recruitment-requests] No branch director specified (nguoiQuanLyGianTiep is empty)');
        }

        // Tạo yêu cầu
        console.log('[POST /api/recruitment-requests] Creating request with data:', {
            employeeId: employee.id,
            branchDirectorId,
            chucDanhCanTuyen,
            phongBanBoPhan,
            nguoiQuanLyTrucTiep,
            nguoiQuanLyGianTiep: nguoiQuanLyGianTiep || null,
            moTaCongViec,
            soLuongYeuCau: parseInt(soLuongYeuCau, 10) || 1,
            loaiLaoDong,
            lyDoTuyen
        });

        try {
            const insertResult = await client.query(`
            INSERT INTO recruitment_requests (
                created_by_employee_id, branch_director_id,
                chuc_danh_can_tuyen, phong_ban_bo_phan, nguoi_quan_ly_truc_tiep, nguoi_quan_ly_gian_tiep,
                mo_ta_cong_viec, yeu_cau_chi_tiet_cong_viec, ly_do_khac_ghi_chu,
                so_luong_yeu_cau, loai_lao_dong, ly_do_tuyen,
                gioi_tinh, do_tuoi, trinh_do_hoc_van_yeu_cau,
                kinh_nghiem_chuyen_mon, chi_tiet_kinh_nghiem, kien_thuc_chuyen_mon_khac,
                yeu_cau_ngoai_ngu, yeu_cau_vi_tinh_ky_nang_khac,
                ky_nang_giao_tiep, thai_do_lam_viec, ky_nang_quan_ly,
                status
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
            ) RETURNING *
        `, [
                employee.id,
                branchDirectorId,
                chucDanhCanTuyen,
                phongBanBoPhan,
                nguoiQuanLyTrucTiep,
                (nguoiQuanLyGianTiep && String(nguoiQuanLyGianTiep).trim() !== '') ? String(nguoiQuanLyGianTiep).trim() : null,
                moTaCongViec,
                yeuCauChiTietCongViec || null,
                lyDoKhacGhiChu || null,
                parseInt(soLuongYeuCau, 10) || 1,
                loaiLaoDong,
                lyDoTuyen,
                gioiTinh || 'bat_ky',
                doTuoi || null,
                trinhDoHocVanYeuCau || null,
                kinhNghiemChuyenMon || 'khong_yeu_cau',
                chiTietKinhNghiem || null,
                kienThucChuyenMonKhac || null,
                yeuCauNgoaiNgu || null,
                yeuCauViTinhKyNangKhac || null,
                kyNangGiaoTiep || null,
                thaiDoLamViec || null,
                kyNangQuanLy || null,
                STATUSES.PENDING
            ]);

            await client.query('COMMIT');

            console.log('[POST /api/recruitment-requests] Request created successfully:', insertResult.rows[0].id);

            res.json({
                success: true,
                message: 'Đã tạo yêu cầu tuyển dụng thành công',
                data: insertResult.rows[0]
            });
        } catch (insertError) {
            await client.query('ROLLBACK');
            console.error('[POST /api/recruitment-requests] Database insert error:', insertError);
            console.error('[POST /api/recruitment-requests] Insert error details:', {
                message: insertError.message,
                code: insertError.code,
                detail: insertError.detail,
                constraint: insertError.constraint
            });
            throw insertError; // Re-throw để được catch bởi outer catch block
        }
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            console.error('[POST /api/recruitment-requests] Rollback error:', rollbackError);
        }
        console.error('[POST /api/recruitment-requests] ========== ERROR START ==========');
        console.error('[POST /api/recruitment-requests] Error message:', error.message);
        console.error('[POST /api/recruitment-requests] Error code:', error.code);
        console.error('[POST /api/recruitment-requests] Error detail:', error.detail);
        console.error('[POST /api/recruitment-requests] Error constraint:', error.constraint);
        console.error('[POST /api/recruitment-requests] Error stack:', error.stack);
        console.error('[POST /api/recruitment-requests] Request headers user-id:', req.headers['user-id']);
        console.error('[POST /api/recruitment-requests] Request body userId:', req.body?.userId);
        console.error('[POST /api/recruitment-requests] Request body userName:', req.body?.userName);
        console.error('[POST /api/recruitment-requests] Request body (full):', JSON.stringify(req.body, null, 2));
        console.error('[POST /api/recruitment-requests] ========== ERROR END ==========');
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo yêu cầu tuyển dụng: ' + error.message,
            error: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                code: error.code,
                detail: error.detail,
                constraint: error.constraint
            } : undefined
        });
    } finally {
        client.release();
    }
});

// PUT /api/recruitment-requests/:id/approve - Duyệt yêu cầu
router.put('/:id/approve', async (req, res) => {
    try {
        await ensureRecruitmentRequestsTable();

        const { id } = req.params;

        const result = await pool.query(`
            UPDATE recruitment_requests
            SET status = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND status = $3
            RETURNING *
        `, [STATUSES.APPROVED, parseInt(id, 10), STATUSES.PENDING]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu hoặc yêu cầu đã được xử lý'
            });
        }

        res.json({
            success: true,
            message: 'Đã duyệt yêu cầu tuyển dụng',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('[PUT /api/recruitment-requests/:id/approve] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi duyệt yêu cầu: ' + error.message
        });
    }
});

// PUT /api/recruitment-requests/:id/reject - Từ chối yêu cầu
router.put('/:id/reject', async (req, res) => {
    try {
        await ensureRecruitmentRequestsTable();

        const { id } = req.params;
        const { rejectionReason } = req.body;

        const result = await pool.query(`
            UPDATE recruitment_requests
            SET status = $1, rejection_reason = $2, rejected_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND status = $4
            RETURNING *
        `, [STATUSES.REJECTED, rejectionReason || null, parseInt(id, 10), STATUSES.PENDING]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu hoặc yêu cầu đã được xử lý'
            });
        }

        res.json({
            success: true,
            message: 'Đã từ chối yêu cầu tuyển dụng',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('[PUT /api/recruitment-requests/:id/reject] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi từ chối yêu cầu: ' + error.message
        });
    }
});

module.exports = router;

