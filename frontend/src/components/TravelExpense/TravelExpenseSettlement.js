import React, { useState, useEffect } from 'react';
import './TravelExpenseSettlement.css';
import { travelExpensesAPI, employeesAPI } from '../../services/api';

const TravelExpenseSettlement = ({ currentUser, showToast }) => {
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState([]);
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attachments, setAttachments] = useState([]);

    // Form state
    const [formData, setFormData] = useState({
        actualExpense: '',
        notes: ''
    });

    // Fetch requests that are ready for settlement
    useEffect(() => {
        const fetchRequests = async () => {
            setLoading(true);
            try {
                // Fetch all requests (we'll filter by settlement status on frontend)
                const response = await travelExpensesAPI.getAll({});

                if (response.data && response.data.success) {
                    // Fetch employees to get department info
                    const employeesResponse = await employeesAPI.getAll();
                    const employeesMap = new Map();
                    if (employeesResponse.data && employeesResponse.data.success) {
                        employeesResponse.data.data.forEach(emp => {
                            employeesMap.set(emp.id, emp);
                        });
                    }

                    const formattedRequests = (response.data.data || [])
                        .filter(req => {
                            // Only show requests that have advance (TRANSFERRED) and are ready for settlement
                            const hasAdvance = req.advance?.status === 'TRANSFERRED' || req.advance_status === 'TRANSFERRED';
                            const settlementStatus = req.settlement?.status || req.settlement_status;
                            // Include all settlement-related statuses or PENDING_SETTLEMENT
                            return hasAdvance && (
                                req.status === 'PENDING_SETTLEMENT' ||
                                settlementStatus === 'PENDING' ||
                                settlementStatus === 'SUBMITTED' ||
                                settlementStatus === 'HR_CONFIRMED' ||
                                settlementStatus === 'ACCOUNTANT_DONE' ||
                                settlementStatus === 'REJECTED'
                            );
                        })
                        .map(req => {
                            const startDate = req.start_time ? new Date(req.start_time) : null;
                            const endDate = req.end_time ? new Date(req.end_time) : null;
                            const employee = employeesMap.get(req.employee_id || req.employeeId);
                            const createdDate = req.created_at ? new Date(req.created_at) : null;

                            return {
                                id: req.id,
                                code: `TC-${String(req.id).padStart(3, '0')}`,
                                employeeName: req.employee_name || 'N/A',
                                department: employee?.phong_ban || employee?.department || 'N/A',
                                location: req.location || '',
                                locationType: req.locationType || req.location_type,
                                purpose: req.purpose || '',
                                startDate: startDate ? startDate.toLocaleDateString('vi-VN') : '',
                                endDate: endDate ? endDate.toLocaleDateString('vi-VN') : '',
                                startDateRaw: startDate,
                                endDateRaw: endDate,
                                createdDate: createdDate ? createdDate.toLocaleDateString('vi-VN') : '',
                                advanceAmount: req.advance?.amount || req.actual_advance_amount || 0,
                                actualExpense: req.settlement?.actualExpense || req.actual_expense || null,
                                settlementStatus: req.settlement?.status || req.settlement_status || 'PENDING',
                                settlementNotes: req.settlement?.notes || req.settlement_notes || null
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

    // Fetch attachments when request is selected
    useEffect(() => {
        const fetchAttachments = async () => {
            if (!selectedRequestId) {
                setAttachments([]);
                return;
            }

            try {
                const response = await travelExpensesAPI.getAttachments(selectedRequestId);
                if (response.data && response.data.success) {
                    setAttachments(response.data.data || []);
                }
            } catch (error) {
                console.error('Error fetching attachments:', error);
                setAttachments([]);
            }
        };

        fetchAttachments();
    }, [selectedRequestId]);

    // Reset form when selecting a request
    useEffect(() => {
        if (selectedRequest) {
            setFormData({
                actualExpense: selectedRequest.actualExpense ? selectedRequest.actualExpense.toString() : '',
                notes: selectedRequest.settlementNotes || ''
            });
        } else {
            setFormData({
                actualExpense: '',
                notes: ''
            });
        }
    }, [selectedRequestId]);

    // Filter requests
    const filteredRequests = requests.filter(request => {
        const matchesSearch = 
            request.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            request.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
            request.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = statusFilter === 'ALL' || 
            (statusFilter === 'PENDING' && request.settlementStatus === 'PENDING') ||
            (statusFilter === 'SUBMITTED' && request.settlementStatus === 'SUBMITTED') ||
            (statusFilter === 'HR_CONFIRMED' && request.settlementStatus === 'HR_CONFIRMED') ||
            (statusFilter === 'ACCOUNTANT_DONE' && request.settlementStatus === 'ACCOUNTANT_DONE') ||
            (statusFilter === 'REJECTED' && request.settlementStatus === 'REJECTED');
        
        return matchesSearch && matchesStatus;
    });

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedRequest) return;
        if (isSubmitting) return;

        if (!formData.actualExpense || parseFloat(formData.actualExpense) <= 0) {
            showToast?.('Vui lòng nhập chi phí thực tế', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await travelExpensesAPI.submitSettlement(selectedRequest.id, {
                actualExpense: parseFloat(formData.actualExpense),
                notes: formData.notes || null
            });

            if (response.data && response.data.success) {
                showToast?.('Báo cáo hoàn ứng đã được gửi thành công', 'success');
                // Refresh requests
                window.location.reload();
            }
        } catch (error) {
            console.error('Error submitting settlement:', error);
            showToast?.('Lỗi khi gửi báo cáo hoàn ứng: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format currency input
    const formatCurrency = (value) => {
        return value.replace(/\D/g, '');
    };

    const handleActualExpenseChange = (e) => {
        const formatted = formatCurrency(e.target.value);
        setFormData(prev => ({ ...prev, actualExpense: formatted }));
    };

    // Get status tag color and text
    const getStatusTagClass = (status) => {
        switch (status) {
            case 'SUBMITTED':
                return 'status-submitted'; // Chờ HR Xác nhận
            case 'HR_CONFIRMED':
                return 'status-hr-confirmed'; // Chờ Kế Toán Duyệt
            case 'ACCOUNTANT_DONE':
                return 'status-accountant-done'; // Đã Hoàn Tất Quyết Toán
            case 'REJECTED':
                return 'status-rejected'; // Từ Chối
            case 'PENDING':
                return 'status-pending'; // Chờ gửi
            default:
                return 'status-pending';
        }
    };

    const getStatusTagText = (status) => {
        switch (status) {
            case 'SUBMITTED':
                return 'CHỜ HR XÁC NHẬN';
            case 'HR_CONFIRMED':
                return 'CHỜ KẾ TOÁN DUYỆT';
            case 'ACCOUNTANT_DONE':
                return 'ĐÃ HOÀN TẤT QUYẾT TOÁN';
            case 'REJECTED':
                return 'TỪ CHỐI';
            case 'PENDING':
                return 'CHỜ GỬI';
            default:
                return 'CHỜ GỬI';
        }
    };

    // Calculate result
    const calculateResult = () => {
        if (!selectedRequest || !formData.actualExpense) return null;
        
        const advance = selectedRequest.advanceAmount;
        const actual = parseFloat(formData.actualExpense);
        const difference = advance - actual;

        return {
            advance,
            actual,
            difference,
            needsRefund: difference > 0,
            needsSupplement: difference < 0
        };
    };

    const result = calculateResult();

    return (
        <div className="travel-expense-settlement">
            {/* Header */}
            <div className="travel-expense-settlement-header">
                <div className="travel-expense-settlement-header-content">
                    <div className="travel-expense-settlement-icon-wrapper">
                        <svg
                            className="travel-expense-settlement-icon"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    </div>
                    <div>
                        <h1 className="travel-expense-settlement-title">Báo cáo Hoàn ứng</h1>
                        <p className="travel-expense-settlement-subtitle">
                            Ghi nhận chi phí thực tế và báo cáo hoàn ứng công tác
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Container - Master-Detail View */}
            <div className="travel-expense-settlement-main-container">
                <div className="travel-expense-settlement-main-layout">
                    {/* Cột 1: Master - Danh Sách Yêu Cầu (33%) */}
                    <div className="travel-expense-settlement-list-column">
                        <div className="travel-expense-settlement-list-container">
                            <h2 className="travel-expense-settlement-list-title">
                                YÊU CẦU CHỜ DUYỆT
                            </h2>

                            {/* Thanh Công Cụ: Filter + Search */}
                            <div className="travel-expense-settlement-toolbar">
                                <select
                                    className="travel-expense-settlement-status-filter"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="ALL">-- Tất cả trạng thái --</option>
                                    <option value="PENDING">Chờ gửi</option>
                                    <option value="SUBMITTED">Chờ HR Xác nhận</option>
                                    <option value="HR_CONFIRMED">Chờ Kế Toán Duyệt</option>
                                    <option value="ACCOUNTANT_DONE">Đã Hoàn Tất</option>
                                    <option value="REJECTED">Từ Chối</option>
                                </select>
                                <div className="travel-expense-settlement-search-wrapper">
                                    <svg className="travel-expense-settlement-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        className="travel-expense-settlement-search-input"
                                        placeholder="Tìm theo Mã YC, Tên NV..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Request List */}
                            <div className="travel-expense-settlement-list-items">
                                {loading ? (
                                    <div className="travel-expense-settlement-loading">Đang tải...</div>
                                ) : filteredRequests.length === 0 ? (
                                    <div className="travel-expense-settlement-empty">Không có yêu cầu</div>
                                ) : (
                                    filteredRequests.map((request) => (
                                        <div
                                            key={request.id}
                                            className={`travel-expense-settlement-list-item ${selectedRequestId === request.id ? 'active' : ''}`}
                                            onClick={() => setSelectedRequestId(request.id)}
                                        >
                                            <div className="travel-expense-settlement-item-left">
                                                <div className="travel-expense-settlement-request-code">
                                                    {request.code}
                                                </div>
                                                <div className="travel-expense-settlement-employee-name">
                                                    {request.employeeName} ({request.department})
                                                </div>
                                                <div className="travel-expense-settlement-purpose">
                                                    {request.purpose}
                                                </div>
                                                {request.actualExpense && (
                                                    <div className="travel-expense-settlement-actual-expense">
                                                        Chi: {request.actualExpense.toLocaleString('vi-VN')} VND
                                                    </div>
                                                )}
                                            </div>
                                            <div className="travel-expense-settlement-item-right">
                                                <span className={`travel-expense-settlement-status-tag ${getStatusTagClass(request.settlementStatus)}`}>
                                                    {getStatusTagText(request.settlementStatus)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Cột 2: Detail - Form Báo Cáo Quyết Toán (66%) */}
                    <div className="travel-expense-settlement-detail-column">
                        <div className="travel-expense-settlement-detail-container">
                            {selectedRequest ? (
                                <form onSubmit={handleSubmit} className="travel-expense-settlement-form">
                                    {/* Header của Báo cáo */}
                                    <div className="travel-expense-settlement-report-header">
                                        <div className="travel-expense-settlement-report-header-left">
                                            <h2 className="travel-expense-settlement-report-title">
                                                <span className="travel-expense-settlement-report-title-text">BÁO CÁO QUYẾT TOÁN</span>{' '}
                                                <span className="travel-expense-settlement-report-title-code">{selectedRequest.code}</span>
                                            </h2>
                                            <div className="travel-expense-settlement-report-date">
                                                Ngày tạo: {selectedRequest.createdDate}
                                            </div>
                                        </div>
                                        <div className="travel-expense-settlement-report-header-right">
                                            <span className={`travel-expense-settlement-status-badge ${getStatusTagClass(selectedRequest.settlementStatus)}`}>
                                                {getStatusTagText(selectedRequest.settlementStatus)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Section I: Thông tin Công tác và Tóm tắt Ngân sách */}
                                    <div className="travel-expense-settlement-section travel-expense-settlement-section-summary">
                                        <h3 className="travel-expense-settlement-section-title">
                                            I. THÔNG TIN CÔNG TÁC VÀ TÓM TẮT NGÂN SÁCH
                                        </h3>
                                        <div className="travel-expense-settlement-section-content travel-expense-settlement-section-summary-content">
                                            <div className="travel-expense-settlement-info-item-full">
                                                <div>
                                                    <span className="travel-expense-settlement-info-label">Mục Đích Công Tác:</span>
                                                    <span className="travel-expense-settlement-info-value">{selectedRequest.purpose}</span>
                                                </div>
                                                <div>
                                                    <span className="travel-expense-settlement-info-label">Từ Ngày:</span>
                                                    <span className="travel-expense-settlement-info-value">{selectedRequest.startDate}</span>
                                                </div>
                                                <div>
                                                    <span className="travel-expense-settlement-info-label">Đến Ngày:</span>
                                                    <span className="travel-expense-settlement-info-value">{selectedRequest.endDate}</span>
                                                </div>
                                            </div>
                                            <div className="travel-expense-settlement-advance-amount-large">
                                                <span className="travel-expense-settlement-advance-label">Số Tiền Tạm Ứng Ban Đầu:</span>
                                                <span className="travel-expense-settlement-advance-value">
                                                    {selectedRequest.advanceAmount.toLocaleString('vi-VN')} VND
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section II: Chi tiết Chi phí Thực tế và Chứng từ */}
                                    <div className="travel-expense-settlement-section">
                                        <h3 className="travel-expense-settlement-section-title">
                                            II. CHI TIẾT CHI PHÍ THỰC TẾ VÀ CHỨNG TỪ
                                        </h3>
                                        <div className="travel-expense-settlement-section-content">
                                            <div className="travel-expense-settlement-form-group">
                                                <label htmlFor="actualExpense" className="travel-expense-settlement-form-label">
                                                    1. Tổng Chi Phí Thực Tế Đã Chi (VND) <span className="required">*</span>
                                                </label>
                                                {selectedRequest.actualExpense ? (
                                                    <div className="travel-expense-settlement-actual-expense-display">
                                                        {selectedRequest.actualExpense.toLocaleString('vi-VN')} VND
                                                    </div>
                                                ) : (
                                                    <div className="travel-expense-settlement-currency-input-wrapper">
                                                        <input
                                                            type="text"
                                                            id="actualExpense"
                                                            className="travel-expense-settlement-currency-input"
                                                            placeholder="Nhập tổng chi phí thực tế đã chi"
                                                            value={formData.actualExpense}
                                                            onChange={handleActualExpenseChange}
                                                            required
                                                        />
                                                        <span className="travel-expense-settlement-currency-unit">VND</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="travel-expense-settlement-form-group">
                                                <label htmlFor="notes" className="travel-expense-settlement-form-label">
                                                    2. Ghi Chú Chi Tiết Khoản Chi
                                                </label>
                                                {selectedRequest.settlementNotes ? (
                                                    <div className="travel-expense-settlement-notes-display">
                                                        {selectedRequest.settlementNotes}
                                                    </div>
                                                ) : (
                                                    <textarea
                                                        id="notes"
                                                        className="travel-expense-settlement-form-textarea"
                                                        placeholder="Mô tả chi tiết các khoản chi phí thực tế..."
                                                        value={formData.notes}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                                        rows={5}
                                                        required
                                                    />
                                                )}
                                            </div>
                                            {/* Attachments Section */}
                                            <div className="travel-expense-settlement-attachments">
                                                <div className="travel-expense-settlement-attachments-box">
                                                    {attachments.length > 0 ? (
                                                        <>
                                                            <div className="travel-expense-settlement-attachments-info">
                                                                Chứng từ đính kèm: {attachments.length} files đã được HR xác nhận.
                                                            </div>
                                                            <a 
                                                                href="#" 
                                                                className="travel-expense-settlement-attachments-link"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    // TODO: Show attachment list modal
                                                                }}
                                                            >
                                                                Xem danh sách files
                                                            </a>
                                                        </>
                                                    ) : (
                                                        <div className="travel-expense-settlement-attachments-info">
                                                            Chưa có chứng từ đính kèm.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section III: Tổng kết và Quy trình Xác nhận */}
                                    {result && (
                                        <div className="travel-expense-settlement-section travel-expense-settlement-section-summary">
                                            <h3 className="travel-expense-settlement-section-title">
                                                III. TỔNG KẾT VÀ QUY TRÌNH XÁC NHẬN
                                            </h3>
                                            <div className="travel-expense-settlement-section-content travel-expense-settlement-section-summary-content">
                                                <div className="travel-expense-settlement-calculation">
                                                    <div className="travel-expense-settlement-calculation-title">
                                                        TÍNH TOÁN KẾT QUẢ
                                                    </div>
                                                    <div className="travel-expense-settlement-calculation-row">
                                                        <span className="travel-expense-settlement-calculation-label">Tổng số tiền Tạm ứng:</span>
                                                        <span className="travel-expense-settlement-calculation-value advance">
                                                            {result.advance.toLocaleString('vi-VN')} VND
                                                        </span>
                                                    </div>
                                                    <div className="travel-expense-settlement-calculation-row">
                                                        <span className="travel-expense-settlement-calculation-label">Tổng chi phí Thực tế đã chi:</span>
                                                        <span className="travel-expense-settlement-calculation-value actual">
                                                            {result.actual.toLocaleString('vi-VN')} VND
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="travel-expense-settlement-result">
                                                    <div className="travel-expense-settlement-result-title">KẾT QUẢ:</div>
                                                    <div className={`travel-expense-settlement-result-amount ${result.needsRefund ? 'refund' : result.needsSupplement ? 'supplement' : 'balanced'}`}>
                                                        {Math.abs(result.difference).toLocaleString('vi-VN')} VND
                                                    </div>
                                                    <div className="travel-expense-settlement-result-description">
                                                        {result.needsRefund 
                                                            ? 'Số tiền CẦN HOÀN TRẢ lại công ty.'
                                                            : result.needsSupplement
                                                            ? 'Số tiền CÔNG TY CẦN BỔ SUNG.'
                                                            : 'Số tiền khớp với tạm ứng.'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Mục IV: Khối Hành Động (chỉ hiện khi cần) */}
                                    {selectedRequest.settlementStatus === 'PENDING' && (
                                        <div className="travel-expense-settlement-section">
                                            <h3 className="travel-expense-settlement-section-title">
                                                IV. Khối Hành Động
                                            </h3>
                                            <div className="travel-expense-settlement-actions">
                                                <button
                                                    type="submit"
                                                    className="travel-expense-settlement-submit-btn"
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? 'Đang gửi...' : 'Gửi Báo cáo Hoàn ứng'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </form>
                            ) : (
                                <div className="travel-expense-settlement-empty-detail">
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

export default TravelExpenseSettlement;
