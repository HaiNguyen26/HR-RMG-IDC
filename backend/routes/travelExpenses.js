const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const ensureTable = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS travel_expense_requests (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            title TEXT,
            purpose TEXT,
            location TEXT NOT NULL,
            location_type VARCHAR(20) NOT NULL,
            start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
            end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
            is_overnight BOOLEAN NOT NULL DEFAULT FALSE,
            requires_ceo BOOLEAN NOT NULL DEFAULT FALSE,
            status VARCHAR(40) NOT NULL DEFAULT 'PENDING_LEVEL_1',
            current_step VARCHAR(40) NOT NULL DEFAULT 'LEVEL_1',
            estimated_cost NUMERIC(12, 2),
            requested_by INTEGER,
            manager_id INTEGER,
            manager_decision VARCHAR(20),
            manager_notes TEXT,
            manager_decision_at TIMESTAMP WITHOUT TIME ZONE,
            ceo_id INTEGER,
            ceo_decision VARCHAR(20),
            ceo_notes TEXT,
            ceo_decision_at TIMESTAMP WITHOUT TIME ZONE,
            finance_id INTEGER,
            finance_decision VARCHAR(20),
            finance_notes TEXT,
            finance_decision_at TIMESTAMP WITHOUT TIME ZONE,
            approved_budget_amount NUMERIC(12, 2),
            approved_budget_currency VARCHAR(10),
            approved_budget_exchange_rate NUMERIC(10, 4),
            budget_approved_at TIMESTAMP WITHOUT TIME ZONE,
            budget_approved_by INTEGER,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;

    const createStatusIndex = `
        CREATE INDEX IF NOT EXISTS idx_travel_expense_status ON travel_expense_requests(status);
    `;

    const createEmployeeIndex = `
        CREATE INDEX IF NOT EXISTS idx_travel_expense_employee ON travel_expense_requests(employee_id);
    `;

    await pool.query(createTableQuery);
    await pool.query(createStatusIndex);
    await pool.query(createEmployeeIndex);

    // Add budget fields if they don't exist (for existing databases)
    const addBudgetFields = `
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='approved_budget_amount') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN approved_budget_amount NUMERIC(12, 2);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='approved_budget_currency') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN approved_budget_currency VARCHAR(10);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='approved_budget_exchange_rate') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN approved_budget_exchange_rate NUMERIC(10, 4);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='budget_approved_at') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN budget_approved_at TIMESTAMP WITHOUT TIME ZONE;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='budget_approved_by') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN budget_approved_by INTEGER;
            END IF;
        END $$;
    `;
    await pool.query(addBudgetFields);

    // Add Step 1 fields (company_name, company_address, requested_advance_amount, living_allowance_amount, living_allowance_currency, continent)
    const addStep1Fields = `
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='company_name') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN company_name TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='company_address') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN company_address TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='requested_advance_amount') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN requested_advance_amount NUMERIC(12, 2);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='living_allowance_amount') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN living_allowance_amount NUMERIC(12, 2);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='living_allowance_currency') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN living_allowance_currency VARCHAR(10);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='continent') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN continent VARCHAR(50);
            END IF;
        END $$;
    `;
    await pool.query(addStep1Fields);

    // Add branch director fields if they don't exist (for existing databases)
    const addBranchDirectorFields = `
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='branch_director_id') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN branch_director_id INTEGER;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='branch_director_decision') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN branch_director_decision VARCHAR(20);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='branch_director_notes') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN branch_director_notes TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='branch_director_decision_at') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN branch_director_decision_at TIMESTAMP WITHOUT TIME ZONE;
            END IF;
        END $$;
    `;
    await pool.query(addBranchDirectorFields);

    // Add advance fields if they don't exist (for existing databases)
    const addAdvanceFields = `
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='actual_advance_amount') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN actual_advance_amount NUMERIC(12, 2);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='advance_method') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN advance_method VARCHAR(50);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='bank_account') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN bank_account TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='advance_notes') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN advance_notes TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='advance_status') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN advance_status VARCHAR(50);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='advance_transferred_at') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN advance_transferred_at TIMESTAMP WITHOUT TIME ZONE;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='advance_transferred_by') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN advance_transferred_by INTEGER;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='advance_processed_at') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN advance_processed_at TIMESTAMP WITHOUT TIME ZONE;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='advance_processed_by') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN advance_processed_by INTEGER;
            END IF;
        END $$;
    `;
    await pool.query(addAdvanceFields);

    // Add settlement fields if they don't exist (for existing databases)
    const addSettlementFields = `
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='actual_expense') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN actual_expense NUMERIC(12, 2);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='settlement_status') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN settlement_status VARCHAR(50);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='employee_confirmed_at') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN employee_confirmed_at TIMESTAMP WITHOUT TIME ZONE;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='hr_confirmed_at') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN hr_confirmed_at TIMESTAMP WITHOUT TIME ZONE;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='hr_confirmed_by') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN hr_confirmed_by INTEGER;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='settlement_notes') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN settlement_notes TEXT;
            END IF;
        END $$;
    `;
    await pool.query(addSettlementFields);

    // Create attachments table if not exists
    const createAttachmentsTable = `
        CREATE TABLE IF NOT EXISTS travel_expense_attachments (
            id SERIAL PRIMARY KEY,
            travel_expense_request_id INTEGER NOT NULL REFERENCES travel_expense_requests(id) ON DELETE CASCADE,
            file_name VARCHAR(255) NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER,
            file_type VARCHAR(100),
            uploaded_by INTEGER,
            uploaded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            description TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_travel_expense_attachments_request ON travel_expense_attachments(travel_expense_request_id);
    `;
    await pool.query(createAttachmentsTable);

    // Add accountant fields if they don't exist (for existing databases)
    const addAccountantFields = `
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='accountant_checked_at') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN accountant_checked_at TIMESTAMP WITHOUT TIME ZONE;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='accountant_notes') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN accountant_notes TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='accountant_checked_by') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN accountant_checked_by INTEGER;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='reimbursement_amount') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN reimbursement_amount NUMERIC(12, 2);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='exceeds_budget') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN exceeds_budget BOOLEAN DEFAULT FALSE;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='travel_expense_requests' AND column_name='excess_amount') THEN
                ALTER TABLE travel_expense_requests ADD COLUMN excess_amount NUMERIC(12, 2);
            END IF;
        END $$;
    `;
    await pool.query(addAccountantFields);
};

