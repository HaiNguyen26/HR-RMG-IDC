const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cấu hình multer để lưu file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            const uploadDir = path.join(__dirname, '../uploads/candidates');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
                console.log('[Multer] Created upload directory:', uploadDir);
            }
            // Kiểm tra quyền ghi
            try {
                fs.accessSync(uploadDir, fs.constants.W_OK);
            } catch (err) {
                console.error('[Multer] Upload directory is not writable:', uploadDir, err);
                return cb(new Error('Upload directory không có quyền ghi'));
            }
            cb(null, uploadDir);
        } catch (error) {
            console.error('[Multer] Error setting up upload directory:', error);
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        // Cho phép ảnh và PDF/Excel cho CV
        if (file.fieldname === 'anhDaiDien') {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Ảnh đại diện phải là file ảnh'));
            }
        } else if (file.fieldname === 'cvDinhKem') {
            const allowedTypes = ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
            if (allowedTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('CV đính kèm phải là file PDF hoặc Excel'));
            }
        } else {
            cb(null, true);
        }
    }
});

// Đảm bảo các bảng tồn tại
const ensureTables = async () => {
    // Tables đã được tạo bằng script SQL, không cần tạo lại ở đây
    // Nhưng có thể thêm logic kiểm tra nếu cần
};

// GET /api/candidates - Lấy danh sách ứng viên
router.get('/', async (req, res) => {
    try {
        const { search, status, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                c.*,
                COUNT(*) OVER() as total_count
            FROM candidates c
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (search) {
            query += ` AND (
                c.ho_ten ILIKE $${paramIndex} OR 
                c.email ILIKE $${paramIndex} OR 
                c.so_dien_thoai ILIKE $${paramIndex} OR
                c.vi_tri_ung_tuyen ILIKE $${paramIndex}
            )`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (status && status !== 'all') {
            query += ` AND c.trang_thai = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0
            }
        });
    } catch (error) {
        console.error('Error fetching candidates:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách ứng viên: ' + error.message
        });
    }
});

// GET /api/candidates/:id - Lấy thông tin chi tiết ứng viên
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('[GET /api/candidates/:id] Request received for id:', id);

        // Lấy thông tin ứng viên
        let candidateQuery;
        try {
            candidateQuery = await pool.query(
                'SELECT * FROM candidates WHERE id = $1',
                [id]
            );
        } catch (queryError) {
            console.error('[GET /api/candidates/:id] Error querying candidate:', queryError);
            console.error('[GET /api/candidates/:id] Error code:', queryError.code);
            console.error('[GET /api/candidates/:id] Error message:', queryError.message);
            throw queryError;
        }

        if (candidateQuery.rows.length === 0) {
            console.log('[GET /api/candidates/:id] Candidate not found for id:', id);
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy ứng viên'
            });
        }

        const candidate = candidateQuery.rows[0];
        console.log('[GET /api/candidates/:id] Candidate found:', candidate.ho_ten);

        // Lấy kinh nghiệm làm việc (với error handling riêng)
        let workExperiences = { rows: [] };
        try {
            workExperiences = await pool.query(
                'SELECT * FROM candidate_work_experiences WHERE candidate_id = $1 ORDER BY ngay_bat_dau DESC',
                [id]
            );
        } catch (workExpError) {
            console.warn('[GET /api/candidates/:id] Error fetching work experiences (table may not exist):', workExpError.message);
            // Continue without work experiences if table doesn't exist
        }

        // Lấy quá trình đào tạo (với error handling riêng)
        let trainingProcesses = { rows: [] };
        try {
            trainingProcesses = await pool.query(
                'SELECT * FROM candidate_training_processes WHERE candidate_id = $1 ORDER BY ngay_bat_dau DESC',
                [id]
            );
        } catch (trainingError) {
            console.warn('[GET /api/candidates/:id] Error fetching training processes (table may not exist):', trainingError.message);
            // Continue without training processes if table doesn't exist
        }

        // Lấy trình độ ngoại ngữ (với error handling riêng)
        let foreignLanguages = { rows: [] };
        try {
            foreignLanguages = await pool.query(
                'SELECT * FROM candidate_foreign_languages WHERE candidate_id = $1',
                [id]
            );
        } catch (langError) {
            console.warn('[GET /api/candidates/:id] Error fetching foreign languages (table may not exist):', langError.message);
            // Continue without foreign languages if table doesn't exist
        }

        console.log('[GET /api/candidates/:id] Successfully fetched candidate data');

        res.json({
            success: true,
            data: {
                ...candidate,
                workExperiences: workExperiences.rows || [],
                trainingProcesses: trainingProcesses.rows || [],
                foreignLanguages: foreignLanguages.rows || []
            }
        });
    } catch (error) {
        console.error('[GET /api/candidates/:id] ========== ERROR START ==========');
        console.error('[GET /api/candidates/:id] Error name:', error.name);
        console.error('[GET /api/candidates/:id] Error message:', error.message);
        console.error('[GET /api/candidates/:id] Error code:', error.code);
        console.error('[GET /api/candidates/:id] Error detail:', error.detail);
        console.error('[GET /api/candidates/:id] Error constraint:', error.constraint);
        console.error('[GET /api/candidates/:id] Error stack:', error.stack);
        console.error('[GET /api/candidates/:id] Request params:', req.params);
        console.error('[GET /api/candidates/:id] ========== ERROR END ==========');
        
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin ứng viên: ' + error.message,
            errorCode: error.code,
            errorDetail: error.detail,
            errorConstraint: error.constraint,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// POST /api/candidates - Tạo ứng viên mới
router.post('/', (req, res, next) => {
    upload.fields([
        { name: 'anhDaiDien', maxCount: 1 },
        { name: 'cvDinhKem', maxCount: 1 }
    ])(req, res, (err) => {
        if (err) {
            console.error('[POST /api/candidates] Multer error:', err);
            return res.status(400).json({
                success: false,
                message: 'Lỗi khi upload file: ' + err.message
            });
        }
        next();
    });
}, async (req, res) => {
    console.log('[POST /api/candidates] Request received');
    console.log('[POST /api/candidates] Body keys:', Object.keys(req.body));
    console.log('[POST /api/candidates] Files:', req.files ? Object.keys(req.files).map(k => ({ key: k, count: req.files[k]?.length || 0 })) : 'none');
    
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const {
            hoTen, gioiTinh, ngaySinh, noiSinh, tinhTrangHonNhan,
            danToc, quocTich, tonGiao, soCCCD, ngayCapCCCD, noiCapCCCD,
            soDienThoai, soDienThoaiKhac, email,
            diaChiTamTru, diaChiLienLac,
            trinhDoVanHoa, trinhDoChuyenMon, chuyenNganh,
            chiNhanh, viTriUngTuyen, phongBan,
            ngayGuiCV, nguonCV,
            workExperiences, trainingProcesses, foreignLanguages
        } = req.body;

        // Parse JSON strings nếu có
        let diaChiTamTruObj = null;
        let diaChiLienLacObj = null;
        let workExp = [];
        let trainingProc = [];
        let foreignLang = [];

        try {
            if (diaChiTamTru) {
                diaChiTamTruObj = typeof diaChiTamTru === 'string' ? JSON.parse(diaChiTamTru) : diaChiTamTru;
            }
        } catch (e) {
            console.error('Error parsing diaChiTamTru:', e);
            diaChiTamTruObj = {};
        }

        try {
            if (diaChiLienLac) {
                diaChiLienLacObj = typeof diaChiLienLac === 'string' ? JSON.parse(diaChiLienLac) : diaChiLienLac;
            }
        } catch (e) {
            console.error('Error parsing diaChiLienLac:', e);
            diaChiLienLacObj = {};
        }

        try {
            if (workExperiences) {
                workExp = typeof workExperiences === 'string' ? JSON.parse(workExperiences) : (Array.isArray(workExperiences) ? workExperiences : []);
            }
        } catch (e) {
            console.error('Error parsing workExperiences:', e);
            workExp = [];
        }

        try {
            if (trainingProcesses) {
                trainingProc = typeof trainingProcesses === 'string' ? JSON.parse(trainingProcesses) : (Array.isArray(trainingProcesses) ? trainingProcesses : []);
            }
        } catch (e) {
            console.error('Error parsing trainingProcesses:', e);
            trainingProc = [];
        }

        try {
            if (foreignLanguages) {
                foreignLang = typeof foreignLanguages === 'string' ? JSON.parse(foreignLanguages) : (Array.isArray(foreignLanguages) ? foreignLanguages : []);
            }
        } catch (e) {
            console.error('Error parsing foreignLanguages:', e);
            foreignLang = [];
        }

        // Lấy đường dẫn file nếu có
        const anhDaiDienPath = req.files?.anhDaiDien?.[0]?.filename
            ? `/uploads/candidates/${req.files.anhDaiDien[0].filename}`
            : null;
        const cvDinhKemPath = req.files?.cvDinhKem?.[0]?.filename
            ? `/uploads/candidates/${req.files.cvDinhKem[0].filename}`
            : null;

        // Lấy user ID từ header hoặc body
        const userId = req.headers['user-id'] || req.body.userId || null;

        // Tạo ứng viên
        const insertCandidate = await client.query(`
            INSERT INTO candidates (
                ho_ten, gioi_tinh, ngay_sinh, noi_sinh, tinh_trang_hon_nhan,
                dan_toc, quoc_tich, ton_giao, so_cccd, ngay_cap_cccd, noi_cap_cccd,
                so_dien_thoai, so_dien_thoai_khac, email,
                dia_chi_tam_tru_so_nha, dia_chi_tam_tru_phuong_xa, dia_chi_tam_tru_quan_huyen, dia_chi_tam_tru_thanh_pho_tinh,
                nguyen_quan_so_nha, nguyen_quan_phuong_xa, nguyen_quan_quan_huyen, nguyen_quan_thanh_pho_tinh,
                trinh_do_van_hoa, trinh_do_chuyen_mon, chuyen_nganh,
                chi_nhanh, vi_tri_ung_tuyen, phong_ban,
                anh_dai_dien_path, cv_dinh_kem_path, ngay_gui_cv, nguon_cv,
                trang_thai, created_by
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                $15, $16, $17, $18, $19, $20, $21, $22,
                $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
            ) RETURNING *
        `, [
            (hoTen && typeof hoTen === 'string' ? hoTen.trim() : hoTen) || null,
            (gioiTinh && typeof gioiTinh === 'string' ? gioiTinh.trim() : gioiTinh) || 'Nam',
            ngaySinh || null,
            (noiSinh && typeof noiSinh === 'string' ? noiSinh.trim() : noiSinh) || null,
            (tinhTrangHonNhan && typeof tinhTrangHonNhan === 'string' ? tinhTrangHonNhan.trim() : tinhTrangHonNhan) || 'Độc thân',
            (danToc && typeof danToc === 'string' ? danToc.trim() : danToc) || null,
            (quocTich && typeof quocTich === 'string' ? quocTich.trim() : quocTich) || 'Việt Nam',
            (tonGiao && typeof tonGiao === 'string' ? tonGiao.trim() : tonGiao) || null,
            (soCCCD && typeof soCCCD === 'string' ? soCCCD.trim() : soCCCD) || null,
            ngayCapCCCD || null,
            (noiCapCCCD && typeof noiCapCCCD === 'string' ? noiCapCCCD.trim() : noiCapCCCD) || null,
            (soDienThoai && typeof soDienThoai === 'string' ? soDienThoai.trim() : soDienThoai) || null,
            (soDienThoaiKhac && typeof soDienThoaiKhac === 'string' ? soDienThoaiKhac.trim() : soDienThoaiKhac) || null,
            (email && typeof email === 'string' ? email.trim() : email) || null,
            (diaChiTamTruObj?.soNha && typeof diaChiTamTruObj.soNha === 'string' ? diaChiTamTruObj.soNha.trim() : diaChiTamTruObj.soNha) || null,
            (diaChiTamTruObj?.phuongXa && typeof diaChiTamTruObj.phuongXa === 'string' ? diaChiTamTruObj.phuongXa.trim() : diaChiTamTruObj.phuongXa) || null,
            (diaChiTamTruObj?.quanHuyen && typeof diaChiTamTruObj.quanHuyen === 'string' ? diaChiTamTruObj.quanHuyen.trim() : diaChiTamTruObj.quanHuyen) || null,
            (diaChiTamTruObj?.thanhPhoTinh && typeof diaChiTamTruObj.thanhPhoTinh === 'string' ? diaChiTamTruObj.thanhPhoTinh.trim() : diaChiTamTruObj.thanhPhoTinh) || null,
            (diaChiLienLacObj?.soNha && typeof diaChiLienLacObj.soNha === 'string' ? diaChiLienLacObj.soNha.trim() : diaChiLienLacObj.soNha) || null,
            (diaChiLienLacObj?.phuongXa && typeof diaChiLienLacObj.phuongXa === 'string' ? diaChiLienLacObj.phuongXa.trim() : diaChiLienLacObj.phuongXa) || null,
            (diaChiLienLacObj?.quanHuyen && typeof diaChiLienLacObj.quanHuyen === 'string' ? diaChiLienLacObj.quanHuyen.trim() : diaChiLienLacObj.quanHuyen) || null,
            (diaChiLienLacObj?.thanhPhoTinh && typeof diaChiLienLacObj.thanhPhoTinh === 'string' ? diaChiLienLacObj.thanhPhoTinh.trim() : diaChiLienLacObj.thanhPhoTinh) || null,
            (trinhDoVanHoa && typeof trinhDoVanHoa === 'string' ? trinhDoVanHoa.trim() : trinhDoVanHoa) || null,
            (trinhDoChuyenMon && typeof trinhDoChuyenMon === 'string' ? trinhDoChuyenMon.trim() : trinhDoChuyenMon) || null,
            (chuyenNganh && typeof chuyenNganh === 'string' ? chuyenNganh.trim() : chuyenNganh) || null,
            (chiNhanh && typeof chiNhanh === 'string' ? chiNhanh.trim() : chiNhanh) || null,
            (viTriUngTuyen && typeof viTriUngTuyen === 'string' ? viTriUngTuyen.trim() : viTriUngTuyen) || null,
            (phongBan && typeof phongBan === 'string' ? phongBan.trim() : phongBan) || null,
            anhDaiDienPath,
            cvDinhKemPath,
            ngayGuiCV || null,
            (nguonCV && typeof nguonCV === 'string' ? nguonCV.trim() : nguonCV) || null,
            'NEW',
            userId
        ]);

        const candidateId = insertCandidate.rows[0].id;

        // Thêm kinh nghiệm làm việc
        if (workExp && Array.isArray(workExp)) {
            for (const exp of workExp) {
                if (exp.ngayBatDau || exp.ngayKetThuc || exp.congTy || exp.chucDanh) {
                    await client.query(`
                        INSERT INTO candidate_work_experiences (candidate_id, ngay_bat_dau, ngay_ket_thuc, cong_ty, chuc_danh)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [
                        candidateId,
                        exp.ngayBatDau || null,
                        exp.ngayKetThuc || null,
                        exp.congTy || null,
                        exp.chucDanh || null
                    ]);
                }
            }
        }

        // Thêm quá trình đào tạo
        if (trainingProc && Array.isArray(trainingProc)) {
            for (const tp of trainingProc) {
                if (tp.ngayBatDau || tp.ngayKetThuc || tp.truongDaoTao || tp.chuyenNganh || tp.vanBang) {
                    await client.query(`
                        INSERT INTO candidate_training_processes (candidate_id, ngay_bat_dau, ngay_ket_thuc, truong_dao_tao, chuyen_nganh, van_bang)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        candidateId,
                        tp.ngayBatDau || null,
                        tp.ngayKetThuc || null,
                        tp.truongDaoTao || null,
                        tp.chuyenNganh || null,
                        tp.vanBang || null
                    ]);
                }
            }
        }

        // Thêm trình độ ngoại ngữ
        if (foreignLang && Array.isArray(foreignLang)) {
            for (const fl of foreignLang) {
                if (fl.ngoaiNgu || fl.chungChi || fl.diem || fl.khaNangSuDung) {
                    await client.query(`
                        INSERT INTO candidate_foreign_languages (candidate_id, ngoai_ngu, chung_chi, diem, kha_nang_su_dung)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [
                        candidateId,
                        fl.ngoaiNgu || null,
                        fl.chungChi || null,
                        fl.diem || null,
                        fl.khaNangSuDung || 'A: Giỏi'
                    ]);
                }
            }
        }

        await client.query('COMMIT');

        // Lấy lại thông tin đầy đủ
        const fullCandidate = await pool.query(`
            SELECT * FROM candidates WHERE id = $1
        `, [candidateId]);

        res.status(201).json({
            success: true,
            message: 'Đã tạo ứng viên thành công',
            data: fullCandidate.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK').catch(rollbackErr => {
            console.error('[POST /api/candidates] Rollback error:', rollbackErr);
        });
        
        console.error('[POST /api/candidates] Error creating candidate:', error);
        console.error('[POST /api/candidates] Error name:', error.name);
        console.error('[POST /api/candidates] Error message:', error.message);
        console.error('[POST /api/candidates] Error code:', error.code);
        console.error('[POST /api/candidates] Error stack:', error.stack);
        console.error('[POST /api/candidates] Request body keys:', Object.keys(req.body));
        console.error('[POST /api/candidates] Files received:', req.files ? Object.keys(req.files) : 'none');
        
        // Kiểm tra lỗi database constraint
        let errorMessage = 'Lỗi khi tạo ứng viên: ' + error.message;
        if (error.code === '23505') { // Unique constraint violation
            if (error.constraint === 'unique_email') {
                errorMessage = 'Email đã tồn tại trong hệ thống';
            } else if (error.constraint === 'unique_cccd') {
                errorMessage = 'Số CCCD đã tồn tại trong hệ thống';
            } else {
                errorMessage = 'Dữ liệu trùng lặp: ' + error.message;
            }
        } else if (error.code === '23503') { // Foreign key violation
            errorMessage = 'Dữ liệu không hợp lệ: ' + error.message;
        } else if (error.code === '23514') { // Check constraint violation
            errorMessage = 'Dữ liệu không đúng định dạng: ' + error.message;
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage,
            errorCode: error.code,
            errorConstraint: error.constraint,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        client.release();
    }
});

