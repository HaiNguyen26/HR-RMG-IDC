import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
    attendanceAdjustmentsAPI,
    leaveRequestsAPI,
    overtimeRequestsAPI,
} from '../../services/api';
import './RequestManagement.css';

const STATUS_LABELS = {
    PENDING: 'Chờ quản lý duyệt',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Đã từ chối',
    CANCELLED: 'Đã hủy'
};

const REQUEST_TYPE_LABELS = {
    LEAVE: 'Xin nghỉ phép',
    RESIGN: 'Xin nghỉ việc'
};

const LEAVE_TYPE_LABELS = {
    annual: 'Phép năm',
    unpaid: 'Không hưởng lương',
    statutory: 'Nghỉ chế độ',
    maternity: 'Nghỉ Thai Sản'
};

// Module options - Chỉ cho HR/ADMIN (xem toàn bộ đơn trong hệ thống)
const MODULE_OPTIONS = [
    {
        key: 'all',
        label: 'Tất cả đơn',
        header: 'Quản lý đơn từ',
        description: 'Xem và theo dõi tất cả các đơn xin phép, đơn tăng ca, đơn bổ sung chấm công trong hệ thống.'
    },
    {
        key: 'leave',
        label: 'Đơn xin nghỉ',
        header: 'Quản lý đơn nghỉ',
        description: 'Theo dõi trạng thái và tiến độ phê duyệt đơn nghỉ.'
    },
    {
        key: 'overtime',
        label: 'Đơn tăng ca',
        header: 'Quản lý đơn tăng ca',
        description: 'Theo dõi tiến độ phê duyệt đơn tăng ca.'
    },
    {
        key: 'attendance',
        label: 'Đơn bổ sung công',
        header: 'Quản lý đơn bổ sung công',
        description: 'Theo dõi tiến độ phê duyệt đơn bổ sung công.'
    }
];

const formatDateDisplay = (value, withTime = false) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...(withTime
            ? {
                hour: '2-digit',
                minute: '2-digit'
            }
            : {})
    });
};

