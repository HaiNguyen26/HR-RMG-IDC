import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { mealAllowanceRequestsAPI, employeesAPI } from '../../services/api';
import { formatDateToISO, parseISODateString } from '../../utils/dateUtils';
import { DATE_PICKER_LOCALE } from '../../utils/datepickerLocale';
import './MealAllowanceRequest.css';

const MealAllowanceRequest = ({ currentUser, showToast }) => {
  const [items, setItems] = useState([
    { expense_date: '', content: '', amount: '' }
  ]);
  const [notes, setNotes] = useState('');
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
              console.warn('[MealAllowanceRequest] Error fetching employee:', err);
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
            console.error('[MealAllowanceRequest] Error fetching all employees:', err);
          }
        }

        setEmployeeProfile(profile);
      } catch (error) {
        console.error('[MealAllowanceRequest] Error fetching employee profile:', error);
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

  // Calculate total amount
  const totalAmount = items.reduce((sum, item) => {
    const amount = parseFloat(item.amount) || 0;
    return sum + amount;
  }, 0);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    setItems(newItems);
    setError('');
  };

  const handleDateChange = (index, date) => {
    if (!date) {
      handleItemChange(index, 'expense_date', '');
    } else {
      handleItemChange(index, 'expense_date', formatDateToISO(date));
    }
  };

  const handleAddItem = () => {
    setItems([...items, { expense_date: '', content: '', amount: '' }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
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
    if (items.length === 0) {
      setError('Vui lòng thêm ít nhất một mục cơm.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.expense_date) {
        setError(`Mục ${i + 1}: Vui lòng chọn ngày phát sinh.`);
        return;
      }
      if (!item.content || item.content.trim() === '') {
        setError(`Mục ${i + 1}: Vui lòng nhập nội dung.`);
        return;
      }
      if (!item.amount || parseFloat(item.amount) <= 0) {
        setError(`Mục ${i + 1}: Vui lòng nhập số tiền hợp lệ.`);
        return;
      }
    }

    if (!directManagerName || directManagerName === 'Chưa cập nhật') {
      setError('Không tìm thấy thông tin quản lý trực tiếp. Vui lòng liên hệ HR để cập nhật.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        employeeId: currentUser.id,
        items: items.map(item => ({
          expense_date: item.expense_date,
          content: item.content.trim(),
          amount: parseFloat(item.amount)
        })),
        notes: notes.trim() || ''
      };

      const response = await mealAllowanceRequestsAPI.create(payload);

      if (response.data.success) {
        if (showToast) {
          showToast('Đơn xin phụ cấp cơm công trình đã được gửi thành công!', 'success');
        }
        // Reset form
        setItems([{ expense_date: '', content: '', amount: '' }]);
        setNotes('');
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

  return (
    <div className="meal-allowance-request-container">
      {/* Header with Title */}
      <div className="meal-allowance-request-header">
        <div className="meal-allowance-request-header-content">
          <div className="meal-allowance-request-icon-wrapper">
            <svg className="meal-allowance-request-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          </div>
          <div>
            <h1 className="meal-allowance-request-title">Đơn xin phụ cấp cơm công trình</h1>
            <p className="meal-allowance-request-subtitle">
              Thêm các mục cơm và gửi đơn đến quản lý duyệt.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="meal-allowance-request-content">
        <div className="meal-allowance-request-form-wrapper">
          <form onSubmit={handleSubmit} className="meal-allowance-request-form">
            {/* Error Message */}
            {error && (
              <div className="meal-allowance-request-error">
                <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Items List */}
            <div className="meal-allowance-items-section">
              <div className="meal-allowance-items-header">
                <h3 className="meal-allowance-items-title">Danh sách mục cơm</h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="meal-allowance-add-item-btn"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Thêm mục
                </button>
              </div>

              <div className="meal-allowance-items-list">
                {items.map((item, index) => (
                  <div key={index} className="meal-allowance-item-card">
                    <div className="meal-allowance-item-header">
                      <span className="meal-allowance-item-number">Mục {index + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="meal-allowance-remove-item-btn"
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="meal-allowance-item-fields">
                      <div className="meal-allowance-form-group">
                        <label className="meal-allowance-form-label">Ngày phát sinh *</label>
                        <div className="meal-allowance-date-picker-wrapper">
                          <DatePicker
                            selected={parseISODateString(item.expense_date)}
                            onChange={(date) => handleDateChange(index, date)}
                            dateFormat="dd/MM/yyyy"
                            locale={DATE_PICKER_LOCALE}
                            placeholderText="dd/mm/yyyy"
                            className="meal-allowance-form-datepicker"
                            required
                            autoComplete="off"
                          />
                          <svg className="meal-allowance-date-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                        </div>
                      </div>

                      <div className="meal-allowance-form-group">
                        <label className="meal-allowance-form-label">Nội dung *</label>
                        <input
                          type="text"
                          value={item.content}
                          onChange={(e) => handleItemChange(index, 'content', e.target.value)}
                          className="meal-allowance-form-input"
                          placeholder="Nhập nội dung mục cơm"
                          required
                        />
                      </div>

                      <div className="meal-allowance-form-group">
                        <label className="meal-allowance-form-label">Số tiền (VNĐ) *</label>
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                          className="meal-allowance-form-input"
                          placeholder="0"
                          min="0"
                          step="1000"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Amount */}
              <div className="meal-allowance-total-section">
                <div className="meal-allowance-total-label">Tổng số tiền:</div>
                <div className="meal-allowance-total-amount">
                  {totalAmount.toLocaleString('vi-VN')} VNĐ
                </div>
              </div>
            </div>

            {/* Notes Field */}
            <div className="meal-allowance-form-group">
              <label className="meal-allowance-form-label">Ghi chú (tùy chọn)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="meal-allowance-form-textarea"
                placeholder="Nhập ghi chú nếu có"
                rows="3"
              />
            </div>

            {/* Manager Field */}
            <div className="meal-allowance-form-group">
              <label className="meal-allowance-form-label">Quản lý duyệt đơn *</label>
              <div className="meal-allowance-manager-display">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                <span>{directManagerName}</span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="meal-allowance-form-actions">
              <button
                type="submit"
                disabled={loading}
                className="meal-allowance-submit-btn"
              >
                {loading ? 'Đang gửi...' : 'Gửi đơn'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MealAllowanceRequest;



