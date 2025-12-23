import React, { useState, useEffect, useRef } from 'react';
import './TravelExpenseApproval.css';
import { travelExpensesAPI, employeesAPI } from '../../services/api';

const TravelExpenseApproval = ({ currentUser, showToast, showConfirm }) => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [employeesList, setEmployeesList] = useState([]);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);
  const mainLayoutRef = useRef(null);

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

  // Function to determine user role (without request context)
  const determineUserRole = () => {
    if (!currentUser) return null;

    const currentUserName = (currentUser.hoTen || currentUser.username || '').trim();
    const currentUserChucDanh = (currentUser.chucDanh || '').trim();

    // Check if user is CEO (Tổng giám đốc)
    if (namesMatch(currentUserName, 'Lê Thanh Tùng')) {
      return 'CEO';
    }

    // Check if user is Finance (Kế toán)
    if (namesMatch(currentUserName, 'Nguyễn Thị Ngọc Thúy') &&
      (currentUserChucDanh.includes('Kế toán Trưởng') || currentUserChucDanh.includes('Kế toán'))) {
      return 'FINANCE';
    }

    return null;
  };

  // Function to determine actorRole based on currentUser and request status
  const determineActorRole = async (request) => {
    if (!currentUser || !request) return null;

    const currentUserName = (currentUser.hoTen || currentUser.username || '').trim();
    const currentUserChucDanh = (currentUser.chucDanh || '').trim();
    const currentUserChiNhanh = (currentUser.chiNhanh || currentUser.chi_nhanh || '').trim();

    // 1. Check if user is CEO (Tổng giám đốc) - for PENDING_CEO and PENDING_EXCEPTION_APPROVAL requests
    if (namesMatch(currentUserName, 'Lê Thanh Tùng')) {
      if (request.status === 'PENDING_CEO') {
        return 'CEO';
      }
      if (request.status === 'PENDING_EXCEPTION_APPROVAL') {
        return 'CEO'; // CEO có quyền phê duyệt ngoại lệ
      }
    }

    // 2. Check if user is Admin - for PENDING_EXCEPTION_APPROVAL requests (Admin có thể phê duyệt ngoại lệ)
    if (currentUser.role === 'ADMIN' && request.status === 'PENDING_EXCEPTION_APPROVAL') {
      return 'ADMIN';
    }

    // 3. Check if user is Finance (Kế toán) - already handled in determineUserRole

    // 4. Check if user is Branch Director (Giám đốc chi nhánh) - based on chuc_danh
    // Chỉ áp dụng cho requests có status PENDING_LEVEL_2
    // Normalize chucDanh để kiểm tra (bỏ dấu, lowercase)
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

    console.log('[TravelExpenseApproval] Pre-check BRANCH_DIRECTOR:', {
      requestId: request.id,
      requestStatus: request.status,
      currentUserChucDanh: currentUserChucDanh || '(empty)',
      normalizedChucDanh: normalizedChucDanh || '(empty)',
      hasChucDanh: !!currentUserChucDanh,
      statusMatch: request.status === 'PENDING_LEVEL_2',
      isBranchDirector: isBranchDirector,
      chucDanhLength: currentUserChucDanh ? currentUserChucDanh.length : 0,
      normalizedLength: normalizedChucDanh ? normalizedChucDanh.length : 0
    });

    if (request.status === 'PENDING_LEVEL_2' && currentUserChucDanh && isBranchDirector) {
      console.log('[TravelExpenseApproval] Checking BRANCH_DIRECTOR role:', {
        requestId: request.id,
        requestStatus: request.status,
        currentUserChucDanh,
        currentUserChiNhanh,
        employeesListLength: employeesList.length
      });

      // Giám đốc chi nhánh có thể xem TẤT CẢ requests PENDING_LEVEL_2 trong chi nhánh của mình
      // (bao gồm cả của nhân viên và của quản lý trực tiếp)
      const employeeId = request.employee_id || request.employeeId;

      // Nếu không có thông tin employee hoặc employeesList, vẫn cho phép nếu là Giám đốc
      if (!employeeId || employeesList.length === 0) {
        console.log('[TravelExpenseApproval] Determined actorRole as BRANCH_DIRECTOR (no employee info - fallback):', {
          requestId: request.id,
          requestStatus: request.status,
          currentUserChucDanh,
          hasEmployeeId: !!employeeId,
          employeesListLength: employeesList.length
        });
        return 'BRANCH_DIRECTOR';
      }

      // Tìm employee trong request
      const requestEmployee = employeesList.find(emp => emp.id === employeeId);

      // Nếu không tìm thấy employee, vẫn cho phép nếu là Giám đốc (fallback)
      if (!requestEmployee) {
        console.log('[TravelExpenseApproval] Determined actorRole as BRANCH_DIRECTOR (employee not found - fallback):', {
          requestId: request.id,
          employeeId,
          currentUserChucDanh,
          employeesListLength: employeesList.length
        });
        return 'BRANCH_DIRECTOR';
      }

      // Kiểm tra chi nhánh nếu có thông tin
      const employeeBranchRaw = requestEmployee.chi_nhanh || requestEmployee.chiNhanh;
      const employeeBranch = (employeeBranchRaw || '').toString().trim();
      const userBranch = (currentUserChiNhanh || '').toString().trim();

      console.log('[TravelExpenseApproval] Comparing branches:', {
        requestId: request.id,
        employeeId,
        employeeBranch: employeeBranch || '(empty)',
        userBranch: userBranch || '(empty)',
        employeeBranchRaw: employeeBranchRaw || '(empty)',
        currentUserChiNhanh: currentUserChiNhanh || '(empty)',
        hasEmployeeBranch: !!employeeBranch,
        hasUserBranch: !!userBranch,
        employeeBranchType: typeof employeeBranchRaw,
        userBranchType: typeof currentUserChiNhanh
      });

      // Nếu có thông tin chi nhánh cho cả hai, so sánh
      if (employeeBranch && userBranch) {
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
            .replace(/\s+/g, ' ')
            .trim();
        };

        const normalizedEmployeeBranch = normalizeBranch(employeeBranch);
        const normalizedUserBranch = normalizeBranch(userBranch);

        console.log('[TravelExpenseApproval] Normalized branch comparison:', {
          requestId: request.id,
          employeeBranch,
          userBranch,
          normalizedEmployeeBranch,
          normalizedUserBranch,
          match: normalizedEmployeeBranch === normalizedUserBranch,
          employeeBranchLength: employeeBranch.length,
          userBranchLength: userBranch.length,
          normalizedEmployeeLength: normalizedEmployeeBranch.length,
          normalizedUserLength: normalizedUserBranch.length
        });

        if (normalizedEmployeeBranch === normalizedUserBranch) {
          console.log('[TravelExpenseApproval] ✅ Determined actorRole as BRANCH_DIRECTOR (same branch):', {
            requestId: request.id,
            employeeId,
            employeeBranch: employeeBranch,
            userBranch: userBranch
          });
          return 'BRANCH_DIRECTOR';
        } else {
          // Khác chi nhánh - không cho phép
          console.warn('[TravelExpenseApproval] ❌ Branch Director but different branch:', {
            requestId: request.id,
            employeeId,
            employeeBranch: employeeBranch,
            userBranch: userBranch,
            normalizedEmployeeBranch,
            normalizedUserBranch
          });
          return null;
        }
      } else {
        // Nếu một trong hai không có thông tin chi nhánh, vẫn cho phép nếu là Giám đốc (fallback)
        // Điều này đảm bảo giám đốc chi nhánh luôn có thể xem requests PENDING_LEVEL_2
        console.log('[TravelExpenseApproval] ✅ Determined actorRole as BRANCH_DIRECTOR (missing branch info - fallback):', {
          requestId: request.id,
          employeeId,
          employeeBranch: employeeBranch || '(empty)',
          userBranch: userBranch || '(empty)',
          hasEmployeeBranch: !!employeeBranch,
          hasUserBranch: !!userBranch,
          currentUserChucDanh
        });
        return 'BRANCH_DIRECTOR';
      }
    }

    // 5. Check if user is Direct Manager (Quản lý trực tiếp) - chỉ áp dụng cho PENDING_LEVEL_1
    if (request.status === 'PENDING_LEVEL_1') {
      const employeeId = request.employee_id || request.employeeId;
      if (employeeId && employeesList.length > 0) {
        const requestEmployee = employeesList.find(emp => emp.id === employeeId);
        if (requestEmployee && requestEmployee.quan_ly_truc_tiep) {
          const managerName = requestEmployee.quan_ly_truc_tiep.trim();
          if (namesMatch(currentUserName, managerName)) {
            console.log('[TravelExpenseApproval] Determined actorRole as MANAGER:', {
              currentUserName,
              managerName,
              employeeId,
              requestId: request.id
            });
            return 'MANAGER';
          }
        }
      }
    }

    // Log khi không xác định được vai trò
    console.warn('[TravelExpenseApproval] Cannot determine actorRole:', {
      requestStatus: request.status,
      requestEmployeeId: request.employee_id || request.employeeId,
      currentUserName,
      currentUserChucDanh,
      currentUserChiNhanh: currentUserChiNhanh || '(empty)',
      employeesListLength: employeesList.length,
      // Thêm thông tin về employee nếu có
      requestEmployeeInfo: (() => {
        const employeeId = request.employee_id || request.employeeId;
        if (employeeId && employeesList.length > 0) {
          const emp = employeesList.find(e => e.id === employeeId);
          return emp ? {
            id: emp.id,
            hoTen: emp.ho_ten || emp.hoTen,
            chi_nhanh: emp.chi_nhanh || emp.chiNhanh || '(empty)',
            quan_ly_truc_tiep: emp.quan_ly_truc_tiep || emp.quanLyTrucTiep || '(empty)'
          } : 'Employee not found';
        }
        return 'No employeeId or employeesList empty';
      })()
    });

    // Default: return null if cannot determine
    return null;
  };

  // Helper function to format and filter requests
  const formatAndFilterRequests = async (allRequestsData) => {
    const allRequests = allRequestsData.map(req => {
      // API response có thể dùng startTime/endTime (camelCase) hoặc start_time/end_time (snake_case)
      const startTimeValue = req.startTime || req.start_time;
      const endTimeValue = req.endTime || req.end_time;
      const startDate = startTimeValue ? new Date(startTimeValue) : null;
      const endDate = endTimeValue ? new Date(endTimeValue) : null;

      return {
        id: req.id,
        code: `CTX-${req.id}`,
        employeeName: req.employee_name || req.employeeName || 'N/A',
        branch: req.employee_branch || req.employeeBranch || 'N/A',
        scope: (req.location_type || req.locationType) === 'INTERNATIONAL' ? 'NN' : 'NĐ',
        purpose: req.purpose || '',
        destination: req.location || '',
        startDate: startDate && !isNaN(startDate.getTime()) ? startDate.toLocaleDateString('vi-VN') : '',
        startTime: startDate && !isNaN(startDate.getTime()) ? startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
        endDate: endDate && !isNaN(endDate.getTime()) ? endDate.toLocaleDateString('vi-VN') : '',
        endTime: endDate && !isNaN(endDate.getTime()) ? endDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
        status: req.status || '',
        employee_id: req.employeeId || req.employee_id, // Giữ cả hai để tương thích
        employeeId: req.employeeId || req.employee_id, // Giữ cả hai để tương thích
        location_type: req.locationType || req.location_type,
        employee_branch: req.employee_branch || req.employeeBranch,
        // Giữ nguyên raw values để có thể format lại nếu cần
        startTimeRaw: startTimeValue,
        endTimeRaw: endTimeValue
      };
    });

    // Filter requests based on user role - only show requests user can approve
    const filteredRequests = [];
    for (const req of allRequests) {
      const actorRole = await determineActorRole(req);
      if (actorRole === 'MANAGER' && req.status === 'PENDING_LEVEL_1') {
        filteredRequests.push(req);
      } else if (actorRole === 'BRANCH_DIRECTOR' && req.status === 'PENDING_LEVEL_2') {
        filteredRequests.push(req);
      } else if (actorRole === 'CEO' && req.status === 'PENDING_CEO') {
        // CEO chỉ thấy requests nước ngoài đã được Cấp 1 & Cấp 2 duyệt
        if (req.location_type === 'INTERNATIONAL') {
          filteredRequests.push(req);
        }
      } else if ((actorRole === 'CEO' || actorRole === 'ADMIN') && req.status === 'PENDING_EXCEPTION_APPROVAL') {
        // CEO/Admin có quyền phê duyệt ngoại lệ vượt ngân sách
        filteredRequests.push(req);
      }
    }

    return filteredRequests;
  };

  // Fetch employees list for checking quan_ly_truc_tiep
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await employeesAPI.getAll();
        if (response.data && response.data.success) {
          setEmployeesList(response.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    if (currentUser) {
      fetchEmployees();
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchPendingRequests = async () => {
      setLoading(true);
      try {
        // Determine which status to fetch based on user role
        const userRole = determineUserRole();
        const isAdmin = currentUser?.role === 'ADMIN';
        let statusFilter = 'PENDING_LEVEL_1,PENDING_LEVEL_2';

        if (userRole === 'CEO' || isAdmin) {
          // CEO/Admin có thể thấy cả PENDING_CEO và PENDING_EXCEPTION_APPROVAL
          statusFilter = 'PENDING_CEO,PENDING_EXCEPTION_APPROVAL';
        }

        // Fetch requests based on status filter
        const response = await travelExpensesAPI.getAll({
          status: statusFilter
        });

        if (response.data && response.data.success) {
          const filteredRequests = await formatAndFilterRequests(response.data.data);
          setRequests(filteredRequests);
        }
      } catch (error) {
        console.error('Error fetching pending travel expense requests:', error);
        showToast?.('Lỗi khi tải danh sách yêu cầu chờ duyệt', 'error');
      } finally {
        setLoading(false);
      }
    };

    // Chỉ fetch khi đã có employeesList (cần để filter đúng)
    if (currentUser && employeesList.length > 0) {
      fetchPendingRequests();
    } else if (currentUser) {
      // Nếu chưa có employeesList, vẫn fetch nhưng có thể filter không chính xác
      fetchPendingRequests();
    }
  }, [currentUser, showToast, employeesList]);

  const filteredRequests = requests.filter(request =>
    request.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.branch.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedRequestFromList = requests.find(req => req.id === selectedRequestId) || null;

  // Reset selectedRequestDetails nếu selectedRequestId không còn trong danh sách requests
  useEffect(() => {
    if (selectedRequestId && !selectedRequestFromList && selectedRequestDetails) {
      setSelectedRequestDetails(null);
    }
  }, [selectedRequestId, selectedRequestFromList, selectedRequestDetails]);

  // Measure layout height when content is loaded to determine fixed height
  useEffect(() => {
    if (selectedRequestId && mainLayoutRef.current) {
      // Use setTimeout to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        const layout = mainLayoutRef.current;
        if (layout) {
          const height = layout.scrollHeight;
          console.log('[TravelExpenseApproval] Main layout height when content is loaded:', height, 'px');
          console.log('[TravelExpenseApproval] Update CSS .travel-expense-approval-main-layout with height:', height + 'px');
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [selectedRequestId, selectedRequestDetails]);

  const selectedRequest = (() => {
    const request = selectedRequestDetails || selectedRequestFromList;
    if (!request) return null;

    // Đảm bảo có employee_id/employeeId
    const employeeId = request.employee_id || request.employeeId || null;

    // Nếu là selectedRequestFromList (đã được format sẵn), chỉ cần format lại date nếu thiếu
    if (selectedRequestFromList && !selectedRequestDetails) {
      // Đã có đầy đủ thông tin từ formatAndFilterRequests
      return request;
    }

    // Nếu là selectedRequestDetails (từ getById), cần format đầy đủ
    // Luôn format lại từ raw values để đảm bảo có dữ liệu đúng
    // API response có thể dùng startTime/endTime (camelCase) hoặc start_time/end_time (snake_case)
    const startTimeValue = request.startTimeRaw || request.startTime || request.start_time;
    const endTimeValue = request.endTimeRaw || request.endTime || request.end_time;

    // Format lại từ raw values
    const startDate = startTimeValue ? (() => {
      const d = new Date(startTimeValue);
      return !isNaN(d.getTime()) ? d : null;
    })() : null;
    const endDate = endTimeValue ? (() => {
      const d = new Date(endTimeValue);
      return !isNaN(d.getTime()) ? d : null;
    })() : null;

    const formattedStartDate = startDate ? startDate.toLocaleDateString('vi-VN') : '';
    const formattedStartTime = startDate ? startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
    const formattedEndDate = endDate ? endDate.toLocaleDateString('vi-VN') : '';
    const formattedEndTime = endDate ? endDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

    // Đảm bảo có đầy đủ các field cần thiết
    return {
      ...request,
      id: request.id,
      code: request.code || `CTX-${request.id}`,
      employeeName: request.employee_name || request.employeeName || 'N/A',
      branch: request.employee_branch || request.employeeBranch || 'N/A',
      destination: request.location || request.destination || '',
      purpose: request.purpose || '',
      scope: (request.location_type || request.locationType) === 'INTERNATIONAL' ? 'NN' : 'NĐ',
      employee_id: employeeId,
      employeeId: employeeId,
      startDate: formattedStartDate,
      startTime: formattedStartTime,
      endDate: formattedEndDate,
      endTime: formattedEndTime,
      status: request.status || '',
    };
  })();

  return (
    <div className="travel-expense-approval">
      {/* Header với tiêu đề chính */}
      <div className="travel-expense-approval-header">
        <div className="travel-expense-approval-header-content">
          <div className="travel-expense-approval-icon-wrapper">
            <svg className="travel-expense-approval-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <div>
            <h1 className="travel-expense-approval-title">
              {(() => {
                const userRole = determineUserRole();
                const isAdmin = currentUser?.role === 'ADMIN';
                if (requests.length > 0 && requests[0].status === 'PENDING_EXCEPTION_APPROVAL') {
                  return 'Phê duyệt ngoại lệ vượt ngân sách';
                }
                if (userRole === 'CEO') {
                  return 'Phê duyệt công tác - Cấp Đặc biệt';
                }
                return 'Phê duyệt công tác';
              })()}
            </h1>
            <p className="travel-expense-approval-subtitle">
              {(() => {
                const userRole = determineUserRole();
                if (requests.length > 0 && requests[0].status === 'PENDING_EXCEPTION_APPROVAL') {
                  return 'Xem xét và phê duyệt các khoản chi phí vượt ngân sách đã được kế toán kiểm tra.';
                }
                if (userRole === 'CEO') {
                  return 'Xem và phê duyệt các yêu cầu công tác nước ngoài đã được Cấp 1 & Cấp 2 duyệt.';
                }
                return 'Xem và phê duyệt các yêu cầu kinh phí công tác từ nhân viên trong bộ phận của bạn.';
              })()}
            </p>
          </div>
        </div>
      </div>

      {/* Main Container: Glass Card lớn ở trung tâm */}
      <div className="travel-expense-approval-main-container">
        {/* Bố cục 2 cột */}
        <div ref={mainLayoutRef} className="travel-expense-approval-main-layout">
          {/* I. CỘT TRÁI: Danh sách Yêu cầu Chờ Duyệt (33%) */}
          <div className="travel-expense-approval-list-column">
            {/* Nền Cột */}
            <div className="travel-expense-approval-list-container">
              {/* Tiêu đề: YÊU CẦU CHỜ DUYỆT (Teal đậm) */}
              <h2 className="travel-expense-approval-list-title">
                {(() => {
                  const userRole = determineUserRole();
                  const isAdmin = currentUser?.role === 'ADMIN';

                  // Ưu tiên xác định dựa trên requests nếu có
                  if (requests.length > 0) {
                    if (requests[0].status === 'PENDING_EXCEPTION_APPROVAL') {
                      return 'YÊU CẦU CHỜ PHÊ DUYỆT NGOẠI LỆ';
                    }
                    if (userRole === 'CEO' && requests[0].status === 'PENDING_CEO') {
                      return 'YÊU CẦU CHỜ DUYỆT CẤP ĐẶC BIỆT';
                    }
                    if (requests[0].status === 'PENDING_LEVEL_1') {
                      return 'YÊU CẦU CHỜ DUYỆT CẤP 1';
                    }
                    if (requests[0].status === 'PENDING_LEVEL_2') {
                      return 'YÊU CẦU CHỜ DUYỆT CẤP 2';
                    }
                  }

                  // Nếu không có requests, xác định dựa trên userRole
                  if (userRole === 'CEO' || isAdmin) {
                    return 'YÊU CẦU CHỜ DUYỆT';
                  }

                  // Mặc định cho Manager/Branch Director
                  return 'YÊU CẦU CHỜ DUYỆT';
                })()}
              </h2>

              {/* Thanh Tìm kiếm */}
              <div className="travel-expense-approval-search-wrapper">
                <input
                  type="text"
                  className="travel-expense-approval-search-input"
                  placeholder="Tìm kiếm theo mã, tên, chi nhánh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Danh sách Items */}
              <div className="travel-expense-approval-list-items">
                {loading ? (
                  <div className="travel-expense-approval-loading">Đang tải...</div>
                ) : filteredRequests.length === 0 ? (
                  <div className="travel-expense-approval-empty">Không có yêu cầu chờ duyệt</div>
                ) : (
                  filteredRequests.map((request) => (
                    <div
                      key={request.id}
                      className={`travel-expense-approval-list-item ${selectedRequestId === request.id ? 'active' : ''}`}
                      onClick={async () => {
                        setSelectedRequestId(request.id);
                        // Fetch full request details để có đầy đủ thông tin
                        try {
                          const detailResponse = await travelExpensesAPI.getById(request.id);
                          if (detailResponse.data && detailResponse.data.success) {
                            setSelectedRequestDetails(detailResponse.data.data);
                          }
                        } catch (error) {
                          console.error('Error fetching request details:', error);
                          setSelectedRequestDetails(null);
                        }
                      }}
                    >
                      {/* Cột trái: Mã yêu cầu và Tên nhân viên */}
                      <div className="travel-expense-approval-item-left">
                        {/* Mã yêu cầu */}
                        <div className="travel-expense-approval-request-code">
                          {request.code}
                        </div>
                        {/* Tên nhân viên */}
                        <div className="travel-expense-approval-employee-name">
                          {request.employeeName}
                        </div>
                        {/* Chi nhánh */}
                        <div className="travel-expense-approval-branch">
                          {request.branch}
                        </div>
                      </div>

                      {/* Cột phải: Thẻ phân loại */}
                      <div className="travel-expense-approval-item-right">
                        {/* Thẻ phân loại: NĐ (Nội địa - Teal) hoặc NN (Nước ngoài - Amber) */}
                        <div className={`travel-expense-approval-scope-badge ${request.scope === 'NĐ' ? 'domestic' : 'foreign'}`}>
                          {request.scope}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* II. CỘT PHẢI: Chi tiết, Phân loại Luồng & Hành động (67%) */}
          <div className="travel-expense-approval-detail-column">
            {/* Nền Cột */}
            <div className="travel-expense-approval-detail-container">
              {selectedRequest ? (
                <div className="travel-expense-approval-detail-content">
                  {/* A. Thẻ Phân Loại Luồng */}
                  <div className={`travel-expense-approval-flow-card ${selectedRequest.scope === 'NN' ? 'foreign' : 'domestic'}`}>
                    <div className="travel-expense-approval-flow-icon">
                      {selectedRequest.scope === 'NN' ? (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      ) : (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      )}
                    </div>
                    <div className="travel-expense-approval-flow-content">
                      {selectedRequest.status === 'PENDING_EXCEPTION_APPROVAL' ? (
                        <>
                          <h3 className="travel-expense-approval-flow-title">Phê duyệt Ngoại lệ Vượt Ngân sách</h3>
                          <p className="travel-expense-approval-flow-description">
                            Yêu cầu này đã được <strong>Kế toán kiểm tra</strong> và phát hiện <strong>chi phí thực tế vượt số tiền tạm ứng</strong>. Bạn cần xem xét và quyết định có duyệt khoản chênh lệch này không.
                            <br /><br />
                            <strong>Nếu Duyệt:</strong> Kế toán sẽ hoàn ứng khoản chênh lệch đã duyệt.
                            <br />
                            <strong>Nếu Từ chối:</strong> Kế toán chỉ hoàn ứng tối đa bằng số tiền tạm ứng.
                          </p>
                        </>
                      ) : determineUserRole() === 'CEO' ? (
                        <>
                          <h3 className="travel-expense-approval-flow-title">Phê duyệt Cấp Đặc biệt</h3>
                          <p className="travel-expense-approval-flow-description">
                            Yêu cầu này là <strong>Công tác Nước ngoài</strong> và đã được <strong>Cấp 1 (Quản lý Trực tiếp)</strong> và <strong>Cấp 2 (Giám đốc Chi nhánh)</strong> duyệt. Sau khi bạn duyệt, sẽ chuyển đến <strong>CẤP NGÂN SÁCH (BƯỚC 4)</strong> để phân bổ kinh phí.
                          </p>
                        </>
                      ) : selectedRequest.scope === 'NN' ? (
                        <>
                          <h3 className="travel-expense-approval-flow-title">Công tác Nước ngoài</h3>
                          <p className="travel-expense-approval-flow-description">
                            Yêu cầu này là <strong>Công tác Nước ngoài</strong>. Sau khi duyệt, sẽ chuyển đến <strong>GIÁM ĐỐC CHI NHÁNH (CẤP 2)</strong>, sau đó đến <strong>TỔNG GIÁM ĐỐC (BƯỚC 3)</strong> để phê duyệt đặc biệt.
                          </p>
                        </>
                      ) : (
                        <>
                          <h3 className="travel-expense-approval-flow-title">Công tác Nội địa</h3>
                          <p className="travel-expense-approval-flow-description">
                            Yêu cầu là <strong>Nội địa</strong>. Sau khi duyệt, sẽ chuyển đến <strong>GIÁM ĐỐC CHI NHÁNH (CẤP 2)</strong>, sau đó đến <strong>CẤP NGÂN SÁCH (BƯỚC 4)</strong> để phân bổ kinh phí.
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* B. Nội dung Chi tiết Yêu cầu */}
                  <div className="travel-expense-approval-detail-section">
                    <h3 className="travel-expense-approval-detail-section-title">Chi Tiết Yêu Cầu</h3>

                    <div className="travel-expense-approval-detail-grid">
                      {/* Thông tin cơ bản */}
                      <div className="travel-expense-approval-detail-item">
                        <label className="travel-expense-approval-detail-label">Mã Yêu Cầu</label>
                        <div className="travel-expense-approval-detail-value">{selectedRequest.code}</div>
                      </div>

                      <div className="travel-expense-approval-detail-item">
                        <label className="travel-expense-approval-detail-label">Tên Nhân Viên</label>
                        <div className="travel-expense-approval-detail-value">{selectedRequest.employeeName}</div>
                      </div>

                      <div className="travel-expense-approval-detail-item">
                        <label className="travel-expense-approval-detail-label">Chi Nhánh</label>
                        <div className="travel-expense-approval-detail-value">{selectedRequest.branch}</div>
                      </div>

                      <div className="travel-expense-approval-detail-item">
                        <label className="travel-expense-approval-detail-label">Địa Điểm</label>
                        <div className="travel-expense-approval-detail-value">{selectedRequest.destination}</div>
                      </div>

                      <div className="travel-expense-approval-detail-item">
                        <label className="travel-expense-approval-detail-label">Ngày Bắt Đầu</label>
                        <div className="travel-expense-approval-detail-value">
                          {selectedRequest.startDate && selectedRequest.startTime
                            ? `${selectedRequest.startDate} - ${selectedRequest.startTime}`
                            : selectedRequest.startDate
                              ? selectedRequest.startDate
                              : selectedRequest.startTime
                                ? selectedRequest.startTime
                                : 'Chưa có thông tin'}
                        </div>
                      </div>

                      <div className="travel-expense-approval-detail-item">
                        <label className="travel-expense-approval-detail-label">Ngày Kết Thúc</label>
                        <div className="travel-expense-approval-detail-value">
                          {selectedRequest.endDate && selectedRequest.endTime
                            ? `${selectedRequest.endDate} - ${selectedRequest.endTime}`
                            : selectedRequest.endDate
                              ? selectedRequest.endDate
                              : selectedRequest.endTime
                                ? selectedRequest.endTime
                                : 'Chưa có thông tin'}
                        </div>
                      </div>
                    </div>

                    {/* Mục Đích Chi Tiết & Căn Cứ - Làm nổi bật */}
                    <div className="travel-expense-approval-detail-item-full">
                      <label className="travel-expense-approval-detail-label">Mục Đích Chi Tiết & Căn Cứ</label>
                      <div className="travel-expense-approval-detail-purpose">
                        {selectedRequest.purpose || 'Chưa có thông tin mục đích.'}
                      </div>
                    </div>

                    {/* Hiển thị thông tin Exception Approval nếu có */}
                    {selectedRequestDetails && selectedRequestDetails.accountant && selectedRequestDetails.accountant.exceedsBudget && (
                      <div className="travel-expense-approval-detail-item-full" style={{
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        border: '2px solid #f59e0b',
                        marginTop: '1rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '24px', height: '24px', color: '#d97706' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                          </svg>
                          <label className="travel-expense-approval-detail-label" style={{ color: '#92400e', fontWeight: 700 }}>
                            Cảnh báo: Chi phí vượt ngân sách
                          </label>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#78350f', lineHeight: '1.6' }}>
                          <div style={{ marginBottom: '0.5rem' }}>
                            <strong>Số tiền tạm ứng:</strong> {selectedRequestDetails.advance?.amount ? Number(selectedRequestDetails.advance.amount).toLocaleString('vi-VN') : '0'} VND
                          </div>
                          <div style={{ marginBottom: '0.5rem' }}>
                            <strong>Chi phí thực tế:</strong> {selectedRequestDetails.settlement?.actualExpense ? Number(selectedRequestDetails.settlement.actualExpense).toLocaleString('vi-VN') : '0'} VND
                          </div>
                          <div style={{ marginBottom: '0.5rem', color: '#dc2626', fontWeight: 600 }}>
                            <strong>Số tiền vượt ngân sách:</strong> {selectedRequestDetails.accountant?.excessAmount ? Number(selectedRequestDetails.accountant.excessAmount).toLocaleString('vi-VN') : '0'} VND
                          </div>
                          {selectedRequestDetails.accountant?.notes && (
                            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(217, 119, 6, 0.3)' }}>
                              <strong>Ghi chú từ Kế toán:</strong> {selectedRequestDetails.accountant.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* C. Khối Hành động Phê duyệt */}
                  <div className="travel-expense-approval-action-section">
                    <h3 className="travel-expense-approval-action-title">Quyết Định Phê Duyệt</h3>

                    {/* Ghi chú */}
                    <div className="travel-expense-approval-note-group">
                      <label htmlFor="approvalNote" className="travel-expense-approval-note-label">
                        Ghi chú <span className="travel-expense-approval-note-hint">(Xác nhận tính cần thiết/phù hợp của công việc)</span>
                      </label>
                      <textarea
                        id="approvalNote"
                        className="travel-expense-approval-note-input"
                        rows="4"
                        value={approvalNote}
                        onChange={(e) => setApprovalNote(e.target.value)}
                        placeholder="Nhập ghi chú xác nhận tính cần thiết và phù hợp của công việc..."
                      />
                    </div>

                    {/* Nút Hành động */}
                    <div className="travel-expense-approval-action-buttons">
                      <button
                        type="button"
                        className="travel-expense-approval-btn-approve"
                        onClick={async () => {
                          if (!approvalNote.trim()) {
                            showToast && showToast('Vui lòng nhập ghi chú trước khi duyệt.', 'warning');
                            return;
                          }
                          if (!selectedRequestId) {
                            showToast && showToast('Vui lòng chọn yêu cầu cần duyệt.', 'warning');
                            return;
                          }

                          setIsProcessing(true);
                          try {
                            // Determine actorRole
                            const actorRole = await determineActorRole(selectedRequest);
                            if (!actorRole) {
                              showToast?.('Không thể xác định vai trò của bạn. Vui lòng liên hệ quản trị viên.', 'error');
                              setIsProcessing(false);
                              return;
                            }

                            // Kiểm tra xem có phải exception approval không
                            if (selectedRequest.status === 'PENDING_EXCEPTION_APPROVAL') {
                              // Gọi API phê duyệt ngoại lệ
                              await travelExpensesAPI.approveException(selectedRequestId, {
                                actorRole: actorRole,
                                actorId: currentUser.id,
                                decision: 'APPROVE',
                                notes: approvalNote
                              });

                              showToast && showToast('Đã phê duyệt ngoại lệ thành công! Kế toán sẽ hoàn ứng khoản chênh lệch đã duyệt.', 'success');
                            } else {
                              // Gọi API phê duyệt thông thường
                              await travelExpensesAPI.decide(selectedRequestId, {
                                actorRole: actorRole,
                                actorId: currentUser.id,
                                decision: 'APPROVE',
                                notes: approvalNote
                              });

                              showToast && showToast('Yêu cầu đã được duyệt thành công!', 'success');
                            }

                            setSelectedRequestId(null);
                            setSelectedRequestDetails(null);
                            setApprovalNote('');

                            // Refresh requests list
                            const userRole = determineUserRole();
                            const isAdmin = currentUser?.role === 'ADMIN';
                            const statusFilter = (userRole === 'CEO' || isAdmin) ? 'PENDING_CEO,PENDING_EXCEPTION_APPROVAL' : 'PENDING_LEVEL_1,PENDING_LEVEL_2';
                            const refreshResponse = await travelExpensesAPI.getAll({
                              status: statusFilter
                            });
                            if (refreshResponse.data && refreshResponse.data.success) {
                              const filteredRequests = await formatAndFilterRequests(refreshResponse.data.data);
                              setRequests(filteredRequests);
                            }
                          } catch (error) {
                            console.error('Error approving request:', error);
                            showToast && showToast('Lỗi khi duyệt yêu cầu: ' + (error.response?.data?.message || error.message), 'error');
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        disabled={isProcessing}
                      >
                        {isProcessing ? 'Đang xử lý...' : selectedRequest?.status === 'PENDING_EXCEPTION_APPROVAL' ? 'DUYỆT NGOẠI LỆ' : 'DUYỆT'}
                      </button>

                      <button
                        type="button"
                        className="travel-expense-approval-btn-reject"
                        onClick={async () => {
                          if (!approvalNote.trim()) {
                            showToast && showToast('Vui lòng nhập ghi chú lý do từ chối.', 'warning');
                            return;
                          }
                          if (!selectedRequestId) {
                            showToast && showToast('Vui lòng chọn yêu cầu cần từ chối.', 'warning');
                            return;
                          }

                          setIsProcessing(true);
                          try {
                            // Determine actorRole
                            const actorRole = await determineActorRole(selectedRequest);
                            if (!actorRole) {
                              showToast?.('Không thể xác định vai trò của bạn. Vui lòng liên hệ quản trị viên.', 'error');
                              setIsProcessing(false);
                              return;
                            }

                            // Kiểm tra xem có phải exception approval không
                            if (selectedRequest.status === 'PENDING_EXCEPTION_APPROVAL') {
                              // Gọi API từ chối ngoại lệ
                              await travelExpensesAPI.approveException(selectedRequestId, {
                                actorRole: actorRole,
                                actorId: currentUser.id,
                                decision: 'REJECT',
                                notes: approvalNote
                              });

                              showToast && showToast('Đã từ chối phê duyệt ngoại lệ. Chỉ hoàn ứng số tiền tạm ứng.', 'info');
                            } else {
                              // Gọi API từ chối thông thường
                              await travelExpensesAPI.decide(selectedRequestId, {
                                actorRole: actorRole,
                                actorId: currentUser.id,
                                decision: 'REJECT',
                                notes: approvalNote
                              });

                              showToast && showToast('Yêu cầu đã bị từ chối.', 'info');
                            }

                            setSelectedRequestId(null);
                            setSelectedRequestDetails(null);
                            setApprovalNote('');

                            // Refresh requests list
                            const userRole = determineUserRole();
                            const isAdmin = currentUser?.role === 'ADMIN';
                            const statusFilter = (userRole === 'CEO' || isAdmin) ? 'PENDING_CEO,PENDING_EXCEPTION_APPROVAL' : 'PENDING_LEVEL_1,PENDING_LEVEL_2';
                            const refreshResponse = await travelExpensesAPI.getAll({
                              status: statusFilter
                            });
                            if (refreshResponse.data && refreshResponse.data.success) {
                              const filteredRequests = await formatAndFilterRequests(refreshResponse.data.data);
                              setRequests(filteredRequests);
                            }
                          } catch (error) {
                            console.error('Error rejecting request:', error);
                            showToast && showToast('Lỗi khi từ chối yêu cầu: ' + (error.response?.data?.message || error.message), 'error');
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        disabled={isProcessing}
                      >
                        {isProcessing ? 'Đang xử lý...' : 'TỪ CHỐI'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="travel-expense-approval-empty-state">
                  <p>Vui lòng chọn một yêu cầu từ danh sách để xem chi tiết.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TravelExpenseApproval;

