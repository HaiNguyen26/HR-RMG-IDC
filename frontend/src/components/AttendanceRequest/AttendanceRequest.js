import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { employeesAPI, attendanceAdjustmentsAPI } from '../../services/api';
import { formatDateToISO, parseISODateString, today } from '../../utils/dateUtils';
import { DATE_PICKER_LOCALE } from '../../utils/datepickerLocale';
import './AttendanceRequest.css';

const ATTENDANCE_ITEMS = [
  {
    id: 1,
    label: 'Quên Chấm Công',
    type: 'FORGOT_CHECK'
  },
  {
    id: 2,
    label: 'Đi Công Trình',
    type: 'CONSTRUCTION_SITE'
  },
  {
    id: 3,
    label: 'Làm việc bên ngoài',
    type: 'OUTSIDE_WORK'
  }
];

const AttendanceRequest = ({ currentUser, showToast }) => {
  const [formData, setFormData] = useState({
    date: '',
    attendanceItems: [] // Danh sách mục cần bổ sung
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [selectedAttendanceItem, setSelectedAttendanceItem] = useState(null);
  
  // State cho từng mục chi tiết
  const [itemDetails, setItemDetails] = useState({
    item1: { checkInTime: '', checkOutTime: '' }, // Quên Chấm Công
    item2: { location: '', startTime: '', endTime: '' }, // Đi Công Trình
    item3: { location: '', startTime: '', endTime: '' } // Làm việc bên ngoài
  });

  // Fetch employee profile to get manager info
  useEffect(() => {
    const fetchEmployeeProfile = async () => {
      if (!currentUser) return;

      try {
        const candidateIds = [
          currentUser.employeeId,
          currentUser.employee_id,
          currentUser.employee?.id,
          currentUser.id
        ]
          .filter(Boolean)
          .map(id => {
            if (typeof id === 'number') return id;
            const str = String(id).trim();
            const numericMatch = str.match(/^\d+/);
            if (numericMatch) {
              return parseInt(numericMatch[0], 10);
            }
            return null;
          })
          .filter(id => id !== null && !isNaN(id) && id > 0);

        let profile = null;

        for (const id of candidateIds) {
          try {
            const response = await employeesAPI.getById(id);
            if (response.data?.data) {
              profile = response.data.data;
              break;
            }
          } catch (err) {
            continue;
          }
        }

        if (!profile) {
          try {
            const allResponse = await employeesAPI.getAll();
            const employees = allResponse.data?.data || [];
            profile = employees.find((emp) => {
              const targetIds = new Set([
                currentUser.id,
                currentUser.employeeId,
                currentUser.employee_id,
              ].filter(Boolean));
              return targetIds.has(emp.id) || targetIds.has(emp.employeeId) || targetIds.has(emp.employee_id);
            }) || null;
          } catch (err) {
            console.error('[AttendanceRequest] Error fetching all employees:', err);
          }
        }

        setEmployeeProfile(profile);
      } catch (error) {
        console.error('[AttendanceRequest] Error fetching employee profile:', error);
      }
    };

    fetchEmployeeProfile();
  }, [currentUser]);

  // Helper to get value from multiple sources
  const getValue = (...keys) => {
    const sources = [employeeProfile, currentUser];
    for (const source of sources) {
      if (!source) continue;
      for (const key of keys) {
        const value = source?.[key];
        if (value !== undefined && value !== null && value !== '') {
          return value;
        }
      }
    }
    return null;
  };

  const directManagerName = getValue('quanLyTrucTiep', 'quan_ly_truc_tiep', 'team_lead_name') || 'Chưa cập nhật';
  
  // Get employee basic info for read-only fields
  const employeeCode = getValue('maNhanVien', 'ma_nhan_vien', 'employeeCode') || '';
  const employeeName = getValue('hoTen', 'ho_ten', 'fullName', 'name') || '';
  const employeeBranch = getValue('chiNhanh', 'chi_nhanh', 'branch') || '';
  const employeeDepartment = getValue('phongBan', 'phong_ban', 'department') || '';

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleDateChange = (date) => {
    if (!date) {
      handleInputChange('date', '');
    } else {
      handleInputChange('date', formatDateToISO(date));
    }
  };

  const handleTimeChange = (field) => (e) => {
    const value = e.target.value;
    // Validate time format hh:mm
    if (value === '' || /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
      handleInputChange(field, value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.date) {
      setError('Vui lòng chọn ngày cần bổ sung.');
      return;
    }


    if (!selectedAttendanceItem) {
      setError('Vui lòng chọn loại bổ sung chấm công.');
      return;
    }

    if (!formData.attendanceItems || formData.attendanceItems.length === 0) {
      setError('Vui lòng chọn loại bổ sung chấm công.');
      return;
    }

    // Chỉ validate cho item đang được chọn (chỉ có 1 item)
    const selectedItem = formData.attendanceItems[0];
    if (!selectedItem) {
      setError('Vui lòng chọn loại bổ sung chấm công.');
      return;
    }

    // Validate chi tiết của item được chọn
    if (selectedItem.id === 1) {
      // Quên Chấm Công: cần checkInTime và checkOutTime
      if (!selectedItem.details?.checkInTime || !selectedItem.details?.checkOutTime) {
        setError('Vui lòng nhập đầy đủ giờ vào và giờ ra cho mục "Quên Chấm Công".');
        return;
      }
    } else if (selectedItem.id === 2) {
      // Đi Công Trình: cần location, startTime, endTime
      if (!selectedItem.details?.location || !selectedItem.details?.startTime || !selectedItem.details?.endTime) {
        setError('Vui lòng nhập đầy đủ thông tin cho mục "Đi Công Trình" (Địa điểm, Giờ bắt đầu, Giờ kết thúc).');
        return;
      }
    } else if (selectedItem.id === 3) {
      // Làm việc bên ngoài: cần location, startTime, endTime
      if (!selectedItem.details?.location || !selectedItem.details?.startTime || !selectedItem.details?.endTime) {
        setError('Vui lòng nhập đầy đủ thông tin cho mục "Làm việc bên ngoài" (Địa điểm, Giờ bắt đầu, Giờ kết thúc).');
        return;
      }
    }

    setLoading(true);
    try {
      if (!currentUser?.id) {
        setError('Không xác định được thông tin nhân viên. Vui lòng đăng nhập lại.');
        return;
      }

      const payload = {
        employeeId: currentUser.id,
        adjustmentDate: formData.date,
        reason: '', // Không cần lý do cho các loại bổ sung công
        attendanceItems: formData.attendanceItems.map(item => ({
          id: item.id,
          type: item.type,
          label: item.label,
          details: item.details || {}
        }))
      };

      const response = await attendanceAdjustmentsAPI.create(payload);

      if (response.data?.success) {
        if (showToast) {
          showToast('Đơn bổ sung chấm công đã được gửi thành công!', 'success');
        }

        // Reset form
        setFormData({
          date: '',
          reason: '',
          attendanceItems: []
        });
        setSelectedAttendanceItem(null);
        setItemDetails({
          item1: { checkInTime: '', checkOutTime: '' },
          item2: { location: '', startTime: '', endTime: '' },
          item3: { location: '', startTime: '', endTime: '' }
        });
      } else {
        throw new Error(response.data?.message || 'Không thể gửi đơn. Vui lòng thử lại.');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      setError(message);
      if (showToast) {
        showToast(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="attendance-request-container">
      {/* Header with Title */}
      <div className="attendance-request-header">
        <div className="attendance-request-header-content">
          <div className="attendance-request-icon-wrapper">
            <svg className="attendance-request-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h1 className="attendance-request-title">Đơn Bổ sung Chấm công</h1>
            <p className="attendance-request-subtitle">
              Điền đầy đủ thông tin để gửi đơn bổ sung chấm công đến quản lý duyệt.
            </p>
          </div>
        </div>
      </div>

      {/* Form Box - Clean White - 2 Columns */}
      <div className="attendance-request-form-wrapper">
        <form onSubmit={handleSubmit} className="attendance-request-form">
          {/* Error Message */}
          {error && (
            <div className="attendance-request-error">
              <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form Content - 2 Columns */}
          <div className="attendance-form-content">
            {/* Left Column - I. Thông tin cơ bản + II. Thông tin Duyệt */}
            <div className="attendance-form-left-column">
              {/* I. Thông tin cơ bản */}
              <div className="attendance-form-section">
                <h2 className="attendance-section-title">I. Thông tin cơ bản</h2>
                <div className="attendance-form-fields">
                  {/* Employee Code and Name - Side by Side */}
                  <div className="attendance-form-row">
                    <div className="attendance-form-group">
                      <label className="attendance-form-label">
                        <span>Mã Nhân Viên *</span>
                      </label>
                      <input
                        type="text"
                        className="attendance-form-input attendance-form-input-readonly"
                        value={employeeCode}
                        readOnly
                      />
                    </div>
                    <div className="attendance-form-group">
                      <label className="attendance-form-label">
                        <span>Họ và Tên</span>
                      </label>
                      <input
                        type="text"
                        className="attendance-form-input attendance-form-input-readonly"
                        value={employeeName}
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Branch and Department - Side by Side */}
                  <div className="attendance-form-row">
                    <div className="attendance-form-group">
                      <label className="attendance-form-label">
                        <span>Chi Nhánh</span>
                      </label>
                      <input
                        type="text"
                        className="attendance-form-input attendance-form-input-readonly"
                        value={employeeBranch}
                        readOnly
                      />
                    </div>
                    <div className="attendance-form-group">
                      <label className="attendance-form-label">
                        <span>Bộ phận/Phòng ban</span>
                      </label>
                      <input
                        type="text"
                        className="attendance-form-input attendance-form-input-readonly"
                        value={employeeDepartment}
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Date and Loại bổ sung - Side by Side */}
                  <div className="attendance-form-row">
                    <div className="attendance-form-group">
                      <label className="attendance-form-label">
                        <svg className="attendance-label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <span>Ngày cần bổ sung *</span>
                      </label>
                      <div className="attendance-date-picker-wrapper">
                        <DatePicker
                          selected={formData.date ? parseISODateString(formData.date) : null}
                          onChange={handleDateChange}
                          minDate={today()}
                          dateFormat="dd/MM/yyyy"
                          locale={DATE_PICKER_LOCALE}
                          placeholderText="dd/mm/yyyy"
                          className="attendance-form-datepicker"
                          required
                          autoComplete="off"
                        />
                        <svg className="attendance-date-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                    </div>
                    <div className="attendance-form-group">
                      <label className="attendance-form-label">
                        <span>Loại bổ sung *</span>
                      </label>
                      <div className="attendance-items-buttons">
                        {ATTENDANCE_ITEMS.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`attendance-item-button ${selectedAttendanceItem === item.id ? 'active' : ''} ${formData.attendanceItems.some(i => i.id === item.id) ? 'filled' : ''}`}
                            onClick={() => {
                              // Chỉ cho phép chọn 1 loại tại một thời điểm
                              if (selectedAttendanceItem === item.id) {
                                // Nếu đã chọn rồi, có thể bỏ chọn
                                setSelectedAttendanceItem(null);
                                setFormData(prev => ({
                                  ...prev,
                                  attendanceItems: prev.attendanceItems.filter(i => i.id !== item.id)
                                }));
                              } else {
                                // Chọn loại mới, xóa các loại khác
                                setSelectedAttendanceItem(item.id);
                                const itemKey = `item${item.id}`;
                                const currentDetails = itemDetails[itemKey] || {};
                                setFormData(prev => ({
                                  ...prev,
                                  attendanceItems: [{
                                    id: item.id,
                                    type: item.type,
                                    label: item.label,
                                    details: currentDetails
                                  }]
                                }));
                              }
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* II. Thông tin Duyệt */}
              <div className="attendance-form-section attendance-approver-section">
                <h2 className="attendance-section-title">II. Thông tin Duyệt</h2>
                <div className="attendance-form-fields">
                  {/* Manager Field */}
                  <div className="attendance-form-group">
                    <label className="attendance-form-label">
                      <svg className="attendance-label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                      <span>Quản lý trực tiếp *</span>
                    </label>
                    <div className="attendance-form-input-wrapper">
                      <input
                        type="text"
                        className="attendance-form-input attendance-form-input-readonly"
                        value={directManagerName}
                        readOnly
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Form chi tiết mục được chọn */}
            <div className="attendance-form-right-column">
              {selectedAttendanceItem && (() => {
                const currentItem = ATTENDANCE_ITEMS.find(item => item.id === selectedAttendanceItem);
                const itemKey = `item${selectedAttendanceItem}`;
                const currentDetails = itemDetails[itemKey] || {};
                const savedItem = formData.attendanceItems.find(item => item.id === selectedAttendanceItem);
                const displayDetails = savedItem?.details || currentDetails;

                const handleItemDetailChange = (field, value) => {
                  setItemDetails(prev => ({
                    ...prev,
                    [itemKey]: {
                      ...prev[itemKey],
                      [field]: value
                    }
                  }));

                  // Auto-save vào attendanceItems
                  const updatedDetails = {
                    ...displayDetails,
                    [field]: value
                  };

                  const newItem = {
                    id: currentItem.id,
                    type: currentItem.type,
                    label: currentItem.label,
                    details: updatedDetails
                  };

                  setFormData(prev => {
                    // Chỉ giữ lại item đang được chọn, cập nhật details của nó
                    return {
                      ...prev,
                      attendanceItems: [newItem] // Chỉ có 1 item được chọn tại một thời điểm
                    };
                  });
                };

                return (
                  <div className="attendance-item-detail-form">
                    <div className="attendance-item-detail-header">
                      <h3 className="attendance-item-detail-title">{currentItem.label}</h3>
                      <button
                        type="button"
                        className="attendance-item-detail-close"
                        onClick={() => setSelectedAttendanceItem(null)}
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </div>
                    <div className="attendance-item-detail-body">
                      {selectedAttendanceItem === 1 ? (
                        /* Mục 1: Quên Chấm Công */
                        <div className="attendance-item-form">
                          <div className="attendance-item-form-group">
                            <label className="attendance-item-form-label">Giờ vào *</label>
                            <div className="attendance-time-picker-wrapper">
                              <input
                                type="time"
                                className="attendance-form-timepicker"
                                value={displayDetails.checkInTime || ''}
                                onChange={(e) => handleItemDetailChange('checkInTime', e.target.value)}
                                onClick={(e) => e.target.showPicker?.()}
                              />
                              <svg className="attendance-time-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                            </div>
                          </div>
                          <div className="attendance-item-form-group">
                            <label className="attendance-item-form-label">Giờ ra *</label>
                            <div className="attendance-time-picker-wrapper">
                              <input
                                type="time"
                                className="attendance-form-timepicker"
                                value={displayDetails.checkOutTime || ''}
                                onChange={(e) => handleItemDetailChange('checkOutTime', e.target.value)}
                                onClick={(e) => e.target.showPicker?.()}
                              />
                              <svg className="attendance-time-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : selectedAttendanceItem === 2 ? (
                        /* Mục 2: Đi Công Trình */
                        <div className="attendance-item-form">
                          <div className="attendance-item-form-group">
                            <label className="attendance-item-form-label">Địa điểm công trình *</label>
                            <input
                              type="text"
                              className="attendance-form-input"
                              value={displayDetails.location || ''}
                              onChange={(e) => handleItemDetailChange('location', e.target.value)}
                              placeholder="Nhập địa điểm công trình..."
                            />
                          </div>
                          <div className="attendance-item-form-row">
                            <div className="attendance-item-form-group">
                              <label className="attendance-item-form-label">Giờ bắt đầu *</label>
                              <div className="attendance-time-picker-wrapper">
                                <input
                                  type="time"
                                  className="attendance-form-timepicker"
                                  value={displayDetails.startTime || ''}
                                  onChange={(e) => handleItemDetailChange('startTime', e.target.value)}
                                  onClick={(e) => e.target.showPicker?.()}
                                />
                                <svg className="attendance-time-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                              </div>
                            </div>
                            <div className="attendance-item-form-group">
                              <label className="attendance-item-form-label">Giờ kết thúc *</label>
                              <div className="attendance-time-picker-wrapper">
                                <input
                                  type="time"
                                  className="attendance-form-timepicker"
                                  value={displayDetails.endTime || ''}
                                  onChange={(e) => handleItemDetailChange('endTime', e.target.value)}
                                  onClick={(e) => e.target.showPicker?.()}
                                />
                                <svg className="attendance-time-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Mục 3: Làm việc bên ngoài */
                        <div className="attendance-item-form">
                          <div className="attendance-item-form-group">
                            <label className="attendance-item-form-label">Địa điểm làm việc *</label>
                            <input
                              type="text"
                              className="attendance-form-input"
                              value={displayDetails.location || ''}
                              onChange={(e) => handleItemDetailChange('location', e.target.value)}
                              placeholder="Nhập địa điểm làm việc bên ngoài..."
                            />
                          </div>
                          <div className="attendance-item-form-row">
                            <div className="attendance-item-form-group">
                              <label className="attendance-item-form-label">Giờ bắt đầu *</label>
                              <div className="attendance-time-picker-wrapper">
                                <input
                                  type="time"
                                  className="attendance-form-timepicker"
                                  value={displayDetails.startTime || ''}
                                  onChange={(e) => handleItemDetailChange('startTime', e.target.value)}
                                  onClick={(e) => e.target.showPicker?.()}
                                />
                                <svg className="attendance-time-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                              </div>
                            </div>
                            <div className="attendance-item-form-group">
                              <label className="attendance-item-form-label">Giờ kết thúc *</label>
                              <div className="attendance-time-picker-wrapper">
                                <input
                                  type="time"
                                  className="attendance-form-timepicker"
                                  value={displayDetails.endTime || ''}
                                  onChange={(e) => handleItemDetailChange('endTime', e.target.value)}
                                  onClick={(e) => e.target.showPicker?.()}
                                />
                                <svg className="attendance-time-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="attendance-submit-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="attendance-button-spinner"></div>
                <span>Đang gửi...</span>
              </>
            ) : (
              <>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="attendance-submit-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
                <span>Gửi Yêu cầu Bổ sung</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AttendanceRequest;
