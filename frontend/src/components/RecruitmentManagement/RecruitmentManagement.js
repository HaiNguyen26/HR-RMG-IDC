import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import { employeesAPI, candidatesAPI, recruitmentRequestsAPI, interviewRequestsAPI, interviewEvaluationsAPI } from '../../services/api';
import './RecruitmentManagement.css';

const RecruitmentManagement = ({ currentUser, showToast, showConfirm }) => {
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [candidates, setCandidates] = useState([]);
    const [selectedCandidates, setSelectedCandidates] = useState([]);
    const fileInputRef = useRef(null);

    // Modal state
    const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [editingCandidateId, setEditingCandidateId] = useState(null);
    const [showRecruitmentRequestsModal, setShowRecruitmentRequestsModal] = useState(false);
    const [showViewCandidateModal, setShowViewCandidateModal] = useState(false);
    const [viewingCandidate, setViewingCandidate] = useState(null);

    // Recruitment requests state
    const [recruitmentRequests, setRecruitmentRequests] = useState([]);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [selectedHrRequest, setSelectedHrRequest] = useState(null);
    const [showHrRequestDetail, setShowHrRequestDetail] = useState(false);
    const [exportFilterMonth, setExportFilterMonth] = useState('');
    const [exportFilterYear, setExportFilterYear] = useState(new Date().getFullYear().toString());
    const [showTransferInterviewModal, setShowTransferInterviewModal] = useState(false);
    const [selectedTransferRequestId, setSelectedTransferRequestId] = useState('');
    const [transferInterviewDate, setTransferInterviewDate] = useState('');
    const [showTransferRequestDropdown, setShowTransferRequestDropdown] = useState(false);
    const [hasInterviewRequest, setHasInterviewRequest] = useState(false);
    const [showInterviewTimelineModal, setShowInterviewTimelineModal] = useState(false);
    const [interviewTimelineData, setInterviewTimelineData] = useState(null);
    const [loadingTimeline, setLoadingTimeline] = useState(false);
    const [showEvaluationSummaryModal, setShowEvaluationSummaryModal] = useState(false);
    const [evaluationSummaryData, setEvaluationSummaryData] = useState(null);
    const [showSendRecruitmentInfoModal, setShowSendRecruitmentInfoModal] = useState(false);
    const [statusUpdateChecked, setStatusUpdateChecked] = useState(false);
    const [showProbationStatusModal, setShowProbationStatusModal] = useState(false);
    const [selectedProbationCandidate, setSelectedProbationCandidate] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Send Recruitment Info Form State
    const [recruitmentInfoForm, setRecruitmentInfoForm] = useState({
        chucDanh: '',
        capBac: '',
        baoCaoTrucTiep: '',
        baoCaoGianTiep: '',
        diaDiemLamViec: '',
        ngayBatDauLamViec: '',
        thoiGianThuViec: '45 ngày (kể từ ngày bắt đầu làm việc)',
        thoiGianLamViec: '08:00 – 12:00 (Thứ Bảy- Nếu cần)',
        lyDoTuyenDung: '',
        soLuongCanTuyen: '',
        congViecChinh: ['', '', '', ''],
        kinhNghiem: '',
        hocVanToiThieu: '',
        kyNang: '',
        luongThuViec: '',
        luongSauThuViec: '',
        hoTroComTrua: '',
        hoTroDiLai: '',
        phuCapTienCom: '',
        phuCapDienThoai: ''
    });
    const [managers, setManagers] = useState([]);
    const [ranks, setRanks] = useState([]);
    const [showRecruitmentInfoPreview, setShowRecruitmentInfoPreview] = useState(false);
    const [recruitmentRequestForForm, setRecruitmentRequestForForm] = useState(null);
    const [showStartProbationModal, setShowStartProbationModal] = useState(false);
    const [probationStartDate, setProbationStartDate] = useState('');

    // Form data state
    const [formData, setFormData] = useState({
        // I. THÔNG TIN CÁ NHÂN
        hoTen: '',
        gioiTinh: 'Nam',
        ngaySinh: '',
        noiSinh: '',
        tinhTrangHonNhan: 'Độc thân',
        danToc: '',
        quocTich: 'Việt Nam',
        tonGiao: '',
        soCCCD: '',
        ngayCapCCCD: '',
        noiCapCCCD: '',
        anhDaiDien: null,
        cvDinhKem: null,
        ngayGuiCV: '',
        nguonCV: '',
        nguyenQuan: '',
        soDienThoai: '',
        soDienThoaiKhac: '',
        email: '',
        diaChiThuongTru: {
            soNha: '',
            phuongXa: '',
            quanHuyen: '',
            thanhPhoTinh: ''
        },
        diaChiLienLac: {
            soNha: '',
            phuongXa: '',
            quanHuyen: '',
            thanhPhoTinh: ''
        },
        trinhDoVanHoa: '',
        trinhDoChuyenMon: '',
        chuyenNganh: '',
        chiNhanh: '',
        viTriUngTuyen: '',
        phongBan: ''
    });

    // Dynamic rows state
    const [workExperiences, setWorkExperiences] = useState([{ id: 1, ngayBatDau: '', ngayKetThuc: '', congTy: '', chucDanh: '' }]);
    const [trainingProcesses, setTrainingProcesses] = useState([{ id: 1, ngayBatDau: '', ngayKetThuc: '', truongDaoTao: '', chuyenNganh: '', vanBang: '' }]);
    const [foreignLanguages, setForeignLanguages] = useState([{ id: 1, ngoaiNgu: '', chungChi: '', diem: '', khaNangSuDung: 'A: Giỏi' }]);

    // Dropdown data state
    const [branches, setBranches] = useState([]);
    const [jobTitles, setJobTitles] = useState([]);
    const [departments, setDepartments] = useState([]);

    // Refs để lưu giá trị trước đó, tránh re-render không cần thiết
    const prevCandidatesRef = useRef([]);
    const prevRecruitmentRequestsRef = useRef([]);

    // Helper function để so sánh arrays (chỉ so sánh id và status/trang_thai)
    const candidatesAreEqual = useCallback((oldCandidates, newCandidates) => {
        if (!oldCandidates || !newCandidates) return oldCandidates === newCandidates;
        if (oldCandidates.length !== newCandidates.length) return false;
        // Create map by id for comparison (order-independent)
        const oldMap = new Map(oldCandidates.map(c => [c.id, c.trang_thai || c.status]));
        const newMap = new Map(newCandidates.map(c => [c.id, c.trang_thai || c.status]));
        // Check if all ids and statuses match
        for (const [id, status] of oldMap) {
            if (newMap.get(id) !== status) return false;
        }
        for (const id of newMap.keys()) {
            if (!oldMap.has(id)) return false;
        }
        return true;
    }, []);

    // Helper function để so sánh recruitment requests (chỉ so sánh id và status)
    const recruitmentRequestsAreEqual = useCallback((oldReqs, newReqs) => {
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

    // Status filters
    const statusFilters = [
        { key: 'all', label: 'Tất cả' },
        { key: 'NEW', label: 'Ứng viên mới' },
        { key: 'PENDING_INTERVIEW', label: 'Chờ phỏng vấn' },
        { key: 'PENDING_MANAGER', label: 'Đang chờ phỏng vấn' },
        { key: 'PASSED', label: 'Đã đậu' },
        { key: 'FAILED', label: 'Đã rớt' }
    ];

    // Fetch candidates
    const fetchCandidates = useCallback(async (silent = false) => {
        try {
            // Chỉ hiển thị loading khi không phải silent mode (lần đầu hoặc khi filter thay đổi)
            if (!silent) {
                setLoading(true);
            }

            const params = {
                page: 1,
                limit: 1000
            };

            if (searchQuery) {
                params.search = searchQuery;
            }

            if (selectedStatus && selectedStatus !== 'all') {
                params.status = selectedStatus;
            }

            const response = await candidatesAPI.getAll(params);
            if (response.data.success) {
                const newCandidates = response.data.data || [];

                // Chỉ update state nếu data thực sự thay đổi (tránh re-render không cần thiết)
                const prevCandidates = prevCandidatesRef.current || [];
                if (!candidatesAreEqual(prevCandidates, newCandidates)) {
                    setCandidates(newCandidates);
                    prevCandidatesRef.current = newCandidates;
                }
            }
        } catch (error) {
            console.error('Error fetching candidates:', error);
            // Không hiển thị toast nếu là lỗi connection (backend chưa chạy)
            if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNREFUSED') {
                if (showToast && !silent) {
                    showToast('Lỗi khi tải danh sách ứng viên: ' + (error.response?.data?.message || error.message), 'error');
                }
            } else {
                console.warn('Backend server chưa sẵn sàng hoặc chưa chạy');
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [searchQuery, selectedStatus, candidatesAreEqual, showToast]);

    // Fetch recruitment requests (HR xem các phiếu đã được giám đốc chi nhánh duyệt)
    const fetchRecruitmentRequests = useCallback(async (silent = false) => {
        try {
            const response = await recruitmentRequestsAPI.getAll({ forHr: true });
            if (response.data?.success) {
                const raw = response.data.data || [];
                // Chuẩn hóa dữ liệu để UI dùng camelCase
                const normalized = raw.map((req) => ({
                    id: req.id,
                    chucDanhCanTuyen: req.chuc_danh_can_tuyen,
                    phongBanBoPhan: req.phong_ban_bo_phan,
                    nguoiGui: req.created_by_name || req.nguoi_quan_ly_truc_tiep || req.nguoi_quan_ly_gian_tiep || '',
                    ngayGui: req.created_at,
                    soLuongYeuCau: req.so_luong_yeu_cau,
                    status: req.status,
                    approvedAt: req.approved_at,
                    managerId: req.created_by_employee_id ? parseInt(req.created_by_employee_id, 10) : null,
                    branchDirectorId: req.branch_director_id ? parseInt(req.branch_director_id, 10) : null,
                    moTaCongViec: req.mo_ta_cong_viec,
                    yeuCauChiTietCongViec: req.yeu_cau_chi_tiet_cong_viec,
                    lyDoKhacGhiChu: req.ly_do_khac_ghi_chu,
                    loaiLaoDong: req.loai_lao_dong,
                    lyDoTuyen: req.ly_do_tuyen,
                    gioiTinh: req.gioi_tinh,
                    doTuoi: req.do_tuoi,
                    trinhDoHocVanYeuCau: req.trinh_do_hoc_van_yeu_cau,
                    kinhNghiemChuyenMon: req.kinh_nghiem_chuyen_mon,
                    chiTietKinhNghiem: req.chi_tiet_kinh_nghiem,
                    kienThucChuyenMonKhac: req.kien_thuc_chuyen_mon_khac,
                    yeuCauNgoaiNgu: req.yeu_cau_ngoai_ngu,
                    yeuCauViTinhKyNangKhac: req.yeu_cau_vi_tinh_ky_nang_khac,
                    kyNangGiaoTiep: req.ky_nang_giao_tiep,
                    thaiDoLamViec: req.thai_do_lam_viec,
                    kyNangQuanLy: req.ky_nang_quan_ly,
                    nguoiQuanLyTrucTiep: req.nguoi_quan_ly_truc_tiep,
                    nguoiQuanLyGianTiep: req.nguoi_quan_ly_gian_tiep
                }));

                // Chỉ update state nếu data thực sự thay đổi (tránh re-render không cần thiết)
                const prevReqs = prevRecruitmentRequestsRef.current || [];
                if (!recruitmentRequestsAreEqual(prevReqs, normalized)) {
                    setRecruitmentRequests(normalized);
                    setPendingRequestsCount(normalized.length);
                    prevRecruitmentRequestsRef.current = normalized;
                }
            } else {
                // Chỉ update nếu thực sự cần (từ có data -> không có data)
                if (prevRecruitmentRequestsRef.current?.length > 0) {
                    setRecruitmentRequests([]);
                    setPendingRequestsCount(0);
                    prevRecruitmentRequestsRef.current = [];
                }
            }
        } catch (error) {
            console.error('Error fetching recruitment requests:', error);
            // Chỉ update nếu thực sự cần (từ có data -> không có data)
            if (prevRecruitmentRequestsRef.current?.length > 0) {
                setRecruitmentRequests([]);
                setPendingRequestsCount(0);
                prevRecruitmentRequestsRef.current = [];
            }
        }
    }, [recruitmentRequestsAreEqual]);

    useEffect(() => {
        fetchCandidates(false); // Lần đầu hiển thị loading
        fetchRecruitmentRequests(false);

        // Poll for new requests and refresh candidates every 30 seconds (silent mode - không hiển thị loading, không re-render nếu không có thay đổi)
        const interval = setInterval(() => {
            fetchCandidates(true); // Refresh candidates để cập nhật status (silent mode)
            fetchRecruitmentRequests(true);
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchCandidates, fetchRecruitmentRequests]);

    // Refresh transfer options when transfer modal opens
    useEffect(() => {
        if (showTransferInterviewModal) {
            fetchRecruitmentRequests(false);
            setSelectedTransferRequestId('');
            setTransferInterviewDate('');
            setShowTransferRequestDropdown(false);
        }
    }, [showTransferInterviewModal, fetchRecruitmentRequests]);

    // Auto-select first request when dropdown data available and none selected
    useEffect(() => {
        if (showTransferInterviewModal && !selectedTransferRequestId && recruitmentRequests.length > 0) {
            setSelectedTransferRequestId(recruitmentRequests[0].id);
        }
    }, [showTransferInterviewModal, recruitmentRequests, selectedTransferRequestId]);

    // Fetch recruitment requests when modal opens
    useEffect(() => {
        if (showRecruitmentRequestsModal) {
            fetchRecruitmentRequests(false);
        }
    }, [showRecruitmentRequestsModal, fetchRecruitmentRequests]);

    // Fetch managers, ranks and job titles when send recruitment info modal opens
    useEffect(() => {
        if (showSendRecruitmentInfoModal) {
            fetchManagers();
            fetchDropdownData();
            fetchRanks();
        }
    }, [showSendRecruitmentInfoModal]);

    // Load data from interview timeline when modal opens and data is available
    useEffect(() => {
        if (showSendRecruitmentInfoModal && interviewTimelineData && interviewTimelineData.interviewRequest && viewingCandidate && managers.length > 0) {
            const interviewRequest = interviewTimelineData.interviewRequest;

            // Get manager and branch director names
            const manager = managers.find(m => m.id === interviewRequest.manager_id);
            const branchDirector = managers.find(m => m.id === interviewRequest.branch_director_id);

            // Get recruitment request to get lyDoTuyen (only fetch once)
            if (interviewRequest.recruitment_request_id && !recruitmentRequestForForm) {
                fetchRecruitmentRequestForForm(interviewRequest.recruitment_request_id);
            }

            // Update form with readonly data (only if not already set)
            setRecruitmentInfoForm(prev => {
                const newManagerId = interviewRequest.manager_id?.toString() || '';
                const newBranchDirectorId = interviewRequest.branch_director_id?.toString() || '';

                // Determine indirect manager
                let indirectManagerId = newBranchDirectorId;

                // If branch director is the direct manager, find CEO as indirect manager
                if (newManagerId === newBranchDirectorId) {
                    // Debug: Log all managers to find CEO
                    console.log('🔍 Finding CEO - All managers:', managers.map(m => ({
                        id: m.id,
                        name: m.ho_ten || m.hoTen,
                        position: m.chuc_danh || m.chucDanh,
                        positionLower: (m.chuc_danh || m.chucDanh || '').toLowerCase()
                    })));

                    // Find CEO in managers list (Lê Thanh Tùng or by position/code)
                    const ceo = managers.find(m => {
                        const name = (m.ho_ten || m.hoTen || '').toLowerCase();
                        const position = (m.chuc_danh || m.chucDanh || '').toLowerCase();
                        const code = (m.ma_nhan_vien || m.maNhanVien || '').toLowerCase();
                        return name.includes('lê thanh tùng') ||
                            name.includes('le thanh tung') ||
                            code.includes('ceo') ||
                            position.includes('tổng giám đốc') ||
                            position.includes('tong giam doc') ||
                            position.includes('ceo') ||
                            position.includes('giám đốc điều hành');
                    });

                    if (ceo) {
                        indirectManagerId = ceo.id?.toString() || '';
                        console.log('✅ Branch Director is requester, setting CEO as indirect manager:', {
                            id: ceo.id,
                            name: ceo.ho_ten || ceo.hoTen,
                            position: ceo.chuc_danh || ceo.chucDanh
                        });
                    } else {
                        console.warn('⚠️ CEO not found in managers list!');
                    }
                }

                // Only update if values are different
                if (prev.baoCaoTrucTiep === newManagerId &&
                    prev.baoCaoGianTiep === indirectManagerId) {
                    return prev;
                }

                return {
                    ...prev,
                    baoCaoTrucTiep: newManagerId,
                    baoCaoGianTiep: indirectManagerId,
                };
            });
        }
    }, [showSendRecruitmentInfoModal, interviewTimelineData?.interviewRequest?.id, viewingCandidate?.id, managers.length]);

    // Update currentTime every second for countdown timer
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Calculate probation countdown
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

    // Fetch managers for recruitment info form
    const fetchManagers = async () => {
        try {
            const response = await employeesAPI.getAll({ role: 'MANAGER' });
            if (response.data?.success) {
                setManagers(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching managers:', error);
        }
    };

    // Fetch ranks
    const fetchRanks = async () => {
        try {
            const response = await employeesAPI.getRanks();
            if (response.data?.success) {
                setRanks(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching ranks:', error);
        }
    };

    // Fetch recruitment request for form
    const fetchRecruitmentRequestForForm = async (recruitmentRequestId) => {
        try {
            const response = await recruitmentRequestsAPI.getById(recruitmentRequestId);
            if (response.data?.success && response.data.data) {
                const request = response.data.data;
                setRecruitmentRequestForForm(request);

                // Map lyDoTuyen to form value
                let lyDoTuyenValue = '';
                if (request.lyDoTuyen === 'thay_the') {
                    lyDoTuyenValue = 'Thay thế nhân viên';
                } else if (request.lyDoTuyen === 'nhu_cau_tang') {
                    lyDoTuyenValue = 'Mở rộng đội ngũ';
                } else if (request.lyDoTuyen === 'vi_tri_moi') {
                    lyDoTuyenValue = 'Dự án mới';
                } else if (request.lyDoKhacGhiChu) {
                    lyDoTuyenValue = request.lyDoKhacGhiChu;
                }

                setRecruitmentInfoForm(prev => ({
                    ...prev,
                    lyDoTuyenDung: lyDoTuyenValue
                }));
            }
        } catch (error) {
            console.error('Error fetching recruitment request for form:', error);
        }
    };

    // Fetch dropdown data
    const fetchDropdownData = async () => {
        try {
            const [branchesRes, jobTitlesRes, departmentsRes] = await Promise.all([
                employeesAPI.getBranches(),
                employeesAPI.getJobTitles(),
                employeesAPI.getDepartments()
            ]);

            if (branchesRes.data.success) {
                setBranches(branchesRes.data.data || []);
            }
            if (jobTitlesRes.data.success) {
                // Loại bỏ duplicate vị trí ứng tuyển (case-insensitive, normalize)
                const jobTitlesData = jobTitlesRes.data.data || [];
                const seen = new Set();
                const uniqueJobTitles = [];

                for (const title of jobTitlesData) {
                    if (!title) continue;

                    // Normalize: chuẩn hóa về NFC trước, sau đó loại bỏ khoảng trắng thừa
                    let normalized = String(title)
                        .normalize('NFC') // Chuẩn hóa về NFC (composed form)
                        .trim()
                        .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ') // Loại bỏ các loại khoảng trắng đặc biệt
                        .replace(/\s+/g, ' ') // Thay nhiều khoảng trắng thành 1 khoảng
                        .trim();

                    if (!normalized) continue;

                    // Tạo key để so sánh (lowercase, normalize về NFC, loại bỏ dấu)
                    const key = normalized
                        .toLowerCase()
                        .normalize('NFC') // Đảm bảo cùng form
                        .normalize('NFD') // Decompose để loại bỏ dấu
                        .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu
                        .replace(/[^a-z0-9]/g, '') // Chỉ giữ chữ và số
                        .trim();

                    // Chỉ thêm nếu chưa thấy
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueJobTitles.push(normalized);
                    }
                }

                setJobTitles(uniqueJobTitles);
            }
            if (departmentsRes.data.success) {
                // Loại bỏ duplicate phòng ban (case-insensitive)
                const departmentsData = departmentsRes.data.data || [];
                const uniqueDepartments = departmentsData.filter((dept, index, self) => {
                    return self.findIndex(d => String(d).toLowerCase() === String(dept).toLowerCase()) === index;
                });
                setDepartments(uniqueDepartments);
            }
        } catch (error) {
            console.error('Error fetching dropdown data:', error);
            if (showToast) {
                showToast('Lỗi khi tải dữ liệu dropdown', 'error');
            }
        }
    };

    const handleAddCandidate = () => {
        setEditingCandidateId(null);
        fetchDropdownData();
        setShowAddCandidateModal(true);
    };

    const handleViewCandidate = async (candidateId) => {
        try {
            setLoading(true);
            // Luôn fetch candidate data mới nhất từ server
            const response = await candidatesAPI.getById(candidateId);
            if (response.data.success && response.data.data) {
                const candidate = response.data.data;
                console.log('[handleViewCandidate] Candidate status:', candidate.trang_thai);

                // Nếu ứng viên đang thử việc (ON_PROBATION), mở modal đếm thời gian thử việc
                if (candidate.trang_thai === 'ON_PROBATION') {
                    setSelectedProbationCandidate(candidate);
                    setShowProbationStatusModal(true);
                    setLoading(false);
                    return;
                }

                setViewingCandidate(candidate);
                setShowViewCandidateModal(true);

                // Cập nhật candidate trong list để đồng bộ status
                setCandidates(prevCandidates =>
                    prevCandidates.map(c => c.id === candidateId ? candidate : c)
                );

                // Kiểm tra xem candidate đã có interview request chưa (dựa trên status hoặc fetch interview requests)
                const hasInterviewRelatedStatus = ['TRANSFERRED_TO_INTERVIEW', 'WAITING_FOR_OTHER_APPROVAL', 'READY_FOR_INTERVIEW', 'PASSED', 'FAILED'].includes(candidate.trang_thai);
                if (hasInterviewRelatedStatus) {
                    setHasInterviewRequest(true);
                } else {
                    // Nếu chưa có status liên quan đến interview, kiểm tra interview requests
                    try {
                        const interviewResponse = await interviewRequestsAPI.getAll({ candidateId: candidateId });
                        if (interviewResponse.data?.success && interviewResponse.data.data?.length > 0) {
                            setHasInterviewRequest(true);
                        } else {
                            setHasInterviewRequest(false);
                        }
                    } catch (err) {
                        console.error('Error checking interview request:', err);
                        setHasInterviewRequest(false);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading candidate:', error);
            if (showToast) {
                showToast('Lỗi khi tải thông tin ứng viên', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLoadInterviewTimeline = async (candidateId) => {
        try {
            setLoadingTimeline(true);

            // Fetch interview request
            const interviewResponse = await interviewRequestsAPI.getAll({ candidateId });
            if (!interviewResponse.data?.success || !interviewResponse.data.data?.length) {
                if (showToast) {
                    showToast('Không tìm thấy thông tin phỏng vấn', 'warning');
                }
                return;
            }

            const interviewRequest = interviewResponse.data.data[0];

            // Fetch evaluations
            const evaluationsResponse = await interviewEvaluationsAPI.getAll({
                interviewRequestId: interviewRequest.id
            });
            const evaluations = evaluationsResponse.data?.success ? evaluationsResponse.data.data || [] : [];

            // Fetch candidate data mới nhất để có status cập nhật
            let candidateData = viewingCandidate;
            try {
                const candidateResponse = await candidatesAPI.getById(candidateId);
                if (candidateResponse.data?.success && candidateResponse.data.data) {
                    candidateData = candidateResponse.data.data;
                    console.log('[handleLoadInterviewTimeline] Fetched candidate status:', candidateData.trang_thai);

                    // Không cho phép reset status nếu candidate đã ON_PROBATION
                    if (candidateData.trang_thai === 'ON_PROBATION') {
                        if (showToast) {
                            showToast('Ứng viên đã bắt đầu thử việc. Vui lòng sử dụng module "Danh sách thử việc" để theo dõi.', 'info');
                        }
                        setLoadingTimeline(false);
                        return;
                    }

                    // Cập nhật viewingCandidate để đồng bộ
                    setViewingCandidate(candidateData);
                    // Cập nhật candidate trong list để đồng bộ status (chỉ nếu không phải ON_PROBATION)
                    if (candidateData.trang_thai !== 'ON_PROBATION') {
                        setCandidates(prevCandidates =>
                            prevCandidates.map(c => c.id === candidateId ? candidateData : c)
                        );
                    }
                }
            } catch (err) {
                console.error('Error fetching updated candidate:', err);
            }

            // Build timeline data
            const timelineData = {
                interviewRequest,
                evaluations,
                candidate: candidateData
            };

            setInterviewTimelineData(timelineData);
            setShowInterviewTimelineModal(true);
            setStatusUpdateChecked(false); // Reset flag khi mở modal mới
        } catch (error) {
            console.error('Error loading interview timeline:', error);
            if (showToast) {
                showToast('Lỗi khi tải thông tin tiến độ phỏng vấn', 'error');
            }
        } finally {
            setLoadingTimeline(false);
        }
    };

    const handleViewEvaluationSummary = () => {
        if (!interviewTimelineData || !interviewTimelineData.evaluations) {
            return;
        }

        const managerEval = interviewTimelineData.evaluations.find(e =>
            e.evaluator_id === interviewTimelineData.interviewRequest.manager_id
        );
        const directorEval = interviewTimelineData.evaluations.find(e =>
            e.evaluator_id === interviewTimelineData.interviewRequest.branch_director_id
        );

        if (!managerEval || !directorEval) {
            if (showToast) {
                showToast('Chưa có đủ đánh giá từ cả hai người', 'warning');
            }
            return;
        }

        // Tính trung bình cộng các điểm
        const calculateAverage = (scores) => {
            const validScores = scores.filter(s => s !== null && s !== undefined && s !== '');
            if (validScores.length === 0) return 0;
            const sum = validScores.reduce((acc, val) => acc + parseFloat(val), 0);
            return (sum / validScores.length).toFixed(2);
        };

        const criteria = [
            { key: 'diem_ky_nang_giao_tiep', camelKey: 'diemKyNangGiaoTiep', label: 'Kỹ năng giao tiếp' },
            { key: 'diem_thai_do_lam_viec', camelKey: 'diemThaiDoLamViec', label: 'Thái độ làm việc' },
            { key: 'diem_kinh_nghiem_chuyen_mon', camelKey: 'diemKinhNghiemChuyenMon', label: 'Kinh nghiệm chuyên môn' },
            { key: 'diem_kha_nang_quan_ly_du_an', camelKey: 'diemKhaNangQuanLyDuAn', label: 'Khả năng quản lý dự án' },
            { key: 'diem_ngoai_ngu', camelKey: 'diemNgoaiNgu', label: 'Ngoại ngữ' },
            { key: 'diem_ky_nang_quan_ly', camelKey: 'diemKyNangQuanLy', label: 'Kỹ năng quản lý' }
        ];

        const summary = {
            managerEval,
            directorEval,
            criteria: criteria.map(c => {
                // Lấy giá trị từ snake_case hoặc camelCase
                const managerScore = managerEval[c.key] !== undefined ? managerEval[c.key] : (managerEval[c.camelKey] !== undefined ? managerEval[c.camelKey] : null);
                const directorScore = directorEval[c.key] !== undefined ? directorEval[c.key] : (directorEval[c.camelKey] !== undefined ? directorEval[c.camelKey] : null);

                return {
                    ...c,
                    managerScore: managerScore !== null && managerScore !== undefined ? managerScore : null,
                    directorScore: directorScore !== null && directorScore !== undefined ? directorScore : null,
                    average: calculateAverage([managerScore, directorScore])
                };
            }),
            managerConclusion: managerEval.ket_luan,
            directorConclusion: directorEval.ket_luan,
            bothPassed: managerEval.ket_luan === 'DAT_YEU_CAU' && directorEval.ket_luan === 'DAT_YEU_CAU',
            candidate: interviewTimelineData.candidate,
            interviewRequest: interviewTimelineData.interviewRequest
        };

        setEvaluationSummaryData(summary);
        setShowEvaluationSummaryModal(true);
    };

    const handleEditCandidate = async (candidateId) => {
        try {
            setLoading(true);
            setEditingCandidateId(candidateId);
            fetchDropdownData();

            // Fetch candidate data
            const response = await candidatesAPI.getById(candidateId);
            if (response.data.success && response.data.data) {
                const candidate = response.data.data;

                // Load candidate data into form
                setFormData({
                    hoTen: candidate.ho_ten || '',
                    gioiTinh: candidate.gioi_tinh || 'Nam',
                    ngaySinh: candidate.ngay_sinh ? candidate.ngay_sinh.split('T')[0] : '',
                    noiSinh: candidate.noi_sinh || '',
                    tinhTrangHonNhan: candidate.tinh_trang_hon_nhan || 'Độc thân',
                    danToc: candidate.dan_toc || '',
                    quocTich: candidate.quoc_tich || 'Việt Nam',
                    tonGiao: candidate.ton_giao || '',
                    soCCCD: candidate.so_cccd || '',
                    ngayCapCCCD: candidate.ngay_cap_cccd ? candidate.ngay_cap_cccd.split('T')[0] : '',
                    noiCapCCCD: candidate.noi_cap_cccd || '',
                    anhDaiDien: null, // File không load lại, chỉ hiển thị path nếu có
                    cvDinhKem: null, // File không load lại, chỉ hiển thị path nếu có
                    ngayGuiCV: candidate.ngay_gui_cv ? candidate.ngay_gui_cv.split('T')[0] : '',
                    nguonCV: candidate.nguon_cv || '',
                    nguyenQuan: candidate.nguyen_quan || '',
                    soDienThoai: candidate.so_dien_thoai || '',
                    soDienThoaiKhac: candidate.so_dien_thoai_khac || '',
                    email: candidate.email || '',
                    diaChiThuongTru: {
                        soNha: candidate.dia_chi_tam_tru_so_nha || '',
                        phuongXa: candidate.dia_chi_tam_tru_phuong_xa || '',
                        quanHuyen: candidate.dia_chi_tam_tru_quan_huyen || '',
                        thanhPhoTinh: candidate.dia_chi_tam_tru_thanh_pho_tinh || ''
                    },
                    diaChiLienLac: {
                        soNha: candidate.nguyen_quan_so_nha || '',
                        phuongXa: candidate.nguyen_quan_phuong_xa || '',
                        quanHuyen: candidate.nguyen_quan_quan_huyen || '',
                        thanhPhoTinh: candidate.nguyen_quan_thanh_pho_tinh || ''
                    },
                    trinhDoVanHoa: candidate.trinh_do_van_hoa || '',
                    trinhDoChuyenMon: candidate.trinh_do_chuyen_mon || '',
                    chuyenNganh: candidate.chuyen_nganh || '',
                    chiNhanh: candidate.chi_nhanh || '',
                    viTriUngTuyen: candidate.vi_tri_ung_tuyen || '',
                    phongBan: candidate.phong_ban || ''
                });

                // Load work experiences
                if (candidate.workExperiences && candidate.workExperiences.length > 0) {
                    setWorkExperiences(candidate.workExperiences.map((exp, idx) => ({
                        id: idx + 1,
                        ngayBatDau: exp.ngay_bat_dau ? exp.ngay_bat_dau.split('T')[0] : '',
                        ngayKetThuc: exp.ngay_ket_thuc ? exp.ngay_ket_thuc.split('T')[0] : '',
                        congTy: exp.cong_ty || '',
                        chucDanh: exp.chuc_danh || ''
                    })));
                } else {
                    setWorkExperiences([{ id: 1, ngayBatDau: '', ngayKetThuc: '', congTy: '', chucDanh: '' }]);
                }

                // Load training processes
                if (candidate.trainingProcesses && candidate.trainingProcesses.length > 0) {
                    setTrainingProcesses(candidate.trainingProcesses.map((tp, idx) => ({
                        id: idx + 1,
                        ngayBatDau: tp.ngay_bat_dau ? tp.ngay_bat_dau.split('T')[0] : '',
                        ngayKetThuc: tp.ngay_ket_thuc ? tp.ngay_ket_thuc.split('T')[0] : '',
                        truongDaoTao: tp.truong_dao_tao || '',
                        chuyenNganh: tp.chuyen_nganh || '',
                        vanBang: tp.van_bang || ''
                    })));
                } else {
                    setTrainingProcesses([{ id: 1, ngayBatDau: '', ngayKetThuc: '', truongDaoTao: '', chuyenNganh: '', vanBang: '' }]);
                }

                // Load foreign languages
                if (candidate.foreignLanguages && candidate.foreignLanguages.length > 0) {
                    setForeignLanguages(candidate.foreignLanguages.map((fl, idx) => ({
                        id: idx + 1,
                        ngoaiNgu: fl.ngoai_ngu || '',
                        chungChi: fl.chung_chi || '',
                        diem: fl.diem || '',
                        khaNangSuDung: fl.kha_nang_su_dung || 'A: Giỏi'
                    })));
                } else {
                    setForeignLanguages([{ id: 1, ngoaiNgu: '', chungChi: '', diem: '', khaNangSuDung: 'A: Giỏi' }]);
                }
            }

            setShowAddCandidateModal(true);
        } catch (error) {
            console.error('Error loading candidate:', error);
            if (showToast) {
                showToast('Lỗi khi tải thông tin ứng viên', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowAddCandidateModal(false);
        setEditingCandidateId(null);
        // Reset form data
        setFormData({
            hoTen: '',
            gioiTinh: 'Nam',
            ngaySinh: '',
            noiSinh: '',
            tinhTrangHonNhan: 'Độc thân',
            danToc: '',
            quocTich: 'Việt Nam',
            tonGiao: '',
            soCCCD: '',
            ngayCapCCCD: '',
            noiCapCCCD: '',
            anhDaiDien: null,
            cvDinhKem: null,
            ngayGuiCV: '',
            nguonCV: '',
            nguyenQuan: '',
            soDienThoai: '',
            soDienThoaiKhac: '',
            email: '',
            diaChiThuongTru: { soNha: '', phuongXa: '', quanHuyen: '', thanhPhoTinh: '' },
            diaChiLienLac: { soNha: '', phuongXa: '', quanHuyen: '', thanhPhoTinh: '' },
            trinhDoVanHoa: '',
            trinhDoChuyenMon: '',
            chuyenNganh: '',
            chiNhanh: '',
            viTriUngTuyen: '',
            phongBan: ''
        });
        setWorkExperiences([{ id: 1, ngayBatDau: '', ngayKetThuc: '', congTy: '', chucDanh: '' }]);
        setTrainingProcesses([{ id: 1, ngayBatDau: '', ngayKetThuc: '', truongDaoTao: '', chuyenNganh: '', vanBang: '' }]);
        setForeignLanguages([{ id: 1, ngoaiNgu: '', chungChi: '', diem: '', khaNangSuDung: 'A: Giỏi' }]);
    };

    // Dynamic rows handlers
    const handleAddWorkExperience = () => {
        const newId = Math.max(...workExperiences.map(w => w.id), 0) + 1;
        setWorkExperiences([...workExperiences, { id: newId, ngayBatDau: '', ngayKetThuc: '', congTy: '', chucDanh: '' }]);
    };

    const handleRemoveWorkExperience = (id) => {
        if (workExperiences.length > 1) {
            setWorkExperiences(workExperiences.filter(w => w.id !== id));
        }
    };

    const handleUpdateWorkExperience = (id, field, value) => {
        setWorkExperiences(workExperiences.map(w => w.id === id ? { ...w, [field]: value } : w));
    };

    const handleAddTrainingProcess = () => {
        const newId = Math.max(...trainingProcesses.map(t => t.id), 0) + 1;
        setTrainingProcesses([...trainingProcesses, { id: newId, ngayBatDau: '', ngayKetThuc: '', truongDaoTao: '', chuyenNganh: '', vanBang: '' }]);
    };

    const handleRemoveTrainingProcess = (id) => {
        if (trainingProcesses.length > 1) {
            setTrainingProcesses(trainingProcesses.filter(t => t.id !== id));
        }
    };

    const handleUpdateTrainingProcess = (id, field, value) => {
        setTrainingProcesses(trainingProcesses.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const handleAddForeignLanguage = () => {
        const newId = Math.max(...foreignLanguages.map(f => f.id), 0) + 1;
        setForeignLanguages([...foreignLanguages, { id: newId, ngoaiNgu: '', chungChi: '', diem: '', khaNangSuDung: 'A: Giỏi' }]);
    };

    const handleRemoveForeignLanguage = (id) => {
        if (foreignLanguages.length > 1) {
            setForeignLanguages(foreignLanguages.filter(f => f.id !== id));
        }
    };

    const handleUpdateForeignLanguage = (id, field, value) => {
        setForeignLanguages(foreignLanguages.map(f => f.id === id ? { ...f, [field]: value } : f));
    };

    const handlePreview = () => {
        setShowPreviewModal(true);
    };

    const handleClosePreviewModal = () => {
        setShowPreviewModal(false);
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);

            // Validate required fields
            if (!formData.hoTen || !formData.soDienThoai || !formData.email) {
                if (showToast) {
                    showToast('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
                }
                setLoading(false);
                return;
            }

            // Prepare data for API
            const submitData = {
                ...formData,
                diaChiThuongTru: formData.diaChiThuongTru,
                diaChiLienLac: formData.diaChiLienLac,
                ngayGuiCV: formData.ngayGuiCV,
                nguonCV: formData.nguonCV,
                // Ensure files are included
                anhDaiDien: formData.anhDaiDien,
                cvDinhKem: formData.cvDinhKem,
                workExperiences: workExperiences.filter(exp => exp.ngayBatDau || exp.ngayKetThuc || exp.congTy || exp.chucDanh),
                trainingProcesses: trainingProcesses.filter(tp => tp.ngayBatDau || tp.ngayKetThuc || tp.truongDaoTao || tp.chuyenNganh || tp.vanBang),
                foreignLanguages: foreignLanguages.filter(fl => fl.ngoaiNgu || fl.chungChi || fl.diem || fl.khaNangSuDung)
            };

            // Log file info for debugging
            console.log('[RecruitmentManagement] Submitting with files:', {
                hasAnhDaiDien: !!submitData.anhDaiDien,
                hasCvDinhKem: !!submitData.cvDinhKem,
                anhDaiDienName: submitData.anhDaiDien?.name,
                cvDinhKemName: submitData.cvDinhKem?.name,
                cvDinhKemType: submitData.cvDinhKem?.constructor?.name
            });

            let response;
            if (editingCandidateId) {
                // Update existing candidate
                response = await candidatesAPI.update(editingCandidateId, submitData);
                if (response.data.success) {
                    if (showToast) {
                        showToast('Đã cập nhật ứng viên thành công!', 'success');
                    }
                    handleCloseModal();
                    fetchCandidates(false); // Refresh danh sách
                } else {
                    throw new Error(response.data.message || 'Lỗi khi cập nhật ứng viên');
                }
            } else {
                // Create new candidate
                response = await candidatesAPI.create(submitData);
                if (response.data.success) {
                    if (showToast) {
                        showToast('Đã thêm ứng viên thành công!', 'success');
                    }
                    handleCloseModal();
                    fetchCandidates(false); // Refresh danh sách
                } else {
                    throw new Error(response.data.message || 'Lỗi khi thêm ứng viên');
                }
            }
        } catch (error) {
            console.error('Error submitting candidate:', error);
            if (showToast) {
                const errorMessage = editingCandidateId
                    ? (error.response?.data?.message || error.message || 'Lỗi khi cập nhật ứng viên')
                    : (error.response?.data?.message || error.message || 'Lỗi khi thêm ứng viên');
                showToast(errorMessage, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    // Convert Excel date (dd/mm/yyyy or serial) to ISO yyyy-mm-dd
    const parseExcelDate = (value) => {
        if (!value) return '';
        // Excel serial number (number or numeric string)
        if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value.trim()))) {
            const serial = typeof value === 'number' ? value : Number(value.trim());
            const date = XLSX.SSF.parse_date_code(serial);
            if (!date) return '';
            const yyyy = date.y.toString().padStart(4, '0');
            const mm = date.m.toString().padStart(2, '0');
            const dd = date.d.toString().padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
        if (typeof value === 'string') {
            const parts = value.split(/[\/\-\.]/);
            if (parts.length === 3) {
                // dd/mm/yyyy
                const [dd, mm, yy] = parts.map(p => p.trim());
                const yyyy = yy.length === 2 ? `20${yy}` : yy;
                if (dd && mm && yyyy) {
                    return `${yyyy.padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
                }
            }
            // fallback: try Date
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                return d.toISOString().slice(0, 10);
            }
        }
        return '';
    };

    const headerMap = [
        // Thông tin cơ bản
        { key: 'hoTen', label: 'Họ tên (*)' },
        { key: 'gioiTinh', label: 'Giới tính' },
        { key: 'ngaySinh', label: 'Ngày sinh (dd/mm/yyyy)' },
        { key: 'noiSinh', label: 'Nơi sinh' },
        { key: 'tinhTrangHonNhan', label: 'Tình trạng hôn nhân' },
        { key: 'danToc', label: 'Dân tộc' },
        { key: 'quocTich', label: 'Quốc tịch' },
        { key: 'tonGiao', label: 'Tôn giáo' },

        // CCCD
        { key: 'soCCCD', label: 'Số CCCD/CMND' },
        { key: 'ngayCapCCCD', label: 'Ngày cấp CCCD (dd/mm/yyyy)' },
        { key: 'noiCapCCCD', label: 'Nơi cấp CCCD' },
        // Liên hệ
        { key: 'soDienThoai', label: 'Số điện thoại (*)' },
        { key: 'soDienThoaiKhac', label: 'Số điện thoại khác' },
        { key: 'email', label: 'Email (*)' },

        // Địa chỉ (duy nhất)
        { key: 'diaChiSoNha', label: 'Địa chỉ - Số nhà/Đường' },
        { key: 'diaChiPhuongXa', label: 'Địa chỉ - Phường/Xã' },
        { key: 'diaChiQuanHuyen', label: 'Địa chỉ - Quận/Huyện' },
        { key: 'diaChiThanhPhoTinh', label: 'Địa chỉ - Tỉnh/TP' },

        // Trình độ học vấn
        { key: 'trinhDoVanHoa', label: 'Trình độ văn hóa' },
        { key: 'trinhDoChuyenMon', label: 'Trình độ chuyên môn' },
        { key: 'chuyenNganh', label: 'Chuyên ngành' },

        // Thông tin ứng tuyển
        { key: 'chiNhanh', label: 'Chi nhánh' },
        { key: 'viTriUngTuyen', label: 'Vị trí ứng tuyển' },
        { key: 'phongBan', label: 'Phòng ban' },
        { key: 'ngayGuiCV', label: 'Ngày gửi CV (dd/mm/yyyy)' },
        { key: 'nguonCV', label: 'Nguồn CV' },
    ];

    const handleImportFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                setLoading(true);
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

                if (!rows || rows.length === 0) {
                    if (showToast) showToast('File không có dữ liệu', 'error');
                    return;
                }

                let success = 0;
                let failed = 0;

                // Import chỉ liên quan đến Section I. THÔNG TIN CÁ NHÂN
                // Section II, III, IV sẽ cập nhật thủ công sau khi import
                for (const row of rows) {
                    const payload = {
                        hoTen: row['Họ tên (*)']?.toString().trim() || '',
                        gioiTinh: row['Giới tính']?.toString().trim() || 'Nam',
                        ngaySinh: parseExcelDate(row['Ngày sinh (dd/mm/yyyy)']) || null,
                        noiSinh: row['Nơi sinh']?.toString().trim() || null,
                        tinhTrangHonNhan: row['Tình trạng hôn nhân']?.toString().trim() || 'Độc thân',
                        danToc: row['Dân tộc']?.toString().trim() || null,
                        quocTich: row['Quốc tịch']?.toString().trim() || 'Việt Nam',
                        tonGiao: row['Tôn giáo']?.toString().trim() || null,
                        soCCCD: row['Số CCCD/CMND']?.toString().trim() || null,
                        ngayCapCCCD: parseExcelDate(row['Ngày cấp CCCD (dd/mm/yyyy)']) || null,
                        noiCapCCCD: row['Nơi cấp CCCD']?.toString().trim() || null,
                        soDienThoai: row['Số điện thoại (*)']?.toString().trim() || '',
                        soDienThoaiKhac: row['Số điện thoại khác']?.toString().trim() || null,
                        email: row['Email (*)']?.toString().trim() || '',
                        // Địa chỉ duy nhất - gán vào cả tạm trú và thường trú
                        diaChiTamTru: {
                            soNha: row['Địa chỉ - Số nhà/Đường']?.toString().trim() || null,
                            phuongXa: row['Địa chỉ - Phường/Xã']?.toString().trim() || null,
                            quanHuyen: row['Địa chỉ - Quận/Huyện']?.toString().trim() || null,
                            thanhPhoTinh: row['Địa chỉ - Tỉnh/TP']?.toString().trim() || null,
                        },
                        diaChiLienLac: {
                            // Gán cùng giá trị với địa chỉ tạm trú
                            soNha: row['Địa chỉ - Số nhà/Đường']?.toString().trim() || null,
                            phuongXa: row['Địa chỉ - Phường/Xã']?.toString().trim() || null,
                            quanHuyen: row['Địa chỉ - Quận/Huyện']?.toString().trim() || null,
                            thanhPhoTinh: row['Địa chỉ - Tỉnh/TP']?.toString().trim() || null,
                        },
                        trinhDoVanHoa: row['Trình độ văn hóa']?.toString().trim() || null,
                        trinhDoChuyenMon: row['Trình độ chuyên môn']?.toString().trim() || null,
                        chuyenNganh: row['Chuyên ngành']?.toString().trim() || null,
                        chiNhanh: row['Chi nhánh']?.toString().trim() || null,
                        viTriUngTuyen: row['Vị trí ứng tuyển']?.toString().trim() || null,
                        phongBan: row['Phòng ban']?.toString().trim() || null,
                        ngayGuiCV: parseExcelDate(row['Ngày gửi CV (dd/mm/yyyy)']) || null,
                        nguonCV: row['Nguồn CV']?.toString().trim() || null,
                        // Section II, III, IV sẽ cập nhật thủ công sau khi import
                        workExperiences: [],
                        trainingProcesses: [],
                        foreignLanguages: []
                    };

                    // Validate tối thiểu - kiểm tra cả empty string
                    const hoTenValid = payload.hoTen && payload.hoTen.trim() !== '';
                    const soDienThoaiValid = payload.soDienThoai && payload.soDienThoai.trim() !== '';
                    const emailValid = payload.email && payload.email.trim() !== '';

                    if (!hoTenValid || !soDienThoaiValid || !emailValid) {
                        failed += 1;
                        console.warn(`Row ${row._rowNum || 'unknown'} skipped - missing required fields:`, {
                            hoTen: hoTenValid,
                            soDienThoai: soDienThoaiValid,
                            email: emailValid
                        });
                        continue;
                    }

                    // Normalize email và số điện thoại
                    payload.email = payload.email.trim().toLowerCase();
                    payload.soDienThoai = payload.soDienThoai.trim();

                    try {
                        const res = await candidatesAPI.create(payload);
                        if (res.data.success) {
                            success += 1;
                        } else {
                            failed += 1;
                            console.error(`Import error for row ${row._rowNum || 'unknown'}:`, res.data.message || 'Unknown error');
                        }
                    } catch (err) {
                        failed += 1;
                        const errorMessage = err.response?.data?.message || err.message || 'Lỗi không xác định';
                        const errorDetails = err.response?.data?.details || '';
                        console.error(`Import error for row ${row._rowNum || 'unknown'}:`, {
                            candidateName: payload.hoTen || 'N/A',
                            email: payload.email || 'N/A',
                            phone: payload.soDienThoai || 'N/A',
                            error: errorMessage,
                            details: errorDetails,
                            status: err.response?.status,
                            errorCode: err.response?.data?.errorCode,
                            errorConstraint: err.response?.data?.errorConstraint
                        });

                        // Hiển thị toast cho lỗi quan trọng (unique constraint, etc.)
                        if (err.response?.data?.errorCode === '23505' || errorMessage.includes('đã tồn tại')) {
                            if (showToast && failed === 1) {
                                showToast(`Lỗi import hàng ${row._rowNum || 'unknown'}: ${errorMessage}`, 'error');
                            }
                        }
                    }
                }

                if (showToast) {
                    showToast(`Import hoàn tất: ${success} thành công, ${failed} thất bại`, failed ? 'warning' : 'success');
                }
                fetchCandidates(false);
            } catch (err) {
                console.error('Import Excel error:', err);
                if (showToast) showToast('Lỗi khi import file Excel', 'error');
            } finally {
                setLoading(false);
            }
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Handle select/deselect candidates
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedCandidates(candidates.map(c => c.id));
        } else {
            setSelectedCandidates([]);
        }
    };

    const handleSelectCandidate = (candidateId) => {
        setSelectedCandidates(prev => {
            if (prev.includes(candidateId)) {
                return prev.filter(id => id !== candidateId);
            } else {
                return [...prev, candidateId];
            }
        });
    };

    const handleDeleteSelected = async () => {
        if (selectedCandidates.length === 0) {
            if (showToast) {
                showToast('Vui lòng chọn ứng viên cần xóa', 'warning');
            }
            return;
        }

        if (showConfirm) {
            const confirmed = await showConfirm(
                `Bạn có chắc chắn muốn xóa ${selectedCandidates.length} ứng viên đã chọn?`,
                'Xác nhận xóa'
            );
            if (!confirmed) return;
        }

        try {
            setLoading(true);
            let success = 0;
            let failed = 0;

            for (const id of selectedCandidates) {
                try {
                    const res = await candidatesAPI.delete(id);
                    if (res.data.success) {
                        success += 1;
                    } else {
                        failed += 1;
                    }
                } catch (err) {
                    failed += 1;
                    console.error('Error deleting candidate:', err);
                }
            }

            if (showToast) {
                showToast(`Đã xóa ${success} ứng viên thành công${failed > 0 ? `, ${failed} thất bại` : ''}`, failed > 0 ? 'warning' : 'success');
            }

            setSelectedCandidates([]);
            fetchCandidates(false);
        } catch (error) {
            console.error('Error deleting candidates:', error);
            if (showToast) {
                showToast('Lỗi khi xóa ứng viên', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAll = async () => {
        if (candidates.length === 0) {
            if (showToast) {
                showToast('Không có ứng viên nào để xóa', 'warning');
            }
            return;
        }

        if (showConfirm) {
            const confirmed = await showConfirm(
                `Bạn có chắc chắn muốn xóa TẤT CẢ ${candidates.length} ứng viên?`,
                'Xác nhận xóa tất cả'
            );
            if (!confirmed) return;
        }

        try {
            setLoading(true);
            let success = 0;
            let failed = 0;

            for (const candidate of candidates) {
                try {
                    const res = await candidatesAPI.delete(candidate.id);
                    if (res.data.success) {
                        success += 1;
                    } else {
                        failed += 1;
                    }
                } catch (err) {
                    failed += 1;
                    console.error('Error deleting candidate:', err);
                }
            }

            if (showToast) {
                showToast(`Đã xóa ${success} ứng viên thành công${failed > 0 ? `, ${failed} thất bại` : ''}`, failed > 0 ? 'warning' : 'success');
            }

            setSelectedCandidates([]);
            fetchCandidates(false);
        } catch (error) {
            console.error('Error deleting all candidates:', error);
            if (showToast) {
                showToast('Lỗi khi xóa ứng viên', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        try {
            setLoading(true);

            // Nếu chưa có dữ liệu, xuất template trống
            let candidatesData = candidates;
            if (!candidatesData || candidatesData.length === 0) {
                candidatesData = [{}];
            }

            // Export chỉ liên quan đến Section I. THÔNG TIN CÁ NHÂN
            // Section II, III, IV sẽ cập nhật thủ công sau khi import
            // Không cần fetch chi tiết work experiences, training, languages
            const formatDateForExcel = (dateString) => {
                if (!dateString) return '';
                try {
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) return '';
                    return date.toLocaleDateString('vi-VN');
                } catch {
                    return '';
                }
            };

            const headers = headerMap.map(h => h.label);
            const data = candidatesData.map((c) => {
                const row = {};
                headerMap.forEach(({ key, label }) => {
                    switch (key) {
                        case 'hoTen':
                            row[label] = c.ho_ten || '';
                            break;
                        case 'gioiTinh':
                            row[label] = c.gioi_tinh || '';
                            break;
                        case 'ngaySinh':
                            row[label] = formatDateForExcel(c.ngay_sinh);
                            break;
                        case 'noiSinh':
                            row[label] = c.noi_sinh || '';
                            break;
                        case 'tinhTrangHonNhan':
                            row[label] = c.tinh_trang_hon_nhan || '';
                            break;
                        case 'danToc':
                            row[label] = c.dan_toc || '';
                            break;
                        case 'quocTich':
                            row[label] = c.quoc_tich || '';
                            break;
                        case 'tonGiao':
                            row[label] = c.ton_giao || '';
                            break;
                        case 'soCCCD':
                            row[label] = c.so_cccd || '';
                            break;
                        case 'ngayCapCCCD':
                            row[label] = formatDateForExcel(c.ngay_cap_cccd);
                            break;
                        case 'noiCapCCCD':
                            row[label] = c.noi_cap_cccd || '';
                            break;
                        case 'soDienThoai':
                            row[label] = c.so_dien_thoai || '';
                            break;
                        case 'soDienThoaiKhac':
                            row[label] = c.so_dien_thoai_khac || '';
                            break;
                        case 'email':
                            row[label] = c.email || '';
                            break;
                        case 'diaChiSoNha':
                            // Ưu tiên lấy từ địa chỉ tạm trú, nếu không có thì lấy từ thường trú
                            row[label] = c.dia_chi_tam_tru_so_nha || c.nguyen_quan_so_nha || '';
                            break;
                        case 'diaChiPhuongXa':
                            row[label] = c.dia_chi_tam_tru_phuong_xa || c.nguyen_quan_phuong_xa || '';
                            break;
                        case 'diaChiQuanHuyen':
                            row[label] = c.dia_chi_tam_tru_quan_huyen || c.nguyen_quan_quan_huyen || '';
                            break;
                        case 'diaChiThanhPhoTinh':
                            row[label] = c.dia_chi_tam_tru_thanh_pho_tinh || c.nguyen_quan_thanh_pho_tinh || '';
                            break;
                        case 'trinhDoVanHoa':
                            row[label] = c.trinh_do_van_hoa || '';
                            break;
                        case 'trinhDoChuyenMon':
                            row[label] = c.trinh_do_chuyen_mon || '';
                            break;
                        case 'chuyenNganh':
                            row[label] = c.chuyen_nganh || '';
                            break;
                        case 'chiNhanh':
                            row[label] = c.chi_nhanh || '';
                            break;
                        case 'viTriUngTuyen':
                            row[label] = c.vi_tri_ung_tuyen || '';
                            break;
                        case 'phongBan':
                            row[label] = c.phong_ban || '';
                            break;
                        case 'ngayGuiCV':
                            row[label] = formatDateForExcel(c.ngay_gui_cv);
                            break;
                        case 'nguonCV':
                            row[label] = c.nguon_cv || '';
                            break;
                        default:
                            row[label] = '';
                    }
                });
                return row;
            });

            const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'UngVien');

            // Auto width
            const colWidths = headers.map(() => ({ wch: 30 }));
            worksheet['!cols'] = colWidths;

            XLSX.writeFile(workbook, 'ung_vien_template.xlsx');
            if (showToast) showToast('Đã xuất file Excel', 'success');
        } catch (err) {
            console.error('Export Excel error:', err);
            if (showToast) showToast('Lỗi khi xuất Excel', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Export approved recruitment requests to Excel
    const handleExportRecruitmentRequests = async () => {
        try {
            setLoading(true);

            // Lấy dữ liệu đã được duyệt (APPROVED)
            let approvedRequests = recruitmentRequests.filter(req => req.status === 'APPROVED');

            // Filter theo tháng/năm nếu có
            if (exportFilterYear) {
                const filterYear = parseInt(exportFilterYear, 10);
                approvedRequests = approvedRequests.filter(req => {
                    if (!req.approvedAt) return false;
                    const approvedDate = new Date(req.approvedAt);
                    const requestYear = approvedDate.getFullYear();

                    if (exportFilterMonth) {
                        const filterMonth = parseInt(exportFilterMonth, 10);
                        const requestMonth = approvedDate.getMonth() + 1; // getMonth() returns 0-11
                        return requestYear === filterYear && requestMonth === filterMonth;
                    }
                    return requestYear === filterYear;
                });
            }

            if (approvedRequests.length === 0) {
                if (showToast) showToast('Không có đơn nào đã được duyệt trong khoảng thời gian đã chọn', 'warning');
                setLoading(false);
                return;
            }

            // Định nghĩa headers cho Excel
            const headers = [
                'Mã đơn',
                'Chức danh cần tuyển',
                'Phòng ban/Bộ phận',
                'Người gửi',
                'Quản lý trực tiếp',
                'Quản lý gián tiếp',
                'Số lượng',
                'Loại lao động',
                'Lý do tuyển',
                'Giới tính',
                'Độ tuổi',
                'Trình độ học vấn',
                'Kinh nghiệm chuyên môn',
                'Chi tiết kinh nghiệm',
                'Ngày gửi',
                'Ngày duyệt',
                'Trạng thái'
            ];

            // Chuẩn hóa dữ liệu
            const data = approvedRequests.map((req) => {
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

                return {
                    'Mã đơn': req.id || '',
                    'Chức danh cần tuyển': req.chucDanhCanTuyen || '',
                    'Phòng ban/Bộ phận': req.phongBanBoPhan || '',
                    'Người gửi': req.nguoiGui || '',
                    'Quản lý trực tiếp': req.nguoiQuanLyTrucTiep || '',
                    'Quản lý gián tiếp': req.nguoiQuanLyGianTiep || '',
                    'Số lượng': req.soLuongYeuCau || '',
                    'Loại lao động': req.loaiLaoDong === 'toan_thoi_gian' ? 'Toàn thời gian' : req.loaiLaoDong === 'thoi_vu' ? 'Thời vụ' : req.loaiLaoDong || '',
                    'Lý do tuyển': req.lyDoTuyen === 'thay_the' ? 'Thay thế' : req.lyDoTuyen === 'nhu_cau_tang' ? 'Nhu cầu tăng' : req.lyDoTuyen === 'vi_tri_moi' ? 'Vị trí mới' : req.lyDoTuyen || '',
                    'Giới tính': req.gioiTinh === 'bat_ky' ? 'Bất kỳ' : req.gioiTinh === 'nam' ? 'Nam' : req.gioiTinh === 'nu' ? 'Nữ' : req.gioiTinh || '',
                    'Độ tuổi': req.doTuoi || '',
                    'Trình độ học vấn': req.trinhDoHocVanYeuCau || '',
                    'Kinh nghiệm chuyên môn': req.kinhNghiemChuyenMon === 'khong_yeu_cau' ? 'Không yêu cầu' : req.kinhNghiemChuyenMon === 'co_yeu_cau' ? 'Có yêu cầu' : req.kinhNghiemChuyenMon || '',
                    'Chi tiết kinh nghiệm': req.chiTietKinhNghiem || '',
                    'Ngày gửi': formatDate(req.ngayGui),
                    'Ngày duyệt': formatDate(req.approvedAt),
                    'Trạng thái': req.status === 'APPROVED' ? 'Đã duyệt' : req.status || ''
                };
            });

            // Tạo worksheet
            const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'YeuCauTuyenDung');

            // Auto width
            const colWidths = headers.map(() => ({ wch: 25 }));
            worksheet['!cols'] = colWidths;

            // Tạo tên file
            let fileName = 'yeu_cau_tuyen_dung_da_duyet';
            if (exportFilterYear) {
                fileName += `_${exportFilterYear}`;
            }
            if (exportFilterMonth) {
                const monthNames = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
                fileName += `_${monthNames[parseInt(exportFilterMonth, 10) - 1]}`;
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

    // Generate PDF for recruitment offer letter
    const handleExportPDF = () => {
        try {
            // Helper function to format currency
            const formatCurrency = (value) => {
                if (!value || value === '') return '……';
                return parseInt(value).toLocaleString('vi-VN') + ' VNĐ';
            };

            // Get candidate name
            const candidateName = viewingCandidate?.ho_ten || viewingCandidate?.hoTen || '';

            // Get manager names
            const directManager = managers.find(m => m.id === parseInt(recruitmentInfoForm.baoCaoTrucTiep));
            const directManagerName = directManager ? (directManager.ho_ten || directManager.hoTen || '') : '';

            const indirectManager = managers.find(m => m.id === parseInt(recruitmentInfoForm.baoCaoGianTiep));
            const indirectManagerName = indirectManager ? (indirectManager.ho_ten || indirectManager.hoTen || '') : '';

            const startDate = recruitmentInfoForm.ngayBatDauLamViec
                ? new Date(recruitmentInfoForm.ngayBatDauLamViec).toLocaleDateString('vi-VN')
                : '……';

            // Escape HTML to prevent XSS
            const escapeHtml = (text) => {
                if (!text) return '';
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            };

            const workItems = recruitmentInfoForm.congViecChinh || [];
            const allLetters = 'abcdefghijklmnopqrstuvwxyz'.split('');
            let workItemsHtml = '';
            let letterIndex = 0;

            // Chỉ hiển thị các công việc đã nhập
            workItems.forEach((item) => {
                if (item && item.trim() !== '') {
                    workItemsHtml += `<p style="margin: 4px 0; margin-left: 0 !important; padding-left: 0 !important; text-align: left !important; page-break-inside: avoid;">${allLetters[letterIndex]}. <span style="color: #ff0000;">${escapeHtml(item)}</span></p>`;
                    letterIndex++;
                }
            });

            // Mục cuối cùng luôn là "Những công việc khác..."
            if (letterIndex > 0) {
                workItemsHtml += `<p style="margin: 4px 0; margin-left: 0 !important; padding-left: 0 !important; text-align: left !important; page-break-inside: avoid;">${allLetters[letterIndex]}. Những công việc khác theo sự phân công của cấp quản lý trực tiếp.</p>`;
            } else {
                // Nếu không có công việc nào, chỉ hiển thị mục e
                workItemsHtml += `<p style="margin: 4px 0; margin-left: 0 !important; padding-left: 0 !important; text-align: left !important; page-break-inside: avoid;">a. Những công việc khác theo sự phân công của cấp quản lý trực tiếp.</p>`;
            }

            const hoTroComTrua = recruitmentInfoForm.hoTroComTrua
                ? formatCurrency(recruitmentInfoForm.hoTroComTrua)
                : '30.000 VNĐ';

            // Get logo path
            const logoPath = `${window.location.origin}${process.env.PUBLIC_URL || ''}/RMG-logo.jpg`;

            // Create HTML content with left alignment and proper formatting
            const htmlContent = `
                <style>
                    @media print {
                        p {
                            orphans: 2;
                            widows: 2;
                            page-break-inside: avoid;
                        }
                        div {
                            page-break-inside: avoid;
                        }
                    }
                </style>
                <div id="pdf-content-wrapper" style="font-family: 'Times New Roman', serif; padding: 3mm 5mm 10mm 5mm; line-height: 1.5; color: #000; background: #ffffff; text-align: left !important; max-width: 100%; direction: ltr; orphans: 2; widows: 2;">
                    <div style="margin-bottom: 5px; margin-top: 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important;">
                        <img src="${logoPath}" alt="RMG Logo" style="max-width: 200px; height: auto; margin-left: 0 !important; padding-left: 0 !important; display: block;" onerror="this.style.display='none';" />
                    </div>
                    <p style="font-weight: bold; font-size: 12pt; margin-bottom: 4px; margin-top: 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid; orphans: 2; widows: 2;">Kính gửi ${escapeHtml(candidateName)},</p>
                    <p style="margin-bottom: 8px; margin-top: 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid; orphans: 2; widows: 2;">Công ty TNHH RMG Việt Nam trân trọng gửi đến Anh/ Chị thư mời làm việc cho vị trí công việc như sau:</p>
                    
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;"><strong>1. Chức danh</strong> : <span style="color: #ff0000;">${escapeHtml(recruitmentInfoForm.chucDanh || '…………………..')}</span></p>
                    
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;"><strong>2. Báo cáo trực tiếp cho</strong> : <span style="color: #ff0000;">${escapeHtml(directManagerName || '………………………….')}</span></p>
                    
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;"><strong>3. Báo cáo gián tiếp cho</strong> : <span style="color: #ff0000;">${escapeHtml(indirectManagerName || '………………………….')}</span></p>
                    
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;"><strong>4. Địa điểm làm việc</strong> : <span style="color: #ff0000;">${escapeHtml(recruitmentInfoForm.diaDiemLamViec || '…………………………')}</span></p>
                    
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;"><strong>5. Ngày bắt đầu làm việc</strong> : <span style="color: #ff0000;">${escapeHtml(startDate)}</span></p>
                    
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;"><strong>6. Thời gian thử việc</strong> : 60 ngày (kể từ ngày bắt đầu làm việc)</p>
                    
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;"><strong>7. Thời gian làm việc</strong> : 08:30 – 17:30 (Từ Thứ Hai đến Thứ Sáu)</p>
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 20px !important; page-break-inside: avoid;">08:00 – 12:00 (Thứ Bảy- Nếu cần)</p>
                    
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;"><strong>8. Công việc chính:</strong></p>
                    ${workItemsHtml}
                    
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;"><strong>9. Mức lương gộp hàng tháng (gross)</strong></p>
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;">a. Trong thời gian thử việc : <span style="color: #ff0000;">${formatCurrency(recruitmentInfoForm.luongThuViec)}/tháng.</span></p>
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;">b. Sau thời gian thử việc : <span style="color: #ff0000;">${formatCurrency(recruitmentInfoForm.luongSauThuViec)}/tháng.</span></p>
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;">Trong đó 80% là mức lương cơ bản và 20% là phụ cấp lương.</p>
                    
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;"><strong>10. Thuế thu nhập cá nhân và bảo hiểm bắt buộc:</strong> Hàng tháng nhân viên có nghĩa vụ nộp thuế thu nhập cá nhân theo Luật định. Nếu đạt yêu cầu qua thử việc và được ký Hợp đồng lao động, Anh/Chị có nghĩa vụ tham gia BHXH, BHYT, BH thất nghiệp được trích từ tiền lương theo Luật định.</p>
                    
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;"><strong>11. Chính sách phụ cấp</strong></p>
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;">a. Hỗ trợ cơm trưa : 30.000 VNĐ/ngày làm việc</p>
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;">b. Hỗ trợ đi lại : <span style="color: #ff0000;">${formatCurrency(recruitmentInfoForm.hoTroDiLai)}/ngày làm việc</span></p>
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;">c. Phụ cấp tiền cơm : <span style="color: #ff0000;">${formatCurrency(recruitmentInfoForm.phuCapTienCom)}/ngày làm việc</span></p>
                    <p style="margin: 4px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;">d. Phụ cấp điện thoại : <span style="color: #ff0000;">${formatCurrency(recruitmentInfoForm.phuCapDienThoai)}/tháng (thẻ điện thoại).</span></p>
                    
                    <p style="margin: 6px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;"><strong>12. Bảo hiểm Tai nạn:</strong></p>
                    <p style="margin: 3px 0; margin-left: 0 !important; padding-left: 0 !important; text-align: left !important; page-break-inside: avoid;">theo chính sách công ty</p>
                    
                    <p style="margin: 6px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;"><strong>13. Chính sách tiền thưởng</strong></p>
                    <p style="margin: 3px 0; margin-left: 0 !important; padding-left: 0 !important; text-align: left !important; page-break-inside: avoid;">a. Thưởng tháng lương thứ 13: theo chính sách công ty hiện hành.</p>
                    <p style="margin: 3px 0; margin-left: 0 !important; padding-left: 0 !important; text-align: left !important; page-break-inside: avoid;">b. Thưởng theo đánh giá hoàn thành mục tiêu cuối năm và các khoản thưởng khác: theo chính sách công ty hiện hành.</p>
                    
                    <p style="margin: 6px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;"><strong>14. Phương tiện</strong></p>
                    <p style="margin: 3px 0; margin-left: 0 !important; padding-left: 0 !important; text-align: left !important; page-break-inside: avoid;">a. Phương tiện đi làm: tự túc</p>
                    <p style="margin: 3px 0; margin-left: 0 !important; padding-left: 0 !important; text-align: left !important; page-break-inside: avoid;">b. Phương tiện đi công tác trong thời gian làm việc: theo chính sách công ty.</p>
                    
                    <p style="margin: 6px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;"><strong>15. Số ngày nghỉ trong năm:</strong></p>
                    <p style="margin: 3px 0; margin-left: 0 !important; padding-left: 0 !important; text-align: left !important; page-break-inside: avoid;">a. Nghỉ phép năm: 12 ngày trong một năm.</p>
                    <p style="margin: 3px 0; margin-left: 0 !important; padding-left: 0 !important; text-align: left !important; page-break-inside: avoid;">Phép năm được tính từ ngày Anh/Chị bắt đầu làm việc tại công ty và chỉ được sử dụng sau thời hạn thử việc.</p>
                    <p style="margin: 3px 0; margin-left: 0 !important; padding-left: 0 !important; text-align: left !important; page-break-inside: avoid;">b. Nghỉ lễ, nghỉ chế độ: áp dụng theo Luật lao động Việt Nam và Chính sách công ty.</p>
                    
                    <p style="margin: 6px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;"><strong>16. Hình thức trả lương:</strong></p>
                    <p style="margin: 3px 0; margin-left: 0 !important; padding-left: 0 !important; text-align: left !important; page-break-inside: avoid;">Lương và phụ cấp được trả bằng tiền đồng và được chuyển khoản vào tài khoản ngân hàng của Anh/Chị vào ngày 5 hàng tháng.</p>
                    
                    <p style="margin: 6px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;"><strong>17. Phúc lợi:</strong></p>
                    <p style="margin: 3px 0; margin-left: 0 !important; padding-left: 0 !important; text-align: left !important; page-break-inside: avoid;">Trong thời gian thử việc, Anh/Chị được hưởng các phúc lợi của công ty bao gồm trợ cấp ngày lễ (nếu có), sinh nhật, cưới hỏi, ốm đau, chia buồn; và các khoản phúc lợi khác áp dụng chung cho toàn thể nhân viên công ty tại thời điểm Anh/Chị đang làm việc (nếu có).</p>
                    
                    <p style="margin: 12px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;"><strong>* QUI ĐỊNH:</strong></p>
                    <p style="margin: 3px 0; margin-left: 0 !important; padding-left: 0 !important; text-align: left !important; page-break-inside: avoid;">→ Cam kết tuân thủ Nội Quy làm việc của Công ty làm kim chỉ nam cho mọi hành động.</p>
                    <p style="margin: 3px 0; margin-left: 0 !important; padding-left: 0 !important; text-align: left !important; page-break-inside: avoid;">→ Không làm bất cứ điều gì gây ảnh hưởng xấu đến vị thế, danh tiếng và hình ảnh của RMG Việt Nam dưới mọi hình thức.</p>
                    <p style="margin: 3px 0; margin-left: 0 !important; padding-left: 0 !important; text-align: left !important; page-break-inside: avoid;">→ Không được tiết lộ các thông tin liên quan đến tiền lương và phúc lợi cá nhân cho người khác không có thẩm quyền.</p>
                    <p style="margin: 3px 0; margin-left: 0 !important; padding-left: 0 !important; text-align: left !important; page-break-inside: avoid;">→ Đảm bảo giấy phép hành nghề phải được sử dụng phục vụ cho công việc tại công ty RMG Việt Nam</p>
                    
                    <p style="margin: 12px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;">Hết thời hạn thử việc, Công ty sẽ tiến hành đánh giá hiệu quả công việc của Anh/Chị và sẽ xem xét ký hợp đồng lao động.</p>
                    
                    <p style="margin: 8px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;">Chào mừng Anh/Chị đến với Công ty TNHH RMG Việt Nam, chúc Anh/Chị thành công trong thời gian làm việc với Công ty.</p>
                    
                    <p style="margin: 12px 0; text-align: left !important; margin-left: 0 !important; padding-left: 0 !important; page-break-inside: avoid;">Vui lòng ký xác nhận những điều kiện và điều khoản trong Thư Tuyển dụng và gởi lại phòng Hành chính Nhân sự một (01) bản.</p>
                </div>
            `;

            // Create a container for the PDF content - hidden from the start
            const container = document.createElement('div');
            container.id = 'pdf-export-container';
            container.style.position = 'fixed';
            container.style.top = '-9999px';
            container.style.left = '-9999px';
            container.style.width = '794px';
            container.style.height = 'auto';
            container.style.zIndex = '-9999';
            container.style.backgroundColor = 'transparent';
            container.style.display = 'block';
            container.style.overflow = 'visible';
            container.style.visibility = 'hidden';

            // Create the content element
            const element = document.createElement('div');
            element.id = 'pdf-export-content';
            element.innerHTML = htmlContent;
            element.style.width = '794px'; // A4 width in pixels (210mm)
            element.style.backgroundColor = '#ffffff';
            element.style.color = '#000000';
            element.style.fontFamily = 'Times New Roman, serif';
            element.style.fontSize = '11pt';
            element.style.lineHeight = '1.5';
            element.style.padding = '3mm 5mm 10mm 5mm';
            element.style.boxSizing = 'border-box';
            element.style.margin = '20px auto';
            element.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            element.style.textAlign = 'left';
            element.style.direction = 'ltr';
            element.style.setProperty('text-align', 'left', 'important');

            container.appendChild(element);
            document.body.appendChild(container);

            // Force reflow
            const height = element.offsetHeight;

            // Wait for images to load before generating PDF
            const images = element.querySelectorAll('img');
            const imagePromises = Array.from(images).map(img => {
                if (img.complete) {
                    return Promise.resolve();
                }
                return new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = resolve; // Continue even if image fails to load
                    // Timeout after 3 seconds
                    setTimeout(resolve, 3000);
                });
            });

            // Wait for element to be fully rendered and images to load
            Promise.all(imagePromises).then(() => {
                setTimeout(() => {
                    // Generate PDF (container is already hidden)
                    const opt = {
                        margin: [5, 5, 5, 5],
                        filename: `Thu_Moi_Lam_Viec_${candidateName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: {
                            scale: 2,
                            useCORS: true,
                            allowTaint: false,
                            logging: false,
                            letterRendering: true,
                            backgroundColor: '#ffffff',
                            removeContainer: false,
                            onclone: (clonedDoc) => {
                                // Ensure the cloned element is visible for rendering
                                const clonedElement = clonedDoc.getElementById('pdf-export-content');
                                if (clonedElement) {
                                    clonedElement.style.visibility = 'visible';
                                    clonedElement.style.display = 'block';
                                    clonedElement.style.textAlign = 'left';
                                    clonedElement.style.direction = 'ltr';
                                    clonedElement.style.setProperty('text-align', 'left', 'important');
                                }
                                // Also update the wrapper
                                const wrapper = clonedDoc.getElementById('pdf-content-wrapper');
                                if (wrapper) {
                                    wrapper.style.textAlign = 'left';
                                    wrapper.style.direction = 'ltr';
                                    wrapper.style.setProperty('text-align', 'left', 'important');
                                    // Update all child elements
                                    const allElements = wrapper.querySelectorAll('*');
                                    allElements.forEach(el => {
                                        if (el.style) {
                                            el.style.textAlign = 'left';
                                            el.style.setProperty('text-align', 'left', 'important');
                                            // Add orphans and widows to prevent text cutting
                                            if (el.tagName === 'P' || el.tagName === 'DIV') {
                                                el.style.setProperty('orphans', '2', 'important');
                                                el.style.setProperty('widows', '2', 'important');
                                                el.style.setProperty('page-break-inside', 'avoid', 'important');
                                            }
                                        }
                                    });
                                    // Ensure logo images are loaded
                                    const images = wrapper.querySelectorAll('img');
                                    images.forEach(img => {
                                        if (img.src && !img.complete) {
                                            img.style.display = 'block';
                                        }
                                    });
                                }
                            }
                        },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };

                    html2pdf().set(opt).from(element).save().then(() => {
                        // Clean up
                        const containerEl = document.getElementById('pdf-export-container');
                        if (containerEl && document.body.contains(containerEl)) {
                            document.body.removeChild(containerEl);
                        }
                        if (showToast) {
                            showToast('Xuất PDF thành công!', 'success');
                        }
                    }).catch((error) => {
                        // Clean up
                        const containerEl = document.getElementById('pdf-export-container');
                        if (containerEl && document.body.contains(containerEl)) {
                            document.body.removeChild(containerEl);
                        }
                        console.error('Export PDF error:', error);
                        console.error('Error stack:', error.stack);
                        if (showToast) {
                            showToast('Lỗi khi xuất PDF: ' + (error.message || 'Unknown error'), 'error');
                        }
                    });
                }, 300);
            });
        } catch (error) {
            console.error('Export PDF error:', error);
            if (showToast) {
                showToast('Lỗi khi xuất PDF', 'error');
            }
        }
    };

    return (
        <div className="recruitment-management">
            {/* Header */}
            <div className="recruitment-management-header">
                <div className="recruitment-management-header-top">
                    <div className="recruitment-management-header-content">
                        {/* Icon Banner Block */}
                        <div className="recruitment-management-icon-wrapper">
                            <svg className="recruitment-management-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                            </svg>
                        </div>

                        {/* Title and Description */}
                        <div className="recruitment-management-header-text">
                            <h1 className="recruitment-management-title">QUẢN LÝ TUYỂN DỤNG</h1>
                            <p className="recruitment-management-subtitle">
                                Quản lý và theo dõi quy trình tuyển dụng nhân sự
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="recruitment-management-header-actions">
                        {/* Recruitment Requests Button - Chức năng tạo yêu cầu tuyển dụng */}
                        <button
                            type="button"
                            className="recruitment-management-requests-btn"
                            onClick={() => setShowRecruitmentRequestsModal(true)}
                            title="Yêu cầu tuyển nhân sự"
                        >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <span>Yêu cầu tuyển nhân sự</span>
                            {pendingRequestsCount > 0 && (
                                <span className="recruitment-management-requests-badge blinking">
                                    {pendingRequestsCount}
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            className="recruitment-management-add-btn"
                            onClick={handleAddCandidate}
                            title="Thêm ứng viên mới"
                        >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                            <span>Thêm ứng viên</span>
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleImportFileChange}
                            style={{ display: 'none' }}
                        />
                        <button
                            type="button"
                            className="recruitment-management-import-btn"
                            onClick={handleImportClick}
                            title="Import ứng viên từ Excel"
                        >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                            </svg>
                            <span>Import</span>
                        </button>

                        <button
                            type="button"
                            className="recruitment-management-export-btn"
                            onClick={handleExportExcel}
                            title="Xuất danh sách ra Excel"
                        >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <span>Xuất Excel</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Control Bar and Table - No gap between them */}
            <div className="recruitment-management-control-and-table">
                {/* Control Bar - Search and Status Filters */}
                <div className="recruitment-management-control-bar">
                    <div className="recruitment-management-control-bar-content">
                        {/* Search Bar */}
                        <div className="recruitment-management-search">
                            <svg className="recruitment-management-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <input
                                type="text"
                                className="recruitment-management-search-input"
                                placeholder="Tìm kiếm theo tên, SĐT, CCCD, vị trí..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Status Filter Pills */}
                        <div className="recruitment-management-filter-pills">
                            {/* Delete Buttons - Luôn hiển thị */}
                            <button
                                type="button"
                                className="recruitment-management-delete-btn-small"
                                onClick={handleDeleteSelected}
                                title={selectedCandidates.length > 0 ? `Xóa ${selectedCandidates.length} ứng viên đã chọn` : "Chọn ứng viên để xóa"}
                                disabled={selectedCandidates.length === 0}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                                <span>Xóa {selectedCandidates.length > 0 ? `(${selectedCandidates.length})` : ''}</span>
                            </button>

                            <button
                                type="button"
                                className="recruitment-management-delete-all-btn-small"
                                onClick={handleDeleteAll}
                                title="Xóa tất cả ứng viên"
                                disabled={candidates.length === 0}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                                <span>Xóa tất cả</span>
                            </button>

                            {statusFilters.map(filter => (
                                <button
                                    key={filter.key}
                                    type="button"
                                    className={`recruitment-management-pill ${selectedStatus === filter.key ? 'pill-active' : 'pill-inactive'}`}
                                    data-filter={filter.key}
                                    onClick={() => setSelectedStatus(filter.key)}
                                >
                                    <span>{filter.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="recruitment-management-table-container">
                    {loading ? (
                        <div className="recruitment-management-loading">
                            <div className="recruitment-management-spinner"></div>
                            <p>Đang tải dữ liệu...</p>
                        </div>
                    ) : (
                        <table className="recruitment-management-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '50px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={candidates.length > 0 && selectedCandidates.length === candidates.length}
                                            onChange={handleSelectAll}
                                            onClick={(e) => e.stopPropagation()}
                                            title="Chọn tất cả"
                                        />
                                    </th>
                                    <th>HỌ TÊN</th>
                                    <th>NGÀY SINH</th>
                                    <th>VỊ TRÍ ỨNG TUYỂN</th>
                                    <th>PHÒNG BAN</th>
                                    <th>SỐ ĐT</th>
                                    <th>NGÀY GỬI CV</th>
                                    <th>TRẠNG THÁI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {candidates.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="recruitment-management-empty-cell">
                                            <div className="recruitment-management-empty">
                                                <svg className="recruitment-management-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                </svg>
                                                <p>Chưa có dữ liệu ứng viên</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    candidates.map((candidate, index) => {
                                        // Map status từ database sang label
                                        const getStatusLabel = (status, candidate = null) => {
                                            // Xử lý ON_PROBATION với 2 trạng thái con
                                            if (status === 'ON_PROBATION') {
                                                if (!candidate || !candidate.probation_start_date) {
                                                    return 'Đang chờ thử việc';
                                                }

                                                const startDate = new Date(candidate.probation_start_date);
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                startDate.setHours(0, 0, 0, 0);

                                                // Nếu chưa đến ngày bắt đầu
                                                if (startDate > today) {
                                                    return 'Đang chờ thử việc';
                                                } else {
                                                    return 'Đang thử việc';
                                                }
                                            }

                                            const statusMap = {
                                                'NEW': 'Ứng viên mới',
                                                'PENDING_INTERVIEW': 'Chờ phỏng vấn',
                                                'PENDING_MANAGER': 'Đang chờ phỏng vấn',
                                                'TRANSFERRED_TO_INTERVIEW': 'Đã chuyển PV',
                                                'WAITING_FOR_OTHER_APPROVAL': 'Đã chuyển PV',
                                                'READY_FOR_INTERVIEW': 'Đã chuyển PV',
                                                'PASSED': 'Đã đậu',
                                                'FAILED': 'Đã rớt'
                                            };
                                            return statusMap[status] || status || '-';
                                        };

                                        const getStatusClass = (status) => {
                                            const classMap = {
                                                'NEW': 'status-new',
                                                'PENDING_INTERVIEW': 'status-pending',
                                                'PENDING_MANAGER': 'status-pending-manager',
                                                'TRANSFERRED_TO_INTERVIEW': 'status-transferred',
                                                'WAITING_FOR_OTHER_APPROVAL': 'status-waiting',
                                                'READY_FOR_INTERVIEW': 'status-ready',
                                                'PASSED': 'status-passed',
                                                'FAILED': 'status-failed',
                                                'ON_PROBATION': 'status-probation'
                                            };
                                            return classMap[status] || '';
                                        };

                                        return (
                                            <tr
                                                key={candidate.id || index}
                                                className={`recruitment-table-row-clickable ${index % 2 === 1 ? 'even-row-bg' : ''}`}
                                                onClick={() => handleViewCandidate(candidate.id)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCandidates.includes(candidate.id)}
                                                        onChange={() => handleSelectCandidate(candidate.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </td>
                                                <td>{candidate.ho_ten || '-'}</td>
                                                <td>{formatDate(candidate.ngay_sinh)}</td>
                                                <td>{candidate.vi_tri_ung_tuyen || '-'}</td>
                                                <td>{candidate.phong_ban || '-'}</td>
                                                <td>{candidate.so_dien_thoai || '-'}</td>
                                                <td>{formatDate(candidate.ngay_gui_cv) || formatDate(candidate.created_at) || '-'}</td>
                                                <td>
                                                    <span className={`recruitment-status-badge ${getStatusClass(candidate.trang_thai)}`}>
                                                        {getStatusLabel(candidate.trang_thai, candidate)}
                                                    </span>
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

            {/* Add Candidate Modal */}
            {showAddCandidateModal && (
                <div className="recruitment-modal-overlay" onClick={handleCloseModal}>
                    <div className="recruitment-modal-box" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="recruitment-modal-header">
                            <h2 className="recruitment-modal-title">
                                {editingCandidateId ? 'Cập Nhật Hồ Sơ Ứng Viên' : 'Hồ Sơ Ứng Viên Mới'}
                            </h2>
                            <button
                                type="button"
                                className="recruitment-modal-close-btn"
                                onClick={handleCloseModal}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body - Scrollable */}
                        <div className="recruitment-modal-body">
                            {/* I. THÔNG TIN CÁ NHÂN */}
                            <div className="recruitment-form-section">
                                <h3 className="recruitment-form-section-title">
                                    <span className="recruitment-form-section-number">I.</span>
                                    THÔNG TIN CÁ NHÂN
                                </h3>
                                <div className="recruitment-form-section-divider"></div>

                                <div className="recruitment-form-grid-4">
                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">
                                            Họ và tên <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="recruitment-form-input"
                                            value={formData.hoTen}
                                            onChange={(e) => setFormData({ ...formData, hoTen: e.target.value })}
                                            placeholder="Nhập họ và tên"
                                        />
                                    </div>

                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">Giới tính</label>
                                        <select
                                            className="recruitment-form-input"
                                            value={formData.gioiTinh}
                                            onChange={(e) => setFormData({ ...formData, gioiTinh: e.target.value })}
                                        >
                                            <option value="Nam">Nam</option>
                                            <option value="Nữ">Nữ</option>
                                            <option value="Khác">Khác</option>
                                        </select>
                                    </div>

                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">Ngày sinh</label>
                                        <input
                                            type="date"
                                            className="recruitment-form-input"
                                            value={formData.ngaySinh}
                                            onChange={(e) => setFormData({ ...formData, ngaySinh: e.target.value })}
                                        />
                                    </div>

                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">Nơi sinh</label>
                                        <input
                                            type="text"
                                            className="recruitment-form-input"
                                            value={formData.noiSinh}
                                            onChange={(e) => setFormData({ ...formData, noiSinh: e.target.value })}
                                            placeholder="Nhập nơi sinh"
                                        />
                                    </div>

                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">Tình trạng hôn nhân</label>
                                        <select
                                            className="recruitment-form-input"
                                            value={formData.tinhTrangHonNhan}
                                            onChange={(e) => setFormData({ ...formData, tinhTrangHonNhan: e.target.value })}
                                        >
                                            <option value="Độc thân">Độc thân</option>
                                            <option value="Đã kết hôn">Đã kết hôn</option>
                                            <option value="Ly hôn">Ly hôn</option>
                                        </select>
                                    </div>

                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">Dân tộc</label>
                                        <input
                                            type="text"
                                            className="recruitment-form-input"
                                            value={formData.danToc}
                                            onChange={(e) => setFormData({ ...formData, danToc: e.target.value })}
                                            placeholder="Nhập dân tộc"
                                        />
                                    </div>

                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">Quốc tịch</label>
                                        <input
                                            type="text"
                                            className="recruitment-form-input"
                                            value={formData.quocTich}
                                            onChange={(e) => setFormData({ ...formData, quocTich: e.target.value })}
                                            placeholder="Nhập quốc tịch"
                                        />
                                    </div>

                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">Tôn giáo</label>
                                        <input
                                            type="text"
                                            className="recruitment-form-input"
                                            value={formData.tonGiao}
                                            onChange={(e) => setFormData({ ...formData, tonGiao: e.target.value })}
                                            placeholder="Nhập tôn giáo"
                                        />
                                    </div>

                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">Số CCCD/CMND</label>
                                        <input
                                            type="text"
                                            className="recruitment-form-input"
                                            value={formData.soCCCD}
                                            onChange={(e) => setFormData({ ...formData, soCCCD: e.target.value })}
                                            placeholder="Nhập số CCCD/CMND"
                                        />
                                    </div>

                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">Ngày cấp</label>
                                        <input
                                            type="date"
                                            className="recruitment-form-input"
                                            value={formData.ngayCapCCCD}
                                            onChange={(e) => setFormData({ ...formData, ngayCapCCCD: e.target.value })}
                                        />
                                    </div>

                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">Nơi cấp</label>
                                        <input
                                            type="text"
                                            className="recruitment-form-input"
                                            value={formData.noiCapCCCD}
                                            onChange={(e) => setFormData({ ...formData, noiCapCCCD: e.target.value })}
                                            placeholder="Nhập nơi cấp"
                                        />
                                    </div>

                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">
                                            Điện thoại di động <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="recruitment-form-input"
                                            value={formData.soDienThoai}
                                            onChange={(e) => setFormData({ ...formData, soDienThoai: e.target.value })}
                                            placeholder="Nhập số điện thoại"
                                        />
                                    </div>

                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">Điện thoại khác</label>
                                        <input
                                            type="text"
                                            className="recruitment-form-input"
                                            value={formData.soDienThoaiKhac}
                                            onChange={(e) => setFormData({ ...formData, soDienThoaiKhac: e.target.value })}
                                            placeholder="Nhập số điện thoại khác"
                                        />
                                    </div>

                                    {/* Chi nhánh, Vị trí ứng tuyển, Phòng ban */}
                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">
                                            Chi nhánh <span className="required">*</span>
                                        </label>
                                        <select
                                            className="recruitment-form-input"
                                            value={formData.chiNhanh}
                                            onChange={(e) => setFormData({ ...formData, chiNhanh: e.target.value })}
                                        >
                                            <option value="">-- Chọn chi nhánh --</option>
                                            {branches.map((branch, index) => (
                                                <option key={index} value={branch}>{branch}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">
                                            Vị trí ứng tuyển <span className="required">*</span>
                                        </label>
                                        <select
                                            className="recruitment-form-input"
                                            value={formData.viTriUngTuyen}
                                            onChange={(e) => setFormData({ ...formData, viTriUngTuyen: e.target.value })}
                                        >
                                            <option value="">-- Chọn vị trí ứng tuyển --</option>
                                            {jobTitles.map((jobTitle, index) => (
                                                <option key={index} value={jobTitle}>{jobTitle}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">
                                            Phòng ban <span className="required">*</span>
                                        </label>
                                        <select
                                            className="recruitment-form-input"
                                            value={formData.phongBan}
                                            onChange={(e) => setFormData({ ...formData, phongBan: e.target.value })}
                                        >
                                            <option value="">-- Chọn phòng ban --</option>
                                            {departments.map((department, index) => (
                                                <option key={index} value={department}>{department}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="recruitment-form-group recruitment-form-group--full-width">
                                        <label className="recruitment-form-label">
                                            Email <span className="required">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            className="recruitment-form-input"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="Nhập email"
                                        />
                                    </div>

                                    {/* Địa chỉ Tạm trú */}
                                    <div className="recruitment-form-group recruitment-form-group--full-width">
                                        <div className="recruitment-form-address-box">
                                            <label className="recruitment-form-label">Địa chỉ Tạm trú</label>
                                            <div className="recruitment-form-grid-4">
                                                <div className="recruitment-form-group">
                                                    <input
                                                        type="text"
                                                        className="recruitment-form-input"
                                                        value={formData.diaChiThuongTru.soNha}
                                                        onChange={(e) => setFormData({ ...formData, diaChiThuongTru: { ...formData.diaChiThuongTru, soNha: e.target.value } })}
                                                        placeholder="Số nhà, Đường"
                                                    />
                                                </div>
                                                <div className="recruitment-form-group">
                                                    <input
                                                        type="text"
                                                        className="recruitment-form-input"
                                                        value={formData.diaChiThuongTru.phuongXa}
                                                        onChange={(e) => setFormData({ ...formData, diaChiThuongTru: { ...formData.diaChiThuongTru, phuongXa: e.target.value } })}
                                                        placeholder="Phường/Xã"
                                                    />
                                                </div>
                                                <div className="recruitment-form-group">
                                                    <input
                                                        type="text"
                                                        className="recruitment-form-input"
                                                        value={formData.diaChiThuongTru.quanHuyen}
                                                        onChange={(e) => setFormData({ ...formData, diaChiThuongTru: { ...formData.diaChiThuongTru, quanHuyen: e.target.value } })}
                                                        placeholder="Quận/Huyện"
                                                    />
                                                </div>
                                                <div className="recruitment-form-group">
                                                    <input
                                                        type="text"
                                                        className="recruitment-form-input"
                                                        value={formData.diaChiThuongTru.thanhPhoTinh}
                                                        onChange={(e) => setFormData({ ...formData, diaChiThuongTru: { ...formData.diaChiThuongTru, thanhPhoTinh: e.target.value } })}
                                                        placeholder="Thành phố/Tỉnh"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Địa chỉ thường trú */}
                                    <div className="recruitment-form-group recruitment-form-group--full-width">
                                        <div className="recruitment-form-address-box">
                                            <label className="recruitment-form-label">Địa chỉ thường trú</label>
                                            <div className="recruitment-form-grid-4">
                                                <div className="recruitment-form-group">
                                                    <input
                                                        type="text"
                                                        className="recruitment-form-input"
                                                        value={formData.diaChiLienLac.soNha}
                                                        onChange={(e) => setFormData({ ...formData, diaChiLienLac: { ...formData.diaChiLienLac, soNha: e.target.value } })}
                                                        placeholder="Số nhà, Đường"
                                                    />
                                                </div>
                                                <div className="recruitment-form-group">
                                                    <input
                                                        type="text"
                                                        className="recruitment-form-input"
                                                        value={formData.diaChiLienLac.phuongXa}
                                                        onChange={(e) => setFormData({ ...formData, diaChiLienLac: { ...formData.diaChiLienLac, phuongXa: e.target.value } })}
                                                        placeholder="Phường/Xã"
                                                    />
                                                </div>
                                                <div className="recruitment-form-group">
                                                    <input
                                                        type="text"
                                                        className="recruitment-form-input"
                                                        value={formData.diaChiLienLac.quanHuyen}
                                                        onChange={(e) => setFormData({ ...formData, diaChiLienLac: { ...formData.diaChiLienLac, quanHuyen: e.target.value } })}
                                                        placeholder="Quận/Huyện"
                                                    />
                                                </div>
                                                <div className="recruitment-form-group">
                                                    <input
                                                        type="text"
                                                        className="recruitment-form-input"
                                                        value={formData.diaChiLienLac.thanhPhoTinh}
                                                        onChange={(e) => setFormData({ ...formData, diaChiLienLac: { ...formData.diaChiLienLac, thanhPhoTinh: e.target.value } })}
                                                        placeholder="Thành phố/Tỉnh"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">Trình độ văn hóa</label>
                                        <input
                                            type="text"
                                            className="recruitment-form-input"
                                            value={formData.trinhDoVanHoa}
                                            onChange={(e) => setFormData({ ...formData, trinhDoVanHoa: e.target.value })}
                                            placeholder="Nhập trình độ văn hóa"
                                        />
                                    </div>

                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">Trình độ chuyên môn</label>
                                        <input
                                            type="text"
                                            className="recruitment-form-input"
                                            value={formData.trinhDoChuyenMon}
                                            onChange={(e) => setFormData({ ...formData, trinhDoChuyenMon: e.target.value })}
                                            placeholder="Nhập trình độ chuyên môn"
                                        />
                                    </div>

                                    <div className="recruitment-form-group">
                                        <label className="recruitment-form-label">Chuyên ngành</label>
                                        <input
                                            type="text"
                                            className="recruitment-form-input"
                                            value={formData.chuyenNganh}
                                            onChange={(e) => setFormData({ ...formData, chuyenNganh: e.target.value })}
                                            placeholder="Nhập chuyên ngành"
                                        />
                                    </div>

                                    {/* Ảnh đại diện và CV đính kèm - Nằm cuối section 1, cạnh nhau */}
                                    <div className="recruitment-form-group recruitment-form-group--full-width">
                                        <div className="recruitment-form-grid-2">
                                            <div className="recruitment-form-group">
                                                <label className="recruitment-form-label">Ảnh đại diện (kích cỡ 3×4)</label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="recruitment-form-file-input"
                                                    onChange={(e) => setFormData({ ...formData, anhDaiDien: e.target.files?.[0] || null })}
                                                    id="anh-dai-dien"
                                                />
                                                <label htmlFor="anh-dai-dien" className="recruitment-form-upload-area">
                                                    <svg className="recruitment-form-upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                    </svg>
                                                    <span>{formData.anhDaiDien ? formData.anhDaiDien.name : 'Tải ảnh đại diện (kích cỡ 3×4)'}</span>
                                                </label>
                                            </div>

                                            <div className="recruitment-form-group">
                                                <label className="recruitment-form-label">CV đính kèm</label>
                                                <input
                                                    type="file"
                                                    accept=".pdf,.xlsx,.xls"
                                                    className="recruitment-form-file-input"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0] || null;
                                                        console.log('[RecruitmentManagement] CV file selected:', file?.name, file?.type, file?.size);
                                                        setFormData({ ...formData, cvDinhKem: file });
                                                    }}
                                                    id="cv-dinh-kem"
                                                />
                                                <label htmlFor="cv-dinh-kem" className="recruitment-form-upload-area">
                                                    <svg className="recruitment-form-upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                    </svg>
                                                    <span>{formData.cvDinhKem ? formData.cvDinhKem.name : 'Tải CV đính kèm (PDF, Excel)'}</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ngày gửi CV và Nguồn CV */}
                                    <div className="recruitment-form-group recruitment-form-group--full-width">
                                        <div className="recruitment-form-grid-2">
                                            <div className="recruitment-form-group">
                                                <label className="recruitment-form-label">Ngày gửi CV</label>
                                                <input
                                                    type="date"
                                                    className="recruitment-form-input"
                                                    value={formData.ngayGuiCV}
                                                    onChange={(e) => setFormData({ ...formData, ngayGuiCV: e.target.value })}
                                                />
                                            </div>

                                            <div className="recruitment-form-group">
                                                <label className="recruitment-form-label">Nguồn CV</label>
                                                <select
                                                    className="recruitment-form-input"
                                                    value={formData.nguonCV}
                                                    onChange={(e) => setFormData({ ...formData, nguonCV: e.target.value })}
                                                >
                                                    <option value="">-- Chọn nguồn CV --</option>
                                                    <option value="Website công ty">Website công ty</option>
                                                    <option value="Facebook">Facebook</option>
                                                    <option value="LinkedIn">LinkedIn</option>
                                                    <option value="JobStreet">JobStreet</option>
                                                    <option value="VietnamWorks">VietnamWorks</option>
                                                    <option value="TopCV">TopCV</option>
                                                    <option value="Gửi trực tiếp">Gửi trực tiếp</option>
                                                    <option value="Giới thiệu">Giới thiệu</option>
                                                    <option value="Khác">Khác</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* II. KINH NGHIỆM LÀM VIỆC */}
                            <div className="recruitment-form-section">
                                <h3 className="recruitment-form-section-title">
                                    <span className="recruitment-form-section-number">II.</span>
                                    KINH NGHIỆM LÀM VIỆC
                                </h3>
                                <p className="recruitment-form-section-subtitle">
                                    (Nhập thông tin 05 kinh nghiệm gần nhất từ mới đến cũ)
                                </p>
                                <div className="recruitment-form-section-divider"></div>

                                <div className="recruitment-form-table-wrapper">
                                    <div className="recruitment-form-table-header">
                                        <div className="recruitment-form-table-header-cell">NGÀY BẮT ĐẦU</div>
                                        <div className="recruitment-form-table-header-cell">NGÀY KẾT THÚC</div>
                                        <div className="recruitment-form-table-header-cell">CÔNG TY</div>
                                        <div className="recruitment-form-table-header-cell">CHỨC DANH</div>
                                        <div className="recruitment-form-table-header-cell"></div>
                                    </div>

                                    {workExperiences.map((exp) => (
                                        <div key={exp.id} className="recruitment-form-table-row">
                                            <input
                                                type="date"
                                                className="recruitment-form-input recruitment-form-table-input"
                                                value={exp.ngayBatDau}
                                                onChange={(e) => handleUpdateWorkExperience(exp.id, 'ngayBatDau', e.target.value)}
                                            />
                                            <input
                                                type="date"
                                                className="recruitment-form-input recruitment-form-table-input"
                                                value={exp.ngayKetThuc}
                                                onChange={(e) => handleUpdateWorkExperience(exp.id, 'ngayKetThuc', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                className="recruitment-form-input recruitment-form-table-input"
                                                value={exp.congTy}
                                                onChange={(e) => handleUpdateWorkExperience(exp.id, 'congTy', e.target.value)}
                                                placeholder="Tên công ty"
                                            />
                                            <input
                                                type="text"
                                                className="recruitment-form-input recruitment-form-table-input"
                                                value={exp.chucDanh}
                                                onChange={(e) => handleUpdateWorkExperience(exp.id, 'chucDanh', e.target.value)}
                                                placeholder="Chức danh"
                                            />
                                            <button
                                                type="button"
                                                className="recruitment-form-remove-btn"
                                                onClick={() => handleRemoveWorkExperience(exp.id)}
                                                disabled={workExperiences.length === 1}
                                            >
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        className="recruitment-form-add-btn"
                                        onClick={handleAddWorkExperience}
                                    >
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                        </svg>
                                        <span>Thêm kinh nghiệm</span>
                                    </button>
                                </div>
                            </div>

                            {/* III. QUÁ TRÌNH ĐÀO TẠO */}
                            <div className="recruitment-form-section">
                                <h3 className="recruitment-form-section-title">
                                    <span className="recruitment-form-section-number">III.</span>
                                    QUÁ TRÌNH ĐÀO TẠO
                                </h3>
                                <p className="recruitment-form-section-subtitle">
                                    (Nhập thông tin 05 văn bằng/chứng chỉ chính thức từ mới đến cũ)
                                </p>
                                <div className="recruitment-form-section-divider"></div>

                                <div className="recruitment-form-table-wrapper">
                                    <div className="recruitment-form-table-header">
                                        <div className="recruitment-form-table-header-cell">NGÀY BẮT ĐẦU</div>
                                        <div className="recruitment-form-table-header-cell">NGÀY KẾT THÚC</div>
                                        <div className="recruitment-form-table-header-cell">TRƯỜNG ĐÀO TẠO</div>
                                        <div className="recruitment-form-table-header-cell">CHUYÊN NGÀNH</div>
                                        <div className="recruitment-form-table-header-cell">VĂN BẰNG</div>
                                        <div className="recruitment-form-table-header-cell"></div>
                                    </div>

                                    {trainingProcesses.map((training) => (
                                        <div key={training.id} className="recruitment-form-table-row">
                                            <input
                                                type="date"
                                                className="recruitment-form-input recruitment-form-table-input"
                                                value={training.ngayBatDau}
                                                onChange={(e) => handleUpdateTrainingProcess(training.id, 'ngayBatDau', e.target.value)}
                                            />
                                            <input
                                                type="date"
                                                className="recruitment-form-input recruitment-form-table-input"
                                                value={training.ngayKetThuc}
                                                onChange={(e) => handleUpdateTrainingProcess(training.id, 'ngayKetThuc', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                className="recruitment-form-input recruitment-form-table-input"
                                                value={training.truongDaoTao}
                                                onChange={(e) => handleUpdateTrainingProcess(training.id, 'truongDaoTao', e.target.value)}
                                                placeholder="Trường đào tạo"
                                            />
                                            <input
                                                type="text"
                                                className="recruitment-form-input recruitment-form-table-input"
                                                value={training.chuyenNganh}
                                                onChange={(e) => handleUpdateTrainingProcess(training.id, 'chuyenNganh', e.target.value)}
                                                placeholder="Chuyên ngành"
                                            />
                                            <input
                                                type="text"
                                                className="recruitment-form-input recruitment-form-table-input"
                                                value={training.vanBang}
                                                onChange={(e) => handleUpdateTrainingProcess(training.id, 'vanBang', e.target.value)}
                                                placeholder="VB/"
                                            />
                                            <button
                                                type="button"
                                                className="recruitment-form-remove-btn"
                                                onClick={() => handleRemoveTrainingProcess(training.id)}
                                                disabled={trainingProcesses.length === 1}
                                            >
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        className="recruitment-form-add-btn"
                                        onClick={handleAddTrainingProcess}
                                    >
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                        </svg>
                                        <span>Thêm quá trình đào tạo</span>
                                    </button>
                                </div>
                            </div>

                            {/* IV. TRÌNH ĐỘ NGOẠI NGỮ */}
                            <div className="recruitment-form-section">
                                <h3 className="recruitment-form-section-title">
                                    <span className="recruitment-form-section-number">IV.</span>
                                    TRÌNH ĐỘ NGOẠI NGỮ
                                </h3>
                                <p className="recruitment-form-section-subtitle">
                                    (Đánh giá khả năng sử dụng theo mức độ: A: Giỏi, B: Khá, C: Trung bình, D: Kém)
                                </p>
                                <div className="recruitment-form-section-divider"></div>

                                <div className="recruitment-form-table-wrapper">
                                    <div className="recruitment-form-table-header">
                                        <div className="recruitment-form-table-header-cell">NGOẠI NGỮ</div>
                                        <div className="recruitment-form-table-header-cell">CHỨNG CHỈ</div>
                                        <div className="recruitment-form-table-header-cell">ĐIỂM</div>
                                        <div className="recruitment-form-table-header-cell">KHẢ NĂNG SỬ DỤNG</div>
                                        <div className="recruitment-form-table-header-cell"></div>
                                    </div>

                                    {foreignLanguages.map((lang) => (
                                        <div key={lang.id} className="recruitment-form-table-row">
                                            <input
                                                type="text"
                                                className="recruitment-form-input recruitment-form-table-input"
                                                value={lang.ngoaiNgu}
                                                onChange={(e) => handleUpdateForeignLanguage(lang.id, 'ngoaiNgu', e.target.value)}
                                                placeholder="Ngoại ngữ"
                                            />
                                            <input
                                                type="text"
                                                className="recruitment-form-input recruitment-form-table-input"
                                                value={lang.chungChi}
                                                onChange={(e) => handleUpdateForeignLanguage(lang.id, 'chungChi', e.target.value)}
                                                placeholder="Chứng chỉ"
                                            />
                                            <input
                                                type="text"
                                                className="recruitment-form-input recruitment-form-table-input"
                                                value={lang.diem}
                                                onChange={(e) => handleUpdateForeignLanguage(lang.id, 'diem', e.target.value)}
                                                placeholder="Điểm số (ví dụ)"
                                            />
                                            <select
                                                className="recruitment-form-input recruitment-form-table-input"
                                                value={lang.khaNangSuDung}
                                                onChange={(e) => handleUpdateForeignLanguage(lang.id, 'khaNangSuDung', e.target.value)}
                                            >
                                                <option value="A: Giỏi">A: Giỏi</option>
                                                <option value="B: Khá">B: Khá</option>
                                                <option value="C: Trung bình">C: Trung bình</option>
                                                <option value="D: Kém">D: Kém</option>
                                            </select>
                                            <button
                                                type="button"
                                                className="recruitment-form-remove-btn"
                                                onClick={() => handleRemoveForeignLanguage(lang.id)}
                                                disabled={foreignLanguages.length === 1}
                                            >
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        className="recruitment-form-add-btn"
                                        onClick={handleAddForeignLanguage}
                                    >
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                        </svg>
                                        <span>Thêm ngoại ngữ</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="recruitment-modal-footer">
                            <button
                                type="button"
                                className="recruitment-modal-btn recruitment-modal-btn--cancel"
                                onClick={handleCloseModal}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="recruitment-modal-btn recruitment-modal-btn--preview"
                                onClick={handlePreview}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                                <span>Xem trước</span>
                            </button>
                            <button
                                type="button"
                                className="recruitment-modal-btn recruitment-modal-btn--submit"
                                onClick={handleSubmit}
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Interview Modal */}
            {showTransferInterviewModal && (
                <div className="transfer-interview-modal-overlay" onClick={() => setShowTransferInterviewModal(false)}>
                    <div className="transfer-interview-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="transfer-interview-modal-header">
                            <h3>Chuyển phỏng vấn</h3>
                            <button
                                type="button"
                                className="transfer-interview-modal-close"
                                onClick={() => setShowTransferInterviewModal(false)}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div className="transfer-interview-modal-body">
                            <div className="transfer-form-group">
                                <label>Chọn phiếu tuyển dụng</label>
                                <div className="transfer-select" onClick={() => setShowTransferRequestDropdown((v) => !v)}>
                                    <div className="transfer-select-trigger">
                                        <span>
                                            {selectedTransferRequestId
                                                ? (() => {
                                                    const req = recruitmentRequests.find(r => String(r.id) === String(selectedTransferRequestId));
                                                    if (!req) return 'Chọn phiếu tuyển dụng';
                                                    return `#${req.id} - ${req.chucDanhCanTuyen || 'Chưa có tiêu đề'} (Người gửi: ${req.nguoiGui || '---'})`;
                                                })()
                                                : 'Chọn phiếu tuyển dụng'}
                                        </span>
                                        <svg viewBox="0 0 24 24" stroke="currentColor" fill="none">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                    {showTransferRequestDropdown && (
                                        <div className="transfer-select-menu">
                                            {recruitmentRequests.length === 0 && (
                                                <div className="transfer-select-empty">Không có phiếu nào</div>
                                            )}
                                            {recruitmentRequests.map((req) => (
                                                <div
                                                    key={req.id}
                                                    className="transfer-select-option"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedTransferRequestId(req.id);
                                                        setShowTransferRequestDropdown(false);
                                                    }}
                                                >
                                                    <div className="transfer-option-title">
                                                        #{req.id} - {req.chucDanhCanTuyen || 'Chưa có tiêu đề'}
                                                    </div>
                                                    <div className="transfer-option-sub">Người gửi: {req.nguoiGui || '---'}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="transfer-form-group">
                                <label>Ngày phỏng vấn (24h)</label>
                                <input
                                    type="datetime-local"
                                    value={transferInterviewDate}
                                    onChange={(e) => setTransferInterviewDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="transfer-interview-modal-footer">
                            <button
                                type="button"
                                className="transfer-btn secondary"
                                onClick={() => setShowTransferInterviewModal(false)}
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                className="transfer-btn primary"
                                onClick={() => {
                                    if (!String(selectedTransferRequestId || '').trim() || !transferInterviewDate) {
                                        showToast && showToast('Vui lòng chọn phiếu và ngày phỏng vấn', 'warning');
                                        return;
                                    }
                                    const req = recruitmentRequests.find(r => String(r.id) === String(selectedTransferRequestId));
                                    console.log('[RecruitmentManagement] Selected recruitment request:', req);
                                    if (!req) {
                                        showToast && showToast('Không tìm thấy phiếu tuyển dụng', 'error');
                                        return;
                                    }

                                    // Convert datetime-local format to ISO string for backend
                                    let formattedInterviewTime = null;
                                    if (transferInterviewDate) {
                                        // datetime-local format is "YYYY-MM-DDTHH:mm", convert to ISO string
                                        const dateObj = new Date(transferInterviewDate);
                                        if (!isNaN(dateObj.getTime())) {
                                            formattedInterviewTime = dateObj.toISOString();
                                        } else {
                                            showToast && showToast('Ngày giờ phỏng vấn không hợp lệ', 'error');
                                            return;
                                        }
                                    }

                                    const payload = {
                                        candidateId: viewingCandidate?.id ? parseInt(viewingCandidate.id, 10) : null,
                                        recruitmentRequestId: selectedTransferRequestId ? parseInt(selectedTransferRequestId, 10) : null,
                                        // Use created_by_employee_id as managerId (người tạo phiếu tuyển dụng)
                                        managerId: req.managerId || req.created_by_employee_id ? parseInt(req.managerId || req.created_by_employee_id, 10) : null,
                                        branchDirectorId: req.branchDirectorId || req.branch_director_id ? parseInt(req.branchDirectorId || req.branch_director_id, 10) : null,
                                        interviewTime: formattedInterviewTime
                                        // Note: status field is not needed - backend sets it to PENDING automatically
                                    };
                                    console.log('[RecruitmentManagement] Creating interview request with payload:', payload);
                                    if (!payload.candidateId || !payload.recruitmentRequestId) {
                                        showToast && showToast('Thiếu thông tin ứng viên hoặc phiếu tuyển dụng', 'error');
                                        return;
                                    }
                                    if (!payload.interviewTime) {
                                        showToast && showToast('Vui lòng chọn ngày giờ phỏng vấn', 'error');
                                        return;
                                    }
                                    interviewRequestsAPI.create(payload)
                                        .then(() => {
                                            showToast && showToast('Đã chuyển phỏng vấn', 'success');
                                            setShowTransferInterviewModal(false);
                                            setSelectedTransferRequestId('');
                                            setTransferInterviewDate('');
                                            setHasInterviewRequest(true);
                                            // Refresh candidate data to get updated status
                                            if (viewingCandidate?.id) {
                                                handleViewCandidate(viewingCandidate.id);
                                            }
                                            fetchCandidates(false); // Refresh danh sách để cập nhật trạng thái
                                        })
                                        .catch((error) => {
                                            console.error('Error transferring interview:', error);
                                            const errorMessage = error?.response?.data?.message || error?.message || 'Có lỗi khi chuyển phỏng vấn';
                                            showToast && showToast(errorMessage, 'error');
                                        });
                                }}
                            >
                                Chuyển
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* HR Recruitment Request Detail Modal */}
            {showHrRequestDetail && selectedHrRequest && (
                <div className="recruitment-requests-modal-overlay" onClick={() => setShowHrRequestDetail(false)}>
                    <div className="recruitment-requests-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="recruitment-requests-modal-header">
                            <h2 className="recruitment-requests-modal-title">Chi tiết yêu cầu tuyển nhân sự</h2>
                            <button
                                type="button"
                                className="recruitment-requests-modal-close"
                                onClick={() => setShowHrRequestDetail(false)}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div className="recruitment-requests-modal-body">
                            <div className="recruitment-request-details-grid">
                                <div className="recruitment-request-detail-item">
                                    <strong>Chức danh cần tuyển:</strong>
                                    <span>{selectedHrRequest.chucDanhCanTuyen || '---'}</span>
                                </div>
                                <div className="recruitment-request-detail-item">
                                    <strong>Phòng ban/Bộ phận:</strong>
                                    <span>{selectedHrRequest.phongBanBoPhan || '---'}</span>
                                </div>
                                <div className="recruitment-request-detail-item">
                                    <strong>Người gửi:</strong>
                                    <span>{selectedHrRequest.nguoiGui || '---'}</span>
                                </div>
                                <div className="recruitment-request-detail-item">
                                    <strong>Ngày gửi:</strong>
                                    <span>{selectedHrRequest.ngayGui ? new Date(selectedHrRequest.ngayGui).toLocaleString('vi-VN') : '---'}</span>
                                </div>
                                <div className="recruitment-request-detail-item">
                                    <strong>Ngày duyệt:</strong>
                                    <span>{selectedHrRequest.approvedAt ? new Date(selectedHrRequest.approvedAt).toLocaleString('vi-VN') : '---'}</span>
                                </div>
                                <div className="recruitment-request-detail-item">
                                    <strong>Số lượng:</strong>
                                    <span>{selectedHrRequest.soLuongYeuCau || '---'}</span>
                                </div>
                                <div className="recruitment-request-detail-item">
                                    <strong>Trạng thái:</strong>
                                    <span>{selectedHrRequest.status || '---'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="recruitment-requests-modal-footer">
                            <button
                                type="button"
                                className="recruitment-request-action-btn recruitment-request-action-btn--close"
                                onClick={() => setShowHrRequestDetail(false)}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreviewModal && (
                <div className="recruitment-modal-overlay" onClick={handleClosePreviewModal}>
                    <div className="recruitment-modal-box recruitment-preview-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="recruitment-modal-header">
                            <h2 className="recruitment-modal-title">Xem trước hồ sơ ứng viên</h2>
                            <button
                                type="button"
                                className="recruitment-modal-close"
                                onClick={handleClosePreviewModal}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>

                        <div className="recruitment-modal-body recruitment-preview-body">
                            {/* I. THÔNG TIN CÁ NHÂN */}
                            <div className="recruitment-preview-section">
                                <h3 className="recruitment-preview-section-title">I. THÔNG TIN CÁ NHÂN</h3>

                                <div className="recruitment-preview-grid-2">
                                    {/* Cột trái */}
                                    <div className="recruitment-preview-column">
                                        <div className="recruitment-preview-row">
                                            <label className="recruitment-preview-label">Họ và tên</label>
                                            <div className="recruitment-preview-value">{formData.hoTen || '---'}</div>
                                        </div>

                                        <div className="recruitment-preview-row">
                                            <label className="recruitment-preview-label">Ngày sinh</label>
                                            <div className="recruitment-preview-value">{formatDate(formData.ngaySinh) || '---'}</div>
                                        </div>

                                        <div className="recruitment-preview-row">
                                            <label className="recruitment-preview-label">Tình trạng HN</label>
                                            <div className="recruitment-preview-value">{formData.tinhTrangHonNhan || '---'}</div>
                                        </div>

                                        <div className="recruitment-preview-row">
                                            <label className="recruitment-preview-label">SĐT</label>
                                            <div className="recruitment-preview-value">{formData.soDienThoai || '---'}</div>
                                        </div>

                                        <div className="recruitment-preview-row">
                                            <label className="recruitment-preview-label">Số CCCD</label>
                                            <div className="recruitment-preview-value">{formData.soCCCD || '---'}</div>
                                        </div>

                                        <div className="recruitment-preview-row">
                                            <label className="recruitment-preview-label">Nơi cấp</label>
                                            <div className="recruitment-preview-value">{formData.noiCapCCCD || '---'}</div>
                                        </div>
                                    </div>

                                    {/* Cột phải */}
                                    <div className="recruitment-preview-column">
                                        <div className="recruitment-preview-row">
                                            <label className="recruitment-preview-label">Vị trí ứng tuyển</label>
                                            <div className="recruitment-preview-value">{formData.viTriUngTuyen || '---'}</div>
                                        </div>

                                        <div className="recruitment-preview-row">
                                            <label className="recruitment-preview-label">Giới tính</label>
                                            <div className="recruitment-preview-value">{formData.gioiTinh || '---'}</div>
                                        </div>

                                        <div className="recruitment-preview-row">
                                            <label className="recruitment-preview-label">Quốc tịch</label>
                                            <div className="recruitment-preview-value">{formData.quocTich || '---'}</div>
                                        </div>

                                        <div className="recruitment-preview-row">
                                            <label className="recruitment-preview-label">Email</label>
                                            <div className="recruitment-preview-value">{formData.email || '---'}</div>
                                        </div>

                                        <div className="recruitment-preview-row">
                                            <label className="recruitment-preview-label">Ngày cấp</label>
                                            <div className="recruitment-preview-value">{formatDate(formData.ngayCapCCCD) || '---'}</div>
                                        </div>

                                        <div className="recruitment-preview-row">
                                            <label className="recruitment-preview-label">Địa chỉ thường trú</label>
                                            <div className="recruitment-preview-value">
                                                {[
                                                    formData.diaChiLienLac.soNha,
                                                    formData.diaChiLienLac.phuongXa,
                                                    formData.diaChiLienLac.quanHuyen,
                                                    formData.diaChiLienLac.thanhPhoTinh
                                                ].filter(Boolean).join(', ') || '---'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Trình độ học vấn (Sơ lược) */}
                                <div className="recruitment-preview-education-section">
                                    <h4 className="recruitment-preview-education-title">Trình độ học vấn (Sơ lược)</h4>
                                    <div className="recruitment-preview-education-grid">
                                        <div className="recruitment-preview-education-item">
                                            <label className="recruitment-preview-education-label">Văn hóa</label>
                                            <div className="recruitment-preview-education-value">{formData.trinhDoVanHoa || '---'}</div>
                                        </div>
                                        <div className="recruitment-preview-education-item">
                                            <label className="recruitment-preview-education-label">Chuyên môn</label>
                                            <div className="recruitment-preview-education-value">{formData.trinhDoChuyenMon || '---'}</div>
                                        </div>
                                        <div className="recruitment-preview-education-item">
                                            <label className="recruitment-preview-education-label">Chuyên ngành</label>
                                            <div className="recruitment-preview-education-value">{formData.chuyenNganh || '---'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Ngày gửi CV và Nguồn CV */}
                                <div className="recruitment-preview-education-section">
                                    <div className="recruitment-preview-education-grid">
                                        <div className="recruitment-preview-education-item">
                                            <label className="recruitment-preview-education-label">Ngày gửi CV</label>
                                            <div className="recruitment-preview-education-value">{formatDate(formData.ngayGuiCV) || '---'}</div>
                                        </div>
                                        <div className="recruitment-preview-education-item">
                                            <label className="recruitment-preview-education-label">Nguồn CV</label>
                                            <div className="recruitment-preview-education-value">{formData.nguonCV || '---'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* II. KINH NGHIỆM LÀM VIỆC */}
                            <div className="recruitment-preview-section">
                                <h3 className="recruitment-preview-section-title">II. KINH NGHIỆM LÀM VIỆC</h3>

                                {workExperiences.length > 0 && workExperiences.some(exp => exp.ngayBatDau || exp.ngayKetThuc || exp.congTy || exp.chucDanh) ? (
                                    <div className="recruitment-preview-table">
                                        <div className="recruitment-preview-table-header">
                                            <div className="recruitment-preview-table-header-cell">Từ ngày</div>
                                            <div className="recruitment-preview-table-header-cell">Đến ngày</div>
                                            <div className="recruitment-preview-table-header-cell">Tên công ty</div>
                                            <div className="recruitment-preview-table-header-cell">Chức danh</div>
                                        </div>
                                        {workExperiences.map((exp) => (
                                            (exp.ngayBatDau || exp.ngayKetThuc || exp.congTy || exp.chucDanh) && (
                                                <div key={exp.id} className="recruitment-preview-table-row">
                                                    <div className="recruitment-preview-table-cell">{formatDate(exp.ngayBatDau)}</div>
                                                    <div className="recruitment-preview-table-cell">{formatDate(exp.ngayKetThuc)}</div>
                                                    <div className="recruitment-preview-table-cell">{exp.congTy || ''}</div>
                                                    <div className="recruitment-preview-table-cell">{exp.chucDanh || ''}</div>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                ) : (
                                    <div className="recruitment-preview-empty">Chưa có thông tin</div>
                                )}
                            </div>

                            {/* III. QUÁ TRÌNH ĐÀO TẠO */}
                            <div className="recruitment-preview-section">
                                <h3 className="recruitment-preview-section-title">III. QUÁ TRÌNH ĐÀO TẠO</h3>

                                {trainingProcesses.length > 0 && trainingProcesses.some(tp => tp.ngayBatDau || tp.ngayKetThuc || tp.truongDaoTao || tp.chuyenNganh || tp.vanBang) ? (
                                    <div className="recruitment-preview-table recruitment-preview-table--5cols">
                                        <div className="recruitment-preview-table-header">
                                            <div className="recruitment-preview-table-header-cell">Từ ngày</div>
                                            <div className="recruitment-preview-table-header-cell">Đến ngày</div>
                                            <div className="recruitment-preview-table-header-cell">Trường đào tạo</div>
                                            <div className="recruitment-preview-table-header-cell">Chuyên ngành</div>
                                            <div className="recruitment-preview-table-header-cell">Văn bằng</div>
                                        </div>
                                        {trainingProcesses.map((tp) => (
                                            (tp.ngayBatDau || tp.ngayKetThuc || tp.truongDaoTao || tp.chuyenNganh || tp.vanBang) && (
                                                <div key={tp.id} className="recruitment-preview-table-row recruitment-preview-table-row--5cols">
                                                    <div className="recruitment-preview-table-cell">{formatDate(tp.ngayBatDau)}</div>
                                                    <div className="recruitment-preview-table-cell">{formatDate(tp.ngayKetThuc)}</div>
                                                    <div className="recruitment-preview-table-cell">{tp.truongDaoTao || ''}</div>
                                                    <div className="recruitment-preview-table-cell">{tp.chuyenNganh || ''}</div>
                                                    <div className="recruitment-preview-table-cell">{tp.vanBang || ''}</div>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                ) : (
                                    <div className="recruitment-preview-empty">Chưa có thông tin</div>
                                )}
                            </div>

                            {/* IV. TRÌNH ĐỘ NGOẠI NGỮ */}
                            <div className="recruitment-preview-section">
                                <h3 className="recruitment-preview-section-title">IV. TRÌNH ĐỘ NGOẠI NGỮ</h3>

                                {foreignLanguages.length > 0 && foreignLanguages.some(fl => fl.ngoaiNgu || fl.chungChi || fl.diem || fl.khaNangSuDung) ? (
                                    <div className="recruitment-preview-table">
                                        <div className="recruitment-preview-table-header">
                                            <div className="recruitment-preview-table-header-cell">Ngoại ngữ</div>
                                            <div className="recruitment-preview-table-header-cell">Chứng chỉ</div>
                                            <div className="recruitment-preview-table-header-cell">Điểm</div>
                                            <div className="recruitment-preview-table-header-cell">Khả năng sử dụng</div>
                                        </div>
                                        {foreignLanguages.map((fl) => (
                                            (fl.ngoaiNgu || fl.chungChi || fl.diem || fl.khaNangSuDung) && (
                                                <div key={fl.id} className="recruitment-preview-table-row">
                                                    <div className="recruitment-preview-table-cell">{fl.ngoaiNgu || ''}</div>
                                                    <div className="recruitment-preview-table-cell">{fl.chungChi || ''}</div>
                                                    <div className="recruitment-preview-table-cell">{fl.diem || ''}</div>
                                                    <div className="recruitment-preview-table-cell">{fl.khaNangSuDung || ''}</div>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                ) : (
                                    <div className="recruitment-preview-empty">Chưa có thông tin</div>
                                )}
                            </div>
                        </div>

                        <div className="recruitment-modal-footer">
                            <button
                                type="button"
                                className="recruitment-modal-btn recruitment-modal-btn--cancel"
                                onClick={handleClosePreviewModal}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Candidate Modal */}
            {showViewCandidateModal && viewingCandidate && (
                <div className="recruitment-view-candidate-modal-overlay" onClick={() => {
                    setShowViewCandidateModal(false);
                    setHasInterviewRequest(false);
                }}>
                    <div className="recruitment-view-candidate-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="recruitment-view-candidate-modal-header">
                            <h2 className="recruitment-view-candidate-modal-title">Thông tin Ứng viên</h2>
                            <div className="recruitment-view-candidate-modal-header-actions">
                                {currentUser?.role === 'HR' && (
                                    (hasInterviewRequest ||
                                        viewingCandidate?.trang_thai === 'TRANSFERRED_TO_INTERVIEW' ||
                                        viewingCandidate?.trang_thai === 'WAITING_FOR_OTHER_APPROVAL' ||
                                        (viewingCandidate?.trang_thai === 'READY_FOR_INTERVIEW' ||
                                            viewingCandidate?.trang_thai === 'PASSED' ||
                                            viewingCandidate?.trang_thai === 'FAILED')) &&
                                        viewingCandidate?.trang_thai !== 'ON_PROBATION' ? (
                                        <button
                                            type="button"
                                            className="recruitment-transfer-btn"
                                            onClick={async () => {
                                                if (!viewingCandidate?.id) {
                                                    if (showToast) {
                                                        showToast('Không tìm thấy thông tin ứng viên', 'error');
                                                    }
                                                    return;
                                                }
                                                await handleLoadInterviewTimeline(viewingCandidate.id);
                                            }}
                                            title="Theo dõi tiến độ phỏng vấn"
                                        >
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                                            </svg>
                                            <span>Theo dõi tiến độ phỏng vấn</span>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="recruitment-transfer-btn"
                                            onClick={() => setShowTransferInterviewModal(true)}
                                            title="Chuyển phỏng vấn"
                                        >
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                                            </svg>
                                            <span>Chuyển phỏng vấn</span>
                                        </button>
                                    )
                                )}
                                <button
                                    type="button"
                                    className="recruitment-view-candidate-modal-close"
                                    onClick={() => {
                                        setShowViewCandidateModal(false);
                                        setHasInterviewRequest(false);
                                    }}
                                >
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="recruitment-view-candidate-modal-body">
                            {/* Section: FILE ĐÍNH KÈM */}
                            {(viewingCandidate.anh_dai_dien_path || viewingCandidate.cv_dinh_kem_path) && (
                                <div className="recruitment-view-candidate-section">
                                    <h3 className="recruitment-view-candidate-section-title">
                                        <svg className="recruitment-view-candidate-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                                        </svg>
                                        FILE ĐÍNH KÈM
                                    </h3>
                                    <div className="recruitment-view-candidate-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                        {/* Ảnh đại diện */}
                                        {viewingCandidate.anh_dai_dien_path && (
                                            <div className="recruitment-view-candidate-field" style={{ gridColumn: 'span 1' }}>
                                                <div className="recruitment-view-candidate-field-label">
                                                    <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                    </svg>
                                                    Ảnh đại diện
                                                </div>
                                                <div className="recruitment-view-candidate-field-value" style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <img
                                                        src={`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}${viewingCandidate.anh_dai_dien_path}`}
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
                                                            const imgUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}${viewingCandidate.anh_dai_dien_path}`;
                                                            window.open(imgUrl, '_blank');
                                                        }}
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            const errorDiv = e.target.nextSibling;
                                                            if (errorDiv) {
                                                                errorDiv.style.display = 'block';
                                                            }
                                                        }}
                                                    />
                                                    <div style={{ display: 'none', color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                                        Không thể tải ảnh
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* CV đính kèm */}
                                        {viewingCandidate.cv_dinh_kem_path && (
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
                                                                const cvUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}${viewingCandidate.cv_dinh_kem_path}`;
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
                            )}

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
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                            </svg>
                                            Giới tính
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.gioi_tinh || '---'}</div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                            </svg>
                                            Nơi sinh
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.noi_sinh || '---'}</div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                                            </svg>
                                            Số CCCD
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.so_cccd || '---'}</div>
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
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                            </svg>
                                            Địa chỉ tạm trú
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">
                                            {viewingCandidate.dia_chi_tam_tru_so_nha || viewingCandidate.dia_chi_tam_tru_phuong_xa || viewingCandidate.dia_chi_tam_tru_quan_huyen || viewingCandidate.dia_chi_tam_tru_thanh_pho_tinh
                                                ? `${viewingCandidate.dia_chi_tam_tru_so_nha || ''} ${viewingCandidate.dia_chi_tam_tru_phuong_xa || ''} ${viewingCandidate.dia_chi_tam_tru_quan_huyen || ''} ${viewingCandidate.dia_chi_tam_tru_thanh_pho_tinh || ''}`.trim() || '---'
                                                : '---'}
                                        </div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                            </svg>
                                            Nguyên quán
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">
                                            {viewingCandidate.nguyen_quan || (viewingCandidate.nguyen_quan_so_nha || viewingCandidate.nguyen_quan_phuong_xa || viewingCandidate.nguyen_quan_quan_huyen || viewingCandidate.nguyen_quan_thanh_pho_tinh
                                                ? `${viewingCandidate.nguyen_quan_so_nha || ''} ${viewingCandidate.nguyen_quan_phuong_xa || ''} ${viewingCandidate.nguyen_quan_quan_huyen || ''} ${viewingCandidate.nguyen_quan_thanh_pho_tinh || ''}`.trim() || '---'
                                                : '---')}
                                        </div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                            </svg>
                                            Trình độ học vấn (Sơ lược)
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.trinh_do_van_hoa || '---'}</div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                            </svg>
                                            Trình độ chuyên môn
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.trinh_do_chuyen_mon || '---'}</div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                            </svg>
                                            Chuyên ngành
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.chuyen_nganh || '---'}</div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                                            </svg>
                                            Tình trạng hôn nhân
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.tinh_trang_hon_nhan || '---'}</div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                            </svg>
                                            Dân tộc
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.dan_toc || '---'}</div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            Quốc tịch
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.quoc_tich || '---'}</div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                            </svg>
                                            Tôn giáo
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.ton_giao || '---'}</div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            Ngày cấp CCCD
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{formatDate(viewingCandidate.ngay_cap_cccd) || '---'}</div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                            </svg>
                                            Nơi cấp CCCD
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.noi_cap_cccd || '---'}</div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                            </svg>
                                            Số điện thoại khác
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.so_dien_thoai_khac || '---'}</div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                            </svg>
                                            Chi nhánh
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.chi_nhanh || '---'}</div>
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
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            Ngày gửi CV
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{formatDate(viewingCandidate.ngay_gui_cv) || '---'}</div>
                                    </div>
                                    <div className="recruitment-view-candidate-field">
                                        <div className="recruitment-view-candidate-field-label">
                                            <svg className="recruitment-view-candidate-field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                            Nguồn CV
                                        </div>
                                        <div className="recruitment-view-candidate-field-value">{viewingCandidate.nguon_cv || '---'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Section II: QUÁ TRÌNH CÔNG TÁC */}
                            <div className="recruitment-view-candidate-section">
                                <h3 className="recruitment-view-candidate-section-title">
                                    <svg className="recruitment-view-candidate-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                    </svg>
                                    II. QUÁ TRÌNH CÔNG TÁC
                                </h3>
                                <div className="recruitment-view-candidate-work-experience">
                                    {viewingCandidate.workExperiences && viewingCandidate.workExperiences.length > 0 ? (
                                        viewingCandidate.workExperiences.map((exp, idx) => (
                                            <div key={idx} className="recruitment-view-candidate-work-item">
                                                <div className="recruitment-view-candidate-work-header">
                                                    <svg className="recruitment-view-candidate-work-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                                    </svg>
                                                    <div>
                                                        <div className="recruitment-view-candidate-work-company">{exp.cong_ty || '---'}</div>
                                                        <div className="recruitment-view-candidate-work-position">{exp.chuc_danh || '---'}</div>
                                                        <div className="recruitment-view-candidate-work-period">
                                                            {formatDate(exp.ngay_bat_dau) || '---'} - {formatDate(exp.ngay_ket_thuc) || 'Hiện tại'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="recruitment-view-candidate-empty">Chưa có thông tin</div>
                                    )}
                                </div>
                            </div>

                            {/* Section III: QUÁ TRÌNH ĐÀO TẠO */}
                            <div className="recruitment-view-candidate-section">
                                <h3 className="recruitment-view-candidate-section-title">
                                    <svg className="recruitment-view-candidate-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                    </svg>
                                    III. QUÁ TRÌNH ĐÀO TẠO
                                </h3>
                                <div className="recruitment-view-candidate-training">
                                    {viewingCandidate.trainingProcesses && viewingCandidate.trainingProcesses.length > 0 ? (
                                        viewingCandidate.trainingProcesses.map((tp, idx) => (
                                            <div key={idx} className="recruitment-view-candidate-training-item">
                                                <div className="recruitment-view-candidate-training-header">
                                                    <svg className="recruitment-view-candidate-training-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path>
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path>
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14v9M4.981 15.326A11.94 11.94 0 0012 20.055c2.67 0 5.182-.935 7.019-2.729M12 14l-9-5m9 5l9-5m-9 5v9m0-9a11.952 11.952 0 01-6.824-2.998M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479M12 14L5.836 10.578a12.078 12.078 0 00-.665 6.479M12 14v9m0 0a11.952 11.952 0 01-6.824-2.998M12 23a11.952 11.952 0 007.019-2.729M5.836 10.578a12.078 12.078 0 00-.665 6.479L12 14l6.824 2.998a12.078 12.078 0 00.665-6.479M12 5v.01M12 5a11.952 11.952 0 00-6.824 2.998M12 5l6.16 3.422a12.083 12.083 0 01.665 6.479M12 5V2"></path>
                                                    </svg>
                                                    <div>
                                                        <div className="recruitment-view-candidate-training-school">{tp.truong_dao_tao || '---'}</div>
                                                        <div className="recruitment-view-candidate-training-major">{tp.chuyen_nganh || '---'}</div>
                                                        <div className="recruitment-view-candidate-training-period">
                                                            {formatDate(tp.ngay_bat_dau) || '---'} - {formatDate(tp.ngay_ket_thuc) || 'Hiện tại'}
                                                        </div>
                                                        {tp.van_bang && (
                                                            <div className="recruitment-view-candidate-training-degree">Văn bằng: {tp.van_bang}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="recruitment-view-candidate-empty">Chưa có thông tin</div>
                                    )}
                                </div>
                            </div>

                            {/* Section IV: TRÌNH ĐỘ NGOẠI NGỮ */}
                            <div className="recruitment-view-candidate-section">
                                <h3 className="recruitment-view-candidate-section-title">
                                    <svg className="recruitment-view-candidate-section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                                    </svg>
                                    IV. TRÌNH ĐỘ NGOẠI NGỮ
                                </h3>
                                <div className="recruitment-view-candidate-languages">
                                    {viewingCandidate.foreignLanguages && viewingCandidate.foreignLanguages.length > 0 ? (
                                        viewingCandidate.foreignLanguages.map((fl, idx) => (
                                            <div key={idx} className="recruitment-view-candidate-language-item">
                                                <div className="recruitment-view-candidate-language-header">
                                                    <svg className="recruitment-view-candidate-language-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                                                    </svg>
                                                    <div>
                                                        <div className="recruitment-view-candidate-language-name">{fl.ngoai_ngu || '---'}</div>
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
                                        ))
                                    ) : (
                                        <div className="recruitment-view-candidate-empty">Chưa có thông tin</div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="recruitment-view-candidate-modal-footer">
                            <button
                                type="button"
                                className="recruitment-view-candidate-modal-btn recruitment-view-candidate-modal-btn--close"
                                onClick={() => {
                                    setShowViewCandidateModal(false);
                                    setHasInterviewRequest(false);
                                }}
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                className="recruitment-view-candidate-modal-btn recruitment-view-candidate-modal-btn--edit"
                                onClick={() => {
                                    setShowViewCandidateModal(false);
                                    setHasInterviewRequest(false);
                                    handleEditCandidate(viewingCandidate.id);
                                }}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                </svg>
                                Cập nhật hồ sơ ứng viên
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Recruitment Requests Modal */}
            {showRecruitmentRequestsModal && (
                <div className="recruitment-requests-modal-overlay" onClick={() => setShowRecruitmentRequestsModal(false)}>
                    <div className="recruitment-requests-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="recruitment-requests-modal-header">
                            <h2 className="recruitment-requests-modal-title">Yêu cầu Tuyển nhân sự</h2>
                            <div className="recruitment-requests-modal-header-actions">
                                {/* Export Filter */}
                                <div className="recruitment-export-filters">
                                    <select
                                        className="recruitment-export-filter-select"
                                        value={exportFilterYear}
                                        onChange={(e) => setExportFilterYear(e.target.value)}
                                    >
                                        <option value="">Tất cả năm</option>
                                        {Array.from({ length: 5 }, (_, i) => {
                                            const year = new Date().getFullYear() - i;
                                            return <option key={year} value={year.toString()}>{year}</option>;
                                        })}
                                    </select>
                                    <select
                                        className="recruitment-export-filter-select"
                                        value={exportFilterMonth}
                                        onChange={(e) => setExportFilterMonth(e.target.value)}
                                        disabled={!exportFilterYear}
                                    >
                                        <option value="">Tất cả tháng</option>
                                        {Array.from({ length: 12 }, (_, i) => {
                                            const month = i + 1;
                                            const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
                                            return <option key={month} value={month.toString()}>{monthNames[i]}</option>;
                                        })}
                                    </select>
                                </div>
                                {/* Export Button */}
                                <button
                                    type="button"
                                    className="recruitment-export-excel-btn"
                                    onClick={handleExportRecruitmentRequests}
                                    disabled={loading || recruitmentRequests.filter(req => req.status === 'APPROVED').length === 0}
                                    title="Xuất các đơn đã duyệt ra Excel"
                                >
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    <span>Xuất Excel</span>
                                </button>
                            </div>
                            <button
                                type="button"
                                className="recruitment-requests-modal-close"
                                onClick={() => setShowRecruitmentRequestsModal(false)}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div className="recruitment-requests-modal-body">
                            {recruitmentRequests.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                                    <svg style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem', opacity: 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    <p>Chưa có yêu cầu tuyển dụng nào</p>
                                </div>
                            ) : (
                                <div className="recruitment-requests-list">
                                    {recruitmentRequests.map((request) => (
                                        <div
                                            key={request.id}
                                            className="recruitment-request-item"
                                            onClick={() => {
                                                setSelectedHrRequest(request);
                                                setShowHrRequestDetail(true);
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="recruitment-request-header">
                                                <h3 className="recruitment-request-title">
                                                    Yêu cầu #{request.id} - {request.chucDanhCanTuyen || 'Chưa có tiêu đề'}
                                                </h3>
                                                <span className={`recruitment-request-status-badge status-${request.status?.toLowerCase()}`}>
                                                    {request.status === 'PENDING_HR' ? 'Chờ HR xử lý' :
                                                        request.status === 'APPROVED' ? 'Đã duyệt' :
                                                            request.status === 'REJECTED' ? 'Đã từ chối' : request.status}
                                                </span>
                                            </div>
                                            <div className="recruitment-request-details">
                                                <p><strong>Phòng ban:</strong> {request.phongBanBoPhan || '---'}</p>
                                                <p><strong>Người gửi:</strong> {request.nguoiGui || '---'}</p>
                                                <p><strong>Ngày gửi:</strong> {request.ngayGui ? new Date(request.ngayGui).toLocaleDateString('vi-VN') : '---'}</p>
                                                <p><strong>Ngày duyệt:</strong> {request.approvedAt ? new Date(request.approvedAt).toLocaleDateString('vi-VN') : '---'}</p>
                                                <p><strong>Số lượng:</strong> {request.soLuongYeuCau || '---'}</p>
                                            </div>
                                            {/* HR chỉ xem, không duyệt/từ chối */}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* HR Recruitment Request Detail Modal */}
            {showHrRequestDetail && selectedHrRequest && (
                <div className="recruitment-request-detail-overlay" onClick={() => setShowHrRequestDetail(false)}>
                    <div className="recruitment-request-detail-container" onClick={(e) => e.stopPropagation()}>
                        <div className="recruitment-request-detail-header">
                            <div>
                                <h2>Chi tiết yêu cầu tuyển nhân sự</h2>
                                <p>HR chỉ xem thông tin, không duyệt/từ chối</p>
                            </div>
                            <button
                                type="button"
                                className="recruitment-request-detail-close"
                                onClick={() => setShowHrRequestDetail(false)}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>

                        <div className="recruitment-request-detail-body">
                            <div className="recruitment-request-detail-section">
                                <h3>Thông tin vị trí</h3>
                                <div className="recruitment-request-detail-grid">
                                    <div><label>Chức danh cần tuyển</label><span>{selectedHrRequest.chucDanhCanTuyen || '---'}</span></div>
                                    <div><label>Phòng ban/Bộ phận</label><span>{selectedHrRequest.phongBanBoPhan || '---'}</span></div>
                                    <div><label>Số lượng</label><span>{selectedHrRequest.soLuongYeuCau || '---'}</span></div>
                                    <div><label>Loại lao động</label><span>{selectedHrRequest.loaiLaoDong === 'toan_thoi_gian' ? 'Toàn thời gian' : selectedHrRequest.loaiLaoDong === 'thoi_vu' ? 'Thời vụ' : (selectedHrRequest.loaiLaoDong || '---')}</span></div>
                                    <div><label>Ngày gửi</label><span>{selectedHrRequest.ngayGui ? new Date(selectedHrRequest.ngayGui).toLocaleString('vi-VN') : '---'}</span></div>
                                    <div><label>Ngày duyệt</label><span>{selectedHrRequest.approvedAt ? new Date(selectedHrRequest.approvedAt).toLocaleString('vi-VN') : '---'}</span></div>
                                    <div><label>Trạng thái</label><span>{selectedHrRequest.status || '---'}</span></div>
                                </div>
                                {selectedHrRequest.moTaCongViec && (
                                    <div className="recruitment-request-detail-note">
                                        <label>Mô tả công việc (MTCV)</label>
                                        <p>{selectedHrRequest.moTaCongViec === 'co' ? 'Đã có MTCV' : selectedHrRequest.moTaCongViec === 'chua_co' ? 'Chưa có MTCV' : selectedHrRequest.moTaCongViec}</p>
                                    </div>
                                )}
                                {selectedHrRequest.yeuCauChiTietCongViec && (
                                    <div className="recruitment-request-detail-note">
                                        <label>Yêu cầu chi tiết về công việc</label>
                                        <p>{selectedHrRequest.yeuCauChiTietCongViec}</p>
                                    </div>
                                )}
                                {selectedHrRequest.lyDoKhacGhiChu && (
                                    <div className="recruitment-request-detail-note">
                                        <label>Lý do khác / Ghi chú</label>
                                        <p>{selectedHrRequest.lyDoKhacGhiChu}</p>
                                    </div>
                                )}
                            </div>

                            <div className="recruitment-request-detail-section">
                                <h3>Thông tin quản lý</h3>
                                <div className="recruitment-request-detail-grid">
                                    <div><label>Người gửi</label><span>{selectedHrRequest.nguoiGui || '---'}</span></div>
                                    <div><label>Quản lý trực tiếp</label><span>{selectedHrRequest.nguoiQuanLyTrucTiep || '---'}</span></div>
                                    <div><label>Quản lý gián tiếp</label><span>{selectedHrRequest.nguoiQuanLyGianTiep || '---'}</span></div>
                                    <div><label>Lý do tuyển</label><span>
                                        {selectedHrRequest.lyDoTuyen === 'thay_the' ? 'Thay thế' :
                                            selectedHrRequest.lyDoTuyen === 'nhu_cau_tang' ? 'Nhu cầu tăng' :
                                                selectedHrRequest.lyDoTuyen === 'vi_tri_moi' ? 'Vị trí mới' :
                                                    selectedHrRequest.lyDoTuyen || '---'}
                                    </span></div>
                                </div>
                            </div>

                            <div className="recruitment-request-detail-section">
                                <h3>Tiêu chuẩn tuyển chọn</h3>
                                <div className="recruitment-request-detail-grid">
                                    <div><label>Giới tính</label><span>
                                        {selectedHrRequest.gioiTinh === 'bat_ky' ? 'Bất kỳ' :
                                            selectedHrRequest.gioiTinh === 'nam' ? 'Nam' :
                                                selectedHrRequest.gioiTinh === 'nu' ? 'Nữ' :
                                                    selectedHrRequest.gioiTinh || '---'}
                                    </span></div>
                                    <div><label>Độ tuổi</label><span>{selectedHrRequest.doTuoi || '---'}</span></div>
                                    <div><label>Trình độ học vấn</label><span>{selectedHrRequest.trinhDoHocVanYeuCau || '---'}</span></div>
                                    <div><label>Kinh nghiệm chuyên môn</label><span>
                                        {selectedHrRequest.kinhNghiemChuyenMon === 'khong_yeu_cau' ? 'Không yêu cầu' :
                                            selectedHrRequest.kinhNghiemChuyenMon === 'co_yeu_cau' ? 'Có yêu cầu' :
                                                selectedHrRequest.kinhNghiemChuyenMon || '---'}
                                    </span></div>
                                </div>
                                {selectedHrRequest.chiTietKinhNghiem && (
                                    <div className="recruitment-request-detail-note">
                                        <label>Chi tiết kinh nghiệm</label>
                                        <p>{selectedHrRequest.chiTietKinhNghiem}</p>
                                    </div>
                                )}
                                {selectedHrRequest.kienThucChuyenMonKhac && (
                                    <div className="recruitment-request-detail-note">
                                        <label>Kiến thức chuyên môn khác</label>
                                        <p>{selectedHrRequest.kienThucChuyenMonKhac}</p>
                                    </div>
                                )}
                                {selectedHrRequest.yeuCauNgoaiNgu && (
                                    <div className="recruitment-request-detail-note">
                                        <label>Yêu cầu ngoại ngữ</label>
                                        <p>{selectedHrRequest.yeuCauNgoaiNgu}</p>
                                    </div>
                                )}
                                {selectedHrRequest.yeuCauViTinhKyNangKhac && (
                                    <div className="recruitment-request-detail-note">
                                        <label>Yêu cầu vi tính / kỹ năng khác</label>
                                        <p>{selectedHrRequest.yeuCauViTinhKyNangKhac}</p>
                                    </div>
                                )}
                                {selectedHrRequest.kyNangGiaoTiep && (
                                    <div className="recruitment-request-detail-note">
                                        <label>Kỹ năng giao tiếp</label>
                                        <p>{selectedHrRequest.kyNangGiaoTiep}</p>
                                    </div>
                                )}
                                {selectedHrRequest.thaiDoLamViec && (
                                    <div className="recruitment-request-detail-note">
                                        <label>Thái độ làm việc</label>
                                        <p>{selectedHrRequest.thaiDoLamViec}</p>
                                    </div>
                                )}
                                {selectedHrRequest.kyNangQuanLy && (
                                    <div className="recruitment-request-detail-note">
                                        <label>Kỹ năng quản lý</label>
                                        <p>{selectedHrRequest.kyNangQuanLy}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="recruitment-request-detail-footer">
                            <button
                                type="button"
                                className="recruitment-request-detail-close-btn"
                                onClick={() => setShowHrRequestDetail(false)}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Interview Timeline Modal */}
            {showInterviewTimelineModal && interviewTimelineData && (
                <div className="interview-timeline-modal-overlay" onClick={() => {
                    setShowInterviewTimelineModal(false);
                    setInterviewTimelineData(null);
                }}>
                    <div className="interview-timeline-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="interview-timeline-modal-header">
                            <h2 className="interview-timeline-modal-title">Tiến độ phỏng vấn</h2>
                            <button
                                type="button"
                                className="interview-timeline-modal-close"
                                onClick={() => {
                                    setShowInterviewTimelineModal(false);
                                    setInterviewTimelineData(null);
                                }}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div className="interview-timeline-modal-body">
                            {loadingTimeline ? (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>
                                    <div className="recruitment-management-spinner"></div>
                                    <p>Đang tải...</p>
                                </div>
                            ) : (
                                <div className="interview-timeline">
                                    {/* Step 1: HR chuyển phỏng vấn */}
                                    <div className="timeline-step timeline-step-completed">
                                        <div className="timeline-step-icon">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                                            </svg>
                                        </div>
                                        <div className="timeline-step-content">
                                            <h3 className="timeline-step-title">HR chuyển phỏng vấn</h3>
                                            <p className="timeline-step-description">
                                                Ứng viên đã được chuyển sang phỏng vấn
                                            </p>
                                            <p className="timeline-step-date">
                                                {interviewTimelineData.interviewRequest.created_at
                                                    ? new Date(interviewTimelineData.interviewRequest.created_at).toLocaleString('vi-VN')
                                                    : '---'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Step 2: Quản lý trực tiếp duyệt */}
                                    <div className={`timeline-step ${interviewTimelineData.interviewRequest.manager_approved ? 'timeline-step-completed' : 'timeline-step-pending'}`}>
                                        <div className="timeline-step-icon">
                                            {interviewTimelineData.interviewRequest.manager_approved ? (
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            ) : (
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            )}
                                        </div>
                                        <div className="timeline-step-content">
                                            <h3 className="timeline-step-title">
                                                Quản lý trực tiếp duyệt
                                                {interviewTimelineData.interviewRequest.manager_name && (
                                                    <span className="timeline-step-person"> - {interviewTimelineData.interviewRequest.manager_name}</span>
                                                )}
                                            </h3>
                                            <p className="timeline-step-description">
                                                {interviewTimelineData.interviewRequest.manager_approved
                                                    ? 'Đã được quản lý trực tiếp duyệt'
                                                    : 'Đang chờ quản lý trực tiếp duyệt'}
                                            </p>
                                            {interviewTimelineData.interviewRequest.manager_approved_at && (
                                                <p className="timeline-step-date">
                                                    {new Date(interviewTimelineData.interviewRequest.manager_approved_at).toLocaleString('vi-VN')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Step 3: Giám đốc chi nhánh duyệt */}
                                    <div className={`timeline-step ${interviewTimelineData.interviewRequest.branch_director_approved ? 'timeline-step-completed' : 'timeline-step-pending'}`}>
                                        <div className="timeline-step-icon">
                                            {interviewTimelineData.interviewRequest.branch_director_approved ? (
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            ) : (
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            )}
                                        </div>
                                        <div className="timeline-step-content">
                                            <h3 className="timeline-step-title">
                                                Giám đốc chi nhánh duyệt
                                                {interviewTimelineData.interviewRequest.branch_director_name && (
                                                    <span className="timeline-step-person"> - {interviewTimelineData.interviewRequest.branch_director_name}</span>
                                                )}
                                            </h3>
                                            <p className="timeline-step-description">
                                                {interviewTimelineData.interviewRequest.branch_director_approved
                                                    ? 'Đã được giám đốc chi nhánh duyệt'
                                                    : 'Đang chờ giám đốc chi nhánh duyệt'}
                                            </p>
                                            {interviewTimelineData.interviewRequest.branch_director_approved_at && (
                                                <p className="timeline-step-date">
                                                    {new Date(interviewTimelineData.interviewRequest.branch_director_approved_at).toLocaleString('vi-VN')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Step 4: Sẵn sàng phỏng vấn */}
                                    {interviewTimelineData.interviewRequest.status === 'READY_FOR_INTERVIEW' && (
                                        <div className="timeline-step timeline-step-completed">
                                            <div className="timeline-step-icon">
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            </div>
                                            <div className="timeline-step-content">
                                                <h3 className="timeline-step-title">Sẵn sàng phỏng vấn</h3>
                                                <p className="timeline-step-description">
                                                    Cả hai người đã duyệt. Ứng viên sẵn sàng phỏng vấn
                                                </p>
                                                {interviewTimelineData.interviewRequest.interview_time && (
                                                    <p className="timeline-step-date">
                                                        Thời gian PV: {new Date(interviewTimelineData.interviewRequest.interview_time).toLocaleString('vi-VN')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 5: Đánh giá của Quản lý trực tiếp */}
                                    {(() => {
                                        const managerEval = interviewTimelineData.evaluations?.find(e =>
                                            e.evaluator_id === interviewTimelineData.interviewRequest.manager_id
                                        );
                                        return (
                                            <div className={`timeline-step ${managerEval ? 'timeline-step-completed' : 'timeline-step-pending'}`}>
                                                <div className="timeline-step-icon">
                                                    {managerEval ? (
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                        </svg>
                                                    ) : (
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="timeline-step-content">
                                                    <h3 className="timeline-step-title">
                                                        Đánh giá của Quản lý trực tiếp
                                                        {interviewTimelineData.interviewRequest.manager_name && (
                                                            <span className="timeline-step-person"> - {interviewTimelineData.interviewRequest.manager_name}</span>
                                                        )}
                                                    </h3>
                                                    {managerEval ? (
                                                        <>
                                                            <p className="timeline-step-description">
                                                                Đã hoàn thành đánh giá phỏng vấn
                                                            </p>
                                                            <p className="timeline-step-date">
                                                                {managerEval.created_at ? new Date(managerEval.created_at).toLocaleString('vi-VN') : '---'}
                                                            </p>
                                                            {managerEval.ket_luan && (
                                                                <div className="timeline-evaluation-conclusion-badge">
                                                                    <span className={`conclusion-badge conclusion-badge-${managerEval.ket_luan.toLowerCase().replace('_', '-')}`}>
                                                                        {
                                                                            managerEval.ket_luan === 'DAT_YEU_CAU' ? '✓ Đạt yêu cầu' :
                                                                                managerEval.ket_luan === 'KHONG_DAT_YEU_CAU' ? '✗ Không đạt yêu cầu' :
                                                                                    managerEval.ket_luan === 'LUU_HO_SO' ? '📄 Lưu hồ sơ' : managerEval.ket_luan
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <p className="timeline-step-description">
                                                            Đang chờ quản lý trực tiếp đánh giá
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Step 6: Đánh giá của Giám đốc chi nhánh */}
                                    {(() => {
                                        const directorEval = interviewTimelineData.evaluations?.find(e =>
                                            e.evaluator_id === interviewTimelineData.interviewRequest.branch_director_id
                                        );
                                        return (
                                            <div className={`timeline-step ${directorEval ? 'timeline-step-completed' : 'timeline-step-pending'}`}>
                                                <div className="timeline-step-icon">
                                                    {directorEval ? (
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                        </svg>
                                                    ) : (
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="timeline-step-content">
                                                    <h3 className="timeline-step-title">
                                                        Đánh giá của Giám đốc chi nhánh
                                                        {interviewTimelineData.interviewRequest.branch_director_name && (
                                                            <span className="timeline-step-person"> - {interviewTimelineData.interviewRequest.branch_director_name}</span>
                                                        )}
                                                    </h3>
                                                    {directorEval ? (
                                                        <>
                                                            <p className="timeline-step-description">
                                                                Đã hoàn thành đánh giá phỏng vấn
                                                            </p>
                                                            <p className="timeline-step-date">
                                                                {directorEval.created_at ? new Date(directorEval.created_at).toLocaleString('vi-VN') : '---'}
                                                            </p>
                                                            {directorEval.ket_luan && (
                                                                <div className="timeline-evaluation-conclusion-badge">
                                                                    <span className={`conclusion-badge conclusion-badge-${directorEval.ket_luan.toLowerCase().replace('_', '-')}`}>
                                                                        {
                                                                            directorEval.ket_luan === 'DAT_YEU_CAU' ? '✓ Đạt yêu cầu' :
                                                                                directorEval.ket_luan === 'KHONG_DAT_YEU_CAU' ? '✗ Không đạt yêu cầu' :
                                                                                    directorEval.ket_luan === 'LUU_HO_SO' ? '📄 Lưu hồ sơ' : directorEval.ket_luan
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <p className="timeline-step-description">
                                                            Đang chờ giám đốc chi nhánh đánh giá
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Step 7: Kết quả cuối cùng */}
                                    {interviewTimelineData.candidate && (
                                        (() => {
                                            const finalStatus = interviewTimelineData.candidate.trang_thai;
                                            const isPassed = finalStatus === 'PASSED';
                                            const isFailed = finalStatus === 'FAILED';
                                            const showResult = isPassed || isFailed;

                                            if (!showResult) return null;

                                            return (
                                                <div className={`timeline-step timeline-step-completed ${isPassed ? 'timeline-step-success' : 'timeline-step-error'}`}>
                                                    <div className="timeline-step-icon">
                                                        {isPassed ? (
                                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                            </svg>
                                                        ) : (
                                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div className="timeline-step-content">
                                                        <h3 className="timeline-step-title">
                                                            {isPassed ? '🎉 Kết quả: Đậu' : '❌ Kết quả: Rớt'}
                                                        </h3>
                                                        <p className="timeline-step-description">
                                                            {isPassed
                                                                ? 'Ứng viên đã vượt qua vòng phỏng vấn và được tuyển dụng'
                                                                : 'Ứng viên không đạt yêu cầu phỏng vấn'}
                                                        </p>
                                                        {interviewTimelineData.candidate.updated_at && (
                                                            <p className="timeline-step-date">
                                                                {new Date(interviewTimelineData.candidate.updated_at).toLocaleString('vi-VN')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="interview-timeline-modal-footer">
                            {(() => {
                                const managerEval = interviewTimelineData.evaluations?.find(e =>
                                    e.evaluator_id === interviewTimelineData.interviewRequest.manager_id
                                );
                                const directorEval = interviewTimelineData.evaluations?.find(e =>
                                    e.evaluator_id === interviewTimelineData.interviewRequest.branch_director_id
                                );
                                const bothEvaluated = managerEval && directorEval;
                                const bothPassed = bothEvaluated &&
                                    managerEval.ket_luan === 'DAT_YEU_CAU' &&
                                    directorEval.ket_luan === 'DAT_YEU_CAU';
                                const candidateStatus = interviewTimelineData.candidate?.trang_thai;
                                const isPassed = candidateStatus === 'PASSED' || bothPassed;

                                // Nếu cả 2 đánh giá "Đạt yêu cầu" nhưng status chưa là PASSED, gọi API để update (chỉ 1 lần)
                                // Không update nếu candidate đã ON_PROBATION
                                if (bothPassed && candidateStatus !== 'PASSED' && candidateStatus !== 'ON_PROBATION' && interviewTimelineData.candidate?.id && !statusUpdateChecked) {
                                    setStatusUpdateChecked(true);
                                    interviewEvaluationsAPI.checkAndUpdateStatus(interviewTimelineData.candidate.id)
                                        .then(response => {
                                            if (response.data?.success) {
                                                // Refresh candidate data và timeline
                                                setTimeout(() => {
                                                    handleLoadInterviewTimeline(interviewTimelineData.candidate.id);
                                                }, 500);
                                            }
                                        })
                                        .catch(err => {
                                            console.error('[Timeline Modal] Error updating candidate status:', err);
                                            setStatusUpdateChecked(false); // Reset để thử lại
                                        });
                                }

                                return (
                                    <>
                                        {bothEvaluated && (
                                            <button
                                                type="button"
                                                className="interview-timeline-modal-btn interview-timeline-modal-btn-view"
                                                onClick={handleViewEvaluationSummary}
                                            >
                                                📊 Xem đánh giá
                                            </button>
                                        )}
                                        {isPassed && (
                                            <button
                                                type="button"
                                                className="interview-timeline-modal-btn interview-timeline-modal-btn-send"
                                                onClick={() => {
                                                    setShowSendRecruitmentInfoModal(true);
                                                }}
                                            >
                                                Gửi thông tin tuyển dụng
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="interview-timeline-modal-btn"
                                            onClick={async () => {
                                                setShowInterviewTimelineModal(false);
                                                setInterviewTimelineData(null);
                                                setStatusUpdateChecked(false); // Reset flag khi đóng modal

                                                // Refresh candidate data khi đóng timeline modal
                                                if (viewingCandidate?.id) {
                                                    try {
                                                        // Fetch candidate data mới nhất
                                                        const candidateResponse = await candidatesAPI.getById(viewingCandidate.id);
                                                        if (candidateResponse.data?.success && candidateResponse.data.data) {
                                                            const updatedCandidate = candidateResponse.data.data;
                                                            setViewingCandidate(updatedCandidate);

                                                            // Cập nhật candidate trong list để đồng bộ status ngay lập tức
                                                            setCandidates(prevCandidates =>
                                                                prevCandidates.map(c => c.id === updatedCandidate.id ? updatedCandidate : c)
                                                            );

                                                            // Refresh toàn bộ candidate list để đảm bảo đồng bộ
                                                            setTimeout(() => {
                                                                fetchCandidates(false);
                                                            }, 500);
                                                        }
                                                    } catch (err) {
                                                        console.error('Error refreshing candidate after closing timeline:', err);
                                                        // Vẫn refresh list nếu có lỗi
                                                        fetchCandidates(false);
                                                    }
                                                } else {
                                                    // Refresh list nếu không có viewingCandidate
                                                    fetchCandidates(false);
                                                }
                                            }}
                                        >
                                            Đóng
                                        </button>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Evaluation Summary Modal */}
            {showEvaluationSummaryModal && evaluationSummaryData && (
                <div className="evaluation-summary-modal-overlay" onClick={() => {
                    setShowEvaluationSummaryModal(false);
                    setEvaluationSummaryData(null);
                }}>
                    <div className="evaluation-summary-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="evaluation-summary-modal-header">
                            <h2 className="evaluation-summary-modal-title">Tổng hợp đánh giá phỏng vấn</h2>
                            <button
                                type="button"
                                className="evaluation-summary-modal-close"
                                onClick={() => {
                                    setShowEvaluationSummaryModal(false);
                                    setEvaluationSummaryData(null);
                                }}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div className="evaluation-summary-modal-body">
                            {/* Candidate Info */}
                            <div className="evaluation-summary-section">
                                <h3 className="evaluation-summary-section-title">Thông tin ứng viên</h3>
                                <div className="evaluation-summary-info-grid">
                                    <div>
                                        <label>Tên ứng viên:</label>
                                        <span>{evaluationSummaryData.candidate?.ho_ten || '---'}</span>
                                    </div>
                                    <div>
                                        <label>Vị trí:</label>
                                        <span>{evaluationSummaryData.interviewRequest?.vi_tri_ung_tuyen || evaluationSummaryData.interviewRequest?.chuc_danh_can_tuyen || '---'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Evaluation Scores Table */}
                            <div className="evaluation-summary-section">
                                <h3 className="evaluation-summary-section-title">Điểm đánh giá (thang điểm 5)</h3>
                                <div className="evaluation-summary-table-wrapper">
                                    <table className="evaluation-summary-table">
                                        <thead>
                                            <tr>
                                                <th>Tiêu chí đánh giá</th>
                                                <th>Quản lý trực tiếp</th>
                                                <th>Giám đốc chi nhánh</th>
                                                <th>Điểm TB</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {evaluationSummaryData.criteria.map((criterion, idx) => (
                                                <tr key={idx}>
                                                    <td>{criterion.label}</td>
                                                    <td className="score-cell">{criterion.managerScore !== null && criterion.managerScore !== undefined ? criterion.managerScore : '-'}</td>
                                                    <td className="score-cell">{criterion.directorScore !== null && criterion.directorScore !== undefined ? criterion.directorScore : '-'}</td>
                                                    <td className="score-cell average-score">{criterion.average !== '0.00' && criterion.average !== 0 && criterion.average !== '0' ? criterion.average : '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Conclusions */}
                            <div className="evaluation-summary-section">
                                <h3 className="evaluation-summary-section-title">Kết luận đánh giá</h3>
                                <div className="evaluation-summary-conclusions">
                                    <div className="evaluation-summary-conclusion-item">
                                        <label>Quản lý trực tiếp:</label>
                                        <span className={`conclusion-badge conclusion-badge-${evaluationSummaryData.managerConclusion?.toLowerCase().replace('_', '-')}`}>
                                            {
                                                evaluationSummaryData.managerConclusion === 'DAT_YEU_CAU' ? '✓ Đạt yêu cầu' :
                                                    evaluationSummaryData.managerConclusion === 'KHONG_DAT_YEU_CAU' ? '✗ Không đạt yêu cầu' :
                                                        evaluationSummaryData.managerConclusion === 'LUU_HO_SO' ? '📄 Lưu hồ sơ' : evaluationSummaryData.managerConclusion
                                            }
                                        </span>
                                    </div>
                                    <div className="evaluation-summary-conclusion-item">
                                        <label>Giám đốc chi nhánh:</label>
                                        <span className={`conclusion-badge conclusion-badge-${evaluationSummaryData.directorConclusion?.toLowerCase().replace('_', '-')}`}>
                                            {
                                                evaluationSummaryData.directorConclusion === 'DAT_YEU_CAU' ? '✓ Đạt yêu cầu' :
                                                    evaluationSummaryData.directorConclusion === 'KHONG_DAT_YEU_CAU' ? '✗ Không đạt yêu cầu' :
                                                        evaluationSummaryData.directorConclusion === 'LUU_HO_SO' ? '📄 Lưu hồ sơ' : evaluationSummaryData.directorConclusion
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Final Result */}
                            {evaluationSummaryData.bothPassed && (
                                <div className="evaluation-summary-final-result">
                                    <div className="final-result-badge final-result-passed">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        <span>Đậu PV</span>
                                    </div>
                                    <p className="final-result-description">
                                        Cả hai người đánh giá đều kết luận "Đạt yêu cầu". Ứng viên đã vượt qua vòng phỏng vấn.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="evaluation-summary-modal-footer">
                            <button
                                type="button"
                                className="evaluation-summary-modal-btn"
                                onClick={() => {
                                    setShowEvaluationSummaryModal(false);
                                    setEvaluationSummaryData(null);
                                }}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Send Recruitment Info Modal */}
            {showSendRecruitmentInfoModal && (
                <div className="send-recruitment-info-modal-overlay" onClick={() => {
                    setShowSendRecruitmentInfoModal(false);
                }}>
                    <div className="send-recruitment-info-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="send-recruitment-info-modal-header">
                            <div>
                                <h2 className="send-recruitment-info-modal-title">Tạo Yêu Cầu Tuyển Dụng Chi Tiết (RRF)</h2>
                                <p className="send-recruitment-info-modal-subtitle">Điền thông tin chi tiết để gửi yêu cầu tuyển dụng</p>
                            </div>
                            <button
                                type="button"
                                className="send-recruitment-info-modal-close"
                                onClick={() => {
                                    setShowSendRecruitmentInfoModal(false);
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <div className="send-recruitment-info-modal-body">
                            <form className="send-recruitment-info-form">
                                <div className="send-recruitment-info-form-columns">
                                    {/* Cột Trái */}
                                    <div className="send-recruitment-info-form-left">
                                        {/* Section 1: Thông Tin Vị Trí & Tổ Chức */}
                                        <div className="send-recruitment-info-section">
                                            <h3 className="send-recruitment-info-section-title">A. Thông Tin Vị Trí & Tổ Chức</h3>

                                            {/* Hàng 1: Chức danh, Cấp Bậc */}
                                            <div className="send-recruitment-info-form-row">
                                                <div className="send-recruitment-info-form-group">
                                                    <label className="send-recruitment-info-label">
                                                        Chức danh <span className="required">*</span>
                                                    </label>
                                                    <select
                                                        className="send-recruitment-info-select"
                                                        value={recruitmentInfoForm.chucDanh}
                                                        onChange={(e) => setRecruitmentInfoForm({ ...recruitmentInfoForm, chucDanh: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">-- Chọn chức danh --</option>
                                                        {jobTitles.map((title, index) => (
                                                            <option key={index} value={title}>{title}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="send-recruitment-info-form-group">
                                                    <label className="send-recruitment-info-label">
                                                        Cấp Bậc
                                                    </label>
                                                    <select
                                                        className="send-recruitment-info-select"
                                                        value={recruitmentInfoForm.capBac}
                                                        onChange={(e) => setRecruitmentInfoForm({ ...recruitmentInfoForm, capBac: e.target.value })}
                                                    >
                                                        <option value="">-- Chọn cấp bậc --</option>
                                                        {ranks.map((rank, index) => (
                                                            <option key={index} value={rank}>{rank}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Hàng 2: Người báo cáo trực tiếp, Người báo cáo gián tiếp */}
                                            <div className="send-recruitment-info-form-row">
                                                <div className="send-recruitment-info-form-group">
                                                    <label className="send-recruitment-info-label">
                                                        Người báo cáo trực tiếp <span className="required">*</span>
                                                    </label>
                                                    <select
                                                        className="send-recruitment-info-select"
                                                        value={recruitmentInfoForm.baoCaoTrucTiep}
                                                        onChange={(e) => setRecruitmentInfoForm({ ...recruitmentInfoForm, baoCaoTrucTiep: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">-- Chọn người báo cáo trực tiếp --</option>
                                                        {managers.map((manager) => (
                                                            <option key={manager.id} value={manager.id}>
                                                                {manager.ho_ten || manager.hoTen}
                                                                {manager.chuc_danh || manager.chucDanh ? ` - ${manager.chuc_danh || manager.chucDanh}` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="send-recruitment-info-form-group">
                                                    <label className="send-recruitment-info-label">
                                                        Người báo cáo gián tiếp
                                                    </label>
                                                    <select
                                                        className="send-recruitment-info-select"
                                                        value={recruitmentInfoForm.baoCaoGianTiep}
                                                        onChange={(e) => setRecruitmentInfoForm({ ...recruitmentInfoForm, baoCaoGianTiep: e.target.value })}
                                                    >
                                                        <option value="">-- Chọn người báo cáo gián tiếp --</option>
                                                        {managers.map((manager) => (
                                                            <option key={manager.id} value={manager.id}>
                                                                {manager.ho_ten || manager.hoTen}
                                                                {manager.chuc_danh || manager.chucDanh ? ` - ${manager.chuc_danh || manager.chucDanh}` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Hàng 3: Địa điểm làm việc, Ngày bắt đầu (Dự kiến) */}
                                            <div className="send-recruitment-info-form-row">
                                                <div className="send-recruitment-info-form-group">
                                                    <label className="send-recruitment-info-label">
                                                        Địa điểm làm việc <span className="required">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="send-recruitment-info-input"
                                                        value={recruitmentInfoForm.diaDiemLamViec}
                                                        onChange={(e) => setRecruitmentInfoForm({ ...recruitmentInfoForm, diaDiemLamViec: e.target.value })}
                                                        placeholder="Nhập địa điểm làm việc"
                                                        required
                                                    />
                                                </div>
                                                <div className="send-recruitment-info-form-group">
                                                    <label className="send-recruitment-info-label">
                                                        Ngày bắt đầu (Dự kiến) <span className="required">*</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        className="send-recruitment-info-input"
                                                        value={recruitmentInfoForm.ngayBatDauLamViec}
                                                        onChange={(e) => setRecruitmentInfoForm({ ...recruitmentInfoForm, ngayBatDauLamViec: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            {/* Hàng 4: Thời gian thử việc, Thời gian làm việc */}
                                            <div className="send-recruitment-info-form-row">
                                                <div className="send-recruitment-info-form-group">
                                                    <label className="send-recruitment-info-label">
                                                        Thời gian thử việc
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="send-recruitment-info-input"
                                                        value={recruitmentInfoForm.thoiGianThuViec}
                                                        readOnly
                                                        style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                                                    />
                                                </div>
                                                <div className="send-recruitment-info-form-group">
                                                    <label className="send-recruitment-info-label">
                                                        Thời gian làm việc
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="send-recruitment-info-input"
                                                        value={recruitmentInfoForm.thoiGianLamViec}
                                                        onChange={(e) => setRecruitmentInfoForm({ ...recruitmentInfoForm, thoiGianLamViec: e.target.value })}
                                                        placeholder="08:00 – 12:00 (Thứ Bảy- Nếu cần)"
                                                    />
                                                </div>
                                            </div>

                                            {/* Hàng 5: Lý do tuyển dụng, Số lượng cần tuyển */}
                                            <div className="send-recruitment-info-form-row">
                                                <div className="send-recruitment-info-form-group">
                                                    <label className="send-recruitment-info-label">
                                                        Lý do tuyển dụng
                                                    </label>
                                                    <select
                                                        className="send-recruitment-info-select"
                                                        value={recruitmentInfoForm.lyDoTuyenDung}
                                                        onChange={(e) => setRecruitmentInfoForm({ ...recruitmentInfoForm, lyDoTuyenDung: e.target.value })}
                                                    >
                                                        <option value="">-- Chọn lý do --</option>
                                                        <option value="Mở rộng đội ngũ">Mở rộng đội ngũ</option>
                                                        <option value="Thay thế nhân viên">Thay thế nhân viên</option>
                                                        <option value="Dự án mới">Dự án mới</option>
                                                        <option value="Khác">Khác</option>
                                                    </select>
                                                </div>
                                                <div className="send-recruitment-info-form-group">
                                                    <label className="send-recruitment-info-label">
                                                        Số lượng cần tuyển
                                                    </label>
                                                    <input
                                                        type="number"
                                                        className="send-recruitment-info-input"
                                                        value={recruitmentInfoForm.soLuongCanTuyen}
                                                        onChange={(e) => setRecruitmentInfoForm({ ...recruitmentInfoForm, soLuongCanTuyen: e.target.value })}
                                                        placeholder="1"
                                                        min="1"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 2: Công Việc Chính & Yêu Cầu */}
                                        <div className="send-recruitment-info-section">
                                            <h3 className="send-recruitment-info-section-title">B. Công Việc Chính & Yêu Cầu</h3>

                                            {/* Công Việc Chính */}
                                            <div className="send-recruitment-info-form-group">
                                                <label className="send-recruitment-info-label">
                                                    Công Việc Chính
                                                </label>
                                                {recruitmentInfoForm.congViecChinh.map((cv, index) => (
                                                    <div key={index} className="send-recruitment-info-work-item">
                                                        <label className="send-recruitment-info-work-label">
                                                            {String.fromCharCode(97 + index)}.
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="send-recruitment-info-input"
                                                            value={cv}
                                                            onChange={(e) => {
                                                                const newCongViecChinh = [...recruitmentInfoForm.congViecChinh];
                                                                newCongViecChinh[index] = e.target.value;
                                                                setRecruitmentInfoForm({ ...recruitmentInfoForm, congViecChinh: newCongViecChinh });
                                                            }}
                                                            placeholder={`Nhập công việc ${index + 1}`}
                                                        />
                                                        {recruitmentInfoForm.congViecChinh.length > 1 && (
                                                            <button
                                                                type="button"
                                                                className="send-recruitment-info-remove-btn"
                                                                onClick={() => {
                                                                    const newCongViecChinh = recruitmentInfoForm.congViecChinh.filter((_, i) => i !== index);
                                                                    setRecruitmentInfoForm({ ...recruitmentInfoForm, congViecChinh: newCongViecChinh });
                                                                }}
                                                            >
                                                                Xóa
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    className="send-recruitment-info-add-btn"
                                                    onClick={() => {
                                                        setRecruitmentInfoForm({
                                                            ...recruitmentInfoForm,
                                                            congViecChinh: [...recruitmentInfoForm.congViecChinh, '']
                                                        });
                                                    }}
                                                >
                                                    + Thêm Công Việc Khác
                                                </button>
                                            </div>

                                            {/* Yêu Cầu Tối Thiểu */}
                                            <div className="send-recruitment-info-form-row">
                                                <div className="send-recruitment-info-form-group">
                                                    <label className="send-recruitment-info-label">
                                                        Kinh nghiệm
                                                    </label>
                                                    <select
                                                        className="send-recruitment-info-select"
                                                        value={recruitmentInfoForm.kinhNghiem}
                                                        onChange={(e) => setRecruitmentInfoForm({ ...recruitmentInfoForm, kinhNghiem: e.target.value })}
                                                    >
                                                        <option value="">-- Chọn kinh nghiệm --</option>
                                                        <option value="Không yêu cầu">Không yêu cầu</option>
                                                        <option value="Dưới 1 năm">Dưới 1 năm</option>
                                                        <option value="1-2 năm">1-2 năm</option>
                                                        <option value="2-5 năm">2-5 năm</option>
                                                        <option value="5-10 năm">5-10 năm</option>
                                                        <option value="Trên 10 năm">Trên 10 năm</option>
                                                    </select>
                                                </div>
                                                <div className="send-recruitment-info-form-group">
                                                    <label className="send-recruitment-info-label">
                                                        Học vấn tối thiểu
                                                    </label>
                                                    <select
                                                        className="send-recruitment-info-select"
                                                        value={recruitmentInfoForm.hocVanToiThieu}
                                                        onChange={(e) => setRecruitmentInfoForm({ ...recruitmentInfoForm, hocVanToiThieu: e.target.value })}
                                                    >
                                                        <option value="">-- Chọn học vấn --</option>
                                                        <option value="Trung học phổ thông">Trung học phổ thông</option>
                                                        <option value="Trung cấp">Trung cấp</option>
                                                        <option value="Cao đẳng">Cao đẳng</option>
                                                        <option value="Đại học">Đại học</option>
                                                        <option value="Thạc sĩ">Thạc sĩ</option>
                                                        <option value="Tiến sĩ">Tiến sĩ</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Kỹ Năng */}
                                            <div className="send-recruitment-info-form-group">
                                                <label className="send-recruitment-info-label">
                                                    Kỹ Năng
                                                </label>
                                                <input
                                                    type="text"
                                                    className="send-recruitment-info-input"
                                                    value={recruitmentInfoForm.kyNang}
                                                    onChange={(e) => setRecruitmentInfoForm({ ...recruitmentInfoForm, kyNang: e.target.value })}
                                                    placeholder="Nhập các kỹ năng yêu cầu (cách nhau bằng dấu phẩy)"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cột Phải */}
                                    <div className="send-recruitment-info-form-right">
                                        {/* Section 3: Đề Xuất Ngân Sách & Phúc Lợi */}
                                        <div className="send-recruitment-info-section">
                                            <h3 className="send-recruitment-info-section-title">C. Đề Xuất Ngân Sách & Phúc Lợi</h3>

                                            {/* Mức Lương Gộp */}
                                            <div className="send-recruitment-info-form-group">
                                                <label className="send-recruitment-info-label">
                                                    Mức Lương Gộp (Gross)
                                                </label>
                                                <div className="send-recruitment-info-salary-group">
                                                    <div className="send-recruitment-info-salary-item">
                                                        <label className="send-recruitment-info-salary-label">
                                                            Trong thời gian thử việc:
                                                        </label>
                                                        <div className="send-recruitment-info-salary-input-wrapper">
                                                            <input
                                                                type="number"
                                                                className="send-recruitment-info-input"
                                                                value={recruitmentInfoForm.luongThuViec}
                                                                onChange={(e) => setRecruitmentInfoForm({ ...recruitmentInfoForm, luongThuViec: e.target.value })}
                                                                placeholder="0"
                                                                min="0"
                                                            />
                                                            <span className="send-recruitment-info-currency">VNĐ/tháng</span>
                                                        </div>
                                                        {recruitmentInfoForm.luongThuViec && (
                                                            <div className="send-recruitment-info-vnd-block">
                                                                <span className="send-recruitment-info-vnd-value">
                                                                    {parseInt(recruitmentInfoForm.luongThuViec).toLocaleString('vi-VN')}
                                                                </span>
                                                                <span className="send-recruitment-info-vnd-unit">VNĐ/tháng</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="send-recruitment-info-salary-item">
                                                        <label className="send-recruitment-info-salary-label">
                                                            Sau thời gian thử việc:
                                                        </label>
                                                        <div className="send-recruitment-info-salary-input-wrapper">
                                                            <input
                                                                type="number"
                                                                className="send-recruitment-info-input"
                                                                value={recruitmentInfoForm.luongSauThuViec}
                                                                onChange={(e) => setRecruitmentInfoForm({ ...recruitmentInfoForm, luongSauThuViec: e.target.value })}
                                                                placeholder="0"
                                                                min="0"
                                                            />
                                                            <span className="send-recruitment-info-currency">VNĐ/tháng</span>
                                                        </div>
                                                        {recruitmentInfoForm.luongSauThuViec && (
                                                            <div className="send-recruitment-info-vnd-block send-recruitment-info-vnd-block-highlight">
                                                                <span className="send-recruitment-info-vnd-value">
                                                                    {parseInt(recruitmentInfoForm.luongSauThuViec).toLocaleString('vi-VN')}
                                                                </span>
                                                                <span className="send-recruitment-info-vnd-unit">VNĐ/tháng</span>
                                                            </div>
                                                        )}
                                                        <p className="send-recruitment-info-note-text">
                                                            Trong đó 80% là mức lương cơ bản và 20% là phụ cấp lương.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Thuế & Bảo hiểm */}
                                            <div className="send-recruitment-info-form-group">
                                                <label className="send-recruitment-info-label">
                                                    Thuế & Bảo hiểm
                                                </label>
                                                <div className="send-recruitment-info-readonly-text">
                                                    Hàng tháng nhân viên có nghĩa vụ nộp thuế thu nhập cá nhân theo Luật định. Nếu đạt yêu cầu qua thử việc và được ký Hợp đồng lao động, Anh/Chị có nghĩa vụ tham gia BHXH, BHYT, BH thất nghiệp được trích từ tiền lương theo Luật định.
                                                </div>
                                            </div>

                                            {/* Chính sách Phụ cấp */}
                                            <div className="send-recruitment-info-form-group">
                                                <label className="send-recruitment-info-label">
                                                    Chính sách Phụ cấp
                                                </label>
                                                <div className="send-recruitment-info-allowance-grid">
                                                    <div className="send-recruitment-info-allowance-item">
                                                        <label className="send-recruitment-info-allowance-label">
                                                            Hỗ trợ cơm trưa:
                                                        </label>
                                                        <div className="send-recruitment-info-allowance-input-wrapper">
                                                            <input
                                                                type="number"
                                                                className="send-recruitment-info-input"
                                                                value={recruitmentInfoForm.hoTroComTrua}
                                                                onChange={(e) => setRecruitmentInfoForm({ ...recruitmentInfoForm, hoTroComTrua: e.target.value })}
                                                                placeholder="0"
                                                                min="0"
                                                            />
                                                            <span className="send-recruitment-info-currency">VNĐ/ngày làm việc</span>
                                                        </div>
                                                        {recruitmentInfoForm.hoTroComTrua && (
                                                            <div className="send-recruitment-info-vnd-block">
                                                                <span className="send-recruitment-info-vnd-value">
                                                                    {parseInt(recruitmentInfoForm.hoTroComTrua).toLocaleString('vi-VN')}
                                                                </span>
                                                                <span className="send-recruitment-info-vnd-unit">VNĐ/ngày làm việc</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="send-recruitment-info-allowance-item">
                                                        <label className="send-recruitment-info-allowance-label">
                                                            Hỗ trợ đi lại:
                                                        </label>
                                                        <div className="send-recruitment-info-allowance-input-wrapper">
                                                            <input
                                                                type="number"
                                                                className="send-recruitment-info-input"
                                                                value={recruitmentInfoForm.hoTroDiLai}
                                                                onChange={(e) => setRecruitmentInfoForm({ ...recruitmentInfoForm, hoTroDiLai: e.target.value })}
                                                                placeholder="0"
                                                                min="0"
                                                            />
                                                            <span className="send-recruitment-info-currency">VNĐ/ngày làm việc</span>
                                                        </div>
                                                        {recruitmentInfoForm.hoTroDiLai && (
                                                            <div className="send-recruitment-info-vnd-block">
                                                                <span className="send-recruitment-info-vnd-value">
                                                                    {parseInt(recruitmentInfoForm.hoTroDiLai).toLocaleString('vi-VN')}
                                                                </span>
                                                                <span className="send-recruitment-info-vnd-unit">VNĐ/ngày làm việc</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="send-recruitment-info-allowance-item">
                                                        <label className="send-recruitment-info-allowance-label">
                                                            Phụ cấp tiền cơm:
                                                        </label>
                                                        <div className="send-recruitment-info-allowance-input-wrapper">
                                                            <input
                                                                type="number"
                                                                className="send-recruitment-info-input"
                                                                value={recruitmentInfoForm.phuCapTienCom}
                                                                onChange={(e) => setRecruitmentInfoForm({ ...recruitmentInfoForm, phuCapTienCom: e.target.value })}
                                                                placeholder="0"
                                                                min="0"
                                                            />
                                                            <span className="send-recruitment-info-currency">VNĐ/ngày làm việc</span>
                                                        </div>
                                                        {recruitmentInfoForm.phuCapTienCom && (
                                                            <div className="send-recruitment-info-vnd-block">
                                                                <span className="send-recruitment-info-vnd-value">
                                                                    {parseInt(recruitmentInfoForm.phuCapTienCom).toLocaleString('vi-VN')}
                                                                </span>
                                                                <span className="send-recruitment-info-vnd-unit">VNĐ/ngày làm việc</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="send-recruitment-info-allowance-item">
                                                        <label className="send-recruitment-info-allowance-label">
                                                            Phụ cấp điện thoại:
                                                        </label>
                                                        <div className="send-recruitment-info-allowance-input-wrapper">
                                                            <input
                                                                type="number"
                                                                className="send-recruitment-info-input"
                                                                value={recruitmentInfoForm.phuCapDienThoai}
                                                                onChange={(e) => setRecruitmentInfoForm({ ...recruitmentInfoForm, phuCapDienThoai: e.target.value })}
                                                                placeholder="0"
                                                                min="0"
                                                            />
                                                            <span className="send-recruitment-info-currency">VNĐ/tháng</span>
                                                        </div>
                                                        {recruitmentInfoForm.phuCapDienThoai && (
                                                            <div className="send-recruitment-info-vnd-block">
                                                                <span className="send-recruitment-info-vnd-value">
                                                                    {parseInt(recruitmentInfoForm.phuCapDienThoai).toLocaleString('vi-VN')}
                                                                </span>
                                                                <span className="send-recruitment-info-vnd-unit">VNĐ/tháng (thẻ điện thoại)</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="send-recruitment-info-modal-footer">
                            <button
                                type="button"
                                className="send-recruitment-info-modal-btn send-recruitment-info-modal-btn-export"
                                onClick={handleExportPDF}
                            >
                                Xuất PDF
                            </button>
                            <div style={{ display: 'flex', gap: '0.75rem', marginLeft: 'auto' }}>
                                <button
                                    type="button"
                                    className="send-recruitment-info-modal-btn send-recruitment-info-modal-btn-preview"
                                    onClick={() => {
                                        setShowRecruitmentInfoPreview(true);
                                    }}
                                >
                                    Xem Trước Toàn Bộ Đề Xuất
                                </button>
                                <button
                                    type="button"
                                    className="send-recruitment-info-modal-btn send-recruitment-info-modal-btn-send"
                                    onClick={() => {
                                        setShowStartProbationModal(true);
                                    }}
                                >
                                    Bắt đầu thử việc
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Recruitment Info Modal */}
            {showRecruitmentInfoPreview && (
                <div className="recruitment-info-preview-modal-overlay" onClick={() => setShowRecruitmentInfoPreview(false)}>
                    <div className="recruitment-info-preview-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="recruitment-info-preview-modal-header">
                            <div>
                                <h2 className="recruitment-info-preview-modal-title">Xem Trước Đề Xuất Tuyển Dụng</h2>
                                <p className="recruitment-info-preview-modal-subtitle">Kiểm tra lại thông tin trước khi gửi yêu cầu</p>
                            </div>
                            <button
                                type="button"
                                className="recruitment-info-preview-modal-close"
                                onClick={() => setShowRecruitmentInfoPreview(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="recruitment-info-preview-modal-body">
                            {/* Section A: Thông Tin Vị Trí & Tổ Chức */}
                            <div className="recruitment-info-preview-section">
                                <h3 className="recruitment-info-preview-section-title">A. Thông Tin Vị Trí & Tổ Chức</h3>
                                <div className="recruitment-info-preview-grid">
                                    <div className="recruitment-info-preview-item">
                                        <label className="recruitment-info-preview-label">Chức danh:</label>
                                        <span className="recruitment-info-preview-value">{recruitmentInfoForm.chucDanh || '---'}</span>
                                    </div>
                                    <div className="recruitment-info-preview-item">
                                        <label className="recruitment-info-preview-label">Cấp Bậc:</label>
                                        <span className="recruitment-info-preview-value">{recruitmentInfoForm.capBac || '---'}</span>
                                    </div>
                                    <div className="recruitment-info-preview-item">
                                        <label className="recruitment-info-preview-label">Người báo cáo trực tiếp:</label>
                                        <span className="recruitment-info-preview-value">
                                            {recruitmentInfoForm.baoCaoTrucTiep
                                                ? managers.find(m => m.id === parseInt(recruitmentInfoForm.baoCaoTrucTiep))?.ho_ten || managers.find(m => m.id === parseInt(recruitmentInfoForm.baoCaoTrucTiep))?.hoTen || '---'
                                                : '---'}
                                        </span>
                                    </div>
                                    <div className="recruitment-info-preview-item">
                                        <label className="recruitment-info-preview-label">Người báo cáo gián tiếp:</label>
                                        <span className="recruitment-info-preview-value">
                                            {recruitmentInfoForm.baoCaoGianTiep
                                                ? managers.find(m => m.id === parseInt(recruitmentInfoForm.baoCaoGianTiep))?.ho_ten || managers.find(m => m.id === parseInt(recruitmentInfoForm.baoCaoGianTiep))?.hoTen || '---'
                                                : '---'}
                                        </span>
                                    </div>
                                    <div className="recruitment-info-preview-item">
                                        <label className="recruitment-info-preview-label">Địa điểm làm việc:</label>
                                        <span className="recruitment-info-preview-value">{recruitmentInfoForm.diaDiemLamViec || '---'}</span>
                                    </div>
                                    <div className="recruitment-info-preview-item">
                                        <label className="recruitment-info-preview-label">Ngày bắt đầu (Dự kiến):</label>
                                        <span className="recruitment-info-preview-value">{recruitmentInfoForm.ngayBatDauLamViec || '---'}</span>
                                    </div>
                                    <div className="recruitment-info-preview-item">
                                        <label className="recruitment-info-preview-label">Thời gian thử việc:</label>
                                        <span className="recruitment-info-preview-value">{recruitmentInfoForm.thoiGianThuViec || '---'}</span>
                                    </div>
                                    <div className="recruitment-info-preview-item">
                                        <label className="recruitment-info-preview-label">Thời gian làm việc:</label>
                                        <span className="recruitment-info-preview-value">{recruitmentInfoForm.thoiGianLamViec || '---'}</span>
                                    </div>
                                    <div className="recruitment-info-preview-item">
                                        <label className="recruitment-info-preview-label">Lý do tuyển dụng:</label>
                                        <span className="recruitment-info-preview-value">{recruitmentInfoForm.lyDoTuyenDung || '---'}</span>
                                    </div>
                                    <div className="recruitment-info-preview-item">
                                        <label className="recruitment-info-preview-label">Số lượng cần tuyển:</label>
                                        <span className="recruitment-info-preview-value recruitment-info-preview-highlight">{recruitmentInfoForm.soLuongCanTuyen || '---'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section B: Công Việc Chính & Yêu Cầu */}
                            <div className="recruitment-info-preview-section">
                                <h3 className="recruitment-info-preview-section-title">B. Công Việc Chính & Yêu Cầu</h3>

                                {/* Công Việc Chính */}
                                <div className="recruitment-info-preview-item-full">
                                    <label className="recruitment-info-preview-label">Công Việc Chính:</label>
                                    <div className="recruitment-info-preview-work-list">
                                        {recruitmentInfoForm.congViecChinh.filter(cv => cv.trim()).map((cv, index) => (
                                            <div key={index} className="recruitment-info-preview-work-item">
                                                <span className="recruitment-info-preview-work-number">{String.fromCharCode(97 + index)}.</span>
                                                <span className="recruitment-info-preview-work-text">{cv}</span>
                                            </div>
                                        ))}
                                        {recruitmentInfoForm.congViecChinh.filter(cv => cv.trim()).length === 0 && (
                                            <span className="recruitment-info-preview-value">---</span>
                                        )}
                                    </div>
                                </div>

                                <div className="recruitment-info-preview-grid">
                                    <div className="recruitment-info-preview-item">
                                        <label className="recruitment-info-preview-label">Kinh nghiệm:</label>
                                        <span className="recruitment-info-preview-value">{recruitmentInfoForm.kinhNghiem || '---'}</span>
                                    </div>
                                    <div className="recruitment-info-preview-item">
                                        <label className="recruitment-info-preview-label">Học vấn tối thiểu:</label>
                                        <span className="recruitment-info-preview-value">{recruitmentInfoForm.hocVanToiThieu || '---'}</span>
                                    </div>
                                </div>

                                <div className="recruitment-info-preview-item-full">
                                    <label className="recruitment-info-preview-label">Kỹ Năng:</label>
                                    <span className="recruitment-info-preview-value">{recruitmentInfoForm.kyNang || '---'}</span>
                                </div>
                            </div>

                            {/* Section C: Đề Xuất Ngân Sách & Phúc Lợi */}
                            <div className="recruitment-info-preview-section">
                                <h3 className="recruitment-info-preview-section-title">C. Đề Xuất Ngân Sách & Phúc Lợi</h3>

                                {/* Mức Lương Gộp */}
                                <div className="recruitment-info-preview-item-full">
                                    <label className="recruitment-info-preview-label">Mức lương gộp hàng tháng (gross):</label>
                                    <div className="recruitment-info-preview-salary-group">
                                        <div className="recruitment-info-preview-salary-item">
                                            <label className="recruitment-info-preview-salary-label">Trong thời gian thử việc:</label>
                                            <div className="recruitment-info-preview-vnd-block">
                                                <span className="recruitment-info-preview-vnd-value">
                                                    {recruitmentInfoForm.luongThuViec ? parseInt(recruitmentInfoForm.luongThuViec).toLocaleString('vi-VN') : '---'}
                                                </span>
                                                <span className="recruitment-info-preview-vnd-unit">VNĐ/tháng</span>
                                            </div>
                                        </div>
                                        <div className="recruitment-info-preview-salary-item">
                                            <label className="recruitment-info-preview-salary-label">Sau thời gian thử việc:</label>
                                            <div className="recruitment-info-preview-vnd-block recruitment-info-preview-vnd-block-highlight">
                                                <span className="recruitment-info-preview-vnd-value">
                                                    {recruitmentInfoForm.luongSauThuViec ? parseInt(recruitmentInfoForm.luongSauThuViec).toLocaleString('vi-VN') : '---'}
                                                </span>
                                                <span className="recruitment-info-preview-vnd-unit">VNĐ/tháng</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="recruitment-info-preview-note">Trong đó 80% là mức lương cơ bản và 20% là phụ cấp lương.</p>
                                </div>

                                {/* Thuế & Bảo hiểm */}
                                <div className="recruitment-info-preview-item-full">
                                    <label className="recruitment-info-preview-label">Thuế thu nhập cá nhân và bảo hiểm bắt buộc:</label>
                                    <div className="recruitment-info-preview-readonly-text">
                                        Hàng tháng nhân viên có nghĩa vụ nộp thuế thu nhập cá nhân theo Luật định. Nếu đạt yêu cầu qua thử việc và được ký Hợp đồng lao động, Anh/Chị có nghĩa vụ tham gia BHXH, BHYT, BH thất nghiệp được trích từ tiền lương theo Luật định.
                                    </div>
                                </div>

                                {/* Chính sách Phụ cấp */}
                                <div className="recruitment-info-preview-item-full">
                                    <label className="recruitment-info-preview-label">Chính sách phụ cấp:</label>
                                    <div className="recruitment-info-preview-allowance-grid">
                                        <div className="recruitment-info-preview-allowance-item">
                                            <label className="recruitment-info-preview-allowance-label">Hỗ trợ cơm trưa:</label>
                                            <div className="recruitment-info-preview-vnd-block">
                                                <span className="recruitment-info-preview-vnd-value">
                                                    {recruitmentInfoForm.hoTroComTrua ? parseInt(recruitmentInfoForm.hoTroComTrua).toLocaleString('vi-VN') : '---'}
                                                </span>
                                                <span className="recruitment-info-preview-vnd-unit">VNĐ/ngày làm việc</span>
                                            </div>
                                        </div>
                                        <div className="recruitment-info-preview-allowance-item">
                                            <label className="recruitment-info-preview-allowance-label">Hỗ trợ đi lại:</label>
                                            <div className="recruitment-info-preview-vnd-block">
                                                <span className="recruitment-info-preview-vnd-value">
                                                    {recruitmentInfoForm.hoTroDiLai ? parseInt(recruitmentInfoForm.hoTroDiLai).toLocaleString('vi-VN') : '---'}
                                                </span>
                                                <span className="recruitment-info-preview-vnd-unit">VNĐ/ngày làm việc</span>
                                            </div>
                                        </div>
                                        <div className="recruitment-info-preview-allowance-item">
                                            <label className="recruitment-info-preview-allowance-label">Phụ cấp tiền cơm:</label>
                                            <div className="recruitment-info-preview-vnd-block">
                                                <span className="recruitment-info-preview-vnd-value">
                                                    {recruitmentInfoForm.phuCapTienCom ? parseInt(recruitmentInfoForm.phuCapTienCom).toLocaleString('vi-VN') : '---'}
                                                </span>
                                                <span className="recruitment-info-preview-vnd-unit">VNĐ/ngày làm việc</span>
                                            </div>
                                        </div>
                                        <div className="recruitment-info-preview-allowance-item">
                                            <label className="recruitment-info-preview-allowance-label">Phụ cấp điện thoại:</label>
                                            <div className="recruitment-info-preview-vnd-block">
                                                <span className="recruitment-info-preview-vnd-value">
                                                    {recruitmentInfoForm.phuCapDienThoai ? parseInt(recruitmentInfoForm.phuCapDienThoai).toLocaleString('vi-VN') : '---'}
                                                </span>
                                                <span className="recruitment-info-preview-vnd-unit">VNĐ/tháng (thẻ điện thoại)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="recruitment-info-preview-modal-footer">
                            <button
                                type="button"
                                className="recruitment-info-preview-modal-btn recruitment-info-preview-modal-btn-close"
                                onClick={() => setShowRecruitmentInfoPreview(false)}
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                className="recruitment-info-preview-modal-btn recruitment-info-preview-modal-btn-send"
                                onClick={() => {
                                    setShowRecruitmentInfoPreview(false);
                                    setShowStartProbationModal(true);
                                }}
                            >
                                Bắt đầu thử việc
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Start Probation Modal */}
            {showStartProbationModal && (
                <div className="start-probation-modal-overlay" onClick={() => setShowStartProbationModal(false)}>
                    <div className="start-probation-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="start-probation-modal-header">
                            <h2 className="start-probation-modal-title">Bắt đầu thử việc</h2>
                            <button
                                type="button"
                                className="start-probation-modal-close"
                                onClick={() => setShowStartProbationModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="start-probation-modal-body">
                            <div className="start-probation-form-group">
                                <label className="start-probation-label">
                                    Chọn ngày bắt đầu thử việc <span className="required">*</span>
                                </label>
                                <input
                                    type="date"
                                    className="start-probation-input"
                                    value={probationStartDate}
                                    onChange={(e) => setProbationStartDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    required
                                />
                                <p className="start-probation-note">
                                    Thời gian thử việc: 45 ngày (kể từ ngày bắt đầu)
                                </p>
                            </div>
                            {viewingCandidate && (
                                <div className="start-probation-candidate-info">
                                    <p><strong>Ứng viên:</strong> {viewingCandidate.ho_ten || viewingCandidate.hoTen}</p>
                                    <p><strong>Vị trí:</strong> {recruitmentInfoForm.chucDanh || viewingCandidate.vi_tri_ung_tuyen || viewingCandidate.viTriUngTuyen || '---'}</p>
                                </div>
                            )}
                        </div>
                        <div className="start-probation-modal-footer">
                            <button
                                type="button"
                                className="start-probation-modal-btn start-probation-modal-btn-cancel"
                                onClick={() => setShowStartProbationModal(false)}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="start-probation-modal-btn start-probation-modal-btn-confirm"
                                onClick={async () => {
                                    if (!probationStartDate) {
                                        if (showToast) {
                                            showToast('Vui lòng chọn ngày bắt đầu thử việc', 'error');
                                        }
                                        return;
                                    }

                                    if (!viewingCandidate?.id) {
                                        if (showToast) {
                                            showToast('Không tìm thấy thông tin ứng viên', 'error');
                                        }
                                        return;
                                    }

                                    try {
                                        // Call API to start probation
                                        const response = await candidatesAPI.startProbation(viewingCandidate.id, {
                                            startDate: probationStartDate,
                                            recruitmentInfo: recruitmentInfoForm
                                        });

                                        if (response.data?.success) {
                                            if (showToast) {
                                                showToast('Bắt đầu thử việc thành công! Ứng viên đã được chuyển sang danh sách thử việc.', 'success');
                                            }
                                            setShowStartProbationModal(false);
                                            setShowSendRecruitmentInfoModal(false);
                                            setShowRecruitmentInfoPreview(false);
                                            setProbationStartDate('');
                                            // Refresh candidate list
                                            fetchCandidates(false);
                                        } else {
                                            if (showToast) {
                                                showToast(response.data?.message || 'Có lỗi xảy ra khi bắt đầu thử việc', 'error');
                                            }
                                        }
                                    } catch (error) {
                                        console.error('Error starting probation:', error);
                                        if (showToast) {
                                            showToast('Có lỗi xảy ra khi bắt đầu thử việc', 'error');
                                        }
                                    }
                                }}
                            >
                                Xác nhận
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

export default RecruitmentManagement;

