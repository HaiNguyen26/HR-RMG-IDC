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

// Cache cho danh sách employees để tránh query database nhiều lần
let employeesCache = null;
let employeesCacheTime = null;
const EMPLOYEES_CACHE_TTL = 5 * 60 * 1000; // 5 phút

const getEmployeesCache = async () => {
    const now = Date.now();
    if (employeesCache && employeesCacheTime && (now - employeesCacheTime) < EMPLOYEES_CACHE_TTL) {
        return employeesCache;
    }

    const result = await pool.query(
        `SELECT id, ho_ten, email, quan_ly_truc_tiep, chuc_danh, trang_thai, chi_nhanh
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

// Tìm quản lý trực tiếp từ cache (sử dụng logic từ leaveRequests)
const findManagerFromCache = async (managerName, employeeChiNhanh = null) => {
    const cache = await getEmployeesCache();
    const normalizedName = (managerName || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
    const normalizedWithoutAccents = removeVietnameseAccents(normalizedName);

    const normalizeChiNhanhValue = (chiNhanh) => {
        if (!chiNhanh) return null;
        return removeVietnameseAccents(chiNhanh.trim().toLowerCase());
    };
    const normalizedEmployeeChiNhanh = employeeChiNhanh ? normalizeChiNhanhValue(employeeChiNhanh) : null;

    if (!normalizedName) {
        console.log('[findManagerFromCache] Manager name is empty');
        return null;
    }

    // Helper function để check match chi_nhanh
    const chiNhanhMatches = (empChiNhanh) => {
        if (!normalizedEmployeeChiNhanh) return true;
        const normalized = normalizeChiNhanhValue(empChiNhanh);
        if (!normalized) return false;
        if (normalized === normalizedEmployeeChiNhanh) return true;
        if (normalized.includes(normalizedEmployeeChiNhanh) || normalizedEmployeeChiNhanh.includes(normalized)) {
            const words1 = normalized.split(/\s+/).filter(w => w.length > 1);
            const words2 = normalizedEmployeeChiNhanh.split(/\s+/).filter(w => w.length > 1);
            if (words1.length > 0 && words2.length > 0) {
                const hasCommonWord = words1.some(w1 => words2.some(w2 => w1 === w2));
                return hasCommonWord;
            }
        }
        return false;
    };

    // Exact match (có dấu)
    if (cache.map.has(normalizedName)) {
        const matches = cache.map.get(normalizedName);

        if (matches.length > 1 && normalizedEmployeeChiNhanh) {
            const branchMatch = matches.find(emp => chiNhanhMatches(emp.chi_nhanh));
            if (branchMatch) {
                return branchMatch;
            }

            let bestMatch = null;
            let maxSubordinates = 0;

            for (const match of matches) {
                if (!chiNhanhMatches(match.chi_nhanh)) {
                    continue;
                }

                const managerEmployees = cache.all.filter(e => {
                    if (!e.quan_ly_truc_tiep) return false;
                    const empManagerName = (e.quan_ly_truc_tiep || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                    return empManagerName === normalizedName && chiNhanhMatches(e.chi_nhanh);
                });

                if (managerEmployees.length > maxSubordinates) {
                    maxSubordinates = managerEmployees.length;
                    bestMatch = match;
                }
            }

            if (bestMatch) {
                return bestMatch;
            }

            // Nếu employee ở Head Office, cho phép tìm manager từ bất kỳ chi nhánh nào
            const isEmployeeHeadOffice = normalizedEmployeeChiNhanh === 'head office' || normalizedEmployeeChiNhanh === 'ho';
            if (isEmployeeHeadOffice && matches.length > 0) {
                let bestMatch = null;
                let maxSubordinates = 0;

                for (const match of matches) {
                    const managerEmployees = cache.all.filter(e => {
                        if (!e.quan_ly_truc_tiep) return false;
                        const empManagerName = (e.quan_ly_truc_tiep || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                        return empManagerName === normalizedName;
                    });

                    if (managerEmployees.length > maxSubordinates) {
                        maxSubordinates = managerEmployees.length;
                        bestMatch = match;
                    }
                }

                if (bestMatch) {
                    console.log(`[findManagerFromCache] Employee is at Head Office, allowing manager "${bestMatch.ho_ten}" (${bestMatch.chi_nhanh || 'N/A'}) from different branch with ${maxSubordinates} subordinates.`);
                    return bestMatch;
                }
            }
        }

        // Nếu chỉ có 1 match và employee ở Head Office, cho phép sử dụng manager từ bất kỳ chi nhánh nào
        if (matches.length === 1) {
            const match = matches[0];
            const isEmployeeHeadOffice = normalizedEmployeeChiNhanh === 'head office' || normalizedEmployeeChiNhanh === 'ho';
            if (isEmployeeHeadOffice) {
                console.log(`[findManagerFromCache] Employee is at Head Office, allowing manager "${match.ho_ten}" (${match.chi_nhanh || 'N/A'}) from different branch.`);
                return match;
            }
        }

        return matches[0];
    }

    return null;
};

// Ensure table exists
const ensureTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS meal_allowance_requests (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                team_lead_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
                notes TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
                    status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
                ),
                team_lead_action VARCHAR(20) CHECK (team_lead_action IN ('APPROVE', 'REJECT')),
                team_lead_action_at TIMESTAMP,
                team_lead_comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS meal_allowance_items (
                id SERIAL PRIMARY KEY,
                meal_allowance_request_id INTEGER NOT NULL REFERENCES meal_allowance_requests(id) ON DELETE CASCADE,
                expense_date DATE NOT NULL,
                content TEXT NOT NULL,
                amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indexes separately
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_meal_allowance_requests_employee ON meal_allowance_requests(employee_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_meal_allowance_requests_team_lead ON meal_allowance_requests(team_lead_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_meal_allowance_requests_status ON meal_allowance_requests(status)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_meal_allowance_requests_created_at ON meal_allowance_requests(created_at DESC)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_meal_allowance_items_request ON meal_allowance_items(meal_allowance_request_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_meal_allowance_items_expense_date ON meal_allowance_items(expense_date)`);
    } catch (error) {
        console.error('[mealAllowanceRequests] Error ensuring table:', error);
    }
};

