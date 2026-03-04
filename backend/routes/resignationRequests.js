const express = require('express');
const router = express.Router();
const pool = require('../config/database');

const STATUS = {
    SUBMITTED: 'SUBMITTED',
    HR_ACKNOWLEDGED: 'HR_ACKNOWLEDGED',
    PENDING_DIRECT_MANAGER: 'PENDING_DIRECT_MANAGER',
    PENDING_INDIRECT_MANAGER: 'PENDING_INDIRECT_MANAGER',
    PENDING_BRANCH_DIRECTOR: 'PENDING_BRANCH_DIRECTOR',
    NOTICE_PERIOD_RUNNING: 'NOTICE_PERIOD_RUNNING',
    PRE_EXIT_CLEARANCE: 'PRE_EXIT_CLEARANCE',
    LAST_WORKING_DAY: 'LAST_WORKING_DAY',
    CONTRACT_LIQUIDATION: 'CONTRACT_LIQUIDATION',
    CLOSED: 'CLOSED'
};

// Tính số ngày báo trước tối thiểu theo loại hợp đồng
function getRequiredNoticeDays(loaiHopDong) {
    if (!loaiHopDong || typeof loaiHopDong !== 'string') return 30;
    const s = loaiHopDong.toLowerCase().trim().replace(/\s+/g, ' ');
    if (/th[uử] vi[eệ]c|thu viec|probation|thử việc/.test(s) || s.includes('thu viec')) return 3;
    if (/kh[oô]ng x[aá]c định|khong xac dinh|không xác định|indefinite/.test(s) || s.includes('khong xac dinh')) return 45;
    if (/x[aá]c định th[oơ]i h[aạ]n|xac dinh thoi han|xác định thời hạn|fixed|determined/.test(s) || s.includes('xac dinh')) return 30;
    return 30;
}

