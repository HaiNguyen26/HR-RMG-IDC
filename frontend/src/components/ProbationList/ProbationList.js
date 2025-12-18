import React, { useState, useEffect } from 'react';
import { employeesAPI, candidatesAPI, interviewRequestsAPI } from '../../services/api';
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
    const [showProbationStatusModal, setShowProbationStatusModal] = useState(false);
    const [selectedProbationCandidate, setSelectedProbationCandidate] = useState(null);

    // Update currentTime every second for countdown timer
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        checkManagerAccess();
    }, [currentUser]);

    useEffect(() => {
        // HR hoặc Manager có thể xem danh sách thử việc
        if (isManager || currentUser?.role === 'HR') {
            fetchCandidates();
        }
    }, [isManager, currentUser]);

    const checkManagerAccess = async () => {
        if (!currentUser?.id) {
            setIsManager(false);
            return;
        }

        // HR có thể xem tất cả ứng viên thử việc
        if (currentUser?.role === 'HR') {
            setIsManager(true);
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

            // Kiểm tra quản lý trực tiếp
            const isDirectManager = employees.some((emp) => {
                if (!emp.quan_ly_truc_tiep) return false;
                const managerName = (emp.quan_ly_truc_tiep || '').trim();
                const normalizedManagerName = normalizeText(managerName);
                return normalizedManagerName === normalizedCurrentName;
            });

            // Kiểm tra giám đốc chi nhánh
            const isBranchDirector = employees.some((emp) => {
                if (!emp.quan_ly_gian_tiep) return false;
                const directorName = (emp.quan_ly_gian_tiep || '').trim();
                const normalizedDirectorName = normalizeText(directorName);
                return normalizedDirectorName === normalizedCurrentName;
            });

            setIsManager(isDirectManager || isBranchDirector);
        } catch (error) {
            console.error('Error checking manager access:', error);
            setIsManager(false);
        }
    };

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            // Fetch all probation candidates
            const candidatesResponse = await candidatesAPI.getAll({ status: 'ON_PROBATION' });
            if (!candidatesResponse.data?.success) {
                setCandidates([]);
                setLoading(false);
                return;
            }

            const allCandidates = candidatesResponse.data.data || [];
            console.log(`[ProbationList] Found ${allCandidates.length} candidates with ON_PROBATION status`);

            // Get current user info
            const currentUserName = (currentUser.hoTen || currentUser.username || '').trim();
            console.log(`[ProbationList] Current user name: "${currentUserName}"`);
            
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

            // Fetch employees to get manager IDs
            const employeesResponse = await employeesAPI.getAll();
            const employees = employeesResponse.data?.data || [];
            console.log(`[ProbationList] Found ${employees.length} employees`);
            
            // Find current user's employee ID
            const currentEmployee = employees.find(emp => {
                const empName = normalizeText(emp.ho_ten || emp.hoTen || '');
                return empName === normalizedCurrentName;
            });

            if (!currentEmployee) {
                console.warn(`[ProbationList] Current user "${currentUserName}" not found in employees list`);
                // For debugging: show all candidates if employee not found
                setCandidates(allCandidates);
                setLoading(false);
                return;
            }

            console.log(`[ProbationList] Current employee ID: ${currentEmployee.id}`);

            // Fetch interview requests to get manager and branch director info
            const interviewRequestsResponse = await interviewRequestsAPI.getAll();
            const interviewRequests = interviewRequestsResponse.data?.data || [];
            console.log(`[ProbationList] Found ${interviewRequests.length} interview requests`);

            // HR có thể xem tất cả ứng viên thử việc
            if (currentUser?.role === 'HR') {
                setCandidates(allCandidates);
                setLoading(false);
                return;
            }

            // Filter candidates based on manager access
            const filteredCandidates = allCandidates.filter(candidate => {
                // Find interview request for this candidate
                const candidateId = candidate.id || candidate.candidateId;
                const interviewRequest = interviewRequests.find(ir => {
                    const irCandidateId = ir.candidate_id || ir.candidateId;
                    return irCandidateId === candidateId;
                });

                if (!interviewRequest) {
                    console.log(`[ProbationList] No interview request found for candidate ${candidateId}`);
                    return false;
                }

                // Get manager and branch director IDs from interview request
                const managerId = interviewRequest.manager_id || interviewRequest.managerId;
                const branchDirectorId = interviewRequest.branch_director_id || interviewRequest.branchDirectorId;
                const currentEmployeeId = currentEmployee.id;

                // Check if current user is the direct manager
                const isDirectManager = managerId === currentEmployeeId;

                // Check if current user is the branch director
                const isBranchDirector = branchDirectorId === currentEmployeeId;

                const hasAccess = isDirectManager || isBranchDirector;
                
                if (!hasAccess) {
                    console.log(`[ProbationList] Candidate ${candidateId} filtered out - Manager: ${managerId}, Director: ${branchDirectorId}, Current: ${currentEmployeeId}`);
                }

                return hasAccess;
            });

            console.log(`[ProbationList] Found ${filteredCandidates.length} candidates out of ${allCandidates.length} total probation candidates`);
            setCandidates(filteredCandidates);
        } catch (error) {
            console.error('Error fetching probation candidates:', error);
            if (showToast) {
                showToast('Lỗi khi tải danh sách ứng viên thử việc', 'error');
            }
            setCandidates([]);
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

    const calculateProbationCountdown = (probationStartDate) => {
        if (!probationStartDate) return null;
        const startDate = new Date(probationStartDate);
        if (isNaN(startDate.getTime())) return null;

        // Đặt thời gian về 00:00:00 của ngày bắt đầu thử việc
        const startDateStart = new Date(startDate);
        startDateStart.setHours(0, 0, 0, 0);

        const now = new Date(currentTime);
        now.setHours(0, 0, 0, 0);

        // Nếu ngày bắt đầu thử việc còn xa (chưa đến)
        if (startDateStart.getTime() > now.getTime()) {
            // Đếm ngược đến ngày bắt đầu
            const diffTime = startDateStart.getTime() - currentTime.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            return {
                daysUntilStart: diffDays,
                daysSince: 0,
                daysRemaining: 45,
                totalSeconds: Math.max(0, Math.floor(diffTime / 1000)),
                hasStarted: false,
                canEvaluate: false
            };
        } else {
            // Đã bắt đầu thử việc, đếm 45 ngày từ ngày bắt đầu
            const daysSince = Math.floor((currentTime.getTime() - startDateStart.getTime()) / (1000 * 60 * 60 * 24));
            const endDate = new Date(startDateStart);
            endDate.setDate(endDate.getDate() + 45);
            endDate.setHours(23, 59, 59, 999);

            const diffTime = endDate.getTime() - currentTime.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            return {
                daysUntilStart: 0,
                daysSince: daysSince,
                daysRemaining: Math.max(0, diffDays),
                totalSeconds: Math.max(0, Math.floor(diffTime / 1000)),
                hasStarted: true,
                canEvaluate: diffDays <= 0
            };
        }
    };

    const canEvaluate = (probationStartDate) => {
        const result = calculateProbationCountdown(probationStartDate);
        return result !== null && result.canEvaluate;
    };

    const handleEvaluateClick = (candidate) => {
        if (!canEvaluate(candidate.probation_start_date)) {
            const countdownData = calculateProbationCountdown(candidate.probation_start_date);
            if (!countdownData?.hasStarted) {
                const daysUntil = countdownData?.daysUntilStart || 0;
                if (showToast) {
                    showToast(`Chưa đến ngày bắt đầu thử việc. Còn ${daysUntil} ngày nữa.`, 'warning');
                }
            } else {
                const remainingDays = countdownData?.daysRemaining || 0;
                if (showToast) {
                    showToast(`Chưa đủ 45 ngày kể từ ngày bắt đầu thử việc. Còn ${remainingDays} ngày nữa.`, 'warning');
                }
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
                                    <th>Ngày bắt đầu thử việc</th>
                                    <th>Số ngày</th>
                                    <th>Trạng thái</th>
                                    {isManager && <th>Hành động</th>}
                                    {currentUser?.role === 'HR' && <th>Chi tiết</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {candidates.map((candidate, index) => {
                                    const countdownData = calculateProbationCountdown(candidate.probation_start_date);
                                    const canEval = canEvaluate(candidate.probation_start_date);

                                    // Tính toán thời gian còn lại chính xác đến giây
                                    let formattedTime = '00:00:00';
                                    if (countdownData && countdownData.totalSeconds > 0) {
                                        const hours = Math.floor(countdownData.totalSeconds / 3600);
                                        const minutes = Math.floor((countdownData.totalSeconds % 3600) / 60);
                                        const seconds = countdownData.totalSeconds % 60;
                                        formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                                    }

                                    return (
                                        <tr 
                                            key={candidate.id}
                                            onClick={(e) => {
                                                // Chỉ mở modal khi là HR và không click vào button
                                                if (currentUser?.role === 'HR' && !e.target.closest('button')) {
                                                    setSelectedProbationCandidate(candidate);
                                                    setShowProbationStatusModal(true);
                                                }
                                            }}
                                            style={{ 
                                                cursor: currentUser?.role === 'HR' ? 'pointer' : 'default' 
                                            }}
                                        >
                                            <td>{index + 1}</td>
                                            <td className="probation-candidate-name">
                                                <strong>{candidate.ho_ten || candidate.hoTen || '-'}</strong>
                                            </td>
                                            <td>{getViTriLabel(candidate.vi_tri_ung_tuyen || candidate.viTriUngTuyen || '-')}</td>
                                            <td>{getPhongBanLabel(candidate.phong_ban || candidate.phongBan || '-')}</td>
                                            <td>{formatDate(candidate.probation_start_date)}</td>
                                            <td>
                                                {countdownData !== null ? (
                                                    <div className="probation-countdown-cell">
                                                        {!countdownData.hasStarted ? (
                                                            <div className="probation-days-waiting">
                                                                Chưa bắt đầu (Còn {countdownData.daysUntilStart} ngày)
                                                            </div>
                                                        ) : (
                                                            <div className={canEval ? 'probation-days-ready' : 'probation-days-waiting'}>
                                                                {countdownData.daysSince} ngày
                                                                {!canEval && countdownData.daysRemaining !== null && countdownData.daysRemaining > 0 && (
                                                                    <span className="probation-remaining-days"> (Còn {countdownData.daysRemaining} ngày)</span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {countdownData.totalSeconds > 0 && (
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
                                                    {countdownData?.hasStarted ? 'Đang thử việc' : 'Đang chờ thử việc'}
                                                </span>
                                            </td>
                                            {isManager && (
                                                <td>
                                                    <button
                                                        className={`probation-evaluate-btn ${canEval ? 'probation-evaluate-btn--ready' : 'probation-evaluate-btn--disabled'}`}
                                                        onClick={() => handleEvaluateClick(candidate)}
                                                        disabled={!canEval}
                                                        title={canEval ? 'Đánh giá quá trình thử việc' : countdownData?.hasStarted ? `Chưa đủ 45 ngày. Còn ${countdownData?.daysRemaining || 0} ngày nữa` : `Chưa đến ngày bắt đầu. Còn ${countdownData?.daysUntilStart || 0} ngày nữa`}
                                                    >
                                                        {canEval ? 'Đánh giá' : countdownData?.hasStarted ? `Còn ${countdownData?.daysRemaining || 0} ngày` : `Còn ${countdownData?.daysUntilStart || 0} ngày`}
                                                    </button>
                                                </td>
                                            )}
                                            {currentUser?.role === 'HR' && (
                                                <td>
                                                    <button
                                                        className="probation-evaluate-btn probation-evaluate-btn--ready"
                                                        onClick={() => {
                                                            setSelectedProbationCandidate(candidate);
                                                            setShowProbationStatusModal(true);
                                                        }}
                                                        title="Xem trạng thái thử việc"
                                                    >
                                                        Xem chi tiết
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

            {/* Probation Status Modal for HR */}
            {showProbationStatusModal && selectedProbationCandidate && (
                <div className="probation-status-modal-overlay" onClick={() => setShowProbationStatusModal(false)}>
                    <div className="probation-status-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="probation-status-modal-header">
                            <div className="probation-status-modal-header-content">
                                <svg className="probation-status-modal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <div>
                                    <h2 className="probation-status-modal-title">Trạng Thái Thử Việc (45 Ngày)</h2>
                                    <p className="probation-status-modal-subtitle">
                                        Ứng viên: <strong>{selectedProbationCandidate.ho_ten || selectedProbationCandidate.hoTen}</strong>
                                    </p>
                                </div>
                            </div>
                            <button className="probation-status-modal-close" onClick={() => setShowProbationStatusModal(false)}>
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>

                        <div className="probation-status-modal-body">
                            {(() => {
                                const countdownData = calculateProbationCountdown(selectedProbationCandidate.probation_start_date);
                                const startDate = selectedProbationCandidate.probation_start_date 
                                    ? new Date(selectedProbationCandidate.probation_start_date)
                                    : null;
                                const formattedStartDate = startDate 
                                    ? startDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                    : '-';

                                if (!countdownData) {
                                    return <div>Không có thông tin về thời gian thử việc</div>;
                                }

                                // Tính toán countdown chi tiết
                                let days = 0, hours = 0, minutes = 0, seconds = 0;
                                if (countdownData.totalSeconds > 0) {
                                    days = Math.floor(countdownData.totalSeconds / (24 * 3600));
                                    const remainingSeconds = countdownData.totalSeconds % (24 * 3600);
                                    hours = Math.floor(remainingSeconds / 3600);
                                    const remainingMinutes = remainingSeconds % 3600;
                                    minutes = Math.floor(remainingMinutes / 60);
                                    seconds = remainingMinutes % 60;
                                }

                                // Tính phần trăm tiến độ
                                const progressPercent = countdownData.hasStarted 
                                    ? Math.min(100, Math.max(0, (countdownData.daysSince / 45) * 100))
                                    : 0;

                                return (
                                    <div className="probation-status-content">
                                        <div className="probation-status-card">
                                            {!countdownData.hasStarted ? (
                                                <>
                                                    <div className="probation-status-left">
                                                        <div className="probation-status-label">Ngày bắt đầu sau:</div>
                                                        <div className="probation-status-countdown">
                                                            <div className="probation-status-countdown-digits">
                                                                <span className="probation-status-digit">{String(days).padStart(2, '0')}</span>
                                                                <span className="probation-status-separator">:</span>
                                                                <span className="probation-status-digit">{String(hours).padStart(2, '0')}</span>
                                                                <span className="probation-status-separator">:</span>
                                                                <span className="probation-status-digit">{String(minutes).padStart(2, '0')}</span>
                                                                <span className="probation-status-separator">:</span>
                                                                <span className="probation-status-digit">{String(seconds).padStart(2, '0')}</span>
                                                            </div>
                                                            <div className="probation-status-labels">
                                                                <span>NGÀY</span>
                                                                <span>GIỜ</span>
                                                                <span>PHÚT</span>
                                                                <span>GIÂY</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="probation-status-right">
                                                        <div className="probation-status-title">Chờ Bắt Đầu</div>
                                                        <div className="probation-status-date">Bắt đầu vào {formattedStartDate}.</div>
                                                        <div className="probation-status-progress-wrapper">
                                                            <div className="probation-status-progress-bar">
                                                                <div className="probation-status-progress-fill" style={{ width: '0%' }}></div>
                                                            </div>
                                                            <div className="probation-status-progress-labels">
                                                                <span>0 Ngày</span>
                                                                <span>0%</span>
                                                                <span>45 Ngày</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="probation-status-left">
                                                        <div className="probation-status-label">Thời gian còn lại:</div>
                                                        <div className="probation-status-countdown">
                                                            <div className="probation-status-countdown-digits">
                                                                <span className="probation-status-digit">{String(days).padStart(2, '0')}</span>
                                                                <span className="probation-status-separator">:</span>
                                                                <span className="probation-status-digit">{String(hours).padStart(2, '0')}</span>
                                                                <span className="probation-status-separator">:</span>
                                                                <span className="probation-status-digit">{String(minutes).padStart(2, '0')}</span>
                                                                <span className="probation-status-separator">:</span>
                                                                <span className="probation-status-digit">{String(seconds).padStart(2, '0')}</span>
                                                            </div>
                                                            <div className="probation-status-labels">
                                                                <span>NGÀY</span>
                                                                <span>GIỜ</span>
                                                                <span>PHÚT</span>
                                                                <span>GIÂY</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="probation-status-right">
                                                        <div className="probation-status-title">Đang Thử Việc</div>
                                                        <div className="probation-status-date">Bắt đầu vào {formattedStartDate}.</div>
                                                        <div className="probation-status-progress-wrapper">
                                                            <div className="probation-status-progress-bar">
                                                                <div className="probation-status-progress-fill" style={{ width: `${progressPercent}%` }}></div>
                                                            </div>
                                                            <div className="probation-status-progress-labels">
                                                                <span>{countdownData.daysSince} Ngày</span>
                                                                <span>{Math.round(progressPercent)}%</span>
                                                                <span>45 Ngày</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProbationList;

