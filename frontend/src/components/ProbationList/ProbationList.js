import React, { useState, useEffect } from 'react';
import { employeesAPI } from '../../services/api';
import './ProbationList.css';

const ProbationList = ({ currentUser, showToast }) => {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
    const [evaluationData, setEvaluationData] = useState({
        result: '',
        notes: ''
    });
    const [evaluationErrors, setEvaluationErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [isManager, setIsManager] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update currentTime every second for countdown timer
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchCandidates();
        checkManagerAccess();
    }, [currentUser]);

    const checkManagerAccess = async () => {
        if (!currentUser?.id) {
            setIsManager(false);
            return;
        }

        try {
            const employeesResponse = await employeesAPI.getAll();
            const employees = employeesResponse.data?.data || [];
            const currentUserName = (currentUser.hoTen || currentUser.username || '').trim();

            const normalizeText = (text) => {
                if (!text) return '';
                return text
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/đ/g, 'd')
                    .replace(/Đ/g, 'd')
                    .replace(/\s+/g, ' ')
                    .trim();
            };

            const normalizedCurrentName = normalizeText(currentUserName);

            const isDirectManager = employees.some((emp) => {
                if (!emp.quan_ly_truc_tiep) return false;
                const managerName = (emp.quan_ly_truc_tiep || '').trim();
                const normalizedManagerName = normalizeText(managerName);
                return normalizedManagerName === normalizedCurrentName;
            });

            setIsManager(isDirectManager);
        } catch (error) {
            console.error('Error checking manager access:', error);
            setIsManager(false);
        }
    };

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            // Module tuyển dụng đã bị xóa
            setCandidates([]);
        } catch (error) {
            console.error('Error fetching probation candidates:', error);
            if (showToast) {
                showToast('Module tuyển dụng đã bị xóa', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const calculateDaysSinceJobOffer = (jobOfferDate) => {
        if (!jobOfferDate) return null;
        const offerDate = new Date(jobOfferDate);
        if (isNaN(offerDate.getTime())) return null;

        // Đặt thời gian về 00:00:00 của ngày xuất thư để tính chính xác
        const offerDateStart = new Date(offerDate);
        offerDateStart.setHours(0, 0, 0, 0);

        // Tính thời gian còn lại đến ngày đánh giá (45 ngày sau)
        const targetDate = new Date(offerDateStart);
        targetDate.setDate(targetDate.getDate() + 45);
        targetDate.setHours(23, 59, 59, 999);

        const diffTime = targetDate.getTime() - currentTime.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        return {
            daysSince: Math.floor((currentTime.getTime() - offerDateStart.getTime()) / (1000 * 60 * 60 * 24)),
            daysRemaining: diffDays,
            totalSeconds: Math.max(0, Math.floor(diffTime / 1000)),
            canEvaluate: diffDays <= 0
        };
    };

    const canEvaluate = (jobOfferDate) => {
        const result = calculateDaysSinceJobOffer(jobOfferDate);
        return result !== null && result.canEvaluate;
    };

    const handleEvaluateClick = (candidate) => {
        if (!canEvaluate(candidate.job_offer_sent_date)) {
            const countdownData = calculateDaysSinceJobOffer(candidate.job_offer_sent_date);
            const remainingDays = countdownData?.daysRemaining || 0;
            if (showToast) {
                showToast(`Chưa đủ 45 ngày kể từ ngày xuất thư tuyển dụng. Còn ${remainingDays} ngày nữa.`, 'warning');
            }
            return;
        }

        setSelectedCandidate(candidate);
        setEvaluationData({ result: '', notes: '' });
        setEvaluationErrors({});
        setIsEvaluationModalOpen(true);
    };

    const handleEvaluationSubmit = async () => {
        // Validate
        const errors = {};
        if (!evaluationData.result) {
            errors.result = 'Vui lòng chọn kết quả đánh giá';
        }
        if (Object.keys(errors).length > 0) {
            setEvaluationErrors(errors);
            return;
        }

        setSubmitting(true);
        try {
            // Module tuyển dụng đã bị xóa
            throw new Error('Module tuyển dụng đã bị xóa');
        } catch (error) {
            console.error('Error evaluating probation:', error);
            if (showToast) {
                const errorMessage = error.response?.data?.message || 'Không thể đánh giá quá trình thử việc';
                showToast(errorMessage, 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const getViTriLabel = (value) => {
        if (!value) return '-';
        const viTriMap = {
            'MUAHANG': 'Mua hàng',
            'TAPVU_NAUAN': 'Tạp vụ & nấu ăn',
            'HAN_BOMACH': 'Hàn bo mạch',
            'CHATLUONG': 'Chất lượng',
            'KHAOSAT_THIETKE': 'Khảo sát thiết kế',
            'ADMIN_DUAN': 'Admin dự án',
            'LAPRAP': 'Lắp ráp',
            'LAPRAP_JIG_PALLET': 'Lắp ráp JIG, Pallet',
            'DIEN_LAPTRINH_PLC': 'Điện lập trình PLC',
            'THIETKE_MAY_TUDONG': 'Thiết kế máy tự động',
            'VANHANH_MAY_CNC': 'Vận hành máy CNC',
            'DICHVU_KYTHUAT': 'Dịch vụ Kỹ thuật',
            'KETOAN_NOIBO': 'Kế toán nội bộ',
            'KETOAN_BANHANG': 'Kế toán bán hàng',
            'CHUYEN_VIEN': 'Chuyên viên',
            'TRUONG_PHONG': 'Trưởng phòng',
            'PHO_TRUONG_PHONG': 'Phó trưởng phòng',
            'NHAN_VIEN': 'Nhân viên',
            'KY_SU': 'Kỹ sư',
            'THO': 'Thợ',
            'QUAN_LY': 'Quản lý'
        };
        return viTriMap[value] || value;
    };

    const getPhongBanLabel = (value) => {
        const phongBanMap = {
            'MUAHANG': 'Mua hàng',
            'HANHCHINH': 'Hành chính',
            'DVDT': 'DVĐT',
            'QA': 'QA',
            'KHAOSAT_THIETKE': 'Khảo sát thiết kế',
            'TUDONG': 'Tự động',
            'CNC': 'CNC',
            'DICHVU_KYTHUAT': 'Dịch vụ kỹ thuật',
            'KETOAN': 'Kế toán'
        };
        return phongBanMap[value] || value;
    };

    if (loading) {
        return (
            <div className="probation-list-container">
                <div className="probation-list-loading">
                    <div className="loading-spinner"></div>
                    <p>Đang tải danh sách...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="probation-list-container">
            <div className="probation-list-header">
                <div className="probation-list-header-content">
                    <div className="probation-list-icon">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                            </path>
                        </svg>
                    </div>
                    <div>
                        <h1 className="probation-list-title">Danh sách thử việc</h1>
                        <p className="probation-list-subtitle">Quản lý và đánh giá quá trình thử việc của ứng viên</p>
                    </div>
                </div>
            </div>

            <div className="probation-list-content">
                {candidates.length === 0 ? (
                    <div className="probation-list-empty">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                            </path>
                        </svg>
                        <p>Chưa có ứng viên nào đang thử việc</p>
                    </div>
                ) : (
                    <div className="probation-list-table-wrapper">
                        <table className="probation-list-table">
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Họ tên</th>
                                    <th>Vị trí</th>
                                    <th>Phòng ban</th>
                                    <th>Ngày xuất thư</th>
                                    <th>Số ngày</th>
                                    <th>Trạng thái</th>
                                    {isManager && <th>Hành động</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {candidates.map((candidate, index) => {
                                    const countdownData = calculateDaysSinceJobOffer(candidate.job_offer_sent_date);
                                    const canEval = canEvaluate(candidate.job_offer_sent_date);

                                    // Tính toán thời gian còn lại chính xác đến giây
                                    let formattedTime = '00:00:00';
                                    if (countdownData && countdownData.totalSeconds > 0) {
                                        const hours = Math.floor(countdownData.totalSeconds / 3600);
                                        const minutes = Math.floor((countdownData.totalSeconds % 3600) / 60);
                                        const seconds = countdownData.totalSeconds % 60;
                                        formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                                    }

                                    return (
                                        <tr key={candidate.id}>
                                            <td>{index + 1}</td>
                                            <td className="probation-candidate-name">
                                                <strong>{candidate.ho_ten || candidate.hoTen || '-'}</strong>
                                            </td>
                                            <td>{getViTriLabel(candidate.vi_tri_ung_tuyen || candidate.viTriUngTuyen || '-')}</td>
                                            <td>{getPhongBanLabel(candidate.phong_ban || candidate.phongBan || '-')}</td>
                                            <td>{formatDate(candidate.job_offer_sent_date)}</td>
                                            <td>
                                                {countdownData !== null ? (
                                                    <div className="probation-countdown-cell">
                                                        <div className={canEval ? 'probation-days-ready' : 'probation-days-waiting'}>
                                                            {countdownData.daysSince} ngày
                                                            {!canEval && countdownData.daysRemaining !== null && countdownData.daysRemaining > 0 && (
                                                                <span className="probation-remaining-days"> (Còn {countdownData.daysRemaining} ngày)</span>
                                                            )}
                                                        </div>
                                                        {!canEval && countdownData.daysRemaining > 0 && (
                                                            <div className="probation-digital-countdown">
                                                                <div className="probation-digital-time">
                                                                    {formattedTime.split('').map((char, idx) => (
                                                                        <span key={idx} className={char === ':' ? 'probation-countdown-separator' : 'probation-countdown-digit'}>
                                                                            {char}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                <div className="probation-digital-labels">
                                                                    <span>Giờ</span>
                                                                    <span>Phút</span>
                                                                    <span>Giây</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td>
                                                <span className="probation-status-badge probation-status-badge--active">
                                                    Đang thử việc
                                                </span>
                                            </td>
                                            {isManager && (
                                                <td>
                                                    <button
                                                        className={`probation-evaluate-btn ${canEval ? 'probation-evaluate-btn--ready' : 'probation-evaluate-btn--disabled'}`}
                                                        onClick={() => handleEvaluateClick(candidate)}
                                                        disabled={!canEval}
                                                        title={canEval ? 'Đánh giá quá trình thử việc' : `Chưa đủ 45 ngày. Còn ${countdownData?.daysRemaining || 0} ngày nữa`}
                                                    >
                                                        {canEval ? 'Đánh giá' : `Còn ${countdownData?.daysRemaining || 0} ngày`}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Evaluation Modal */}
            {isEvaluationModalOpen && selectedCandidate && (
                <div className="probation-evaluation-modal-overlay" onClick={() => setIsEvaluationModalOpen(false)}>
                    <div className="probation-evaluation-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="probation-evaluation-modal-header">
                            <div className="probation-evaluation-modal-header-content">
                                <svg className="probation-evaluation-modal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z">
                                    </path>
                                </svg>
                                <div>
                                    <h2 className="probation-evaluation-modal-title">Đánh giá quá trình thử việc</h2>
                                    <p className="probation-evaluation-modal-subtitle">
                                        Ứng viên: <strong>{selectedCandidate.ho_ten || selectedCandidate.hoTen}</strong>
                                    </p>
                                </div>
                            </div>
                            <button className="probation-evaluation-modal-close" onClick={() => setIsEvaluationModalOpen(false)}>
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>

                        <div className="probation-evaluation-modal-body">
                            <div className="probation-evaluation-form">
                                <div className="probation-evaluation-form-group">
                                    <label className="probation-evaluation-form-label">
                                        Kết quả đánh giá <span className="required">*</span>
                                    </label>
                                    <div className="probation-evaluation-radio-group">
                                        <label className="probation-evaluation-radio">
                                            <input
                                                type="radio"
                                                name="evaluationResult"
                                                value="PASSED"
                                                checked={evaluationData.result === 'PASSED'}
                                                onChange={(e) => {
                                                    setEvaluationData({ ...evaluationData, result: e.target.value });
                                                    if (evaluationErrors.result) {
                                                        setEvaluationErrors({ ...evaluationErrors, result: '' });
                                                    }
                                                }}
                                            />
                                            <span className="probation-evaluation-radio-label probation-evaluation-radio-label--passed">
                                                Đạt
                                            </span>
                                        </label>
                                        <label className="probation-evaluation-radio">
                                            <input
                                                type="radio"
                                                name="evaluationResult"
                                                value="FAILED"
                                                checked={evaluationData.result === 'FAILED'}
                                                onChange={(e) => {
                                                    setEvaluationData({ ...evaluationData, result: e.target.value });
                                                    if (evaluationErrors.result) {
                                                        setEvaluationErrors({ ...evaluationErrors, result: '' });
                                                    }
                                                }}
                                            />
                                            <span className="probation-evaluation-radio-label probation-evaluation-radio-label--failed">
                                                Không đạt
                                            </span>
                                        </label>
                                    </div>
                                    {evaluationErrors.result && (
                                        <span className="probation-evaluation-error">{evaluationErrors.result}</span>
                                    )}
                                </div>

                                <div className="probation-evaluation-form-group">
                                    <label className="probation-evaluation-form-label">Ghi chú</label>
                                    <textarea
                                        className="probation-evaluation-form-textarea"
                                        rows="4"
                                        placeholder="Nhập ghi chú về quá trình thử việc (tùy chọn)"
                                        value={evaluationData.notes}
                                        onChange={(e) => setEvaluationData({ ...evaluationData, notes: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="probation-evaluation-modal-footer">
                            <button
                                className="probation-evaluation-btn probation-evaluation-btn--cancel"
                                onClick={() => setIsEvaluationModalOpen(false)}
                                disabled={submitting}
                            >
                                Hủy
                            </button>
                            <button
                                className="probation-evaluation-btn probation-evaluation-btn--submit"
                                onClick={handleEvaluationSubmit}
                                disabled={submitting}
                            >
                                {submitting ? 'Đang xử lý...' : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProbationList;

