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
const EMPLOYEES_CACHE_TTL = 5 * 60 * 1000;

const getEmployeesCache = async () => {
    const now = Date.now();
    if (employeesCache && employeesCacheTime && (now - employeesCacheTime) < EMPLOYEES_CACHE_TTL) {
        return employeesCache;
    }

    const result = await pool.query(
        `SELECT id, ho_ten, email, quan_ly_truc_tiep, chuc_danh, trang_thai
         FROM employees 
         WHERE (trang_thai = 'ACTIVE' OR trang_thai = 'PENDING' OR trang_thai IS NULL)
         ORDER BY ho_ten`
    );

    const employeesMap = new Map();
    result.rows.forEach(emp => {
        const normalizedName = (emp.ho_ten || '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (normalizedName) {
            if (!employeesMap.has(normalizedName)) {
                employeesMap.set(normalizedName, []);
            }
            employeesMap.get(normalizedName).push(emp);
        }
    });

    employeesCache = {
        all: result.rows,
        map: employeesMap
    };
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

const findManagerFromCache = async (managerName) => {
    const cache = await getEmployeesCache();
    const normalizedName = (managerName || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
    const normalizedWithoutAccents = removeVietnameseAccents(normalizedName);

    if (!normalizedName) {
        console.log('[findManagerFromCache] Manager name is empty');
        return null;
    }

    console.log(`[findManagerFromCache] Looking for manager: "${managerName}" (normalized: "${normalizedName}")`);

    // Exact match (có dấu)
    if (cache.map.has(normalizedName)) {
        const match = cache.map.get(normalizedName)[0];
        console.log(`[findManagerFromCache] Exact match found: "${match.ho_ten}"`);
        return match;
    }

    // Exact match (không dấu)
    for (const [normalizedEmpName, employees] of cache.map.entries()) {
        const empNameWithoutAccents = removeVietnameseAccents(normalizedEmpName);
        if (empNameWithoutAccents === normalizedWithoutAccents) {
            const match = employees[0];
            console.log(`[findManagerFromCache] Exact match (no accents) found: "${match.ho_ten}"`);
            return match;
        }
    }

    // Fuzzy match (có dấu)
    for (const [normalizedEmpName, employees] of cache.map.entries()) {
        if (normalizedEmpName === normalizedName) {
            const match = employees[0];
            console.log(`[findManagerFromCache] Fuzzy match found: "${match.ho_ten}"`);
            return match;
        }
        if (normalizedEmpName.includes(normalizedName) || normalizedName.includes(normalizedEmpName)) {
            const match = employees[0];
            console.log(`[findManagerFromCache] Fuzzy match (contains) found: "${match.ho_ten}"`);
            return match;
        }
    }

    // Fuzzy match (không dấu)
    for (const [normalizedEmpName, employees] of cache.map.entries()) {
        const empNameWithoutAccents = removeVietnameseAccents(normalizedEmpName);
        if (empNameWithoutAccents.includes(normalizedWithoutAccents) || normalizedWithoutAccents.includes(empNameWithoutAccents)) {
            const match = employees[0];
            console.log(`[findManagerFromCache] Fuzzy match (no accents) found: "${match.ho_ten}"`);
            return match;
        }
    }

    // Word-by-word matching
    const words = normalizedName.split(/\s+/).filter(w => w.length > 1);
    if (words.length > 0) {
        let bestMatch = null;
        let bestScore = 0;

        for (const [normalizedEmpName, employees] of cache.map.entries()) {
            const empWords = normalizedEmpName.split(/\s+/).filter(w => w.length > 1);
            const empWordsWithoutAccents = empWords.map(w => removeVietnameseAccents(w));

            let matchCount = 0;
            for (const word of words) {
                const wordWithoutAccents = removeVietnameseAccents(word);
                if (empWords.some(empWord => empWord.includes(word) || word.includes(empWord)) ||
                    empWordsWithoutAccents.some(empWord => empWord.includes(wordWithoutAccents) || wordWithoutAccents.includes(empWord))) {
                    matchCount++;
                }
            }

            if (matchCount === words.length && matchCount > bestScore) {
                bestMatch = employees[0];
                bestScore = matchCount;
            }
        }

        if (bestMatch) {
            console.log(`[findManagerFromCache] Word-by-word match found: "${bestMatch.ho_ten}"`);
            return bestMatch;
        }
    }

    // Log tất cả employees để debug
    console.log(`[findManagerFromCache] No match found. Available employees:`,
        cache.all.map(e => `"${e.ho_ten}" (normalized: "${(e.ho_ten || '').toLowerCase().replace(/\s+/g, ' ').trim()}")`).join(', '));

    return null;
};

const isValidTime = (value) => {
    if (!value || typeof value !== 'string') return false;
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim());
};

// ============================================================
// API ENDPOINTS
// ============================================================

// GET /api/overtime-requests - Lấy danh sách đơn
router.get('/', async (req, res) => {
    try {
        const { employeeId, teamLeadId, status } = req.query;

        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (employeeId) {
            conditions.push(`orq.employee_id = $${paramIndex}`);
            params.push(parseInt(employeeId, 10));
            paramIndex += 1;
        }

        if (teamLeadId) {
            conditions.push(`orq.team_lead_id = $${paramIndex}`);
            params.push(parseInt(teamLeadId, 10));
            paramIndex += 1;
        }

        if (status) {
            const statuses = status.split(',').map((s) => {
                const trimmed = s.trim().replace(/\s+/g, '_').toUpperCase();
                return trimmed;
            }).filter(Boolean);

            if (statuses.length > 0) {
                const placeholders = statuses.map((_s, idx) => `$${paramIndex + idx}`);
                conditions.push(`orq.status = ANY (ARRAY[${placeholders.join(', ')}])`);
                params.push(...statuses);
                paramIndex += statuses.length;
            }
        } else if (teamLeadId) {
            // Nếu không có status filter nhưng có teamLeadId, mặc định chỉ hiển thị PENDING
            conditions.push(`orq.status = $${paramIndex}`);
            params.push(STATUSES.PENDING);
            paramIndex += 1;
        }

        const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

        const query = `
            SELECT orq.*,
                   e.ho_ten AS employee_name,
                   e.email AS employee_email,
                   e.phong_ban AS employee_department,
                   team.ho_ten AS team_lead_name,
                   team.email AS team_lead_email
            FROM overtime_requests orq
            LEFT JOIN employees e ON orq.employee_id = e.id
            LEFT JOIN employees team ON orq.team_lead_id = team.id
            WHERE ${whereClause}
            ORDER BY orq.created_at DESC
        `;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            message: 'Danh sách đơn xin tăng ca',
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching overtime requests:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách đơn tăng ca: ' + error.message
        });
    }
});

