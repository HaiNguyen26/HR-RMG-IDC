import React, { useState, useEffect, useRef } from 'react';
import { employeesAPI } from '../../services/api';
import EquipmentAssignment from '../EquipmentAssignment/EquipmentAssignment';
import CustomSelect from '../Common/CustomSelect/CustomSelect';
import './EmployeeForm.css';

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
      // Use setTimeout to ensure the menu is rendered before attaching listener
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
      return; // Prevent selecting placeholder
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

  // Filter out placeholder option (empty value) from display
  // Also filter out null/undefined values
  const displayOptions = options.filter(opt => {
    if (!opt) return false;
    // Allow empty string for placeholder, but filter it out from display
    if (opt.value === '' || opt.value === null || opt.value === undefined) return false;
    // Ensure label exists
    if (opt.label === null || opt.label === undefined) return false;
    return true;
  });

  // Debug log
  if (options.length > 0 && displayOptions.length === 0) {
    console.warn('CustomDropdown (EmployeeForm): All options filtered out!', {
      totalOptions: options.length,
      options: options.slice(0, 5)
    });
  }

  return (
    <div className={`custom-dropdown-wrapper ${className} ${error ? 'error' : ''} ${isOpen ? 'open' : ''}`} ref={dropdownRef}>
      <button
        type="button"
        className={`custom-dropdown-trigger ${isOpen ? 'open' : ''} ${error ? 'error' : ''}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseDown={(e) => {
          // Prevent blur when clicking the trigger
          if (!isOpen) {
            e.preventDefault();
          }
        }}
      >
        <span className="custom-dropdown-value">
          {selectedOption && String(selectedOption.value) !== '' ? selectedOption.label : placeholder}
        </span>
        <svg className="custom-dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      {isOpen && displayOptions.length > 0 && (
        <div
          ref={menuRef}
          className="custom-dropdown-menu"
        >
          {displayOptions.map((option, index) => (
            <button
              key={option.value !== null && option.value !== undefined && option.value !== ''
                ? String(option.value)
                : `option-${index}-${String(option.label || 'empty')}`}
              type="button"
              className={`custom-dropdown-option ${String(value) === String(option.value) ? 'selected' : ''}`}
              onMouseDown={(e) => {
                // Prevent blur event and allow click to work
                e.preventDefault();
                // Manually trigger click
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
          className="custom-dropdown-menu"
        >
          <div style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
            Không có dữ liệu
          </div>
        </div>
      )}
    </div>
  );
};

const EmployeeForm = ({ onSuccess, onCancel, currentUser, showToast, showConfirm }) => {
  const [formData, setFormData] = useState({
    maNhanVien: '',
    maChamCong: '',
    hoTen: '',
    chucDanh: '',
    phongBan: '',
    boPhan: '',
    chiNhanh: '',
    ngayGiaNhap: '',
    loaiHopDong: '',
    diaDiem: '',
    tinhThue: '',
    capBac: '',
    email: '',
    quanLyTrucTiep: '',
    quanLyGianTiep: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [createdEmployee, setCreatedEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [boPhanList, setBoPhanList] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [contractTypes, setContractTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [taxStatuses, setTaxStatuses] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [managerSearchQuery, setManagerSearchQuery] = useState('');
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleDateChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      ngayGiaNhap: value || '',
    }));
    setError('');
  };

  // Fetch all options from database
  useEffect(() => {
    const fetchOptions = async () => {
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
          managersResponse
        ] = await Promise.all([
          employeesAPI.getDepartments(),
          employeesAPI.getBoPhan(),
          employeesAPI.getJobTitles(),
          employeesAPI.getBranches(),
          employeesAPI.getContractTypes(),
          employeesAPI.getLocations(),
          employeesAPI.getTaxStatuses(),
          employeesAPI.getRanks(),
          employeesAPI.getManagers()
        ]);

        // Helper function to clean and deduplicate data
        const cleanData = (data) => {
          if (!Array.isArray(data)) return [];
          return data
            .filter(item => item != null && String(item).trim() !== '')
            .map(item => String(item).trim())
            .filter((item, index, self) => self.indexOf(item) === index);
        };

        if (deptResponse.data?.success) {
          setDepartments(cleanData(deptResponse.data.data || []));
        }

        if (boPhanResponse.data?.success) {
          setBoPhanList(cleanData(boPhanResponse.data.data || []));
        }

        if (jobTitlesResponse.data?.success) {
          const jobTitlesData = jobTitlesResponse.data.data || [];
          console.log('[EmployeeForm] Job titles response:', jobTitlesData);
          const cleanedJobTitles = cleanData(jobTitlesData);
          setJobTitles(cleanedJobTitles);
          console.log('[EmployeeForm] ✅ Job titles loaded:', cleanedJobTitles.length, 'items');
          if (cleanedJobTitles.length > 0) {
            console.log('[EmployeeForm] Job titles sample:', cleanedJobTitles.slice(0, 5));
          } else {
            console.warn('[EmployeeForm] ⚠️ No job titles after cleaning!');
          }
        } else {
          console.warn('[EmployeeForm] ❌ Job titles response not successful:', jobTitlesResponse.data);
          console.warn('[EmployeeForm] Full job titles response:', jobTitlesResponse);
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
          console.log('[EmployeeForm] Managers response:', managersData.length, 'items');
          console.log('[EmployeeForm] Managers sample:', managersData.slice(0, 3));

          // Managers giờ là array of strings (tên quản lý trực tiếp)
          const managerNames = cleanData(managersData);

          console.log('[EmployeeForm] Manager names extracted:', managerNames.length, 'items');
          if (managerNames.length > 0) {
            console.log('[EmployeeForm] Manager names sample:', managerNames.slice(0, 5));
          }
          setManagers(managerNames);
        } else {
          console.warn('[EmployeeForm] Managers response not successful:', managersResponse.data);
        }
      } catch (error) {
        console.error('Error fetching options:', error);
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
        console.error('[EmployeeForm] Error fetching all employees:', error);
      }
    };
    fetchAllEmployees();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate form
    if (!formData.hoTen || !formData.chucDanh || !formData.phongBan || !formData.boPhan || !formData.ngayGiaNhap) {
      setError('Vui lòng điền đầy đủ thông tin');
      setLoading(false);
      return;
    }

    try {
      // Bước 1: Tạo nhân viên trong database
      const createResponse = await employeesAPI.create({
        maNhanVien: formData.maNhanVien || null,
        maChamCong: formData.maChamCong || null,
        hoTen: formData.hoTen,
        chucDanh: formData.chucDanh,
        phongBan: formData.phongBan,
        boPhan: formData.boPhan,
        chiNhanh: formData.chiNhanh || null,
        ngayGiaNhap: formData.ngayGiaNhap,
        loaiHopDong: formData.loaiHopDong || null,
        diaDiem: formData.diaDiem || null,
        tinhThue: formData.tinhThue || null,
        capBac: formData.capBac || null,
        email: formData.email || null,
        quanLyTrucTiep: formData.quanLyTrucTiep || null,
        quanLyGianTiep: formData.quanLyGianTiep || null,
      });

      if (!createResponse.data.success) {
        throw new Error(createResponse.data.message || 'Lỗi khi tạo nhân viên');
      }

      const newEmployee = createResponse.data.data;
      setLoading(false);

      // Bước 2: Hiển thị modal xác nhận có muốn cập nhật/yêu cầu vật dụng không
      if (showConfirm) {
        const confirmed = await showConfirm({
          title: 'Cập nhật vật dụng',
          message: 'Bạn có muốn cập nhật hoặc yêu cầu vật dụng cho nhân viên mới này không?',
          confirmText: 'Có',
          cancelText: 'Không',
          type: 'info',
        });

        if (confirmed) {
          // Nếu chọn "Có", mở modal EquipmentAssignment
          setCreatedEmployee(newEmployee);
          setIsEquipmentModalOpen(true);
        } else {
          // Nếu chọn "Không", chỉ đóng form và refresh
          if (showToast) {
            showToast('Đã tạo nhân viên thành công!', 'success');
          }
          onSuccess(newEmployee);
        }
      } else {
        // Nếu không có showConfirm, chỉ đóng form
        if (showToast) {
          showToast('Đã tạo nhân viên thành công!', 'success');
        }
        onSuccess(newEmployee);
      }
    } catch (err) {
      console.error('Error creating employee:', err);
      setError(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi tạo nhân viên');
      setLoading(false);
    }
  };

  return (
    <div className="employee-form-modal-overlay" onClick={onCancel}>
      <div className="employee-form-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header với tiêu đề và icon */}
        <div className="employee-form-header">
          <div className="employee-form-icon-large">
            <svg className="employee-form-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              ></path>
            </svg>
          </div>
          <h1 className="employee-form-title">Thông tin nhân viên mới</h1>
          <button
            type="button"
            className="employee-form-close-btn"
            onClick={onCancel}
            aria-label="Đóng"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="employee-form">
          {/* Section 01: Thông tin cá nhân */}
          <div className="form-section form-section-01">
            <div className="section-header">
              <span className="section-badge">01</span>
              <h3 className="section-title">Thông tin cá nhân</h3>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="maNhanVien" className="form-label">
                  Mã nhân viên
                </label>
                <input
                  type="text"
                  id="maNhanVien"
                  name="maNhanVien"
                  value={formData.maNhanVien}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="VD: NV0001 (tự động nếu để trống)"
                />
                <p className="form-help-text">Để trống để hệ thống tự tạo mã</p>
              </div>

              <div className="form-group">
                <label htmlFor="maChamCong" className="form-label">
                  Mã chấm công
                </label>
                <input
                  type="text"
                  id="maChamCong"
                  name="maChamCong"
                  value={formData.maChamCong}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="VD: CC001"
                />
              </div>

              <div className="form-group">
                <label htmlFor="hoTen" className="form-label">
                  Họ tên *
                </label>
                <input
                  type="text"
                  id="hoTen"
                  name="hoTen"
                  value={formData.hoTen}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Nhập họ và tên"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="VD: nv@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="ngayGiaNhap" className="form-label">
                  Ngày nhận việc *
                </label>
                <input
                  type="date"
                  id="ngayGiaNhap"
                  name="ngayGiaNhap"
                  value={formData.ngayGiaNhap || ''}
                  onChange={handleDateChange}
                  className="form-input"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="form-group form-group-chi-nhanh">
                <label htmlFor="chiNhanh" className="form-label">
                  Chi nhánh
                </label>
                <CustomSelect
                  id="chiNhanh"
                  name="chiNhanh"
                  value={formData.chiNhanh}
                  onChange={handleChange}
                  placeholder="Chọn chi nhánh"
                  className="custom-select-chi-nhanh"
                  options={[
                    { value: '', label: 'Chọn chi nhánh' },
                    ...branches.map((branch) => ({
                      value: branch,
                      label: branch
                    }))
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Section 02: Công việc & Tổ chức */}
          <div className="form-section form-section-02">
            <div className="section-header">
              <span className="section-badge">02</span>
              <h3 className="section-title">Công việc & Tổ chức</h3>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="chucDanh" className="form-label">
                  Chức danh *
                </label>
                <CustomSelect
                  id="chucDanh"
                  name="chucDanh"
                  value={formData.chucDanh}
                  onChange={handleChange}
                  placeholder="Chọn chức danh"
                  required
                  options={[
                    { value: '', label: 'Chọn chức danh' },
                    ...jobTitles.map((title) => ({
                      value: title,
                      label: title
                    }))
                  ]}
                />
              </div>

              <div className="form-group">
                <label htmlFor="phongBan" className="form-label">
                  Phòng ban *
                </label>
                <CustomSelect
                  id="phongBan"
                  name="phongBan"
                  value={formData.phongBan}
                  onChange={handleChange}
                  placeholder="Chọn phòng ban"
                  required
                  options={[
                    { value: '', label: 'Chọn phòng ban' },
                    ...departments
                      .filter(dept => dept && String(dept).trim() !== '')
                      .map((dept) => {
                        const value = String(dept).trim();
                        return { value, label: value };
                      })
                  ]}
                />
              </div>

              <div className="form-group">
                <label htmlFor="boPhan" className="form-label">
                  Bộ phận *
                </label>
                <CustomSelect
                  id="boPhan"
                  name="boPhan"
                  value={formData.boPhan}
                  onChange={handleChange}
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
                {boPhanList && boPhanList.length === 0 && !loadingOptions && (
                  <p className="form-help-text" style={{ color: '#ef4444', marginTop: '6px' }}>
                    Không có dữ liệu bộ phận. Vui lòng kiểm tra database.
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="loaiHopDong" className="form-label">
                  Loại hợp đồng
                </label>
                <CustomSelect
                  id="loaiHopDong"
                  name="loaiHopDong"
                  value={formData.loaiHopDong}
                  onChange={handleChange}
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
                <label htmlFor="diaDiem" className="form-label">
                  Địa điểm
                </label>
                <CustomSelect
                  id="diaDiem"
                  name="diaDiem"
                  value={formData.diaDiem}
                  onChange={handleChange}
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
                <label htmlFor="tinhThue" className="form-label">
                  Tính thuế
                </label>
                <CustomSelect
                  id="tinhThue"
                  name="tinhThue"
                  value={formData.tinhThue}
                  onChange={handleChange}
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
                <label htmlFor="capBac" className="form-label">
                  Cấp bậc
                </label>
                <CustomSelect
                  id="capBac"
                  name="capBac"
                  value={formData.capBac}
                  onChange={handleChange}
                  placeholder="Chọn cấp bậc"
                  dropup={true}
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
                <label htmlFor="quanLyTrucTiep" className="form-label">
                  Quản lý trực tiếp
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    id="quanLyTrucTiep"
                    name="quanLyTrucTiep"
                    value={formData.quanLyTrucTiep}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({ ...prev, quanLyTrucTiep: value }));
                      setManagerSearchQuery(value);
                      setShowManagerDropdown(true);
                    }}
                    onFocus={() => setShowManagerDropdown(true)}
                    onBlur={() => {
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
                                setFormData(prev => ({ ...prev, quanLyTrucTiep: empName }));
                                setManagerSearchQuery('');
                                setShowManagerDropdown(false);
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
                <label htmlFor="quanLyGianTiep" className="form-label">
                  Quản lý gián tiếp
                </label>
                <CustomSelect
                  id="quanLyGianTiep"
                  name="quanLyGianTiep"
                  value={formData.quanLyGianTiep}
                  onChange={handleChange}
                  placeholder="Chọn quản lý gián tiếp"
                  dropup={true}
                  options={[
                    { value: '', label: 'Chọn quản lý gián tiếp' },
                    ...managers.map((manager) => ({
                      value: manager,
                      label: manager
                    }))
                  ]}
                />
              </div>

              {/* Form Actions - Nằm cùng hàng với Quản lý gián tiếp */}
              <div className="form-group form-actions-inline">
                <label className="form-label" style={{ visibility: 'hidden' }}>Actions</label>
                <div className="form-actions">
                  <button type="button" onClick={onCancel} className="btn-cancel" disabled={loading}>
                    Hủy
                  </button>
                  <button type="submit" className="btn-submit" disabled={loading}>
                    {loading ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          ></path>
                        </svg>
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          ></path>
                        </svg>
                        <span>Lưu lại</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Equipment Assignment Modal */}
      {isEquipmentModalOpen && createdEmployee && (
        <EquipmentAssignment
          employee={createdEmployee}
          onComplete={() => {
            setIsEquipmentModalOpen(false);
            setCreatedEmployee(null);
            if (showToast) {
              showToast('Đã cập nhật vật dụng cho nhân viên thành công!', 'success');
            }
            onSuccess(createdEmployee);
          }}
          onCancel={() => {
            setIsEquipmentModalOpen(false);
            setCreatedEmployee(null);
            onSuccess(createdEmployee);
          }}
          currentUser={currentUser}
          showToast={showToast}
        />
      )}
    </div>
  );
};

export default EmployeeForm;