ensureTable().catch((error) => {
    console.error('Error ensuring travel_expense_requests table:', error);
});

const VIETNAMESE_PROVINCES = [
    'ha noi', 'ho chi minh', 'hai phong', 'da nang', 'can tho', 'an giang', 'ba ria vung tau',
    'bac giang', 'bac kan', 'bac lieu', 'bac ninh', 'ben tre', 'binh dinh', 'binh duong',
    'binh phuoc', 'binh thuan', 'ca mau', 'cao bang', 'dak lak', 'dak nong', 'dien bien',
    'dong nai', 'dong thap', 'gia lai', 'ha giang', 'ha nam', 'ha tinh', 'hai duong',
    'hau giang', 'hoa binh', 'hung yen', 'khánh hoà', 'khanh hoa', 'kien giang', 'kon tum',
    'lai chau', 'lang son', 'lao cai', 'lam dong', 'long an', 'nam dinh', 'nghe an',
    'ninh binh', 'ninh thuan', 'phu tho', 'phu yen', 'quang binh', 'quang nam', 'quang ngai',
    'quang ninh', 'quang tri', 'soc trang', 'son la', 'tay ninh', 'thai binh', 'thai nguyen',
    'thanh hoa', 'thua thien hue', 'tien giang', 'tra vinh', 'tuyen quang', 'vinh long',
    'vinh phuc', 'yen bai', 'binh duong', 'binh dinh', 'gia lai', 'daklak', 'daklak', 'daknong',
    'haiduong', 'langson', 'haiduong', 'hoabinh'
];

const normalizeText = (value = '') => {
    return value
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
};

const detectLocationTypeFromText = (location) => {
    const normalizedLocation = normalizeText(location);
    if (!normalizedLocation) return null;

    for (const province of VIETNAMESE_PROVINCES) {
        if (normalizedLocation.includes(province)) {
            return 'DOMESTIC';
        }
    }
    return 'INTERNATIONAL';
};

// Xác định châu lục từ địa điểm
const detectContinentFromLocation = (location) => {
    if (!location) return null;
    const normalizedLocation = normalizeText(location);

    // Danh sách các quốc gia Châu Âu (EU)
    const europeanCountries = [
        'austria', 'belgium', 'bulgaria', 'croatia', 'cyprus', 'czech', 'denmark',
        'estonia', 'finland', 'france', 'germany', 'greece', 'hungary', 'ireland',
        'italy', 'latvia', 'lithuania', 'luxembourg', 'malta', 'netherlands', 'poland',
        'portugal', 'romania', 'slovakia', 'slovenia', 'spain', 'sweden', 'united kingdom',
        'uk', 'england', 'scotland', 'wales', 'norway', 'switzerland', 'iceland',
        'paris', 'london', 'berlin', 'madrid', 'rome', 'amsterdam', 'vienna', 'brussels',
        'stockholm', 'copenhagen', 'dublin', 'lisbon', 'warsaw', 'prague', 'budapest',
        'athens', 'helsinki', 'oslo', 'reykjavik', 'zurich', 'geneva'
    ];

    // Danh sách các quốc gia Châu Á
    const asianCountries = [
        'china', 'japan', 'south korea', 'north korea', 'india', 'indonesia', 'thailand',
        'vietnam', 'philippines', 'malaysia', 'singapore', 'myanmar', 'cambodia', 'laos',
        'bangladesh', 'sri lanka', 'nepal', 'bhutan', 'maldives', 'pakistan', 'afghanistan',
        'iran', 'iraq', 'saudi arabia', 'uae', 'united arab emirates', 'qatar', 'kuwait',
        'bahrain', 'oman', 'yemen', 'jordan', 'lebanon', 'syria', 'israel', 'palestine',
        'turkey', 'mongolia', 'kazakhstan', 'uzbekistan', 'tajikistan', 'kyrgyzstan',
        'turkmenistan', 'taiwan', 'hong kong', 'macau', 'tokyo', 'seoul', 'beijing',
        'shanghai', 'hongkong', 'bangkok', 'jakarta', 'manila', 'kuala lumpur', 'hanoi',
        'ho chi minh', 'sai gon', 'dhaka', 'colombo', 'kathmandu', 'thimphu', 'male',
        'islamabad', 'kabul', 'tehran', 'baghdad', 'riyadh', 'dubai', 'abu dhabi', 'doha',
        'kuwait city', 'manama', 'muscat', 'sanaa', 'amman', 'beirut', 'damascus',
        'jerusalem', 'tel aviv', 'ankara', 'istanbul', 'ulaanbaatar', 'astana', 'tashkent'
    ];

    // Kiểm tra Châu Âu
    for (const country of europeanCountries) {
        if (normalizedLocation.includes(country)) {
            return 'EU';
        }
    }

    // Kiểm tra Châu Á
    for (const country of asianCountries) {
        if (normalizedLocation.includes(country)) {
            return 'ASIAN';
        }
    }

    return null;
};

// Tính toán phí sinh hoạt tự động dựa trên châu lục
const calculateLivingAllowance = (continent) => {
    if (continent === 'EU') {
        return { amount: 60, currency: 'USD' };
    } else if (continent === 'ASIAN') {
        return { amount: 40, currency: 'USD' };
    }
    return { amount: null, currency: null };
};

