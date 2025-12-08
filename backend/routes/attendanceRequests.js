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

// GET /api/attendance-adjustments - Lấy danh sách đơn
router.get('/', async (req, res) => {
    try {
        const { employeeId, teamLeadId, status } = req.query;

        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (employeeId) {
            conditions.push(`adj.employee_id = $${paramIndex}`);
            params.push(parseInt(employeeId, 10));
            paramIndex += 1;
        }

        if (teamLeadId) {
            conditions.push(`adj.team_lead_id = $${paramIndex}`);
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
                conditions.push(`adj.status = ANY (ARRAY[${placeholders.join(', ')}])`);
                params.push(...statuses);
                paramIndex += statuses.length;
            }
        } else if (teamLeadId) {
            // Nếu không có status filter nhưng có teamLeadId, mặc định chỉ hiển thị PENDING
            conditions.push(`adj.status = $${paramIndex}`);
            params.push(STATUSES.PENDING);
            paramIndex += 1;
        }

        const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

        const query = `
            SELECT adj.*,
                   e.ho_ten AS employee_name,
                   e.email AS employee_email,
                   e.phong_ban AS employee_department,
                   team.ho_ten AS team_lead_name,
                   team.email AS team_lead_email
            FROM attendance_adjustments adj
            LEFT JOIN employees e ON adj.employee_id = e.id
            LEFT JOIN employees team ON adj.team_lead_id = team.id
            WHERE ${whereClause}
            ORDER BY adj.created_at DESC
        `;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            message: 'Danh sách đơn bổ sung chấm công',
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching attendance adjustments:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách đơn bổ sung chấm công: ' + error.message
        });
    }
});