// Đảm bảo bảng tồn tại (chạy migration nếu chưa có)
async function ensureTables() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS resignation_requests (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                submitted_at DATE NOT NULL DEFAULT CURRENT_DATE,
                intended_last_work_date DATE NOT NULL,
                reason TEXT NOT NULL,
                notes TEXT,
                status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
                required_notice_days INTEGER NOT NULL DEFAULT 30,
                contract_type VARCHAR(255),
                hr_acknowledged_at TIMESTAMP,
                hr_acknowledged_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
                direct_manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
                direct_manager_ack_at TIMESTAMP,
                direct_manager_notes TEXT,
                current_project TEXT,
                temporary_replacement TEXT,
                work_risk_notes TEXT,
                indirect_manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
                indirect_manager_ack_at TIMESTAMP,
                indirect_manager_notes TEXT,
                branch_director_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
                branch_director_ack_at TIMESTAMP,
                branch_director_notes TEXT,
                notice_period_started_at TIMESTAMP,
                it_clearance_at TIMESTAMP,
                it_clearance_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
                finance_clearance_at TIMESTAMP,
                finance_clearance_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
                last_working_day_at DATE,
                employee_made_inactive_at TIMESTAMP,
                contract_liquidation_deadline DATE,
                contract_liquidation_extended BOOLEAN DEFAULT FALSE,
                contract_liquidation_completed_at TIMESTAMP,
                closed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS resignation_handover_items (
                id SERIAL PRIMARY KEY,
                resignation_request_id INTEGER NOT NULL REFERENCES resignation_requests(id) ON DELETE CASCADE,
                title VARCHAR(500) NOT NULL,
                description TEXT,
                completed BOOLEAN DEFAULT FALSE,
                completed_at TIMESTAMP,
                completed_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Impact & Risk (QL trực tiếp) - thêm cột nếu chưa có (chạy migration/migrate_resignation_add_impact_risk.sql nếu lỗi)
        const impactCols = ['impact_level VARCHAR(20)', 'handover_plan TEXT', 'handover_deadline DATE', 'risk_has_replacement BOOLEAN DEFAULT FALSE', 'risk_urgent_hire BOOLEAN DEFAULT FALSE', 'risk_revenue BOOLEAN DEFAULT FALSE', 'risk_customer BOOLEAN DEFAULT FALSE'];
        for (const col of impactCols) {
            const colName = col.split(' ')[0];
            const hasCol = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'resignation_requests' AND column_name = $1`, [colName]);
            if (hasCol.rows.length === 0) {
                try {
                    await client.query(`ALTER TABLE resignation_requests ADD COLUMN ${col}`);
                } catch (e) {
                    console.warn('[Resignation] Add column', colName, e.message);
                }
            }
        }
    } finally {
        client.release();
    }
}

// Escalation: tự động chuyển trạng thái nếu quá deadline (1 ngày HR, 1 ngày QL trực tiếp, 1 ngày QL gián tiếp, 3 ngày GĐ chi nhánh)
async function runEscalation(requestId) {
    const res = await pool.query('SELECT * FROM resignation_requests WHERE id = $1', [requestId]);
    if (res.rows.length === 0) return;
    const r = res.rows[0];
    const now = new Date();
    let newStatus = r.status;
    const hrAt = r.hr_acknowledged_at ? new Date(r.hr_acknowledged_at) : null;

    if (r.status === STATUS.HR_ACKNOWLEDGED && hrAt) {
        const deadline = new Date(hrAt);
        deadline.setDate(deadline.getDate() + 1);
        if (now >= deadline) newStatus = STATUS.PENDING_DIRECT_MANAGER;
    } else if (r.status === STATUS.PENDING_DIRECT_MANAGER && hrAt) {
        const deadline = new Date(hrAt);
        deadline.setDate(deadline.getDate() + 2);
        if (now >= deadline) newStatus = STATUS.PENDING_INDIRECT_MANAGER;
    } else if (r.status === STATUS.PENDING_INDIRECT_MANAGER && hrAt) {
        const deadline = new Date(hrAt);
        deadline.setDate(deadline.getDate() + 3);
        if (now >= deadline) newStatus = STATUS.PENDING_BRANCH_DIRECTOR;
    } else if (r.status === STATUS.PENDING_BRANCH_DIRECTOR && hrAt) {
        const deadline = new Date(hrAt);
        deadline.setDate(deadline.getDate() + 6);
        if (now >= deadline) newStatus = STATUS.NOTICE_PERIOD_RUNNING;
    }

    if (newStatus !== r.status) {
        await pool.query(
            'UPDATE resignation_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newStatus, requestId]
        );
        if (newStatus === STATUS.NOTICE_PERIOD_RUNNING) {
            await pool.query(
                'UPDATE resignation_requests SET notice_period_started_at = CURRENT_TIMESTAMP WHERE id = $1',
                [requestId]
            );
        }
    }
}

// Chuyển NOTICE_PERIOD → PRE_EXIT_CLEARANCE (3 ngày trước ngày nghỉ); PRE_EXIT + đủ clearance + đến ngày → LAST_WORKING_DAY + CONTRACT_LIQUIDATION + employee Inactive
async function runNoticePeriodTransitions(requestId) {
    const res = await pool.query('SELECT * FROM resignation_requests WHERE id = $1', [requestId]);
    if (res.rows.length === 0) return;
    const r = res.rows[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const intendedDate = new Date(r.intended_last_work_date);
    intendedDate.setHours(0, 0, 0, 0);
    const daysUntilExit = Math.floor((intendedDate - today) / (1000 * 60 * 60 * 24));

    if (r.status === STATUS.NOTICE_PERIOD_RUNNING && daysUntilExit <= 3 && daysUntilExit >= 0) {
        await pool.query(
            'UPDATE resignation_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [STATUS.PRE_EXIT_CLEARANCE, requestId]
        );
        return;
    }

    if (r.status === STATUS.PRE_EXIT_CLEARANCE && r.it_clearance_at && r.finance_clearance_at && intendedDate <= today) {
        const empId = r.employee_id;
        const deadline = new Date(intendedDate);
        deadline.setDate(deadline.getDate() + 14);
        const deadlineStr = deadline.toISOString().slice(0, 10);
        await pool.query(
            `UPDATE resignation_requests SET
             status = $1, last_working_day_at = $2, employee_made_inactive_at = CURRENT_TIMESTAMP,
             contract_liquidation_deadline = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
            [STATUS.CONTRACT_LIQUIDATION, r.intended_last_work_date, deadlineStr, requestId]
        );
        try {
            await pool.query(
                "UPDATE employees SET trang_thai = 'INACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                [empId]
            );
        } catch (e) {
            console.warn('[Resignation] Could not set employee INACTIVE:', e.message);
        }
    }
}