// Initialize table on module load
ensureTable();

// ============================================================
// API ENDPOINTS
// ============================================================

// GET /api/meal-allowance-requests - Lấy danh sách đơn
router.get('/', async (req, res) => {
    try {
        const { employeeId, teamLeadId, status } = req.query;

        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (employeeId) {
            conditions.push(`mar.employee_id = $${paramIndex}`);
            params.push(parseInt(employeeId, 10));
            paramIndex += 1;
        }

        if (teamLeadId) {
            conditions.push(`mar.team_lead_id = $${paramIndex}`);
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
                conditions.push(`mar.status = ANY (ARRAY[${placeholders.join(', ')}])`);
                params.push(...statuses);
                paramIndex += statuses.length;
            }
        } else if (teamLeadId) {
            conditions.push(`mar.status = $${paramIndex}`);
            params.push(STATUSES.PENDING);
            paramIndex += 1;
        }

        const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

        const query = `
            SELECT mar.*,
                   e.ho_ten as employee_name,
                   e.email as employee_email,
                   e.phong_ban as employee_department,
                   team.ho_ten as team_lead_name,
                   team.email as team_lead_email
            FROM meal_allowance_requests mar
            LEFT JOIN employees e ON mar.employee_id = e.id
            LEFT JOIN employees team ON mar.team_lead_id = team.id
            WHERE ${whereClause}
            ORDER BY mar.created_at DESC
        `;

        const result = await pool.query(query, params);

        // Lấy items cho mỗi request
        const requestsWithItems = await Promise.all(
            result.rows.map(async (request) => {
                const itemsResult = await pool.query(
                    `SELECT * FROM meal_allowance_items 
                     WHERE meal_allowance_request_id = $1 
                     ORDER BY expense_date ASC, created_at ASC`,
                    [request.id]
                );
                return {
                    ...request,
                    items: itemsResult.rows
                };
            })
        );

        res.json({
            success: true,
            message: 'Danh sách đơn xin phụ cấp cơm công trình',
            data: requestsWithItems
        });
    } catch (error) {
        console.error('Error fetching meal allowance requests:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách đơn: ' + error.message
        });
    }
});

