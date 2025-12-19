import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
    attendanceAdjustmentsAPI,
    leaveRequestsAPI,
    overtimeRequestsAPI,
    employeesAPI
} from '../../services/api';
import './LeaveApprovals.css';

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
        header: {
            teamLead: 'Tất cả đơn từ',
            hr: 'Quản lý đơn từ'
        },
        description: {
            teamLead: 'Xem tất cả các đơn từ của nhân viên.',
            hr: 'Xem và theo dõi tất cả các đơn xin phép, đơn tăng ca, đơn bổ sung chấm công.'
        }
    },
    {
        key: 'leave',
        label: 'Đơn xin nghỉ',
        header: {
            teamLead: 'Đơn nghỉ chờ quản lý duyệt',
            hr: 'Theo dõi đơn nghỉ'
        },
        description: {
            teamLead: 'Xem và xử lý các đơn xin nghỉ của nhân viên thuộc nhóm bạn phụ trách.',
            hr: 'Theo dõi trạng thái và tiến độ phê duyệt đơn nghỉ.'
        }
    },
    {
        key: 'overtime',
        label: 'Đơn tăng ca',
        header: {
            teamLead: 'Đơn tăng ca chờ quản lý duyệt',
            hr: 'Theo dõi đơn tăng ca'
        },
        description: {
            teamLead: 'Xem và xử lý các đề xuất tăng ca do nhân viên gửi.',
            hr: 'Theo dõi tiến độ phê duyệt đơn tăng ca.'
        }
    },
    {
        key: 'attendance',
        label: 'Đơn bổ sung công',
        header: {
            teamLead: 'Đơn bổ sung công chờ quản lý duyệt',
            hr: 'Theo dõi đơn bổ sung công'
        },
        description: {
            teamLead: 'Xử lý các yêu cầu bổ sung giờ vào/ra của nhân viên.',
            hr: 'Theo dõi tiến độ phê duyệt đơn bổ sung công.'
        }
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

// Hàm lấy end_time đúng để hiển thị
// Logic: Ưu tiên dùng end_time từ database (backend đã cập nhật đúng: end_time_ban_đầu + giờ_bổ_sung)
// Nếu không có end_time thì mới tính từ start_time + duration
const getCorrectEndTime = (request) => {
    if (!request) return null;

    // Ưu tiên dùng end_time từ database (backend đã cập nhật đúng)
    // Ví dụ: ban đầu 1h->3h (2h), bổ sung 1h → 1h->4h (3h)
    if (request.end_time) {
        return request.end_time;
    }

    // Fallback: Nếu không có end_time, tính từ start_time + duration (trường hợp cũ)
    if (request.start_time && request.duration) {
        try {
            const [startHour, startMinute] = request.start_time.split(':').map(Number);
            const durationHours = parseFloat(request.duration);

            if (!isNaN(startHour) && !isNaN(durationHours)) {
                const startDate = new Date();
                startDate.setHours(startHour, startMinute || 0, 0, 0);
                const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

                const endHour = String(endDate.getHours()).padStart(2, '0');
                const endMinute = String(endDate.getMinutes()).padStart(2, '0');

                return `${endHour}:${endMinute}:00`;
            }
        } catch (error) {
            console.error('Error calculating end time from duration:', error);
        }
    }

    return null;
};

const deriveViewerMode = (currentUser) => {
    if (!currentUser) return null;
    if (currentUser.role && currentUser.role !== 'EMPLOYEE') {
        return 'hr';
    }
    // Không kiểm tra chức danh nữa, chỉ dựa vào danh sách nhân viên (quan_ly_truc_tiep)
    return null;
};

const LeaveApprovals = ({ currentUser, showToast, showConfirm }) => {

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false); // Realtime update indicator
    const [selectedStatus, setSelectedStatus] = useState('PENDING');
    const [stats, setStats] = useState({ total: 0, overdueCount: 0 });
    const [refreshToken, setRefreshToken] = useState(0);
    const [activeModule, setActiveModule] = useState('overtime');
    const [managerOverride, setManagerOverride] = useState(null);
    const [managerResolved, setManagerResolved] = useState(false);
    const [isBranchDirector, setIsBranchDirector] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // activeModule mặc định là 'overtime' (không còn 'all')

    // Statistics for badge counts - overall (tính từ requests hiện tại)
    const statistics = useMemo(() => {
        const pending = requests.filter(r => r.status === 'PENDING').length;
        const approved = requests.filter(r => r.status === 'APPROVED').length;
        const rejected = requests.filter(r => r.status === 'REJECTED').length;
        const cancelled = requests.filter(r => r.status === 'CANCELLED').length;
        return { pending, approved, rejected, cancelled };
    }, [requests]);

    // Statistics cho tất cả các status của module hiện tại (để hiển thị badge)
    const [moduleStatusStatistics, setModuleStatusStatistics] = useState({
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0
    });

    // Statistics per module - fetch all modules to show badges (đã bỏ 'all')
    const [moduleStatistics, setModuleStatistics] = useState({
        leave: { pending: 0, total: 0 },
        overtime: { pending: 0, total: 0 },
        attendance: { pending: 0, total: 0 }
    });

    // Refs để track previous values và tránh setState không cần thiết
    const prevModuleStatsRef = useRef(null);
    const prevModuleStatusStatsRef = useRef(null);
    const prevRequestsRef = useRef(null);

    // Helper function để so sánh shallow objects
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

    useEffect(() => {
        let isMounted = true;

        const determineManagerMode = async () => {
            if (!currentUser?.id) {
                if (isMounted) {
                    setManagerOverride(null);
                    setManagerResolved(true);
                }
                return;
            }

            if (currentUser.role && currentUser.role !== 'EMPLOYEE') {
                if (isMounted) {
                    setManagerOverride('hr');
                    setManagerResolved(true);
                }
                return;
            }

            try {
                // Helper function để loại bỏ dấu tiếng Việt
                const removeVietnameseAccents = (str) => {
                    if (!str) return '';
                    return str
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/đ/g, 'd')
                        .replace(/Đ/g, 'D');
                };

                // Lấy danh sách employees từ API để kiểm tra quản lý trực tiếp
                const employeesResponse = await employeesAPI.getAll();
                const employees = employeesResponse.data?.data || [];

                const currentUserName = (currentUser.hoTen || currentUser.username || '').trim();
                const normalizedCurrentName = currentUserName.toLowerCase().replace(/\s+/g, ' ').trim();
                const normalizedCurrentNameNoAccents = removeVietnameseAccents(normalizedCurrentName);

                console.log('[LeaveApprovals] Checking manager role from employees list:', {
                    currentUser: {
                        id: currentUser.id,
                        hoTen: currentUser.hoTen,
                        username: currentUser.username,
                        normalizedName: normalizedCurrentName,
                        normalizedNameNoAccents: normalizedCurrentNameNoAccents
                    },
                    totalEmployees: employees.length
                });

                // Log tất cả các quan_ly_truc_tiep để debug
                const allManagers = employees
                    .filter(emp => emp.quan_ly_truc_tiep)
                    .map(emp => ({
                        employee: emp.ho_ten,
                        manager: emp.quan_ly_truc_tiep,
                        normalized: (emp.quan_ly_truc_tiep || '').toLowerCase().replace(/\s+/g, ' ').trim(),
                        normalizedNoAccents: removeVietnameseAccents((emp.quan_ly_truc_tiep || '').toLowerCase().replace(/\s+/g, ' ').trim())
                    }));

                console.log('[LeaveApprovals] All managers found in employees:', allManagers);

                // Kiểm tra xem có nhân viên nào có quan_ly_truc_tiep trùng với tên user hiện tại không
                const isTeamLead = employees.some((emp) => {
                    if (!emp.quan_ly_truc_tiep) return false;
                    const managerName = (emp.quan_ly_truc_tiep || '').trim();
                    const normalizedManagerName = managerName.toLowerCase().replace(/\s+/g, ' ').trim();
                    const normalizedManagerNameNoAccents = removeVietnameseAccents(normalizedManagerName);

                    // Match exact (có dấu)
                    if (normalizedManagerName === normalizedCurrentName) {
                        console.log('[LeaveApprovals] Found teamLead by exact match (with accents):', managerName);
                        return true;
                    }

                    // Match exact (không dấu)
                    if (normalizedManagerNameNoAccents === normalizedCurrentNameNoAccents) {
                        console.log('[LeaveApprovals] Found teamLead by exact match (no accents):', managerName);
                        return true;
                    }

                    // Fuzzy match (contains)
                    if (normalizedManagerName.includes(normalizedCurrentName) || normalizedCurrentName.includes(normalizedManagerName)) {
                        console.log('[LeaveApprovals] Found teamLead by fuzzy match (contains):', managerName);
                        return true;
                    }

                    if (normalizedManagerNameNoAccents.includes(normalizedCurrentNameNoAccents) || normalizedCurrentNameNoAccents.includes(normalizedManagerNameNoAccents)) {
                        console.log('[LeaveApprovals] Found teamLead by fuzzy match (no accents, contains):', managerName);
                        return true;
                    }

                    return false;
                });

                if (isTeamLead) {
                    console.log('[LeaveApprovals] Setting managerOverride to teamLead');
                    if (isMounted) {
                        setManagerOverride('teamLead');
                        setManagerResolved(true);
                    }
                    return;
                }

                // Kiểm tra xem có nhân viên nào có quan_ly_gian_tiep (giám đốc chi nhánh) trùng với tên user hiện tại không
                const isBranchDir = employees.some((emp) => {
                    if (!emp.quan_ly_gian_tiep) return false;
                    const directorName = (emp.quan_ly_gian_tiep || '').trim();
                    const normalizedDirectorName = directorName.toLowerCase().replace(/\s+/g, ' ').trim();
                    const normalizedDirectorNameNoAccents = removeVietnameseAccents(normalizedDirectorName);

                    // Match exact (có dấu)
                    if (normalizedDirectorName === normalizedCurrentName) {
                        console.log('[LeaveApprovals] Found branch director by exact match (with accents):', directorName);
                        return true;
                    }

                    // Match exact (không dấu)
                    if (normalizedDirectorNameNoAccents === normalizedCurrentNameNoAccents) {
                        console.log('[LeaveApprovals] Found branch director by exact match (no accents):', directorName);
                        return true;
                    }

                    // Fuzzy match (contains)
                    if (normalizedDirectorName.includes(normalizedCurrentName) || normalizedCurrentName.includes(normalizedDirectorName)) {
                        console.log('[LeaveApprovals] Found branch director by fuzzy match (contains):', directorName);
                        return true;
                    }

                    if (normalizedDirectorNameNoAccents.includes(normalizedCurrentNameNoAccents) || normalizedCurrentNameNoAccents.includes(normalizedDirectorNameNoAccents)) {
                        console.log('[LeaveApprovals] Found branch director by fuzzy match (no accents, contains):', directorName);
                        return true;
                    }

                    return false;
                });

                if (isBranchDir) {
                    console.log('[LeaveApprovals] Setting isBranchDirector to true');
                    if (isMounted) {
                        setIsBranchDirector(true);
                        setManagerOverride('teamLead'); // Sử dụng cùng viewerMode như teamLead
                        setManagerResolved(true);
                    }
                    return;
                }

                console.log('[LeaveApprovals] No teamLead or branch director match found. Current user name:', currentUserName);
                if (isMounted) {
                    setIsBranchDirector(false);
                    setManagerOverride(null);
                    setManagerResolved(true);
                }
            } catch (error) {
                console.error('Error resolving manager role:', error);
                if (isMounted) {
                    setManagerOverride(null);
                    setManagerResolved(true);
                }
            }
        };

        determineManagerMode();

        return () => {
            isMounted = false;
        };
    }, [currentUser]);

    const baseViewerMode = useMemo(() => deriveViewerMode(currentUser), [currentUser]);
    const viewerMode = managerResolved ? (managerOverride ?? baseViewerMode) : null;
    const isTeamLead = viewerMode === 'teamLead';
    // LeaveApprovals chỉ dành cho Quản lý (teamLead), không dành cho HR

    // *** NOTIFICATION PERMISSION REQUEST ĐÃ CHUYỂN SANG GlobalNotifications (App.js) ***

    // Fetch statistics for all modules (after viewerMode is defined)
    const fetchModuleStatistics = useCallback(async (silent = false) => {
        if (!viewerMode || !currentUser?.id) return;

        if (!silent) setIsRefreshing(true);
        try {
            const params = {};
            if (isTeamLead) {
                params.teamLeadId = currentUser.id;
            }

            // Fetch tất cả các status cho mỗi module để tính tổng
            const statuses = isTeamLead
                ? ['PENDING', 'APPROVED', 'REJECTED']
                : ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

            // Fetch cho từng module với tất cả các status
            const leavePromises = statuses.map(status =>
                leaveRequestsAPI.getAll({ ...params, status })
            );
            const overtimePromises = statuses.map(status =>
                overtimeRequestsAPI.getAll({ ...params, status })
            );
            const attendancePromises = statuses.map(status =>
                attendanceAdjustmentsAPI.getAll({ ...params, status })
            );

            const [leaveResults, overtimeResults, attendanceResults] = await Promise.all([
                Promise.all(leavePromises),
                Promise.all(overtimePromises),
                Promise.all(attendancePromises)
            ]);

            // Tính tổng và pending cho từng module
            const calculateStats = (results) => {
                let pending = 0;
                let total = 0;
                results.forEach((result, index) => {
                    const count = result.data?.success && Array.isArray(result.data.data)
                        ? result.data.data.length : 0;
                    total += count;
                    // Kết quả đầu tiên là PENDING (index 0)
                    if (index === 0) {
                        pending = count;
                    }
                });
                return { pending, total };
            };

            const leaveStats = calculateStats(leaveResults);
            const overtimeStats = calculateStats(overtimeResults);
            const attendanceStats = calculateStats(attendanceResults);

            // Không cần tính 'all' stats nữa vì đã bỏ module 'all'
            const newModuleStats = {
                leave: leaveStats,
                overtime: overtimeStats,
                attendance: attendanceStats
            };

            // Chỉ update state nếu data thực sự thay đổi (không check 'all' nữa)
            if (!prevModuleStatsRef.current ||
                !shallowEqual(prevModuleStatsRef.current.leave, newModuleStats.leave) ||
                !shallowEqual(prevModuleStatsRef.current.overtime, newModuleStats.overtime) ||
                !shallowEqual(prevModuleStatsRef.current.attendance, newModuleStats.attendance)) {
                setModuleStatistics(newModuleStats);
                prevModuleStatsRef.current = newModuleStats;
            }
        } catch (error) {
            console.error('[LeaveApprovals] Error fetching module statistics:', error);
        } finally {
            if (!silent) {
                setTimeout(() => setIsRefreshing(false), 300);
            }
        }
    }, [viewerMode, currentUser?.id, isTeamLead, activeModule, shallowEqual]);

    const moduleApiMap = useMemo(
        () => ({
            leave: leaveRequestsAPI,
            overtime: overtimeRequestsAPI,
            attendance: attendanceAdjustmentsAPI
        }),
        []
    );

    // Fetch statistics cho tất cả các status của module hiện tại (để hiển thị badge)
    // Phải định nghĩa TRƯỚC useEffect sử dụng nó
    const fetchModuleStatusStatistics = useCallback(async () => {
        if (!viewerMode || !currentUser?.id || !activeModule) return;

        try {
            const params = {};
            if (isTeamLead) {
                params.teamLeadId = currentUser.id;
            }

            const api = moduleApiMap[activeModule];
            if (!api) return;

            // Fetch tất cả các status
            const statuses = isTeamLead
                ? ['PENDING', 'APPROVED', 'REJECTED']
                : ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

            const promises = statuses.map(status =>
                api.getAll({ ...params, status })
            );

            const results = await Promise.all(promises);

            const stats = {
                pending: 0,
                approved: 0,
                rejected: 0,
                cancelled: 0
            };

            results.forEach((result, index) => {
                const status = statuses[index];
                const count = result.data?.success && Array.isArray(result.data.data)
                    ? result.data.data.length : 0;

                if (status === 'PENDING') stats.pending = count;
                else if (status === 'APPROVED') stats.approved = count;
                else if (status === 'REJECTED') stats.rejected = count;
                else if (status === 'CANCELLED') stats.cancelled = count;
            });

            // Chỉ update state nếu data thực sự thay đổi
            if (!prevModuleStatusStatsRef.current || !shallowEqual(prevModuleStatusStatsRef.current, stats)) {
                setModuleStatusStatistics(stats);
                prevModuleStatusStatsRef.current = stats;
            }
        } catch (error) {
            console.error('[LeaveApprovals] Error fetching module status statistics:', error);
        }
    }, [viewerMode, currentUser?.id, isTeamLead, activeModule, moduleApiMap]);

    useEffect(() => {
        if (viewerMode) {
            fetchModuleStatistics(false); // Lần đầu hiển thị loading
            // Realtime update: polling mỗi 5 giây để cập nhật badge (silent mode)
            const interval = setInterval(() => {
                fetchModuleStatistics(true);
                fetchModuleStatusStatistics();
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [fetchModuleStatistics, fetchModuleStatusStatistics, viewerMode]);

    const statusFilters = useMemo(() => {
        if (isTeamLead) {
            return [
                { key: 'PENDING', label: 'Chờ tôi duyệt' },
                { key: 'APPROVED', label: 'Đã duyệt' },
                { key: 'REJECTED', label: 'Đã từ chối' },
                { key: 'ALL', label: 'Tất cả' }
            ];
        }
        // HR xem tất cả
        return [
            { key: 'PENDING', label: 'Chờ duyệt' },
            { key: 'APPROVED', label: 'Đã duyệt' },
            { key: 'REJECTED', label: 'Đã từ chối' },
            { key: 'CANCELLED', label: 'Đã hủy' },
            { key: 'ALL', label: 'Tất cả' }
        ];
    }, [isTeamLead]);

    const buildStatusQuery = useCallback((filterKey) => {
        if (filterKey === 'ALL') {
            // Khi chọn "Tất cả", gửi tất cả các status có thể để backend không tự động filter PENDING
            return 'PENDING,APPROVED,REJECTED,CANCELLED';
        }
        // Status mới: PENDING, APPROVED, REJECTED, CANCELLED
        return filterKey;
    }, []);

    const currentModuleConfig = useMemo(
        () => MODULE_OPTIONS.find((module) => module.key === activeModule) || MODULE_OPTIONS.find(m => m.key !== 'all') || MODULE_OPTIONS[1],
        [activeModule]
    );

    // Helper function to compare if requests array actually changed
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

    const fetchRequests = useCallback(async (statusOverride = null, silent = false) => {
        if (!viewerMode || !currentUser?.id) {
            return;
        }

        // Chỉ hiển thị loading khi không phải silent mode (lần đầu hoặc khi filter thay đổi)
        if (!silent) {
            setLoading(true);
        }

        try {
            const params = {};
            if (isTeamLead) {
                // Quản lý trực tiếp: lấy đơn cần duyệt (PENDING) hoặc đã xử lý
                params.teamLeadId = currentUser.id;
            }

            const statusToUse = statusOverride !== null ? statusOverride : selectedStatus;

            // Xử lý trường hợp "Tất cả" - gửi tất cả các status có thể
            if (statusToUse === 'ALL') {
                // TeamLead chỉ xem PENDING, APPROVED, REJECTED (không có CANCELLED)
                // HR xem tất cả bao gồm CANCELLED
                if (isTeamLead) {
                    params.status = 'PENDING,APPROVED,REJECTED';
                } else {
                    params.status = 'PENDING,APPROVED,REJECTED,CANCELLED';
                }
            } else {
                const statusQuery = buildStatusQuery(statusToUse);
                if (statusQuery) {
                    params.status = statusQuery;
                }
            }

            // Fetch đơn theo module đã chọn (đã bỏ 'all')
            const response = await moduleApiMap[activeModule].getAll(params);

            if (response.data.success) {
                const newRequests = response.data.data || [];

                // *** NOTIFICATION LOGIC ĐÃ CHUYỂN SANG GlobalNotifications (App.js) ***

                // Chỉ update state nếu data thực sự thay đổi (tránh re-render không cần thiết)
                const prevReqs = prevRequestsRef.current || [];
                if (!requestsAreEqual(prevReqs, newRequests)) {
                    setRequests(newRequests);
                    prevRequestsRef.current = newRequests;
                    setStats({ total: newRequests.length, overdueCount: 0 });

                    // Nếu modal đang mở, cập nhật selectedRequest với dữ liệu mới
                    if (showDetailModal && selectedRequest) {
                        const updatedRequest = newRequests.find(r =>
                            r.id === selectedRequest.id &&
                            (r.requestType === selectedRequest.requestType ||
                                r.requestType === (selectedRequest.requestType || selectedRequest.request_type))
                        );
                        if (updatedRequest && (
                            updatedRequest.end_time !== selectedRequest.end_time ||
                            updatedRequest.duration !== selectedRequest.duration ||
                            updatedRequest.status !== selectedRequest.status
                        )) {
                            setSelectedRequest(updatedRequest);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[LeaveApprovals] Error fetching approvals:', error);
            if (showToast && !silent) {
                showToast('Không thể tải danh sách đơn.', 'error');
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [viewerMode, currentUser?.id, isTeamLead, selectedStatus, activeModule, moduleApiMap, requestsAreEqual, showToast, buildStatusQuery]);

    // Tự động cập nhật selectedRequest khi requests được refresh và modal đang mở
    useEffect(() => {
        if (showDetailModal && selectedRequest && requests.length > 0) {
            const updatedRequest = requests.find(r =>
                r.id === selectedRequest.id &&
                (r.requestType === selectedRequest.requestType ||
                    r.requestType === (selectedRequest.requestType || selectedRequest.request_type))
            );
            if (updatedRequest && (
                updatedRequest.end_time !== selectedRequest.end_time ||
                updatedRequest.duration !== selectedRequest.duration ||
                updatedRequest.status !== selectedRequest.status
            )) {
                setSelectedRequest(updatedRequest);
            }
        }
    }, [requests, showDetailModal, selectedRequest]);

    useEffect(() => {
        if (!viewerMode) return;
        // Mặc định hiển thị đơn chờ duyệt
        setSelectedStatus('PENDING');
    }, [viewerMode, activeModule]);

    useEffect(() => {
        if (!viewerMode) {
            return;
        }
        // Fetch requests when changing module or status (initial fetch - show loading)
        fetchRequests(null, false);

        // Realtime update: polling mỗi 5 giây để cập nhật danh sách (silent mode - không show loading)
        const interval = setInterval(() => fetchRequests(null, true), 5000);
        return () => clearInterval(interval);
    }, [fetchRequests, viewerMode]);


    const askForComment = async ({ title, message, required = false }) => {
        if (showConfirm) {
            const result = await showConfirm({
                title,
                message,
                confirmText: 'Xác nhận',
                cancelText: 'Bỏ qua',
                type: 'info',
                notesInput: {
                    placeholder: 'Nhập ghi chú (tùy chọn)',
                    label: 'Ghi chú:',
                    required
                }
            });

            if (!result) {
                return result === false ? false : '';
            }
            return result.notes || '';
        }

        const value = window.prompt(message || title || 'Nhập ghi chú');
        if (value === null) return false;
        if (required && !value.trim()) return '';
        return value || '';
    };

    const handleDecision = async (request, decision) => {
        try {
            const isReject = decision === 'REJECT';
            let comment = '';
            if (isReject) {
                const result = await askForComment({
                    title: 'Nhập lý do từ chối (tùy chọn)',
                    message: 'Bạn có thể thêm ghi chú để nhân viên hiểu quyết định.',
                    required: false
                });
                if (result === false) {
                    return;
                }
                comment = result;
            }

            // Endpoint mới: POST /:id/decision với teamLeadId
            const payload = {
                teamLeadId: currentUser.id,
                decision: decision === 'APPROVE' ? 'APPROVE' : 'REJECT',
                comment
            };

            // Xác định API dựa trên activeModule (đã bỏ 'all')
            const api = moduleApiMap[activeModule];

            // Kiểm tra API có tồn tại và có method decide không
            if (!api || typeof api.decide !== 'function') {
                throw new Error(`API không hợp lệ cho loại đơn này. Module: ${activeModule}, Request type: ${request.requestType || request.type}`);
            }

            await api.decide(request.id, payload);

            if (showToast) {
                const moduleLabel = MODULE_OPTIONS.find(m => m.key === activeModule)?.label || 'đơn';
                showToast(
                    decision === 'APPROVE'
                        ? `Đã phê duyệt ${moduleLabel} thành công!`
                        : `Đã từ chối ${moduleLabel}.`,
                    'success'
                );
            }

            // Đóng modal nếu đang mở
            if (showDetailModal && selectedRequest && selectedRequest.id === request.id) {
                setShowDetailModal(false);
                setSelectedRequest(null);
            }

            // Nếu từ chối và đang ở tab PENDING, chuyển sang tab REJECTED để xem đơn vừa từ chối
            if (decision === 'REJECT' && selectedStatus === 'PENDING') {
                // Chuyển tab sang REJECTED
                setSelectedStatus('REJECTED');
                // Đợi một chút để đảm bảo database đã cập nhật và state đã thay đổi, sau đó fetch lại
                // Gọi fetchRequests với status mới để đảm bảo fetch đúng dữ liệu
                setTimeout(() => {
                    fetchRequests('REJECTED', false);
                }, 300);
            } else {
                // Nếu không từ chối hoặc không ở tab PENDING, refresh như bình thường
                fetchRequests(null, false);
            }
        } catch (error) {
            console.error('Error updating decision:', error);
            if (showToast) {
                const message =
                    error.response?.data?.message || 'Không thể cập nhật trạng thái đơn. Vui lòng thử lại.';
                showToast(message, 'error');
            }
        }
    };


    // Xóa handleEscalate và handleProcessOverdue vì không còn trong quy trình mới

    // All hooks must be called before any early returns
    // Memoize handleViewRequest
    const handleViewRequest = useCallback((request) => {
        setSelectedRequest(request);
        setShowDetailModal(true);
    }, []);

    // Memoize table header để tránh render lại
    const tableHeader = useMemo(() => {
        return (
            <tr>
                <th>Mã đơn</th>
                <th>Tên nhân viên</th>
                {activeModule === 'leave' && (
                    <>
                        <th>Loại nghỉ</th>
                        <th>Ngày bắt đầu/kết thúc</th>
                        <th>Tổng số ngày nghỉ</th>
                    </>
                )}
                {activeModule === 'overtime' && (
                    <>
                        <th>Ngày tăng ca</th>
                        <th>Giờ bắt đầu/kết thúc</th>
                        <th>Thời lượng</th>
                    </>
                )}
                {activeModule === 'attendance' && (
                    <>
                        <th>Ngày bổ sung</th>
                        <th>Loại bổ sung</th>
                        <th>Giờ vào/ra</th>
                    </>
                )}
                <th className="text-center">Trạng thái</th>
                <th className="text-center">Hành động</th>
            </tr>
        );
    }, [activeModule]);

    // Memoize style objects để tránh tạo mới mỗi lần render
    const rowStyle = useMemo(() => ({ cursor: 'pointer' }), []);

    const getStatusLabel = (status) => STATUS_LABELS[status] || status;
    const getRequestTypeLabel = (type) => REQUEST_TYPE_LABELS[type] || type;
    const getLeaveTypeLabel = (leaveType) => LEAVE_TYPE_LABELS[leaveType] || leaveType;

    if (!viewerMode) {
        return (
            <div className="leave-approvals">
                <div className="leave-approvals-empty-state">
                    <h2>Bạn không có quyền duyệt đơn</h2>
                    <p>Vui lòng liên hệ HR Admin nếu bạn cần quyền truy cập.</p>
                </div>
            </div>
        );
    }

    const renderModuleTabs = () => (
        <div className="leave-approvals-modules">
            {MODULE_OPTIONS.filter(module => module.key !== 'all').map((module) => (
                <button
                    key={module.key}
                    type="button"
                    className={`module-chip ${activeModule === module.key ? 'active' : ''}`}
                    onClick={() => {
                        setActiveModule(module.key);
                    }}
                >
                    {module.label}
                </button>
            ))}
        </div>
    );

    const renderCardHeader = (request) => {
        const requestType = request.requestType || activeModule;

        if (requestType === 'leave' || activeModule === 'leave') {
            return (
                <>
                    <h3>{getRequestTypeLabel(request.request_type)}</h3>
                    <p className="leave-approvals-period">
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
                    <p className="leave-approvals-period">
                        {formatDateDisplay(request.request_date)} • {request.start_time?.slice(0, 5)} →{' '}
                        {getCorrectEndTime(request)?.slice(0, 5) || request.end_time?.slice(0, 5)}
                        {request.duration ? ` • ${request.duration}` : ''}
                    </p>
                </>
            );
        }

        return (
            <>
                <h3>Đơn bổ sung chấm công</h3>
                <p className="leave-approvals-period">
                    {formatDateDisplay(request.adjustment_date || request.request_date)} •{' '}
                    {request.check_type === 'CHECK_OUT' ? '-' : request.check_in_time?.slice(0, 5) || '-'}
                    {' → '}
                    {request.check_type === 'CHECK_IN' ? '-' : request.check_out_time?.slice(0, 5) || '-'}
                </p>
            </>
        );
    };

    const renderReasonSection = (request) => {
        let title = 'Lý do';
        let icon = (
            <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
        );
        if (activeModule === 'overtime') {
            title = 'Nội dung công việc';
            icon = (
                <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
            );
        } else if (activeModule === 'attendance') {
            title = 'Lý do bổ sung';
            icon = (
                <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
            );
        }

        // Lọc bỏ ATTENDANCE_TYPE từ notes khi hiển thị
        const cleanNotes = request.notes ? request.notes.replace(/ATTENDANCE_TYPE:[^\n]*\n?/g, '').trim() : null;

        return (
            <div className="leave-approvals-modal-section">
                <h3 className="leave-approvals-modal-section-title">
                    {icon}
                    {title}
                </h3>
                <div className="leave-approvals-reason-content">
                    <p className="leave-approvals-reason-text">{request.reason || 'Không có lý do'}</p>
                    {cleanNotes && (
                        <div className="leave-approvals-notes">
                            <span className="info-label">
                                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                </svg>
                                Ghi chú
                            </span>
                            <p className="leave-approvals-notes-text">{cleanNotes}</p>
                        </div>
                    )}
                    {request.team_lead_comment && (
                        <div className="leave-approvals-manager-comment">
                            <span className="info-label">
                                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                </svg>
                                Nhận xét từ quản lý
                            </span>
                            <p className="leave-approvals-manager-comment-text">{request.team_lead_comment}</p>
                        </div>
                    )}
                </div>
            </div>
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
            <div className="leave-approvals-modal-section">
                <h3 className="leave-approvals-modal-section-title">
                    <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                    </svg>
                    Timeline đơn từ
                </h3>
                <div className="leave-approvals-timeline">
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

    const renderActionButtons = (request) => (
        <div className="leave-approvals-actions-row">
            {isTeamLead && request.status === 'PENDING' && (
                <>
                    <button
                        type="button"
                        className="btn-approve"
                        onClick={() => handleDecision(request, 'APPROVE')}
                    >
                        Duyệt
                    </button>
                    <button
                        type="button"
                        className="btn-reject"
                        onClick={() => handleDecision(request, 'REJECT')}
                    >
                        Từ chối
                    </button>
                </>
            )}
        </div>
    );

    return (
        <div className="leave-approvals">
            {/* Tiêu đề chính */}
            <div className="leave-approvals-header">
                <div className="leave-approvals-header-content">
                    <div className="leave-approvals-icon-wrapper">
                        <svg className="leave-approvals-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                    <div>
                        <h1 className="leave-approvals-title">
                            {MODULE_OPTIONS.find(m => m.key === activeModule)?.header?.[isTeamLead ? 'teamLead' : 'hr'] || 'Duyệt đơn nghỉ'}
                        </h1>
                        <p className="leave-approvals-subtitle">
                            {MODULE_OPTIONS.find(m => m.key === activeModule)?.description?.[isTeamLead ? 'teamLead' : 'hr'] || 'Xem và phê duyệt các đơn từ nhân viên.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Nội dung sẽ được thiết kế tiếp */}
            <div className="leave-approvals-content">
                {/* Main Filter Bar - Lọc theo Loại Yêu cầu */}
                <div className="leave-approvals-main-filter-bar">
                    <div className="request-type-filter-group">
                        {MODULE_OPTIONS.filter(module => module.key !== 'all').map((module) => {
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
                                    <span className={`leave-module-badge ${hasPending ? 'pulsing' : ''}`}>
                                        {totalCount}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Status Filter Bar - Lọc theo Trạng thái Xử lý */}
                {isTeamLead && (
                    <div className="leave-approvals-status-filter-bar">
                        <div className="status-filter-group">
                            {statusFilters.map((filter) => {
                                let count = 0;
                                if (filter.key === 'PENDING') {
                                    count = moduleStatusStatistics.pending;
                                } else if (filter.key === 'APPROVED') {
                                    count = moduleStatusStatistics.approved;
                                } else if (filter.key === 'REJECTED') {
                                    count = moduleStatusStatistics.rejected;
                                } else if (filter.key === 'CANCELLED') {
                                    count = moduleStatusStatistics.cancelled;
                                } else if (filter.key === 'ALL') {
                                    // Tính tổng tất cả các status
                                    count = moduleStatusStatistics.pending +
                                        moduleStatusStatistics.approved +
                                        moduleStatusStatistics.rejected +
                                        moduleStatusStatistics.cancelled;
                                }
                                const hasPending = filter.key === 'PENDING' && moduleStatusStatistics.pending > 0;

                                return (
                                    <button
                                        key={filter.key}
                                        type="button"
                                        className={`status-filter-chip ${filter.key.toLowerCase()} ${selectedStatus === filter.key ? 'active' : ''} ${hasPending ? 'has-pending' : ''}`}
                                        onClick={() => setSelectedStatus(filter.key)}
                                    >
                                        <span className="status-filter-label">{filter.label}</span>
                                        <span className={`leave-filter-tab-badge ${hasPending ? 'pulsing' : ''}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Leave Request Table */}
                <div className="leave-approvals-table-container">
                    {loading ? (
                        <div className="leave-approvals-loading">
                            <div className="loading-spinner"></div>
                            <p>Đang tải dữ liệu...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="leave-approvals-empty">
                            <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <p>Không có đơn nào phù hợp bộ lọc</p>
                        </div>
                    ) : (
                        <table className="leave-approvals-table">
                            <thead>
                                {tableHeader}
                            </thead>
                            <tbody>
                                {requests.map((request) => {
                                    // Create unique key using requestType and id
                                    const uniqueKey = request.requestType
                                        ? `${request.requestType}-${request.id}`
                                        : `${activeModule}-${request.id}`;
                                    const canAction = isTeamLead && request.status === 'PENDING';
                                    const isHr = currentUser?.role && currentUser.role !== 'EMPLOYEE';

                                    // Tính tổng số ngày nghỉ
                                    let totalDays = '-';
                                    if (request.request_type === 'LEAVE' && request.start_date && request.end_date) {
                                        const start = new Date(request.start_date);
                                        const end = new Date(request.end_date);
                                        const diffTime = Math.abs(end - start);
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                        totalDays = `${diffDays} ngày`;
                                    } else if (request.duration) {
                                        totalDays = request.duration;
                                    } else if (request.request_type === 'OVERTIME' || request.request_type === 'ATTENDANCE') {
                                        totalDays = '1 ngày';
                                    }

                                    return (
                                        <tr
                                            key={uniqueKey}
                                            className="leave-request-row"
                                            onClick={() => handleViewRequest(request)}
                                            style={rowStyle}
                                        >
                                            <td className="leave-request-id-cell">
                                                <span className="leave-request-id">ĐN{String(request.id).padStart(6, '0')}</span>
                                            </td>
                                            <td className="leave-request-employee-cell">
                                                <div className="leave-request-employee-info">
                                                    <strong>{request.employee_name || 'N/A'}</strong>
                                                    {request.ma_nhan_vien && (
                                                        <span className="employee-code"> ({request.ma_nhan_vien})</span>
                                                    )}
                                                </div>
                                            </td>
                                            {activeModule === 'leave' && (
                                                <>
                                                    <td className="leave-request-type-cell">
                                                        <span className="leave-request-type">{getRequestTypeLabel(request.request_type) || 'N/A'}</span>
                                                    </td>
                                                    <td className="leave-request-dates-cell">
                                                        <div className="leave-request-dates-info">
                                                            <span>{formatDateDisplay(request.start_date)}</span>
                                                            {request.end_date && (
                                                                <>
                                                                    <span className="date-separator"> → </span>
                                                                    <span>{formatDateDisplay(request.end_date)}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="leave-request-days-cell">
                                                        <span className="leave-request-days">{totalDays}</span>
                                                    </td>
                                                </>
                                            )}
                                            {activeModule === 'overtime' && (
                                                <>
                                                    <td className="leave-request-dates-cell">
                                                        <div className="leave-request-dates-info">
                                                            <span>{formatDateDisplay(request.request_date)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="leave-request-dates-cell">
                                                        <div className="leave-request-dates-info">
                                                            {request.start_time && (request.end_time || request.duration) ? (
                                                                <span className="time-info">{request.start_time.slice(0, 5)} → {getCorrectEndTime(request)?.slice(0, 5) || request.end_time?.slice(0, 5) || '-'}</span>
                                                            ) : (
                                                                <span>-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="leave-request-days-cell">
                                                        <span className="leave-request-days">{request.duration || '-'}</span>
                                                    </td>
                                                </>
                                            )}
                                            {activeModule === 'attendance' && (
                                                <>
                                                    <td className="leave-request-dates-cell">
                                                        <div className="leave-request-dates-info">
                                                            <span>{formatDateDisplay(request.adjustment_date || request.request_date)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="leave-request-type-cell">
                                                        <span className="leave-request-type">
                                                            {(() => {
                                                                // Kiểm tra attendance_type từ notes hoặc trực tiếp
                                                                const notes = request.notes || '';
                                                                const attendanceType = request.attendance_type ||
                                                                    (notes.includes('ATTENDANCE_TYPE:')
                                                                        ? notes.split('ATTENDANCE_TYPE:')[1]?.split('\n')[0]?.trim()
                                                                        : null);

                                                                // Nếu có attendance_type rõ ràng
                                                                if (attendanceType === 'FORGOT_CHECK' || attendanceType === '1') {
                                                                    return 'Quên Chấm Công';
                                                                } else if (attendanceType === 'CONSTRUCTION_SITE' || attendanceType === '2') {
                                                                    return 'Đi Công Trình';
                                                                } else if (attendanceType === 'OUTSIDE_WORK' || attendanceType === '3') {
                                                                    return 'Làm việc bên ngoài';
                                                                }

                                                                // Suy luận từ dữ liệu: nếu có location trong notes thì là Đi Công Trình hoặc Làm việc bên ngoài
                                                                const hasLocation = notes.includes('LOCATION:');
                                                                if (hasLocation) {
                                                                    // Có thể là Đi Công Trình hoặc Làm việc bên ngoài, mặc định Đi Công Trình
                                                                    return 'Đi Công Trình';
                                                                }

                                                                // Nếu không có thông tin gì, mặc định là Quên Chấm Công (loại phổ biến nhất)
                                                                return 'Quên Chấm Công';
                                                            })()}
                                                        </span>
                                                    </td>
                                                    <td className="leave-request-dates-cell">
                                                        <div className="leave-request-dates-info">
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
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                            <td className="leave-request-status-cell">
                                                <span className={`leave-status-tag ${request.status.toLowerCase().replace('_', '-')}`}>
                                                    {getStatusLabel(request.status)}
                                                </span>
                                            </td>
                                            <td className="leave-request-actions-cell" onClick={(e) => e.stopPropagation()}>
                                                {canAction ? (
                                                    <div className="leave-request-fast-actions">
                                                        <button
                                                            type="button"
                                                            className="btn-fast-approve"
                                                            onClick={() => handleDecision(request, 'APPROVE')}
                                                            title="Duyệt đơn"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                            </svg>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn-fast-reject"
                                                            onClick={() => handleDecision(request, 'REJECT')}
                                                            title="Từ chối đơn"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ) : isHr ? (
                                                    <div className="leave-request-fast-actions">
                                                        <button
                                                            type="button"
                                                            className="btn-fast-delete"
                                                            onClick={() => {
                                                                if (showToast) {
                                                                    showToast('Chức năng xóa đơn đang được phát triển', 'info');
                                                                }
                                                            }}
                                                            title="Xóa đơn"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="no-action">-</span>
                                                )}
                                            </td>
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
                <div className="leave-approvals-modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="leave-approvals-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="leave-approvals-modal-header">
                            <h2 className="leave-approvals-modal-title">Chi tiết đơn</h2>
                            <button
                                type="button"
                                className="leave-approvals-modal-close"
                                onClick={() => setShowDetailModal(false)}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div className="leave-approvals-modal-body">
                            {/* Request Info */}
                            <div className="leave-approvals-modal-section">
                                <h3 className="leave-approvals-modal-section-title">
                                    <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Thông tin đơn
                                </h3>
                                <div className="leave-approvals-modal-info-grid">
                                    <div className="leave-approvals-modal-info-item">
                                        <span className="info-label">
                                            <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                            </svg>
                                            Tên nhân viên
                                        </span>
                                        <span className="info-value">{selectedRequest.employee_name || 'N/A'}</span>
                                    </div>
                                    {selectedRequest.ma_nhan_vien && (
                                        <div className="leave-approvals-modal-info-item">
                                            <span className="info-label">
                                                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path>
                                                </svg>
                                                Mã nhân viên
                                            </span>
                                            <span className="info-value">{selectedRequest.ma_nhan_vien}</span>
                                        </div>
                                    )}
                                    {(selectedRequest.chi_nhanh || selectedRequest.employee_branch) && (
                                        <div className="leave-approvals-modal-info-item">
                                            <span className="info-label">
                                                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                </svg>
                                                Chi nhánh
                                            </span>
                                            <span className="info-value">{selectedRequest.chi_nhanh || selectedRequest.employee_branch || 'N/A'}</span>
                                        </div>
                                    )}
                                    {(selectedRequest.bo_phan || selectedRequest.phong_ban || selectedRequest.employee_department) && (
                                        <div className="leave-approvals-modal-info-item">
                                            <span className="info-label">
                                                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                                </svg>
                                                Bộ phận/Phòng ban
                                            </span>
                                            <span className="info-value">{selectedRequest.bo_phan || selectedRequest.phong_ban || selectedRequest.employee_department || 'N/A'}</span>
                                        </div>
                                    )}
                                    <div className="leave-approvals-modal-info-item">
                                        <span className="info-label">
                                            <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            Trạng thái
                                        </span>
                                        <span className={`leave-status-tag ${selectedRequest.status.toLowerCase().replace('_', '-')}`}>
                                            {getStatusLabel(selectedRequest.status)}
                                        </span>
                                    </div>
                                    {selectedRequest.created_at && (
                                        <div className="leave-approvals-modal-info-item">
                                            <span className="info-label">
                                                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                                Ngày tạo
                                            </span>
                                            <span className="info-value">{formatDateDisplay(selectedRequest.created_at, true)}</span>
                                        </div>
                                    )}
                                    {selectedRequest.updated_at && selectedRequest.updated_at !== selectedRequest.created_at && (
                                        <div className="leave-approvals-modal-info-item">
                                            <span className="info-label">
                                                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                                </svg>
                                                Ngày cập nhật
                                            </span>
                                            <span className="info-value">{formatDateDisplay(selectedRequest.updated_at, true)}</span>
                                        </div>
                                    )}
                                    {selectedRequest.team_lead_name && (
                                        <div className="leave-approvals-modal-info-item">
                                            <span className="info-label">
                                                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                                                </svg>
                                                Quản lý trực tiếp
                                            </span>
                                            <span className="info-value">{selectedRequest.team_lead_name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Violation Warning - Cảnh báo vi phạm nội quy */}
                            {selectedRequest.has_violation && selectedRequest.violation_message && (
                                <div className="leave-approvals-modal-section leave-approvals-violation-section">
                                    <div className="leave-approvals-violation-warning">
                                        <svg className="leave-violation-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                        </svg>
                                        <div className="leave-violation-content">
                                            <strong className="leave-violation-title">⚠️ Cảnh báo: Nhân viên đang vi phạm nội quy</strong>
                                            <p className="leave-violation-text">{selectedRequest.violation_message}</p>
                                            <p className="leave-violation-note">Đơn này vẫn có thể được xem xét và duyệt, nhưng nhân viên đang vi phạm quy định về thời gian báo trước khi xin nghỉ phép.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Module-specific details */}
                            {((activeModule === 'leave') || (activeModule === 'all' && selectedRequest?.requestType === 'leave')) && (
                                <div className="leave-approvals-modal-section">
                                    <h3 className="leave-approvals-modal-section-title">
                                        <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        Chi tiết nghỉ phép
                                    </h3>
                                    <div className="leave-approvals-modal-info-grid">
                                        <div className="leave-approvals-modal-info-item">
                                            <span className="info-label">
                                                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                                                </svg>
                                                Loại nghỉ
                                            </span>
                                            <span className="info-value">{getRequestTypeLabel(selectedRequest.request_type) || 'N/A'}</span>
                                        </div>
                                        {selectedRequest.leave_type && (
                                            <div className="leave-approvals-modal-info-item">
                                                <span className="info-label">
                                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                                    </svg>
                                                    Loại phép
                                                </span>
                                                <span className="info-value">{getLeaveTypeLabel(selectedRequest.leave_type)}</span>
                                            </div>
                                        )}
                                        <div className="leave-approvals-modal-info-item">
                                            <span className="info-label">
                                                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                </svg>
                                                Ngày bắt đầu
                                            </span>
                                            <span className="info-value">{formatDateDisplay(selectedRequest.start_date)}</span>
                                        </div>
                                        {selectedRequest.end_date && (
                                            <div className="leave-approvals-modal-info-item">
                                                <span className="info-label">
                                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                    </svg>
                                                    Ngày kết thúc
                                                </span>
                                                <span className="info-value">{formatDateDisplay(selectedRequest.end_date)}</span>
                                            </div>
                                        )}
                                        {selectedRequest.start_date && selectedRequest.end_date && (
                                            <div className="leave-approvals-modal-info-item">
                                                <span className="info-label">
                                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                    </svg>
                                                    Tổng số ngày nghỉ
                                                </span>
                                                <span className="info-value info-value-highlight">
                                                    {(() => {
                                                        const start = new Date(selectedRequest.start_date);
                                                        const end = new Date(selectedRequest.end_date);
                                                        const diffTime = Math.abs(end - start);
                                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                                        return `${diffDays} ngày`;
                                                    })()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeModule === 'overtime' && (
                                <>
                                    {/* Warning for late request */}
                                    {selectedRequest.is_late_request && (
                                        <div className="leave-approvals-modal-warning">
                                            <svg className="warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                            </svg>
                                            <div className="warning-content">
                                                <strong>Cảnh báo vi phạm:</strong> Nhân viên đã nộp đơn tăng ca sau thời gian thực tế. Đơn tăng ca phải được nộp trước khi bắt đầu làm việc.
                                            </div>
                                        </div>
                                    )}
                                    <div className="leave-approvals-modal-section">
                                        <h3 className="leave-approvals-modal-section-title">
                                            <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            Chi tiết tăng ca
                                        </h3>
                                        <div className="leave-approvals-modal-info-grid">
                                            <div className="leave-approvals-modal-info-item">
                                                <span className="info-label">
                                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                    </svg>
                                                    Ngày tăng ca
                                                </span>
                                                <span className="info-value">{formatDateDisplay(selectedRequest.request_date)}</span>
                                            </div>
                                            <div className="leave-approvals-modal-info-item">
                                                <span className="info-label">
                                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                    </svg>
                                                    Giờ bắt đầu
                                                </span>
                                                <span className="info-value">{selectedRequest.start_time?.slice(0, 5) || '-'}</span>
                                            </div>
                                            <div className="leave-approvals-modal-info-item">
                                                <span className="info-label">
                                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                    </svg>
                                                    Giờ kết thúc
                                                </span>
                                                <span className="info-value">{getCorrectEndTime(selectedRequest)?.slice(0, 5) || selectedRequest.end_time?.slice(0, 5) || '-'}</span>
                                            </div>
                                            {selectedRequest.duration && (
                                                <div className="leave-approvals-modal-info-item">
                                                    <span className="info-label">
                                                        <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                                        </svg>
                                                        Thời lượng
                                                    </span>
                                                    <span className="info-value info-value-highlight">{selectedRequest.duration}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeModule === 'attendance' && (() => {
                                // Parse attendance_type và location từ notes
                                const notes = selectedRequest.notes || '';
                                const attendanceType = selectedRequest.attendance_type ||
                                    (notes.includes('ATTENDANCE_TYPE:')
                                        ? notes.split('ATTENDANCE_TYPE:')[1]?.split('\n')[0]?.trim()
                                        : null);
                                const location = notes.includes('LOCATION:')
                                    ? notes.split('LOCATION:')[1]?.split('\n')[0]?.trim()
                                    : null;

                                const adjustmentDate = selectedRequest.adjustment_date || selectedRequest.request_date;
                                const checkInTime = selectedRequest.check_in_time;
                                const checkOutTime = selectedRequest.check_out_time;

                                return (
                                    <div className="leave-approvals-modal-section">
                                        <h3 className="leave-approvals-modal-section-title">
                                            <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            Chi tiết bổ sung chấm công
                                        </h3>
                                        <div className="leave-approvals-modal-info-grid">
                                            <div className="leave-approvals-modal-info-item">
                                                <span className="info-label">
                                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                                                    </svg>
                                                    Loại bổ sung
                                                </span>
                                                <span className="info-value info-value-highlight">
                                                    {(() => {
                                                        // Nếu có attendance_type rõ ràng
                                                        if (attendanceType === 'FORGOT_CHECK' || attendanceType === '1') {
                                                            return 'Quên Chấm Công';
                                                        } else if (attendanceType === 'CONSTRUCTION_SITE' || attendanceType === '2') {
                                                            return 'Đi Công Trình';
                                                        } else if (attendanceType === 'OUTSIDE_WORK' || attendanceType === '3') {
                                                            return 'Làm việc bên ngoài';
                                                        }

                                                        // Suy luận từ dữ liệu: nếu có location trong notes thì là Đi Công Trình hoặc Làm việc bên ngoài
                                                        if (location) {
                                                            return 'Đi Công Trình';
                                                        }

                                                        // Nếu không có thông tin gì, mặc định là Quên Chấm Công
                                                        return 'Quên Chấm Công';
                                                    })()}
                                                </span>
                                            </div>

                                            <div className="leave-approvals-modal-info-item">
                                                <span className="info-label">
                                                    <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                    </svg>
                                                    Ngày bổ sung
                                                </span>
                                                <span className="info-value">{formatDateDisplay(adjustmentDate)}</span>
                                            </div>

                                            {/* Quên Chấm Công: Hiển thị Giờ vào và Giờ ra */}
                                            {(attendanceType === 'FORGOT_CHECK' || attendanceType === '1' || (!attendanceType && checkInTime && checkOutTime)) && (
                                                <>
                                                    {checkInTime && (
                                                        <div className="leave-approvals-modal-info-item">
                                                            <span className="info-label">
                                                                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                                </svg>
                                                                Giờ vào
                                                            </span>
                                                            <span className="info-value">{checkInTime.slice(0, 5)}</span>
                                                        </div>
                                                    )}
                                                    {checkOutTime && (
                                                        <div className="leave-approvals-modal-info-item">
                                                            <span className="info-label">
                                                                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                                </svg>
                                                                Giờ ra
                                                            </span>
                                                            <span className="info-value">{checkOutTime.slice(0, 5)}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* Đi Công Trình hoặc Làm việc bên ngoài: Hiển thị Địa điểm, Giờ bắt đầu, Giờ kết thúc */}
                                            {(attendanceType === 'CONSTRUCTION_SITE' || attendanceType === '2' || attendanceType === 'OUTSIDE_WORK' || attendanceType === '3') && (
                                                <>
                                                    {location && (
                                                        <div className="leave-approvals-modal-info-item">
                                                            <span className="info-label">
                                                                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                                </svg>
                                                                Địa điểm
                                                            </span>
                                                            <span className="info-value">{location}</span>
                                                        </div>
                                                    )}
                                                    {checkInTime && (
                                                        <div className="leave-approvals-modal-info-item">
                                                            <span className="info-label">
                                                                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                                </svg>
                                                                Giờ bắt đầu
                                                            </span>
                                                            <span className="info-value">{checkInTime.slice(0, 5)}</span>
                                                        </div>
                                                    )}
                                                    {checkOutTime && (
                                                        <div className="leave-approvals-modal-info-item">
                                                            <span className="info-label">
                                                                <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                                </svg>
                                                                Giờ kết thúc
                                                            </span>
                                                            <span className="info-value">{checkOutTime.slice(0, 5)}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Reason */}
                            {renderReasonSection(selectedRequest)}

                            {/* Decision Trace - Chỉ hiển thị cho HR, không hiển thị cho Quản lý/Giám đốc */}
                            {!isTeamLead && renderDecisionTrace(selectedRequest)}

                            {/* Action Buttons */}
                            <div className="leave-approvals-modal-actions">
                                {renderActionButtons(selectedRequest)}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveApprovals;

