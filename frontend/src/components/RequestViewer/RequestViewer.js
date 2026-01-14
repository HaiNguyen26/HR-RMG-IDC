import React, { useState, useEffect, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { requestViewerAPI, leaveRequestsAPI, overtimeRequestsAPI, attendanceAdjustmentsAPI, travelExpensesAPI, customerEntertainmentExpensesAPI, mealAllowanceRequestsAPI, lateEarlyRequestsAPI } from '../../services/api';
import './RequestViewer.css';

const REQUEST_TYPE_CONFIG = {
    'leave': { label: 'Đơn xin nghỉ', icon: '📋', color: '#3b82f6' },
    'overtime': { label: 'Đơn tăng ca', icon: '⏰', color: '#f59e0b' },
    'attendance': { label: 'Đơn bổ sung công', icon: '✅', color: '#10b981' },
    'travel': { label: 'Đơn công tác', icon: '✈️', color: '#8b5cf6' },
    'customer-entertainment': { label: 'Đơn tiếp khách', icon: '🍽️', color: '#ec4899' },
    'meal-allowance': { label: 'Đơn phụ cấp công trình', icon: '🍱', color: '#f97316' },
    'late-early': { label: 'Đơn đi trễ về sớm', icon: '⏱️', color: '#6366f1' }
};

const STATUS_CONFIG = {
    'PENDING': { label: 'Chờ duyệt', color: '#f59e0b', bgColor: '#fef3c7' },
    'PENDING_LEVEL_1': { label: 'Chờ QLTT', color: '#f59e0b', bgColor: '#fef3c7' },
    'PENDING_LEVEL_2': { label: 'Chờ GĐCN', color: '#f59e0b', bgColor: '#fef3c7' },
    'PENDING_CEO': { label: 'Chờ TGD', color: '#f59e0b', bgColor: '#fef3c7' },
    'PENDING_FINANCE': { label: 'Chờ Tài chính', color: '#f59e0b', bgColor: '#fef3c7' },
    'APPROVED': { label: 'Đã duyệt', color: '#10b981', bgColor: '#d1fae5' },
    'REJECTED': { label: 'Đã từ chối', color: '#ef4444', bgColor: '#fee2e2' },
    'DRAFT': { label: 'Nháp', color: '#6b7280', bgColor: '#f3f4f6' }
};

const formatDate = (date) => {
    if (!date) return '-';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return '-';
    }
};

const formatDateTime = (date) => {
    if (!date) return '-';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '-';
    }
};

const getRequestTypeConfig = (type) => {
    return REQUEST_TYPE_CONFIG[type] || { label: type, icon: '📄', color: '#6b7280' };
};

const getStatusConfig = (status) => {
    return STATUS_CONFIG[status] || { label: status, color: '#6b7280', bgColor: '#f3f4f6' };
};

