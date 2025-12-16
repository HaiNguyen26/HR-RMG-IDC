const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Ensure table
const ensureInterviewEvaluationsTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS interview_evaluations (
            id SERIAL PRIMARY KEY,
            interview_request_id INTEGER NOT NULL REFERENCES interview_requests(id) ON DELETE CASCADE,
            candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
            evaluator_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            
            -- Thông tin cơ bản
            ten_ung_vien VARCHAR(255),
            vi_tri_ung_tuyen VARCHAR(255),
            cap_bac VARCHAR(100),
            nguoi_quan_ly_truc_tiep VARCHAR(255),
            nguoi_phong_van_1 VARCHAR(255),
            ngay_phong_van TIMESTAMP,
            
            -- Điểm đánh giá (0-5)
            diem_ky_nang_giao_tiep INTEGER CHECK (diem_ky_nang_giao_tiep >= 0 AND diem_ky_nang_giao_tiep <= 5),
            ly_do_ky_nang_giao_tiep TEXT,
            
            diem_thai_do_lam_viec INTEGER CHECK (diem_thai_do_lam_viec >= 0 AND diem_thai_do_lam_viec <= 5),
            ly_do_thai_do_lam_viec TEXT,
            
            diem_kinh_nghiem_chuyen_mon INTEGER CHECK (diem_kinh_nghiem_chuyen_mon >= 0 AND diem_kinh_nghiem_chuyen_mon <= 5),
            ly_do_kinh_nghiem_chuyen_mon TEXT,
            
            diem_kha_nang_quan_ly_du_an INTEGER CHECK (diem_kha_nang_quan_ly_du_an >= 0 AND diem_kha_nang_quan_ly_du_an <= 5),
            ly_do_kha_nang_quan_ly_du_an TEXT,
            
            diem_ngoai_ngu INTEGER CHECK (diem_ngoai_ngu >= 0 AND diem_ngoai_ngu <= 5),
            ly_do_ngoai_ngu TEXT,
            
            diem_ky_nang_quan_ly INTEGER CHECK (diem_ky_nang_quan_ly >= 0 AND diem_ky_nang_quan_ly <= 5),
            ly_do_ky_nang_quan_ly TEXT,
            
            -- Nhận xét
            diem_manh TEXT,
            diem_can_cai_thien TEXT,
            nhan_xet_chung TEXT,
            
            -- Kết luận
            ket_luan VARCHAR(50) CHECK (ket_luan IN ('DAT_YEU_CAU', 'KHONG_DAT_YEU_CAU', 'LUU_HO_SO')),
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_interview_evaluations_request ON interview_evaluations(interview_request_id);
        CREATE INDEX IF NOT EXISTS idx_interview_evaluations_candidate ON interview_evaluations(candidate_id);
        CREATE INDEX IF NOT EXISTS idx_interview_evaluations_evaluator ON interview_evaluations(evaluator_id);
    `);

    // Thêm trigger để tự động cập nhật updated_at
    try {
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_interview_evaluations_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await pool.query(`
            DROP TRIGGER IF EXISTS trigger_update_interview_evaluations_updated_at ON interview_evaluations;
            CREATE TRIGGER trigger_update_interview_evaluations_updated_at
            BEFORE UPDATE ON interview_evaluations
            FOR EACH ROW
            EXECUTE FUNCTION update_interview_evaluations_updated_at();
        `);
    } catch (error) {
        console.log('[ensureInterviewEvaluationsTable] Note about trigger:', error.message);
    }
};

// GET /api/interview-evaluations?interviewRequestId=&candidateId=&evaluatorId=
router.get('/', async (req, res) => {
    try {
        await ensureInterviewEvaluationsTable();

        const { interviewRequestId, candidateId, evaluatorId } = req.query;
        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (interviewRequestId) {
            conditions.push(`ie.interview_request_id = $${paramIndex++}`);
            params.push(parseInt(interviewRequestId, 10));
        }

        if (candidateId) {
            conditions.push(`ie.candidate_id = $${paramIndex++}`);
            params.push(parseInt(candidateId, 10));
        }

        if (evaluatorId) {
            conditions.push(`ie.evaluator_id = $${paramIndex++}`);
            params.push(parseInt(evaluatorId, 10));
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const query = `
            SELECT 
                ie.*,
                e.ho_ten as evaluator_name,
                c.ho_ten as candidate_name,
                ir.interview_time as interview_time_from_request
            FROM interview_evaluations ie
            LEFT JOIN employees e ON ie.evaluator_id = e.id
            LEFT JOIN candidates c ON ie.candidate_id = c.id
            LEFT JOIN interview_requests ir ON ie.interview_request_id = ir.id
            ${whereClause}
            ORDER BY ie.created_at DESC
        `;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('[GET /api/interview-evaluations] error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách đánh giá phỏng vấn: ' + error.message
        });
    }
});

// GET /api/interview-evaluations/:id
router.get('/:id', async (req, res) => {
    try {
        await ensureInterviewEvaluationsTable();

        const { id } = req.params;
        const evaluationId = parseInt(id, 10);

        if (isNaN(evaluationId) || evaluationId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid evaluation ID'
            });
        }

        const result = await pool.query(`
            SELECT 
                ie.*,
                e.ho_ten as evaluator_name,
                c.ho_ten as candidate_name,
                ir.interview_time as interview_time_from_request
            FROM interview_evaluations ie
            LEFT JOIN employees e ON ie.evaluator_id = e.id
            LEFT JOIN candidates c ON ie.candidate_id = c.id
            LEFT JOIN interview_requests ir ON ie.interview_request_id = ir.id
            WHERE ie.id = $1
        `, [evaluationId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đánh giá phỏng vấn'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('[GET /api/interview-evaluations/:id] error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy đánh giá phỏng vấn: ' + error.message
        });
    }
});

// POST /api/interview-evaluations
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        await ensureInterviewEvaluationsTable();
        await client.query('BEGIN');

        const {
            interviewRequestId,
            candidateId,
            evaluatorId,
            tenUngVien,
            viTriUngTuyen,
            capBac,
            nguoiQuanLyTrucTiep,
            nguoiPhongVan1,
            ngayPhongVan,
            diemKyNangGiaoTiep,
            lyDoKyNangGiaoTiep,
            diemThaiDoLamViec,
            lyDoThaiDoLamViec,
            diemKinhNghiemChuyenMon,
            lyDoKinhNghiemChuyenMon,
            diemKhaNangQuanLyDuAn,
            lyDoKhaNangQuanLyDuAn,
            diemNgoaiNgu,
            lyDoNgoaiNgu,
            diemKyNangQuanLy,
            lyDoKyNangQuanLy,
            diemManh,
            diemCanCaiThien,
            nhanXetChung,
            ketLuan
        } = req.body;

        // Validate required fields
        if (!interviewRequestId || !candidateId || !evaluatorId) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc: interviewRequestId, candidateId, evaluatorId'
            });
        }

        // Helper function to safely parse integer
        const safeParseInt = (value) => {
            if (value === undefined || value === null || value === '') {
                return null;
            }
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? null : parsed;
        };

        const insertQuery = `
            INSERT INTO interview_evaluations (
                interview_request_id, candidate_id, evaluator_id,
                ten_ung_vien, vi_tri_ung_tuyen, cap_bac,
                nguoi_quan_ly_truc_tiep, nguoi_phong_van_1, ngay_phong_van,
                diem_ky_nang_giao_tiep, ly_do_ky_nang_giao_tiep,
                diem_thai_do_lam_viec, ly_do_thai_do_lam_viec,
                diem_kinh_nghiem_chuyen_mon, ly_do_kinh_nghiem_chuyen_mon,
                diem_kha_nang_quan_ly_du_an, ly_do_kha_nang_quan_ly_du_an,
                diem_ngoai_ngu, ly_do_ngoai_ngu,
                diem_ky_nang_quan_ly, ly_do_ky_nang_quan_ly,
                diem_manh, diem_can_cai_thien, nhan_xet_chung, ket_luan
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
            ) RETURNING *
        `;

        const result = await client.query(insertQuery, [
            parseInt(interviewRequestId, 10),
            parseInt(candidateId, 10),
            parseInt(evaluatorId, 10),
            tenUngVien || null,
            viTriUngTuyen || null,
            capBac || null,
            nguoiQuanLyTrucTiep || null,
            nguoiPhongVan1 || null,
            ngayPhongVan ? new Date(ngayPhongVan) : null,
            safeParseInt(diemKyNangGiaoTiep),
            lyDoKyNangGiaoTiep || null,
            safeParseInt(diemThaiDoLamViec),
            lyDoThaiDoLamViec || null,
            safeParseInt(diemKinhNghiemChuyenMon),
            lyDoKinhNghiemChuyenMon || null,
            safeParseInt(diemKhaNangQuanLyDuAn),
            lyDoKhaNangQuanLyDuAn || null,
            safeParseInt(diemNgoaiNgu),
            lyDoNgoaiNgu || null,
            safeParseInt(diemKyNangQuanLy),
            lyDoKyNangQuanLy || null,
            diemManh || null,
            diemCanCaiThien || null,
            nhanXetChung || null,
            ketLuan || null
        ]);

        // Kiểm tra xem cả 2 người đã đánh giá "đạt yêu cầu" chưa để tự động cập nhật candidate status
        const interviewRequestIdInt = parseInt(interviewRequestId, 10);
        const candidateIdInt = parseInt(candidateId, 10);

        // Lấy tất cả evaluations cho interview request này
        const allEvalsResult = await client.query(
            `SELECT evaluator_id, ket_luan FROM interview_evaluations 
             WHERE interview_request_id = $1`,
            [interviewRequestIdInt]
        );

        // Lấy thông tin interview request để biết manager_id và branch_director_id
        const interviewRequestResult = await client.query(
            `SELECT manager_id, branch_director_id FROM interview_requests WHERE id = $1`,
            [interviewRequestIdInt]
        );

        if (interviewRequestResult.rows.length > 0) {
            const ir = interviewRequestResult.rows[0];
            const managerId = ir.manager_id;
            const branchDirectorId = ir.branch_director_id;

            // Tìm evaluations của manager và branch director
            const managerEval = allEvalsResult.rows.find(e => e.evaluator_id === managerId);
            const directorEval = allEvalsResult.rows.find(e => e.evaluator_id === branchDirectorId);

            console.log('[POST /api/interview-evaluations] Checking evaluations:', {
                managerId,
                branchDirectorId,
                managerEval: managerEval ? { evaluator_id: managerEval.evaluator_id, ket_luan: managerEval.ket_luan } : null,
                directorEval: directorEval ? { evaluator_id: directorEval.evaluator_id, ket_luan: directorEval.ket_luan } : null,
                candidateId: candidateIdInt
            });

            // Nếu cả 2 đều đánh giá "đạt yêu cầu", cập nhật candidate status thành PASSED
            if (managerEval && directorEval &&
                managerEval.ket_luan === 'DAT_YEU_CAU' &&
                directorEval.ket_luan === 'DAT_YEU_CAU') {
                const updateResult = await client.query(
                    `UPDATE candidates SET trang_thai = $1, updated_at = NOW() WHERE id = $2 RETURNING id, trang_thai`,
                    ['PASSED', candidateIdInt]
                );
                console.log('[POST /api/interview-evaluations] Updated candidate status to PASSED:', {
                    candidateId: candidateIdInt,
                    oldStatus: 'READY_FOR_INTERVIEW',
                    newStatus: updateResult.rows[0]?.trang_thai
                });
            } else {
                console.log('[POST /api/interview-evaluations] Conditions not met for PASSED status:', {
                    hasManagerEval: !!managerEval,
                    hasDirectorEval: !!directorEval,
                    managerKetLuan: managerEval?.ket_luan,
                    directorKetLuan: directorEval?.ket_luan
                });
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[POST /api/interview-evaluations] error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo đánh giá phỏng vấn: ' + error.message
        });
    } finally {
        client.release();
    }
});

// PUT /api/interview-evaluations/:id
router.put('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await ensureInterviewEvaluationsTable();
        await client.query('BEGIN');

        const { id } = req.params;
        const evaluationId = parseInt(id, 10);

        if (isNaN(evaluationId) || evaluationId <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Invalid evaluation ID'
            });
        }

        const {
            tenUngVien,
            viTriUngTuyen,
            capBac,
            nguoiQuanLyTrucTiep,
            nguoiPhongVan1,
            ngayPhongVan,
            diemKyNangGiaoTiep,
            lyDoKyNangGiaoTiep,
            diemThaiDoLamViec,
            lyDoThaiDoLamViec,
            diemKinhNghiemChuyenMon,
            lyDoKinhNghiemChuyenMon,
            diemKhaNangQuanLyDuAn,
            lyDoKhaNangQuanLyDuAn,
            diemNgoaiNgu,
            lyDoNgoaiNgu,
            diemKyNangQuanLy,
            lyDoKyNangQuanLy,
            diemManh,
            diemCanCaiThien,
            nhanXetChung,
            ketLuan
        } = req.body;

        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (tenUngVien !== undefined) {
            updateFields.push(`ten_ung_vien = $${paramIndex++}`);
            updateValues.push(tenUngVien || null);
        }
        if (viTriUngTuyen !== undefined) {
            updateFields.push(`vi_tri_ung_tuyen = $${paramIndex++}`);
            updateValues.push(viTriUngTuyen || null);
        }
        if (capBac !== undefined) {
            updateFields.push(`cap_bac = $${paramIndex++}`);
            updateValues.push(capBac || null);
        }
        if (nguoiQuanLyTrucTiep !== undefined) {
            updateFields.push(`nguoi_quan_ly_truc_tiep = $${paramIndex++}`);
            updateValues.push(nguoiQuanLyTrucTiep || null);
        }
        if (nguoiPhongVan1 !== undefined) {
            updateFields.push(`nguoi_phong_van_1 = $${paramIndex++}`);
            updateValues.push(nguoiPhongVan1 || null);
        }
        if (ngayPhongVan !== undefined) {
            updateFields.push(`ngay_phong_van = $${paramIndex++}`);
            updateValues.push(ngayPhongVan ? new Date(ngayPhongVan) : null);
        }
        // Helper function to safely parse integer
        const safeParseInt = (value) => {
            if (value === undefined || value === null || value === '') {
                return null;
            }
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? null : parsed;
        };

        if (diemKyNangGiaoTiep !== undefined) {
            updateFields.push(`diem_ky_nang_giao_tiep = $${paramIndex++}`);
            updateValues.push(safeParseInt(diemKyNangGiaoTiep));
        }
        if (lyDoKyNangGiaoTiep !== undefined) {
            updateFields.push(`ly_do_ky_nang_giao_tiep = $${paramIndex++}`);
            updateValues.push(lyDoKyNangGiaoTiep || null);
        }
        if (diemThaiDoLamViec !== undefined) {
            updateFields.push(`diem_thai_do_lam_viec = $${paramIndex++}`);
            updateValues.push(safeParseInt(diemThaiDoLamViec));
        }
        if (lyDoThaiDoLamViec !== undefined) {
            updateFields.push(`ly_do_thai_do_lam_viec = $${paramIndex++}`);
            updateValues.push(lyDoThaiDoLamViec || null);
        }
        if (diemKinhNghiemChuyenMon !== undefined) {
            updateFields.push(`diem_kinh_nghiem_chuyen_mon = $${paramIndex++}`);
            updateValues.push(safeParseInt(diemKinhNghiemChuyenMon));
        }
        if (lyDoKinhNghiemChuyenMon !== undefined) {
            updateFields.push(`ly_do_kinh_nghiem_chuyen_mon = $${paramIndex++}`);
            updateValues.push(lyDoKinhNghiemChuyenMon || null);
        }
        if (diemKhaNangQuanLyDuAn !== undefined) {
            updateFields.push(`diem_kha_nang_quan_ly_du_an = $${paramIndex++}`);
            updateValues.push(safeParseInt(diemKhaNangQuanLyDuAn));
        }
        if (lyDoKhaNangQuanLyDuAn !== undefined) {
            updateFields.push(`ly_do_kha_nang_quan_ly_du_an = $${paramIndex++}`);
            updateValues.push(lyDoKhaNangQuanLyDuAn || null);
        }
        if (diemNgoaiNgu !== undefined) {
            updateFields.push(`diem_ngoai_ngu = $${paramIndex++}`);
            updateValues.push(safeParseInt(diemNgoaiNgu));
        }
        if (lyDoNgoaiNgu !== undefined) {
            updateFields.push(`ly_do_ngoai_ngu = $${paramIndex++}`);
            updateValues.push(lyDoNgoaiNgu || null);
        }
        if (diemKyNangQuanLy !== undefined) {
            updateFields.push(`diem_ky_nang_quan_ly = $${paramIndex++}`);
            updateValues.push(safeParseInt(diemKyNangQuanLy));
        }
        if (lyDoKyNangQuanLy !== undefined) {
            updateFields.push(`ly_do_ky_nang_quan_ly = $${paramIndex++}`);
            updateValues.push(lyDoKyNangQuanLy || null);
        }
        if (diemManh !== undefined) {
            updateFields.push(`diem_manh = $${paramIndex++}`);
            updateValues.push(diemManh || null);
        }
        if (diemCanCaiThien !== undefined) {
            updateFields.push(`diem_can_cai_thien = $${paramIndex++}`);
            updateValues.push(diemCanCaiThien || null);
        }
        if (nhanXetChung !== undefined) {
            updateFields.push(`nhan_xet_chung = $${paramIndex++}`);
            updateValues.push(nhanXetChung || null);
        }
        if (ketLuan !== undefined) {
            updateFields.push(`ket_luan = $${paramIndex++}`);
            updateValues.push(ketLuan || null);
        }

        if (updateFields.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Không có trường nào để cập nhật'
            });
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(evaluationId);

        const updateQuery = `
            UPDATE interview_evaluations
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await client.query(updateQuery, updateValues);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đánh giá phỏng vấn'
            });
        }

        // Kiểm tra xem cả 2 người đã đánh giá "đạt yêu cầu" chưa để tự động cập nhật candidate status
        const updatedEval = result.rows[0];
        const interviewRequestIdInt = updatedEval.interview_request_id;
        const candidateIdInt = updatedEval.candidate_id;

        // Lấy tất cả evaluations cho interview request này
        const allEvalsResult = await client.query(
            `SELECT evaluator_id, ket_luan FROM interview_evaluations 
             WHERE interview_request_id = $1`,
            [interviewRequestIdInt]
        );

        // Lấy thông tin interview request để biết manager_id và branch_director_id
        const interviewRequestResult = await client.query(
            `SELECT manager_id, branch_director_id FROM interview_requests WHERE id = $1`,
            [interviewRequestIdInt]
        );

        if (interviewRequestResult.rows.length > 0) {
            const ir = interviewRequestResult.rows[0];
            const managerId = ir.manager_id;
            const branchDirectorId = ir.branch_director_id;

            // Tìm evaluations của manager và branch director
            const managerEval = allEvalsResult.rows.find(e => e.evaluator_id === managerId);
            const directorEval = allEvalsResult.rows.find(e => e.evaluator_id === branchDirectorId);

            console.log('[PUT /api/interview-evaluations] Checking evaluations:', {
                managerId,
                branchDirectorId,
                managerEval: managerEval ? { evaluator_id: managerEval.evaluator_id, ket_luan: managerEval.ket_luan } : null,
                directorEval: directorEval ? { evaluator_id: directorEval.evaluator_id, ket_luan: directorEval.ket_luan } : null,
                candidateId: candidateIdInt
            });

            // Nếu cả 2 đều đánh giá "đạt yêu cầu", cập nhật candidate status thành PASSED
            if (managerEval && directorEval &&
                managerEval.ket_luan === 'DAT_YEU_CAU' &&
                directorEval.ket_luan === 'DAT_YEU_CAU') {
                const updateResult = await client.query(
                    `UPDATE candidates SET trang_thai = $1, updated_at = NOW() WHERE id = $2 RETURNING id, trang_thai`,
                    ['PASSED', candidateIdInt]
                );
                console.log('[PUT /api/interview-evaluations] Updated candidate status to PASSED:', {
                    candidateId: candidateIdInt,
                    oldStatus: 'READY_FOR_INTERVIEW',
                    newStatus: updateResult.rows[0]?.trang_thai
                });
            } else {
                console.log('[PUT /api/interview-evaluations] Conditions not met for PASSED status:', {
                    hasManagerEval: !!managerEval,
                    hasDirectorEval: !!directorEval,
                    managerKetLuan: managerEval?.ket_luan,
                    directorKetLuan: directorEval?.ket_luan
                });
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[PUT /api/interview-evaluations/:id] error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật đánh giá phỏng vấn: ' + error.message
        });
    } finally {
        client.release();
    }
});

