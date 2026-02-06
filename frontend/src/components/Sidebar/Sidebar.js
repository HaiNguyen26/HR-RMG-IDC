import React, { useEffect, useState } from 'react';
import { employeesAPI, leaveRequestsAPI, overtimeRequestsAPI, attendanceAdjustmentsAPI, recruitmentRequestsAPI, customerEntertainmentExpensesAPI, travelExpensesAPI, mealAllowanceRequestsAPI, lateEarlyRequestsAPI } from '../../services/api';
import './Sidebar.css';

const Sidebar = ({ currentView, onNavigate, onAddEmployee, currentUser, onLogout, onChangePassword, isOpen = false, onClose }) => {
    const [managerAccessResolved, setManagerAccessResolved] = useState(false);
    const [canApproveFromManagerLookup, setCanApproveFromManagerLookup] = useState(false);
    const [isIndirectManager, setIsIndirectManager] = useState(false);
    const [pendingLeaveApprovalsCount, setPendingLeaveApprovalsCount] = useState(0);
    const [interviewAccessResolved, setInterviewAccessResolved] = useState(false);
    const [hasInterviewAccess, setHasInterviewAccess] = useState(false);
    const [pendingRecruitmentCount, setPendingRecruitmentCount] = useState(0);
    const [isBranchDirectorForRecruitment, setIsBranchDirectorForRecruitment] = useState(false);
    const [pendingExpenseApprovalCount, setPendingExpenseApprovalCount] = useState(0);
    const [pendingExpenseCeoCount, setPendingExpenseCeoCount] = useState(0);
    const [pendingTravelExpenseApprovalCount, setPendingTravelExpenseApprovalCount] = useState(0);
    const [pendingTravelExpenseManagementCount, setPendingTravelExpenseManagementCount] = useState(0); // PENDING_SETTLEMENT
    const [pendingTravelExpenseAdvanceProcessingCount, setPendingTravelExpenseAdvanceProcessingCount] = useState(0); // PENDING_FINANCE with advance_status = PENDING_ACCOUNTANT
    const [returnedOrRejectedSettlementCount, setReturnedOrRejectedSettlementCount] = useState(0); // RETURNED hoặc REJECTED

    useEffect(() => {
        let isMounted = true;

        const resolveManagerAccess = async () => {
            if (!currentUser?.id || currentUser?.role !== 'EMPLOYEE') {
                if (isMounted) {
                    setCanApproveFromManagerLookup(false);
                    setManagerAccessResolved(true);
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

                // Lấy danh sách employees để kiểm tra quản lý trực tiếp
                const employeesResponse = await employeesAPI.getAll();
                const employees = employeesResponse.data?.data || [];

                const currentUserName = (currentUser.hoTen || currentUser.username || '').trim();
                const normalizedCurrentName = currentUserName.toLowerCase().replace(/\s+/g, ' ').trim();
                const normalizedCurrentNameNoAccents = removeVietnameseAccents(normalizedCurrentName);
                const currentUserChiNhanh = (currentUser.chiNhanh || currentUser.chi_nhanh || '').trim();

                // Normalize chi_nhanh của currentUser
                const normalizeChiNhanh = (chiNhanh) => {
                    if (!chiNhanh) return null;
                    return removeVietnameseAccents(chiNhanh.trim().toLowerCase());
                };
                const normalizedCurrentUserChiNhanh = currentUserChiNhanh ? normalizeChiNhanh(currentUserChiNhanh) : null;

                // Helper function để check match chi_nhanh
                const chiNhanhMatches = (empChiNhanh) => {
                    if (!normalizedCurrentUserChiNhanh) return true; // Nếu user không có chi_nhanh, match tất cả (backward compatibility)
                    const normalized = normalizeChiNhanh(empChiNhanh);
                    if (!normalized) return false;

                    // Exact match
                    if (normalized === normalizedCurrentUserChiNhanh) return true;

                    // Partial match: nếu một trong hai chứa phần còn lại
                    if (normalized.includes(normalizedCurrentUserChiNhanh) || normalizedCurrentUserChiNhanh.includes(normalized)) {
                        const words1 = normalized.split(/\s+/).filter(w => w.length > 1);
                        const words2 = normalizedCurrentUserChiNhanh.split(/\s+/).filter(w => w.length > 1);
                        if (words1.length > 0 && words2.length > 0) {
                            const hasCommonWord = words1.some(w1 => words2.some(w2 => w1 === w2));
                            return hasCommonWord;
                        }
                    }

                    return false;
                };

                // Kiểm tra xem có nhân viên nào có quan_ly_truc_tiep trùng với tên user hiện tại không
                // QUAN TRỌNG: Phải match cả tên VÀ chi_nhanh để tránh nhầm lẫn khi có nhiều người cùng tên
                const matchingEmployees = [];
                employees.forEach((emp) => {
                    if (!emp.quan_ly_truc_tiep) return;
                    const managerName = (emp.quan_ly_truc_tiep || '').trim();
                    const normalizedManagerName = managerName.toLowerCase().replace(/\s+/g, ' ').trim();
                    const normalizedManagerNameNoAccents = removeVietnameseAccents(normalizedManagerName);

                    // Match exact (có dấu)
                    if (normalizedManagerName === normalizedCurrentName) {
                        matchingEmployees.push({ emp, managerName });
                        return;
                    }

                    // Match exact (không dấu)
                    if (normalizedManagerNameNoAccents === normalizedCurrentNameNoAccents) {
                        matchingEmployees.push({ emp, managerName });
                        return;
                    }

                    // Fuzzy match (contains)
                    if (normalizedManagerName.includes(normalizedCurrentName) || normalizedCurrentName.includes(normalizedManagerName)) {
                        matchingEmployees.push({ emp, managerName });
                        return;
                    }

                    if (normalizedManagerNameNoAccents.includes(normalizedCurrentNameNoAccents) || normalizedCurrentNameNoAccents.includes(normalizedManagerNameNoAccents)) {
                        matchingEmployees.push({ emp, managerName });
                        return;
                    }
                });

                // Nếu có nhiều nhân viên có quan_ly_truc_tiep trùng tên với user hiện tại, 
                // PHẢI check chi_nhanh để đảm bảo đúng người
                let isTeamLead = false;
                if (matchingEmployees.length === 0) {
                    isTeamLead = false;
                } else if (matchingEmployees.length === 1) {
                    // Chỉ có 1 nhân viên match tên, và có chi_nhanh của nhân viên đó
                    // Nếu user có chi_nhanh, phải match; nếu không, cho phép (backward compatibility)
                    if (normalizedCurrentUserChiNhanh) {
                        isTeamLead = chiNhanhMatches(matchingEmployees[0].emp.chi_nhanh);
                    } else {
                        isTeamLead = true; // Backward compatibility: nếu user không có chi_nhanh, cho phép
                    }
                } else {
                    // Có nhiều nhân viên cùng tên quan lý
                    // CHỈ match nếu chi_nhanh của nhân viên KHỚP với chi_nhanh của user hiện tại
                    if (normalizedCurrentUserChiNhanh) {
                        // Tìm nhân viên có chi_nhanh match
                        const matchingByBranch = matchingEmployees.find(({ emp }) => chiNhanhMatches(emp.chi_nhanh));
                        isTeamLead = !!matchingByBranch;
                    } else {
                        // Nếu user không có chi_nhanh nhưng có nhiều nhân viên cùng tên, không cho phép để tránh nhầm lẫn
                        console.warn(`[Sidebar] ⚠️ User "${currentUserName}" matches ${matchingEmployees.length} employees as manager but user has no chi_nhanh. Denying access to avoid confusion.`);
                        isTeamLead = false;
                    }
                }

                // Kiểm tra quản lý gián tiếp: có nhân viên nào có quan_ly_gian_tiep trùng với tên user hiện tại không
                const matchingIndirectEmployees = [];
                employees.forEach((emp) => {
                    if (!emp.quan_ly_gian_tiep) return;
                    const indirectManagerName = (emp.quan_ly_gian_tiep || '').trim();
                    const normalizedIndirectManagerName = indirectManagerName.toLowerCase().replace(/\s+/g, ' ').trim();
                    const normalizedIndirectManagerNameNoAccents = removeVietnameseAccents(normalizedIndirectManagerName);

                    // Match exact (có dấu)
                    if (normalizedIndirectManagerName === normalizedCurrentName) {
                        matchingIndirectEmployees.push({ emp, indirectManagerName });
                        return;
                    }

                    // Match exact (không dấu)
                    if (normalizedIndirectManagerNameNoAccents === normalizedCurrentNameNoAccents) {
                        matchingIndirectEmployees.push({ emp, indirectManagerName });
                        return;
                    }

                    // Fuzzy match (contains)
                    if (normalizedIndirectManagerName.includes(normalizedCurrentName) || normalizedCurrentName.includes(normalizedIndirectManagerName)) {
                        matchingIndirectEmployees.push({ emp, indirectManagerName });
                        return;
                    }

                    if (normalizedIndirectManagerNameNoAccents.includes(normalizedCurrentNameNoAccents) || normalizedCurrentNameNoAccents.includes(normalizedIndirectManagerNameNoAccents)) {
                        matchingIndirectEmployees.push({ emp, indirectManagerName });
                        return;
                    }
                });

                // Xác định quản lý gián tiếp tương tự như quản lý trực tiếp
                let isIndirectManagerFlag = false;
                if (matchingIndirectEmployees.length === 0) {
                    isIndirectManagerFlag = false;
                } else if (matchingIndirectEmployees.length === 1) {
                    if (normalizedCurrentUserChiNhanh) {
                        isIndirectManagerFlag = chiNhanhMatches(matchingIndirectEmployees[0].emp.chi_nhanh);
                    } else {
                        isIndirectManagerFlag = true;
                    }
                } else {
                    if (normalizedCurrentUserChiNhanh) {
                        const matchingByBranch = matchingIndirectEmployees.find(({ emp }) => chiNhanhMatches(emp.chi_nhanh));
                        isIndirectManagerFlag = !!matchingByBranch;
                    } else {
                        console.warn(`[Sidebar] ⚠️ User "${currentUserName}" matches ${matchingIndirectEmployees.length} employees as indirect manager but user has no chi_nhanh. Denying access to avoid confusion.`);
                        isIndirectManagerFlag = false;
                    }
                }

                if (isMounted) {
                    setCanApproveFromManagerLookup(Boolean(isTeamLead));
                    setIsIndirectManager(Boolean(isIndirectManagerFlag));
                    setManagerAccessResolved(true);
                }
            } catch (error) {
                console.error('Error checking manager access:', error);
                if (isMounted) {
                    setCanApproveFromManagerLookup(false);
                    setIsIndirectManager(false);
                    setManagerAccessResolved(true);
                }
            }
        };

        setManagerAccessResolved(false);
        resolveManagerAccess();

        return () => {
            isMounted = false;
        };
    }, [currentUser?.id, currentUser?.role, currentUser?.hoTen, currentUser?.username]);


    // Fetch pending leave approvals count (for team leads and HR)
    useEffect(() => {
        if (!currentUser?.id) {
            setPendingLeaveApprovalsCount(0);
            return;
        }

        const fetchPendingLeaveApprovalsCount = async () => {
            try {
                // Check if user is team lead or HR
                const isTeamLead = canApproveFromManagerLookup || currentUser?.role === 'HR' || currentUser?.role === 'ADMIN';

                if (!isTeamLead) {
                    setPendingLeaveApprovalsCount(0);
                    return;
                }

                const params = {};
                if (currentUser?.role !== 'HR' && currentUser?.role !== 'ADMIN') {
                    params.teamLeadId = currentUser.id;
                }

                // Fetch pending counts for all modules
                const [leaveRes, overtimeRes, attendanceRes, mealAllowanceRes, lateEarlyRes] = await Promise.all([
                    leaveRequestsAPI.getAll({ ...params, status: 'PENDING' }).catch(() => ({ data: { success: false, data: [] } })),
                    overtimeRequestsAPI.getAll({ ...params, status: 'PENDING' }).catch(() => ({ data: { success: false, data: [] } })),
                    attendanceAdjustmentsAPI.getAll({ ...params, status: 'PENDING' }).catch(() => ({ data: { success: false, data: [] } })),
                    mealAllowanceRequestsAPI.getAll({ ...params, status: 'PENDING' }).catch(() => ({ data: { success: false, data: [] } })),
                    lateEarlyRequestsAPI.getAll({ ...params, status: 'PENDING' }).catch(() => ({ data: { success: false, data: [] } }))
                ]);

                const leavePending = leaveRes.data?.success && Array.isArray(leaveRes.data.data) ? leaveRes.data.data.length : 0;
                const overtimePending = overtimeRes.data?.success && Array.isArray(overtimeRes.data.data) ? overtimeRes.data.data.length : 0;
                const attendancePending = attendanceRes.data?.success && Array.isArray(attendanceRes.data.data) ? attendanceRes.data.data.length : 0;
                const mealAllowancePending = mealAllowanceRes.data?.success && Array.isArray(mealAllowanceRes.data.data) ? mealAllowanceRes.data.data.length : 0;
                const lateEarlyPending = lateEarlyRes.data?.success && Array.isArray(lateEarlyRes.data.data) ? lateEarlyRes.data.data.length : 0;

                setPendingLeaveApprovalsCount(leavePending + overtimePending + attendancePending + mealAllowancePending + lateEarlyPending);
            } catch (error) {
                console.error('Error fetching pending leave approvals count:', error);
                setPendingLeaveApprovalsCount(0);
            }
        };

        // Wait for manager access to be resolved
        if (managerAccessResolved) {
            fetchPendingLeaveApprovalsCount();

            // Poll every 5 seconds to update count (reduced from 30s for faster updates)
            const interval = setInterval(fetchPendingLeaveApprovalsCount, 5000);

            // Refresh when window/tab becomes visible
            const handleVisibilityChange = () => {
                if (!document.hidden) {
                    fetchPendingLeaveApprovalsCount();
                }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);

            // Refresh when window gains focus
            const handleFocus = () => {
                fetchPendingLeaveApprovalsCount();
            };
            window.addEventListener('focus', handleFocus);

            return () => {
                clearInterval(interval);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                window.removeEventListener('focus', handleFocus);
            };
        }
    }, [currentUser, canApproveFromManagerLookup, managerAccessResolved]);

    // Kiểm tra quyền truy cập module Phỏng vấn & duyệt ứng viên
    useEffect(() => {
        let isMounted = true;

        const checkInterviewAccess = async () => {
            if (!currentUser?.id) {
                if (isMounted) {
                    setHasInterviewAccess(false);
                    setInterviewAccessResolved(true);
                }
                return;
            }

            // Chỉ ADMIN có quyền truy cập (HR không cần module này)
            if (currentUser.role === 'ADMIN') {
                if (isMounted) {
                    setHasInterviewAccess(true);
                    setInterviewAccessResolved(true);
                }
                return;
            }

            // HR không có quyền truy cập
            if (currentUser.role === 'HR') {
                if (isMounted) {
                    setHasInterviewAccess(false);
                    setInterviewAccessResolved(true);
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

                // Lấy danh sách employees từ API để kiểm tra quản lý trực tiếp và giám đốc chi nhánh
                const employeesResponse = await employeesAPI.getAll();
                const employees = employeesResponse.data?.data || [];

                const currentUserName = (currentUser.hoTen || currentUser.username || '').trim();
                const normalizedCurrentName = currentUserName.toLowerCase().replace(/\s+/g, ' ').trim();
                const normalizedCurrentNameNoAccents = removeVietnameseAccents(normalizedCurrentName);

                // Kiểm tra quản lý trực tiếp: có nhân viên nào có quan_ly_truc_tiep trùng với tên user hiện tại không
                const isDirectManager = employees.some((emp) => {
                    if (!emp.quan_ly_truc_tiep) return false;
                    const managerName = (emp.quan_ly_truc_tiep || '').trim();
                    const normalizedManagerName = managerName.toLowerCase().replace(/\s+/g, ' ').trim();
                    const normalizedManagerNameNoAccents = removeVietnameseAccents(normalizedManagerName);

                    if (normalizedManagerName === normalizedCurrentName) return true;
                    if (normalizedManagerNameNoAccents === normalizedCurrentNameNoAccents) return true;
                    if (normalizedManagerName.includes(normalizedCurrentName) || normalizedCurrentName.includes(normalizedManagerName)) return true;
                    if (normalizedManagerNameNoAccents.includes(normalizedCurrentNameNoAccents) || normalizedCurrentNameNoAccents.includes(normalizedManagerNameNoAccents)) return true;
                    return false;
                });

                // Kiểm tra giám đốc chi nhánh: Danh sách giám đốc chi nhánh cụ thể
                const allowedBranchDirectors = [
                    'châu quang hải',
                    'chau quang hai',
                    'nguyễn ngọc luyễn',
                    'nguyen ngoc luyen',
                    'nguyễn văn khải',
                    'nguyen van khai',
                    'huỳnh phúc văn',
                    'huynh phuc van'
                ];

                const isBranchDir = allowedBranchDirectors.some(name =>
                    normalizedCurrentName.includes(name) ||
                    normalizedCurrentNameNoAccents.includes(removeVietnameseAccents(name))
                );

                const hasAccess = isDirectManager || isBranchDir;

                if (isMounted) {
                    setHasInterviewAccess(hasAccess);
                    setIsBranchDirectorForRecruitment(isBranchDir);
                    setInterviewAccessResolved(true);
                }
            } catch (error) {
                console.error('Error checking interview access:', error);
                if (isMounted) {
                    setHasInterviewAccess(false);
                    setIsBranchDirectorForRecruitment(false);
                    setInterviewAccessResolved(true);
                }
            }
        };

        setInterviewAccessResolved(false);
        checkInterviewAccess();

        return () => {
            isMounted = false;
        };
    }, [currentUser?.id, currentUser?.role, currentUser?.hoTen, currentUser?.username]);

    // Fetch pending recruitment requests count for branch directors
    useEffect(() => {
        if (!isBranchDirectorForRecruitment || !currentUser?.id) {
            setPendingRecruitmentCount(0);
            return;
        }

        const fetchPendingCount = async () => {
            try {
                const response = await recruitmentRequestsAPI.getAll({
                    branchDirectorId: currentUser.id,
                    status: 'PENDING'
                });
                setPendingRecruitmentCount(response.data?.data?.length || 0);
            } catch (error) {
                console.error('Error fetching pending recruitment count:', error);
            }
        };

        fetchPendingCount();
        // Refresh every 30 seconds
        const interval = setInterval(fetchPendingCount, 30000);
        return () => clearInterval(interval);
    }, [isBranchDirectorForRecruitment, currentUser?.id]);

    // Fetch pending entertainment expense approvals for branch directors
    useEffect(() => {
        if (!currentUser?.id) {
            setPendingExpenseApprovalCount(0);
            return;
        }

        // Check if user is allowed branch director (will be calculated below)
        const currentUserName = (currentUser?.hoTen || currentUser?.username || '').trim();
        const normalizedCurrentName = currentUserName.toLowerCase();

        const removeAccents = (str) => {
            if (!str) return '';
            return str
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/Đ/g, 'D');
        };

        const normalizedCurrentNameNoAccents = removeAccents(normalizedCurrentName);

        const allowedBranchDirectors = [
            'châu quang hải',
            'chau quang hai',
            'nguyễn ngọc luyễn',
            'nguyen ngoc luyen',
            'nguyễn văn khải',
            'nguyen van khai',
            'huỳnh phúc văn',
            'huynh phuc van'
        ];

        const isAllowedBD = allowedBranchDirectors.some(name =>
            normalizedCurrentName.includes(name) ||
            normalizedCurrentNameNoAccents.includes(removeAccents(name))
        );

        // Check if user is Hoàng Đình Sạch (direct manager)
        const isHoangDinhSach = (
            normalizedCurrentName.includes('hoàng đình sạch') ||
            normalizedCurrentName.includes('hoang dinh sach') ||
            normalizedCurrentNameNoAccents.includes('hoang dinh sach') ||
            (normalizedCurrentName.includes('hoàng đình') && normalizedCurrentName.includes('sạch')) ||
            (normalizedCurrentNameNoAccents.includes('hoang dinh') && normalizedCurrentNameNoAccents.includes('sach'))
        );

        const isHuynhPhucVan = (
            normalizedCurrentName.includes('huỳnh phúc văn') ||
            normalizedCurrentName.includes('huynh phuc van') ||
            normalizedCurrentNameNoAccents.includes('huynh phuc van') ||
            (normalizedCurrentName.includes('huỳnh phúc') && normalizedCurrentName.includes('văn')) ||
            (normalizedCurrentNameNoAccents.includes('huynh phuc') && normalizedCurrentNameNoAccents.includes('van'))
        );

        if (!isAllowedBD && !isHoangDinhSach && !isHuynhPhucVan) {
            setPendingExpenseApprovalCount(0);
            return;
        }

        const fetchPendingExpenseCount = async () => {
            try {
                const params = {
                    status: 'PENDING_BRANCH_DIRECTOR'
                };

                // If user is manager (Hoàng Đình Sạch or Huỳnh Phúc Văn), filter by managerId; otherwise filter by branchDirectorId
                if (isHoangDinhSach || isHuynhPhucVan) {
                    params.managerId = currentUser.id;
                } else {
                    params.branchDirectorId = currentUser.id;
                }

                const response = await customerEntertainmentExpensesAPI.getAll(params);
                const count = response.data?.data?.length || 0;
                setPendingExpenseApprovalCount(count);
            } catch (error) {
                console.error('Error fetching pending expense approval count:', error);
                setPendingExpenseApprovalCount(0);
            }
        };

        fetchPendingExpenseCount();
        // Refresh every 30 seconds
        const interval = setInterval(fetchPendingExpenseCount, 30000);
        return () => clearInterval(interval);
    }, [currentUser?.id, currentUser?.hoTen, currentUser?.username]);

    // Fetch pending entertainment expense for CEO (Lê Thanh Tùng)
    useEffect(() => {
        if (!currentUser?.id) {
            setPendingExpenseCeoCount(0);
            return;
        }

        const userName = (currentUser.hoTen || currentUser.username || '').trim();
        const normalizedUserName = userName.toLowerCase().replace(/\s+/g, ' ');

        const removeAccents = (str) => {
            if (!str) return '';
            return str
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/Đ/g, 'D');
        };

        const normalizedUserNameNoAccents = removeAccents(normalizedUserName);

        const allowedCeoNames = [
            'lê thanh tùng',
            'le thanh tung'
        ];

        const isLeThanhTung = allowedCeoNames.some(name =>
            normalizedUserName.includes(name) ||
            normalizedUserNameNoAccents.includes(removeAccents(name))
        );

        if (!isLeThanhTung) {
            setPendingExpenseCeoCount(0);
            return;
        }

        const fetchPendingExpenseCeoCount = async () => {
            try {
                // Fetch cả PENDING_CEO (đơn chọn Tổng giám đốc làm người duyệt) và APPROVED_BY_BRANCH_DIRECTOR (đơn đã được kế toán xử lý)
                const [pendingCeoResponse, accountantProcessedResponse] = await Promise.all([
                    customerEntertainmentExpensesAPI.getAll({
                        status: 'PENDING_CEO',
                        ceoId: currentUser.id
                    }),
                    customerEntertainmentExpensesAPI.getAll({
                        status: 'ACCOUNTANT_PROCESSED'
                    })
                ]);
                
                const pendingCeoCount = pendingCeoResponse.data?.data?.length || 0;
                const accountantProcessedCount = accountantProcessedResponse.data?.data?.length || 0;
                const totalCount = pendingCeoCount + accountantProcessedCount;
                
                setPendingExpenseCeoCount(totalCount);
            } catch (error) {
                console.error('Error fetching pending expense CEO count:', error);
                setPendingExpenseCeoCount(0);
            }
        };

        fetchPendingExpenseCeoCount();
        // Refresh every 30 seconds
        const interval = setInterval(fetchPendingExpenseCeoCount, 30000);
        return () => clearInterval(interval);
    }, [currentUser?.id, currentUser?.hoTen, currentUser?.username]);

    // Fetch returned or rejected settlement count (for employees)
    useEffect(() => {
        if (!currentUser?.id || currentUser?.role !== 'EMPLOYEE') {
            setReturnedOrRejectedSettlementCount(0);
            return;
        }

        const fetchReturnedOrRejectedCount = async () => {
            try {
                // Fetch tất cả travel expenses và customer entertainment expenses của employee
                const [travelRes, customerRes] = await Promise.all([
                    travelExpensesAPI.getAll({}).catch(() => ({ data: { success: false, data: [] } })),
                    customerEntertainmentExpensesAPI.getAll({ employeeId: currentUser.id }).catch(() => ({ data: { success: false, data: [] } }))
                ]);

                // Filter travel expenses: RETURNED hoặc REJECTED settlement status
                const travelRequests = travelRes.data?.success && Array.isArray(travelRes.data.data) ? travelRes.data.data : [];
                const travelReturnedOrRejected = travelRequests.filter(req => {
                    const employeeId = req.employee_id || req.employeeId;
                    if (employeeId !== currentUser.id) return false;
                    
                    const settlementStatus = req.settlement?.status || req.settlement_status;
                    return settlementStatus === 'RETURNED' || settlementStatus === 'REJECTED';
                });

                // Filter customer entertainment expenses: RETURNED hoặc REJECTED status
                const customerRequests = customerRes.data?.success && Array.isArray(customerRes.data.data) ? customerRes.data.data : [];
                const customerReturnedOrRejected = customerRequests.filter(req => {
                    return req.status === 'RETURNED' || req.status === 'REJECTED';
                });

                const totalCount = travelReturnedOrRejected.length + customerReturnedOrRejected.length;
                setReturnedOrRejectedSettlementCount(totalCount);
            } catch (error) {
                console.error('Error fetching returned/rejected settlement count:', error);
                setReturnedOrRejectedSettlementCount(0);
            }
        };

        fetchReturnedOrRejectedCount();
        // Refresh every 30 seconds
        const interval = setInterval(fetchReturnedOrRejectedCount, 30000);
        return () => clearInterval(interval);
    }, [currentUser?.id, currentUser?.role]);

    const isEmployee = currentUser?.role === 'EMPLOYEE';
    const chucDanh = (currentUser?.chucDanh || '').trim().replace(/^["']+|["']+$/g, '');
    const normalizedTitle = chucDanh.toLowerCase();

    // Helper function to remove Vietnamese accents
    const removeVietnameseAccents = (str) => {
        if (!str) return '';
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D');
    };

    const normalizedTitleNoAccents = removeVietnameseAccents(normalizedTitle);

    // Check if user is Branch Director (Giám đốc Chi nhánh) - multiple variations
    const isBranchDirector = isEmployee && (
        normalizedTitle.includes('giám đốc chi nhánh') ||
        normalizedTitle.includes('giam doc chi nhanh') ||
        normalizedTitleNoAccents.includes('giam doc chi nhanh') ||
        normalizedTitle.includes('giám đốc') && normalizedTitle.includes('chi nhánh') ||
        normalizedTitleNoAccents.includes('giam doc') && normalizedTitleNoAccents.includes('chi nhanh')
    );

    // Check if user is one of the specific Branch Directors for Customer Entertainment Expense Approval
    const currentUserName = (currentUser?.hoTen || currentUser?.username || '').trim();
    const normalizedCurrentName = currentUserName.toLowerCase();
    const normalizedCurrentNameNoAccents = removeVietnameseAccents(normalizedCurrentName);

    const allowedBranchDirectors = [
        'châu quang hải',
        'chau quang hai',
        'nguyễn ngọc luyễn',
        'nguyen ngoc luyen',
        'nguyễn văn khải',
        'nguyen van khai',
        'huỳnh phúc văn',
        'huynh phuc van'
    ];

    const isAllowedBranchDirector = isBranchDirector && (
        allowedBranchDirectors.some(name =>
            normalizedCurrentName.includes(name) ||
            normalizedCurrentNameNoAccents.includes(removeVietnameseAccents(name))
        )
    );

    // Check if user is Hoàng Đình Sạch (direct manager who can approve customer entertainment expenses)
    const isHoangDinhSach = (
        normalizedCurrentName.includes('hoàng đình sạch') ||
        normalizedCurrentName.includes('hoang dinh sach') ||
        normalizedCurrentNameNoAccents.includes('hoang dinh sach') ||
        (normalizedCurrentName.includes('hoàng đình') && normalizedCurrentName.includes('sạch')) ||
        (normalizedCurrentNameNoAccents.includes('hoang dinh') && normalizedCurrentNameNoAccents.includes('sach'))
    );

    // Check if user is Huỳnh Phúc Văn (direct manager who can approve customer entertainment expenses)
    const isHuynhPhucVan = (
        normalizedCurrentName.includes('huỳnh phúc văn') ||
        normalizedCurrentName.includes('huynh phuc van') ||
        normalizedCurrentNameNoAccents.includes('huynh phuc van') ||
        (normalizedCurrentName.includes('huỳnh phúc') && normalizedCurrentName.includes('văn')) ||
        (normalizedCurrentNameNoAccents.includes('huynh phuc') && normalizedCurrentNameNoAccents.includes('van'))
    );

    // Allow access if user is branch director OR Hoàng Đình Sạch OR Huỳnh Phúc Văn
    const canApproveCustomerEntertainment = isAllowedBranchDirector || isHoangDinhSach || isHuynhPhucVan;

    const canApproveAsEmployee = isEmployee && (
        normalizedTitle.includes('quản lý gián tiếp') ||
        normalizedTitle.includes('quản lý') ||
        normalizedTitle.includes('giám đốc') ||
        normalizedTitle.includes('ban lãnh đạo') ||
        normalizedTitle.includes('trưởng phòng')
    );

    // Show approval module if user can approve OR is branch director
    const showEmployeeApprovalModule = canApproveAsEmployee || isBranchDirector || (managerAccessResolved && canApproveFromManagerLookup);

    // Fetch pending travel expense approvals for managers/CEOs
    useEffect(() => {
        if (!currentUser?.id || !showEmployeeApprovalModule) {
            setPendingTravelExpenseApprovalCount(0);
            return;
        }

        const fetchPendingTravelExpenseCount = async () => {
            try {
                // Helper function to normalize Vietnamese names (remove accents, lowercase, trim)
                const normalizeName = (name) => {
                    if (!name) return '';
                    return name
                        .toString()
                        .trim()
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/đ/g, 'd')
                        .replace(/Đ/g, 'D');
                };

                // Helper function to check if two names match (fuzzy matching)
                const namesMatch = (name1, name2) => {
                    const normalized1 = normalizeName(name1);
                    const normalized2 = normalizeName(name2);
                    return normalized1 === normalized2 ||
                        normalized1.includes(normalized2) ||
                        normalized2.includes(normalized1);
                };

                const currentUserName = (currentUser.hoTen || currentUser.username || '').trim();
                const currentUserChucDanh = (currentUser.chucDanh || '').trim();
                const currentUserChiNhanh = (currentUser.chiNhanh || currentUser.chi_nhanh || '').trim();

                // Determine user role
                let userRole = null;
                if (namesMatch(currentUserName, 'Lê Thanh Tùng')) {
                    userRole = 'CEO';
                }
                const isAdmin = currentUser?.role === 'ADMIN';

                // Determine status filter based on user role
                let statusFilter = 'PENDING_LEVEL_1,PENDING_LEVEL_2';
                if (userRole === 'CEO' || isAdmin) {
                    statusFilter = 'PENDING_CEO,PENDING_EXCEPTION_APPROVAL';
                }

                // Fetch requests
                const response = await travelExpensesAPI.getAll({
                    status: statusFilter
                });
                const allRequests = response.data?.data || [];

                // Fetch employees list to check quan_ly_truc_tiep
                const employeesResponse = await employeesAPI.getAll();
                const employeesList = employeesResponse.data?.data || [];

                // Filter requests that user can actually approve AND haven't been approved yet
                let count = 0;
                for (const req of allRequests) {
                    let shouldCount = false;

                    // Check if user is CEO/Admin for PENDING_CEO or PENDING_EXCEPTION_APPROVAL
                    if ((userRole === 'CEO' || isAdmin) && (req.status === 'PENDING_CEO' || req.status === 'PENDING_EXCEPTION_APPROVAL')) {
                        if (req.status === 'PENDING_EXCEPTION_APPROVAL') {
                            // Kiểm tra xem chưa được duyệt
                            const exceptionStatus = req.exception_approval_status || req.exceptionApproval?.status || null;
                            if (!exceptionStatus || exceptionStatus !== 'APPROVED_EXCEPTION') {
                                shouldCount = true;
                            }
                        } else if (req.status === 'PENDING_CEO' && req.location_type === 'INTERNATIONAL') {
                            // Kiểm tra xem CEO chưa duyệt
                            const ceoDecision = req.ceo_decision || req.decisions?.ceo?.decision || null;
                            if (!ceoDecision || ceoDecision !== 'APPROVE') {
                                shouldCount = true;
                            }
                        }
                    }
                    // Check if user is Branch Director for PENDING_LEVEL_2
                    else if (req.status === 'PENDING_LEVEL_2' && currentUserChucDanh) {
                        // Normalize chucDanh để kiểm tra (bỏ dấu, lowercase) - giống logic trong TravelExpenseApproval
                        const normalizeChucDanh = (chucDanh) => {
                            if (!chucDanh) return '';
                            return chucDanh
                                .toString()
                                .trim()
                                .toLowerCase()
                                .normalize('NFD')
                                .replace(/[\u0300-\u036f]/g, '')
                                .replace(/đ/g, 'd')
                                .replace(/Đ/g, 'D');
                        };

                        const normalizedChucDanh = normalizeChucDanh(currentUserChucDanh);
                        const isBranchDirector = normalizedChucDanh.includes('giam doc') || normalizedChucDanh.includes('giamdoc');

                        if (isBranchDirector) {
                            // Check if same branch
                            const employeeId = req.employee_id || req.employeeId;
                            const requestEmployee = employeesList.find(emp => emp.id === employeeId);
                            let hasPermission = false;

                            if (requestEmployee) {
                                const employeeBranchRaw = requestEmployee.chi_nhanh || requestEmployee.chiNhanh;
                                const employeeBranch = (employeeBranchRaw || '').toString().trim();
                                const userBranch = (currentUserChiNhanh || '').toString().trim();

                                // So sánh chi nhánh (case-insensitive, normalize, bỏ dấu, bỏ khoảng trắng thừa)
                                const normalizeBranch = (branch) => {
                                    if (!branch) return '';
                                    return branch
                                        .toString()
                                        .trim()
                                        .toLowerCase()
                                        .normalize('NFD')
                                        .replace(/[\u0300-\u036f]/g, '')
                                        .replace(/đ/g, 'd')
                                        .replace(/Đ/g, 'D')
                                        .replace(/\s+/g, '');
                                };

                                const normalizedUserBranch = normalizeBranch(userBranch);
                                const normalizedEmployeeBranch = normalizeBranch(employeeBranch);

                                // Nếu có thông tin chi nhánh cho cả hai, so sánh
                                if (employeeBranch && userBranch) {
                                    if (normalizedUserBranch === normalizedEmployeeBranch) {
                                        hasPermission = true;
                                    } else {
                                        // Kiểm tra nếu user là giám đốc Head Office - có thể duyệt đơn từ tất cả chi nhánh
                                        const isHeadOfficeDirector = normalizedUserBranch === 'headoffice' || 
                                                                    normalizedUserBranch === 'head office' ||
                                                                    normalizedUserBranch === 'ho' ||
                                                                    userBranch.toLowerCase().includes('head office') ||
                                                                    userBranch.toLowerCase().includes('headoffice');
                                        
                                        // Kiểm tra nếu employee ở Head Office
                                        const isHeadOfficeEmployee = normalizedEmployeeBranch === 'headoffice' || 
                                                                     normalizedEmployeeBranch === 'head office' ||
                                                                     normalizedEmployeeBranch === 'ho' ||
                                                                     employeeBranch.toLowerCase().includes('head office') ||
                                                                     employeeBranch.toLowerCase().includes('headoffice');
                                        
                                        if (isHeadOfficeDirector || isHeadOfficeEmployee) {
                                            // Giám đốc Head Office có thể duyệt đơn từ tất cả chi nhánh
                                            // Các giám đốc chi nhánh khác cũng có thể duyệt đơn của nhân viên Head Office
                                            hasPermission = true;
                                        }
                                    }
                                } else {
                                    // Nếu một trong hai không có thông tin chi nhánh, vẫn cho phép nếu là Giám đốc (fallback)
                                    hasPermission = true;
                                }
                            } else {
                                // Nếu không tìm thấy employee, vẫn cho phép nếu là Giám đốc (fallback)
                                hasPermission = true;
                            }

                            if (hasPermission) {
                                // Kiểm tra xem chưa được duyệt
                                const branchDirectorDecision = req.branch_director_decision || req.decisions?.branchDirector?.decision || null;
                                if (!branchDirectorDecision || branchDirectorDecision !== 'APPROVE') {
                                    shouldCount = true;
                                }
                            }
                        }
                    }
                    // Check if user is Direct Manager for PENDING_LEVEL_1
                    else if (req.status === 'PENDING_LEVEL_1') {
                        const employeeId = req.employee_id || req.employeeId;
                        if (employeeId) {
                            const requestEmployee = employeesList.find(emp => emp.id === employeeId);
                            if (requestEmployee && requestEmployee.quan_ly_truc_tiep) {
                                const managerName = requestEmployee.quan_ly_truc_tiep.trim();
                                if (namesMatch(currentUserName, managerName)) {
                                    // Kiểm tra xem chưa được duyệt
                                    const managerDecision = req.manager_decision || req.decisions?.manager?.decision || null;
                                    if (!managerDecision || managerDecision !== 'APPROVE') {
                                        shouldCount = true;
                                    }
                                }
                            }
                        }
                    }

                    if (shouldCount) {
                        count++;
                    }
                }

                console.log('[Sidebar] Travel expense approval count:', {
                    allRequestsCount: allRequests.length,
                    filteredCount: count,
                    currentUser: currentUserName,
                    userRole,
                    isAdmin,
                    statusFilter
                });

                setPendingTravelExpenseApprovalCount(count);
            } catch (error) {
                console.error('Error fetching pending travel expense approval count:', error);
                setPendingTravelExpenseApprovalCount(0);
            }
        };

        fetchPendingTravelExpenseCount();
        // Refresh every 30 seconds
        const interval = setInterval(fetchPendingTravelExpenseCount, 30000);
        return () => clearInterval(interval);
    }, [currentUser?.id, currentUser?.hoTen, currentUser?.username, currentUser?.chucDanh, currentUser?.chiNhanh, currentUser?.chi_nhanh, currentUser?.role, showEmployeeApprovalModule]);

    // Fetch pending travel expense management count (PENDING_SETTLEMENT with settlement.status = 'SUBMITTED')
    useEffect(() => {
        if (!currentUser?.id || currentUser?.role !== 'HR') {
            setPendingTravelExpenseManagementCount(0);
            return;
        }

        const fetchPendingTravelExpenseManagementCount = async () => {
            try {
                const response = await travelExpensesAPI.getAll({
                    status: 'PENDING_SETTLEMENT'
                });

                if (response.data && response.data.success) {
                    // Chỉ lấy các request đã được nhân viên submit báo cáo (settlement.status = 'SUBMITTED')
                    const submittedRequests = (response.data.data || []).filter(req =>
                        req.settlement && req.settlement.status === 'SUBMITTED'
                    );

                    setPendingTravelExpenseManagementCount(submittedRequests.length);
                } else {
                    setPendingTravelExpenseManagementCount(0);
                }
            } catch (error) {
                console.error('Error fetching pending travel expense management count:', error);
                setPendingTravelExpenseManagementCount(0);
            }
        };

        fetchPendingTravelExpenseManagementCount();
        // Refresh every 30 seconds
        const interval = setInterval(fetchPendingTravelExpenseManagementCount, 30000);
        return () => clearInterval(interval);
    }, [currentUser?.id, currentUser?.role]);

    // Fetch pending travel expense advance processing count (PENDING_FINANCE with advance_status = null or not PENDING_ACCOUNTANT/TRANSFERRED)
    useEffect(() => {
        if (!currentUser?.id || currentUser?.role !== 'HR') {
            setPendingTravelExpenseAdvanceProcessingCount(0);
            return;
        }

        const fetchPendingTravelExpenseAdvanceProcessingCount = async () => {
            try {
                const response = await travelExpensesAPI.getAll({
                    status: 'PENDING_FINANCE'
                });

                if (response.data && response.data.success) {
                    // Chỉ lấy các đơn chưa được HR xử lý tạm ứng
                    // (loại bỏ các đơn đã có advance_status = 'PENDING_ACCOUNTANT' hoặc 'TRANSFERRED')
                    const unprocessedRequests = (response.data.data || []).filter(req => {
                        const advanceStatus = req.advance_status || req.advance?.status;
                        return !advanceStatus || (advanceStatus !== 'PENDING_ACCOUNTANT' && advanceStatus !== 'TRANSFERRED');
                    });

                    setPendingTravelExpenseAdvanceProcessingCount(unprocessedRequests.length);
                } else {
                    setPendingTravelExpenseAdvanceProcessingCount(0);
                }
            } catch (error) {
                console.error('Error fetching pending travel expense advance processing count:', error);
                setPendingTravelExpenseAdvanceProcessingCount(0);
            }
        };

        fetchPendingTravelExpenseAdvanceProcessingCount();
        // Refresh every 30 seconds
        const interval = setInterval(fetchPendingTravelExpenseAdvanceProcessingCount, 30000);
        return () => clearInterval(interval);
    }, [currentUser?.id, currentUser?.role]);

    // Debug log
    useEffect(() => {
        if (currentUser) {
            console.log('[Sidebar] User info:', {
                role: currentUser.role,
                chucDanh: chucDanh,
                normalizedTitle,
                normalizedTitleNoAccents,
                isEmployee,
                isBranchDirector,
                canApproveAsEmployee,
                showEmployeeApprovalModule
            });
        }
    }, [currentUser, chucDanh, normalizedTitle, normalizedTitleNoAccents, isEmployee, isBranchDirector, canApproveAsEmployee, showEmployeeApprovalModule]);

    return (
        <div className={`sidebar ${isOpen ? 'open' : ''}`}>
            {/* Logo & HR System Section - White Background */}
            <div className="sidebar-logo-section">
                <div className="logo-content">
                    {/* Logo */}
                    <img src={process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/LogoRMG.png` : '/LogoRMG.png'} alt="RMG Logo" className="logo-img" />

                    {/* HR System Text - Styled */}
                    <div className="sidebar-header-text">
                        <h1 className="sidebar-title">
                            <span className="sidebar-title-gradient">HR System</span>
                            <span className="sidebar-title-dot"></span>
                        </h1>
                        <p className="sidebar-subtitle">Hệ thống quản lý nhân sự</p>
                    </div>
                </div>
            </div>

            {/* Navigation Menu */}
            <nav className="sidebar-nav">
                <ul className="nav-list">
                    <li>
                        <button
                            onClick={() => onNavigate('dashboard')}
                            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
                        >
                            <span className="nav-icon-wrapper">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6">
                                    </path>
                                </svg>
                            </span>
                            <span className="nav-label">Dashboard</span>
                        </button>
                    </li>
                    {/* Quản lý đơn từ (HR/ADMIN) hoặc Lịch sử đơn từ (EMPLOYEE) - Module riêng biệt */}
                    {currentUser?.role === 'HR' || currentUser?.role === 'ADMIN' ? (
                        <li>
                            <button
                                onClick={() => onNavigate('request-management')}
                                className={`nav-item ${currentView === 'request-management' ? 'active' : ''}`}
                            >
                                <span className="nav-icon-wrapper">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z">
                                        </path>
                                    </svg>
                                </span>
                                <span className="nav-label">Quản lý đơn từ</span>
                            </button>
                        </li>
                    ) : (
                        <li>
                            <button
                                onClick={() => onNavigate('employee-request-history')}
                                className={`nav-item ${currentView === 'employee-request-history' ? 'active' : ''}`}
                            >
                                <span className="nav-icon-wrapper">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                                        </path>
                                    </svg>
                                </span>
                                <span className="nav-label">Lịch sử đơn từ</span>
                            </button>
                        </li>
                    )}
                    {currentUser?.role === 'HR' && (
                        <>
                            {/* EPAD - chưa hoàn thành
                            <li>
                                <button
                                    onClick={() => onNavigate('attendance-records')}
                                    className={`nav-item ${currentView === 'attendance-records' ? 'active' : ''}`}
                                >
                                    <span className="nav-icon-wrapper">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z">
                                            </path>
                                        </svg>
                                    </span>
                                    <span className="nav-label">Dữ liệu chấm công</span>
                                </button>
                            </li>
                            */}
                            <li>
                                <button
                                    onClick={() => onNavigate('recruitment-management')}
                                    className={`nav-item ${currentView === 'recruitment-management' ? 'active' : ''}`}
                                >
                                    <span className="nav-icon-wrapper">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z">
                                            </path>
                                        </svg>
                                    </span>
                                    <span className="nav-label">Quản lý tuyển dụng</span>
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('travel-expense-management')}
                                    className={`nav-item ${currentView === 'travel-expense-management' ? 'active' : ''}`}
                                >
                                    <span className="nav-icon-wrapper">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                                            </path>
                                        </svg>
                                    </span>
                                    <span className="nav-label">Quản lý công tác</span>
                                    {pendingTravelExpenseManagementCount > 0 && (
                                        <span className="nav-badge nav-badge-pulse">
                                            {pendingTravelExpenseManagementCount > 99 ? '99+' : pendingTravelExpenseManagementCount}
                                        </span>
                                    )}
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('travel-expense-advance-processing')}
                                    className={`nav-item ${currentView === 'travel-expense-advance-processing' ? 'active' : ''}`}
                                >
                                    <span className="nav-icon-wrapper">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z">
                                            </path>
                                        </svg>
                                    </span>
                                    <span className="nav-label">Xử lý tạm ứng</span>
                                    {pendingTravelExpenseAdvanceProcessingCount > 0 && (
                                        <span className="nav-badge nav-badge-pulse">
                                            {pendingTravelExpenseAdvanceProcessingCount > 99 ? '99+' : pendingTravelExpenseAdvanceProcessingCount}
                                        </span>
                                    )}
                                </button>
                            </li>
                        </>
                    )}
                    {/* Nhóm 1: Xin đơn - Blue */}
                    {currentUser?.role === 'EMPLOYEE' && (
                        <>
                            <li className="nav-section-label">
                                <p>Xin Đơn</p>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('leave-request')}
                                    className={`nav-item nav-item-request ${currentView === 'leave-request' ? 'active' : ''}`}
                                >
                                    <span className="nav-icon-wrapper">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                                            </path>
                                        </svg>
                                    </span>
                                    <span className="nav-label">Xin nghỉ phép</span>
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('late-early-request')}
                                    className={`nav-item nav-item-request ${currentView === 'late-early-request' ? 'active' : ''}`}
                                >
                                    <span className="nav-icon-wrapper">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z">
                                            </path>
                                        </svg>
                                    </span>
                                    <span className="nav-label">Xin đi trễ về sớm</span>
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('meal-allowance-request')}
                                    className={`nav-item nav-item-request ${currentView === 'meal-allowance-request' ? 'active' : ''}`}
                                >
                                    <span className="nav-icon-wrapper">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                        </svg>
                                    </span>
                                    <span className="nav-label">Xin phụ cấp cơm công trình</span>
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('overtime-request')}
                                    className={`nav-item nav-item-request ${currentView === 'overtime-request' ? 'active' : ''}`}
                                >
                                    <span className="nav-icon-wrapper">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M13 10V3L4 14h7v7l9-11h-7z">
                                            </path>
                                        </svg>
                                    </span>
                                    <span className="nav-label">Xin tăng ca</span>
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('attendance-request')}
                                    className={`nav-item nav-item-request ${currentView === 'attendance-request' ? 'active' : ''}`}
                                >
                                    <span className="nav-icon-wrapper">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z">
                                            </path>
                                        </svg>
                                    </span>
                                    <span className="nav-label">Bổ sung chấm công</span>
                                </button>
                            </li>
                        </>
                    )}

                    {/* Nhóm 2: Chi phí - Green */}
                    {currentUser?.role === 'EMPLOYEE' && (
                        <>
                            <li className="nav-section-label">
                                <p>Chi Phí</p>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('customer-entertainment-expense-request')}
                                    className={`nav-item nav-item-expense ${currentView === 'customer-entertainment-expense-request' ? 'active' : ''}`}
                                >
                                    <span className="nav-icon-wrapper">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z">
                                            </path>
                                        </svg>
                                    </span>
                                    <span className="nav-label">Chi phí Tiếp khách</span>
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('travel-expense')}
                                    className={`nav-item nav-item-expense ${currentView === 'travel-expense' ? 'active' : ''}`}
                                >
                                    <span className="nav-icon-wrapper">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6">
                                            </path>
                                        </svg>
                                    </span>
                                    <span className="nav-label">Yêu cầu công tác</span>
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('travel-expense-settlement')}
                                    className={`nav-item nav-item-expense ${currentView === 'travel-expense-settlement' ? 'active' : ''}`}
                                >
                                    <span className="nav-icon-wrapper">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                                            </path>
                                        </svg>
                                    </span>
                                    <span className="nav-label">Báo cáo hoàn ứng</span>
                                    {returnedOrRejectedSettlementCount > 0 && (
                                        <span className="nav-badge">{returnedOrRejectedSettlementCount}</span>
                                    )}
                                </button>
                            </li>
                        </>
                    )}

                    {/* Kế toán: Trần Nhật Thanh - Báo Cáo Tổng Hợp Chi Phí Tiếp Khách */}
                    {(() => {
                        if (!currentUser) return false;

                        const userName = (currentUser.hoTen || currentUser.username || '').trim();
                        const normalizedUserName = userName.toLowerCase().replace(/\s+/g, ' ');
                        const normalizedUserNameNoAccents = removeVietnameseAccents(normalizedUserName);
                        
                        const chucDanh = (currentUser?.chucDanh || '').trim().replace(/^["']+|["']+$/g, '');
                        const normalizedTitle = chucDanh.toLowerCase();
                        const normalizedTitleNoAccents = removeVietnameseAccents(normalizedTitle);

                        // Check by name - multiple variations
                        const nameMatches = (
                            normalizedUserName === 'trần nhật thanh' ||
                            normalizedUserName === 'tran nhat thanh' ||
                            normalizedUserNameNoAccents === 'tran nhat thanh' ||
                            normalizedUserName.includes('trần nhật thanh') ||
                            normalizedUserName.includes('tran nhat thanh') ||
                            normalizedUserNameNoAccents.includes('tran nhat thanh') ||
                            (normalizedUserName.includes('trần nhật') && normalizedUserName.includes('thanh')) ||
                            (normalizedUserNameNoAccents.includes('tran nhat') && normalizedUserNameNoAccents.includes('thanh')) ||
                            (normalizedUserName.includes('nhật thanh') && normalizedUserName.includes('trần')) ||
                            (normalizedUserNameNoAccents.includes('nhat thanh') && normalizedUserNameNoAccents.includes('tran'))
                        );

                        // Check by title (chức danh) - "Nhân viên Kế toán Thanh toán"
                        const titleMatches = (
                            normalizedTitle.includes('kế toán') ||
                            normalizedTitle.includes('ke toan') ||
                            normalizedTitleNoAccents.includes('ke toan') ||
                            normalizedTitle.includes('kế toán tổng hợp') ||
                            normalizedTitleNoAccents.includes('ke toan tong hop') ||
                            normalizedTitle.includes('kế toán thanh toán') ||
                            normalizedTitleNoAccents.includes('ke toan thanh toan') ||
                            normalizedTitle.includes('nhân viên kế toán') ||
                            normalizedTitleNoAccents.includes('nhan vien ke toan') ||
                            normalizedTitle.includes('thanh toán') ||
                            normalizedTitleNoAccents.includes('thanh toan')
                        );

                        const isAccountant = nameMatches || titleMatches;

                        // Debug log
                        console.log('[Sidebar] Accountant check:', {
                            role: currentUser.role,
                            hoTen: currentUser.hoTen,
                            username: currentUser.username,
                            chucDanh: chucDanh,
                            normalizedTitle: normalizedTitle,
                            normalizedTitleNoAccents: normalizedTitleNoAccents,
                            userName,
                            normalizedUserName,
                            normalizedUserNameNoAccents,
                            nameMatches,
                            titleMatches,
                            isAccountant
                        });

                        return isAccountant;
                    })() && (
                        <>
                            <li>
                                <button
                                    onClick={() => onNavigate('customer-entertainment-expense-accountant')}
                                    className={`nav-item nav-item-expense ${currentView === 'customer-entertainment-expense-accountant' ? 'active' : ''}`}
                                >
                                    <span className="nav-icon-wrapper">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                    </span>
                                    <span className="nav-label">Báo Cáo Tổng Hợp Chi Phí</span>
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('customer-entertainment-expense-payment')}
                                    className={`nav-item nav-item-expense ${currentView === 'customer-entertainment-expense-payment' ? 'active' : ''}`}
                                >
                                    <span className="nav-icon-wrapper">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                        </svg>
                                    </span>
                                    <span className="nav-label">Thanh Toán & Lưu Trữ</span>
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('travel-expense-accountant')}
                                    className={`nav-item nav-item-expense ${currentView === 'travel-expense-accountant' ? 'active' : ''}`}
                                >
                                    <span className="nav-icon-wrapper">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4">
                                            </path>
                                        </svg>
                                    </span>
                                    <span className="nav-label">Kiểm tra quyết toán công tác</span>
                                </button>
                            </li>
                        </>
                    )}
                    {/* Nhóm 3: Duyệt - Orange */}
                    {currentUser?.role === 'EMPLOYEE' && (
                        <>
                            {showEmployeeApprovalModule && (
                                <>
                                    <li className="nav-section-label">
                                        <p>Duyệt</p>
                                    </li>
                                    <li>
                                        <button
                                            onClick={() => onNavigate('leave-approvals')}
                                            className={`nav-item nav-item-approval ${currentView === 'leave-approvals' ? 'active' : ''}`}
                                        >
                                            <span className="nav-icon-wrapper">
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z">
                                                    </path>
                                                </svg>
                                            </span>
                                            <span className="nav-label">Duyệt đơn</span>
                                            {pendingLeaveApprovalsCount > 0 && (
                                                <span className="nav-badge nav-badge-pending">{pendingLeaveApprovalsCount > 99 ? '99+' : pendingLeaveApprovalsCount}</span>
                                            )}
                                        </button>
                                    </li>
                                    {/* Phỏng vấn & duyệt ứng viên - Đặt trước Danh sách thử việc */}
                                    {interviewAccessResolved && hasInterviewAccess && (
                                        <li>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    onNavigate('interview-approvals');
                                                }}
                                                className={`nav-item nav-item-approval ${currentView === 'interview-approvals' ? 'active' : ''}`}
                                            >
                                                <span className="nav-icon-wrapper">
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                                                        </path>
                                                    </svg>
                                                </span>
                                                <span className="nav-label">Phỏng vấn & duyệt ứng viên</span>
                                                {pendingRecruitmentCount > 0 && (
                                                    <span className={`nav-badge nav-badge-pulse`}>
                                                        {pendingRecruitmentCount}
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    )}
                                    {canApproveCustomerEntertainment && (
                                        <li>
                                            <button
                                                onClick={() => onNavigate('customer-entertainment-expense-approval')}
                                                className={`nav-item nav-item-approval ${currentView === 'customer-entertainment-expense-approval' ? 'active' : ''}`}
                                            >
                                                <span className="nav-icon-wrapper">
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z">
                                                        </path>
                                                    </svg>
                                                </span>
                                                <span className="nav-label">Duyệt Chi phí Tiếp khách</span>
                                                {pendingExpenseApprovalCount > 0 && (
                                                    <span className="nav-badge nav-badge-pulse">
                                                        {pendingExpenseApprovalCount}
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    )}
                                    {showEmployeeApprovalModule && (
                                        <li>
                                            <button
                                                onClick={() => onNavigate('travel-expense-approval')}
                                                className={`nav-item nav-item-approval ${currentView === 'travel-expense-approval' ? 'active' : ''}`}
                                            >
                                                <span className="nav-icon-wrapper">
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6">
                                                        </path>
                                                    </svg>
                                                </span>
                                                <span className="nav-label">Phê duyệt công tác</span>
                                                {pendingTravelExpenseApprovalCount > 0 && (
                                                    <span className="nav-badge nav-badge-pulse">
                                                        {pendingTravelExpenseApprovalCount > 99 ? '99+' : pendingTravelExpenseApprovalCount}
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    )}
                                    {/* Tổng Giám đốc: Lê Thanh Tùng - Không phụ thuộc vào role HR */}
                                    {(() => {
                                        if (!currentUser) return false;

                                        const userName = (currentUser.hoTen || currentUser.username || '').trim();
                                        const normalizedUserName = userName.toLowerCase().replace(/\s+/g, ' ');
                                        const normalizedUserNameNoAccents = removeVietnameseAccents(normalizedUserName);

                                        // Chỉ kiểm tra tên - chỉ Lê Thanh Tùng mới được phép
                                        const isLeThanhTung = (
                                            normalizedUserName === 'lê thanh tùng' ||
                                            normalizedUserName === 'le thanh tung' ||
                                            normalizedUserNameNoAccents === 'le thanh tung' ||
                                            normalizedUserName.includes('lê thanh tùng') ||
                                            normalizedUserName.includes('le thanh tung') ||
                                            normalizedUserNameNoAccents.includes('le thanh tung') ||
                                            (normalizedUserName.includes('lê thanh') && normalizedUserName.includes('tùng')) ||
                                            (normalizedUserNameNoAccents.includes('le thanh') && normalizedUserNameNoAccents.includes('tung')) ||
                                            (normalizedUserName.includes('thanh tùng') && normalizedUserName.includes('lê')) ||
                                            (normalizedUserNameNoAccents.includes('thanh tung') && normalizedUserNameNoAccents.includes('le'))
                                        );

                                        console.log('[Sidebar] CEO check - Only Le Thanh Tung:', {
                                            userName,
                                            normalizedUserName,
                                            normalizedUserNameNoAccents,
                                            isLeThanhTung
                                        });

                                        return isLeThanhTung;
                                    })() && (
                                        <>
                                            {/* CEO Progress Tracking - Menu đặc biệt */}
                                            <li>
                                                <button
                                                    onClick={() => onNavigate('ceo-progress-tracking')}
                                                    className={`nav-item nav-item-ceo-special ${currentView === 'ceo-progress-tracking' ? 'active' : ''}`}
                                                >
                                                    <span className="nav-icon-wrapper">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                        </svg>
                                                    </span>
                                                    <span className="nav-label">
                                                        <svg className="nav-label-crown" fill="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', marginRight: '6px' }}>
                                                            <path d="M12 2L9 12h6l-3-10zm0 20c-3.87 0-7-3.13-7-7h14c0 3.87-3.13 7-7 7z" />
                                                        </svg>
                                                        Theo dõi Tiến độ
                                                    </span>
                                                </button>
                                            </li>

                                            <li>
                                                <button
                                                    onClick={() => onNavigate('customer-entertainment-expense-ceo-approval')}
                                                    className={`nav-item nav-item-approval ${currentView === 'customer-entertainment-expense-ceo-approval' ? 'active' : ''}`}
                                                >
                                                    <span className="nav-icon-wrapper">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z">
                                                            </path>
                                                        </svg>
                                                    </span>
                                                    <span className="nav-label">Duyệt Chi phí Tiếp khách</span>
                                                    {pendingExpenseCeoCount > 0 && (
                                                        <span className="nav-badge nav-badge-pulse">
                                                            {pendingExpenseCeoCount}
                                                        </span>
                                                    )}
                                                </button>
                                            </li>
                                            <li>
                                                <button
                                                    onClick={() => onNavigate('customer-entertainment-expense-ceo')}
                                                    className={`nav-item nav-item-approval ${currentView === 'customer-entertainment-expense-ceo' ? 'active' : ''}`}
                                                >
                                                    <span className="nav-icon-wrapper">
                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                                                        </svg>
                                                    </span>
                                                    <span className="nav-label">Phê Duyệt Cuối Cùng Chi Phí</span>
                                                </button>
                                            </li>
                                        </>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* Request Viewer - Section riêng với màu đặc biệt */}
                    {isIndirectManager && (
                        <>
                            <li className="nav-section-label">
                                <p>Theo Dõi</p>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('request-viewer')}
                                    className={`nav-item nav-item-viewer ${currentView === 'request-viewer' ? 'active' : ''}`}
                                >
                                    <span className="nav-icon-wrapper">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                        </svg>
                                    </span>
                                    <span className="nav-label">Request Viewer</span>
                                </button>
                            </li>
                        </>
                    )}
                    {/* Nhóm 4: Thử việc - Purple */}
                    {currentUser?.role === 'EMPLOYEE' && (
                        <>
                            {canApproveFromManagerLookup && (
                                <>
                                    <li className="nav-section-label">
                                        <p>Thử Việc</p>
                                    </li>
                                    <li>
                                        <button
                                            onClick={() => onNavigate('probation-list')}
                                            className={`nav-item nav-item-probation ${currentView === 'probation-list' ? 'active' : ''}`}
                                        >
                                            <span className="nav-icon-wrapper">
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                                                        </path>
                                                    </svg>
                                                </span>
                                                <span className="nav-label">Danh sách thử việc</span>
                                            </button>
                                        </li>
                                    </>
                                )}
                        </>
                    )}
                    {/* Divider sau nhóm module duyệt và lịch sử đơn từ */}
                    {currentUser?.role === 'EMPLOYEE' && (
                        <li className="nav-divider">
                            <div className="nav-divider-line"></div>
                        </li>
                    )}
                    {/* Nhóm 5: Nghỉ việc - Red */}
                    {currentUser?.role === 'EMPLOYEE' && (
                        <>
                            <li className="nav-section-label">
                                <p>Nghỉ Việc</p>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('resign-request')}
                                    className={`nav-item nav-item-resign ${currentView === 'resign-request' ? 'active' : ''}`}
                                >
                                    <span className="nav-icon-wrapper">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1">
                                            </path>
                                        </svg>
                                    </span>
                                    <span className="nav-label">Xin nghỉ việc</span>
                                </button>
                            </li>
                        </>
                    )}
                    {/* Phỏng vấn & duyệt ứng viên cho Admin */}
                    {(currentUser?.role !== 'EMPLOYEE') && (
                        <>
                            {currentUser?.role === 'ADMIN' && (
                                <li>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onNavigate('interview-approvals');
                                        }}
                                        className={`nav-item nav-item-approval ${currentView === 'interview-approvals' ? 'active' : ''}`}
                                    >
                                        <span className="nav-icon-wrapper">
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                                                </path>
                                            </svg>
                                        </span>
                                        <span className="nav-label">Phỏng vấn & duyệt ứng viên</span>
                                        {pendingRecruitmentCount > 0 && (
                                            <span className={`nav-badge nav-badge-pulse`}>
                                                {pendingRecruitmentCount}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            )}
                        </>
                    )}
                </ul>
            </nav>

            {/* User Account Section */}
            <div className="sidebar-user-section">
                {/* User Info Card */}
                <div className="sidebar-user-info">
                    <div className="sidebar-user-avatar">
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                    </div>
                    <div className="sidebar-user-details">
                        <div className="sidebar-user-name">
                            {currentUser?.hoTen || currentUser?.ho_ten || 'User'}
                        </div>
                        <div className="sidebar-user-department">
                            {currentUser?.phongBan || currentUser?.phong_ban || 'N/A'}
                        </div>
                    </div>
                </div>

                {/* Change Password and Logout Buttons */}
                <div className="sidebar-user-actions">
                    <button onClick={onChangePassword} className="sidebar-change-password-btn">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z">
                            </path>
                        </svg>
                        <span>Đổi mật khẩu</span>
                    </button>
                    <button onClick={onLogout} className="sidebar-logout-btn">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1">
                            </path>
                        </svg>
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
