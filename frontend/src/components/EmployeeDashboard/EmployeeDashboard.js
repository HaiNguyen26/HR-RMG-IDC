import React, { useState, useEffect } from 'react';
import { employeesAPI, equipmentAPI, leaveRequestsAPI } from '../../services/api';
import './EmployeeDashboard.css';

const EmployeeDashboard = ({ currentUser, onNavigate }) => {
    const [employeeProfile, setEmployeeProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [equipment, setEquipment] = useState([]);
    const [loadingEquipment, setLoadingEquipment] = useState(false);
    const [remainingLeaveDays, setRemainingLeaveDays] = useState(null);

    // Helper to get value from multiple sources
    const getValue = (...keys) => {
        const sources = [employeeProfile, currentUser];
        for (const source of sources) {
            if (!source) continue;
            for (const key of keys) {
                const value = source?.[key];
                if (value !== undefined && value !== null && value !== '') {
                    return value;
                }
            }
        }
        return null;
    };

    useEffect(() => {
        const fetchEmployeeProfile = async () => {
            if (!currentUser) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Try multiple ID sources to find employee profile
                const candidateIds = [
                    currentUser.employeeId,
                    currentUser.employee_id,
                    currentUser.employee?.id,
                    currentUser.id
                ]
                    .filter(Boolean)
                    .map(id => {
                        if (typeof id === 'number') return id;
                        const str = String(id).trim();
                        const numericMatch = str.match(/^\d+/);
                        if (numericMatch) {
                            return parseInt(numericMatch[0], 10);
                        }
                        return null;
                    })
                    .filter(id => id !== null && !isNaN(id) && id > 0);

                let profile = null;

                // Try fetching by ID
                for (const id of candidateIds) {
                    try {
                        const response = await employeesAPI.getById(id);
                        if (response.data?.data) {
                            profile = response.data.data;
                            break;
                        }
                    } catch (error) {
                        // Continue to next ID if 404
                        if (error.response?.status !== 404) {
                            console.warn('[EmployeeDashboard] Error fetching employee:', error);
                        }
                    }
                }

                // If not found by ID, try fetching all and matching
                if (!profile) {
                    try {
                        const allResponse = await employeesAPI.getAll();
                        const employees = allResponse.data?.data || [];

                        profile = employees.find((emp) => {
                            const targetIds = new Set([
                                currentUser.id,
                                currentUser.employeeId,
                                currentUser.employee_id,
                                currentUser.userId,
                                currentUser.user_id,
                                currentUser.employee?.id,
                            ].filter(Boolean));

                            const targetCodes = new Set([
                                currentUser.maNhanVien,
                                currentUser.ma_nhan_vien
                            ].filter(Boolean));

                            return (
                                targetIds.has(emp.id) ||
                                targetIds.has(emp.employeeId) ||
                                targetIds.has(emp.employee_id) ||
                                targetIds.has(emp.userId) ||
                                targetIds.has(emp.user_id) ||
                                targetCodes.has(emp.maNhanVien) ||
                                targetCodes.has(emp.ma_nhan_vien)
                            );
                        }) || null;
                    } catch (error) {
                        console.error('[EmployeeDashboard] Error fetching all employees:', error);
                    }
                }

                setEmployeeProfile(profile);
            } catch (error) {
                console.error('[EmployeeDashboard] Error fetching employee profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployeeProfile();
    }, [currentUser]);

    // Fetch equipment when employee profile is loaded
    useEffect(() => {
        const fetchEquipment = async () => {
            if (!employeeProfile?.id) {
                setEquipment([]);
                return;
            }

            setLoadingEquipment(true);
            try {
                const response = await equipmentAPI.getByEmployeeId(employeeProfile.id);
                if (response.data?.success) {
                    setEquipment(response.data.data || []);
                } else {
                    setEquipment([]);
                }
            } catch (error) {
                if (error.response?.status !== 404) {
                    console.error('[EmployeeDashboard] Error fetching equipment:', error);
                }
                setEquipment([]);
            } finally {
                setLoadingEquipment(false);
            }
        };

        fetchEquipment();
    }, [employeeProfile]);

    // Fetch leave requests and calculate remaining leave days
    useEffect(() => {
        const calculateRemainingLeaveDays = async () => {
            if (!employeeProfile?.id) {
                setRemainingLeaveDays(null);
                return;
            }

            try {
                // Get start date (ngay_gia_nhap)
                const startDateStr = getValue('ngayGiaNhap', 'ngay_gia_nhap');
                if (!startDateStr) {
                    setRemainingLeaveDays(null);
                    return;
                }

                // Parse start date
                let startDate;
                if (startDateStr.includes('T') || startDateStr.includes(' ')) {
                    startDate = new Date(startDateStr);
                } else {
                    startDate = new Date(startDateStr + 'T00:00:00');
                }
                if (isNaN(startDate.getTime())) {
                    setRemainingLeaveDays(null);
                    return;
                }

                // Calculate years of service
                const now = new Date();
                const yearsOfService = (now.getFullYear() - startDate.getFullYear()) -
                    (now.getMonth() < startDate.getMonth() ||
                        (now.getMonth() === startDate.getMonth() && now.getDate() < startDate.getDate()) ? 1 : 0);

                // Calculate total leave days based on years of service
                let totalLeaveDays = 12; // Base 12 days
                if (yearsOfService >= 10) {
                    totalLeaveDays = 14; // 10+ years: 14 days
                } else if (yearsOfService >= 5) {
                    totalLeaveDays = 13; // 5-9 years: 13 days
                }

                // Get current year
                const currentYear = now.getFullYear();
                const yearStart = new Date(currentYear, 0, 1); // January 1st
                const yearEnd = new Date(currentYear, 11, 31); // December 31st

                // Fetch approved leave requests for current year
                const response = await leaveRequestsAPI.getAll({
                    employeeId: employeeProfile.id,
                    status: 'APPROVED'
                });

                const approvedRequests = response.data?.data || [];
                let usedDays = 0;

                // Helper: nghỉ nửa ngày (cùng ngày + ghi chú) chỉ trừ 0.5 ngày phép
                const isHalfDayLeave = (req) => {
                    const start = req.start_date || req.startDate;
                    const end = req.end_date || req.endDate || start;
                    const notes = req.notes || '';
                    return start && end && String(start) === String(end) &&
                        (notes.includes('Nghỉ nửa ngày - Sáng') || notes.includes('Nghỉ nửa ngày - Chiều'));
                };

                // Calculate used days from approved requests in current year
                approvedRequests.forEach(request => {
                    const requestStartDate = new Date(request.start_date || request.startDate);
                    const requestEndDate = new Date(request.end_date || request.endDate || request.start_date || request.startDate);

                    // Check if request is in current year
                    if (requestStartDate >= yearStart && requestStartDate <= yearEnd) {
                        let days;
                        if (isHalfDayLeave(request)) {
                            days = 0.5;
                        } else {
                            const diffTime = requestEndDate.getTime() - requestStartDate.getTime();
                            const fullDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                            days = fullDays >= 1 ? fullDays : 0;
                        }
                        usedDays += days;
                    }
                });

                // Calculate remaining days
                const remaining = Math.max(0, totalLeaveDays - usedDays);
                setRemainingLeaveDays(remaining);
            } catch (error) {
                console.error('[EmployeeDashboard] Error calculating remaining leave days:', error);
                setRemainingLeaveDays(null);
            }
        };

        calculateRemainingLeaveDays();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employeeProfile, currentUser]);

    const employeeName = getValue('hoTen', 'ho_ten') || currentUser?.username || 'Nhân viên';
    const chucDanh = getValue('chucDanh', 'chuc_danh');
    const phongBan = getValue('phongBan', 'phong_ban');
    const maNhanVien = getValue('maNhanVien', 'ma_nhan_vien');

    // Format department label
    const getDepartmentLabel = (dept) => {
        if (!dept) return null;
        const deptMap = {
            'IT': 'Phòng IT',
            'HR': 'Hành chính nhân sự',
            'ACCOUNTING': 'Kế toán',
            'MUAHANG': 'Mua hàng',
            'HANHCHINH': 'Hành chính',
            'DVDT': 'DVĐT',
            'QA': 'QA',
        };
        return deptMap[dept] || dept;
    };

    const departmentLabel = getDepartmentLabel(phongBan);

    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            let date;
            if (dateString.includes('T') || dateString.includes(' ')) {
                date = new Date(dateString);
            } else {
                date = new Date(dateString + 'T00:00:00');
            }
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return '-';
        }
    };

    // Prepare info cards data
    const infoCards = [
        { label: 'MÃ NHÂN VIÊN', value: maNhanVien || '-' },
        remainingLeaveDays !== null ? { label: 'PHÉP NĂM CÒN LẠI', value: `${remainingLeaveDays} ngày` } : { label: 'PHÉP NĂM CÒN LẠI', value: 'Đang tính...' },
        { label: 'CHỨC DANH', value: chucDanh || '-' },
        { label: 'PHÒNG BAN', value: departmentLabel || '-' },
        { label: 'CHI NHÁNH', value: getValue('chiNhanh', 'chi_nhanh') || '-' },
        { label: 'BỘ PHẬN', value: getValue('boPhan', 'bo_phan') || '-' },
        { label: 'CẤP BẬC', value: getValue('capBac', 'cap_bac') || '-' },
        { label: 'NGÀY NHẬN VIỆC', value: formatDate(getValue('ngayGiaNhap', 'ngay_gia_nhap')) },
        { label: 'LOẠI HỢP ĐỒNG', value: getValue('loaiHopDong', 'loai_hop_dong') || '-' },
        { label: 'TRẠNG THÁI', value: getValue('trangThai', 'trang_thai') || '-' },
        { label: 'QUẢN LÝ TRỰC TIẾP', value: getValue('quanLyTrucTiep', 'quan_ly_truc_tiep') || 'Chưa cập nhật' },
        { label: 'QUẢN LÝ GIÁN TIẾP', value: getValue('quanLyGianTiep', 'quan_ly_gian_tiep') || 'Chưa cập nhật' },
    ].filter(card => card !== null && card.value !== '-'); // Only show cards with values

    if (loading) {
        return (
            <div className="employee-dashboard">
                <div className="employee-dashboard-loading">
                    <div className="employee-dashboard-spinner"></div>
                    <p>Đang tải thông tin...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="employee-dashboard">
            <div className="employee-dashboard-main-card">
                {/* Header Section */}
                <div className="employee-dashboard-header">
                    <div className="employee-dashboard-header-content">
                        <h1 className="employee-dashboard-name">{employeeName}</h1>
                        {(chucDanh || departmentLabel) && (
                            <p className="employee-dashboard-subtitle">
                                {[chucDanh, departmentLabel].filter(Boolean).join(' • ')}
                            </p>
                        )}
                    </div>
                    {maNhanVien && (
                        <div className="employee-dashboard-code-tag">
                            {maNhanVien}
                        </div>
                    )}
                </div>

                {/* Info Cards Section */}
                {infoCards.length > 0 && (
                    <div className="employee-dashboard-info-cards">
                        {infoCards.map((card, index) => {
                            const isImportant = card.label === 'MÃ NHÂN VIÊN' || card.label === 'NGÀY NHẬN VIỆC' || card.label === 'PHÉP NĂM CÒN LẠI';
                            return (
                                <div
                                    key={index}
                                    className={`employee-info-card ${isImportant ? 'employee-info-card--important' : ''}`}
                                >
                                    <div className="employee-info-card-label">{card.label}</div>
                                    <div className="employee-info-card-value">{card.value}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Equipment Section - Dark Card */}
            <div className="employee-dashboard-equipment-card">
                <div className="employee-equipment-header">
                    <h2 className="employee-equipment-title">Vật dụng đã cấp</h2>
                </div>
                <div className="employee-equipment-content">
                    {loadingEquipment ? (
                        <div className="employee-equipment-loading">
                            <div className="employee-equipment-spinner"></div>
                            <p>Đang tải danh sách vật dụng...</p>
                        </div>
                    ) : equipment.length === 0 ? (
                        <div className="employee-equipment-empty">
                            <svg className="employee-equipment-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                            </svg>
                            <p>Chưa có vật dụng nào</p>
                        </div>
                    ) : (
                        <div className="employee-equipment-grid">
                            {equipment.map((item) => (
                                <div key={item.id} className="employee-equipment-item">
                                    <div className="equipment-item-header">
                                        <h3 className="equipment-item-name">{item.tenThietBi || item.ten_thiet_bi || 'Vật dụng'}</h3>
                                        {item.serialNumber || item.serial_number ? (
                                            <span className="equipment-item-serial">
                                                S/N: {item.serialNumber || item.serial_number}
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="equipment-item-details">
                                        {item.maThietBi || item.ma_thiet_bi ? (
                                            <div className="equipment-detail-row">
                                                <span className="equipment-detail-label">Mã:</span>
                                                <span className="equipment-detail-value">{item.maThietBi || item.ma_thiet_bi}</span>
                                            </div>
                                        ) : null}
                                        {item.ngayCap || item.ngay_cap ? (
                                            <div className="equipment-detail-row">
                                                <span className="equipment-detail-label">Ngày cấp:</span>
                                                <span className="equipment-detail-value">{formatDate(item.ngayCap || item.ngay_cap)}</span>
                                            </div>
                                        ) : null}
                                        {(item.tinhTrang || item.tinh_trang) && (
                                            <div className="equipment-detail-row">
                                                <span className="equipment-detail-label">Tình trạng:</span>
                                                <span className={`equipment-status-badge ${(item.tinhTrang || item.tinh_trang).toLowerCase()}`}>
                                                    {item.tinhTrang || item.tinh_trang}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;
