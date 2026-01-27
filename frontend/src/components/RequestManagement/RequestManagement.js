import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import DatePicker from 'react-datepicker';
import {
    attendanceAdjustmentsAPI,
    leaveRequestsAPI,
    overtimeRequestsAPI,
    lateEarlyRequestsAPI,
    mealAllowanceRequestsAPI,
} from '../../services/api';
import { formatDateToISO } from '../../utils/dateUtils';
import { DATE_PICKER_LOCALE } from '../../utils/datepickerLocale';
import usePageVisibility from '../../utils/usePageVisibility';
import 'react-datepicker/dist/react-datepicker.css';
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

const getLeaveModuleKey = (request) => {
    const rawType = request?.request_type || request?.requestType || '';
    return rawType.toString().trim().toUpperCase() === 'RESIGN' ? 'resign' : 'leave';
};

const isLeaveModuleKey = (key) => key === 'leave' || key === 'resign';

const countLeaveType = (items, type) => items.filter((item) => {
    const rawType = item?.request_type || item?.requestType || '';
    return rawType.toString().trim().toUpperCase() === type;
}).length;

// Module options - Chỉ cho HR/ADMIN (xem toàn bộ đơn trong hệ thống)
const MODULE_OPTIONS = [
    {
        key: 'all',
        label: 'Tất cả đơn',
        header: 'Quản lý đơn từ',
        description: 'Xem và theo dõi tất cả các đơn xin nghỉ phép, đơn xin nghỉ việc, đơn tăng ca, đơn bổ sung chấm công trong hệ thống.'
    },
    {
        key: 'leave',
        label: 'Đơn xin nghỉ phép',
        header: 'Quản lý đơn nghỉ phép',
        description: 'Theo dõi trạng thái và tiến độ phê duyệt đơn xin nghỉ phép.'
    },
    {
        key: 'resign',
        label: 'Đơn xin nghỉ việc',
        header: 'Quản lý đơn nghỉ việc',
        description: 'Theo dõi trạng thái và tiến độ phê duyệt đơn xin nghỉ việc.'
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
    },
    {
        key: 'late-early',
        label: 'Đơn xin đi trễ về sớm',
        header: 'Quản lý đơn đi trễ về sớm',
        description: 'Theo dõi tiến độ phê duyệt đơn xin đi trễ/về sớm.'
    },
    {
        key: 'meal-allowance',
        label: 'Đơn xin phụ cấp công trình',
        header: 'Quản lý đơn xin phụ cấp công trình',
        description: 'Theo dõi tiến độ phê duyệt đơn xin phụ cấp cơm công trình.'
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
    const [exportFilterStartDate, setExportFilterStartDate] = useState(null);
    const [exportFilterEndDate, setExportFilterEndDate] = useState(null);
    const isPageVisible = usePageVisibility();

    const STATS_POLL_INTERVAL_MS = 20000;
    const REQUESTS_POLL_INTERVAL_MS = 20000;

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
        resign: { pending: 0, total: 0 },
        overtime: { pending: 0, total: 0 },
        attendance: { pending: 0, total: 0 },
        'late-early': { pending: 0, total: 0 },
        'meal-allowance': { pending: 0, total: 0 }
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

            const [leaveResponse, overtimeResponse, attendanceResponse, lateEarlyResponse, mealAllowanceResponse] = await Promise.all([
                Promise.all(statuses.map(status => leaveRequestsAPI.getAll({ ...baseParams, status }))),
                Promise.all(statuses.map(status => overtimeRequestsAPI.getAll({ ...baseParams, status }))),
                Promise.all(statuses.map(status => attendanceAdjustmentsAPI.getAll({ ...baseParams, status }))),
                Promise.all(statuses.map(status => lateEarlyRequestsAPI.getAll({ ...baseParams, status }))),
                Promise.all(statuses.map(status => mealAllowanceRequestsAPI.getAll({ ...baseParams, status })))
            ]);

            const leavePendingList = leaveResponse[0].data.success ? (leaveResponse[0].data.data || []) : [];
            const leaveApprovedList = leaveResponse[1].data.success ? (leaveResponse[1].data.data || []) : [];
            const leaveRejectedList = leaveResponse[2].data.success ? (leaveResponse[2].data.data || []) : [];
            const leaveCancelledList = leaveResponse[3].data.success ? (leaveResponse[3].data.data || []) : [];

            const leaveStats = {
                pending: countLeaveType(leavePendingList, 'LEAVE'),
                approved: countLeaveType(leaveApprovedList, 'LEAVE'),
                rejected: countLeaveType(leaveRejectedList, 'LEAVE'),
                cancelled: countLeaveType(leaveCancelledList, 'LEAVE'),
                total: 0
            };
            leaveStats.total = leaveStats.pending + leaveStats.approved + leaveStats.rejected;

            const resignStats = {
                pending: countLeaveType(leavePendingList, 'RESIGN'),
                approved: countLeaveType(leaveApprovedList, 'RESIGN'),
                rejected: countLeaveType(leaveRejectedList, 'RESIGN'),
                cancelled: countLeaveType(leaveCancelledList, 'RESIGN'),
                total: 0
            };
            resignStats.total = resignStats.pending + resignStats.approved + resignStats.rejected;

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
                pending: leaveStats.pending + resignStats.pending + overtimeStats.pending + attendanceStats.pending + lateEarlyStats.pending + mealAllowanceStats.pending,
                approved: leaveStats.approved + resignStats.approved + overtimeStats.approved + attendanceStats.approved + lateEarlyStats.approved + mealAllowanceStats.approved,
                rejected: leaveStats.rejected + resignStats.rejected + overtimeStats.rejected + attendanceStats.rejected + lateEarlyStats.rejected + mealAllowanceStats.rejected,
                cancelled: leaveStats.cancelled + resignStats.cancelled + overtimeStats.cancelled + attendanceStats.cancelled + lateEarlyStats.cancelled + mealAllowanceStats.cancelled,
                total: leaveStats.total + resignStats.total + overtimeStats.total + attendanceStats.total + lateEarlyStats.total + mealAllowanceStats.total
            };

            const newModuleStats = {
                all: { pending: allStats.pending, total: allStats.total },
                leave: { pending: leaveStats.pending, total: leaveStats.total },
                resign: { pending: resignStats.pending, total: resignStats.total },
                overtime: { pending: overtimeStats.pending, total: overtimeStats.total },
                attendance: { pending: attendanceStats.pending, total: attendanceStats.total },
                'late-early': { pending: lateEarlyStats.pending, total: lateEarlyStats.total },
                'meal-allowance': { pending: mealAllowanceStats.pending, total: mealAllowanceStats.total }
            };

            // Chỉ update state nếu data thực sự thay đổi
            if (!prevModuleStatsRef.current || !shallowEqual(prevModuleStatsRef.current.all, newModuleStats.all) ||
                !shallowEqual(prevModuleStatsRef.current.leave, newModuleStats.leave) ||
                !shallowEqual(prevModuleStatsRef.current.resign, newModuleStats.resign) ||
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
            } else if (activeModule === 'resign') {
                newStatusStats = resignStats;
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
    }, [currentUser?.id, activeModule]);

    // Fetch statistics với realtime update
    useEffect(() => {
        fetchModuleStatistics(false); // Lần đầu hiển thị loading
        // Realtime update: polling mỗi 20s (silent mode - không hiển thị loading)
        const interval = setInterval(() => {
            if (!isPageVisible) return;
            fetchModuleStatistics(true);
        }, STATS_POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchModuleStatistics, isPageVisible]);

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
                const [leaveResponse, overtimeResponse, attendanceResponse, lateEarlyResponse, mealAllowanceResponse] = await Promise.all([
                    leaveRequestsAPI.getAll(params),
                    overtimeRequestsAPI.getAll(params),
                    attendanceAdjustmentsAPI.getAll(params),
                    lateEarlyRequestsAPI.getAll(params),
                    mealAllowanceRequestsAPI.getAll(params)
                ]);

                newRequests = [
                    ...(leaveResponse.data.success ? (leaveResponse.data.data || []).map(r => ({ ...r, requestType: getLeaveModuleKey(r) })) : []),
                    ...(overtimeResponse.data.success ? (overtimeResponse.data.data || []).map(r => ({ ...r, requestType: 'overtime' })) : []),
                    ...(attendanceResponse.data.success ? (attendanceResponse.data.data || []).map(r => ({ ...r, requestType: 'attendance' })) : []),
                    ...(lateEarlyResponse.data.success ? (lateEarlyResponse.data.data || []).map(r => ({ ...r, requestType: 'late-early' })) : []),
                    ...(mealAllowanceResponse.data.success ? (mealAllowanceResponse.data.data || []).map(r => ({ ...r, requestType: 'meal-allowance' })) : [])
                ];

                // Sắp xếp theo thời gian tạo mới nhất
                newRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } else if (isLeaveModuleKey(activeModule)) {
                const response = await leaveRequestsAPI.getAll(params);
                if (response.data.success) {
                    newRequests = (response.data.data || [])
                        .filter((r) => getLeaveModuleKey(r) === activeModule)
                        .map((r) => ({ ...r, requestType: activeModule }));
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
        // Realtime update: polling mỗi 20s (silent mode - không hiển thị loading)
        const interval = setInterval(() => {
            if (!isPageVisible) return;
            fetchRequests(true);
        }, REQUESTS_POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchRequests, isPageVisible]);

    const handleDelete = async (request) => {
        if (!showConfirm) {
            if (!window.confirm('Bạn có chắc chắn muốn xóa đơn này? Hành động này không thể hoàn tác.')) {
                return;
            }
        } else {
            const confirmed = await showConfirm({
                title: 'Xác nhận xóa đơn',
                message: 'Bạn có chắc chắn muốn xóa đơn này? Hành động này không thể hoàn tác.',
                confirmText: 'Xóa',
                cancelText: 'Hủy',
                type: 'warning'
            });

            if (!confirmed) {
                return;
            }
        }

        try {
            setLoading(true);
            let api;
            
            // Xác định API dựa trên requestType
            const requestType = request.requestType || activeModule;
            if (isLeaveModuleKey(requestType)) {
                api = leaveRequestsAPI;
            } else if (requestType === 'overtime') {
                api = overtimeRequestsAPI;
            } else if (requestType === 'attendance') {
                api = attendanceAdjustmentsAPI;
            } else if (requestType === 'late-early') {
                api = lateEarlyRequestsAPI;
            } else if (requestType === 'meal-allowance') {
                api = mealAllowanceRequestsAPI;
            } else {
                throw new Error(`Không xác định được loại đơn: ${requestType}`);
            }

            // Kiểm tra API có tồn tại và có method remove không
            if (!api || typeof api.remove !== 'function') {
                throw new Error(`API không hợp lệ cho loại đơn này. Request type: ${requestType}`);
            }

            await api.remove(request.id, {
                employeeId: currentUser.id,
                role: currentUser.role
            });

            if (showToast) {
                // Ưu tiên dùng requestType từ request, nếu không có thì dùng activeModule (nhưng bỏ qua 'all')
                let moduleLabel = 'đơn';
                if (requestType && requestType !== 'all') {
                    const module = MODULE_OPTIONS.find(m => m.key === requestType);
                    moduleLabel = module?.label || 'đơn';
                } else if (activeModule && activeModule !== 'all') {
                    const module = MODULE_OPTIONS.find(m => m.key === activeModule);
                    moduleLabel = module?.label || 'đơn';
                }
                showToast(`Đã xóa ${moduleLabel} thành công`, 'success');
            }

            // Refresh danh sách
            await fetchRequests(false);
            await fetchModuleStatistics(false);
        } catch (error) {
            console.error('Error deleting request:', error);
            if (showToast) {
                const message =
                    error.response?.data?.message || 'Không thể xóa đơn. Vui lòng thử lại.';
                showToast(message, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const getStatusLabel = (status) => {
        return STATUS_LABELS[status] || status;
    };

    const getRequestTypeLabel = (requestType) => {
        return REQUEST_TYPE_LABELS[requestType] || requestType;
    };

    const getLeaveTypeLabel = (leaveType) => {
        return LEAVE_TYPE_LABELS[leaveType] || leaveType;
    };

    const handleViewRequest = useCallback(async (request) => {
        setSelectedRequest(request);
        setShowDetailModal(true);
        
        // Fetch full request details để có đầy đủ thông tin (đặc biệt cho meal-allowance với items)
        if ((request.requestType === 'meal-allowance' || activeModule === 'meal-allowance') && request.id) {
            try {
                const detailResponse = await mealAllowanceRequestsAPI.getById(request.id);
                if (detailResponse.data && detailResponse.data.success) {
                    // Đảm bảo requestType được giữ lại từ request ban đầu
                    setSelectedRequest({
                        ...detailResponse.data.data,
                        requestType: request.requestType || 'meal-allowance'
                    });
                }
            } catch (error) {
                console.error('Error fetching request details:', error);
                // Giữ nguyên request hiện tại nếu fetch lỗi
            }
        }
    }, [activeModule]);

    // Export approved requests to Excel
    const handleExportRequests = async () => {
        try {
            setLoading(true);

            // Lấy dữ liệu đã được duyệt (APPROVED)
            let approvedRequests = requests.filter(req => req.status === 'APPROVED');

            // Filter theo loại đơn (activeModule)
            if (activeModule !== 'all') {
                approvedRequests = approvedRequests.filter(req => {
                    if (activeModule === 'leave-permission') {
                        return isLeaveModuleKey(req.requestType) && req.request_type === 'LEAVE';
                    } else if (activeModule === 'leave-resign') {
                        return isLeaveModuleKey(req.requestType) && req.request_type === 'RESIGN';
                    } else if (activeModule === 'overtime') {
                        return req.requestType === 'overtime';
                    } else if (activeModule === 'attendance') {
                        return req.requestType === 'attendance';
                    } else if (activeModule === 'late-early') {
                        return req.requestType === 'late-early';
                    } else if (activeModule === 'meal-allowance') {
                        return req.requestType === 'meal-allowance';
                    }
                    return true;
                });
            }

            // Filter theo khoảng ngày phát sinh đơn nếu có
            if (exportFilterStartDate || exportFilterEndDate) {
                let startDate = null;
                let endDate = null;

                if (exportFilterStartDate) {
                    startDate = new Date(exportFilterStartDate);
                    startDate.setHours(0, 0, 0, 0);
                }

                if (exportFilterEndDate) {
                    endDate = new Date(exportFilterEndDate);
                    endDate.setHours(23, 59, 59, 999);
                }

                const getOccurrenceDate = (req) => {
                    const normalizeDate = (value) => {
                        if (!value) return null;
                        const date = new Date(value);
                        if (isNaN(date.getTime())) return null;
                        date.setHours(0, 0, 0, 0);
                        return date;
                    };

                    if (isLeaveModuleKey(req.requestType)) {
                        return normalizeDate(req.start_date);
                    }
                    if (req.requestType === 'overtime') {
                        return normalizeDate(req.request_date || req.start_date);
                    }
                    if (req.requestType === 'attendance') {
                        return normalizeDate(req.adjustment_date || req.request_date);
                    }
                    if (req.requestType === 'late-early') {
                        return normalizeDate(req.request_date);
                    }
                    if (req.requestType === 'meal-allowance') {
                        const firstItemDate = Array.isArray(req.items) && req.items.length > 0
                            ? req.items[0].expense_date
                            : null;
                        return normalizeDate(firstItemDate);
                    }
                    return normalizeDate(req.created_at);
                };

                approvedRequests = approvedRequests.filter(req => {
                    const occurrenceDate = getOccurrenceDate(req);
                    if (!occurrenceDate) return false;

                    if (startDate && endDate) {
                        return occurrenceDate >= startDate && occurrenceDate <= endDate;
                    } else if (startDate) {
                        return occurrenceDate >= startDate;
                    } else if (endDate) {
                        return occurrenceDate <= endDate;
                    }
                    return true;
                });
            }

            if (approvedRequests.length === 0) {
                if (showToast) showToast('Không có đơn nào đã được duyệt trong khoảng thời gian đã chọn', 'warning');
                setLoading(false);
                return;
            }

            // Định nghĩa headers động theo loại đơn
            const formatDate = (dateString) => {
                if (!dateString) return '';
                try {
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) return '';
                    return date.toLocaleDateString('vi-VN');
                } catch {
                    return '';
                }
            };

            const formatDateTime = (dateString) => {
                if (!dateString) return '';
                try {
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) return '';
                    return date.toLocaleString('vi-VN');
                } catch {
                    return '';
                }
            };

            // Chuẩn hóa dữ liệu theo từng loại đơn
            const data = approvedRequests.map((req) => {
                const baseData = {
                    'Mã đơn': req.id || '',
                    'Nhân viên': req.employee_name || req.employee?.ho_ten || '',
                    'Phòng ban': req.employee_department || req.employee?.phong_ban || '',
                    'Chi nhánh': req.employee_branch || req.employee?.chi_nhanh || '',
                };

                // Xử lý theo loại đơn
                if (isLeaveModuleKey(req.requestType)) {
                    // Tính số ngày nghỉ
                    let totalDays = '';
                    if (req.request_type === 'LEAVE' && req.start_date && req.end_date) {
                        const start = new Date(req.start_date);
                        const end = new Date(req.end_date);
                        const diffTime = Math.abs(end - start);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        totalDays = `${diffDays} ngày`;
                    }

                    return {
                        ...baseData,
                        'Loại đơn': req.request_type === 'LEAVE' ? 'Xin nghỉ phép' : 'Xin nghỉ việc',
                        'Ngày bắt đầu': formatDate(req.start_date),
                        'Ngày kết thúc': req.request_type === 'LEAVE' ? formatDate(req.end_date) : '',
                        'Tổng số ngày': totalDays,
                        'Lý do': req.reason || '',
                        'Ghi chú': req.notes || '',
                        'Trạng thái': 'Đã duyệt',
                        'Ngày tạo': formatDateTime(req.created_at),
                        'Ngày duyệt': formatDateTime(req.team_lead_action_at || req.updated_at)
                    };
                } else if (req.requestType === 'overtime') {
                    return {
                        ...baseData,
                        'Loại đơn': 'Đơn tăng ca',
                        'Ngày tăng ca': formatDate(req.request_date || req.start_date),
                        'Giờ bắt đầu': req.start_time || '',
                        'Giờ kết thúc': req.end_time || '',
                        'Thời lượng (giờ)': req.duration || '',
                        'Nội dung công việc': req.reason || '',
                        'Ghi chú': req.notes || '',
                        'Trạng thái': 'Đã duyệt',
                        'Ngày tạo': formatDateTime(req.created_at),
                        'Ngày duyệt': formatDateTime(req.team_lead_action_at || req.updated_at)
                    };
                } else if (req.requestType === 'attendance') {
                    return {
                        ...baseData,
                        'Loại đơn': 'Đơn bổ sung công',
                        'Ngày bổ sung': formatDate(req.adjustment_date || req.request_date),
                        'Loại bổ sung': req.check_type === 'CHECK_IN' ? 'Giờ vào' : req.check_type === 'CHECK_OUT' ? 'Giờ ra' : 'Cả hai',
                        'Giờ vào': req.check_in_time || '',
                        'Giờ ra': req.check_out_time || '',
                        'Lý do': req.reason || '',
                        'Ghi chú': req.notes || '',
                        'Trạng thái': 'Đã duyệt',
                        'Ngày tạo': formatDateTime(req.created_at),
                        'Ngày duyệt': formatDateTime(req.team_lead_action_at || req.updated_at)
                    };
                } else if (req.requestType === 'late-early') {
                    return {
                        ...baseData,
                        'Loại đơn': req.request_type === 'LATE' ? 'Đơn xin đi trễ' : 'Đơn xin về sớm',
                        'Ngày': formatDate(req.request_date),
                        'Thời gian': req.time_value || '',
                        'Lý do': req.reason || '',
                        'Ghi chú': req.notes || '',
                        'Trạng thái': 'Đã duyệt',
                        'Ngày tạo': formatDateTime(req.created_at),
                        'Ngày duyệt': formatDateTime(req.team_lead_action_at || req.updated_at)
                    };
                } else if (req.requestType === 'meal-allowance') {
                    const items = req.items || [];
                    const firstDate = items[0]?.expense_date;
                    const lastDate = items[items.length - 1]?.expense_date;
                    const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

                    return {
                        ...baseData,
                        'Loại đơn': 'Đơn xin phụ cấp cơm công trình',
                        'Từ ngày': formatDate(firstDate),
                        'Đến ngày': formatDate(lastDate),
                        'Số mục chi tiết': items.length,
                        'Tổng tiền (VNĐ)': totalAmount.toLocaleString('vi-VN'),
                        'Ghi chú': req.notes || '',
                        'Trạng thái': 'Đã duyệt',
                        'Ngày tạo': formatDateTime(req.created_at),
                        'Ngày duyệt': formatDateTime(req.team_lead_action_at || req.updated_at)
                    };
                }

                // Fallback cho các loại đơn khác
                return {
                    ...baseData,
                    'Loại đơn': 'Không xác định',
                    'Ngày': formatDate(req.created_at),
                    'Lý do': req.reason || req.notes || '',
                    'Trạng thái': 'Đã duyệt',
                    'Ngày tạo': formatDateTime(req.created_at),
                    'Ngày duyệt': formatDateTime(req.updated_at)
                };
            });

            // Tạo worksheet (không cần headers vì json_to_sheet tự động lấy từ object keys)
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'DonTuDaDuyet');

            // Auto width cho tất cả cột
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            const colWidths = [];
            for (let C = range.s.c; C <= range.e.c; ++C) {
                colWidths[C] = { wch: 20 };
            }
            worksheet['!cols'] = colWidths;

            // Tạo tên file
            let fileName = 'don_tu_da_duyet';
            if (activeModule !== 'all') {
                const moduleName = activeModule === 'leave-permission'
                    ? 'don_nghi_phep'
                    : activeModule === 'leave-resign'
                        ? 'don_nghi_viec'
                        : activeModule === 'overtime'
                            ? 'don_tang_ca'
                            : activeModule === 'late-early'
                                ? 'don_di_tre_ve_som'
                                : activeModule === 'meal-allowance'
                                    ? 'don_phu_cap_com'
                                    : activeModule === 'attendance'
                                        ? 'don_bo_sung_cong'
                                        : 'don_tu';
                fileName = `${moduleName}_da_duyet`;
            }
            if (exportFilterStartDate && exportFilterEndDate) {
                const startStr = formatDateToISO(exportFilterStartDate).replace(/-/g, '');
                const endStr = formatDateToISO(exportFilterEndDate).replace(/-/g, '');
                fileName += `_${startStr}_${endStr}`;
            } else if (exportFilterStartDate) {
                const startStr = formatDateToISO(exportFilterStartDate).replace(/-/g, '');
                fileName += `_tu_${startStr}`;
            } else if (exportFilterEndDate) {
                const endStr = formatDateToISO(exportFilterEndDate).replace(/-/g, '');
                fileName += `_den_${endStr}`;
            }
            fileName += '.xlsx';

            XLSX.writeFile(workbook, fileName);
            if (showToast) showToast(`Đã xuất ${approvedRequests.length} đơn đã duyệt ra file Excel`, 'success');
        } catch (err) {
            console.error('Export Excel error:', err);
            if (showToast) showToast('Lỗi khi xuất Excel', 'error');
        } finally {
            setLoading(false);
        }
    };

    const renderRequestDetails = (request) => {
        if (!request) return null;

        // Khi activeModule === 'all', sử dụng request.requestType thay vì activeModule
        const requestType = activeModule === 'all' ? (request.requestType || 'unknown') : (request.requestType || activeModule);

        if (isLeaveModuleKey(requestType) || isLeaveModuleKey(activeModule)) {
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
                            {/* Lần tăng ca thứ nhất */}
                            <div className="request-management-modal-info-item" style={{ gridColumn: '1 / -1', borderBottom: request.child_request_id ? '1px solid #e5e7eb' : 'none', paddingBottom: request.child_request_id ? '1rem' : '0', marginBottom: request.child_request_id ? '1rem' : '0' }}>
                                <span className="info-label" style={{ fontWeight: '600', fontSize: '0.9375rem', color: '#1f2937' }}>
                                    Lần tăng ca thứ nhất
                                </span>
                            </div>
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
                            {request.reason && (
                                <div className="request-management-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="info-label">Lý do</span>
                                    <span className="info-value">{request.reason}</span>
                                </div>
                            )}

                            {/* Lần tăng ca thứ hai (nếu có) */}
                            {request.child_request_id && (
                                <>
                                    <div className="request-management-modal-info-item" style={{ gridColumn: '1 / -1', borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginTop: '1rem' }}>
                                        <span className="info-label" style={{ fontWeight: '600', fontSize: '0.9375rem', color: '#1f2937' }}>
                                            Lần tăng ca thứ hai
                                        </span>
                                    </div>
                                    <div className="request-management-modal-info-item">
                                        <span className="info-label">
                                            <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                            Ngày tăng ca
                                        </span>
                                        <span className="info-value">{formatDateDisplay(request.child_start_date || request.request_date) || '-'}</span>
                                    </div>
                                    <div className="request-management-modal-info-item">
                                        <span className="info-label">
                                            <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            Giờ bắt đầu
                                        </span>
                                        <span className="info-value">{request.child_start_time?.slice(0, 5) || '-'}</span>
                                    </div>
                                    <div className="request-management-modal-info-item">
                                        <span className="info-label">
                                            <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            Giờ kết thúc
                                        </span>
                                        <span className="info-value">{request.child_end_time?.slice(0, 5) || '-'}</span>
                                    </div>
                                    {request.child_duration && (
                                        <div className="request-management-modal-info-item">
                                            <span className="info-label">
                                                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                                </svg>
                                                Thời lượng
                                            </span>
                                            <span className="info-value info-value-highlight">{request.child_duration}</span>
                                        </div>
                                    )}
                                    {request.child_reason && (
                                        <div className="request-management-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                            <span className="info-label">Lý do</span>
                                            <span className="info-value">{request.child_reason}</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Nội dung công việc và Nhận xét - Chỉ hiển thị nếu không có child request (vì đã hiển thị trong chi tiết) */}
                    {!request.child_request_id && (request.reason || request.manager_comment || request.team_lead_comment) && (
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
                    {/* Nhận xét của quản lý (nếu có child request) */}
                    {request.child_request_id && (request.manager_comment || request.team_lead_comment) && (
                        <div className="request-management-modal-section">
                            <h3 className="request-management-modal-section-title">
                                <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                Nhận xét của quản lý
                            </h3>
                            <div className="request-management-manager-comment-text">
                                {request.manager_comment || request.team_lead_comment}
                            </div>
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

        if (requestType === 'late-early' || activeModule === 'late-early') {
            const formatTimeDisplay = (timeValue) => {
                if (!timeValue) return '-';
                if (typeof timeValue === 'string' && timeValue.includes(':')) {
                    const [hours, minutes] = timeValue.split(':');
                    return `${hours}:${minutes}`;
                }
                return timeValue;
            };

            const getRequestTypeLabel = (requestType) => {
                if (requestType === 'LATE') return 'Đi trễ';
                if (requestType === 'EARLY') return 'Về sớm';
                return 'N/A';
            };

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
                                <span className="info-value">ĐDTVS{String(request.id).padStart(6, '0')}</span>
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
                            {request.updated_at && request.updated_at !== request.created_at && (
                                <div className="request-management-modal-info-item">
                                    <span className="info-label">
                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                        </svg>
                                        Ngày cập nhật
                                    </span>
                                    <span className="info-value">{formatDateDisplay(request.updated_at, true)}</span>
                                </div>
                            )}
                            {request.team_lead_name && (
                                <div className="request-management-modal-info-item">
                                    <span className="info-label">
                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                                        </svg>
                                        Quản lý duyệt
                                    </span>
                                    <span className="info-value">{request.team_lead_name}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chi tiết đơn xin đi trễ về sớm */}
                    <div className="request-management-modal-section">
                        <h3 className="request-management-modal-section-title">
                            <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Chi tiết đơn xin đi trễ về sớm
                        </h3>
                        <div className="request-management-modal-info-grid">
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                                    </svg>
                                    Loại đơn
                                </span>
                                <span className="info-value">{getRequestTypeLabel(request.request_type)}</span>
                            </div>
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                    Ngày
                                </span>
                                <span className="info-value">{formatDateDisplay(request.request_date) || '-'}</span>
                            </div>
                            <div className="request-management-modal-info-item">
                                <span className="info-label">
                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Thời gian
                                </span>
                                <span className="info-value">{formatTimeDisplay(request.time_value) || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Lý do và Ghi chú */}
                    {(request.reason || request.notes || request.team_lead_comment) && (
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
                            {request.team_lead_comment && (
                                <div className="request-management-manager-comment-text">
                                    <strong>Nhận xét của quản lý:</strong> {request.team_lead_comment}
                                    {request.team_lead_action_at && (
                                        <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                            ({formatDateDisplay(request.team_lead_action_at, true)})
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </>
            );
        }

        if (requestType === 'meal-allowance' || activeModule === 'meal-allowance' || request.requestType === 'meal-allowance') {
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
                                <span className="info-value">ĐPCC{String(request.id).padStart(6, '0')}</span>
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

                    {/* Chi tiết đơn xin phụ cấp cơm công trình */}
                    <div className="request-management-modal-section">
                        <h3 className="request-management-modal-section-title">
                            <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                            </svg>
                            Chi tiết đơn xin phụ cấp cơm công trình
                        </h3>
                        <div className="request-management-modal-info-grid">
                            {request.items && request.items.length > 0 && (
                                <>
                                    <div className="request-management-modal-info-item">
                                        <span className="info-label">
                                            <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                            Khoảng ngày
                                        </span>
                                        <span className="info-value">
                                            {formatDateDisplay(request.items[0].expense_date)}
                                            {request.items.length > 1 && ` → ${formatDateDisplay(request.items[request.items.length - 1].expense_date)}`}
                                        </span>
                                    </div>
                                    <div className="request-management-modal-info-item">
                                        <span className="info-label">
                                            <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                            </svg>
                                            Số mục
                                        </span>
                                        <span className="info-value">{request.items.length} mục</span>
                                    </div>
                                    {request.total_amount && (
                                        <div className="request-management-modal-info-item">
                                            <span className="info-label">
                                                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                                Tổng tiền
                                            </span>
                                            <span className="info-value info-value-highlight">
                                                {new Intl.NumberFormat('vi-VN').format(request.total_amount)} VNĐ
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        
                        {/* Bảng chi tiết các mục cơm */}
                        {request.items && request.items.length > 0 && (
                            <div style={{ marginTop: '1.5rem' }}>
                                <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>
                                    Danh sách các mục cơm
                                </h4>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>STT</th>
                                                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Ngày</th>
                                                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Nội dung</th>
                                                <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Số tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {request.items.map((item, index) => (
                                                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                    <td style={{ padding: '0.75rem', color: '#6b7280' }}>{index + 1}</td>
                                                    <td style={{ padding: '0.75rem', color: '#1f2937' }}>{formatDateDisplay(item.expense_date)}</td>
                                                    <td style={{ padding: '0.75rem', color: '#1f2937' }}>{item.content || '-'}</td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '500', color: '#059669' }}>
                                                        {new Intl.NumberFormat('vi-VN').format(item.amount || 0)} VNĐ
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr style={{ backgroundColor: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                                                <td colSpan="3" style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151' }}>
                                                    Tổng cộng:
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700', color: '#059669', fontSize: '1rem' }}>
                                                    {new Intl.NumberFormat('vi-VN').format(request.total_amount || 0)} VNĐ
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Ghi chú và Nhận xét */}
                    {(request.notes || request.team_lead_comment) && (
                        <div className="request-management-modal-section">
                            <h3 className="request-management-modal-section-title">
                                <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                Ghi chú và Nhận xét
                            </h3>
                            {request.notes && (
                                <div className="request-management-notes-text">
                                    <strong>Ghi chú:</strong> {request.notes}
                                </div>
                            )}
                            {request.team_lead_comment && (
                                <div className="request-management-manager-comment-text">
                                    <strong>Nhận xét của quản lý:</strong> {request.team_lead_comment}
                                    {request.team_lead_action_at && (
                                        <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                            ({formatDateDisplay(request.team_lead_action_at, true)})
                                        </span>
                                    )}
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
        } else if (isLeaveModuleKey(activeModule)) {
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
        } else if (activeModule === 'late-early') {
            return (
                <>
                    <th>Loại đơn</th>
                    <th>Ngày</th>
                    <th>Thời gian</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                </>
            );
        } else if (activeModule === 'meal-allowance') {
            return (
                <>
                    <th>Số mục</th>
                    <th>Tổng tiền</th>
                    <th>Khoảng ngày</th>
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
                                    {!isRefreshing && '● Cập nhật tự động mỗi 20 giây'}
                                </span>
                            </p>
                        </div>
                    </div>
                    {/* Export Actions */}
                    <div className="request-management-header-actions">
                        {/* Export Filter */}
                        <div className="request-export-filters">
                            <div className="request-export-date-wrapper">
                                <DatePicker
                                    selected={exportFilterStartDate}
                                    onChange={(date) => setExportFilterStartDate(date)}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="Từ ngày phát sinh"
                                    locale={DATE_PICKER_LOCALE}
                                    className="request-export-date-picker"
                                    isClearable
                                    maxDate={exportFilterEndDate || new Date()}
                                    popperClassName="request-export-datepicker-popper"
                                    popperPlacement="bottom-start"
                                    withPortal
                                    portalId="datepicker-portal"
                                />
                                <svg className="request-export-date-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                            </div>
                            <span className="request-export-date-separator">→</span>
                            <div className="request-export-date-wrapper">
                                <DatePicker
                                    selected={exportFilterEndDate}
                                    onChange={(date) => setExportFilterEndDate(date)}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="Đến ngày phát sinh"
                                    locale={DATE_PICKER_LOCALE}
                                    className="request-export-date-picker"
                                    isClearable
                                    minDate={exportFilterStartDate}
                                    maxDate={new Date()}
                                    popperClassName="request-export-datepicker-popper"
                                    popperPlacement="bottom-start"
                                    withPortal
                                    portalId="datepicker-portal"
                                />
                                <svg className="request-export-date-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                            </div>
                        </div>
                        {/* Export Button */}
                        <button
                            type="button"
                            className="request-export-excel-btn"
                            onClick={handleExportRequests}
                            disabled={loading || requests.filter(req => req.status === 'APPROVED').length === 0}
                            title="Xuất các đơn đã duyệt ra Excel"
                        >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <span>Xuất Excel</span>
                        </button>
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
                                                            {request.requestType === 'leave'
                                                                ? 'Đơn xin nghỉ phép'
                                                                : request.requestType === 'resign'
                                                                    ? 'Đơn xin nghỉ việc'
                                                                    : request.requestType === 'overtime'
                                                                        ? 'Đơn tăng ca'
                                                                        : request.requestType === 'attendance'
                                                                            ? 'Đơn bổ sung công'
                                                                            : request.requestType === 'late-early'
                                                                                ? 'Đơn xin đi trễ về sớm'
                                                                                : request.requestType === 'meal-allowance'
                                                                                    ? 'Đơn xin phụ cấp cơm công trình'
                                                                                    : 'Đơn xin nghỉ'}
                                                        </span>
                                                    </td>
                                                    <td className="request-info-cell">
                                                        {isLeaveModuleKey(request.requestType) && (
                                                            <>
                                                                <strong>{getRequestTypeLabel(request.request_type)}</strong>
                                                                <p className="request-management-period">
                                                                    {request.requestType === 'leave'
                                                                        ? getLeaveTypeLabel(request.leave_type)
                                                                        : 'Nghỉ việc'}
                                                                </p>
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
                                                        {request.requestType === 'late-early' && (
                                                            <>
                                                                <strong>Đơn xin đi trễ về sớm</strong>
                                                                <p className="request-management-period">
                                                                    {request.request_type === 'LATE' ? 'Đi trễ' : request.request_type === 'EARLY' ? 'Về sớm' : 'N/A'}
                                                                </p>
                                                            </>
                                                        )}
                                                        {request.requestType === 'meal-allowance' && (
                                                            <>
                                                                <strong>Đơn xin phụ cấp cơm công trình</strong>
                                                                <p className="request-management-period">
                                                                    {request.items && request.items.length > 0 ? (
                                                                        <>
                                                                            {formatDateDisplay(request.items[0].expense_date)}
                                                                            {request.items.length > 1 && ` → ${formatDateDisplay(request.items[request.items.length - 1].expense_date)}`}
                                                                            {request.total_amount && ` • ${new Intl.NumberFormat('vi-VN').format(request.total_amount)} VNĐ`}
                                                                        </>
                                                                    ) : (
                                                                        '-'
                                                                    )}
                                                                </p>
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="request-dates-cell">
                                                        <div className="request-dates-info">
                                                            {isLeaveModuleKey(request.requestType) && (
                                                                <>
                                                                    <span>{formatDateDisplay(request.start_date)}</span>
                                                                    {request.request_type === 'LEAVE' && request.end_date && (
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
                                                                    {request.start_time && (request.end_time || request.duration) && (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                                                                            <span className="time-info">
                                                                                <strong>Lần 1:</strong> {request.start_time.slice(0, 5)} → {request.end_time?.slice(0, 5) || '-'}
                                                                            </span>
                                                                            {request.child_request_id && request.child_start_time && (
                                                                                <span className="time-info" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                                                    <strong>Lần 2:</strong> {request.child_start_time.slice(0, 5)} → {request.child_end_time?.slice(0, 5) || '-'}
                                                                                </span>
                                                                            )}
                                                                        </div>
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
                                                            {request.requestType === 'late-early' && (
                                                                <>
                                                                    <span>{formatDateDisplay(request.request_date)}</span>
                                                                    {request.time_value && (
                                                                        <span className="time-info">{request.time_value.slice(0, 5)}</span>
                                                                    )}
                                                                </>
                                                            )}
                                                            {request.requestType === 'meal-allowance' && (
                                                                <>
                                                                    {request.items && request.items.length > 0 ? (
                                                                        <>
                                                                            <span>{formatDateDisplay(request.items[0].expense_date)}</span>
                                                                            {request.items.length > 1 && (
                                                                                <>
                                                                                    <span className="date-separator"> → </span>
                                                                                    <span>{formatDateDisplay(request.items[request.items.length - 1].expense_date)}</span>
                                                                                </>
                                                                            )}
                                                                        </>
                                                                    ) : (
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
                                                                handleDelete(request);
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
                                            {isLeaveModuleKey(activeModule) && (
                                                <>
                                                    <td>{getRequestTypeLabel(request.request_type)}</td>
                                                    <td>
                                                        {formatDateDisplay(request.start_date)}
                                                        {request.request_type === 'LEAVE' && request.end_date && ` → ${formatDateDisplay(request.end_date)}`}
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
                                                                handleDelete(request);
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
                                                        {request.start_time && (request.end_time || request.duration) ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                                <span className="time-info">
                                                                    <strong>Lần 1:</strong> {request.start_time.slice(0, 5)} → {request.end_time?.slice(0, 5) || '-'}
                                                                </span>
                                                                {request.child_request_id && request.child_start_time && (
                                                                    <span className="time-info" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                                        <strong>Lần 2:</strong> {request.child_start_time.slice(0, 5)} → {request.child_end_time?.slice(0, 5) || '-'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span>-</span>
                                                        )}
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
                                                                handleDelete(request);
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
                                                                handleDelete(request);
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
                                            {activeModule === 'late-early' && (
                                                <>
                                                    <td>
                                                        {request.request_type === 'LATE' ? 'Đi trễ' : request.request_type === 'EARLY' ? 'Về sớm' : 'N/A'}
                                                    </td>
                                                    <td>{formatDateDisplay(request.request_date)}</td>
                                                    <td>
                                                        {request.time_value ? request.time_value.slice(0, 5) : '-'}
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
                                                                handleDelete(request);
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
                                            {activeModule === 'meal-allowance' && (
                                                <>
                                                    <td>
                                                        {request.items ? request.items.length : 0} mục
                                                    </td>
                                                    <td>
                                                        {request.total_amount ? new Intl.NumberFormat('vi-VN').format(request.total_amount) + ' VNĐ' : '-'}
                                                    </td>
                                                    <td>
                                                        {request.items && request.items.length > 0 ? (
                                                            <>
                                                                {formatDateDisplay(request.items[0].expense_date)}
                                                                {request.items.length > 1 && ` → ${formatDateDisplay(request.items[request.items.length - 1].expense_date)}`}
                                                            </>
                                                        ) : (
                                                            '-'
                                                        )}
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
                                                                handleDelete(request);
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