// GET /api/meal-allowance-requests/:id - Lấy chi tiết một đơn
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const requestResult = await pool.query(
            `SELECT mar.*,
                   e.ho_ten as employee_name,
                   e.email as employee_email,
                   e.phong_ban as employee_department,
                   e.chi_nhanh as employee_branch,
                   e.ma_nhan_vien,
                   team.ho_ten as team_lead_name,
                   team.email as team_lead_email
            FROM meal_allowance_requests mar
            LEFT JOIN employees e ON mar.employee_id = e.id
            LEFT JOIN employees team ON mar.team_lead_id = team.id
            WHERE mar.id = $1`,
            [parseInt(id, 10)]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn'
            });
        }

        const request = requestResult.rows[0];

        // Lấy items
        const itemsResult = await pool.query(
            `SELECT * FROM meal_allowance_items 
             WHERE meal_allowance_request_id = $1 
             ORDER BY expense_date ASC, created_at ASC`,
            [parseInt(id, 10)]
        );

        res.json({
            success: true,
            message: 'Chi tiết đơn xin phụ cấp cơm công trình',
            data: {
                ...request,
                items: itemsResult.rows
            }
        });
    } catch (error) {
        console.error('Error fetching meal allowance request details:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể lấy chi tiết đơn: ' + error.message
        });
    }
});

