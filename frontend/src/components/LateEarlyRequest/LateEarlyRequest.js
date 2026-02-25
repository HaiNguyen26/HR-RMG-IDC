import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import TimePicker24h from '../TimePicker24h/TimePicker24h';
import { lateEarlyRequestsAPI, employeesAPI } from '../../services/api';
import { formatDateToISO, parseISODateString } from '../../utils/dateUtils';
import { DATE_PICKER_LOCALE } from '../../utils/datepickerLocale';
import './LateEarlyRequest.css';

const LateEarlyRequest = ({ currentUser, showToast }) => {
  const [formData, setFormData] = useState({
    requestType: '', // 'LATE' hoặc 'EARLY'
    requestDate: '',
    timeValue: '',
    reason: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [employeeProfile, setEmployeeProfile] = useState(null);

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
              console.warn('[LateEarlyRequest] Error fetching employee:', err);
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
            console.error('[LateEarlyRequest] Error fetching all employees:', err);
          }
        }

        setEmployeeProfile(profile);
      } catch (error) {
        console.error('[LateEarlyRequest] Error fetching employee profile:', error);
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

  const handleDateChange = (date) => {
    if (!date) {
      handleInputChange('requestDate', '');
    } else {
      handleInputChange('requestDate', formatDateToISO(date));
    }
  };

  const handleTimeChange = (e) => {
    handleInputChange('timeValue', e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentUser?.id) {
      setError('Không xác định được thông tin nhân viên. Vui lòng đăng nhập lại.');
      return;
    }

    // Validation
    if (!formData.requestType) {
      setError('Vui lòng chọn loại đơn (Đi trễ hoặc Về sớm).');
      return;
    }

    if (!formData.requestDate) {
      setError('Vui lòng chọn ngày.');
      return;
    }

    if (!formData.timeValue) {
      setError('Vui lòng chọn thời gian.');
      return;
    }

    if (!formData.reason) {
      setError('Vui lòng nhập lý do.');
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
        requestType: formData.requestType,
        requestDate: formData.requestDate,
        timeValue: formData.timeValue,
        reason: formData.reason,
        notes: formData.notes || ''
      };

      const response = await lateEarlyRequestsAPI.create(payload);

      if (response.data.success) {
        if (showToast) {
          showToast(`Đơn xin ${formData.requestType === 'LATE' ? 'đi trễ' : 'về sớm'} đã được gửi thành công!`, 'success');
        }
        // Reset form
        setFormData({
          requestType: '',
          requestDate: '',
          timeValue: '',
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

  const requestDateValue = parseISODateString(formData.requestDate);

  return (
    <div className="late-early-request-container">
      {/* Header with Title */}
      <div className="late-early-request-header">
        <div className="late-early-request-header-content">
          <div className="late-early-request-icon-wrapper">
            <svg className="late-early-request-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h1 className="late-early-request-title">Đơn xin đi trễ về sớm</h1>
            <p className="late-early-request-subtitle">
              Điền đầy đủ thông tin để gửi đơn đến quản lý duyệt.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - 2 Columns */}
      <div className="late-early-request-content">
        {/* Left Column - Form */}
        <div className="late-early-request-form-wrapper">
          <form onSubmit={handleSubmit} className="late-early-request-form">
            {/* Error Message */}
            {error && (
              <div className="late-early-request-error">
                <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Form Fields */}
            <div className="late-early-form-fields">
              {/* Request Type Selection */}
              <div className="late-early-form-group">
                <label className="late-early-form-label">Loại đơn *</label>
                <div className="late-early-request-type-tabs">
                  <button
                    type="button"
                    className={`late-early-type-tab ${formData.requestType === 'LATE' ? 'active' : ''}`}
                    onClick={() => handleInputChange('requestType', 'LATE')}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Đi trễ</span>
                  </button>
                  <button
                    type="button"
                    className={`late-early-type-tab ${formData.requestType === 'EARLY' ? 'active' : ''}`}
                    onClick={() => handleInputChange('requestType', 'EARLY')}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Về sớm</span>
                  </button>
                </div>
              </div>

              {/* Date and Time Fields */}
              <div className="late-early-form-row">
                <div className="late-early-form-group">
                  <label className="late-early-form-label">Ngày *</label>
                  <div className="late-early-date-picker-wrapper">
                    <DatePicker
                      selected={requestDateValue}
                      onChange={handleDateChange}
                      dateFormat="dd/MM/yyyy"
                      locale={DATE_PICKER_LOCALE}
                      placeholderText="dd/mm/yyyy"
                      className="late-early-form-datepicker"
                      required
                      autoComplete="off"
                    />
                    <svg className="late-early-date-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                </div>

                <div className="late-early-form-group">
                  <label className="late-early-form-label">
                    {formData.requestType === 'LATE' ? 'Thời gian đi trễ *' : formData.requestType === 'EARLY' ? 'Thời gian về sớm *' : 'Thời gian *'}
                  </label>
                  <TimePicker24h
                    value={formData.timeValue}
                    onChange={handleTimeChange}
                    className="late-early-time-picker"
                    placeholder="--:--"
                  />
                </div>
              </div>

              {/* Manager Field */}
              <div className="late-early-form-group">
                <label className="late-early-form-label">Quản lý duyệt đơn *</label>
                <input
                  type="text"
                  className="late-early-form-input late-early-form-input-readonly"
                  value={directManagerName}
                  readOnly
                  disabled
                />
                <p className="late-early-form-hint">
                  Thông tin quản lý trực tiếp từ hồ sơ nhân sự. Đơn sẽ được gửi đến quản lý trực tiếp để duyệt.
                </p>
              </div>

              {/* Reason Field */}
              <div className="late-early-form-group">
                <label className="late-early-form-label">Lý do *</label>
                <textarea
                  className="late-early-form-textarea"
                  rows="3"
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  placeholder="Vui lòng nhập lý do..."
                  required
                />
              </div>

              {/* Notes Field */}
              <div className="late-early-form-group">
                <label className="late-early-form-label">Ghi chú thêm (tùy chọn)</label>
                <textarea
                  className="late-early-form-textarea"
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
              className="late-early-submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="late-early-button-spinner"></div>
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="late-early-submit-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                  </svg>
                  <span>Gửi đơn</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column - Policy & Process Panel */}
        <div className="late-early-request-panel">
          <div className="late-early-policy-card">
            <div className="late-early-policy-header">
              <svg className="late-early-policy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <h2 className="late-early-policy-title">Quy trình & Nội quy</h2>
            </div>
            <div className="late-early-policy-content">
              <div className="late-early-policy-placeholder">
                <p>Nội dung quy trình và nội quy xin đi trễ về sớm sẽ được cập nhật tại đây.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LateEarlyRequest;


