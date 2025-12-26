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

const findManagerFromCache = async (managerName, employeeChiNhanh = null) => {
    const cache = await getEmployeesCache();
    const normalizedName = (managerName || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
    const normalizedWithoutAccents = removeVietnameseAccents(normalizedName);

    // Normalize chi_nhanh ngay từ đầu (bỏ dấu, lowercase, trim)
    const normalizeChiNhanhValue = (chiNhanh) => {
        if (!chiNhanh) return null;
        return removeVietnameseAccents(chiNhanh.trim().toLowerCase());
    };
    const normalizedEmployeeChiNhanh = employeeChiNhanh ? normalizeChiNhanhValue(employeeChiNhanh) : null;

    if (!normalizedName) {
        console.log('[findManagerFromCache] Manager name is empty');
        return null;
    }

    console.log(`[findManagerFromCache] Looking for manager: "${managerName}" (normalized: "${normalizedName}")${normalizedEmployeeChiNhanh ? `, chi_nhanh: "${normalizedEmployeeChiNhanh}"` : ''}`);

    // Helper function để normalize chi_nhanh (bỏ dấu, lowercase, trim)
    const normalizeChiNhanh = (chiNhanh) => {
        if (!chiNhanh) return null;
        return removeVietnameseAccents(chiNhanh.trim().toLowerCase());
    };

    // Helper function để check match chi_nhanh
    // So sánh chính xác hoặc một phần (nếu một trong hai chứa phần còn lại)
    const chiNhanhMatches = (empChiNhanh) => {
        if (!normalizedEmployeeChiNhanh) return true; // Nếu không có chi_nhanh context, match tất cả
        const normalized = normalizeChiNhanh(empChiNhanh);
        if (!normalized) return false;

        // Exact match
        if (normalized === normalizedEmployeeChiNhanh) return true;

        // Partial match: nếu một trong hai chứa phần còn lại (ví dụ: "ha noi" và "ha noi - van phong")
        // Chỉ áp dụng nếu cả hai đều có giá trị
        if (normalized.includes(normalizedEmployeeChiNhanh) || normalizedEmployeeChiNhanh.includes(normalized)) {
            // Kiểm tra xem có phải là match thực sự không (không phải false positive)
            // Ví dụ: "ha noi" không nên match với "ho chi minh" dù có chứa "h"
            const words1 = normalized.split(/\s+/).filter(w => w.length > 1);
            const words2 = normalizedEmployeeChiNhanh.split(/\s+/).filter(w => w.length > 1);
            if (words1.length > 0 && words2.length > 0) {
                // Nếu có ít nhất một từ khớp hoàn toàn
                const hasCommonWord = words1.some(w1 => words2.some(w2 => w1 === w2));
                return hasCommonWord;
            }
        }

        return false;
    };

    // Exact match (có dấu) - ưu tiên match theo chi_nhanh nếu có nhiều kết quả
    if (cache.map.has(normalizedName)) {
        const matches = cache.map.get(normalizedName);

        // Nếu có nhiều người cùng tên, BẮT BUỘC phải match chi_nhanh để tránh nhầm lẫn
        if (matches.length > 1 && normalizedEmployeeChiNhanh) {
            // Ưu tiên 1: Tìm manager có chi_nhanh match với employee
            const branchMatch = matches.find(emp => chiNhanhMatches(emp.chi_nhanh));
            if (branchMatch) {
                console.log(`[findManagerFromCache] Exact match found (with chi_nhanh, multiple matches): "${branchMatch.ho_ten}" (${branchMatch.chi_nhanh || 'N/A'})`);
                return branchMatch;
            }

            // Ưu tiên 2: Tìm manager có NHIỀU cấp dưới nhất trong cùng chi_nhanh với employee
            let bestMatch = null;
            let maxSubordinates = 0;

            for (const match of matches) {
                // Chỉ xem xét manager có chi_nhanh match với employee đang tạo đơn
                if (!chiNhanhMatches(match.chi_nhanh)) {
                    continue;
                }

                // Đếm cấp dưới của manager này trong cùng chi_nhanh với employee
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
                console.log(`[findManagerFromCache] Exact match found (multiple matches, selected manager "${bestMatch.ho_ten}" (${bestMatch.chi_nhanh || 'N/A'}) with ${maxSubordinates} subordinates in chi_nhanh "${normalizedEmployeeChiNhanh}")`);
                return bestMatch;
            }

            // Nếu không có manager nào match chi_nhanh, không trả về để tránh nhầm lẫn
            console.error(`[findManagerFromCache] ❌ ERROR: Found ${matches.length} employees with name "${managerName}" but NONE matches chi_nhanh "${normalizedEmployeeChiNhanh}". Returning NULL to avoid incorrect assignment. Available managers: ${matches.map(m => `${m.ho_ten} (ID: ${m.id}, chi_nhanh: ${m.chi_nhanh || 'N/A'})`).join(', ')}`);
            return null;
        }

        // Nếu chỉ có 1 kết quả, vẫn nên kiểm tra chi_nhanh nếu có context
        // (vì có thể cache chưa đầy đủ hoặc có nhiều người cùng tên nhưng chưa được load)
        if (matches.length === 1) {
            const match = matches[0];
            // Nếu có chi_nhanh context, kiểm tra xem manager có cấp dưới trong cùng chi_nhanh không
            if (normalizedEmployeeChiNhanh) {
                // QUAN TRỌNG: Chỉ xem xét manager có chi_nhanh match với employee đang tạo đơn
                // Nếu manager không có chi_nhanh match, không phải manager đúng
                const managerChiNhanhMatches = chiNhanhMatches(match.chi_nhanh);

                if (managerChiNhanhMatches) {
                    // Kiểm tra xem manager này có cấp dưới trong cùng chi_nhanh với employee đang tạo đơn không
                    const managerEmployees = cache.all.filter(e => {
                        if (!e.quan_ly_truc_tiep) return false;
                        const empManagerName = (e.quan_ly_truc_tiep || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                        const matchNormalizedName = (match.ho_ten || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                        const nameMatches = empManagerName === matchNormalizedName ||
                            removeVietnameseAccents(empManagerName) === removeVietnameseAccents(matchNormalizedName);
                        // QUAN TRỌNG: Kiểm tra chi_nhanh của employee (e.chi_nhanh) match với chi_nhanh của employee đang tạo đơn (normalizedEmployeeChiNhanh)
                        return nameMatches && chiNhanhMatches(e.chi_nhanh);
                    });

                    if (managerEmployees.length > 0) {
                        // Log chi tiết để debug
                        const subordinatesChiNhanh = managerEmployees.map(e => e.chi_nhanh || 'N/A');
                        console.log(`[findManagerFromCache] Manager "${match.ho_ten}" (${match.chi_nhanh || 'N/A'}) has ${managerEmployees.length} subordinates. Their chi_nhanh: ${[...new Set(subordinatesChiNhanh)].join(', ')}. Looking for chi_nhanh: "${normalizedEmployeeChiNhanh}"`);
                        console.log(`[findManagerFromCache] Exact match found (single match with ${managerEmployees.length} subordinates in chi_nhanh "${normalizedEmployeeChiNhanh}"): "${match.ho_ten}" (${match.chi_nhanh || 'N/A'})`);
                        return match;
                    }
                } else {
                    // Manager này không có chi_nhanh match, không phải manager đúng
                    console.log(`[findManagerFromCache] Manager "${match.ho_ten}" (${match.chi_nhanh || 'N/A'}) does not match employee chi_nhanh "${normalizedEmployeeChiNhanh}". Searching for other managers...`);

                    // QUAN TRỌNG: Nếu manager không có chi_nhanh match, KHÔNG được trả về để tránh nhầm lẫn
                    // Tìm lại trong toàn bộ cache xem có manager nào khác cùng tên và match chi_nhanh không
                    const allManagersWithSameName = cache.all.filter(e => {
                        const empNormalizedName = (e.ho_ten || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                        return empNormalizedName === normalizedName ||
                            removeVietnameseAccents(empNormalizedName) === removeVietnameseAccents(normalizedName);
                    });

                    // Tìm manager có chi_nhanh match trong danh sách tất cả managers cùng tên
                    for (const otherManager of allManagersWithSameName) {
                        if (chiNhanhMatches(otherManager.chi_nhanh)) {
                            console.log(`[findManagerFromCache] Found correct manager "${otherManager.ho_ten}" (ID: ${otherManager.id}, ${otherManager.chi_nhanh || 'N/A'}) after searching all managers with same name`);
                            return otherManager;
                        }
                    }

                    // Nếu vẫn không tìm thấy manager có chi_nhanh match, trả về NULL để tránh nhầm lẫn
                    console.error(`[findManagerFromCache] ❌ ERROR: Single match found in cache map but manager "${match.ho_ten}" (ID: ${match.id}, ${match.chi_nhanh || 'N/A'}) does NOT match employee chi_nhanh "${normalizedEmployeeChiNhanh}". Searched ${allManagersWithSameName.length} managers with same name. Returning NULL to avoid incorrect assignment.`);
                    return null;
                }
            }

            console.log(`[findManagerFromCache] Exact match found (single match, no chi_nhanh check): "${match.ho_ten}"${match.chi_nhanh ? ` (${match.chi_nhanh})` : ''}`);
            return match;
        }
    }

    // Exact match (không dấu) - ưu tiên match theo chi_nhanh nếu có nhiều kết quả
    const matchesNoAccents = [];
    for (const [normalizedEmpName, employees] of cache.map.entries()) {
        const empNameWithoutAccents = removeVietnameseAccents(normalizedEmpName);
        if (empNameWithoutAccents === normalizedWithoutAccents) {
            matchesNoAccents.push(...employees);
        }
    }

    if (matchesNoAccents.length > 0) {
        // Nếu có chi_nhanh context VÀ có nhiều kết quả, BẮT BUỘC phải match theo chi_nhanh
        if (normalizedEmployeeChiNhanh && matchesNoAccents.length > 1) {
            const branchMatch = matchesNoAccents.find(emp => chiNhanhMatches(emp.chi_nhanh));
            if (branchMatch) {
                console.log(`[findManagerFromCache] Exact match (no accents, with chi_nhanh) found: "${branchMatch.ho_ten}" (${branchMatch.chi_nhanh || 'N/A'})`);
                return branchMatch;
            }
            // Nếu có nhiều người cùng tên nhưng không match chi_nhanh, không trả về để tránh nhầm lẫn
            console.warn(`[findManagerFromCache] ⚠️ Found ${matchesNoAccents.length} employees with name "${managerName}" (no accents) but none matches chi_nhanh "${normalizedEmployeeChiNhanh}". Available: ${matchesNoAccents.map(m => `${m.ho_ten} (${m.chi_nhanh || 'N/A'})`).join(', ')}`);
            return null;
        }

        // Nếu chỉ có 1 kết quả, vẫn kiểm tra chi_nhanh nếu có context
        if (matchesNoAccents.length === 1 && normalizedEmployeeChiNhanh) {
            const match = matchesNoAccents[0];
            if (!chiNhanhMatches(match.chi_nhanh)) {
                // Tìm lại trong toàn bộ cache
                const allManagersWithSameName = cache.all.filter(e => {
                    const empNormalizedName = (e.ho_ten || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                    const empNameWithoutAccents = removeVietnameseAccents(empNormalizedName);
                    return empNameWithoutAccents === normalizedWithoutAccents;
                });

                for (const otherManager of allManagersWithSameName) {
                    if (chiNhanhMatches(otherManager.chi_nhanh)) {
                        console.log(`[findManagerFromCache] Found correct manager "${otherManager.ho_ten}" (ID: ${otherManager.id}, ${otherManager.chi_nhanh || 'N/A'}) after searching all managers with same name (no accents)`);
                        return otherManager;
                    }
                }

                console.error(`[findManagerFromCache] ❌ ERROR: Single match (no accents) found but manager "${match.ho_ten}" (ID: ${match.id}, ${match.chi_nhanh || 'N/A'}) does NOT match employee chi_nhanh "${normalizedEmployeeChiNhanh}". Returning NULL.`);
                return null;
            }
        }

        const match = matchesNoAccents[0];
        console.log(`[findManagerFromCache] Exact match (no accents) found: "${match.ho_ten}"${match.chi_nhanh ? ` (${match.chi_nhanh})` : ''}`);
        return match;
    }

    // Fuzzy match (có dấu)
    const fuzzyMatches = [];
    for (const [normalizedEmpName, employees] of cache.map.entries()) {
        if (normalizedEmpName === normalizedName) {
            fuzzyMatches.push(...employees);
        } else if (normalizedEmpName.includes(normalizedName) || normalizedName.includes(normalizedEmpName)) {
            fuzzyMatches.push(...employees);
        }
    }

    if (fuzzyMatches.length > 0) {
        // Nếu có chi_nhanh context VÀ có nhiều kết quả, BẮT BUỘC phải match theo chi_nhanh
        if (normalizedEmployeeChiNhanh && fuzzyMatches.length > 1) {
            const branchMatch = fuzzyMatches.find(emp => chiNhanhMatches(emp.chi_nhanh));
            if (branchMatch) {
                console.log(`[findManagerFromCache] Fuzzy match (with chi_nhanh) found: "${branchMatch.ho_ten}" (${branchMatch.chi_nhanh || 'N/A'})`);
                return branchMatch;
            }
            // Nếu có nhiều người cùng tên nhưng không match chi_nhanh, không trả về để tránh nhầm lẫn
            console.warn(`[findManagerFromCache] ⚠️ Found ${fuzzyMatches.length} fuzzy matches with name "${managerName}" but none matches chi_nhanh "${normalizedEmployeeChiNhanh}". Available: ${fuzzyMatches.map(m => `${m.ho_ten} (${m.chi_nhanh || 'N/A'})`).join(', ')}`);
            return null;
        }

        // Nếu chỉ có 1 kết quả hoặc không có chi_nhanh context, trả về người đầu tiên
        const match = fuzzyMatches[0];
        console.log(`[findManagerFromCache] Fuzzy match found: "${match.ho_ten}"${match.chi_nhanh ? ` (${match.chi_nhanh})` : ''}`);
        return match;
    }

    // Fuzzy match (không dấu)
    const fuzzyMatchesNoAccents = [];
    for (const [normalizedEmpName, employees] of cache.map.entries()) {
        const empNameWithoutAccents = removeVietnameseAccents(normalizedEmpName);
        if (empNameWithoutAccents.includes(normalizedWithoutAccents) || normalizedWithoutAccents.includes(empNameWithoutAccents)) {
            fuzzyMatchesNoAccents.push(...employees);
        }
    }

    if (fuzzyMatchesNoAccents.length > 0) {
        // Nếu có chi_nhanh context VÀ có nhiều kết quả, BẮT BUỘC phải match theo chi_nhanh
        if (normalizedEmployeeChiNhanh && fuzzyMatchesNoAccents.length > 1) {
            const branchMatch = fuzzyMatchesNoAccents.find(emp => chiNhanhMatches(emp.chi_nhanh));
            if (branchMatch) {
                console.log(`[findManagerFromCache] Fuzzy match (no accents, with chi_nhanh) found: "${branchMatch.ho_ten}" (${branchMatch.chi_nhanh || 'N/A'})`);
                return branchMatch;
            }
            // Nếu có nhiều người cùng tên nhưng không match chi_nhanh, không trả về để tránh nhầm lẫn
            console.warn(`[findManagerFromCache] ⚠️ Found ${fuzzyMatchesNoAccents.length} fuzzy matches (no accents) with name "${managerName}" but none matches chi_nhanh "${normalizedEmployeeChiNhanh}". Available: ${fuzzyMatchesNoAccents.map(m => `${m.ho_ten} (${m.chi_nhanh || 'N/A'})`).join(', ')}`);
            return null;
        }

        // Nếu chỉ có 1 kết quả hoặc không có chi_nhanh context, trả về người đầu tiên
        const match = fuzzyMatchesNoAccents[0];
        console.log(`[findManagerFromCache] Fuzzy match (no accents) found: "${match.ho_ten}"${match.chi_nhanh ? ` (${match.chi_nhanh})` : ''}`);
        return match;
    }

    // Word-by-word matching
    const words = normalizedName.split(/\s+/).filter(w => w.length > 1);
    if (words.length > 0) {
        let bestMatch = null;
        let bestScore = 0;
        const wordMatches = [];

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
                wordMatches.push(...employees);
                bestScore = matchCount;
            }
        }

        if (wordMatches.length > 0) {
            // Nếu có chi_nhanh context VÀ có nhiều kết quả, BẮT BUỘC phải match theo chi_nhanh
            if (normalizedEmployeeChiNhanh && wordMatches.length > 1) {
                const branchMatch = wordMatches.find(emp => chiNhanhMatches(emp.chi_nhanh));
                if (branchMatch) {
                    console.log(`[findManagerFromCache] Word-by-word match (with chi_nhanh) found: "${branchMatch.ho_ten}" (${branchMatch.chi_nhanh || 'N/A'})`);
                    return branchMatch;
                }
                // Nếu có nhiều người cùng tên nhưng không match chi_nhanh, không trả về để tránh nhầm lẫn
                console.warn(`[findManagerFromCache] ⚠️ Found ${wordMatches.length} word-by-word matches with name "${managerName}" but none matches chi_nhanh "${normalizedEmployeeChiNhanh}". Available: ${wordMatches.map(m => `${m.ho_ten} (${m.chi_nhanh || 'N/A'})`).join(', ')}`);
                return null;
            }

            // Nếu chỉ có 1 kết quả hoặc không có chi_nhanh context, trả về người đầu tiên
            const match = wordMatches[0];
            console.log(`[findManagerFromCache] Word-by-word match found: "${match.ho_ten}"${match.chi_nhanh ? ` (${match.chi_nhanh})` : ''}`);
            return match;
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

        // Tìm quản lý trực tiếp (truyền chi_nhanh để phân biệt khi có nhiều người cùng tên)
        const teamLead = await findManagerFromCache(employee.quan_ly_truc_tiep, employee.chi_nhanh);

        if (!teamLead) {
            console.error(`[OvertimeRequest] Không tìm thấy quản lý trực tiếp. Nhân viên: ${employee.ho_ten} (chi_nhanh: ${employee.chi_nhanh || 'N/A'}), quan_ly_truc_tiep: "${employee.quan_ly_truc_tiep}"`);
            return res.status(404).json({
                success: false,
                message: `Không tìm thấy quản lý trực tiếp "${employee.quan_ly_truc_tiep}"${employee.chi_nhanh ? ` (chi_nhanh: ${employee.chi_nhanh})` : ''} trong hệ thống. Có thể có nhiều người cùng tên nhưng không khớp chi nhánh. Vui lòng kiểm tra lại thông tin quản lý trực tiếp và chi nhánh của nhân viên "${employee.ho_ten || 'N/A'}" trong module Quản lý nhân viên.`
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

// PUT /api/overtime-requests/:id - Cập nhật đơn tăng ca (bổ sung giờ, chỉ áp dụng cho đơn đã duyệt)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { employeeId, additionalHours, newEndTime, reason } = req.body;

        if (!employeeId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu employeeId'
            });
        }

        if (!additionalHours || parseFloat(additionalHours) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Số giờ bổ sung phải lớn hơn 0'
            });
        }

        // Lấy thông tin đơn hiện tại
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

        // Chỉ cho phép nhân viên sở hữu đơn mới được cập nhật
        if (request.employee_id !== parseInt(employeeId, 10)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền cập nhật đơn này'
            });
        }

        // Chỉ cho phép cập nhật đơn đã được duyệt (APPROVED)
        if (request.status !== STATUSES.APPROVED) {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể bổ sung giờ cho đơn đã được duyệt'
            });
        }

        // Tính toán duration mới (cộng thêm giờ)
        const currentDuration = parseFloat(request.duration) || 0;
        const additionalHoursFloat = parseFloat(additionalHours);
        const newDuration = currentDuration + additionalHoursFloat;

        // Cập nhật đơn: tăng duration, cập nhật end_time nếu có, chuyển về PENDING, reset comments
        const now = new Date();
        const updateFields = [
            `duration = $1`,
            `status = $2`,
            `updated_at = $3`,
            `team_lead_action = NULL`,
            `team_lead_action_at = NULL`,
            `team_lead_comment = NULL`
        ];
        const updateValues = [
            newDuration,
            STATUSES.PENDING,
            now.toISOString()
        ];
        let paramIndex = 4;

        // Nếu có newEndTime, cập nhật end_time
        if (newEndTime) {
            updateFields.push(`end_time = $${paramIndex++}`);
            updateValues.push(newEndTime);
        }

        // Thêm reason vào reason field nếu có (để lưu lý do bổ sung)
        if (reason) {
            const reasonPrefix = request.reason ? `${request.reason}\n\n` : '';
            updateFields.push(`reason = $${paramIndex++}`);
            updateValues.push(`${reasonPrefix}[Bổ sung giờ: +${additionalHoursFloat}h] ${reason}`);
        }

        updateFields.push(`id = $${paramIndex++}`);
        updateValues.push(parseInt(id, 10));

        await pool.query(
            `UPDATE overtime_requests 
             SET ${updateFields.slice(0, -1).join(', ')}
             WHERE id = $${paramIndex - 1}`,
            updateValues.slice(0, -1).concat([parseInt(id, 10)])
        );

        // Lấy đơn đã cập nhật
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
            message: `Đã bổ sung ${additionalHoursFloat} giờ tăng ca. Đơn đã được chuyển về trạng thái chờ duyệt.`,
            data: updatedResult.rows[0]
        });
    } catch (error) {
        console.error('Error updating overtime request:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Không thể cập nhật đơn: ' + error.message
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
