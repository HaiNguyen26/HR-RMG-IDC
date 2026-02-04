const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/customer-entertainment-expenses');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 20 // Maximum 20 files
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'application/zip',
            'application/x-zip-compressed'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận các định dạng: PDF, JPG, PNG, ZIP'));
        }
    }
});

// Ensure table exists
const ensureTable = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS customer_entertainment_expense_requests (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            request_number VARCHAR(50) UNIQUE,
            branch_director_id INTEGER REFERENCES employees(id),
            branch_director_name VARCHAR(255),
            manager_id INTEGER REFERENCES employees(id),
            manager_name VARCHAR(255),
            branch VARCHAR(100),
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            advance_amount NUMERIC(12, 2) DEFAULT 0,
            total_amount NUMERIC(12, 2) DEFAULT 0,
            status VARCHAR(40) NOT NULL DEFAULT 'PENDING_BRANCH_DIRECTOR',
            current_step VARCHAR(40) NOT NULL DEFAULT 'STEP_1',
            branch_director_decision VARCHAR(20),
            branch_director_notes TEXT,
            branch_director_decision_at TIMESTAMP WITHOUT TIME ZONE,
            manager_decision VARCHAR(20),
            manager_notes TEXT,
            manager_decision_at TIMESTAMP WITHOUT TIME ZONE,
            accountant_id INTEGER REFERENCES employees(id),
            accountant_notes TEXT,
            accountant_processed_at TIMESTAMP WITHOUT TIME ZONE,
            ceo_id INTEGER REFERENCES employees(id),
            ceo_decision VARCHAR(20),
            ceo_notes TEXT,
            ceo_decision_at TIMESTAMP WITHOUT TIME ZONE,
            payment_processed_by INTEGER REFERENCES employees(id),
            payment_processed_at TIMESTAMP WITHOUT TIME ZONE,
            payment_method VARCHAR(50),
            payment_notes TEXT,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const createExpenseItemsTable = `
        CREATE TABLE IF NOT EXISTS customer_entertainment_expense_items (
            id SERIAL PRIMARY KEY,
            request_id INTEGER NOT NULL REFERENCES customer_entertainment_expense_requests(id) ON DELETE CASCADE,
            invoice_number VARCHAR(100),
            amount NUMERIC(12, 2) NOT NULL,
            company_name VARCHAR(255),
            content TEXT,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const createExpenseFilesTable = `
        CREATE TABLE IF NOT EXISTS customer_entertainment_expense_files (
            id SERIAL PRIMARY KEY,
            item_id INTEGER NOT NULL REFERENCES customer_entertainment_expense_items(id) ON DELETE CASCADE,
            file_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            file_size INTEGER,
            file_type VARCHAR(50),
            uploaded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const createIndexes = `
        CREATE INDEX IF NOT EXISTS idx_customer_expense_employee ON customer_entertainment_expense_requests(employee_id);
        CREATE INDEX IF NOT EXISTS idx_customer_expense_status ON customer_entertainment_expense_requests(status);
        CREATE INDEX IF NOT EXISTS idx_customer_expense_branch_director ON customer_entertainment_expense_requests(branch_director_id);
        CREATE INDEX IF NOT EXISTS idx_customer_expense_items_request ON customer_entertainment_expense_items(request_id);
        CREATE INDEX IF NOT EXISTS idx_customer_expense_files_item ON customer_entertainment_expense_files(item_id);
    `;

    // Add manager columns if they don't exist (for existing tables)
    const addManagerColumns = async () => {
        const columns = [
            { name: 'manager_id', type: 'INTEGER REFERENCES employees(id)' },
            { name: 'manager_name', type: 'VARCHAR(255)' },
            { name: 'manager_decision', type: 'VARCHAR(20)' },
            { name: 'manager_notes', type: 'TEXT' },
            { name: 'manager_decision_at', type: 'TIMESTAMP WITHOUT TIME ZONE' }
        ];

        for (const col of columns) {
            try {
                const checkColumn = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'customer_entertainment_expense_requests' 
                    AND column_name = $1
                `, [col.name]);

                if (checkColumn.rows.length === 0) {
                    await pool.query(`
                        ALTER TABLE customer_entertainment_expense_requests 
                        ADD COLUMN ${col.name} ${col.type}
                    `);
                    console.log(`Added column ${col.name} to customer_entertainment_expense_requests`);
                }
            } catch (error) {
                console.error(`Error adding column ${col.name}:`, error.message);
            }
        }

        // Add index for manager_id if it doesn't exist
        try {
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_customer_expense_manager 
                ON customer_entertainment_expense_requests(manager_id)
            `);
        } catch (error) {
            console.error('Error creating manager index:', error.message);
        }
    };

    try {
        await pool.query(createTableQuery);
        await pool.query(createExpenseItemsTable);
        await pool.query(createExpenseFilesTable);
        await pool.query(createIndexes);
        await addManagerColumns(); // Add manager columns if they don't exist
        console.log('Customer entertainment expense tables created/verified');
    } catch (error) {
        console.error('Error creating customer entertainment expense tables:', error);
    }
};

ensureTable().catch((error) => {
    console.error('Error ensuring customer entertainment expense tables:', error);
});

// Generate request number
const generateRequestNumber = (branch, date) => {
    const branchCode = branch === 'Hà Nội' ? 'HN' : branch === 'TP. Hồ Chí Minh' ? 'HCM' : branch === 'Đà Nẵng' ? 'DN' : 'OT';
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PHIEU-${branchCode}-T${month}-${random}`;
};

// POST /api/customer-entertainment-expenses - Tạo yêu cầu chi phí tiếp khách
router.post('/', upload.array('files', 20), async (req, res) => {
    try {
        const {
            employeeId,
            branchDirectorId,
            branchDirectorName,
            managerId,
            managerName,
            ceoId,
            ceoName,
            branch,
            startDate,
            endDate,
            advanceAmount,
            expenseItems
        } = req.body;

        // Debug: Log để kiểm tra dữ liệu nhận được
        console.log('[Customer Entertainment Expense] Received data:', {
            employeeId,
            branchDirectorId,
            ceoId,
            branch,
            startDate,
            endDate,
            hasBranchDirector: !!branchDirectorId,
            hasCeo: !!ceoId
        });

        // Phải có branchDirectorId hoặc ceoId (validate cả undefined, null, và chuỗi rỗng)
        // Với FormData, các giá trị có thể là string, cần kiểm tra kỹ
        const hasBranchDirector = branchDirectorId !== undefined && 
                                  branchDirectorId !== null && 
                                  branchDirectorId !== '' && 
                                  String(branchDirectorId) !== 'undefined' &&
                                  String(branchDirectorId) !== 'null';
        const hasCeo = ceoId !== undefined && 
                       ceoId !== null && 
                       ceoId !== '' && 
                       String(ceoId) !== 'undefined' &&
                       String(ceoId) !== 'null';
        
        if (!employeeId || (!hasBranchDirector && !hasCeo) || !branch || !startDate || !endDate) {
            console.log('[Customer Entertainment Expense] Validation failed:', {
                hasEmployeeId: !!employeeId,
                hasBranchDirector,
                hasCeo,
                hasBranch: !!branch,
                hasStartDate: !!startDate,
                hasEndDate: !!endDate
            });
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        // Parse expense items
        let items = [];
        if (expenseItems) {
            try {
                items = typeof expenseItems === 'string' ? JSON.parse(expenseItems) : expenseItems;
            } catch (e) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu expense items không hợp lệ'
                });
            }
        }

        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng thêm ít nhất một mục chi'
            });
        }

        // Calculate total amount
        const totalAmount = items.reduce((sum, item) => {
            return sum + (parseFloat(item.amount) || 0);
        }, 0);

        // Generate request number
        const requestNumber = generateRequestNumber(branch, new Date());

        // Get manager info - prioritize from request body, otherwise check employee's direct manager
        let finalManagerId = managerId ? parseInt(managerId) : null;
        let finalManagerName = managerName || null;

        // If managerId/managerName not provided, check if employee has Hoàng Đình Sạch as direct manager
        if (!finalManagerId || !finalManagerName) {
            try {
                const employeeResult = await pool.query(
                    `SELECT quan_ly_truc_tiep FROM employees WHERE id = $1`,
                    [parseInt(employeeId)]
                );
                if (employeeResult.rows.length > 0) {
                    const quanLyTrucTiep = employeeResult.rows[0].quan_ly_truc_tiep;
                    if (quanLyTrucTiep) {
                        const managerNameLower = quanLyTrucTiep.toLowerCase().trim();
                        // Check if direct manager is Hoàng Đình Sạch
                        if (managerNameLower.includes('hoàng đình sạch') ||
                            managerNameLower.includes('hoang dinh sach') ||
                            (managerNameLower.includes('hoàng đình') && managerNameLower.includes('sạch')) ||
                            (managerNameLower.includes('hoang dinh') && managerNameLower.includes('sach'))) {
                            // Find manager's employee ID
                            const managerResult = await pool.query(
                                `SELECT id, ho_ten FROM employees WHERE ho_ten ILIKE $1 LIMIT 1`,
                                [`%${quanLyTrucTiep}%`]
                            );
                            if (managerResult.rows.length > 0) {
                                finalManagerId = managerResult.rows[0].id;
                                finalManagerName = managerResult.rows[0].ho_ten;
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error checking manager:', error);
                // Continue without manager if there's an error
            }
        }

        // Xác định status và current_step dựa trên việc chọn Tổng giám đốc hay Giám đốc chi nhánh
        let initialStatus = 'PENDING_BRANCH_DIRECTOR';
        let initialStep = 'STEP_1';
        let finalCeoId = null;

        if (ceoId) {
            // Validate và parse ceoId
            const parsedCeoId = parseInt(ceoId);
            if (!isNaN(parsedCeoId) && parsedCeoId > 0) {
                // Nếu chọn Tổng giám đốc, status sẽ là PENDING_CEO
                initialStatus = 'PENDING_CEO';
                initialStep = 'STEP_3'; // Bỏ qua bước duyệt GĐ chi nhánh
                finalCeoId = parsedCeoId;
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'CEO ID không hợp lệ'
                });
            }
        }

        // Validate và parse branchDirectorId nếu có
        let finalBranchDirectorId = null;
        if (hasBranchDirector) {
            const parsedBranchDirectorId = parseInt(branchDirectorId);
            if (isNaN(parsedBranchDirectorId) || parsedBranchDirectorId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Branch Director ID không hợp lệ'
                });
            }
            finalBranchDirectorId = parsedBranchDirectorId;
        }

        // Insert request
        const requestResult = await pool.query(
            `INSERT INTO customer_entertainment_expense_requests (
                employee_id, request_number, branch_director_id, branch_director_name,
                manager_id, manager_name, ceo_id, branch, start_date, end_date, advance_amount, total_amount, status, current_step
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
            [
                parseInt(employeeId),
                requestNumber,
                finalBranchDirectorId,
                branchDirectorName || null,
                finalManagerId,
                finalManagerName,
                finalCeoId,
                branch,
                startDate,
                endDate,
                parseFloat(advanceAmount) || 0,
                totalAmount,
                initialStatus,
                initialStep
            ]
        );

        const requestId = requestResult.rows[0].id;

        // Insert expense items and files
        const files = req.files || [];
        let fileIndex = 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            // Insert expense item
            const itemResult = await pool.query(
                `INSERT INTO customer_entertainment_expense_items (
                    request_id, invoice_number, amount, company_name, content
                ) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                [
                    requestId,
                    item.invoiceNumber,
                    parseFloat(item.amount) || 0,
                    item.companyName,
                    item.content
                ]
            );

            const itemId = itemResult.rows[0].id;

            // Insert files for this item
            const itemFileCount = item.files ? item.files.length : 0;
            for (let j = 0; j < itemFileCount && fileIndex < files.length; j++) {
                const file = files[fileIndex];
                await pool.query(
                    `INSERT INTO customer_entertainment_expense_files (
                        item_id, file_name, file_path, file_size, file_type
                    ) VALUES ($1, $2, $3, $4, $5)`,
                    [
                        itemId,
                        file.originalname,
                        file.path,
                        file.size,
                        file.mimetype
                    ]
                );
                fileIndex++;
            }
        }

        res.json({
            success: true,
            message: 'Đã tạo yêu cầu chi phí tiếp khách thành công',
            data: { id: requestId, requestNumber }
        });
    } catch (error) {
        console.error('Error creating customer entertainment expense request:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo yêu cầu: ' + error.message
        });
    }
});

// GET /api/customer-entertainment-expenses - Lấy danh sách yêu cầu
router.get('/', async (req, res) => {
    try {
        const { employeeId, branchDirectorId, managerId, ceoId, status } = req.query;

        let query = `
            SELECT 
                r.*,
                e.ho_ten as requester_name,
                e.phong_ban as requester_department
            FROM customer_entertainment_expense_requests r
            LEFT JOIN employees e ON r.employee_id = e.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (employeeId) {
            query += ` AND r.employee_id = $${paramIndex}`;
            params.push(parseInt(employeeId));
            paramIndex++;
        }

        if (branchDirectorId) {
            query += ` AND r.branch_director_id = $${paramIndex}`;
            params.push(parseInt(branchDirectorId));
            paramIndex++;
        }

        if (managerId) {
            query += ` AND r.manager_id = $${paramIndex}`;
            params.push(parseInt(managerId));
            paramIndex++;
        }

        if (ceoId) {
            query += ` AND r.ceo_id = $${paramIndex}`;
            params.push(parseInt(ceoId));
            paramIndex++;
        }

        if (status) {
            query += ` AND r.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        query += ` ORDER BY r.created_at DESC`;

        const result = await pool.query(query, params);
        const requests = result.rows;

        // Get expense items and files for each request
        for (const request of requests) {
            const itemsResult = await pool.query(
                `SELECT * FROM customer_entertainment_expense_items WHERE request_id = $1 ORDER BY id`,
                [request.id]
            );

            const items = itemsResult.rows;

            for (const item of items) {
                const filesResult = await pool.query(
                    `SELECT * FROM customer_entertainment_expense_files WHERE item_id = $1 ORDER BY id`,
                    [item.id]
                );
                item.files = filesResult.rows.map(file => ({
                    id: file.id,
                    name: file.file_name,
                    url: `/uploads/customer-entertainment-expenses/${path.basename(file.file_path)}`,
                    size: file.file_size,
                    type: file.file_type
                }));
            }

            request.expenseItems = items;
        }

        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        console.error('Error fetching customer entertainment expense requests:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách yêu cầu: ' + error.message
        });
    }
});

// GET /api/customer-entertainment-expenses/:id - Lấy chi tiết yêu cầu
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const requestResult = await pool.query(
            `SELECT 
                r.*,
                e.ho_ten as requester_name,
                e.phong_ban as requester_department
            FROM customer_entertainment_expense_requests r
            LEFT JOIN employees e ON r.employee_id = e.id
            WHERE r.id = $1`,
            [parseInt(id)]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu'
            });
        }

        const request = requestResult.rows[0];

        // Get expense items and files
        const itemsResult = await pool.query(
            `SELECT * FROM customer_entertainment_expense_items WHERE request_id = $1 ORDER BY id`,
            [request.id]
        );

        const items = itemsResult.rows;

        for (const item of items) {
            const filesResult = await pool.query(
                `SELECT * FROM customer_entertainment_expense_files WHERE item_id = $1 ORDER BY id`,
                [item.id]
            );
            item.files = filesResult.rows.map(file => ({
                id: file.id,
                name: file.file_name,
                url: `/uploads/customer-entertainment-expenses/${path.basename(file.file_path)}`,
                size: file.file_size,
                type: file.file_type
            }));
        }

        request.expenseItems = items;

        res.json({
            success: true,
            data: request
        });
    } catch (error) {
        console.error('Error fetching customer entertainment expense request:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết yêu cầu: ' + error.message
        });
    }
});

// PUT /api/customer-entertainment-expenses/:id/approve - GĐ chi nhánh hoặc Quản lý trực tiếp duyệt
router.put('/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { directorNotes, approverId, approverType } = req.body;

        // Get the request to check who can approve
        const requestResult = await pool.query(
            `SELECT * FROM customer_entertainment_expense_requests WHERE id = $1`,
            [parseInt(id)]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu'
            });
        }

        const request = requestResult.rows[0];

        // Determine if approver is manager or branch director
        let isManager = false;
        let isBranchDirector = false;

        if (approverId) {
            const approverIdInt = parseInt(approverId);
            if (request.manager_id && approverIdInt === request.manager_id) {
                isManager = true;
            } else if (request.branch_director_id && approverIdInt === request.branch_director_id) {
                isBranchDirector = true;
            } else if (approverType === 'MANAGER' && request.manager_id) {
                isManager = true;
            } else if (approverType === 'BRANCH_DIRECTOR' && request.branch_director_id) {
                isBranchDirector = true;
            }
        }

        // If neither manager nor branch director, check by name (fallback)
        if (!isManager && !isBranchDirector && approverType) {
            if (approverType === 'MANAGER') {
                isManager = true;
            } else if (approverType === 'BRANCH_DIRECTOR') {
                isBranchDirector = true;
            }
        }

        if (isManager) {
            // Manager approval
            await pool.query(
                `UPDATE customer_entertainment_expense_requests 
                SET status = 'APPROVED_BRANCH_DIRECTOR',
                    manager_decision = 'APPROVED',
                    manager_notes = $1,
                    manager_decision_at = CURRENT_TIMESTAMP,
                    current_step = 'STEP_2',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2`,
                [directorNotes || '', parseInt(id)]
            );
        } else if (isBranchDirector) {
            // Branch director approval
            await pool.query(
                `UPDATE customer_entertainment_expense_requests 
                SET status = 'APPROVED_BRANCH_DIRECTOR',
                    branch_director_decision = 'APPROVED',
                    branch_director_notes = $1,
                    branch_director_decision_at = CURRENT_TIMESTAMP,
                    current_step = 'STEP_2',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2`,
                [directorNotes || '', parseInt(id)]
            );
        } else {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền duyệt yêu cầu này'
            });
        }

        res.json({
            success: true,
            message: 'Đã duyệt yêu cầu thành công'
        });
    } catch (error) {
        console.error('Error approving request:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi duyệt yêu cầu: ' + error.message
        });
    }
});

// PUT /api/customer-entertainment-expenses/:id/reject - GĐ chi nhánh hoặc Quản lý trực tiếp từ chối
router.put('/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { directorNotes, approverId, approverType } = req.body;

        if (!directorNotes || !directorNotes.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập lý do từ chối'
            });
        }

        // Get the request to check who can reject
        const requestResult = await pool.query(
            `SELECT * FROM customer_entertainment_expense_requests WHERE id = $1`,
            [parseInt(id)]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu'
            });
        }

        const request = requestResult.rows[0];

        // Determine if approver is manager or branch director
        let isManager = false;
        let isBranchDirector = false;

        if (approverId) {
            const approverIdInt = parseInt(approverId);
            if (request.manager_id && approverIdInt === request.manager_id) {
                isManager = true;
            } else if (request.branch_director_id && approverIdInt === request.branch_director_id) {
                isBranchDirector = true;
            } else if (approverType === 'MANAGER' && request.manager_id) {
                isManager = true;
            } else if (approverType === 'BRANCH_DIRECTOR' && request.branch_director_id) {
                isBranchDirector = true;
            }
        }

        if (isManager) {
            await pool.query(
                `UPDATE customer_entertainment_expense_requests 
                SET status = 'REJECTED_BRANCH_DIRECTOR',
                    manager_decision = 'REJECTED',
                    manager_notes = $1,
                    manager_decision_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2`,
                [directorNotes, parseInt(id)]
            );
        } else if (isBranchDirector) {
            await pool.query(
                `UPDATE customer_entertainment_expense_requests 
                SET status = 'REJECTED_BRANCH_DIRECTOR',
                    branch_director_decision = 'REJECTED',
                    branch_director_notes = $1,
                    branch_director_decision_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2`,
                [directorNotes, parseInt(id)]
            );
        } else {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền từ chối yêu cầu này'
            });
        }

        res.json({
            success: true,
            message: 'Đã từ chối yêu cầu'
        });
    } catch (error) {
        console.error('Error rejecting request:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi từ chối yêu cầu: ' + error.message
        });
    }
});

// PUT /api/customer-entertainment-expenses/:id/request-correction - GĐ chi nhánh hoặc Quản lý trực tiếp yêu cầu sửa
router.put('/:id/request-correction', async (req, res) => {
    try {
        const { id } = req.params;
        const { directorNotes, approverId, approverType } = req.body;

        if (!directorNotes || !directorNotes.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập yêu cầu chỉnh sửa'
            });
        }

        // Get the request to check who can request correction
        const requestResult = await pool.query(
            `SELECT * FROM customer_entertainment_expense_requests WHERE id = $1`,
            [parseInt(id)]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu'
            });
        }

        const request = requestResult.rows[0];

        // Determine if approver is manager or branch director
        let isManager = false;
        let isBranchDirector = false;

        if (approverId) {
            const approverIdInt = parseInt(approverId);
            if (request.manager_id && approverIdInt === request.manager_id) {
                isManager = true;
            } else if (request.branch_director_id && approverIdInt === request.branch_director_id) {
                isBranchDirector = true;
            } else if (approverType === 'MANAGER' && request.manager_id) {
                isManager = true;
            } else if (approverType === 'BRANCH_DIRECTOR' && request.branch_director_id) {
                isBranchDirector = true;
            }
        }

        if (isManager) {
            await pool.query(
                `UPDATE customer_entertainment_expense_requests 
                SET status = 'REQUEST_CORRECTION',
                    manager_decision = 'REQUEST_CORRECTION',
                    manager_notes = $1,
                    manager_decision_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2`,
                [directorNotes, parseInt(id)]
            );
        } else if (isBranchDirector) {
            await pool.query(
                `UPDATE customer_entertainment_expense_requests 
                SET status = 'REQUEST_CORRECTION',
                    branch_director_decision = 'REQUEST_CORRECTION',
                    branch_director_notes = $1,
                    branch_director_decision_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2`,
                [directorNotes, parseInt(id)]
            );
        } else {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền yêu cầu chỉnh sửa yêu cầu này'
            });
        }

        res.json({
            success: true,
            message: 'Đã gửi yêu cầu chỉnh sửa'
        });
    } catch (error) {
        console.error('Error requesting correction:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi yêu cầu chỉnh sửa: ' + error.message
        });
    }
});

// PUT /api/customer-entertainment-expenses/:id/accountant-process - Kế toán xử lý
router.put('/:id/accountant-process', async (req, res) => {
    try {
        const { id } = req.params;
        const { accountantNotes } = req.body;

        await pool.query(
            `UPDATE customer_entertainment_expense_requests 
            SET status = 'ACCOUNTANT_PROCESSED',
                accountant_id = $1,
                accountant_notes = $2,
                accountant_processed_at = CURRENT_TIMESTAMP,
                current_step = 'STEP_3',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3`,
            [req.body.accountantId || null, accountantNotes, parseInt(id)]
        );

        res.json({
            success: true,
            message: 'Đã xử lý thành công'
        });
    } catch (error) {
        console.error('Error processing by accountant:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xử lý: ' + error.message
        });
    }
});

// PUT /api/customer-entertainment-expenses/:id/ceo-approve - CEO duyệt
router.put('/:id/ceo-approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { ceoNotes } = req.body;

        await pool.query(
            `UPDATE customer_entertainment_expense_requests 
            SET status = 'APPROVED_CEO',
                ceo_id = $1,
                ceo_decision = 'APPROVED',
                ceo_notes = $2,
                ceo_decision_at = CURRENT_TIMESTAMP,
                current_step = 'STEP_4',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3`,
            [req.body.ceoId || null, ceoNotes, parseInt(id)]
        );

        res.json({
            success: true,
            message: 'Đã duyệt thành công'
        });
    } catch (error) {
        console.error('Error approving by CEO:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi duyệt: ' + error.message
        });
    }
});

// PUT /api/customer-entertainment-expenses/:id/ceo-reject - CEO từ chối
router.put('/:id/ceo-reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { ceoNotes } = req.body;

        if (!ceoNotes || !ceoNotes.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập lý do từ chối'
            });
        }

        await pool.query(
            `UPDATE customer_entertainment_expense_requests 
            SET status = 'REJECTED_CEO',
                ceo_id = $1,
                ceo_decision = 'REJECTED',
                ceo_notes = $2,
                ceo_decision_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3`,
            [req.body.ceoId || null, ceoNotes, parseInt(id)]
        );

        res.json({
            success: true,
            message: 'Đã từ chối'
        });
    } catch (error) {
        console.error('Error rejecting by CEO:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi từ chối: ' + error.message
        });
    }
});

// PUT /api/customer-entertainment-expenses/:id/payment - Kế toán thanh toán
router.put('/:id/payment', async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod, bankAccount, notes, paymentProcessedBy } = req.body;

        if (!paymentMethod) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn phương thức thanh toán'
            });
        }

        await pool.query(
            `UPDATE customer_entertainment_expense_requests 
            SET status = 'PAID',
                payment_processed_by = $1,
                payment_method = $2,
                payment_notes = $3,
                payment_processed_at = CURRENT_TIMESTAMP,
                current_step = 'STEP_5',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4`,
            [paymentProcessedBy, paymentMethod, notes, parseInt(id)]
        );

        res.json({
            success: true,
            message: 'Đã thanh toán thành công'
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi thanh toán: ' + error.message
        });
    }
});

module.exports = router;