const RequestViewer = ({ currentUser, showToast }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortColumn, setSortColumn] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');
    const [selectedRows, setSelectedRows] = useState(new Set());

    const limit = 50;

    useEffect(() => {
        if (currentUser?.id) {
            fetchRequests();
        }
    }, [currentUser, page, search, fromDate, toDate]);

    const fetchRequests = async () => {
        if (!currentUser?.id) return;

        setLoading(true);
        try {
            const params = {
                indirectManagerId: currentUser.id,
                // Thêm thông tin tên và email để backend có thể tìm employee nếu ID không khớp
                ...(currentUser.hoTen && { managerName: currentUser.hoTen }),
                ...(currentUser.email && { managerEmail: currentUser.email }),
                page,
                limit,
                ...(search && { search }),
                ...(fromDate && { fromDate: fromDate.toISOString().split('T')[0] }),
                ...(toDate && { toDate: toDate.toISOString().split('T')[0] })
            };

            const response = await requestViewerAPI.getAll(params);
            if (response.data.success) {
                setRequests(response.data.data || []);
                setTotalPages(response.data.pagination?.totalPages || 1);
            } else {
                showToast('Không thể tải danh sách đơn', 'error');
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
            showToast('Lỗi khi tải danh sách đơn', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('desc');
        }
    };

    const sortedRequests = useMemo(() => {
        const sorted = [...requests];
        sorted.sort((a, b) => {
            let aVal = a[sortColumn];
            let bVal = b[sortColumn];

            if (sortColumn === 'created_at' || sortColumn === 'from_date' || sortColumn === 'to_date') {
                aVal = aVal ? new Date(aVal).getTime() : 0;
                bVal = bVal ? new Date(bVal).getTime() : 0;
            } else if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = (bVal || '').toLowerCase();
            }

            if (sortDirection === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });
        return sorted;
    }, [requests, sortColumn, sortDirection]);

    const handleRowClick = async (request) => {
        setSelectedRequest(request);
        setShowDetailModal(true);
    };

    const handleSelectRow = (e, requestId) => {
        e.stopPropagation();
        const newSelected = new Set(selectedRows);
        if (newSelected.has(requestId)) {
            newSelected.delete(requestId);
        } else {
            newSelected.add(requestId);
        }
        setSelectedRows(newSelected);
    };

    const handleSelectAll = (e) => {
        e.stopPropagation();
        if (selectedRows.size === requests.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(requests.map(r => r.id)));
        }
    };

    const getRequestTypeConfig = (type) => {
        return REQUEST_TYPE_CONFIG[type] || { label: type, icon: '📄', color: '#6b7280' };
    };

    const getStatusConfig = (status) => {
        return STATUS_CONFIG[status] || { label: status, color: '#6b7280', bgColor: '#f3f4f6' };
    };

    return (
        <div className="request-viewer">
            <div className="request-viewer-header">
                <div className="request-viewer-header-content">
                    <div className="request-viewer-title-section">
                        <div className="request-viewer-icon-wrapper">
                            <svg className="request-viewer-title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                        </div>
                        <div>
                            <h1 className="request-viewer-title">Request Viewer</h1>
                            <p className="request-viewer-subtitle">Theo dõi đơn từ của nhân viên được quản lý</p>
                        </div>
                    </div>
                    {requests.length > 0 && (
                        <div className="request-viewer-stats">
                            <div className="request-viewer-stat-item">
                                <span className="request-viewer-stat-label">Tổng đơn:</span>
                                <span className="request-viewer-stat-value">{requests.length}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="request-viewer-filters">
                <div className="request-viewer-search">
                    <svg className="request-viewer-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <input
                        type="text"
                        placeholder="Tìm theo tên người tạo hoặc mã đơn..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="request-viewer-search-input"
                    />
                </div>

                <div className="request-viewer-date-range">
                    <DatePicker
                        selected={fromDate}
                        onChange={(date) => {
                            setFromDate(date);
                            setPage(1);
                        }}
                        selectsStart
                        startDate={fromDate}
                        endDate={toDate}
                        placeholderText="Từ ngày"
                        dateFormat="dd/MM/yyyy"
                        className="request-viewer-date-input"
                    />
                    <span className="request-viewer-date-separator">→</span>
                    <DatePicker
                        selected={toDate}
                        onChange={(date) => {
                            setToDate(date);
                            setPage(1);
                        }}
                        selectsEnd
                        startDate={fromDate}
                        endDate={toDate}
                        minDate={fromDate}
                        placeholderText="Đến ngày"
                        dateFormat="dd/MM/yyyy"
                        className="request-viewer-date-input"
                    />
                    {(fromDate || toDate) && (
                        <button
                            className="request-viewer-date-clear"
                            onClick={() => {
                                setFromDate(null);
                                setToDate(null);
                                setPage(1);
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {loading && requests.length === 0 ? (
                <div className="request-viewer-loading">
                    <div className="request-viewer-skeleton-table">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="request-viewer-skeleton-row"></div>
                        ))}
                    </div>
                </div>
            ) : requests.length === 0 ? (
                <div className="request-viewer-empty">
                    <svg className="request-viewer-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p className="request-viewer-empty-text">Chưa có đơn nào</p>
                    <p className="request-viewer-empty-hint">
                        Các đơn từ của nhân viên được quản lý sẽ hiển thị tại đây
                    </p>
                </div>
            ) : (
                <>
                    <div className="request-viewer-table-wrapper">
                        <table className="request-viewer-table">
                            <thead className="request-viewer-table-header">
                                <tr>
                                    <th className="request-viewer-table-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.size === requests.length && requests.length > 0}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                    <th onClick={() => handleSort('code')} className="request-viewer-table-sortable">
                                        Mã đơn
                                        {sortColumn === 'code' && (
                                            <span className="request-viewer-sort-icon">
                                                {sortDirection === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </th>
                                    <th onClick={() => handleSort('ho_ten')} className="request-viewer-table-sortable">
                                        Nhân viên
                                        {sortColumn === 'ho_ten' && (
                                            <span className="request-viewer-sort-icon">
                                                {sortDirection === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </th>
                                    <th onClick={() => handleSort('phong_ban')} className="request-viewer-table-sortable">
                                        Phòng ban
                                        {sortColumn === 'phong_ban' && (
                                            <span className="request-viewer-sort-icon">
                                                {sortDirection === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </th>
                                    <th>Loại đơn</th>
                                    <th onClick={() => handleSort('from_date')} className="request-viewer-table-sortable">
                                        Thời gian
                                        {sortColumn === 'from_date' && (
                                            <span className="request-viewer-sort-icon">
                                                {sortDirection === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </th>
                                    <th onClick={() => handleSort('status')} className="request-viewer-table-sortable">
                                        Trạng thái
                                        {sortColumn === 'status' && (
                                            <span className="request-viewer-sort-icon">
                                                {sortDirection === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </th>
                                    <th>Cấp duyệt</th>
                                    <th>Người duyệt gần nhất</th>
                                    <th onClick={() => handleSort('created_at')} className="request-viewer-table-sortable">
                                        Ngày tạo
                                        {sortColumn === 'created_at' && (
                                            <span className="request-viewer-sort-icon">
                                                {sortDirection === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="request-viewer-table-body">
                                {sortedRequests.map((request, index) => {
                                    const typeConfig = getRequestTypeConfig(request.request_type);
                                    const statusConfig = getStatusConfig(request.status);
                                    const isSelected = selectedRows.has(request.id);

                                    return (
                                        <tr
                                            key={`${request.request_type}-${request.id}`}
                                            className={`request-viewer-table-row ${isSelected ? 'selected' : ''} ${index % 2 === 1 ? 'even-row' : ''}`}
                                            onClick={() => handleRowClick(request)}
                                        >
                                            <td className="request-viewer-table-checkbox" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => handleSelectRow(e, request.id)}
                                                />
                                            </td>
                                            <td className="request-viewer-table-code">{request.code || '-'}</td>
                                            <td className="request-viewer-table-employee">
                                                <div className="request-viewer-employee-info">
                                                    <div className="request-viewer-avatar">
                                                        {(request.ho_ten || '').charAt(0).toUpperCase()}
                                                    </div>
                                                    <span>{request.ho_ten || '-'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="request-viewer-department-badge">
                                                    {request.phong_ban || request.bo_phan || '-'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="request-viewer-type-badge" style={{ color: typeConfig.color }}>
                                                    <span>{typeConfig.icon}</span>
                                                    <span>{typeConfig.label}</span>
                                                </div>
                                            </td>
                                            <td className="request-viewer-table-time">
                                                {formatDate(request.from_date)} → {formatDate(request.to_date)}
                                            </td>
                                            <td>
                                                <span
                                                    className="request-viewer-status-badge"
                                                    style={{
                                                        color: statusConfig.color,
                                                        backgroundColor: statusConfig.bgColor
                                                    }}
                                                >
                                                    {statusConfig.label}
                                                </span>
                                            </td>
                                            <td>{request.approval_level || '-'}</td>
                                            <td>{request.last_approver_name || '-'}</td>
                                            <td>{formatDate(request.created_at)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="request-viewer-pagination">
                            <button
                                className="request-viewer-pagination-button"
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                            >
                                ← Trước
                            </button>
                            <span className="request-viewer-pagination-info">
                                Trang {page} / {totalPages}
                            </span>
                            <button
                                className="request-viewer-pagination-button"
                                disabled={page >= totalPages}
                                onClick={() => setPage(page + 1)}
                            >
                                Sau →
                            </button>
                        </div>
                    )}
                </>
            )}

            {showDetailModal && selectedRequest && (
                <RequestDetailModal
                    request={selectedRequest}
                    onClose={() => {
                        setShowDetailModal(false);
                        setSelectedRequest(null);
                    }}
                />
            )}
        </div>
    );
};

const RequestDetailModal = ({ request, onClose }) => {
    const typeConfig = getRequestTypeConfig(request?.request_type);
    const statusConfig = getStatusConfig(request?.status);

    return (
        <div className="request-viewer-modal-overlay" onClick={onClose}>
            <div className="request-viewer-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="request-viewer-modal-header">
                    <div>
                        <h2 className="request-viewer-modal-title">
                            {request.code || `Đơn ${request.request_type}`}
                        </h2>
                        <span
                            className="request-viewer-modal-status"
                            style={{
                                color: statusConfig.color,
                                backgroundColor: statusConfig.bgColor
                            }}
                        >
                            {statusConfig.label}
                        </span>
                    </div>
                    <button className="request-viewer-modal-close" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="request-viewer-modal-body">
                    <div className="request-viewer-modal-left">
                        <div className="request-viewer-detail-section">
                            <h3>Thông Tin Đơn</h3>
                            <div className="request-viewer-detail-grid">
                                <div className="request-viewer-detail-item">
                                    <span className="request-viewer-detail-label">Nhân viên:</span>
                                    <span className="request-viewer-detail-value">{request.ho_ten || '-'}</span>
                                </div>
                                <div className="request-viewer-detail-item">
                                    <span className="request-viewer-detail-label">Phòng ban:</span>
                                    <span className="request-viewer-detail-value">{request.phong_ban || request.bo_phan || '-'}</span>
                                </div>
                                <div className="request-viewer-detail-item">
                                    <span className="request-viewer-detail-label">Loại đơn:</span>
                                    <span className="request-viewer-detail-value">
                                        <span style={{ marginRight: '0.5rem' }}>{typeConfig.icon}</span>
                                        {typeConfig.label}
                                    </span>
                                </div>
                                <div className="request-viewer-detail-item">
                                    <span className="request-viewer-detail-label">Thời gian:</span>
                                    <span className="request-viewer-detail-value">
                                        {formatDate(request.from_date)} → {formatDate(request.to_date)}
                                    </span>
                                </div>
                                <div className="request-viewer-detail-item full-width">
                                    <span className="request-viewer-detail-label">Lý do:</span>
                                    <span className="request-viewer-detail-value">{request.reason || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="request-viewer-modal-right">
                        <div className="request-viewer-detail-section">
                            <h3>Tiến Độ Duyệt</h3>
                            <div className="request-viewer-timeline">
                                <TimelineStep
                                    label="Created"
                                    date={request.created_at}
                                    completed={true}
                                />
                                <TimelineStep
                                    label={request.approval_level || 'Pending'}
                                    date={request.last_approval_date}
                                    completed={request.status === 'APPROVED'}
                                    current={request.status.startsWith('PENDING')}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TimelineStep = ({ label, date, completed, current }) => {
    return (
        <div className="request-viewer-timeline-item">
            <div className="request-viewer-timeline-marker-wrapper">
                <div className={`request-viewer-timeline-marker ${completed ? 'completed' : current ? 'current' : ''}`}>
                    {completed ? (
                        <svg className="request-viewer-timeline-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                    ) : current ? (
                        <div className="request-viewer-timeline-dot"></div>
                    ) : (
                        <div className="request-viewer-timeline-dot" style={{ background: '#cbd5e1' }}></div>
                    )}
                </div>
                <div className="request-viewer-timeline-line"></div>
            </div>
            <div className="request-viewer-timeline-content">
                <span className="request-viewer-timeline-label">{label}</span>
                {date && (
                    <span className="request-viewer-timeline-date">{formatDateTime(date)}</span>
                )}
            </div>
        </div>
    );
};

export default RequestViewer;