// POST /api/attendance-adjustments - Nhân viên tạo đơn bổ sung chấm công
router.post('/', async (req, res) => {
    try {
        const {
            employeeId,
            adjustmentDate,
            reason,
            attendanceItems // Cấu trúc mới: mảng các item với details
        } = req.body;

        // Validation cơ bản
        if (!employeeId || !adjustmentDate) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc: employeeId, adjustmentDate'
            });
        }

        // Validation reason: yêu cầu phải có lý do
        if (!reason || typeof reason !== 'string' || reason.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập lý do bổ sung chấm công'
            });
        }

        // Kiểm tra attendanceItems
        if (!attendanceItems || !Array.isArray(attendanceItems) || attendanceItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc: attendanceItems'
            });
        }

        // Chỉ xử lý item đầu tiên (vì chỉ cho phép chọn 1 loại)
        const item = attendanceItems[0];
        if (!item || !item.id || !item.type || !item.details) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin chi tiết của attendance item'
            });
        }

        // Xác định checkType và times dựa trên item type và details
        let checkType = 'BOTH';
        let checkInTime = null;
        let checkOutTime = null;

        if (item.id === 1) {
            // Quên Chấm Công: có thể chỉ có giờ vào, chỉ có giờ ra, hoặc cả hai
            checkInTime = item.details.checkInTime && item.details.checkInTime.trim() !== '' ? item.details.checkInTime.trim() : null;
            checkOutTime = item.details.checkOutTime && item.details.checkOutTime.trim() !== '' ? item.details.checkOutTime.trim() : null;
            
            // Phải có ít nhất một trong hai
            if (!checkInTime && !checkOutTime) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập ít nhất giờ vào hoặc giờ ra cho "Quên Chấm Công"'
                });
            }
            
            // Xác định checkType dựa trên dữ liệu nhập vào
            if (checkInTime && !checkOutTime) {
                checkType = 'CHECK_IN'; // Chỉ quên giờ vào
            } else if (!checkInTime && checkOutTime) {
                checkType = 'CHECK_OUT'; // Chỉ quên giờ ra
            } else {
                checkType = 'BOTH'; // Quên cả hai
            }
        } else if (item.id === 2 || item.id === 3) {
            // Đi Công Trình hoặc Làm việc bên ngoài: dùng startTime và endTime
            checkType = 'BOTH';
            checkInTime = item.details.startTime || null;
            checkOutTime = item.details.endTime || null;
            
            if (!item.details.location || !checkInTime || !checkOutTime) {
                return res.status(400).json({
                    success: false,
                    message: `Thiếu thông tin bắt buộc: location, startTime, endTime cho "${item.label || 'mục này'}"`
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                message: 'Loại attendance item không hợp lệ'
            });
        }

        // Validate time format
        if (checkInTime && !isValidTime(checkInTime)) {
            return res.status(400).json({
                success: false,
                message: 'checkInTime/startTime không hợp lệ (định dạng: HH:mm)'
            });
        }

        if (checkOutTime && !isValidTime(checkOutTime)) {
            return res.status(400).json({
                success: false,
                message: 'checkOutTime/endTime không hợp lệ (định dạng: HH:mm)'
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

        // Cho phép tạo đơn mà không cần quản lý trực tiếp
        // Nếu không có quản lý trực tiếp, team_lead_id sẽ là NULL và đơn sẽ được gửi trực tiếp cho HR
        let teamLead = null;
        let teamLeadId = null;

        if (employee.quan_ly_truc_tiep && employee.quan_ly_truc_tiep.trim() !== '') {
            // Tìm quản lý trực tiếp nếu có
            teamLead = await findManagerFromCache(employee.quan_ly_truc_tiep);

            if (!teamLead) {
                console.warn(`[AttendanceRequest] Không tìm thấy quản lý trực tiếp. Nhân viên: ${employee.ho_ten}, quan_ly_truc_tiep: "${employee.quan_ly_truc_tiep}". Đơn sẽ được gửi trực tiếp cho HR.`);
                // Không trả về lỗi, tiếp tục với teamLeadId = null
            } else {
                teamLeadId = teamLead.id;
                console.log(`[AttendanceRequest] Tạo đơn cho nhân viên "${employee.ho_ten}", quản lý trực tiếp: "${teamLead.ho_ten}"`);
            }
        } else {
            console.log(`[AttendanceRequest] Nhân viên "${employee.ho_ten}" không có quản lý trực tiếp. Đơn sẽ được gửi trực tiếp cho HR.`);
        }

        // Lưu notes từ item details nếu có (cho item 2 và 3)
        const notes = (item.id === 2 || item.id === 3) ? (item.details.reason || null) : null;
        
        // Lưu attendance_type và location vào notes với format đặc biệt để parse lại
        // Format: "ATTENDANCE_TYPE:FORGOT_CHECK" hoặc "ATTENDANCE_TYPE:CONSTRUCTION_SITE" hoặc "ATTENDANCE_TYPE:OUTSIDE_WORK"
        // Format: "LOCATION:xxx" (cho item 2 và 3)
        const attendanceType = item.type || (item.id === 1 ? 'FORGOT_CHECK' : item.id === 2 ? 'CONSTRUCTION_SITE' : 'OUTSIDE_WORK');
        const location = (item.id === 2 || item.id === 3) ? (item.details.location || null) : null;
        
        let notesWithType = `ATTENDANCE_TYPE:${attendanceType}`;
        if (location) {
            notesWithType = `LOCATION:${location}\n${notesWithType}`;
        }
        if (notes) {
            notesWithType = `${notesWithType}\n${notes}`;
        }

        // Tạo đơn
        // Xử lý reason: đã validate ở trên, nên chắc chắn có giá trị
        const reasonValue = reason.trim();
        
        const insertResult = await pool.query(
            `INSERT INTO attendance_adjustments (
                employee_id,
                team_lead_id,
                adjustment_date,
                check_type,
                check_in_time,
                check_out_time,
                reason,
                notes,
                status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                parseInt(employeeId, 10),
                teamLeadId, // Có thể là NULL nếu không có quản lý trực tiếp
                adjustmentDate,
                checkType,
                checkInTime,
                checkOutTime,
                reasonValue,
                notesWithType,
                STATUSES.PENDING
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Đã gửi đơn bổ sung chấm công thành công',
            data: insertResult.rows[0]
        });
    } catch (error) {
        console.error('Error creating attendance adjustment:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Không thể tạo đơn bổ sung chấm công: ' + error.message
        });
    }
});

// POST /api/attendance-adjustments/:id/decision - Quản lý duyệt/từ chối đơn
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
            `SELECT * FROM attendance_adjustments WHERE id = $1`,
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
            `UPDATE attendance_adjustments
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
            `SELECT adj.*,
                    e.ho_ten AS employee_name,
                    e.email AS employee_email,
                    team.ho_ten AS team_lead_name,
                    team.email AS team_lead_email
             FROM attendance_adjustments adj
             LEFT JOIN employees e ON adj.employee_id = e.id
             LEFT JOIN employees team ON adj.team_lead_id = team.id
             WHERE adj.id = $1`,
            [parseInt(id, 10)]
        );

        res.json({
            success: true,
            message: decision === 'APPROVE' ? 'Đã duyệt đơn thành công' : 'Đã từ chối đơn',
            data: updatedResult.rows[0]
        });
    } catch (error) {
        console.error('Error processing attendance adjustment decision:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Không thể xử lý đơn: ' + error.message
        });
    }
});

// DELETE /api/attendance-adjustments/:id - Nhân viên hủy đơn (PENDING) hoặc HR xóa đơn (REJECTED/CANCELLED)
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
            `SELECT * FROM attendance_adjustments WHERE id = $1`,
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
                `DELETE FROM attendance_adjustments WHERE id = $1`,
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
                `UPDATE attendance_adjustments SET status = $1 WHERE id = $2`,
                [STATUSES.CANCELLED, parseInt(id, 10)]
            );

            res.json({
                success: true,
                message: 'Đã hủy đơn thành công'
            });
        }
    } catch (error) {
        console.error('Error deleting/cancelling attendance adjustment:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể xóa/hủy đơn: ' + error.message
        });
    }
});

module.exports = router;