const normalizeLocationType = (value, location) => {
    if (!value) return null;
    const normalized = value.toString().trim().toUpperCase();
    if (['DOMESTIC', 'TRONG_NUOC', 'LOCAL', 'VN'].includes(normalized)) {
        return 'DOMESTIC';
    }
    if (['INTERNATIONAL', 'NUOC_NGOAI', 'ABROAD', 'GLOBAL'].includes(normalized)) {
        return 'INTERNATIONAL';
    }
    const detected = detectLocationTypeFromText(location);
    return detected || null;
};

const mapRowToResponse = (row) => {
    if (!row) return null;

    const flow = [
        {
            key: 'STEP_EMPLOYEE',
            order: 1,
            actor: 'Nhân viên',
            action: 'Gửi yêu cầu Công tác',
            status: 'COMPLETED',
            decision: 'APPROVED',
            decidedAt: row.created_at,
        },
        {
            key: 'STEP_MANAGER',
            order: 2,
            actor: 'Quản lý Trực tiếp',
            action: 'Phê duyệt Cấp 1',
            status: row.manager_decision
                ? row.manager_decision === 'APPROVE' ? 'APPROVED' : 'REJECTED'
                : row.status === 'PENDING_LEVEL_1' ? 'PENDING' : row.status === 'REJECTED' ? 'REJECTED' : 'COMPLETED',
            decision: row.manager_decision,
            decidedAt: row.manager_decision_at,
            notes: row.manager_notes,
        },
        {
            key: 'STEP_BRANCH_DIRECTOR',
            order: 3,
            actor: 'Giám đốc Chi nhánh',
            action: 'Phê duyệt Cấp 2',
            status: row.branch_director_decision
                ? row.branch_director_decision === 'APPROVE' ? 'APPROVED' : 'REJECTED'
                : row.status === 'PENDING_LEVEL_2' ? 'PENDING'
                    : row.manager_decision === 'REJECT' ? 'REJECTED'
                        : row.status === 'REJECTED' ? 'REJECTED'
                            : row.manager_decision === 'APPROVE' ? 'PENDING' : 'PENDING',
            decision: row.branch_director_decision,
            decidedAt: row.branch_director_decision_at,
            notes: row.branch_director_notes,
        },
    ];

    if (row.requires_ceo) {
        flow.push({
            key: 'STEP_CEO',
            order: 4,
            actor: 'Tổng Giám đốc',
            action: 'Phê duyệt Cấp Đặc biệt',
            status: row.ceo_decision
                ? row.ceo_decision === 'APPROVE' ? 'APPROVED' : 'REJECTED'
                : row.status === 'PENDING_CEO'
                    ? 'PENDING'
                    : row.manager_decision === 'REJECT'
                        ? 'REJECTED'
                        : row.status === 'REJECTED'
                            ? 'REJECTED'
                            : row.status === 'PENDING_FINANCE'
                                ? 'COMPLETED'
                                : 'PENDING',
            decision: row.ceo_decision,
            decidedAt: row.ceo_decision_at,
            notes: row.ceo_notes,
        });
    }

    flow.push({
        key: 'STEP_FINANCE',
        order: row.requires_ceo ? 5 : 4,
        actor: 'Kế toán / HR',
        action: 'Kiểm tra & Duyệt chi phí cuối',
        status: row.finance_decision
            ? row.finance_decision === 'APPROVE' ? 'APPROVED' : 'REJECTED'
            : row.status === 'PENDING_FINANCE'
                ? 'PENDING'
                : row.status === 'APPROVED'
                    ? 'APPROVED'
                    : row.status === 'REJECTED'
                        ? 'REJECTED'
                        : row.requires_ceo && row.ceo_decision !== 'APPROVE'
                            ? 'PENDING'
                            : 'PENDING',
        decision: row.finance_decision,
        decidedAt: row.finance_decision_at,
        notes: row.finance_notes,
    });

    return {
        id: row.id,
        employeeId: row.employee_id,
        employee_name: row.employee_name || null,
        employee_branch: row.employee_branch || null,
        title: row.title,
        purpose: row.purpose,
        companyName: row.company_name || null,
        companyAddress: row.company_address || null,
        location: row.location,
        locationType: row.location_type,
        startTime: row.start_time,
        endTime: row.end_time,
        isOvernight: row.is_overnight,
        requiresCEO: row.requires_ceo,
        status: row.status,
        currentStep: row.current_step,
        requestedAdvanceAmount: row.requested_advance_amount ? Number(row.requested_advance_amount) : null,
        livingAllowance: row.living_allowance_amount ? {
            amount: Number(row.living_allowance_amount),
            currency: row.living_allowance_currency || 'USD',
        } : null,
        continent: row.continent || null,
        estimatedCost: row.estimated_cost ? Number(row.estimated_cost) : null,
        requestedBy: row.requested_by,
        approvedBudget: row.approved_budget_amount ? {
            amount: Number(row.approved_budget_amount),
            currency: row.approved_budget_currency,
            exchangeRate: row.approved_budget_exchange_rate ? Number(row.approved_budget_exchange_rate) : null,
            approvedAt: row.budget_approved_at,
            approvedBy: row.budget_approved_by,
        } : null,
        advance: row.actual_advance_amount ? {
            amount: Number(row.actual_advance_amount),
            method: row.advance_method,
            bankAccount: row.bank_account,
            notes: row.advance_notes,
            status: row.advance_status,
            transferredAt: row.advance_transferred_at,
            transferredBy: row.advance_transferred_by,
        } : null,
        settlement: {
            actualExpense: row.actual_expense ? Number(row.actual_expense) : null,
            status: row.settlement_status || null,
            employeeConfirmedAt: row.employee_confirmed_at || null,
            hrConfirmedAt: row.hr_confirmed_at || null,
            hrConfirmedBy: row.hr_confirmed_by || null,
            notes: row.settlement_notes || null,
        },
        accountant: {
            checkedAt: row.accountant_checked_at || null,
            checkedBy: row.accountant_checked_by || null,
            notes: row.accountant_notes || null,
            reimbursementAmount: row.reimbursement_amount ? Number(row.reimbursement_amount) : null,
            exceedsBudget: row.exceeds_budget || false,
            excessAmount: row.excess_amount ? Number(row.excess_amount) : null,
        },
        decisions: {
            manager: {
                actorId: row.manager_id,
                decision: row.manager_decision,
                notes: row.manager_notes,
                decidedAt: row.manager_decision_at,
            },
            branchDirector: {
                actorId: row.branch_director_id,
                decision: row.branch_director_decision,
                notes: row.branch_director_notes,
                decidedAt: row.branch_director_decision_at,
            },
            ceo: {
                actorId: row.ceo_id,
                decision: row.ceo_decision,
                notes: row.ceo_notes,
                decidedAt: row.ceo_decision_at,
            },
            finance: {
                actorId: row.finance_id,
                decision: row.finance_decision,
                notes: row.finance_notes,
                decidedAt: row.finance_decision_at,
            },
        },
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        approvalFlow: flow,
    };
};

