import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import EmployeeDashboard from './components/EmployeeDashboard/EmployeeDashboard';
import CEOProgressTracking from './components/CEOProgressTracking/CEOProgressTracking';
import EmployeeForm from './components/EmployeeForm/EmployeeForm';
import EquipmentAssignmentModal from './components/EquipmentAssignment/EquipmentAssignmentModal';
import RequestsManagementModal from './components/RequestsManagement/RequestsManagementModal';
import LeaveRequest from './components/LeaveRequest/LeaveRequest';
import LateEarlyRequest from './components/LateEarlyRequest/LateEarlyRequest';
import MealAllowanceRequest from './components/MealAllowanceRequest/MealAllowanceRequest';
import ResignRequest from './components/ResignRequest/ResignRequest';
import LeaveApprovals from './components/LeaveApprovals/LeaveApprovals';
import RequestManagement from './components/RequestManagement/RequestManagement';
import EmployeeRequestHistory from './components/EmployeeRequestHistory/EmployeeRequestHistory';
import ProbationList from './components/ProbationList/ProbationList';
import RecruitmentManagement from './components/RecruitmentManagement/RecruitmentManagement';
import InterviewApprovals from './components/InterviewApprovals/InterviewApprovals';
import OvertimeRequest from './components/OvertimeRequest/OvertimeRequest';
import AttendanceRequest from './components/AttendanceRequest/AttendanceRequest';
import TravelExpense from './components/TravelExpense/TravelExpense';
import TravelExpenseManagement from './components/TravelExpense/TravelExpenseManagement';
import TravelExpenseAdvanceProcessing from './components/TravelExpense/TravelExpenseAdvanceProcessing';
import TravelExpenseApproval from './components/TravelExpenseApproval/TravelExpenseApproval';
import TravelExpenseSettlement from './components/TravelExpense/TravelExpenseSettlement';
import TravelExpenseAccountant from './components/TravelExpense/TravelExpenseAccountant';
import CustomerEntertainmentExpenseRequest from './components/CustomerEntertainmentExpense/CustomerEntertainmentExpenseRequest';
import CustomerEntertainmentExpenseApproval from './components/CustomerEntertainmentExpense/CustomerEntertainmentExpenseApproval';
import CustomerEntertainmentExpenseAccountant from './components/CustomerEntertainmentExpense/CustomerEntertainmentExpenseAccountant';
import CustomerEntertainmentExpenseCEO from './components/CustomerEntertainmentExpense/CustomerEntertainmentExpenseCEO';
import CustomerEntertainmentExpenseCEOApproval from './components/CustomerEntertainmentExpense/CustomerEntertainmentExpenseCEOApproval';
import CustomerEntertainmentExpensePayment from './components/CustomerEntertainmentExpense/CustomerEntertainmentExpensePayment';
// import AttendanceRecords from './components/AttendanceRecords/AttendanceRecords'; // EPAD - chưa hoàn thành
import Login from './components/Login/Login';
import ChangePasswordModal from './components/Common/ChangePasswordModal';
import ToastContainer from './components/Common/ToastContainer';
import ConfirmModal from './components/Common/ConfirmModal';
import IntroOverlay from './components/Common/IntroOverlay';
import { employeesAPI } from './services/api';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false); // Start with false, only show loading when actually fetching
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [showIntroOverlay, setShowIntroOverlay] = useState(false);
  const [introUser, setIntroUser] = useState(null);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [equipmentModalEmployee, setEquipmentModalEmployee] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Toast management
  const showToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Confirm modal
  const showConfirm = (options) => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        ...options,
        onConfirm: (data) => {
          resolve(data || true);
          setConfirmModal({ isOpen: false });
        },
        onClose: () => {
          resolve(false);
          setConfirmModal({ isOpen: false });
        },
      });
    });
  };

  // Define fetchEmployees first, before useEffects that use it
  const fetchEmployees = useCallback(async () => {
    try {
      // Only set loading if we don't have employees yet
      if (employees.length === 0) {
        setLoading(true);
      }
      const response = await employeesAPI.getAll();
      if (response.data.success) {
        setEmployees(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  }, [employees.length]);

  // Kiểm tra authentication khi component mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('isAuthenticated');
    const savedUser = localStorage.getItem('user');

    if (savedAuth === 'true' && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setCurrentUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Fetch employees when authenticated and view is dashboard
  useEffect(() => {
    if (isAuthenticated && currentView === 'dashboard' && currentUser?.role !== 'EMPLOYEE') {
      // Only fetch if we don't have employees yet
      if (employees.length === 0) {
        fetchEmployees();
      }
    }
  }, [isAuthenticated, currentView, currentUser?.role, employees.length, fetchEmployees]);


  useEffect(() => {
    let timer;
    if (showIntroOverlay) {
      timer = setTimeout(() => {
        setShowIntroOverlay(false);
        setIntroUser(null);
      }, 2000);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [showIntroOverlay]);

  const handleNavigate = (view) => {
    setCurrentView(view);
    if (view === 'dashboard') {
      setSelectedEmployee(null);
      // Chỉ fetch employees nếu không phải EMPLOYEE và chưa có employees
      if (currentUser?.role !== 'EMPLOYEE' && employees.length === 0) {
        fetchEmployees();
      }
    }
  };

  const handleAddEmployee = () => {
    setCurrentView('form');
    setSelectedEmployee(null);
  };

  const handleUpdateEquipment = (employee) => {
    // Employee đã tồn tại trong database, có trạng thái PENDING
    setEquipmentModalEmployee(employee);
    setIsEquipmentModalOpen(true);
  };

  const handleEmployeeFormSuccess = (formData) => {
    // formData là dữ liệu từ EmployeeForm, chưa có id (chưa tạo trong database)
    setSelectedEmployee(formData);
    setCurrentView('equipment');
    // Không fetchEmployees ở đây vì nhân viên chưa được tạo
  };

  const handleLoginSuccess = async (userData) => {
    setCurrentUser(userData);
    setIsAuthenticated(true);
    setIntroUser(userData);
    setShowIntroOverlay(true);

    // Fetch employees after login (don't wait)
    fetchEmployees();
  };

  const handleEquipmentComplete = () => {
    setIsEquipmentModalOpen(false);
    setEquipmentModalEmployee(null);
    fetchEmployees(); // Refresh employee list (sẽ trigger useEffect trong EmployeeTable để fetch lại equipment)
  };

  const handleCancel = () => {
    setCurrentView('dashboard');
    setSelectedEmployee(null);
  };

  const handleLogout = async () => {
    const confirmed = await showConfirm({
      title: 'Đăng xuất',
      message: 'Bạn có chắc chắn muốn đăng xuất?',
      confirmText: 'Đăng xuất',
      cancelText: 'Hủy',
      type: 'warning',
    });

    if (confirmed) {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      setCurrentUser(null);
      setIsAuthenticated(false);
      setCurrentView('dashboard');
      setEmployees([]);
      setShowIntroOverlay(false);
      setIntroUser(null);
    }
  };

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const handleChangePassword = async (data) => {
    try {
      const { authAPI } = await import('./services/api');
      const response = await authAPI.changePassword(data);

      if (response.data.success) {
        showToast('Đổi mật khẩu thành công!', 'success');
        setShowChangePasswordModal(false);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Không thể đổi mật khẩu. Vui lòng thử lại.';
      showToast(errorMessage, 'error');
      throw error; // Re-throw để modal có thể xử lý
    }
  };

  // Hiển thị Login nếu chưa authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Helper function to check if user is Lê Thanh Tùng
  const isLeThanhTung = (user) => {
    if (!user) return false;

    const removeVietnameseAccents = (str) => {
      if (!str) return '';
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
    };

    const userName = (user.hoTen || user.username || '').trim();
    const normalizedUserName = userName.toLowerCase().replace(/\s+/g, ' ');
    const normalizedUserNameNoAccents = removeVietnameseAccents(normalizedUserName);

    return (
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
  };

  const renderView = () => {
    // CEO Progress Tracking - Đặc biệt cho Tổng giám đốc (bất kể role)
    if (currentView === 'ceo-progress-tracking') {
      return (
        <CEOProgressTracking
          currentUser={currentUser}
          showToast={showToast}
          showConfirm={showConfirm}
        />
      );
    }

    // Employee view - giao diện riêng cho nhân viên
    if (currentUser?.role === 'EMPLOYEE') {
      switch (currentView) {
        case 'leave-request':
          return (
            <LeaveRequest
              currentUser={currentUser}
              showToast={showToast}
            />
          );
        case 'late-early-request':
          return (
            <LateEarlyRequest
              currentUser={currentUser}
              showToast={showToast}
            />
          );
        case 'meal-allowance-request':
          return (
            <MealAllowanceRequest
              currentUser={currentUser}
              showToast={showToast}
            />
          );
        case 'resign-request':
          return (
            <ResignRequest
              currentUser={currentUser}
              showToast={showToast}
            />
          );
        case 'leave-approvals':
          return (
            <LeaveApprovals
              currentUser={currentUser}
              showToast={showToast}
              showConfirm={showConfirm}
            />
          );
        case 'probation-list':
          return (
            <ProbationList
              currentUser={currentUser}
              showToast={showToast}
            />
          );
        case 'overtime-request':
          return (
            <OvertimeRequest
              currentUser={currentUser}
              showToast={showToast}
              showConfirm={showConfirm}
            />
          );
        case 'attendance-request':
          return (
            <AttendanceRequest
              currentUser={currentUser}
              showToast={showToast}
            />
          );
        case 'employee-request-history':
          return (
            <EmployeeRequestHistory
              currentUser={currentUser}
              showToast={showToast}
              showConfirm={showConfirm}
            />
          );
        case 'interview-approvals':
          return (
            <InterviewApprovals
              currentUser={currentUser}
              showToast={showToast}
              showConfirm={showConfirm}
            />
          );
        case 'travel-expense':
          return (
            <TravelExpense
              currentUser={currentUser}
              showToast={showToast}
              showConfirm={showConfirm}
            />
          );
        case 'travel-expense-approval':
          return (
            <TravelExpenseApproval
              currentUser={currentUser}
              showToast={showToast}
              showConfirm={showConfirm}
            />
          );
        case 'travel-expense-settlement':
          return (
            <TravelExpenseSettlement
              currentUser={currentUser}
              showToast={showToast}
            />
          );
        case 'travel-expense-accountant':
          return (
            <TravelExpenseAccountant
              currentUser={currentUser}
              showToast={showToast}
            />
          );
        case 'customer-entertainment-expense-request':
          return (
            <CustomerEntertainmentExpenseRequest
              currentUser={currentUser}
              showToast={showToast}
              showConfirm={showConfirm}
            />
          );
        case 'customer-entertainment-expense-approval':
          return (
            <CustomerEntertainmentExpenseApproval
              currentUser={currentUser}
              showToast={showToast}
              showConfirm={showConfirm}
            />
          );
        case 'customer-entertainment-expense-accountant':
          return (
            <CustomerEntertainmentExpenseAccountant
              currentUser={currentUser}
              showToast={showToast}
              showConfirm={showConfirm}
            />
          );
        case 'customer-entertainment-expense-ceo':
          // Chỉ Lê Thanh Tùng mới được phép truy cập module này
          if (!isLeThanhTung(currentUser)) {
            showToast('Bạn không có quyền truy cập module này. Chỉ Tổng Giám đốc Lê Thanh Tùng mới được phép.', 'error');
            setCurrentView('dashboard');
            return (
              <EmployeeDashboard
                currentUser={currentUser}
                showToast={showToast}
              />
            );
          }
          return (
            <CustomerEntertainmentExpenseCEO
              currentUser={currentUser}
              showToast={showToast}
              showConfirm={showConfirm}
            />
          );
        case 'customer-entertainment-expense-ceo-approval':
          // Chỉ Lê Thanh Tùng mới được phép truy cập module này
          if (!isLeThanhTung(currentUser)) {
            showToast('Bạn không có quyền truy cập module này. Chỉ Tổng Giám đốc Lê Thanh Tùng mới được phép.', 'error');
            setCurrentView('dashboard');
            return (
              <EmployeeDashboard
                currentUser={currentUser}
                showToast={showToast}
              />
            );
          }
          return (
            <CustomerEntertainmentExpenseCEOApproval
              currentUser={currentUser}
              showToast={showToast}
              showConfirm={showConfirm}
            />
          );
        case 'customer-entertainment-expense-payment':
          return (
            <CustomerEntertainmentExpensePayment
              currentUser={currentUser}
              showToast={showToast}
              showConfirm={showConfirm}
            />
          );
        case 'dashboard':
        default:
          return (
            <EmployeeDashboard
              currentUser={currentUser}
              onNavigate={handleNavigate}
            />
          );
      }
    }

    // Admin/HR view - giao diện quản trị
    switch (currentView) {
      case 'leave-approvals':
        return (
          <LeaveApprovals
            currentUser={currentUser}
            showToast={showToast}
            showConfirm={showConfirm}
          />
        );
      case 'request-management':
        return (
          <RequestManagement
            currentUser={currentUser}
            showToast={showToast}
            showConfirm={showConfirm}
          />
        );
      case 'attendance-records':
        // EPAD - chưa hoàn thành
        showToast('Module Dữ liệu chấm công đang được phát triển. Vui lòng quay lại sau.', 'info');
        setCurrentView('dashboard');
        return (
          <Dashboard
            onAddEmployee={handleAddEmployee}
            employees={employees}
            onRefreshEmployees={fetchEmployees}
            currentUser={currentUser}
            showConfirm={showConfirm}
            onUpdateEquipment={handleUpdateEquipment}
            onOpenRequestsModal={() => setIsRequestsModalOpen(true)}
          />
        );
      case 'probation-list':
        return (
          <ProbationList
            currentUser={currentUser}
            showToast={showToast}
          />
        );
      case 'recruitment-management':
        return (
          <RecruitmentManagement
            currentUser={currentUser}
            showToast={showToast}
            showConfirm={showConfirm}
          />
        );
      case 'interview-approvals':
        return (
          <InterviewApprovals
            currentUser={currentUser}
            showToast={showToast}
            showConfirm={showConfirm}
          />
        );
      case 'travel-expense-advance-processing':
        return (
          <TravelExpenseAdvanceProcessing
            currentUser={currentUser}
            showToast={showToast}
            showConfirm={showConfirm}
          />
        );
      case 'travel-expense-management':
        return (
          <TravelExpenseManagement
            currentUser={currentUser}
            showToast={showToast}
            showConfirm={showConfirm}
          />
        );
      case 'travel-expense-accountant':
        return (
          <TravelExpenseAccountant
            currentUser={currentUser}
            showToast={showToast}
          />
        );
      case 'customer-entertainment-expense-request':
        return (
          <CustomerEntertainmentExpenseRequest
            currentUser={currentUser}
            showToast={showToast}
            showConfirm={showConfirm}
          />
        );
      case 'customer-entertainment-expense-approval':
        return (
          <CustomerEntertainmentExpenseApproval
            currentUser={currentUser}
            showToast={showToast}
            showConfirm={showConfirm}
          />
        );
      case 'customer-entertainment-expense-accountant':
        return (
          <CustomerEntertainmentExpenseAccountant
            currentUser={currentUser}
            showToast={showToast}
            showConfirm={showConfirm}
          />
        );
      case 'customer-entertainment-expense-ceo':
        // Chỉ Lê Thanh Tùng mới được phép truy cập module này
        if (!isLeThanhTung(currentUser)) {
          showToast('Bạn không có quyền truy cập module này. Chỉ Tổng Giám đốc Lê Thanh Tùng mới được phép.', 'error');
          setCurrentView('dashboard');
          return (
            <Dashboard
              onAddEmployee={handleAddEmployee}
              employees={employees}
              onRefreshEmployees={fetchEmployees}
              currentUser={currentUser}
              showConfirm={showConfirm}
              onUpdateEquipment={handleUpdateEquipment}
              onOpenRequestsModal={() => setIsRequestsModalOpen(true)}
            />
          );
        }
        return (
          <CustomerEntertainmentExpenseCEO
            currentUser={currentUser}
            showToast={showToast}
            showConfirm={showConfirm}
          />
        );
      case 'customer-entertainment-expense-payment':
        return (
          <CustomerEntertainmentExpensePayment
            currentUser={currentUser}
            showToast={showToast}
            showConfirm={showConfirm}
          />
        );
      case 'dashboard':
      default:
        return (
          <Dashboard
            onAddEmployee={handleAddEmployee}
            employees={employees}
            onRefreshEmployees={fetchEmployees}
            currentUser={currentUser}
            showConfirm={showConfirm}
            onUpdateEquipment={handleUpdateEquipment}
            onOpenRequestsModal={() => setIsRequestsModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="app">
      {showIntroOverlay && <IntroOverlay user={introUser || currentUser} />}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          handleNavigate(view);
          setIsSidebarOpen(false); // Close sidebar on mobile after navigation
        }}
        onAddEmployee={handleAddEmployee}
        currentUser={currentUser}
        onLogout={handleLogout}
        onChangePassword={() => setShowChangePasswordModal(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onConfirm={handleChangePassword}
        currentUser={currentUser}
        showToast={showToast}
      />

      {/* Mobile Hamburger Menu Button */}
      <button
        className="mobile-menu-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label="Toggle menu"
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isSidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />}
      <main
        className={`main-content ${currentUser?.role === 'EMPLOYEE' ? 'main-content--employee' : ''}`}
        style={{ position: 'relative' }}
      >
        {loading && currentView === 'dashboard' && !employees.length ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : (
          renderView()
        )}
      </main>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={confirmModal.onClose || (() => setConfirmModal({ isOpen: false }))}
        onConfirm={confirmModal.onConfirm || (() => { })}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
        input={confirmModal.input}
        notesInput={confirmModal.notesInput}
      />


      {/* Requests Management Modal */}
      <RequestsManagementModal
        isOpen={isRequestsModalOpen}
        onClose={() => setIsRequestsModalOpen(false)}
        currentUser={currentUser}
        showToast={showToast}
        showConfirm={showConfirm}
      />

      {/* Equipment Assignment Modal */}
      <EquipmentAssignmentModal
        isOpen={isEquipmentModalOpen}
        onClose={() => {
          setIsEquipmentModalOpen(false);
          setEquipmentModalEmployee(null);
        }}
        employee={equipmentModalEmployee}
        onComplete={handleEquipmentComplete}
        currentUser={currentUser}
        showToast={showToast}
      />

    </div>
  );
}

export default App;
