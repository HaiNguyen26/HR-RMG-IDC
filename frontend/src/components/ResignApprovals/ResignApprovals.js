import React, { useState, useEffect } from 'react';
import { resignationRequestsAPI } from '../../services/api';
import './ResignApprovals.css';

const STATUS_LABEL = {
    SUBMITTED: 'Chờ HR xác nhận',
    HR_ACKNOWLEDGED: 'HR đã xác nhận',
    PENDING_DIRECT_MANAGER: 'Chờ QL trực tiếp',
    PENDING_INDIRECT_MANAGER: 'Chờ QL gián tiếp',
    PENDING_BRANCH_DIRECTOR: 'Chờ GĐ chi nhánh',
    NOTICE_PERIOD_RUNNING: 'Đang thời gian báo trước',
    PRE_EXIT_CLEARANCE: 'Chờ clearance',
    LAST_WORKING_DAY: 'Ngày làm việc cuối',
    CONTRACT_LIQUIDATION: 'Thanh lý hợp đồng',
    CLOSED: 'Đã đóng'
};

const ResignApprovals = ({ currentUser, showToast }) => {
    const [activeTab, setActiveTab] = useState('hr');
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const [detail, setDetail] = useState(null);
    const [ackLoading, setAckLoading] = useState(false);
    const [directManagerForm, setDirectManagerForm] = useState({
        notes: '',
        currentProject: '',
        temporaryReplacement: '',
        workRiskNotes: ''
    });
    const [handoverForm, setHandoverForm] = useState({ title: '', description: '' });
    const [handoverAdding, setHandoverAdding] = useState(false);

    // Ưu tiên dùng employeeId (id bảng employees) để khớp với direct_manager_id / indirect_manager_id
    const employeeId = currentUser?.employeeId || currentUser?.employee_id || currentUser?.id;
    const showHandoverSection = detail && (detail.status === 'NOTICE_PERIOD_RUNNING' || detail.status === 'PRE_EXIT_CLEARANCE');

    const fetchList = async () => {
        setLoading(true);
        try {
            const params = {};
            if (activeTab === 'hr') {
                if (!employeeId) { setLoading(false); return; }
                params.forHr = 'true';
            } else if (activeTab === 'direct') {
                if (!employeeId) { setLoading(false); return; }
                params.forDirectManager = 'true';
                params.directManagerId = employeeId;
            } else if (activeTab === 'indirect') {
                if (!employeeId) { setLoading(false); return; }
                params.forIndirectManager = 'true';
                params.indirectManagerId = employeeId;
            } else if (activeTab === 'branch') {
                if (!employeeId) { setLoading(false); return; }
                params.forBranchDirector = 'true';
                params.branchDirectorId = employeeId;
            } else if (activeTab === 'clearance') {
                params.status = 'PRE_EXIT_CLEARANCE';
            } else if (activeTab === 'liquidation') {
                params.status = 'CONTRACT_LIQUIDATION';
            }
            const res = await resignationRequestsAPI.getAll(params);
            setList(res.data?.data || []);
        } catch (e) {
            console.error(e);
            if (showToast) showToast('Không tải được danh sách đơn nghỉ việc', 'error');
            setList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchList();
    }, [activeTab, employeeId]);

    const loadDetail = async (id) => {
        try {
            const res = await resignationRequestsAPI.getById(id);
            setDetail(res.data?.data || null);
            setSelected(id);
            setDirectManagerForm({ notes: '', currentProject: '', temporaryReplacement: '', workRiskNotes: '' });
        } catch (e) {
            if (showToast) showToast('Không tải được chi tiết đơn', 'error');
        }
    };

    const handleHrAcknowledge = async () => {
        if (!selected || !employeeId) return;
        setAckLoading(true);
        try {
            await resignationRequestsAPI.hrAcknowledge(selected, { hrEmployeeId: employeeId });
            if (showToast) showToast('Đã xác nhận tiếp nhận đơn.', 'success');
            setSelected(null);
            setDetail(null);
            fetchList();
        } catch (e) {
            if (showToast) showToast(e.response?.data?.message || 'Xác nhận thất bại', 'error');
        } finally {
            setAckLoading(false);
        }
    };

    const handleDirectManagerAcknowledge = async () => {
        if (!selected || !employeeId) return;
        setAckLoading(true);
        try {
            await resignationRequestsAPI.directManagerAcknowledge(selected, {
                managerEmployeeId: employeeId,
                notes: directManagerForm.notes,
                currentProject: directManagerForm.currentProject,
                temporaryReplacement: directManagerForm.temporaryReplacement,
                workRiskNotes: directManagerForm.workRiskNotes
            });
            if (showToast) showToast('Đã xác nhận. Đơn chuyển đến quản lý gián tiếp.', 'success');
            setSelected(null);
            setDetail(null);
            fetchList();
        } catch (e) {
            if (showToast) showToast(e.response?.data?.message || 'Xác nhận thất bại', 'error');
        } finally {
            setAckLoading(false);
        }
    };

    const handleIndirectManagerAcknowledge = async () => {
        if (!selected || !employeeId) return;
        setAckLoading(true);
        try {
            await resignationRequestsAPI.indirectManagerAcknowledge(selected, {
                managerEmployeeId: employeeId,
                notes: directManagerForm.notes
            });
            if (showToast) showToast('Đã xác nhận. Đơn chuyển đến GĐ chi nhánh.', 'success');
            setSelected(null);
            setDetail(null);
            fetchList();
        } catch (e) {
            if (showToast) showToast(e.response?.data?.message || 'Xác nhận thất bại', 'error');
        } finally {
            setAckLoading(false);
        }
    };

    const handleBranchDirectorAcknowledge = async () => {
        if (!selected || !employeeId) return;
        setAckLoading(true);
        try {
            await resignationRequestsAPI.branchDirectorAcknowledge(selected, {
                directorEmployeeId: employeeId,
                notes: directManagerForm.notes
            });
            if (showToast) showToast('Đã xác nhận. Bắt đầu thời gian báo trước.', 'success');
            setSelected(null);
            setDetail(null);
            fetchList();
        } catch (e) {
            if (showToast) showToast(e.response?.data?.message || 'Xác nhận thất bại', 'error');
        } finally {
            setAckLoading(false);
        }
    };

    const handleItClearance = async () => {
        if (!selected || !employeeId) return;
        setAckLoading(true);
        try {
            await resignationRequestsAPI.itClearance(selected, { employeeId });
            if (showToast) showToast('Đã xác nhận IT clearance.', 'success');
            loadDetail(selected);
            fetchList();
        } catch (e) {
            if (showToast) showToast(e.response?.data?.message || 'Thất bại', 'error');
        } finally {
            setAckLoading(false);
        }
    };

    const handleFinanceClearance = async () => {
        if (!selected || !employeeId) return;
        setAckLoading(true);
        try {
            await resignationRequestsAPI.financeClearance(selected, { employeeId });
            if (showToast) showToast('Đã xác nhận Finance clearance.', 'success');
            loadDetail(selected);
            fetchList();
        } catch (e) {
            if (showToast) showToast(e.response?.data?.message || 'Thất bại', 'error');
        } finally {
            setAckLoading(false);
        }
    };

    const handleCloseLiquidation = async () => {
        if (!selected) return;
        setAckLoading(true);
        try {
            await resignationRequestsAPI.close(selected);
            if (showToast) showToast('Đã đóng đơn (hoàn tất thanh lý).', 'success');
            setSelected(null);
            setDetail(null);
            fetchList();
        } catch (e) {
            if (showToast) showToast(e.response?.data?.message || 'Thất bại', 'error');
        } finally {
            setAckLoading(false);
        }
    };

    const handleAddHandover = async () => {
        if (!selected || !handoverForm.title?.trim()) return;
        setHandoverAdding(true);
        try {
            const items = detail?.handover_items || [];
            await resignationRequestsAPI.addHandover(selected, {
                title: handoverForm.title.trim(),
                description: (handoverForm.description || '').trim(),
                sort_order: items.length
            });
            if (showToast) showToast('Đã thêm mục bàn giao.', 'success');
            setHandoverForm({ title: '', description: '' });
            loadDetail(selected);
        } catch (e) {
            if (showToast) showToast(e.response?.data?.message || 'Thêm mục bàn giao thất bại', 'error');
        } finally {
            setHandoverAdding(false);
        }
    };

    const formatDate = (d) => (!d ? '-' : new Date(d).toLocaleDateString('vi-VN'));

    return (
        <div className="resign-approvals-container">
            <h1 className="resign-approvals-title">Duyệt đơn xin nghỉ việc</h1>
            <p className="resign-approvals-desc">Chỉ xác nhận đã tiếp nhận (không từ chối). Hết hạn sẽ tự động chuyển bước.</p>
            <div className="resign-approvals-tabs">
                {['hr', 'direct', 'indirect', 'branch', 'clearance', 'liquidation'].map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        className={'resign-approvals-tab ' + (activeTab === tab ? 'active' : '')}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'hr' && 'Chờ HR'}
                        {tab === 'direct' && 'Chờ QL trực tiếp'}
                        {tab === 'indirect' && 'Chờ QL gián tiếp'}
                        {tab === 'branch' && 'Chờ GĐ chi nhánh'}
                        {tab === 'clearance' && 'Chờ Clearance (IT/Finance)'}
                        {tab === 'liquidation' && 'Thanh lý hợp đồng'}
                    </button>
                ))}
            </div>
            {loading ? (
                <div className="resign-approvals-loading">Đang tải...</div>
            ) : (
                <div className="resign-approvals-table-wrap">
                    <table className="resign-approvals-table">
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Nhân viên</th>
                                <th>Ngày nộp</th>
                                <th>Ngày dự kiến nghỉ</th>
                                <th>Lý do</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.length === 0 ? (
                                <tr><td colSpan={6}>Không có đơn nào trong danh sách này.</td></tr>
                            ) : (
                                list.map((row) => (
                                    <tr key={row.id} className={selected === row.id ? 'selected' : ''} onClick={() => loadDetail(row.id)}>
                                        <td>ĐN{String(row.id).padStart(6, '0')}</td>
                                        <td>{row.employee_name || '-'} {row.ma_nhan_vien ? '(' + row.ma_nhan_vien + ')' : ''}</td>
                                        <td>{formatDate(row.submitted_at)}</td>
                                        <td>{formatDate(row.intended_last_work_date)}</td>
                                        <td>{(row.reason || '').slice(0, 50)}{(row.reason || '').length > 50 ? '...' : ''}</td>
                                        <td><button type="button" className="resign-approvals-btn-ack" onClick={(e) => { e.stopPropagation(); loadDetail(row.id); }}>Xem / Xác nhận</button></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            {detail && (
                <div className="resign-approvals-modal-overlay" onClick={() => { setSelected(null); setDetail(null); }}>
                    <div className="resign-approvals-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="resign-approvals-modal-header">
                            <h2>Chi tiết đơn #{detail.id}</h2>
                            <button type="button" className="resign-approvals-modal-close" onClick={() => { setSelected(null); setDetail(null); }}>×</button>
                        </div>
                        <div className="resign-approvals-modal-body">
                            <p><strong>Nhân viên:</strong> {detail.employee_name} {detail.ma_nhan_vien ? '(' + detail.ma_nhan_vien + ')' : ''}</p>
                            <p><strong>Ngày nộp:</strong> {formatDate(detail.submitted_at)}</p>
                            <p><strong>Ngày dự kiến nghỉ:</strong> {formatDate(detail.intended_last_work_date)}</p>
                            <p><strong>Lý do:</strong> {detail.reason}</p>
                            {detail.notes && <p><strong>Ghi chú:</strong> {detail.notes}</p>}
                            <p><strong>Trạng thái:</strong> {STATUS_LABEL[detail.status] || detail.status}</p>
                            <p><strong>Báo trước tối thiểu:</strong> {detail.required_notice_days} ngày (HĐ: {detail.contract_type || '-'})</p>
                            {activeTab === 'clearance' && (
                                <>
                                    <p><strong>IT clearance:</strong> {detail.it_clearance_at ? 'Đã xác nhận ' + formatDate(detail.it_clearance_at) : 'Chưa xác nhận'}</p>
                                    <p><strong>Finance clearance:</strong> {detail.finance_clearance_at ? 'Đã xác nhận ' + formatDate(detail.finance_clearance_at) : 'Chưa xác nhận'}</p>
                                </>
                            )}
                            {activeTab === 'liquidation' && detail.contract_liquidation_deadline && (
                                <p><strong>Hạn thanh lý:</strong> {formatDate(detail.contract_liquidation_deadline)} (14 ngày)</p>
                            )}
                            {showHandoverSection && (
                                <div className="resign-approvals-handover-section">
                                    <h4>Checklist bàn giao</h4>
                                    <ul className="resign-approvals-handover-list">
                                        {(detail.handover_items || []).map((item) => (
                                            <li key={item.id} className={item.completed ? 'completed' : ''}>
                                                {item.title} {item.description ? `— ${item.description}` : ''}
                                                {item.completed && <span> ✓ {item.completed_at ? formatDate(item.completed_at) : ''}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="resign-approvals-handover-add">
                                        <input
                                            type="text"
                                            placeholder="Tiêu đề mục bàn giao"
                                            value={handoverForm.title}
                                            onChange={(e) => setHandoverForm((p) => ({ ...p, title: e.target.value }))}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Mô tả (tùy chọn)"
                                            value={handoverForm.description}
                                            onChange={(e) => setHandoverForm((p) => ({ ...p, description: e.target.value }))}
                                        />
                                        <button type="button" className="resign-approvals-btn-ack" onClick={handleAddHandover} disabled={handoverAdding || !handoverForm.title?.trim()}>
                                            {handoverAdding ? 'Đang thêm...' : 'Thêm mục bàn giao'}
                                        </button>
                                    </div>
                                </div>
                            )}
                            {activeTab === 'direct' && (
                                <>
                                    <div className="resign-approvals-form-group">
                                        <label>Dự án đang phụ trách</label>
                                        <input type="text" value={directManagerForm.currentProject} onChange={(e) => setDirectManagerForm((prev) => ({ ...prev, currentProject: e.target.value }))} placeholder="Tùy chọn" />
                                    </div>
                                    <div className="resign-approvals-form-group">
                                        <label>Người thay thế tạm thời</label>
                                        <input type="text" value={directManagerForm.temporaryReplacement} onChange={(e) => setDirectManagerForm((prev) => ({ ...prev, temporaryReplacement: e.target.value }))} placeholder="Tùy chọn" />
                                    </div>
                                    <div className="resign-approvals-form-group">
                                        <label>Rủi ro công việc</label>
                                        <input type="text" value={directManagerForm.workRiskNotes} onChange={(e) => setDirectManagerForm((prev) => ({ ...prev, workRiskNotes: e.target.value }))} placeholder="Tùy chọn" />
                                    </div>
                                    <div className="resign-approvals-form-group">
                                        <label>Ghi chú</label>
                                        <textarea value={directManagerForm.notes} onChange={(e) => setDirectManagerForm((prev) => ({ ...prev, notes: e.target.value }))} rows={2} />
                                    </div>
                                </>
                            )}
                            {(activeTab === 'indirect' || activeTab === 'branch') && (
                                <div className="resign-approvals-form-group">
                                    <label>Ghi chú</label>
                                    <textarea value={directManagerForm.notes} onChange={(e) => setDirectManagerForm((prev) => ({ ...prev, notes: e.target.value }))} rows={2} />
                                </div>
                            )}
                        </div>
                        <div className="resign-approvals-modal-footer">
                            <button type="button" className="resign-approvals-btn-cancel" onClick={() => { setSelected(null); setDetail(null); }}>Đóng</button>
                            {activeTab === 'hr' && <button type="button" className="resign-approvals-btn-primary" onClick={handleHrAcknowledge} disabled={ackLoading}>{ackLoading ? 'Đang xử lý...' : 'Xác nhận đã tiếp nhận'}</button>}
                            {activeTab === 'direct' && <button type="button" className="resign-approvals-btn-primary" onClick={handleDirectManagerAcknowledge} disabled={ackLoading}>{ackLoading ? 'Đang xử lý...' : 'Xác nhận đã tiếp nhận'}</button>}
                            {activeTab === 'indirect' && <button type="button" className="resign-approvals-btn-primary" onClick={handleIndirectManagerAcknowledge} disabled={ackLoading}>{ackLoading ? 'Đang xử lý...' : 'Xác nhận đã tiếp nhận'}</button>}
                            {activeTab === 'branch' && <button type="button" className="resign-approvals-btn-primary" onClick={handleBranchDirectorAcknowledge} disabled={ackLoading}>{ackLoading ? 'Đang xử lý...' : 'Xác nhận đã tiếp nhận'}</button>}
                            {activeTab === 'clearance' && (
                                <>
                                    {!detail.it_clearance_at && <button type="button" className="resign-approvals-btn-primary" onClick={handleItClearance} disabled={ackLoading}>Xác nhận IT clearance</button>}
                                    {!detail.finance_clearance_at && <button type="button" className="resign-approvals-btn-primary" onClick={handleFinanceClearance} disabled={ackLoading}>Xác nhận Finance clearance</button>}
                                </>
                            )}
                            {activeTab === 'liquidation' && <button type="button" className="resign-approvals-btn-primary" onClick={handleCloseLiquidation} disabled={ackLoading}>{ackLoading ? 'Đang xử lý...' : 'Hoàn tất thanh lý / Đóng đơn'}</button>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResignApprovals;
