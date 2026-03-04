import React, { useState, useEffect } from 'react';
import { resignationRequestsAPI } from '../../services/api';
import './ResignationStatus.css';

const STATUS_LABEL = {
    SUBMITTED: 'Đã gửi đơn',
    HR_ACKNOWLEDGED: 'HR đã xác nhận tiếp nhận',
    PENDING_DIRECT_MANAGER: 'Chờ quản lý trực tiếp xác nhận',
    PENDING_INDIRECT_MANAGER: 'Chờ quản lý gián tiếp xác nhận',
    PENDING_BRANCH_DIRECTOR: 'Chờ giám đốc chi nhánh xác nhận',
    NOTICE_PERIOD_RUNNING: 'Đang thời gian báo trước',
    PRE_EXIT_CLEARANCE: 'Chờ clearance (IT/Finance)',
    LAST_WORKING_DAY: 'Ngày làm việc cuối',
    CONTRACT_LIQUIDATION: 'Thanh lý hợp đồng',
    CLOSED: 'Đã đóng'
};

const ResignationStatus = ({ currentUser, showToast }) => {
    const [myResignation, setMyResignation] = useState(null);
    const [handoverItems, setHandoverItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState(null);

    const employeeId = currentUser?.id || currentUser?.employeeId || currentUser?.employee_id;

    useEffect(() => {
        const fetchMy = async () => {
            if (!employeeId) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const res = await resignationRequestsAPI.getAll({ employeeId });
                const data = res.data?.data || [];
                const active = data.find(
                    (r) =>
                        r.status === 'NOTICE_PERIOD_RUNNING' ||
                        r.status === 'PRE_EXIT_CLEARANCE' ||
                        r.status === 'CONTRACT_LIQUIDATION' ||
                        r.status === 'CLOSED'
                );
                setMyResignation(active || (data.length > 0 ? data[0] : null));
            } catch (e) {
                console.error(e);
                setMyResignation(null);
            } finally {
                setLoading(false);
            }
        };
        fetchMy();
    }, [employeeId]);

    useEffect(() => {
        if (!myResignation?.id) {
            setHandoverItems([]);
            return;
        }
        resignationRequestsAPI
            .getHandover(myResignation.id)
            .then((res) => setHandoverItems(res.data?.data || []))
            .catch(() => setHandoverItems([]));
    }, [myResignation?.id]);

    const formatDate = (d) => (!d ? '-' : new Date(d).toLocaleDateString('vi-VN'));

    const intendedDate = myResignation?.intended_last_work_date
        ? new Date(myResignation.intended_last_work_date)
        : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let countdownDays = null;
    if (intendedDate && myResignation?.status !== 'CLOSED') {
        intendedDate.setHours(0, 0, 0, 0);
        countdownDays = Math.ceil((intendedDate - today) / (1000 * 60 * 60 * 24));
    }

    const handleToggleHandover = async (itemId, completed) => {
        if (!myResignation?.id || !employeeId) return;
        setTogglingId(itemId);
        try {
            await resignationRequestsAPI.completeHandoverItem(myResignation.id, itemId, {
                completed,
                completedBy: employeeId
            });
            const res = await resignationRequestsAPI.getHandover(myResignation.id);
            setHandoverItems(res.data?.data || []);
            if (showToast) showToast(completed ? 'Đã đánh dấu hoàn thành.' : 'Đã bỏ đánh dấu.', 'success');
        } catch (e) {
            if (showToast) showToast(e.response?.data?.message || 'Thất bại', 'error');
        } finally {
            setTogglingId(null);
        }
    };

    if (loading) {
        return (
            <div className="resignation-status-container">
                <p>Đang tải...</p>
            </div>
        );
    }

    if (!myResignation) {
        return (
            <div className="resignation-status-container">
                <h2 className="resignation-status-title">Trạng thái đơn nghỉ việc</h2>
                <p className="resignation-status-empty">Bạn chưa có đơn xin nghỉ việc nào hoặc đơn chưa vào giai đoạn báo trước.</p>
            </div>
        );
    }

    return (
        <div className="resignation-status-container">
            <h2 className="resignation-status-title">Trạng thái đơn nghỉ việc</h2>
            <div className="resignation-status-card">
                <p><strong>Mã đơn:</strong> ĐN{String(myResignation.id).padStart(6, '0')}</p>
                <p><strong>Ngày dự kiến nghỉ:</strong> {formatDate(myResignation.intended_last_work_date)}</p>
                <p><strong>Trạng thái:</strong> {STATUS_LABEL[myResignation.status] || myResignation.status}</p>
                {countdownDays !== null && (
                    <div className="resignation-status-countdown">
                        {countdownDays > 0 ? (
                            <span>Còn <strong>{countdownDays}</strong> ngày đến ngày nghỉ việc</span>
                        ) : countdownDays === 0 ? (
                            <span className="resignation-status-today">Hôm nay là ngày làm việc cuối</span>
                        ) : (
                            <span>Đã qua ngày nghỉ</span>
                        )}
                    </div>
                )}
            </div>
            {(myResignation.status === 'NOTICE_PERIOD_RUNNING' || myResignation.status === 'PRE_EXIT_CLEARANCE') && (
                <div className="resignation-status-handover">
                    <h3>Checklist bàn giao</h3>
                    {handoverItems.length === 0 ? (
                        <p className="resignation-status-no-items">Chưa có mục bàn giao. Quản lý/HR sẽ bổ sung.</p>
                    ) : (
                        <ul className="resignation-status-handover-list">
                            {handoverItems.map((item) => (
                                <li key={item.id} className={item.completed ? 'completed' : ''}>
                                    <label className="resignation-status-handover-item">
                                        <input
                                            type="checkbox"
                                            checked={!!item.completed}
                                            disabled={!!togglingId}
                                            onChange={(e) => handleToggleHandover(item.id, e.target.checked)}
                                        />
                                        <span>{item.title}</span>
                                        {item.description && <small>{item.description}</small>}
                                    </label>
                                    {item.completed_at && (
                                        <span className="resignation-status-done-at">Hoàn thành {formatDate(item.completed_at)}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default ResignationStatus;
