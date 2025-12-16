import React, { useState, useEffect } from 'react';
import './TravelExpenseAccountant.css';
import { travelExpensesAPI } from '../../services/api';

const TravelExpenseAccountant = ({ currentUser, showToast }) => {
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState([]);
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        notes: ''
    });

    // Fetch requests that are ready for accountant check (PENDING_ACCOUNTANT)
    useEffect(() => {
        const fetchRequests = async () => {
            setLoading(true);
            try {
                const response = await travelExpensesAPI.getAll({
                    status: 'PENDING_ACCOUNTANT'
                });

                if (response.data && response.data.success) {
                    // Fetch attachments for each request
                    const requestsWithAttachments = await Promise.all(
                        (response.data.data || []).map(async (req) => {
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

                    const formattedRequests = requestsWithAttachments.map(req => {
                        const startDate = req.start_time ? new Date(req.start_time) : null;
                        const endDate = req.end_time ? new Date(req.end_time) : null;

                        return {
                            id: req.id,
                            code: `CTX-${req.id}`,
                            employeeName: req.employee_name || 'N/A',
                            location: req.location || '',
                            locationType: req.locationType || req.location_type,
                            purpose: req.purpose || '',
                            startDate: startDate ? startDate.toLocaleDateString('vi-VN') : '',
                            endDate: endDate ? endDate.toLocaleDateString('vi-VN') : '',
                            advanceAmount: req.advance?.amount || req.actual_advance_amount || 0,
                            requestedAdvanceAmount: req.requestedAdvanceAmount || req.requested_advance_amount || 0,
                            actualExpense: req.settlement?.actualExpense || req.actual_expense || null,
                            settlementNotes: req.settlement?.notes || req.settlement_notes || null,
                            attachments: req.attachments || []
                        };
                    });
                    setRequests(formattedRequests);
                }
            } catch (error) {
                console.error('Error fetching travel expense requests:', error);
                showToast?.('Lỗi khi tải danh sách yêu cầu', 'error');
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            fetchRequests();
        }
    }, [currentUser, showToast]);

    const selectedRequest = requests.find(req => req.id === selectedRequestId) || null;

    // Calculate comparison - Đối chiếu chi phí thực tế với số tiền tạm ứng
    const calculateComparison = () => {
        if (!selectedRequest || !selectedRequest.actualExpense || !selectedRequest.advanceAmount) {
            return null;
        }

        const actual = selectedRequest.actualExpense;
        const advanceAmount = selectedRequest.advanceAmount; // Số tiền đã tạm ứng (thay cho ngân sách cố định)
        const difference = actual - advanceAmount;
        const exceedsAdvance = difference > 0;

        return {
            actual,
            advanceAmount, // Số tiền tạm ứng (thay cho ngân sách)
            difference: Math.abs(difference),
            exceedsAdvance,
            reimbursementAmount: exceedsAdvance ? advanceAmount : actual, // Hoàn ứng tối đa = số tiền tạm ứng nếu vượt, hoặc = chi phí thực tế nếu không vượt
            excessAmount: exceedsAdvance ? difference : 0,
            refundAmount: actual < advanceAmount ? advanceAmount - actual : 0 // Số tiền nhân viên phải hoàn trả nếu chi phí thực tế < số tiền tạm ứng
        };
    };

    const comparison = calculateComparison();

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedRequestId) {
            showToast?.('Vui lòng chọn một yêu cầu để kiểm tra', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await travelExpensesAPI.accountantCheck(selectedRequestId, {
                checkedBy: currentUser?.id || currentUser?.employeeId,
                notes: formData.notes
            });

            if (response.data && response.data.success) {
                showToast?.(
                    comparison?.exceedsAdvance
                        ? `Đã kiểm tra và quyết toán. Chi phí thực tế vượt số tiền tạm ứng ${comparison.excessAmount.toLocaleString('vi-VN')} VND. Chuyển sang phê duyệt ngoại lệ.`
                        : comparison?.refundAmount > 0
                            ? `Đã kiểm tra và quyết toán thành công! Nhân viên cần hoàn trả ${comparison.refundAmount.toLocaleString('vi-VN')} VND.`
                            : 'Đã kiểm tra và quyết toán thành công!',
                    'success'
                );

                // Reset form
                setFormData({ notes: '' });
                setSelectedRequestId(null);

                // Refresh requests
                const refreshResponse = await travelExpensesAPI.getAll({
                    status: 'PENDING_ACCOUNTANT'
                });
                if (refreshResponse.data && refreshResponse.data.success) {
                    // Fetch attachments for each request
                    const requestsWithAttachments = await Promise.all(
                        (refreshResponse.data.data || []).map(async (req) => {
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

                    const formattedRequests = requestsWithAttachments.map(req => {
                        const startDate = req.start_time ? new Date(req.start_time) : null;
                        const endDate = req.end_time ? new Date(req.end_time) : null;

                        return {
                            id: req.id,
                            code: `CTX-${req.id}`,
                            employeeName: req.employee_name || 'N/A',
                            location: req.location || '',
                            locationType: req.locationType || req.location_type,
                            purpose: req.purpose || '',
                            startDate: startDate ? startDate.toLocaleDateString('vi-VN') : '',
                            endDate: endDate ? endDate.toLocaleDateString('vi-VN') : '',
                            advanceAmount: req.advance?.amount || req.actual_advance_amount || 0,
                            requestedAdvanceAmount: req.requestedAdvanceAmount || req.requested_advance_amount || 0,
                            actualExpense: req.settlement?.actualExpense || req.actual_expense || null,
                            settlementNotes: req.settlement?.notes || req.settlement_notes || null,
                            attachments: req.attachments || []
                        };
                    });
                    setRequests(formattedRequests);
                }
            }
        } catch (error) {
            console.error('Error checking accountant:', error);
            showToast?.('Lỗi khi kiểm tra và quyết toán: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredRequests = requests.filter(request =>
        request.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="travel-expense-accountant">
            {/* Header */}
            <div className="travel-expense-accountant-header">
                <div className="travel-expense-accountant-header-top">
                    <div className="travel-expense-accountant-header-content">
                        <div className="travel-expense-accountant-icon-wrapper">
                            <svg className="travel-expense-accountant-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                            </svg>
                        </div>
                        <div>
                            <h1 className="travel-expense-accountant-title">Kiểm tra & Quyết toán</h1>
                            <p className="travel-expense-accountant-subtitle">
                                Đối chiếu chi phí thực tế với số tiền tạm ứng và quyết toán hoàn ứng
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Container - Master-Detail View */}
            <div className="travel-expense-accountant-main-container">
                <div className="travel-expense-accountant-main-layout">
                    {/* Cột 1: Master - Danh Sách Yêu Cầu (33%) */}
                    <div className="travel-expense-accountant-list-column">
                        <div className="travel-expense-accountant-list-container">
                            <h2 className="travel-expense-accountant-list-title">
                                YÊU CẦU CHỜ KIỂM TRA
                            </h2>

                            {/* Thanh Công Cụ: Search */}
                            <div className="travel-expense-accountant-toolbar">
                                <div className="travel-expense-accountant-search-wrapper">
                                    <svg className="travel-expense-accountant-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        className="travel-expense-accountant-search-input"
                                        placeholder="Tìm theo Mã YC, Tên NV..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Request List */}
                            <div className="travel-expense-accountant-list-items">
                                {loading ? (
                                    <div className="travel-expense-accountant-loading">Đang tải...</div>
                                ) : filteredRequests.length === 0 ? (
                                    <div className="travel-expense-accountant-empty">Không có yêu cầu chờ kiểm tra</div>
                                ) : (
                                    filteredRequests.map((request) => (
                                        <div
                                            key={request.id}
                                            className={`travel-expense-accountant-list-item ${selectedRequestId === request.id ? 'active' : ''}`}
                                            onClick={() => {
                                                setSelectedRequestId(request.id);
                                                setFormData({ notes: '' });
                                            }}
                                        >
                                            <div className="travel-expense-accountant-item-left">
                                                <div className="travel-expense-accountant-request-code">
                                                    {request.code}
                                                </div>
                                                <div className="travel-expense-accountant-employee-name">
                                                    {request.employeeName}
                                                </div>
                                                <div className="travel-expense-accountant-purpose">
                                                    {request.purpose}
                                                </div>
                                                {request.actualExpense && (
                                                    <div className="travel-expense-accountant-actual-expense">
                                                        Chi Phí: {request.actualExpense.toLocaleString('vi-VN')} ₫
                                                    </div>
                                                )}
                                            </div>
                                            <div className="travel-expense-accountant-item-right">
                                                <span className="travel-expense-accountant-status-tag status-pending-accountant">
                                                    CHỜ KẾ TOÁN DUYỆT
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Cột 2: Detail - Form Kiểm tra & Quyết toán (67%) */}
                    <div className="travel-expense-accountant-detail-column">
                        <div className="travel-expense-accountant-detail-container">
                            {selectedRequest ? (
                                <form onSubmit={handleSubmit} className="travel-expense-accountant-form">
                                    {/* Header của Báo cáo */}
                                    <div className="travel-expense-accountant-report-header">
                                        <div className="travel-expense-accountant-report-header-left">
                                            <h2 className="travel-expense-accountant-report-title">
                                                <span className="travel-expense-accountant-report-title-code">{selectedRequest.code}</span>
                                                {' - '}
                                                <span className="travel-expense-accountant-report-title-text">BÁO CÁO QUYẾT TOÁN</span>
                                            </h2>
                                        </div>
                                        <div className="travel-expense-accountant-report-header-right">
                                            <span className="travel-expense-accountant-status-badge status-pending-accountant">
                                                CHỜ KẾ TOÁN DUYỆT
                                            </span>
                                        </div>
                                    </div>

                                    {/* Section I: Thông tin Đề nghị */}
                                    <div className="travel-expense-accountant-section travel-expense-accountant-section-summary">
                                        <h3 className="travel-expense-accountant-section-title">
                                            I. THÔNG TIN ĐỀ NGHỊ
                                        </h3>
                                        <div className="travel-expense-accountant-section-content travel-expense-accountant-section-summary-content">
                                            <div className="travel-expense-accountant-info-grid">
                                                <div className="travel-expense-accountant-info-item">
                                                    <span className="travel-expense-accountant-info-label">Nhân viên/Phòng Ban:</span>
                                                    <span className="travel-expense-accountant-info-value">{selectedRequest.employeeName}</span>
                                                </div>
                                                <div className="travel-expense-accountant-info-item">
                                                    <span className="travel-expense-accountant-info-label">Thời Gian Công Tác:</span>
                                                    <span className="travel-expense-accountant-info-value">{selectedRequest.startDate} - {selectedRequest.endDate}</span>
                                                </div>
                                                <div className="travel-expense-accountant-info-item">
                                                    <span className="travel-expense-accountant-info-label">Ngày Đề Nghị:</span>
                                                    <span className="travel-expense-accountant-info-value">-</span>
                                                </div>
                                                <div className="travel-expense-accountant-info-item">
                                                    <span className="travel-expense-accountant-info-label">Mục Đích Chi Phí:</span>
                                                    <span className="travel-expense-accountant-info-value">{selectedRequest.purpose}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section II: Chi tiết Quyết toán */}
                                    {comparison && (
                                        <div className="travel-expense-accountant-section">
                                            <h3 className="travel-expense-accountant-section-title">
                                                II. CHI TIẾT QUYẾT TOÁN
                                            </h3>
                                            <div className="travel-expense-accountant-section-content">
                                                {/* Summary Cards */}
                                                <div className="travel-expense-accountant-summary-cards">
                                                    <div className="travel-expense-accountant-summary-card">
                                                        <div className="travel-expense-accountant-summary-card-label">Tạm Ứng Ban Đầu</div>
                                                        <div className="travel-expense-accountant-summary-card-value advance">
                                                            {comparison.advanceAmount.toLocaleString('vi-VN')} ₫
                                                        </div>
                                                    </div>
                                                    <div className="travel-expense-accountant-summary-card">
                                                        <div className="travel-expense-accountant-summary-card-label">Chi Phí Thực Tế</div>
                                                        <div className="travel-expense-accountant-summary-card-value actual">
                                                            {comparison.actual.toLocaleString('vi-VN')} ₫
                                                        </div>
                                                    </div>
                                                    <div className="travel-expense-accountant-summary-card">
                                                        <div className="travel-expense-accountant-summary-card-label">Cân Đối Quyết Toán</div>
                                                        <div className={`travel-expense-accountant-summary-card-value balance ${comparison.refundAmount > 0
                                                                ? 'refund'
                                                                : comparison.excessAmount > 0
                                                                    ? 'supplement'
                                                                    : 'balanced'
                                                            }`}>
                                                            {comparison.refundAmount > 0
                                                                ? `${comparison.refundAmount.toLocaleString('vi-VN')} ₫`
                                                                : comparison.excessAmount > 0
                                                                    ? `${comparison.excessAmount.toLocaleString('vi-VN')} ₫`
                                                                    : '0 ₫'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expense List */}
                                                <div className="travel-expense-accountant-expense-list-card">
                                                    <div className="travel-expense-accountant-expense-list-title">
                                                        Danh Sách Khoản Chi:
                                                    </div>
                                                    <div className="travel-expense-accountant-expense-list">
                                                        {selectedRequest.settlementNotes ? (
                                                            <div className="travel-expense-accountant-expense-item">
                                                                <span className="travel-expense-accountant-expense-description">
                                                                    {selectedRequest.settlementNotes}
                                                                </span>
                                                                <span className="travel-expense-accountant-expense-amount">
                                                                    {comparison.actual.toLocaleString('vi-VN')} ₫
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="travel-expense-accountant-expense-item">
                                                                <span className="travel-expense-accountant-expense-description">
                                                                    Chưa có chi tiết khoản chi
                                                                </span>
                                                                <span className="travel-expense-accountant-expense-amount">
                                                                    {comparison.actual.toLocaleString('vi-VN')} ₫
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Section III: Ghi chú và Xử lý */}
                                    <div className="travel-expense-accountant-section">
                                        <h3 className="travel-expense-accountant-section-title">
                                            III. GHI CHÚ VÀ XỬ LÝ
                                        </h3>
                                        <div className="travel-expense-accountant-section-content">
                                            {/* Employee's Note Section */}
                                            {selectedRequest.settlementNotes && (
                                                <div className="travel-expense-accountant-employee-note-card">
                                                    <div className="travel-expense-accountant-employee-note-label">
                                                        Ghi Chú của Nhân Viên:
                                                    </div>
                                                    <div className="travel-expense-accountant-employee-note-content">
                                                        {selectedRequest.settlementNotes}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Processing Department Actions */}
                                            <div className="travel-expense-accountant-actions-card">
                                                <div className="travel-expense-accountant-actions-title">
                                                    HÀNH ĐỘNG CỦA PHÒNG BAN XỬ LÝ (CHỜ KẾ TOÁN DUYỆT)
                                                </div>
                                                <div className="travel-expense-accountant-form-group">
                                                    <textarea
                                                        id="notes"
                                                        className="travel-expense-accountant-form-textarea"
                                                        rows="6"
                                                        value={formData.notes}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                                        placeholder="Nhập ghi chú phê duyệt hoặc yêu cầu bổ sung chứng từ..."
                                                    />
                                                </div>
                                                <div className="travel-expense-accountant-form-actions">
                                                    <button
                                                        type="submit"
                                                        className="travel-expense-accountant-approve-btn"
                                                        disabled={isSubmitting || !comparison}
                                                    >
                                                        PHÊ DUYỆT & CHUYỂN BƯỚC
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="travel-expense-accountant-reject-btn"
                                                        disabled={isSubmitting}
                                                        onClick={() => {
                                                            // TODO: Handle reject action
                                                            showToast?.('Chức năng từ chối sẽ được triển khai sau', 'info');
                                                        }}
                                                    >
                                                        YÊU CẦU BỔ SUNG / TỪ CHỐI
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                <div className="travel-expense-accountant-empty-state">
                                    <p>Vui lòng chọn một yêu cầu từ danh sách để kiểm tra và quyết toán.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TravelExpenseAccountant;

