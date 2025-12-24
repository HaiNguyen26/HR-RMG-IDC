const express = require('express');
const router = express.Router();
const pool = require('../config/database');

const STATUSES = {
    PENDING: 'PENDING_INTERVIEW',
    WAITING_FOR_OTHER: 'WAITING_FOR_OTHER_APPROVAL', // Đang chờ người kia duyệt
    READY: 'READY_FOR_INTERVIEW', // Sẵn sàng phỏng vấn (cả 2 đã duyệt)
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED'
};

// Ensure candidates table has required status values in constraint
const ensureCandidatesStatusConstraint = async () => {
    try {
        // Kiểm tra constraint hiện tại
        const checkConstraint = await pool.query(`
            SELECT constraint_name, check_clause
            FROM information_schema.check_constraints
            WHERE constraint_name = 'candidates_trang_thai_check';
        `);

        // Kiểm tra xem constraint có chứa TRANSFERRED_TO_INTERVIEW chưa
        const constraintClause = checkConstraint.rows[0]?.check_clause || '';
        const hasTransferredStatus = constraintClause.includes('TRANSFERRED_TO_INTERVIEW');
        const hasReadyStatus = constraintClause.includes('READY_FOR_INTERVIEW');
        const hasWaitingStatus = constraintClause.includes('WAITING_FOR_OTHER_APPROVAL');

        // Nếu thiếu các status cần thiết, cập nhật constraint
        if (!hasTransferredStatus || !hasReadyStatus || !hasWaitingStatus) {
            console.log('[ensureCandidatesStatusConstraint] Updating constraint to include interview-related statuses');

            // Drop constraint cũ
            await pool.query(`
                ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_trang_thai_check;
            `);

            // Thêm constraint mới với đầy đủ các status
            await pool.query(`
                ALTER TABLE candidates 
                ADD CONSTRAINT candidates_trang_thai_check 
                CHECK (trang_thai IN (
                    'NEW',
                    'PENDING_INTERVIEW',
                    'PENDING_MANAGER',
                    'TRANSFERRED_TO_INTERVIEW',
                    'WAITING_FOR_OTHER_APPROVAL',
                    'READY_FOR_INTERVIEW',
                    'PASSED',
                    'FAILED',
                    'ON_PROBATION'
                ));
            `);

            console.log('[ensureCandidatesStatusConstraint] Updated constraint successfully');
        }
    } catch (error) {
        console.error('[ensureCandidatesStatusConstraint] Error:', error.message);
        // Không throw error, chỉ log để không block request
    }
};

