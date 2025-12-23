import React, { useState, useEffect } from 'react';
import './TravelExpenseManagement.css';
import { travelExpensesAPI, employeesAPI } from '../../services/api';

const TravelExpenseManagement = ({ currentUser, showToast, showConfirm }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch travel expense requests from API
    useEffect(() => {
        const fetchRequests = async () => {
            setLoading(true);
            try {
                // Quy trình mới: Chỉ fetch PENDING_SETTLEMENT requests (bỏ bước cấp ngân sách & tạm ứng)
                const settlementResponse = await travelExpensesAPI.getAll({
                    status: 'PENDING_SETTLEMENT'
                });

                if (settlementResponse.data && settlementResponse.data.success) {
                    // Lọc chỉ các request đã được nhân viên submit báo cáo (settlement_status = 'SUBMITTED')
                    const submittedRequests = (settlementResponse.data.data || []).filter(req =>
                        req.settlement && req.settlement.status === 'SUBMITTED'
                    );

                    // Fetch attachments for each request
                    const requestsWithAttachments = await Promise.all(
                        submittedRequests.map(async (req) => {
                            try {
                                const attachmentsResponse = await travelExpensesAPI.getAttachments(req.id);
                                return {
                                    ...req,
                                    attachments: attachmentsResponse.data?.data || []
                                };
                            } catch (error) {
                                console.error(`Error fetching attachments for request ${req.id}:`, error);
                                return { ...req, attachments: [] };
                            }
                        })
                    );

                    const formattedRequests = requestsWithAttachments.map(req => ({
                        id: req.id,
                        code: `CTX-${req.id}`,
                        employeeName: req.employee_name || req.employeeName || 'N/A',
                        location: req.location || '',
                        isDomestic: req.locationType === 'DOMESTIC',
                        purpose: req.purpose || '',
                        startDate: req.startTime ? new Date(req.startTime).toLocaleDateString('vi-VN') : '',
                        endDate: req.endTime ? new Date(req.endTime).toLocaleDateString('vi-VN') : '',
                        status: req.status || '',
                        employee_id: req.employeeId || req.employee_id,
                        settlement: req.settlement || null,
                        attachments: req.attachments || []
                    }));
                    setRequests(formattedRequests);
                }
            } catch (error) {
                console.error('Error fetching travel expense requests:', error);
                showToast?.('Lỗi khi tải danh sách yêu cầu', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, [showToast]);

    const filteredRequests = requests.filter(request =>
        request.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedRequest = requests.find(req => req.id === selectedRequestId) || null;

    // Thêm thông tin đầy đủ cho selectedRequest để hiển thị trong tab content
    const selectedRequestFull = selectedRequest ? {
        ...selectedRequest,
        locationFull: selectedRequest.isDomestic ? `${selectedRequest.location} (Trong nước)` : `${selectedRequest.location} (Nước ngoài)`,
        settlement: selectedRequest.settlement || null,
        attachments: selectedRequest.attachments || []
    } : null;

    // Handle settlement confirmation
    const handleConfirmSettlement = async () => {
        if (!selectedRequestId) {
            showToast?.('Vui lòng chọn yêu cầu cần xác nhận', 'warning');
            return;
        }

        try {
            const response = await travelExpensesAPI.confirmSettlement(selectedRequestId, {
                confirmedBy: currentUser?.id || null
            });

            if (response.data && response.data.success) {
                showToast?.('Đã xác nhận hoàn ứng thành công!', 'success');

                // Refresh requests list
                const refreshResponse = await travelExpensesAPI.getAll({
                    status: 'PENDING_SETTLEMENT'
                });
                if (refreshResponse.data && refreshResponse.data.success) {
                    // Lọc chỉ các request đã được nhân viên submit báo cáo (settlement_status = 'SUBMITTED')
                    const submittedRequests = (refreshResponse.data.data || []).filter(req =>
                        req.settlement && req.settlement.status === 'SUBMITTED'
                    );

                    // Fetch attachments for each request
                    const requestsWithAttachments = await Promise.all(
                        submittedRequests.map(async (req) => {
                            try {
                                const attachmentsResponse = await travelExpensesAPI.getAttachments(req.id);
                                return {
                                    ...req,
                                    attachments: attachmentsResponse.data?.data || []
                                };
                            } catch (error) {
                                console.error(`Error fetching attachments for request ${req.id}:`, error);
                                return { ...req, attachments: [] };
                            }
                        })
                    );

                    const formattedRequests = requestsWithAttachments.map(req => ({
                        id: req.id,
                        code: `CTX-${req.id}`,
                        employeeName: req.employee_name || req.employeeName || 'N/A',
                        location: req.location || '',
                        isDomestic: req.locationType === 'DOMESTIC',
                        purpose: req.purpose || '',
                        startDate: req.startTime ? new Date(req.startTime).toLocaleDateString('vi-VN') : '',
                        endDate: req.endTime ? new Date(req.endTime).toLocaleDateString('vi-VN') : '',
                        status: req.status || '',
                        employee_id: req.employeeId || req.employee_id,
                        settlement: req.settlement || null,
                        attachments: req.attachments || []
                    }));
                    setRequests(formattedRequests);
                    setSelectedRequestId(null);
                }
            }
        } catch (error) {
            console.error('Error confirming settlement:', error);
            showToast?.('Lỗi khi xác nhận hoàn ứng: ' + (error.response?.data?.message || error.message), 'error');
        }
    };

    return (
        <div className="travel-expense-management">
            {/* Header: Quản Lý Kinh Phí Công Tác với Calm Integrity Gradient */}
            <div className="travel-expense-management-header">
                <div className="travel-expense-management-header-content">
                    {/* Icon Banner Block - Glass Block */}
                    <div className="travel-expense-management-icon-wrapper">
                        <svg
                            className="travel-expense-management-icon"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>

                    {/* Title & Subtitle */}
                    <div className="travel-expense-management-header-text">
                        <h2 className="travel-expense-management-title">
                            Quản Lý Kinh Phí Công Tác
                        </h2>
                        <p className="travel-expense-management-subtitle">
                            Xác nhận hoàn ứng cho các yêu cầu công tác đã được nhân viên gửi báo cáo
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Container: Glass Card - Thẻ chính chứa toàn bộ giao diện */}
            <div className="travel-expense-management-main-container">
                {/* Bố cục chính: 2 cột (Danh sách và Chi tiết) */}
                <div className="travel-expense-management-main-layout">
                    {/* II. CỘT TRÁI: DANH SÁCH CHỜ CẤP NGÂN SÁCH (35% Width) */}
                    <div className="travel-expense-management-list-column">
                        {/* Nền Cột: bg-white (Solid), rounded-xl, shadow-lg */}
                        <div className="travel-expense-list-column-container">
                            {/* Tiêu đề: text-xl font-bold text-indigo-600 */}
                            <h2 className="travel-expense-list-title">
                                Danh Sách Chờ Xác Nhận Hoàn Ứng
                            </h2>

                            {/* Thanh Tìm kiếm */}
                            <div className="travel-expense-search-wrapper">
                                <input
                                    type="text"
                                    className="travel-expense-search-input"
                                    placeholder="Tìm kiếm theo mã, tên, địa điểm..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Danh sách Items */}
                            <div className="travel-expense-list-items">
                                {loading ? (
                                    <div className="travel-expense-loading">Đang tải...</div>
                                ) : filteredRequests.length === 0 ? (
                                    <div className="travel-expense-empty">Không có yêu cầu nào</div>
                                ) : (
                                    filteredRequests.map((request) => (
                                        <div
                                            key={request.id}
                                            className={`travel-expense-list-item ${selectedRequestId === request.id ? 'active' : ''}`}
                                            onClick={() => setSelectedRequestId(request.id)}
                                        >
                                            {/* Cột trái: ID và Tên */}
                                            <div className="travel-expense-item-left">
                                                {/* Mã Yêu cầu: text-sm font-bold text-blue-600 - Ở trên cùng bên trái */}
                                                <div className="travel-expense-request-code">
                                                    {request.code}
                                                </div>
                                                {/* Tên nhân viên: Ở dưới ID, bên trái */}
                                                <div className="travel-expense-request-employee">
                                                    {request.employeeName}
                                                </div>
                                            </div>

                                            {/* Cột phải: Địa điểm và Trạng thái */}
                                            <div className="travel-expense-item-right">
                                                {/* Địa điểm: Ở trên cùng bên phải */}
                                                <div className="travel-expense-request-location">
                                                    {request.location}
                                                </div>
                                                {/* Trạng thái: Ở dưới Location, bên phải */}
                                                <div className={`travel-expense-request-status ${request.isDomestic ? 'domestic' : 'foreign'}`}>
                                                    {request.isDomestic ? 'Trong nước' : 'Nước ngoài'}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* III. CỘT PHẢI: CHI TIẾT XÁC NHẬN HOÀN ỨNG (65% Width) */}
                    <div className="travel-expense-management-detail-column">
                        {/* Nền Cột: bg-white (Solid), rounded-xl, shadow-lg - Nền trắng tinh khiết, sạch sẽ */}
                        <div className="travel-expense-detail-column-container">
                            {selectedRequestFull ? (
                                <>
                                    {/* A. Tóm Tắt & Tab Menu */}

                                    {/* A.1. Thông tin Tóm tắt: Light blue card với layout 2 cột */}
                                    <div className="travel-expense-summary-block">
                                        {/* Tiêu đề: Bold blue text */}
                                        <h3 className="travel-expense-summary-title">
                                            Thông tin Yêu Cầu - {selectedRequestFull.code}
                                        </h3>

                                        {/* Layout 2 cột */}
                                        <div className="travel-expense-summary-content">
                                            {/* Cột trái: Nhân viên, Địa điểm */}
                                            <div className="travel-expense-summary-left">
                                                <div className="travel-expense-summary-item">
                                                    <span className="travel-expense-summary-label">Nhân viên:</span>
                                                    <span className="travel-expense-summary-value">{selectedRequestFull.employeeName}</span>
                                                </div>
                                                <div className="travel-expense-summary-item">
                                                    <span className="travel-expense-summary-label">Địa điểm:</span>
                                                    <span className="travel-expense-summary-value">{selectedRequestFull.locationFull}</span>
                                                </div>
                                            </div>

                                            {/* Cột phải: Mục đích, Trạng thái */}
                                            <div className="travel-expense-summary-right">
                                                <div className="travel-expense-summary-item">
                                                    <span className="travel-expense-summary-label">Mục đích:</span>
                                                    <span className="travel-expense-summary-value">{selectedRequestFull.purpose}</span>
                                                </div>
                                                <div className="travel-expense-summary-item">
                                                    <span className="travel-expense-summary-label">Trạng thái:</span>
                                                    <span className="travel-expense-summary-value travel-expense-summary-status">ĐÃ DUYỆT CẤP 3</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Nội dung Xác Nhận Hoàn Ứng */}
                                    <div className="travel-expense-tab-content">
                                        {/* Tab C: Xác Nhận Hoàn Ứng */}
                                        {selectedRequestFull && selectedRequestFull.settlement && selectedRequestFull.settlement.status === 'SUBMITTED' ? (
                                            <div className="travel-expense-tab-c">
                                                <h3 className="travel-expense-form-title">
                                                    Xác Nhận Hoàn Ứng
                                                </h3>

                                                {/* Settlement Information */}
                                                <div className="travel-expense-settlement-info">
                                                    <div className="travel-expense-settlement-info-item">
                                                        <span className="travel-expense-settlement-info-label">Chi phí thực tế</span>
                                                        <span className="travel-expense-settlement-info-value amount">
                                                            {selectedRequestFull.settlement.actualExpense?.toLocaleString('vi-VN')} VND
                                                        </span>
                                                    </div>
                                                    {selectedRequestFull.settlement.notes && (
                                                        <div className="travel-expense-settlement-info-item">
                                                            <span className="travel-expense-settlement-info-label">Ghi chú</span>
                                                            <span className="travel-expense-settlement-info-value">
                                                                {selectedRequestFull.settlement.notes}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {selectedRequestFull.attachments && selectedRequestFull.attachments.length > 0 && (
                                                        <div className="travel-expense-settlement-info-item">
                                                            <span className="travel-expense-settlement-info-label">Hóa đơn/Chứng từ</span>
                                                            <div className="travel-expense-settlement-attachments">
                                                                {selectedRequestFull.attachments.map((att, idx) => (
                                                                    <a
                                                                        key={idx}
                                                                        href={`${process.env.REACT_APP_API_URL || ''}/uploads/travel-expenses/${att.filePath.split(/[/\\]/).pop()}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="travel-expense-settlement-attachment-link"
                                                                    >
                                                                        <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                        </svg>
                                                                        {att.fileName}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Confirm Button */}
                                                <div className="travel-expense-form-actions">
                                                    <button
                                                        type="button"
                                                        className="travel-expense-primary-button"
                                                        onClick={handleConfirmSettlement}
                                                    >
                                                        ✅ Xác Nhận Hoàn Ứng
                                                    </button>
                                                </div>
                                            </div>
                                        ) : selectedRequestFull ? (
                                            <div className="travel-expense-tab-c">
                                                <h3 className="travel-expense-form-title">
                                                    Xác Nhận Hoàn Ứng
                                                </h3>
                                                <p className="travel-expense-settlement-empty-message">
                                                    Nhân viên chưa gửi báo cáo hoàn ứng cho yêu cầu này.
                                                </p>
                                            </div>
                                        ) : null}
                                    </div>
                                </>
                            ) : (
                                <div className="travel-expense-no-selection">
                                    Vui lòng chọn một yêu cầu từ danh sách để xem chi tiết
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TravelExpenseManagement;