// GET list (có escalation khi load)
router.get('/', async (req, res) => {
    try {
        await ensureTables();
        const { status, employeeId, forHr, forDirectManager, forIndirectManager, forBranchDirector, directManagerId, indirectManagerId, branchDirectorId } = req.query;
        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (status) {
            const statuses = status.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
            if (statuses.length > 0) {
                conditions.push(`rr.status = ANY(ARRAY[${statuses.map(() => `$${paramIndex++}`).join(',')}])`);
                params.push(...statuses);
            }
        }
        if (employeeId) {
            conditions.push(`rr.employee_id = $${paramIndex++}`);
            params.push(parseInt(employeeId, 10));
        }
        if (forHr === 'true' || forHr === '1') {
            conditions.push(`rr.status = '${STATUS.SUBMITTED}'`);
        }
        if (forDirectManager === 'true' || forDirectManager === '1') {
            // Bao gồm cả trạng thái HR_ACKNOWLEDGED để hỗ trợ các đơn cũ
            conditions.push(`rr.status IN ('${STATUS.PENDING_DIRECT_MANAGER}', '${STATUS.HR_ACKNOWLEDGED}')`);
            if (directManagerId) {
                conditions.push(`rr.direct_manager_id = $${paramIndex++}`);
                params.push(parseInt(directManagerId, 10));
            }
        }
        if (forIndirectManager === 'true' || forIndirectManager === '1') {
            conditions.push(`rr.status = '${STATUS.PENDING_INDIRECT_MANAGER}'`);
            if (indirectManagerId) {
                conditions.push(`rr.indirect_manager_id = $${paramIndex++}`);
                params.push(parseInt(indirectManagerId, 10));
            }
        }
        if (forBranchDirector === 'true' || forBranchDirector === '1') {
            conditions.push(`rr.status = '${STATUS.PENDING_BRANCH_DIRECTOR}'`);
            if (branchDirectorId) {
                conditions.push(`rr.branch_director_id = $${paramIndex++}`);
                params.push(parseInt(branchDirectorId, 10));
            }
        }

        const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';
        const query = `
            SELECT rr.*,
                   e.ho_ten AS employee_name,
                   e.ma_nhan_vien,
                   e.email AS employee_email,
                   e.phong_ban AS employee_department,
                   e.chi_nhanh AS employee_branch,
                   e.chuc_danh AS employee_title,
                   e.loai_hop_dong,
                   e.quan_ly_truc_tiep,
                   e.quan_ly_gian_tiep
            FROM resignation_requests rr
            LEFT JOIN employees e ON rr.employee_id = e.id
            WHERE ${whereClause}
            ORDER BY rr.created_at DESC
        `;
        const result = await pool.query(query, params);
        const list = result.rows;

        for (const row of list) {
            await runEscalation(row.id);
            await runNoticePeriodTransitions(row.id);
        }
        const refreshed = await pool.query(
            list.length ? `SELECT rr.*, e.ho_ten AS employee_name, e.ma_nhan_vien, e.email AS employee_email, e.phong_ban AS employee_department, e.chi_nhanh AS employee_branch, e.chuc_danh AS employee_title, e.loai_hop_dong FROM resignation_requests rr LEFT JOIN employees e ON rr.employee_id = e.id WHERE rr.id = ANY($1) ORDER BY rr.created_at DESC` : `SELECT rr.*, e.ho_ten AS employee_name, e.ma_nhan_vien FROM resignation_requests rr LEFT JOIN employees e ON rr.employee_id = e.id WHERE 1=0`,
            list.length ? [list.map(r => r.id)] : []
        );

        res.json({
            success: true,
            message: 'Danh sách đơn xin nghỉ việc',
            data: list.length ? refreshed.rows : list
        });
    } catch (error) {
        console.error('Error listing resignation requests:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách đơn xin nghỉ việc: ' + error.message
        });
    }
});

