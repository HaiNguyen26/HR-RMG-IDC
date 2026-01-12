import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { employeesAPI, overtimeRequestsAPI } from '../../services/api';
import { formatDateToISO, parseISODateString, today } from '../../utils/dateUtils';
import { DATE_PICKER_LOCALE } from '../../utils/datepickerLocale';
import TimePicker24h from '../TimePicker24h/TimePicker24h';
import './OvertimeRequest.css';

const OvertimeRequest = ({ currentUser, showToast, showConfirm }) => {
  const [isDoubleOvertime, setIsDoubleOvertime] = useState(false);
  const [formData, setFormData] = useState({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    estimatedHours: '',
    dayHours: '',
    nightHours: '',
    reason: ''
  });
  const [secondFormData, setSecondFormData] = useState({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    estimatedHours: '',
    dayHours: '',
    nightHours: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [isLateRequest, setIsLateRequest] = useState(false);
  const [isSecondLateRequest, setIsSecondLateRequest] = useState(false);

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
            console.error('[OvertimeRequest] Error fetching all employees:', err);
          }
        }

        setEmployeeProfile(profile);
      } catch (error) {
        console.error('[OvertimeRequest] Error fetching employee profile:', error);
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

  // Check if request time is in the past (late submission)
  useEffect(() => {
    if (formData.startDate && formData.startTime) {
      const startDateTime = new Date(formData.startDate);
      const [startHour, startMin] = formData.startTime.split(':').map(Number);
      startDateTime.setHours(startHour, startMin || 0, 0, 0);

      const now = new Date();
      // Cảnh báo khi thời gian bắt đầu đã qua (nộp đơn muộn)
      setIsLateRequest(startDateTime < now);
    } else {
      setIsLateRequest(false);
    }
  }, [formData.startDate, formData.startTime]);

  // Check if second request time is in the past (late submission)
  useEffect(() => {
    if (isDoubleOvertime && secondFormData.startDate && secondFormData.startTime) {
      const startDateTime = new Date(secondFormData.startDate);
      const [startHour, startMin] = secondFormData.startTime.split(':').map(Number);
      startDateTime.setHours(startHour, startMin || 0, 0, 0);

      const now = new Date();
      setIsSecondLateRequest(startDateTime < now);
    } else {
      setIsSecondLateRequest(false);
    }
  }, [isDoubleOvertime, secondFormData.startDate, secondFormData.startTime]);

  // Calculate estimated hours for first form
  useEffect(() => {
    if (formData.startDate && formData.startTime && formData.endDate && formData.endTime) {
      const [startHour, startMin] = formData.startTime.split(':').map(Number);
      const [endHour, endMin] = formData.endTime.split(':').map(Number);

      if (startHour !== undefined && endHour !== undefined) {
        // Create Date objects for start and end
        const startDateTime = new Date(formData.startDate);
        startDateTime.setHours(startHour, startMin || 0, 0, 0);

        const endDateTime = new Date(formData.endDate);
        endDateTime.setHours(endHour, endMin || 0, 0, 0);

        // Calculate difference in milliseconds
        const diffMs = endDateTime.getTime() - startDateTime.getTime();

        if (diffMs > 0) {
          const totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

          // Calculate day and night hours
          // Night overtime: 22:00 - 06:00 (next day)
          // Day overtime: 06:00 - 22:00
          let dayHours = 0;
          let nightHours = 0;

          // Iterate through each minute for accuracy
          let currentTime = new Date(startDateTime);
          const endTime = new Date(endDateTime);
          const stepMs = 60 * 1000; // 1 minute step

          while (currentTime < endTime) {
            const currentHour = currentTime.getHours();
            const currentMinute = currentTime.getMinutes();

            // Determine if current time is night (22:00 - 06:00)
            const isNight = currentHour >= 22 || currentHour < 6;

            // Calculate time until next hour boundary or end time
            const nextBoundary = new Date(currentTime);
            if (currentMinute < 59) {
              nextBoundary.setMinutes(59, 59, 999);
            } else {
              nextBoundary.setHours(currentHour + 1, 0, 0, 0);
            }

            const segmentEnd = nextBoundary > endTime ? endTime : nextBoundary;
            const segmentMs = segmentEnd.getTime() - currentTime.getTime();
            const segmentHours = segmentMs / (1000 * 60 * 60);

            if (isNight) {
              nightHours += segmentHours;
            } else {
              dayHours += segmentHours;
            }

            currentTime = segmentEnd;
          }

          setFormData(prev => ({
            ...prev,
            estimatedHours: totalHours,
            dayHours: dayHours > 0 ? dayHours.toFixed(2) : '',
            nightHours: nightHours > 0 ? nightHours.toFixed(2) : ''
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            estimatedHours: '',
            dayHours: '',
            nightHours: ''
          }));
        }
      }
    } else {
      setFormData(prev => ({
        ...prev,
        estimatedHours: '',
        dayHours: '',
        nightHours: ''
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.startDate, formData.startTime, formData.endDate, formData.endTime]);

  // Calculate estimated hours for second form
  useEffect(() => {
    if (isDoubleOvertime && secondFormData.startDate && secondFormData.startTime && secondFormData.endDate && secondFormData.endTime) {
      const [startHour, startMin] = secondFormData.startTime.split(':').map(Number);
      const [endHour, endMin] = secondFormData.endTime.split(':').map(Number);

      if (startHour !== undefined && endHour !== undefined) {
        const startDateTime = new Date(secondFormData.startDate);
        startDateTime.setHours(startHour, startMin || 0, 0, 0);

        const endDateTime = new Date(secondFormData.endDate);
        endDateTime.setHours(endHour, endMin || 0, 0, 0);

        const diffMs = endDateTime.getTime() - startDateTime.getTime();

        if (diffMs > 0) {
          const totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

          let dayHours = 0;
          let nightHours = 0;

          let currentTime = new Date(startDateTime);
          const endTime = new Date(endDateTime);
          const stepMs = 60 * 1000;

          while (currentTime < endTime) {
            const currentHour = currentTime.getHours();
            const currentMinute = currentTime.getMinutes();

            const isNight = currentHour >= 22 || currentHour < 6;

            const nextBoundary = new Date(currentTime);
            if (currentMinute < 59) {
              nextBoundary.setMinutes(59, 59, 999);
            } else {
              nextBoundary.setHours(currentHour + 1, 0, 0, 0);
            }

            const segmentEnd = nextBoundary > endTime ? endTime : nextBoundary;
            const segmentMs = segmentEnd.getTime() - currentTime.getTime();
            const segmentHours = segmentMs / (1000 * 60 * 60);

            if (isNight) {
              nightHours += segmentHours;
            } else {
              dayHours += segmentHours;
            }

            currentTime = segmentEnd;
          }

          setSecondFormData(prev => ({
            ...prev,
            estimatedHours: totalHours,
            dayHours: dayHours > 0 ? dayHours.toFixed(2) : '',
            nightHours: nightHours > 0 ? nightHours.toFixed(2) : ''
          }));
        } else {
          setSecondFormData(prev => ({
            ...prev,
            estimatedHours: '',
            dayHours: '',
            nightHours: ''
          }));
        }
      }
    } else {
      setSecondFormData(prev => ({
        ...prev,
        estimatedHours: '',
        dayHours: '',
        nightHours: ''
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDoubleOvertime, secondFormData.startDate, secondFormData.startTime, secondFormData.endDate, secondFormData.endTime]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleSecondInputChange = (field, value) => {
    setSecondFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleStartDateChange = (date) => {
    if (!date) {
      handleInputChange('startDate', '');
    } else {
      handleInputChange('startDate', formatDateToISO(date));
      // Auto-set end date to start date if end date is not set
      if (!formData.endDate) {
        handleInputChange('endDate', formatDateToISO(date));
      }
    }
  };

  const handleEndDateChange = (date) => {
    if (!date) {
      handleInputChange('endDate', '');
    } else {
      handleInputChange('endDate', formatDateToISO(date));
    }
  };

  const handleTimeChange = (field) => (e) => {
    let value = e.target.value;

    // Convert to 24-hour format if needed
    // HTML5 time input should already be in 24h format, but ensure it's correct
    if (value && value.includes(':')) {
      const [hours, minutes] = value.split(':');
      const hours24 = parseInt(hours, 10);
      const minutesInt = parseInt(minutes, 10);

      // Ensure hours are in 24h format (0-23)
      if (hours24 >= 0 && hours24 <= 23) {
        // Làm tròn phút về bước 15 phút gần nhất (00, 15, 30, 45)
        const roundedMinutes = Math.round(minutesInt / 15) * 15;
        const finalMinutes = Math.min(roundedMinutes, 45); // Tối đa 45

        // Format as HH:mm (2 digits for hours and minutes)
        value = `${hours24.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
      }
    }

    // Validate time format hh:mm (24-hour)
    if (value === '' || /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
      handleInputChange(field, value);
    }
  };

  const handleSecondTimeChange = (field) => (e) => {
    let value = e.target.value;

    if (value && value.includes(':')) {
      const [hours, minutes] = value.split(':');
      const hours24 = parseInt(hours, 10);
      const minutesInt = parseInt(minutes, 10);

      if (hours24 >= 0 && hours24 <= 23) {
        const roundedMinutes = Math.round(minutesInt / 15) * 15;
        const finalMinutes = Math.min(roundedMinutes, 45);

        value = `${hours24.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
      }
    }

    if (value === '' || /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
      handleSecondInputChange(field, value);
    }
  };

  const handleSecondStartDateChange = (date) => {
    if (!date) {
      handleSecondInputChange('startDate', '');
    } else {
      handleSecondInputChange('startDate', formatDateToISO(date));
      if (!secondFormData.endDate) {
        handleSecondInputChange('endDate', formatDateToISO(date));
      }
    }
  };

  const handleSecondEndDateChange = (date) => {
    if (!date) {
      handleSecondInputChange('endDate', '');
    } else {
      handleSecondInputChange('endDate', formatDateToISO(date));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation for first form
    if (!formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime || !formData.reason) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc cho lần tăng ca thứ nhất.');
      return;
    }

    // Validation for second form if double overtime is enabled
    if (isDoubleOvertime) {
      if (!secondFormData.startDate || !secondFormData.startTime || !secondFormData.endDate || !secondFormData.endTime || !secondFormData.reason) {
        setError('Vui lòng điền đầy đủ thông tin bắt buộc cho cả 2 lần tăng ca (bao gồm lý do/ghi chú cho mỗi lần).');
        return;
      }
    }

    // Validate date and time for first form
    if (formData.startDate && formData.startTime && formData.endDate && formData.endTime) {
      const startDateTime = new Date(formData.startDate);
      const [startHour, startMin] = formData.startTime.split(':').map(Number);
      startDateTime.setHours(startHour, startMin || 0, 0, 0);

      const endDateTime = new Date(formData.endDate);
      const [endHour, endMin] = formData.endTime.split(':').map(Number);
      endDateTime.setHours(endHour, endMin || 0, 0, 0);

      if (endDateTime <= startDateTime) {
        setError('Thời gian kết thúc phải sau thời gian bắt đầu (lần tăng ca thứ nhất).');
        return;
      }
    }

    // Validate date and time for second form
    if (isDoubleOvertime && secondFormData.startDate && secondFormData.startTime && secondFormData.endDate && secondFormData.endTime) {
      const startDateTime = new Date(secondFormData.startDate);
      const [startHour, startMin] = secondFormData.startTime.split(':').map(Number);
      startDateTime.setHours(startHour, startMin || 0, 0, 0);

      const endDateTime = new Date(secondFormData.endDate);
      const [endHour, endMin] = secondFormData.endTime.split(':').map(Number);
      endDateTime.setHours(endHour, endMin || 0, 0, 0);

      if (endDateTime <= startDateTime) {
        setError('Thời gian kết thúc phải sau thời gian bắt đầu (lần tăng ca thứ hai).');
        return;
      }
    }

    setLoading(true);
    try {
      if (!currentUser?.id) {
        setError('Không xác định được thông tin nhân viên. Vui lòng đăng nhập lại.');
        return;
      }

      // Submit first request
      const startDateTime = new Date(formData.startDate);
      const [startHour, startMin] = formData.startTime.split(':').map(Number);
      startDateTime.setHours(startHour, startMin || 0, 0, 0);
      const now = new Date();
      const isLate = startDateTime < now;

      const payload1 = {
        employeeId: currentUser.id,
        requestDate: formData.startDate,
        startDate: formData.startDate,
        startTime: formData.startTime,
        endDate: formData.endDate,
        endTime: formData.endTime,
        duration: formData.estimatedHours || null,
        reason: formData.reason,
        isLateRequest: isLate
      };

      const response1 = await overtimeRequestsAPI.create(payload1);

      if (!response1.data?.success) {
        throw new Error(response1.data?.message || 'Không thể gửi đơn tăng ca thứ nhất. Vui lòng thử lại.');
      }

      // Lấy ID của request đầu tiên
      const firstRequestId = response1.data?.data?.id;

      // Submit second request if double overtime is enabled
      if (isDoubleOvertime) {
        const secondStartDateTime = new Date(secondFormData.startDate);
        const [secondStartHour, secondStartMin] = secondFormData.startTime.split(':').map(Number);
        secondStartDateTime.setHours(secondStartHour, secondStartMin || 0, 0, 0);
        const isSecondLate = secondStartDateTime < now;

        const payload2 = {
          employeeId: currentUser.id,
          requestDate: secondFormData.startDate,
          startDate: secondFormData.startDate,
          startTime: secondFormData.startTime,
          endDate: secondFormData.endDate,
          endTime: secondFormData.endTime,
          duration: secondFormData.estimatedHours || null,
          reason: secondFormData.reason,
          isLateRequest: isSecondLate,
          parentRequestId: firstRequestId // Liên kết với request đầu tiên
        };

        const response2 = await overtimeRequestsAPI.create(payload2);

        if (!response2.data?.success) {
          throw new Error(response2.data?.message || 'Đơn tăng ca thứ nhất đã được gửi, nhưng không thể gửi đơn tăng ca thứ hai. Vui lòng thử lại.');
        }

        if (showToast) {
          showToast('Cả 2 đơn xin tăng ca đã được gửi thành công!', 'success');
        }
      } else {
        if (showToast) {
          showToast('Đơn xin tăng ca đã được gửi thành công!', 'success');
        }
      }

      // Reset forms
      setFormData({
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        estimatedHours: '',
        dayHours: '',
        nightHours: '',
        reason: ''
      });
      setSecondFormData({
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        estimatedHours: '',
        dayHours: '',
        nightHours: '',
        reason: ''
      });
      setIsDoubleOvertime(false);
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
    <div className="overtime-request-container">
      {/* Header with Title */}
      <div className="overtime-request-header">
        <div className="overtime-request-header-content">
          <div className="overtime-request-icon-wrapper">
            <svg className="overtime-request-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="overtime-request-title">Đơn Xin Tăng ca</h1>
            <p className="overtime-request-subtitle">
              Điền đầy đủ thông tin để gửi đơn xin tăng ca đến quản lý duyệt.
            </p>
          </div>
          {/* Toggle Button for Double Overtime - Moved to Header */}
          <div className="overtime-double-toggle-wrapper-header">
            <button
              type="button"
              className={`overtime-double-toggle ${isDoubleOvertime ? 'active' : ''}`}
              onClick={() => {
                setIsDoubleOvertime(!isDoubleOvertime);
                if (isDoubleOvertime) {
                  // Reset second form when disabling
                  setSecondFormData({
                    startDate: '',
                    startTime: '',
                    endDate: '',
                    endTime: '',
                    estimatedHours: '',
                    dayHours: '',
                    nightHours: '',
                    reason: ''
                  });
                }
                setError('');
              }}
            >
              <svg className="overtime-toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              <span>{isDoubleOvertime ? 'Đang chọn 2 lần tăng ca' : 'Chọn 2 lần tăng ca'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Form Box - 2 Columns */}
      <div className="overtime-request-form-wrapper">
        <form onSubmit={handleSubmit} className="overtime-request-form">
          {/* Error Message */}
          {error && (
            <div className="overtime-request-error">
              <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Single Container Layout */}
          <div className="overtime-form-content">
            {/* I. Thông tin cơ bản - Lần 1 */}
            <div className="overtime-form-section">
              <h2 className="overtime-section-title">I. Thông tin cơ bản {isDoubleOvertime ? '(Lần tăng ca thứ nhất)' : ''}</h2>
              <div className="overtime-form-fields">
                {/* Employee Code and Name - Side by Side */}
                <div className="overtime-form-row">
                  <div className="overtime-form-group">
                    <label className="overtime-form-label">
                      <span>Mã Nhân Viên *</span>
                    </label>
                    <input
                      type="text"
                      className="overtime-form-input overtime-form-input-readonly"
                      value={employeeCode}
                      readOnly
                    />
                  </div>
                  <div className="overtime-form-group">
                    <label className="overtime-form-label">
                      <span>Họ và Tên</span>
                    </label>
                    <input
                      type="text"
                      className="overtime-form-input overtime-form-input-readonly"
                      value={employeeName}
                      readOnly
                    />
                  </div>
                </div>

                {/* Branch and Department - Side by Side */}
                <div className="overtime-form-row">
                  <div className="overtime-form-group">
                    <label className="overtime-form-label">
                      <span>Chi Nhánh</span>
                    </label>
                    <input
                      type="text"
                      className="overtime-form-input overtime-form-input-readonly"
                      value={employeeBranch}
                      readOnly
                    />
                  </div>
                  <div className="overtime-form-group">
                    <label className="overtime-form-label">
                      <span>Bộ phận/Phòng ban</span>
                    </label>
                    <input
                      type="text"
                      className="overtime-form-input overtime-form-input-readonly"
                      value={employeeDepartment}
                      readOnly
                    />
                  </div>
                </div>

                {/* Start Date and Time */}
                <div className="overtime-form-row">
                  <div className="overtime-form-group">
                    <label className="overtime-form-label">
                      <svg className="overtime-label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <span>Ngày bắt đầu *</span>
                    </label>
                    <div className="overtime-date-picker-wrapper">
                      <DatePicker
                        selected={formData.startDate ? parseISODateString(formData.startDate) : null}
                        onChange={handleStartDateChange}
                        dateFormat="dd/MM/yyyy"
                        locale={DATE_PICKER_LOCALE}
                        placeholderText="Chọn ngày bắt đầu"
                        className="overtime-form-datepicker"
                        required
                        autoComplete="off"
                      />
                      <svg className="overtime-date-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                  </div>
                  <div className="overtime-form-group">
                    <label className="overtime-form-label">
                      <svg className="overtime-label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span>Giờ bắt đầu *</span>
                    </label>
                    <div className="overtime-time-picker-wrapper">
                      <TimePicker24h
                        value={formData.startTime}
                        onChange={handleTimeChange('startTime')}
                        className="overtime-form-timepicker"
                        minuteStep={15}
                      />
                    </div>
                  </div>
                </div>

                {/* End Date and Time */}
                <div className="overtime-form-row">
                  <div className="overtime-form-group">
                    <label className="overtime-form-label">
                      <svg className="overtime-label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <span>Ngày kết thúc *</span>
                    </label>
                    <div className="overtime-date-picker-wrapper">
                      <DatePicker
                        selected={formData.endDate ? parseISODateString(formData.endDate) : null}
                        onChange={handleEndDateChange}
                        minDate={formData.startDate ? parseISODateString(formData.startDate) : null}
                        dateFormat="dd/MM/yyyy"
                        locale={DATE_PICKER_LOCALE}
                        placeholderText="Chọn ngày kết thúc"
                        className="overtime-form-datepicker"
                        required
                        disabled={!formData.startDate}
                        autoComplete="off"
                      />
                      <svg className="overtime-date-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                  </div>
                  <div className="overtime-form-group">
                    <label className="overtime-form-label">
                      <svg className="overtime-label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span>Giờ kết thúc *</span>
                    </label>
                    <div className="overtime-time-picker-wrapper">
                      <TimePicker24h
                        value={formData.endTime}
                        onChange={handleTimeChange('endTime')}
                        className="overtime-form-timepicker"
                        minuteStep={15}
                      />
                    </div>
                  </div>
                </div>

                {/* Estimated Hours */}
                <div className={`overtime-form-row overtime-hours-row ${formData.dayHours && formData.nightHours ? 'three-columns' : formData.dayHours || formData.nightHours ? 'two-columns' : 'one-column'}`}>
                  <div className="overtime-form-group">
                    <label className="overtime-form-label">Thời lượng dự kiến</label>
                    <div className="overtime-hours-input-wrapper">
                      <input
                        type="text"
                        className="overtime-form-input overtime-hours-input"
                        value={formData.estimatedHours}
                        readOnly
                        disabled
                        placeholder="0.00"
                      />
                      <span className="overtime-hours-tag">giờ</span>
                    </div>
                  </div>

                  {/* Day Hours - Chỉ hiển thị nếu có tăng ca ngày */}
                  {formData.dayHours && parseFloat(formData.dayHours) > 0 && (
                    <div className="overtime-form-group">
                      <label className="overtime-form-label">Tăng ca ngày</label>
                      <div className="overtime-hours-input-wrapper overtime-day-hours">
                        <input
                          type="text"
                          className="overtime-form-input overtime-hours-input"
                          value={formData.dayHours}
                          readOnly
                          disabled
                        />
                        <span className="overtime-hours-tag">giờ</span>
                      </div>
                      <p className="overtime-form-hint">06:00 - 22:00</p>
                    </div>
                  )}

                  {/* Night Hours - Chỉ hiển thị nếu có tăng ca đêm */}
                  {formData.nightHours && parseFloat(formData.nightHours) > 0 && (
                    <div className="overtime-form-group">
                      <label className="overtime-form-label">Tăng ca đêm</label>
                      <div className="overtime-hours-input-wrapper overtime-night-hours">
                        <input
                          type="text"
                          className="overtime-form-input overtime-hours-input"
                          value={formData.nightHours}
                          readOnly
                          disabled
                        />
                        <span className="overtime-hours-tag">giờ</span>
                      </div>
                      <p className="overtime-form-hint">22:00 - 06:00</p>
                    </div>
                  )}
                </div>

                {/* Warning Message for Late Request */}
                {isLateRequest && (
                  <div className="overtime-request-warning">
                    <svg className="warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <span><strong>Cảnh báo vi phạm:</strong> Bạn đang nộp đơn tăng ca sau thời gian thực tế. Đơn tăng ca phải được nộp trước khi bắt đầu làm việc.</span>
                  </div>
                )}

                {/* Reason Field */}
                <div className="overtime-form-group">
                  <label className="overtime-form-label">
                    <span>Lý do *</span>
                  </label>
                  <textarea
                    className="overtime-form-textarea"
                    rows="3"
                    value={formData.reason || ''}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    placeholder="Nhập chi tiết lý do cần tăng ca..."
                    required
                  />
                </div>
              </div>
            </div>

            {/* II. Thông tin Duyệt */}
            <div className="overtime-form-section">
              <h2 className="overtime-section-title">II. Thông tin Duyệt</h2>
              <div className="overtime-form-fields">
                {/* Manager Field */}
                <div className="overtime-form-group">
                  <label className="overtime-form-label">
                    <svg className="overtime-label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    <span>Quản lý trực tiếp *</span>
                  </label>
                  <input
                    type="text"
                    className="overtime-form-input overtime-form-input-readonly"
                    value={directManagerName}
                    readOnly
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* III. Thông tin cơ bản - Lần 2 (chỉ hiển thị khi isDoubleOvertime = true) */}
            {isDoubleOvertime && (
              <div className="overtime-form-section overtime-form-section-second">
                <h2 className="overtime-section-title">III. Thông tin cơ bản (Lần tăng ca thứ hai)</h2>
                <div className="overtime-form-fields">
                  {/* Start Date and Time - Second Form */}
                  <div className="overtime-form-row">
                    <div className="overtime-form-group">
                      <label className="overtime-form-label">
                        <svg className="overtime-label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <span>Ngày bắt đầu *</span>
                      </label>
                      <div className="overtime-date-picker-wrapper">
                        <DatePicker
                          selected={secondFormData.startDate ? parseISODateString(secondFormData.startDate) : null}
                          onChange={handleSecondStartDateChange}
                          dateFormat="dd/MM/yyyy"
                          locale={DATE_PICKER_LOCALE}
                          placeholderText="Chọn ngày bắt đầu"
                          className="overtime-form-datepicker"
                          required
                          autoComplete="off"
                        />
                        <svg className="overtime-date-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                    </div>
                    <div className="overtime-form-group">
                      <label className="overtime-form-label">
                        <svg className="overtime-label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span>Giờ bắt đầu *</span>
                      </label>
                      <div className="overtime-time-picker-wrapper">
                        <TimePicker24h
                          value={secondFormData.startTime}
                          onChange={handleSecondTimeChange('startTime')}
                          className="overtime-form-timepicker"
                          minuteStep={15}
                        />
                      </div>
                    </div>
                  </div>

                  {/* End Date and Time - Second Form */}
                  <div className="overtime-form-row">
                    <div className="overtime-form-group">
                      <label className="overtime-form-label">
                        <svg className="overtime-label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <span>Ngày kết thúc *</span>
                      </label>
                      <div className="overtime-date-picker-wrapper">
                        <DatePicker
                          selected={secondFormData.endDate ? parseISODateString(secondFormData.endDate) : null}
                          onChange={handleSecondEndDateChange}
                          minDate={secondFormData.startDate ? parseISODateString(secondFormData.startDate) : null}
                          dateFormat="dd/MM/yyyy"
                          locale={DATE_PICKER_LOCALE}
                          placeholderText="Chọn ngày kết thúc"
                          className="overtime-form-datepicker"
                          required
                          disabled={!secondFormData.startDate}
                          autoComplete="off"
                        />
                        <svg className="overtime-date-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                    </div>
                    <div className="overtime-form-group">
                      <label className="overtime-form-label">
                        <svg className="overtime-label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span>Giờ kết thúc *</span>
                      </label>
                      <div className="overtime-time-picker-wrapper">
                        <TimePicker24h
                          value={secondFormData.endTime}
                          onChange={handleSecondTimeChange('endTime')}
                          className="overtime-form-timepicker"
                          minuteStep={15}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Estimated Hours - Second Form */}
                  <div className={`overtime-form-row overtime-hours-row ${secondFormData.dayHours && secondFormData.nightHours ? 'three-columns' : secondFormData.dayHours || secondFormData.nightHours ? 'two-columns' : 'one-column'}`}>
                    <div className="overtime-form-group">
                      <label className="overtime-form-label">Thời lượng dự kiến</label>
                      <div className="overtime-hours-input-wrapper">
                        <input
                          type="text"
                          className="overtime-form-input overtime-hours-input"
                          value={secondFormData.estimatedHours}
                          readOnly
                          disabled
                          placeholder="0.00"
                        />
                        <span className="overtime-hours-tag">giờ</span>
                      </div>
                    </div>

                    {secondFormData.dayHours && parseFloat(secondFormData.dayHours) > 0 && (
                      <div className="overtime-form-group">
                        <label className="overtime-form-label">Tăng ca ngày</label>
                        <div className="overtime-hours-input-wrapper overtime-day-hours">
                          <input
                            type="text"
                            className="overtime-form-input overtime-hours-input"
                            value={secondFormData.dayHours}
                            readOnly
                            disabled
                          />
                          <span className="overtime-hours-tag">giờ</span>
                        </div>
                        <p className="overtime-form-hint">06:00 - 22:00</p>
                      </div>
                    )}

                    {secondFormData.nightHours && parseFloat(secondFormData.nightHours) > 0 && (
                      <div className="overtime-form-group">
                        <label className="overtime-form-label">Tăng ca đêm</label>
                        <div className="overtime-hours-input-wrapper overtime-night-hours">
                          <input
                            type="text"
                            className="overtime-form-input overtime-hours-input"
                            value={secondFormData.nightHours}
                            readOnly
                            disabled
                          />
                          <span className="overtime-hours-tag">giờ</span>
                        </div>
                        <p className="overtime-form-hint">22:00 - 06:00</p>
                      </div>
                    )}
                  </div>

                  {/* Warning Message for Late Request - Second Form */}
                  {isSecondLateRequest && (
                    <div className="overtime-request-warning">
                      <svg className="warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                      </svg>
                      <span><strong>Cảnh báo vi phạm:</strong> Bạn đang nộp đơn tăng ca sau thời gian thực tế. Đơn tăng ca phải được nộp trước khi bắt đầu làm việc.</span>
                    </div>
                  )}

                  {/* Reason Field - Second Form */}
                  <div className="overtime-form-group">
                    <label className="overtime-form-label">
                      <span>Lý do *</span>
                    </label>
                    <textarea
                      className="overtime-form-textarea"
                      rows="3"
                      value={secondFormData.reason || ''}
                      onChange={(e) => handleSecondInputChange('reason', e.target.value)}
                      placeholder="Nhập chi tiết lý do cần tăng ca (lần thứ hai)..."
                      required
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="overtime-submit-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="overtime-button-spinner"></div>
                <span>Đang gửi...</span>
              </>
            ) : (
              <>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="overtime-submit-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
                <span>Gửi Đơn Tăng ca</span>
              </>
            )}
          </button>
        </form>
      </div>

    </div>
  );
};

export default OvertimeRequest;


