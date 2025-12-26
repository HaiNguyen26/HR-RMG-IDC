import React, { useState, useEffect } from 'react';
import './TravelExpenseManagement.css';
import { travelExpensesAPI, employeesAPI } from '../../services/api';

const TravelExpenseAdvanceProcessing = ({ currentUser, showToast, showConfirm }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        actualAmount: '',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch travel expense requests from API
    useEffect(() => {
        const fetchRequests = async () => {
            setLoading(true);
            try {
                // Fetch PENDING_FINANCE requests (sau khi Manager/Branch Director/CEO duyệt)
                // Lưu ý: Đối với công tác trong nước đã được manager duyệt:
                // - Nếu manager cũng là branch director → tự động chuyển sang PENDING_FINANCE (đã được xử lý bởi backend)
                // - Nếu manager không phải branch director → chuyển sang PENDING_LEVEL_2, cần branch director duyệt trước khi chuyển sang PENDING_FINANCE
                const response = await travelExpensesAPI.getAll({
                    status: 'PENDING_FINANCE'
                });

                console.log('[TravelExpenseAdvanceProcessing] API response for PENDING_FINANCE:', response);

                if (response.data && response.data.success) {
                    console.log('[TravelExpenseAdvanceProcessing] Found', response.data.data.length, 'requests with PENDING_FINANCE status');

                    // Filter: Chỉ hiển thị các đơn chưa được HR xử lý tạm ứng
                    // (loại bỏ các đơn đã có advance_status = 'PENDING_ACCOUNTANT' hoặc 'TRANSFERRED')
                    const unprocessedRequests = response.data.data.filter(req => {
                        const advanceStatus = req.advance_status || req.advance?.status;
                        // Chỉ hiển thị nếu chưa có advance_status hoặc advance_status là NULL
                        return !advanceStatus || (advanceStatus !== 'PENDING_ACCOUNTANT' && advanceStatus !== 'TRANSFERRED');
                    });

                    console.log('[TravelExpenseAdvanceProcessing] Filtered to', unprocessedRequests.length, 'unprocessed requests (excluding PENDING_ACCOUNTANT/TRANSFERRED)');

                    // Debug: Log status của các requests nếu có
                    if (unprocessedRequests.length === 0) {
                        console.warn('[TravelExpenseAdvanceProcessing] No unprocessed requests with PENDING_FINANCE status.');
                        console.warn('[TravelExpenseAdvanceProcessing] Lưu ý: Nếu manager duyệt công tác trong nước nhưng manager không phải giám đốc chi nhánh, request sẽ ở PENDING_LEVEL_2 (cần giám đốc chi nhánh duyệt trước).');
                    }
                    // Fetch employee bank accounts
                    const employeesResponse = await employeesAPI.getAll();
                    const employeesMap = new Map();
                    if (employeesResponse.data && employeesResponse.data.success) {
                        employeesResponse.data.data.forEach(emp => {
                            employeesMap.set(emp.id, emp);
                        });
                    }

                    const formattedRequests = unprocessedRequests.map(req => {
                        const employee = employeesMap.get(req.employeeId || req.employee_id);
                        return {
                            id: req.id,
                            code: `CTX-${req.id}`,
                            employeeName: req.employee_name || req.employeeName || 'N/A',
                            location: req.location || '',
                            isDomestic: (req.locationType || req.location_type) === 'DOMESTIC',
                            purpose: req.purpose || '',
                            startDate: req.startTime ? new Date(req.startTime).toLocaleDateString('vi-VN') : '',
                            endDate: req.endTime ? new Date(req.endTime).toLocaleDateString('vi-VN') : '',
                            status: req.status || '',
                            employee_id: req.employeeId || req.employee_id,
                            requestedAdvanceAmount: req.requestedAdvanceAmount || req.requested_advance_amount || null,
                            bankAccount: employee?.tai_khoan_ngan_hang || employee?.bankAccount || '',
                            advance: req.advance || null
                        };
                    });

                    setRequests(formattedRequests);
                } else {
                    setRequests([]);
                }
            } catch (error) {
                console.error('[TravelExpenseAdvanceProcessing] Error fetching travel expense requests:', error);
                showToast?.('Lỗi khi tải danh sách yêu cầu: ' + (error.message || 'Unknown error'), 'error');
                setRequests([]);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            fetchRequests();
        }
    }, [showToast, currentUser]);

    const filteredRequests = requests.filter(request =>
        request.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedRequest = requests.find(req => req.id === selectedRequestId) || null;

    // Reset form when selecting a request
    useEffect(() => {
        if (selectedRequest) {
            // Mặc định = số tiền nhân viên yêu cầu (nhân viên tự đặt)
            setFormData({
                actualAmount: selectedRequest.requestedAdvanceAmount ? selectedRequest.requestedAdvanceAmount.toString() : '',
                notes: ''
            });
        }
    }, [selectedRequestId]);

    // Format currency input
    const handleAmountChange = (e) => {
        let value = e.target.value.replace(/[^\d]/g, '');
        setFormData(prev => ({ ...prev, actualAmount: value }));
    };

    // Get formatted amount for display
    const getFormattedAmount = () => {
        if (!formData.actualAmount) return '';
        return parseInt(formData.actualAmount).toLocaleString('vi-VN');
    };

    // Validate form
    const validateForm = () => {
        if (!formData.actualAmount) return 'Vui lòng nhập số tiền tạm ứng.';
        // Ghi chú không bắt buộc

        const amount = parseInt(formData.actualAmount);
        if (isNaN(amount) || amount <= 0) return 'Số tiền phải lớn hơn 0.';

        return null;
    };

    // Handle submit
    const handleSubmit = async () => {
        const error = validateForm();
        if (error) {
            showToast?.(error, 'warning');
            return;
        }

        if (!selectedRequestId) {
            showToast?.('Vui lòng chọn yêu cầu cần xử lý tạm ứng', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await travelExpensesAPI.processAdvance(selectedRequestId, {
                actualAmount: formData.actualAmount,
                notes: formData.notes || '',
                processedBy: currentUser?.id || null,
                advanceCase: 'employee_self' // Mặc định là nhân viên tự đặt
            });

            if (response.data && response.data.success) {
                showToast?.('Đã xử lý tạm ứng thành công! Yêu cầu đã được gửi đến Kế toán.', 'success');

                // Reset form
                setFormData({
                    actualAmount: '',
                    notes: ''
                });
                setSelectedRequestId(null);

                // Refresh requests list
                const refreshResponse = await travelExpensesAPI.getAll({
                    status: 'PENDING_FINANCE'
                });
                if (refreshResponse.data && refreshResponse.data.success) {
                    // Filter: Chỉ hiển thị các đơn chưa được HR xử lý tạm ứng
                    const unprocessedRequests = refreshResponse.data.data.filter(req => {
                        const advanceStatus = req.advance_status || req.advance?.status;
                        return !advanceStatus || (advanceStatus !== 'PENDING_ACCOUNTANT' && advanceStatus !== 'TRANSFERRED');
                    });

                    const employeesResponse = await employeesAPI.getAll();
                    const employeesMap = new Map();
                    if (employeesResponse.data && employeesResponse.data.success) {
                        employeesResponse.data.data.forEach(emp => {
                            employeesMap.set(emp.id, emp);
                        });
                    }
                    const formattedRequests = unprocessedRequests.map(req => {
                        const employee = employeesMap.get(req.employeeId || req.employee_id);
                        return {
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
                            requestedAdvanceAmount: req.requestedAdvanceAmount || req.requested_advance_amount || null,
                            bankAccount: employee?.tai_khoan_ngan_hang || employee?.bankAccount || '',
                            advance: req.advance || null
                        };
                    });
                    setRequests(formattedRequests);
                }
            }
        } catch (error) {
            console.error('Error processing advance:', error);
            showToast?.('Lỗi khi xử lý tạm ứng: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="travel-expense-management">
            {/* Header */}
            <div className="travel-expense-management-header">
                <div className="travel-expense-management-header-content">
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

                    <div className="travel-expense-management-header-text">
                        <h2 className="travel-expense-management-title">
                            Xử Lý Tạm Ứng Công Tác
                        </h2>
                        <p className="travel-expense-management-subtitle">
                            Xử lý tạm ứng cho các yêu cầu công tác đã được phê duyệt
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Container */}
            <div className="travel-expense-management-main-container">
                <div className="travel-expense-management-main-layout">
                    {/* Left Column: Request List */}
                    <div className="travel-expense-management-list-column">
                        <div className="travel-expense-list-column-container">
                            <h2 className="travel-expense-list-title">
                                Danh Sách Chờ Xử Lý Tạm Ứng
                            </h2>

                            <div className="travel-expense-search-wrapper">
                                <input
                                    type="text"
                                    className="travel-expense-search-input"
                                    placeholder="Tìm kiếm theo mã, tên, địa điểm..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="travel-expense-list-items">
                                {loading ? (
                                    <div className="travel-expense-loading">Đang tải...</div>
                                ) : filteredRequests.length === 0 ? (
                                    <div className="travel-expense-empty">
                                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                                            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: '500' }}>
                                                Không có yêu cầu nào chờ xử lý tạm ứng
                                            </p>
                                            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                                                Các yêu cầu công tác đã được phê duyệt (bởi Quản lý trực tiếp, Giám đốc chi nhánh, hoặc Tổng giám đốc) sẽ xuất hiện ở đây để HR xử lý tạm ứng.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    filteredRequests.map((request) => (
                                        <div
                                            key={request.id}
                                            className={`travel-expense-list-item ${selectedRequestId === request.id ? 'active' : ''}`}
                                            onClick={() => setSelectedRequestId(request.id)}
                                        >
                                            <div className="travel-expense-item-left">
                                                <div className="travel-expense-request-code">
                                                    {request.code}
                                                </div>
                                                <div className="travel-expense-request-employee">
                                                    {request.employeeName}
                                                </div>
                                            </div>

                                            <div className="travel-expense-item-right">
                                                <div className="travel-expense-request-location">
                                                    {request.location}
                                                </div>
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

                    {/* Right Column: Advance Processing Form */}
                    <div className="travel-expense-management-detail-column">
                        <div className="travel-expense-detail-column-container">
                            {selectedRequest ? (
                                <>
                                    {/* Summary Block */}
                                    <div className="travel-expense-summary-block">
                                        <h3 className="travel-expense-summary-title">
                                            Thông tin Yêu Cầu - {selectedRequest.code}
                                        </h3>

                                        <div className="travel-expense-summary-content">
                                            <div className="travel-expense-summary-left">
                                                <div className="travel-expense-summary-item">
                                                    <span className="travel-expense-summary-label">Nhân viên:</span>
                                                    <span className="travel-expense-summary-value">{selectedRequest.employeeName}</span>
                                                </div>
                                                <div className="travel-expense-summary-item">
                                                    <span className="travel-expense-summary-label">Địa điểm:</span>
                                                    <span className="travel-expense-summary-value">
                                                        {selectedRequest.isDomestic ? `${selectedRequest.location} (Trong nước)` : `${selectedRequest.location} (Nước ngoài)`}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="travel-expense-summary-right">
                                                <div className="travel-expense-summary-item">
                                                    <span className="travel-expense-summary-label">Mục đích:</span>
                                                    <span className="travel-expense-summary-value">{selectedRequest.purpose}</span>
                                                </div>
                                                <div className="travel-expense-summary-item">
                                                    <span className="travel-expense-summary-label">Số tiền yêu cầu:</span>
                                                    <span className="travel-expense-summary-value">
                                                        {selectedRequest.requestedAdvanceAmount
                                                            ? `${selectedRequest.requestedAdvanceAmount.toLocaleString('vi-VN')} VND`
                                                            : 'Chưa có'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Alert */}
                                    {selectedRequest.requestedAdvanceAmount && (
                                        <div className="travel-expense-indigo-alert">
                                            <div className="travel-expense-indigo-alert-header">
                                                <svg className="travel-expense-indigo-alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                                <span className="travel-expense-indigo-alert-title">Thông tin</span>
                                            </div>
                                            <div className="travel-expense-indigo-alert-content">
                                                <p className="travel-expense-indigo-alert-message">
                                                    Nhân viên đã yêu cầu tạm ứng: <strong>{selectedRequest.requestedAdvanceAmount.toLocaleString('vi-VN')} VND</strong>
                                                </p>
                                                <p className="travel-expense-indigo-alert-warning">
                                                    Số tiền mặc định = số tiền nhân viên yêu cầu. Bạn có thể điều chỉnh nếu cần.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Form */}
                                    <div className="travel-expense-advance-form">
                                        <h4 className="travel-expense-form-section-title">
                                            Form Xử Lý Tạm Ứng
                                        </h4>

                                        <div className="travel-expense-advance-form-content">
                                            {/* Actual Amount */}
                                            <div className="travel-expense-form-group">
                                                <label htmlFor="actualAmount" className="travel-expense-form-label">
                                                    1. Số tiền Thực Tạm ứng <span className="required">*</span>
                                                </label>
                                                <div className="travel-expense-currency-input-wrapper">
                                                    <input
                                                        type="text"
                                                        id="actualAmount"
                                                        className="travel-expense-form-input travel-expense-currency-input"
                                                        value={getFormattedAmount()}
                                                        onChange={handleAmountChange}
                                                        placeholder="Nhập số tiền thực tế sẽ tạm ứng"
                                                        required
                                                    />
                                                    <span className="travel-expense-currency-suffix">VND</span>
                                                </div>
                                                <p className="travel-expense-input-hint">
                                                    Số tiền mặc định = số tiền nhân viên yêu cầu. Có thể điều chỉnh nếu cần.
                                                </p>
                                            </div>

                                            {/* Notes */}
                                            <div className="travel-expense-form-group">
                                                <label htmlFor="notes" className="travel-expense-form-label">
                                                    2. Ghi chú
                                                </label>
                                                <textarea
                                                    id="notes"
                                                    className="travel-expense-form-textarea"
                                                    rows="4"
                                                    value={formData.notes}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                                    placeholder="Nhập ghi chú xác nhận (tùy chọn)"
                                                />
                                                <p className="travel-expense-input-hint">
                                                    Ghi chú xác nhận số tiền tạm ứng (không bắt buộc).
                                                </p>
                                            </div>

                                            {/* Form Actions */}
                                            <div className="travel-expense-form-actions">
                                                <button
                                                    type="button"
                                                    className="travel-expense-primary-button"
                                                    onClick={handleSubmit}
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? 'Đang xử lý...' : '✅ Xử Lý Tạm Ứng'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="travel-expense-secondary-button"
                                                    onClick={() => {
                                                        setFormData({
                                                            actualAmount: '',
                                                            notes: ''
                                                        });
                                                    }}
                                                >
                                                    Đặt lại
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="travel-expense-no-selection">
                                    Vui lòng chọn một yêu cầu từ danh sách để xử lý tạm ứng
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TravelExpenseAdvanceProcessing;