// Ensure table
const ensureInterviewRequestsTable = async () => {
    // Tạo bảng trước (không tạo index trên branch_director_id ngay)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS interview_requests (
            id SERIAL PRIMARY KEY,
            candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
            recruitment_request_id INTEGER REFERENCES recruitment_requests(id) ON DELETE SET NULL,
            manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
            branch_director_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
            interview_time TIMESTAMP,
            status VARCHAR(40) NOT NULL DEFAULT 'PENDING_INTERVIEW',
            note TEXT,
            manager_approved BOOLEAN DEFAULT FALSE,
            branch_director_approved BOOLEAN DEFAULT FALSE,
            manager_approved_at TIMESTAMP,
            branch_director_approved_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tạo các index cơ bản (không bao gồm branch_director_id)
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_interview_requests_manager ON interview_requests(manager_id);
        CREATE INDEX IF NOT EXISTS idx_interview_requests_status ON interview_requests(status);
        CREATE INDEX IF NOT EXISTS idx_interview_requests_candidate ON interview_requests(candidate_id);
    `);

    // Thêm cột updated_at nếu chưa có (cho bảng đã tồn tại)
    try {
        await pool.query(`
            ALTER TABLE interview_requests 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);
    } catch (error) {
        // Ignore error if column already exists or table doesn't exist yet
        console.log('[ensureInterviewRequestsTable] Note about updated_at column:', error.message);
    }

    // Kiểm tra và thêm cột branch_director_id nếu bảng đã tồn tại nhưng thiếu cột này
    try {
        const branchDirectorColumnCheck = await pool.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'interview_requests' 
                AND column_name = 'branch_director_id'
            )
        `);

        if (!branchDirectorColumnCheck.rows[0].exists) {
            console.log('[ensureInterviewRequestsTable] Bảng đã tồn tại nhưng thiếu cột branch_director_id, đang thêm cột...');
            await pool.query(`
                ALTER TABLE interview_requests 
                ADD COLUMN branch_director_id INTEGER
            `);

            // Thêm foreign key constraint nếu có
            try {
                await pool.query(`
                    ALTER TABLE interview_requests
                    ADD CONSTRAINT fk_interview_requests_branch_director 
                    FOREIGN KEY (branch_director_id) 
                    REFERENCES employees(id) 
                    ON DELETE SET NULL
                `);
            } catch (fkError) {
                console.warn('[ensureInterviewRequestsTable] Không thể thêm foreign key constraint cho branch_director_id:', fkError.message);
            }
        }

        // Tạo index cho branch_director_id (chỉ khi cột đã tồn tại)
        const indexCheck = await pool.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'interview_requests' 
                AND column_name = 'branch_director_id'
            )
        `);

        if (indexCheck.rows[0].exists) {
            try {
                await pool.query(`
                    CREATE INDEX IF NOT EXISTS idx_interview_requests_director ON interview_requests(branch_director_id)
                `);
            } catch (indexError) {
                console.warn('[ensureInterviewRequestsTable] Không thể tạo index cho branch_director_id:', indexError.message);
            }
        }
    } catch (error) {
        console.warn('[ensureInterviewRequestsTable] Lỗi khi kiểm tra/thêm cột branch_director_id:', error.message);
        // Không throw error, chỉ log để không block request
    }

    // Kiểm tra và thêm cột recruitment_request_id nếu bảng đã tồn tại nhưng thiếu cột này
    try {
        const recruitmentRequestIdColumnCheck = await pool.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'interview_requests' 
                AND column_name = 'recruitment_request_id'
            )
        `);

        if (!recruitmentRequestIdColumnCheck.rows[0].exists) {
            console.log('[ensureInterviewRequestsTable] Bảng đã tồn tại nhưng thiếu cột recruitment_request_id, đang thêm cột...');
            await pool.query(`
                ALTER TABLE interview_requests 
                ADD COLUMN recruitment_request_id INTEGER
            `);

            // Thêm foreign key constraint nếu có
            try {
                await pool.query(`
                    ALTER TABLE interview_requests
                    ADD CONSTRAINT fk_interview_requests_recruitment_request 
                    FOREIGN KEY (recruitment_request_id) 
                    REFERENCES recruitment_requests(id) 
                    ON DELETE SET NULL
                `);
            } catch (fkError) {
                console.warn('[ensureInterviewRequestsTable] Không thể thêm foreign key constraint cho recruitment_request_id:', fkError.message);
            }
        }
    } catch (error) {
        console.warn('[ensureInterviewRequestsTable] Lỗi khi kiểm tra/thêm cột recruitment_request_id:', error.message);
        // Không throw error, chỉ log để không block request
    }

    // Đảm bảo candidates constraint có đầy đủ status
    await ensureCandidatesStatusConstraint();
};

// GET /api/interview-requests?managerId=&branchDirectorId=&status=&candidateId=
router.get('/', async (req, res) => {
    try {
        await ensureInterviewRequestsTable();
        const { managerId, branchDirectorId, status, candidateId } = req.query;
        const conditions = [];
        const params = [];
        let idx = 1;

        if (candidateId) {
            conditions.push(`ir.candidate_id = $${idx++}`);
            params.push(parseInt(candidateId, 10));
        }

        if (managerId && branchDirectorId) {
            conditions.push(`(ir.manager_id = $${idx} OR ir.branch_director_id = $${idx + 1})`);
            params.push(parseInt(managerId, 10));
            params.push(parseInt(branchDirectorId, 10));
            idx += 2;
        } else {
            if (managerId) {
                conditions.push(`ir.manager_id = $${idx++}`);
                params.push(parseInt(managerId, 10));
            }
            if (branchDirectorId) {
                conditions.push(`ir.branch_director_id = $${idx++}`);
                params.push(parseInt(branchDirectorId, 10));
            }
        }
        if (status && status !== 'ALL') {
            conditions.push(`ir.status = $${idx++}`);
            params.push(status);
        }

        // Đảm bảo các cột cần thiết đã tồn tại trước khi query
        const recruitmentRequestIdCheck = await pool.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'interview_requests' 
                AND column_name = 'recruitment_request_id'
            )
        `);
        const hasRecruitmentRequestId = recruitmentRequestIdCheck.rows[0].exists;

        const branchDirectorIdCheck = await pool.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'interview_requests' 
                AND column_name = 'branch_director_id'
            )
        `);
        const hasBranchDirectorId = branchDirectorIdCheck.rows[0].exists;

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        // Xây dựng query an toàn - chỉ JOIN nếu cột tồn tại
        let sql = `
            SELECT ir.*,
                   c.ho_ten as candidate_name,
                   c.vi_tri_ung_tuyen,
                   c.phong_ban,
                   c.so_dien_thoai,
                   c.trang_thai as candidate_status`;

        if (hasRecruitmentRequestId) {
            sql += `,
                   rr.chuc_danh_can_tuyen,
                   rr.phong_ban_bo_phan`;
        } else {
            sql += `,
                   NULL as chuc_danh_can_tuyen,
                   NULL as phong_ban_bo_phan`;
        }

        sql += `,
                   m.ho_ten as manager_name`;

        if (hasBranchDirectorId) {
            sql += `,
                   bd.ho_ten as branch_director_name`;
        } else {
            sql += `,
                   NULL as branch_director_name`;
        }

        sql += `
            FROM interview_requests ir
            LEFT JOIN candidates c ON ir.candidate_id = c.id`;

        if (hasRecruitmentRequestId) {
            sql += `
            LEFT JOIN recruitment_requests rr ON ir.recruitment_request_id = rr.id`;
        }

        sql += `
            LEFT JOIN employees m ON ir.manager_id = m.id`;

        if (hasBranchDirectorId) {
            sql += `
            LEFT JOIN employees bd ON ir.branch_director_id = bd.id`;
        }

        sql += `
            ${where}
            ORDER BY ir.created_at DESC
        `;

        console.log('[GET /api/interview-requests] Query:', sql);
        console.log('[GET /api/interview-requests] Params:', params);
        const result = await pool.query(sql, params);
        console.log('[GET /api/interview-requests] Found', result.rows.length, 'records');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('[GET /api/interview-requests] error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách chuyển phỏng vấn: ' + error.message });
    }
});

// POST /api/interview-requests
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        await ensureInterviewRequestsTable(); // This also ensures candidates constraint
        await client.query('BEGIN');

        const {
            candidateId,
            recruitmentRequestId,
            managerId,
            branchDirectorId,
            interviewTime,
            note
        } = req.body;

        console.log('[POST /api/interview-requests] Request body:', JSON.stringify(req.body, null, 2));

        if (!candidateId || !recruitmentRequestId) {
            return res.status(400).json({ success: false, message: 'Thiếu candidateId hoặc recruitmentRequestId' });
        }

        // Parse và validate IDs
        const candidateIdInt = parseInt(candidateId, 10);
        const recruitmentRequestIdInt = parseInt(recruitmentRequestId, 10);
        let managerIdInt = null;
        let branchDirectorIdInt = null;

        if (managerId !== null && managerId !== undefined && managerId !== '') {
            const parsed = parseInt(managerId, 10);
            if (!isNaN(parsed) && parsed > 0) {
                managerIdInt = parsed;
            }
        }

        if (branchDirectorId !== null && branchDirectorId !== undefined && branchDirectorId !== '') {
            const parsed = parseInt(branchDirectorId, 10);
            if (!isNaN(parsed) && parsed > 0) {
                branchDirectorIdInt = parsed;
            }
        }

        if (isNaN(candidateIdInt) || candidateIdInt <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid candidateId: ' + candidateId
            });
        }

        if (isNaN(recruitmentRequestIdInt) || recruitmentRequestIdInt <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid recruitmentRequestId: ' + recruitmentRequestId
            });
        }

        console.log('[POST /api/interview-requests] Inserting with:', {
            candidateId: candidateIdInt,
            recruitmentRequestId: recruitmentRequestIdInt,
            managerId: managerIdInt,
            branchDirectorId: branchDirectorIdInt,
            interviewTime
        });

        const insert = await client.query(
            `INSERT INTO interview_requests (
                candidate_id, recruitment_request_id, manager_id, branch_director_id, interview_time, status, note
            ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [
                candidateIdInt,
                recruitmentRequestIdInt,
                managerIdInt,
                branchDirectorIdInt,
                interviewTime ? new Date(interviewTime) : null,
                STATUSES.PENDING,
                note || null
            ]
        );

        // Cập nhật trạng thái candidate thành "TRANSFERRED_TO_INTERVIEW" (Đã chuyển PV)
        await client.query(
            `UPDATE candidates SET trang_thai = $1, updated_at = NOW() WHERE id = $2`,
            ['TRANSFERRED_TO_INTERVIEW', candidateIdInt]
        );
        console.log('[POST /api/interview-requests] Updated candidate status to TRANSFERRED_TO_INTERVIEW for candidate:', candidateIdInt);

        await client.query('COMMIT');
        console.log('[POST /api/interview-requests] Successfully created:', insert.rows[0]);
        res.json({ success: true, data: insert.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[POST /api/interview-requests] error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi tạo yêu cầu phỏng vấn: ' + error.message });
    } finally {
        client.release();
    }
});