// POST /api/interview-evaluations/check-and-update-status/:candidateId
// Kiểm tra và cập nhật candidate status thành PASSED nếu cả 2 đánh giá "Đạt yêu cầu"
router.post('/check-and-update-status/:candidateId', async (req, res) => {
    const client = await pool.connect();
    try {
        const { candidateId } = req.params;
        const candidateIdInt = parseInt(candidateId, 10);

        if (isNaN(candidateIdInt)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid candidate ID'
            });
        }

        await client.query('BEGIN');

        // Lấy interview request của candidate này
        const interviewRequestResult = await client.query(
            `SELECT id, manager_id, branch_director_id FROM interview_requests WHERE candidate_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [candidateIdInt]
        );

        if (interviewRequestResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.json({
                success: false,
                message: 'Không tìm thấy interview request cho candidate này'
            });
        }

        const interviewRequest = interviewRequestResult.rows[0];
        const interviewRequestId = interviewRequest.id;
        const managerId = interviewRequest.manager_id;
        const branchDirectorId = interviewRequest.branch_director_id;

        // Lấy tất cả evaluations cho interview request này
        const allEvalsResult = await client.query(
            `SELECT evaluator_id, ket_luan FROM interview_evaluations 
             WHERE interview_request_id = $1`,
            [interviewRequestId]
        );

        // Tìm evaluations của manager và branch director
        const managerEval = allEvalsResult.rows.find(e => e.evaluator_id === managerId);
        const directorEval = allEvalsResult.rows.find(e => e.evaluator_id === branchDirectorId);

        console.log('[POST /api/interview-evaluations/check-and-update-status] Checking:', {
            candidateId: candidateIdInt,
            interviewRequestId,
            managerId,
            branchDirectorId,
            managerEval: managerEval ? { evaluator_id: managerEval.evaluator_id, ket_luan: managerEval.ket_luan } : null,
            directorEval: directorEval ? { evaluator_id: directorEval.evaluator_id, ket_luan: directorEval.ket_luan } : null
        });

        // Nếu cả 2 đều đánh giá "đạt yêu cầu", cập nhật candidate status thành PASSED
        if (managerEval && directorEval &&
            managerEval.ket_luan === 'DAT_YEU_CAU' &&
            directorEval.ket_luan === 'DAT_YEU_CAU') {

            // Kiểm tra status hiện tại
            const currentCandidateResult = await client.query(
                `SELECT trang_thai FROM candidates WHERE id = $1`,
                [candidateIdInt]
            );

            if (currentCandidateResult.rows.length > 0) {
                const currentStatus = currentCandidateResult.rows[0].trang_thai;

                if (currentStatus !== 'PASSED') {
                    const updateResult = await client.query(
                        `UPDATE candidates SET trang_thai = $1, updated_at = NOW() WHERE id = $2 RETURNING id, trang_thai`,
                        ['PASSED', candidateIdInt]
                    );

                    await client.query('COMMIT');

                    console.log('[POST /api/interview-evaluations/check-and-update-status] Updated status:', {
                        candidateId: candidateIdInt,
                        oldStatus: currentStatus,
                        newStatus: updateResult.rows[0]?.trang_thai
                    });

                    return res.json({
                        success: true,
                        message: 'Đã cập nhật status thành PASSED',
                        data: {
                            candidateId: candidateIdInt,
                            oldStatus: currentStatus,
                            newStatus: updateResult.rows[0]?.trang_thai
                        }
                    });
                } else {
                    await client.query('COMMIT');
                    return res.json({
                        success: true,
                        message: 'Status đã là PASSED',
                        data: {
                            candidateId: candidateIdInt,
                            status: currentStatus
                        }
                    });
                }
            }
        }

        await client.query('COMMIT');
        return res.json({
            success: false,
            message: 'Chưa đủ điều kiện để cập nhật status thành PASSED',
            data: {
                hasManagerEval: !!managerEval,
                hasDirectorEval: !!directorEval,
                managerKetLuan: managerEval?.ket_luan,
                directorKetLuan: directorEval?.ket_luan
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[POST /api/interview-evaluations/check-and-update-status] error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra và cập nhật status',
            error: error.message
        });
    } finally {
        client.release();
    }
});

module.exports = router;

