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

        // QUAN TRỌNG: Nếu manager là Head Office, cho phép quản lý tất cả chi nhánh
        if (normalized === 'head office' || normalized === 'ho') {
            return true;
        }

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

            // Nếu không có manager nào match chi_nhanh, không trả về để tránh nhầm lẫn
            console.error(`[findManagerFromCache] ❌ ERROR: Found ${matches.length} employees with name "${managerName}" but NONE matches chi_nhanh "${normalizedEmployeeChiNhanh}". Returning NULL to avoid incorrect assignment. Available managers: ${matches.map(m => `${m.ho_ten} (ID: ${m.id}, chi_nhanh: ${m.chi_nhanh || 'N/A'})`).join(', ')}`);
            return null;
        }

        // Nếu chỉ có 1 kết quả, vẫn nên kiểm tra chi_nhanh nếu có context
        // (vì có thể cache chưa đầy đủ hoặc có nhiều người cùng tên nhưng chưa được load)
        if (matches.length === 1) {
            const match = matches[0];
            // Nếu employee ở Head Office, cho phép sử dụng manager từ bất kỳ chi nhánh nào
            const isEmployeeHeadOffice = normalizedEmployeeChiNhanh === 'head office' || normalizedEmployeeChiNhanh === 'ho';
            if (isEmployeeHeadOffice) {
                console.log(`[findManagerFromCache] Employee is at Head Office, allowing manager "${match.ho_ten}" (${match.chi_nhanh || 'N/A'}) from different branch.`);
                return match;
            }

            // Nếu có chi_nhanh context, kiểm tra xem manager có cấp dưới trong cùng chi_nhanh không
            if (normalizedEmployeeChiNhanh) {
                // QUAN TRỌNG: Chỉ xem xét manager có chi_nhanh match với employee đang tạo đơn
                // Nếu manager không có chi_nhanh match, không phải manager đúng
                const managerChiNhanhMatches = chiNhanhMatches(match.chi_nhanh);

                if (managerChiNhanhMatches) {
                    // Nếu manager có chi_nhanh match, trả về ngay (không cần kiểm tra cấp dưới)
                    // Vì có thể manager này mới được thêm vào hoặc chưa có cấp dưới trong database
                    console.log(`[findManagerFromCache] Exact match found (single match, chi_nhanh matches): "${match.ho_ten}" (${match.chi_nhanh || 'N/A'}) matches employee chi_nhanh "${normalizedEmployeeChiNhanh}"`);
                    return match;
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

// GET /api/attendance-adjustments - Lấy danh sách đơn
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
            console.log('[AttendanceRequest GET] Column check:', alterError.message);
        }

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
                   e.ma_nhan_vien,
                   e.email AS employee_email,
                   e.phong_ban AS employee_department,
                   e.chi_nhanh AS employee_branch,
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
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
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
            attendanceItems, // Cấu trúc mới: mảng các item với details
            dateRangeStart, // Khoảng từ ngày (khi NV chọn nhiều ngày - Đi công trình/Làm việc bên ngoài)
            dateRangeEnd
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

        // Quên chấm công: tối đa 3 đơn trong 1 tháng (cùng nhân viên)
        if (item.id === 1) {
            const adjDate = adjustmentDate ? String(adjustmentDate).trim().substring(0, 10) : '';
            if (adjDate && adjDate.length >= 7) {
                const [y, m] = adjDate.split('-').map(Number);
                const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
                const nextMonth = m === 12 ? [y + 1, 1] : [y, m + 1];
                const monthEnd = `${nextMonth[0]}-${String(nextMonth[1]).padStart(2, '0')}-01`;
                const countResult = await pool.query(
                    `SELECT COUNT(*) AS cnt FROM attendance_adjustments
                     WHERE employee_id = $1
                       AND adjustment_date >= $2::date
                       AND adjustment_date < $3::date
                       AND notes LIKE '%ATTENDANCE_TYPE:FORGOT_CHECK%'
                       AND status IN ('PENDING', 'APPROVED')`,
                    [parseInt(employeeId, 10), monthStart, monthEnd]
                );
                const count = parseInt(countResult.rows[0]?.cnt || 0, 10);
                if (count >= 3) {
                    return res.status(400).json({
                        success: false,
                        message: 'Mỗi nhân viên chỉ được gửi tối đa 3 đơn bổ sung "Quên chấm công" trong một tháng. Bạn đã đạt giới hạn trong tháng này.'
                    });
                }
            }
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

        // Cho phép tạo đơn mà không cần quản lý trực tiếp
        // Nếu không có quản lý trực tiếp, team_lead_id sẽ là NULL và đơn sẽ được gửi trực tiếp cho HR
        let teamLead = null;
        let teamLeadId = null;

        if (employee.quan_ly_truc_tiep && employee.quan_ly_truc_tiep.trim() !== '') {
            // Tìm quản lý trực tiếp nếu có (truyền chi_nhanh để phân biệt khi có nhiều người cùng tên)
            teamLead = await findManagerFromCache(employee.quan_ly_truc_tiep, employee.chi_nhanh);

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
        // Khoảng ngày (bổ sung nhiều ngày): hiển thị "Từ ngày ... đến ngày ..." khi quản lý duyệt
        const rangeStart = dateRangeStart && String(dateRangeStart).trim();
        const rangeEnd = dateRangeEnd && String(dateRangeEnd).trim();
        if (rangeStart && rangeEnd) {
            notesWithType = `DATE_RANGE:${rangeStart}_${rangeEnd}\n${notesWithType}`;
        }
        if (notes) {
            notesWithType = `${notesWithType}\n${notes}`;
        }

        // Cho phép team_lead_id NULL khi nhân viên không có quản lý trực tiếp (đơn gửi thẳng HR)
        try {
            await pool.query(`
                ALTER TABLE attendance_adjustments
                ALTER COLUMN team_lead_id DROP NOT NULL
            `);
        } catch (alterErr) {
            // Đã nullable hoặc lỗi khác, bỏ qua
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
                 WHERE table_name = 'attendance_adjustments' AND column_name = 'cancellation_reason'`
            );
            const hasCancellationReason = columnCheck.rows.length > 0;

            // Cập nhật status thành CANCELLED
            if (hasCancellationReason && cancellationReason) {
                await pool.query(
                    `UPDATE attendance_adjustments SET status = $1, cancellation_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
                    [STATUSES.CANCELLED, cancellationReason.trim(), parseInt(id, 10)]
                );
            } else {
                await pool.query(
                    `UPDATE attendance_adjustments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                    [STATUSES.CANCELLED, parseInt(id, 10)]
                );
            }

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