router.get('/', async (req, res) => {
    try {
        const { employeeId, status } = req.query;
        const params = [];
        const conditions = [];

        if (employeeId) {
            params.push(employeeId);
            conditions.push(`ter.employee_id = $${params.length}`);
        }

        // Xử lý status filter nếu có nhiều status (comma-separated)
        if (status) {
            const statusList = status.split(',').map(s => s.trim());
            if (statusList.length > 1) {
                params.push(statusList);
                conditions.push(`ter.status = ANY($${params.length}::text[])`);
            } else {
                params.push(status);
                conditions.push(`ter.status = $${params.length}`);
            }
        }

        const query = `
            SELECT 
                ter.*,
                e.ho_ten as employee_name,
                e.chi_nhanh as employee_branch
            FROM travel_expense_requests ter
            LEFT JOIN employees e ON ter.employee_id = e.id
            ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
            ORDER BY ter.created_at DESC
        `;

        const result = await pool.query(query, params);

        // Tự động sửa location_type nếu phát hiện sai
        const correctedRows = result.rows.map(row => {
            // Nếu location_type là INTERNATIONAL nhưng location là địa điểm Việt Nam
            if (row.location_type === 'INTERNATIONAL') {
                const detectedType = detectLocationTypeFromText(row.location);
                if (detectedType === 'DOMESTIC') {
                    // Tự động sửa trong database
                    pool.query(
                        'UPDATE travel_expense_requests SET location_type = $1 WHERE id = $2',
                        ['DOMESTIC', row.id]
                    ).catch(err => console.error('Error auto-fixing location_type:', err));
                    row.location_type = 'DOMESTIC';
                }
            }
            return row;
        });

        res.json({
            success: true,
            message: 'Danh sách yêu cầu chi phí công tác',
            data: correctedRows.map(mapRowToResponse),
        });
    } catch (error) {
        console.error('Error fetching travel expenses:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách chi phí công tác: ' + error.message,
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT 
                ter.*,
                e.ho_ten as employee_name,
                e.chi_nhanh as employee_branch
            FROM travel_expense_requests ter
            LEFT JOIN employees e ON ter.employee_id = e.id
            WHERE ter.id = $1
        `, [id]);

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu chi phí công tác',
            });
        }

        res.json({
            success: true,
            message: 'Chi tiết yêu cầu chi phí công tác',
            data: mapRowToResponse(result.rows[0]),
        });
    } catch (error) {
        console.error('Error fetching travel expense request:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết chi phí công tác: ' + error.message,
        });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            employeeId,
            title,
            purpose,
            companyName,
            companyAddress,
            location,
            locationType,
            startTime,
            endTime,
            requestedAdvanceAmount,
            estimatedCost,
            requestedBy,
        } = req.body;

        if (!employeeId || !location || !locationType || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc (employeeId, location, locationType, thời gian)',
            });
        }

        const normalizedLocationType =
            normalizeLocationType(locationType, location) || detectLocationTypeFromText(location) || 'DOMESTIC';

        if (!normalizedLocationType) {
            return res.status(400).json({
                success: false,
                message: 'Loại địa điểm không hợp lệ. Hãy chọn Trong nước hoặc Nước ngoài.',
            });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Thời gian không hợp lệ',
            });
        }

        if (end <= start) {
            return res.status(400).json({
                success: false,
                message: 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu',
            });
        }

        const isOvernight = end.getTime() - start.getTime() > DAY_IN_MS;
        const requiresCEO = normalizedLocationType === 'INTERNATIONAL';
        const initialStatus = 'PENDING_LEVEL_1';
        const initialStep = 'LEVEL_1';

        // Xác định châu lục và tính phí sinh hoạt tự động (chỉ cho công tác nước ngoài)
        let continent = null;
        let livingAllowanceAmount = null;
        let livingAllowanceCurrency = null;

        if (normalizedLocationType === 'INTERNATIONAL') {
            continent = detectContinentFromLocation(location);
            if (continent) {
                const allowance = calculateLivingAllowance(continent);
                livingAllowanceAmount = allowance.amount;
                livingAllowanceCurrency = allowance.currency;
            }
        }

        const insertQuery = `
            INSERT INTO travel_expense_requests (
                employee_id,
                title,
                purpose,
                company_name,
                company_address,
                location,
                location_type,
                start_time,
                end_time,
                is_overnight,
                requires_ceo,
                status,
                current_step,
                requested_advance_amount,
                living_allowance_amount,
                living_allowance_currency,
                continent,
                estimated_cost,
                requested_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
        `;

        const values = [
            employeeId,
            title || null,
            purpose || null,
            companyName || null,
            companyAddress || null,
            location,
            normalizedLocationType,
            start.toISOString(),
            end.toISOString(),
            isOvernight,
            requiresCEO,
            initialStatus,
            initialStep,
            requestedAdvanceAmount !== undefined && requestedAdvanceAmount !== null && requestedAdvanceAmount !== '' ? parseFloat(requestedAdvanceAmount) : null,
            livingAllowanceAmount,
            livingAllowanceCurrency,
            continent,
            estimatedCost !== undefined && estimatedCost !== null ? estimatedCost : null,
            requestedBy || null,
        ];

        const result = await pool.query(insertQuery, values);
        const created = mapRowToResponse(result.rows[0]);

        res.status(201).json({
            success: true,
            message: 'Đã tạo yêu cầu chi phí công tác',
            data: created,
        });
    } catch (error) {
        console.error('Error creating travel expense request:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo yêu cầu chi phí công tác: ' + error.message,
        });
    }
});

router.post('/:id/decision', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { actorRole, actorId, decision, notes } = req.body;

        if (!actorRole || !decision) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin actorRole hoặc decision',
            });
        }

        const normalizedDecision = decision.toString().trim().toUpperCase();
        if (!['APPROVE', 'REJECT'].includes(normalizedDecision)) {
            return res.status(400).json({
                success: false,
                message: 'Quyết định không hợp lệ (APPROVE hoặc REJECT)',
            });
        }

        const normalizedRole = actorRole.toString().trim().toUpperCase();
        if (!['MANAGER', 'BRANCH_DIRECTOR', 'CEO', 'FINANCE'].includes(normalizedRole)) {
            return res.status(400).json({
                success: false,
                message: 'actorRole không hợp lệ. Hãy sử dụng MANAGER, BRANCH_DIRECTOR, CEO hoặc FINANCE',
            });
        }

        await client.query('BEGIN');
        const requestResult = await client.query('SELECT * FROM travel_expense_requests WHERE id = $1 FOR UPDATE', [id]);

        if (!requestResult.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu chi phí công tác',
            });
        }

        const request = requestResult.rows[0];
        let nextStatus = request.status;
        let nextStep = request.current_step;

        const timestamp = new Date().toISOString();

        const setFields = ['updated_at = $1'];
        const setValues = [timestamp];
        let setIndex = 2;

        const applyDecision = (fieldPrefix) => {
            setFields.push(`${fieldPrefix}_decision = $${setIndex++}`);
            setValues.push(normalizedDecision);
            setFields.push(`${fieldPrefix}_decision_at = $${setIndex++}`);
            setValues.push(timestamp);
            setFields.push(`${fieldPrefix}_notes = $${setIndex++}`);
            setValues.push(notes || null);
            setFields.push(`${fieldPrefix}_id = $${setIndex++}`);
            setValues.push(actorId || null);
        };

        if (normalizedRole === 'MANAGER') {
            if (request.status !== 'PENDING_LEVEL_1') {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Yêu cầu không nằm trong bước phê duyệt của Quản lý Trực tiếp (Cấp 1)',
                });
            }
            applyDecision('manager');

            if (normalizedDecision === 'APPROVE') {
                // Sau khi Cấp 1 duyệt → chuyển đến Cấp 2 (Giám đốc Chi nhánh)
                nextStatus = 'PENDING_LEVEL_2';
                nextStep = 'LEVEL_2';
            } else {
                nextStatus = 'REJECTED';
                nextStep = 'LEVEL_1';
            }
        } else if (normalizedRole === 'BRANCH_DIRECTOR') {
            if (request.status !== 'PENDING_LEVEL_2') {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Yêu cầu không nằm trong bước phê duyệt của Giám đốc Chi nhánh (Cấp 2)',
                });
            }
            // Kiểm tra xem Cấp 1 đã duyệt chưa
            if (!request.manager_decision || request.manager_decision !== 'APPROVE') {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Yêu cầu chưa được Quản lý Trực tiếp (Cấp 1) duyệt',
                });
            }
            applyDecision('branch_director');

            if (normalizedDecision === 'APPROVE') {
                // Sau khi Cấp 2 duyệt → chuyển đến CEO (nếu nước ngoài) hoặc PENDING_SETTLEMENT (nếu trong nước)
                if (request.requires_ceo) {
                    nextStatus = 'PENDING_CEO';
                    nextStep = 'CEO';
                } else {
                    // Quy trình mới: Bỏ bước cấp ngân sách & tạm ứng, chuyển thẳng sang settlement
                    nextStatus = 'PENDING_SETTLEMENT';
                    nextStep = 'SETTLEMENT';
                }
            } else {
                nextStatus = 'REJECTED';
                nextStep = 'LEVEL_2';
            }
        } else if (normalizedRole === 'CEO') {
            if (!request.requires_ceo) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Yêu cầu này không yêu cầu phê duyệt bởi Tổng Giám đốc',
                });
            }
            if (request.status !== 'PENDING_CEO') {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Yêu cầu không nằm trong bước phê duyệt của Tổng Giám đốc',
                });
            }
            // Kiểm tra xem Cấp 1 đã duyệt chưa
            if (!request.manager_decision || request.manager_decision !== 'APPROVE') {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Yêu cầu chưa được Quản lý Trực tiếp (Cấp 1) duyệt',
                });
            }
            // Kiểm tra xem Cấp 2 đã duyệt chưa
            if (!request.branch_director_decision || request.branch_director_decision !== 'APPROVE') {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Yêu cầu chưa được Giám đốc Chi nhánh (Cấp 2) duyệt',
                });
            }
            applyDecision('ceo');

            if (normalizedDecision === 'APPROVE') {
                // Quy trình mới: Bỏ bước cấp ngân sách & tạm ứng, chuyển thẳng sang settlement
                nextStatus = 'PENDING_SETTLEMENT';
                nextStep = 'SETTLEMENT';
            } else {
                nextStatus = 'REJECTED';
                nextStep = 'CEO';
            }
        } else if (normalizedRole === 'FINANCE') {
            if (!['PENDING_FINANCE', 'APPROVED', 'REJECTED'].includes(request.status)) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Yêu cầu không nằm trong bước phê duyệt của Kế toán/HR',
                });
            }
            if (request.status !== 'PENDING_FINANCE') {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Chỉ có thể xử lý khi yêu cầu đang chờ Kế toán/HR',
                });
            }
            applyDecision('finance');

            if (normalizedDecision === 'APPROVE') {
                nextStatus = 'APPROVED';
                nextStep = 'COMPLETED';
            } else {
                nextStatus = 'REJECTED';
                nextStep = 'FINANCE';
            }
        }

        setFields.push(`status = $${setIndex++}`);
        setValues.push(nextStatus);
        setFields.push(`current_step = $${setIndex++}`);
        setValues.push(nextStep);
        setValues.push(id);

        const updateQuery = `
            UPDATE travel_expense_requests
            SET ${setFields.join(', ')}
            WHERE id = $${setIndex}
            RETURNING *
        `;

        const updateResult = await client.query(updateQuery, setValues);
        const updatedRequest = updateResult.rows[0];

        await client.query('COMMIT');

        // Send real-time SSE notifications after commit
        try {
            // Get employee ID to send notification
            const employeeId = updatedRequest.employee_id;

            // Get HR users for notifications
            const hrResult = await pool.query(
                `SELECT id FROM users 
                 WHERE UPPER(role) = 'HR' 
                 AND (trang_thai = 'ACTIVE' OR trang_thai IS NULL)`
            );
            const hrUserIds = hrResult.rows.map(row => row.id);

            // Get employee user ID if exists
            let employeeUserIds = [];
            if (employeeId) {
                const employeeUserResult = await pool.query(
                    `SELECT DISTINCT u.id 
                     FROM users u
                     INNER JOIN employees e ON u.email = e.email OR u.ho_ten = e.ho_ten
                     WHERE e.id = $1`,
                    [employeeId]
                );
                employeeUserIds = employeeUserResult.rows.map(row => row.id);
            }

            // Notification system removed
        } catch (sseError) {
            console.error('[Travel Expense Decision] SSE Error:', sseError);
            // Don't fail the main request if SSE fails
        }

        res.json({
            success: true,
            message: 'Đã cập nhật phê duyệt chi phí công tác',
            data: mapRowToResponse(updatedRequest),
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating travel expense decision:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật phê duyệt chi phí công tác: ' + error.message,
        });
    } finally {
        client.release();
    }
});

// POST /api/travel-expenses/:id/budget - HR cấp ngân sách
router.post('/:id/budget', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { budgetAmount, currencyType, exchangeRate, approvedBy } = req.body;

        if (!budgetAmount || !currencyType) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc (budgetAmount, currencyType)',
            });
        }

        const budgetAmountNum = parseFloat(budgetAmount);
        const exchangeRateNum = exchangeRate ? parseFloat(exchangeRate) : 1;

        if (isNaN(budgetAmountNum) || budgetAmountNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Số tiền ngân sách không hợp lệ',
            });
        }

        if (isNaN(exchangeRateNum) || exchangeRateNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Tỷ giá không hợp lệ',
            });
        }

        await client.query('BEGIN');

        // Check if request exists and is in correct status
        const requestResult = await client.query(
            'SELECT * FROM travel_expense_requests WHERE id = $1 FOR UPDATE',
            [id]
        );

        if (!requestResult.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu chi phí công tác',
            });
        }

        const request = requestResult.rows[0];

        // Only allow budget approval if request is approved by manager/CEO
        if (!['PENDING_FINANCE', 'PENDING_LEVEL_1', 'PENDING_LEVEL_2', 'PENDING_CEO'].includes(request.status)) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Yêu cầu không ở trạng thái phù hợp để cấp ngân sách',
            });
        }

        const timestamp = new Date().toISOString();

        // Update budget fields and status
        const updateQuery = `
            UPDATE travel_expense_requests
            SET 
                approved_budget_amount = $1,
                approved_budget_currency = $2,
                approved_budget_exchange_rate = $3,
                budget_approved_at = $4,
                budget_approved_by = $5,
                status = CASE 
                    WHEN status = 'PENDING_CEO' THEN 'PENDING_FINANCE'
                    WHEN status IN ('PENDING_LEVEL_1', 'PENDING_LEVEL_2') THEN 'PENDING_FINANCE'
                    ELSE status
                END,
                current_step = CASE 
                    WHEN current_step = 'CEO' THEN 'FINANCE'
                    WHEN current_step IN ('LEVEL_1', 'LEVEL_2') THEN 'FINANCE'
                    ELSE current_step
                END,
                updated_at = $4
            WHERE id = $6
            RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [
            budgetAmountNum,
            currencyType.toUpperCase(),
            exchangeRateNum,
            timestamp,
            approvedBy || null,
            id
        ]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Đã cấp ngân sách thành công',
            data: mapRowToResponse(updateResult.rows[0]),
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error approving budget:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cấp ngân sách: ' + error.message,
        });
    } finally {
        client.release();
    }
});