// PUT /api/candidates/:id - Cập nhật ứng viên
router.put('/:id', upload.fields([
    { name: 'anhDaiDien', maxCount: 1 },
    { name: 'cvDinhKem', maxCount: 1 }
]), async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const updateData = req.body;

        // Kiểm tra ứng viên có tồn tại không
        const checkCandidate = await client.query('SELECT id FROM candidates WHERE id = $1', [id]);
        if (checkCandidate.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy ứng viên'
            });
        }

        const {
            hoTen, gioiTinh, ngaySinh, noiSinh, tinhTrangHonNhan,
            danToc, quocTich, tonGiao, soCCCD, ngayCapCCCD, noiCapCCCD,
            soDienThoai, soDienThoaiKhac, email,
            diaChiTamTru, diaChiLienLac,
            trinhDoVanHoa, trinhDoChuyenMon, chuyenNganh,
            chiNhanh, viTriUngTuyen, phongBan,
            ngayGuiCV, nguonCV,
            workExperiences, trainingProcesses, foreignLanguages
        } = req.body;

        // Parse JSON strings nếu có
        let diaChiTamTruObj = null;
        let diaChiLienLacObj = null;
        let workExp = [];
        let trainingProc = [];
        let foreignLang = [];

        try {
            if (diaChiTamTru) {
                diaChiTamTruObj = typeof diaChiTamTru === 'string' ? JSON.parse(diaChiTamTru) : diaChiTamTru;
            }
        } catch (e) {
            console.error('Error parsing diaChiTamTru:', e);
            diaChiTamTruObj = {};
        }

        try {
            if (diaChiLienLac) {
                diaChiLienLacObj = typeof diaChiLienLac === 'string' ? JSON.parse(diaChiLienLac) : diaChiLienLac;
            }
        } catch (e) {
            console.error('Error parsing diaChiLienLac:', e);
            diaChiLienLacObj = {};
        }

        try {
            if (workExperiences) {
                workExp = typeof workExperiences === 'string' ? JSON.parse(workExperiences) : (Array.isArray(workExperiences) ? workExperiences : []);
            }
        } catch (e) {
            console.error('Error parsing workExperiences:', e);
            workExp = [];
        }

        try {
            if (trainingProcesses) {
                trainingProc = typeof trainingProcesses === 'string' ? JSON.parse(trainingProcesses) : (Array.isArray(trainingProcesses) ? trainingProcesses : []);
            }
        } catch (e) {
            console.error('Error parsing trainingProcesses:', e);
            trainingProc = [];
        }

        try {
            if (foreignLanguages) {
                foreignLang = typeof foreignLanguages === 'string' ? JSON.parse(foreignLanguages) : (Array.isArray(foreignLanguages) ? foreignLanguages : []);
            }
        } catch (e) {
            console.error('Error parsing foreignLanguages:', e);
            foreignLang = [];
        }

        // Lấy đường dẫn file nếu có (chỉ cập nhật nếu có file mới)
        let anhDaiDienPath = null;
        let cvDinhKemPath = null;

        console.log('[PUT /api/candidates/:id] Files received:', {
            hasAnhDaiDien: !!req.files?.anhDaiDien?.[0],
            hasCvDinhKem: !!req.files?.cvDinhKem?.[0],
            anhDaiDienFilename: req.files?.anhDaiDien?.[0]?.filename,
            cvDinhKemFilename: req.files?.cvDinhKem?.[0]?.filename,
            filesKeys: req.files ? Object.keys(req.files) : [],
            allFiles: req.files ? Object.keys(req.files).map(k => ({ key: k, count: req.files[k]?.length || 0 })) : []
        });

        if (req.files?.anhDaiDien?.[0]?.filename) {
            anhDaiDienPath = `/uploads/candidates/${req.files.anhDaiDien[0].filename}`;
            console.log('[PUT /api/candidates/:id] Setting anhDaiDienPath:', anhDaiDienPath);
        }

        if (req.files?.cvDinhKem?.[0]?.filename) {
            cvDinhKemPath = `/uploads/candidates/${req.files.cvDinhKem[0].filename}`;
            console.log('[PUT /api/candidates/:id] Setting cvDinhKemPath:', cvDinhKemPath);
        } else {
            console.log('[PUT /api/candidates/:id] No CV file received in req.files');
            console.log('[PUT /api/candidates/:id] req.files structure:', JSON.stringify(req.files, null, 2));
        }

        // Build update query
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (hoTen !== undefined) {
            updateFields.push(`ho_ten = $${paramIndex++}`);
            updateValues.push((hoTen && typeof hoTen === 'string' ? hoTen.trim() : hoTen) || null);
        }
        if (gioiTinh !== undefined) {
            updateFields.push(`gioi_tinh = $${paramIndex++}`);
            updateValues.push((gioiTinh && typeof gioiTinh === 'string' ? gioiTinh.trim() : gioiTinh) || 'Nam');
        }
        if (ngaySinh !== undefined) {
            updateFields.push(`ngay_sinh = $${paramIndex++}`);
            updateValues.push(ngaySinh || null);
        }
        if (noiSinh !== undefined) {
            updateFields.push(`noi_sinh = $${paramIndex++}`);
            updateValues.push((noiSinh && typeof noiSinh === 'string' ? noiSinh.trim() : noiSinh) || null);
        }
        if (tinhTrangHonNhan !== undefined) {
            updateFields.push(`tinh_trang_hon_nhan = $${paramIndex++}`);
            updateValues.push((tinhTrangHonNhan && typeof tinhTrangHonNhan === 'string' ? tinhTrangHonNhan.trim() : tinhTrangHonNhan) || 'Độc thân');
        }
        if (danToc !== undefined) {
            updateFields.push(`dan_toc = $${paramIndex++}`);
            updateValues.push((danToc && typeof danToc === 'string' ? danToc.trim() : danToc) || null);
        }
        if (quocTich !== undefined) {
            updateFields.push(`quoc_tich = $${paramIndex++}`);
            updateValues.push((quocTich && typeof quocTich === 'string' ? quocTich.trim() : quocTich) || 'Việt Nam');
        }
        if (tonGiao !== undefined) {
            updateFields.push(`ton_giao = $${paramIndex++}`);
            updateValues.push((tonGiao && typeof tonGiao === 'string' ? tonGiao.trim() : tonGiao) || null);
        }
        if (soCCCD !== undefined) {
            updateFields.push(`so_cccd = $${paramIndex++}`);
            updateValues.push((soCCCD && typeof soCCCD === 'string' ? soCCCD.trim() : soCCCD) || null);
        }
        if (ngayCapCCCD !== undefined) {
            updateFields.push(`ngay_cap_cccd = $${paramIndex++}`);
            updateValues.push(ngayCapCCCD || null);
        }
        if (noiCapCCCD !== undefined) {
            updateFields.push(`noi_cap_cccd = $${paramIndex++}`);
            updateValues.push((noiCapCCCD && typeof noiCapCCCD === 'string' ? noiCapCCCD.trim() : noiCapCCCD) || null);
        }
        if (soDienThoai !== undefined) {
            updateFields.push(`so_dien_thoai = $${paramIndex++}`);
            updateValues.push((soDienThoai && typeof soDienThoai === 'string' ? soDienThoai.trim() : soDienThoai) || null);
        }
        if (soDienThoaiKhac !== undefined) {
            updateFields.push(`so_dien_thoai_khac = $${paramIndex++}`);
            updateValues.push((soDienThoaiKhac && typeof soDienThoaiKhac === 'string' ? soDienThoaiKhac.trim() : soDienThoaiKhac) || null);
        }
        if (email !== undefined) {
            updateFields.push(`email = $${paramIndex++}`);
            updateValues.push((email && typeof email === 'string' ? email.trim() : email) || null);
        }
        if (diaChiTamTruObj !== null) {
            if (diaChiTamTruObj.soNha !== undefined) {
                updateFields.push(`dia_chi_tam_tru_so_nha = $${paramIndex++}`);
                updateValues.push((diaChiTamTruObj.soNha && typeof diaChiTamTruObj.soNha === 'string' ? diaChiTamTruObj.soNha.trim() : diaChiTamTruObj.soNha) || null);
            }
            if (diaChiTamTruObj.phuongXa !== undefined) {
                updateFields.push(`dia_chi_tam_tru_phuong_xa = $${paramIndex++}`);
                updateValues.push((diaChiTamTruObj.phuongXa && typeof diaChiTamTruObj.phuongXa === 'string' ? diaChiTamTruObj.phuongXa.trim() : diaChiTamTruObj.phuongXa) || null);
            }
            if (diaChiTamTruObj.quanHuyen !== undefined) {
                updateFields.push(`dia_chi_tam_tru_quan_huyen = $${paramIndex++}`);
                updateValues.push((diaChiTamTruObj.quanHuyen && typeof diaChiTamTruObj.quanHuyen === 'string' ? diaChiTamTruObj.quanHuyen.trim() : diaChiTamTruObj.quanHuyen) || null);
            }
            if (diaChiTamTruObj.thanhPhoTinh !== undefined) {
                updateFields.push(`dia_chi_tam_tru_thanh_pho_tinh = $${paramIndex++}`);
                updateValues.push((diaChiTamTruObj.thanhPhoTinh && typeof diaChiTamTruObj.thanhPhoTinh === 'string' ? diaChiTamTruObj.thanhPhoTinh.trim() : diaChiTamTruObj.thanhPhoTinh) || null);
            }
        }
        if (diaChiLienLacObj !== null) {
            if (diaChiLienLacObj.soNha !== undefined) {
                updateFields.push(`nguyen_quan_so_nha = $${paramIndex++}`);
                updateValues.push((diaChiLienLacObj.soNha && typeof diaChiLienLacObj.soNha === 'string' ? diaChiLienLacObj.soNha.trim() : diaChiLienLacObj.soNha) || null);
            }
            if (diaChiLienLacObj.phuongXa !== undefined) {
                updateFields.push(`nguyen_quan_phuong_xa = $${paramIndex++}`);
                updateValues.push((diaChiLienLacObj.phuongXa && typeof diaChiLienLacObj.phuongXa === 'string' ? diaChiLienLacObj.phuongXa.trim() : diaChiLienLacObj.phuongXa) || null);
            }
            if (diaChiLienLacObj.quanHuyen !== undefined) {
                updateFields.push(`nguyen_quan_quan_huyen = $${paramIndex++}`);
                updateValues.push((diaChiLienLacObj.quanHuyen && typeof diaChiLienLacObj.quanHuyen === 'string' ? diaChiLienLacObj.quanHuyen.trim() : diaChiLienLacObj.quanHuyen) || null);
            }
            if (diaChiLienLacObj.thanhPhoTinh !== undefined) {
                updateFields.push(`nguyen_quan_thanh_pho_tinh = $${paramIndex++}`);
                updateValues.push((diaChiLienLacObj.thanhPhoTinh && typeof diaChiLienLacObj.thanhPhoTinh === 'string' ? diaChiLienLacObj.thanhPhoTinh.trim() : diaChiLienLacObj.thanhPhoTinh) || null);
            }
        }
        if (trinhDoVanHoa !== undefined) {
            updateFields.push(`trinh_do_van_hoa = $${paramIndex++}`);
            updateValues.push((trinhDoVanHoa && typeof trinhDoVanHoa === 'string' ? trinhDoVanHoa.trim() : trinhDoVanHoa) || null);
        }
        if (trinhDoChuyenMon !== undefined) {
            updateFields.push(`trinh_do_chuyen_mon = $${paramIndex++}`);
            updateValues.push((trinhDoChuyenMon && typeof trinhDoChuyenMon === 'string' ? trinhDoChuyenMon.trim() : trinhDoChuyenMon) || null);
        }
        if (chuyenNganh !== undefined) {
            updateFields.push(`chuyen_nganh = $${paramIndex++}`);
            updateValues.push((chuyenNganh && typeof chuyenNganh === 'string' ? chuyenNganh.trim() : chuyenNganh) || null);
        }
        if (chiNhanh !== undefined) {
            updateFields.push(`chi_nhanh = $${paramIndex++}`);
            updateValues.push((chiNhanh && typeof chiNhanh === 'string' ? chiNhanh.trim() : chiNhanh) || null);
        }
        if (viTriUngTuyen !== undefined) {
            updateFields.push(`vi_tri_ung_tuyen = $${paramIndex++}`);
            updateValues.push((viTriUngTuyen && typeof viTriUngTuyen === 'string' ? viTriUngTuyen.trim() : viTriUngTuyen) || null);
        }
        if (phongBan !== undefined) {
            updateFields.push(`phong_ban = $${paramIndex++}`);
            updateValues.push((phongBan && typeof phongBan === 'string' ? phongBan.trim() : phongBan) || null);
        }
        if (ngayGuiCV !== undefined) {
            updateFields.push(`ngay_gui_cv = $${paramIndex++}`);
            updateValues.push(ngayGuiCV || null);
        }
        if (nguonCV !== undefined) {
            updateFields.push(`nguon_cv = $${paramIndex++}`);
            updateValues.push((nguonCV && typeof nguonCV === 'string' ? nguonCV.trim() : nguonCV) || null);
        }
        if (anhDaiDienPath !== null) {
            updateFields.push(`anh_dai_dien_path = $${paramIndex++}`);
            updateValues.push(anhDaiDienPath);
        }
        if (cvDinhKemPath !== null) {
            updateFields.push(`cv_dinh_kem_path = $${paramIndex++}`);
            updateValues.push(cvDinhKemPath);
        }

        // Cập nhật bảng candidates
        if (updateFields.length > 0) {
            updateFields.push(`updated_at = NOW()`);
            updateValues.push(id);
            const updateQuery = `UPDATE candidates SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
            await client.query(updateQuery, updateValues);
        }

        // Xóa các bản ghi cũ trong các bảng con
        await client.query('DELETE FROM candidate_work_experiences WHERE candidate_id = $1', [id]);
        await client.query('DELETE FROM candidate_training_processes WHERE candidate_id = $1', [id]);
        await client.query('DELETE FROM candidate_foreign_languages WHERE candidate_id = $1', [id]);

        // Thêm lại kinh nghiệm làm việc
        if (workExp && Array.isArray(workExp)) {
            for (const exp of workExp) {
                if (exp.ngayBatDau || exp.ngayKetThuc || exp.congTy || exp.chucDanh) {
                    await client.query(`
                        INSERT INTO candidate_work_experiences (candidate_id, ngay_bat_dau, ngay_ket_thuc, cong_ty, chuc_danh)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [
                        id,
                        exp.ngayBatDau || null,
                        exp.ngayKetThuc || null,
                        exp.congTy || null,
                        exp.chucDanh || null
                    ]);
                }
            }
        }

        // Thêm lại quá trình đào tạo
        if (trainingProc && Array.isArray(trainingProc)) {
            for (const tp of trainingProc) {
                if (tp.ngayBatDau || tp.ngayKetThuc || tp.truongDaoTao || tp.chuyenNganh || tp.vanBang) {
                    await client.query(`
                        INSERT INTO candidate_training_processes (candidate_id, ngay_bat_dau, ngay_ket_thuc, truong_dao_tao, chuyen_nganh, van_bang)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        id,
                        tp.ngayBatDau || null,
                        tp.ngayKetThuc || null,
                        tp.truongDaoTao || null,
                        tp.chuyenNganh || null,
                        tp.vanBang || null
                    ]);
                }
            }
        }

        // Thêm lại trình độ ngoại ngữ
        if (foreignLang && Array.isArray(foreignLang)) {
            for (const fl of foreignLang) {
                if (fl.ngoaiNgu || fl.chungChi || fl.diem || fl.khaNangSuDung) {
                    await client.query(`
                        INSERT INTO candidate_foreign_languages (candidate_id, ngoai_ngu, chung_chi, diem, kha_nang_su_dung)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [
                        id,
                        fl.ngoaiNgu || null,
                        fl.chungChi || null,
                        fl.diem || null,
                        fl.khaNangSuDung || 'A: Giỏi'
                    ]);
                }
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Đã cập nhật ứng viên thành công'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating candidate:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật ứng viên: ' + error.message
        });
    } finally {
        client.release();
    }
});

