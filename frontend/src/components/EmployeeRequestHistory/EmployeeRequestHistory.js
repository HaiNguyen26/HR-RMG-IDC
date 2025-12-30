import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
    attendanceAdjustmentsAPI,
    leaveRequestsAPI,
    overtimeRequestsAPI,
    lateEarlyRequestsAPI,
    mealAllowanceRequestsAPI,
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
    },
    {
        key: 'late-early',
        label: 'Đơn xin đi trễ về sớm',
        header: 'Lịch sử đơn đi trễ về sớm',
        description: 'Theo dõi tiến độ phê duyệt các đơn xin đi trễ/về sớm của bạn.'
    },
    {
        key: 'meal-allowance',
        label: 'Đơn xin phụ cấp công trình',
        header: 'Lịch sử đơn xin phụ cấp công trình',
        description: 'Theo dõi tiến độ phê duyệt các đơn xin phụ cấp cơm công trình của bạn.'
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
    const [showOvertimeEditModal, setShowOvertimeEditModal] = useState(false);
    const [editingOvertimeRequest, setEditingOvertimeRequest] = useState(null);
    const [additionalHours, setAdditionalHours] = useState('');
    const [editReason, setEditReason] = useState('');
    const [isUpdatingOvertime, setIsUpdatingOvertime] = useState(false);

    // Statistics cho tất cả các status của module hiện tại
    const [moduleStatusStatistics, setModuleStatusStatistics] = useState({
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0
    });

    // Refs để lưu giá trị trước đó, tránh re-render không cần thiết
    const prevRequestsRef = useRef([]);
    const prevModuleStatusStatsRef = useRef(null);

    // Statistics per module - fetch all modules to show badges
    const [moduleStatistics, setModuleStatistics] = useState({
        all: { pending: 0, total: 0 },
        leave: { pending: 0, total: 0 },
        overtime: { pending: 0, total: 0 },
        attendance: { pending: 0, total: 0 }
    });

    // Helper function để so sánh requests (chỉ so sánh id và status)
    const requestsAreEqual = useCallback((oldReqs, newReqs) => {
        if (!oldReqs || !newReqs) return oldReqs === newReqs;
        if (oldReqs.length !== newReqs.length) return false;
        // Create map by id for comparison (order-independent)
        const oldMap = new Map(oldReqs.map(r => [r.id, r.status]));
        const newMap = new Map(newReqs.map(r => [r.id, r.status]));
        // Check if all ids and statuses match
        for (const [id, status] of oldMap) {
            if (newMap.get(id) !== status) return false;
        }
        for (const id of newMap.keys()) {
            if (!oldMap.has(id)) return false;
        }
        return true;
    }, []);

    // Helper function để so sánh objects (shallow comparison)
    const shallowEqual = useCallback((obj1, obj2) => {
        if (obj1 === obj2) return true;
        if (!obj1 || !obj2) return false;
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        if (keys1.length !== keys2.length) return false;
        for (let key of keys1) {
            if (obj1[key] !== obj2[key]) return false;
        }
        return true;
    }, []);

    // Refs cho module statistics
    const prevModuleStatsRef = useRef(null);

    // Function để fetch statistics - có thể gọi từ nhiều nơi
    const fetchModuleStatistics = useCallback(async (silent = false) => {
        if (!currentUser?.id) return;

        if (!silent) setIsRefreshing(true);
        try {
            const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

            // Luôn thêm employeeId để chỉ lấy đơn của nhân viên hiện tại
            const baseParams = { employeeId: currentUser.id };

            const [leaveResponse, overtimeResponse, attendanceResponse, lateEarlyResponse, mealAllowanceResponse] = await Promise.all([
                Promise.all(statuses.map(status => leaveRequestsAPI.getAll({ ...baseParams, status }))),
                Promise.all(statuses.map(status => overtimeRequestsAPI.getAll({ ...baseParams, status }))),
                Promise.all(statuses.map(status => attendanceAdjustmentsAPI.getAll({ ...baseParams, status }))),
                Promise.all(statuses.map(status => lateEarlyRequestsAPI.getAll({ ...baseParams, status }))),
                Promise.all(statuses.map(status => mealAllowanceRequestsAPI.getAll({ ...baseParams, status })))
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

            const lateEarlyStats = {
                pending: lateEarlyResponse[0].data.success ? (lateEarlyResponse[0].data.data || []).length : 0,
                approved: lateEarlyResponse[1].data.success ? (lateEarlyResponse[1].data.data || []).length : 0,
                rejected: lateEarlyResponse[2].data.success ? (lateEarlyResponse[2].data.data || []).length : 0,
                cancelled: lateEarlyResponse[3].data.success ? (lateEarlyResponse[3].data.data || []).length : 0,
                total: 0
            };
            // Không tính CANCELLED vào total
            lateEarlyStats.total = lateEarlyStats.pending + lateEarlyStats.approved + lateEarlyStats.rejected;

            const mealAllowanceStats = {
                pending: mealAllowanceResponse[0].data.success ? (mealAllowanceResponse[0].data.data || []).length : 0,
                approved: mealAllowanceResponse[1].data.success ? (mealAllowanceResponse[1].data.data || []).length : 0,
                rejected: mealAllowanceResponse[2].data.success ? (mealAllowanceResponse[2].data.data || []).length : 0,
                cancelled: mealAllowanceResponse[3].data.success ? (mealAllowanceResponse[3].data.data || []).length : 0,
                total: 0
            };
            // Không tính CANCELLED vào total
            mealAllowanceStats.total = mealAllowanceStats.pending + mealAllowanceStats.approved + mealAllowanceStats.rejected;

            const allStats = {
                pending: leaveStats.pending + overtimeStats.pending + attendanceStats.pending + lateEarlyStats.pending + mealAllowanceStats.pending,
                approved: leaveStats.approved + overtimeStats.approved + attendanceStats.approved + lateEarlyStats.approved + mealAllowanceStats.approved,
                rejected: leaveStats.rejected + overtimeStats.rejected + attendanceStats.rejected + lateEarlyStats.rejected + mealAllowanceStats.rejected,
                cancelled: leaveStats.cancelled + overtimeStats.cancelled + attendanceStats.cancelled + lateEarlyStats.cancelled + mealAllowanceStats.cancelled,
                total: leaveStats.total + overtimeStats.total + attendanceStats.total + lateEarlyStats.total + mealAllowanceStats.total // Đã loại bỏ CANCELLED
            };

            const newModuleStats = {
                all: { pending: allStats.pending, total: allStats.total },
                leave: { pending: leaveStats.pending, total: leaveStats.total },
                overtime: { pending: overtimeStats.pending, total: overtimeStats.total },
                attendance: { pending: attendanceStats.pending, total: attendanceStats.total },
                'late-early': { pending: lateEarlyStats.pending, total: lateEarlyStats.total },
                'meal-allowance': { pending: mealAllowanceStats.pending, total: mealAllowanceStats.total }
            };

            // Chỉ update state nếu data thực sự thay đổi
            if (!prevModuleStatsRef.current ||
                !shallowEqual(prevModuleStatsRef.current.all, newModuleStats.all) ||
                !shallowEqual(prevModuleStatsRef.current.leave, newModuleStats.leave) ||
                !shallowEqual(prevModuleStatsRef.current.overtime, newModuleStats.overtime) ||
                !shallowEqual(prevModuleStatsRef.current.attendance, newModuleStats.attendance) ||
                !shallowEqual(prevModuleStatsRef.current['late-early'], newModuleStats['late-early']) ||
                !shallowEqual(prevModuleStatsRef.current['meal-allowance'], newModuleStats['meal-allowance'])) {
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
            } else if (activeModule === 'late-early') {
                newStatusStats = lateEarlyStats;
            } else if (activeModule === 'meal-allowance') {
                newStatusStats = mealAllowanceStats;
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
    }, [currentUser?.id, activeModule, shallowEqual]);

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
    const fetchRequests = useCallback(async (silent = false) => {
        if (!currentUser?.id) return;

        // Chỉ hiển thị loading khi không phải silent mode (lần đầu hoặc khi filter thay đổi)
        if (!silent) {
            setLoading(true);
        }

        try {
            // Luôn thêm employeeId để chỉ lấy đơn của nhân viên hiện tại
            const params = { employeeId: currentUser.id };
            if (selectedStatus !== 'ALL') {
                params.status = selectedStatus;
            }

            let newRequests = [];

            if (activeModule === 'all') {
                const [leaveResponse, overtimeResponse, attendanceResponse, lateEarlyResponse, mealAllowanceResponse] = await Promise.all([
                    leaveRequestsAPI.getAll(params),
                    overtimeRequestsAPI.getAll(params),
                    attendanceAdjustmentsAPI.getAll(params),
                    lateEarlyRequestsAPI.getAll(params),
                    mealAllowanceRequestsAPI.getAll(params)
                ]);

                newRequests = [
                    ...(leaveResponse.data.success ? (leaveResponse.data.data || []).map(r => ({ ...r, requestType: 'leave' })) : []),
                    ...(overtimeResponse.data.success ? (overtimeResponse.data.data || []).map(r => ({ ...r, requestType: 'overtime' })) : []),
                    ...(attendanceResponse.data.success ? (attendanceResponse.data.data || []).map(r => ({ ...r, requestType: 'attendance' })) : []),
                    ...(lateEarlyResponse.data.success ? (lateEarlyResponse.data.data || []).map(r => ({ ...r, requestType: 'late-early' })) : []),
                    ...(mealAllowanceResponse.data.success ? (mealAllowanceResponse.data.data || []).map(r => ({ ...r, requestType: 'meal-allowance' })) : [])
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
            } else if (activeModule === 'late-early') {
                const response = await lateEarlyRequestsAPI.getAll(params);
                if (response.data.success) {
                    newRequests = (response.data.data || []).map(r => ({ ...r, requestType: 'late-early' }));
                }
            } else if (activeModule === 'meal-allowance') {
                const response = await mealAllowanceRequestsAPI.getAll(params);
                if (response.data.success) {
                    newRequests = (response.data.data || []).map(r => ({ ...r, requestType: 'meal-allowance' }));
                }
            }

            // Chỉ update state nếu data thực sự thay đổi (tránh re-render không cần thiết)
            const prevReqs = prevRequestsRef.current || [];
            if (!requestsAreEqual(prevReqs, newRequests)) {
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
    }, [currentUser?.id, selectedStatus, activeModule, requestsAreEqual, showToast]);

    useEffect(() => {
        fetchRequests(false); // Lần đầu hiển thị loading
        // Realtime update: polling mỗi 5 giây (silent mode - không hiển thị loading, không re-render nếu không có thay đổi)
        const interval = setInterval(() => fetchRequests(true), 5000);
        return () => clearInterval(interval);
    }, [fetchRequests]);

    // Tự động cập nhật selectedRequest khi requests được refresh và modal đang mở
    useEffect(() => {
        if (showDetailModal && selectedRequest && requests.length > 0) {
            const updatedRequest = requests.find(r =>
                r.id === selectedRequest.id &&
                r.requestType === selectedRequest.requestType
            );
            if (updatedRequest && updatedRequest.status !== selectedRequest.status) {
                setSelectedRequest(updatedRequest);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requests, showDetailModal]);

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
            } else if (request.requestType === 'late-early') {
                response = await lateEarlyRequestsAPI.remove(request.id, deleteData);
            } else if (request.requestType === 'meal-allowance') {
                response = await mealAllowanceRequestsAPI.remove(request.id, deleteData);
            }

            if (response?.data?.success) {
                if (showToast) {
                    showToast('Đã xóa đơn thành công', 'success');
                }
                setShowDetailModal(false);
                setSelectedRequest(null);

                // Refresh requests - Luôn thêm employeeId
                await fetchRequests();
                await fetchModuleStatistics(false);
            }
        } catch (error) {
            console.error('Error deleting request:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Lỗi khi xóa đơn';
            if (showToast) {
                showToast(errorMessage, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    // Hàm tính toán giờ kết thúc mới dựa trên số giờ bổ sung
    const calculateNewEndTime = (startTime, endTime, additionalHours) => {
        if (!startTime || !endTime || !additionalHours || parseFloat(additionalHours) <= 0) {
            return endTime;
        }

        try {
            // Parse giờ kết thúc hiện tại
            const [endHour, endMinute] = endTime.split(':').map(Number);

            // Tính tổng phút từ giờ bổ sung
            const additionalMinutes = parseFloat(additionalHours) * 60;

            // Tạo Date object từ ngày hiện tại và giờ kết thúc
            const endDate = new Date();
            endDate.setHours(endHour, endMinute, 0, 0);

            // Cộng thêm số phút
            endDate.setMinutes(endDate.getMinutes() + additionalMinutes);

            // Format lại thành HH:mm
            const newHour = String(endDate.getHours()).padStart(2, '0');
            const newMinute = String(endDate.getMinutes()).padStart(2, '0');

            return `${newHour}:${newMinute}:00`;
        } catch (error) {
            console.error('Error calculating new end time:', error);
            return endTime;
        }
    };

    // Xử lý bổ sung giờ tăng ca
    const handleUpdateOvertime = async () => {
        if (!editingOvertimeRequest || !currentUser?.id) return;

        if (!additionalHours || parseFloat(additionalHours) <= 0) {
            if (showToast) {
                showToast('Vui lòng nhập số giờ bổ sung lớn hơn 0', 'error');
            }
            return;
        }

        setIsUpdatingOvertime(true);
        try {
            // Tính toán giờ kết thúc mới
            const newEndTime = calculateNewEndTime(
                editingOvertimeRequest.start_time,
                editingOvertimeRequest.end_time,
                additionalHours
            );

            const payload = {
                employeeId: currentUser.id,
                additionalHours: parseFloat(additionalHours),
                newEndTime: newEndTime,
                reason: editReason || undefined
            };

            const response = await overtimeRequestsAPI.update(editingOvertimeRequest.id, payload);

            if (response.data?.success) {
                if (showToast) {
                    showToast(response.data.message || 'Đã bổ sung giờ tăng ca thành công. Đơn đã được chuyển về trạng thái chờ duyệt.', 'success');
                }

                // Đóng modal và reset form
                setShowOvertimeEditModal(false);
                setEditingOvertimeRequest(null);
                setAdditionalHours('');
                setEditReason('');

                // Refresh danh sách đơn
                await fetchRequests();
                await fetchModuleStatistics(false);
            } else {
                throw new Error(response.data?.message || 'Không thể cập nhật đơn. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error('Error updating overtime request:', error);
            const message = error.response?.data?.message || error.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
            if (showToast) {
                showToast(message, 'error');
            }
        } finally {
            setIsUpdatingOvertime(false);
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
                                                        request.requestType === 'attendance' ? 'Đơn bổ sung công' :
                                                            request.requestType === 'late-early' ? 'Đơn xin đi trễ về sớm' :
                                                                request.requestType === 'meal-allowance' ? 'Đơn xin phụ cấp cơm công trình' : 'Đơn xin nghỉ'}
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
                                            {request.requestType === 'late-early' && (
                                                <>
                                                    <strong>Đơn xin đi trễ về sớm</strong>
                                                    <p className="request-period">
                                                        {request.request_type === 'LATE' ? 'Đi trễ' : request.request_type === 'EARLY' ? 'Về sớm' : 'N/A'}
                                                    </p>
                                                </>
                                            )}
                                            {request.requestType === 'meal-allowance' && (
                                                <>
                                                    <strong>Đơn xin phụ cấp cơm công trình</strong>
                                                    <p className="request-period">
                                                        {request.items ? `${request.items.length} mục - ${new Intl.NumberFormat('vi-VN').format(request.total_amount || 0)} VNĐ` : 'N/A'}
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
                                            {request.requestType === 'late-early' && (
                                                <>
                                                    {formatDateDisplay(request.request_date)}
                                                    <br />
                                                    <small>
                                                        {request.time_value ? request.time_value.slice(0, 5) : '-'}
                                                    </small>
                                                </>
                                            )}
                                            {request.requestType === 'meal-allowance' && (
                                                <>
                                                    {request.items && request.items.length > 0 ? (
                                                        <>
                                                            {formatDateDisplay(request.items[0].expense_date)}
                                                            {request.items.length > 1 && ` → ${formatDateDisplay(request.items[request.items.length - 1].expense_date)}`}
                                                        </>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${request.status?.toLowerCase() || 'pending'}`}>
                                                {getStatusLabel(request.status)}
                                            </span>
                                        </td>
                                        <td>
                                            {(() => {
                                                const isHr = currentUser?.role && currentUser.role !== 'EMPLOYEE';
                                                const canCancel = request.status === 'PENDING';
                                                const canDelete = isHr && (request.status === 'REJECTED' || request.status === 'CANCELLED');
                                                const showDeleteButton = canCancel || canDelete;

                                                return (
                                                    <>
                                                        {request.status === 'PENDING' && request.requestType !== 'overtime' && (
                                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    className="btn-edit-small"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (showToast) {
                                                                            showToast('Chức năng sửa đơn đang được phát triển', 'info');
                                                                        }
                                                                    }}
                                                                    title="Sửa đơn"
                                                                >
                                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', marginRight: '4px' }}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                                                    </svg>
                                                                    Sửa
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn-delete-small"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDelete(request);
                                                                    }}
                                                                    title="Hủy đơn"
                                                                >
                                                                    Xóa
                                                                </button>
                                                            </div>
                                                        )}
                                                        {request.requestType === 'overtime' && request.status === 'APPROVED' && (
                                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    className="btn-edit-small"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingOvertimeRequest(request);
                                                                        setAdditionalHours('');
                                                                        setEditReason('');
                                                                        setShowOvertimeEditModal(true);
                                                                    }}
                                                                    title="Bổ sung giờ tăng ca"
                                                                >
                                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', marginRight: '4px' }}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                                                    </svg>
                                                                    Bổ sung giờ
                                                                </button>
                                                            </div>
                                                        )}
                                                        {request.requestType === 'overtime' && showDeleteButton && (
                                                            <button
                                                                type="button"
                                                                className="btn-delete-small"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(request);
                                                                }}
                                                                title={canCancel ? "Hủy đơn" : "Xóa đơn"}
                                                            >
                                                                Xóa
                                                            </button>
                                                        )}
                                                        {request.requestType !== 'overtime' && canDelete && (
                                                            <button
                                                                type="button"
                                                                className="btn-delete-small"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(request);
                                                                }}
                                                                title="Xóa đơn"
                                                            >
                                                                Xóa
                                                            </button>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal bổ sung giờ tăng ca */}
            {showOvertimeEditModal && editingOvertimeRequest && (
                <div className="overtime-edit-modal-overlay" onClick={() => {
                    if (!isUpdatingOvertime) {
                        setShowOvertimeEditModal(false);
                        setEditingOvertimeRequest(null);
                        setAdditionalHours('');
                        setEditReason('');
                    }
                }}>
                    <div className="overtime-edit-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="overtime-edit-modal-header">
                            <h2 className="overtime-edit-modal-title">
                                <svg className="overtime-edit-modal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                </svg>
                                Yêu cầu bổ sung giờ tăng ca
                            </h2>
                            <button
                                className="overtime-edit-modal-close"
                                onClick={() => {
                                    if (!isUpdatingOvertime) {
                                        setShowOvertimeEditModal(false);
                                        setEditingOvertimeRequest(null);
                                        setAdditionalHours('');
                                        setEditReason('');
                                    }
                                }}
                                disabled={isUpdatingOvertime}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="overtime-edit-modal-body">
                            <div className="overtime-edit-info-section">
                                <h3 className="overtime-edit-info-title">Thông tin đơn hiện tại</h3>
                                <div className="overtime-edit-info-grid">
                                    <div className="overtime-edit-info-item">
                                        <span className="overtime-edit-info-label">Ngày tăng ca:</span>
                                        <span className="overtime-edit-info-value">
                                            {formatDateDisplay(editingOvertimeRequest.request_date)}
                                        </span>
                                    </div>
                                    <div className="overtime-edit-info-item">
                                        <span className="overtime-edit-info-label">Giờ đã được duyệt:</span>
                                        <span className="overtime-edit-info-value">
                                            {editingOvertimeRequest.duration || 0} giờ
                                        </span>
                                    </div>
                                    <div className="overtime-edit-info-item">
                                        <span className="overtime-edit-info-label">Thời gian hiện tại:</span>
                                        <span className="overtime-edit-info-value">
                                            {editingOvertimeRequest.start_time?.slice(0, 5)} → {editingOvertimeRequest.end_time?.slice(0, 5)}
                                        </span>
                                    </div>
                                    {additionalHours && parseFloat(additionalHours) > 0 && (
                                        <div className="overtime-edit-info-item" style={{ gridColumn: '1 / -1', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                                            <span className="overtime-edit-info-label" style={{ color: '#3b82f6', fontWeight: '700' }}>Thời gian sau bổ sung:</span>
                                            <span className="overtime-edit-info-value" style={{ color: '#3b82f6', fontWeight: '700', fontSize: '1.1rem' }}>
                                                {editingOvertimeRequest.start_time?.slice(0, 5)} → {(() => {
                                                    const newEndTime = calculateNewEndTime(
                                                        editingOvertimeRequest.start_time,
                                                        editingOvertimeRequest.end_time,
                                                        additionalHours
                                                    );
                                                    return newEndTime?.slice(0, 5) || editingOvertimeRequest.end_time?.slice(0, 5);
                                                })()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="overtime-edit-form-section">
                                <div className="overtime-edit-form-group">
                                    <label htmlFor="additionalHours" className="overtime-edit-form-label">
                                        Số giờ bổ sung <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="number"
                                        id="additionalHours"
                                        className="overtime-edit-form-input"
                                        value={additionalHours}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 24)) {
                                                setAdditionalHours(value);
                                            }
                                        }}
                                        placeholder="Nhập số giờ cần bổ sung"
                                        min="0.5"
                                        max="24"
                                        step="0.5"
                                        disabled={isUpdatingOvertime}
                                        required
                                    />
                                    <small className="overtime-edit-form-hint">
                                        Tổng số giờ sau bổ sung: {(parseFloat(editingOvertimeRequest.duration || 0) + parseFloat(additionalHours || 0)).toFixed(1)} giờ
                                    </small>
                                </div>

                                <div className="overtime-edit-form-group">
                                    <label htmlFor="editReason" className="overtime-edit-form-label">
                                        Lý do bổ sung giờ
                                    </label>
                                    <textarea
                                        id="editReason"
                                        className="overtime-edit-form-textarea"
                                        value={editReason}
                                        onChange={(e) => setEditReason(e.target.value)}
                                        placeholder="Nhập lý do cần bổ sung giờ tăng ca..."
                                        rows="4"
                                        disabled={isUpdatingOvertime}
                                    />
                                </div>
                            </div>

                            <div className="overtime-edit-modal-notice">
                                <svg className="overtime-edit-notice-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <span>Đơn tăng ca sẽ được chuyển về trạng thái chờ duyệt sau khi bạn xác nhận bổ sung giờ.</span>
                            </div>
                        </div>

                        <div className="overtime-edit-modal-actions">
                            <button
                                type="button"
                                className="overtime-edit-modal-btn-cancel"
                                onClick={() => {
                                    if (!isUpdatingOvertime) {
                                        setShowOvertimeEditModal(false);
                                        setEditingOvertimeRequest(null);
                                        setAdditionalHours('');
                                        setEditReason('');
                                    }
                                }}
                                disabled={isUpdatingOvertime}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="overtime-edit-modal-btn-submit"
                                onClick={handleUpdateOvertime}
                                disabled={isUpdatingOvertime || !additionalHours || parseFloat(additionalHours) <= 0}
                            >
                                {isUpdatingOvertime ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Đang xử lý...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                        <span>Xác nhận bổ sung giờ</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeRequestHistory;