// POST /api/travel-expenses/:id/advance/process - HR xử lý tạm ứng
router.post('/:id/advance/process', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { actualAmount, advanceMethod, bankAccount, notes, processedBy, advanceCase } = req.body;

        if (!actualAmount || !advanceMethod || !notes) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc (actualAmount, advanceMethod, notes)',
            });
        }

        const actualAmountNum = parseFloat(actualAmount);
        if (isNaN(actualAmountNum) || actualAmountNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Số tiền tạm ứng không hợp lệ',
            });
        }

        const validMethods = ['bank_transfer', 'cash', 'company_card'];
        if (!validMethods.includes(advanceMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Hình thức tạm ứng không hợp lệ',
            });
        }

        await client.query('BEGIN');

        // Check if request exists and is in correct status
        const requestResult = await client.query(
            'SELECT * FROM travel_expense_requests WHERE id = $1 FOR UPDATE',
            [id]
        );

        if (!requestResult.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu chi phí công tác',
            });
        }

        const request = requestResult.rows[0];

        // Only allow advance processing if request is PENDING_FINANCE
        if (request.status !== 'PENDING_FINANCE') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Yêu cầu không ở trạng thái phù hợp để xử lý tạm ứng (phải là PENDING_FINANCE)',
            });
        }

        const timestamp = new Date().toISOString();

        // Update advance fields - HR xử lý
        const updateQuery = `
            UPDATE travel_expense_requests
            SET 
                actual_advance_amount = $1,
                advance_method = $2,
                bank_account = $3,
                advance_notes = $4,
                advance_status = 'PENDING_ACCOUNTANT',
                advance_processed_at = $5,
                advance_processed_by = $6,
                updated_at = $5
            WHERE id = $7
            RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [
            actualAmountNum,
            advanceMethod,
            bankAccount || null,
            notes,
            timestamp,
            processedBy || null,
            id
        ]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Đã xử lý tạm ứng thành công. Yêu cầu đã được gửi đến Kế toán.',
            data: mapRowToResponse(updateResult.rows[0]),
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error processing advance:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xử lý tạm ứng: ' + error.message,
        });
    } finally {
        client.release();
    }
});

// POST /api/travel-expenses/:id/advance - Kế toán xác nhận chuyển khoản tạm ứng
router.post('/:id/advance', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { transferredBy } = req.body;

        await client.query('BEGIN');

        // Check if request exists and is in correct status
        const requestResult = await client.query(
            'SELECT * FROM travel_expense_requests WHERE id = $1 FOR UPDATE',
            [id]
        );

        if (!requestResult.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu chi phí công tác',
            });
        }

        const request = requestResult.rows[0];

        // Only allow advance transfer confirmation if advance has been processed by HR
        if (request.advance_status !== 'PENDING_ACCOUNTANT') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Yêu cầu chưa được HR xử lý tạm ứng. Vui lòng đợi HR xử lý trước.',
            });
        }

        const timestamp = new Date().toISOString();

        // Update advance fields - Kế toán xác nhận chuyển khoản
        const updateQuery = `
            UPDATE travel_expense_requests
            SET 
                advance_status = 'TRANSFERRED',
                advance_transferred_at = $1,
                advance_transferred_by = $2,
                status = 'PENDING_SETTLEMENT',
                updated_at = $1
            WHERE id = $3
            RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [
            timestamp,
            transferredBy || null,
            id
        ]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Đã xác nhận chuyển khoản tạm ứng thành công',
            data: mapRowToResponse(updateResult.rows[0]),
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error processing advance:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xử lý tạm ứng: ' + error.message,
        });
    } finally {
        client.release();
    }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/travel-expenses');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'attachment-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/jpg',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file PDF, DOC, DOCX, JPG, PNG'));
        }
    }
});