// DELETE /api/candidates/:id - Xóa ứng viên
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM candidates WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy ứng viên'
            });
        }

        res.json({
            success: true,
            message: 'Đã xóa ứng viên thành công'
        });
    } catch (error) {
        console.error('Error deleting candidate:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa ứng viên: ' + error.message
        });
    }
});

// POST /api/candidates/:id/start-probation - Bắt đầu thử việc
router.post('/:id/start-probation', async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { startDate, recruitmentInfo } = req.body;
        
        if (!startDate) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp ngày bắt đầu thử việc'
            });
        }
        
        // Kiểm tra ứng viên có tồn tại không
        const checkCandidate = await client.query('SELECT id, trang_thai FROM candidates WHERE id = $1', [id]);
        if (checkCandidate.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy ứng viên'
            });
        }
        
        // Update candidate status và ngày bắt đầu thử việc
        // Thử update với probation_start_date trước
        try {
            const updateQuery = `
                UPDATE candidates 
                SET trang_thai = $1, probation_start_date = $2, updated_at = NOW()
                WHERE id = $3
            `;
            await client.query(updateQuery, ['ON_PROBATION', startDate, id]);
        } catch (err) {
            // Nếu cột không tồn tại, chỉ update status
            if (err.message.includes('column "probation_start_date" does not exist')) {
                console.warn('Column probation_start_date does not exist, updating status only');
                const fallbackQuery = `
                    UPDATE candidates 
                    SET trang_thai = $1, updated_at = NOW()
                    WHERE id = $2
                `;
                await client.query(fallbackQuery, ['ON_PROBATION', id]);
            } else {
                console.error('Error updating candidate:', err);
                throw err;
            }
        }
        
        // Lưu thông tin recruitment info vào bảng riêng nếu có (có thể tạo bảng sau)
        // Hiện tại chỉ update status và ngày bắt đầu
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: 'Bắt đầu thử việc thành công',
            data: {
                candidateId: id,
                startDate: startDate,
                status: 'ON_PROBATION'
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error starting probation:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi bắt đầu thử việc: ' + error.message
        });
    } finally {
        client.release();
    }
});

module.exports = router;

