const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/**
 * GET /api/request-viewer - Lấy tất cả requests từ phòng ban của quản lý gián tiếp
 * Query params:
 *   - indirectManagerId: ID của quản lý gián tiếp (employee_id)
 *   - search: Tìm theo tên người tạo hoặc mã đơn
 *   - fromDate: Ngày bắt đầu (YYYY-MM-DD)
 *   - toDate: Ngày kết thúc (YYYY-MM-DD)
 *   - page: Số trang (default: 1)
 *   - limit: Số lượng mỗi trang (default: 50)
 */
router.get('/', async (req, res) => {
    try {
        const { indirectManagerId, search, fromDate, toDate, page = 1, limit = 50 } = req.query;

        if (!indirectManagerId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin quản lý gián tiếp'
            });
        }

        console.log(`[RequestViewer] Fetching requests for indirect manager ID: ${indirectManagerId}`);

        // Helper function để normalize tên (loại bỏ dấu tiếng Việt)
        const removeVietnameseAccents = (str) => {
            if (!str) return '';
            return str
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/Đ/g, 'D');
        };

        // Normalize tên quản lý để so sánh
        const normalizeName = (name) => {
            if (!name) return '';
            return removeVietnameseAccents(name.trim().toLowerCase().replace(/\s+/g, ' '));
        };

        // Lấy thông tin quản lý gián tiếp
        // Lưu ý: indirectManagerId có thể là ID từ bảng users (HR, Admin, etc.) hoặc employees
        // Nếu không tìm thấy trong employees, có thể user đó là từ bảng users
        let managerResult = await pool.query(
            `SELECT id, ho_ten, email, phong_ban, bo_phan, quan_ly_gian_tiep, trang_thai
             FROM employees 
             WHERE id = $1`,
            [indirectManagerId]
        );

        let manager = null;
        let managerName = null;

        // Nếu không tìm thấy theo ID, thử tìm theo tên từ query params (nếu có)
        // Hoặc thử tìm trong bảng users
        if (managerResult.rows.length === 0) {
            // Thử tìm trong bảng users trước
            const userResult = await pool.query(
                `SELECT id, ho_ten, email, role
                 FROM users 
                 WHERE id = $1`,
                [indirectManagerId]
            );

            if (userResult.rows.length > 0) {
                // User từ bảng users (HR, Admin, etc.) - không có employees được quản lý
                // Trả về empty list vì user này không phải là employee
                console.log(`[RequestViewer] User with ID ${indirectManagerId} is from users table (${userResult.rows[0].role}), not an employee. Returning empty list.`);
                return res.json({
                    success: true,
                    data: [],
                    pagination: {
                        total: 0,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: 0
                    }
                });
            }

            // Nếu không tìm thấy trong users, thử tìm employee theo tên (nếu có trong query params)
            // Hoặc log để debug
            console.log(`[RequestViewer] Employee with ID ${indirectManagerId} not found. Attempting to find by name if provided...`);

            // Nếu có thông tin tên từ query params (optional), thử tìm theo tên
            const { managerName: queryManagerName, managerEmail } = req.query;
            if (queryManagerName) {
                const nameResult = await pool.query(
                    `SELECT id, ho_ten, email, phong_ban, bo_phan, quan_ly_gian_tiep, trang_thai
                     FROM employees 
                     WHERE LOWER(TRIM(ho_ten)) = LOWER(TRIM($1))`,
                    [queryManagerName]
                );
                if (nameResult.rows.length > 0) {
                    managerResult = nameResult;
                    console.log(`[RequestViewer] Found employee by name: "${queryManagerName}" (ID: ${nameResult.rows[0].id})`);
                }
            } else if (managerEmail) {
                const emailResult = await pool.query(
                    `SELECT id, ho_ten, email, phong_ban, bo_phan, quan_ly_gian_tiep, trang_thai
                     FROM employees 
                     WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`,
                    [managerEmail]
                );
                if (emailResult.rows.length > 0) {
                    managerResult = emailResult;
                    console.log(`[RequestViewer] Found employee by email: "${managerEmail}" (ID: ${emailResult.rows[0].id})`);
                }
            }

            // Nếu vẫn không tìm thấy
            if (managerResult.rows.length === 0) {
                console.log(`[RequestViewer] User/Employee with ID ${indirectManagerId} not found in both users and employees tables`);
                return res.status(404).json({
                    success: false,
                    message: `Không tìm thấy nhân viên với ID ${indirectManagerId}. Vui lòng đăng nhập lại.`
                });
            }
        }

        manager = managerResult.rows[0];
        managerName = manager.ho_ten;

        console.log(`[RequestViewer] Manager name: "${managerName}" (ID: ${indirectManagerId})`);

        const normalizedManagerName = normalizeName(managerName);
        console.log(`[RequestViewer] Normalized manager name: "${normalizedManagerName}"`);

        // Lấy TẤT CẢ nhân viên có quan_ly_gian_tiep (KHÔNG filter trang_thai)
        // Sau đó normalize và so sánh trong JavaScript để đảm bảo match chính xác với các biến thể tên
        const allEmployeesResult = await pool.query(
            `SELECT id, ho_ten, email, ma_nhan_vien, phong_ban, bo_phan, chi_nhanh, quan_ly_gian_tiep, trang_thai
             FROM employees 
             WHERE quan_ly_gian_tiep IS NOT NULL 
               AND TRIM(quan_ly_gian_tiep) != ''
               AND TRIM(quan_ly_gian_tiep) != 'Chưa cập nhật'`
        );

        console.log(`[RequestViewer] Total employees with quan_ly_gian_tiep: ${allEmployeesResult.rows.length}`);

        // Debug: Hiển thị tất cả giá trị quan_ly_gian_tiep unique để debug
        const uniqueIndirectManagers = [...new Set(allEmployeesResult.rows.map(e => e.quan_ly_gian_tiep))];
        console.log(`[RequestViewer] All unique quan_ly_gian_tiep values (first 20):`, uniqueIndirectManagers.slice(0, 20));

        // Filter trong JavaScript với fuzzy matching
        // Lưu ý: normalizeName đã loại bỏ dấu tiếng Việt, nên sẽ match được các biến thể
        const matchingEmployees = allEmployeesResult.rows.filter(emp => {
            const normalizedIndirectManager = normalizeName(emp.quan_ly_gian_tiep);

            // Exact match (sau khi normalize - đã loại bỏ dấu)
            if (normalizedIndirectManager === normalizedManagerName) {
                console.log(`[RequestViewer] ✅ Exact match: "${emp.quan_ly_gian_tiep}" (normalized: "${normalizedIndirectManager}") -> "${emp.ho_ten}"`);
                return true;
            }

            // Contains match (fuzzy) - một tên chứa tên kia
            if (normalizedIndirectManager.includes(normalizedManagerName) ||
                normalizedManagerName.includes(normalizedIndirectManager)) {
                console.log(`[RequestViewer] ✅ Contains match: "${emp.quan_ly_gian_tiep}" (normalized: "${normalizedIndirectManager}") -> "${emp.ho_ten}"`);
                return true;
            }

            // Word-by-word match (cho trường hợp thứ tự từ khác nhau hoặc có từ thừa)
            const managerWords = normalizedManagerName.split(/\s+/).filter(w => w.length > 1);
            const indirectWords = normalizedIndirectManager.split(/\s+/).filter(w => w.length > 1);

            if (managerWords.length > 0 && indirectWords.length > 0) {
                // Nếu tất cả từ trong manager name đều có trong indirect manager name
                const allWordsMatch = managerWords.every(mw =>
                    indirectWords.some(iw => iw.includes(mw) || mw.includes(iw))
                );
                if (allWordsMatch) {
                    console.log(`[RequestViewer] ✅ Word-by-word match: "${emp.quan_ly_gian_tiep}" (normalized: "${normalizedIndirectManager}") -> "${emp.ho_ten}"`);
                    return true;
                }
            }

            return false;
        });

        console.log(`[RequestViewer] Found ${matchingEmployees.length} employees with quan_ly_gian_tiep matching "${managerName}"`);
        if (matchingEmployees.length > 0) {
            console.log(`[RequestViewer] Matching employees:`, matchingEmployees.map(e =>
                `${e.ho_ten} (quan_ly_gian_tiep: "${e.quan_ly_gian_tiep}")`
            ));
        } else {
            // Debug: Hiển thị một số ví dụ quan_ly_gian_tiep để debug
            const sampleIndirectManagers = allEmployeesResult.rows
                .slice(0, 10)
                .map(e => `"${e.quan_ly_gian_tiep}"`)
                .join(', ');
            console.log(`[RequestViewer] Sample quan_ly_gian_tiep values in DB: ${sampleIndirectManagers}`);
        }

        let employeesResult = { rows: matchingEmployees };

        // Nếu không tìm thấy qua quan_ly_gian_tiep, thử fallback: tìm nhân viên có quan_ly_truc_tiep = tên quản lý này
        // (vì quản lý gián tiếp có thể là quản lý của quản lý trực tiếp)
        if (matchingEmployees.length === 0) {
            console.log(`[RequestViewer] ⚠️ No employees found with quan_ly_gian_tiep matching "${managerName}". Trying fallback...`);

            const fallbackEmployeesResult = await pool.query(
                `SELECT id, ho_ten, email, ma_nhan_vien, phong_ban, bo_phan, chi_nhanh, quan_ly_truc_tiep, trang_thai
                 FROM employees 
                 WHERE quan_ly_truc_tiep IS NOT NULL 
                   AND TRIM(quan_ly_truc_tiep) != ''
                   AND TRIM(quan_ly_truc_tiep) != 'Chưa cập nhật'`
            );

            console.log(`[RequestViewer] Total employees with quan_ly_truc_tiep: ${fallbackEmployeesResult.rows.length}`);

            // Filter employees có quan_ly_truc_tiep match với manager name
            const fallbackMatchingEmployees = fallbackEmployeesResult.rows.filter(emp => {
                const normalizedDirectManager = normalizeName(emp.quan_ly_truc_tiep);

                // Exact match
                if (normalizedDirectManager === normalizedManagerName) {
                    console.log(`[RequestViewer] ✅ Fallback match (quan_ly_truc_tiep): "${emp.quan_ly_truc_tiep}" -> "${emp.ho_ten}"`);
                    return true;
                }

                // Contains match
                if (normalizedDirectManager.includes(normalizedManagerName) ||
                    normalizedManagerName.includes(normalizedDirectManager)) {
                    console.log(`[RequestViewer] ✅ Fallback match (quan_ly_truc_tiep contains): "${emp.quan_ly_truc_tiep}" -> "${emp.ho_ten}"`);
                    return true;
                }

                return false;
            });

            if (fallbackMatchingEmployees.length > 0) {
                console.log(`[RequestViewer] Found ${fallbackMatchingEmployees.length} employees via fallback (quan_ly_truc_tiep)`);
                employeesResult = { rows: fallbackMatchingEmployees };
            } else {
                console.log(`[RequestViewer] ❌ No employees found. Returning empty list.`);
                return res.json({
                    success: true,
                    data: [],
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: 0,
                        totalPages: 0
                    }
                });
            }
        }

        const employeeIds = employeesResult.rows.map(emp => emp.id);
        const employeeMap = {};
        employeesResult.rows.forEach(emp => {
            employeeMap[emp.id] = emp;
        });

        if (employeeIds.length === 0) {
            return res.json({
                success: true,
                data: [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: 0,
                    totalPages: 0
                }
            });
        }

        // Kiểm tra các bảng có cột code không
        const tablesToCheck = [
            'leave_requests',
            'overtime_requests',
            'attendance_adjustments',
            'travel_expense_requests',
            'customer_entertainment_expense_requests',
            'meal_allowance_requests',
            'late_early_requests'
        ];

        const codeColumnCheck = await pool.query(
            `SELECT table_name, column_name
             FROM information_schema.columns
             WHERE table_name = ANY($1::text[])
               AND column_name = 'code'`,
            [tablesToCheck]
        );

        const tablesWithCode = new Set(codeColumnCheck.rows.map(r => r.table_name));
        console.log(`[RequestViewer] Tables with 'code' column:`, Array.from(tablesWithCode));

        // Kiểm tra các bảng có cột date không
        const dateColumnCheck = await pool.query(
            `SELECT table_name, column_name
             FROM information_schema.columns
             WHERE table_name = ANY($1::text[])
               AND column_name IN ('date', 'start_date', 'end_date')`,
            [tablesToCheck]
        );

        const tableDateColumns = {};
        dateColumnCheck.rows.forEach(r => {
            if (!tableDateColumns[r.table_name]) {
                tableDateColumns[r.table_name] = [];
            }
            tableDateColumns[r.table_name].push(r.column_name);
        });

        console.log(`[RequestViewer] Tables date columns:`, tableDateColumns);

        // Kiểm tra các cột approval có sẵn trong từng bảng
        const approvalColumnsCheck = await pool.query(
            `SELECT table_name, column_name
             FROM information_schema.columns
             WHERE table_name = ANY($1::text[])
               AND column_name IN ('manager_decision', 'branch_director_decision', 'ceo_decision', 'finance_decision',
                                   'manager_decision_at', 'branch_director_decision_at', 'ceo_decision_at', 'finance_decision_at',
                                   'manager_decision_by', 'branch_director_decision_by', 'ceo_decision_by', 'finance_decision_by')`,
            [tablesToCheck]
        );

        const tableApprovalColumns = {};
        approvalColumnsCheck.rows.forEach(r => {
            if (!tableApprovalColumns[r.table_name]) {
                tableApprovalColumns[r.table_name] = [];
            }
            tableApprovalColumns[r.table_name].push(r.column_name);
        });

        console.log(`[RequestViewer] Tables approval columns:`, tableApprovalColumns);

        // Kiểm tra các cột reason/purpose/notes có sẵn trong từng bảng
        const reasonColumnCheck = await pool.query(
            `SELECT table_name, column_name
             FROM information_schema.columns
             WHERE table_name = ANY($1::text[])
               AND column_name IN ('reason', 'purpose', 'notes', 'description')`,
            [tablesToCheck]
        );

        const tableReasonColumns = {};
        reasonColumnCheck.rows.forEach(r => {
            if (!tableReasonColumns[r.table_name]) {
                tableReasonColumns[r.table_name] = [];
            }
            tableReasonColumns[r.table_name].push(r.column_name);
        });

        console.log(`[RequestViewer] Tables reason columns:`, tableReasonColumns);

        // Helper function để lấy reason expression cho từng bảng
        const getReasonExpression = (tableName) => {
            const columns = tableReasonColumns[tableName] || [];
            // Ưu tiên: purpose > reason > notes > description > NULL
            if (columns.includes('purpose')) return 'purpose';
            if (columns.includes('reason')) return 'reason';
            if (columns.includes('notes')) return 'notes';
            if (columns.includes('description')) return 'description';
            return 'NULL::text'; // Fallback
        };

        // Helper function để lấy date expression cho từng bảng
        const getDateExpression = (tableName, type) => {
            const columns = tableDateColumns[tableName] || [];
            if (type === 'from') {
                if (columns.includes('start_date')) return 'start_date';
                if (columns.includes('date')) return 'date';
                return 'created_at::date'; // Fallback
            } else { // 'to'
                if (columns.includes('end_date')) return 'end_date';
                if (columns.includes('date')) return 'date';
                return 'created_at::date'; // Fallback
            }
        };

        // Helper function để lấy approval column expression với fallback
        // Trả về tên cột nếu tồn tại, hoặc 'NULL' nếu không tồn tại
        const getApprovalColumn = (tableName, columnName) => {
            const columns = tableApprovalColumns[tableName] || [];
            if (columns.includes(columnName)) {
                return columnName;
            }
            return 'NULL'; // Return 'NULL' as string - will be used in SQL template
        };

        // Helper function để build approval column expression với type casting
        const getApprovalColumnExpr = (tableName, columnName, castType) => {
            const col = getApprovalColumn(tableName, columnName);
            if (col === 'NULL') {
                return `NULL::${castType}`;
            }
            return `${col}::${castType}`;
        };

        // Tạo UNION query để lấy tất cả các loại requests
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const params = [];
        let paramIndex = 1;

        // Base condition cho employee IDs
        const employeeIdsPlaceholder = `$${paramIndex}`;
        params.push(employeeIds);
        paramIndex++;

        // Date filter
        let dateFilter = '';
        if (fromDate) {
            dateFilter += ` AND created_at >= $${paramIndex}`;
            params.push(fromDate);
            paramIndex++;
        }
        if (toDate) {
            dateFilter += ` AND created_at <= $${paramIndex}::date + INTERVAL '1 day'`;
            params.push(toDate);
            paramIndex++;
        }

        // Helper function để tạo code expression cho SQL
        const getCodeExpression = (tableName, prefix) => {
            if (tablesWithCode.has(tableName)) {
                return `COALESCE(code, '${prefix}-' || id::text)`;
            }
            return `'${prefix}-' || id::text`;
        };

        // Build code expressions cho từng bảng
        const leaveCodeExpr = getCodeExpression('leave_requests', 'LV');
        const overtimeCodeExpr = getCodeExpression('overtime_requests', 'OT');
        const attendanceCodeExpr = getCodeExpression('attendance_adjustments', 'ATT');
        const travelCodeExpr = getCodeExpression('travel_expense_requests', 'CTX');
        const customerEntertainmentCodeExpr = getCodeExpression('customer_entertainment_expense_requests', 'TKH');
        const mealAllowanceCodeExpr = getCodeExpression('meal_allowance_requests', 'MA');
        const lateEarlyCodeExpr = getCodeExpression('late_early_requests', 'LE');

        // Search filter - sẽ áp dụng sau khi JOIN với employees
        let searchFilter = '';
        if (search) {
            searchFilter = ` AND (
                LOWER(e.ho_ten) LIKE LOWER($${paramIndex})
                OR LOWER(ar.code) LIKE LOWER($${paramIndex})
                OR LOWER(e.ma_nhan_vien) LIKE LOWER($${paramIndex})
            )`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Query để lấy tất cả requests
        const query = `
            WITH all_requests AS (
                -- Leave Requests
                SELECT 
                    id,
                    'leave' as request_type,
                    employee_id,
                    ${leaveCodeExpr} as code,
                    start_date as from_date,
                    end_date as to_date,
                    leave_type,
                    status,
                    ${getReasonExpression('leave_requests')} as reason,
                    created_at,
                    updated_at,
                    ${getApprovalColumnExpr('leave_requests', 'manager_decision', 'text')} as manager_decision,
                    ${getApprovalColumnExpr('leave_requests', 'manager_decision_at', 'timestamp')} as manager_decision_at,
                    ${getApprovalColumnExpr('leave_requests', 'manager_decision_by', 'integer')} as manager_decision_by,
                    ${getApprovalColumnExpr('leave_requests', 'branch_director_decision', 'text')} as branch_director_decision,
                    ${getApprovalColumnExpr('leave_requests', 'branch_director_decision_at', 'timestamp')} as branch_director_decision_at,
                    ${getApprovalColumnExpr('leave_requests', 'branch_director_decision_by', 'integer')} as branch_director_decision_by,
                    NULL::text as approval_level,
                    NULL::text as last_approver_name,
                    NULL::timestamp as last_approval_date
                FROM leave_requests
                WHERE employee_id = ANY(${employeeIdsPlaceholder}::int[])
                ${dateFilter}

                UNION ALL

                -- Overtime Requests
                SELECT 
                    id,
                    'overtime' as request_type,
                    employee_id,
                    ${overtimeCodeExpr} as code,
                    ${getDateExpression('overtime_requests', 'from')} as from_date,
                    ${getDateExpression('overtime_requests', 'to')} as to_date,
                    NULL::text as leave_type,
                    status,
                    ${getReasonExpression('overtime_requests')} as reason,
                    created_at,
                    updated_at,
                    ${getApprovalColumnExpr('overtime_requests', 'manager_decision', 'text')} as manager_decision,
                    ${getApprovalColumnExpr('overtime_requests', 'manager_decision_at', 'timestamp')} as manager_decision_at,
                    ${getApprovalColumnExpr('overtime_requests', 'manager_decision_by', 'integer')} as manager_decision_by,
                    ${getApprovalColumnExpr('overtime_requests', 'branch_director_decision', 'text')} as branch_director_decision,
                    ${getApprovalColumnExpr('overtime_requests', 'branch_director_decision_at', 'timestamp')} as branch_director_decision_at,
                    ${getApprovalColumnExpr('overtime_requests', 'branch_director_decision_by', 'integer')} as branch_director_decision_by,
                    NULL::text as approval_level,
                    NULL::text as last_approver_name,
                    NULL::timestamp as last_approval_date
                FROM overtime_requests
                WHERE employee_id = ANY(${employeeIdsPlaceholder}::int[])
                ${dateFilter}

                UNION ALL

                -- Attendance Requests
                SELECT 
                    id,
                    'attendance' as request_type,
                    employee_id,
                    ${attendanceCodeExpr} as code,
                    ${getDateExpression('attendance_adjustments', 'from')} as from_date,
                    ${getDateExpression('attendance_adjustments', 'to')} as to_date,
                    NULL::text as leave_type,
                    status,
                    ${getReasonExpression('attendance_adjustments')} as reason,
                    created_at,
                    updated_at,
                    ${getApprovalColumnExpr('attendance_adjustments', 'manager_decision', 'text')} as manager_decision,
                    ${getApprovalColumnExpr('attendance_adjustments', 'manager_decision_at', 'timestamp')} as manager_decision_at,
                    ${getApprovalColumnExpr('attendance_adjustments', 'manager_decision_by', 'integer')} as manager_decision_by,
                    ${getApprovalColumnExpr('attendance_adjustments', 'branch_director_decision', 'text')} as branch_director_decision,
                    ${getApprovalColumnExpr('attendance_adjustments', 'branch_director_decision_at', 'timestamp')} as branch_director_decision_at,
                    ${getApprovalColumnExpr('attendance_adjustments', 'branch_director_decision_by', 'integer')} as branch_director_decision_by,
                    NULL::text as approval_level,
                    NULL::text as last_approver_name,
                    NULL::timestamp as last_approval_date
                FROM attendance_adjustments
                WHERE employee_id = ANY(${employeeIdsPlaceholder}::int[])
                ${dateFilter}

                UNION ALL

                -- Travel Expenses
                SELECT 
                    id,
                    'travel' as request_type,
                    employee_id,
                    ${travelCodeExpr} as code,
                    ${getDateExpression('travel_expense_requests', 'from')} as from_date,
                    ${getDateExpression('travel_expense_requests', 'to')} as to_date,
                    location_type as leave_type,
                    status,
                    ${getReasonExpression('travel_expense_requests')} as reason,
                    created_at,
                    updated_at,
                    ${getApprovalColumnExpr('travel_expense_requests', 'manager_decision', 'text')} as manager_decision,
                    ${getApprovalColumnExpr('travel_expense_requests', 'manager_decision_at', 'timestamp')} as manager_decision_at,
                    ${getApprovalColumnExpr('travel_expense_requests', 'manager_decision_by', 'integer')} as manager_decision_by,
                    ${getApprovalColumnExpr('travel_expense_requests', 'branch_director_decision', 'text')} as branch_director_decision,
                    ${getApprovalColumnExpr('travel_expense_requests', 'branch_director_decision_at', 'timestamp')} as branch_director_decision_at,
                    ${getApprovalColumnExpr('travel_expense_requests', 'branch_director_decision_by', 'integer')} as branch_director_decision_by,
                    CASE 
                        WHEN status = 'PENDING_LEVEL_1' THEN 'Quản lý trực tiếp'
                        WHEN status = 'PENDING_LEVEL_2' THEN 'Giám đốc chi nhánh'
                        WHEN status = 'PENDING_CEO' THEN 'Tổng giám đốc'
                        WHEN status = 'PENDING_FINANCE' THEN 'Phòng tài chính'
                        WHEN status = 'APPROVED' THEN 'Hoàn tất'
                        ELSE status
                    END as approval_level,
                    COALESCE(
                        CASE WHEN '${getApprovalColumn('travel_expense_requests', 'branch_director_decision_by')}' != 'NULL'
                            THEN (SELECT ho_ten FROM employees WHERE id = ${getApprovalColumn('travel_expense_requests', 'branch_director_decision_by')} LIMIT 1)
                            ELSE NULL END,
                        CASE WHEN '${getApprovalColumn('travel_expense_requests', 'manager_decision_by')}' != 'NULL'
                            THEN (SELECT ho_ten FROM employees WHERE id = ${getApprovalColumn('travel_expense_requests', 'manager_decision_by')} LIMIT 1)
                            ELSE NULL END,
                        NULL
                    ) as last_approver_name,
                    COALESCE(
                        ${getApprovalColumnExpr('travel_expense_requests', 'branch_director_decision_at', 'timestamp')},
                        ${getApprovalColumnExpr('travel_expense_requests', 'manager_decision_at', 'timestamp')}
                    ) as last_approval_date
                FROM travel_expense_requests
                WHERE employee_id = ANY(${employeeIdsPlaceholder}::int[])
                ${dateFilter}

                UNION ALL

                -- Customer Entertainment Expenses
                SELECT 
                    id,
                    'customer-entertainment' as request_type,
                    employee_id,
                    ${customerEntertainmentCodeExpr} as code,
                    ${getDateExpression('customer_entertainment_expense_requests', 'from')} as from_date,
                    ${getDateExpression('customer_entertainment_expense_requests', 'to')} as to_date,
                    NULL::text as leave_type,
                    status,
                    ${getReasonExpression('customer_entertainment_expense_requests')} as reason,
                    created_at,
                    updated_at,
                    ${getApprovalColumnExpr('customer_entertainment_expense_requests', 'manager_decision', 'text')} as manager_decision,
                    ${getApprovalColumnExpr('customer_entertainment_expense_requests', 'manager_decision_at', 'timestamp')} as manager_decision_at,
                    ${getApprovalColumnExpr('customer_entertainment_expense_requests', 'manager_decision_by', 'integer')} as manager_decision_by,
                    ${getApprovalColumnExpr('customer_entertainment_expense_requests', 'branch_director_decision', 'text')} as branch_director_decision,
                    ${getApprovalColumnExpr('customer_entertainment_expense_requests', 'branch_director_decision_at', 'timestamp')} as branch_director_decision_at,
                    ${getApprovalColumnExpr('customer_entertainment_expense_requests', 'branch_director_decision_by', 'integer')} as branch_director_decision_by,
                    CASE 
                        WHEN status = 'PENDING_LEVEL_1' THEN 'Quản lý trực tiếp'
                        WHEN status = 'PENDING_LEVEL_2' THEN 'Giám đốc chi nhánh'
                        WHEN status = 'PENDING_CEO' THEN 'Tổng giám đốc'
                        WHEN status = 'PENDING_FINANCE' THEN 'Phòng tài chính'
                        WHEN status = 'APPROVED' THEN 'Hoàn tất'
                        ELSE status
                    END as approval_level,
                    COALESCE(
                        CASE WHEN '${getApprovalColumn('customer_entertainment_expense_requests', 'branch_director_decision_by')}' != 'NULL'
                            THEN (SELECT ho_ten FROM employees WHERE id = ${getApprovalColumn('customer_entertainment_expense_requests', 'branch_director_decision_by')} LIMIT 1)
                            ELSE NULL END,
                        CASE WHEN '${getApprovalColumn('customer_entertainment_expense_requests', 'manager_decision_by')}' != 'NULL'
                            THEN (SELECT ho_ten FROM employees WHERE id = ${getApprovalColumn('customer_entertainment_expense_requests', 'manager_decision_by')} LIMIT 1)
                            ELSE NULL END,
                        NULL
                    ) as last_approver_name,
                    COALESCE(
                        ${getApprovalColumnExpr('customer_entertainment_expense_requests', 'branch_director_decision_at', 'timestamp')},
                        ${getApprovalColumnExpr('customer_entertainment_expense_requests', 'manager_decision_at', 'timestamp')}
                    ) as last_approval_date
                FROM customer_entertainment_expense_requests
                WHERE employee_id = ANY(${employeeIdsPlaceholder}::int[])
                ${dateFilter}

                UNION ALL

                -- Meal Allowance Requests
                SELECT 
                    id,
                    'meal-allowance' as request_type,
                    employee_id,
                    ${mealAllowanceCodeExpr} as code,
                    ${getDateExpression('meal_allowance_requests', 'from')} as from_date,
                    ${getDateExpression('meal_allowance_requests', 'to')} as to_date,
                    NULL::text as leave_type,
                    status,
                    ${getReasonExpression('meal_allowance_requests')} as reason,
                    created_at,
                    updated_at,
                    ${getApprovalColumnExpr('meal_allowance_requests', 'manager_decision', 'text')} as manager_decision,
                    ${getApprovalColumnExpr('meal_allowance_requests', 'manager_decision_at', 'timestamp')} as manager_decision_at,
                    ${getApprovalColumnExpr('meal_allowance_requests', 'manager_decision_by', 'integer')} as manager_decision_by,
                    ${getApprovalColumnExpr('meal_allowance_requests', 'branch_director_decision', 'text')} as branch_director_decision,
                    ${getApprovalColumnExpr('meal_allowance_requests', 'branch_director_decision_at', 'timestamp')} as branch_director_decision_at,
                    ${getApprovalColumnExpr('meal_allowance_requests', 'branch_director_decision_by', 'integer')} as branch_director_decision_by,
                    NULL::text as approval_level,
                    NULL::text as last_approver_name,
                    NULL::timestamp as last_approval_date
                FROM meal_allowance_requests
                WHERE employee_id = ANY(${employeeIdsPlaceholder}::int[])
                ${dateFilter}

                UNION ALL

                -- Late Early Requests
                SELECT 
                    id,
                    'late-early' as request_type,
                    employee_id,
                    ${lateEarlyCodeExpr} as code,
                    ${getDateExpression('late_early_requests', 'from')} as from_date,
                    ${getDateExpression('late_early_requests', 'to')} as to_date,
                    request_type as leave_type,
                    status,
                    ${getReasonExpression('late_early_requests')} as reason,
                    created_at,
                    updated_at,
                    ${getApprovalColumnExpr('late_early_requests', 'manager_decision', 'text')} as manager_decision,
                    ${getApprovalColumnExpr('late_early_requests', 'manager_decision_at', 'timestamp')} as manager_decision_at,
                    ${getApprovalColumnExpr('late_early_requests', 'manager_decision_by', 'integer')} as manager_decision_by,
                    ${getApprovalColumnExpr('late_early_requests', 'branch_director_decision', 'text')} as branch_director_decision,
                    ${getApprovalColumnExpr('late_early_requests', 'branch_director_decision_at', 'timestamp')} as branch_director_decision_at,
                    ${getApprovalColumnExpr('late_early_requests', 'branch_director_decision_by', 'integer')} as branch_director_decision_by,
                    NULL::text as approval_level,
                    NULL::text as last_approver_name,
                    NULL::timestamp as last_approval_date
                FROM late_early_requests
                WHERE employee_id = ANY(${employeeIdsPlaceholder}::int[])
                ${dateFilter}
            )
            SELECT 
                ar.*,
                e.ho_ten,
                e.email,
                e.ma_nhan_vien,
                e.phong_ban,
                e.bo_phan,
                e.chi_nhanh
            FROM all_requests ar
            INNER JOIN employees e ON ar.employee_id = e.id
            WHERE 1=1
            ${searchFilter}
            ORDER BY ar.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        params.push(parseInt(limit));
        params.push(offset);

        // Count query - build với cùng logic như main query
        let countDateFilter = '';
        let countParamIndex = 1;
        const countParams = [employeeIds];

        if (fromDate) {
            countDateFilter += ` AND created_at >= $${countParamIndex + 1}`;
            countParams.push(fromDate);
            countParamIndex++;
        }
        if (toDate) {
            countDateFilter += ` AND created_at <= $${countParamIndex + 1}::date + INTERVAL '1 day'`;
            countParams.push(toDate);
            countParamIndex++;
        }

        let countSearchFilter = '';
        if (search) {
            countSearchFilter = ` AND (
                LOWER(e.ho_ten) LIKE LOWER($${countParamIndex + 1})
                OR LOWER(ar.code) LIKE LOWER($${countParamIndex + 1})
                OR LOWER(e.ma_nhan_vien) LIKE LOWER($${countParamIndex + 1})
            )`;
            countParams.push(`%${search}%`);
        }

        const countQuery = `
            WITH all_requests AS (
                SELECT id, employee_id, 'leave' as request_type, ${leaveCodeExpr} as code, start_date as from_date, created_at
                FROM leave_requests WHERE employee_id = ANY($1::int[]) ${countDateFilter}
                UNION ALL
                SELECT id, employee_id, 'overtime' as request_type, ${overtimeCodeExpr} as code, ${getDateExpression('overtime_requests', 'from')} as from_date, created_at
                FROM overtime_requests WHERE employee_id = ANY($1::int[]) ${countDateFilter}
                UNION ALL
                SELECT id, employee_id, 'attendance' as request_type, ${attendanceCodeExpr} as code, ${getDateExpression('attendance_adjustments', 'from')} as from_date, created_at
                FROM attendance_adjustments WHERE employee_id = ANY($1::int[]) ${countDateFilter}
                UNION ALL
                SELECT id, employee_id, 'travel' as request_type, ${travelCodeExpr} as code, ${getDateExpression('travel_expense_requests', 'from')} as from_date, created_at
                FROM travel_expense_requests WHERE employee_id = ANY($1::int[]) ${countDateFilter}
                UNION ALL
                SELECT id, employee_id, 'customer-entertainment' as request_type, ${customerEntertainmentCodeExpr} as code, ${getDateExpression('customer_entertainment_expense_requests', 'from')} as from_date, created_at
                FROM customer_entertainment_expense_requests WHERE employee_id = ANY($1::int[]) ${countDateFilter}
                UNION ALL
                SELECT id, employee_id, 'meal-allowance' as request_type, ${mealAllowanceCodeExpr} as code, ${getDateExpression('meal_allowance_requests', 'from')} as from_date, created_at
                FROM meal_allowance_requests WHERE employee_id = ANY($1::int[]) ${countDateFilter}
                UNION ALL
                SELECT id, employee_id, 'late-early' as request_type, ${lateEarlyCodeExpr} as code, ${getDateExpression('late_early_requests', 'from')} as from_date, created_at
                FROM late_early_requests WHERE employee_id = ANY($1::int[]) ${countDateFilter}
            )
            SELECT COUNT(*) as total
            FROM all_requests ar
            INNER JOIN employees e ON ar.employee_id = e.id
            WHERE 1=1
            ${countSearchFilter}
        `;

        const [result, countResult] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, countParams)
        ]);

        const total = parseInt(countResult.rows[0]?.total || 0);
        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Error fetching requests for indirect manager:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách đơn: ' + error.message
        });
    }
});

module.exports = router;