// POST /api/travel-expenses/:id/settlement - Nhân viên submit báo cáo hoàn ứng
router.post('/:id/settlement', upload.array('attachments', 10), async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { actualExpense, notes } = req.body;
        const files = req.files || [];

        if (!actualExpense) {
            // Delete uploaded files if validation fails
            files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc (actualExpense)',
            });
        }

        const actualExpenseNum = parseFloat(actualExpense);
        if (isNaN(actualExpenseNum) || actualExpenseNum < 0) {
            files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
            return res.status(400).json({
                success: false,
                message: 'Chi phí thực tế không hợp lệ',
            });
        }

        await client.query('BEGIN');

        // Check if request exists and is in correct status
        const requestResult = await client.query(
            'SELECT * FROM travel_expense_requests WHERE id = $1 FOR UPDATE',
            [id]
        );

        if (!requestResult.rows.length) {
            await client.query('ROLLBACK');
            files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu chi phí công tác',
            });
        }

        const request = requestResult.rows[0];

        // Only allow settlement if advance has been transferred
        if (request.advance_status !== 'TRANSFERRED') {
            await client.query('ROLLBACK');
            files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
            return res.status(400).json({
                success: false,
                message: 'Yêu cầu chưa được tạm ứng. Vui lòng đợi tạm ứng được chuyển khoản trước.',
            });
        }

        // Check if already submitted
        if (request.settlement_status === 'SUBMITTED' || request.settlement_status === 'HR_CONFIRMED') {
            await client.query('ROLLBACK');
            files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
            return res.status(400).json({
                success: false,
                message: 'Báo cáo hoàn ứng đã được gửi. Không thể gửi lại.',
            });
        }

        const timestamp = new Date().toISOString();

        // Update settlement fields
        const updateQuery = `
            UPDATE travel_expense_requests
            SET 
                actual_expense = $1,
                settlement_status = 'SUBMITTED',
                employee_confirmed_at = $2,
                settlement_notes = $3,
                status = 'PENDING_SETTLEMENT',
                updated_at = $2
            WHERE id = $4
            RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [
            actualExpenseNum,
            timestamp,
            notes || null,
            id
        ]);

        // Save uploaded files
        const attachmentIds = [];
        for (const file of files) {
            const attachmentResult = await client.query(
                `INSERT INTO travel_expense_attachments 
                 (travel_expense_request_id, file_name, file_path, file_size, file_type, uploaded_by, description)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id`,
                [
                    id,
                    file.originalname,
                    file.path,
                    file.size,
                    file.mimetype,
                    request.employee_id,
                    null
                ]
            );
            attachmentIds.push(attachmentResult.rows[0].id);
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Đã gửi báo cáo hoàn ứng thành công',
            data: {
                ...mapRowToResponse(updateResult.rows[0]),
                attachmentIds
            },
        });
    } catch (error) {
        await client.query('ROLLBACK');
        // Delete uploaded files on error
        if (req.files) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        console.error('Error submitting settlement:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi gửi báo cáo hoàn ứng: ' + error.message,
        });
    } finally {
        client.release();
    }
});

// GET /api/travel-expenses/:id/attachments - Lấy danh sách file đính kèm
router.get('/:id/attachments', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM travel_expense_attachments WHERE travel_expense_request_id = $1 ORDER BY uploaded_at DESC',
            [id]
        );

        res.json({
            success: true,
            message: 'Danh sách file đính kèm',
            data: result.rows.map(row => ({
                id: row.id,
                fileName: row.file_name,
                filePath: row.file_path,
                fileSize: row.file_size,
                fileType: row.file_type,
                uploadedAt: row.uploaded_at,
                description: row.description
            })),
        });
    } catch (error) {
        console.error('Error fetching attachments:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách file đính kèm: ' + error.message,
        });
    }
});

// POST /api/travel-expenses/:id/settlement/confirm - HR xác nhận settlement
router.post('/:id/settlement/confirm', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { confirmedBy } = req.body;

        await client.query('BEGIN');

        const requestResult = await client.query(
            'SELECT * FROM travel_expense_requests WHERE id = $1 FOR UPDATE',
            [id]
        );

        if (!requestResult.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu chi phí công tác',
            });
        }

        const request = requestResult.rows[0];

        if (request.settlement_status !== 'SUBMITTED') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Báo cáo hoàn ứng chưa được nhân viên gửi',
            });
        }

        const timestamp = new Date().toISOString();

        const updateQuery = `
            UPDATE travel_expense_requests
            SET 
                settlement_status = 'HR_CONFIRMED',
                hr_confirmed_at = $1,
                hr_confirmed_by = $2,
                status = 'PENDING_ACCOUNTANT',
                updated_at = $1
            WHERE id = $3
            RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [
            timestamp,
            confirmedBy || null,
            id
        ]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Đã xác nhận báo cáo hoàn ứng thành công',
            data: mapRowToResponse(updateResult.rows[0]),
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error confirming settlement:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xác nhận báo cáo hoàn ứng: ' + error.message,
        });
    } finally {
        client.release();
    }
});

// POST /api/travel-expenses/:id/accountant/check - Kế toán kiểm tra và quyết toán
router.post('/:id/accountant/check', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { checkedBy, notes } = req.body;

        await client.query('BEGIN');

        const requestResult = await client.query(
            'SELECT * FROM travel_expense_requests WHERE id = $1 FOR UPDATE',
            [id]
        );

        if (!requestResult.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu chi phí công tác',
            });
        }

        const request = requestResult.rows[0];

        // Only allow checking if HR has confirmed settlement
        if (request.settlement_status !== 'HR_CONFIRMED') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Báo cáo hoàn ứng chưa được HR xác nhận. Vui lòng đợi HR xác nhận trước.',
            });
        }

        // Check if already checked
        if (request.accountant_checked_at) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Yêu cầu đã được kế toán kiểm tra. Không thể kiểm tra lại.',
            });
        }

        if (!request.actual_expense) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Yêu cầu chưa có chi phí thực tế. Vui lòng đợi nhân viên gửi báo cáo hoàn ứng.',
            });
        }

        if (!request.actual_advance_amount) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Yêu cầu chưa có số tiền tạm ứng. Không thể quyết toán.',
            });
        }

        const actualExpense = Number(request.actual_expense);
        const advanceAmount = Number(request.actual_advance_amount); // Số tiền đã tạm ứng (thay cho ngân sách)
        const timestamp = new Date().toISOString();

        // Logic 2 trường hợp - Đối chiếu với số tiền tạm ứng
        let reimbursementAmount = 0;
        let exceedsBudget = false;
        let excessAmount = 0;
        let refundAmount = 0;
        let newStatus = '';

        if (actualExpense <= advanceAmount) {
            // Trường hợp 1: Chi phí Thực tế <= Số tiền Tạm ứng
            // → Hoàn ứng tối đa bằng Chi phí Thực tế
            reimbursementAmount = actualExpense;
            exceedsBudget = false;
            excessAmount = 0;
            refundAmount = actualExpense < advanceAmount ? advanceAmount - actualExpense : 0; // Nhân viên cần hoàn trả nếu chi phí < tạm ứng
            newStatus = 'SETTLED'; // Hoàn tất quyết toán
        } else {
            // Trường hợp 2: Chi phí Thực tế > Số tiền Tạm ứng
            // → Từ chối phần vượt, chuyển sang Bước 6.1 (PENDING_EXCEPTION_APPROVAL)
            reimbursementAmount = advanceAmount; // Chỉ hoàn ứng bằng số tiền tạm ứng
            exceedsBudget = true;
            excessAmount = actualExpense - advanceAmount;
            refundAmount = 0;
            newStatus = 'PENDING_EXCEPTION_APPROVAL'; // Chờ phê duyệt ngoại lệ
        }

        // Update accountant fields
        const updateQuery = `
            UPDATE travel_expense_requests
            SET 
                accountant_checked_at = $1,
                accountant_checked_by = $2,
                accountant_notes = $3,
                reimbursement_amount = $4,
                exceeds_budget = $5,
                excess_amount = $6,
                status = $7,
                updated_at = $1
            WHERE id = $8
            RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [
            timestamp,
            checkedBy || null,
            notes || null,
            reimbursementAmount,
            exceedsBudget,
            excessAmount > 0 ? excessAmount : null,
            newStatus,
            id
        ]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: exceedsBudget
                ? `Đã kiểm tra và quyết toán. Chi phí thực tế vượt số tiền tạm ứng ${excessAmount.toLocaleString('vi-VN')} VND. Chuyển sang phê duyệt ngoại lệ.`
                : refundAmount > 0
                    ? `Đã kiểm tra và quyết toán thành công. Nhân viên cần hoàn trả ${refundAmount.toLocaleString('vi-VN')} VND.`
                    : 'Đã kiểm tra và quyết toán thành công. Hoàn ứng tối đa bằng chi phí thực tế.',
            data: mapRowToResponse(updateResult.rows[0]),
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error checking accountant:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra và quyết toán: ' + error.message,
        });
    } finally {
        client.release();
    }
});

module.exports = router;


