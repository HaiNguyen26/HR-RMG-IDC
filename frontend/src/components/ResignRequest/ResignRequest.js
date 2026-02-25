import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { leaveRequestsAPI, employeesAPI } from '../../services/api';
import { formatDateToISO, parseISODateString, today } from '../../utils/dateUtils';
import { DATE_PICKER_LOCALE } from '../../utils/datepickerLocale';
import './ResignRequest.css';

const ResignRequest = ({ currentUser, showToast }) => {
  const [formData, setFormData] = useState({
    startDate: '',
    reason: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [createdDate] = useState(new Date()); // Ngày tạo form (ngày hiện tại)

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
            if (err.response?.status !== 404) {
              console.warn('[ResignRequest] Error fetching employee:', err);
            }
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
            console.error('[ResignRequest] Error fetching all employees:', err);
          }
        }

        setEmployeeProfile(profile);
      } catch (error) {
        console.error('[ResignRequest] Error fetching employee profile:', error);
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

  const directManagerName = getValue('quanLyTrucTiepHoTen', 'quan_ly_truc_tiep_ho_ten', 'quanLyTrucTiep', 'quan_ly_truc_tiep') || 'Chưa cập nhật';

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleDateChange = (field) => (date) => {
    if (!date) {
      handleInputChange(field, '');
    } else {
      handleInputChange(field, formatDateToISO(date));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentUser?.id) {
      setError('Không xác định được thông tin nhân viên. Vui lòng đăng nhập lại.');
      return;
    }

    // Validation
    if (!formData.startDate || !formData.reason) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }

    if (!directManagerName || directManagerName === 'Chưa cập nhật') {
      setError('Không tìm thấy thông tin quản lý trực tiếp. Vui lòng liên hệ HR để cập nhật.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        employeeId: currentUser.id,
        requestType: 'RESIGN',
        startDate: formData.startDate,
        endDate: null,
        leaveType: null,
        reason: formData.reason,
        notes: formData.notes || '',
        hasViolation: false,
        violationMessage: null
      };

      const response = await leaveRequestsAPI.create(payload);

      if (response.data.success) {
        if (showToast) {
          showToast('Đơn xin nghỉ việc đã được gửi thành công!', 'success');
        }
        // Reset form
        setFormData({
          startDate: '',
          reason: '',
          notes: ''
        });
      } else {
        throw new Error(response.data.message || 'Không thể gửi đơn. Vui lòng thử lại.');
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

  const startDateValue = parseISODateString(formData.startDate);

  // Tính toán số ngày thông báo trước: (Từ ngày - Ngày tạo)
  const calculateAdvanceNoticeDays = () => {
    if (!startDateValue) {
      return null;
    }
    const start = new Date(startDateValue);
    const today = new Date(createdDate);
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : null;
  };

  const advanceNoticeDays = calculateAdvanceNoticeDays();

  return (
    <div className="resign-request-container">
      {/* Header with Title */}
      <div className="resign-request-header">
        <div className="resign-request-header-content">
          <div className="resign-request-icon-wrapper">
            <svg className="resign-request-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
          </div>
          <div>
            <h1 className="resign-request-title">Đơn xin nghỉ việc</h1>
            <p className="resign-request-subtitle">
              Điền đầy đủ thông tin để gửi đơn đến quản lý duyệt.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - 2 Columns */}
      <div className="resign-request-content">
        {/* Left Column - Form */}
        <div className="resign-request-form-wrapper">
          <form onSubmit={handleSubmit} className="resign-request-form">
            {/* Error Message */}
            {error && (
              <div className="resign-request-error">
                <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Form Fields */}
            <div className="resign-form-fields">
              {/* Date Field */}
              <div className="resign-form-row">
                <div className="resign-form-group">
                  <label className="resign-form-label">Ngày nghỉ việc *</label>
                  <div className="resign-date-picker-wrapper">
                    <DatePicker
                      selected={startDateValue}
                      onChange={handleDateChange('startDate')}
                      minDate={today()}
                      dateFormat="dd/MM/yyyy"
                      locale={DATE_PICKER_LOCALE}
                      placeholderText="dd/mm/yyyy"
                      className="resign-form-datepicker"
                      required
                      autoComplete="off"
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      yearDropdownItemNumber={100}
                      scrollableYearDropdown
                      useShortMonthInDropdown={false}
                    />
                    <svg className="resign-date-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                </div>

                {advanceNoticeDays !== null && (
                  <div className="resign-form-group">
                    <label className="resign-form-label">Số ngày thông báo trước</label>
                    <div className="resign-calculated-field">
                      <span className="resign-calculated-value">{advanceNoticeDays}</span>
                      <span className="resign-calculated-unit">ngày</span>
                    </div>
                    <p className="resign-form-hint">
                      Công thức: (Ngày nghỉ việc - Ngày tạo)
                    </p>
                  </div>
                )}
              </div>

              {/* Manager Field */}
              <div className="resign-form-group">
                <label className="resign-form-label">Quản lý duyệt đơn *</label>
                <input
                  type="text"
                  className="resign-form-input resign-form-input-readonly"
                  value={directManagerName}
                  readOnly
                  disabled
                />
                <p className="resign-form-hint">
                  Thông tin quản lý trực tiếp từ hồ sơ nhân sự. Đơn sẽ được gửi đến quản lý trực tiếp để duyệt.
                </p>
              </div>

              {/* Reason Field */}
              <div className="resign-form-group">
                <label className="resign-form-label">Lý do xin nghỉ việc *</label>
                <textarea
                  className="resign-form-textarea"
                  rows="3"
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  placeholder="Vui lòng nhập lý do xin nghỉ việc..."
                  required
                />
              </div>

              {/* Notes Field */}
              <div className="resign-form-group">
                <label className="resign-form-label">Ghi chú thêm (tùy chọn)</label>
                <textarea
                  className="resign-form-textarea"
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Thêm ghi chú nếu cần..."
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="resign-submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="resign-button-spinner"></div>
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="resign-submit-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                  </svg>
                  <span>Gửi đơn</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column - Resign Policy & Process Panel */}
        <div className="resign-request-panel">
          <div className="resign-policy-card">
            <div className="resign-policy-header">
              <svg className="resign-policy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <h2 className="resign-policy-title">Quy trình & Nội quy nghỉ việc</h2>
            </div>
            <div className="resign-policy-content">
              <div className="resign-policy-placeholder">
                <p>Nội dung quy trình và nội quy nghỉ việc sẽ được cập nhật tại đây.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResignRequest;