// POST /api/overtime-requests - Nhân viên tạo đơn xin tăng ca
router.post('/', async (req, res) => {
    try {
        const {
            employeeId,
            requestDate,
            startDate,
            startTime,
            endDate,
            endTime,
            duration,
            reason,
            notes,
            isLateRequest
        } = req.body;

        // Use startDate if provided, otherwise fallback to requestDate for backward compatibility
        const primaryDate = startDate || requestDate;

        if (!employeeId || !primaryDate || !startTime || !endDate || !endTime || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        if (!isValidTime(startTime) || !isValidTime(endTime)) {
            return res.status(400).json({
                success: false,
                message: 'Thời gian không hợp lệ (định dạng: HH:mm)'
            });
        }

        // Tìm nhân viên
        const employeeResult = await pool.query(
            `SELECT id, ho_ten, quan_ly_truc_tiep FROM employees WHERE id = $1`,
            [parseInt(employeeId, 10)]
        );

        if (employeeResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên'
            });
        }

        const employee = employeeResult.rows[0];

        if (!employee.quan_ly_truc_tiep || employee.quan_ly_truc_tiep.trim() === '') {
            return res.status(400).json({
                success: false,
                message: `Nhân viên chưa có thông tin quản lý trực tiếp. Vui lòng cập nhật thông tin quản lý trực tiếp cho nhân viên "${employee.ho_ten || 'N/A'}" trong module Quản lý nhân viên.`
            });
        }

        // Tìm quản lý trực tiếp
        const teamLead = await findManagerFromCache(employee.quan_ly_truc_tiep);

        if (!teamLead) {
            console.error(`[OvertimeRequest] Không tìm thấy quản lý trực tiếp. Nhân viên: ${employee.ho_ten}, quan_ly_truc_tiep: "${employee.quan_ly_truc_tiep}"`);
            return res.status(404).json({
                success: false,
                message: `Không tìm thấy quản lý trực tiếp "${employee.quan_ly_truc_tiep}" trong hệ thống. Vui lòng kiểm tra lại tên quản lý trực tiếp của nhân viên "${employee.ho_ten || 'N/A'}" trong module Quản lý nhân viên.`
            });
        }

        console.log(`[OvertimeRequest] Tạo đơn cho nhân viên "${employee.ho_ten}", quản lý trực tiếp: "${teamLead.ho_ten}"`);

        // Kiểm tra và thêm cột start_date và end_date nếu chưa có
        try {
            await pool.query(`
                ALTER TABLE overtime_requests 
                ADD COLUMN IF NOT EXISTS start_date DATE,
                ADD COLUMN IF NOT EXISTS end_date DATE
            `);
        } catch (alterError) {
            // Column có thể đã tồn tại, bỏ qua lỗi
            console.log('[OvertimeRequest] start_date/end_date columns check:', alterError.message);
        }

        // Kiểm tra và thêm cột is_late_request nếu chưa có
        try {
            await pool.query(`
                ALTER TABLE overtime_requests 
                ADD COLUMN IF NOT EXISTS is_late_request BOOLEAN DEFAULT FALSE
            `);
            // Nếu cột cũ is_future_request tồn tại, migrate dữ liệu
            try {
                await pool.query(`
                    UPDATE overtime_requests 
                    SET is_late_request = NOT is_future_request 
                    WHERE is_future_request IS NOT NULL AND is_late_request = FALSE
                `);
            } catch (migrateError) {
                // Cột cũ có thể không tồn tại, bỏ qua
                console.log('[OvertimeRequest] Migration check:', migrateError.message);
            }
        } catch (alterError) {
            // Column có thể đã tồn tại, bỏ qua lỗi
            console.log('[OvertimeRequest] is_late_request column check:', alterError.message);
        }

        // Tạo đơn
        const insertResult = await pool.query(
            `INSERT INTO overtime_requests (
                employee_id,
                team_lead_id,
                request_date,
                start_date,
                start_time,
                end_date,
                end_time,
                duration,
                reason,
                notes,
                status,
                is_late_request
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [
                parseInt(employeeId, 10),
                teamLead.id,
                primaryDate, // request_date (backward compatibility)
                startDate || primaryDate, // start_date
                startTime,
                endDate,
                endTime,
                duration || null,
                reason,
                notes || null,
                STATUSES.PENDING,
                isLateRequest === true || isLateRequest === 'true' || isLateRequest === 1
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Đã gửi đơn xin tăng ca thành công',
            data: insertResult.rows[0]
        });
    } catch (error) {
        console.error('Error creating overtime request:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Không thể tạo đơn xin tăng ca: ' + error.message
        });
    }
});

// POST /api/overtime-requests/:id/decision - Quản lý duyệt/từ chối đơn
router.post('/:id/decision', async (req, res) => {
    try {
        const { id } = req.params;
        const { teamLeadId, decision, comment } = req.body;

        if (!teamLeadId || !decision) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        if (decision !== 'APPROVE' && decision !== 'REJECT') {
            return res.status(400).json({
                success: false,
                message: 'Decision phải là APPROVE hoặc REJECT'
            });
        }

        const requestResult = await pool.query(
            `SELECT * FROM overtime_requests WHERE id = $1`,
            [parseInt(id, 10)]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn'
            });
        }

        const request = requestResult.rows[0];

        if (request.team_lead_id !== parseInt(teamLeadId, 10)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xử lý đơn này'
            });
        }

        if (request.status !== STATUSES.PENDING) {
            return res.status(400).json({
                success: false,
                message: 'Đơn không còn ở trạng thái chờ duyệt'
            });
        }

        const newStatus = decision === 'APPROVE' ? STATUSES.APPROVED : STATUSES.REJECTED;
        const now = new Date();

        await pool.query(
            `UPDATE overtime_requests
             SET status = $1,
                 team_lead_action = $2,
                 team_lead_action_at = $3,
                 team_lead_comment = $4
             WHERE id = $5`,
            [
                newStatus,
                decision,
                now.toISOString(),
                comment || null,
                parseInt(id, 10)
            ]
        );

        const updatedResult = await pool.query(
            `SELECT orq.*,
                    e.ho_ten AS employee_name,
                    e.email AS employee_email,
                    team.ho_ten AS team_lead_name,
                    team.email AS team_lead_email
             FROM overtime_requests orq
             LEFT JOIN employees e ON orq.employee_id = e.id
             LEFT JOIN employees team ON orq.team_lead_id = team.id
             WHERE orq.id = $1`,
            [parseInt(id, 10)]
        );

        res.json({
            success: true,
            message: decision === 'APPROVE' ? 'Đã duyệt đơn thành công' : 'Đã từ chối đơn',
            data: updatedResult.rows[0]
        });
    } catch (error) {
        console.error('Error processing overtime request decision:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Không thể xử lý đơn: ' + error.message
        });
    }
});

// DELETE /api/overtime-requests/:id - Nhân viên hủy đơn (PENDING) hoặc HR xóa đơn (REJECTED/CANCELLED)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { employeeId, role } = req.body;

        if (!employeeId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu employeeId'
            });
        }

        const requestResult = await pool.query(
            `SELECT * FROM overtime_requests WHERE id = $1`,
            [parseInt(id, 10)]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn'
            });
        }

        const request = requestResult.rows[0];
        const isHr = role && role !== 'EMPLOYEE';

        if (isHr) {
            // HR có thể xóa đơn đã bị từ chối hoặc đã hủy
            if (request.status !== STATUSES.REJECTED && request.status !== STATUSES.CANCELLED) {
                return res.status(400).json({
                    success: false,
                    message: 'HR chỉ có thể xóa đơn đã bị từ chối hoặc đã hủy'
                });
            }

            // Xóa đơn (hard delete)
            await pool.query(
                `DELETE FROM overtime_requests WHERE id = $1`,
                [parseInt(id, 10)]
            );

            res.json({
                success: true,
                message: 'Đã xóa đơn thành công'
            });
        } else {
            // Nhân viên chỉ có thể hủy đơn đang chờ duyệt
            if (request.employee_id !== parseInt(employeeId, 10)) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền hủy đơn này'
                });
            }

            if (request.status !== STATUSES.PENDING) {
                return res.status(400).json({
                    success: false,
                    message: 'Chỉ có thể hủy đơn đang chờ duyệt'
                });
            }

            await pool.query(
                `UPDATE overtime_requests SET status = $1 WHERE id = $2`,
                [STATUSES.CANCELLED, parseInt(id, 10)]
            );

            res.json({
                success: true,
                message: 'Đã hủy đơn thành công'
            });
        }
    } catch (error) {
        console.error('Error deleting/cancelling overtime request:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể xóa/hủy đơn: ' + error.message
        });
    }
});

module.exports = router;
