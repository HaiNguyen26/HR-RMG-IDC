import React, { useState, useEffect, useRef } from 'react';
import { employeesAPI, recruitmentRequestsAPI, interviewRequestsAPI, candidatesAPI, interviewEvaluationsAPI } from '../../services/api';
import './InterviewApprovals.css';

// Custom Dropdown Component
const CustomDropdown = ({ id, name, value, onChange, options, placeholder, error, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const menuRef = useRef(null);

    const selectedOption = options.find(opt => String(opt.value) === String(value)) || null;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                menuRef.current &&
                !menuRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 0);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (option, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (option.value === '' || option.value === null || option.value === undefined) {
            return;
        }
        const eventObject = {
            target: {
                name: name || id,
                value: option.value
            }
        };
        onChange(eventObject);
        setIsOpen(false);
    };

    const displayOptions = options.filter(opt => {
        if (!opt) return false;
        if (opt.value === '' || opt.value === null || opt.value === undefined) return false;
        if (opt.label === null || opt.label === undefined) return false;
        return true;
    });

    return (
        <div className={`interview-dropdown-wrapper ${className} ${error ? 'error' : ''} ${isOpen ? 'open' : ''}`} ref={dropdownRef}>
            <button
                type="button"
                className={`interview-dropdown-trigger ${isOpen ? 'open' : ''} ${error ? 'error' : ''}`}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                onMouseDown={(e) => {
                    if (!isOpen) {
                        e.preventDefault();
                    }
                }}
            >
                <span className="interview-dropdown-value">
                    {selectedOption && String(selectedOption.value) !== '' ? selectedOption.label : placeholder}
                </span>
                <svg className="interview-dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
            {isOpen && displayOptions.length > 0 && (
                <div
                    ref={menuRef}
                    className="interview-dropdown-menu"
                >
                    {displayOptions.map((option, index) => (
                        <button
                            key={option.value !== null && option.value !== undefined && option.value !== ''
                                ? String(option.value)
                                : `option-${index}-${String(option.label || 'empty')}`}
                            type="button"
                            className={`interview-dropdown-option ${String(value) === String(option.value) ? 'selected' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelect(option, e);
                            }}
                        >
                            {option.label || ''}
                        </button>
                    ))}
                </div>
            )}
            {isOpen && displayOptions.length === 0 && (
                <div
                    ref={menuRef}
                    className="interview-dropdown-menu"
                >
                    <div style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                        Không có dữ liệu
                    </div>
                </div>
            )}
        </div>
    );
};

const InterviewApprovals = ({ currentUser, showToast, showConfirm }) => {
    const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'ready', 'approved', 'rejected', 'recruitment'
    const [isRecruitmentModalOpen, setIsRecruitmentModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isBranchDirector, setIsBranchDirector] = useState(false);
    const [recruitmentRequests, setRecruitmentRequests] = useState([]);
    const [interviewRequests, setInterviewRequests] = useState([]);
    const [readyInterviewRequests, setReadyInterviewRequests] = useState([]);
    // Separate states for counts (for badges) and details (for table display)
    const [interviewRequestsCount, setInterviewRequestsCount] = useState(0);
    const [readyInterviewRequestsCount, setReadyInterviewRequestsCount] = useState(0);
    const [selectedInterviewRequest, setSelectedInterviewRequest] = useState(null);
    const [showInterviewRequestDetail, setShowInterviewRequestDetail] = useState(false);
    const [viewingCandidate, setViewingCandidate] = useState(null);
    const [showCandidateDetailModal, setShowCandidateDetailModal] = useState(false);
    const [loadingCandidate, setLoadingCandidate] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showRequestDetail, setShowRequestDetail] = useState(false);
    const [isHrRecruitmentModalOpen, setIsHrRecruitmentModalOpen] = useState(false);
    const [hrRecruitmentRequests, setHrRecruitmentRequests] = useState([]);
    const [pendingRecruitmentCount, setPendingRecruitmentCount] = useState(0);

    // Evaluation modal state
    const [showEvaluationModal, setShowEvaluationModal] = useState(false);
    const [selectedEvaluationRequest, setSelectedEvaluationRequest] = useState(null);
    const [evaluationForm, setEvaluationForm] = useState({
        tenUngVien: '',
        viTriUngTuyen: '',
        capBac: '',
        nguoiQuanLyTrucTiep: '',
        nguoiPhongVan1: '',
        ngayPhongVan: '',
        diemKyNangGiaoTiep: '',
        lyDoKyNangGiaoTiep: '',
        diemThaiDoLamViec: '',
        lyDoThaiDoLamViec: '',
        diemKinhNghiemChuyenMon: '',
        lyDoKinhNghiemChuyenMon: '',
        diemKhaNangQuanLyDuAn: '',
        lyDoKhaNangQuanLyDuAn: '',
        diemNgoaiNgu: '',
        lyDoNgoaiNgu: '',
        diemKyNangQuanLy: '',
        lyDoKyNangQuanLy: '',
        diemManh: '',
        diemCanCaiThien: '',
        nhanXetChung: '',
        ketLuan: ''
    });
    const [savingEvaluation, setSavingEvaluation] = useState(false);
    const [currentUserHasEvaluated, setCurrentUserHasEvaluated] = useState(false);
    const [bothEvaluated, setBothEvaluated] = useState(false);
    const [isEvaluationReadOnly, setIsEvaluationReadOnly] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Dropdown options
    const [jobTitles, setJobTitles] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    // Form state for recruitment request
    const [recruitmentForm, setRecruitmentForm] = useState({
        // PHẦN I: Vị trí & Nhu cầu
        chucDanhCanTuyen: '',
        phongBanBoPhan: '',
        nguoiQuanLyTrucTiep: '',
        moTaCongViec: 'chua_co', // 'co' or 'chua_co'
        yeuCauChiTietCongViec: '',
        lyDoKhacGhiChu: '',
        soLuongYeuCau: '1',
        loaiLaoDong: 'toan_thoi_gian', // 'toan_thoi_gian' or 'thoi_vu'
        nguoiQuanLyGianTiep: '',
        lyDoTuyen: 'nhu_cau_tang', // 'thay_the', 'nhu_cau_tang', 'vi_tri_moi'
        // PHẦN II: Tiêu chuẩn Tuyển chọn
        gioiTinh: 'bat_ky', // 'bat_ky', 'nam', 'nu'
        doTuoi: '',
        trinhDoHocVanYeuCau: '',
        kinhNghiemChuyenMon: 'khong_yeu_cau', // 'khong_yeu_cau' or 'co_yeu_cau'
        chiTietKinhNghiem: '',
        kienThucChuyenMonKhac: '',
        yeuCauNgoaiNgu: '',
        yeuCauViTinhKyNangKhac: '',
        kyNangGiaoTiep: '',
        thaiDoLamViec: '',
        kyNangQuanLy: ''
    });

    const isHr = currentUser?.role === 'HR';

    // Candidates data - sẽ được fetch từ API
    const [candidates, setCandidates] = useState([]);

    // Check if user is branch director
    useEffect(() => {
        const checkBranchDirector = async () => {
            if (!currentUser?.id) return;

            try {
                const employeesRes = await employeesAPI.getAll();
                const employeesData = employeesRes.data?.data || [];

                const currentUserName = (currentUser.hoTen || currentUser.username || '').trim();
                const removeVietnameseAccents = (str) => {
                    if (!str) return '';
                    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
                };

                // Kiểm tra xem có nhân viên nào có quan_ly_gian_tiep trùng với tên user hiện tại không
                // Hoặc kiểm tra xem user có phải là giám đốc chi nhánh không (dựa trên chức danh hoặc tên)
                const branchDirectorNames = ['Châu Quang Hải', 'Nguyễn Ngọc Luyễn', 'Nguyễn Văn Khải'];
                const isBranchDir = employeesData.some(emp => {
                    const managerName = (emp.quan_ly_gian_tiep || '').trim();
                    const normalizedManagerName = managerName.toLowerCase().replace(/\s+/g, ' ').trim();
                    const normalizedCurrentName = currentUserName.toLowerCase().replace(/\s+/g, ' ').trim();
                    const normalizedManagerNameNoAccents = removeVietnameseAccents(normalizedManagerName);
                    const normalizedCurrentNameNoAccents = removeVietnameseAccents(normalizedCurrentName);

                    // Kiểm tra theo quan_ly_gian_tiep
                    if (normalizedManagerName === normalizedCurrentName ||
                        normalizedManagerNameNoAccents === normalizedCurrentNameNoAccents ||
                        normalizedManagerName.includes(normalizedCurrentName) ||
                        normalizedCurrentName.includes(normalizedManagerName)) {
                        return true;
                    }

                    // Kiểm tra xem user có phải là giám đốc chi nhánh không
                    return branchDirectorNames.some(dirName => {
                        const normalizedDirName = dirName.toLowerCase().replace(/\s+/g, ' ').trim();
                        const normalizedDirNameNoAccents = removeVietnameseAccents(normalizedDirName);
                        return normalizedDirName === normalizedCurrentName ||
                            normalizedDirNameNoAccents === normalizedCurrentNameNoAccents ||
                            normalizedDirName.includes(normalizedCurrentName) ||
                            normalizedCurrentName.includes(normalizedDirName);
                    });
                });

                setIsBranchDirector(isBranchDir);
            } catch (error) {
                console.error('Error checking branch director:', error);
            }
        };

        checkBranchDirector();
    }, [currentUser]);

    // Fetch recruitment requests for branch director
    useEffect(() => {
        const fetchRecruitmentRequests = async (silent = false) => {
            if (!isBranchDirector) return;

            if (!silent) setIsRefreshing(true);
            try {
                // Fetch pending requests for badge count
                const pendingResponse = await recruitmentRequestsAPI.getAll({
                    branchDirectorId: currentUser?.id,
                    status: 'PENDING'
                });
                const pendingRequests = pendingResponse.data?.data || [];
                setPendingRecruitmentCount(pendingRequests.length);

                // Fetch requests for current filter
                if (selectedFilter === 'recruitment') {
                    setRecruitmentRequests(pendingRequests);
                }
            } catch (error) {
                console.error('Error fetching recruitment requests:', error);
            } finally {
                if (!silent) {
                    setTimeout(() => setIsRefreshing(false), 300);
                }
            }
        };

        fetchRecruitmentRequests(false); // Lần đầu hiển thị loading
        // Realtime update: polling mỗi 5 giây (silent mode)
        const interval = setInterval(() => fetchRecruitmentRequests(true), 5000);
        return () => clearInterval(interval);
    }, [isBranchDirector, selectedFilter]);

    // Fetch interview requests counts for badges (luôn fetch để hiển thị badge đúng)
    useEffect(() => {
        const fetchInterviewRequestCounts = async (silent = false) => {
            // Allow fetch for branch directors, managers, team leads, and employees
            if (!['EMPLOYEE', 'MANAGER', 'TEAM_LEAD', 'BRANCH_DIRECTOR'].includes(currentUser?.role) && !isBranchDirector) return;

            if (!silent) setIsRefreshing(true);
            try {
                const params = {
                    managerId: currentUser?.id,
                    branchDirectorId: currentUser?.id
                };

                // Fetch tất cả requests để đếm
                const response = await interviewRequestsAPI.getAll(params);
                const allRequests = response.data?.data || [];

                // Lọc và đếm "Chờ duyệt phỏng vấn"
                const pendingRequests = allRequests.filter(req =>
                    req.status === 'PENDING_INTERVIEW' || req.status === 'WAITING_FOR_OTHER_APPROVAL'
                );
                setInterviewRequestsCount(pendingRequests.length);

                // Lọc và đếm "Sẵn sàng PV" - loại bỏ các ứng viên đã ON_PROBATION
                const readyRequests = allRequests.filter(req => {
                    if (req.status !== 'READY_FOR_INTERVIEW') return false;
                    // Loại bỏ nếu candidate đã ON_PROBATION
                    const candidateStatus = req.candidate_status;
                    return candidateStatus !== 'ON_PROBATION';
                });
                setReadyInterviewRequestsCount(readyRequests.length);
            } catch (error) {
                console.error('Error fetching interview request counts:', error);
            } finally {
                if (!silent) {
                    setTimeout(() => setIsRefreshing(false), 300);
                }
            }
        };

        fetchInterviewRequestCounts(false); // Lần đầu hiển thị loading
        // Realtime update: polling mỗi 5 giây (silent mode)
        const interval = setInterval(() => fetchInterviewRequestCounts(true), 5000);
        return () => clearInterval(interval);
    }, [isBranchDirector]);

    // Fetch interview requests details khi filter thay đổi (để hiển thị table)
    useEffect(() => {
        const fetchInterviewRequestsDetails = async (silent = false) => {
            // Allow fetch for branch directors, managers, team leads, and employees
            if (!['EMPLOYEE', 'MANAGER', 'TEAM_LEAD', 'BRANCH_DIRECTOR'].includes(currentUser?.role) && !isBranchDirector) return;

            if (!silent) setIsRefreshing(true);
            try {
                const params = {
                    managerId: currentUser?.id,
                    branchDirectorId: currentUser?.id
                };

                // Fetch "Chờ duyệt phỏng vấn" - PENDING_INTERVIEW hoặc WAITING_FOR_OTHER_APPROVAL
                if (selectedFilter === 'interview') {
                    const response = await interviewRequestsAPI.getAll(params);
                    const allRequests = response.data?.data || [];
                    const pendingRequests = allRequests.filter(req =>
                        req.status === 'PENDING_INTERVIEW' || req.status === 'WAITING_FOR_OTHER_APPROVAL'
                    );
                    setInterviewRequests(pendingRequests);
                }

                // Fetch "Sẵn sàng PV" - READY_FOR_INTERVIEW (loại bỏ các ứng viên đã ON_PROBATION)
                if (selectedFilter === 'ready') {
                    const readyParams = { ...params, status: 'READY_FOR_INTERVIEW' };
                    const readyResponse = await interviewRequestsAPI.getAll(readyParams);
                    const allReadyRequests = readyResponse.data?.data || [];
                    // Filter bỏ các ứng viên đã ON_PROBATION
                    const filteredReadyRequests = allReadyRequests.filter(req => {
                        const candidateStatus = req.candidate_status;
                        return candidateStatus !== 'ON_PROBATION';
                    });
                    setReadyInterviewRequests(filteredReadyRequests);
                }
            } catch (error) {
                console.error('Error fetching interview requests details:', error);
            } finally {
                if (!silent) {
                    setTimeout(() => setIsRefreshing(false), 300);
                }
            }
        };

        // Chỉ fetch details khi filter là 'interview' hoặc 'ready'
        if (selectedFilter === 'interview' || selectedFilter === 'ready') {
            fetchInterviewRequestsDetails(false); // Lần đầu hiển thị loading
            // Realtime update: polling mỗi 5 giây (silent mode)
            const interval = setInterval(() => fetchInterviewRequestsDetails(true), 5000);
            return () => clearInterval(interval);
        }
    }, [isBranchDirector, selectedFilter]);

    // HR fetch approved recruitment requests
    useEffect(() => {
        const fetchHrApproved = async () => {
            if (!isHrRecruitmentModalOpen || currentUser?.role !== 'HR') return;
            try {
                const res = await recruitmentRequestsAPI.getAll({ forHr: true });
                setHrRecruitmentRequests(res.data?.data || []);
            } catch (error) {
                console.error('Error fetching HR recruitment requests:', error);
            }
        };

        fetchHrApproved();
    }, [isHrRecruitmentModalOpen, currentUser?.role]);

    // Fetch dropdown options
    useEffect(() => {
        const fetchOptions = async () => {
            setLoadingOptions(true);
            try {
                const [jobTitlesRes, departmentsRes, employeesRes] = await Promise.all([
                    employeesAPI.getJobTitles(),
                    employeesAPI.getDepartments(),
                    employeesAPI.getAll()
                ]);

                const jobTitlesData = jobTitlesRes.data?.data || [];
                const departmentsData = departmentsRes.data?.data || [];
                const employeesData = employeesRes.data?.data || [];

                setJobTitles(jobTitlesData.map(title => ({ value: title, label: title })));
                setDepartments(departmentsData.map(dept => ({ value: dept, label: dept })));

                // Tự động điền người quản lý trực tiếp = currentUser.hoTen
                if (currentUser?.hoTen) {
                    setRecruitmentForm(prev => ({
                        ...prev,
                        nguoiQuanLyTrucTiep: currentUser.hoTen
                    }));
                }

                // Tự động điền người quản lý gián tiếp
                if (currentUser?.chiNhanh || currentUser?.chi_nhanh) {
                    const userBranch = currentUser.chiNhanh || currentUser.chi_nhanh;
                    const currentUserPosition = (currentUser.chucDanh || currentUser.chuc_danh || '').toLowerCase();

                    // Check if current user is a branch director (by position or hardcoded names)
                    const branchDirectorKeywords = ['giám đốc chi nhánh', 'giam doc chi nhanh', 'branch director'];
                    const branchDirectorNames = ['Châu Quang Hải', 'Nguyễn Ngọc Luyễn', 'Nguyễn Văn Khải'];
                    const currentUserName = currentUser.hoTen || currentUser.ho_ten || '';
                    const currentUserCode = currentUser.maNhanVien || currentUser.ma_nhan_vien || '';

                    const isCurrentUserBranchDirector =
                        branchDirectorKeywords.some(keyword => currentUserPosition.includes(keyword)) ||
                        branchDirectorNames.includes(currentUserName);

                    if (isCurrentUserBranchDirector) {
                        // If current user is branch director, set CEO as indirect manager
                        const ceo = employeesData.find(emp => {
                            const name = (emp.ho_ten || emp.hoTen || '').toLowerCase();
                            const position = (emp.chuc_danh || emp.chucDanh || '').toLowerCase();
                            const code = (emp.ma_nhan_vien || emp.maNhanVien || '').toLowerCase();
                            return name.includes('lê thanh tùng') ||
                                name.includes('le thanh tung') ||
                                code.includes('ceo') ||
                                position.includes('tổng giám đốc') ||
                                position.includes('tong giam doc') ||
                                position.includes('ceo') ||
                                position.includes('giám đốc điều hành');
                        });

                        if (ceo) {
                            console.log('✅ Current user is Branch Director, setting CEO as indirect manager:', {
                                currentUser: currentUserName,
                                currentUserCode: currentUserCode,
                                ceo: ceo.ho_ten || ceo.hoTen,
                                ceoCode: ceo.ma_nhan_vien || ceo.maNhanVien
                            });
                            setRecruitmentForm(prev => ({
                                ...prev,
                                nguoiQuanLyGianTiep: ceo.ho_ten || ceo.hoTen
                            }));
                        } else {
                            console.warn('⚠️ CEO not found in employees list!');
                        }
                    } else {
                        // If current user is NOT branch director, find their branch director
                        const branchDirector = employeesData.find(emp => {
                            const empName = emp.ho_ten || emp.hoTen || '';
                            const empPosition = (emp.chuc_danh || emp.chucDanh || '').toLowerCase();
                            const empBranch = emp.chi_nhanh || emp.chiNhanh;

                            const isBranchDirector =
                                branchDirectorNames.includes(empName) ||
                                branchDirectorKeywords.some(keyword => empPosition.includes(keyword));

                            return isBranchDirector && empBranch === userBranch;
                        });

                        if (branchDirector) {
                            setRecruitmentForm(prev => ({
                                ...prev,
                                nguoiQuanLyGianTiep: branchDirector.ho_ten || branchDirector.hoTen
                            }));
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching options:', error);
            } finally {
                setLoadingOptions(false);
            }
        };

        if (isRecruitmentModalOpen) {
            fetchOptions();
        }
    }, [isRecruitmentModalOpen, currentUser]);

    // Fetch candidate detail
    const handleViewCandidateDetail = async (candidateId) => {
        if (!candidateId) return;
        try {
            setLoadingCandidate(true);
            const response = await candidatesAPI.getById(candidateId);
            if (response.data.success && response.data.data) {
                setViewingCandidate(response.data.data);
                setShowCandidateDetailModal(true);
            }
        } catch (error) {
            console.error('Error loading candidate:', error);
            if (showToast) {
                showToast('Lỗi khi tải thông tin ứng viên', 'error');
            }
        } finally {
            setLoadingCandidate(false);
        }
    };

    // Handle approve interview request
    const handleApproveInterviewRequest = async (requestId) => {
        try {
            const response = await interviewRequestsAPI.approve(requestId, {
                approverId: currentUser?.id
            });
            if (response.data.success) {
                const message = response.data.message || 'Đã duyệt yêu cầu phỏng vấn';
                if (showToast) {
                    showToast(message, 'success');
                }
                // Refresh list - lấy cả PENDING và WAITING_FOR_OTHER
                const params = {
                    managerId: currentUser?.id,
                    branchDirectorId: currentUser?.id
                };
                const updatedResponse = await interviewRequestsAPI.getAll(params);
                const allRequests = updatedResponse.data?.data || [];
                // Lọc chỉ lấy PENDING_INTERVIEW và WAITING_FOR_OTHER_APPROVAL
                const pendingRequests = allRequests.filter(req =>
                    req.status === 'PENDING_INTERVIEW' || req.status === 'WAITING_FOR_OTHER_APPROVAL'
                );
                setInterviewRequests(pendingRequests);
                setInterviewRequestsCount(pendingRequests.length);

                // Refresh ready list nếu có - loại bỏ các ứng viên đã ON_PROBATION
                const readyRequests = allRequests.filter(req => {
                    if (req.status !== 'READY_FOR_INTERVIEW') return false;
                    const candidateStatus = req.candidate_status;
                    return candidateStatus !== 'ON_PROBATION';
                });
                setReadyInterviewRequests(readyRequests);
                setReadyInterviewRequestsCount(readyRequests.length);

                // Nếu modal đang mở và đang xem request vừa duyệt, refresh dữ liệu
                const isViewingThisRequest = showInterviewRequestDetail && selectedInterviewRequest && selectedInterviewRequest.id === requestId;
                if (isViewingThisRequest) {
                    // Tìm request đã được cập nhật trong danh sách mới
                    const updatedRequest = allRequests.find(req => req.id === requestId);
                    if (updatedRequest) {
                        setSelectedInterviewRequest(updatedRequest);
                        // Nếu status là READY_FOR_INTERVIEW (cả 2 đã duyệt), đóng modal vì đã chuyển sang tag "Sẵn sàng PV"
                        // Nếu status vẫn là PENDING_INTERVIEW hoặc WAITING_FOR_OTHER_APPROVAL, giữ modal mở nhưng nút sẽ tự động ẩn
                        if (updatedRequest.status === 'READY_FOR_INTERVIEW') {
                            setShowInterviewRequestDetail(false);
                            setSelectedInterviewRequest(null);
                        }
                        // Nếu status là APPROVED hoặc REJECTED, đóng modal
                        if (updatedRequest.status === 'APPROVED' || updatedRequest.status === 'REJECTED') {
                            setShowInterviewRequestDetail(false);
                            setSelectedInterviewRequest(null);
                        }
                    } else {
                        // Request không còn trong danh sách pending, đóng modal
                        setShowInterviewRequestDetail(false);
                        setSelectedInterviewRequest(null);
                    }
                } else {
                    // Nếu không đang xem request này, không đóng modal (có thể đang xem request khác)
                    // Chỉ đóng nếu không có request nào đang được chọn
                    if (!selectedInterviewRequest) {
                        setShowInterviewRequestDetail(false);
                    }
                }
            }
        } catch (error) {
            console.error('Error approving interview request:', error);
            if (showToast) {
                showToast('Có lỗi xảy ra khi duyệt yêu cầu', 'error');
            }
        }
    };

    // Handle reject interview request
    const handleRejectInterviewRequest = async (requestId) => {
        if (!showConfirm) return;

        const confirmed = await showConfirm({
            title: 'Từ chối yêu cầu phỏng vấn',
            message: 'Bạn có muốn từ chối yêu cầu phỏng vấn này không?',
            confirmText: 'Từ chối',
            cancelText: 'Hủy',
            type: 'warning'
        });

        if (!confirmed) return;

        try {
            const response = await interviewRequestsAPI.reject(requestId, {
                rejectionReason: 'Đã từ chối bởi quản lý/giám đốc chi nhánh'
            });
            if (response.data.success) {
                if (showToast) {
                    showToast('Đã từ chối yêu cầu phỏng vấn', 'success');
                }
                // Refresh list - fetch tất cả để cập nhật counts
                const params = {
                    managerId: currentUser?.id,
                    branchDirectorId: currentUser?.id
                };
                const updatedResponse = await interviewRequestsAPI.getAll(params);
                const allRequests = updatedResponse.data?.data || [];
                // Lọc chỉ lấy PENDING_INTERVIEW và WAITING_FOR_OTHER_APPROVAL
                const pendingRequests = allRequests.filter(req =>
                    req.status === 'PENDING_INTERVIEW' || req.status === 'WAITING_FOR_OTHER_APPROVAL'
                );
                setInterviewRequests(pendingRequests);
                setInterviewRequestsCount(pendingRequests.length);

                // Cập nhật ready count - loại bỏ các ứng viên đã ON_PROBATION
                const readyRequests = allRequests.filter(req => {
                    if (req.status !== 'READY_FOR_INTERVIEW') return false;
                    const candidateStatus = req.candidate_status;
                    return candidateStatus !== 'ON_PROBATION';
                });
                setReadyInterviewRequestsCount(readyRequests.length);
                setShowInterviewRequestDetail(false);
                setSelectedInterviewRequest(null);
            }
        } catch (error) {
            console.error('Error rejecting interview request:', error);
            if (showToast) {
                showToast('Có lỗi xảy ra khi từ chối yêu cầu', 'error');
            }
        }
    };

    // Load evaluation data
    const loadEvaluationData = async (request) => {
        if (!request || !request.id) {
            console.error('Invalid request object:', request);
            return;
        }

        try {
            // Load all evaluations for this interview request
            const allEvalsResponse = await interviewEvaluationsAPI.getAll({
                interviewRequestId: request.id
            });

            // Load current user's evaluation
            const evalResponse = await interviewEvaluationsAPI.getAll({
                interviewRequestId: request.id,
                evaluatorId: currentUser?.id
            });

            // Check if current user has evaluated
            const currentUserEval = evalResponse.data.success && evalResponse.data.data && evalResponse.data.data.length > 0
                ? evalResponse.data.data[0]
                : null;
            setCurrentUserHasEvaluated(!!currentUserEval);

            // Check if both manager and branch director have evaluated
            const allEvals = allEvalsResponse.data.success && allEvalsResponse.data.data
                ? allEvalsResponse.data.data
                : [];
            const managerEval = allEvals.find(e => e.evaluator_id === request.manager_id);
            const branchDirectorEval = allEvals.find(e => e.evaluator_id === request.branch_director_id);
            const bothHaveEvaluated = !!(managerEval && branchDirectorEval);
            setBothEvaluated(bothHaveEvaluated);

            // Set readonly if current user has evaluated OR both have evaluated
            setIsEvaluationReadOnly(!!currentUserEval || bothHaveEvaluated);

            const formatDateTime = (dateValue) => {
                if (!dateValue) return '';
                try {
                    const date = new Date(dateValue);
                    if (isNaN(date.getTime())) return '';
                    return date.toISOString().slice(0, 16);
                } catch (e) {
                    console.error('Error formatting date:', e);
                    return '';
                }
            };

            const getUserName = () => {
                return currentUser?.ho_ten || currentUser?.hoTen || currentUser?.name || '';
            };

            if (currentUserEval) {
                setEvaluationForm({
                    tenUngVien: currentUserEval.ten_ung_vien || request.candidate_name || '',
                    viTriUngTuyen: currentUserEval.vi_tri_ung_tuyen || request.vi_tri_ung_tuyen || request.chuc_danh_can_tuyen || '',
                    capBac: currentUserEval.cap_bac || '',
                    nguoiQuanLyTrucTiep: currentUserEval.nguoi_quan_ly_truc_tiep || request.manager_name || '',
                    nguoiPhongVan1: currentUserEval.nguoi_phong_van_1 || getUserName(),
                    ngayPhongVan: formatDateTime(currentUserEval.ngay_phong_van) || formatDateTime(request.interview_time),
                    diemKyNangGiaoTiep: currentUserEval.diem_ky_nang_giao_tiep || '',
                    lyDoKyNangGiaoTiep: currentUserEval.ly_do_ky_nang_giao_tiep || '',
                    diemThaiDoLamViec: currentUserEval.diem_thai_do_lam_viec || '',
                    lyDoThaiDoLamViec: currentUserEval.ly_do_thai_do_lam_viec || '',
                    diemKinhNghiemChuyenMon: currentUserEval.diem_kinh_nghiem_chuyen_mon || '',
                    lyDoKinhNghiemChuyenMon: currentUserEval.ly_do_kinh_nghiem_chuyen_mon || '',
                    diemKhaNangQuanLyDuAn: currentUserEval.diem_kha_nang_quan_ly_du_an || '',
                    lyDoKhaNangQuanLyDuAn: currentUserEval.ly_do_kha_nang_quan_ly_du_an || '',
                    diemNgoaiNgu: currentUserEval.diem_ngoai_ngu || '',
                    lyDoNgoaiNgu: currentUserEval.ly_do_ngoai_ngu || '',
                    diemKyNangQuanLy: currentUserEval.diem_ky_nang_quan_ly || '',
                    lyDoKyNangQuanLy: currentUserEval.ly_do_ky_nang_quan_ly || '',
                    diemManh: currentUserEval.diem_manh || '',
                    diemCanCaiThien: currentUserEval.diem_can_cai_thien || '',
                    nhanXetChung: currentUserEval.nhan_xet_chung || '',
                    ketLuan: currentUserEval.ket_luan || ''
                });
            } else {
                // Initialize form with request data
                const formatDateTime = (dateValue) => {
                    if (!dateValue) return '';
                    try {
                        const date = new Date(dateValue);
                        if (isNaN(date.getTime())) return '';
                        return date.toISOString().slice(0, 16);
                    } catch (e) {
                        console.error('Error formatting date:', e);
                        return '';
                    }
                };

                const getUserName = () => {
                    return currentUser?.ho_ten || currentUser?.hoTen || currentUser?.name || '';
                };

                setEvaluationForm({
                    tenUngVien: request.candidate_name || '',
                    viTriUngTuyen: request.vi_tri_ung_tuyen || request.chuc_danh_can_tuyen || '',
                    capBac: '',
                    nguoiQuanLyTrucTiep: request.manager_name || '',
                    nguoiPhongVan1: getUserName(),
                    ngayPhongVan: formatDateTime(request.interview_time),
                    diemKyNangGiaoTiep: '',
                    lyDoKyNangGiaoTiep: '',
                    diemThaiDoLamViec: '',
                    lyDoThaiDoLamViec: '',
                    diemKinhNghiemChuyenMon: '',
                    lyDoKinhNghiemChuyenMon: '',
                    diemKhaNangQuanLyDuAn: '',
                    lyDoKhaNangQuanLyDuAn: '',
                    diemNgoaiNgu: '',
                    lyDoNgoaiNgu: '',
                    diemKyNangQuanLy: '',
                    lyDoKyNangQuanLy: '',
                    diemManh: '',
                    diemCanCaiThien: '',
                    nhanXetChung: '',
                    ketLuan: ''
                });
            }
        } catch (error) {
            console.error('Error loading evaluation data:', error);
            // Initialize with request data anyway
            const formatDateTime = (dateValue) => {
                if (!dateValue) return '';
                try {
                    const date = new Date(dateValue);
                    if (isNaN(date.getTime())) return '';
                    return date.toISOString().slice(0, 16);
                } catch (e) {
                    console.error('Error formatting date:', e);
                    return '';
                }
            };

            const getUserName = () => {
                return currentUser?.ho_ten || currentUser?.hoTen || currentUser?.name || '';
            };

            setEvaluationForm({
                tenUngVien: request?.candidate_name || '',
                viTriUngTuyen: request?.vi_tri_ung_tuyen || request?.chuc_danh_can_tuyen || '',
                capBac: '',
                nguoiQuanLyTrucTiep: request?.manager_name || '',
                nguoiPhongVan1: getUserName(),
                ngayPhongVan: formatDateTime(request?.interview_time),
                diemKyNangGiaoTiep: '',
                lyDoKyNangGiaoTiep: '',
                diemThaiDoLamViec: '',
                lyDoThaiDoLamViec: '',
                diemKinhNghiemChuyenMon: '',
                lyDoKinhNghiemChuyenMon: '',
                diemKhaNangQuanLyDuAn: '',
                lyDoKhaNangQuanLyDuAn: '',
                diemNgoaiNgu: '',
                lyDoNgoaiNgu: '',
                diemKyNangQuanLy: '',
                lyDoKyNangQuanLy: '',
                diemManh: '',
                diemCanCaiThien: '',
                nhanXetChung: '',
                ketLuan: ''
            });
        }
    };

    // Handle save evaluation
    const handleSaveEvaluation = async () => {
        if (!selectedEvaluationRequest || !selectedEvaluationRequest.id) {
            if (showToast) {
                showToast('Lỗi: Không tìm thấy thông tin yêu cầu phỏng vấn', 'error');
            }
            return;
        }

        if (!currentUser?.id) {
            if (showToast) {
                showToast('Lỗi: Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.', 'error');
            }
            return;
        }

        // Validate required fields
        if (!evaluationForm.ketLuan) {
            if (showToast) {
                showToast('Vui lòng chọn kết luận đánh giá', 'warning');
            }
            return;
        }

        try {
            setSavingEvaluation(true);

            // Check if evaluation exists
            const checkResponse = await interviewEvaluationsAPI.getAll({
                interviewRequestId: selectedEvaluationRequest.id,
                evaluatorId: currentUser.id
            });

            const existingEval = checkResponse.data.success && checkResponse.data.data && checkResponse.data.data.length > 0
                ? checkResponse.data.data[0]
                : null;

            const evaluationData = {
                interviewRequestId: selectedEvaluationRequest.id,
                candidateId: selectedEvaluationRequest.candidate_id,
                evaluatorId: currentUser.id,
                ...evaluationForm
            };

            let response;
            if (existingEval) {
                // Update existing evaluation
                response = await interviewEvaluationsAPI.update(existingEval.id, evaluationData);
            } else {
                // Create new evaluation
                response = await interviewEvaluationsAPI.create(evaluationData);
            }

            if (response.data.success) {
                if (showToast) {
                    showToast('Đã lưu đánh giá phỏng vấn thành công', 'success');
                }
                setShowEvaluationModal(false);
                setSelectedEvaluationRequest(null);
                // Refresh ready list và counts
                const params = {
                    managerId: currentUser?.id,
                    branchDirectorId: currentUser?.id
                };
                const updatedResponse = await interviewRequestsAPI.getAll(params);
                const allRequests = updatedResponse.data?.data || [];
                // Refresh ready list - loại bỏ các ứng viên đã ON_PROBATION
                const readyRequests = allRequests.filter(req => {
                    if (req.status !== 'READY_FOR_INTERVIEW') return false;
                    const candidateStatus = req.candidate_status;
                    return candidateStatus !== 'ON_PROBATION';
                });
                setReadyInterviewRequests(readyRequests);
                setReadyInterviewRequestsCount(readyRequests.length);

                // Cập nhật interview count
                const pendingRequests = allRequests.filter(req =>
                    req.status === 'PENDING_INTERVIEW' || req.status === 'WAITING_FOR_OTHER_APPROVAL'
                );
                setInterviewRequestsCount(pendingRequests.length);
            }
        } catch (error) {
            console.error('Error saving evaluation:', error);
            if (showToast) {
                showToast('Có lỗi xảy ra khi lưu đánh giá', 'error');
            }
        } finally {
            setSavingEvaluation(false);
        }
    };

    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN');
        } catch (e) {
            return dateString;
        }
    };

    const filters = [
        { key: 'all', label: 'Tất cả', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', count: null },
        { key: 'approved', label: 'Đã Duyệt', gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', count: null },
        { key: 'rejected', label: 'Đã Từ chối', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', count: null },
        ...((isBranchDirector || ['EMPLOYEE', 'MANAGER', 'TEAM_LEAD'].includes(currentUser?.role)) ? [
            { key: 'interview', label: 'Chờ duyệt phỏng vấn', gradient: 'linear-gradient(135deg, #f59e0b, #f97316)', count: interviewRequestsCount },
            { key: 'ready', label: 'Sẵn sàng PV', gradient: 'linear-gradient(135deg, #10b981, #059669)', count: readyInterviewRequestsCount }
        ] : []),
        ...(isBranchDirector ? [{ key: 'recruitment', label: 'Yêu cầu tuyển dụng', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', count: pendingRecruitmentCount }] : [])
    ];

    const handleApprove = (candidateId) => {
        console.log('Approve candidate:', candidateId);
        // TODO: Implement approve logic
    };

    const handleReject = (candidateId) => {
        console.log('Reject candidate:', candidateId);
        // TODO: Implement reject logic
    };

    // Handle submit recruitment request
    const handleSubmitRecruitmentRequest = async (e) => {
        e.preventDefault();

        // Validate required fields
        if (!recruitmentForm.chucDanhCanTuyen || !recruitmentForm.phongBanBoPhan || !recruitmentForm.nguoiQuanLyTrucTiep) {
            if (showToast) {
                showToast('Vui lòng điền đầy đủ thông tin bắt buộc (Chức danh, Phòng ban, Người quản lý trực tiếp)', 'error');
            }
            return;
        }

        if (!currentUser?.id) {
            if (showToast) {
                showToast('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.', 'error');
            }
            return;
        }

        try {
            console.log('Submitting recruitment request:', {
                form: recruitmentForm,
                userId: currentUser.id,
                userName: currentUser.hoTen
            });

            // Thêm userId và userName vào request body để backend có thể tìm employee
            const requestData = {
                ...recruitmentForm,
                userId: currentUser.id,
                userName: currentUser.hoTen || currentUser.username
            };

            const response = await recruitmentRequestsAPI.create(requestData);
            if (response.data.success) {
                if (showToast) {
                    showToast('Đã gửi yêu cầu tuyển dụng thành công', 'success');
                }
                setIsRecruitmentModalOpen(false);
                // Reset form
                setRecruitmentForm({
                    chucDanhCanTuyen: '',
                    phongBanBoPhan: '',
                    nguoiQuanLyTrucTiep: currentUser?.hoTen || '',
                    moTaCongViec: 'chua_co',
                    yeuCauChiTietCongViec: '',
                    lyDoKhacGhiChu: '',
                    soLuongYeuCau: '1',
                    loaiLaoDong: 'toan_thoi_gian',
                    nguoiQuanLyGianTiep: '',
                    lyDoTuyen: 'nhu_cau_tang',
                    gioiTinh: 'bat_ky',
                    doTuoi: '',
                    trinhDoHocVanYeuCau: '',
                    kinhNghiemChuyenMon: 'khong_yeu_cau',
                    chiTietKinhNghiem: '',
                    kienThucChuyenMonKhac: '',
                    yeuCauNgoaiNgu: '',
                    yeuCauViTinhKyNangKhac: '',
                    kyNangGiaoTiep: '',
                    thaiDoLamViec: '',
                    kyNangQuanLy: ''
                });
            }
        } catch (error) {
            console.error('Error submitting recruitment request:', error);
            if (showToast) {
                showToast('Có lỗi xảy ra khi gửi yêu cầu', 'error');
            }
        }
    };

    // Handle approve recruitment request
    const handleApproveRecruitmentRequest = async (requestId) => {
        try {
            const response = await recruitmentRequestsAPI.approve(requestId);
            if (response.data.success) {
                if (showToast) {
                    showToast('Đã duyệt yêu cầu tuyển dụng', 'success');
                }
                // Refresh list
                const updatedResponse = await recruitmentRequestsAPI.getAll({
                    branchDirectorId: currentUser?.id,
                    status: 'PENDING'
                });
                setRecruitmentRequests(updatedResponse.data?.data || []);
                setShowRequestDetail(false);
                setSelectedRequest(null);
            }
        } catch (error) {
            console.error('Error approving recruitment request:', error);
            if (showToast) {
                showToast('Có lỗi xảy ra khi duyệt yêu cầu', 'error');
            }
        }
    };

    // Handle reject recruitment request
    const handleRejectRecruitmentRequest = async (requestId) => {
        if (!showConfirm) return;

        const confirmed = await showConfirm({
            title: 'Từ chối yêu cầu',
            message: 'Bạn có muốn từ chối yêu cầu tuyển dụng này không?',
            confirmText: 'Từ chối',
            cancelText: 'Hủy',
            type: 'warning'
        });

        if (!confirmed) return;

        try {
            const response = await recruitmentRequestsAPI.reject(requestId, {
                rejectionReason: 'Đã từ chối bởi giám đốc chi nhánh'
            });
            if (response.data.success) {
                if (showToast) {
                    showToast('Đã từ chối yêu cầu tuyển dụng', 'success');
                }
                // Refresh list
                const updatedResponse = await recruitmentRequestsAPI.getAll({
                    branchDirectorId: currentUser?.id,
                    status: 'PENDING'
                });
                setRecruitmentRequests(updatedResponse.data?.data || []);
                setShowRequestDetail(false);
                setSelectedRequest(null);
            }
        } catch (error) {
            console.error('Error rejecting recruitment request:', error);
            if (showToast) {
                showToast('Có lỗi xảy ra khi từ chối yêu cầu', 'error');
            }
        }
    };

    // Fetch interview requests and recruitment requests based on selected filter (all, approved, rejected)
    useEffect(() => {
        const fetchInterviewRequestsForFilter = async () => {
            if (selectedFilter !== 'all' && selectedFilter !== 'approved' && selectedFilter !== 'rejected') {
                return; // Chỉ fetch khi filter là all, approved, hoặc rejected
            }

            try {
                const params = {
                    managerId: currentUser?.id,
                    branchDirectorId: currentUser?.id
                };

                let statusFilter = null;
                if (selectedFilter === 'approved') {
                    statusFilter = 'APPROVED';
                } else if (selectedFilter === 'rejected') {
                    statusFilter = 'REJECTED';
                }

                // Fetch interview requests với status filter
                const interviewResponse = await interviewRequestsAPI.getAll({
                    ...params,
                    status: statusFilter || undefined
                });

                let mappedCandidates = [];
                if (interviewResponse.data?.success) {
                    const requestsData = interviewResponse.data.data || [];

                    // Map interview requests data để có format phù hợp với table
                    mappedCandidates = requestsData
                        .filter(request => {
                            // Loại bỏ các ứng viên đang trong quá trình thử việc
                            const candidateStatus = request.candidate_status;
                            return candidateStatus !== 'ON_PROBATION';
                        })
                        .map(request => ({
                            id: request.candidate_id || request.candidateId || request.id,
                            requestId: request.id,
                            name: request.candidate_name || request.candidateName || '-',
                            position: request.vi_tri_ung_tuyen || request.viTriUngTuyen || request.chuc_danh_can_tuyen || '-',
                            department: request.phong_ban || request.phongBan || request.phong_ban_bo_phan || '-',
                            date: request.created_at || request.createdAt || request.interview_time || '-',
                            status: request.status || 'PENDING_INTERVIEW',
                            interviewRequest: request,
                            type: 'interview'
                        }));
                }

                // Nếu filter là 'approved', cũng fetch recruitment requests đã duyệt
                if (selectedFilter === 'approved') {
                    try {
                        let recruitmentData = [];

                        // Fetch recruitment requests đã duyệt cho quản lý trực tiếp (người gửi)
                        if (['EMPLOYEE', 'MANAGER', 'TEAM_LEAD'].includes(currentUser?.role)) {
                            try {
                                const employeeResponse = await recruitmentRequestsAPI.getAll({
                                    employeeId: currentUser?.id,
                                    status: 'APPROVED'
                                });
                                if (employeeResponse.data?.success) {
                                    recruitmentData = [...recruitmentData, ...(employeeResponse.data.data || [])];
                                }
                            } catch (employeeError) {
                                console.error('Error fetching approved recruitment requests for employee:', employeeError);
                            }
                        }

                        // Fetch recruitment requests đã duyệt cho giám đốc chi nhánh
                        if (isBranchDirector) {
                            try {
                                const directorResponse = await recruitmentRequestsAPI.getAll({
                                    branchDirectorId: currentUser?.id,
                                    status: 'APPROVED'
                                });
                                if (directorResponse.data?.success) {
                                    const directorData = directorResponse.data.data || [];
                                    // Loại bỏ trùng lặp nếu đã có trong recruitmentData (trường hợp user vừa là employee vừa là branch director)
                                    const existingIds = new Set(recruitmentData.map(r => r.id));
                                    const uniqueDirectorData = directorData.filter(r => !existingIds.has(r.id));
                                    recruitmentData = [...recruitmentData, ...uniqueDirectorData];
                                }
                            } catch (directorError) {
                                console.error('Error fetching approved recruitment requests for branch director:', directorError);
                            }
                        }

                        // Map recruitment requests data
                        if (recruitmentData.length > 0) {
                            const mappedRecruitmentRequests = recruitmentData.map(request => ({
                                id: `recruitment-${request.id}`,
                                requestId: request.id,
                                name: request.created_by_name || request.nguoi_quan_ly_truc_tiep || '-',
                                position: request.chuc_danh_can_tuyen || '-',
                                department: request.phong_ban_bo_phan || '-',
                                date: request.approved_at || request.created_at || '-',
                                status: 'APPROVED',
                                recruitmentRequest: request,
                                type: 'recruitment'
                            }));

                            mappedCandidates = [...mappedCandidates, ...mappedRecruitmentRequests];
                        }
                    } catch (recruitmentError) {
                        console.error('Error fetching approved recruitment requests:', recruitmentError);
                    }
                }

                setCandidates(mappedCandidates);
            } catch (error) {
                console.error('Error fetching interview requests:', error);
                setCandidates([]);
            }
        };

        // Chỉ fetch khi user có quyền
        if (['EMPLOYEE', 'MANAGER', 'TEAM_LEAD', 'BRANCH_DIRECTOR'].includes(currentUser?.role) || isBranchDirector) {
            fetchInterviewRequestsForFilter();
        }
    }, [selectedFilter, currentUser, isBranchDirector]);

    // Filter candidates based on selected filter (đã được filter từ API)
    const filteredCandidates = candidates;

    const renderReadyInterviewRequestsTable = () => (
        <div className="interview-approvals-table-wrapper">
            <table className="interview-approvals-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Ứng viên</th>
                        <th>Vị trí</th>
                        <th>Phòng ban</th>
                        <th>Thời gian PV</th>
                        <th>Trạng thái</th>
                    </tr>
                </thead>
                <tbody>
                    {readyInterviewRequests.length === 0 ? (
                        <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                Không có ứng viên sẵn sàng phỏng vấn
                            </td>
                        </tr>
                    ) : (
                        readyInterviewRequests.map((req, index) => (
                            <tr
                                key={req.id}
                                className={index % 2 === 1 ? 'even-row-bg' : ''}
                                onClick={async () => {
                                    if (!req || !req.id) {
                                        console.error('Invalid request:', req);
                                        if (showToast) {
                                            showToast('Lỗi: Không tìm thấy thông tin yêu cầu phỏng vấn', 'error');
                                        }
                                        return;
                                    }
                                    setSelectedEvaluationRequest(req);
                                    setShowEvaluationModal(true);
                                    // Load existing evaluation if any
                                    await loadEvaluationData(req);
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                <td>{index + 1}</td>
                                <td>{req.candidate_name || '---'}</td>
                                <td>{req.vi_tri_ung_tuyen || req.chuc_danh_can_tuyen || '---'}</td>
                                <td>{req.phong_ban || req.phong_ban_bo_phan || '---'}</td>
                                <td>{req.interview_time ? new Date(req.interview_time).toLocaleString('vi-VN') : '---'}</td>
                                <td>
                                    <span className="interview-approvals-status-badge ready">Đang chờ đánh giá</span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );

    const renderInterviewRequestsTable = () => (
        <div className="interview-approvals-table-wrapper">
            <table className="interview-approvals-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Ứng viên</th>
                        <th>Vị trí</th>
                        <th>Phòng ban</th>
                        <th>Người gửi</th>
                        <th>Thời gian PV</th>
                        <th>Trạng thái</th>
                    </tr>
                </thead>
                <tbody>
                    {interviewRequests.length === 0 ? (
                        <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                Không có yêu cầu phỏng vấn
                            </td>
                        </tr>
                    ) : (
                        interviewRequests.map((req, index) => (
                            <tr
                                key={req.id}
                                className={index % 2 === 1 ? 'even-row-bg' : ''}
                                onClick={() => {
                                    setSelectedInterviewRequest(req);
                                    setShowInterviewRequestDetail(true);
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                <td>{index + 1}</td>
                                <td>{req.candidate_name || '---'}</td>
                                <td>{req.vi_tri_ung_tuyen || req.chuc_danh_can_tuyen || '---'}</td>
                                <td>{req.phong_ban || req.phong_ban_bo_phan || '---'}</td>
                                <td>{req.manager_id ? 'Quản lý trực tiếp' : req.branch_director_id ? 'Giám đốc chi nhánh' : '---'}</td>
                                <td>{req.interview_time ? new Date(req.interview_time).toLocaleString('vi-VN') : '---'}</td>
                                <td>
                                    {req.status === 'WAITING_FOR_OTHER_APPROVAL' ? (
                                        <span className="interview-approvals-status-badge waiting">
                                            {req.manager_approved && !req.branch_director_approved
                                                ? `Đang chờ giám đốc chi nhánh${req.branch_director_name ? ` - ${req.branch_director_name}` : ''}`
                                                : !req.manager_approved && req.branch_director_approved
                                                    ? `Đang chờ quản lý trực tiếp${req.manager_name ? ` - ${req.manager_name}` : ''}`
                                                    : 'Đang chờ người kia duyệt phỏng vấn'}
                                        </span>
                                    ) : (
                                        <span className="interview-approvals-status-badge pending">Chờ duyệt phỏng vấn</span>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
    return (
        <div className="interview-approvals-container">
            {/* Header Section */}
            <div className="interview-approvals-header">
                <div className="interview-approvals-header-content">
                    <div className="interview-approvals-icon-wrapper">
                        <svg className="interview-approvals-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 className="interview-approvals-title">
                            Phỏng vấn & Duyệt ứng viên
                            {isRefreshing && (
                                <span style={{ marginLeft: '10px', fontSize: '0.7em', color: '#10b981', opacity: 0.8 }}>
                                    ● Đang cập nhật...
                                </span>
                            )}
                        </h1>
                        <p className="interview-approvals-subtitle">
                            Xem và xử lý các yêu cầu phỏng vấn ứng viên được HR gửi đến bạn
                            <span style={{ marginLeft: '10px', fontSize: '0.85em', opacity: 0.7 }}>
                                {!isRefreshing && '● Cập nhật tự động mỗi 5 giây'}
                            </span>
                        </p>
                    </div>
                    <button
                        type="button"
                        className="interview-approvals-recruitment-btn"
                        onClick={() => setIsRecruitmentModalOpen(true)}
                    >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        <span>Yêu cầu Tuyển dụng</span>
                    </button>
                    {isHr && (
                        <button
                            type="button"
                            className="interview-approvals-recruitment-btn secondary"
                            onClick={() => setIsHrRecruitmentModalOpen(true)}
                        >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span>Phiếu tuyển nhân sự</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Main Container: Candidate List */}
            <div className="interview-approvals-main-card">
                {/* Pill Filters */}
                <div className="interview-approvals-filters">
                    {filters.map((filter) => (
                        <button
                            key={filter.key}
                            type="button"
                            className={`interview-approvals-filter-pill ${selectedFilter === filter.key ? 'active' : ''} ${filter.key === 'all' ? 'filter-all' : ''}`}
                            onClick={() => setSelectedFilter(filter.key)}
                            style={selectedFilter === filter.key && filter.key !== 'all' ? { background: filter.gradient } : {}}
                        >
                            <span>{filter.label}</span>
                            {filter.count !== null && (
                                <span className={`interview-approvals-filter-badge ${filter.count > 0 ? 'pulse' : 'zero'}`}>
                                    {filter.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="interview-approvals-table-wrapper">
                    {selectedFilter === 'recruitment' ? (
                        <table className="interview-approvals-table">
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Người gửi</th>
                                    <th>Chức danh cần tuyển</th>
                                    <th>Phòng ban</th>
                                    <th>Số lượng</th>
                                    <th>Ngày gửi</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recruitmentRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                            Chưa có yêu cầu tuyển dụng nào
                                        </td>
                                    </tr>
                                ) : (
                                    recruitmentRequests.map((request, index) => (
                                        <tr key={request.id} className={index % 2 === 1 ? 'even-row-bg' : ''}>
                                            <td>{index + 1}</td>
                                            <td>{request.created_by_name || '-'}</td>
                                            <td>{request.chuc_danh_can_tuyen}</td>
                                            <td>{request.phong_ban_bo_phan}</td>
                                            <td>{request.so_luong_yeu_cau}</td>
                                            <td>{new Date(request.created_at).toLocaleDateString('vi-VN')}</td>
                                            <td>
                                                <div className="interview-approvals-action-buttons">
                                                    <button
                                                        type="button"
                                                        className="interview-approvals-action-btn interview-approvals-action-btn--approve"
                                                        onClick={() => {
                                                            setSelectedRequest(request);
                                                            setShowRequestDetail(true);
                                                        }}
                                                        title="Xem chi tiết"
                                                    >
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : selectedFilter === 'interview' ? (
                        renderInterviewRequestsTable()
                    ) : selectedFilter === 'ready' ? (
                        renderReadyInterviewRequestsTable()
                    ) : (
                        <table className="interview-approvals-table">
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Họ và Tên</th>
                                    <th>Vị trí ứng tuyển</th>
                                    <th>Phòng ban</th>
                                    <th>Ngày gửi CV</th>
                                    <th>Trạng thái</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCandidates.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                            {candidates.length === 0 ? 'Chưa có đơn nào' : 'Không có đơn nào phù hợp với bộ lọc'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCandidates.map((candidate, index) => {
                                        const formatDate = (dateString) => {
                                            if (!dateString) return '-';
                                            try {
                                                const date = new Date(dateString);
                                                return date.toLocaleDateString('vi-VN', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric'
                                                });
                                            } catch (e) {
                                                return dateString;
                                            }
                                        };

                                        const getStatusLabel = (status) => {
                                            if (status === 'APPROVED') return 'Đã Duyệt';
                                            if (status === 'REJECTED') return 'Đã Từ chối';
                                            if (status === 'READY_FOR_INTERVIEW') return 'Sẵn sàng PV';
                                            if (status === 'PENDING_INTERVIEW') return 'Chờ duyệt PV';
                                            if (status === 'WAITING_FOR_OTHER_APPROVAL') return 'Chờ duyệt PV';
                                            if (status === 'PASSED') return 'Đã Duyệt';
                                            if (status === 'FAILED') return 'Đã Từ chối';
                                            return status || '-';
                                        };

                                        return (
                                            <tr key={candidate.id || candidate.requestId} className={index % 2 === 1 ? 'even-row-bg' : ''}>
                                                <td>{index + 1}</td>
                                                <td>{candidate.name}</td>
                                                <td>{candidate.position}</td>
                                                <td>{candidate.department}</td>
                                                <td>{formatDate(candidate.date)}</td>
                                                <td>
                                                    <span className={`interview-approvals-status-badge status-${candidate.status?.toLowerCase() || 'new'}`}>
                                                        {getStatusLabel(candidate.status)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="interview-approvals-action-buttons">
                                                        {candidate.interviewRequest && (
                                                            <button
                                                                type="button"
                                                                className="interview-approvals-action-btn interview-approvals-action-btn--approve"
                                                                onClick={() => {
                                                                    setSelectedInterviewRequest(candidate.interviewRequest);
                                                                    setShowInterviewRequestDetail(true);
                                                                }}
                                                                title="Xem chi tiết"
                                                            >
                                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                                                </svg>
                                                            </button>
                                                        )}
                                                        {candidate.recruitmentRequest && (
                                                            <button
                                                                type="button"
                                                                className="interview-approvals-action-btn interview-approvals-action-btn--approve"
                                                                onClick={() => {
                                                                    setSelectedRequest(candidate.recruitmentRequest);
                                                                    setShowRequestDetail(true);
                                                                }}
                                                                title="Xem chi tiết yêu cầu tuyển dụng"
                                                            >
                                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Recruitment Request Modal */}
            {isRecruitmentModalOpen && (
                <div className="interview-approvals-modal-overlay" onClick={() => setIsRecruitmentModalOpen(false)}>
                    <div className="interview-approvals-modal-container" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="interview-approvals-modal-header">
                            <h2 className="interview-approvals-modal-title">Yêu cầu Tuyển dụng</h2>
                            <button
                                type="button"
                                className="interview-approvals-modal-close"
                                onClick={() => setIsRecruitmentModalOpen(false)}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="interview-approvals-modal-body">
                            <form id="recruitment-form" className="interview-approvals-recruitment-form" onSubmit={handleSubmitRecruitmentRequest}>
                                {/* PHẦN I: Vị trí & Nhu cầu */}
                                <fieldset className="interview-approvals-fieldset interview-approvals-fieldset-part1">
                                    <legend className="interview-approvals-legend">PHẦN I: Vị trí & Nhu cầu *</legend>

                                    <div className="interview-approvals-form-grid">
                                        {/* Left Column */}
                                        <div className="interview-approvals-form-column">
                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">
                                                    Chức danh cần tuyển <span className="required">*</span>
                                                </label>
                                                <CustomDropdown
                                                    id="chucDanhCanTuyen"
                                                    name="chucDanhCanTuyen"
                                                    value={recruitmentForm.chucDanhCanTuyen}
                                                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, chucDanhCanTuyen: e.target.value })}
                                                    options={jobTitles}
                                                    placeholder={loadingOptions ? "Đang tải..." : "Chọn chức danh"}
                                                />
                                            </div>

                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">
                                                    Phòng ban/Bộ phận <span className="required">*</span>
                                                </label>
                                                <CustomDropdown
                                                    id="phongBanBoPhan"
                                                    name="phongBanBoPhan"
                                                    value={recruitmentForm.phongBanBoPhan}
                                                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, phongBanBoPhan: e.target.value })}
                                                    options={departments}
                                                    placeholder={loadingOptions ? "Đang tải..." : "Chọn phòng ban"}
                                                />
                                            </div>

                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">
                                                    Người quản lý trực tiếp <span className="required">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="interview-approvals-form-input"
                                                    value={recruitmentForm.nguoiQuanLyTrucTiep}
                                                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, nguoiQuanLyTrucTiep: e.target.value })}
                                                    placeholder="Họ và tên"
                                                    readOnly={true}
                                                    style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                                                />
                                            </div>

                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">
                                                    Mô tả công việc (MTCV) <span className="required">*</span>
                                                </label>
                                                <div className="interview-approvals-radio-group">
                                                    <label className="interview-approvals-radio-label">
                                                        <input
                                                            type="radio"
                                                            name="moTaCongViec"
                                                            value="co"
                                                            checked={recruitmentForm.moTaCongViec === 'co'}
                                                            onChange={(e) => setRecruitmentForm({ ...recruitmentForm, moTaCongViec: e.target.value })}
                                                        />
                                                        <span>Đã có MTCV</span>
                                                    </label>
                                                    <label className="interview-approvals-radio-label">
                                                        <input
                                                            type="radio"
                                                            name="moTaCongViec"
                                                            value="chua_co"
                                                            checked={recruitmentForm.moTaCongViec === 'chua_co'}
                                                            onChange={(e) => setRecruitmentForm({ ...recruitmentForm, moTaCongViec: e.target.value })}
                                                        />
                                                        <span>Chưa có MTCV</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">
                                                    Yêu cầu chi tiết về công việc/Vị trí mới:
                                                </label>
                                                <textarea
                                                    className="interview-approvals-form-textarea"
                                                    value={recruitmentForm.yeuCauChiTietCongViec}
                                                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, yeuCauChiTietCongViec: e.target.value })}
                                                    placeholder="Mô tả tóm tắt yêu cầu, nếu chưa có MTCV."
                                                    rows="3"
                                                />
                                            </div>

                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">
                                                    Lý do khác / Ghi chú
                                                </label>
                                                <textarea
                                                    className="interview-approvals-form-textarea"
                                                    value={recruitmentForm.lyDoKhacGhiChu}
                                                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, lyDoKhacGhiChu: e.target.value })}
                                                    placeholder="Ghi chú chi tiết thêm..."
                                                    rows="3"
                                                />
                                            </div>
                                        </div>

                                        {/* Right Column */}
                                        <div className="interview-approvals-form-column">
                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">
                                                    Số lượng yêu cầu <span className="required">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    className="interview-approvals-form-input"
                                                    value={recruitmentForm.soLuongYeuCau}
                                                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, soLuongYeuCau: e.target.value })}
                                                    min="1"
                                                />
                                            </div>

                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">
                                                    Loại lao động <span className="required">*</span>
                                                </label>
                                                <CustomDropdown
                                                    id="loaiLaoDong"
                                                    name="loaiLaoDong"
                                                    value={recruitmentForm.loaiLaoDong}
                                                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, loaiLaoDong: e.target.value })}
                                                    options={[
                                                        { value: 'toan_thoi_gian', label: 'Toàn thời gian (Full-time)' },
                                                        { value: 'thoi_vu', label: 'Thời vụ' }
                                                    ]}
                                                    placeholder="Chọn loại lao động"
                                                />
                                            </div>

                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">
                                                    Người quản lý gián tiếp (nếu có)
                                                </label>
                                                <input
                                                    type="text"
                                                    className="interview-approvals-form-input"
                                                    value={recruitmentForm.nguoiQuanLyGianTiep}
                                                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, nguoiQuanLyGianTiep: e.target.value })}
                                                    placeholder="Họ và tên"
                                                    readOnly={true}
                                                    style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                                                />
                                            </div>

                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">
                                                    Lý do tuyển <span className="required">*</span>
                                                </label>
                                                <div className="interview-approvals-radio-group">
                                                    <label className="interview-approvals-radio-label">
                                                        <input
                                                            type="radio"
                                                            name="lyDoTuyen"
                                                            value="thay_the"
                                                            checked={recruitmentForm.lyDoTuyen === 'thay_the'}
                                                            onChange={(e) => setRecruitmentForm({ ...recruitmentForm, lyDoTuyen: e.target.value })}
                                                        />
                                                        <span>Thay thế</span>
                                                    </label>
                                                    <label className="interview-approvals-radio-label">
                                                        <input
                                                            type="radio"
                                                            name="lyDoTuyen"
                                                            value="nhu_cau_tang"
                                                            checked={recruitmentForm.lyDoTuyen === 'nhu_cau_tang'}
                                                            onChange={(e) => setRecruitmentForm({ ...recruitmentForm, lyDoTuyen: e.target.value })}
                                                        />
                                                        <span>Nhu cầu tăng</span>
                                                    </label>
                                                    <label className="interview-approvals-radio-label">
                                                        <input
                                                            type="radio"
                                                            name="lyDoTuyen"
                                                            value="vi_tri_moi"
                                                            checked={recruitmentForm.lyDoTuyen === 'vi_tri_moi'}
                                                            onChange={(e) => setRecruitmentForm({ ...recruitmentForm, lyDoTuyen: e.target.value })}
                                                        />
                                                        <span>Vị trí mới</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </fieldset>

                                {/* PHẦN II: Tiêu chuẩn Tuyển chọn */}
                                <fieldset className="interview-approvals-fieldset interview-approvals-fieldset-part2">
                                    <legend className="interview-approvals-legend">PHẦN II: Tiêu chuẩn Tuyển chọn *</legend>

                                    <div className="interview-approvals-form-grid">
                                        {/* Left Column */}
                                        <div className="interview-approvals-form-column">
                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">Giới tính</label>
                                                <CustomDropdown
                                                    id="gioiTinh"
                                                    name="gioiTinh"
                                                    value={recruitmentForm.gioiTinh}
                                                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, gioiTinh: e.target.value })}
                                                    options={[
                                                        { value: 'bat_ky', label: 'Bất kỳ' },
                                                        { value: 'nam', label: 'Nam' },
                                                        { value: 'nu', label: 'Nữ' }
                                                    ]}
                                                    placeholder="Chọn giới tính"
                                                />
                                            </div>

                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">Độ tuổi</label>
                                                <input
                                                    type="text"
                                                    className="interview-approvals-form-input"
                                                    value={recruitmentForm.doTuoi}
                                                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, doTuoi: e.target.value })}
                                                    placeholder="VD: 25 - 35 hoặc Bất kỳ"
                                                />
                                            </div>

                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">Trình độ học vấn yêu cầu</label>
                                                <input
                                                    type="text"
                                                    className="interview-approvals-form-input"
                                                    value={recruitmentForm.trinhDoHocVanYeuCau}
                                                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, trinhDoHocVanYeuCau: e.target.value })}
                                                    placeholder="VD: Đại học trở lên ngành Kỹ thuật hoặc Trung cấp..."
                                                />
                                            </div>

                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">Kinh nghiệm chuyên môn</label>
                                                <div className="interview-approvals-radio-group">
                                                    <label className="interview-approvals-radio-label">
                                                        <input
                                                            type="radio"
                                                            name="kinhNghiemChuyenMon"
                                                            value="khong_yeu_cau"
                                                            checked={recruitmentForm.kinhNghiemChuyenMon === 'khong_yeu_cau'}
                                                            onChange={(e) => setRecruitmentForm({ ...recruitmentForm, kinhNghiemChuyenMon: e.target.value })}
                                                        />
                                                        <span>Không yêu cầu</span>
                                                    </label>
                                                    <label className="interview-approvals-radio-label">
                                                        <input
                                                            type="radio"
                                                            name="kinhNghiemChuyenMon"
                                                            value="co_yeu_cau"
                                                            checked={recruitmentForm.kinhNghiemChuyenMon === 'co_yeu_cau'}
                                                            onChange={(e) => setRecruitmentForm({ ...recruitmentForm, kinhNghiemChuyenMon: e.target.value })}
                                                        />
                                                        <span>Có yêu cầu</span>
                                                    </label>
                                                </div>
                                                {recruitmentForm.kinhNghiemChuyenMon === 'co_yeu_cau' && (
                                                    <textarea
                                                        className="interview-approvals-form-textarea"
                                                        value={recruitmentForm.chiTietKinhNghiem}
                                                        onChange={(e) => setRecruitmentForm({ ...recruitmentForm, chiTietKinhNghiem: e.target.value })}
                                                        placeholder="Ghi rõ số năm, loại kinh nghiệm chuyên môn (VD: Tối thiểu 3 năm kinh nghiệm lập trình PLC)"
                                                        rows="3"
                                                    />
                                                )}
                                            </div>

                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">Kiến thức chuyên môn khác / Ngành nghề liên quan</label>
                                                <textarea
                                                    className="interview-approvals-form-textarea"
                                                    value={recruitmentForm.kienThucChuyenMonKhac}
                                                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, kienThucChuyenMonKhac: e.target.value })}
                                                    placeholder="VD: Có học hoặc hiểu biết về Hệ thống ERP..."
                                                    rows="3"
                                                />
                                            </div>

                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">Yêu cầu Ngoại ngữ</label>
                                                <textarea
                                                    className="interview-approvals-form-textarea"
                                                    value={recruitmentForm.yeuCauNgoaiNgu}
                                                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, yeuCauNgoaiNgu: e.target.value })}
                                                    placeholder="VD: Tiếng Anh (Trình độ B, Khả năng sử dụng: Khá)"
                                                    rows="3"
                                                />
                                            </div>

                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">Yêu cầu Vi tính / Kỹ năng khác</label>
                                                <textarea
                                                    className="interview-approvals-form-textarea"
                                                    value={recruitmentForm.yeuCauViTinhKyNangKhac}
                                                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, yeuCauViTinhKyNangKhac: e.target.value })}
                                                    placeholder="VD: MS Office (Word/Excel/Access), Phần mềm thiết kế 3D..."
                                                    rows="3"
                                                />
                                            </div>

                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">Kỹ năng giao tiếp</label>
                                                <textarea
                                                    className="interview-approvals-form-textarea"
                                                    value={recruitmentForm.kyNangGiaoTiep}
                                                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, kyNangGiaoTiep: e.target.value })}
                                                    placeholder="VD: Có khả năng thuyết trình, đàm phán tốt..."
                                                    rows="3"
                                                />
                                            </div>
                                        </div>

                                        {/* Right Column */}
                                        <div className="interview-approvals-form-column">
                                            <div className="interview-approvals-form-group">
                                                <label className="interview-approvals-form-label">Thái độ làm việc</label>
                                                <textarea
                                                    className="interview-approvals-form-textarea"
                                                    value={recruitmentForm.thaiDoLamViec}
                                                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, thaiDoLamViec: e.target.value })}
                                                    placeholder="VD: Tinh thần trách nhiệm cao, chịu áp lực..."
                                                    rows="3"
                                                />
                                            </div>

                                            <div className="interview-approvals-form-group interview-approvals-form-group-full">
                                                <label className="interview-approvals-form-label">
                                                    Kỹ năng quản lý (Áp dụng cho Trưởng phòng trở lên)
                                                </label>
                                                <textarea
                                                    className="interview-approvals-form-textarea"
                                                    value={recruitmentForm.kyNangQuanLy}
                                                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, kyNangQuanLy: e.target.value })}
                                                    placeholder="VD: Có kinh nghiệm xây dựng đội nhóm, phân công công việc..."
                                                    rows="3"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </fieldset>
                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="interview-approvals-modal-footer">
                            <button
                                type="button"
                                className="interview-approvals-modal-btn interview-approvals-modal-btn--cancel"
                                onClick={() => setIsRecruitmentModalOpen(false)}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                className="interview-approvals-modal-btn interview-approvals-modal-btn--preview"
                                onClick={() => {
                                    setIsRecruitmentModalOpen(false); // Đóng modal recruitment khi mở preview
                                    setIsPreviewModalOpen(true);
                                }}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                                Preview
                            </button>
                            <button
                                type="submit"
                                className="interview-approvals-modal-btn interview-approvals-modal-btn--submit"
                                form="recruitment-form"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSubmitRecruitmentRequest(e);
                                }}
                            >
                                Gửi Yêu cầu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HR Approved Recruitment Requests Modal */}
            {isHr && isHrRecruitmentModalOpen && (
                <div className="interview-approvals-modal-overlay" onClick={() => setIsHrRecruitmentModalOpen(false)}>
                    <div className="interview-approvals-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="interview-approvals-modal-header">
                            <div style={{ flex: 1 }}>
                                <h2 className="interview-approvals-modal-title">Phiếu tuyển nhân sự đã duyệt</h2>
                                {hrRecruitmentRequests.length > 0 && (
                                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                                        Tổng cộng: <strong style={{ color: '#059669', fontWeight: 700, fontSize: '1rem' }}>{hrRecruitmentRequests.length}</strong> phiếu đã được duyệt
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                className="interview-approvals-modal-close"
                                onClick={() => setIsHrRecruitmentModalOpen(false)}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div className="interview-approvals-modal-body">
                            <div className="interview-approvals-table-wrapper">
                                <table className="interview-approvals-table">
                                    <thead>
                                        <tr>
                                            <th>Người gửi</th>
                                            <th>Chức danh</th>
                                            <th>Phòng ban</th>
                                            <th>Số lượng</th>
                                            <th>Ngày duyệt</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {hrRecruitmentRequests.length === 0 && (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '1rem' }}>Không có phiếu đã duyệt</td>
                                            </tr>
                                        )}
                                        {hrRecruitmentRequests.map((req) => (
                                            <tr
                                                key={req.id}
                                                className="clickable"
                                                onClick={() => {
                                                    setSelectedRequest(req);
                                                    setShowRequestDetail(true);
                                                }}
                                            >
                                                <td>{req.created_by_name || req.nguoi_gui || '-'}</td>
                                                <td>{req.chuc_danh_can_tuyen}</td>
                                                <td>{req.phong_ban_bo_phan}</td>
                                                <td>{req.so_luong_yeu_cau}</td>
                                                <td>{req.approved_at ? new Date(req.approved_at).toLocaleString('vi-VN') : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="interview-approvals-modal-footer">
                            <button
                                type="button"
                                className="interview-approvals-modal-btn interview-approvals-modal-btn--cancel"
                                onClick={() => setIsHrRecruitmentModalOpen(false)}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Recruitment Request Detail Modal */}
            {showRequestDetail && selectedRequest && (
                <div className="interview-approvals-modal-overlay" onClick={() => {
                    setShowRequestDetail(false);
                    setSelectedRequest(null);
                }}>
                    <div className="interview-approvals-modal-container interview-approvals-detail-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="interview-approvals-modal-header interview-approvals-detail-header">
                            <div className="interview-approvals-detail-header-content">
                                <div className="interview-approvals-detail-icon-wrapper">
                                    <svg className="interview-approvals-detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="interview-approvals-modal-title interview-approvals-detail-title">Chi tiết Yêu cầu Tuyển dụng</h2>
                                    <p className="interview-approvals-detail-subtitle">Thông tin chi tiết về yêu cầu tuyển dụng</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="interview-approvals-modal-close"
                                onClick={() => {
                                    setShowRequestDetail(false);
                                    setSelectedRequest(null);
                                }}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div className="interview-approvals-modal-body interview-approvals-detail-body">
                            {/* PHẦN I: Vị trí & Nhu cầu */}
                            <div className="interview-approvals-detail-section">
                                <div className="interview-approvals-detail-section-title">
                                    <svg className="interview-approvals-detail-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    <span>PHẦN I: Vị trí & Nhu cầu</span>
                                </div>
                                <div className="interview-approvals-detail-grid">
                                    <div className="interview-approvals-detail-item">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Người gửi</div>
                                            <div className="interview-approvals-detail-item-value">{selectedRequest.created_by_name}</div>
                                        </div>
                                    </div>
                                    <div className="interview-approvals-detail-item">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Chức danh cần tuyển</div>
                                            <div className="interview-approvals-detail-item-value">{selectedRequest.chuc_danh_can_tuyen}</div>
                                        </div>
                                    </div>
                                    <div className="interview-approvals-detail-item">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Phòng ban/Bộ phận</div>
                                            <div className="interview-approvals-detail-item-value">{selectedRequest.phong_ban_bo_phan}</div>
                                        </div>
                                    </div>
                                    <div className="interview-approvals-detail-item">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Người quản lý trực tiếp</div>
                                            <div className="interview-approvals-detail-item-value">{selectedRequest.nguoi_quan_ly_truc_tiep}</div>
                                        </div>
                                    </div>
                                    <div className="interview-approvals-detail-item">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Mô tả công việc (MTCV)</div>
                                            <div className="interview-approvals-detail-item-value">
                                                {selectedRequest.mo_ta_cong_viec === 'co' ? 'Đã có MTCV' :
                                                    selectedRequest.mo_ta_cong_viec === 'chua_co' ? 'Chưa có MTCV' :
                                                        selectedRequest.mo_ta_cong_viec || '-'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="interview-approvals-detail-item">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Số lượng yêu cầu</div>
                                            <div className="interview-approvals-detail-item-value">{selectedRequest.so_luong_yeu_cau}</div>
                                        </div>
                                    </div>
                                    <div className="interview-approvals-detail-item">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Loại lao động</div>
                                            <div className="interview-approvals-detail-item-value">
                                                {selectedRequest.loai_lao_dong === 'toan_thoi_gian' ? 'Toàn thời gian (Full-time)' :
                                                    selectedRequest.loai_lao_dong === 'thoi_vu' ? 'Thời vụ' :
                                                        selectedRequest.loai_lao_dong || '-'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="interview-approvals-detail-item">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Người quản lý gián tiếp</div>
                                            <div className="interview-approvals-detail-item-value">{selectedRequest.nguoi_quan_ly_gian_tiep || '-'}</div>
                                        </div>
                                    </div>
                                    <div className="interview-approvals-detail-item">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Lý do tuyển</div>
                                            <div className="interview-approvals-detail-item-value">
                                                {selectedRequest.ly_do_tuyen === 'thay_the' ? 'Thay thế' :
                                                    selectedRequest.ly_do_tuyen === 'nhu_cau_tang' ? 'Nhu cầu tăng' :
                                                        selectedRequest.ly_do_tuyen === 'vi_tri_moi' ? 'Vị trí mới' :
                                                            selectedRequest.ly_do_tuyen || '-'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {selectedRequest.yeu_cau_chi_tiet_cong_viec && (
                                    <div className="interview-approvals-detail-item-full">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Yêu cầu chi tiết về công việc/Vị trí mới</div>
                                            <div className="interview-approvals-detail-item-value interview-approvals-detail-textarea">{selectedRequest.yeu_cau_chi_tiet_cong_viec}</div>
                                        </div>
                                    </div>
                                )}
                                {selectedRequest.ly_do_khac_ghi_chu && (
                                    <div className="interview-approvals-detail-item-full">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Lý do khác / Ghi chú</div>
                                            <div className="interview-approvals-detail-item-value interview-approvals-detail-textarea">{selectedRequest.ly_do_khac_ghi_chu}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* PHẦN II: Tiêu chuẩn Tuyển chọn */}
                            <div className="interview-approvals-detail-section">
                                <div className="interview-approvals-detail-section-title">
                                    <svg className="interview-approvals-detail-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                                    </svg>
                                    <span>PHẦN II: Tiêu chuẩn Tuyển chọn</span>
                                </div>
                                <div className="interview-approvals-detail-grid">
                                    <div className="interview-approvals-detail-item">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Giới tính</div>
                                            <div className="interview-approvals-detail-item-value">
                                                {selectedRequest.gioi_tinh === 'bat_ky' ? 'Bất kỳ' :
                                                    selectedRequest.gioi_tinh === 'nam' ? 'Nam' :
                                                        selectedRequest.gioi_tinh === 'nu' ? 'Nữ' :
                                                            selectedRequest.gioi_tinh || '-'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="interview-approvals-detail-item">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Độ tuổi</div>
                                            <div className="interview-approvals-detail-item-value">{selectedRequest.do_tuoi || '-'}</div>
                                        </div>
                                    </div>
                                    <div className="interview-approvals-detail-item">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Trình độ học vấn yêu cầu</div>
                                            <div className="interview-approvals-detail-item-value">{selectedRequest.trinh_do_hoc_van_yeu_cau || '-'}</div>
                                        </div>
                                    </div>
                                    <div className="interview-approvals-detail-item">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Kinh nghiệm chuyên môn</div>
                                            <div className="interview-approvals-detail-item-value">
                                                {selectedRequest.kinh_nghiem_chuyen_mon === 'khong_yeu_cau' ? 'Không yêu cầu' :
                                                    selectedRequest.kinh_nghiem_chuyen_mon === 'co_yeu_cau' ? 'Có yêu cầu' :
                                                        selectedRequest.kinh_nghiem_chuyen_mon || '-'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {selectedRequest.chi_tiet_kinh_nghiem && (
                                    <div className="interview-approvals-detail-item-full">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Chi tiết kinh nghiệm</div>
                                            <div className="interview-approvals-detail-item-value interview-approvals-detail-textarea">{selectedRequest.chi_tiet_kinh_nghiem}</div>
                                        </div>
                                    </div>
                                )}
                                {selectedRequest.kien_thuc_chuyen_mon_khac && (
                                    <div className="interview-approvals-detail-item-full">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Kiến thức chuyên môn khác / Ngành nghề liên quan</div>
                                            <div className="interview-approvals-detail-item-value interview-approvals-detail-textarea">{selectedRequest.kien_thuc_chuyen_mon_khac}</div>
                                        </div>
                                    </div>
                                )}
                                {selectedRequest.yeu_cau_ngoai_ngu && (
                                    <div className="interview-approvals-detail-item-full">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Yêu cầu Ngoại ngữ</div>
                                            <div className="interview-approvals-detail-item-value interview-approvals-detail-textarea">{selectedRequest.yeu_cau_ngoai_ngu}</div>
                                        </div>
                                    </div>
                                )}
                                {selectedRequest.yeu_cau_vi_tinh_ky_nang_khac && (
                                    <div className="interview-approvals-detail-item-full">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Yêu cầu Vi tính / Kỹ năng khác</div>
                                            <div className="interview-approvals-detail-item-value interview-approvals-detail-textarea">{selectedRequest.yeu_cau_vi_tinh_ky_nang_khac}</div>
                                        </div>
                                    </div>
                                )}
                                {selectedRequest.ky_nang_giao_tiep && (
                                    <div className="interview-approvals-detail-item-full">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Kỹ năng giao tiếp</div>
                                            <div className="interview-approvals-detail-item-value interview-approvals-detail-textarea">{selectedRequest.ky_nang_giao_tiep}</div>
                                        </div>
                                    </div>
                                )}
                                {selectedRequest.thai_do_lam_viec && (
                                    <div className="interview-approvals-detail-item-full">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Thái độ làm việc</div>
                                            <div className="interview-approvals-detail-item-value interview-approvals-detail-textarea">{selectedRequest.thai_do_lam_viec}</div>
                                        </div>
                                    </div>
                                )}
                                {selectedRequest.ky_nang_quan_ly && (
                                    <div className="interview-approvals-detail-item-full">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Kỹ năng quản lý</div>
                                            <div className="interview-approvals-detail-item-value interview-approvals-detail-textarea">{selectedRequest.ky_nang_quan_ly}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Thông tin bổ sung */}
                            <div className="interview-approvals-detail-section">
                                <div className="interview-approvals-detail-section-title">
                                    <svg className="interview-approvals-detail-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                    <span>Thông tin bổ sung</span>
                                </div>
                                <div className="interview-approvals-detail-grid">
                                    <div className="interview-approvals-detail-item">
                                        <div className="interview-approvals-detail-item-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                        </div>
                                        <div className="interview-approvals-detail-item-content">
                                            <div className="interview-approvals-detail-item-label">Ngày gửi</div>
                                            <div className="interview-approvals-detail-item-value">{new Date(selectedRequest.created_at).toLocaleString('vi-VN')}</div>
                                        </div>
                                    </div>
                                    {selectedRequest.status && (
                                        <div className="interview-approvals-detail-item">
                                            <div className="interview-approvals-detail-item-icon">
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            </div>
                                            <div className="interview-approvals-detail-item-content">
                                                <div className="interview-approvals-detail-item-label">Trạng thái</div>
                                                <div className="interview-approvals-detail-item-value">
                                                    {selectedRequest.status === 'PENDING' ? 'Chờ duyệt' :
                                                        selectedRequest.status === 'APPROVED' ? 'Đã duyệt' :
                                                            selectedRequest.status === 'REJECTED' ? 'Đã từ chối' :
                                                                selectedRequest.status === 'CANCELLED' ? 'Đã hủy' :
                                                                    selectedRequest.status}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="interview-approvals-modal-footer interview-approvals-detail-footer">
                            <button
                                type="button"
                                className="interview-approvals-modal-btn interview-approvals-modal-btn--cancel interview-approvals-detail-btn-cancel"
                                onClick={() => {
                                    setShowRequestDetail(false);
                                    setSelectedRequest(null);
                                }}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                                <span>Đóng</span>
                            </button>
                            {isBranchDirector && selectedRequest.status === 'PENDING' && (
                                <>
                                    <button
                                        type="button"
                                        className="interview-approvals-modal-btn interview-approvals-modal-btn--reject interview-approvals-detail-btn-reject"
                                        onClick={() => handleRejectRecruitmentRequest(selectedRequest.id)}
                                    >
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                        <span>Từ chối</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="interview-approvals-modal-btn interview-approvals-modal-btn--approve interview-approvals-detail-btn-approve"
                                        onClick={() => handleApproveRecruitmentRequest(selectedRequest.id)}
                                    >
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                        <span>Duyệt</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Interview Request Detail Modal */}
            {showInterviewRequestDetail && selectedInterviewRequest && (
                <div className="interview-approvals-modal-overlay" onClick={() => {
                    setShowInterviewRequestDetail(false);
                    setSelectedInterviewRequest(null);
                }}>
                    <div className="interview-approvals-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="interview-approvals-modal-header">
                            <h2 className="interview-approvals-modal-title">Chi tiết yêu cầu phỏng vấn</h2>
                            <button
                                type="button"
                                className="interview-approvals-modal-close"
                                onClick={() => {
                                    setShowInterviewRequestDetail(false);
                                    setSelectedInterviewRequest(null);
                                }}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div className="interview-approvals-modal-body">
                            {/* Header với tên và status */}
                            <div className="interview-approvals-detail-header-section">
                                <div className="interview-approvals-detail-header-content">
                                    <div className="interview-approvals-detail-header-icon">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                        </svg>
                                    </div>
                                    <div className="interview-approvals-detail-header-text">
                                        <h3 className="interview-approvals-detail-header-title">
                                            {selectedInterviewRequest.candidate_name || '---'}
                                        </h3>
                                        <span className={`interview-approvals-detail-status-badge ${selectedInterviewRequest.status === 'WAITING_FOR_OTHER_APPROVAL' ? 'status-waiting' :
                                            selectedInterviewRequest.status === 'READY_FOR_INTERVIEW' ? 'status-ready' : 'status-pending'
                                            }`}>
                                            {selectedInterviewRequest.status === 'WAITING_FOR_OTHER_APPROVAL' ? (
                                                selectedInterviewRequest.manager_approved && !selectedInterviewRequest.branch_director_approved
                                                    ? `Đang chờ giám đốc chi nhánh${selectedInterviewRequest.branch_director_name ? ` - ${selectedInterviewRequest.branch_director_name}` : ''}`
                                                    : !selectedInterviewRequest.manager_approved && selectedInterviewRequest.branch_director_approved
                                                        ? `Đang chờ quản lý trực tiếp${selectedInterviewRequest.manager_name ? ` - ${selectedInterviewRequest.manager_name}` : ''}`
                                                        : 'Đang chờ người kia duyệt phỏng vấn'
                                            ) : selectedInterviewRequest.status === 'READY_FOR_INTERVIEW' ? (
                                                'Sẵn sàng phỏng vấn'
                                            ) : (
                                                'Chờ duyệt phỏng vấn'
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Thông tin gọn gàng */}
                            <div className="interview-approvals-detail-grid">
                                <div className="interview-approvals-detail-item">
                                    <div className="interview-approvals-detail-item-label">
                                        <svg className="interview-approvals-detail-item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                        </svg>
                                        <span className="interview-approvals-detail-item-label-text">Vị trí ứng tuyển</span>
                                    </div>
                                    <div className="interview-approvals-detail-item-value">
                                        {selectedInterviewRequest.vi_tri_ung_tuyen || selectedInterviewRequest.chuc_danh_can_tuyen || '---'}
                                    </div>
                                </div>
                                <div className="interview-approvals-detail-item">
                                    <div className="interview-approvals-detail-item-label">
                                        <svg className="interview-approvals-detail-item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                        </svg>
                                        <span className="interview-approvals-detail-item-label-text">Phòng ban</span>
                                    </div>
                                    <div className="interview-approvals-detail-item-value">
                                        {selectedInterviewRequest.phong_ban || selectedInterviewRequest.phong_ban_bo_phan || '---'}
                                    </div>
                                </div>
                                <div className="interview-approvals-detail-item">
                                    <div className="interview-approvals-detail-item-label">
                                        <svg className="interview-approvals-detail-item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        <span className="interview-approvals-detail-item-label-text">Thời gian phỏng vấn</span>
                                    </div>
                                    <div className="interview-approvals-detail-item-value">
                                        {selectedInterviewRequest.interview_time ? new Date(selectedInterviewRequest.interview_time).toLocaleString('vi-VN') : '---'}
                                    </div>
                                </div>
                                <div className="interview-approvals-detail-item">
                                    <div className="interview-approvals-detail-item-label">
                                        <svg className="interview-approvals-detail-item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                        </svg>
                                        <span className="interview-approvals-detail-item-label-text">Người gửi</span>
                                    </div>
                                    <div className="interview-approvals-detail-item-value">
                                        {selectedInterviewRequest.manager_id ? (
                                            <span>
                                                Quản lý trực tiếp{selectedInterviewRequest.manager_name ? ` - ${selectedInterviewRequest.manager_name}` : ''}
                                            </span>
                                        ) : selectedInterviewRequest.branch_director_id ? (
                                            <span>
                                                Giám đốc chi nhánh{selectedInterviewRequest.branch_director_name ? ` - ${selectedInterviewRequest.branch_director_name}` : ''}
                                            </span>
                                        ) : '---'}
                                    </div>
                                </div>
                                {selectedInterviewRequest.manager_id && (
                                    <div className="interview-approvals-detail-item">
                                        <div className="interview-approvals-detail-item-label">
                                            <svg className="interview-approvals-detail-item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                            </svg>
                                            <span className="interview-approvals-detail-item-label-text">Quản lý trực tiếp</span>
                                        </div>
                                        <div className="interview-approvals-detail-item-value">
                                            {selectedInterviewRequest.manager_approved ? (
                                                <span style={{ color: '#059669', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                    </svg>
                                                    Đã duyệt{selectedInterviewRequest.manager_approved_at ? ` (${new Date(selectedInterviewRequest.manager_approved_at).toLocaleString('vi-VN')})` : ''}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#f59e0b', fontWeight: '600' }}>Chờ duyệt</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {selectedInterviewRequest.branch_director_id && (
                                    <div className="interview-approvals-detail-item">
                                        <div className="interview-approvals-detail-item-label">
                                            <svg className="interview-approvals-detail-item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                                            </svg>
                                            <span className="interview-approvals-detail-item-label-text">Giám đốc chi nhánh</span>
                                        </div>
                                        <div className="interview-approvals-detail-item-value">
                                            {selectedInterviewRequest.branch_director_approved ? (
                                                <span style={{ color: '#059669', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                    </svg>
                                                    Đã duyệt{selectedInterviewRequest.branch_director_approved_at ? ` (${new Date(selectedInterviewRequest.branch_director_approved_at).toLocaleString('vi-VN')})` : ''}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#f59e0b', fontWeight: '600' }}>Chờ duyệt</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="interview-approvals-modal-footer">
                            <button
                                type="button"
                                className="interview-approvals-modal-btn interview-approvals-modal-btn--info"
                                onClick={() => {
                                    if (selectedInterviewRequest.candidate_id) {
                                        handleViewCandidateDetail(selectedInterviewRequest.candidate_id);
                                    }
                                }}
                                disabled={loadingCandidate || !selectedInterviewRequest.candidate_id}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '18px', height: '18px', marginRight: '8px' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                </svg>
                                Xem thông tin ứng viên
                            </button>
                            <button
                                type="button"
                                className="interview-approvals-modal-btn interview-approvals-modal-btn--info"
                                onClick={async () => {
                                    if (!selectedInterviewRequest.candidate_id) return;

                                    // Fetch candidate to get CV path
                                    try {
                                        const response = await candidatesAPI.getById(selectedInterviewRequest.candidate_id);
                                        if (response.data.success && response.data.data) {
                                            const candidate = response.data.data;
                                            if (candidate.cv_dinh_kem_path) {
                                                // CV path is stored in database, construct URL
                                                const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
                                                const cvUrl = candidate.cv_dinh_kem_path.startsWith('http')
                                                    ? candidate.cv_dinh_kem_path
                                                    : `${apiUrl}${candidate.cv_dinh_kem_path}`;
                                                window.open(cvUrl, '_blank');
                                            } else {
                                                if (showToast) {
                                                    showToast('Ứng viên chưa có CV đính kèm', 'warning');
                                                }
                                            }
                                        }
                                    } catch (error) {
                                        console.error('Error loading CV:', error);
                                        if (showToast) {
                                            showToast('Lỗi khi tải CV', 'error');
                                        }
                                    }
                                }}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '18px', height: '18px', marginRight: '8px' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                Xem CV đính kèm
                            </button>
                            {/* Chỉ hiển thị nút Duyệt và Từ chối nếu:
                                1. Status là PENDING_INTERVIEW hoặc WAITING_FOR_OTHER_APPROVAL
                                2. Người dùng hiện tại chưa duyệt:
                                   - Nếu là manager (manager_id === currentUser.id) thì manager_approved phải false
                                   - Nếu là branch director (branch_director_id === currentUser.id) thì branch_director_approved phải false
                                3. Người dùng hiện tại có quyền duyệt (manager_id hoặc branch_director_id khớp với currentUser.id)
                            */}
                            {selectedInterviewRequest &&
                                (selectedInterviewRequest.status === 'PENDING_INTERVIEW' || selectedInterviewRequest.status === 'WAITING_FOR_OTHER_APPROVAL') &&
                                (() => {
                                    // Kiểm tra xem người dùng hiện tại có phải là manager không
                                    const isCurrentUserManager = selectedInterviewRequest.manager_id === currentUser?.id;
                                    // Kiểm tra xem người dùng hiện tại có phải là branch director không
                                    const isCurrentUserBranchDirector = selectedInterviewRequest.branch_director_id === currentUser?.id;

                                    // Chỉ hiển thị nút nếu:
                                    // 1. Người dùng là manager và chưa duyệt (manager_approved === false)
                                    // 2. HOẶC người dùng là branch director và chưa duyệt (branch_director_approved === false)
                                    const canShowButtons = (isCurrentUserManager && !selectedInterviewRequest.manager_approved) ||
                                        (isCurrentUserBranchDirector && !selectedInterviewRequest.branch_director_approved);

                                    return canShowButtons;
                                })() && (
                                    <>
                                        <button
                                            type="button"
                                            className="interview-approvals-modal-btn interview-approvals-modal-btn--approve"
                                            onClick={() => handleApproveInterviewRequest(selectedInterviewRequest.id)}
                                        >
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '18px', height: '18px', marginRight: '8px' }}>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                            </svg>
                                            Duyệt
                                        </button>
                                        <button
                                            type="button"
                                            className="interview-approvals-modal-btn interview-approvals-modal-btn--reject"
                                            onClick={() => handleRejectInterviewRequest(selectedInterviewRequest.id)}
                                        >
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '18px', height: '18px', marginRight: '8px' }}>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                            </svg>
                                            Từ chối
                                        </button>
                                    </>
                                )}
                            <button
                                type="button"
                                className="interview-approvals-modal-btn interview-approvals-modal-btn--cancel"
                                onClick={() => {
                                    setShowInterviewRequestDetail(false);
                                    setSelectedInterviewRequest(null);
                                }}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal - Design Mới */}
            {isPreviewModalOpen && (
                <div className="preview-modal-overlay" onClick={() => setIsPreviewModalOpen(false)}>
                    <div className="preview-modal-container" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="preview-modal-header">
                            <div className="preview-modal-header-content">
                                <div className="preview-modal-icon">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="preview-modal-title">Thư tuyển dụng</h2>
                                    <p className="preview-modal-subtitle">Kiểm tra thông tin trước khi gửi</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="preview-modal-close"
                                onClick={() => setIsPreviewModalOpen(false)}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="preview-modal-body">
                            {/* Section 1: Thông Tin Cơ Bản */}
                            <div className="preview-section">
                                <div className="preview-section-header">
                                    <h3 className="preview-section-title">
                                        <svg className="preview-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                        </svg>
                                        Thông Tin Vị Trí
                                    </h3>
                                </div>
                                <div className="preview-grid">
                                    <div className="preview-field">
                                        <span className="preview-label">Chức danh</span>
                                        <span className="preview-value">{recruitmentForm.chucDanhCanTuyen || 'Chưa nhập'}</span>
                                    </div>
                                    <div className="preview-field">
                                        <span className="preview-label">Phòng ban</span>
                                        <span className="preview-value">{recruitmentForm.phongBanBoPhan || 'Chưa nhập'}</span>
                                    </div>
                                    <div className="preview-field">
                                        <span className="preview-label">Quản lý trực tiếp</span>
                                        <span className="preview-value">{recruitmentForm.nguoiQuanLyTrucTiep || 'Chưa nhập'}</span>
                                    </div>
                                    <div className="preview-field preview-field-highlight">
                                        <span className="preview-label">Số lượng</span>
                                        <span className="preview-value preview-value-highlight">{recruitmentForm.soLuongYeuCau || '---'}</span>
                                    </div>
                                    <div className="preview-field">
                                        <span className="preview-label">Loại lao động</span>
                                        <span className="preview-value">
                                            {recruitmentForm.loaiLaoDong === 'toan_thoi_gian' ? 'Toàn thời gian' :
                                                recruitmentForm.loaiLaoDong === 'thoi_vu' ? 'Thời vụ' : 'Chưa chọn'}
                                        </span>
                                    </div>
                                    <div className="preview-field">
                                        <span className="preview-label">Lý do tuyển</span>
                                        <span className="preview-value">
                                            {recruitmentForm.lyDoTuyen === 'thay_the' ? 'Thay thế' :
                                                recruitmentForm.lyDoTuyen === 'nhu_cau_tang' ? 'Nhu cầu tăng' :
                                                    recruitmentForm.lyDoTuyen === 'vi_tri_moi' ? 'Vị trí mới' : 'Chưa chọn'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Tiêu Chuẩn Tuyển Chọn */}
                            <div className="preview-section">
                                <div className="preview-section-header">
                                    <h3 className="preview-section-title">
                                        <svg className="preview-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        Tiêu Chuẩn Tuyển Chọn
                                    </h3>
                                </div>
                                <div className="preview-grid">
                                    <div className="preview-field">
                                        <span className="preview-label">Giới tính</span>
                                        <span className="preview-value">
                                            {recruitmentForm.gioiTinh === 'bat_ky' ? 'Bất kỳ' :
                                                recruitmentForm.gioiTinh === 'nam' ? 'Nam' :
                                                    recruitmentForm.gioiTinh === 'nu' ? 'Nữ' : 'Chưa chọn'}
                                        </span>
                                    </div>
                                    <div className="preview-field">
                                        <span className="preview-label">Độ tuổi</span>
                                        <span className="preview-value">{recruitmentForm.doTuoi || 'Không yêu cầu'}</span>
                                    </div>
                                    <div className="preview-field">
                                        <span className="preview-label">Kinh nghiệm</span>
                                        <span className="preview-value">
                                            {recruitmentForm.kinhNghiemChuyenMon === 'khong_yeu_cau' ? 'Không yêu cầu' :
                                                recruitmentForm.kinhNghiemChuyenMon === 'co_yeu_cau' ? 'Có yêu cầu' : 'Chưa chọn'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Chi Tiết Yêu Cầu */}
                            {(recruitmentForm.trinhDoHocVanYeuCau || recruitmentForm.chiTietKinhNghiem || recruitmentForm.kienThucChuyenMonKhac ||
                                recruitmentForm.yeuCauNgoaiNgu || recruitmentForm.yeuCauViTinhKyNangKhac || recruitmentForm.kyNangGiaoTiep ||
                                recruitmentForm.thaiDoLamViec || recruitmentForm.kyNangQuanLy || recruitmentForm.yeuCauChiTietCongViec ||
                                recruitmentForm.lyDoKhacGhiChu) && (
                                    <div className="preview-section">
                                        <div className="preview-section-header">
                                            <h3 className="preview-section-title">
                                                <svg className="preview-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                </svg>
                                                Chi Tiết Yêu Cầu
                                            </h3>
                                        </div>
                                        <div className="preview-text-cards">
                                            {recruitmentForm.trinhDoHocVanYeuCau && (
                                                <div className="preview-text-card">
                                                    <span className="preview-label">Trình độ học vấn</span>
                                                    <span className="preview-value">{recruitmentForm.trinhDoHocVanYeuCau}</span>
                                                </div>
                                            )}
                                            {recruitmentForm.kinhNghiemChuyenMon === 'co_yeu_cau' && recruitmentForm.chiTietKinhNghiem && (
                                                <div className="preview-text-card">
                                                    <span className="preview-label">Chi tiết kinh nghiệm</span>
                                                    <span className="preview-value">{recruitmentForm.chiTietKinhNghiem}</span>
                                                </div>
                                            )}
                                            {recruitmentForm.kienThucChuyenMonKhac && (
                                                <div className="preview-text-card">
                                                    <span className="preview-label">Kiến thức chuyên môn</span>
                                                    <span className="preview-value">{recruitmentForm.kienThucChuyenMonKhac}</span>
                                                </div>
                                            )}
                                            {recruitmentForm.yeuCauNgoaiNgu && (
                                                <div className="preview-text-card">
                                                    <span className="preview-label">Yêu cầu ngoại ngữ</span>
                                                    <span className="preview-value">{recruitmentForm.yeuCauNgoaiNgu}</span>
                                                </div>
                                            )}
                                            {recruitmentForm.yeuCauViTinhKyNangKhac && (
                                                <div className="preview-text-card">
                                                    <span className="preview-label">Vi tính / Kỹ năng</span>
                                                    <span className="preview-value">{recruitmentForm.yeuCauViTinhKyNangKhac}</span>
                                                </div>
                                            )}
                                            {recruitmentForm.kyNangGiaoTiep && (
                                                <div className="preview-text-card">
                                                    <span className="preview-label">Kỹ năng giao tiếp</span>
                                                    <span className="preview-value">{recruitmentForm.kyNangGiaoTiep}</span>
                                                </div>
                                            )}
                                            {recruitmentForm.thaiDoLamViec && (
                                                <div className="preview-text-card">
                                                    <span className="preview-label">Thái độ làm việc</span>
                                                    <span className="preview-value">{recruitmentForm.thaiDoLamViec}</span>
                                                </div>
                                            )}
                                            {recruitmentForm.kyNangQuanLy && (
                                                <div className="preview-text-card">
                                                    <span className="preview-label">Kỹ năng quản lý</span>
                                                    <span className="preview-value">{recruitmentForm.kyNangQuanLy}</span>
                                                </div>
                                            )}
                                            {recruitmentForm.yeuCauChiTietCongViec && (
                                                <div className="preview-text-card">
                                                    <span className="preview-label">Yêu cầu chi tiết công việc</span>
                                                    <span className="preview-value">{recruitmentForm.yeuCauChiTietCongViec}</span>
                                                </div>
                                            )}
                                            {recruitmentForm.lyDoKhacGhiChu && (
                                                <div className="preview-text-card">
                                                    <span className="preview-label">Ghi chú</span>
                                                    <span className="preview-value">{recruitmentForm.lyDoKhacGhiChu}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                        </div>

                        {/* Footer */}
                        <div className="preview-modal-footer">
                            <button
                                type="button"
                                className="preview-modal-btn"
                                onClick={() => setIsPreviewModalOpen(false)}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Candidate Detail Modal */}
            {showCandidateDetailModal && viewingCandidate && (
                <div className="recruitment-view-candidate-modal-overlay" onClick={() => {
                    setShowCandidateDetailModal(false);
                    setViewingCandidate(null);
                }}>
                    <div className="recruitment-view-candidate-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="recruitment-view-candidate-modal-header">
                            <h2 className="recruitment-view-candidate-modal-title">Thông tin Ứng viên</h2>
                            <button
                                type="button"
                                className="recruitment-view-candidate-modal-close"
                                onClick={() => {
                                    setShowCandidateDetailModal(false);
                                    setViewingCandidate(null);
                                }}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div className="recruitment-view-candidate-modal-body">
                            {/* Section: FILE ĐÍNH KÈM */}
                            {(() => {
                                // Hỗ trợ cả snake_case và camelCase
                                const anhDaiDienPath = viewingCandidate.anh_dai_dien_path || viewingCandidate.anhDaiDienPath;
                                const cvDinhKemPath = viewingCandidate.cv_dinh_kem_path || viewingCandidate.cvDinhKemPath;

                                if (!anhDaiDienPath && !cvDinhKemPath) return null;

                                return (
                                    <div className="recruitment-view-candidate-section">
                                        <h3 className="recruitment-view-candidate-section-title">
                                            <svg className="recruitment-view-candidate-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                                            </svg>
                                            FILE ĐÍNH KÈM
                                        </h3>
                                        <div className="recruitment-view-candidate-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                            {/* Ảnh đại diện */}
                                            {anhDaiDienPath && (
                                                <div className="recruitment-view-candidate-field" style={{ gridColumn: 'span 1' }}>
                                                    <div className="recruitment-view-candidate-field-label">
                                                        <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                        </svg>
                                                        Ảnh đại diện
                                                    </div>
                                                    <div className="recruitment-view-candidate-field-value" style={{ padding: '1rem', textAlign: 'center' }}>
                                                        <img
                                                            src={`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}${anhDaiDienPath}`}
                                                            alt="Ảnh đại diện"
                                                            style={{
                                                                maxWidth: '200px',
                                                                maxHeight: '250px',
                                                                borderRadius: '8px',
                                                                border: '2px solid #e5e7eb',
                                                                objectFit: 'cover',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => {
                                                                const imgUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}${anhDaiDienPath}`;
                                                                window.open(imgUrl, '_blank');
                                                            }}
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.nextSibling.style.display = 'block';
                                                            }}
                                                        />
                                                        <div style={{ display: 'none', color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                                            Không thể tải ảnh
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* CV đính kèm */}
                                            {cvDinhKemPath && (
                                                <div className="recruitment-view-candidate-field" style={{ gridColumn: 'span 1' }}>
                                                    <div className="recruitment-view-candidate-field-label">
                                                        <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                        </svg>
                                                        CV đính kèm
                                                    </div>
                                                    <div className="recruitment-view-candidate-field-value" style={{ padding: '1rem' }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '1rem',
                                                            padding: '1rem',
                                                            backgroundColor: '#f3f4f6',
                                                            borderRadius: '8px',
                                                            border: '2px solid #e5e7eb'
                                                        }}>
                                                            <svg style={{ width: '48px', height: '48px', color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                                            </svg>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                                                                    CV đính kèm
                                                                </div>
                                                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                                    CV đính kèm
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const cvUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}${cvDinhKemPath}`;
                                                                    window.open(cvUrl, '_blank');
                                                                }}
                                                                style={{
                                                                    padding: '0.5rem 1rem',
                                                                    backgroundColor: '#3b82f6',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '6px',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.875rem',
                                                                    fontWeight: '500',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.5rem',
                                                                    transition: 'background-color 0.2s'
                                                                }}
                                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                                                                onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                                                            >
                                                                <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                                                </svg>
                                                                Xem CV
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Section I: THÔNG TIN CÁ NHÂN */}
                            <div className="recruitment-view-candidate-section">
                                <h3 className="recruitment-view-candidate-section-title">
                                    <svg className="recruitment-view-candidate-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                    </svg>
                                    I. THÔNG TIN CÁ NHÂN
                                </h3>
                                <div className="recruitment-view-candidate-grid">
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                            </svg>
                                            Họ và tên
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.ho_ten || '---'}</div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            Ngày sinh
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{formatDate(viewingCandidate.ngay_sinh) || '---'}</div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                            </svg>
                                            Số điện thoại
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.so_dien_thoai || '---'}</div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                            </svg>
                                            Email
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.email || '---'}</div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                            </svg>
                                            Vị trí ứng tuyển
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.vi_tri_ung_tuyen || '---'}</div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                            </svg>
                                            Phòng ban
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.phong_ban || '---'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Section II: QUÁ TRÌNH CÔNG TÁC */}
                            {viewingCandidate.workExperiences && viewingCandidate.workExperiences.length > 0 && (
                                <div className="recruitment-view-candidate-section">
                                    <h3 className="recruitment-view-candidate-section-title">
                                        <svg className="recruitment-view-candidate-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                        </svg>
                                        II. QUÁ TRÌNH CÔNG TÁC
                                    </h3>
                                    <div className="recruitment-view-candidate-work-experience">
                                        {viewingCandidate.workExperiences.map((exp, idx) => (
                                            <div key={idx} className="recruitment-view-candidate-work-item">
                                                <div className="recruitment-view-candidate-work-header">
                                                    <svg className="recruitment-view-candidate-work-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                                    </svg>
                                                    <div>
                                                        <div className="recruitment-view-candidate-work-company">{exp.cong_ty || exp.congTy || '---'}</div>
                                                        <div className="recruitment-view-candidate-work-position">{exp.chuc_danh || exp.chucDanh || '---'}</div>
                                                        <div className="recruitment-view-candidate-work-period">
                                                            {formatDate(exp.ngay_bat_dau || exp.ngayBatDau) || '---'} - {formatDate(exp.ngay_ket_thuc || exp.ngayKetThuc) || 'Hiện tại'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Section III: QUÁ TRÌNH ĐÀO TẠO */}
                            {viewingCandidate.trainingProcesses && viewingCandidate.trainingProcesses.length > 0 && (
                                <div className="recruitment-view-candidate-section">
                                    <h3 className="recruitment-view-candidate-section-title">
                                        <svg className="recruitment-view-candidate-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                        </svg>
                                        III. QUÁ TRÌNH ĐÀO TẠO
                                    </h3>
                                    <div className="recruitment-view-candidate-training">
                                        {viewingCandidate.trainingProcesses.map((tp, idx) => (
                                            <div key={idx} className="recruitment-view-candidate-training-item">
                                                <div className="recruitment-view-candidate-training-header">
                                                    <svg className="recruitment-view-candidate-training-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path>
                                                    </svg>
                                                    <div>
                                                        <div className="recruitment-view-candidate-training-school">{tp.truong_dao_tao || tp.truongDaoTao || '---'}</div>
                                                        <div className="recruitment-view-candidate-training-major">{tp.chuyen_nganh || tp.chuyenNganh || '---'}</div>
                                                        <div className="recruitment-view-candidate-training-period">
                                                            {formatDate(tp.ngay_bat_dau || tp.ngayBatDau) || '---'} - {formatDate(tp.ngay_ket_thuc || tp.ngayKetThuc) || 'Hiện tại'}
                                                        </div>
                                                        {tp.van_bang && (
                                                            <div className="recruitment-view-candidate-training-degree">Văn bằng: {tp.van_bang}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Section IV: TRÌNH ĐỘ NGOẠI NGỮ */}
                            {viewingCandidate.foreignLanguages && viewingCandidate.foreignLanguages.length > 0 && (
                                <div className="recruitment-view-candidate-section">
                                    <h3 className="recruitment-view-candidate-section-title">
                                        <svg className="recruitment-view-candidate-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                                        </svg>
                                        IV. TRÌNH ĐỘ NGOẠI NGỮ
                                    </h3>
                                    <div className="recruitment-view-candidate-languages">
                                        {viewingCandidate.foreignLanguages.map((fl, idx) => (
                                            <div key={idx} className="recruitment-view-candidate-language-item">
                                                <div className="recruitment-view-candidate-language-header">
                                                    <svg className="recruitment-view-candidate-language-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                                                    </svg>
                                                    <div>
                                                        <div className="recruitment-view-candidate-language-name">{fl.ngoai_ngu || fl.ngoaiNgu || '---'}</div>
                                                        {fl.chung_chi && (
                                                            <div className="recruitment-view-candidate-language-cert">Chứng chỉ: {fl.chung_chi}</div>
                                                        )}
                                                        {fl.diem && (
                                                            <div className="recruitment-view-candidate-language-score">Điểm: {fl.diem}</div>
                                                        )}
                                                        {fl.kha_nang_su_dung && (
                                                            <div className="recruitment-view-candidate-language-level">Khả năng: {fl.kha_nang_su_dung}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="recruitment-view-candidate-modal-footer">
                            <button
                                type="button"
                                className="recruitment-view-candidate-modal-btn recruitment-view-candidate-modal-btn--close"
                                onClick={() => {
                                    setShowCandidateDetailModal(false);
                                    setViewingCandidate(null);
                                }}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Evaluation Modal */}
            {showEvaluationModal && selectedEvaluationRequest && (
                <div className="interview-evaluation-modal-overlay" onClick={() => {
                    setShowEvaluationModal(false);
                    setSelectedEvaluationRequest(null);
                }}>
                    <div className="interview-evaluation-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="interview-evaluation-modal-header">
                            <h2 className="interview-evaluation-modal-title">Đánh giá ứng viên phỏng vấn</h2>
                            <button
                                type="button"
                                className="interview-evaluation-modal-close"
                                onClick={() => {
                                    setShowEvaluationModal(false);
                                    setSelectedEvaluationRequest(null);
                                }}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div className="interview-evaluation-modal-body">
                            {/* Basic Information Section */}
                            <div className="interview-evaluation-section">
                                <h3 className="interview-evaluation-section-title">Thông tin ứng viên và phỏng vấn</h3>
                                <div className="interview-evaluation-form-grid">
                                    <div className="interview-evaluation-form-group">
                                        <label>Tên ứng viên</label>
                                        <input
                                            type="text"
                                            value={evaluationForm.tenUngVien}
                                            readOnly={true}
                                            placeholder="Nhập tên ứng viên"
                                        />
                                    </div>
                                    <div className="interview-evaluation-form-group">
                                        <label>Vị trí ứng tuyển</label>
                                        <input
                                            type="text"
                                            value={evaluationForm.viTriUngTuyen}
                                            readOnly={true}
                                            placeholder="Nhập vị trí ứng tuyển"
                                        />
                                    </div>
                                    <div className="interview-evaluation-form-group">
                                        <label>Cấp bậc</label>
                                        <input
                                            type="text"
                                            value={evaluationForm.capBac}
                                            readOnly={true}
                                            placeholder="Nhập cấp bậc"
                                        />
                                    </div>
                                    <div className="interview-evaluation-form-group">
                                        <label>Người quản lý trực tiếp</label>
                                        <input
                                            type="text"
                                            value={evaluationForm.nguoiQuanLyTrucTiep}
                                            readOnly={true}
                                            placeholder="Nhập tên người quản lý trực tiếp"
                                        />
                                    </div>
                                    <div className="interview-evaluation-form-group">
                                        <label>Người phỏng vấn 1</label>
                                        <input
                                            type="text"
                                            value={evaluationForm.nguoiPhongVan1}
                                            readOnly={true}
                                            placeholder="Nhập tên người phỏng vấn"
                                        />
                                    </div>
                                    <div className="interview-evaluation-form-group">
                                        <label>Ngày phỏng vấn</label>
                                        <input
                                            type="datetime-local"
                                            value={evaluationForm.ngayPhongVan}
                                            readOnly={true}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Evaluation Criteria Table */}
                            <div className="interview-evaluation-section">
                                <h3 className="interview-evaluation-section-title">Tiêu chí đánh giá</h3>
                                <div className="interview-evaluation-table-wrapper">
                                    <table className="interview-evaluation-table">
                                        <thead>
                                            <tr>
                                                <th>Tiêu chí đánh giá</th>
                                                <th style={{ width: '120px' }}>Điểm/5</th>
                                                <th>Lý do</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>Kỹ năng giao tiếp</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="5"
                                                        value={evaluationForm.diemKyNangGiaoTiep}
                                                        onChange={(e) => setEvaluationForm({ ...evaluationForm, diemKyNangGiaoTiep: e.target.value })}
                                                        readOnly={isEvaluationReadOnly}
                                                        className="interview-evaluation-score-input"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={evaluationForm.lyDoKyNangGiaoTiep}
                                                        onChange={(e) => setEvaluationForm({ ...evaluationForm, lyDoKyNangGiaoTiep: e.target.value })}
                                                        readOnly={isEvaluationReadOnly}
                                                        placeholder="Nhập lý do"
                                                        className="interview-evaluation-reason-input"
                                                    />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>Thái độ làm việc (nghiêm túc, trách nhiệm...)</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="5"
                                                        value={evaluationForm.diemThaiDoLamViec}
                                                        onChange={(e) => setEvaluationForm({ ...evaluationForm, diemThaiDoLamViec: e.target.value })}
                                                        readOnly={isEvaluationReadOnly}
                                                        className="interview-evaluation-score-input"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={evaluationForm.lyDoThaiDoLamViec}
                                                        onChange={(e) => setEvaluationForm({ ...evaluationForm, lyDoThaiDoLamViec: e.target.value })}
                                                        readOnly={isEvaluationReadOnly}
                                                        placeholder="Nhập lý do"
                                                        className="interview-evaluation-reason-input"
                                                    />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>Kinh nghiệm chuyên môn</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="5"
                                                        value={evaluationForm.diemKinhNghiemChuyenMon}
                                                        onChange={(e) => setEvaluationForm({ ...evaluationForm, diemKinhNghiemChuyenMon: e.target.value })}
                                                        readOnly={isEvaluationReadOnly}
                                                        className="interview-evaluation-score-input"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={evaluationForm.lyDoKinhNghiemChuyenMon}
                                                        onChange={(e) => setEvaluationForm({ ...evaluationForm, lyDoKinhNghiemChuyenMon: e.target.value })}
                                                        readOnly={isEvaluationReadOnly}
                                                        placeholder="Nhập lý do"
                                                        className="interview-evaluation-reason-input"
                                                    />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>Khả năng quản lý dự án</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="5"
                                                        value={evaluationForm.diemKhaNangQuanLyDuAn}
                                                        onChange={(e) => setEvaluationForm({ ...evaluationForm, diemKhaNangQuanLyDuAn: e.target.value })}
                                                        readOnly={isEvaluationReadOnly}
                                                        className="interview-evaluation-score-input"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={evaluationForm.lyDoKhaNangQuanLyDuAn}
                                                        onChange={(e) => setEvaluationForm({ ...evaluationForm, lyDoKhaNangQuanLyDuAn: e.target.value })}
                                                        readOnly={isEvaluationReadOnly}
                                                        placeholder="Nhập lý do"
                                                        className="interview-evaluation-reason-input"
                                                    />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>Ngoại ngữ (nếu tính chất công việc yêu cầu)</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="5"
                                                        value={evaluationForm.diemNgoaiNgu}
                                                        onChange={(e) => setEvaluationForm({ ...evaluationForm, diemNgoaiNgu: e.target.value })}
                                                        readOnly={isEvaluationReadOnly}
                                                        className="interview-evaluation-score-input"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={evaluationForm.lyDoNgoaiNgu}
                                                        onChange={(e) => setEvaluationForm({ ...evaluationForm, lyDoNgoaiNgu: e.target.value })}
                                                        readOnly={isEvaluationReadOnly}
                                                        placeholder="Nhập lý do"
                                                        className="interview-evaluation-reason-input"
                                                    />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>Kỹ năng quản lý (áp dụng từ cấp Trưởng phòng trở lên)</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="5"
                                                        value={evaluationForm.diemKyNangQuanLy}
                                                        onChange={(e) => setEvaluationForm({ ...evaluationForm, diemKyNangQuanLy: e.target.value })}
                                                        readOnly={isEvaluationReadOnly}
                                                        className="interview-evaluation-score-input"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={evaluationForm.lyDoKyNangQuanLy}
                                                        onChange={(e) => setEvaluationForm({ ...evaluationForm, lyDoKyNangQuanLy: e.target.value })}
                                                        readOnly={isEvaluationReadOnly}
                                                        placeholder="Nhập lý do"
                                                        className="interview-evaluation-reason-input"
                                                    />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Comments Section */}
                            <div className="interview-evaluation-section">
                                <h3 className="interview-evaluation-section-title">Nhận xét</h3>
                                <div className="interview-evaluation-form-group">
                                    <label>Điểm mạnh</label>
                                    <textarea
                                        rows="4"
                                        value={evaluationForm.diemManh}
                                        onChange={(e) => setEvaluationForm({ ...evaluationForm, diemManh: e.target.value })}
                                        readOnly={isEvaluationReadOnly}
                                        placeholder="Nhập điểm mạnh của ứng viên"
                                        className="interview-evaluation-textarea"
                                    />
                                </div>
                                <div className="interview-evaluation-form-group">
                                    <label>Điểm cần cải thiện</label>
                                    <textarea
                                        rows="4"
                                        value={evaluationForm.diemCanCaiThien}
                                        onChange={(e) => setEvaluationForm({ ...evaluationForm, diemCanCaiThien: e.target.value })}
                                        readOnly={isEvaluationReadOnly}
                                        placeholder="Nhập điểm cần cải thiện"
                                        className="interview-evaluation-textarea"
                                    />
                                </div>
                                <div className="interview-evaluation-form-group">
                                    <label>Nhận xét chung</label>
                                    <textarea
                                        rows="4"
                                        value={evaluationForm.nhanXetChung}
                                        onChange={(e) => setEvaluationForm({ ...evaluationForm, nhanXetChung: e.target.value })}
                                        readOnly={isEvaluationReadOnly}
                                        placeholder="Nhập nhận xét chung"
                                        className="interview-evaluation-textarea"
                                    />
                                </div>
                            </div>

                            {/* Conclusion Section */}
                            <div className="interview-evaluation-section">
                                <h3 className="interview-evaluation-section-title">KẾT LUẬN</h3>
                                <div className="interview-evaluation-conclusion-group">
                                    <label className="interview-evaluation-radio-label">
                                        <input
                                            type="radio"
                                            name="ketLuan"
                                            value="DAT_YEU_CAU"
                                            checked={evaluationForm.ketLuan === 'DAT_YEU_CAU'}
                                            onChange={(e) => setEvaluationForm({ ...evaluationForm, ketLuan: e.target.value })}
                                            disabled={isEvaluationReadOnly}
                                        />
                                        <span>Đạt yêu cầu</span>
                                    </label>
                                    <label className="interview-evaluation-radio-label">
                                        <input
                                            type="radio"
                                            name="ketLuan"
                                            value="KHONG_DAT_YEU_CAU"
                                            checked={evaluationForm.ketLuan === 'KHONG_DAT_YEU_CAU'}
                                            onChange={(e) => setEvaluationForm({ ...evaluationForm, ketLuan: e.target.value })}
                                            disabled={isEvaluationReadOnly}
                                        />
                                        <span>Không đạt yêu cầu</span>
                                    </label>
                                    <label className="interview-evaluation-radio-label">
                                        <input
                                            type="radio"
                                            name="ketLuan"
                                            value="LUU_HO_SO"
                                            checked={evaluationForm.ketLuan === 'LUU_HO_SO'}
                                            onChange={(e) => setEvaluationForm({ ...evaluationForm, ketLuan: e.target.value })}
                                            disabled={isEvaluationReadOnly}
                                        />
                                        <span>Lưu hồ sơ</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="interview-evaluation-modal-footer">
                            {bothEvaluated && (
                                <div className="interview-evaluation-status-message" style={{
                                    padding: '0.75rem 1rem',
                                    background: '#10b981',
                                    color: 'white',
                                    borderRadius: '0.5rem',
                                    marginBottom: '1rem',
                                    textAlign: 'center'
                                }}>
                                    ✓ Cả hai người đã hoàn thành đánh giá
                                </div>
                            )}
                            {currentUserHasEvaluated && !bothEvaluated && (
                                <div className="interview-evaluation-status-message" style={{
                                    padding: '0.75rem 1rem',
                                    background: '#f59e0b',
                                    color: 'white',
                                    borderRadius: '0.5rem',
                                    marginBottom: '1rem',
                                    textAlign: 'center'
                                }}>
                                    ⏳ Bạn đã đánh giá. Đang chờ người kia đánh giá...
                                </div>
                            )}
                            <button
                                type="button"
                                className="interview-evaluation-btn interview-evaluation-btn--cancel"
                                onClick={() => {
                                    setShowEvaluationModal(false);
                                    setSelectedEvaluationRequest(null);
                                    setCurrentUserHasEvaluated(false);
                                    setBothEvaluated(false);
                                    setIsEvaluationReadOnly(false);
                                }}
                            >
                                Đóng
                            </button>
                            {!isEvaluationReadOnly && (
                                <button
                                    type="button"
                                    className="interview-evaluation-btn interview-evaluation-btn--save"
                                    onClick={handleSaveEvaluation}
                                    disabled={savingEvaluation}
                                >
                                    {savingEvaluation ? 'Đang lưu...' : 'Lưu đánh giá'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InterviewApprovals;