// POST /api/meal-allowance-requests - Nhân viên tạo đơn
router.post('/', async (req, res) => {
    try {
        const {
            employeeId,
            items,
            notes
        } = req.body;

        if (!employeeId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc: employeeId và items (mảng các mục cơm)'
            });
        }

        // Validate items
        for (const item of items) {
            if (!item.expense_date || !item.content || item.amount === undefined || item.amount === null) {
                return res.status(400).json({
                    success: false,
                    message: 'Mỗi mục cơm phải có: expense_date, content, amount'
                });
            }
        }

        // Tính tổng số tiền
        const totalAmount = items.reduce((sum, item) => {
            return sum + parseFloat(item.amount || 0);
        }, 0);

        // Tìm nhân viên
        const employeeResult = await pool.query(
            `SELECT id, ho_ten, quan_ly_truc_tiep, chi_nhanh FROM employees WHERE id = $1`,
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
        const teamLead = await findManagerFromCache(employee.quan_ly_truc_tiep, employee.chi_nhanh);

        if (!teamLead) {
            return res.status(404).json({
                success: false,
                message: `Không tìm thấy quản lý trực tiếp "${employee.quan_ly_truc_tiep}"${employee.chi_nhanh ? ` (chi_nhanh: ${employee.chi_nhanh})` : ''} trong hệ thống.`
            });
        }

        // Tạo đơn và items trong transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Tạo đơn
            const insertResult = await client.query(
                `INSERT INTO meal_allowance_requests (
                    employee_id,
                    team_lead_id,
                    total_amount,
                    notes,
                    status
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING *`,
                [
                    parseInt(employeeId, 10),
                    teamLead.id,
                    totalAmount,
                    notes || null,
                    STATUSES.PENDING
                ]
            );

            const newRequest = insertResult.rows[0];

            // Tạo items
            const itemValues = items.map((item, index) => {
                const baseIndex = index * 4;
                return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`;
            }).join(', ');

            const itemParams = items.flatMap(item => [
                newRequest.id,
                item.expense_date,
                item.content,
                parseFloat(item.amount || 0)
            ]);

            await client.query(
                `INSERT INTO meal_allowance_items (meal_allowance_request_id, expense_date, content, amount)
                 VALUES ${itemValues}`,
                itemParams
            );

            // Lấy lại items đã tạo
            const itemsResult = await client.query(
                `SELECT * FROM meal_allowance_items 
                 WHERE meal_allowance_request_id = $1 
                 ORDER BY expense_date ASC, created_at ASC`,
                [newRequest.id]
            );

            await client.query('COMMIT');

            res.status(201).json({
                success: true,
                message: 'Đã gửi đơn thành công',
                data: {
                    ...newRequest,
                    items: itemsResult.rows
                }
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error creating meal allowance request:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể tạo đơn: ' + error.message
        });
    }
});

// POST /api/meal-allowance-requests/:id/decision - Quản lý duyệt/từ chối đơn
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

        // Kiểm tra đơn có tồn tại không
        const requestResult = await pool.query(
            `SELECT * FROM meal_allowance_requests WHERE id = $1`,
            [parseInt(id, 10)]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn'
            });
        }

        const request = requestResult.rows[0];

        // Kiểm tra quyền
        if (request.team_lead_id !== parseInt(teamLeadId, 10)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xử lý đơn này'
            });
        }

        // Kiểm tra status
        if (request.status !== STATUSES.PENDING) {
            return res.status(400).json({
                success: false,
                message: 'Đơn không còn ở trạng thái chờ duyệt'
            });
        }

        // Cập nhật đơn
        const newStatus = decision === 'APPROVE' ? STATUSES.APPROVED : STATUSES.REJECTED;
        const now = new Date();

        await pool.query(
            `UPDATE meal_allowance_requests
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

        // Lấy đơn đã cập nhật kèm items
        const updatedResult = await pool.query(
            `SELECT mar.*,
                    e.ho_ten as employee_name,
                    e.email as employee_email,
                    team.ho_ten as team_lead_name,
                    team.email as team_lead_email
             FROM meal_allowance_requests mar
             LEFT JOIN employees e ON mar.employee_id = e.id
             LEFT JOIN employees team ON mar.team_lead_id = team.id
             WHERE mar.id = $1`,
            [parseInt(id, 10)]
        );

        const itemsResult = await pool.query(
            `SELECT * FROM meal_allowance_items 
             WHERE meal_allowance_request_id = $1 
             ORDER BY expense_date ASC, created_at ASC`,
            [parseInt(id, 10)]
        );

        res.json({
            success: true,
            message: decision === 'APPROVE' ? 'Đã duyệt đơn thành công' : 'Đã từ chối đơn',
            data: {
                ...updatedResult.rows[0],
                items: itemsResult.rows
            }
        });
    } catch (error) {
        console.error('Error processing meal allowance request decision:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể xử lý đơn: ' + error.message
        });
    }
});

// DELETE /api/meal-allowance-requests/:id - Nhân viên hủy đơn hoặc HR xóa đơn
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

        // Kiểm tra đơn
        const requestResult = await pool.query(
            `SELECT * FROM meal_allowance_requests WHERE id = $1`,
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
            // HR có thể xóa đơn ở bất kỳ trạng thái nào
            // Items sẽ tự động xóa do ON DELETE CASCADE
            await pool.query(
                `DELETE FROM meal_allowance_requests WHERE id = $1`,
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
                `UPDATE meal_allowance_requests SET status = $1 WHERE id = $2`,
                [STATUSES.CANCELLED, parseInt(id, 10)]
            );

            res.json({
                success: true,
                message: 'Đã hủy đơn thành công'
            });
        }
    } catch (error) {
        console.error('Error deleting/cancelling meal allowance request:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể xóa/hủy đơn: ' + error.message
        });
    }
});

module.exports = router;



