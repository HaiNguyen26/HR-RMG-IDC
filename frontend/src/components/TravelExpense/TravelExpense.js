import React, { useEffect, useMemo, useState, useRef } from 'react';
import './TravelExpense.css';
import { destinations } from './destinations';

const TravelExpense = ({ currentUser, showToast, showConfirm }) => {
    // State cho form
    const [formData, setFormData] = useState({
        purpose: '',                 // Mục đích công tác
        partnerCompany: '',          // Tên công ty/đối tác
        companyAddress: '',          // Địa chỉ công ty
        destination: '',             // Địa điểm công tác
        startDateTime: '',           // Ngày giờ bắt đầu
        endDateTime: '',             // Ngày giờ kết thúc
        requestedAdvanceAmount: '',  // Số tiền cần tạm ứng (theo đơn vị đã chọn)
        requestedAdvanceCurrency: 'VND'  // Đơn vị tiền tệ tạm ứng
    });

    // State cho phí sinh hoạt tự động và châu lục
    const [livingAllowance, setLivingAllowance] = useState(null);
    const [continent, setContinent] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State cho autocomplete dropdown
    const [isDestinationDropdownOpen, setIsDestinationDropdownOpen] = useState(false);
    const [destinationSearchQuery, setDestinationSearchQuery] = useState('');
    const destinationDropdownRef = useRef(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Khi nhập địa điểm, mở dropdown và cập nhật search query
        if (name === 'destination') {
            setDestinationSearchQuery(value);
            setIsDestinationDropdownOpen(true);
        }
    };

    // Filter destinations based on search query
    const filteredDestinations = useMemo(() => {
        if (!destinationSearchQuery) return destinations.slice(0, 50); // Show first 50 when no search

        const query = destinationSearchQuery.toLowerCase().trim();
        return destinations.filter(dest =>
            dest.label.toLowerCase().includes(query) ||
            dest.value.toLowerCase().includes(query)
        ).slice(0, 50); // Limit to 50 results
    }, [destinationSearchQuery]);

    // Handle destination selection
    const handleDestinationSelect = (destination) => {
        setFormData(prev => ({
            ...prev,
            destination: destination.value
        }));
        setDestinationSearchQuery(destination.value);
        setIsDestinationDropdownOpen(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (destinationDropdownRef.current && !destinationDropdownRef.current.contains(event.target)) {
                setIsDestinationDropdownOpen(false);
            }
        };

        if (isDestinationDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDestinationDropdownOpen]);

    // Xác định travelScope từ destination đã chọn
    const travelScope = useMemo(() => {
        if (!formData.destination) return null;

        // Tìm destination trong danh sách
        const selectedDest = destinations.find(d => d.value === formData.destination);
        if (selectedDest) {
            return selectedDest.type === 'domestic' ? 'domestic' : 'international';
        }

        // Fallback: kiểm tra theo keyword nếu không tìm thấy exact match
        const destinationLower = formData.destination.toLowerCase().trim();
        const domesticKeywords = ['hà nội', 'hanoi', 'tp.hcm', 'tphcm', 'ho chi minh', 'hồ chí minh', 'đà nẵng', 'da nang', 'hải phòng', 'hai phong', 'cần thơ', 'can tho', 'việt nam', 'vietnam'];

        for (const keyword of domesticKeywords) {
            if (destinationLower.includes(keyword)) {
                return 'domestic';
            }
        }

        return 'international'; // Default to international if not domestic
    }, [formData.destination]);

    // Tính toán travelTiming
    const travelTiming = useMemo(() => {
        if (!formData.startDateTime || !formData.endDateTime) {
            return { ready: false };
        }

        const start = new Date(formData.startDateTime);
        const end = new Date(formData.endDateTime);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return { ready: false };
        }

        if (end < start) {
            return {
                ready: true,
                isValid: false,
                error: 'Ngày & giờ kết thúc phải bằng hoặc sau thời điểm bắt đầu.'
            };
        }

        const diffHours = (end - start) / (1000 * 60 * 60);
        const overnightThreshold = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        const isOvernight = end > overnightThreshold;

        return {
            ready: true,
            isValid: true,
            diffHours,
            isOvernight
        };
    }, [formData.startDateTime, formData.endDateTime]);

    // Xác định châu lục và tính phí sinh hoạt tự động
    useEffect(() => {
        if (travelScope === 'international' && formData.destination) {
            // Tìm destination trong danh sách để lấy continent
            const selectedDest = destinations.find(d => d.value === formData.destination);

            let detectedContinent = selectedDest?.continent || null;
            let allowance = null;

            // Tính phí sinh hoạt dựa trên châu lục
            if (detectedContinent === 'EU') {
                allowance = { amount: 60, currency: 'USD' };
            } else if (detectedContinent === 'ASIAN') {
                allowance = { amount: 40, currency: 'USD' };
            } else if (detectedContinent === 'AMERICAS') {
                allowance = { amount: 50, currency: 'USD' };
            } else if (detectedContinent === 'OCEANIA') {
                allowance = { amount: 55, currency: 'USD' };
            } else if (detectedContinent === 'AFRICA') {
                allowance = { amount: 45, currency: 'USD' };
            }

            setContinent(detectedContinent);
            setLivingAllowance(allowance);
        } else if (travelScope === 'domestic' && travelTiming.ready && travelTiming.isOvernight) {
            // Trong nước và qua đêm: phụ cấp 250k/ngày
            const start = new Date(formData.startDateTime);
            const end = new Date(formData.endDateTime);
            const diffMs = end - start;
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)); // Số ngày (làm tròn lên), nếu tính là 24h thì vẫn tính là 250k/ngày
            const allowanceAmount = diffDays * 250000; // 250k VND mỗi ngày

            setContinent(null);
            setLivingAllowance({ amount: allowanceAmount, currency: 'VND' });
        } else {
            setContinent(null);
            setLivingAllowance(null);
        }
    }, [travelScope, formData.destination, formData.startDateTime, formData.endDateTime, travelTiming]);


    const travelTimeInsight = useMemo(() => {
        if (!travelTiming.ready) return null;

        if (!travelTiming.isValid) {
            return {
                type: 'error',
                title: 'Khoảng thời gian chưa hợp lệ',
                detail: travelTiming.error || 'Ngày & giờ kết thúc phải bằng hoặc sau thời điểm bắt đầu.'
            };
        }

        return {
            type: 'info',
            title: travelTiming.isOvernight ? 'Chuyến đi qua đêm' : 'Chuyến đi trong ngày',
            detail: `Tổng thời gian dự kiến ~ ${travelTiming.diffHours.toFixed(1)} giờ.`
        };
    }, [travelTiming]);

    const autoStatusItems = useMemo(() => [
        {
            id: 'overnight',
            icon: travelTiming.ready && travelTiming.isOvernight ? '✓' : '—',
            label: 'Qua Đêm',
            value: travelTiming.ready
                ? travelTiming.isOvernight
                    ? 'CÓ (Áp dụng phụ cấp lưu trú)'
                    : 'KHÔNG'
                : 'Chưa xác định',
            tone: !travelTiming.ready ? 'muted' : travelTiming.isOvernight ? 'indigo' : 'default',
            note: null
        },
        {
            id: 'scope',
            icon: travelScope === 'international' ? 'dot' : travelScope === 'domestic' ? 'dot' : '—',
            label: 'Phạm vi',
            value: travelScope === 'international'
                ? 'NƯỚC NGOÀI'
                : travelScope === 'domestic'
                    ? 'Trong Nước'
                    : 'Chưa chọn địa điểm',
            tone: travelScope === 'international' ? 'indigo' : travelScope ? 'default' : 'muted',
            note: null
        },
        {
            id: 'duration',
            icon: '🕒',
            label: 'Tổng thời gian',
            value: travelTiming.ready
                ? travelTiming.isValid
                    ? `${travelTiming.diffHours.toFixed(1)} giờ.`
                    : 'Thời gian chưa hợp lệ'
                : 'Chưa xác định',
            tone: !travelTiming.ready ? 'muted' : travelTiming.isValid ? 'info' : 'error',
            note: null
        },
        ...(livingAllowance ? [{
            id: 'livingAllowance',
            icon: '💰',
            label: 'Phí Sinh Hoạt Tự Động',
            value: `${livingAllowance.currency === 'VND' ? livingAllowance.amount.toLocaleString('vi-VN') : livingAllowance.amount} ${livingAllowance.currency}`,
            tone: 'indigo',
            note: travelScope === 'domestic' && travelTiming.isOvernight
                ? `Hệ thống tự động cấp phụ cấp lưu trú 250,000 VND/ngày cho công tác trong nước qua đêm`
                : `Hệ thống tự động cấp phí sinh hoạt cho công tác ${travelScope === 'international' ? (continent === 'EU' ? 'Châu Âu' : continent === 'ASIAN' ? 'Châu Á' : 'nước ngoài') : 'trong nước'}`
        }] : [])
    ], [travelScope, travelTiming, livingAllowance, continent]);

    const isFormReady = Boolean(
        formData.purpose.trim() &&
        formData.destination &&
        formData.startDateTime &&
        formData.endDateTime
    );

    // Format số tiền
    const formatCurrency = (value) => {
        if (!value) return '';
        const numValue = value.toString().replace(/[^\d]/g, '');
        return numValue ? parseInt(numValue).toLocaleString('vi-VN') : '';
    };

    const handleAmountChange = (e) => {
        const value = e.target.value.replace(/[^\d]/g, '');
        setFormData(prev => ({ ...prev, requestedAdvanceAmount: value }));
    };

    const handleCurrencyChange = (e) => {
        setFormData(prev => ({ ...prev, requestedAdvanceCurrency: e.target.value }));
    };

    const validateForm = () => {
        const errors = [];

        if (!formData.purpose.trim()) {
            errors.push('Vui lòng nhập mục đích công tác.');
        }

        if (!formData.destination || !formData.destination.trim()) {
            errors.push('Vui lòng chọn địa điểm công tác từ danh sách.');
        }

        if (!formData.startDateTime || !formData.endDateTime) {
            errors.push('Vui lòng nhập đầy đủ ngày & giờ công tác.');
        }

        if (travelTiming.ready && !travelTiming.isValid) {
            errors.push(travelTiming.error || 'Khoảng thời gian chưa hợp lệ.');
        }

        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) return;

        const errors = validateForm();

        if (errors.length > 0) {
            if (showToast) {
                showToast(errors[0], 'error');
            }
            return;
        }

        setIsSubmitting(true);

        try {
            // Import API
            const { travelExpensesAPI } = await import('../../services/api');

            // Xác định locationType (đảm bảo travelScope đã được xác định qua validation)
            const locationType = travelScope === 'international' ? 'INTERNATIONAL' : (travelScope === 'domestic' ? 'DOMESTIC' : 'DOMESTIC');

            // Format datetime
            const startTime = new Date(formData.startDateTime).toISOString();
            const endTime = new Date(formData.endDateTime).toISOString();

            const requestData = {
                employeeId: currentUser?.employeeId || currentUser?.id,
                purpose: formData.purpose.trim(),
                companyName: formData.partnerCompany.trim() || null,
                companyAddress: formData.companyAddress.trim() || null,
                location: formData.destination,
                locationType: locationType,
                startTime: startTime,
                endTime: endTime,
                requestedAdvanceAmount: formData.requestedAdvanceAmount ? parseFloat(formData.requestedAdvanceAmount.replace(/[^\d]/g, '')) : null,
                requestedAdvanceCurrency: formData.requestedAdvanceCurrency || 'VND',
            };

            const response = await travelExpensesAPI.create(requestData);

            if (response.data.success) {
                if (showToast) {
                    showToast('✅ Yêu cầu công tác đã được gửi thành công!', 'success');
                }
                // Reset form
                setFormData({
                    purpose: '',
                    partnerCompany: '',
                    companyAddress: '',
                    destination: '',
                    startDateTime: '',
                    endDateTime: '',
                    requestedAdvanceAmount: '',
                    requestedAdvanceCurrency: 'VND'
                });
                setContinent(null);
                setLivingAllowance(null);
            } else {
                if (showToast) {
                    showToast(response.data.message || 'Có lỗi xảy ra khi gửi yêu cầu', 'error');
                }
            }
        } catch (error) {
            console.error('Error submitting travel expense request:', error);
            if (showToast) {
                showToast(
                    error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.',
                    'error'
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="travel-expense-module">
            {/* I. KHU VỰC TIÊU ĐỀ (HEADER) */}
            <div className="travel-expense-header">
                <div className="travel-expense-header-content">
                    <div className="travel-expense-icon-wrapper">
                        <svg className="travel-expense-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <div>
                        <h1 className="travel-expense-title">Đăng Ký Kinh Phí Công Tác</h1>
                        <p className="travel-expense-subtitle">
                            Điền đầy đủ thông tin để gửi yêu cầu kinh phí công tác đến quản lý duyệt.
                        </p>
                    </div>
                </div>
            </div>

            {/* II. KHU VỰC FORM NHẬP LIỆU CHÍNH (MAIN INPUT) */}
            <form className="travel-expense-form" onSubmit={handleSubmit}>
                <div className="travel-expense-form-container">
                    {/* 1. Mục Đích & Đối Tác */}
                    <div className="travel-expense-form-section">
                        <h2 className="travel-expense-section-title">1. Mục Đích & Đối Tác</h2>

                        <div className="travel-expense-form-group">
                            <label htmlFor="purpose" className="travel-expense-label">
                                1. Mục Đích Công Tác <span className="required">*</span>
                            </label>
                            <textarea
                                id="purpose"
                                name="purpose"
                                className="travel-expense-textarea"
                                rows="5"
                                value={formData.purpose}
                                onChange={handleInputChange}
                                placeholder="Ví dụ: Đàm phán Hợp đồng Mở rộng Thị trường Châu Á..."
                                required
                            />
                        </div>

                        <div className="travel-expense-form-group">
                            <label htmlFor="partnerCompany" className="travel-expense-label">
                                2. Tên Công ty / Đối tác
                            </label>
                            <input
                                id="partnerCompany"
                                name="partnerCompany"
                                type="text"
                                className="travel-expense-input"
                                value={formData.partnerCompany}
                                onChange={handleInputChange}
                                placeholder="Tên đối tác hoặc công ty bạn sẽ làm việc."
                            />
                        </div>

                        <div className="travel-expense-form-group">
                            <label htmlFor="companyAddress" className="travel-expense-label">
                                Địa Chỉ Công ty
                            </label>
                            <input
                                id="companyAddress"
                                name="companyAddress"
                                type="text"
                                className="travel-expense-input"
                                value={formData.companyAddress}
                                onChange={handleInputChange}
                                placeholder="Địa chỉ văn phòng làm việc."
                            />
                        </div>

                        <div className="travel-expense-form-group">
                            <label htmlFor="requestedAdvanceAmount" className="travel-expense-label">
                                3. Số Tiền Cần Tạm Ứng
                            </label>
                            <div className="travel-expense-advance-row">
                                <input
                                    id="requestedAdvanceAmount"
                                    name="requestedAdvanceAmount"
                                    type="text"
                                    className="travel-expense-input"
                                    value={formatCurrency(formData.requestedAdvanceAmount)}
                                    onChange={handleAmountChange}
                                    placeholder="Nhập số tiền cần tạm ứng (ví dụ: 5,000,000)"
                                />
                                <select
                                    className="travel-expense-select travel-expense-currency-select"
                                    value={formData.requestedAdvanceCurrency}
                                    onChange={handleCurrencyChange}
                                >
                                    <option value="VND">VND</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="JPY">JPY</option>
                                    <option value="SGD">SGD</option>
                                    <option value="THB">THB</option>
                                    <option value="CNY">CNY</option>
                                </select>
                            </div>
                            <p className="travel-expense-input-hint">
                                Chọn đơn vị tiền tệ (VND, USD, EUR, …). HR và Kế toán sẽ thấy số tiền và đơn vị đã chọn.
                            </p>
                        </div>
                    </div>

                    {/* 2. Thời Gian & Địa Điểm */}
                    <div className="travel-expense-form-section">
                        <div className="travel-expense-section-header">
                            <h2 className="travel-expense-section-title">2. Thời Gian & Địa Điểm</h2>
                            <p className="travel-expense-section-description">
                                Phân tích rõ giữa thông tin đối tác và hành trình công tác để hệ thống tự động kiểm tra phạm vi & thời lượng.
                            </p>
                        </div>

                        <div className="travel-expense-grid">
                            <div className="travel-expense-form-group" ref={destinationDropdownRef} style={{ position: 'relative' }}>
                                <label htmlFor="destination" className="travel-expense-label">
                                    Địa Điểm Công Tác <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="destination"
                                    name="destination"
                                    className="travel-expense-input"
                                    value={formData.destination}
                                    onChange={handleInputChange}
                                    onFocus={() => setIsDestinationDropdownOpen(true)}
                                    placeholder="Nhập hoặc chọn địa điểm công tác..."
                                    required
                                    autoComplete="off"
                                />
                                {isDestinationDropdownOpen && filteredDestinations.length > 0 && (
                                    <div className="travel-expense-destination-dropdown">
                                        {filteredDestinations.map((dest) => (
                                            <div
                                                key={dest.value}
                                                className="travel-expense-destination-item"
                                                onClick={() => handleDestinationSelect(dest)}
                                                onMouseDown={(e) => e.preventDefault()}
                                            >
                                                <span className="travel-expense-destination-label">{dest.label}</span>
                                                <span className="travel-expense-destination-badge">
                                                    {dest.type === 'domestic' ? 'Trong nước' : dest.continent === 'EU' ? 'Châu Âu' : dest.continent === 'ASIAN' ? 'Châu Á' : dest.continent === 'AMERICAS' ? 'Châu Mỹ' : dest.continent === 'OCEANIA' ? 'Châu Úc' : dest.continent === 'AFRICA' ? 'Châu Phi' : 'Quốc tế'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {travelScope && (
                                    <div className={`travel-expense-scope-banner ${travelScope}`}>
                                        {travelScope === 'international'
                                            ? `Phạm vi: Quốc tế ${continent ? `• ${continent === 'EU' ? 'Châu Âu' : continent === 'ASIAN' ? 'Châu Á' : continent === 'AMERICAS' ? 'Châu Mỹ' : continent === 'OCEANIA' ? 'Châu Úc' : continent === 'AFRICA' ? 'Châu Phi' : ''}` : ''} • Kích hoạt kiểm tra ngân sách ngoại tệ`
                                            : 'Phạm vi: Trong nước • Áp dụng hạn mức tiêu chuẩn'}
                                    </div>
                                )}
                            </div>

                            <div className="travel-expense-form-group">
                                <label htmlFor="startDateTime" className="travel-expense-label">
                                    Ngày & Giờ Bắt Đầu <span className="required">*</span>
                                </label>
                                <input
                                    id="startDateTime"
                                    name="startDateTime"
                                    type="datetime-local"
                                    className="travel-expense-input"
                                    value={formData.startDateTime}
                                    onChange={handleInputChange}
                                    required
                                />
                                <p className="travel-expense-input-hint">
                                    Dùng định dạng 24h để hệ thống tính toán chính xác.
                                </p>
                            </div>

                            <div className="travel-expense-form-group">
                                <label htmlFor="endDateTime" className="travel-expense-label">
                                    Ngày & Giờ Kết Thúc <span className="required">*</span>
                                </label>
                                <input
                                    id="endDateTime"
                                    name="endDateTime"
                                    type="datetime-local"
                                    className="travel-expense-input"
                                    value={formData.endDateTime}
                                    onChange={handleInputChange}
                                    required
                                />
                                <p className="travel-expense-input-hint">
                                    Hệ thống sẽ kiểm tra qua đêm & tổng thời gian tự động.
                                </p>
                            </div>
                        </div>

                        {travelTimeInsight && travelTimeInsight.type === 'info' && travelTiming.isOvernight && (
                            <div className="travel-expense-overnight-banner">
                                <strong>{travelTimeInsight.title}</strong>
                                <span>{travelTimeInsight.detail}</span>
                            </div>
                        )}
                        {travelTimeInsight && travelTimeInsight.type === 'error' && (
                            <div className="travel-expense-alert error">
                                <strong>{travelTimeInsight.title}</strong>
                                <span>{travelTimeInsight.detail}</span>
                            </div>
                        )}
                    </div>

                    {/* III. KHU VỰC LOGIC & HÀNH ĐỘNG */}
                    <div className="travel-expense-logic-grid">
                        <div className="travel-expense-form-section travel-expense-logic-section">
                            <div className="travel-expense-section-header">
                                <h2 className="travel-expense-section-title">3.1. Logic Xử Lý Tự Động</h2>
                                <p className="travel-expense-section-description">
                                    Các trạng thái được hệ thống tự động cập nhật dựa trên thông tin bạn đã nhập.
                                </p>
                            </div>

                            <div className="travel-expense-auto-statuses">
                                {autoStatusItems.map((status) => (
                                    <div key={status.id} className={`travel-expense-status-card ${status.tone}`}>
                                        <div className="travel-expense-status-icon-circle">
                                            {status.id === 'duration' && (
                                                <svg className="travel-expense-status-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            )}
                                            {(status.id === 'overnight' || status.id === 'scope') && status.icon !== '—' && (
                                                <div className="travel-expense-status-icon-dot"></div>
                                            )}
                                        </div>
                                        <div className="travel-expense-status-body">
                                            <div className="travel-expense-status-content">
                                                <span className="travel-expense-status-label">{status.label}:</span>
                                                <span className="travel-expense-status-value">{status.value}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="travel-expense-action-panel">
                            <div>
                                <p className="travel-expense-action-eyebrow">3.2. HÀNH ĐỘNG</p>
                                <h3 className="travel-expense-action-title">GỬI YÊU CẦU DUYỆT CÔNG TÁC</h3>
                                <p className="travel-expense-action-description">
                                    Nút indigo với hiệu ứng Fluent. Hệ thống sẽ kiểm tra Validation trước khi gửi.
                                </p>
                            </div>
                            <button
                                type="submit"
                                className="travel-expense-submit-btn"
                                disabled={!isFormReady || isSubmitting}
                            >
                                {isSubmitting ? 'Đang gửi...' : 'GỬI YÊU CẦU DUYỆT CÔNG TÁC'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>

        </div>
    );
};

export default TravelExpense;
