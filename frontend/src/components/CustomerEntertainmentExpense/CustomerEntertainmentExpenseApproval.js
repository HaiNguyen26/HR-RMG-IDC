import React, { useState, useEffect } from 'react';
import { employeesAPI, customerEntertainmentExpensesAPI } from '../../services/api';
import './CustomerEntertainmentExpenseApproval.css';

const CustomerEntertainmentExpenseApproval = ({ currentUser, showToast, showConfirm }) => {
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [directorNotes, setDirectorNotes] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedItemFiles, setSelectedItemFiles] = useState(null);
    const [isFileModalOpen, setIsFileModalOpen] = useState(false);

    // Helper function to check if current user is the branch director for a request
    const isRequestForCurrentDirector = (request) => {
        // If no current user, don't show any requests
        if (!currentUser) {
            return false;
        }

        // If request doesn't have branch director info, show it (for backward compatibility)
        if (!request.branchDirectorId && !request.branchDirectorName) {
            return true;
        }

        const removeVietnameseAccents = (str) => {
            if (!str) return '';
            return str
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/Đ/g, 'D');
        };

        const currentUserName = (currentUser.hoTen || currentUser.username || '').trim().toLowerCase();
        const currentUserNameNoAccents = removeVietnameseAccents(currentUserName);
        const requestDirectorName = (request.branchDirectorName || '').trim().toLowerCase();
        const requestDirectorNameNoAccents = removeVietnameseAccents(requestDirectorName);


        // Check by ID if available
        if (request.branchDirectorId && currentUser.id) {
            if (parseInt(request.branchDirectorId) === parseInt(currentUser.id)) {
                return true;
            }
        }

        // Check by name (with and without accents) - more flexible matching
        if (requestDirectorName) {
            // Normalize both names for comparison
            const normalizeName = (name) => {
                return name.replace(/\s+/g, ' ').trim();
            };

            const normalizedCurrentName = normalizeName(currentUserName);
            const normalizedCurrentNameNoAccents = normalizeName(currentUserNameNoAccents);
            const normalizedRequestName = normalizeName(requestDirectorName);
            const normalizedRequestNameNoAccents = normalizeName(requestDirectorNameNoAccents);

            const nameMatch =
                normalizedCurrentName === normalizedRequestName ||
                normalizedCurrentNameNoAccents === normalizedRequestNameNoAccents ||
                normalizedCurrentName.includes(normalizedRequestName) ||
                normalizedCurrentNameNoAccents.includes(normalizedRequestNameNoAccents) ||
                normalizedRequestName.includes(normalizedCurrentName) ||
                normalizedRequestNameNoAccents.includes(normalizedCurrentNameNoAccents);

            return nameMatch;
        }

        return false;
    };

    // Fetch requests from API
    useEffect(() => {
        const fetchRequests = async () => {
            if (!currentUser) return;

            try {
                setLoading(true);
                const params = {
                    branchDirectorId: currentUser.id,
                    status: 'PENDING_BRANCH_DIRECTOR'
                };

                const response = await customerEntertainmentExpensesAPI.getAll(params);

                if (response.data && response.data.success) {
                    const allRequests = response.data.data || [];

                    // Map API response to component format
                    const mappedRequests = allRequests.map(request => ({
                        id: request.id,
                        requestNumber: request.request_number,
                        requester: request.requester_name || '',
                        requesterDepartment: request.requester_department || '',
                        branch: request.branch,
                        startDate: request.start_date,
                        endDate: request.end_date,
                        branchDirectorId: request.branch_director_id,
                        branchDirectorName: request.branch_director_name,
                        advanceAmount: parseFloat(request.advance_amount) || 0,
                        expenseItems: (request.expenseItems || []).map(item => ({
                            id: item.id,
                            invoiceNumber: item.invoice_number,
                            amount: parseFloat(item.amount) || 0,
                            companyName: item.company_name,
                            content: item.content,
                            files: (item.files || []).map(file => ({
                                id: file.id,
                                name: file.name,
                                url: file.url,
                                size: file.size,
                                type: file.type
                            }))
                        })),
                        status: request.status,
                        createdAt: request.created_at
                    }));

                    setRequests(mappedRequests);
                    if (mappedRequests.length > 0) {
                        setSelectedRequest(mappedRequests[0]);
                    } else {
                        setSelectedRequest(null);
                    }
                } else {
                    setRequests([]);
                    setSelectedRequest(null);
                }
            } catch (error) {
                console.error('Error fetching requests:', error);
                showToast?.('Lỗi khi tải danh sách yêu cầu', 'error');
                setRequests([]);
                setSelectedRequest(null);
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, [currentUser, showToast]);

    // Calculate total amount from expense items
    const calculateTotalAmount = (expenseItems) => {
        if (!expenseItems || expenseItems.length === 0) return 0;
        return expenseItems.reduce((total, item) => {
            return total + (parseFloat(item.amount) || 0);
        }, 0);
    };

    // Calculate amount to pay more and determine label
    const calculateAmountToPay = (totalAmount, advanceAmount) => {
        const difference = totalAmount - advanceAmount;
        if (difference > 0) {
            return {
                amount: difference,
                label: 'Công ty phải hoàn trả',
                isPositive: true
            };
        } else if (difference < 0) {
            return {
                amount: Math.abs(difference),
                label: 'Nhân viên cần trả lại',
                isPositive: false
            };
        } else {
            return {
                amount: 0,
                label: 'Đã cân bằng',
                isPositive: true
            };
        }
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Get month and year from date range
    const getMonthYearDescription = (startDate, endDate) => {
        if (!startDate || !endDate) return '';
        const start = new Date(startDate);
        const end = new Date(endDate);
        const startMonth = start.getMonth() + 1;
        const startYear = start.getFullYear();
        const endMonth = end.getMonth() + 1;
        const endYear = end.getFullYear();

        if (startMonth === endMonth && startYear === endYear) {
            return `${startMonth}/${startYear}`;
        } else {
            return `${startMonth}/${startYear} - ${endMonth}/${endYear}`;
        }
    };

    // Handle approve
    const handleApprove = async () => {
        if (!selectedRequest) return;

        if (showConfirm) {
            const confirmed = await showConfirm({
                title: 'Xác nhận duyệt',
                message: 'Bạn có chắc chắn muốn duyệt phiếu chi này không?',
                confirmText: 'Duyệt',
                cancelText: 'Hủy'
            });
            if (!confirmed) return;
        }

        setIsProcessing(true);
        try {
            const response = await customerEntertainmentExpensesAPI.approve(selectedRequest.id, {
                directorNotes: directorNotes || ''
            });

            if (response.data && response.data.success) {
                showToast?.('Đã duyệt phiếu chi thành công!', 'success');

                // Remove approved request from list
                setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));

                // Reset form
                setDirectorNotes('');
                if (requests.length > 1) {
                    const remaining = requests.filter(r => r.id !== selectedRequest.id);
                    setSelectedRequest(remaining[0] || null);
                } else {
                    setSelectedRequest(null);
                }
            } else {
                showToast?.('Không thể duyệt phiếu chi. Vui lòng thử lại.', 'error');
            }
        } catch (error) {
            console.error('Error approving request:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Không thể duyệt phiếu chi. Vui lòng thử lại.';
            showToast?.(errorMessage, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle request correction
    const handleRequestCorrection = async () => {
        if (!selectedRequest) return;

        if (!directorNotes.trim()) {
            showToast?.('Vui lòng nhập ghi chú yêu cầu chỉnh sửa', 'warning');
            return;
        }

        if (showConfirm) {
            const confirmed = await showConfirm({
                title: 'Xác nhận yêu cầu chỉnh sửa',
                message: 'Bạn có chắc chắn muốn yêu cầu chỉnh sửa phiếu chi này không?',
                confirmText: 'Gửi yêu cầu',
                cancelText: 'Hủy'
            });
            if (!confirmed) return;
        }

        setIsProcessing(true);
        try {
            const response = await customerEntertainmentExpensesAPI.requestCorrection(selectedRequest.id, {
                directorNotes: directorNotes
            });

            if (response.data && response.data.success) {
                showToast?.('Đã gửi yêu cầu chỉnh sửa thành công!', 'success');

                // Remove request from list (it will be updated by employee)
                setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));

                // Reset form
                setDirectorNotes('');
                if (requests.length > 1) {
                    const remaining = requests.filter(r => r.id !== selectedRequest.id);
                    setSelectedRequest(remaining[0] || null);
                } else {
                    setSelectedRequest(null);
                }
            } else {
                showToast?.('Không thể gửi yêu cầu chỉnh sửa. Vui lòng thử lại.', 'error');
            }
        } catch (error) {
            console.error('Error requesting correction:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Không thể gửi yêu cầu chỉnh sửa. Vui lòng thử lại.';
            showToast?.(errorMessage, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle reject
    const handleReject = async () => {
        if (!selectedRequest) return;

        if (!directorNotes.trim()) {
            showToast?.('Vui lòng nhập lý do từ chối', 'warning');
            return;
        }

        if (showConfirm) {
            const confirmed = await showConfirm({
                title: 'Xác nhận từ chối',
                message: 'Bạn có chắc chắn muốn từ chối phiếu chi này không?',
                confirmText: 'Từ chối',
                cancelText: 'Hủy',
                type: 'warning'
            });
            if (!confirmed) return;
        }

        setIsProcessing(true);
        try {
            const response = await customerEntertainmentExpensesAPI.reject(selectedRequest.id, {
                directorNotes: directorNotes
            });

            if (response.data && response.data.success) {
                showToast?.('Đã từ chối phiếu chi thành công!', 'success');

                // Remove rejected request from list
                setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));

                // Reset form
                setDirectorNotes('');
                if (requests.length > 1) {
                    const remaining = requests.filter(r => r.id !== selectedRequest.id);
                    setSelectedRequest(remaining[0] || null);
                } else {
                    setSelectedRequest(null);
                }
            } else {
                showToast?.('Không thể từ chối phiếu chi. Vui lòng thử lại.', 'error');
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Không thể từ chối phiếu chi. Vui lòng thử lại.';
            showToast?.(errorMessage, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // Filter requests
    const filteredRequests = requests.filter(request => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            request.requestNumber?.toLowerCase().includes(query) ||
            request.requester?.toLowerCase().includes(query) ||
            request.branch?.toLowerCase().includes(query)
        );
    });

    if (loading) {
        return (
            <div className="customer-entertainment-expense-approval-container">
                <div className="customer-entertainment-expense-approval-loading">
                    <div className="spinner"></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="customer-entertainment-expense-approval-container">
            <div className="customer-entertainment-expense-approval-content">
                {/* Header */}
                <div className="customer-entertainment-expense-approval-header">
                    <div className="customer-entertainment-expense-approval-header-content">
                        <div className="customer-entertainment-expense-approval-icon-wrapper">
                            <svg className="customer-entertainment-expense-approval-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z">
                                </path>
                            </svg>
                        </div>
                        <div className="customer-entertainment-expense-approval-header-text">
                            <h1 className="customer-entertainment-expense-approval-title">
                                XEM XÉT VÀ PHÊ DUYỆT CHI PHÍ
                            </h1>
                            <p className="customer-entertainment-expense-approval-subtitle">
                                Bước 2: Giám đốc Chi nhánh (Lần Duyệt 1)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Container: White container for both columns */}
                <div className="customer-entertainment-expense-approval-main-container">
                    {/* Two Column Layout */}
                    <div className="customer-entertainment-expense-approval-layout">
                        {/* Left Column: Request List Container */}
                        <div className="customer-entertainment-expense-approval-sidebar-container">
                            <div className="customer-entertainment-expense-approval-sidebar">
                                <div className="customer-entertainment-expense-approval-sidebar-header">
                                    <h2 className="customer-entertainment-expense-approval-sidebar-title">
                                        YÊU CẦU CHỜ DUYỆT (Lần 1)
                                    </h2>
                                </div>
                                <div className="customer-entertainment-expense-approval-search">
                                    <input
                                        type="text"
                                        className="customer-entertainment-expense-approval-search-input"
                                        placeholder="Tìm theo Mã YC, Người Yêu Cầu..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="customer-entertainment-expense-approval-request-list">
                                    {filteredRequests.length > 0 ? (
                                        filteredRequests.map(request => (
                                            <div
                                                key={request.id}
                                                className={`customer-entertainment-expense-approval-request-item ${selectedRequest?.id === request.id ? 'active' : ''}`}
                                                onClick={() => setSelectedRequest(request)}
                                            >
                                                <div className="customer-entertainment-expense-approval-request-item-header">
                                                    <span className="customer-entertainment-expense-approval-request-item-code">
                                                        {request.requestNumber}
                                                    </span>
                                                    <span className={`customer-entertainment-expense-approval-request-item-status ${request.status === 'PENDING_BRANCH_DIRECTOR' ? 'pending' : request.status === 'REQUEST_CORRECTION' ? 'correction' : ''}`}>
                                                        {request.status === 'PENDING_BRANCH_DIRECTOR' ? 'CHỜ DUYỆT' : request.status === 'REQUEST_CORRECTION' ? 'YC BỔ SUNG' : request.status}
                                                    </span>
                                                </div>
                                                <div className="customer-entertainment-expense-approval-request-item-info">
                                                    <p className="customer-entertainment-expense-approval-request-item-requester">
                                                        {request.requester} ({request.requesterDepartment})
                                                    </p>
                                                    <p className="customer-entertainment-expense-approval-request-item-purpose">
                                                        {request.expenseItems && request.expenseItems.length > 0
                                                            ? `${request.expenseItems.length} mục chi`
                                                            : 'Chưa có mục chi'}
                                                    </p>
                                                    <p className="customer-entertainment-expense-approval-request-item-cost">
                                                        Chi: {formatCurrency(calculateTotalAmount(request.expenseItems))}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="customer-entertainment-expense-approval-empty-list">
                                            <p>Không có yêu cầu nào</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Request Details Container */}
                        <div className="customer-entertainment-expense-approval-detail-container">
                            <div className="customer-entertainment-expense-approval-detail-panel">
                                {selectedRequest ? (
                                    <>
                                        {/* Header */}
                                        <div className="customer-entertainment-expense-approval-detail-header">
                                            <h1 className="customer-entertainment-expense-approval-detail-title">
                                                BÁO CÁO QUYẾT TOÁN {selectedRequest.requestNumber}
                                            </h1>
                                            <div className="customer-entertainment-expense-approval-detail-meta">
                                                <span>Ngày tạo: {formatDate(selectedRequest.createdAt)}</span>
                                                <span>|</span>
                                                <span>Tình trạng: Chờ Giám đốc Chi nhánh Duyệt</span>
                                            </div>
                                        </div>

                                        {/* Section I: Chi Tiết Yêu Cầu */}
                                        <div className="customer-entertainment-expense-approval-section">
                                            <div className="customer-entertainment-expense-approval-section-header">
                                                <div className="customer-entertainment-expense-approval-section-bar"></div>
                                                <h2 className="customer-entertainment-expense-approval-section-title">
                                                    I. Chi Tiết Yêu Cầu
                                                </h2>
                                            </div>
                                            <div className="customer-entertainment-expense-approval-section-content">
                                                <div className="customer-entertainment-expense-approval-details-grid">
                                                    <div className="customer-entertainment-expense-approval-detail-item">
                                                        <span className="customer-entertainment-expense-approval-detail-label">
                                                            Người Yêu Cầu:
                                                        </span>
                                                        <span className="customer-entertainment-expense-approval-detail-value">
                                                            {selectedRequest.requester} (ID: {selectedRequest.id})
                                                        </span>
                                                    </div>
                                                    <div className="customer-entertainment-expense-approval-detail-item">
                                                        <span className="customer-entertainment-expense-approval-detail-label">
                                                            Chi Nhánh:
                                                        </span>
                                                        <span className="customer-entertainment-expense-approval-detail-value">
                                                            {selectedRequest.branch}
                                                        </span>
                                                    </div>
                                                    <div className="customer-entertainment-expense-approval-detail-item">
                                                        <span className="customer-entertainment-expense-approval-detail-label">
                                                            Thời gian Chi:
                                                        </span>
                                                        <span className="customer-entertainment-expense-approval-detail-value">
                                                            {formatDate(selectedRequest.startDate)} - {formatDate(selectedRequest.endDate)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="customer-entertainment-expense-approval-detail-item full-width">
                                                    <span className="customer-entertainment-expense-approval-detail-label">
                                                        Mô tả:
                                                    </span>
                                                    <span className="customer-entertainment-expense-approval-detail-value">
                                                        Tổng hợp chi công tác & tiếp khách tháng {getMonthYearDescription(selectedRequest.startDate, selectedRequest.endDate)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section II: Tóm Tắt Chi Phí */}
                                        <div className="customer-entertainment-expense-approval-section">
                                            <div className="customer-entertainment-expense-approval-section-header">
                                                <div className="customer-entertainment-expense-approval-section-bar"></div>
                                                <h2 className="customer-entertainment-expense-approval-section-title">
                                                    II. Tóm Tắt Chi Phí & Tính Hợp Lý
                                                </h2>
                                            </div>
                                            <div className="customer-entertainment-expense-approval-section-content">
                                                <div className="customer-entertainment-expense-approval-summary-cards">
                                                    <div className="customer-entertainment-expense-approval-summary-card total">
                                                        <div className="customer-entertainment-expense-approval-summary-label">
                                                            Tổng Thực Chi
                                                        </div>
                                                        <div className="customer-entertainment-expense-approval-summary-value red">
                                                            {formatCurrency(calculateTotalAmount(selectedRequest.expenseItems))}
                                                        </div>
                                                    </div>
                                                    <div className="customer-entertainment-expense-approval-summary-card advance">
                                                        <div className="customer-entertainment-expense-approval-summary-label">
                                                            Đã Tạm ứng
                                                        </div>
                                                        <div className="customer-entertainment-expense-approval-summary-value blue">
                                                            {formatCurrency(selectedRequest.advanceAmount || 0)}
                                                        </div>
                                                    </div>
                                                    {(() => {
                                                        const totalAmount = calculateTotalAmount(selectedRequest.expenseItems);
                                                        const advanceAmount = selectedRequest.advanceAmount || 0;
                                                        const supplementResult = calculateAmountToPay(totalAmount, advanceAmount);
                                                        return (
                                                            <div className="customer-entertainment-expense-approval-summary-card supplement">
                                                                <div className="customer-entertainment-expense-approval-summary-label">
                                                                    {supplementResult.label}
                                                                </div>
                                                                <div className={`customer-entertainment-expense-approval-summary-value ${supplementResult.isPositive ? 'green' : 'red'}`}>
                                                                    {formatCurrency(supplementResult.amount)}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                                {/* Diễn Giải Chi Tiết */}
                                                <div className="customer-entertainment-expense-approval-explanation-section">
                                                    <div className="customer-entertainment-expense-approval-explanation-label">
                                                        Diễn Giải Chi Tiết:
                                                    </div>
                                                    <div className="customer-entertainment-expense-approval-explanation-content">
                                                        {selectedRequest.explanation || 'Chưa có diễn giải chi tiết'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section III: Chứng Từ Gốc & Hành Động Duyệt */}
                                        <div className="customer-entertainment-expense-approval-section">
                                            <div className="customer-entertainment-expense-approval-section-header">
                                                <div className="customer-entertainment-expense-approval-section-bar"></div>
                                                <h2 className="customer-entertainment-expense-approval-section-title">
                                                    III. Chứng Từ Gốc & Hành Động Duyệt
                                                </h2>
                                            </div>
                                            <div className="customer-entertainment-expense-approval-section-content">
                                                {/* CHI TIẾT CHỨNG TỪ & HÓA ĐƠN GỐC Table */}
                                                {selectedRequest.expenseItems && selectedRequest.expenseItems.length > 0 ? (
                                                    <div className="customer-entertainment-expense-approval-voucher-table-container">
                                                        <table className="customer-entertainment-expense-approval-voucher-table">
                                                            <thead>
                                                                <tr>
                                                                    <th>STT</th>
                                                                    <th>HĐ/Chứng từ</th>
                                                                    <th>Mục Đích Chi</th>
                                                                    <th>Số Tiền (VND)</th>
                                                                    <th>File Đính Kèm</th>
                                                                    <th>Hành Động Duyệt</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {selectedRequest.expenseItems.map((item, index) => (
                                                                    <tr key={item.id}>
                                                                        <td className="customer-entertainment-expense-approval-stt-cell">
                                                                            {index + 1}
                                                                        </td>
                                                                        <td className="customer-entertainment-expense-approval-invoice-cell">
                                                                            {item.invoiceNumber}
                                                                        </td>
                                                                        <td className="customer-entertainment-expense-approval-purpose-cell">
                                                                            {item.content}
                                                                        </td>
                                                                        <td className="customer-entertainment-expense-approval-amount-cell">
                                                                            {formatCurrency(item.amount)}
                                                                        </td>
                                                                        <td className="customer-entertainment-expense-approval-files-cell">
                                                                            {item.files && item.files.length > 0 ? (
                                                                                <button
                                                                                    className="customer-entertainment-expense-approval-files-btn"
                                                                                    onClick={() => {
                                                                                        setSelectedItemFiles(item);
                                                                                        setIsFileModalOpen(true);
                                                                                    }}
                                                                                >
                                                                                    {item.files.length} File(s)
                                                                                </button>
                                                                            ) : (
                                                                                <span className="customer-entertainment-expense-approval-no-files">
                                                                                    Không có file
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td className="customer-entertainment-expense-approval-action-cell">
                                                                            <div className="customer-entertainment-expense-approval-item-actions">
                                                                                <button
                                                                                    className="customer-entertainment-expense-approval-item-btn approve"
                                                                                    onClick={() => {
                                                                                        // TODO: Handle approve item
                                                                                        console.log('Approve item:', item.id);
                                                                                    }}
                                                                                >
                                                                                    DUYỆT
                                                                                </button>
                                                                                <button
                                                                                    className="customer-entertainment-expense-approval-item-btn reject"
                                                                                    onClick={() => {
                                                                                        // TODO: Handle reject item
                                                                                        console.log('Reject item:', item.id);
                                                                                    }}
                                                                                >
                                                                                    TỪ CHỐI
                                                                                </button>
                                                                                <span className="customer-entertainment-expense-approval-item-status">
                                                                                    Không rõ
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div className="customer-entertainment-expense-approval-no-items">
                                                        Không có mục chi nào
                                                    </div>
                                                )}

                                                {/* Director Notes */}
                                                <div className="customer-entertainment-expense-approval-notes-section">
                                                    <label className="customer-entertainment-expense-approval-notes-label">
                                                        Ghi chú của Giám đốc Chi nhánh (Bắt buộc khi từ chối/yêu cầu sửa):
                                                    </label>
                                                    <textarea
                                                        className="customer-entertainment-expense-approval-notes-textarea"
                                                        value={directorNotes}
                                                        onChange={(e) => setDirectorNotes(e.target.value)}
                                                        placeholder="Nhập ghi chú phê duyệt hoặc lý do từ chối yêu cầu chỉnh sửa..."
                                                        rows="5"
                                                    />
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="customer-entertainment-expense-approval-actions">
                                                    <button
                                                        className="customer-entertainment-expense-approval-btn approve"
                                                        onClick={handleApprove}
                                                        disabled={isProcessing}
                                                    >
                                                        <span className="customer-entertainment-expense-approval-btn-icon">✓</span>
                                                        DUYỆT (Chuyển Kế toán)
                                                    </button>
                                                    <button
                                                        className="customer-entertainment-expense-approval-btn request-correction"
                                                        onClick={handleRequestCorrection}
                                                        disabled={isProcessing}
                                                    >
                                                        <span className="customer-entertainment-expense-approval-btn-icon">↶</span>
                                                        YÊU CẦU CHỈNH SỬA
                                                    </button>
                                                    <button
                                                        className="customer-entertainment-expense-approval-btn reject"
                                                        onClick={handleReject}
                                                        disabled={isProcessing}
                                                    >
                                                        <span className="customer-entertainment-expense-approval-btn-icon">✕</span>
                                                        TỪ CHỐI
                                                    </button>
                                                </div>
                                                <div className="customer-entertainment-expense-approval-action-description">
                                                    Hành động Duyệt sẽ chuyển Phiếu chi sang cho Kế toán để tổng hợp và trình Tổng Giám đốc.
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="customer-entertainment-expense-approval-empty-detail">
                                        <p>Vui lòng chọn một yêu cầu từ danh sách bên trái</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* File View Modal */}
            {isFileModalOpen && selectedItemFiles && (
                <div className="customer-entertainment-expense-approval-file-modal-overlay" onClick={() => setIsFileModalOpen(false)}>
                    <div className="customer-entertainment-expense-approval-file-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="customer-entertainment-expense-approval-file-modal-header">
                            <h3>File Đính Kèm - {selectedItemFiles.invoiceNumber}</h3>
                            <button
                                className="customer-entertainment-expense-approval-file-modal-close"
                                onClick={() => setIsFileModalOpen(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="customer-entertainment-expense-approval-file-modal-content">
                            <div className="customer-entertainment-expense-approval-file-modal-info">
                                <p><strong>Hóa đơn/Chứng từ:</strong> {selectedItemFiles.invoiceNumber}</p>
                                <p><strong>Mục đích chi:</strong> {selectedItemFiles.content}</p>
                                <p><strong>Số tiền:</strong> {formatCurrency(selectedItemFiles.amount)}</p>
                            </div>
                            <div className="customer-entertainment-expense-approval-file-modal-list">
                                <h4>Danh sách file ({selectedItemFiles.files.length}):</h4>
                                <ul>
                                    {selectedItemFiles.files.map((file) => (
                                        <li key={file.id}>
                                            <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="customer-entertainment-expense-approval-file-modal-link"
                                            >
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                </svg>
                                                {file.name}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="customer-entertainment-expense-approval-file-modal-footer">
                            <button
                                className="customer-entertainment-expense-approval-file-modal-close-btn"
                                onClick={() => setIsFileModalOpen(false)}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerEntertainmentExpenseApproval;
