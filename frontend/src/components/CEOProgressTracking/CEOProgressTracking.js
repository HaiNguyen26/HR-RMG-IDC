import React, { useState, useEffect } from 'react';
import { leaveRequestsAPI, customerEntertainmentExpensesAPI, interviewRequestsAPI } from '../../services/api';
import './CEOProgressTracking.css';

const CEOProgressTracking = ({ currentUser, showToast }) => {
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState('all'); // all, leave, expense, recruitment
    const [selectedTimeRange, setSelectedTimeRange] = useState('week'); // today, week, month, all
    const [activities, setActivities] = useState([]);
    const [statistics, setStatistics] = useState({
        leave: { total: 0, pending: 0, approved: 0, rejected: 0 },
        expense: { total: 0, pending: 0, approved: 0, rejected: 0 },
        recruitment: { total: 0, pending: 0, approved: 0, rejected: 0 }
    });
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState(null);

    // Leave type labels (same as LeaveApprovals module)
    const LEAVE_TYPE_LABELS = {
        annual: 'Phép năm',
        unpaid: 'Không hưởng lương',
        statutory: 'Nghỉ chế độ',
        maternity: 'Nghỉ Thai Sản'
    };

    const getLeaveTypeLabel = (leaveType) => LEAVE_TYPE_LABELS[leaveType] || leaveType;

    // Fetch all activities
    useEffect(() => {
        fetchAllActivities();
        // Refresh every 30 seconds
        const interval = setInterval(fetchAllActivities, 30000);
        return () => clearInterval(interval);
    }, [selectedFilter, selectedTimeRange]);

    const fetchAllActivities = async () => {
        setLoading(true);
        try {
            const [leaveResponse, expenseResponse, recruitmentResponse] = await Promise.all([
                leaveRequestsAPI.getAll().catch(() => ({ data: { success: false, data: [] } })),
                customerEntertainmentExpensesAPI.getAll().catch(() => ({ data: { success: false, data: [] } })),
                interviewRequestsAPI.getAll().catch(() => ({ data: { success: false, data: [] } }))
            ]);

            const leaveRequests = leaveResponse.data?.success ? leaveResponse.data.data : [];
            const expenseRequests = expenseResponse.data?.success ? expenseResponse.data.data : [];
            const recruitmentRequests = recruitmentResponse.data?.success ? recruitmentResponse.data.data : [];

            // Calculate statistics
            const stats = {
                leave: {
                    total: leaveRequests.length,
                    pending: leaveRequests.filter(r => r.status === 'PENDING').length,
                    approved: leaveRequests.filter(r => r.status === 'APPROVED').length,
                    rejected: leaveRequests.filter(r => r.status === 'REJECTED').length
                },
                expense: {
                    total: expenseRequests.length,
                    pending: expenseRequests.filter(r =>
                        r.status === 'PENDING_BRANCH_DIRECTOR' ||
                        r.status === 'APPROVED_BY_BRANCH_DIRECTOR'
                    ).length,
                    approved: expenseRequests.filter(r => r.status === 'APPROVED_BY_CEO').length,
                    rejected: expenseRequests.filter(r => r.status === 'REJECTED').length
                },
                recruitment: {
                    total: recruitmentRequests.length,
                    pending: recruitmentRequests.filter(r =>
                        r.status === 'PENDING_INTERVIEW' ||
                        r.status === 'WAITING_FOR_OTHER_APPROVAL'
                    ).length,
                    approved: recruitmentRequests.filter(r =>
                        r.status === 'APPROVED' ||
                        r.status === 'READY_FOR_INTERVIEW'
                    ).length,
                    rejected: recruitmentRequests.filter(r => r.status === 'REJECTED').length
                }
            };

            setStatistics(stats);

            // Combine all activities into timeline
            const allActivities = [
                ...leaveRequests.map(r => {
                    // Try multiple field names for employee
                    const employeeName = r.employee_name || r.employeeName ||
                        r.requester_name || r.requesterName ||
                        r.created_by_name || r.createdByName ||
                        r.ho_ten || r.hoTen ||
                        'N/A';

                    // Calculate total days (try database field first, then calculate)
                    const totalDays = r.total_days || r.totalDays ||
                        calculateDays(r.start_date || r.startDate, r.end_date || r.endDate);

                    // Get leave type label (same as LeaveApprovals module)
                    const leaveTypeLabel = getLeaveTypeLabel(r.leave_type || r.leaveType);

                    return {
                        id: `leave-${r.id}`,
                        type: 'leave',
                        title: `Đơn xin nghỉ - ${employeeName}`,
                        description: `${leaveTypeLabel} - ${totalDays} ngày`,
                        status: r.status,
                        createdAt: r.created_at || r.createdAt,
                        employee: employeeName,
                        totalDays: totalDays, // Store for later use
                        data: r
                    };
                }),
                ...expenseRequests.map(r => {
                    // Try multiple field names for employee
                    const employeeName = r.employee_name || r.employeeName ||
                        r.requester || r.requester_name || r.requesterName ||
                        r.created_by_name || r.createdByName ||
                        r.ho_ten || r.hoTen ||
                        'N/A';
                    return {
                        id: `expense-${r.id}`,
                        type: 'expense',
                        title: `Chi phí tiếp khách - ${employeeName}`,
                        description: `${r.guest_name || 'Khách mời'} - ${formatCurrency(r.total_amount)}`,
                        status: r.status,
                        createdAt: r.created_at || r.createdAt,
                        employee: employeeName,
                        data: r
                    };
                }),
                ...recruitmentRequests.map(r => {
                    // For recruitment, employee is the candidate
                    const employeeName = r.candidate_name || r.candidateName ||
                        r.requester_name || r.requesterName ||
                        'N/A';

                    // Check both status and candidate_status fields
                    const recruitmentStatus = r.candidate_status || r.candidateStatus || r.status;

                    // Debug log to see actual status value
                    if (employeeName.includes('Nguyễn Thái Học')) {
                        console.log('🔍 Debug Recruitment Status:', {
                            name: employeeName,
                            status: r.status,
                            candidate_status: r.candidate_status,
                            candidateStatus: r.candidateStatus,
                            final: recruitmentStatus
                        });
                    }

                    return {
                        id: `recruitment-${r.id}`,
                        type: 'recruitment',
                        title: `Tuyển dụng - ${employeeName}`,
                        description: `${r.vi_tri_ung_tuyen || r.viTriUngTuyen || 'Vị trí'} - ${r.phong_ban || r.phongBan || 'Phòng ban'}`,
                        status: recruitmentStatus,
                        createdAt: r.created_at || r.createdAt,
                        employee: employeeName,
                        data: r
                    };
                })
            ];

            // Filter by type
            let filtered = allActivities;
            if (selectedFilter !== 'all') {
                filtered = filtered.filter(a => a.type === selectedFilter);
            }

            // Filter by time range
            const now = new Date();
            if (selectedTimeRange === 'today') {
                filtered = filtered.filter(a => {
                    const date = new Date(a.createdAt);
                    return date.toDateString() === now.toDateString();
                });
            } else if (selectedTimeRange === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                filtered = filtered.filter(a => new Date(a.createdAt) >= weekAgo);
            } else if (selectedTimeRange === 'month') {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                filtered = filtered.filter(a => new Date(a.createdAt) >= monthAgo);
            }

            // Sort by date (newest first)
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            setActivities(filtered);
        } catch (error) {
            console.error('Error fetching activities:', error);
            showToast?.('Không thể tải dữ liệu. Vui lòng thử lại.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount || 0);
    };

    // Calculate number of days between two dates
    const calculateDays = (startDate, endDate) => {
        if (!startDate || !endDate) return 0;
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);

            // Check if dates are valid
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

            // Calculate difference in days
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Add 1 to include both start and end dates
            return diffDays + 1;
        } catch (error) {
            console.error('Error calculating days:', error);
            return 0;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            // Check if date is valid
            if (isNaN(date.getTime())) return 'N/A';

            return date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error, dateString);
            return 'N/A';
        }
    };

    // Format date without time (for display only)
    const formatDateOnly = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';

            return date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return 'N/A';
        }
    };

    const getStatusBadge = (status, type) => {
        const statusMap = {
            leave: {
                'PENDING': { label: 'Chờ duyệt', class: 'pending' },
                'APPROVED': { label: 'Đã duyệt', class: 'approved' },
                'REJECTED': { label: 'Từ chối', class: 'rejected' }
            },
            expense: {
                'PENDING_BRANCH_DIRECTOR': { label: 'Chờ GĐ Chi nhánh', class: 'pending' },
                'APPROVED_BY_BRANCH_DIRECTOR': { label: 'GĐ Chi nhánh đã duyệt', class: 'processing' },
                'APPROVED_BY_CEO': { label: 'Đã duyệt', class: 'approved' },
                'REJECTED': { label: 'Từ chối', class: 'rejected' }
            },
            recruitment: {
                'PENDING_INTERVIEW': { label: 'Chờ phỏng vấn', class: 'pending' },
                'WAITING_FOR_OTHER_APPROVAL': { label: 'Chờ duyệt khác', class: 'processing' },
                'READY_FOR_INTERVIEW': { label: 'Sẵn sàng PV', class: 'processing' },
                'APPROVED': { label: 'Đã duyệt', class: 'approved' },
                'REJECTED': { label: 'Từ chối', class: 'rejected' },
                'ON_PROBATION': { label: 'Đang thử việc', class: 'processing' },
                'PASSED_PROBATION': { label: 'Đã qua thử việc', class: 'approved' },
                'FAILED_PROBATION': { label: 'Không qua thử việc', class: 'rejected' },
                'HIRED': { label: 'Đã tuyển dụng', class: 'approved' },
                'CANCELLED': { label: 'Đã hủy', class: 'rejected' }
            }
        };

        const statusInfo = statusMap[type]?.[status] || { label: status, class: 'default' };
        return (
            <span className={`ceo-tracking-status-badge ${statusInfo.class}`}>
                {statusInfo.label}
            </span>
        );
    };

    const getTypeIcon = (type) => {
        const icons = {
            leave: (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
            expense: (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            recruitment: (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        };
        return icons[type] || null;
    };

    // Modal handlers
    const handleActivityClick = (activity) => {
        setSelectedActivity(activity);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedActivity(null);
    };

    if (loading) {
        return (
            <div className="ceo-tracking-loading">
                <div className="ceo-tracking-spinner"></div>
                <p>Đang tải dữ liệu theo dõi...</p>
            </div>
        );
    }

    return (
        <div className="ceo-tracking-container">
            {/* Header */}
            <div className="ceo-tracking-header">
                <div className="ceo-tracking-header-content">
                    <div className="ceo-tracking-header-icon">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="ceo-tracking-title">Theo dõi Tiến độ Toàn công ty</h1>
                        <p className="ceo-tracking-subtitle">Tổng quan tất cả quy trình đang diễn ra</p>
                    </div>
                </div>
                <div className="ceo-tracking-refresh">
                    <button onClick={fetchAllActivities} className="ceo-tracking-refresh-btn">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Làm mới
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="ceo-tracking-stats-grid">
                <div className="ceo-tracking-stat-card leave">
                    <div className="ceo-tracking-stat-icon">
                        {getTypeIcon('leave')}
                    </div>
                    <div className="ceo-tracking-stat-content">
                        <h3>Đơn xin nghỉ</h3>
                        <div className="ceo-tracking-stat-numbers">
                            <div className="ceo-tracking-stat-total">{statistics.leave.total}</div>
                            <div className="ceo-tracking-stat-breakdown">
                                <span className="pending">{statistics.leave.pending} chờ</span>
                                <span className="approved">{statistics.leave.approved} duyệt</span>
                                <span className="rejected">{statistics.leave.rejected} từ chối</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="ceo-tracking-stat-card expense">
                    <div className="ceo-tracking-stat-icon">
                        {getTypeIcon('expense')}
                    </div>
                    <div className="ceo-tracking-stat-content">
                        <h3>Chi phí tiếp khách</h3>
                        <div className="ceo-tracking-stat-numbers">
                            <div className="ceo-tracking-stat-total">{statistics.expense.total}</div>
                            <div className="ceo-tracking-stat-breakdown">
                                <span className="pending">{statistics.expense.pending} chờ</span>
                                <span className="approved">{statistics.expense.approved} duyệt</span>
                                <span className="rejected">{statistics.expense.rejected} từ chối</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="ceo-tracking-stat-card recruitment">
                    <div className="ceo-tracking-stat-icon">
                        {getTypeIcon('recruitment')}
                    </div>
                    <div className="ceo-tracking-stat-content">
                        <h3>Tuyển dụng</h3>
                        <div className="ceo-tracking-stat-numbers">
                            <div className="ceo-tracking-stat-total">{statistics.recruitment.total}</div>
                            <div className="ceo-tracking-stat-breakdown">
                                <span className="pending">{statistics.recruitment.pending} chờ</span>
                                <span className="approved">{statistics.recruitment.approved} duyệt</span>
                                <span className="rejected">{statistics.recruitment.rejected} từ chối</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="ceo-tracking-filters">
                <div className="ceo-tracking-filter-group">
                    <label>Loại quy trình:</label>
                    <div className="ceo-tracking-filter-buttons">
                        <button
                            className={selectedFilter === 'all' ? 'active' : ''}
                            onClick={() => setSelectedFilter('all')}
                        >
                            Tất cả
                        </button>
                        <button
                            className={selectedFilter === 'leave' ? 'active leave' : ''}
                            onClick={() => setSelectedFilter('leave')}
                        >
                            Đơn nghỉ
                        </button>
                        <button
                            className={selectedFilter === 'expense' ? 'active expense' : ''}
                            onClick={() => setSelectedFilter('expense')}
                        >
                            Chi phí
                        </button>
                        <button
                            className={selectedFilter === 'recruitment' ? 'active recruitment' : ''}
                            onClick={() => setSelectedFilter('recruitment')}
                        >
                            Tuyển dụng
                        </button>
                    </div>
                </div>

                <div className="ceo-tracking-filter-group">
                    <label>Thời gian:</label>
                    <div className="ceo-tracking-filter-buttons">
                        <button
                            className={selectedTimeRange === 'today' ? 'active' : ''}
                            onClick={() => setSelectedTimeRange('today')}
                        >
                            Hôm nay
                        </button>
                        <button
                            className={selectedTimeRange === 'week' ? 'active' : ''}
                            onClick={() => setSelectedTimeRange('week')}
                        >
                            7 ngày
                        </button>
                        <button
                            className={selectedTimeRange === 'month' ? 'active' : ''}
                            onClick={() => setSelectedTimeRange('month')}
                        >
                            30 ngày
                        </button>
                        <button
                            className={selectedTimeRange === 'all' ? 'active' : ''}
                            onClick={() => setSelectedTimeRange('all')}
                        >
                            Tất cả
                        </button>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="ceo-tracking-timeline-container">
                <h2 className="ceo-tracking-timeline-title">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Timeline Hoạt động ({activities.length})
                </h2>

                {activities.length === 0 ? (
                    <div className="ceo-tracking-empty">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p>Không có hoạt động nào trong khoảng thời gian này</p>
                    </div>
                ) : (
                    <div className="ceo-tracking-timeline">
                        {activities.map((activity, index) => (
                            <div key={activity.id} className={`ceo-tracking-timeline-item ${activity.type}`}>
                                <div className="ceo-tracking-timeline-marker">
                                    {getTypeIcon(activity.type)}
                                </div>
                                <div
                                    className="ceo-tracking-timeline-content"
                                    onClick={() => handleActivityClick(activity)}
                                >
                                    <div className="ceo-tracking-timeline-header">
                                        <h3>{activity.title}</h3>
                                        {getStatusBadge(activity.status, activity.type)}
                                    </div>
                                    <p className="ceo-tracking-timeline-description">{activity.description}</p>
                                    <div className="ceo-tracking-timeline-meta">
                                        <span className="time">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {formatDate(activity.createdAt)}
                                        </span>
                                        <span className="employee">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            {activity.employee}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Chi Tiết */}
            {showModal && selectedActivity && (
                <div className="ceo-tracking-modal-overlay" onClick={closeModal}>
                    <div className="ceo-tracking-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ceo-tracking-modal-header">
                            <div className="ceo-tracking-modal-title">
                                <span className={`ceo-tracking-modal-type-badge ${selectedActivity.type}`}>
                                    {getTypeIcon(selectedActivity.type)}
                                    {selectedActivity.type === 'leave' ? 'Đơn xin nghỉ' :
                                        selectedActivity.type === 'expense' ? 'Chi phí tiếp khách' :
                                            'Tuyển dụng'}
                                </span>
                            </div>
                            <button className="ceo-tracking-modal-close" onClick={closeModal}>
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="ceo-tracking-modal-body">
                            {/* Thông tin chung */}
                            <div className="ceo-tracking-modal-section">
                                <h3 className="ceo-tracking-modal-section-title">Thông tin chung</h3>
                                <div className="ceo-tracking-modal-info-grid">
                                    <div className="ceo-tracking-modal-info-item">
                                        <span className="ceo-tracking-modal-info-label">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            Người gửi
                                        </span>
                                        <span className="ceo-tracking-modal-info-value">{selectedActivity.employee || 'N/A'}</span>
                                    </div>
                                    <div className="ceo-tracking-modal-info-item">
                                        <span className="ceo-tracking-modal-info-label">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Thời gian gửi
                                        </span>
                                        <span className="ceo-tracking-modal-info-value">
                                            {formatDate(selectedActivity.createdAt || selectedActivity.created_at)}
                                        </span>
                                    </div>
                                    <div className="ceo-tracking-modal-info-item">
                                        <span className="ceo-tracking-modal-info-label">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Trạng thái
                                        </span>
                                        <span className="ceo-tracking-modal-info-value">
                                            {getStatusBadge(selectedActivity.status, selectedActivity.type)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Chi tiết theo loại */}
                            <div className="ceo-tracking-modal-section">
                                <h3 className="ceo-tracking-modal-section-title">Chi tiết</h3>
                                {selectedActivity.type === 'leave' && (
                                    <div className="ceo-tracking-modal-info-grid">
                                        <div className="ceo-tracking-modal-info-item">
                                            <span className="ceo-tracking-modal-info-label">Loại nghỉ</span>
                                            <span className="ceo-tracking-modal-info-value">
                                                {getLeaveTypeLabel(selectedActivity.data?.leave_type || selectedActivity.data?.leaveType) || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="ceo-tracking-modal-info-item">
                                            <span className="ceo-tracking-modal-info-label">Số ngày</span>
                                            <span className="ceo-tracking-modal-info-value">
                                                {selectedActivity.totalDays ||
                                                    selectedActivity.data?.total_days ||
                                                    selectedActivity.data?.totalDays ||
                                                    calculateDays(
                                                        selectedActivity.data?.start_date || selectedActivity.data?.startDate,
                                                        selectedActivity.data?.end_date || selectedActivity.data?.endDate
                                                    )} ngày
                                            </span>
                                        </div>
                                        <div className="ceo-tracking-modal-info-item">
                                            <span className="ceo-tracking-modal-info-label">Từ ngày</span>
                                            <span className="ceo-tracking-modal-info-value">
                                                {formatDateOnly(selectedActivity.data?.start_date || selectedActivity.data?.startDate)}
                                            </span>
                                        </div>
                                        <div className="ceo-tracking-modal-info-item">
                                            <span className="ceo-tracking-modal-info-label">Đến ngày</span>
                                            <span className="ceo-tracking-modal-info-value">
                                                {formatDateOnly(selectedActivity.data?.end_date || selectedActivity.data?.endDate)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {selectedActivity.type === 'expense' && (
                                    <>
                                        {/* Section I: Thông tin chung */}
                                        <div className="ceo-tracking-modal-info-grid">
                                            <div className="ceo-tracking-modal-info-item">
                                                <span className="ceo-tracking-modal-info-label">Người yêu cầu</span>
                                                <span className="ceo-tracking-modal-info-value">
                                                    {selectedActivity.data?.requester ||
                                                        selectedActivity.data?.requester_name ||
                                                        selectedActivity.data?.requesterName ||
                                                        selectedActivity.data?.employee_name ||
                                                        selectedActivity.data?.employeeName ||
                                                        selectedActivity.data?.created_by_name ||
                                                        selectedActivity.data?.createdByName ||
                                                        selectedActivity.employee ||
                                                        'N/A'}
                                                </span>
                                            </div>
                                            <div className="ceo-tracking-modal-info-item">
                                                <span className="ceo-tracking-modal-info-label">Chi nhánh</span>
                                                <span className="ceo-tracking-modal-info-value">
                                                    {selectedActivity.data?.branch || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="ceo-tracking-modal-info-item">
                                                <span className="ceo-tracking-modal-info-label">Giám đốc Chi nhánh</span>
                                                <span className="ceo-tracking-modal-info-value">
                                                    {selectedActivity.data?.branch_director_name || selectedActivity.data?.branchDirectorName || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="ceo-tracking-modal-info-item">
                                                <span className="ceo-tracking-modal-info-label">Từ ngày</span>
                                                <span className="ceo-tracking-modal-info-value">
                                                    {formatDateOnly(selectedActivity.data?.start_date || selectedActivity.data?.startDate)}
                                                </span>
                                            </div>
                                            <div className="ceo-tracking-modal-info-item">
                                                <span className="ceo-tracking-modal-info-label">Đến ngày</span>
                                                <span className="ceo-tracking-modal-info-value">
                                                    {formatDateOnly(selectedActivity.data?.end_date || selectedActivity.data?.endDate)}
                                                </span>
                                            </div>
                                            <div className="ceo-tracking-modal-info-item">
                                                <span className="ceo-tracking-modal-info-label">Số tiền tạm ứng</span>
                                                <span className="ceo-tracking-modal-info-value">
                                                    {formatCurrency(selectedActivity.data?.advance_amount || selectedActivity.data?.advanceAmount || 0)}
                                                </span>
                                            </div>
                                            <div className="ceo-tracking-modal-info-item">
                                                <span className="ceo-tracking-modal-info-label">Tổng chi phí thực tế</span>
                                                <span className="ceo-tracking-modal-info-value">
                                                    {formatCurrency(selectedActivity.data?.total_amount || selectedActivity.data?.totalAmount || 0)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Section II: Chi tiết chứng từ & hóa đơn */}
                                        {selectedActivity.data?.expense_items && selectedActivity.data.expense_items.length > 0 && (
                                            <div style={{ marginTop: '1.5rem' }}>
                                                <h4 style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: '600',
                                                    color: '#1f2937',
                                                    marginBottom: '1rem',
                                                    paddingBottom: '0.5rem',
                                                    borderBottom: '1px solid #e5e7eb'
                                                }}>
                                                    Chi tiết Chứng từ & Hóa đơn ({selectedActivity.data.expense_items.length} khoản)
                                                </h4>
                                                {selectedActivity.data.expense_items.map((item, index) => (
                                                    <div key={index} style={{
                                                        background: '#f9fafb',
                                                        borderRadius: '0.5rem',
                                                        padding: '1rem',
                                                        marginBottom: '0.75rem',
                                                        border: '1px solid #e5e7eb'
                                                    }}>
                                                        <div style={{
                                                            fontWeight: '600',
                                                            color: '#f59e0b',
                                                            marginBottom: '0.75rem',
                                                            fontSize: '0.875rem'
                                                        }}>
                                                            Khoản chi #{index + 1}
                                                        </div>
                                                        <div className="ceo-tracking-modal-info-grid">
                                                            <div className="ceo-tracking-modal-info-item">
                                                                <span className="ceo-tracking-modal-info-label">Số hóa đơn</span>
                                                                <span className="ceo-tracking-modal-info-value">
                                                                    {item.invoice_number || item.invoiceNumber || 'N/A'}
                                                                </span>
                                                            </div>
                                                            <div className="ceo-tracking-modal-info-item">
                                                                <span className="ceo-tracking-modal-info-label">Số tiền</span>
                                                                <span className="ceo-tracking-modal-info-value">
                                                                    {formatCurrency(item.amount || 0)}
                                                                </span>
                                                            </div>
                                                            <div className="ceo-tracking-modal-info-item">
                                                                <span className="ceo-tracking-modal-info-label">Tên công ty</span>
                                                                <span className="ceo-tracking-modal-info-value">
                                                                    {item.company_name || item.companyName || 'N/A'}
                                                                </span>
                                                            </div>
                                                            <div className="ceo-tracking-modal-info-item" style={{ gridColumn: '1 / -1' }}>
                                                                <span className="ceo-tracking-modal-info-label">Nội dung</span>
                                                                <span className="ceo-tracking-modal-info-value">
                                                                    {item.content || 'N/A'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {selectedActivity.type === 'recruitment' && (
                                    <div className="ceo-tracking-modal-info-grid">
                                        <div className="ceo-tracking-modal-info-item">
                                            <span className="ceo-tracking-modal-info-label">Ứng viên</span>
                                            <span className="ceo-tracking-modal-info-value">
                                                {selectedActivity.data?.candidate_name || selectedActivity.data?.candidateName || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="ceo-tracking-modal-info-item">
                                            <span className="ceo-tracking-modal-info-label">Vị trí</span>
                                            <span className="ceo-tracking-modal-info-value">
                                                {selectedActivity.data?.vi_tri_ung_tuyen || selectedActivity.data?.viTriUngTuyen || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="ceo-tracking-modal-info-item">
                                            <span className="ceo-tracking-modal-info-label">Phòng ban</span>
                                            <span className="ceo-tracking-modal-info-value">
                                                {selectedActivity.data?.phong_ban || selectedActivity.data?.phongBan || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="ceo-tracking-modal-info-item">
                                            <span className="ceo-tracking-modal-info-label">Email</span>
                                            <span className="ceo-tracking-modal-info-value">
                                                {selectedActivity.data?.email || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="ceo-tracking-modal-info-item">
                                            <span className="ceo-tracking-modal-info-label">Điện thoại</span>
                                            <span className="ceo-tracking-modal-info-value">
                                                {selectedActivity.data?.so_dien_thoai || selectedActivity.data?.soDienThoai || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Mô tả / Lý do */}
                                {(selectedActivity.data?.reason || selectedActivity.data?.purpose || selectedActivity.data?.ghi_chu || selectedActivity.data?.ghiChu) && (
                                    <div className="ceo-tracking-modal-description" style={{ marginTop: '1rem' }}>
                                        <p>
                                            {selectedActivity.data?.reason ||
                                                selectedActivity.data?.purpose ||
                                                selectedActivity.data?.ghi_chu ||
                                                selectedActivity.data?.ghiChu || ''}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CEOProgressTracking;
