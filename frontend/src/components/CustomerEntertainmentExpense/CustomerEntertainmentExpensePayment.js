import React, { useState, useEffect } from 'react';
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

    // Fetch reports from API
    useEffect(() => {
        const fetchReports = async () => {
            try {
                setLoading(true);

                // Fetch requests that have been approved by CEO and ready for payment
                const response = await customerEntertainmentExpensesAPI.getAll({
                    status: 'APPROVED_CEO' // This status will be set when CEO approves
                });

                if (response.data && response.data.success) {
                    const apiRequests = response.data.data || [];

                    // Map API response to component format
                    const mappedReports = apiRequests.map(request => {
                        const totalAmount = (request.expenseItems || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
                        const advanceAmount = parseFloat(request.advance_amount) || 0;
                        const additionalAmount = totalAmount - advanceAmount;

                        return {
                            id: request.id,
                            reportCode: request.request_number,
                            content: `Quyết toán Chi phí Tiếp khách - ${request.branch} - ${request.requester_name || ''}`,
                            generalDirectorApprovalDate: request.ceo_decision_at || request.updated_at,
                            additionalAmount: additionalAmount,
                            status: 'PENDING_PAYMENT'
                        };
                    });

                    setReports(mappedReports);
                    setFilteredReports(mappedReports);
                } else {
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
    }, [showToast]);

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

    const handlePaymentSubmit = () => {
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
            message: `Bạn có chắc chắn muốn thanh toán cho báo cáo ${selectedReport.reportCode}?`,
            onConfirm: () => {
                // TODO: Call API to process payment
                console.log('Processing payment:', {
                    reportId: selectedReport.id,
                    paymentData
                });

                showToast('Thanh toán thành công', 'success');
                setIsPaymentModalOpen(false);
                setSelectedReport(null);
                setPaymentData({
                    paymentMethod: 'BANK_TRANSFER',
                    bankAccount: '',
                    notes: ''
                });
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
                                                <td>
                                                    {report.status === 'PENDING_PAYMENT' && (
                                                        <button
                                                            className="payment-button"
                                                            onClick={() => handlePaymentClick(report)}
                                                        >
                                                            Thanh Toán
                                                        </button>
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
                                <p><strong>Số tiền:</strong> {formatCurrency(selectedReport.additionalAmount)}</p>
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

