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
        let normalized = removeVietnameseAccents(chiNhanh.trim().toLowerCase());
        // Chuẩn hóa các cách viết khác nhau của Hồ Chí Minh
        if (normalized.includes('ho chi minh') || normalized.includes('hcm') || normalized.includes('tp ho chi minh')) {
            normalized = 'ho chi minh';
        }
        // Chuẩn hóa các cách viết khác nhau của Hà Nội
        if (normalized.includes('ha noi') || normalized.includes('hn')) {
            normalized = 'ha noi';
        }
        // Chuẩn hóa các cách viết khác nhau của Đà Nẵng
        if (normalized.includes('da nang') || normalized.includes('dn')) {
            normalized = 'da nang';
        }
        return normalized;
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

        // QUAN TRỌNG: Nếu manager là Head Office, cho phép quản lý tất cả chi nhánh
        if (normalized === 'head office' || normalized === 'ho') {
            return true;
        }

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

    // Exact match - thử cả với và không có dấu
    let matches = [];
    if (cache.map.has(normalizedName)) {
        matches = cache.map.get(normalizedName);
    }
    
    // Nếu không tìm thấy exact match, thử tìm với normalized without accents
    if (matches.length === 0 && normalizedWithoutAccents && normalizedWithoutAccents !== normalizedName) {
        // Tìm tất cả employees có tên khớp (không phân biệt dấu)
        matches = cache.all.filter(emp => {
            const empNormalizedName = (emp.ho_ten || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
            const empNormalizedWithoutAccents = removeVietnameseAccents(empNormalizedName);
            return empNormalizedName === normalizedName || 
                   empNormalizedWithoutAccents === normalizedWithoutAccents ||
                   empNormalizedWithoutAccents === normalizedWithoutAccents.replace(/\s+/g, '');
        });
    }
    
    if (matches.length > 0) {

        if (matches.length > 1 && normalizedEmployeeChiNhanh) {
            const branchMatch = matches.find(emp => chiNhanhMatches(emp.chi_nhanh));
            if (branchMatch) {
                return branchMatch;
            }

            // Tìm manager có nhiều cấp dưới nhất trong cùng chi_nhanh
            let bestMatch = null;
            let maxSubordinates = 0;

            for (const match of matches) {
                if (!chiNhanhMatches(match.chi_nhanh)) continue;

                const managerEmployees = cache.all.filter(e => {
                    if (!e.quan_ly_truc_tiep) return false;
                    const empManagerName = (e.quan_ly_truc_tiep || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                    const matchNormalizedName = (match.ho_ten || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                    const nameMatches = empManagerName === matchNormalizedName ||
                        removeVietnameseAccents(empManagerName) === removeVietnameseAccents(matchNormalizedName);
                    return nameMatches && chiNhanhMatches(e.chi_nhanh);
                });

                if (managerEmployees.length > maxSubordinates) {
                    maxSubordinates = managerEmployees.length;
                    bestMatch = match;
                }
            }

            if (bestMatch && maxSubordinates > 0) {
                return bestMatch;
            }

            // Kiểm tra Head Office manager
            const headOfficeMatch = matches.find(emp => {
                const normalizedChiNhanh = normalizeChiNhanhValue(emp.chi_nhanh);
                return normalizedChiNhanh === 'head office' || normalizedChiNhanh === 'ho';
            });

            if (headOfficeMatch && normalizedEmployeeChiNhanh) {
                const headOfficeSubordinates = cache.all.filter(e => {
                    if (!e.quan_ly_truc_tiep) return false;
                    const empManagerName = (e.quan_ly_truc_tiep || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                    const matchNormalizedName = (headOfficeMatch.ho_ten || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                    const nameMatches = empManagerName === matchNormalizedName ||
                        removeVietnameseAccents(empManagerName) === removeVietnameseAccents(matchNormalizedName);
                    return nameMatches && chiNhanhMatches(e.chi_nhanh);
                });

                if (headOfficeSubordinates.length > 0) {
                    return headOfficeMatch;
                }
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
                        const matchNormalizedName = (match.ho_ten || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                        const nameMatches = empManagerName === matchNormalizedName ||
                            removeVietnameseAccents(empManagerName) === removeVietnameseAccents(matchNormalizedName);
                        return nameMatches;
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

            return null;
        }

        if (matches.length === 1) {
            const match = matches[0];
            // Nếu employee ở Head Office, cho phép sử dụng manager từ bất kỳ chi nhánh nào
            const isEmployeeHeadOffice = normalizedEmployeeChiNhanh === 'head office' || normalizedEmployeeChiNhanh === 'ho';
            if (isEmployeeHeadOffice) {
                console.log(`[findManagerFromCache] Employee is at Head Office, allowing manager "${match.ho_ten}" (${match.chi_nhanh || 'N/A'}) from different branch.`);
                return match;
            }

            if (normalizedEmployeeChiNhanh) {
                const managerChiNhanhMatches = chiNhanhMatches(match.chi_nhanh);

                if (managerChiNhanhMatches) {
                    // Nếu manager có chi_nhanh match, trả về ngay (không cần kiểm tra cấp dưới)
                    // Vì có thể manager này mới được thêm vào hoặc chưa có cấp dưới trong database
                    console.log(`[findManagerFromCache] Exact match found (single match, chi_nhanh matches): "${match.ho_ten}" (${match.chi_nhanh || 'N/A'}) matches employee chi_nhanh "${normalizedEmployeeChiNhanh}"`);
                    return match;
                } else {
                    const normalizedMatchChiNhanh = normalizeChiNhanhValue(match.chi_nhanh);
                    const isHeadOffice = normalizedMatchChiNhanh === 'head office' || normalizedMatchChiNhanh === 'ho';

                    if (isHeadOffice) {
                        const headOfficeSubordinates = cache.all.filter(e => {
                            if (!e.quan_ly_truc_tiep) return false;
                            const empManagerName = (e.quan_ly_truc_tiep || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                            const matchNormalizedName = (match.ho_ten || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                            const nameMatches = empManagerName === matchNormalizedName ||
                                removeVietnameseAccents(empManagerName) === removeVietnameseAccents(matchNormalizedName);
                            return nameMatches && chiNhanhMatches(e.chi_nhanh);
                        });

                        if (headOfficeSubordinates.length > 0) {
                            return match;
                        }
                    }
                }
            }

            return match;
        }

        return matches[0];
    }

    return null;
};

// Ensure table exists
const ensureTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS late_early_requests (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                team_lead_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('LATE', 'EARLY')),
                request_date DATE NOT NULL,
                time_value TIME NOT NULL,
                reason TEXT NOT NULL,
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

        // Create indexes separately
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_late_early_requests_employee ON late_early_requests(employee_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_late_early_requests_team_lead ON late_early_requests(team_lead_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_late_early_requests_status ON late_early_requests(status)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_late_early_requests_request_type ON late_early_requests(request_type)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_late_early_requests_request_date ON late_early_requests(request_date)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_late_early_requests_created_at ON late_early_requests(created_at DESC)`);
    } catch (error) {
        console.error('[lateEarlyRequests] Error ensuring table:', error);
    }
};

// Initialize table on module load
ensureTable();

// ============================================================
// API ENDPOINTS
// ============================================================

// GET /api/late-early-requests - Lấy danh sách đơn
router.get('/', async (req, res) => {
    try {
        // Đảm bảo các cột cần thiết tồn tại
        try {
            await pool.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'employees' AND column_name = 'chi_nhanh'
                    ) THEN
                        ALTER TABLE employees ADD COLUMN chi_nhanh VARCHAR(255);
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'employees' AND column_name = 'phong_ban'
                    ) THEN
                        ALTER TABLE employees ADD COLUMN phong_ban VARCHAR(255);
                    END IF;
                END $$;
            `);
        } catch (alterError) {
            // Column có thể đã tồn tại, bỏ qua lỗi
            console.log('[LateEarlyRequest GET] Column check:', alterError.message);
        }

        const { employeeId, teamLeadId, status, requestType } = req.query;

        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (employeeId) {
            conditions.push(`ler.employee_id = $${paramIndex}`);
            params.push(parseInt(employeeId, 10));
            paramIndex += 1;
        }

        if (teamLeadId) {
            conditions.push(`ler.team_lead_id = $${paramIndex}`);
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
                conditions.push(`ler.status = ANY (ARRAY[${placeholders.join(', ')}])`);
                params.push(...statuses);
                paramIndex += statuses.length;
            }
        } else if (teamLeadId) {
            conditions.push(`ler.status = $${paramIndex}`);
            params.push(STATUSES.PENDING);
            paramIndex += 1;
        }

        if (requestType) {
            conditions.push(`ler.request_type = $${paramIndex}`);
            params.push(requestType.toUpperCase());
            paramIndex += 1;
        }

        const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

        const query = `
            SELECT ler.*,
                   e.ho_ten as employee_name,
                   e.ma_nhan_vien,
                   e.email as employee_email,
                   e.phong_ban as employee_department,
                   e.chi_nhanh as employee_branch,
                   team.ho_ten as team_lead_name,
                   team.email as team_lead_email
            FROM late_early_requests ler
            LEFT JOIN employees e ON ler.employee_id = e.id
            LEFT JOIN employees team ON ler.team_lead_id = team.id
            WHERE ${whereClause}
            ORDER BY ler.created_at DESC
        `;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            message: 'Danh sách đơn xin đi trễ về sớm',
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching late early requests:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách đơn: ' + error.message
        });
    }
});

// POST /api/late-early-requests - Nhân viên tạo đơn
router.post('/', async (req, res) => {
    try {
        const {
            employeeId,
            requestType,
            requestDate,
            timeValue,
            reason,
            notes
        } = req.body;

        if (!employeeId || !requestType || !requestDate || !timeValue || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        if (requestType !== 'LATE' && requestType !== 'EARLY') {
            return res.status(400).json({
                success: false,
                message: 'requestType phải là LATE hoặc EARLY'
            });
        }

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
            // Debug: Log thông tin để kiểm tra
            const cache = await getEmployeesCache();
            console.log('[lateEarlyRequests POST] Debug info:', {
                managerName: employee.quan_ly_truc_tiep,
                employeeChiNhanh: employee.chi_nhanh,
                allManagers: cache.all.map(e => ({
                    id: e.id,
                    ho_ten: e.ho_ten,
                    chi_nhanh: e.chi_nhanh,
                    normalized: (e.ho_ten || '').trim().toLowerCase().replace(/\s+/g, ' ').trim()
                })).filter(e => {
                    const normalizedName = (employee.quan_ly_truc_tiep || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                    const normalizedWithoutAccents = removeVietnameseAccents(normalizedName);
                    const empNormalizedName = (e.normalized || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                    const empNormalizedWithoutAccents = removeVietnameseAccents(empNormalizedName);
                    return empNormalizedName === normalizedName || empNormalizedWithoutAccents === normalizedWithoutAccents;
                })
            });
            
            return res.status(404).json({
                success: false,
                message: `Không tìm thấy quản lý trực tiếp "${employee.quan_ly_truc_tiep}"${employee.chi_nhanh ? ` (chi_nhanh: ${employee.chi_nhanh})` : ''} trong hệ thống. Vui lòng kiểm tra lại thông tin quản lý trực tiếp trong module Quản lý nhân viên.`
            });
        }

        // Tạo đơn
        const insertResult = await pool.query(
            `INSERT INTO late_early_requests (
                employee_id,
                team_lead_id,
                request_type,
                request_date,
                time_value,
                reason,
                notes,
                status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                parseInt(employeeId, 10),
                teamLead.id,
                requestType,
                requestDate,
                timeValue,
                reason,
                notes || null,
                STATUSES.PENDING
            ]
        );

        const newRequest = insertResult.rows[0];

        res.status(201).json({
            success: true,
            message: 'Đã gửi đơn thành công',
            data: newRequest
        });
    } catch (error) {
        console.error('Error creating late early request:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể tạo đơn: ' + error.message
        });
    }
});

// POST /api/late-early-requests/:id/decision - Quản lý duyệt/từ chối đơn
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
            `SELECT * FROM late_early_requests WHERE id = $1`,
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
            `UPDATE late_early_requests
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

        // Lấy đơn đã cập nhật
        const updatedResult = await pool.query(
            `SELECT ler.*,
                    e.ho_ten as employee_name,
                    e.email as employee_email,
                    team.ho_ten as team_lead_name,
                    team.email as team_lead_email
             FROM late_early_requests ler
             LEFT JOIN employees e ON ler.employee_id = e.id
             LEFT JOIN employees team ON ler.team_lead_id = team.id
             WHERE ler.id = $1`,
            [parseInt(id, 10)]
        );

        res.json({
            success: true,
            message: decision === 'APPROVE' ? 'Đã duyệt đơn thành công' : 'Đã từ chối đơn',
            data: updatedResult.rows[0]
        });
    } catch (error) {
        console.error('Error processing late early request decision:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể xử lý đơn: ' + error.message
        });
    }
});

// DELETE /api/late-early-requests/:id - Nhân viên hủy đơn hoặc HR xóa đơn
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
            `SELECT * FROM late_early_requests WHERE id = $1`,
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
            await pool.query(
                `DELETE FROM late_early_requests WHERE id = $1`,
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

            // Cho phép hủy đơn PENDING hoặc APPROVED
            if (request.status !== STATUSES.PENDING && request.status !== STATUSES.APPROVED) {
                return res.status(400).json({
                    success: false,
                    message: 'Chỉ có thể hủy đơn đang chờ duyệt hoặc đã được duyệt'
                });
            }

            // Lấy lý do hủy từ body
            const { cancellationReason } = req.body;
            if (request.status === STATUSES.APPROVED && !cancellationReason) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập lý do hủy đơn'
                });
            }

            // Kiểm tra xem có cột cancellation_reason không
            const columnCheck = await pool.query(
                `SELECT column_name FROM information_schema.columns 
                 WHERE table_name = 'late_early_requests' AND column_name = 'cancellation_reason'`
            );
            const hasCancellationReason = columnCheck.rows.length > 0;

            // Cập nhật status thành CANCELLED
            if (hasCancellationReason && cancellationReason) {
                await pool.query(
                    `UPDATE late_early_requests SET status = $1, cancellation_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
                    [STATUSES.CANCELLED, cancellationReason.trim(), parseInt(id, 10)]
                );
            } else {
                await pool.query(
                    `UPDATE late_early_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                    [STATUSES.CANCELLED, parseInt(id, 10)]
                );
            }

            res.json({
                success: true,
                message: 'Đã hủy đơn thành công'
            });
        }
    } catch (error) {
        console.error('Error deleting/cancelling late early request:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể xóa/hủy đơn: ' + error.message
        });
    }
});

module.exports = router;