// Component này CHỈ dành cho HR/ADMIN
const RequestManagement = ({ currentUser, showToast, showConfirm }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false); // Indicator cho realtime update
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [activeModule, setActiveModule] = useState('all');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Statistics cho tất cả các status của module hiện tại
    const [moduleStatusStatistics, setModuleStatusStatistics] = useState({
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0
    });

    // Statistics per module - fetch all modules to show badges
    const [moduleStatistics, setModuleStatistics] = useState({
        all: { pending: 0, total: 0 },
        leave: { pending: 0, total: 0 },
        overtime: { pending: 0, total: 0 },
        attendance: { pending: 0, total: 0 }
    });

    // Refs để track previous values và tránh setState không cần thiết
    const prevModuleStatsRef = useRef(null);
    const prevModuleStatusStatsRef = useRef(null);
    const prevRequestsRef = useRef(null);

    // Helper function để so sánh shallow objects
    const shallowEqual = (obj1, obj2) => {
        if (obj1 === obj2) return true;
        if (!obj1 || !obj2) return false;
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        if (keys1.length !== keys2.length) return false;
        for (let key of keys1) {
            if (obj1[key] !== obj2[key]) return false;
        }
        return true;
    };

    // Helper function để so sánh arrays
    const arraysEqual = (arr1, arr2) => {
        if (arr1 === arr2) return true;
        if (!arr1 || !arr2) return false;
        if (arr1.length !== arr2.length) return false;
        const arr1Str = JSON.stringify(arr1.map(r => ({ id: r.id, status: r.status, updated_at: r.updated_at })));
        const arr2Str = JSON.stringify(arr2.map(r => ({ id: r.id, status: r.status, updated_at: r.updated_at })));
        return arr1Str === arr2Str;
    };

    // Function để fetch statistics - có thể gọi từ nhiều nơi
    const fetchModuleStatistics = useCallback(async (silent = false) => {
        if (!currentUser?.id) return;

        if (!silent) setIsRefreshing(true);
        try {
            const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

            // Không thêm employeeId - lấy toàn bộ đơn trong hệ thống
            const baseParams = {};

            const [leaveResponse, overtimeResponse, attendanceResponse] = await Promise.all([
                Promise.all(statuses.map(status => leaveRequestsAPI.getAll({ ...baseParams, status }))),
                Promise.all(statuses.map(status => overtimeRequestsAPI.getAll({ ...baseParams, status }))),
                Promise.all(statuses.map(status => attendanceAdjustmentsAPI.getAll({ ...baseParams, status })))
            ]);

            const leaveStats = {
                pending: leaveResponse[0].data.success ? (leaveResponse[0].data.data || []).length : 0,
                approved: leaveResponse[1].data.success ? (leaveResponse[1].data.data || []).length : 0,
                rejected: leaveResponse[2].data.success ? (leaveResponse[2].data.data || []).length : 0,
                cancelled: leaveResponse[3].data.success ? (leaveResponse[3].data.data || []).length : 0,
                total: 0
            };
            // Không tính CANCELLED vào total
            leaveStats.total = leaveStats.pending + leaveStats.approved + leaveStats.rejected;

            const overtimeStats = {
                pending: overtimeResponse[0].data.success ? (overtimeResponse[0].data.data || []).length : 0,
                approved: overtimeResponse[1].data.success ? (overtimeResponse[1].data.data || []).length : 0,
                rejected: overtimeResponse[2].data.success ? (overtimeResponse[2].data.data || []).length : 0,
                cancelled: overtimeResponse[3].data.success ? (overtimeResponse[3].data.data || []).length : 0,
                total: 0
            };
            // Không tính CANCELLED vào total
            overtimeStats.total = overtimeStats.pending + overtimeStats.approved + overtimeStats.rejected;

            const attendanceStats = {
                pending: attendanceResponse[0].data.success ? (attendanceResponse[0].data.data || []).length : 0,
                approved: attendanceResponse[1].data.success ? (attendanceResponse[1].data.data || []).length : 0,
                rejected: attendanceResponse[2].data.success ? (attendanceResponse[2].data.data || []).length : 0,
                cancelled: attendanceResponse[3].data.success ? (attendanceResponse[3].data.data || []).length : 0,
                total: 0
            };
            // Không tính CANCELLED vào total
            attendanceStats.total = attendanceStats.pending + attendanceStats.approved + attendanceStats.rejected;

            const allStats = {
                pending: leaveStats.pending + overtimeStats.pending + attendanceStats.pending,
                approved: leaveStats.approved + overtimeStats.approved + attendanceStats.approved,
                rejected: leaveStats.rejected + overtimeStats.rejected + attendanceStats.rejected,
                cancelled: leaveStats.cancelled + overtimeStats.cancelled + attendanceStats.cancelled,
                total: leaveStats.total + overtimeStats.total + attendanceStats.total // Đã loại bỏ CANCELLED
            };

            const newModuleStats = {
                all: { pending: allStats.pending, total: allStats.total },
                leave: { pending: leaveStats.pending, total: leaveStats.total },
                overtime: { pending: overtimeStats.pending, total: overtimeStats.total },
                attendance: { pending: attendanceStats.pending, total: attendanceStats.total }
            };

            // Chỉ update state nếu data thực sự thay đổi
            if (!prevModuleStatsRef.current || !shallowEqual(prevModuleStatsRef.current.all, newModuleStats.all) ||
                !shallowEqual(prevModuleStatsRef.current.leave, newModuleStats.leave) ||
                !shallowEqual(prevModuleStatsRef.current.overtime, newModuleStats.overtime) ||
                !shallowEqual(prevModuleStatsRef.current.attendance, newModuleStats.attendance)) {
                setModuleStatistics(newModuleStats);
                prevModuleStatsRef.current = newModuleStats;
            }

            // Set module status statistics based on active module
            let newStatusStats;
            if (activeModule === 'all') {
                newStatusStats = allStats;
            } else if (activeModule === 'leave') {
                newStatusStats = leaveStats;
            } else if (activeModule === 'overtime') {
                newStatusStats = overtimeStats;
            } else if (activeModule === 'attendance') {
                newStatusStats = attendanceStats;
            } else {
                newStatusStats = allStats;
            }

            // Chỉ update state nếu data thực sự thay đổi
            if (!prevModuleStatusStatsRef.current || !shallowEqual(prevModuleStatusStatsRef.current, newStatusStats)) {
                setModuleStatusStatistics(newStatusStats);
                prevModuleStatusStatsRef.current = newStatusStats;
            }
        } catch (error) {
            console.error('Error fetching module statistics:', error);
        } finally {
            if (!silent) {
                setTimeout(() => setIsRefreshing(false), 300);
            }
        }
    }, [currentUser?.id, activeModule]);

    // Fetch statistics với realtime update
    useEffect(() => {
        fetchModuleStatistics(false); // Lần đầu hiển thị loading
        // Realtime update: polling mỗi 5 giây (silent mode - không hiển thị loading)
        const interval = setInterval(() => fetchModuleStatistics(true), 5000);
        return () => clearInterval(interval);
    }, [fetchModuleStatistics]);

    const statusFilters = useMemo(() => {
        return [
            { key: 'PENDING', label: 'Chờ duyệt' },
            { key: 'APPROVED', label: 'Đã duyệt' },
            { key: 'REJECTED', label: 'Đã từ chối' },
            { key: 'ALL', label: 'Tất cả' }
        ];
    }, []);

    // Fetch requests based on active module and selected status - LẤY TOÀN BỘ ĐƠN (HR/ADMIN)
    const fetchRequests = useCallback(async (silent = false) => {
        if (!currentUser?.id) return;

        if (!silent) setLoading(true);
        try {
            // Không thêm employeeId - lấy toàn bộ đơn trong hệ thống
            const params = {};
            if (selectedStatus !== 'ALL') {
                params.status = selectedStatus;
            }

            let newRequests = [];

            if (activeModule === 'all') {
                const [leaveResponse, overtimeResponse, attendanceResponse] = await Promise.all([
                    leaveRequestsAPI.getAll(params),
                    overtimeRequestsAPI.getAll(params),
                    attendanceAdjustmentsAPI.getAll(params)
                ]);

                newRequests = [
                    ...(leaveResponse.data.success ? (leaveResponse.data.data || []).map(r => ({ ...r, requestType: 'leave' })) : []),
                    ...(overtimeResponse.data.success ? (overtimeResponse.data.data || []).map(r => ({ ...r, requestType: 'overtime' })) : []),
                    ...(attendanceResponse.data.success ? (attendanceResponse.data.data || []).map(r => ({ ...r, requestType: 'attendance' })) : [])
                ];

                // Sắp xếp theo thời gian tạo mới nhất
                newRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } else if (activeModule === 'leave') {
                const response = await leaveRequestsAPI.getAll(params);
                if (response.data.success) {
                    newRequests = (response.data.data || []).map(r => ({ ...r, requestType: 'leave' }));
                }
            } else if (activeModule === 'overtime') {
                const response = await overtimeRequestsAPI.getAll(params);
                if (response.data.success) {
                    newRequests = (response.data.data || []).map(r => ({ ...r, requestType: 'overtime' }));
                }
            } else if (activeModule === 'attendance') {
                const response = await attendanceAdjustmentsAPI.getAll(params);
                if (response.data.success) {
                    newRequests = (response.data.data || []).map(r => ({ ...r, requestType: 'attendance' }));
                }
            }

            // Chỉ update state nếu data thực sự thay đổi
            if (!prevRequestsRef.current || !arraysEqual(prevRequestsRef.current, newRequests)) {
                setRequests(newRequests);
                prevRequestsRef.current = newRequests;
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
            if (showToast && !silent) {
                showToast('Lỗi khi tải danh sách đơn từ', 'error');
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [activeModule, selectedStatus, currentUser?.id, showToast]);

    useEffect(() => {
        fetchRequests(false); // Lần đầu hiển thị loading
        // Realtime update: polling mỗi 5 giây (silent mode - không hiển thị loading)
        const interval = setInterval(() => fetchRequests(true), 5000);
        return () => clearInterval(interval);
    }, [fetchRequests]);

    const getStatusLabel = (status) => {
        return STATUS_LABELS[status] || status;
    };

    const getRequestTypeLabel = (requestType) => {
        return REQUEST_TYPE_LABELS[requestType] || requestType;
    };

    const getLeaveTypeLabel = (leaveType) => {
        return LEAVE_TYPE_LABELS[leaveType] || leaveType;
    };

    const handleViewRequest = useCallback((request) => {
        setSelectedRequest(request);
        setShowDetailModal(true);
    }, []);

    // HR không có quyền xóa đơn - Function này đã bị vô hiệu hóa
    /* eslint-disable no-unused-vars */
    const handleDelete = async (request) => {
        // Function disabled - HR không có quyền xóa đơn
        console.warn('HR không có quyền xóa đơn');
        return;
    };
    /* eslint-enable no-unused-vars */

    const renderCardHeader = (request) => {
        const requestType = request.requestType || activeModule;

        if (requestType === 'leave' || activeModule === 'leave') {
            return (
                <>
                    <h3>{getRequestTypeLabel(request.request_type)}</h3>
                    <p className="request-management-period">
                        {formatDateDisplay(request.start_date)}
                        {request.request_type === 'LEAVE' && request.end_date
                            ? ` → ${formatDateDisplay(request.end_date)}`
                            : ''}
                    </p>
                </>
            );
        }

        if (requestType === 'overtime' || activeModule === 'overtime') {
            return (
                <>
                    <h3>Đơn tăng ca</h3>
                    <p className="request-management-period">
                        {formatDateDisplay(request.request_date)} • {request.start_time?.slice(0, 5)} →{' '}
                        {request.end_time?.slice(0, 5)}
                        {request.duration ? ` • ${request.duration}` : ''}
                    </p>
                </>
            );
        }

        return (
            <>
                <h3>Đơn bổ sung chấm công</h3>
                <p className="request-management-period">
                    {formatDateDisplay(request.adjustment_date || request.request_date)}
                    {request.check_in_time && ` • Vào: ${request.check_in_time.slice(0, 5)}`}
                    {request.check_out_time && ` • Ra: ${request.check_out_time.slice(0, 5)}`}
                </p>
            </>
        );
    };

    const mapDecisionLabel = (value, fallback) => {
        if (!value && fallback) return getStatusLabel(fallback);
        if (!value) return '-';
        return getStatusLabel(value);
    };

    const renderRequestDetails = (request) => {
        if (!request) return null;

        const requestType = request.requestType || activeModule;

        if (requestType === 'leave' || activeModule === 'leave') {
            // Tính số ngày nghỉ
            let totalDays = '-';
            if (request.request_type === 'LEAVE' && request.start_date && request.end_date) {
                const start = new Date(request.start_date);
                const end = new Date(request.end_date);
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                totalDays = `${diffDays} ngày`;
            } else if (request.duration) {
                totalDays = request.duration;
            }

            return (
                <>
                    {/* Thông tin đơn */}
                    <div className="request-management-modal-section">
                        <h3 className="request-management-modal-section-title">
                            <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Thông tin đơn
                        </h3>
                        <div className="request-management-modal-info-grid">
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                    </svg>
                                    Tên nhân viên
                                </span>
                                <span className="info-value">{request.employee_name || request.ho_ten || '-'}</span>
                            </div>
                            {request.ma_nhan_vien && (
                                <div className="request-management-modal-info-item">
                                    <span className="info-label">
                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path>
                                        </svg>
                                        Mã nhân viên
                                    </span>
                                    <span className="info-value">{request.ma_nhan_vien}</span>
                                </div>
                            )}
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    Mã đơn
                                </span>
                                <span className="info-value">ĐN{String(request.id).padStart(6, '0')}</span>
                            </div>
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Trạng thái
                                </span>
                                <span className={`leave-status-tag ${request.status?.toLowerCase() || 'pending'}`}>
                                    {getStatusLabel(request.status)}
                                </span>
                            </div>
                            {request.created_at && (
                                <div className="request-management-modal-info-item">
                                    <span className="info-label">
                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        Ngày tạo
                                    </span>
                                    <span className="info-value">{formatDateDisplay(request.created_at, true)}</span>
                                </div>
                            )}
                            {request.team_lead_action_at && (
                                <div className="request-management-modal-info-item">
                                    <span className="info-label">
                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        Ngày quản lý xử lý
                                    </span>
                                    <span className="info-value">{formatDateDisplay(request.team_lead_action_at, true)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chi tiết nghỉ phép */}
                    <div className="request-management-modal-section">
                        <h3 className="request-management-modal-section-title">
                            <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            Chi tiết nghỉ phép
                        </h3>
                        <div className="request-management-modal-info-grid">
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                                    </svg>
                                    Loại đơn
                                </span>
                                <span className="info-value">{getRequestTypeLabel(request.request_type) || '-'}</span>
                            </div>
                            {request.leave_type && (
                                <div className="request-management-modal-info-item">
                                    <span className="info-label">
                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                        </svg>
                                        Loại phép
                                    </span>
                                    <span className="info-value">{getLeaveTypeLabel(request.leave_type)}</span>
                                </div>
                            )}
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                    Ngày bắt đầu
                                </span>
                                <span className="info-value">{formatDateDisplay(request.start_date) || '-'}</span>
                            </div>
                            {request.end_date && (
                                <div className="request-management-modal-info-item">
                                    <span className="info-label">
                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        Ngày kết thúc
                                    </span>
                                    <span className="info-value">{formatDateDisplay(request.end_date)}</span>
                                </div>
                            )}
                            {totalDays !== '-' && (
                                <div className="request-management-modal-info-item">
                                    <span className="info-label">
                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        Tổng số ngày nghỉ
                                    </span>
                                    <span className="info-value info-value-highlight">{totalDays}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lý do và Ghi chú */}
                    {(request.reason || request.notes || request.manager_comment || request.team_lead_comment) && (
                        <div className="request-management-modal-section">
                            <h3 className="request-management-modal-section-title">
                                <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                Lý do và Ghi chú
                            </h3>
                            {request.reason && (
                                <div className="request-management-reason-text">
                                    <strong>Lý do:</strong> {request.reason}
                                </div>
                            )}
                            {request.notes && (
                                <div className="request-management-notes-text">
                                    <strong>Ghi chú:</strong> {request.notes}
                                </div>
                            )}
                            {(request.manager_comment || request.team_lead_comment) && (
                                <div className="request-management-manager-comment-text">
                                    <strong>Nhận xét của quản lý:</strong> {request.manager_comment || request.team_lead_comment}
                                </div>
                            )}
                        </div>
                    )}
                </>
            );
        }

        if (requestType === 'overtime' || activeModule === 'overtime') {
            return (
                <>
                    {/* Thông tin đơn */}
                    <div className="request-management-modal-section">
                        <h3 className="request-management-modal-section-title">
                            <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Thông tin đơn
                        </h3>
                        <div className="request-management-modal-info-grid">
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                    </svg>
                                    Tên nhân viên
                                </span>
                                <span className="info-value">{request.employee_name || request.ho_ten || '-'}</span>
                            </div>
                            {request.ma_nhan_vien && (
                                <div className="request-management-modal-info-item">
                                    <span className="info-label">
                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path>
                                        </svg>
                                        Mã nhân viên
                                    </span>
                                    <span className="info-value">{request.ma_nhan_vien}</span>
                                </div>
                            )}
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    Mã đơn
                                </span>
                                <span className="info-value">ĐTC{String(request.id).padStart(6, '0')}</span>
                            </div>
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Trạng thái
                                </span>
                                <span className={`leave-status-tag ${request.status?.toLowerCase() || 'pending'}`}>
                                    {getStatusLabel(request.status)}
                                </span>
                            </div>
                            {request.created_at && (
                                <div className="request-management-modal-info-item">
                                    <span className="info-label">
                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        Ngày tạo
                                    </span>
                                    <span className="info-value">{formatDateDisplay(request.created_at, true)}</span>
                                </div>
                            )}
                            {request.team_lead_action_at && (
                                <div className="request-management-modal-info-item">
                                    <span className="info-label">
                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        Ngày quản lý xử lý
                                    </span>
                                    <span className="info-value">{formatDateDisplay(request.team_lead_action_at, true)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chi tiết tăng ca */}
                    <div className="request-management-modal-section">
                        <h3 className="request-management-modal-section-title">
                            <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Chi tiết tăng ca
                        </h3>
                        <div className="request-management-modal-info-grid">
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                    Ngày tăng ca
                                </span>
                                <span className="info-value">{formatDateDisplay(request.request_date) || '-'}</span>
                            </div>
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Giờ bắt đầu
                                </span>
                                <span className="info-value">{request.start_time?.slice(0, 5) || '-'}</span>
                            </div>
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Giờ kết thúc
                                </span>
                                <span className="info-value">{request.end_time?.slice(0, 5) || '-'}</span>
                            </div>
                            {request.duration && (
                                <div className="request-management-modal-info-item">
                                    <span className="info-label">
                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                        </svg>
                                        Thời lượng
                                    </span>
                                    <span className="info-value info-value-highlight">{request.duration}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Nội dung công việc và Nhận xét */}
                    {(request.reason || request.manager_comment || request.team_lead_comment) && (
                        <div className="request-management-modal-section">
                            <h3 className="request-management-modal-section-title">
                                <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                Nội dung công việc và Nhận xét
                            </h3>
                            {request.reason && (
                                <div className="request-management-reason-text">
                                    <strong>Nội dung công việc:</strong> {request.reason}
                                </div>
                            )}
                            {(request.manager_comment || request.team_lead_comment) && (
                                <div className="request-management-manager-comment-text">
                                    <strong>Nhận xét của quản lý:</strong> {request.manager_comment || request.team_lead_comment}
                                </div>
                            )}
                        </div>
                    )}
                </>
            );
        }

        if (requestType === 'attendance' || activeModule === 'attendance') {
            // Lấy loại bổ sung công từ notes hoặc attendance_type
            const notes = request.notes || '';
            const attendanceType = request.attendance_type ||
                (notes.includes('ATTENDANCE_TYPE:')
                    ? notes.split('ATTENDANCE_TYPE:')[1]?.split('\n')[0]?.trim()
                    : null);
            let attendanceTypeLabel = 'Quên Chấm Công';
            if (attendanceType === 'FORGOT_CHECK' || attendanceType === '1') {
                attendanceTypeLabel = 'Quên Chấm Công';
            } else if (attendanceType === 'CONSTRUCTION_SITE' || attendanceType === '2') {
                attendanceTypeLabel = 'Đi Công Trình';
            } else if (attendanceType === 'OUTSIDE_WORK' || attendanceType === '3') {
                attendanceTypeLabel = 'Làm việc bên ngoài';
            }

            // Lọc bỏ ATTENDANCE_TYPE từ notes khi hiển thị
            const cleanNotes = notes.replace(/ATTENDANCE_TYPE:[^\n]*\n?/g, '').trim() || null;

            return (
                <>
                    {/* Thông tin đơn */}
                    <div className="request-management-modal-section">
                        <h3 className="request-management-modal-section-title">
                            <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Thông tin đơn
                        </h3>
                        <div className="request-management-modal-info-grid">
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                    </svg>
                                    Tên nhân viên
                                </span>
                                <span className="info-value">{request.employee_name || request.ho_ten || '-'}</span>
                            </div>
                            {request.ma_nhan_vien && (
                                <div className="request-management-modal-info-item">
                                    <span className="info-label">
                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path>
                                        </svg>
                                        Mã nhân viên
                                    </span>
                                    <span className="info-value">{request.ma_nhan_vien}</span>
                                </div>
                            )}
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    Mã đơn
                                </span>
                                <span className="info-value">ĐBSC{String(request.id).padStart(6, '0')}</span>
                            </div>
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Trạng thái
                                </span>
                                <span className={`leave-status-tag ${request.status?.toLowerCase() || 'pending'}`}>
                                    {getStatusLabel(request.status)}
                                </span>
                            </div>
                            {request.created_at && (
                                <div className="request-management-modal-info-item">
                                    <span className="info-label">
                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        Ngày tạo
                                    </span>
                                    <span className="info-value">{formatDateDisplay(request.created_at, true)}</span>
                                </div>
                            )}
                            {request.team_lead_action_at && (
                                <div className="request-management-modal-info-item">
                                    <span className="info-label">
                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        Ngày quản lý xử lý
                                    </span>
                                    <span className="info-value">{formatDateDisplay(request.team_lead_action_at, true)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chi tiết bổ sung chấm công */}
                    <div className="request-management-modal-section">
                        <h3 className="request-management-modal-section-title">
                            <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Chi tiết bổ sung chấm công
                        </h3>
                        <div className="request-management-modal-info-grid">
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                    </svg>
                                    Loại bổ sung
                                </span>
                                <span className="info-value">{attendanceTypeLabel}</span>
                            </div>
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                    Ngày bổ sung
                                </span>
                                <span className="info-value">{formatDateDisplay(request.adjustment_date || request.request_date) || '-'}</span>
                            </div>
                            {request.check_in_time && (
                                <div className="request-management-modal-info-item">
                                    <span className="info-label">
                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        Giờ vào
                                    </span>
                                    <span className="info-value">{request.check_in_time.slice(0, 5)}</span>
                                </div>
                            )}
                            {request.check_out_time && (
                                <div className="request-management-modal-info-item">
                                    <span className="info-label">
                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        Giờ ra
                                    </span>
                                    <span className="info-value">{request.check_out_time.slice(0, 5)}</span>
                                </div>
                            )}
                            {request.check_type && (
                                <div className="request-management-modal-info-item">
                                    <span className="info-label">
                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        Loại chấm công
                                    </span>
                                    <span className="info-value">
                                        {request.check_type === 'CHECK_IN' ? 'Chấm vào' : request.check_type === 'CHECK_OUT' ? 'Chấm ra' : request.check_type}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lý do bổ sung và Nhận xét */}
                    {(cleanNotes || request.manager_comment || request.team_lead_comment) && (
                        <div className="request-management-modal-section">
                            <h3 className="request-management-modal-section-title">
                                <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                Lý do bổ sung và Nhận xét
                            </h3>
                            {cleanNotes && (
                                <div className="request-management-reason-text">
                                    <strong>Lý do bổ sung:</strong> {cleanNotes}
                                </div>
                            )}
                            {(request.manager_comment || request.team_lead_comment) && (
                                <div className="request-management-manager-comment-text">
                                    <strong>Nhận xét của quản lý:</strong> {request.manager_comment || request.team_lead_comment}
                                </div>
                            )}
                        </div>
                    )}
                </>
            );
        }

        return null;
    };

    const filteredRequests = useMemo(() => {
        // Loại bỏ đơn đã hủy (CANCELLED) khỏi danh sách
        const nonCancelledRequests = requests.filter(request => request.status !== 'CANCELLED');

        if (selectedStatus === 'ALL') return nonCancelledRequests;
        return nonCancelledRequests.filter(r => r.status === selectedStatus);
    }, [requests, selectedStatus]);

    // Memoize table header để tránh render lại
    const tableHeader = useMemo(() => {
        if (activeModule === 'all') {
            return (
                <>
                    <th>Loại đơn</th>
                    <th>Thông tin đơn</th>
                    <th>Ngày/Thời gian</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                </>
            );
        } else if (activeModule === 'leave') {
            return (
                <>
                    <th>Loại đơn</th>
                    <th>Thời gian nghỉ</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                </>
            );
        } else if (activeModule === 'overtime') {
            return (
                <>
                    <th>Ngày tăng ca</th>
                    <th>Thời gian</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                </>
            );
        } else if (activeModule === 'attendance') {
            return (
                <>
                    <th>Ngày bổ sung</th>
                    <th>Thời gian</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                </>
            );
        }
        return null;
    }, [activeModule]);

    // Memoize style objects để tránh tạo mới mỗi lần render
    const rowStyle = useMemo(() => ({ cursor: 'pointer' }), []);
    const refreshingSpanStyle = useMemo(() => ({ marginLeft: '10px', fontSize: '0.7em', color: '#10b981', opacity: 0.8 }), []);
    const subtitleSpanStyle = useMemo(() => ({ marginLeft: '10px', fontSize: '0.85em', opacity: 0.7 }), []);

    return (
        <div className="request-management">
            {/* Tiêu đề chính */}
            <div className="request-management-header">
                <div className="request-management-header-top">
                    <div className="request-management-header-content">
                        {/* Icon Banner Block */}
                        <div className="request-management-icon-wrapper">
                            <svg className="request-management-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                        </div>
                        {/* Header Text Block */}
                        <div className="request-management-header-text">
                            <h1 className="request-management-title">
                                {MODULE_OPTIONS.find(m => m.key === activeModule)?.header || 'QUẢN LÝ ĐƠN TỪ'}
                                {isRefreshing && (
                                    <span style={refreshingSpanStyle}>
                                        ● Đang cập nhật...
                                    </span>
                                )}
                            </h1>
                            <p className="request-management-subtitle">
                                {MODULE_OPTIONS.find(m => m.key === activeModule)?.description || 'Xem và theo dõi tất cả các đơn từ.'}
                                <span style={subtitleSpanStyle}>
                                    {!isRefreshing && '● Cập nhật tự động mỗi 5 giây'}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Nội dung */}
            <div className="request-management-content">
                {/* Main Filter Bar - Lọc theo Loại Yêu cầu */}
                <div className="request-management-main-filter-bar">
                    <div className="request-type-filter-group">
                        {MODULE_OPTIONS.map((module) => {
                            const totalCount = moduleStatistics[module.key]?.total || 0;
                            const pendingCount = moduleStatistics[module.key]?.pending || 0;
                            const hasPending = pendingCount > 0;

                            return (
                                <button
                                    key={module.key}
                                    type="button"
                                    className={`request-type-filter-chip ${module.key} ${activeModule === module.key ? 'active' : ''} ${hasPending ? 'has-pending' : ''}`}
                                    onClick={() => setActiveModule(module.key)}
                                >
                                    <span className="request-type-filter-label">{module.label}</span>
                                    <span className={`request-module-badge ${hasPending ? 'pulsing' : ''}`}>
                                        {totalCount}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Summary Cards - Gradient Glass Style */}
                <div className="request-management-summary-cards">
                    {statusFilters.map((filter) => {
                        let count = 0;
                        let icon = null;
                        let gradient = '';

                        if (filter.key === 'PENDING') {
                            count = moduleStatusStatistics.pending;
                            gradient = 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.25))';
                            icon = (
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            );
                        } else if (filter.key === 'APPROVED') {
                            count = moduleStatusStatistics.approved;
                            gradient = 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(22, 163, 74, 0.25))';
                            icon = (
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            );
                        } else if (filter.key === 'REJECTED') {
                            count = moduleStatusStatistics.rejected;
                            gradient = 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.25))';
                            icon = (
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            );
                        } else if (filter.key === 'ALL') {
                            // Không tính CANCELLED vào tổng
                            count = moduleStatusStatistics.pending +
                                moduleStatusStatistics.approved +
                                moduleStatusStatistics.rejected;
                            gradient = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.25))';
                            icon = (
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                </svg>
                            );
                        }

                        return (
                            <div
                                key={filter.key}
                                className={`request-management-summary-card ${selectedStatus === filter.key ? 'active' : ''}`}
                                onClick={() => setSelectedStatus(filter.key)}
                                style={{ background: gradient }}
                            >
                                <div className="summary-card-icon">
                                    {icon}
                                </div>
                                <div className="summary-card-content">
                                    <div className="summary-card-label">{filter.label}</div>
                                    <div className="summary-card-count">{count}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Request Table */}
                <div className="request-management-table-container">
                    {loading ? (
                        <div className="request-management-loading">Đang tải...</div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="request-management-empty">Không có đơn từ nào.</div>
                    ) : (
                        <table className="request-management-table">
                            <thead>
                                <tr>
                                    {tableHeader}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map((request, index) => {
                                    // Create unique key combining request type and id
                                    const uniqueKey = `${request.requestType || activeModule}-${request.id}-${index}`;
                                    return (
                                        <tr
                                            key={uniqueKey}
                                            className={`request-management-table-row-clickable ${index % 2 === 1 ? 'even-row-bg' : ''}`}
                                            onClick={() => handleViewRequest(request)}
                                            style={rowStyle}
                                        >
                                            {activeModule === 'all' && (
                                                <>
                                                    <td className="request-type-cell">
                                                        <span className={`request-type-badge ${request.requestType || 'leave'}`}>
                                                            {request.requestType === 'leave' ? 'Đơn xin nghỉ' :
                                                                request.requestType === 'overtime' ? 'Đơn tăng ca' :
                                                                    request.requestType === 'attendance' ? 'Đơn bổ sung công' : 'Đơn xin nghỉ'}
                                                        </span>
                                                    </td>
                                                    <td className="request-info-cell">
                                                        {request.requestType === 'leave' && (
                                                            <>
                                                                <strong>{getRequestTypeLabel(request.request_type)}</strong>
                                                                <p className="request-management-period">{getLeaveTypeLabel(request.leave_type)}</p>
                                                            </>
                                                        )}
                                                        {request.requestType === 'overtime' && (
                                                            <>
                                                                <strong>Đơn tăng ca</strong>
                                                                <p className="request-management-period">{request.reason || 'N/A'}</p>
                                                            </>
                                                        )}
                                                        {request.requestType === 'attendance' && (
                                                            <>
                                                                <strong>Đơn bổ sung chấm công</strong>
                                                                <p className="request-management-period">
                                                                    {(() => {
                                                                        const notes = request.notes || '';
                                                                        const attendanceType = request.attendance_type || (notes.includes('ATTENDANCE_TYPE:') ? notes.split('ATTENDANCE_TYPE:')[1]?.split('\n')[0]?.trim() : null);
                                                                        if (attendanceType === 'FORGOT_CHECK' || attendanceType === '1') return 'Quên Chấm Công';
                                                                        if (attendanceType === 'CONSTRUCTION_SITE' || attendanceType === '2') return 'Đi Công Trình';
                                                                        if (attendanceType === 'OUTSIDE_WORK' || attendanceType === '3') return 'Làm việc bên ngoài';
                                                                        return 'Quên Chấm Công';
                                                                    })()}
                                                                </p>
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="request-dates-cell">
                                                        <div className="request-dates-info">
                                                            {request.requestType === 'leave' && (
                                                                <>
                                                                    <span>{formatDateDisplay(request.start_date)}</span>
                                                                    {request.end_date && (
                                                                        <>
                                                                            <span className="date-separator"> → </span>
                                                                            <span>{formatDateDisplay(request.end_date)}</span>
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}
                                                            {request.requestType === 'overtime' && (
                                                                <>
                                                                    <span>{formatDateDisplay(request.request_date)}</span>
                                                                    {request.start_time && request.end_time && (
                                                                        <span className="time-info">{request.start_time.slice(0, 5)} → {request.end_time.slice(0, 5)}</span>
                                                                    )}
                                                                </>
                                                            )}
                                                            {request.requestType === 'attendance' && (
                                                                <>
                                                                    <span>{formatDateDisplay(request.adjustment_date || request.request_date)}</span>
                                                                    {request.check_in_time && (
                                                                        <span>Vào: {request.check_in_time.slice(0, 5)}</span>
                                                                    )}
                                                                    {request.check_in_time && request.check_out_time && (
                                                                        <span className="date-separator"> / </span>
                                                                    )}
                                                                    {request.check_out_time && (
                                                                        <span>Ra: {request.check_out_time.slice(0, 5)}</span>
                                                                    )}
                                                                    {!request.check_in_time && !request.check_out_time && (
                                                                        <span>-</span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`status-badge ${request.status?.toLowerCase() || 'pending'}`}>
                                                            {getStatusLabel(request.status)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn-delete-small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (showToast) {
                                                                    showToast('Chức năng xóa đơn đang được phát triển', 'info');
                                                                }
                                                            }}
                                                            title="Xóa đơn"
                                                        >
                                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', marginRight: '4px' }}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                            </svg>
                                                            Xóa
                                                        </button>
                                                    </td>
                                                </>
                                            )}
                                            {activeModule === 'leave' && (
                                                <>
                                                    <td>{getRequestTypeLabel(request.request_type)}</td>
                                                    <td>
                                                        {formatDateDisplay(request.start_date)}
                                                        {request.end_date && ` → ${formatDateDisplay(request.end_date)}`}
                                                    </td>
                                                    <td>
                                                        <span className={`status-badge ${request.status?.toLowerCase() || 'pending'}`}>
                                                            {getStatusLabel(request.status)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn-delete-small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (showToast) {
                                                                    showToast('Chức năng xóa đơn đang được phát triển', 'info');
                                                                }
                                                            }}
                                                            title="Xóa đơn"
                                                        >
                                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', marginRight: '4px' }}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                            </svg>
                                                            Xóa
                                                        </button>
                                                    </td>
                                                </>
                                            )}
                                            {activeModule === 'overtime' && (
                                                <>
                                                    <td>{formatDateDisplay(request.request_date)}</td>
                                                    <td>
                                                        {request.start_time?.slice(0, 5)} → {request.end_time?.slice(0, 5)}
                                                    </td>
                                                    <td>
                                                        <span className={`status-badge ${request.status?.toLowerCase() || 'pending'}`}>
                                                            {getStatusLabel(request.status)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn-delete-small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (showToast) {
                                                                    showToast('Chức năng xóa đơn đang được phát triển', 'info');
                                                                }
                                                            }}
                                                            title="Xóa đơn"
                                                        >
                                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', marginRight: '4px' }}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                            </svg>
                                                            Xóa
                                                        </button>
                                                    </td>
                                                </>
                                            )}
                                            {activeModule === 'attendance' && (
                                                <>
                                                    <td>{formatDateDisplay(request.adjustment_date || request.request_date)}</td>
                                                    <td>
                                                        {request.check_in_time && `Vào: ${request.check_in_time.slice(0, 5)}`}
                                                        {request.check_in_time && request.check_out_time && ' / '}
                                                        {request.check_out_time && `Ra: ${request.check_out_time.slice(0, 5)}`}
                                                        {!request.check_in_time && !request.check_out_time && '-'}
                                                    </td>
                                                    <td>
                                                        <span className={`status-badge ${request.status?.toLowerCase() || 'pending'}`}>
                                                            {getStatusLabel(request.status)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn-delete-small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (showToast) {
                                                                    showToast('Chức năng xóa đơn đang được phát triển', 'info');
                                                                }
                                                            }}
                                                            title="Xóa đơn"
                                                        >
                                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', marginRight: '4px' }}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                            </svg>
                                                            Xóa
                                                        </button>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedRequest && (
                <div className="request-management-modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="request-management-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="request-management-modal-header">
                            <h2 className="request-management-modal-title">Chi tiết đơn từ</h2>
                            <div className="request-management-modal-header-actions">
                                <button
                                    type="button"
                                    className="request-management-modal-close"
                                    onClick={() => {
                                        setShowDetailModal(false);
                                    }}
                                >
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="request-management-modal-body">
                            {renderRequestDetails(selectedRequest)}
                        </div>
                        <div className="request-management-modal-footer">
                            <button
                                type="button"
                                className="request-management-modal-btn request-management-modal-btn--cancel"
                                onClick={() => setShowDetailModal(false)}
                            >
                                Đóng
                            </button>
                            {/* HR không có quyền xóa đơn */}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestManagement;

