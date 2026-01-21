import React, { useState, useEffect } from 'react';
import { customerEntertainmentExpensesAPI, employeesAPI } from '../../services/api';
import './CustomerEntertainmentExpenseAccountant.css';

const CustomerEntertainmentExpenseAccountant = ({ currentUser, showToast, showConfirm }) => {
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState([]);
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [branchFilter, setBranchFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [branches, setBranches] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedRequestIds, setSelectedRequestIds] = useState(new Set());
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Fetch requests from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch requests with status APPROVED_BRANCH_DIRECTOR
                const response = await customerEntertainmentExpensesAPI.getAll({
                    status: 'APPROVED_BRANCH_DIRECTOR'
                });

                if (response.data && response.data.success) {
                    const apiRequests = response.data.data || [];

                    // Map API response to component format
                    const mappedRequests = apiRequests.map(request => {
                        const totalAmount = (request.expenseItems || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
                        const advanceAmount = parseFloat(request.advance_amount) || 0;
                        const supplementAmount = totalAmount - advanceAmount;

                        return {
                            id: request.id,
                            requestNumber: request.request_number,
                            requester: request.requester_name || '',
                            department: request.requester_department || '',
                            branch: request.branch,
                            startDate: request.start_date,
                            endDate: request.end_date,
                            requestedAmount: totalAmount,
                            approvedAmount: totalAmount,
                            advanceAmount: advanceAmount,
                            supplementAmount: supplementAmount,
                            status: request.status,
                            expenseItems: request.expenseItems || []
                        };
                    });

                    setRequests(mappedRequests);
                    setFilteredRequests(mappedRequests);
                } else {
                    setRequests([]);
                    setFilteredRequests([]);
                }

                // Fetch branches
                const branchesResponse = await employeesAPI.getBranches();
                if (branchesResponse.data && branchesResponse.data.success) {
                    setBranches(branchesResponse.data.data || []);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                showToast?.('Lỗi khi tải dữ liệu', 'error');
                setRequests([]);
                setFilteredRequests([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [showToast]);

    // Calculate totals for selected requests
    const selectedRequests = filteredRequests.filter(req => selectedRequestIds.has(req.id));

    const totals = {
        totalRequested: selectedRequests.length > 0
            ? selectedRequests.reduce((sum, req) => sum + req.requestedAmount, 0)
            : filteredRequests.reduce((sum, req) => sum + req.requestedAmount, 0),
        totalApproved: selectedRequests.length > 0
            ? selectedRequests.reduce((sum, req) => sum + req.approvedAmount, 0)
            : filteredRequests.reduce((sum, req) => sum + req.approvedAmount, 0),
        totalAdvance: selectedRequests.length > 0
            ? selectedRequests.reduce((sum, req) => sum + req.advanceAmount, 0)
            : filteredRequests.reduce((sum, req) => sum + req.advanceAmount, 0),
        totalSupplement: selectedRequests.length > 0
            ? selectedRequests.reduce((sum, req) => sum + req.supplementAmount, 0)
            : filteredRequests.reduce((sum, req) => sum + req.supplementAmount, 0),
        selectedCount: selectedRequests.length
    };

    // Handle checkbox toggle
    const handleToggleRequest = (requestId) => {
        setSelectedRequestIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(requestId)) {
                newSet.delete(requestId);
            } else {
                newSet.add(requestId);
            }
            return newSet;
        });
    };

    // Handle select all
    const handleSelectAll = () => {
        if (selectedRequestIds.size === filteredRequests.length) {
            setSelectedRequestIds(new Set());
        } else {
            setSelectedRequestIds(new Set(filteredRequests.map(req => req.id)));
        }
    };

    // Filter requests
    useEffect(() => {
        let filtered = requests;

        if (branchFilter !== 'all') {
            filtered = filtered.filter(req => req.branch === branchFilter);
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(req => req.status === statusFilter);
        }

        setFilteredRequests(filtered);
    }, [branchFilter, statusFilter, requests]);

    const apiBaseUrl = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/hr/api' : 'http://localhost:3000/api');

    const buildFileUrl = (url) => {
        if (!url) return '#';
        if (/^https?:\/\//i.test(url)) return url;
        if (url.startsWith('/api/')) {
            return `${apiBaseUrl.replace(/\/api$/, '')}${url}`;
        }
        if (url.startsWith('/uploads/')) {
            return `${apiBaseUrl}${url}`;
        }
        return `${apiBaseUrl}/${url.replace(/^\/+/, '')}`;
    };

    const formatCurrency = (amount) => {
        // Hiển thị số âm với dấu trừ
        const formatted = new Intl.NumberFormat('vi-VN').format(Math.abs(amount));
        return amount < 0 ? `-${formatted} VND` : `${formatted} VND`;
    };

    const formatDate = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('vi-VN');
    };

    const handleSubmitReport = async () => {
        if (selectedRequests.length === 0) {
            showToast?.('Vui lòng chọn ít nhất một phiếu chi để gửi báo cáo', 'warning');
            return;
        }

        const confirmed = await showConfirm?.({
            title: 'Xác nhận gửi báo cáo',
            message: `Bạn có chắc chắn muốn gửi báo cáo tổng hợp ${selectedRequests.length} phiếu chi đã chọn cho Tổng Giám đốc duyệt?`,
            confirmText: 'Gửi báo cáo',
            cancelText: 'Hủy'
        });

        if (confirmed) {
            setIsSubmitting(true);
            try {
                // TODO: API call để tạo báo cáo tổng hợp với các request IDs đã chọn
                const requestIds = Array.from(selectedRequestIds);
                console.log('Sending report with selected request IDs:', requestIds);

                // Process each selected request
                for (const requestId of requestIds) {
                    await customerEntertainmentExpensesAPI.accountantProcess(requestId, {
                        accountantId: currentUser?.id,
                        accountantNotes: 'Đã tổng hợp và gửi trình TGĐ duyệt'
                    });
                }

                showToast?.(`Đã gửi báo cáo tổng hợp ${selectedRequests.length} phiếu chi cho Tổng Giám đốc thành công!`, 'success');

                // Clear selection and refresh
                setSelectedRequestIds(new Set());
                // Refresh data
                const response = await customerEntertainmentExpensesAPI.getAll({
                    status: 'APPROVED_BRANCH_DIRECTOR'
                });
                if (response.data && response.data.success) {
                    const apiRequests = response.data.data || [];
                        const mappedRequests = apiRequests.map(request => {
                        const totalAmount = (request.expenseItems || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
                        const advanceAmount = parseFloat(request.advance_amount) || 0;
                        const supplementAmount = totalAmount - advanceAmount;
                        return {
                            id: request.id,
                            requestNumber: request.request_number,
                            requester: request.requester_name || '',
                            department: request.requester_department || '',
                            branch: request.branch,
                                startDate: request.start_date,
                                endDate: request.end_date,
                            requestedAmount: totalAmount,
                            approvedAmount: totalAmount,
                            advanceAmount: advanceAmount,
                            supplementAmount: supplementAmount,
                                status: request.status,
                                expenseItems: request.expenseItems || []
                        };
                    });
                    setRequests(mappedRequests);
                }
            } catch (error) {
                console.error('Error submitting report:', error);
                showToast?.('Lỗi khi gửi báo cáo: ' + (error.message || 'Unknown error'), 'error');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    if (loading) {
        return (
            <div className="customer-entertainment-expense-accountant-container">
                <div className="customer-entertainment-expense-accountant-loading">
                    <div className="spinner"></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="customer-entertainment-expense-accountant-container">
            <div className="customer-entertainment-expense-accountant-content">
                {/* Header */}
                <div className="customer-entertainment-expense-accountant-header">
                    <div className="customer-entertainment-expense-accountant-header-content">
                        <div className="customer-entertainment-expense-accountant-icon-wrapper">
                            <svg className="customer-entertainment-expense-accountant-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </div>
                        <div className="customer-entertainment-expense-accountant-header-text">
                            <h1 className="customer-entertainment-expense-accountant-title">
                                BÁO CÁO TỔNG HỢP QUYẾT TOÁN CHI PHÍ
                            </h1>
                            <p className="customer-entertainment-expense-accountant-subtitle">
                                Phòng Kế toán: Tổng hợp các Phiếu Chi đã được GĐ Chi nhánh Duyệt
                            </p>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="customer-entertainment-expense-accountant-summary-cards">
                    <div className="customer-entertainment-expense-accountant-summary-card red">
                        <div className="customer-entertainment-expense-accountant-summary-label">
                            Tổng Thực Chi (Yêu Cầu)
                        </div>
                        <div className="customer-entertainment-expense-accountant-summary-value red">
                            {formatCurrency(totals.totalRequested)}
                        </div>
                        <div className="customer-entertainment-expense-accountant-summary-description">
                            {totals.selectedCount > 0
                                ? `Tổng giá trị của ${totals.selectedCount} phiếu được chọn`
                                : `Tổng giá trị ban đầu của ${filteredRequests.length} yêu cầu`}
                        </div>
                    </div>
                    <div className="customer-entertainment-expense-accountant-summary-card green">
                        <div className="customer-entertainment-expense-accountant-summary-label">
                            Tổng Số Tiền Được Duyệt
                        </div>
                        <div className="customer-entertainment-expense-accountant-summary-value green">
                            {formatCurrency(totals.totalApproved)}
                        </div>
                        <div className="customer-entertainment-expense-accountant-summary-description">
                            {totals.selectedCount > 0
                                ? `Tổng giá trị được duyệt của ${totals.selectedCount} phiếu được chọn`
                                : 'Tổng giá trị được GĐCN phê duyệt'}
                        </div>
                    </div>
                    <div className="customer-entertainment-expense-accountant-summary-card blue">
                        <div className="customer-entertainment-expense-accountant-summary-label">
                            Tổng Cần Thanh Toán Bổ Sung
                        </div>
                        <div className="customer-entertainment-expense-accountant-summary-value blue">
                            {formatCurrency(totals.totalSupplement)}
                        </div>
                        <div className="customer-entertainment-expense-accountant-summary-description">
                            {totals.selectedCount > 0
                                ? `Tổng cần bổ sung của ${totals.selectedCount} phiếu được chọn`
                                : 'Số tiền cần chi ra thêm sau khi đối trừ tạm ứng'}
                        </div>
                    </div>
                </div>

                {/* Filters and Action */}
                <div className="customer-entertainment-expense-accountant-filters">
                    <div className="customer-entertainment-expense-accountant-filter-group">
                        <label className="customer-entertainment-expense-accountant-filter-label">
                            Lọc theo Chi nhánh
                        </label>
                        <select
                            className="customer-entertainment-expense-accountant-filter-select"
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                        >
                            <option value="all">Tất cả</option>
                            {branches.map(branch => (
                                <option key={branch} value={branch}>{branch}</option>
                            ))}
                        </select>
                    </div>
                    <div className="customer-entertainment-expense-accountant-filter-group">
                        <label className="customer-entertainment-expense-accountant-filter-label">
                            Lọc theo Trạng thái
                        </label>
                        <select
                            className="customer-entertainment-expense-accountant-filter-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Tất cả</option>
                            <option value="APPROVED_BRANCH_DIRECTOR">Đã duyệt GĐCN</option>
                        </select>
                    </div>
                    <button
                        className="customer-entertainment-expense-accountant-submit-btn"
                        onClick={handleSubmitReport}
                        disabled={isSubmitting || selectedRequests.length === 0}
                    >
                        {isSubmitting
                            ? 'Đang gửi...'
                            : `Gửi Báo Cáo Trình TGĐ Duyệt (${selectedRequests.length} phiếu) →`}
                    </button>
                </div>

                {/* Table */}
                <div className="customer-entertainment-expense-accountant-table-container">
                    <div className="customer-entertainment-expense-accountant-table-wrapper">
                        <table className="customer-entertainment-expense-accountant-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={filteredRequests.length > 0 && selectedRequestIds.size === filteredRequests.length}
                                            onChange={handleSelectAll}
                                            className="customer-entertainment-expense-accountant-checkbox"
                                        />
                                    </th>
                                    <th style={{ textAlign: 'left' }}>Mã YC</th>
                                    <th style={{ textAlign: 'left' }}>Người Yêu Cầu</th>
                                    <th style={{ textAlign: 'right' }}>Thực Chi (Y/C)</th>
                                    <th style={{ textAlign: 'right' }}>Đã Duyệt (GĐCN)</th>
                                    <th style={{ textAlign: 'right' }}>Đã Tạm Ứng</th>
                                    <th style={{ textAlign: 'right' }}>Cần Bổ Sung</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map(request => (
                                    <tr
                                        key={request.id}
                                        onClick={(event) => {
                                            if (event.target.closest('input')) {
                                                return;
                                            }
                                            setSelectedRequest(request);
                                            setShowDetailModal(true);
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedRequestIds.has(request.id)}
                                                onChange={() => handleToggleRequest(request.id)}
                                                className="customer-entertainment-expense-accountant-checkbox"
                                            />
                                        </td>
                                        <td className="customer-entertainment-expense-accountant-code" style={{ textAlign: 'left' }}>
                                            {request.requestNumber}
                                        </td>
                                        <td style={{ textAlign: 'left' }}>
                                            {request.requester} ({request.department} {request.branch})
                                        </td>
                                        <td className="customer-entertainment-expense-accountant-amount red" style={{ textAlign: 'right' }}>
                                            {formatCurrency(request.requestedAmount)}
                                        </td>
                                        <td className="customer-entertainment-expense-accountant-amount green" style={{ textAlign: 'right' }}>
                                            {formatCurrency(request.approvedAmount)}
                                        </td>
                                        <td className="customer-entertainment-expense-accountant-amount" style={{ textAlign: 'right' }}>
                                            {formatCurrency(request.advanceAmount)}
                                        </td>
                                        <td className={`customer-entertainment-expense-accountant-amount ${request.supplementAmount < 0 ? 'blue' : 'blue'}`} style={{ textAlign: 'right' }}>
                                            {formatCurrency(request.supplementAmount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredRequests.length > 0 && (
                        <div className="customer-entertainment-expense-accountant-total-footer">
                            <table className="customer-entertainment-expense-accountant-table">
                                <tbody>
                                    <tr className="customer-entertainment-expense-accountant-total-row">
                                        <td style={{ width: '40px', textAlign: 'center' }}>
                                            <input type="checkbox" disabled style={{ opacity: 0 }} />
                                        </td>
                                        <td colSpan="2" className="customer-entertainment-expense-accountant-total-label" style={{ textAlign: 'left' }}>
                                            TỔNG CỘNG ({selectedRequests.length > 0 ? selectedRequests.length : filteredRequests.length} Phiếu)
                                        </td>
                                        <td className="customer-entertainment-expense-accountant-total-amount" style={{ textAlign: 'right' }}>
                                            {formatCurrency(totals.totalRequested)}
                                        </td>
                                        <td className="customer-entertainment-expense-accountant-total-amount" style={{ textAlign: 'right' }}>
                                            {formatCurrency(totals.totalApproved)}
                                        </td>
                                        <td className="customer-entertainment-expense-accountant-total-amount" style={{ textAlign: 'right' }}>
                                            {formatCurrency(totals.totalAdvance)}
                                        </td>
                                        <td className="customer-entertainment-expense-accountant-total-amount" style={{ textAlign: 'right' }}>
                                            {formatCurrency(totals.totalSupplement)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                    {filteredRequests.length === 0 && (
                        <div className="customer-entertainment-expense-accountant-empty">
                            <p>Không có phiếu chi nào</p>
                        </div>
                    )}
                </div>

                {showDetailModal && selectedRequest && (
                    <div
                        className="customer-entertainment-expense-accountant-modal-overlay"
                        onClick={() => setShowDetailModal(false)}
                    >
                        <div
                            className="customer-entertainment-expense-accountant-modal"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="customer-entertainment-expense-accountant-modal-header">
                                <h2>
                                    Chi tiết quyết toán - {selectedRequest.requestNumber || `TK-${selectedRequest.id}`}
                                </h2>
                                <button
                                    type="button"
                                    className="customer-entertainment-expense-accountant-modal-close"
                                    onClick={() => setShowDetailModal(false)}
                                >
                                    ×
                                </button>
                            </div>
                            <div className="customer-entertainment-expense-accountant-modal-body">
                                <div className="customer-entertainment-expense-accountant-modal-section">
                                    <h3>Thông tin chung</h3>
                                    <div className="customer-entertainment-expense-accountant-modal-grid">
                                        <div>
                                            <span className="label">Người yêu cầu:</span>
                                            <span className="value">{selectedRequest.requester} ({selectedRequest.department})</span>
                                        </div>
                                        <div>
                                            <span className="label">Chi nhánh:</span>
                                            <span className="value">{selectedRequest.branch}</span>
                                        </div>
                                        <div>
                                            <span className="label">Thời gian:</span>
                                            <span className="value">
                                                {formatDate(selectedRequest.startDate)} → {formatDate(selectedRequest.endDate)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="label">Tạm ứng:</span>
                                            <span className="value">{formatCurrency(selectedRequest.advanceAmount || 0)}</span>
                                        </div>
                                        <div>
                                            <span className="label">Tổng chi:</span>
                                            <span className="value">{formatCurrency(selectedRequest.requestedAmount || 0)}</span>
                                        </div>
                                        <div>
                                            <span className="label">Cần bổ sung:</span>
                                            <span className="value">{formatCurrency(selectedRequest.supplementAmount || 0)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="customer-entertainment-expense-accountant-modal-section">
                                    <h3>Danh sách khoản chi</h3>
                                    {selectedRequest.expenseItems && selectedRequest.expenseItems.length > 0 ? (
                                        <div className="customer-entertainment-expense-accountant-modal-items">
                                            {selectedRequest.expenseItems.map((item, index) => (
                                                <div key={item.id || index} className="customer-entertainment-expense-accountant-modal-item">
                                                    <div>
                                                        <strong>{item.company_name || item.companyName || 'N/A'}</strong>
                                                        <div>{item.content || 'N/A'}</div>
                                                        {item.invoice_number || item.invoiceNumber ? (
                                                            <div>Hóa đơn: {item.invoice_number || item.invoiceNumber}</div>
                                                        ) : null}
                                                    </div>
                                                    <div className="amount">{formatCurrency(item.amount || 0)}</div>
                                                    {item.files && item.files.length > 0 && (
                                                        <div className="files">
                                                            {item.files.map((file) => (
                                                                <a
                                                                    key={file.id || file.name}
                                                                    href={buildFileUrl(file.url)}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                >
                                                                    {file.name}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="customer-entertainment-expense-accountant-empty">Không có khoản chi.</div>
                                    )}
                                </div>
                            </div>
                            <div className="customer-entertainment-expense-accountant-modal-footer">
                                <button
                                    type="button"
                                    className="customer-entertainment-expense-accountant-modal-close-btn"
                                    onClick={() => setShowDetailModal(false)}
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerEntertainmentExpenseAccountant;

