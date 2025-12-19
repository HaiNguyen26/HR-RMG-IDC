import React, { useEffect, useMemo, useState } from 'react';
import {
    attendanceAdjustmentsAPI,
    leaveRequestsAPI,
    overtimeRequestsAPI,
} from '../../services/api';
import './EmployeeRequestHistory.css';

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

const MODULE_OPTIONS = [
    {
        key: 'all',
        label: 'Tất cả đơn',
        header: 'Lịch sử đơn từ của tôi',
        description: 'Xem và theo dõi tất cả các đơn từ mà bạn đã gửi: đơn xin phép, đơn tăng ca, đơn bổ sung chấm công.'
    },
    {
        key: 'leave',
        label: 'Đơn xin nghỉ',
        header: 'Lịch sử đơn xin nghỉ',
        description: 'Theo dõi trạng thái và tiến độ phê duyệt các đơn xin nghỉ của bạn.'
    },
    {
        key: 'overtime',
        label: 'Đơn tăng ca',
        header: 'Lịch sử đơn tăng ca',
        description: 'Theo dõi tiến độ phê duyệt các đơn tăng ca của bạn.'
    },
    {
        key: 'attendance',
        label: 'Đơn bổ sung công',
        header: 'Lịch sử đơn bổ sung công',
        description: 'Theo dõi tiến độ phê duyệt các đơn bổ sung công của bạn.'
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

const EmployeeRequestHistory = ({ currentUser, showToast, showConfirm }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false); // Indicator cho realtime update
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [activeModule, setActiveModule] = useState('all');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showRequestDetails, setShowRequestDetails] = useState(false);

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

    // Function để fetch statistics - có thể gọi từ nhiều nơi
    const fetchModuleStatistics = async (silent = false) => {
        if (!currentUser?.id) return;

        if (!silent) setIsRefreshing(true);
        try {
            const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

            // Luôn thêm employeeId để chỉ lấy đơn của nhân viên hiện tại
            const baseParams = { employeeId: currentUser.id };

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

            setModuleStatistics({
                all: { pending: allStats.pending, total: allStats.total },
                leave: { pending: leaveStats.pending, total: leaveStats.total },
                overtime: { pending: overtimeStats.pending, total: overtimeStats.total },
                attendance: { pending: attendanceStats.pending, total: attendanceStats.total }
            });

            // Set module status statistics based on active module
            if (activeModule === 'all') {
                setModuleStatusStatistics(allStats);
            } else if (activeModule === 'leave') {
                setModuleStatusStatistics(leaveStats);
            } else if (activeModule === 'overtime') {
                setModuleStatusStatistics(overtimeStats);
            } else if (activeModule === 'attendance') {
                setModuleStatusStatistics(attendanceStats);
            }
        } catch (error) {
            console.error('Error fetching module statistics:', error);
        } finally {
            if (!silent) {
                setTimeout(() => setIsRefreshing(false), 300);
            }
        }
    };

    // Fetch module statistics với realtime update
    useEffect(() => {
        fetchModuleStatistics(false); // Lần đầu hiển thị loading
        // Realtime update: polling mỗi 5 giây (silent mode - không hiển thị loading)
        const interval = setInterval(() => fetchModuleStatistics(true), 5000);
        return () => clearInterval(interval);
    }, [currentUser?.id, activeModule]);

    const statusFilters = useMemo(() => {
        return [
            { key: 'PENDING', label: 'Chờ duyệt' },
            { key: 'APPROVED', label: 'Đã duyệt' },
            { key: 'REJECTED', label: 'Đã từ chối' },
            { key: 'ALL', label: 'Tất cả' }
        ];
    }, []);

    // Fetch requests based on active module and selected status - CHỈ LẤY ĐƠN CỦA NHÂN VIÊN HIỆN TẠI
    useEffect(() => {
        const fetchRequests = async () => {
            if (!currentUser?.id) return;

            setLoading(true);
            try {
                // Luôn thêm employeeId để chỉ lấy đơn của nhân viên hiện tại
                const params = { employeeId: currentUser.id };
                if (selectedStatus !== 'ALL') {
                    params.status = selectedStatus;
                }

                if (activeModule === 'all') {
                    const [leaveResponse, overtimeResponse, attendanceResponse] = await Promise.all([
                        leaveRequestsAPI.getAll(params),
                        overtimeRequestsAPI.getAll(params),
                        attendanceAdjustmentsAPI.getAll(params)
                    ]);

                    const allRequests = [
                        ...(leaveResponse.data.success ? (leaveResponse.data.data || []).map(r => ({ ...r, requestType: 'leave' })) : []),
                        ...(overtimeResponse.data.success ? (overtimeResponse.data.data || []).map(r => ({ ...r, requestType: 'overtime' })) : []),
                        ...(attendanceResponse.data.success ? (attendanceResponse.data.data || []).map(r => ({ ...r, requestType: 'attendance' })) : [])
                    ];

                    // Sắp xếp theo thời gian tạo mới nhất
                    allRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    setRequests(allRequests);
                } else if (activeModule === 'leave') {
                    const response = await leaveRequestsAPI.getAll(params);
                    if (response.data.success) {
                        setRequests((response.data.data || []).map(r => ({ ...r, requestType: 'leave' })));
                    }
                } else if (activeModule === 'overtime') {
                    const response = await overtimeRequestsAPI.getAll(params);
                    if (response.data.success) {
                        setRequests((response.data.data || []).map(r => ({ ...r, requestType: 'overtime' })));
                    }
                } else if (activeModule === 'attendance') {
                    const response = await attendanceAdjustmentsAPI.getAll(params);
                    if (response.data.success) {
                        setRequests((response.data.data || []).map(r => ({ ...r, requestType: 'attendance' })));
                    }
                }
            } catch (error) {
                console.error('Error fetching requests:', error);
                if (showToast) {
                    showToast('Lỗi khi tải danh sách đơn từ', 'error');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
        // Realtime update: polling mỗi 5 giây
        const interval = setInterval(fetchRequests, 5000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeModule, selectedStatus, currentUser?.id]);

    const getStatusLabel = (status) => {
        return STATUS_LABELS[status] || status;
    };

    const getRequestTypeLabel = (requestType) => {
        return REQUEST_TYPE_LABELS[requestType] || requestType;
    };

    const getLeaveTypeLabel = (leaveType) => {
        return LEAVE_TYPE_LABELS[leaveType] || leaveType;
    };

    const handleViewRequest = (request) => {
        setSelectedRequest(request);
        setShowDetailModal(true);
        setShowRequestDetails(false);
    };

    const handleDelete = async (request) => {
        if (!showConfirm) return;

        const confirmed = await showConfirm({
            title: 'Xác nhận xóa đơn',
            message: `Bạn có chắc chắn muốn xóa đơn này không?`,
            confirmText: 'Xóa',
            cancelText: 'Hủy',
            type: 'warning'
        });

        if (!confirmed) return;

        try {
            setLoading(true);
            let response;
            const deleteData = {
                employeeId: currentUser.id,
                role: currentUser.role
            };

            if (request.requestType === 'leave') {
                response = await leaveRequestsAPI.remove(request.id, deleteData);
            } else if (request.requestType === 'overtime') {
                response = await overtimeRequestsAPI.remove(request.id, deleteData);
            } else if (request.requestType === 'attendance') {
                response = await attendanceAdjustmentsAPI.remove(request.id, deleteData);
            }

            if (response?.data?.success) {
                if (showToast) {
                    showToast('Đã xóa đơn thành công', 'success');
                }
                setShowDetailModal(false);
                setSelectedRequest(null);

                // Refresh requests - Luôn thêm employeeId
                const params = { employeeId: currentUser.id };
                if (selectedStatus !== 'ALL') {
                    params.status = selectedStatus;
                }

                if (activeModule === 'all') {
                    const [leaveResponse, overtimeResponse, attendanceResponse] = await Promise.all([
                        leaveRequestsAPI.getAll(params),
                        overtimeRequestsAPI.getAll(params),
                        attendanceAdjustmentsAPI.getAll(params)
                    ]);
                    const allRequests = [
                        ...(leaveResponse.data.success ? (leaveResponse.data.data || []).map(r => ({ ...r, requestType: 'leave' })) : []),
                        ...(overtimeResponse.data.success ? (overtimeResponse.data.data || []).map(r => ({ ...r, requestType: 'overtime' })) : []),
                        ...(attendanceResponse.data.success ? (attendanceResponse.data.data || []).map(r => ({ ...r, requestType: 'attendance' })) : [])
                    ];
                    allRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    setRequests(allRequests);
                } else if (activeModule === 'leave') {
                    const response = await leaveRequestsAPI.getAll(params);
                    if (response.data.success) {
                        setRequests((response.data.data || []).map(r => ({ ...r, requestType: 'leave' })));
                    }
                } else if (activeModule === 'overtime') {
                    const response = await overtimeRequestsAPI.getAll(params);
                    if (response.data.success) {
                        setRequests((response.data.data || []).map(r => ({ ...r, requestType: 'overtime' })));
                    }
                } else if (activeModule === 'attendance') {
                    const response = await attendanceAdjustmentsAPI.getAll(params);
                    if (response.data.success) {
                        setRequests((response.data.data || []).map(r => ({ ...r, requestType: 'attendance' })));
                    }
                }

                // Realtime update: Refresh statistics và badges ngay lập tức (không silent)
                await fetchModuleStatistics(false);
            }
        } catch (error) {
            console.error('Error deleting request:', error);
            if (showToast) {
                showToast('Lỗi khi xóa đơn', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    // Filter requests - Loại bỏ đơn đã hủy (CANCELLED)
    const filteredRequests = useMemo(() => {
        return requests.filter(request => request.status !== 'CANCELLED');
    }, [requests]);

    return (
        <div className="employee-request-history">
            {/* Tiêu đề chính */}
            <div className="employee-request-history-header">
                <div className="employee-request-history-header-top">
                    <div className="employee-request-history-header-content">
                        {/* Icon Banner Block */}
                        <div className="employee-request-history-icon-wrapper">
                            <svg className="employee-request-history-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </div>
                        {/* Header Text Block */}
                        <div className="employee-request-history-header-text">
                            <h1 className="employee-request-history-title">
                                {MODULE_OPTIONS.find(m => m.key === activeModule)?.header || 'LỊCH SỬ ĐƠN TỪ CỦA TÔI'}
                                {isRefreshing && (
                                    <span style={{ marginLeft: '10px', fontSize: '0.7em', color: '#10b981', opacity: 0.8 }}>
                                        ● Đang cập nhật...
                                    </span>
                                )}
                            </h1>
                            <p className="employee-request-history-subtitle">
                                {MODULE_OPTIONS.find(m => m.key === activeModule)?.description || 'Xem và theo dõi tất cả các đơn từ của bạn.'}
                                <span style={{ marginLeft: '10px', fontSize: '0.85em', opacity: 0.7 }}>
                                    {!isRefreshing && '● Cập nhật tự động mỗi 5 giây'}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Nội dung */}
            <div className="employee-request-history-content">
                {/* Main Filter Bar - Lọc theo Loại Yêu cầu */}
                <div className="employee-request-history-main-filter-bar">
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

                {/* Summary Cards */}
                <div className="employee-request-history-summary-cards">
                    {statusFilters.map((filter) => {
                        let count = 0;
                        let gradient = '';
                        let icon = null;

                        if (filter.key === 'PENDING') {
                            count = moduleStatusStatistics.pending;
                            gradient = 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(217, 119, 6, 0.25))';
                            icon = (
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            );
                        } else if (filter.key === 'APPROVED') {
                            count = moduleStatusStatistics.approved;
                            gradient = 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(21, 128, 61, 0.25))';
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
                                className={`employee-request-history-summary-card ${selectedStatus === filter.key ? 'active' : ''}`}
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
                <div className="employee-request-history-table-container">
                    {loading ? (
                        <div className="employee-request-history-loading">Đang tải...</div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="employee-request-history-empty">Không có đơn từ nào.</div>
                    ) : (
                        <table className="employee-request-history-table">
                            <thead>
                                <tr>
                                    <th>Loại đơn</th>
                                    <th>Thông tin</th>
                                    <th>Ngày/Thời gian</th>
                                    <th>Trạng thái</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map((request, index) => (
                                    <tr
                                        key={request.id || index}
                                        className={index % 2 === 1 ? 'even-row-bg' : ''}
                                    >
                                        <td>
                                            <span className={`request-type-badge ${request.requestType || 'leave'}`}>
                                                {request.requestType === 'leave' ? 'Đơn xin nghỉ' :
                                                    request.requestType === 'overtime' ? 'Đơn tăng ca' :
                                                        request.requestType === 'attendance' ? 'Đơn bổ sung công' : 'Đơn xin nghỉ'}
                                            </span>
                                        </td>
                                        <td>
                                            {request.requestType === 'leave' && (
                                                <>
                                                    <strong>{getLeaveTypeLabel(request.leave_type)}</strong>
                                                    <p className="request-period">{request.reason || '-'}</p>
                                                </>
                                            )}
                                            {request.requestType === 'overtime' && (
                                                <>
                                                    <strong>Đơn tăng ca</strong>
                                                    <p className="request-period">{request.reason || '-'}</p>
                                                </>
                                            )}
                                            {request.requestType === 'attendance' && (
                                                <>
                                                    <strong>Bổ sung chấm công</strong>
                                                    <p className="request-period">
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
                                        <td>
                                            {request.requestType === 'leave' && (
                                                <>
                                                    {formatDateDisplay(request.start_date)}
                                                    {request.end_date && ` → ${formatDateDisplay(request.end_date)}`}
                                                </>
                                            )}
                                            {request.requestType === 'overtime' && (
                                                <>
                                                    {formatDateDisplay(request.request_date)}
                                                    <br />
                                                    <small>{request.start_time?.slice(0, 5)} → {request.end_time?.slice(0, 5)}</small>
                                                </>
                                            )}
                                            {request.requestType === 'attendance' && (
                                                <>
                                                    {formatDateDisplay(request.adjustment_date || request.request_date)}
                                                    <br />
                                                    <small>
                                                        {request.check_in_time && `Vào: ${request.check_in_time.slice(0, 5)}`}
                                                        {request.check_in_time && request.check_out_time && ' / '}
                                                        {request.check_out_time && `Ra: ${request.check_out_time.slice(0, 5)}`}
                                                    </small>
                                                </>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${request.status?.toLowerCase() || 'pending'}`}>
                                                {getStatusLabel(request.status)}
                                            </span>
                                        </td>
                                        <td>
                                            {(request.status === 'PENDING' || request.status === 'REJECTED') && (
                                                <button
                                                    type="button"
                                                    className="btn-delete-small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(request);
                                                    }}
                                                >
                                                    Xóa
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmployeeRequestHistory;