// GET dashboard: ai nghỉ trong 30/14/7 ngày tới (optional directManagerId = lọc theo QL trực tiếp)
router.get('/dashboard/upcoming', async (req, res) => {
    try {
        await ensureTables();
        const { directManagerId } = req.query;
        const conditions = [
            'rr.status IN ($1, $2, $3, $4, $5)',
            'rr.intended_last_work_date >= CURRENT_DATE',
            'rr.intended_last_work_date <= CURRENT_DATE + INTERVAL \'30 days\''
        ];
        const params = [
            STATUS.NOTICE_PERIOD_RUNNING,
            STATUS.PRE_EXIT_CLEARANCE,
            STATUS.LAST_WORKING_DAY,
            STATUS.CONTRACT_LIQUIDATION,
            STATUS.PENDING_BRANCH_DIRECTOR
        ];
        if (directManagerId) {
            conditions.push('rr.direct_manager_id = $6');
            params.push(parseInt(directManagerId, 10));
        }
        const query = `
            SELECT rr.*,
                   e.ho_ten AS employee_name,
                   e.ma_nhan_vien,
                   e.phong_ban,
                   e.chi_nhanh
            FROM resignation_requests rr
            LEFT JOIN employees e ON rr.employee_id = e.id
            WHERE ${conditions.join(' AND ')}
            ORDER BY rr.intended_last_work_date ASC
        `;
        const result = await pool.query(query, params);
        const all = result.rows;
        const in30 = all.filter(r => {
            const d = new Date(r.intended_last_work_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            d.setHours(0, 0, 0, 0);
            const diff = (d - today) / (1000 * 60 * 60 * 24);
            return diff <= 30 && diff >= 0;
        });
        const in14 = in30.filter(r => {
            const d = new Date(r.intended_last_work_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            d.setHours(0, 0, 0, 0);
            const diff = (d - today) / (1000 * 60 * 60 * 24);
            return diff <= 14 && diff >= 0;
        });
        const in7 = in14.filter(r => {
            const d = new Date(r.intended_last_work_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            d.setHours(0, 0, 0, 0);
            const diff = (d - today) / (1000 * 60 * 60 * 24);
            return diff <= 7 && diff >= 0;
        });

        let pendingCount = 0;
        let handoverIncompleteCount = 0;
        if (directManagerId) {
            const pendingRes = await pool.query(
                'SELECT COUNT(*)::int AS c FROM resignation_requests WHERE direct_manager_id = $1 AND status IN ($2, $3)',
                [parseInt(directManagerId, 10), STATUS.PENDING_DIRECT_MANAGER, STATUS.HR_ACKNOWLEDGED]
            );
            pendingCount = pendingRes.rows[0]?.c || 0;
            const handoverRes = await pool.query(
                `SELECT rr.id FROM resignation_requests rr
                 WHERE rr.direct_manager_id = $1 AND rr.status IN ($2, $3)
                   AND EXISTS (SELECT 1 FROM resignation_handover_items hi
                              WHERE hi.resignation_request_id = rr.id AND (hi.completed IS NULL OR hi.completed = FALSE))`,
                [parseInt(directManagerId, 10), STATUS.NOTICE_PERIOD_RUNNING, STATUS.PRE_EXIT_CLEARANCE]
            );
            handoverIncompleteCount = handoverRes.rows.length || 0;
        }
        res.json({
            success: true,
            data: {
                in30Days: in30,
                in14Days: in14,
                in7Days: in7,
                pendingCount,
                handoverIncompleteCount
            }
        });
    } catch (error) {
        console.error('Error dashboard upcoming:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET :id
router.get('/:id', async (req, res) => {
    try {
        await ensureTables();
        const id = parseInt(req.params.id, 10);
        await runEscalation(id);
        await runNoticePeriodTransitions(id);
        const result = await pool.query(
            `SELECT rr.*,
                    e.ho_ten AS employee_name,
                    e.ma_nhan_vien,
                    e.email AS employee_email,
                    e.phong_ban AS employee_department,
                    e.chi_nhanh AS employee_branch,
                    e.chuc_danh AS employee_title,
                    e.quan_ly_truc_tiep,
                    e.quan_ly_gian_tiep,
                    e.loai_hop_dong
             FROM resignation_requests rr
             LEFT JOIN employees e ON rr.employee_id = e.id
             WHERE rr.id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn' });
        }
        const handover = await pool.query(
            'SELECT * FROM resignation_handover_items WHERE resignation_request_id = $1 ORDER BY sort_order, id',
            [id]
        );
        res.json({
            success: true,
            data: {
                ...result.rows[0],
                handover_items: handover.rows
            }
        });
    } catch (error) {
        console.error('Error get resignation:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create (nhân viên nộp đơn)
router.post('/', async (req, res) => {
    try {
        await ensureTables();
        const { employeeId, intendedLastWorkDate, reason, notes } = req.body;
        if (!employeeId || !intendedLastWorkDate || !reason || typeof reason !== 'string' || !reason.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin: employeeId, intendedLastWorkDate, reason'
            });
        }

        const empRes = await pool.query(
            'SELECT id, ho_ten, loai_hop_dong, quan_ly_truc_tiep, quan_ly_gian_tiep, chi_nhanh FROM employees WHERE id = $1',
            [parseInt(employeeId, 10)]
        );
        if (empRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
        }
        const employee = empRes.rows[0];
        const requiredDays = getRequiredNoticeDays(employee.loai_hop_dong);
        const submittedAt = new Date();
        submittedAt.setHours(0, 0, 0, 0);
        const intendedDate = new Date(intendedLastWorkDate);
        intendedDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((intendedDate - submittedAt) / (1000 * 60 * 60 * 24));

        if (diffDays < requiredDays) {
            return res.status(400).json({
                success: false,
                message: `Theo loại hợp đồng "${employee.loai_hop_dong || 'Không xác định'}", bạn cần báo trước tối thiểu ${requiredDays} ngày. Hiện tại chỉ còn ${diffDays} ngày. Không đủ điều kiện nộp đơn.`
            });
        }

        let directManagerId = null;
        let indirectManagerId = null;
        if (employee.quan_ly_truc_tiep && employee.quan_ly_truc_tiep.trim()) {
            const dm = await pool.query(
                'SELECT id FROM employees WHERE TRIM(ma_nhan_vien) = TRIM($1) AND (trang_thai = $2 OR trang_thai IS NULL) LIMIT 1',
                [employee.quan_ly_truc_tiep.trim(), 'ACTIVE']
            );
            if (dm.rows[0]) directManagerId = dm.rows[0].id;
        }
        if (employee.quan_ly_gian_tiep && employee.quan_ly_gian_tiep.trim()) {
            const im = await pool.query(
                'SELECT id FROM employees WHERE TRIM(ma_nhan_vien) = TRIM($1) AND (trang_thai = $2 OR trang_thai IS NULL) LIMIT 1',
                [employee.quan_ly_gian_tiep.trim(), 'ACTIVE']
            );
            if (im.rows[0]) indirectManagerId = im.rows[0].id;
        }

        const insert = await pool.query(
            `INSERT INTO resignation_requests (
                employee_id, submitted_at, intended_last_work_date, reason, notes,
                status, required_notice_days, contract_type, direct_manager_id, indirect_manager_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`,
            [
                parseInt(employeeId, 10),
                submittedAt.toISOString().slice(0, 10),
                intendedLastWorkDate.slice ? intendedLastWorkDate.slice(0, 10) : intendedLastWorkDate,
                reason.trim(),
                notes && notes.trim() ? notes.trim() : null,
                STATUS.SUBMITTED,
                requiredDays,
                employee.loai_hop_dong || null,
                directManagerId,
                indirectManagerId
            ]
        );
        const newRequest = insert.rows[0];
        res.status(201).json({
            success: true,
            message: 'Đã gửi đơn xin nghỉ việc. HR sẽ xác nhận tiếp nhận.',
            data: newRequest
        });
    } catch (error) {
        console.error('Error create resignation:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể tạo đơn: ' + error.message
        });
    }
});

// POST :id/hr-acknowledge
// hr_acknowledged_by phải là employees.id; nếu gửi user id (không có trong employees) thì lưu NULL
router.post('/:id/hr-acknowledge', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { hrEmployeeId } = req.body;
        const r = await pool.query('SELECT * FROM resignation_requests WHERE id = $1', [id]);
        if (r.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn' });
        }
        const row = r.rows[0];
        if (row.status !== STATUS.SUBMITTED) {
            return res.status(400).json({ success: false, message: 'Đơn không ở trạng thái chờ HR xác nhận' });
        }
        let hrBy = null;
        if (hrEmployeeId != null && hrEmployeeId !== '') {
            const empCheck = await pool.query('SELECT id FROM employees WHERE id = $1', [parseInt(hrEmployeeId, 10)]);
            if (empCheck.rows.length > 0) hrBy = parseInt(hrEmployeeId, 10);
        }
        // Sau khi HR xác nhận → chuyển ngay sang PENDING_DIRECT_MANAGER để QL trực tiếp thấy đơn
        await pool.query(
            `UPDATE resignation_requests
             SET status = $1, hr_acknowledged_at = CURRENT_TIMESTAMP, hr_acknowledged_by = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [STATUS.PENDING_DIRECT_MANAGER, hrBy, id]
        );
        const updated = await pool.query('SELECT * FROM resignation_requests WHERE id = $1', [id]);
        res.json({
            success: true,
            message: 'Đã xác nhận tiếp nhận đơn. Đơn đã chuyển đến quản lý trực tiếp.',
            data: updated.rows[0]
        });
    } catch (error) {
        console.error('Error hr-acknowledge:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST :id/direct-manager-acknowledge (Impact Confirmation: dự án, mức ảnh hưởng, kế hoạch bàn giao, rủi ro)
router.post('/:id/direct-manager-acknowledge', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const {
            managerEmployeeId,
            notes,
            currentProject,
            temporaryReplacement,
            workRiskNotes,
            impactLevel,
            handoverPlan,
            handoverDeadline,
            riskHasReplacement,
            riskUrgentHire,
            riskRevenue,
            riskCustomer
        } = req.body;
        if (!managerEmployeeId) {
            return res.status(400).json({ success: false, message: 'Thiếu managerEmployeeId' });
        }
        const r = await pool.query('SELECT * FROM resignation_requests WHERE id = $1', [id]);
        if (r.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn' });
        }
        const row = r.rows[0];
        if (row.status !== STATUS.PENDING_DIRECT_MANAGER) {
            return res.status(400).json({ success: false, message: 'Đơn không ở trạng thái chờ quản lý trực tiếp' });
        }
        const impactVal = impactLevel && ['Low', 'Medium', 'High'].includes(String(impactLevel)) ? String(impactLevel) : null;
        const handoverDeadlineVal = handoverDeadline && handoverDeadline.toString().match(/^\d{4}-\d{2}-\d{2}/) ? handoverDeadline.toString().slice(0, 10) : null;
        await pool.query(
            `UPDATE resignation_requests
             SET status = $1, direct_manager_id = $2, direct_manager_ack_at = CURRENT_TIMESTAMP,
                 direct_manager_notes = $3, current_project = $4, temporary_replacement = $5, work_risk_notes = $6,
                 impact_level = $7, handover_plan = $8, handover_deadline = $9,
                 risk_has_replacement = $10, risk_urgent_hire = $11, risk_revenue = $12, risk_customer = $13,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $14`,
            [
                STATUS.PENDING_INDIRECT_MANAGER,
                parseInt(managerEmployeeId, 10),
                notes && notes.trim() ? notes.trim() : null,
                currentProject && currentProject.trim() ? currentProject.trim() : null,
                temporaryReplacement && temporaryReplacement.trim() ? temporaryReplacement.trim() : null,
                workRiskNotes && workRiskNotes.trim() ? workRiskNotes.trim() : null,
                impactVal,
                handoverPlan && handoverPlan.trim() ? handoverPlan.trim() : null,
                handoverDeadlineVal,
                !!riskHasReplacement,
                !!riskUrgentHire,
                !!riskRevenue,
                !!riskCustomer,
                id
            ]
        );
        const updated = await pool.query('SELECT * FROM resignation_requests WHERE id = $1', [id]);
        res.json({
            success: true,
            message: 'Đã xác nhận. Đơn chuyển đến quản lý gián tiếp.',
            data: updated.rows[0]
        });
    } catch (error) {
        console.error('Error direct-manager-acknowledge:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST :id/indirect-manager-acknowledge
router.post('/:id/indirect-manager-acknowledge', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { managerEmployeeId, notes } = req.body;
        if (!managerEmployeeId) {
            return res.status(400).json({ success: false, message: 'Thiếu managerEmployeeId' });
        }
        const r = await pool.query('SELECT * FROM resignation_requests WHERE id = $1', [id]);
        if (r.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn' });
        }
        if (r.rows[0].status !== STATUS.PENDING_INDIRECT_MANAGER) {
            return res.status(400).json({ success: false, message: 'Đơn không ở trạng thái chờ quản lý gián tiếp' });
        }
        await pool.query(
            `UPDATE resignation_requests
             SET status = $1, indirect_manager_id = $2, indirect_manager_ack_at = CURRENT_TIMESTAMP, indirect_manager_notes = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [STATUS.PENDING_BRANCH_DIRECTOR, parseInt(managerEmployeeId, 10), notes && notes.trim() ? notes.trim() : null, id]
        );
        const updated = await pool.query('SELECT * FROM resignation_requests WHERE id = $1', [id]);
        res.json({ success: true, message: 'Đã xác nhận. Đơn chuyển đến giám đốc chi nhánh.', data: updated.rows[0] });
    } catch (error) {
        console.error('Error indirect-manager-acknowledge:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST :id/branch-director-acknowledge
router.post('/:id/branch-director-acknowledge', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { directorEmployeeId, notes } = req.body;
        if (!directorEmployeeId) {
            return res.status(400).json({ success: false, message: 'Thiếu directorEmployeeId' });
        }
        const r = await pool.query('SELECT * FROM resignation_requests WHERE id = $1', [id]);
        if (r.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn' });
        }
        if (r.rows[0].status !== STATUS.PENDING_BRANCH_DIRECTOR) {
            return res.status(400).json({ success: false, message: 'Đơn không ở trạng thái chờ giám đốc chi nhánh' });
        }
        await pool.query(
            `UPDATE resignation_requests
             SET status = $1, branch_director_id = $2, branch_director_ack_at = CURRENT_TIMESTAMP, branch_director_notes = $3,
                 notice_period_started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [STATUS.NOTICE_PERIOD_RUNNING, parseInt(directorEmployeeId, 10), notes && notes.trim() ? notes.trim() : null, id]
        );
        const updated = await pool.query('SELECT * FROM resignation_requests WHERE id = $1', [id]);
        res.json({ success: true, message: 'Đã xác nhận. Bắt đầu thời gian báo trước.', data: updated.rows[0] });
    } catch (error) {
        console.error('Error branch-director-acknowledge:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET/POST handover items
router.get('/:id/handover', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const result = await pool.query('SELECT * FROM resignation_handover_items WHERE resignation_request_id = $1 ORDER BY sort_order, id', [id]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error get handover:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/:id/handover', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { title, description, sort_order } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: 'Thiếu title' });
        }
        const ins = await pool.query(
            'INSERT INTO resignation_handover_items (resignation_request_id, title, description, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, title.trim(), description && description.trim() ? description.trim() : null, sort_order != null ? parseInt(sort_order, 10) : 0]
        );
        res.status(201).json({ success: true, data: ins.rows[0] });
    } catch (error) {
        console.error('Error post handover:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PATCH handover item :id/handover/:itemId - đánh dấu hoàn thành
router.patch('/:id/handover/:itemId', async (req, res) => {
    try {
        const requestId = parseInt(req.params.id, 10);
        const itemId = parseInt(req.params.itemId, 10);
        const { completed, completedBy } = req.body;
        const r = await pool.query('SELECT id FROM resignation_handover_items WHERE id = $1 AND resignation_request_id = $2', [itemId, requestId]);
        if (r.rows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy mục bàn giao' });
        if (completed === true || completed === 'true') {
            await pool.query(
                'UPDATE resignation_handover_items SET completed = TRUE, completed_at = CURRENT_TIMESTAMP, completed_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [completedBy ? parseInt(completedBy, 10) : null, itemId]
            );
        } else {
            await pool.query(
                'UPDATE resignation_handover_items SET completed = FALSE, completed_at = NULL, completed_by = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                [itemId]
            );
        }
        const updated = await pool.query('SELECT * FROM resignation_handover_items WHERE id = $1', [itemId]);
        res.json({ success: true, data: updated.rows[0] });
    } catch (error) {
        console.error('Error patch handover:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST :id/it-clearance (chỉ khi status = PRE_EXIT_CLEARANCE)
router.post('/:id/it-clearance', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { employeeId } = req.body;
        if (!employeeId) return res.status(400).json({ success: false, message: 'Thiếu employeeId' });
        const r = await pool.query('SELECT * FROM resignation_requests WHERE id = $1', [id]);
        if (r.rows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn' });
        if (r.rows[0].status !== STATUS.PRE_EXIT_CLEARANCE) {
            return res.status(400).json({ success: false, message: 'Chỉ xác nhận IT clearance khi đơn ở trạng thái Pre-Exit Clearance' });
        }
        await pool.query(
            'UPDATE resignation_requests SET it_clearance_at = CURRENT_TIMESTAMP, it_clearance_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [parseInt(employeeId, 10), id]
        );
        await runNoticePeriodTransitions(id);
        const updated = await pool.query('SELECT * FROM resignation_requests WHERE id = $1', [id]);
        res.json({ success: true, message: 'Đã xác nhận IT clearance', data: updated.rows[0] });
    } catch (error) {
        console.error('Error it-clearance:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST :id/finance-clearance (chỉ khi status = PRE_EXIT_CLEARANCE)
router.post('/:id/finance-clearance', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { employeeId } = req.body;
        if (!employeeId) return res.status(400).json({ success: false, message: 'Thiếu employeeId' });
        const r = await pool.query('SELECT * FROM resignation_requests WHERE id = $1', [id]);
        if (r.rows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn' });
        if (r.rows[0].status !== STATUS.PRE_EXIT_CLEARANCE) {
            return res.status(400).json({ success: false, message: 'Chỉ xác nhận Finance clearance khi đơn ở trạng thái Pre-Exit Clearance' });
        }
        await pool.query(
            'UPDATE resignation_requests SET finance_clearance_at = CURRENT_TIMESTAMP, finance_clearance_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [parseInt(employeeId, 10), id]
        );
        await runNoticePeriodTransitions(id);
        const updated = await pool.query('SELECT * FROM resignation_requests WHERE id = $1', [id]);
        res.json({ success: true, message: 'Đã xác nhận Finance clearance', data: updated.rows[0] });
    } catch (error) {
        console.error('Error finance-clearance:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST :id/close (Contract liquidation hoàn tất)
router.post('/:id/close', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const r = await pool.query('SELECT * FROM resignation_requests WHERE id = $1', [id]);
        if (r.rows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn' });
        if (r.rows[0].status !== STATUS.CONTRACT_LIQUIDATION && r.rows[0].status !== STATUS.LAST_WORKING_DAY) {
            return res.status(400).json({ success: false, message: 'Chỉ đóng được đơn đang ở trạng thái thanh lý hợp đồng hoặc last working day' });
        }
        await pool.query(
            'UPDATE resignation_requests SET status = $1, closed_at = CURRENT_TIMESTAMP, contract_liquidation_completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [STATUS.CLOSED, id]
        );
        const updated = await pool.query('SELECT * FROM resignation_requests WHERE id = $1', [id]);
        res.json({ success: true, message: 'Đã đóng đơn.', data: updated.rows[0] });
    } catch (error) {
        console.error('Error close:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
