import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
    attendanceAdjustmentsAPI,
    leaveRequestsAPI,
    overtimeRequestsAPI,
    lateEarlyRequestsAPI,
    mealAllowanceRequestsAPI,
    travelExpensesAPI,
    customerEntertainmentExpensesAPI,
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

const CUSTOMER_ENTERTAINMENT_STATUS_GROUPS = {
    pending: [
        'PENDING_BRANCH_DIRECTOR',
        'PENDING_CEO',
        'REQUEST_CORRECTION',
        'APPROVED_BRANCH_DIRECTOR',
        'ACCOUNTANT_PROCESSED'
    ],
    approved: ['APPROVED_CEO', 'PAID'],
    rejected: ['REJECTED_BRANCH_DIRECTOR', 'REJECTED_CEO']
};

const MODULE_OPTIONS = [
    {
        key: 'all',
        label: 'Tất cả đơn',
        header: 'Lịch sử đơn từ của tôi',
        description: 'Xem và theo dõi tất cả các đơn từ mà bạn đã gửi: đơn xin phép, đơn tăng ca, đơn bổ sung chấm công, đơn công tác, đơn tiếp khách.'
    },
    {
        key: 'leave-permission',
        label: 'Đơn xin nghỉ phép',
        header: 'Lịch sử đơn xin nghỉ phép',
        description: 'Theo dõi trạng thái và tiến độ phê duyệt các đơn xin nghỉ phép của bạn.'
    },
    {
        key: 'leave-resign',
        label: 'Đơn xin nghỉ việc',
        header: 'Lịch sử đơn xin nghỉ việc',
        description: 'Theo dõi trạng thái và tiến độ phê duyệt các đơn xin nghỉ việc của bạn.'
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
    },
    {
        key: 'customer-entertainment',
        label: 'Đơn tiếp khách',
        header: 'Lịch sử đơn tiếp khách',
        description: 'Theo dõi trạng thái các đơn tiếp khách đã nộp.'
    },
    {
        key: 'travel',
        label: 'Đơn công tác',
        header: 'Lịch sử đơn công tác',
        description: 'Theo dõi tiến độ phê duyệt các đơn công tác phí của bạn.'
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
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [requestToCancel, setRequestToCancel] = useState(null);

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
        'leave-permission': { pending: 0, total: 0 },
        'leave-resign': { pending: 0, total: 0 },
        overtime: { pending: 0, total: 0 },
        attendance: { pending: 0, total: 0 },
        'customer-entertainment': { pending: 0, total: 0 }
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

            const [leaveResponse, overtimeResponse, attendanceResponse, lateEarlyResponse, mealAllowanceResponse, travelResponse, customerEntertainmentResponse] = await Promise.all([
                Promise.all(statuses.map(status => leaveRequestsAPI.getAll({ ...baseParams, status }))),
                Promise.all(statuses.map(status => overtimeRequestsAPI.getAll({ ...baseParams, status }))),
                Promise.all(statuses.map(status => attendanceAdjustmentsAPI.getAll({ ...baseParams, status }))),
                Promise.all(statuses.map(status => lateEarlyRequestsAPI.getAll({ ...baseParams, status }))),
                Promise.all(statuses.map(status => mealAllowanceRequestsAPI.getAll({ ...baseParams, status }))),
                // Travel expense có status khác: PENDING_LEVEL_1, PENDING_LEVEL_2, PENDING_CEO, PENDING_FINANCE, APPROVED, REJECTED
                Promise.all([
                    travelExpensesAPI.getAll({ ...baseParams, status: 'PENDING_LEVEL_1,PENDING_LEVEL_2,PENDING_CEO,PENDING_FINANCE' }),
                    travelExpensesAPI.getAll({ ...baseParams, status: 'APPROVED' }),
                    travelExpensesAPI.getAll({ ...baseParams, status: 'REJECTED' }),
                    travelExpensesAPI.getAll({ ...baseParams, status: 'CANCELLED' })
                ]),
                customerEntertainmentExpensesAPI.getAll(baseParams)
            ]);

            const countLeaveByType = (result, requestType) => {
                const data = result.data?.success ? (result.data.data || []) : [];
                return data.filter(r => r.request_type === requestType).length;
            };

            const leavePermissionStats = {
                pending: countLeaveByType(leaveResponse[0], 'LEAVE'),
                approved: countLeaveByType(leaveResponse[1], 'LEAVE'),
                rejected: countLeaveByType(leaveResponse[2], 'LEAVE'),
                cancelled: countLeaveByType(leaveResponse[3], 'LEAVE'),
                total: 0
            };
            leavePermissionStats.total = leavePermissionStats.pending + leavePermissionStats.approved + leavePermissionStats.rejected;

            const leaveResignStats = {
                pending: countLeaveByType(leaveResponse[0], 'RESIGN'),
                approved: countLeaveByType(leaveResponse[1], 'RESIGN'),
                rejected: countLeaveByType(leaveResponse[2], 'RESIGN'),
                cancelled: countLeaveByType(leaveResponse[3], 'RESIGN'),
                total: 0
            };
            leaveResignStats.total = leaveResignStats.pending + leaveResignStats.approved + leaveResignStats.rejected;

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

            const travelStats = {
                pending: travelResponse[0].data.success ? (travelResponse[0].data.data || []).length : 0,
                approved: travelResponse[1].data.success ? (travelResponse[1].data.data || []).length : 0,
                rejected: travelResponse[2].data.success ? (travelResponse[2].data.data || []).length : 0,
                cancelled: travelResponse[3].data.success ? (travelResponse[3].data.data || []).length : 0,
                total: 0
            };
            // Không tính CANCELLED vào total
            travelStats.total = travelStats.pending + travelStats.approved + travelStats.rejected;

            const customerEntertainmentRequests = customerEntertainmentResponse.data?.success
                ? (customerEntertainmentResponse.data.data || [])
                : [];

            const customerEntertainmentStats = {
                pending: customerEntertainmentRequests.filter((req) => CUSTOMER_ENTERTAINMENT_STATUS_GROUPS.pending.includes(req.status)).length,
                approved: customerEntertainmentRequests.filter((req) => CUSTOMER_ENTERTAINMENT_STATUS_GROUPS.approved.includes(req.status)).length,
                rejected: customerEntertainmentRequests.filter((req) => CUSTOMER_ENTERTAINMENT_STATUS_GROUPS.rejected.includes(req.status)).length,
                cancelled: 0,
                total: 0
            };
            customerEntertainmentStats.total = customerEntertainmentStats.pending + customerEntertainmentStats.approved + customerEntertainmentStats.rejected;

            const allStats = {
                pending: leavePermissionStats.pending + leaveResignStats.pending + overtimeStats.pending + attendanceStats.pending + lateEarlyStats.pending + mealAllowanceStats.pending + travelStats.pending + customerEntertainmentStats.pending,
                approved: leavePermissionStats.approved + leaveResignStats.approved + overtimeStats.approved + attendanceStats.approved + lateEarlyStats.approved + mealAllowanceStats.approved + travelStats.approved + customerEntertainmentStats.approved,
                rejected: leavePermissionStats.rejected + leaveResignStats.rejected + overtimeStats.rejected + attendanceStats.rejected + lateEarlyStats.rejected + mealAllowanceStats.rejected + travelStats.rejected + customerEntertainmentStats.rejected,
                cancelled: leavePermissionStats.cancelled + leaveResignStats.cancelled + overtimeStats.cancelled + attendanceStats.cancelled + lateEarlyStats.cancelled + mealAllowanceStats.cancelled + travelStats.cancelled + customerEntertainmentStats.cancelled,
                total: leavePermissionStats.total + leaveResignStats.total + overtimeStats.total + attendanceStats.total + lateEarlyStats.total + mealAllowanceStats.total + travelStats.total + customerEntertainmentStats.total // Đã loại bỏ CANCELLED
            };

            const newModuleStats = {
                all: { pending: allStats.pending, total: allStats.total },
                'leave-permission': { pending: leavePermissionStats.pending, total: leavePermissionStats.total },
                'leave-resign': { pending: leaveResignStats.pending, total: leaveResignStats.total },
                overtime: { pending: overtimeStats.pending, total: overtimeStats.total },
                attendance: { pending: attendanceStats.pending, total: attendanceStats.total },
                'late-early': { pending: lateEarlyStats.pending, total: lateEarlyStats.total },
                'meal-allowance': { pending: mealAllowanceStats.pending, total: mealAllowanceStats.total },
                travel: { pending: travelStats.pending, total: travelStats.total },
                'customer-entertainment': { pending: customerEntertainmentStats.pending, total: customerEntertainmentStats.total }
            };

            // Chỉ update state nếu data thực sự thay đổi
            if (!prevModuleStatsRef.current ||
                !shallowEqual(prevModuleStatsRef.current.all, newModuleStats.all) ||
                !shallowEqual(prevModuleStatsRef.current['leave-permission'], newModuleStats['leave-permission']) ||
                !shallowEqual(prevModuleStatsRef.current['leave-resign'], newModuleStats['leave-resign']) ||
                !shallowEqual(prevModuleStatsRef.current.overtime, newModuleStats.overtime) ||
                !shallowEqual(prevModuleStatsRef.current.attendance, newModuleStats.attendance) ||
                !shallowEqual(prevModuleStatsRef.current['late-early'], newModuleStats['late-early']) ||
                !shallowEqual(prevModuleStatsRef.current['meal-allowance'], newModuleStats['meal-allowance']) ||
                !shallowEqual(prevModuleStatsRef.current.travel, newModuleStats.travel) ||
                !shallowEqual(prevModuleStatsRef.current['customer-entertainment'], newModuleStats['customer-entertainment'])) {
                setModuleStatistics(newModuleStats);
                prevModuleStatsRef.current = newModuleStats;
            }

            // Set module status statistics based on active module
            let newStatusStats;
            if (activeModule === 'all') {
                newStatusStats = allStats;
            } else if (activeModule === 'leave-permission') {
                newStatusStats = leavePermissionStats;
            } else if (activeModule === 'leave-resign') {
                newStatusStats = leaveResignStats;
            } else if (activeModule === 'overtime') {
                newStatusStats = overtimeStats;
            } else if (activeModule === 'attendance') {
                newStatusStats = attendanceStats;
            } else if (activeModule === 'late-early') {
                newStatusStats = lateEarlyStats;
            } else if (activeModule === 'meal-allowance') {
                newStatusStats = mealAllowanceStats;
            } else if (activeModule === 'travel') {
                newStatusStats = travelStats;
            } else if (activeModule === 'customer-entertainment') {
                newStatusStats = customerEntertainmentStats;
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
            const baseParams = { employeeId: currentUser.id };
            const params = selectedStatus !== 'ALL' ? { ...baseParams, status: selectedStatus } : baseParams;

            let newRequests = [];

            if (activeModule === 'all') {
                const [leaveResponse, overtimeResponse, attendanceResponse, lateEarlyResponse, mealAllowanceResponse, travelResponse, customerEntertainmentResponse] = await Promise.all([
                    leaveRequestsAPI.getAll(params),
                    overtimeRequestsAPI.getAll(params),
                    attendanceAdjustmentsAPI.getAll(params),
                    lateEarlyRequestsAPI.getAll(params),
                    mealAllowanceRequestsAPI.getAll(params),
                    travelExpensesAPI.getAll(params),
                    customerEntertainmentExpensesAPI.getAll(baseParams)
                ]);

                const customerEntertainmentRequests = customerEntertainmentResponse.data.success
                    ? (customerEntertainmentResponse.data.data || []).map(r => ({ ...r, requestType: 'customer-entertainment' }))
                    : [];

                const filteredCustomerEntertainment = filterCustomerEntertainmentByStatus(customerEntertainmentRequests, selectedStatus);

                newRequests = [
                    ...(leaveResponse.data.success ? (leaveResponse.data.data || []).map(r => ({ ...r, requestType: 'leave' })) : []),
                    ...(overtimeResponse.data.success ? (overtimeResponse.data.data || []).map(r => ({ ...r, requestType: 'overtime' })) : []),
                    ...(attendanceResponse.data.success ? (attendanceResponse.data.data || []).map(r => ({ ...r, requestType: 'attendance' })) : []),
                    ...(lateEarlyResponse.data.success ? (lateEarlyResponse.data.data || []).map(r => ({ ...r, requestType: 'late-early' })) : []),
                    ...(mealAllowanceResponse.data.success ? (mealAllowanceResponse.data.data || []).map(r => ({ ...r, requestType: 'meal-allowance' })) : []),
                    ...(travelResponse.data.success ? (travelResponse.data.data || []).map(r => ({ ...r, requestType: 'travel' })) : []),
                    ...filteredCustomerEntertainment
                ];

                // Sắp xếp theo thời gian tạo mới nhất
                newRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } else if (activeModule === 'leave-permission' || activeModule === 'leave-resign') {
                const response = await leaveRequestsAPI.getAll(params);
                if (response.data.success) {
                    const requestTypeFilter = activeModule === 'leave-permission' ? 'LEAVE' : 'RESIGN';
                    newRequests = (response.data.data || [])
                        .filter(r => r.request_type === requestTypeFilter)
                        .map(r => ({ ...r, requestType: 'leave' }));
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
            } else if (activeModule === 'travel') {
                const response = await travelExpensesAPI.getAll(params);
                if (response.data && response.data.success) {
                    newRequests = (response.data.data || []).map(r => {
                        console.log('[EmployeeRequestHistory] Travel request mapped:', { id: r.id, requestType: 'travel' });
                        return { ...r, requestType: 'travel' };
                    });
                }
            } else if (activeModule === 'customer-entertainment') {
                const response = await customerEntertainmentExpensesAPI.getAll(baseParams);
                if (response.data?.success) {
                    const mappedRequests = (response.data.data || []).map(r => ({ ...r, requestType: 'customer-entertainment' }));
                    newRequests = filterCustomerEntertainmentByStatus(mappedRequests, selectedStatus);
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

    const getStatusLabel = (status, requestType = null) => {
        // Xử lý travel expense status riêng
        if (requestType === 'travel') {
            return getTravelExpenseStatusLabel(status);
        }
        if (requestType === 'customer-entertainment') {
            return getCustomerEntertainmentStatusLabel(status);
        }
        return STATUS_LABELS[status] || status;
    };

    const getTravelExpenseStatusLabel = (status) => {
        const statusMap = {
            'PENDING_LEVEL_1': 'Chờ quản lý trực tiếp duyệt',
            'PENDING_LEVEL_2': 'Chờ giám đốc chi nhánh duyệt',
            'PENDING_CEO': 'Chờ Tổng giám đốc duyệt',
            'PENDING_FINANCE': 'Chờ phòng tài chính xử lý',
            'APPROVED': 'Đã duyệt',
            'REJECTED': 'Đã từ chối',
            'CANCELLED': 'Đã hủy'
        };
        return statusMap[status] || status;
    };

    const getCustomerEntertainmentStatusLabel = (status) => {
        const statusMap = {
            'PENDING_BRANCH_DIRECTOR': 'Chờ giám đốc chi nhánh duyệt',
            'APPROVED_BRANCH_DIRECTOR': 'Đã duyệt (Cấp 1)',
            'REJECTED_BRANCH_DIRECTOR': 'Giám đốc chi nhánh từ chối',
            'REQUEST_CORRECTION': 'Yêu cầu bổ sung',
            'ACCOUNTANT_PROCESSED': 'Kế toán đã xử lý',
            'PENDING_CEO': 'Chờ Tổng giám đốc duyệt',
            'APPROVED_CEO': 'Tổng giám đốc đã duyệt',
            'REJECTED_CEO': 'Tổng giám đốc từ chối',
            'PAID': 'Đã thanh toán'
        };
        return statusMap[status] || status;
    };

    const filterCustomerEntertainmentByStatus = (requests, statusKey) => {
        if (statusKey === 'ALL') return requests;
        if (statusKey === 'PENDING') {
            return requests.filter((req) => CUSTOMER_ENTERTAINMENT_STATUS_GROUPS.pending.includes(req.status));
        }
        if (statusKey === 'APPROVED') {
            return requests.filter((req) => CUSTOMER_ENTERTAINMENT_STATUS_GROUPS.approved.includes(req.status));
        }
        if (statusKey === 'REJECTED') {
            return requests.filter((req) => CUSTOMER_ENTERTAINMENT_STATUS_GROUPS.rejected.includes(req.status));
        }
        return requests;
    };

    const getTravelExpenseProgress = (request) => {
        // Kiểm tra xem có phải công tác nước ngoài không
        const isInternational = (request.location_type || request.locationType) === 'INTERNATIONAL';
        const requiresCEO = request.requires_ceo !== false; // Mặc định true nếu không có field

        const normalizeName = (name) => {
            return (name || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/Đ/g, 'D')
                .trim();
        };

        const isManagerHoangDinhSach = normalizeName(
            request.employee_manager_name ||
            request.employeeManagerName ||
            request.manager_name ||
            request.managerName
        ) === 'hoang dinh sach';

        // Xây dựng steps theo loại công tác và quy tắc đặc biệt
        const steps = [
            { key: 'PENDING_LEVEL_1', label: 'Quản lý trực tiếp', status: request.status },
        ];

        if (!isManagerHoangDinhSach) {
            steps.push({ key: 'PENDING_LEVEL_2', label: 'Giám đốc chi nhánh', status: request.status });
        }

        if (isInternational && requiresCEO) {
            steps.push({ key: 'PENDING_CEO', label: 'Tổng giám đốc', status: request.status });
        }

        steps.push(
            { key: 'PENDING_FINANCE', label: 'Phòng tài chính', status: request.status },
            { key: 'APPROVED', label: 'Hoàn tất', status: request.status }
        );

        const stepIndexByKey = steps.reduce((acc, step, idx) => {
            acc[step.key] = idx;
            return acc;
        }, {});

        let currentStepIndex = -1;
        if (request.status === 'PENDING_LEVEL_1') {
            currentStepIndex = stepIndexByKey.PENDING_LEVEL_1 ?? -1;
        } else if (request.status === 'PENDING_LEVEL_2') {
            currentStepIndex = stepIndexByKey.PENDING_LEVEL_2 ?? stepIndexByKey.PENDING_FINANCE ?? -1;
        } else if (request.status === 'PENDING_CEO') {
            currentStepIndex = stepIndexByKey.PENDING_CEO ?? stepIndexByKey.PENDING_FINANCE ?? -1;
        } else if (request.status === 'PENDING_FINANCE') {
            currentStepIndex = stepIndexByKey.PENDING_FINANCE ?? -1;
        } else if (request.status === 'APPROVED') {
            currentStepIndex = stepIndexByKey.APPROVED ?? -1;
        } else if (request.status === 'REJECTED') {
            currentStepIndex = -1; // Bị từ chối
        }

        // Kiểm tra các bước đã hoàn thành (dựa vào decisions)
        const completedSteps = [];

        if (request.manager_decision === 'APPROVE' || request.decisions?.manager?.decision === 'APPROVE') {
            if (stepIndexByKey.PENDING_LEVEL_1 !== undefined) {
                completedSteps.push(stepIndexByKey.PENDING_LEVEL_1);
            }
        }

        if (request.branch_director_decision === 'APPROVE' || request.decisions?.branchDirector?.decision === 'APPROVE') {
            if (stepIndexByKey.PENDING_LEVEL_2 !== undefined) {
                completedSteps.push(stepIndexByKey.PENDING_LEVEL_2);
            }
        }

        if (stepIndexByKey.PENDING_CEO !== undefined) {
            if (request.ceo_decision === 'APPROVE' || request.decisions?.ceo?.decision === 'APPROVE') {
                completedSteps.push(stepIndexByKey.PENDING_CEO);
            }
        }

        if (request.finance_decision === 'APPROVE' || request.decisions?.finance?.decision === 'APPROVE') {
            if (stepIndexByKey.PENDING_FINANCE !== undefined) {
                completedSteps.push(stepIndexByKey.PENDING_FINANCE);
            }
        }

        return { steps, currentStepIndex, completedSteps };
    };

    const getRequestTypeLabel = (requestType) => {
        return REQUEST_TYPE_LABELS[requestType] || requestType;
    };

    const getLeaveTypeLabel = (leaveType) => {
        return LEAVE_TYPE_LABELS[leaveType] || leaveType;
    };

    const handleViewRequest = async (request) => {
        console.log('[EmployeeRequestHistory] handleViewRequest called:', request);
        // Nếu là travel expense, fetch full details từ API
        if (request.requestType === 'travel') {
            try {
                // Set selectedRequest ngay để modal có thể hiển thị
                setSelectedRequest(request);
                setShowDetailModal(true);
                
                // Fetch full details sau đó
                const response = await travelExpensesAPI.getById(request.id);
                if (response.data && response.data.success) {
                    const fullDetails = response.data.data;
                    setSelectedRequest({ ...request, ...fullDetails });
                    console.log('[EmployeeRequestHistory] Full details loaded:', fullDetails);
                }
            } catch (error) {
                console.error('Error fetching travel expense details:', error);
                // Giữ nguyên request hiện tại nếu có lỗi
            }
        } else if (request.requestType === 'customer-entertainment') {
            try {
                setSelectedRequest(request);
                setShowDetailModal(true);

                const response = await customerEntertainmentExpensesAPI.getById(request.id);
                if (response.data?.success) {
                    const fullDetails = response.data.data;
                    setSelectedRequest({ ...request, ...fullDetails });
                }
            } catch (error) {
                console.error('Error fetching customer entertainment details:', error);
            }
        } else {
            setSelectedRequest(request);
            setShowDetailModal(true);
        }
    };

    const apiBaseUrl = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/hr/api' : 'http://localhost:3000/api');

    const buildFileUrl = (url) => {
        if (!url) return '#';
        if (/^https?:\/\//i.test(url)) return url;
        if (url.startsWith('/api/')) {
            return `${apiBaseUrl.replace(/\/api$/, '')}${url}`;
        }
        if (url.startsWith('/uploads/')) {
            return `${apiBaseUrl}${url}`;
        }
        return `${apiBaseUrl}/${url.replace(/^\/+/, '')}`;
    };

    const handleDelete = async (request, skipModal = false) => {
        // Nếu đơn đã APPROVED và chưa có lý do hủy, hiển thị modal nhập lý do hủy
        if (request.status === 'APPROVED' && !skipModal && !cancelReason) {
            if (!showConfirm) return;
            setRequestToCancel(request);
            setCancelReason('');
            setShowCancelModal(true);
            return;
        }

        // Nếu đang hủy đơn APPROVED từ modal (đã có cancelReason), bỏ qua showConfirm
        // Nếu là đơn PENDING hoặc REJECTED, cần showConfirm
        if (!skipModal && request.status !== 'APPROVED') {
            if (!showConfirm) return;
            const confirmed = await showConfirm({
                title: 'Xác nhận xóa đơn',
                message: `Bạn có chắc chắn muốn xóa đơn này không?`,
                confirmText: 'Xóa',
                cancelText: 'Hủy',
                type: 'warning'
            });

            if (!confirmed) return;
        }

        try {
            setLoading(true);
            let response;
            const deleteData = {
                employeeId: currentUser.id,
                role: currentUser.role
            };

            // Thêm cancellationReason nếu đơn đã APPROVED
            if (request.status === 'APPROVED' && cancelReason) {
                deleteData.cancellationReason = cancelReason.trim();
            }

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
            } else if (request.requestType === 'travel') {
                // Travel expense cần API riêng để hủy
                if (request.status === 'APPROVED' && cancelReason) {
                    response = await travelExpensesAPI.cancel(request.id, { 
                        cancellationReason: cancelReason.trim(),
                        employeeId: currentUser.id
                    });
                } else {
                    // PENDING travel expense có thể xóa qua API khác nếu có
                    if (showToast) {
                        showToast('Chức năng hủy đơn công tác đang được phát triển', 'info');
                    }
                    return;
                }
            }

            if (response?.data?.success) {
                if (showToast) {
                    showToast(request.status === 'APPROVED' ? 'Đã hủy đơn thành công' : 'Đã xóa đơn thành công', 'success');
                }
                setShowDetailModal(false);
                setSelectedRequest(null);
                setShowCancelModal(false);
                setRequestToCancel(null);
                setCancelReason('');

                // Refresh requests - Luôn thêm employeeId
                await fetchRequests();
                await fetchModuleStatistics(false);
            } else {
                // Nếu response không thành công, đóng modal và hiển thị lỗi
                setShowCancelModal(false);
                setRequestToCancel(null);
                setCancelReason('');
                if (showToast) {
                    showToast(response?.data?.message || 'Không thể hủy đơn. Vui lòng thử lại.', 'error');
                }
            }
        } catch (error) {
            console.error('Error deleting request:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Lỗi khi xóa đơn';
            if (showToast) {
                showToast(errorMessage, 'error');
            }
            // Đóng modal ngay cả khi có lỗi (nếu đang mở modal hủy đơn)
            if (showCancelModal) {
                setShowCancelModal(false);
                setRequestToCancel(null);
                setCancelReason('');
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
                                        onClick={() => {
                                            if (request.requestType === 'travel' || request.requestType === 'customer-entertainment') {
                                                handleViewRequest(request);
                                            }
                                        }}
                                        style={request.requestType === 'travel' || request.requestType === 'customer-entertainment' ? { cursor: 'pointer' } : {}}
                                    >
                                        <td>
                                            <span className={`request-type-badge ${request.requestType || 'leave'}`}>
                                                {request.requestType === 'leave'
                                                    ? (request.request_type === 'RESIGN' ? 'Đơn xin nghỉ việc' : 'Đơn xin nghỉ phép')
                                                    :
                                                    request.requestType === 'overtime' ? 'Đơn tăng ca' :
                                                        request.requestType === 'attendance' ? 'Đơn bổ sung công' :
                                                            request.requestType === 'late-early' ? 'Đơn xin đi trễ về sớm' :
                                                                request.requestType === 'meal-allowance' ? 'Đơn xin phụ cấp cơm công trình' :
                                                                    request.requestType === 'customer-entertainment' ? 'Đơn tiếp khách' :
                                                                        request.requestType === 'travel' ? 'Đơn công tác' : 'Đơn xin nghỉ'}
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
                                            {request.requestType === 'customer-entertainment' && (
                                                <>
                                                    <strong>Đơn tiếp khách</strong>
                                                    <p className="request-period">
                                                        {request.request_number || request.requestNumber || `TK-${request.id}`}
                                                    </p>
                                                    <p className="request-period">
                                                        {request.expenseItems
                                                            ? `${request.expenseItems.length} mục - ${new Intl.NumberFormat('vi-VN').format(request.total_amount || request.totalAmount || 0)} VNĐ`
                                                            : 'N/A'}
                                                    </p>
                                                </>
                                            )}
                                            {request.requestType === 'travel' && (
                                                <>
                                                    <strong>Đơn công tác</strong>
                                                    <p className="request-period">
                                                        {request.location || request.destination || 'N/A'} - 
                                                        {(request.location_type || request.locationType) === 'INTERNATIONAL' ? ' Nước ngoài' : ' Trong nước'}
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
                                            {request.requestType === 'customer-entertainment' && (
                                                <>
                                                    {formatDateDisplay(request.start_date || request.startDate)}
                                                    {(request.end_date || request.endDate) && ` → ${formatDateDisplay(request.end_date || request.endDate)}`}
                                                </>
                                            )}
                                            {request.requestType === 'travel' && (
                                                <>
                                                    {request.start_time ? formatDateDisplay(request.start_time, true) : formatDateDisplay(request.start_date)}
                                                    {request.end_time && ` → ${formatDateDisplay(request.end_time, true)}`}
                                                    {request.end_date && !request.end_time && ` → ${formatDateDisplay(request.end_date)}`}
                                                </>
                                            )}
                                        </td>
                                        <td>
                                            {request.requestType === 'travel' ? (
                                                <div className="travel-expense-status-container">
                                                    <span className={`status-badge ${request.status?.toLowerCase() || 'pending'}`}>
                                                        {getStatusLabel(request.status, 'travel')}
                                                    </span>
                                                    {request.status && request.status.startsWith('PENDING') && (
                                                        <div className="travel-expense-progress">
                                                            {(() => {
                                                                const progress = getTravelExpenseProgress(request);
                                                                return progress.steps.slice(0, progress.currentStepIndex + 1).map((step, idx) => (
                                                                    <span key={step.key} className={`progress-step ${progress.completedSteps.includes(idx) ? 'completed' : idx === progress.currentStepIndex ? 'current' : ''}`}>
                                                                        {step.label}
                                                                    </span>
                                                                )).filter(Boolean);
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className={`status-badge ${request.status?.toLowerCase() || 'pending'}`}>
                                                    {getStatusLabel(request.status, request.requestType)}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {(() => {
                                                const isHr = currentUser?.role && currentUser.role !== 'EMPLOYEE';
                                                const canCancel = request.status === 'PENDING' || request.status === 'APPROVED';
                                                const canDelete = isHr && (request.status === 'REJECTED' || request.status === 'CANCELLED');
                                                const showDeleteButton = canCancel || canDelete;

                                                return (
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                        {request.status === 'PENDING' && request.requestType !== 'overtime' && (
                                                            <>
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
                                                            </>
                                                        )}
                                                        {request.status === 'APPROVED' && request.requestType !== 'overtime' && (
                                                            <button
                                                                type="button"
                                                                className="btn-delete-small"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(request);
                                                                }}
                                                                title="Hủy đơn đã duyệt"
                                                                style={{ backgroundColor: '#f59e0b', color: '#ffffff' }}
                                                            >
                                                                Hủy đơn
                                                            </button>
                                                        )}
                                                        {request.requestType === 'overtime' && request.status === 'APPROVED' && (
                                                            <>
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
                                                                {showDeleteButton && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn-delete-small"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDelete(request);
                                                                        }}
                                                                        title={canCancel ? "Hủy đơn" : "Xóa đơn"}
                                                                        style={canCancel ? { backgroundColor: '#f59e0b', color: '#ffffff' } : {}}
                                                                    >
                                                                        {canCancel ? 'Hủy đơn' : 'Xóa'}
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                        {request.requestType === 'overtime' && request.status === 'PENDING' && showDeleteButton && (
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
                                                        {request.requestType === 'travel' && (
                                                            <button
                                                                type="button"
                                                                className="btn-edit-small"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleViewRequest(request);
                                                                }}
                                                                title="Xem chi tiết"
                                                            >
                                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', marginRight: '4px' }}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                                                </svg>
                                                                Xem chi tiết
                                                            </button>
                                                        )}
                                                        {request.requestType === 'customer-entertainment' && (
                                                            <button
                                                                type="button"
                                                                className="btn-edit-small"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleViewRequest(request);
                                                                }}
                                                                title="Xem chi tiết"
                                                            >
                                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', marginRight: '4px' }}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                                                </svg>
                                                                Xem chi tiết
                                                            </button>
                                                        )}
                                                    </div>
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

            {/* Detail Modal for Travel Expense */}
            {showDetailModal && selectedRequest && selectedRequest.requestType === 'travel' && (
                <div className="employee-request-history-modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="employee-request-history-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="employee-request-history-modal-header">
                            <h2>Chi Tiết Đơn Công Tác - {selectedRequest.code || `CTX-${selectedRequest.id}`}</h2>
                            <button
                                className="employee-request-history-modal-close"
                                onClick={() => setShowDetailModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="employee-request-history-modal-body">
                            <div className="travel-expense-detail-section">
                                <h3>Thông Tin Chung</h3>
                                <div className="travel-expense-detail-grid">
                                    <div className="travel-expense-detail-item">
                                        <span className="detail-label">Mã đơn:</span>
                                        <span className="detail-value">{selectedRequest.code || `CTX-${selectedRequest.id}`}</span>
                                    </div>
                                    <div className="travel-expense-detail-item">
                                        <span className="detail-label">Nhân viên:</span>
                                        <span className="detail-value">{selectedRequest.employee_name || selectedRequest.employeeName || 'N/A'}</span>
                                    </div>
                                    <div className="travel-expense-detail-item">
                                        <span className="detail-label">Chi nhánh:</span>
                                        <span className="detail-value">{selectedRequest.employee_branch || selectedRequest.employeeBranch || 'N/A'}</span>
                                    </div>
                                    <div className="travel-expense-detail-item">
                                        <span className="detail-label">Địa điểm:</span>
                                        <span className="detail-value">{selectedRequest.location || selectedRequest.destination || 'N/A'}</span>
                                    </div>
                                    <div className="travel-expense-detail-item">
                                        <span className="detail-label">Phạm vi:</span>
                                        <span className="detail-value">
                                            {(selectedRequest.location_type || selectedRequest.locationType) === 'INTERNATIONAL' ? 'Nước ngoài' : 'Trong nước'}
                                        </span>
                                    </div>
                                    <div className="travel-expense-detail-item">
                                        <span className="detail-label">Mục đích:</span>
                                        <span className="detail-value">{selectedRequest.purpose || 'N/A'}</span>
                                    </div>
                                    <div className="travel-expense-detail-item">
                                        <span className="detail-label">Thời gian bắt đầu:</span>
                                        <span className="detail-value">
                                            {(() => {
                                                const startTime = selectedRequest.start_time || selectedRequest.startTime;
                                                const startDate = selectedRequest.start_date || selectedRequest.startDate;
                                                if (startTime) {
                                                    try {
                                                        const date = new Date(startTime);
                                                        if (!isNaN(date.getTime())) {
                                                            return formatDateDisplay(startTime, true);
                                                        }
                                                    } catch (e) {
                                                        console.error('Error parsing start_time:', e);
                                                    }
                                                }
                                                if (startDate) {
                                                    return formatDateDisplay(startDate, true);
                                                }
                                                return 'N/A';
                                            })()}
                                        </span>
                                    </div>
                                    <div className="travel-expense-detail-item">
                                        <span className="detail-label">Thời gian kết thúc:</span>
                                        <span className="detail-value">
                                            {(() => {
                                                const endTime = selectedRequest.end_time || selectedRequest.endTime;
                                                const endDate = selectedRequest.end_date || selectedRequest.endDate;
                                                if (endTime) {
                                                    try {
                                                        const date = new Date(endTime);
                                                        if (!isNaN(date.getTime())) {
                                                            return formatDateDisplay(endTime, true);
                                                        }
                                                    } catch (e) {
                                                        console.error('Error parsing end_time:', e);
                                                    }
                                                }
                                                if (endDate) {
                                                    return formatDateDisplay(endDate, true);
                                                }
                                                return 'N/A';
                                            })()}
                                        </span>
                                    </div>
                                    <div className="travel-expense-detail-item">
                                        <span className="detail-label">Trạng thái:</span>
                                        <span className={`status-badge ${selectedRequest.status?.toLowerCase() || 'pending'}`}>
                                            {getStatusLabel(selectedRequest.status, 'travel')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="travel-expense-detail-section">
                                <h3>Tiến Độ Duyệt</h3>
                                <div className="travel-expense-timeline">
                                    {(() => {
                                        const progress = getTravelExpenseProgress(selectedRequest);
                                        return progress.steps.map((step, idx) => {
                                            const isCompleted = progress.completedSteps.includes(idx);
                                            const isCurrent = idx === progress.currentStepIndex;
                                            const isPending = !isCompleted && !isCurrent;
                                            const isLast = idx === progress.steps.length - 1;
                                            
                                            return (
                                                <div key={step.key} className={`timeline-item ${isCompleted ? 'completed' : isCurrent ? 'current' : isPending ? 'pending' : ''}`}>
                                                    <div className="timeline-marker">
                                                        {isCompleted ? (
                                                            <svg className="timeline-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                            </svg>
                                                        ) : isCurrent ? (
                                                            <div className="timeline-dot-pulse"></div>
                                                        ) : (
                                                            <div className="timeline-dot"></div>
                                                        )}
                                                    </div>
                                                    {!isLast && <div className={`timeline-line ${isCompleted ? 'completed' : ''}`}></div>}
                                                    <div className="timeline-content">
                                                        <div className="timeline-label">{step.label}</div>
                                                        <div className="timeline-status-badge-container">
                                                            {isCurrent && (
                                                                <div className="timeline-status-badge current">Đang xử lý</div>
                                                            )}
                                                            {isCompleted && (
                                                                <div className="timeline-status-badge completed">Đã hoàn thành</div>
                                                            )}
                                                            {isPending && (
                                                                <div className="timeline-status-badge pending">Chờ xử lý</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>

                            {selectedRequest.created_at && (
                                <div className="travel-expense-detail-section">
                                    <div className="travel-expense-detail-item">
                                        <span className="detail-label">Ngày tạo:</span>
                                        <span className="detail-value">{formatDateDisplay(selectedRequest.created_at, true)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="employee-request-history-modal-footer">
                            <button
                                type="button"
                                className="employee-request-history-modal-btn-close"
                                onClick={() => setShowDetailModal(false)}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal for Customer Entertainment */}
            {showDetailModal && selectedRequest && selectedRequest.requestType === 'customer-entertainment' && (
                <div className="employee-request-history-modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="employee-request-history-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="employee-request-history-modal-header">
                            <h2>
                                Chi Tiết Đơn Tiếp Khách - {selectedRequest.request_number || selectedRequest.requestNumber || `TK-${selectedRequest.id}`}
                            </h2>
                            <button
                                className="employee-request-history-modal-close"
                                onClick={() => setShowDetailModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="employee-request-history-modal-body">
                            <div className="travel-expense-detail-section">
                                <h3>Thông Tin Chung</h3>
                                <div className="travel-expense-detail-grid">
                                    <div className="travel-expense-detail-item">
                                        <span className="detail-label">Người yêu cầu:</span>
                                        <span className="detail-value">
                                            {selectedRequest.requester_name || selectedRequest.requesterName || 'N/A'}
                                            {selectedRequest.requester_department || selectedRequest.requesterDepartment
                                                ? ` (${selectedRequest.requester_department || selectedRequest.requesterDepartment})`
                                                : ''}
                                        </span>
                                    </div>
                                    <div className="travel-expense-detail-item">
                                        <span className="detail-label">Chi nhánh:</span>
                                        <span className="detail-value">{selectedRequest.branch || 'N/A'}</span>
                                    </div>
                                    <div className="travel-expense-detail-item">
                                        <span className="detail-label">Thời gian:</span>
                                        <span className="detail-value">
                                            {formatDateDisplay(selectedRequest.start_date || selectedRequest.startDate)}
                                            {(selectedRequest.end_date || selectedRequest.endDate) && ` → ${formatDateDisplay(selectedRequest.end_date || selectedRequest.endDate)}`}
                                        </span>
                                    </div>
                                    <div className="travel-expense-detail-item">
                                        <span className="detail-label">Tạm ứng:</span>
                                        <span className="detail-value">
                                            {new Intl.NumberFormat('vi-VN').format(selectedRequest.advance_amount || selectedRequest.advanceAmount || 0)} VNĐ
                                        </span>
                                    </div>
                                    <div className="travel-expense-detail-item">
                                        <span className="detail-label">Tổng chi:</span>
                                        <span className="detail-value">
                                            {new Intl.NumberFormat('vi-VN').format(selectedRequest.total_amount || selectedRequest.totalAmount || 0)} VNĐ
                                        </span>
                                    </div>
                                    <div className="travel-expense-detail-item">
                                        <span className="detail-label">Trạng thái:</span>
                                        <span className={`status-badge ${selectedRequest.status?.toLowerCase() || 'pending'}`}>
                                            {getStatusLabel(selectedRequest.status, 'customer-entertainment')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="travel-expense-detail-section">
                                <h3>Danh sách khoản chi</h3>
                                {selectedRequest.expenseItems && selectedRequest.expenseItems.length > 0 ? (
                                    <div className="travel-expense-detail-grid">
                                        {selectedRequest.expenseItems.map((item, idx) => (
                                            <div key={`${item.id || idx}`} className="travel-expense-detail-item" style={{ gridColumn: '1 / -1' }}>
                                                <span className="detail-label">
                                                    {item.invoice_number || item.invoiceNumber ? `Hóa đơn: ${item.invoice_number || item.invoiceNumber}` : `Mục ${idx + 1}`}
                                                </span>
                                                <span className="detail-value">
                                                    {item.company_name || item.companyName || 'N/A'} • {item.content || 'N/A'} •{' '}
                                                    {new Intl.NumberFormat('vi-VN').format(item.amount || 0)} VNĐ
                                                </span>
                                                {item.files && item.files.length > 0 && (
                                                    <div className="detail-value" style={{ marginTop: '6px' }}>
                                                        {item.files.map((file) => (
                                                            <a
                                                                key={file.id || file.name}
                                                                href={buildFileUrl(file.url)}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                style={{ marginRight: '10px', display: 'inline-block' }}
                                                            >
                                                                {file.name}
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="travel-expense-detail-item">
                                        <span className="detail-value">Không có dữ liệu khoản chi.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="employee-request-history-modal-footer">
                            <button
                                type="button"
                                className="employee-request-history-modal-btn-close"
                                onClick={() => setShowDetailModal(false)}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal hủy đơn đã APPROVED */}
            {showCancelModal && requestToCancel && (
                <div className="cancel-request-modal-overlay" onClick={() => {
                    setShowCancelModal(false);
                    setRequestToCancel(null);
                    setCancelReason('');
                }}>
                    <div className="cancel-request-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="cancel-request-modal-header">
                            <div className="cancel-request-modal-header-content">
                                <div className="cancel-request-modal-icon-wrapper">
                                    <svg className="cancel-request-modal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="cancel-request-modal-title">Hủy đơn đã được duyệt</h2>
                                    <p className="cancel-request-modal-subtitle">Vui lòng cung cấp lý do hủy đơn</p>
                                </div>
                            </div>
                            <button 
                                className="cancel-request-modal-close" 
                                onClick={() => {
                                    setShowCancelModal(false);
                                    setRequestToCancel(null);
                                    setCancelReason('');
                                }}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div className="cancel-request-modal-body">
                            <div className="cancel-request-info-box">
                                <div className="cancel-request-info-icon">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                </div>
                                <div className="cancel-request-info-content">
                                    <p className="cancel-request-info-label">Đơn đang hủy:</p>
                                    <p className="cancel-request-info-value">{requestToCancel.code || `#${requestToCancel.id}`}</p>
                                </div>
                            </div>
                            <div className="cancel-request-form-group">
                                <label className="cancel-request-label">
                                    Lý do hủy đơn
                                    <span className="cancel-request-required">*</span>
                                </label>
                                <textarea
                                    className="cancel-request-textarea"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="Vui lòng nhập lý do hủy đơn một cách chi tiết..."
                                    rows={5}
                                    maxLength={500}
                                    required
                                />
                                <div className="cancel-request-char-count">
                                    {cancelReason.length} / 500 ký tự
                                </div>
                            </div>
                        </div>
                        <div className="cancel-request-modal-footer">
                            <button
                                type="button"
                                className="cancel-request-btn-secondary"
                                onClick={() => {
                                    setShowCancelModal(false);
                                    setRequestToCancel(null);
                                    setCancelReason('');
                                }}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                className="cancel-request-btn-primary"
                                onClick={async () => {
                                    if (!cancelReason.trim()) {
                                        if (showToast) {
                                            showToast('Vui lòng nhập lý do hủy đơn', 'error');
                                        }
                                        return;
                                    }
                                    if (cancelReason.trim().length < 10) {
                                        if (showToast) {
                                            showToast('Lý do hủy đơn phải có ít nhất 10 ký tự', 'error');
                                        }
                                        return;
                                    }
                                    await handleDelete(requestToCancel, true);
                                }}
                                disabled={!cancelReason.trim() || cancelReason.trim().length < 10 || loading}
                            >
                                {loading ? (
                                    <>
                                        <svg className="cancel-request-btn-spinner" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                        Xác nhận hủy đơn
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal hủy đơn đã APPROVED */}
            {showCancelModal && requestToCancel && (
                <div className="cancel-request-modal-overlay" onClick={() => {
                    setShowCancelModal(false);
                    setRequestToCancel(null);
                    setCancelReason('');
                }}>
                    <div className="cancel-request-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="cancel-request-modal-header">
                            <div className="cancel-request-modal-header-content">
                                <div className="cancel-request-modal-icon-wrapper">
                                    <svg className="cancel-request-modal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="cancel-request-modal-title">Hủy đơn đã được duyệt</h2>
                                    <p className="cancel-request-modal-subtitle">Vui lòng cung cấp lý do hủy đơn</p>
                                </div>
                            </div>
                            <button 
                                className="cancel-request-modal-close" 
                                onClick={() => {
                                    setShowCancelModal(false);
                                    setRequestToCancel(null);
                                    setCancelReason('');
                                }}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div className="cancel-request-modal-body">
                            <div className="cancel-request-info-box">
                                <div className="cancel-request-info-icon">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                </div>
                                <div className="cancel-request-info-content">
                                    <p className="cancel-request-info-label">Đơn đang hủy:</p>
                                    <p className="cancel-request-info-value">{requestToCancel.code || `#${requestToCancel.id}`}</p>
                                </div>
                            </div>
                            <div className="cancel-request-form-group">
                                <label className="cancel-request-label">
                                    Lý do hủy đơn
                                    <span className="cancel-request-required">*</span>
                                </label>
                                <textarea
                                    className="cancel-request-textarea"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="Vui lòng nhập lý do hủy đơn một cách chi tiết..."
                                    rows={5}
                                    maxLength={500}
                                    required
                                />
                                <div className="cancel-request-char-count">
                                    {cancelReason.length} / 500 ký tự
                                </div>
                            </div>
                        </div>
                        <div className="cancel-request-modal-footer">
                            <button
                                type="button"
                                className="cancel-request-btn-secondary"
                                onClick={() => {
                                    setShowCancelModal(false);
                                    setRequestToCancel(null);
                                    setCancelReason('');
                                }}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                className="cancel-request-btn-primary"
                                onClick={async () => {
                                    if (!cancelReason.trim()) {
                                        if (showToast) {
                                            showToast('Vui lòng nhập lý do hủy đơn', 'error');
                                        }
                                        return;
                                    }
                                    if (cancelReason.trim().length < 10) {
                                        if (showToast) {
                                            showToast('Lý do hủy đơn phải có ít nhất 10 ký tự', 'error');
                                        }
                                        return;
                                    }
                                    await handleDelete(requestToCancel, true);
                                }}
                                disabled={!cancelReason.trim() || cancelReason.trim().length < 10 || loading}
                            >
                                {loading ? (
                                    <>
                                        <svg className="cancel-request-btn-spinner" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                        Xác nhận hủy đơn
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
