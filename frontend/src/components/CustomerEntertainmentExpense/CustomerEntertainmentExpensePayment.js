import React, { useState, useEffect, useCallback } from 'react';
import { customerEntertainmentExpensesAPI } from '../../services/api';
import './CustomerEntertainmentExpensePayment.css';

const CustomerEntertainmentExpensePayment = ({ currentUser, showToast, showConfirm }) => {
    const [loading, setLoading] = useState(false);
    const [reports, setReports] = useState([]);
    const [filteredReports, setFilteredReports] = useState([]);
    const [statusFilter, setStatusFilter] = useState('PENDING_PAYMENT');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [paymentData, setPaymentData] = useState({
        paymentMethod: 'BANK_TRANSFER',
        bankAccount: '',
        notes: ''
    });

    // Helper function to map API requests to report format
    const mapRequestsToReports = useCallback((apiRequests) => {
        if (!apiRequests || apiRequests.length === 0) {
            console.log('[Payment] No requests to map');
            return [];
        }

        // Filter chỉ lấy các requests đã được CEO duyệt (APPROVED_CEO) hoặc đã thanh toán (PAID)
        const filteredRequests = apiRequests.filter(request => {
            const status = request.status || request.trang_thai;
            const isApproved = status === 'APPROVED_CEO' || status === 'PAID';
            if (!isApproved) {
                console.log('[Payment] Filtered out request:', { id: request.id, status: status, request_number: request.request_number });
            }
            return isApproved;
        });

        console.log('[Payment] Filtered requests count:', filteredRequests.length, 'out of', apiRequests.length);

        // Map API response to component format
        return filteredRequests.map(request => {
            const totalAmount = (request.expenseItems || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
            const advanceAmount = parseFloat(request.advance_amount) || 0;
            const additionalAmount = totalAmount - advanceAmount;

            // Xác định status hiển thị
            const requestStatus = request.status || request.trang_thai;
            let displayStatus = 'PENDING_PAYMENT';
            if (requestStatus === 'PAID') {
                displayStatus = 'PAID';
            } else if (requestStatus === 'APPROVED_CEO') {
                displayStatus = 'PENDING_PAYMENT';
            }

            return {
                id: request.id,
                reportCode: request.request_number || `CP${String(request.id).padStart(6, '0')}`,
                content: `Quyết toán Chi phí Tiếp khách - ${request.branch || ''} - ${request.requester_name || ''}`,
                generalDirectorApprovalDate: request.ceo_decision_at || request.updated_at,
                additionalAmount: additionalAmount,
                status: displayStatus,
                totalAmount: totalAmount,
                advanceAmount: advanceAmount,
                branch: request.branch,
                requesterName: request.requester_name,
                paymentMethod: request.payment_method,
                paymentNotes: request.payment_notes,
                paymentProcessedAt: request.payment_processed_at,
                rawData: request // Lưu toàn bộ data để dùng sau
            };
        });
    }, []);

    // Fetch reports from API
    useEffect(() => {
        const fetchReports = async () => {
            try {
                setLoading(true);

                // Fetch tất cả requests, sau đó filter trong mapRequestsToReports
                // Kế toán cần thấy các đơn đã được CEO duyệt (APPROVED_CEO) hoặc đã thanh toán (PAID)
                const response = await customerEntertainmentExpensesAPI.getAll({
                    // Không filter ở đây, để lấy tất cả và filter trong mapRequestsToReports
                });

                if (response.data && response.data.success) {
                    const apiRequests = response.data.data || [];
                    console.log('[Payment] Fetched requests:', apiRequests.length);
                    console.log('[Payment] Request statuses:', apiRequests.map(r => ({ id: r.id, status: r.status, request_number: r.request_number })));
                    
                    const mappedReports = mapRequestsToReports(apiRequests);
                    console.log('[Payment] Mapped reports:', mappedReports.length);
                    console.log('[Payment] Mapped report statuses:', mappedReports.map(r => ({ id: r.id, status: r.status, reportCode: r.reportCode })));
                    
                    setReports(mappedReports);
                    setFilteredReports(mappedReports);
                } else {
                    console.warn('[Payment] API response not successful:', response.data);
                    setReports([]);
                    setFilteredReports([]);
                }
            } catch (error) {
                console.error('Error fetching reports:', error);
                showToast?.('Lỗi khi tải danh sách báo cáo', 'error');
                setReports([]);
                setFilteredReports([]);
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, [showToast, currentUser]);

    // Filter reports by status
    useEffect(() => {
        if (statusFilter === 'all') {
            setFilteredReports(reports);
        } else {
            setFilteredReports(reports.filter(report => report.status === statusFilter));
        }
    }, [statusFilter, reports]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const dateFormatted = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return `${time}, ${dateFormatted}`;
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PENDING_PAYMENT':
                return { text: 'CHỜ THANH TOÁN', class: 'status-pending' };
            case 'PAID':
                return { text: 'ĐÃ THANH TOÁN', class: 'status-paid' };
            case 'REIMBURSED':
                return { text: 'ĐÃ HOÀN ỨNG', class: 'status-reimbursed' };
            default:
                return { text: status, class: 'status-default' };
        }
    };

    const handlePaymentClick = (report) => {
        setSelectedReport(report);
        setIsPaymentModalOpen(true);
    };

    const handlePaymentSubmit = async () => {
        if (!paymentData.paymentMethod) {
            showToast('Vui lòng chọn phương thức thanh toán', 'error');
            return;
        }

        if (paymentData.paymentMethod === 'BANK_TRANSFER' && !paymentData.bankAccount.trim()) {
            showToast('Vui lòng nhập số tài khoản ngân hàng', 'error');
            return;
        }

        showConfirm({
            title: 'Xác nhận thanh toán',
            message: `Bạn có chắc chắn muốn thanh toán cho báo cáo ${selectedReport.reportCode}?\n\nSố tiền: ${formatCurrency(selectedReport.additionalAmount)}`,
            onConfirm: async () => {
                try {
                    setLoading(true);
                    
                    // Gọi API để thanh toán
                    // Backend expects: paymentMethod, notes (hoặc bankAccount), paymentProcessedBy
                    const paymentPayload = {
                        paymentMethod: paymentData.paymentMethod,
                        notes: paymentData.notes || (paymentData.paymentMethod === 'BANK_TRANSFER' ? `Số tài khoản: ${paymentData.bankAccount}` : ''),
                        bankAccount: paymentData.paymentMethod === 'BANK_TRANSFER' ? paymentData.bankAccount : undefined,
                        paymentProcessedBy: currentUser?.id || null
                    };

                    const response = await customerEntertainmentExpensesAPI.processPayment(
                        selectedReport.id,
                        paymentPayload
                    );

                    if (response.data && response.data.success) {
                        showToast('Thanh toán thành công', 'success');
                        
                        // Refresh danh sách
                        const refreshResponse = await customerEntertainmentExpensesAPI.getAll();
                        if (refreshResponse.data && refreshResponse.data.success) {
                            const apiRequests = refreshResponse.data.data || [];
                            const mappedReports = mapRequestsToReports(apiRequests);
                            setReports(mappedReports);
                            setFilteredReports(mappedReports);
                        }

                        setIsPaymentModalOpen(false);
                        setSelectedReport(null);
                        setPaymentData({
                            paymentMethod: 'BANK_TRANSFER',
                            bankAccount: '',
                            notes: ''
                        });
                    } else {
                        showToast(response.data?.message || 'Lỗi khi thanh toán', 'error');
                    }
                } catch (error) {
                    console.error('Error processing payment:', error);
                    showToast(error.response?.data?.message || 'Lỗi khi thanh toán', 'error');
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const pendingPaymentCount = reports.filter(r => r.status === 'PENDING_PAYMENT').length;

    return (
        <div className="customer-entertainment-expense-payment">
            <div className="customer-entertainment-expense-payment-header">
                <div className="customer-entertainment-expense-payment-header-content">
                    <div className="customer-entertainment-expense-payment-header-icon">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                    </div>
                    <div className="customer-entertainment-expense-payment-header-text">
                        <h1>BƯỚC 4: THỰC HIỆN THANH TOÁN & LƯU TRỮ</h1>
                        <p>Theo dõi các Báo cáo Quyết toán đã được TGĐ phê duyệt và tiến hành chi tiền.</p>
                    </div>
                </div>
            </div>

            <div className="customer-entertainment-expense-payment-content">
                {/* Summary and Filter Section */}
                <div className="customer-entertainment-expense-payment-summary-filter">
                    <div className="customer-entertainment-expense-payment-summary">
                        <span className="summary-label">Tổng số Báo cáo chờ thanh toán:</span>
                        <span className="summary-value">{pendingPaymentCount}</span>
                    </div>
                    <div className="customer-entertainment-expense-payment-filter">
                        <label>Lọc theo trạng thái:</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="status-filter-select"
                        >
                            <option value="all">Tất cả</option>
                            <option value="PENDING_PAYMENT">Chờ Thanh Toán</option>
                            <option value="PAID">Đã Thanh Toán</option>
                            <option value="REIMBURSED">Đã Hoàn Ứng</option>
                        </select>
                    </div>
                </div>

                {/* Reports Table */}
                <div className="customer-entertainment-expense-payment-table-container">
                    <div className="customer-entertainment-expense-payment-table-wrapper">
                        <table className="customer-entertainment-expense-payment-table">
                            <thead>
                                <tr>
                                    <th>Mã BC</th>
                                    <th>Nội dung</th>
                                    <th>TGĐ Phê Duyệt</th>
                                    <th>Số Tiền Chi Thêm</th>
                                    <th>Trạng Thái</th>
                                    <th>Hành Động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="loading-cell">
                                            <div className="loading-spinner">Đang tải...</div>
                                        </td>
                                    </tr>
                                ) : filteredReports.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="empty-cell">
                                            Không có báo cáo nào
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReports.map((report) => {
                                        const statusBadge = getStatusBadge(report.status);
                                        return (
                                            <tr key={report.id}>
                                                <td className="report-code">{report.reportCode}</td>
                                                <td className="report-content">{report.content}</td>
                                                <td className="approval-date">
                                                    {formatDateTime(report.generalDirectorApprovalDate)}
                                                </td>
                                                <td className="amount-cell">
                                                    <span className="amount-value">
                                                        {formatCurrency(report.additionalAmount)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${statusBadge.class}`}>
                                                        {statusBadge.text}
                                                    </span>
                                                </td>
                                                <td className="action-cell">
                                                    {report.status === 'PENDING_PAYMENT' ? (
                                                        <button
                                                            className="payment-button"
                                                            onClick={() => handlePaymentClick(report)}
                                                            disabled={loading}
                                                        >
                                                            {loading ? 'Đang xử lý...' : 'Thanh Toán'}
                                                        </button>
                                                    ) : report.status === 'PAID' ? (
                                                        <span className="payment-completed-badge">
                                                            Đã thanh toán
                                                        </span>
                                                    ) : (
                                                        <span className="payment-completed-badge">
                                                            -
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {isPaymentModalOpen && selectedReport && (
                <div className="payment-modal-overlay" onClick={() => setIsPaymentModalOpen(false)}>
                    <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="payment-modal-header">
                            <h2>Thanh Toán Báo Cáo</h2>
                            <button
                                className="payment-modal-close"
                                onClick={() => setIsPaymentModalOpen(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="payment-modal-content">
                            <div className="payment-modal-info">
                                <p><strong>Mã BC:</strong> {selectedReport.reportCode}</p>
                                <p><strong>Nội dung:</strong> {selectedReport.content}</p>
                                <p><strong>Người yêu cầu:</strong> {selectedReport.requesterName || '-'}</p>
                                <p><strong>Chi nhánh:</strong> {selectedReport.branch || '-'}</p>
                                <p><strong>Tổng chi phí:</strong> {formatCurrency(selectedReport.totalAmount || 0)}</p>
                                <p><strong>Số tiền tạm ứng:</strong> {formatCurrency(selectedReport.advanceAmount || 0)}</p>
                                <p><strong>Số tiền chi thêm:</strong> <span style={{ color: '#dc2626', fontWeight: '600' }}>{formatCurrency(selectedReport.additionalAmount)}</span></p>
                            </div>
                            <div className="payment-modal-form">
                                <div className="form-group">
                                    <label>Phương thức thanh toán <span className="required">*</span></label>
                                    <select
                                        value={paymentData.paymentMethod}
                                        onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                                    >
                                        <option value="BANK_TRANSFER">Chuyển khoản</option>
                                        <option value="CASH">Tiền mặt</option>
                                        <option value="ADVANCE">Hoàn ứng</option>
                                    </select>
                                </div>
                                {paymentData.paymentMethod === 'BANK_TRANSFER' && (
                                    <div className="form-group">
                                        <label>Số tài khoản ngân hàng <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            value={paymentData.bankAccount}
                                            onChange={(e) => setPaymentData({ ...paymentData, bankAccount: e.target.value })}
                                            placeholder="Nhập số tài khoản"
                                        />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label>Ghi chú</label>
                                    <textarea
                                        value={paymentData.notes}
                                        onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                                        placeholder="Nhập ghi chú (nếu có)"
                                        rows="3"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="payment-modal-footer">
                            <button
                                className="payment-modal-cancel"
                                onClick={() => setIsPaymentModalOpen(false)}
                            >
                                Hủy
                            </button>
                            <button
                                className="payment-modal-submit"
                                onClick={handlePaymentSubmit}
                            >
                                Xác nhận Thanh toán
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerEntertainmentExpensePayment;

