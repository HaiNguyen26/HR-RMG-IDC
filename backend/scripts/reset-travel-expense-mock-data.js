/**
 * Script xóa và tạo lại mock data cho Travel Expense
 * Đảm bảo location_type đúng ngay từ đầu
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'HR_Management_System',
    user: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD || ''),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function resetMockData() {
    const client = await pool.connect();
    
    try {
        console.log('🗑️  Đang xóa mock data cũ...\n');
        
        // 1. Xóa tất cả mock data
        const deleteResult = await client.query(`
            DELETE FROM travel_expense_requests 
            WHERE title LIKE '%[MOCK]%'
        `);
        
        console.log(`✓ Đã xóa ${deleteResult.rowCount} bản ghi mock data cũ\n`);
        
        // 2. Kiểm tra xem có nhân viên không
        const employeeCheck = await client.query(`
            SELECT COUNT(*) as count FROM employees
        `);
        
        const employeeCount = parseInt(employeeCheck.rows[0].count);
        
        if (employeeCount === 0) {
            console.error('❌ Không tìm thấy nhân viên nào trong bảng employees!');
            console.error('💡 Vui lòng thêm nhân viên trước khi chạy script này.');
            process.exit(1);
        }
        
        console.log(`✅ Tìm thấy ${employeeCount} nhân viên\n`);
        
        // 3. Lấy danh sách employee IDs (lấy nhiều hơn để đa dạng)
        const employeesResult = await client.query(`
            SELECT id FROM employees ORDER BY id LIMIT 10
        `);
        
        const employeeIds = employeesResult.rows.map(row => row.id);
        
        if (employeeIds.length < 5) {
            console.log(`⚠️  Chỉ có ${employeeIds.length} nhân viên, sẽ dùng lại một số ID\n`);
        }
        
        console.log('📝 Đang tạo mock data mới...\n');
        
        await client.query('BEGIN');
        
        // 4. Tạo lại mock data với location_type đúng
        // Đảm bảo: 5 trong nước (DOMESTIC) và 5 ngoài nước (INTERNATIONAL)
        const mockData = [
            // ============================================
            // TRONG NƯỚC (DOMESTIC) - 5 yêu cầu
            // ============================================
            {
                employeeId: employeeIds[0],
                title: '[MOCK] Công tác Hà Nội - Họp với đối tác',
                purpose: 'Tham gia cuộc họp quan trọng với đối tác chiến lược tại Hà Nội để bàn về hợp tác dài hạn và ký kết hợp đồng mới.',
                location: 'Hà Nội',
                locationType: 'DOMESTIC', // Đảm bảo đúng
                startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: false,
                status: 'PENDING_LEVEL_1',
                currentStep: 'LEVEL_1',
                estimatedCost: 5000000.00
            },
            {
                employeeId: employeeIds[1 % employeeIds.length],
                title: '[MOCK] Công tác Đà Nẵng - Đào tạo nhân viên',
                purpose: 'Thực hiện chương trình đào tạo kỹ năng cho đội ngũ nhân viên tại chi nhánh Đà Nẵng về quy trình làm việc mới và công nghệ mới.',
                location: 'Đà Nẵng',
                locationType: 'DOMESTIC', // Đảm bảo đúng
                startTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: false,
                status: 'PENDING_LEVEL_2',
                currentStep: 'LEVEL_2',
                estimatedCost: 3500000.00,
                managerId: employeeIds[0],
                managerDecision: 'APPROVED',
                managerNotes: 'Đồng ý cho công tác. Đây là hoạt động quan trọng cho phát triển nhân sự.',
                managerDecisionAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            },
            {
                employeeId: employeeIds[2 % employeeIds.length],
                title: '[MOCK] Công tác TP.HCM - Triển lãm công nghệ',
                purpose: 'Tham gia triển lãm công nghệ quốc tế tại TP.HCM để tìm hiểu các giải pháp mới và mở rộng mạng lưới đối tác.',
                location: 'Thành phố Hồ Chí Minh',
                locationType: 'DOMESTIC', // Đảm bảo đúng
                startTime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: false,
                status: 'PENDING_LEVEL_2',
                currentStep: 'LEVEL_2',
                estimatedCost: 6000000.00,
                managerId: employeeIds[0],
                managerDecision: 'APPROVED',
                managerNotes: 'Đồng ý. Đây là cơ hội tốt để học hỏi và phát triển.',
                managerDecisionAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            },
            {
                employeeId: employeeIds[3 % employeeIds.length],
                title: '[MOCK] Công tác Hải Phòng - Khảo sát thị trường',
                purpose: 'Thực hiện khảo sát thị trường tại Hải Phòng để đánh giá tiềm năng mở rộng kinh doanh.',
                location: 'Hải Phòng',
                locationType: 'DOMESTIC', // Đảm bảo đúng
                startTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
                isOvernight: false,
                requiresCEO: false,
                status: 'PENDING_LEVEL_1',
                currentStep: 'LEVEL_1',
                estimatedCost: 2000000.00
            },
            {
                employeeId: employeeIds[4 % employeeIds.length],
                title: '[MOCK] Công tác Cần Thơ - Kiểm tra dự án',
                purpose: 'Kiểm tra tiến độ và chất lượng dự án đang triển khai tại Cần Thơ, đảm bảo đúng tiến độ và chất lượng.',
                location: 'Cần Thơ',
                locationType: 'DOMESTIC', // Đảm bảo đúng
                startTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: false,
                status: 'PENDING_LEVEL_1',
                currentStep: 'LEVEL_1',
                estimatedCost: 4000000.00
            },
            // ============================================
            // NGOÀI NƯỚC (INTERNATIONAL) - 5 yêu cầu
            // ============================================
            {
                employeeId: employeeIds[0],
                title: '[MOCK] Công tác Singapore - Hội nghị quốc tế',
                purpose: 'Tham gia hội nghị công nghệ quốc tế tại Singapore để cập nhật xu hướng mới nhất và kết nối với các chuyên gia hàng đầu.',
                location: 'Singapore',
                locationType: 'INTERNATIONAL', // Đảm bảo đúng
                startTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: true,
                status: 'PENDING_LEVEL_1',
                currentStep: 'LEVEL_1',
                estimatedCost: 25000000.00
            },
            {
                employeeId: employeeIds[1 % employeeIds.length],
                title: '[MOCK] Công tác Tokyo - Đàm phán hợp đồng',
                purpose: 'Tham gia đàm phán hợp đồng quan trọng với đối tác Nhật Bản về hợp tác dài hạn và đầu tư vào dự án mới.',
                location: 'Tokyo, Nhật Bản',
                locationType: 'INTERNATIONAL', // Đảm bảo đúng
                startTime: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: true,
                status: 'PENDING_LEVEL_2',
                currentStep: 'LEVEL_2',
                estimatedCost: 35000000.00,
                managerId: employeeIds[0],
                managerDecision: 'APPROVED',
                managerNotes: 'Đồng ý. Đây là cơ hội quan trọng để mở rộng thị trường. Cần phê duyệt của CEO.',
                managerDecisionAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
                employeeId: employeeIds[2 % employeeIds.length],
                title: '[MOCK] Công tác Bangkok - Đào tạo chuyên sâu',
                purpose: 'Tham gia khóa đào tạo chuyên sâu về quản lý dự án và công nghệ mới tại Bangkok do đối tác quốc tế tổ chức.',
                location: 'Bangkok, Thái Lan',
                locationType: 'INTERNATIONAL', // Đảm bảo đúng
                startTime: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: true,
                status: 'PENDING_LEVEL_2',
                currentStep: 'LEVEL_2',
                estimatedCost: 18000000.00,
                managerId: employeeIds[0],
                managerDecision: 'APPROVED',
                managerNotes: 'Đồng ý. Khóa học này sẽ nâng cao năng lực của nhân viên.',
                managerDecisionAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                ceoId: employeeIds[0],
                ceoDecision: 'APPROVED',
                ceoNotes: 'Đồng ý. Đầu tư vào phát triển nhân sự là ưu tiên.',
                ceoDecisionAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
            },
            {
                employeeId: employeeIds[3 % employeeIds.length],
                title: '[MOCK] Công tác Seoul - Hội thảo công nghệ',
                purpose: 'Tham gia hội thảo công nghệ tại Seoul để tìm hiểu các xu hướng mới và công nghệ tiên tiến.',
                location: 'Seoul, Hàn Quốc',
                locationType: 'INTERNATIONAL', // Đảm bảo đúng
                startTime: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: true,
                status: 'PENDING_LEVEL_1',
                currentStep: 'LEVEL_1',
                estimatedCost: 28000000.00
            },
            {
                employeeId: employeeIds[4 % employeeIds.length],
                title: '[MOCK] Công tác Kuala Lumpur - Triển lãm thương mại',
                purpose: 'Tham gia triển lãm thương mại quốc tế tại Kuala Lumpur để giới thiệu sản phẩm và tìm kiếm đối tác mới.',
                location: 'Kuala Lumpur, Malaysia',
                locationType: 'INTERNATIONAL', // Đảm bảo đúng
                startTime: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: true,
                status: 'PENDING_LEVEL_1',
                currentStep: 'LEVEL_1',
                estimatedCost: 22000000.00
            },
            // ============================================
            // THÊM 20 YÊU CẦU NỮA (10 trong nước + 10 ngoài nước)
            // ============================================
            // TRONG NƯỚC (DOMESTIC) - 10 yêu cầu thêm
            {
                employeeId: employeeIds[5 % employeeIds.length],
                title: '[MOCK] Công tác Nha Trang - Hội thảo du lịch',
                purpose: 'Tham gia hội thảo về phát triển du lịch tại Nha Trang để tìm hiểu các mô hình kinh doanh mới.',
                location: 'Nha Trang',
                locationType: 'DOMESTIC',
                startTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: false,
                status: 'PENDING_LEVEL_1',
                currentStep: 'LEVEL_1',
                estimatedCost: 4500000.00
            },
            {
                employeeId: employeeIds[6 % employeeIds.length],
                title: '[MOCK] Công tác Huế - Khảo sát dự án',
                purpose: 'Khảo sát địa điểm và đánh giá tiềm năng cho dự án mới tại Huế.',
                location: 'Huế',
                locationType: 'DOMESTIC',
                startTime: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: false,
                status: 'PENDING_LEVEL_2',
                currentStep: 'LEVEL_2',
                estimatedCost: 3800000.00,
                managerId: employeeIds[0],
                managerDecision: 'APPROVED',
                managerNotes: 'Đồng ý. Dự án này có tiềm năng tốt.',
                managerDecisionAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
                employeeId: employeeIds[7 % employeeIds.length],
                title: '[MOCK] Công tác Vũng Tàu - Đào tạo kỹ năng',
                purpose: 'Tổ chức khóa đào tạo kỹ năng quản lý cho đội ngũ nhân viên tại Vũng Tàu.',
                location: 'Vũng Tàu',
                locationType: 'DOMESTIC',
                startTime: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: false,
                status: 'APPROVED',
                currentStep: 'COMPLETED',
                estimatedCost: 5500000.00,
                managerId: employeeIds[0],
                managerDecision: 'APPROVED',
                managerNotes: 'Đồng ý. Đào tạo là ưu tiên.',
                managerDecisionAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                financeId: employeeIds[0],
                financeDecision: 'APPROVED',
                financeNotes: 'Đã duyệt chi phí.',
                financeDecisionAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
            },
            {
                employeeId: employeeIds[8 % employeeIds.length],
                title: '[MOCK] Công tác Quy Nhon - Họp với đối tác',
                purpose: 'Họp với đối tác tại Quy Nhon để thảo luận về hợp tác trong tương lai.',
                location: 'Quy Nhon',
                locationType: 'DOMESTIC',
                startTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
                isOvernight: false,
                requiresCEO: false,
                status: 'PENDING_LEVEL_1',
                currentStep: 'LEVEL_1',
                estimatedCost: 2500000.00
            },
            {
                employeeId: employeeIds[9 % employeeIds.length],
                title: '[MOCK] Công tác Phan Thiết - Kiểm tra chất lượng',
                purpose: 'Kiểm tra chất lượng sản phẩm và dịch vụ tại chi nhánh Phan Thiết.',
                location: 'Phan Thiết',
                locationType: 'DOMESTIC',
                startTime: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: false,
                status: 'PENDING_LEVEL_2',
                currentStep: 'LEVEL_2',
                estimatedCost: 4200000.00,
                managerId: employeeIds[0],
                managerDecision: 'APPROVED',
                managerNotes: 'Đồng ý. Kiểm tra chất lượng là cần thiết.',
                managerDecisionAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            },
            {
                employeeId: employeeIds[0],
                title: '[MOCK] Công tác Đà Lạt - Hội nghị kinh doanh',
                purpose: 'Tham gia hội nghị kinh doanh tại Đà Lạt để cập nhật xu hướng thị trường.',
                location: 'Đà Lạt',
                locationType: 'DOMESTIC',
                startTime: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: false,
                status: 'PENDING_LEVEL_1',
                currentStep: 'LEVEL_1',
                estimatedCost: 4800000.00
            },
            {
                employeeId: employeeIds[1 % employeeIds.length],
                title: '[MOCK] Công tác Quảng Ninh - Triển lãm thương mại',
                purpose: 'Tham gia triển lãm thương mại tại Quảng Ninh để giới thiệu sản phẩm mới.',
                location: 'Quảng Ninh',
                locationType: 'DOMESTIC',
                startTime: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 47 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: false,
                status: 'REJECTED',
                currentStep: 'REJECTED',
                estimatedCost: 3500000.00,
                managerId: employeeIds[0],
                managerDecision: 'REJECTED',
                managerNotes: 'Từ chối do trùng lịch với sự kiện khác.',
                managerDecisionAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            },
            {
                employeeId: employeeIds[2 % employeeIds.length],
                title: '[MOCK] Công tác Bình Dương - Đào tạo nhân viên mới',
                purpose: 'Đào tạo nhân viên mới tại Bình Dương về quy trình làm việc và văn hóa công ty.',
                location: 'Bình Dương',
                locationType: 'DOMESTIC',
                startTime: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 52 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: false,
                status: 'PENDING_LEVEL_2',
                currentStep: 'LEVEL_2',
                estimatedCost: 4000000.00,
                managerId: employeeIds[0],
                managerDecision: 'APPROVED',
                managerNotes: 'Đồng ý. Đào tạo nhân viên mới là quan trọng.',
                managerDecisionAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
            },
            {
                employeeId: employeeIds[3 % employeeIds.length],
                title: '[MOCK] Công tác Long An - Khảo sát thị trường',
                purpose: 'Khảo sát thị trường tại Long An để đánh giá cơ hội mở rộng kinh doanh.',
                location: 'Long An',
                locationType: 'DOMESTIC',
                startTime: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000),
                isOvernight: false,
                requiresCEO: false,
                status: 'PENDING_LEVEL_1',
                currentStep: 'LEVEL_1',
                estimatedCost: 2800000.00
            },
            {
                employeeId: employeeIds[4 % employeeIds.length],
                title: '[MOCK] Công tác An Giang - Họp với nhà đầu tư',
                purpose: 'Họp với các nhà đầu tư tại An Giang để trình bày dự án mới và tìm kiếm nguồn vốn.',
                location: 'An Giang',
                locationType: 'DOMESTIC',
                startTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 62 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: false,
                status: 'PENDING_LEVEL_1',
                currentStep: 'LEVEL_1',
                estimatedCost: 5200000.00
            },
            // NGOÀI NƯỚC (INTERNATIONAL) - 10 yêu cầu thêm
            {
                employeeId: employeeIds[5 % employeeIds.length],
                title: '[MOCK] Công tác Hong Kong - Hội nghị tài chính',
                purpose: 'Tham gia hội nghị tài chính quốc tế tại Hong Kong để cập nhật xu hướng đầu tư.',
                location: 'Hong Kong',
                locationType: 'INTERNATIONAL',
                startTime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: true,
                status: 'PENDING_LEVEL_1',
                currentStep: 'LEVEL_1',
                estimatedCost: 30000000.00
            },
            {
                employeeId: employeeIds[6 % employeeIds.length],
                title: '[MOCK] Công tác Jakarta - Đàm phán hợp đồng',
                purpose: 'Đàm phán hợp đồng hợp tác với đối tác Indonesia tại Jakarta.',
                location: 'Jakarta, Indonesia',
                locationType: 'INTERNATIONAL',
                startTime: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 26 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: true,
                status: 'PENDING_LEVEL_2',
                currentStep: 'LEVEL_2',
                estimatedCost: 20000000.00,
                managerId: employeeIds[0],
                managerDecision: 'APPROVED',
                managerNotes: 'Đồng ý. Đây là cơ hội quan trọng.',
                managerDecisionAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            },
            {
                employeeId: employeeIds[7 % employeeIds.length],
                title: '[MOCK] Công tác Manila - Hội thảo công nghệ',
                purpose: 'Tham gia hội thảo công nghệ tại Manila để học hỏi các giải pháp mới.',
                location: 'Manila, Philippines',
                locationType: 'INTERNATIONAL',
                startTime: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: true,
                status: 'APPROVED',
                currentStep: 'COMPLETED',
                estimatedCost: 15000000.00,
                managerId: employeeIds[0],
                managerDecision: 'APPROVED',
                managerNotes: 'Đồng ý. Hội thảo này có giá trị.',
                managerDecisionAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
                ceoId: employeeIds[0],
                ceoDecision: 'APPROVED',
                ceoNotes: 'Đồng ý. Đầu tư vào công nghệ là cần thiết.',
                ceoDecisionAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                financeId: employeeIds[0],
                financeDecision: 'APPROVED',
                financeNotes: 'Đã duyệt.',
                financeDecisionAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            },
            {
                employeeId: employeeIds[8 % employeeIds.length],
                title: '[MOCK] Công tác Taipei - Triển lãm công nghệ',
                purpose: 'Tham gia triển lãm công nghệ tại Taipei để tìm hiểu các sản phẩm mới nhất.',
                location: 'Taipei, Đài Loan',
                locationType: 'INTERNATIONAL',
                startTime: new Date(Date.now() + 38 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: true,
                status: 'PENDING_LEVEL_1',
                currentStep: 'LEVEL_1',
                estimatedCost: 24000000.00
            },
            {
                employeeId: employeeIds[9 % employeeIds.length],
                title: '[MOCK] Công tác Sydney - Hội nghị quốc tế',
                purpose: 'Tham gia hội nghị quốc tế về phát triển bền vững tại Sydney.',
                location: 'Sydney, Australia',
                locationType: 'INTERNATIONAL',
                startTime: new Date(Date.now() + 48 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 54 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: true,
                status: 'REJECTED',
                currentStep: 'REJECTED',
                estimatedCost: 45000000.00,
                managerId: employeeIds[0],
                managerDecision: 'APPROVED',
                managerNotes: 'Đồng ý. Tuy nhiên cần phê duyệt của CEO.',
                managerDecisionAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                ceoId: employeeIds[0],
                ceoDecision: 'REJECTED',
                ceoNotes: 'Từ chối do chi phí quá cao và ngân sách đã được phân bổ.',
                ceoDecisionAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            },
            {
                employeeId: employeeIds[0],
                title: '[MOCK] Công tác Dubai - Hội chợ thương mại',
                purpose: 'Tham gia hội chợ thương mại quốc tế tại Dubai để mở rộng thị trường.',
                location: 'Dubai, UAE',
                locationType: 'INTERNATIONAL',
                startTime: new Date(Date.now() + 58 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 65 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: true,
                status: 'PENDING_LEVEL_1',
                currentStep: 'LEVEL_1',
                estimatedCost: 50000000.00
            },
            {
                employeeId: employeeIds[1 % employeeIds.length],
                title: '[MOCK] Công tác London - Đào tạo chuyên sâu',
                purpose: 'Tham gia khóa đào tạo chuyên sâu về quản lý dự án tại London.',
                location: 'London, Anh',
                locationType: 'INTERNATIONAL',
                startTime: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 77 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: true,
                status: 'PENDING_LEVEL_2',
                currentStep: 'LEVEL_2',
                estimatedCost: 60000000.00,
                managerId: employeeIds[0],
                managerDecision: 'APPROVED',
                managerNotes: 'Đồng ý. Khóa học này rất có giá trị.',
                managerDecisionAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
            },
            {
                employeeId: employeeIds[2 % employeeIds.length],
                title: '[MOCK] Công tác Paris - Hội nghị công nghệ',
                purpose: 'Tham gia hội nghị công nghệ quốc tế tại Paris để cập nhật xu hướng mới.',
                location: 'Paris, Pháp',
                locationType: 'INTERNATIONAL',
                startTime: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 85 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: true,
                status: 'PENDING_LEVEL_1',
                currentStep: 'LEVEL_1',
                estimatedCost: 55000000.00
            },
            {
                employeeId: employeeIds[3 % employeeIds.length],
                title: '[MOCK] Công tác New York - Hội nghị tài chính',
                purpose: 'Tham gia hội nghị tài chính quốc tế tại New York để học hỏi kinh nghiệm.',
                location: 'New York, Mỹ',
                locationType: 'INTERNATIONAL',
                startTime: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 96 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: true,
                status: 'PENDING_LEVEL_2',
                currentStep: 'LEVEL_2',
                estimatedCost: 80000000.00,
                managerId: employeeIds[0],
                managerDecision: 'APPROVED',
                managerNotes: 'Đồng ý. Đây là cơ hội tốt để mở rộng kiến thức.',
                managerDecisionAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
            },
            {
                employeeId: employeeIds[4 % employeeIds.length],
                title: '[MOCK] Công tác Shanghai - Đàm phán hợp đồng',
                purpose: 'Đàm phán hợp đồng hợp tác với đối tác Trung Quốc tại Shanghai.',
                location: 'Shanghai, Trung Quốc',
                locationType: 'INTERNATIONAL',
                startTime: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
                endTime: new Date(Date.now() + 105 * 24 * 60 * 60 * 1000),
                isOvernight: true,
                requiresCEO: true,
                status: 'PENDING_LEVEL_1',
                currentStep: 'LEVEL_1',
                estimatedCost: 32000000.00
            }
        ];
        
        let insertedCount = 0;
        
        for (const data of mockData) {
            const insertQuery = `
                INSERT INTO travel_expense_requests (
                    employee_id, title, purpose, location, location_type,
                    start_time, end_time, is_overnight, requires_ceo,
                    status, current_step, estimated_cost,
                    manager_id, manager_decision, manager_notes, manager_decision_at,
                    ceo_id, ceo_decision, ceo_notes, ceo_decision_at,
                    finance_id, finance_decision, finance_notes, finance_decision_at,
                    created_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                    $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
                    CURRENT_TIMESTAMP
                ) RETURNING id
            `;
            
            const values = [
                data.employeeId,
                data.title,
                data.purpose,
                data.location,
                data.locationType, // Đảm bảo đúng ngay từ đầu
                data.startTime.toISOString(),
                data.endTime.toISOString(),
                data.isOvernight,
                data.requiresCEO,
                data.status,
                data.currentStep,
                data.estimatedCost,
                data.managerId || null,
                data.managerDecision || null,
                data.managerNotes || null,
                data.managerDecisionAt ? data.managerDecisionAt.toISOString() : null,
                data.ceoId || null,
                data.ceoDecision || null,
                data.ceoNotes || null,
                data.ceoDecisionAt ? data.ceoDecisionAt.toISOString() : null,
                data.financeId || null,
                data.financeDecision || null,
                data.financeNotes || null,
                data.financeDecisionAt ? data.financeDecisionAt.toISOString() : null
            ];
            
            try {
                await client.query(insertQuery, values);
                insertedCount++;
                console.log(`✓ [${insertedCount}/${mockData.length}] ${data.title.split(' - ')[1]}`);
            } catch (error) {
                console.error(`✗ Lỗi khi insert "${data.title}":`, error.message);
            }
        }
        
        await client.query('COMMIT');
        
        // 5. Kiểm tra kết quả
        console.log('\n📊 Kiểm tra kết quả...\n');
        const statsResult = await client.query(`
            SELECT 
                location_type,
                status,
                COUNT(*) as count
            FROM travel_expense_requests
            WHERE title LIKE '%[MOCK]%'
            GROUP BY location_type, status
            ORDER BY location_type, status
        `);
        
        console.log('Thống kê theo location_type và status:');
        statsResult.rows.forEach(row => {
            console.log(`   ${row.location_type} - ${row.status}: ${row.count} bản ghi`);
        });
        
        const totalResult = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN location_type = 'DOMESTIC' THEN 1 END) as domestic,
                COUNT(CASE WHEN location_type = 'INTERNATIONAL' THEN 1 END) as international
            FROM travel_expense_requests
            WHERE title LIKE '%[MOCK]%'
        `);
        
        const stats = totalResult.rows[0];
        console.log(`\n✅ Tổng cộng: ${stats.total} bản ghi`);
        console.log(`   - Trong nước: ${stats.domestic}`);
        console.log(`   - Ngoài nước: ${stats.international}`);
        
        console.log('\n' + '='.repeat(60));
        console.log('✨ Hoàn thành!');
        console.log(`   Đã tạo ${insertedCount} bản ghi mock data mới`);
        console.log('='.repeat(60));
        
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('\n❌ Lỗi:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Chạy script
resetMockData()
    .then(() => {
        console.log('\n✨ Script đã hoàn thành!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Lỗi không mong đợi:', error);
        process.exit(1);
    });

