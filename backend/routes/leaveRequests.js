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

// Tìm quản lý trực tiếp từ cache
// employeeChiNhanh: chi nhánh của nhân viên (để phân biệt khi có nhiều người cùng tên)
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
            // QUAN TRỌNG: Chỉ đếm cấp dưới nếu manager có chi_nhanh match với chi_nhanh của employee đang tạo đơn
            // Điều này đảm bảo manager được chọn là manager ĐÚNG (cùng chi_nhanh)
            let bestMatch = null;
            let maxSubordinates = 0;

            for (const match of matches) {
                // QUAN TRỌNG: Chỉ xem xét manager có chi_nhanh match với employee đang tạo đơn
                // Nếu manager không có chi_nhanh match, bỏ qua (vì đó không phải manager đúng)
                if (!chiNhanhMatches(match.chi_nhanh)) {
                    continue; // Bỏ qua manager này
                }

                // Tìm tất cả employees có quan_ly_truc_tiep trùng tên với manager này và có chi_nhanh match với employee đang tạo đơn
                const managerEmployees = cache.all.filter(e => {
                    if (!e.quan_ly_truc_tiep) return false;
                    const empManagerName = (e.quan_ly_truc_tiep || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                    const matchNormalizedName = (match.ho_ten || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                    const nameMatches = empManagerName === matchNormalizedName ||
                        removeVietnameseAccents(empManagerName) === removeVietnameseAccents(matchNormalizedName);
                    // QUAN TRỌNG: chiNhanhMatches(e.chi_nhanh) kiểm tra xem chi_nhanh của cấp dưới (e.chi_nhanh) có match với chi_nhanh của employee đang tạo đơn không
                    return nameMatches && chiNhanhMatches(e.chi_nhanh);
                });

                // Log chi tiết để debug
                if (managerEmployees.length > 0) {
                    const subordinatesChiNhanh = managerEmployees.map(e => e.chi_nhanh || 'N/A');
                    console.log(`[findManagerFromCache] Manager "${match.ho_ten}" (${match.chi_nhanh || 'N/A'}) has ${managerEmployees.length} subordinates. Their chi_nhanh: ${[...new Set(subordinatesChiNhanh)].join(', ')}. Looking for chi_nhanh: "${normalizedEmployeeChiNhanh}"`);
                }

                // Chọn manager có nhiều cấp dưới nhất trong cùng chi_nhanh với employee đang tạo đơn
                if (managerEmployees.length > maxSubordinates) {
                    maxSubordinates = managerEmployees.length;
                    bestMatch = match;
                }
            }

            if (bestMatch && maxSubordinates > 0) {
                console.log(`[findManagerFromCache] Exact match found (multiple matches, selected manager "${bestMatch.ho_ten}" (${bestMatch.chi_nhanh || 'N/A'}) with ${maxSubordinates} subordinates in chi_nhanh "${normalizedEmployeeChiNhanh}")`);
                return bestMatch;
            }

            // Ưu tiên 3: Nếu không có manager nào match chi_nhanh, kiểm tra xem có manager ở "Head Office" 
            // và manager đó có cấp dưới ở chi_nhanh của employee không (cho phép Head Office quản lý các chi nhánh)
            const headOfficeMatch = matches.find(emp => {
                const normalizedChiNhanh = normalizeChiNhanh(emp.chi_nhanh);
                return normalizedChiNhanh === 'head office' || normalizedChiNhanh === 'ho';
            });

            if (headOfficeMatch && normalizedEmployeeChiNhanh) {
                // Kiểm tra xem manager ở Head Office có cấp dưới ở chi_nhanh của employee không
                const headOfficeSubordinates = cache.all.filter(e => {
                    if (!e.quan_ly_truc_tiep) return false;
                    const empManagerName = (e.quan_ly_truc_tiep || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                    const matchNormalizedName = (headOfficeMatch.ho_ten || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                    const nameMatches = empManagerName === matchNormalizedName ||
                        removeVietnameseAccents(empManagerName) === removeVietnameseAccents(matchNormalizedName);
                    return nameMatches && chiNhanhMatches(e.chi_nhanh);
                });

                if (headOfficeSubordinates.length > 0) {
                    console.log(`[findManagerFromCache] Found Head Office manager "${headOfficeMatch.ho_ten}" with ${headOfficeSubordinates.length} subordinates in chi_nhanh "${normalizedEmployeeChiNhanh}". Allowing Head Office to manage this branch.`);
                    return headOfficeMatch;
                }
            }

            // Ưu tiên 4: Nếu employee ở Head Office, cho phép tìm manager từ bất kỳ chi nhánh nào
            // (vì Head Office có thể được quản lý bởi manager từ chi nhánh khác)
            const isEmployeeHeadOffice = normalizedEmployeeChiNhanh === 'head office' || normalizedEmployeeChiNhanh === 'ho';
            if (isEmployeeHeadOffice && matches.length > 0) {
                // Nếu có nhiều manager cùng tên, ưu tiên manager có nhiều cấp dưới nhất
                let bestMatch = null;
                let maxSubordinates = 0;

                for (const match of matches) {
                    // Đếm tất cả cấp dưới của manager này (không cần match chi_nhanh vì employee ở Head Office)
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

            // Nếu vẫn không tìm thấy, trả về null để người dùng biết cần kiểm tra lại
            console.error(`[findManagerFromCache] ❌ ERROR: Found ${matches.length} employees with name "${managerName}" but NONE matches chi_nhanh "${normalizedEmployeeChiNhanh}". Returning NULL to avoid incorrect assignment. Available managers: ${matches.map(m => `${m.ho_ten} (ID: ${m.id}, chi_nhanh: ${m.chi_nhanh || 'N/A'})`).join(', ')}`);
            return null;
        }

        // Nếu chỉ có 1 kết quả, vẫn nên kiểm tra chi_nhanh nếu có context
        // (vì có thể cache chưa đầy đủ hoặc có nhiều người cùng tên nhưng chưa được load)
        if (matches.length === 1) {
            const match = matches[0];

            // Nếu manager là Head Office, cho phép quản lý tất cả chi nhánh
            const normalizedMatchChiNhanh = normalizeChiNhanhValue(match.chi_nhanh);
            if (normalizedMatchChiNhanh === 'head office' || normalizedMatchChiNhanh === 'ho') {
                console.log(`[findManagerFromCache] Single match found: "${match.ho_ten}" (ID: ${match.id}, Head Office) - Allowing Head Office manager to manage employee from "${normalizedEmployeeChiNhanh || 'N/A'}"`);
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
                    // Manager này không có chi_nhanh match, kiểm tra xem có phải Head Office không
                    const normalizedMatchChiNhanh = normalizeChiNhanh(match.chi_nhanh);
                    const isHeadOffice = normalizedMatchChiNhanh === 'head office' || normalizedMatchChiNhanh === 'ho';

                    if (isHeadOffice) {
                        // Kiểm tra xem manager ở Head Office có cấp dưới ở chi_nhanh của employee không
                        const headOfficeSubordinates = cache.all.filter(e => {
                            if (!e.quan_ly_truc_tiep) return false;
                            const empManagerName = (e.quan_ly_truc_tiep || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                            const matchNormalizedName = (match.ho_ten || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                            const nameMatches = empManagerName === matchNormalizedName ||
                                removeVietnameseAccents(empManagerName) === removeVietnameseAccents(matchNormalizedName);
                            return nameMatches && chiNhanhMatches(e.chi_nhanh);
                        });

                        if (headOfficeSubordinates.length > 0) {
                            console.log(`[findManagerFromCache] Found Head Office manager "${match.ho_ten}" (single match) with ${headOfficeSubordinates.length} subordinates in chi_nhanh "${normalizedEmployeeChiNhanh}". Allowing Head Office to manage this branch.`);
                            return match;
                        }
                    }

                    // Manager này không có chi_nhanh match, không phải manager đúng
                    console.log(`[findManagerFromCache] Manager "${match.ho_ten}" (${match.chi_nhanh || 'N/A'}) does not match employee chi_nhanh "${normalizedEmployeeChiNhanh}". Searching for other managers...`);

                    // Nếu manager này không có chi_nhanh match, tìm xem có manager nào khác có chi_nhanh match và có cấp dưới trong cùng chi_nhanh không
                    const allMatchesByName = cache.all.filter(e => {
                        const empNormalizedName = (e.ho_ten || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                        return empNormalizedName === normalizedName;
                    });

                    if (allMatchesByName.length > 1) {
                        // Có nhiều người cùng tên, tìm người có nhiều cấp dưới nhất trong cùng chi_nhanh
                        let bestOtherMatch = null;
                        let maxOtherSubordinates = 0;

                        for (const otherMatch of allMatchesByName) {
                            if (otherMatch.id === match.id) continue; // Bỏ qua match hiện tại

                            // QUAN TRỌNG: Chỉ xem xét manager có chi_nhanh match với employee đang tạo đơn
                            if (!chiNhanhMatches(otherMatch.chi_nhanh)) {
                                continue; // Bỏ qua manager này
                            }

                            const otherManagerEmployees = cache.all.filter(e => {
                                if (!e.quan_ly_truc_tiep) return false;
                                const empManagerName = (e.quan_ly_truc_tiep || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                                const otherMatchNormalizedName = (otherMatch.ho_ten || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
                                const nameMatches = empManagerName === otherMatchNormalizedName ||
                                    removeVietnameseAccents(empManagerName) === removeVietnameseAccents(otherMatchNormalizedName);
                                // QUAN TRỌNG: Kiểm tra chi_nhanh của employee (e.chi_nhanh) match với chi_nhanh của employee đang tạo đơn (normalizedEmployeeChiNhanh)
                                return nameMatches && chiNhanhMatches(e.chi_nhanh);
                            });

                            if (otherManagerEmployees.length > maxOtherSubordinates) {
                                maxOtherSubordinates = otherManagerEmployees.length;
                                bestOtherMatch = otherMatch;
                            }
                        }

                        if (bestOtherMatch && maxOtherSubordinates > 0) {
                            console.log(`[findManagerFromCache] Exact match found (found better match with ${maxOtherSubordinates} subordinates in chi_nhanh "${normalizedEmployeeChiNhanh}"): "${bestOtherMatch.ho_ten}" (${bestOtherMatch.chi_nhanh || 'N/A'}) instead of "${match.ho_ten}" (${match.chi_nhanh || 'N/A'})`);
                            return bestOtherMatch;
                        }
                    }

                    // Nếu employee ở Head Office, cho phép sử dụng manager từ bất kỳ chi nhánh nào
                    const isEmployeeHeadOffice = normalizedEmployeeChiNhanh === 'head office' || normalizedEmployeeChiNhanh === 'ho';
                    if (isEmployeeHeadOffice) {
                        console.log(`[findManagerFromCache] Employee is at Head Office, allowing manager "${match.ho_ten}" (${match.chi_nhanh || 'N/A'}) from different branch.`);
                        return match;
                    }

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

        // Nếu có nhiều kết quả nhưng không có chi_nhanh context, cảnh báo và KHÔNG trả về để tránh nhầm lẫn
        if (matches.length > 1 && !normalizedEmployeeChiNhanh) {
            console.error(`[findManagerFromCache] ❌ ERROR: Found ${matches.length} employees with name "${managerName}" but no chi_nhanh context provided. Cannot safely determine correct manager. Available: ${matches.map(m => `${m.ho_ten} (ID: ${m.id}, ${m.chi_nhanh || 'N/A'})`).join(', ')}. Returning NULL.`);
            return null;
        }

        // Fallback: chỉ trả về người đầu tiên nếu chỉ có 1 kết quả
        const match = matches[0];
        console.log(`[findManagerFromCache] Exact match found (single match, fallback): "${match.ho_ten}" (ID: ${match.id}${match.chi_nhanh ? `, ${match.chi_nhanh}` : ''})`);
        return match;
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
        // Nếu có nhiều người cùng tên, BẮT BUỘC phải match chi_nhanh để tránh nhầm lẫn
        if (matchesNoAccents.length > 1 && normalizedEmployeeChiNhanh) {
            const branchMatch = matchesNoAccents.find(emp => chiNhanhMatches(emp.chi_nhanh));
            if (branchMatch) {
                console.log(`[findManagerFromCache] Exact match (no accents, with chi_nhanh, multiple matches) found: "${branchMatch.ho_ten}" (${branchMatch.chi_nhanh || 'N/A'})`);
                return branchMatch;
            }
            // Nếu có nhiều người cùng tên nhưng không match chi_nhanh, không trả về để tránh nhầm lẫn
            console.warn(`[findManagerFromCache] ⚠️ Found ${matchesNoAccents.length} employees with name "${managerName}" (no accents) but none matches chi_nhanh "${normalizedEmployeeChiNhanh}". Available: ${matchesNoAccents.map(m => `${m.ho_ten} (${m.chi_nhanh || 'N/A'})`).join(', ')}`);
            return null;
        }

        // Nếu chỉ có 1 kết quả hoặc không có chi_nhanh context, trả về người đầu tiên
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
        // Nếu có nhiều người cùng tên, BẮT BUỘC phải match chi_nhanh để tránh nhầm lẫn
        if (fuzzyMatches.length > 1 && normalizedEmployeeChiNhanh) {
            const branchMatch = fuzzyMatches.find(emp => chiNhanhMatches(emp.chi_nhanh));
            if (branchMatch) {
                console.log(`[findManagerFromCache] Fuzzy match (with chi_nhanh, multiple matches) found: "${branchMatch.ho_ten}" (${branchMatch.chi_nhanh || 'N/A'})`);
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
        // Nếu có nhiều người cùng tên, BẮT BUỘC phải match chi_nhanh để tránh nhầm lẫn
        if (fuzzyMatchesNoAccents.length > 1 && normalizedEmployeeChiNhanh) {
            const branchMatch = fuzzyMatchesNoAccents.find(emp => chiNhanhMatches(emp.chi_nhanh));
            if (branchMatch) {
                console.log(`[findManagerFromCache] Fuzzy match (no accents, with chi_nhanh, multiple matches) found: "${branchMatch.ho_ten}" (${branchMatch.chi_nhanh || 'N/A'})`);
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
            // Nếu có nhiều người cùng tên, BẮT BUỘC phải match chi_nhanh để tránh nhầm lẫn
            if (wordMatches.length > 1 && normalizedEmployeeChiNhanh) {
                const branchMatch = wordMatches.find(emp => chiNhanhMatches(emp.chi_nhanh));
                if (branchMatch) {
                    console.log(`[findManagerFromCache] Word-by-word match (with chi_nhanh, multiple matches) found: "${branchMatch.ho_ten}" (${branchMatch.chi_nhanh || 'N/A'})`);
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

// ============================================================
// API ENDPOINTS
// ============================================================

// GET /api/leave-requests - Lấy danh sách đơn (nhân viên xem lịch sử hoặc quản lý xem đơn cần duyệt)
router.get('/', async (req, res) => {
    try {
        const { employeeId, teamLeadId, status } = req.query;

        const conditions = [];
        const params = [];
        let paramIndex = 1;

        // Nhân viên xem lịch sử đơn của mình
        if (employeeId) {
            conditions.push(`lr.employee_id = $${paramIndex}`);
            params.push(parseInt(employeeId, 10));
            paramIndex += 1;
        }

        // Quản lý xem đơn của nhóm mình phụ trách
        if (teamLeadId) {
            conditions.push(`lr.team_lead_id = $${paramIndex}`);
            params.push(parseInt(teamLeadId, 10));
            paramIndex += 1;
        }

        // Filter theo status
        if (status) {
            const statuses = status.split(',').map((s) => {
                const trimmed = s.trim().replace(/\s+/g, '_').toUpperCase();
                return trimmed;
            }).filter(Boolean);

            if (statuses.length > 0) {
                const placeholders = statuses.map((_s, idx) => `$${paramIndex + idx}`);
                conditions.push(`lr.status = ANY (ARRAY[${placeholders.join(', ')}])`);
                params.push(...statuses);
                paramIndex += statuses.length;
            }
        } else if (teamLeadId) {
            // Nếu không có status filter nhưng có teamLeadId, mặc định chỉ hiển thị PENDING
            conditions.push(`lr.status = $${paramIndex}`);
            params.push(STATUSES.PENDING);
            paramIndex += 1;
        }

        const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

        const query = `
            SELECT lr.*,
                   e.ho_ten as employee_name,
                   e.email as employee_email,
                   e.phong_ban as employee_department,
                   team.ho_ten as team_lead_name,
                   team.email as team_lead_email
            FROM leave_requests lr
            LEFT JOIN employees e ON lr.employee_id = e.id
            LEFT JOIN employees team ON lr.team_lead_id = team.id
            WHERE ${whereClause}
            ORDER BY lr.created_at DESC
        `;

        const result = await pool.query(query, params);
        const requests = result.rows;

        if (teamLeadId) {
            console.log(`[LeaveRequest] Query với teamLeadId=${teamLeadId} trả về ${requests.length} đơn. Các team_lead_id trong kết quả: ${requests.map(r => r.team_lead_id).join(', ')}`);
        }

        res.json({
            success: true,
            message: 'Danh sách đơn xin nghỉ phép',
            data: requests
        });
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách đơn xin nghỉ: ' + error.message
        });
    }
});

// POST /api/leave-requests - Nhân viên tạo đơn xin nghỉ phép
router.post('/', async (req, res) => {
    try {
        const {
            employeeId,
            requestType,
            startDate,
            endDate,
            leaveType,
            reason,
            notes,
            hasViolation,
            violationMessage
        } = req.body;

        if (!employeeId || !requestType || !startDate || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
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
            console.error(`[LeaveRequest] Không tìm thấy quản lý trực tiếp. Nhân viên: ${employee.ho_ten} (chi_nhanh: ${employee.chi_nhanh || 'N/A'}), quan_ly_truc_tiep: "${employee.quan_ly_truc_tiep}"`);
            return res.status(404).json({
                success: false,
                message: `Không tìm thấy quản lý trực tiếp "${employee.quan_ly_truc_tiep}"${employee.chi_nhanh ? ` (chi_nhanh: ${employee.chi_nhanh})` : ''} trong hệ thống. Có thể có nhiều người cùng tên nhưng không khớp chi nhánh. Vui lòng kiểm tra lại thông tin quản lý trực tiếp và chi nhánh của nhân viên "${employee.ho_ten || 'N/A'}" trong module Quản lý nhân viên.`
            });
        }

        console.log(`[LeaveRequest] Tạo đơn cho nhân viên "${employee.ho_ten}" (ID: ${employee.id}, chi_nhanh: ${employee.chi_nhanh || 'N/A'}), quản lý trực tiếp: "${teamLead.ho_ten}" (ID: ${teamLead.id}, chi_nhanh: ${teamLead.chi_nhanh || 'N/A'})`);

        // Kiểm tra và thêm cột leave_type nếu chưa có
        try {
            await pool.query(`
                ALTER TABLE leave_requests 
                ADD COLUMN IF NOT EXISTS leave_type VARCHAR(50)
            `);
        } catch (alterError) {
            // Column có thể đã tồn tại, bỏ qua lỗi
            console.log('[LeaveRequest] leave_type column check:', alterError.message);
        }

        // Kiểm tra và thêm cột has_violation và violation_message nếu chưa có
        try {
            await pool.query(`
                ALTER TABLE leave_requests 
                ADD COLUMN IF NOT EXISTS has_violation BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS violation_message TEXT
            `);
        } catch (alterError) {
            // Column có thể đã tồn tại, bỏ qua lỗi
            console.log('[LeaveRequest] violation columns check:', alterError.message);
        }

        // Tạo đơn
        const insertResult = await pool.query(
            `INSERT INTO leave_requests (
                employee_id,
                team_lead_id,
                request_type,
                start_date,
                end_date,
                leave_type,
                reason,
                notes,
                status,
                has_violation,
                violation_message
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`,
            [
                parseInt(employeeId, 10),
                teamLead.id,
                requestType,
                startDate,
                endDate || null,
                leaveType || null,
                reason,
                notes || null,
                STATUSES.PENDING,
                hasViolation || false,
                violationMessage || null
            ]
        );

        const newRequest = insertResult.rows[0];

        res.status(201).json({
            success: true,
            message: 'Đã gửi đơn xin nghỉ phép thành công',
            data: newRequest
        });
    } catch (error) {
        console.error('Error creating leave request:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Không thể tạo đơn xin nghỉ phép: ' + error.message
        });
    }
});

// POST /api/leave-requests/:id/decision - Quản lý duyệt/từ chối đơn
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
            `SELECT * FROM leave_requests WHERE id = $1`,
            [parseInt(id, 10)]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn'
            });
        }

        const request = requestResult.rows[0];

        // Kiểm tra quyền (chỉ quản lý trực tiếp mới được duyệt)
        if (request.team_lead_id !== parseInt(teamLeadId, 10)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xử lý đơn này'
            });
        }

        // Kiểm tra status (chỉ duyệt được đơn đang PENDING)
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
            `UPDATE leave_requests
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
            `SELECT lr.*,
                    e.ho_ten as employee_name,
                    e.email as employee_email,
                    team.ho_ten as team_lead_name,
                    team.email as team_lead_email
             FROM leave_requests lr
             LEFT JOIN employees e ON lr.employee_id = e.id
             LEFT JOIN employees team ON lr.team_lead_id = team.id
             WHERE lr.id = $1`,
            [parseInt(id, 10)]
        );

        res.json({
            success: true,
            message: decision === 'APPROVE' ? 'Đã duyệt đơn thành công' : 'Đã từ chối đơn',
            data: updatedResult.rows[0]
        });
    } catch (error) {
        console.error('Error processing leave request decision:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Không thể xử lý đơn: ' + error.message
        });
    }
});

// DELETE /api/leave-requests/:id - Nhân viên hủy đơn (PENDING) hoặc HR xóa đơn (REJECTED/CANCELLED)
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
            `SELECT * FROM leave_requests WHERE id = $1`,
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
            // Xóa đơn (hard delete)
            await pool.query(
                `DELETE FROM leave_requests WHERE id = $1`,
                [parseInt(id, 10)]
            );

            res.json({
                success: true,
                message: 'Đã xóa đơn thành công'
            });
        } else {
            // Nhân viên chỉ có thể hủy đơn đang chờ duyệt
            // Chỉ nhân viên tạo đơn mới được hủy
            if (request.employee_id !== parseInt(employeeId, 10)) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền hủy đơn này'
                });
            }

            // Chỉ hủy được đơn đang PENDING
            if (request.status !== STATUSES.PENDING) {
                return res.status(400).json({
                    success: false,
                    message: 'Chỉ có thể hủy đơn đang chờ duyệt'
                });
            }

            // Cập nhật status thành CANCELLED
            await pool.query(
                `UPDATE leave_requests SET status = $1 WHERE id = $2`,
                [STATUSES.CANCELLED, parseInt(id, 10)]
            );

            res.json({
                success: true,
                message: 'Đã hủy đơn thành công'
            });
        }
    } catch (error) {
        console.error('Error deleting/cancelling leave request:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể xóa/hủy đơn: ' + error.message
        });
    }
});

module.exports = router;
