import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { employeesAPI, requestsAPI, equipmentAPI } from '../../services/api';
import CustomSelect from '../Common/CustomSelect/CustomSelect';
import './EmployeeTable.css';

// CustomDropdown đã được thay thế bằng HTML select - component này không còn được sử dụng

const EmployeeTable = ({ employees, onRefresh, currentUser, showToast, showConfirm, onUpdateEquipment, branchFilter }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [detailModal, setDetailModal] = useState({
    isOpen: false,
    mode: 'view',
    employee: null,
    equipment: [],
    loading: false,
  });
  const [editForm, setEditForm] = useState({
    hoTen: '',
    chiNhanh: '',
    chucDanh: '',
    phongBan: '',
    boPhan: '',
    ngayGiaNhap: '',
    maChamCong: '',
    loaiHopDong: '',
    diaDiem: '',
    tinhThue: '',
    capBac: '',
    email: '',
    quanLyTrucTiep: '',
    quanLyGianTiep: ''
  });
  const [formError, setFormError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [boPhanList, setBoPhanList] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [contractTypes, setContractTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [taxStatuses, setTaxStatuses] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [managersList, setManagersList] = useState([]);
  const [indirectManagersList, setIndirectManagersList] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allEmployees, setAllEmployees] = useState([]);
  const [managerSearchQuery, setManagerSearchQuery] = useState('');
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);

  const userRole = currentUser?.role?.toUpperCase();
  const canManage = userRole === 'HR' || userRole === 'ADMIN';

  // Fetch all options from database
  useEffect(() => {
    const fetchOptions = async () => {
      console.log('[EmployeeTable] Bắt đầu fetch tất cả options...');
      setLoadingOptions(true);
      try {
        const [
          deptResponse,
          boPhanResponse,
          jobTitlesResponse,
          branchesResponse,
          contractTypesResponse,
          locationsResponse,
          taxStatusesResponse,
          ranksResponse,
          managersResponse,
          indirectManagersResponse
        ] = await Promise.all([
          employeesAPI.getDepartments(),
          employeesAPI.getBoPhan(),
          employeesAPI.getJobTitles(),
          employeesAPI.getBranches(),
          employeesAPI.getContractTypes(),
          employeesAPI.getLocations(),
          employeesAPI.getTaxStatuses(),
          employeesAPI.getRanks(),
          employeesAPI.getManagers(),
          employeesAPI.getManagers() // Tạm thời dùng cùng API, có thể tách sau
        ]);

        // Helper function to clean and deduplicate data
        const cleanData = (data) => {
          if (!Array.isArray(data)) return [];
          return data
            .filter(item => item != null && String(item).trim() !== '')
            .map(item => String(item).trim())
            .filter((item, index, self) => self.indexOf(item) === index);
        };

        console.log('[EmployeeTable] Departments response:', deptResponse);
        console.log('[EmployeeTable] Bo phan response:', boPhanResponse);

        if (deptResponse.data?.success) {
          const deptData = deptResponse.data.data || [];
          console.log('[EmployeeTable] Raw departments data:', deptData);
          // Lọc và làm sạch dữ liệu - chỉ giữ strings không rỗng
          const cleanedDepts = deptData
            .filter(dept => dept != null && String(dept).trim() !== '')
            .map(dept => String(dept).trim())
            .filter((dept, index, self) => self.indexOf(dept) === index); // Remove duplicates
          setDepartments(cleanedDepts);
          console.log('[EmployeeTable] ✅ Departments loaded:', cleanedDepts.length, 'items');
          if (cleanedDepts.length > 0) {
            console.log('[EmployeeTable] Departments sample:', cleanedDepts.slice(0, 5));
          } else {
            console.warn('[EmployeeTable] ⚠️ No departments after cleaning!');
          }
        } else {
          console.warn('[EmployeeTable] ❌ Departments response not successful:', deptResponse.data);
        }

        if (boPhanResponse.data?.success) {
          setBoPhanList(cleanData(boPhanResponse.data.data || []));
        }

        if (jobTitlesResponse.data?.success) {
          const jobTitlesData = jobTitlesResponse.data.data || [];
          console.log('[EmployeeTable] Job titles response:', jobTitlesData);
          const cleanedJobTitles = cleanData(jobTitlesData);
          setJobTitles(cleanedJobTitles);
          console.log('[EmployeeTable] ✅ Job titles loaded:', cleanedJobTitles.length, 'items');
          if (cleanedJobTitles.length > 0) {
            console.log('[EmployeeTable] Job titles sample:', cleanedJobTitles.slice(0, 5));
          } else {
            console.warn('[EmployeeTable] ⚠️ No job titles after cleaning!');
          }
        } else {
          console.warn('[EmployeeTable] ❌ Job titles response not successful:', jobTitlesResponse.data);
          console.warn('[EmployeeTable] Full job titles response:', jobTitlesResponse);
        }

        if (branchesResponse.data?.success) {
          setBranches(cleanData(branchesResponse.data.data || []));
        }

        if (contractTypesResponse.data?.success) {
          setContractTypes(cleanData(contractTypesResponse.data.data || []));
        }

        if (locationsResponse.data?.success) {
          setLocations(cleanData(locationsResponse.data.data || []));
        }

        if (taxStatusesResponse.data?.success) {
          setTaxStatuses(cleanData(taxStatusesResponse.data.data || []));
        }

        if (ranksResponse.data?.success) {
          setRanks(cleanData(ranksResponse.data.data || []));
        }

        if (managersResponse.data?.success) {
          const managersData = managersResponse.data.data || [];
          const managerNames = cleanData(managersData);
          setManagersList(managerNames);
          console.log('[EmployeeTable] Manager names loaded:', managerNames.length, 'items');
        }

        // Quản lý gián tiếp có thể lấy từ quan_ly_gian_tiep hoặc dùng cùng danh sách managers
        if (indirectManagersResponse.data?.success) {
          const indirectManagersData = indirectManagersResponse.data.data || [];
          const indirectManagerNames = cleanData(indirectManagersData);
          setIndirectManagersList(indirectManagerNames);
        }
      } catch (error) {
        console.error('[EmployeeTable] ❌ Error fetching options:', error);
        if (showToast) {
          showToast('Không thể tải danh sách tùy chọn', 'error');
        }
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [showToast]);

  // Fetch all employees for manager selection
  useEffect(() => {
    const fetchAllEmployees = async () => {
      try {
        const response = await employeesAPI.getAll();
        if (response.data?.success) {
          setAllEmployees(response.data.data || []);
        }
      } catch (error) {
        console.error('[EmployeeTable] Error fetching all employees:', error);
      }
    };
    fetchAllEmployees();
  }, []);

  // Update editForm values when jobTitles or departments are loaded and modal is in edit mode
  useEffect(() => {
    if (detailModal.mode === 'edit' && detailModal.employee && (jobTitles.length > 0 || departments.length > 0)) {
      const emp = detailModal.employee;
      const currentChucDanh = editForm.chucDanh;
      const currentPhongBan = editForm.phongBan;

      // Only update if current value is empty or doesn't match properly
      if (jobTitles.length > 0) {
        const matchedChucDanh = matchValueWithOptions(emp.chuc_danh, jobTitles);
        if (matchedChucDanh && matchedChucDanh !== currentChucDanh) {
          console.log('[EmployeeTable] Updating chucDanh after jobTitles loaded', {
            old: currentChucDanh,
            new: matchedChucDanh,
            original: emp.chuc_danh
          });
          setEditForm(prev => ({ ...prev, chucDanh: matchedChucDanh }));
        }
      }

      if (departments.length > 0) {
        const matchedPhongBan = matchValueWithOptions(emp.phong_ban, departments);
        if (matchedPhongBan && matchedPhongBan !== currentPhongBan) {
          console.log('[EmployeeTable] Updating phongBan after departments loaded', {
            old: currentPhongBan,
            new: matchedPhongBan,
            original: emp.phong_ban
          });
          setEditForm(prev => ({ ...prev, phongBan: matchedPhongBan }));
        }
      }
    }
  }, [jobTitles, departments, detailModal.mode, detailModal.employee]);

  const getDepartmentLabel = (dept) => {
    const labels = {
      IT: 'Phòng IT',
      HR: 'Hành chính nhân sự',
      ACCOUNTING: 'Kế toán',
      OTHER: 'Phòng ban khác',
    };
    return labels[dept] || dept || '-';
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const normalizeDateForInput = (dateString) => {
    if (!dateString) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().split('T')[0];
  };

  const combineEquipmentData = async (employeeId) => {
    const combined = [];

    try {
      const requestsResponse = await requestsAPI.getAll({ employeeId });
      if (requestsResponse.data.success) {
        const requests = requestsResponse.data.data || [];
        requests.forEach((request) => {
          if (Array.isArray(request.items_detail)) {
            request.items_detail.forEach((item) => {
              if (item.status === 'COMPLETED' && item.quantity_provided > 0) {
                combined.push({
                  name: item.item_name,
                  quantity: item.quantity_provided,
                  department: request.target_department,
                  providedAt: item.provided_at,
                  providedBy: item.provided_by_name || 'HR',
                });
              }
            });
          }
        });
      }
    } catch (requestsError) {
      console.error('Error fetching requests for employee:', requestsError);
    }

    try {
      const equipmentResponse = await equipmentAPI.getByEmployeeId(employeeId);
      if (equipmentResponse.data.success) {
        const directEquipment = equipmentResponse.data.data || [];
        directEquipment.forEach((eq) => {
          combined.push({
            name: eq.ten_vat_dung,
            quantity: eq.so_luong,
            department: eq.phong_ban,
            providedAt: eq.ngay_phan_cong || eq.created_at,
            providedBy: eq.created_by || 'HR',
          });
        });
      }
    } catch (equipmentError) {
      console.error('Error fetching direct equipment for employee:', equipmentError);
    }

    combined.sort((a, b) => {
      const dateA = a.providedAt ? new Date(a.providedAt) : new Date(0);
      const dateB = b.providedAt ? new Date(b.providedAt) : new Date(0);
      return dateB - dateA;
    });

    return combined;
  };

  const handleRowClick = async (employee) => {
    setDetailModal({
      isOpen: true,
      mode: 'view',
      employee,
      equipment: [],
      loading: true,
    });

    const equipment = await combineEquipmentData(employee.id);
    setDetailModal((prev) => ({
      ...prev,
      equipment,
      loading: false,
    }));
  };

  // Helper function to match value from database with options list
  const matchValueWithOptions = (value, optionsList) => {
    if (!value || !optionsList || optionsList.length === 0) {
      console.log('[EmployeeTable] matchValueWithOptions: No value or options', { value, optionsListLength: optionsList?.length });
      return value || '';
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue) return '';

    // Normalize all options for comparison
    const normalizedOptions = optionsList.map(opt => String(opt).trim());

    // Try exact match first
    const exactMatch = normalizedOptions.find(opt => opt === normalizedValue);
    if (exactMatch) {
      console.log('[EmployeeTable] matchValueWithOptions: Exact match found', { originalValue: value, matched: exactMatch });
      return exactMatch;
    }

    // Try case-insensitive match
    const caseInsensitiveMatch = normalizedOptions.find(opt =>
      opt.toLowerCase() === normalizedValue.toLowerCase()
    );
    if (caseInsensitiveMatch) {
      console.log('[EmployeeTable] matchValueWithOptions: Case-insensitive match found', { originalValue: value, matched: caseInsensitiveMatch });
      return caseInsensitiveMatch;
    }

    // Try partial match (contains)
    const partialMatch = normalizedOptions.find(opt =>
      opt.toLowerCase().includes(normalizedValue.toLowerCase()) ||
      normalizedValue.toLowerCase().includes(opt.toLowerCase())
    );
    if (partialMatch) {
      console.log('[EmployeeTable] matchValueWithOptions: Partial match found', { originalValue: value, matched: partialMatch });
      return partialMatch;
    }

    // Log when no match found
    console.warn('[EmployeeTable] matchValueWithOptions: No match found', {
      originalValue: value,
      normalizedValue,
      availableOptions: normalizedOptions.slice(0, 10) // Log first 10 options
    });

    // Return original normalized value if no match found
    return normalizedValue;
  };

  const closeModal = () => {
    setDetailModal({ isOpen: false, mode: 'view', employee: null, equipment: [], loading: false });
    setEditForm({
      hoTen: '',
      chiNhanh: '',
      chucDanh: '',
      phongBan: '',
      boPhan: '',
      ngayGiaNhap: '',
      maChamCong: '',
      loaiHopDong: '',
      diaDiem: '',
      tinhThue: '',
      capBac: '',
      email: '',
      quanLyTrucTiep: '',
      quanLyGianTiep: ''
    });
    setFormError('');
  };

  const startEditing = () => {
    if (!detailModal.employee || !canManage) return;
    const emp = detailModal.employee;

    console.log('[EmployeeTable] startEditing called', {
      employeeChucDanh: emp.chuc_danh,
      employeePhongBan: emp.phong_ban,
      jobTitlesLength: jobTitles.length,
      departmentsLength: departments.length,
      jobTitlesSample: jobTitles.slice(0, 5),
      departmentsSample: departments.slice(0, 5)
    });

    // Match chức danh and phòng ban with loaded options
    const matchedChucDanh = matchValueWithOptions(emp.chuc_danh, jobTitles);
    const matchedPhongBan = matchValueWithOptions(emp.phong_ban, departments);

    console.log('[EmployeeTable] startEditing: Matching results', {
      originalChucDanh: emp.chuc_danh,
      matchedChucDanh,
      originalPhongBan: emp.phong_ban,
      matchedPhongBan
    });

    setEditForm({
      hoTen: emp.ho_ten || '',
      chiNhanh: emp.chi_nhanh || emp.chiNhanh || '',
      chucDanh: matchedChucDanh,
      phongBan: matchedPhongBan,
      boPhan: emp.bo_phan || '',
      ngayGiaNhap: normalizeDateForInput(emp.ngay_gia_nhap),
      maChamCong: emp.ma_cham_cong || '',
      loaiHopDong: emp.loai_hop_dong || '',
      diaDiem: emp.dia_diem || '',
      tinhThue: emp.tinh_thue || '',
      capBac: emp.cap_bac || '',
      email: emp.email || '',
      quanLyTrucTiep: emp.quan_ly_truc_tiep || emp.quanLyTrucTiep || '',
      quanLyGianTiep: emp.quan_ly_gian_tiep || emp.quanLyGianTiep || ''
    });
    setFormError('');
    setDetailModal((prev) => ({ ...prev, mode: 'edit' }));
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateEquipmentClick = () => {
    if (detailModal.employee && onUpdateEquipment) {
      onUpdateEquipment(detailModal.employee);
    }
    closeModal();
  };

  const handleCancelEdit = () => {
    setFormError('');
    setDetailModal((prev) => ({ ...prev, mode: 'view' }));
  };

  // Tự động cập nhật quyền quản lý khi chọn quản lý trực tiếp
  const handleUpdateManagerRole = async (employeeId, employeeName) => {
    try {
      // Kiểm tra xem nhân viên này đã có trong danh sách quản lý chưa
      const isAlreadyManager = managersList.some(m => m.toLowerCase() === employeeName.toLowerCase());
      
      if (!isAlreadyManager) {
        // Cập nhật nhân viên này thành quản lý (có thể cần thêm field is_manager hoặc tương tự)
        // Tạm thời chỉ log, có thể cần backend API để update
        console.log(`[EmployeeTable] Auto-updating ${employeeName} (ID: ${employeeId}) to manager role`);
        
        // Có thể gọi API để update is_manager = true nếu backend hỗ trợ
        // await employeesAPI.update(employeeId, { is_manager: true });
      }
    } catch (error) {
      console.error('[EmployeeTable] Error updating manager role:', error);
    }
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!detailModal.employee || !canManage) return;

    if (!editForm.hoTen || !editForm.chucDanh || !editForm.phongBan || !editForm.boPhan || !editForm.ngayGiaNhap) {
      setFormError('Vui lòng điền đầy đủ các trường bắt buộc.');
      return;
    }

    setLoading(true);
    setFormError('');

    try {
      const payload = {
        hoTen: editForm.hoTen.trim(),
        chucDanh: editForm.chucDanh.trim(),
        phongBan: editForm.phongBan,
        boPhan: editForm.boPhan.trim(),
        chiNhanh: editForm.chiNhanh?.trim() || null,
        ngayGiaNhap: editForm.ngayGiaNhap,
        quanLyTrucTiep: editForm.quanLyTrucTiep?.trim() || null,
        quanLyGianTiep: editForm.quanLyGianTiep?.trim() || null,
      };

      const response = await employeesAPI.update(detailModal.employee.id, payload);
      if (response.data.success) {
        const updatedEmployee = response.data.data;
        if (showToast) {
          showToast('Cập nhật thông tin nhân viên thành công!', 'success');
        }
        setDetailModal((prev) => ({
          ...prev,
          mode: 'view',
          employee: updatedEmployee,
        }));
        if (onRefresh) {
          onRefresh();
        }
      } else {
        const message = response.data.message || 'Không thể cập nhật nhân viên';
        setFormError(message);
        if (showToast) {
          showToast(message, 'error');
        }
      }
    } catch (updateError) {
      const message = updateError.response?.data?.message || 'Lỗi khi cập nhật nhân viên';
      setFormError(message);
      if (showToast) {
        showToast(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!detailModal.employee || !canManage) return;

    let confirmed = true;
    if (showConfirm) {
      confirmed = await showConfirm({
        title: 'Xóa nhân viên',
        message: `Bạn có chắc chắn muốn xóa nhân viên "${detailModal.employee.ho_ten}"?`,
        confirmText: 'Xóa',
        cancelText: 'Hủy',
        type: 'danger',
      });
    } else {
      confirmed = window.confirm(`Bạn có chắc chắn muốn xóa nhân viên "${detailModal.employee.ho_ten}"?`);
    }

    if (!confirmed) return;

    setLoading(true);
    setError('');

    try {
      const response = await employeesAPI.delete(detailModal.employee.id);
      if (response.data.success) {
        if (showToast) {
          showToast('Xóa nhân viên thành công!', 'success');
        }
        closeModal();
        onRefresh && onRefresh();
      } else {
        const message = response.data.message || 'Không thể xóa nhân viên';
        setError(message);
        if (showToast) {
          showToast(message, 'error');
        }
      }
    } catch (deleteError) {
      const message = deleteError.response?.data?.message || 'Lỗi khi xóa nhân viên';
      setError(message);
      if (showToast) {
        showToast(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderEquipmentList = () => {
    if (detailModal.loading) {
      return (
        <div className="equipment-loading">
          <div className="spinner" />
          <span>Đang tải thông tin vật dụng...</span>
        </div>
      );
    }

    if (!detailModal.equipment || detailModal.equipment.length === 0) {
      return (
        <div className="equipment-empty-state">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10a9.97 9.97 0 00-1.382-5.016L12 12"></path>
          </svg>
          <h5>Chưa có vật dụng nào</h5>
          <p>Nhân viên này chưa được cấp vật dụng trực tiếp hoặc qua yêu cầu.</p>
        </div>
      );
    }

    return (
      <div className="equipment-list">
        {detailModal.equipment.map((item, index) => (
          <div key={`${item.name}-${index}`} className="equipment-item">
            <div className="equipment-item-info">
              <h6>{item.name}</h6>
              <p>
                <span className="equipment-item-quantity">Số lượng: {item.quantity}</span>
                <span className="equipment-item-department">{getDepartmentLabel(item.department)}</span>
              </p>
            </div>
            <div className="equipment-item-meta">
              {item.providedAt && (
                <span className="equipment-item-date">Cấp ngày: {formatDateShort(item.providedAt)}</span>
              )}
              {item.providedBy && (
                <span className="equipment-item-provider">Bởi: {item.providedBy}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const normalizedFilter = branchFilter
    ? branchFilter
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    : '';
  // Filter by branch first
  let branchFiltered = normalizedFilter
    ? employees.filter((employee) =>
      (employee.chi_nhanh || employee.chiNhanh || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') === normalizedFilter)
    : employees;

  // Filter by search query (name)
  const filteredEmployees = searchQuery.trim()
    ? branchFiltered.filter((employee) => {
        const name = (employee.ho_ten || employee.hoTen || '').toLowerCase();
        const normalizedName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normalizedQuery = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return normalizedName.includes(normalizedQuery);
      })
    : branchFiltered;

  // Sync selectedEmployees with available employees
  useEffect(() => {
    const availableIds = new Set(filteredEmployees.map(emp => emp.id));
    setSelectedEmployees(prev => {
      const newSet = new Set();
      prev.forEach(id => {
        if (availableIds.has(id)) {
          newSet.add(id);
        }
      });
      return newSet;
    });
  }, [filteredEmployees]);

  // Handle checkbox selection
  const handleSelectEmployee = (employeeId, event) => {
    event.stopPropagation(); // Prevent row click
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  // Handle select all
  const handleSelectAll = (event) => {
    event.stopPropagation();
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map(emp => emp.id)));
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedEmployees.size === 0 || !canManage) return;

    const selectedIds = Array.from(selectedEmployees);
    console.log('[EmployeeTable] Bulk delete - Selected IDs:', selectedIds);

    let confirmed = true;
    if (showConfirm) {
      confirmed = await showConfirm({
        title: 'Xóa nhiều nhân viên',
        message: `Bạn có chắc chắn muốn xóa ${selectedEmployees.size} nhân viên đã chọn?`,
        confirmText: 'Xóa',
        cancelText: 'Hủy',
        type: 'danger',
      });
    } else {
      confirmed = window.confirm(`Bạn có chắc chắn muốn xóa ${selectedEmployees.size} nhân viên đã chọn?`);
    }

    if (!confirmed) {
      console.log('[EmployeeTable] Bulk delete cancelled');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('[EmployeeTable] Calling bulkDelete API with IDs:', selectedIds);
      const response = await employeesAPI.bulkDelete(selectedIds);
      console.log('[EmployeeTable] Bulk delete response:', response);
      
      if (response.data.success) {
        if (showToast) {
          showToast(`Đã xóa ${response.data.data.deletedCount} nhân viên thành công!`, 'success');
        }
        setSelectedEmployees(new Set());
        onRefresh && onRefresh();
      } else {
        const message = response.data.message || 'Không thể xóa nhân viên';
        console.error('[EmployeeTable] Bulk delete failed:', message);
        setError(message);
        if (showToast) {
          showToast(message, 'error');
        }
      }
    } catch (deleteError) {
      const message = deleteError.response?.data?.message || deleteError.message || 'Lỗi khi xóa nhân viên';
      console.error('[EmployeeTable] Bulk delete error:', deleteError);
      setError(message);
      if (showToast) {
        showToast(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if all employees are selected
  const isAllSelected = filteredEmployees.length > 0 && selectedEmployees.size === filteredEmployees.length;
  const isIndeterminate = selectedEmployees.size > 0 && selectedEmployees.size < filteredEmployees.length;

  return (
    <div className="employee-table-body">
      {error && (
        <div className="employee-table-error">
          <svg className="error-icon" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="error-close-btn"
            aria-label="Đóng thông báo lỗi"
          >
            <svg className="error-close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {canManage && selectedEmployees.size > 0 && (
        <div className="employee-table-bulk-actions">
          <span className="bulk-actions-count">Đã chọn: {selectedEmployees.size} nhân viên</span>
          <button
            type="button"
            onClick={handleBulkDelete}
            className="bulk-delete-btn"
            disabled={loading}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {loading ? 'Đang xóa...' : `Xóa ${selectedEmployees.size} nhân viên`}
          </button>
        </div>
      )}

      {/* Search box */}
      {canManage && (
        <div className="employee-table-search" style={{ marginBottom: '16px', marginTop: '16px' }}>
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên nhân viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 40px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <svg
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                color: '#666'
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="table-wrapper">
        <table className="employee-table">
          <thead className="employee-table-thead">
            <tr>
              {canManage && (
                <th className="employee-checkbox-header">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isIndeterminate;
                    }}
                    onChange={handleSelectAll}
                    className="employee-checkbox"
                    title={isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  />
                </th>
              )}
              <th>Mã Nhân Viên</th>
              <th>Mã Chấm Công</th>
              <th>Họ Và Tên</th>
              <th>Chi Nhánh</th>
              <th>Phòng Ban</th>
              <th>Bộ Phận</th>
              <th>Chức Danh</th>
              <th>Ngày Nhận Việc</th>
              <th>Loại Hợp Đồng</th>
              <th>Địa điểm</th>
              <th>Tính Thuế</th>
              <th>Cấp Bậc</th>
              <th>Quản Lý Trực Tiếp</th>
              <th>Quản Lý Gián Tiếp</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody className="employee-table-tbody">
            {!filteredEmployees || filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 16 : 15} className="employee-table-empty">
                  <div className="empty-state-content">
                    <div className="empty-state-icon">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z">
                        </path>
                      </svg>
                    </div>
                    <p className="empty-state-title">Không có nhân viên nào khớp bộ lọc</p>
                    <p className="empty-state-description">Điều chỉnh bộ lọc hoặc thử lại sau</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => {
                const isPendingEquipment =
                  (employee.trang_thai || employee.trangThai || employee.status) === 'PENDING';
                const isSelected = selectedEmployees.has(employee.id);
                return (
                  <tr key={employee.id} onClick={() => handleRowClick(employee)} className={isSelected ? 'employee-row-selected' : ''}>
                    {canManage && (
                      <td 
                        className="employee-checkbox-cell" 
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectEmployee(employee.id, e);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="employee-checkbox"
                        />
                      </td>
                    )}
                    <td>{employee.ma_nhan_vien || '-'}</td>
                    <td>{employee.ma_cham_cong || '-'}</td>
                    <td>
                      <span>{employee.ho_ten}</span>
                      {isPendingEquipment && (
                        <span className="employee-warning-text">Cần cập nhật vật dụng</span>
                      )}
                    </td>
                    <td>{employee.chi_nhanh || employee.chiNhanh || '-'}</td>
                    <td>{getDepartmentLabel(employee.phong_ban)}</td>
                    <td>{employee.bo_phan || '-'}</td>
                    <td>{employee.chuc_danh}</td>
                    <td>{formatDateShort(employee.ngay_gia_nhap)}</td>
                    <td>{employee.loai_hop_dong || '-'}</td>
                    <td>{employee.dia_diem || '-'}</td>
                    <td>{employee.tinh_thue || '-'}</td>
                    <td>{employee.cap_bac || '-'}</td>
                    <td>{employee.quan_ly_truc_tiep || employee.quanLyTrucTiep || '-'}</td>
                    <td>{employee.quan_ly_gian_tiep || employee.quanLyGianTiep || '-'}</td>
                    <td>{employee.email || '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {detailModal.isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="detail-modal-overlay" onClick={closeModal}>
            <div className="detail-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="detail-modal-header">
                <div className="detail-modal-title-wrapper">
                  {detailModal.mode === 'edit' && (
                    <div className="detail-modal-icon-edit">
                      <svg className="detail-modal-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                  )}
                  <h2 className="detail-modal-title">
                    {detailModal.mode === 'view'
                      ? 'Thông tin nhân viên'
                      : `Chỉnh sửa Hồ sơ ${detailModal.employee?.ho_ten || detailModal.employee?.hoTen || 'Nhân viên'}`}
                  </h2>
                </div>
                <button className="detail-modal-close" onClick={closeModal}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="detail-modal-body">
                {detailModal.mode === 'edit' ? (
                  <form onSubmit={handleEditSubmit} className="detail-form">
                    {/* Section 01: Thông tin cá nhân */}
                    <div className="detail-form-section">
                      <div className="detail-section-header">
                        <span className="detail-section-badge">01</span>
                        <h3 className="detail-section-title">Thông tin cá nhân</h3>
                      </div>
                      <div className="detail-form-grid">
                        <div className="form-group">
                          <label htmlFor="hoTen">Họ và tên *</label>
                          <input
                            type="text"
                            id="hoTen"
                            name="hoTen"
                            value={editForm.hoTen}
                            onChange={handleEditChange}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="chiNhanh">Chi nhánh</label>
                          <CustomSelect
                            id="chiNhanh"
                            name="chiNhanh"
                            value={editForm.chiNhanh}
                            onChange={handleEditChange}
                            placeholder="Chọn chi nhánh"
                            options={[
                              { value: '', label: 'Chọn chi nhánh' },
                              ...branches.map((branch) => ({
                                value: branch,
                                label: branch
                              }))
                            ]}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="ngayGiaNhap">Ngày nhận việc *</label>
                          <input
                            type="date"
                            id="ngayGiaNhap"
                            name="ngayGiaNhap"
                            value={editForm.ngayGiaNhap}
                            onChange={handleEditChange}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="email">Email</label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={editForm.email}
                            onChange={handleEditChange}
                            placeholder="VD: nv@example.com"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 02: Công việc & Tổ chức */}
                    <div className="detail-form-section">
                      <div className="detail-section-header">
                        <span className="detail-section-badge">02</span>
                        <h3 className="detail-section-title">Công việc & Tổ chức</h3>
                      </div>
                      <div className="detail-form-grid">
                        <div className="form-group">
                          <label htmlFor="chucDanh">Chức danh *</label>
                          <CustomSelect
                            id="chucDanh"
                            name="chucDanh"
                            value={editForm.chucDanh}
                            onChange={handleEditChange}
                            placeholder="Chọn chức danh"
                            required
                            options={(() => {
                              const baseOptions = [
                                { value: '', label: 'Chọn chức danh' },
                                ...jobTitles.map((title) => ({
                                  value: String(title).trim(),
                                  label: String(title).trim()
                                }))
                              ];

                              // If current value exists but not in jobTitles, add it to options
                              if (editForm.chucDanh && editForm.chucDanh.trim() !== '') {
                                const currentValue = editForm.chucDanh.trim();
                                const existsInOptions = baseOptions.some(
                                  opt => String(opt.value).trim() === currentValue
                                );
                                if (!existsInOptions) {
                                  console.log('[EmployeeTable] Adding current chucDanh to options', currentValue);
                                  baseOptions.push({ value: currentValue, label: currentValue });
                                }
                              }

                              return baseOptions;
                            })()}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="phongBan">Phòng ban *</label>
                          <CustomSelect
                            id="phongBan"
                            name="phongBan"
                            value={editForm.phongBan}
                            onChange={handleEditChange}
                            placeholder="Chọn phòng ban"
                            required
                            options={(() => {
                              const baseOptions = [
                                { value: '', label: 'Chọn phòng ban' },
                                ...departments
                                  .filter(dept => dept && String(dept).trim() !== '')
                                  .map((dept) => {
                                    const value = String(dept).trim();
                                    return { value, label: value };
                                  })
                              ];

                              // If current value exists but not in departments, add it to options
                              if (editForm.phongBan && editForm.phongBan.trim() !== '') {
                                const currentValue = editForm.phongBan.trim();
                                const existsInOptions = baseOptions.some(
                                  opt => String(opt.value).trim() === currentValue
                                );
                                if (!existsInOptions) {
                                  console.log('[EmployeeTable] Adding current phongBan to options', currentValue);
                                  baseOptions.push({ value: currentValue, label: currentValue });
                                }
                              }

                              return baseOptions;
                            })()}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="boPhan">Bộ phận *</label>
                          <CustomSelect
                            id="boPhan"
                            name="boPhan"
                            value={editForm.boPhan}
                            onChange={handleEditChange}
                            placeholder="Chọn bộ phận"
                            required
                            options={[
                              { value: '', label: 'Chọn bộ phận' },
                              ...(boPhanList && boPhanList.length > 0
                                ? boPhanList.map((bp) => {
                                  const value = String(bp).trim();
                                  return { value, label: value };
                                })
                                : [])
                            ]}
                          />
                          {boPhanList && boPhanList.length === 0 && (
                            <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                              Không có dữ liệu bộ phận. Vui lòng kiểm tra database.
                            </p>
                          )}
                        </div>
                        <div className="form-group">
                          <label htmlFor="maChamCong">Mã chấm công</label>
                          <input
                            type="text"
                            id="maChamCong"
                            name="maChamCong"
                            value={editForm.maChamCong}
                            onChange={handleEditChange}
                            placeholder="VD: CC001"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="loaiHopDong">Loại hợp đồng</label>
                          <CustomSelect
                            id="loaiHopDong"
                            name="loaiHopDong"
                            value={editForm.loaiHopDong}
                            onChange={handleEditChange}
                            placeholder="Chọn loại hợp đồng"
                            options={[
                              { value: '', label: 'Chọn loại hợp đồng' },
                              ...contractTypes.map((type) => ({
                                value: type,
                                label: type
                              }))
                            ]}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="diaDiem">Địa điểm</label>
                          <CustomSelect
                            id="diaDiem"
                            name="diaDiem"
                            value={editForm.diaDiem}
                            onChange={handleEditChange}
                            placeholder="Chọn địa điểm"
                            options={[
                              { value: '', label: 'Chọn địa điểm' },
                              ...locations.map((location) => ({
                                value: location,
                                label: location
                              }))
                            ]}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="tinhThue">Tính thuế</label>
                          <CustomSelect
                            id="tinhThue"
                            name="tinhThue"
                            value={editForm.tinhThue}
                            onChange={handleEditChange}
                            placeholder="Chọn tính thuế"
                            options={[
                              { value: '', label: 'Chọn tính thuế' },
                              ...taxStatuses.map((status) => ({
                                value: status,
                                label: status
                              }))
                            ]}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="capBac">Cấp bậc</label>
                          <CustomSelect
                            id="capBac"
                            name="capBac"
                            value={editForm.capBac}
                            onChange={handleEditChange}
                            placeholder="Chọn cấp bậc"
                            options={[
                              { value: '', label: 'Chọn cấp bậc' },
                              ...ranks.map((rank) => ({
                                value: rank,
                                label: rank
                              }))
                            ]}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="quanLyTrucTiep">Quản lý trực tiếp</label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              id="quanLyTrucTiep"
                              name="quanLyTrucTiep"
                              value={editForm.quanLyTrucTiep}
                              onChange={(e) => {
                                const value = e.target.value;
                                setEditForm(prev => ({ ...prev, quanLyTrucTiep: value }));
                                setManagerSearchQuery(value);
                                setShowManagerDropdown(true);
                              }}
                              onFocus={() => setShowManagerDropdown(true)}
                              onBlur={() => {
                                // Delay để cho phép click vào dropdown
                                setTimeout(() => setShowManagerDropdown(false), 200);
                              }}
                              placeholder="Gõ tên để tìm kiếm..."
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px'
                              }}
                            />
                            {showManagerDropdown && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 0,
                                  right: 0,
                                  backgroundColor: 'white',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  maxHeight: '200px',
                                  overflowY: 'auto',
                                  zIndex: 1000,
                                  marginTop: '4px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }}
                                onMouseDown={(e) => e.preventDefault()}
                              >
                                {allEmployees
                                  .filter((emp) => {
                                    if (!managerSearchQuery.trim()) return true;
                                    const name = (emp.ho_ten || emp.hoTen || '').toLowerCase();
                                    const query = managerSearchQuery.toLowerCase();
                                    return name.includes(query);
                                  })
                                  .slice(0, 10)
                                  .map((emp) => {
                                    const empName = emp.ho_ten || emp.hoTen || '';
                                    return (
                                      <div
                                        key={emp.id}
                                        onClick={() => {
                                          setEditForm(prev => ({ ...prev, quanLyTrucTiep: empName }));
                                          setManagerSearchQuery('');
                                          setShowManagerDropdown(false);
                                          // Tự động cập nhật quyền quản lý cho nhân viên được chọn
                                          handleUpdateManagerRole(emp.id, empName);
                                        }}
                                        style={{
                                          padding: '8px 12px',
                                          cursor: 'pointer',
                                          borderBottom: '1px solid #f0f0f0'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.backgroundColor = '#f5f5f5';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.backgroundColor = 'white';
                                        }}
                                      >
                                        {empName}
                                      </div>
                                    );
                                  })}
                                {allEmployees.filter((emp) => {
                                  if (!managerSearchQuery.trim()) return true;
                                  const name = (emp.ho_ten || emp.hoTen || '').toLowerCase();
                                  const query = managerSearchQuery.toLowerCase();
                                  return name.includes(query);
                                }).length === 0 && (
                                  <div style={{ padding: '8px 12px', color: '#666' }}>
                                    Không tìm thấy
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="form-group">
                          <label htmlFor="quanLyGianTiep">Quản lý gián tiếp</label>
                          <CustomSelect
                            id="quanLyGianTiep"
                            name="quanLyGianTiep"
                            value={editForm.quanLyGianTiep}
                            onChange={handleEditChange}
                            placeholder="Chọn quản lý gián tiếp"
                            dropup={true}
                            options={[
                              { value: '', label: 'Chọn quản lý gián tiếp' },
                              ...indirectManagersList.map((manager) => ({
                                value: manager,
                                label: manager
                              }))
                            ]}
                          />
                        </div>
                      </div>
                    </div>
                    {formError && <p className="form-error">{formError}</p>}
                    {canManage && (
                      <div className="detail-modal-actions">
                        <button type="submit" className="action-btn save-btn" disabled={loading}>
                          {loading ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              <span>Đang lưu...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Lưu thay đổi</span>
                            </>
                          )}
                        </button>
                        <button type="button" onClick={handleCancelEdit} className="action-btn cancel-btn">
                          Hủy
                        </button>
                      </div>
                    )}
                  </form>
                ) : (
                  <>
                    <div className="detail-info-card">
                      <div className="detail-info-header">
                        <div className="detail-info-header-left">
                          <h3>{detailModal.employee.ho_ten}</h3>
                          <p>{detailModal.employee.chuc_danh || 'Chức danh chưa cập nhật'}</p>
                          <div className="detail-info-contact">
                            <span>Mã NV:</span>
                            <strong>{detailModal.employee.ma_nhan_vien || detailModal.employee.maNhanVien || '-'}</strong>
                          </div>
                        </div>
                        {canManage && (
                          <div className="detail-info-actions">
                            <button type="button" onClick={startEditing} className="action-btn edit-btn">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Chỉnh sửa
                            </button>
                            <button type="button" onClick={handleUpdateEquipmentClick} className="action-btn update-equipment-btn">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Cập nhật vật dụng
                            </button>
                            <button type="button" onClick={handleDelete} className="action-btn delete-btn" disabled={loading}>
                              {loading ? 'Đang xóa...' : 'Xóa nhân viên'}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="detail-info-grid">
                        <div className="detail-info-item">
                          <span className="detail-info-label">Mã nhân viên</span>
                          <p>{detailModal.employee.ma_nhan_vien || '-'}</p>
                        </div>
                        <div className="detail-info-item">
                          <span className="detail-info-label">Mã chấm công</span>
                          <p>{detailModal.employee.ma_cham_cong || '-'}</p>
                        </div>
                        <div className="detail-info-item">
                          <span className="detail-info-label">Chi nhánh</span>
                          <p>{detailModal.employee.chi_nhanh || detailModal.employee.chiNhanh || '-'}</p>
                        </div>
                        <div className="detail-info-item">
                          <span className="detail-info-label">Chức danh</span>
                          <p>{detailModal.employee.chuc_danh || '-'}</p>
                        </div>
                        <div className="detail-info-item">
                          <span className="detail-info-label">Phòng ban</span>
                          <p>{getDepartmentLabel(detailModal.employee.phong_ban)}</p>
                        </div>
                        <div className="detail-info-item">
                          <span className="detail-info-label">Bộ phận</span>
                          <p>{detailModal.employee.bo_phan || '-'}</p>
                        </div>
                        <div className="detail-info-item">
                          <span className="detail-info-label">Ngày nhận việc</span>
                          <p>{formatDateShort(detailModal.employee.ngay_gia_nhap)}</p>
                        </div>
                        <div className="detail-info-item">
                          <span className="detail-info-label">Loại hợp đồng</span>
                          <p>{detailModal.employee.loai_hop_dong || '-'}</p>
                        </div>
                        <div className="detail-info-item">
                          <span className="detail-info-label">Địa điểm</span>
                          <p>{detailModal.employee.dia_diem || '-'}</p>
                        </div>
                        <div className="detail-info-item">
                          <span className="detail-info-label">Tính thuế</span>
                          <p>{detailModal.employee.tinh_thue || '-'}</p>
                        </div>
                        <div className="detail-info-item">
                          <span className="detail-info-label">Cấp bậc</span>
                          <p>{detailModal.employee.cap_bac || '-'}</p>
                        </div>
                        <div className="detail-info-item">
                          <span className="detail-info-label">Email</span>
                          <p>{detailModal.employee.email || '-'}</p>
                        </div>
                        <div className="detail-info-item">
                          <span className="detail-info-label">Quản lý trực tiếp</span>
                          <p>{detailModal.employee.quan_ly_truc_tiep || detailModal.employee.quanLyTrucTiep || '-'}</p>
                        </div>
                        <div className="detail-info-item">
                          <span className="detail-info-label">Quản lý gián tiếp</span>
                          <p>{detailModal.employee.quan_ly_gian_tiep || detailModal.employee.quanLyGianTiep || '-'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="detail-equipment-section">
                      <h3>Vật dụng đã cấp</h3>
                      {renderEquipmentList()}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default EmployeeTable;
