import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { employeesAPI, attendanceAdjustmentsAPI } from '../../services/api';
import { formatDateToISO, parseISODateString } from '../../utils/dateUtils';
import { DATE_PICKER_LOCALE } from '../../utils/datepickerLocale';
import TimePicker24h from '../TimePicker24h/TimePicker24h';
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

const MAX_DATE_RANGE_DAYS = 60; // Giới hạn tối đa 60 ngày cho "Đi công trình" / "Làm việc bên ngoài"

const AttendanceRequest = ({ currentUser, showToast }) => {
  const [formData, setFormData] = useState({
    date: '',
    dateEnd: '', // Khoảng đến ngày (chỉ dùng cho Đi công trình / Làm việc bên ngoài)
    reason: '', // Lý do bổ sung chấm công
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
      // Nếu đang chọn khoảng ngày và dateEnd nhỏ hơn date mới thì xóa dateEnd
      const currentEnd = formData.dateEnd ? parseISODateString(formData.dateEnd) : null;
      if (currentEnd && date > currentEnd) {
        setFormData(prev => ({ ...prev, date: formatDateToISO(date), dateEnd: '' }));
      }
    }
  };

  const handleDateEndChange = (date) => {
    if (!date) {
      setFormData(prev => ({ ...prev, dateEnd: '' }));
    } else {
      setFormData(prev => ({ ...prev, dateEnd: formatDateToISO(date) }));
    }
    setError('');
  };

  // Sinh danh sách ngày từ start đến end (inclusive), format ISO date only
  const getDatesBetween = (startISO, endISO) => {
    const start = parseISODateString(startISO);
    const end = parseISODateString(endISO);
    if (!start || !end || start > end) return [];
    const dates = [];
    const d = new Date(start);
    d.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
    while (d <= endDate) {
      dates.push(formatDateToISO(d));
      d.setDate(d.getDate() + 1);
    }
    return dates;
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
    const isDateRangeType = selectedAttendanceItem === 2 || selectedAttendanceItem === 3;
    if (!formData.date) {
      setError(isDateRangeType ? 'Vui lòng chọn từ ngày.' : 'Vui lòng chọn ngày cần bổ sung.');
      return;
    }
    if (isDateRangeType) {
      if (!formData.dateEnd) {
        setError('Vui lòng chọn đến ngày.');
        return;
      }
      const start = parseISODateString(formData.date);
      const end = parseISODateString(formData.dateEnd);
      if (start > end) {
        setError('Từ ngày phải trước hoặc bằng đến ngày.');
        return;
      }
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (daysDiff > MAX_DATE_RANGE_DAYS) {
        setError(`Chỉ được chọn tối đa ${MAX_DATE_RANGE_DAYS} ngày liên tiếp. Bạn đã chọn ${daysDiff} ngày.`);
        return;
      }
    }

    if (!formData.reason || formData.reason.trim() === '') {
      setError('Vui lòng nhập lý do bổ sung chấm công.');
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

    // Gộp details từ formData và itemDetails để luôn dùng giá trị mới nhất (tránh lỗi khi state chưa kịp cập nhật)
    const itemKey = `item${selectedItem.id}`;
    const effectiveDetails = { ...(selectedItem.details || {}), ...(itemDetails[itemKey] || {}) };

    // Validate chi tiết của item được chọn
    if (selectedItem.id === 1) {
      // Quên Chấm Công: cần ít nhất một trong hai (giờ vào hoặc giờ ra)
      const hasCheckIn = effectiveDetails.checkInTime && String(effectiveDetails.checkInTime).trim() !== '';
      const hasCheckOut = effectiveDetails.checkOutTime && String(effectiveDetails.checkOutTime).trim() !== '';

      if (!hasCheckIn && !hasCheckOut) {
        setError('Vui lòng nhập ít nhất giờ vào hoặc giờ ra cho mục "Quên Chấm Công".');
        return;
      }

      // Tự động xác định label dựa trên dữ liệu nhập vào
      let label = 'Quên Chấm Công';
      if (hasCheckIn && !hasCheckOut) {
        label = 'Quên giờ vào';
      } else if (!hasCheckIn && hasCheckOut) {
        label = 'Quên giờ ra';
      } else if (hasCheckIn && hasCheckOut) {
        label = 'Quên chấm công vào và ra';
      }

      // Cập nhật label trong attendanceItems
      setFormData(prev => ({
        ...prev,
        attendanceItems: prev.attendanceItems.map(item =>
          item.id === selectedItem.id ? { ...item, label, details: effectiveDetails } : item
        )
      }));
    } else if (selectedItem.id === 2) {
      // Đi Công Trình: cần location, startTime, endTime
      const loc = effectiveDetails.location && String(effectiveDetails.location).trim() !== '';
      const start = effectiveDetails.startTime && String(effectiveDetails.startTime).trim() !== '';
      const end = effectiveDetails.endTime && String(effectiveDetails.endTime).trim() !== '';
      if (!loc || !start || !end) {
        setError('Vui lòng nhập đầy đủ thông tin cho mục "Đi Công Trình" (Địa điểm, Giờ bắt đầu, Giờ kết thúc).');
        return;
      }
    } else if (selectedItem.id === 3) {
      // Làm việc bên ngoài: cần location, startTime, endTime
      const loc = effectiveDetails.location && String(effectiveDetails.location).trim() !== '';
      const start = effectiveDetails.startTime && String(effectiveDetails.startTime).trim() !== '';
      const end = effectiveDetails.endTime && String(effectiveDetails.endTime).trim() !== '';
      if (!loc || !start || !end) {
        setError('Vui lòng nhập đầy đủ thông tin cho mục "Làm việc bên ngoài" (Địa điểm, Giờ bắt đầu, Giờ kết thúc).');
        return;
      }
    }

    setLoading(true);
    try {
      if (!currentUser?.id) {
        setError('Không xác định được thông tin nhân viên. Vui lòng đăng nhập lại.');
        setLoading(false);
        return;
      }

      const reasonTrimmed = formData.reason.trim();
      // Dùng effectiveDetails đã merge (formData + itemDetails) cho item đang chọn để tránh mất dữ liệu
      const detailsForPayload = { ...(selectedItem.details || {}), ...effectiveDetails };
      const itemsPayload = formData.attendanceItems.map(item => ({
        id: item.id,
        type: item.type,
        label: item.label,
        details: item.id === selectedItem.id ? detailsForPayload : (item.details || {})
      }));

      const isDateRangeType = selectedAttendanceItem === 2 || selectedAttendanceItem === 3;
      const datesToSubmit = isDateRangeType && formData.dateEnd
        ? getDatesBetween(formData.date, formData.dateEnd)
        : [formData.date];

      let successCount = 0;
      let lastError = null;

      const dateRangeStart = isDateRangeType && formData.date ? formData.date : null;
      const dateRangeEnd = isDateRangeType && formData.dateEnd ? formData.dateEnd : null;

      for (const adjustmentDate of datesToSubmit) {
        try {
          const payload = {
            employeeId: currentUser.id,
            adjustmentDate,
            reason: reasonTrimmed,
            attendanceItems: itemsPayload
          };
          if (dateRangeStart && dateRangeEnd) {
            payload.dateRangeStart = dateRangeStart;
            payload.dateRangeEnd = dateRangeEnd;
          }
          const response = await attendanceAdjustmentsAPI.create(payload);
          if (response.data?.success) {
            successCount += 1;
          } else {
            lastError = new Error(response.data?.message || 'Không thể gửi đơn.');
            break;
          }
        } catch (err) {
          lastError = err;
          break;
        }
      }

      if (successCount === datesToSubmit.length) {
        const dateStartStr = formData.date ? parseISODateString(formData.date).toLocaleDateString('vi-VN') : '';
        const dateEndStr = formData.dateEnd ? parseISODateString(formData.dateEnd).toLocaleDateString('vi-VN') : '';
        const message = datesToSubmit.length > 1
          ? `Đã gửi ${successCount} đơn bổ sung chấm công (từ ${dateStartStr} đến ${dateEndStr}).`
          : 'Đơn bổ sung chấm công đã được gửi thành công!';
        if (showToast) showToast(message, 'success');

        setFormData({
          date: '',
          dateEnd: '',
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
        const message = lastError?.response?.data?.message || lastError?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
        setError(successCount > 0 ? `Đã gửi ${successCount}/${datesToSubmit.length} đơn. Lỗi: ${message}` : message);
        if (showToast) showToast(message, 'error');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      setError(message);
      if (showToast) showToast(message, 'error');
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

                  {/* Date: một ngày (Quên chấm công) hoặc khoảng ngày (Đi công trình / Làm việc bên ngoài) */}
                  <div className="attendance-form-row">
                    {selectedAttendanceItem === 2 || selectedAttendanceItem === 3 ? (
                      <>
                        <div className="attendance-form-group">
                          <label className="attendance-form-label">
                            <svg className="attendance-label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <span>Từ ngày *</span>
                          </label>
                          <div className="attendance-date-picker-wrapper">
                            <DatePicker
                              selected={formData.date ? parseISODateString(formData.date) : null}
                              onChange={handleDateChange}
                              dateFormat="dd/MM/yyyy"
                              locale={DATE_PICKER_LOCALE}
                              placeholderText="dd/mm/yyyy"
                              className="attendance-form-datepicker"
                              maxDate={formData.dateEnd ? parseISODateString(formData.dateEnd) : undefined}
                              autoComplete="off"
                            />
                            <svg className="attendance-date-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                          </div>
                        </div>
                        <div className="attendance-form-group">
                          <label className="attendance-form-label">
                            <svg className="attendance-label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <span>Đến ngày *</span>
                          </label>
                          <div className="attendance-date-picker-wrapper">
                            <DatePicker
                              selected={formData.dateEnd ? parseISODateString(formData.dateEnd) : null}
                              onChange={handleDateEndChange}
                              dateFormat="dd/MM/yyyy"
                              locale={DATE_PICKER_LOCALE}
                              placeholderText="dd/mm/yyyy"
                              className="attendance-form-datepicker"
                              minDate={formData.date ? parseISODateString(formData.date) : undefined}
                              autoComplete="off"
                            />
                            <svg className="attendance-date-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                          </div>
                        </div>
                        {(formData.date || formData.dateEnd) && (
                          <p className="attendance-form-hint" style={{ gridColumn: '1 / -1', marginTop: '-0.25rem', marginBottom: 0, fontSize: '0.8125rem', color: '#6b7280' }}>
                            Áp dụng cùng địa điểm và giờ cho tất cả các ngày trong khoảng (tối đa {MAX_DATE_RANGE_DAYS} ngày).
                          </p>
                        )}
                      </>
                    ) : (
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
                        {selectedAttendanceItem === 1 && (
                          <p className="attendance-form-hint" style={{ gridColumn: '1 / -1', marginTop: '0.25rem', marginBottom: 0, fontSize: '0.8125rem', color: '#6b7280' }}>
                            Tối đa 3 đơn quên chấm công trong 1 tháng.
                          </p>
                        )}
                      </div>
                    )}
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
                                const isRangeType = item.id === 2 || item.id === 3;
                                setFormData(prev => ({
                                  ...prev,
                                  dateEnd: isRangeType ? prev.dateEnd : '', // Quên chấm công không dùng đến ngày
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
                  // Format time fields to 24-hour format
                  let formattedValue = value;
                  if ((field === 'checkInTime' || field === 'checkOutTime' || field === 'startTime' || field === 'endTime') && value) {
                    if (value.includes(':')) {
                      const [hours, minutes] = value.split(':');
                      const hours24 = parseInt(hours, 10);

                      // Ensure hours are in 24h format (0-23)
                      if (hours24 >= 0 && hours24 <= 23) {
                        // Format as HH:mm (2 digits for hours and minutes)
                        formattedValue = `${hours24.toString().padStart(2, '0')}:${minutes || '00'}`;
                      }
                    }
                  }

                  setItemDetails(prev => ({
                    ...prev,
                    [itemKey]: {
                      ...prev[itemKey],
                      [field]: formattedValue
                    }
                  }));

                  // Auto-save vào attendanceItems
                  const updatedDetails = {
                    ...displayDetails,
                    [field]: formattedValue
                  };

                  // Tự động xác định label cho "Quên Chấm Công"
                  let label = currentItem.label;
                  if (selectedAttendanceItem === 1) {
                    const hasCheckIn = updatedDetails.checkInTime && updatedDetails.checkInTime.trim() !== '';
                    const hasCheckOut = updatedDetails.checkOutTime && updatedDetails.checkOutTime.trim() !== '';

                    if (hasCheckIn && !hasCheckOut) {
                      label = 'Quên giờ vào';
                    } else if (!hasCheckIn && hasCheckOut) {
                      label = 'Quên giờ ra';
                    } else if (hasCheckIn && hasCheckOut) {
                      label = 'Quên chấm công vào và ra';
                    } else {
                      label = 'Quên Chấm Công';
                    }
                  }

                  const newItem = {
                    id: currentItem.id,
                    type: currentItem.type,
                    label: label,
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

                // Xác định label hiển thị cho "Quên Chấm Công"
                let displayTitle = currentItem.label;
                if (selectedAttendanceItem === 1) {
                  const hasCheckIn = displayDetails.checkInTime && displayDetails.checkInTime.trim() !== '';
                  const hasCheckOut = displayDetails.checkOutTime && displayDetails.checkOutTime.trim() !== '';

                  if (hasCheckIn && !hasCheckOut) {
                    displayTitle = 'Quên giờ vào';
                  } else if (!hasCheckIn && hasCheckOut) {
                    displayTitle = 'Quên giờ ra';
                  } else if (hasCheckIn && hasCheckOut) {
                    displayTitle = 'Quên chấm công vào và ra';
                  }
                }

                return (
                  <div className="attendance-item-detail-form">
                    <div className="attendance-item-detail-header">
                      <h3 className="attendance-item-detail-title">{displayTitle}</h3>
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
                            <label className="attendance-item-form-label">Giờ vào</label>
                            <div className="attendance-time-picker-wrapper">
                              <TimePicker24h
                                value={displayDetails.checkInTime || ''}
                                onChange={(e) => handleItemDetailChange('checkInTime', e.target.value)}
                                className="attendance-form-timepicker"
                              />
                            </div>
                          </div>
                          <div className="attendance-item-form-group">
                            <label className="attendance-item-form-label">Giờ ra</label>
                            <div className="attendance-time-picker-wrapper">
                              <TimePicker24h
                                value={displayDetails.checkOutTime || ''}
                                onChange={(e) => handleItemDetailChange('checkOutTime', e.target.value)}
                                className="attendance-form-timepicker"
                              />
                            </div>
                          </div>
                          {/* Hiển thị loại quên chấm công dựa trên dữ liệu nhập */}
                          {(() => {
                            const hasCheckIn = displayDetails.checkInTime && displayDetails.checkInTime.trim() !== '';
                            const hasCheckOut = displayDetails.checkOutTime && displayDetails.checkOutTime.trim() !== '';
                            let displayLabel = '';
                            if (hasCheckIn && !hasCheckOut) {
                              displayLabel = 'Quên giờ vào';
                            } else if (!hasCheckIn && hasCheckOut) {
                              displayLabel = 'Quên giờ ra';
                            } else if (hasCheckIn && hasCheckOut) {
                              displayLabel = 'Quên chấm công vào và ra';
                            }
                            return displayLabel ? (
                              <div className="attendance-forgot-check-type-display">
                                <span className="attendance-forgot-check-type-label">Loại:</span>
                                <span className="attendance-forgot-check-type-value">{displayLabel}</span>
                              </div>
                            ) : null;
                          })()}
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
                                <TimePicker24h
                                  value={displayDetails.startTime || ''}
                                  onChange={(e) => handleItemDetailChange('startTime', e.target.value)}
                                  className="attendance-form-timepicker"
                                />
                              </div>
                            </div>
                            <div className="attendance-item-form-group">
                              <label className="attendance-item-form-label">Giờ kết thúc *</label>
                              <div className="attendance-time-picker-wrapper">
                                <TimePicker24h
                                  value={displayDetails.endTime || ''}
                                  onChange={(e) => handleItemDetailChange('endTime', e.target.value)}
                                  className="attendance-form-timepicker"
                                />
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
                                <TimePicker24h
                                  value={displayDetails.startTime || ''}
                                  onChange={(e) => handleItemDetailChange('startTime', e.target.value)}
                                  className="attendance-form-timepicker"
                                />
                              </div>
                            </div>
                            <div className="attendance-item-form-group">
                              <label className="attendance-item-form-label">Giờ kết thúc *</label>
                              <div className="attendance-time-picker-wrapper">
                                <TimePicker24h
                                  value={displayDetails.endTime || ''}
                                  onChange={(e) => handleItemDetailChange('endTime', e.target.value)}
                                  className="attendance-form-timepicker"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Lý do bổ sung - Hiển thị cho tất cả các loại */}
                      <div className="attendance-item-form-group" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                        <label className="attendance-item-form-label">
                          <svg className="attendance-label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                          Lý do bổ sung *
                        </label>
                        <textarea
                          className="attendance-form-textarea"
                          value={formData.reason}
                          onChange={(e) => handleInputChange('reason', e.target.value)}
                          placeholder="Nhập lý do bổ sung chấm công..."
                          rows={4}
                          required
                        />
                      </div>
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
