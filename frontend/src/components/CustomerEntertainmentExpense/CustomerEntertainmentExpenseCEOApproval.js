import React, { useState, useEffect } from 'react';
import { employeesAPI, customerEntertainmentExpensesAPI } from '../../services/api';
import './CustomerEntertainmentExpenseApproval.css';

const CustomerEntertainmentExpenseCEOApproval = ({ currentUser, showToast, showConfirm }) => {
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [ceoNotes, setCeoNotes] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedItemFiles, setSelectedItemFiles] = useState(null);
    const [isFileModalOpen, setIsFileModalOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Helper function to check if current user is the CEO for a request
    const isRequestForCurrentCEO = (request) => {
        if (!currentUser) {
            return false;
        }

        // Check if request is assigned to current user as CEO (ceoId)
        if (request.ceoId && currentUser.id) {
            if (parseInt(request.ceoId) === parseInt(currentUser.id)) {
                return true;
            }
        }

        // Check by CEO name (Lê Thanh Tùng)
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

        const ceoNames = ['lê thanh tùng', 'le thanh tung'];
        const isCEO = ceoNames.some(name => {
            const nameNoAccents = removeVietnameseAccents(name);
            return currentUserName.includes(name) || currentUserNameNoAccents.includes(nameNoAccents);
        });

        // Nếu user là CEO, hiển thị tất cả đơn PENDING_CEO
        return isCEO;
    };

    // Fetch requests from API
    useEffect(() => {
        const fetchRequests = async (silent = false) => {
            if (!currentUser) return;

            if (!silent) {
                setLoading(true);
                setIsRefreshing(true);
            }
            try {
                const params = {
                    status: 'PENDING_CEO'
                };

                // Filter by ceoId if available
                if (currentUser.id) {
                    params.ceoId = currentUser.id;
                }

                const response = await customerEntertainmentExpensesAPI.getAll(params);

                if (response.data && response.data.success) {
                    const allRequests = response.data.data || [];

                    // Map API response to component format
                    const mappedRequests = allRequests
                        .filter(request => isRequestForCurrentCEO(request))
                        .map(request => ({
                            id: request.id,
                            requestNumber: request.request_number,
                            requester: request.requester_name || '',
                            requesterDepartment: request.requester_department || '',
                            branch: request.branch,
                            startDate: request.start_date,
                            endDate: request.end_date,
                            ceoId: request.ceo_id,
                            ceoName: request.ceo_name,
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
                if (!silent) {
                    showToast?.('Lỗi khi tải danh sách yêu cầu', 'error');
                }
                setRequests([]);
                setSelectedRequest(null);
            } finally {
                if (!silent) {
                    setLoading(false);
                    setTimeout(() => setIsRefreshing(false), 300);
                }
            }
        };

        fetchRequests(false); // Lần đầu hiển thị loading
        // Realtime update: polling mỗi 5 giây (silent mode)
        const interval = setInterval(() => fetchRequests(true), 5000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.id]);

    // Calculate total amount from expense items
    const calculateTotalAmount = (expenseItems) => {
        if (!expenseItems || expenseItems.length === 0) return 0;
        return expenseItems.reduce((total, item) => {
            return total + (parseFloat(item.amount) || 0);
        }, 0);
    };

    // Calculate amount to pay (supplement or refund)
    const calculateAmountToPay = (totalAmount, advanceAmount) => {
        const difference = totalAmount - advanceAmount;
        if (difference > 0) {
            return {
                label: 'Cần Bổ Sung',
                amount: difference,
                isPositive: true
            };
        } else if (difference < 0) {
            return {
                label: 'Cần Hoàn Lại',
                amount: Math.abs(difference),
                isPositive: false
            };
        } else {
            return {
                label: 'Đã Đủ',
                amount: 0,
                isPositive: true
            };
        }
    };

    // Get month/year description
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

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
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
            const response = await customerEntertainmentExpensesAPI.ceoApprove(selectedRequest.id, {
                ceoNotes: ceoNotes || '',
                ceoId: currentUser.id
            });

            if (response.data && response.data.success) {
                showToast?.('Đã duyệt phiếu chi thành công!', 'success');

                // Remove approved request from list
                setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));

                // Reset form
                setCeoNotes('');
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

    // Handle reject
    const handleReject = async () => {
        if (!selectedRequest) return;

        if (showConfirm) {
            const confirmed = await showConfirm({
                title: 'Xác nhận từ chối',
                message: 'Bạn có chắc chắn muốn từ chối phiếu chi này không?',
                confirmText: 'Từ chối',
                cancelText: 'Hủy'
            });
            if (!confirmed) return;
        }

        setIsProcessing(true);
        try {
            const response = await customerEntertainmentExpensesAPI.ceoReject(selectedRequest.id, {
                ceoNotes: ceoNotes || '',
                ceoId: currentUser.id
            });

            if (response.data && response.data.success) {
                showToast?.('Đã từ chối phiếu chi!', 'success');

                // Remove rejected request from list
                setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));

                // Reset form
                setCeoNotes('');
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

    // Filter requests by search query
    const filteredRequests = requests.filter(request => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            request.requestNumber?.toLowerCase().includes(query) ||
            request.requester?.toLowerCase().includes(query) ||
            request.branch?.toLowerCase().includes(query)
        );
    });


    if (loading && requests.length === 0) {
        return (
            <div className="customer-entertainment-expense-approval-container">
                <div className="customer-entertainment-expense-approval-loading">
                    <div className="loading-spinner"></div>
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
                                DUYỆT CHI PHÍ TIẾP KHÁCH
                                {isRefreshing && (
                                    <span style={{ marginLeft: '10px', fontSize: '0.7em', color: '#10b981', opacity: 0.8 }}>
                                        ● Đang cập nhật...
                                    </span>
                                )}
                            </h1>
                            <p className="customer-entertainment-expense-approval-subtitle">
                                Bước 2: Tổng Giám Đốc Duyệt
                                <span style={{ marginLeft: '10px', fontSize: '0.85em', opacity: 0.7 }}>
                                    {!isRefreshing && '● Cập nhật tự động mỗi 5 giây'}
                                </span>
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
                                                <span className={`customer-entertainment-expense-approval-request-item-status ${request.status === 'PENDING_CEO' ? 'pending' : request.status === 'REQUEST_CORRECTION' ? 'correction' : ''}`}>
                                                    {request.status === 'PENDING_CEO' ? 'CHỜ DUYỆT' : request.status === 'REQUEST_CORRECTION' ? 'YC BỔ SUNG' : request.status}
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
                                            <span>Tình trạng: Chờ Tổng Giám Đốc Duyệt</span>
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
                                                                                Xem {item.files.length} File(s)
                                                                            </button>
                                                                        ) : (
                                                                            <span className="customer-entertainment-expense-approval-no-files">
                                                                                Không có file
                                                                            </span>
                                                                        )}
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

                                            {/* CEO Notes */}
                                            <div className="customer-entertainment-expense-approval-notes-section">
                                                <label className="customer-entertainment-expense-approval-notes-label">
                                                    Ghi chú của Tổng Giám đốc (Bắt buộc khi từ chối):
                                                </label>
                                                <textarea
                                                    className="customer-entertainment-expense-approval-notes-textarea"
                                                    value={ceoNotes}
                                                    onChange={(e) => setCeoNotes(e.target.value)}
                                                    placeholder="Nhập ghi chú phê duyệt hoặc lý do từ chối..."
                                                    rows="5"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="customer-entertainment-expense-approval-actions">
                                        <button
                                            className="customer-entertainment-expense-approval-btn approve"
                                            onClick={handleApprove}
                                            disabled={isProcessing}
                                        >
                                            <span className="customer-entertainment-expense-approval-btn-icon">✓</span>
                                            <span className="customer-entertainment-expense-approval-btn-text">DUYỆT CHI</span>
                                        </button>
                                        <button
                                            className="customer-entertainment-expense-approval-btn reject"
                                            onClick={handleReject}
                                            disabled={isProcessing}
                                        >
                                            <span className="customer-entertainment-expense-approval-btn-icon">✕</span>
                                            <span className="customer-entertainment-expense-approval-btn-text">TỪ CHỐI</span>
                                        </button>
                                    </div>
                                    <div className="customer-entertainment-expense-approval-action-description">
                                        Hành động Duyệt sẽ chuyển Phiếu chi sang cho Kế toán để xử lý thanh toán.
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
                                                href={`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}${file.url}`}
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

export default CustomerEntertainmentExpenseCEOApproval;

