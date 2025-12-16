import React, { useEffect, useMemo, useState } from 'react';
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

const MODULE_OPTIONS = [
    {
        key: 'all',
        label: 'Tất cả đơn',
        header: 'Quản lý đơn từ',
        description: 'Xem và theo dõi tất cả các đơn xin phép, đơn tăng ca, đơn bổ sung chấm công.'
    },
    {
        key: 'leave',
        label: 'Đơn xin nghỉ',
        header: 'Theo dõi đơn nghỉ',
        description: 'Theo dõi trạng thái và tiến độ phê duyệt đơn nghỉ.'
    },
    {
        key: 'overtime',
        label: 'Đơn tăng ca',
        header: 'Theo dõi đơn tăng ca',
        description: 'Theo dõi tiến độ phê duyệt đơn tăng ca.'
    },
    {
        key: 'attendance',
        label: 'Đơn bổ sung công',
        header: 'Theo dõi đơn bổ sung công',
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

const RequestManagement = ({ currentUser, showToast, showConfirm }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
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

    // Fetch statistics for all modules
    useEffect(() => {
        const fetchModuleStatistics = async () => {
            if (!currentUser?.id) return;

            try {
                const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

                // Fetch tất cả các status cho mỗi module để tính tổng
                const [leaveResponse, overtimeResponse, attendanceResponse] = await Promise.all([
                    Promise.all(statuses.map(status => leaveRequestsAPI.getAll({ status }))),
                    Promise.all(statuses.map(status => overtimeRequestsAPI.getAll({ status }))),
                    Promise.all(statuses.map(status => attendanceAdjustmentsAPI.getAll({ status })))
                ]);

                const leaveStats = {
                    pending: leaveResponse[0].data.success ? (leaveResponse[0].data.data || []).length : 0,
                    approved: leaveResponse[1].data.success ? (leaveResponse[1].data.data || []).length : 0,
                    rejected: leaveResponse[2].data.success ? (leaveResponse[2].data.data || []).length : 0,
                    cancelled: leaveResponse[3].data.success ? (leaveResponse[3].data.data || []).length : 0,
                    total: 0
                };
                leaveStats.total = leaveStats.pending + leaveStats.approved + leaveStats.rejected + leaveStats.cancelled;

                const overtimeStats = {
                    pending: overtimeResponse[0].data.success ? (overtimeResponse[0].data.data || []).length : 0,
                    approved: overtimeResponse[1].data.success ? (overtimeResponse[1].data.data || []).length : 0,
                    rejected: overtimeResponse[2].data.success ? (overtimeResponse[2].data.data || []).length : 0,
                    cancelled: overtimeResponse[3].data.success ? (overtimeResponse[3].data.data || []).length : 0,
                    total: 0
                };
                overtimeStats.total = overtimeStats.pending + overtimeStats.approved + overtimeStats.rejected + overtimeStats.cancelled;

                const attendanceStats = {
                    pending: attendanceResponse[0].data.success ? (attendanceResponse[0].data.data || []).length : 0,
                    approved: attendanceResponse[1].data.success ? (attendanceResponse[1].data.data || []).length : 0,
                    rejected: attendanceResponse[2].data.success ? (attendanceResponse[2].data.data || []).length : 0,
                    cancelled: attendanceResponse[3].data.success ? (attendanceResponse[3].data.data || []).length : 0,
                    total: 0
                };
                attendanceStats.total = attendanceStats.pending + attendanceStats.approved + attendanceStats.rejected + attendanceStats.cancelled;

                const allStats = {
                    pending: leaveStats.pending + overtimeStats.pending + attendanceStats.pending,
                    approved: leaveStats.approved + overtimeStats.approved + attendanceStats.approved,
                    rejected: leaveStats.rejected + overtimeStats.rejected + attendanceStats.rejected,
                    cancelled: leaveStats.cancelled + overtimeStats.cancelled + attendanceStats.cancelled,
                    total: leaveStats.total + overtimeStats.total + attendanceStats.total
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
            }
        };

        fetchModuleStatistics();
        const interval = setInterval(fetchModuleStatistics, 30000);
        return () => clearInterval(interval);
    }, [currentUser?.id, activeModule]);

    const statusFilters = useMemo(() => {
        return [
            { key: 'PENDING', label: 'Chờ duyệt' },
            { key: 'APPROVED', label: 'Đã duyệt' },
            { key: 'REJECTED', label: 'Đã từ chối' },
            { key: 'CANCELLED', label: 'Đã hủy' },
            { key: 'ALL', label: 'Tất cả' }
        ];
    }, []);

    // Fetch requests based on active module and selected status
    useEffect(() => {
        const fetchRequests = async () => {
            if (!currentUser?.id) return;

            setLoading(true);
            try {
                const params = {};
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
    }, [activeModule, selectedStatus, currentUser?.id, showToast]);

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

        const confirmed = await showConfirm(
            'Xác nhận xóa đơn',
            `Bạn có chắc chắn muốn xóa đơn này không?`
        );

        if (!confirmed) return;

        try {
            setLoading(true);
            let response;
            if (request.requestType === 'leave') {
                response = await leaveRequestsAPI.delete(request.id);
            } else if (request.requestType === 'overtime') {
                response = await overtimeRequestsAPI.delete(request.id);
            } else if (request.requestType === 'attendance') {
                response = await attendanceAdjustmentsAPI.delete(request.id);
            }

            if (response?.data?.success) {
                if (showToast) {
                    showToast('Đã xóa đơn thành công', 'success');
                }
                setShowDetailModal(false);
                setSelectedRequest(null);
                // Refresh requests
                const params = {};
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
                }
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

    const renderDecisionTrace = (request) => {
        // Xác định bước hiện tại của đơn
        const getCurrentStep = () => {
            if (request.status === 'PENDING') {
                return 1; // Đang ở bước chờ quản lý duyệt
            } else if (['APPROVED', 'REJECTED'].includes(request.status)) {
                return 2; // Đã hoàn thành bước quản lý duyệt
            }
            return 0;
        };

        const currentStep = getCurrentStep();

        return (
            <div className="request-management-modal-section">
                <h3 className="request-management-modal-section-title">
                    <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                    </svg>
                    Timeline đơn từ
                </h3>
                <div className="request-management-timeline">
                    {/* Bước 1: Nhân viên gửi đơn */}
                    <div className={`timeline-step ${currentStep >= 1 ? 'completed' : ''} ${currentStep === 1 ? 'current' : ''}`}>
                        <div className="timeline-step-connector"></div>
                        <div className="timeline-step-icon">
                            {currentStep >= 1 ? (
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            ) : (
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            )}
                        </div>
                        <div className="timeline-step-content">
                            <div className="timeline-step-title">Nhân viên gửi đơn</div>
                            <div className="timeline-step-date">{formatDateDisplay(request.created_at, true)}</div>
                            {currentStep === 1 && (
                                <div className="timeline-step-badge current-badge">Bước hiện tại</div>
                            )}
                        </div>
                    </div>

                    {/* Bước 2: Quản lý trực tiếp */}
                    <div className={`timeline-step ${currentStep >= 2 ? 'completed' : ''} ${currentStep === 2 ? 'current' : ''}`}>
                        <div className="timeline-step-connector"></div>
                        <div className="timeline-step-icon">
                            {currentStep >= 2 ? (
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            ) : (
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            )}
                        </div>
                        <div className="timeline-step-content">
                            <div className="timeline-step-title">Quản lý trực tiếp</div>
                            <div className="timeline-step-date">
                                {request.status === 'PENDING'
                                    ? 'Chờ duyệt'
                                    : (
                                        <>
                                            {mapDecisionLabel(request.team_lead_action, request.status)}
                                            {request.team_lead_action_at && ` - ${formatDateDisplay(request.team_lead_action_at, true)}`}
                                        </>
                                    )
                                }
                            </div>
                            {currentStep === 2 && (
                                <div className="timeline-step-badge current-badge">Bước hiện tại</div>
                            )}
                            {currentStep >= 2 && request.status === 'APPROVED' && (
                                <div className="timeline-step-badge success-badge">Đã duyệt</div>
                            )}
                            {currentStep >= 2 && request.status === 'REJECTED' && (
                                <div className="timeline-step-badge error-badge">Đã từ chối</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderRequestDetails = (request) => {
        if (!request) return null;

        const requestType = request.requestType || activeModule;

        if (requestType === 'leave' || activeModule === 'leave') {
            return (
                <div className="request-details-content">
                    <div className="request-details-grid">
                        <div className="request-details-item">
                            <span className="request-details-label">
                                <svg className="request-details-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                </svg>
                                Nhân viên
                            </span>
                            <span className="request-details-value">{request.employee_name || request.ho_ten || '-'}</span>
                        </div>
                        <div className="request-details-item">
                            <span className="request-details-label">
                                <svg className="request-details-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                Mã đơn
                            </span>
                            <span className="request-details-value">{request.id || '-'}</span>
                        </div>
                        <div className="request-details-item">
                            <span className="request-details-label">
                                <svg className="request-details-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                Loại nghỉ
                            </span>
                            <span className="request-details-value">{getLeaveTypeLabel(request.leave_type) || '-'}</span>
                        </div>
                        <div className="request-details-item">
                            <span className="request-details-label">
                                <svg className="request-details-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                Ngày bắt đầu
                            </span>
                            <span className="request-details-value">{formatDateDisplay(request.start_date) || '-'}</span>
                        </div>
                        {request.end_date && (
                            <div className="request-details-item">
                                <span className="request-details-label">
                                    <svg className="request-details-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                    Ngày kết thúc
                                </span>
                                <span className="request-details-value">{formatDateDisplay(request.end_date)}</span>
                            </div>
                        )}
                        {request.reason && (
                            <div className="request-details-item request-details-item-full">
                                <span className="request-details-label">
                                    <svg className="request-details-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    Lý do
                                </span>
                                <span className="request-details-value">{request.reason}</span>
                            </div>
                        )}
                        {request.notes && (
                            <div className="request-details-item request-details-item-full">
                                <span className="request-details-label">
                                    <svg className="request-details-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                    Ghi chú
                                </span>
                                <span className="request-details-value">{request.notes}</span>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        if (requestType === 'overtime' || activeModule === 'overtime') {
            return (
                <div className="request-details-content">
                    <div className="request-details-grid">
                        <div className="request-details-item">
                            <span className="request-details-label">
                                <svg className="request-details-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                </svg>
                                Nhân viên
                            </span>
                            <span className="request-details-value">{request.employee_name || request.ho_ten || '-'}</span>
                        </div>
                        <div className="request-details-item">
                            <span className="request-details-label">
                                <svg className="request-details-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                Ngày tăng ca
                            </span>
                            <span className="request-details-value">{formatDateDisplay(request.request_date) || '-'}</span>
                        </div>
                        <div className="request-details-item">
                            <span className="request-details-label">
                                <svg className="request-details-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Giờ bắt đầu
                            </span>
                            <span className="request-details-value">{request.start_time?.slice(0, 5) || '-'}</span>
                        </div>
                        <div className="request-details-item">
                            <span className="request-details-label">
                                <svg className="request-details-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Giờ kết thúc
                            </span>
                            <span className="request-details-value">{request.end_time?.slice(0, 5) || '-'}</span>
                        </div>
                        {request.duration && (
                            <div className="request-details-item">
                                <span className="request-details-label">
                                    <svg className="request-details-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                    </svg>
                                    Thời lượng
                                </span>
                                <span className="request-details-value">{request.duration}</span>
                            </div>
                        )}
                        {request.reason && (
                            <div className="request-details-item request-details-item-full">
                                <span className="request-details-label">
                                    <svg className="request-details-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    Lý do
                                </span>
                                <span className="request-details-value">{request.reason}</span>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        if (requestType === 'attendance' || activeModule === 'attendance') {
            return (
                <div className="request-details-content">
                    <div className="request-details-grid">
                        <div className="request-details-item">
                            <span className="request-details-label">
                                <svg className="request-details-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                </svg>
                                Nhân viên
                            </span>
                            <span className="request-details-value">{request.employee_name || request.ho_ten || '-'}</span>
                        </div>
                        <div className="request-details-item">
                            <span className="request-details-label">
                                <svg className="request-details-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                Ngày bổ sung
                            </span>
                            <span className="request-details-value">{formatDateDisplay(request.adjustment_date || request.request_date) || '-'}</span>
                        </div>
                        {request.check_in_time && (
                            <div className="request-details-item">
                                <span className="request-details-label">
                                    <svg className="request-details-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Giờ vào
                                </span>
                                <span className="request-details-value">{request.check_in_time.slice(0, 5)}</span>
                            </div>
                        )}
                        {request.check_out_time && (
                            <div className="request-details-item">
                                <span className="request-details-label">
                                    <svg className="request-details-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Giờ ra
                                </span>
                                <span className="request-details-value">{request.check_out_time.slice(0, 5)}</span>
                            </div>
                        )}
                        {request.notes && (
                            <div className="request-details-item request-details-item-full">
                                <span className="request-details-label">
                                    <svg className="request-details-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                    Ghi chú
                                </span>
                                <span className="request-details-value">{request.notes}</span>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return null;
    };

    const filteredRequests = useMemo(() => {
        if (selectedStatus === 'ALL') return requests;
        return requests.filter(r => r.status === selectedStatus);
    }, [requests, selectedStatus]);

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
                            </h1>
                            <p className="request-management-subtitle">
                                {MODULE_OPTIONS.find(m => m.key === activeModule)?.description || 'Xem và theo dõi tất cả các đơn từ.'}
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
                        } else if (filter.key === 'CANCELLED') {
                            count = moduleStatusStatistics.cancelled;
                            gradient = 'linear-gradient(135deg, rgba(107, 114, 128, 0.15), rgba(75, 85, 99, 0.25))';
                            icon = (
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                                </svg>
                            );
                        } else if (filter.key === 'ALL') {
                            // Tính tổng tất cả các status
                            count = moduleStatusStatistics.pending +
                                moduleStatusStatistics.approved +
                                moduleStatusStatistics.rejected +
                                moduleStatusStatistics.cancelled;
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
                                {activeModule === 'all' && (
                                    <>
                                        <th>Loại đơn</th>
                                        <th>Thông tin đơn</th>
                                        <th>Ngày/Thời gian</th>
                                        <th>Trạng thái</th>
                                        <th>Hành động</th>
                                    </>
                                )}
                                {activeModule === 'leave' && (
                                    <>
                                        <th>Loại đơn</th>
                                        <th>Thời gian nghỉ</th>
                                        <th>Trạng thái</th>
                                        <th>Hành động</th>
                                    </>
                                )}
                                {activeModule === 'overtime' && (
                                    <>
                                        <th>Ngày tăng ca</th>
                                        <th>Thời gian</th>
                                        <th>Trạng thái</th>
                                        <th>Hành động</th>
                                    </>
                                )}
                                {activeModule === 'attendance' && (
                                    <>
                                        <th>Ngày bổ sung</th>
                                        <th>Thời gian</th>
                                        <th>Trạng thái</th>
                                        <th>Hành động</th>
                                    </>
                                )}
                            </thead>
                            <tbody>
                                {filteredRequests.map((request, index) => (
                                    <tr
                                        key={request.id || index}
                                        className={`request-management-table-row-clickable ${index % 2 === 1 ? 'even-row-bg' : ''}`}
                                        onClick={() => handleViewRequest(request)}
                                        style={{ cursor: 'pointer' }}
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
                                                    {request.status === 'REJECTED' && (
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
                                                    {request.status === 'REJECTED' && (
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
                                                    {request.status === 'REJECTED' && (
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
                                                    {request.status === 'REJECTED' && (
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
                                            </>
                                        )}
                                    </tr>
                                ))}
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
                                    className="request-management-modal-btn-details"
                                    onClick={() => setShowRequestDetails(!showRequestDetails)}
                                >
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    {showRequestDetails ? 'Ẩn chi tiết đơn' : 'Chi tiết đơn'}
                                </button>
                                <button
                                    type="button"
                                    className="request-management-modal-close"
                                    onClick={() => {
                                        setShowDetailModal(false);
                                        setShowRequestDetails(false);
                                    }}
                                >
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        {showRequestDetails && (
                            <div className="request-management-modal-details-section">
                                {renderRequestDetails(selectedRequest)}
                            </div>
                        )}
                        <div className="request-management-modal-body">
                            {/* Request Info */}
                            <div className="request-management-modal-section">
                                <h3 className="request-management-modal-section-title">
                                    <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Thông tin đơn
                                </h3>
                                <div className="request-management-modal-info-grid">
                                    {renderCardHeader(selectedRequest)}
                                </div>
                            </div>

                            {/* Timeline */}
                            {renderDecisionTrace(selectedRequest)}
                        </div>
                        <div className="request-management-modal-footer">
                            <button
                                type="button"
                                className="request-management-modal-btn request-management-modal-btn--cancel"
                                onClick={() => setShowDetailModal(false)}
                            >
                                Đóng
                            </button>
                            {selectedRequest.status === 'REJECTED' && (
                                <button
                                    type="button"
                                    className="request-management-modal-btn request-management-modal-btn--delete"
                                    onClick={() => handleDelete(selectedRequest)}
                                >
                                    Xóa đơn
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestManagement;

