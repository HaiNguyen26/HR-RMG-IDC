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
        advanceMethod: '',
        notes: ''
    });
    const [advanceCase, setAdvanceCase] = useState('employee_self'); // 'hr_booked' or 'employee_self'
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch travel expense requests from API
    useEffect(() => {
        const fetchRequests = async () => {
            setLoading(true);
            try {
                // Fetch PENDING_FINANCE requests (sau khi CEO/Manager duyệt)
                const response = await travelExpensesAPI.getAll({
                    status: 'PENDING_FINANCE'
                });

                if (response.data && response.data.success) {
                    // Fetch employee bank accounts
                    const employeesResponse = await employeesAPI.getAll();
                    const employeesMap = new Map();
                    if (employeesResponse.data && employeesResponse.data.success) {
                        employeesResponse.data.data.forEach(emp => {
                            employeesMap.set(emp.id, emp);
                        });
                    }

                    const formattedRequests = response.data.data.map(req => {
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

    // Reset form when selecting a request
    useEffect(() => {
        if (selectedRequest) {
            if (advanceCase === 'employee_self') {
                // Trường hợp 2: Nhân viên tự đặt - mặc định = số tiền nhân viên yêu cầu
                setFormData({
                    actualAmount: selectedRequest.requestedAdvanceAmount ? selectedRequest.requestedAdvanceAmount.toString() : '',
                    advanceMethod: '',
                    notes: ''
                });
            } else {
                // Trường hợp 1: HR đặt dịch vụ - để trống để HR nhập
                setFormData({
                    actualAmount: '',
                    advanceMethod: '',
                    notes: ''
                });
            }
        }
    }, [selectedRequestId, advanceCase]);

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
        if (!formData.advanceMethod) return 'Vui lòng chọn hình thức tạm ứng.';
        if (!formData.notes.trim()) return 'Vui lòng nhập ghi chú.';

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
                advanceMethod: formData.advanceMethod,
                bankAccount: selectedRequest.bankAccount,
                notes: formData.notes,
                processedBy: currentUser?.id || null,
                advanceCase: advanceCase
            });

            if (response.data && response.data.success) {
                showToast?.('Đã xử lý tạm ứng thành công! Yêu cầu đã được gửi đến Kế toán.', 'success');
                
                // Reset form
                setFormData({
                    actualAmount: '',
                    advanceMethod: '',
                    notes: ''
                });
                setSelectedRequestId(null);
                
                // Refresh requests list
                const refreshResponse = await travelExpensesAPI.getAll({
                    status: 'PENDING_FINANCE'
                });
                if (refreshResponse.data && refreshResponse.data.success) {
                    const employeesResponse = await employeesAPI.getAll();
                    const employeesMap = new Map();
                    if (employeesResponse.data && employeesResponse.data.success) {
                        employeesResponse.data.data.forEach(emp => {
                            employeesMap.set(emp.id, emp);
                        });
                    }
                    const formattedRequests = refreshResponse.data.data.map(req => {
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
                                    <div className="travel-expense-empty">Không có yêu cầu nào</div>
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

                                    {/* Advance Case Selection */}
                                    <div className="travel-expense-form-group">
                                        <label className="travel-expense-form-label">
                                            Trường hợp Tạm ứng <span className="required">*</span>
                                        </label>
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    name="advanceCase"
                                                    value="hr_booked"
                                                    checked={advanceCase === 'hr_booked'}
                                                    onChange={(e) => setAdvanceCase(e.target.value)}
                                                />
                                                <span>HR đặt dịch vụ</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    name="advanceCase"
                                                    value="employee_self"
                                                    checked={advanceCase === 'employee_self'}
                                                    onChange={(e) => setAdvanceCase(e.target.value)}
                                                />
                                                <span>Nhân viên tự đặt</span>
                                            </label>
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
                                                {advanceCase === 'employee_self' && (
                                                    <p className="travel-expense-indigo-alert-warning">
                                                        Số tiền mặc định = số tiền nhân viên yêu cầu. Bạn có thể điều chỉnh nếu cần.
                                                    </p>
                                                )}
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
                                                    {advanceCase === 'hr_booked' 
                                                        ? 'Nhập số tiền thực tế HR đã đặt dịch vụ và cần tạm ứng cho nhân viên.'
                                                        : 'Số tiền mặc định = số tiền nhân viên yêu cầu. Có thể điều chỉnh nếu cần.'}
                                                </p>
                                            </div>

                                            {/* Advance Method */}
                                            <div className="travel-expense-form-group">
                                                <label htmlFor="advanceMethod" className="travel-expense-form-label">
                                                    2. Hình thức Tạm ứng <span className="required">*</span>
                                                </label>
                                                <select
                                                    id="advanceMethod"
                                                    className="travel-expense-form-select"
                                                    value={formData.advanceMethod}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, advanceMethod: e.target.value }))}
                                                    required
                                                >
                                                    <option value="">Chọn hình thức thanh toán</option>
                                                    <option value="bank_transfer">Chuyển khoản Ngân hàng</option>
                                                    <option value="cash">Tiền mặt</option>
                                                    <option value="company_card">Thẻ công ty</option>
                                                </select>
                                                <p className="travel-expense-input-hint">
                                                    Chọn hình thức thanh toán tạm ứng.
                                                </p>
                                            </div>

                                            {/* Bank Account (Readonly) */}
                                            <div className="travel-expense-form-group">
                                                <label htmlFor="bankAccount" className="travel-expense-form-label">
                                                    3. Tài khoản Ngân hàng nhận
                                                </label>
                                                <input
                                                    type="text"
                                                    id="bankAccount"
                                                    className="travel-expense-form-input travel-expense-form-input-readonly"
                                                    value={selectedRequest.bankAccount || ''}
                                                    readOnly
                                                    disabled
                                                    placeholder="Thông tin tài khoản từ hồ sơ nhân viên"
                                                />
                                                <p className="travel-expense-input-hint">
                                                    Thông tin tài khoản tự động lấy từ hồ sơ nhân viên.
                                                </p>
                                            </div>

                                            {/* Notes */}
                                            <div className="travel-expense-form-group">
                                                <label htmlFor="notes" className="travel-expense-form-label">
                                                    4. Ghi chú <span className="required">*</span>
                                                </label>
                                                <textarea
                                                    id="notes"
                                                    className="travel-expense-form-textarea"
                                                    rows="4"
                                                    value={formData.notes}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                                    placeholder={advanceCase === 'hr_booked' 
                                                        ? 'Nhập ghi chú về dịch vụ đã đặt (ví dụ: Đã đặt vé máy bay, khách sạn...)' 
                                                        : 'Nhập ghi chú xác nhận (ví dụ: Xác nhận số tiền nhân viên tự đặt...)'}
                                                    required
                                                />
                                                <p className="travel-expense-input-hint">
                                                    {advanceCase === 'hr_booked' 
                                                        ? 'Mô tả chi tiết về dịch vụ HR đã đặt và cần tạm ứng.'
                                                        : 'Ghi chú xác nhận số tiền tạm ứng cho nhân viên tự đặt.'}
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
                                                            advanceMethod: '',
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


