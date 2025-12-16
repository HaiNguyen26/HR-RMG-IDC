import React, { useState, useEffect } from 'react';
import { customerEntertainmentExpensesAPI } from '../../services/api';
import './CustomerEntertainmentExpenseCEO.css';

const CustomerEntertainmentExpenseCEO = ({ currentUser, showToast, showConfirm }) => {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [rejectionNotes, setRejectionNotes] = useState('');
    const [selectedRequestDetail, setSelectedRequestDetail] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Fetch report from API
    useEffect(() => {
        const fetchReport = async () => {
            try {
                setLoading(true);

                // Fetch requests that have been processed by accountant and ready for CEO approval
                const response = await customerEntertainmentExpensesAPI.getAll({
                    status: 'ACCOUNTANT_PROCESSED' // This status will be set when accountant processes
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
                            requester: `${request.requester_name || ''} (${request.requester_department || ''})`,
                            requestedAmount: totalAmount,
                            advanceAmount: advanceAmount,
                            supplementAmount: supplementAmount,
                            accountantNote: request.accountant_notes || '',
                            status: request.status,
                            // Store full request data for detail view
                            fullRequest: request
                        };
                    });

                    // Calculate totals
                    const totals = {
                        totalRequests: mappedRequests.length,
                        totalRequested: mappedRequests.reduce((sum, req) => sum + req.requestedAmount, 0),
                        totalAdvance: mappedRequests.reduce((sum, req) => sum + req.advanceAmount, 0),
                        totalSupplement: mappedRequests.reduce((sum, req) => sum + req.supplementAmount, 0)
                    };

                    const reportData = {
                        id: 'REPORT-' + new Date().toISOString().split('T')[0],
                        createdAt: new Date().toISOString(),
                        createdBy: currentUser?.hoTen || currentUser?.username || '',
                        createdByRole: currentUser?.chucDanh || '',
                        requests: mappedRequests,
                        totals: totals
                    };

                    setReport(reportData);
                } else {
                    setReport(null);
                }
            } catch (error) {
                console.error('Error fetching report:', error);
                showToast?.('Lỗi khi tải báo cáo', 'error');
                setReport(null);
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [currentUser, showToast]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}, ${day}/${month}/${year}`;
    };

    const handleApprove = async () => {
        if (!report) return;

        const confirmed = await showConfirm?.({
            title: 'Xác nhận duyệt chi',
            message: `Bạn có chắc chắn muốn duyệt chi ${formatCurrency(report.totals.totalSupplement)} cho ${report.totals.totalRequests} phiếu chi?`,
            confirmText: 'Duyệt chi',
            cancelText: 'Hủy'
        });

        if (confirmed) {
            setIsProcessing(true);
            try {
                // TODO: API call để duyệt báo cáo
                await new Promise(resolve => setTimeout(resolve, 1000));
                showToast?.('Đã duyệt chi thành công!', 'success');
            } catch (error) {
                showToast?.('Lỗi khi duyệt chi: ' + (error.message || 'Unknown error'), 'error');
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleReject = async () => {
        if (!report) return;

        if (!rejectionNotes.trim()) {
            showToast?.('Vui lòng nhập lý do từ chối hoặc yêu cầu kiểm tra lại', 'warning');
            return;
        }

        const confirmed = await showConfirm?.({
            title: 'Xác nhận từ chối',
            message: 'Bạn có chắc chắn muốn từ chối báo cáo này?',
            confirmText: 'Từ chối',
            cancelText: 'Hủy'
        });

        if (confirmed) {
            setIsProcessing(true);
            try {
                // TODO: API call để từ chối báo cáo
                await new Promise(resolve => setTimeout(resolve, 1000));
                showToast?.('Đã từ chối báo cáo thành công!', 'success');
                setRejectionNotes('');
            } catch (error) {
                showToast?.('Lỗi khi từ chối: ' + (error.message || 'Unknown error'), 'error');
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'ACCOUNTANT_OK') {
            return <span className="customer-entertainment-expense-ceo-status-badge ok">Kế toán OK</span>;
        } else if (status === 'NEEDS_ATTENTION') {
            return <span className="customer-entertainment-expense-ceo-status-badge attention">Cần Lưu ý</span>;
        }
        return null;
    };

    const handleViewDetail = async (request) => {
        try {
            // Fetch full request details including expense items and files
            const response = await customerEntertainmentExpensesAPI.getById(request.id);
            if (response.data && response.data.success) {
                setSelectedRequestDetail(response.data.data);
                setIsDetailModalOpen(true);
            } else {
                showToast?.('Không thể tải chi tiết phiếu', 'error');
            }
        } catch (error) {
            console.error('Error fetching request detail:', error);
            showToast?.('Lỗi khi tải chi tiết phiếu', 'error');
        }
    };

    if (loading) {
        return (
            <div className="customer-entertainment-expense-ceo-container">
                <div className="customer-entertainment-expense-ceo-loading">
                    <div className="spinner"></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="customer-entertainment-expense-ceo-container">
                <div className="customer-entertainment-expense-ceo-empty">
                    <p>Không có báo cáo nào chờ duyệt</p>
                </div>
            </div>
        );
    }

    return (
        <div className="customer-entertainment-expense-ceo-container">
            <div className="customer-entertainment-expense-ceo-content">
                {/* Header */}
                <div className="customer-entertainment-expense-ceo-header">
                    <div className="customer-entertainment-expense-ceo-header-content">
                        <div className="customer-entertainment-expense-ceo-icon-wrapper">
                            <svg className="customer-entertainment-expense-ceo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                            </svg>
                        </div>
                        <div className="customer-entertainment-expense-ceo-header-text">
                            <h1 className="customer-entertainment-expense-ceo-title">
                                PHÊ DUYỆT CUỐI CÙNG: BÁO CÁO QUYẾT TOÁN CHI PHÍ
                            </h1>
                            <div className="customer-entertainment-expense-ceo-meta">
                                <span className="customer-entertainment-expense-ceo-role">Tổng Giám Đốc (TGĐ)</span>
                                <span className="customer-entertainment-expense-ceo-separator">|</span>
                                <span className="customer-entertainment-expense-ceo-report-id">Mã Báo Cáo: {report.id}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Section */}
                <div className="customer-entertainment-expense-ceo-summary-section">
                    <h2 className="customer-entertainment-expense-ceo-section-title">
                        Tóm Tắt Tổng Hợp Chi Phí Chi Nhánh
                    </h2>
                    <div className="customer-entertainment-expense-ceo-summary-content">
                        <div className="customer-entertainment-expense-ceo-summary-item">
                            <span className="customer-entertainment-expense-ceo-summary-label">Tổng Số Phiếu Gồm:</span>
                            <span className="customer-entertainment-expense-ceo-summary-value">{report.totals.totalRequests} Phiếu</span>
                        </div>
                        <div className="customer-entertainment-expense-ceo-summary-item">
                            <span className="customer-entertainment-expense-ceo-summary-label">Tổng Số Tiền Thực Chi:</span>
                            <span className="customer-entertainment-expense-ceo-summary-value red">{formatCurrency(report.totals.totalRequested)}</span>
                        </div>
                        <div className="customer-entertainment-expense-ceo-summary-item">
                            <span className="customer-entertainment-expense-ceo-summary-label">Tổng Số Tiền Đã Tạm ứng:</span>
                            <span className="customer-entertainment-expense-ceo-summary-value">{formatCurrency(report.totals.totalAdvance)}</span>
                        </div>
                        <div className="customer-entertainment-expense-ceo-summary-item highlight">
                            <span className="customer-entertainment-expense-ceo-summary-label">Số Tiền CẦN CHI THÊM (Phê Duyệt):</span>
                            <span className="customer-entertainment-expense-ceo-summary-value green">{formatCurrency(report.totals.totalSupplement)}</span>
                        </div>
                        <div className="customer-entertainment-expense-ceo-summary-footer">
                            Báo cáo được tạo bởi: <strong>{report.createdByRole} {report.createdBy}</strong> vào lúc {formatDate(report.createdAt)}.
                        </div>
                    </div>
                </div>

                {/* Details Section */}
                <div className="customer-entertainment-expense-ceo-details-section">
                    <h2 className="customer-entertainment-expense-ceo-section-title">
                        Chi Tiết Quyết Toán Từng Phiếu
                    </h2>
                    <div className="customer-entertainment-expense-ceo-table-container">
                        <table className="customer-entertainment-expense-ceo-table">
                            <thead>
                                <tr>
                                    <th>Mã YC</th>
                                    <th>Người Yêu Cầu</th>
                                    <th>Nội Dung Chính</th>
                                    <th>Thực Chi (Y/C)</th>
                                    <th>Đã Tạm Ứng</th>
                                    <th>Cần Bổ Sung</th>
                                    <th>Ghi chú (Kế toán)</th>
                                    <th>Trạng Thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.requests.map(request => (
                                    <tr key={request.id}>
                                        <td className="customer-entertainment-expense-ceo-code">{request.requestNumber}</td>
                                        <td>{request.requester}</td>
                                        <td>{request.purpose || '-'}</td>
                                        <td className="customer-entertainment-expense-ceo-amount">{formatCurrency(request.requestedAmount)}</td>
                                        <td className="customer-entertainment-expense-ceo-amount">{formatCurrency(request.advanceAmount)}</td>
                                        <td className="customer-entertainment-expense-ceo-amount">{formatCurrency(request.supplementAmount)}</td>
                                        <td className="customer-entertainment-expense-ceo-note">{request.accountantNote}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                {getStatusBadge(request.status)}
                                                <button
                                                    className="customer-entertainment-expense-ceo-view-detail-btn"
                                                    onClick={() => handleViewDetail(request)}
                                                    title="Xem chi tiết"
                                                >
                                                    👁️ Xem
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Rejection Notes */}
                <div className="customer-entertainment-expense-ceo-notes-section">
                    <label className="customer-entertainment-expense-ceo-notes-label">
                        Ghi chú (Nếu từ chối hoặc yêu cầu kiểm tra lại):
                    </label>
                    <textarea
                        className="customer-entertainment-expense-ceo-notes-textarea"
                        value={rejectionNotes}
                        onChange={(e) => setRejectionNotes(e.target.value)}
                        placeholder="Nhập lý do từ chối hoặc yêu cầu kiểm tra lại..."
                        rows="4"
                    />
                </div>

                {/* Action Buttons */}
                <div className="customer-entertainment-expense-ceo-actions">
                    <button
                        className="customer-entertainment-expense-ceo-btn approve"
                        onClick={handleApprove}
                        disabled={isProcessing}
                    >
                        <span className="customer-entertainment-expense-ceo-btn-icon">✓</span>
                        DUYỆT CHI ({formatCurrency(report.totals.totalSupplement)})
                    </button>
                    <button
                        className="customer-entertainment-expense-ceo-btn reject"
                        onClick={handleReject}
                        disabled={isProcessing}
                    >
                        <span className="customer-entertainment-expense-ceo-btn-icon">✕</span>
                        TỪ CHỐI / YÊU CẦU KIỂM TRA LẠI
                    </button>
                </div>
            </div>

            {/* Detail Modal */}
            {isDetailModalOpen && selectedRequestDetail && (
                <div className="customer-entertainment-expense-ceo-detail-modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
                    <div className="customer-entertainment-expense-ceo-detail-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="customer-entertainment-expense-ceo-detail-modal-header">
                            <h2>Chi Tiết Phiếu Chi: {selectedRequestDetail.request_number}</h2>
                            <button
                                className="customer-entertainment-expense-ceo-detail-modal-close"
                                onClick={() => setIsDetailModalOpen(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="customer-entertainment-expense-ceo-detail-modal-content">
                            <div className="customer-entertainment-expense-ceo-detail-section">
                                <h3>Thông Tin Chung</h3>
                                <div className="customer-entertainment-expense-ceo-detail-info">
                                    <div className="customer-entertainment-expense-ceo-detail-row">
                                        <span className="customer-entertainment-expense-ceo-detail-label">Người yêu cầu:</span>
                                        <span className="customer-entertainment-expense-ceo-detail-value">{selectedRequestDetail.requester_name || '-'}</span>
                                    </div>
                                    <div className="customer-entertainment-expense-ceo-detail-row">
                                        <span className="customer-entertainment-expense-ceo-detail-label">Phòng ban:</span>
                                        <span className="customer-entertainment-expense-ceo-detail-value">{selectedRequestDetail.requester_department || '-'}</span>
                                    </div>
                                    <div className="customer-entertainment-expense-ceo-detail-row">
                                        <span className="customer-entertainment-expense-ceo-detail-label">Chi nhánh:</span>
                                        <span className="customer-entertainment-expense-ceo-detail-value">{selectedRequestDetail.branch || '-'}</span>
                                    </div>
                                    <div className="customer-entertainment-expense-ceo-detail-row">
                                        <span className="customer-entertainment-expense-ceo-detail-label">Ngày bắt đầu:</span>
                                        <span className="customer-entertainment-expense-ceo-detail-value">{selectedRequestDetail.start_date || '-'}</span>
                                    </div>
                                    <div className="customer-entertainment-expense-ceo-detail-row">
                                        <span className="customer-entertainment-expense-ceo-detail-label">Ngày kết thúc:</span>
                                        <span className="customer-entertainment-expense-ceo-detail-value">{selectedRequestDetail.end_date || '-'}</span>
                                    </div>
                                    <div className="customer-entertainment-expense-ceo-detail-row">
                                        <span className="customer-entertainment-expense-ceo-detail-label">Số tiền tạm ứng:</span>
                                        <span className="customer-entertainment-expense-ceo-detail-value">{formatCurrency(parseFloat(selectedRequestDetail.advance_amount) || 0)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="customer-entertainment-expense-ceo-detail-section">
                                <h3>Chi Tiết Chứng Từ & Hóa Đơn Gốc</h3>
                                <div className="customer-entertainment-expense-ceo-detail-table-wrapper">
                                    <table className="customer-entertainment-expense-ceo-detail-table">
                                        <thead>
                                            <tr>
                                                <th>STT</th>
                                                <th>Số Hóa Đơn</th>
                                                <th>Giá Tiền</th>
                                                <th>Tên Công Ty</th>
                                                <th>Nội Dung</th>
                                                <th>File Đính Kèm</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(selectedRequestDetail.expenseItems || []).map((item, index) => (
                                                <tr key={item.id}>
                                                    <td>{index + 1}</td>
                                                    <td>{item.invoice_number || '-'}</td>
                                                    <td className="customer-entertainment-expense-ceo-detail-amount">{formatCurrency(parseFloat(item.amount) || 0)}</td>
                                                    <td>{item.company_name || '-'}</td>
                                                    <td>{item.content || '-'}</td>
                                                    <td>
                                                        {item.files && item.files.length > 0 ? (
                                                            <div className="customer-entertainment-expense-ceo-detail-files">
                                                                {item.files.map((file, fileIndex) => (
                                                                    <a
                                                                        key={file.id || fileIndex}
                                                                        href={file.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="customer-entertainment-expense-ceo-detail-file-link"
                                                                    >
                                                                        📎 {file.name || `File ${fileIndex + 1}`}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: '#94a3b8' }}>Không có file</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div className="customer-entertainment-expense-ceo-detail-modal-footer">
                            <button
                                className="customer-entertainment-expense-ceo-detail-modal-close-btn"
                                onClick={() => setIsDetailModalOpen(false)}
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

export default CustomerEntertainmentExpenseCEO;