// PUT /api/interview-requests/:id/approve
router.put('/:id/approve', async (req, res) => {
    const client = await pool.connect();
    try {
        await ensureInterviewRequestsTable();
        await client.query('BEGIN');

        const { id } = req.params;
        const { note, approverId } = req.body;

        // Lấy user ID từ header
        const userId = req.headers['user-id'] ? parseInt(req.headers['user-id'], 10) : null;
        const approverIdInt = approverId ? parseInt(approverId, 10) : userId;

        // Validate ID
        const requestId = parseInt(id, 10);
        if (isNaN(requestId) || requestId <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Invalid interview request ID'
            });
        }

        console.log('[PUT /api/interview-requests/:id/approve] Approving request:', {
            id: requestId,
            approverId: approverIdInt,
            note: note || null
        });

        // Lấy thông tin request
        const checkRequest = await client.query(
            `SELECT id, status, candidate_id, manager_id, branch_director_id, 
                    manager_approved, branch_director_approved 
             FROM interview_requests WHERE id = $1`,
            [requestId]
        );

        if (checkRequest.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu phỏng vấn'
            });
        }

        const currentRequest = checkRequest.rows[0];
        console.log('[PUT /api/interview-requests/:id/approve] Current request:', currentRequest);

        // Chỉ cho phép approve nếu status là PENDING_INTERVIEW hoặc WAITING_FOR_OTHER_APPROVAL
        if (currentRequest.status !== STATUSES.PENDING && currentRequest.status !== STATUSES.WAITING_FOR_OTHER) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `Yêu cầu phỏng vấn đã được xử lý (trạng thái hiện tại: ${currentRequest.status})`
            });
        }

        // Xác định người duyệt là manager hay branch_director
        let isManager = false;
        let isBranchDirector = false;

        if (currentRequest.manager_id && approverIdInt === currentRequest.manager_id) {
            isManager = true;
        } else if (currentRequest.branch_director_id && approverIdInt === currentRequest.branch_director_id) {
            isBranchDirector = true;
        } else {
            await client.query('ROLLBACK');
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền duyệt yêu cầu phỏng vấn này'
            });
        }

        // Kiểm tra xem người này đã duyệt chưa
        if ((isManager && currentRequest.manager_approved) ||
            (isBranchDirector && currentRequest.branch_director_approved)) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Bạn đã duyệt yêu cầu phỏng vấn này rồi'
            });
        }

        // Đánh dấu người duyệt
        let updateFields = [];
        let updateValues = [];
        let paramIndex = 1;

        if (isManager) {
            updateFields.push(`manager_approved = $${paramIndex++}`);
            updateValues.push(true);
            updateFields.push(`manager_approved_at = CURRENT_TIMESTAMP`);
        }

        if (isBranchDirector) {
            updateFields.push(`branch_director_approved = $${paramIndex++}`);
            updateValues.push(true);
            updateFields.push(`branch_director_approved_at = CURRENT_TIMESTAMP`);
        }

        if (note) {
            updateFields.push(`note = $${paramIndex++}`);
            updateValues.push(note);
        }

        // Kiểm tra xem cả 2 đã duyệt chưa
        const managerApproved = isManager ? true : currentRequest.manager_approved;
        const branchDirectorApproved = isBranchDirector ? true : currentRequest.branch_director_approved;

        let newStatus = STATUSES.PENDING;
        if (managerApproved && branchDirectorApproved) {
            // Cả 2 đã duyệt → chuyển sang READY_FOR_INTERVIEW
            newStatus = STATUSES.READY;
            // Cập nhật trạng thái candidate thành "READY_FOR_INTERVIEW" (Sẵn sàng PV)
            await client.query(
                `UPDATE candidates SET trang_thai = $1, updated_at = NOW() WHERE id = $2`,
                ['READY_FOR_INTERVIEW', currentRequest.candidate_id]
            );
        } else {
            // Chỉ 1 người duyệt → chuyển sang WAITING_FOR_OTHER_APPROVAL
            newStatus = STATUSES.WAITING_FOR_OTHER;
        }

        updateFields.push(`status = $${paramIndex++}`);
        updateValues.push(newStatus);
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(requestId);

        // Update request
        const updateQuery = `
            UPDATE interview_requests 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await client.query(updateQuery, updateValues);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(500).json({
                success: false,
                message: 'Không thể cập nhật trạng thái yêu cầu phỏng vấn'
            });
        }

        await client.query('COMMIT');
        console.log('[PUT /api/interview-requests/:id/approve] Successfully approved:', result.rows[0]);
        res.json({
            success: true,
            data: result.rows[0],
            message: managerApproved && branchDirectorApproved
                ? 'Cả hai người đã duyệt. Ứng viên đã sẵn sàng phỏng vấn.'
                : 'Đã duyệt. Đang chờ người kia duyệt.'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[PUT /api/interview-requests/:id/approve] error:', error);
        console.error('[PUT /api/interview-requests/:id/approve] error stack:', error.stack);
        res.status(500).json({ success: false, message: 'Lỗi khi duyệt yêu cầu phỏng vấn: ' + error.message });
    } finally {
        client.release();
    }
});

// PUT /api/interview-requests/:id/reject
router.put('/:id/reject', async (req, res) => {
    const client = await pool.connect();
    try {
        await ensureInterviewRequestsTable();
        await client.query('BEGIN');

        const { id } = req.params;
        const { note, rejectionReason } = req.body;

        // Validate ID
        const requestId = parseInt(id, 10);
        if (isNaN(requestId) || requestId <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Invalid interview request ID'
            });
        }

        console.log('[PUT /api/interview-requests/:id/reject] Rejecting request:', {
            id: requestId,
            note: note || rejectionReason || null,
            currentStatus: STATUSES.PENDING
        });

        // Kiểm tra xem request có tồn tại và đang ở trạng thái PENDING không
        const checkRequest = await client.query(
            `SELECT id, status, candidate_id FROM interview_requests WHERE id = $1`,
            [requestId]
        );

        if (checkRequest.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu phỏng vấn'
            });
        }

        const currentRequest = checkRequest.rows[0];
        console.log('[PUT /api/interview-requests/:id/reject] Current request:', currentRequest);

        // Chỉ cho phép reject nếu status là PENDING_INTERVIEW
        if (currentRequest.status !== STATUSES.PENDING) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `Yêu cầu phỏng vấn đã được xử lý (trạng thái hiện tại: ${currentRequest.status})`
            });
        }

        // Update status to REJECTED
        const result = await client.query(
            `UPDATE interview_requests 
             SET status = $1, note = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [STATUSES.REJECTED, note || rejectionReason || null, requestId]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(500).json({
                success: false,
                message: 'Không thể cập nhật trạng thái yêu cầu phỏng vấn'
            });
        }

        await client.query('COMMIT');
        console.log('[PUT /api/interview-requests/:id/reject] Successfully rejected:', result.rows[0]);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[PUT /api/interview-requests/:id/reject] error:', error);
        console.error('[PUT /api/interview-requests/:id/reject] error stack:', error.stack);
        res.status(500).json({ success: false, message: 'Lỗi khi từ chối yêu cầu phỏng vấn: ' + error.message });
    } finally {
        client.release();
    }
});

module.exports = router;

