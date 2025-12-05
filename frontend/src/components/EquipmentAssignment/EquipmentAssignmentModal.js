import React, { useState } from 'react';
import { equipmentAPI, employeesAPI, requestsAPI } from '../../services/api';
import './EquipmentAssignmentModal.css';

const EquipmentAssignmentModal = ({ isOpen, onClose, employee, onComplete, currentUser, showToast }) => {
    const [equipmentData, setEquipmentData] = useState({
        it: [{ name: '', quantity: 1 }],
        hr: [{ name: '', quantity: 1 }],
        accounting: [{ name: '', quantity: 1 }],
        other: [{ name: '', quantity: 1 }],
    });

    // Mode cho mỗi department: 'request' (yêu cầu) hoặc 'direct' (cấp trực tiếp)
    const [departmentModes, setDepartmentModes] = useState({
        it: 'direct', // Mặc định: cấp trực tiếp
        hr: 'direct',
        accounting: 'direct',
        other: 'direct',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Close modal on Escape key
    React.useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Reset form when modal opens/closes or employee changes
    React.useEffect(() => {
        if (isOpen && employee) {
            setEquipmentData({
                it: [{ name: '', quantity: 1 }],
                hr: [{ name: '', quantity: 1 }],
                accounting: [{ name: '', quantity: 1 }],
                other: [{ name: '', quantity: 1 }],
            });
            setDepartmentModes({
                it: 'direct',
                hr: 'direct',
                accounting: 'direct',
                other: 'direct',
            });
            setError('');
        }
    }, [isOpen, employee]);

    const getDepartmentName = (code) => {
        const departments = {
            'IT': 'Phòng IT',
            'HR': 'Hành chính nhân sự',
            'ACCOUNTING': 'Kế toán',
            'OTHER': 'Phòng ban khác'
        };
        return departments[code] || code;
    };

    const directManager = employee?.quanLyTrucTiep || employee?.quan_ly_truc_tiep || '';
    const indirectManager = employee?.quanLyGianTiep || employee?.quan_ly_gian_tiep || '';

    const formatDate = (dateString) => {
        if (!dateString) return '-';

        try {
            let date;
            if (dateString.includes('T') || dateString.includes(' ')) {
                date = new Date(dateString);
            } else {
                date = new Date(dateString + 'T00:00:00');
            }

            if (isNaN(date.getTime())) {
                return '-';
            }

            return date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error, dateString);
            return '-';
        }
    };

    const addItem = (department) => {
        setEquipmentData((prev) => ({
            ...prev,
            [department]: [...prev[department], { name: '', quantity: 1 }],
        }));
    };

    const removeItem = (department, index) => {
        if (equipmentData[department].length > 1) {
            setEquipmentData((prev) => ({
                ...prev,
                [department]: prev[department].filter((_, i) => i !== index),
            }));
        } else {
            setEquipmentData((prev) => ({
                ...prev,
                [department]: [{ name: '', quantity: 1 }],
            }));
        }
    };

    const handleItemNameChange = (department, index, value) => {
        setEquipmentData((prev) => {
            const newData = { ...prev };
            newData[department] = [...newData[department]];
            newData[department][index] = {
                ...newData[department][index],
                name: value
            };
            return newData;
        });
    };

    const handleItemQuantityChange = (department, index, value) => {
        const quantity = parseInt(value) || 1;
        setEquipmentData((prev) => {
            const newData = { ...prev };
            newData[department] = [...newData[department]];
            newData[department][index] = {
                ...newData[department][index],
                quantity: quantity > 0 ? quantity : 1
            };
            return newData;
        });
    };

    const handleDepartmentModeChange = (department, mode) => {
        setDepartmentModes((prev) => ({
            ...prev,
            [department]: mode
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!employee || !employee.id) {
            setError('Không tìm thấy thông tin nhân viên');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const employeeId = employee.id;
            const isImportedEmployee = employee.trang_thai === 'PENDING' || employee.trangThai === 'PENDING';

            const departmentMap = {
                'it': 'IT',
                'hr': 'HR',
                'accounting': 'ACCOUNTING',
                'other': 'OTHER'
            };

            const requestTypeMap = {
                'it': 'IT_EQUIPMENT',
                'hr': 'OFFICE_SUPPLIES',
                'accounting': 'ACCOUNTING',
                'other': 'OTHER'
            };

            const departmentNameMap = {
                'it': 'Phòng IT',
                'hr': 'Hành chính nhân sự',
                'accounting': 'Kế toán',
                'other': 'Phòng ban khác'
            };

            let hasDirectAssignment = false;

            // Xử lý từng department
            for (const [key, items] of Object.entries(equipmentData)) {
                const mode = departmentModes[key];
                const validItems = items.filter(item => item.name.trim() !== '');

                if (validItems.length > 0) {
                    if (mode === 'direct') {
                        // Cấp trực tiếp: Tạo equipment assignment
                        hasDirectAssignment = true;

                        for (const item of validItems) {
                            await equipmentAPI.create({
                                employee_id: employeeId,
                                ten_vat_dung: item.name.trim(),
                                so_luong: item.quantity || 1,
                                phong_ban: departmentMap[key],
                                created_by: currentUser?.id || null,
                            });
                        }

                        if (showToast) {
                            showToast(`Đã cấp vật dụng từ ${departmentNameMap[key]}`, 'success');
                        }
                    } else if (mode === 'request') {
                        // Yêu cầu: Tạo request
                        const requestTitle = `Yêu cầu ${departmentNameMap[key]} cho nhân viên ${employee.hoTen || employee.ho_ten}`;

                        try {
                            await requestsAPI.create({
                                employeeId: employeeId,
                                requestType: requestTypeMap[key],
                                targetDepartment: departmentMap[key],
                                title: requestTitle,
                                items: validItems.map(item => ({
                                    name: item.name.trim(),
                                    quantity: item.quantity || 1
                                })),
                                requestedBy: currentUser?.id || null,
                            });

                            if (showToast) {
                                showToast(`Đã gửi yêu cầu đến ${departmentNameMap[key]}`, 'success');
                            }
                        } catch (requestError) {
                            console.error('Error creating request:', requestError);
                            throw new Error(requestError.response?.data?.message || 'Lỗi khi tạo yêu cầu');
                        }
                    }
                }
            }

            // Cập nhật trạng thái thành ACTIVE nếu employee đã tồn tại và có trạng thái PENDING
            if (isImportedEmployee && hasDirectAssignment) {
                try {
                    await employeesAPI.update(employee.id, {
                        trang_thai: 'ACTIVE'
                    });
                } catch (updateError) {
                    console.error('Error updating employee status:', updateError);
                }
            }

            // Hiển thị thông báo tổng kết
            if (showToast) {
                const requestCount = Object.values(departmentModes).filter(m => m === 'request').length;

                if (hasDirectAssignment && requestCount > 0) {
                    showToast('Đã cấp vật dụng và gửi yêu cầu thành công!', 'success');
                } else if (hasDirectAssignment) {
                    showToast('Đã cấp vật dụng cho nhân viên thành công!', 'success');
                } else {
                    showToast('Đã gửi yêu cầu thành công!', 'success');
                }
            }

            if (onComplete) {
                onComplete();
            }
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !employee) return null;

    return (
        <div className="equipment-modal-overlay" onClick={onClose}>
            <div className="equipment-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="equipment-modal-header">
                    <div className="equipment-modal-header-content">
                        <div className="equipment-modal-icon">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                            </svg>
                        </div>
                        <div>
                            <h2 className="equipment-modal-title">Cập nhật vật dụng</h2>
                            <p className="equipment-modal-subtitle">
                                {employee.hoTen || employee.ho_ten} - {employee.maNhanVien || employee.ma_nhan_vien || 'N/A'}
                            </p>
                        </div>
                    </div>
                    <button className="equipment-modal-close" onClick={onClose}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="equipment-modal-body">
                    {error && (
                        <div className="error-message">{error}</div>
                    )}

                    {/* Employee Info Display */}
                    <div className="employee-info-card">
                        <div className="employee-info-content">
                            <div className="employee-info-header">
                                <div className="employee-info-icon">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="employee-info-title">
                                        Nhân viên: <span>{employee.hoTen || employee.ho_ten}</span>
                                    </h2>
                                    <p className="employee-info-email">{employee.email || '-'}</p>
                                </div>
                            </div>
                            <div className="employee-info-grid">
                                {(employee.maNhanVien || employee.ma_nhan_vien) && (
                                    <div className="employee-info-item">
                                        <span className="employee-info-label">Mã nhân viên</span>
                                        <p className="employee-info-value">{employee.maNhanVien || employee.ma_nhan_vien}</p>
                                    </div>
                                )}
                                {directManager && (
                                    <div className="employee-info-item">
                                        <span className="employee-info-label">Quản lý trực tiếp</span>
                                        <p className="employee-info-value">{directManager}</p>
                                    </div>
                                )}
                                {indirectManager && (
                                    <div className="employee-info-item">
                                        <span className="employee-info-label">Quản lý gián tiếp</span>
                                        <p className="employee-info-value">{indirectManager}</p>
                                    </div>
                                )}
                                {(employee.ngayGiaNhap || employee.ngay_gia_nhap) && (
                                    <div className="employee-info-item">
                                        <span className="employee-info-label">Ngày nhận việc</span>
                                        <p className="employee-info-value">{formatDate(employee.ngayGiaNhap || employee.ngay_gia_nhap)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Equipment Form */}
                    <form onSubmit={handleSubmit} className="equipment-form">
                        {/* Column 1: Phòng IT */}
                        <div className="equipment-column blue">
                            <div className="equipment-column-header">
                                <h3 className="equipment-column-title">
                                    <span className="equipment-column-dot blue"></span>
                                    <span>Phòng IT</span>
                                </h3>
                            </div>

                            {/* Mode Selector */}
                            <div className="equipment-mode-selector">
                                <button
                                    type="button"
                                    className={`equipment-mode-btn ${departmentModes.it === 'direct' ? 'active' : ''}`}
                                    onClick={() => handleDepartmentModeChange('it', 'direct')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    Cấp trực tiếp
                                </button>
                                <button
                                    type="button"
                                    className={`equipment-mode-btn ${departmentModes.it === 'request' ? 'active' : ''}`}
                                    onClick={() => handleDepartmentModeChange('it', 'request')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    Yêu cầu
                                </button>
                            </div>

                            <div className="equipment-items-list">
                                {equipmentData.it.map((item, index) => (
                                    <div key={index} className="equipment-item">
                                        <input
                                            type="text"
                                            className="equipment-item-name"
                                            placeholder="Tên vật dụng"
                                            value={item.name}
                                            onChange={(e) => handleItemNameChange('it', index, e.target.value)}
                                        />
                                        <input
                                            type="number"
                                            className="equipment-item-quantity"
                                            placeholder="SL"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleItemQuantityChange('it', index, e.target.value)}
                                        />
                                        {equipmentData.it.length > 1 && (
                                            <button
                                                type="button"
                                                className="equipment-item-remove"
                                                onClick={() => removeItem('it', index)}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="equipment-item-add"
                                    onClick={() => addItem('it')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                    </svg>
                                    Thêm vật dụng
                                </button>
                            </div>
                        </div>

                        {/* Column 2: Hành chính nhân sự */}
                        <div className="equipment-column green">
                            <div className="equipment-column-header">
                                <h3 className="equipment-column-title">
                                    <span className="equipment-column-dot green"></span>
                                    <span>Hành chính nhân sự</span>
                                </h3>
                            </div>

                            <div className="equipment-mode-selector">
                                <button
                                    type="button"
                                    className={`equipment-mode-btn ${departmentModes.hr === 'direct' ? 'active' : ''}`}
                                    onClick={() => handleDepartmentModeChange('hr', 'direct')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    Cấp trực tiếp
                                </button>
                                <button
                                    type="button"
                                    className={`equipment-mode-btn ${departmentModes.hr === 'request' ? 'active' : ''}`}
                                    onClick={() => handleDepartmentModeChange('hr', 'request')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    Yêu cầu
                                </button>
                            </div>

                            <div className="equipment-items-list">
                                {equipmentData.hr.map((item, index) => (
                                    <div key={index} className="equipment-item">
                                        <input
                                            type="text"
                                            className="equipment-item-name"
                                            placeholder="Tên vật dụng"
                                            value={item.name}
                                            onChange={(e) => handleItemNameChange('hr', index, e.target.value)}
                                        />
                                        <input
                                            type="number"
                                            className="equipment-item-quantity"
                                            placeholder="SL"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleItemQuantityChange('hr', index, e.target.value)}
                                        />
                                        {equipmentData.hr.length > 1 && (
                                            <button
                                                type="button"
                                                className="equipment-item-remove"
                                                onClick={() => removeItem('hr', index)}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="equipment-item-add"
                                    onClick={() => addItem('hr')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                    </svg>
                                    Thêm vật dụng
                                </button>
                            </div>
                        </div>

                        {/* Column 3: Kế toán */}
                        <div className="equipment-column purple">
                            <div className="equipment-column-header">
                                <h3 className="equipment-column-title">
                                    <span className="equipment-column-dot purple"></span>
                                    <span>Kế toán</span>
                                </h3>
                            </div>

                            <div className="equipment-mode-selector">
                                <button
                                    type="button"
                                    className={`equipment-mode-btn ${departmentModes.accounting === 'direct' ? 'active' : ''}`}
                                    onClick={() => handleDepartmentModeChange('accounting', 'direct')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    Cấp trực tiếp
                                </button>
                                <button
                                    type="button"
                                    className={`equipment-mode-btn ${departmentModes.accounting === 'request' ? 'active' : ''}`}
                                    onClick={() => handleDepartmentModeChange('accounting', 'request')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    Yêu cầu
                                </button>
                            </div>

                            <div className="equipment-items-list">
                                {equipmentData.accounting.map((item, index) => (
                                    <div key={index} className="equipment-item">
                                        <input
                                            type="text"
                                            className="equipment-item-name"
                                            placeholder="Tên vật dụng"
                                            value={item.name}
                                            onChange={(e) => handleItemNameChange('accounting', index, e.target.value)}
                                        />
                                        <input
                                            type="number"
                                            className="equipment-item-quantity"
                                            placeholder="SL"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleItemQuantityChange('accounting', index, e.target.value)}
                                        />
                                        {equipmentData.accounting.length > 1 && (
                                            <button
                                                type="button"
                                                className="equipment-item-remove"
                                                onClick={() => removeItem('accounting', index)}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="equipment-item-add"
                                    onClick={() => addItem('accounting')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                    </svg>
                                    Thêm vật dụng
                                </button>
                            </div>
                        </div>

                        {/* Column 4: Phòng ban khác */}
                        <div className="equipment-column orange">
                            <div className="equipment-column-header">
                                <h3 className="equipment-column-title">
                                    <span className="equipment-column-dot orange"></span>
                                    <span>Phòng ban khác</span>
                                </h3>
                            </div>

                            <div className="equipment-mode-selector">
                                <button
                                    type="button"
                                    className={`equipment-mode-btn ${departmentModes.other === 'direct' ? 'active' : ''}`}
                                    onClick={() => handleDepartmentModeChange('other', 'direct')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    Cấp trực tiếp
                                </button>
                                <button
                                    type="button"
                                    className={`equipment-mode-btn ${departmentModes.other === 'request' ? 'active' : ''}`}
                                    onClick={() => handleDepartmentModeChange('other', 'request')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    Yêu cầu
                                </button>
                            </div>

                            <div className="equipment-items-list">
                                {equipmentData.other.map((item, index) => (
                                    <div key={index} className="equipment-item">
                                        <input
                                            type="text"
                                            className="equipment-item-name"
                                            placeholder="Tên vật dụng"
                                            value={item.name}
                                            onChange={(e) => handleItemNameChange('other', index, e.target.value)}
                                        />
                                        <input
                                            type="number"
                                            className="equipment-item-quantity"
                                            placeholder="SL"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleItemQuantityChange('other', index, e.target.value)}
                                        />
                                        {equipmentData.other.length > 1 && (
                                            <button
                                                type="button"
                                                className="equipment-item-remove"
                                                onClick={() => removeItem('other', index)}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="equipment-item-add"
                                    onClick={() => addItem('other')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                    </svg>
                                    Thêm vật dụng
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="equipment-form-actions">
                            <button
                                type="button"
                                className="equipment-btn-cancel"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="equipment-btn-submit"
                                disabled={loading}
                            >
                                {loading ? 'Đang xử lý...' : 'Xác nhận'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EquipmentAssignmentModal;

