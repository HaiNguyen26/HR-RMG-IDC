import React, { useState } from 'react';
import { authAPI } from '../../services/api';
import './ResetPasswordModal.css';

const ResetPasswordModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: Nhập thông tin, 2: Đặt mật khẩu mới
  const [formData, setFormData] = useState({
    identifier: '',
    email: '',
    displayIdentifier: '', // Mã nhân viên hoặc username để hiển thị
    resetToken: '',
    userId: '',
    userType: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  // Bước 1: Xác thực thông tin
  const handleVerifyIdentifier = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.forgotPassword({ identifier: formData.identifier });

      if (response.data.success) {
        setFormData((prev) => ({
          ...prev,
          email: response.data.data.email,
          displayIdentifier: response.data.data.identifier || response.data.data.email, // Mã nhân viên hoặc username
          resetToken: response.data.data.resetToken,
          userId: response.data.data.userId,
          userType: response.data.data.userType
        }));
        setSuccess('Thông tin xác thực thành công');
        setStep(2);
      } else {
        setError(response.data.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Không tìm thấy tài khoản hoặc bạn đã sử dụng hết số lần reset trong tháng này'
      );
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Đặt lại mật khẩu
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.newPassword || formData.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.resetPassword({
        resetToken: formData.resetToken,
        userId: formData.userId,
        userType: formData.userType,
        newPassword: formData.newPassword
      });

      if (response.data.success) {
        setSuccess('Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.');
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setError(response.data.message || 'Có lỗi xảy ra khi đặt lại mật khẩu');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Có lỗi xảy ra khi đặt lại mật khẩu'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      identifier: '',
      email: '',
      displayIdentifier: '',
      resetToken: '',
      userId: '',
      userType: '',
      newPassword: '',
      confirmPassword: ''
    });
    setError('');
    setSuccess('');
    onClose();
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
      setSuccess('');
    }
  };

  return (
    <div className="reset-password-modal-overlay" onClick={handleClose}>
      <div className="reset-password-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reset-password-modal-header">
          <h2>Đặt lại mật khẩu</h2>
          <button className="reset-password-modal-close" onClick={handleClose}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="reset-password-modal-body">
          {/* Progress indicator - chỉ 2 bước */}
          <div className="reset-password-progress">
            <div className={`reset-password-progress-step ${step >= 1 ? 'active' : ''}`}>
              <div className="reset-password-progress-number">1</div>
              <span>Nhập thông tin</span>
            </div>
            <div className={`reset-password-progress-step ${step >= 2 ? 'active' : ''}`}>
              <div className="reset-password-progress-number">2</div>
              <span>Mật khẩu mới</span>
            </div>
          </div>

          {error && (
            <div className="reset-password-error">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="reset-password-success">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          {/* Step 1: Nhập thông tin */}
          {step === 1 && (
            <form onSubmit={handleVerifyIdentifier} className="reset-password-form">
              <div className="reset-password-input-group">
                <label htmlFor="identifier" className="reset-password-label">
                  Email, mã nhân viên hoặc tên của bạn
                </label>
                <input
                  type="text"
                  id="identifier"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  required
                  className="reset-password-input"
                  placeholder="Nhập email, mã nhân viên hoặc tên"
                  autoComplete="username"
                />
              </div>

              <div className="reset-password-info">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Bạn chỉ có thể reset password tối đa 2 lần/tháng</span>
              </div>

              <div className="reset-password-actions">
                <button
                  type="button"
                  onClick={handleClose}
                  className="reset-password-btn reset-password-btn-secondary"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="reset-password-btn reset-password-btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Đang xử lý...' : 'Tiếp tục'}
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Đặt lại mật khẩu */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="reset-password-form">
              <div className="reset-password-info">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Tài khoản: <strong>{formData.displayIdentifier || formData.identifier}</strong></span>
              </div>

              <div className="reset-password-input-group">
                <label htmlFor="newPassword" className="reset-password-label">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  minLength="6"
                  className="reset-password-input"
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  autoComplete="new-password"
                />
              </div>

              <div className="reset-password-input-group">
                <label htmlFor="confirmPassword" className="reset-password-label">
                  Xác nhận mật khẩu
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength="6"
                  className="reset-password-input"
                  placeholder="Nhập lại mật khẩu mới"
                  autoComplete="new-password"
                />
              </div>

              <div className="reset-password-actions">
                <button
                  type="button"
                  onClick={handleBack}
                  className="reset-password-btn reset-password-btn-secondary"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  className="reset-password-btn reset-password-btn-primary"
                  disabled={loading || formData.newPassword.length < 6 || formData.newPassword !== formData.confirmPassword}
                >
                  {loading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordModal;
