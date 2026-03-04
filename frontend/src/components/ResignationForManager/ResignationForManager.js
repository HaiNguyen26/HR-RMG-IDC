import React, { useState, useEffect, useCallback } from 'react';
import { resignationRequestsAPI } from '../../services/api';
import './ResignationForManager.css';

const FILTER_KEYS = {
    PENDING_ME: 'Chờ tôi duyệt',
    DONE: 'Đã duyệt',
    ALL: 'Tất cả',
    IN_7: 'Sắp nghỉ trong 7 ngày',
    IN_14: 'Sắp nghỉ trong 14 ngày',
    NOTICE_PERIOD: 'Đang notice period',
    HANDOVER_INCOMPLETE: 'Chưa hoàn tất bàn giao'
};

const IMPACT_LEVELS = ['Low', 'Medium', 'High'];

const ResignationForManager = ({ currentUser, showToast }) => {
    const employeeId = currentUser?.employeeId || currentUser?.employee_id || currentUser?.id;
    const [list, setList] = useState([]);
    const [stats, setStats] = useState({
        pendingCount: 0,
        in30Days: 0,
        in14Days: 0,
        handoverIncompleteCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('PENDING_ME');
    const [selected, setSelected] = useState(null);
    const [detail, setDetail] = useState(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [impactForm, setImpactForm] = useState({
        currentProject: '',
        impactLevel: '',
        handoverPlan: '',
        temporaryReplacement: '',
        handoverDeadline: '',
        riskHasReplacement: false,
        riskUrgentHire: false,
        riskRevenue: false,
        riskCustomer: false,
        notes: ''
    });

    const fetchList = useCallback(async () => {
        if (!employeeId) return;
        setLoading(true);
        try {
            const res = await resignationRequestsAPI.getAll({
                forDirectManager: 'true',
                directManagerId: employeeId
            });
            setList(res.data?.data || []);
        } catch (e) {
            console.error(e);
            setList([]);
        } finally {
            setLoading(false);
        }
    }, [employeeId]);

    const fetchStats = useCallback(async () => {
        if (!employeeId) return;
        try {
            const res = await resignationRequestsAPI.getDashboardUpcoming(employeeId);
            const d = res.data?.data || {};
            setStats({
                pendingCount: d.pendingCount ?? 0,
                in30Days: (d.in30Days || []).length,
                in14Days: (d.in14Days || []).length,
                handoverIncompleteCount: d.handoverIncompleteCount ?? 0
            });
        } catch (e) {
            console.warn(e);
        }
    }, [employeeId]);

    useEffect(() => {
        fetchList();
        fetchStats();
    }, [fetchList, fetchStats]);

    const loadDetail = async (id) => {
        try {
            const res = await resignationRequestsAPI.getById(id);
            setDetail(res.data?.data || null);
            setSelected(id);
            const r = res.data?.data;
            setImpactForm({
                currentProject: r?.current_project || '',
                impactLevel: r?.impact_level || '',
                handoverPlan: r?.handover_plan || '',
                temporaryReplacement: r?.temporary_replacement || '',
                handoverDeadline: r?.handover_deadline ? String(r.handover_deadline).slice(0, 10) : '',
                riskHasReplacement: !!r?.risk_has_replacement,
                riskUrgentHire: !!r?.risk_urgent_hire,
                riskRevenue: !!r?.risk_revenue,
                riskCustomer: !!r?.risk_customer,
                notes: r?.direct_manager_notes || ''
            });
        } catch (e) {
            if (showToast) showToast('Không tải được chi tiết đơn', 'error');
        }
    };

    const formatDate = (d) => (!d ? '-' : new Date(d).toLocaleDateString('vi-VN'));
    const today = useCallback(() => {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return t;
    }, []);

    const getCountdown = (intendedDate) => {
        if (!intendedDate) return null;
        const d = new Date(intendedDate);
        d.setHours(0, 0, 0, 0);
        const diff = Math.ceil((d - today()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const filteredList = list.filter((r) => {
        const countdown = getCountdown(r.intended_last_work_date);
        const inNotice = r.status === 'NOTICE_PERIOD_RUNNING' || r.status === 'PRE_EXIT_CLEARANCE';
        // Xem cả các đơn đang ở trạng thái HR_ACKNOWLEDGED như là "chờ tôi duyệt"
        const isPending = r.status === 'PENDING_DIRECT_MANAGER' || r.status === 'HR_ACKNOWLEDGED';
        const isDone = r.status !== 'PENDING_DIRECT_MANAGER' && r.status !== 'SUBMITTED' && r.status !== 'HR_ACKNOWLEDGED';
        const handoverIncomplete = (r.handover_items || []).some((h) => !h.completed) && (r.handover_items || []).length > 0;

        switch (filter) {
            case 'PENDING_ME':
                return isPending;
            case 'DONE':
                return isDone;
            case 'IN_7':
                return countdown !== null && countdown >= 0 && countdown <= 7;
            case 'IN_14':
                return countdown !== null && countdown >= 0 && countdown <= 14;
            case 'NOTICE_PERIOD':
                return inNotice;
            case 'HANDOVER_INCOMPLETE':
                return inNotice && (handoverIncomplete || !r.handover_items?.length);
            default:
                return true;
        }
    });

    const handleSubmitImpact = async () => {
        if (!selected || !employeeId || !detail) return;
        const { currentProject, impactLevel, handoverPlan, temporaryReplacement, handoverDeadline, riskHasReplacement, riskUrgentHire, riskRevenue, riskCustomer, notes } = impactForm;
        if (!currentProject?.trim() || !impactLevel || !handoverPlan?.trim() || !temporaryReplacement?.trim() || !handoverDeadline?.trim()) {
            if (showToast) showToast('Vui lòng nhập đủ: Dự án đang phụ trách, Mức độ ảnh hưởng, Kế hoạch bàn giao, Người tiếp nhận, Thời gian hoàn tất bàn giao.', 'error');
            return;
        }
        setSubmitLoading(true);
        try {
            await resignationRequestsAPI.directManagerAcknowledge(selected, {
                managerEmployeeId: employeeId,
                notes: notes?.trim() || null,
                currentProject: currentProject.trim(),
                temporaryReplacement: temporaryReplacement.trim(),
                workRiskNotes: null,
                impactLevel,
                handoverPlan: handoverPlan.trim(),
                handoverDeadline: handoverDeadline.trim(),
                riskHasReplacement,
                riskUrgentHire,
                riskRevenue,
                riskCustomer
            });
            if (showToast) showToast('Đã xác nhận Impact. Đơn chuyển đến quản lý gián tiếp.', 'success');
            setSelected(null);
            setDetail(null);
            fetchList();
            fetchStats();
        } catch (e) {
            if (showToast) showToast(e.response?.data?.message || 'Xác nhận thất bại', 'error');
        } finally {
            setSubmitLoading(false);
        }
    };

    const tenureText = (ngayVao) => {
        if (!ngayVao) return '—';
        try {
            const d = new Date(ngayVao);
            if (Number.isNaN(d.getTime())) return '—';
            const y = today().getFullYear() - d.getFullYear();
            const m = today().getMonth() - d.getMonth();
            if (y > 0) return `${y} năm`;
            if (m > 0) return `${m} tháng`;
            return '< 1 tháng';
        } catch (_) {
            return '—';
        }
    };

    if (!employeeId) {
        return (
            <div className="resign-for-manager">
                <p className="resign-for-manager-empty">Bạn cần đăng nhập với tài khoản nhân viên để xem đơn nghỉ việc.</p>
            </div>
        );
    }

    return (
        <div className="resign-for-manager">
            <header className="resign-for-manager-header">
                <h1 className="resign-for-manager-title">Đơn xin nghỉ việc</h1>
                <p className="resign-for-manager-desc">Impact Confirmation & theo dõi bàn giao — không phải phê duyệt quyền nghỉ.</p>
            </header>

            {/* Header tổng quan */}
            <div className="resign-for-manager-stats">
                <div className="resign-for-manager-stat-card">
                    <span className="resign-for-manager-stat-value">{stats.pendingCount}</span>
                    <span className="resign-for-manager-stat-label">Đơn chờ xác nhận</span>
                </div>
                <div className="resign-for-manager-stat-card">
                    <span className="resign-for-manager-stat-value">{stats.in30Days}</span>
                    <span className="resign-for-manager-stat-label">Sẽ nghỉ trong 30 ngày</span>
                </div>
                <div className="resign-for-manager-stat-card">
                    <span className="resign-for-manager-stat-value">{stats.in14Days}</span>
                    <span className="resign-for-manager-stat-label">Sẽ nghỉ trong 14 ngày</span>
                </div>
                <div className="resign-for-manager-stat-card">
                    <span className="resign-for-manager-stat-value">{stats.handoverIncompleteCount}</span>
                    <span className="resign-for-manager-stat-label">Chưa hoàn tất bàn giao</span>
                </div>
            </div>

            {/* Bộ lọc */}
            <div className="resign-for-manager-filters">
                {Object.entries(FILTER_KEYS).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        className={`resign-for-manager-filter-btn ${filter === key ? 'active' : ''}`}
                        onClick={() => setFilter(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Bảng danh sách */}
            <div className="resign-for-manager-table-wrap">
                {loading ? (
                    <p className="resign-for-manager-loading">Đang tải...</p>
                ) : filteredList.length === 0 ? (
                    <p className="resign-for-manager-empty">Không có đơn nào.</p>
                ) : (
                    <table className="resign-for-manager-table">
                        <thead>
                            <tr>
                                <th>Nhân viên</th>
                                <th>Chức danh / Phòng ban</th>
                                <th>Loại HĐ / Thâm niên</th>
                                <th>Ngày nộp / Ngày nghỉ</th>
                                <th>Còn lại</th>
                                <th>Lý do</th>
                                <th>Impact (dự án / thay thế)</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredList.map((r) => {
                                const countdown = getCountdown(r.intended_last_work_date);
                                const isPending = r.status === 'PENDING_DIRECT_MANAGER';
                                const inNotice = r.status === 'NOTICE_PERIOD_RUNNING' || r.status === 'PRE_EXIT_CLEARANCE';
                                const statusLabel = isPending ? 'Chờ xác nhận' : inNotice ? 'Đang notice period' : r.status === 'PENDING_INDIRECT_MANAGER' || r.status === 'PENDING_BRANCH_DIRECTOR' ? 'Đã xác nhận' : r.status;
                                return (
                                    <tr key={r.id} onClick={() => loadDetail(r.id)} className="resign-for-manager-row">
                                        <td>
                                            <strong>{r.employee_name || '—'}</strong>
                                            {r.ma_nhan_vien && <span className="resign-for-manager-mnv"> ({r.ma_nhan_vien})</span>}
                                        </td>
                                        <td>{r.employee_title || '—'} / {r.employee_department || '—'}</td>
                                        <td>{r.loai_hop_dong || '—'} / {tenureText(r.ngay_vao_cong_ty)}</td>
                                        <td>{formatDate(r.submitted_at)} → {formatDate(r.intended_last_work_date)}</td>
                                        <td>
                                            {countdown !== null && countdown >= 0 ? (
                                                <span className={countdown <= 7 ? 'resign-for-manager-urgent' : ''}>{countdown} ngày</span>
                                            ) : '—'}
                                        </td>
                                        <td className="resign-for-manager-reason">{r.reason ? (r.reason.length > 40 ? r.reason.slice(0, 40) + '…' : r.reason) : '—'}</td>
                                        <td>{r.current_project ? (r.current_project.length > 30 ? r.current_project.slice(0, 30) + '…' : r.current_project) : '—'} / {r.temporary_replacement || '—'}</td>
                                        <td><span className={`resign-for-manager-status status-${r.status}`}>{statusLabel}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal chi tiết */}
            {detail && (
                <div className="resign-for-manager-modal-overlay" onClick={() => { setSelected(null); setDetail(null); }}>
                    <div className="resign-for-manager-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="resign-for-manager-modal-header">
                            <h2>Chi tiết đơn nghỉ việc — {detail.employee_name} {detail.ma_nhan_vien && `(${detail.ma_nhan_vien})`}</h2>
                            <button type="button" className="resign-for-manager-modal-close" onClick={() => { setSelected(null); setDetail(null); }}>×</button>
                        </div>
                        <div className="resign-for-manager-modal-body">
                            {/* Block 1 – Thông tin pháp lý */}
                            <section className="resign-for-manager-block">
                                <h3>1. Thông tin pháp lý</h3>
                                <div className="resign-for-manager-grid">
                                    <div><span className="label">Loại hợp đồng</span><span>{detail.contract_type || '—'}</span></div>
                                    <div><span className="label">Số ngày báo trước yêu cầu</span><span>{detail.required_notice_days ?? '—'}</span></div>
                                    <div><span className="label">Số ngày báo trước thực tế</span><span>{detail.submitted_at && detail.intended_last_work_date ? Math.ceil((new Date(detail.intended_last_work_date) - new Date(detail.submitted_at)) / (1000 * 60 * 60 * 24)) : '—'}</span></div>
                                    <div><span className="label">Hợp lệ</span><span>{(detail.required_notice_days != null && detail.submitted_at && detail.intended_last_work_date) ? (Math.ceil((new Date(detail.intended_last_work_date) - new Date(detail.submitted_at)) / (1000 * 60 * 60 * 24)) >= detail.required_notice_days ? 'Có' : 'Không') : '—'}</span></div>
                                </div>
                            </section>

                            {/* Block 2 – Impact Confirmation */}
                            <section className="resign-for-manager-block">
                                <h3>2. Impact Confirmation (bắt buộc)</h3>
                                {detail.status === 'PENDING_DIRECT_MANAGER' ? (
                                    <>
                                        <div className="resign-for-manager-form-group">
                                            <label>Danh sách dự án đang phụ trách *</label>
                                            <textarea value={impactForm.currentProject} onChange={(e) => setImpactForm((f) => ({ ...f, currentProject: e.target.value }))} rows={2} placeholder="Dự án A, B..." />
                                        </div>
                                        <div className="resign-for-manager-form-group">
                                            <label>Mức độ ảnh hưởng *</label>
                                            <select value={impactForm.impactLevel} onChange={(e) => setImpactForm((f) => ({ ...f, impactLevel: e.target.value }))}>
                                                <option value="">— Chọn —</option>
                                                {IMPACT_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                        </div>
                                        <div className="resign-for-manager-form-group">
                                            <label>Kế hoạch bàn giao *</label>
                                            <textarea value={impactForm.handoverPlan} onChange={(e) => setImpactForm((f) => ({ ...f, handoverPlan: e.target.value }))} rows={2} placeholder="Nội dung kế hoạch..." />
                                        </div>
                                        <div className="resign-for-manager-form-group">
                                            <label>Người tiếp nhận *</label>
                                            <input type="text" value={impactForm.temporaryReplacement} onChange={(e) => setImpactForm((f) => ({ ...f, temporaryReplacement: e.target.value }))} placeholder="Họ tên / mã NV" />
                                        </div>
                                        <div className="resign-for-manager-form-group">
                                            <label>Thời gian hoàn tất bàn giao *</label>
                                            <input type="date" value={impactForm.handoverDeadline} onChange={(e) => setImpactForm((f) => ({ ...f, handoverDeadline: e.target.value }))} />
                                        </div>
                                    </>
                                ) : (
                                    <div className="resign-for-manager-grid">
                                        <div><span className="label">Dự án</span><span>{detail.current_project || '—'}</span></div>
                                        <div><span className="label">Mức ảnh hưởng</span><span>{detail.impact_level || '—'}</span></div>
                                        <div><span className="label">Kế hoạch bàn giao</span><span>{detail.handover_plan || '—'}</span></div>
                                        <div><span className="label">Người tiếp nhận</span><span>{detail.temporary_replacement || '—'}</span></div>
                                        <div><span className="label">Hạn bàn giao</span><span>{formatDate(detail.handover_deadline)}</span></div>
                                    </div>
                                )}
                            </section>

                            {/* Block 3 – Rủi ro */}
                            <section className="resign-for-manager-block">
                                <h3>3. Rủi ro</h3>
                                {detail.status === 'PENDING_DIRECT_MANAGER' ? (
                                    <div className="resign-for-manager-checkboxes">
                                        <label><input type="checkbox" checked={impactForm.riskHasReplacement} onChange={(e) => setImpactForm((f) => ({ ...f, riskHasReplacement: e.target.checked }))} /> Có vị trí thay thế</label>
                                        <label><input type="checkbox" checked={impactForm.riskUrgentHire} onChange={(e) => setImpactForm((f) => ({ ...f, riskUrgentHire: e.target.checked }))} /> Cần tuyển gấp</label>
                                        <label><input type="checkbox" checked={impactForm.riskRevenue} onChange={(e) => setImpactForm((f) => ({ ...f, riskRevenue: e.target.checked }))} /> Ảnh hưởng doanh thu</label>
                                        <label><input type="checkbox" checked={impactForm.riskCustomer} onChange={(e) => setImpactForm((f) => ({ ...f, riskCustomer: e.target.checked }))} /> Ảnh hưởng khách hàng</label>
                                    </div>
                                ) : (
                                    <div className="resign-for-manager-checkboxes readonly">
                                        <span>{detail.risk_has_replacement ? '✓' : '—'} Có vị trí thay thế</span>
                                        <span>{detail.risk_urgent_hire ? '✓' : '—'} Cần tuyển gấp</span>
                                        <span>{detail.risk_revenue ? '✓' : '—'} Ảnh hưởng doanh thu</span>
                                        <span>{detail.risk_customer ? '✓' : '—'} Ảnh hưởng khách hàng</span>
                                    </div>
                                )}
                            </section>

                            {/* Block 4 – Hành động */}
                            <section className="resign-for-manager-block">
                                <h3>4. Hành động</h3>
                                {detail.status === 'PENDING_DIRECT_MANAGER' && (
                                    <>
                                        <div className="resign-for-manager-form-group">
                                            <label>Ghi chú nội bộ</label>
                                            <textarea value={impactForm.notes} onChange={(e) => setImpactForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Ghi chú (tùy chọn)" />
                                        </div>
                                        <div className="resign-for-manager-modal-actions">
                                            <button type="button" className="resign-for-manager-btn primary" onClick={handleSubmitImpact} disabled={submitLoading}>
                                                {submitLoading ? 'Đang xử lý...' : 'Xác nhận Impact & chuyển cấp'}
                                            </button>
                                        </div>
                                    </>
                                )}
                                {detail.status !== 'PENDING_DIRECT_MANAGER' && <p className="resign-for-manager-no-action">Đơn đã chuyển cấp hoặc đã đóng. Không có nút từ chối nghỉ.</p>}
                            </section>

                            {detail.reason && (
                                <section className="resign-for-manager-block">
                                    <h3>Lý do nghỉ</h3>
                                    <p>{detail.reason}</p>
                                </section>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResignationForManager;
