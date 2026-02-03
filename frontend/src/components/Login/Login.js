import React, { useState, useEffect } from 'react';
import { authAPI } from '../../services/api';
import ResetPasswordModal from '../ResetPassword/ResetPasswordModal';
import './Login.css';

// ============================================================
// CẤU HÌNH TRẠNG THÁI APP
// ============================================================
// IS_APP_ENABLED: 
//   - false: Hiển thị trang "Coming Soon" (mặc định cho production)
//   - true: Hiển thị form đăng nhập bình thường
// 
// Để phát triển local khi IS_APP_ENABLED = false:
//   - Thêm ?dev=true vào URL: http://localhost:3000/?dev=true
//   - Hoặc set localStorage: localStorage.setItem('dev_mode', 'true')
//   - Sau đó refresh trang
// ============================================================
const IS_APP_ENABLED = true;

// Ngày ra mắt hiển thị trên trang "Coming Soon"
const LAUNCH_DATE = '20/12/2025';

const Login = ({ onLoginSuccess }) => {
  // Tất cả hooks phải được gọi ở top level, không được gọi có điều kiện
  const [isDevMode, setIsDevMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  // Kiểm tra dev mode từ URL hoặc localStorage
  // Chỉ cho phép dev mode trên localhost để đảm bảo an toàn
  useEffect(() => {
    const isLocalhost = window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '';

    // Chỉ cho phép dev mode khi đang chạy trên localhost
    if (isLocalhost) {
      const urlParams = new URLSearchParams(window.location.search);
      const devParam = urlParams.get('dev');
      const localStorageDev = localStorage.getItem('dev_mode');

      if (devParam === 'true' || localStorageDev === 'true') {
        setIsDevMode(true);
        localStorage.setItem('dev_mode', 'true');
      }
    } else {
      // Trên server production, luôn tắt dev mode để đảm bảo an toàn
      setIsDevMode(false);
      localStorage.removeItem('dev_mode');
    }
  }, []);

  // Nếu app chưa được kích hoạt và không phải dev mode, hiển thị Coming Soon
  if (!IS_APP_ENABLED && !isDevMode) {
    return (
      <div className="login-container">
        <div className="coming-soon-card">
          <div className="coming-soon-content">
            {/* Logo Section */}
            <div className="login-logo-section">
              <div className="login-logo-container">
                <img
                  src={process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/LogoRMG.png` : '/LogoRMG.png'}
                  alt="RMG Logo"
                  className="login-logo"
                />
              </div>
              <h1 className="login-title">HR Management System</h1>
              <p className="login-subtitle">Hệ thống quản lý nhân sự</p>
            </div>

            {/* Coming Soon Message */}
            <div className="coming-soon-message">
              <div className="coming-soon-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <h2 className="coming-soon-title">Coming Soon</h2>
              <p className="coming-soon-date">{LAUNCH_DATE}</p>
              <p className="coming-soon-description">
                Hệ thống đang trong giai đoạn phát triển và sẽ sớm ra mắt.
                <br />
                Vui lòng quay lại sau!
              </p>
            </div>

            {/* Footer */}
            <div className="login-footer">
              <p className="login-footer-text">
                © 2025 All rights reserved
                <br />
                by <strong>Hải Nguyễn</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        ...formData,
        username: formData.username.trim(),
      };
      const response = await authAPI.login(payload);

      if (response.data.success) {
        // Lưu thông tin user vào localStorage
        localStorage.setItem('user', JSON.stringify(response.data.data));
        localStorage.setItem('isAuthenticated', 'true');

        // Gọi callback để chuyển sang dashboard
        onLoginSuccess(response.data.data);
      } else {
        setError(response.data.message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Lỗi kết nối. Vui lòng thử lại sau.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Login Card */}
      <div className="login-card">
        <div className="login-card-inner">
          {/* Logo Section */}
          <div className="login-logo-section">
            <div className="login-logo-container">
              <img
                src={process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/LogoRMG.png` : '/LogoRMG.png'}
                alt="RMG Logo"
                className="login-logo"
              />
            </div>
            <h1 className="login-title">HR Management System</h1>
            <p className="login-subtitle">Hệ thống quản lý nhân sự</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-error-message">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Employee Code Input */}
            <div className="login-input-group">
              <label htmlFor="username" className="login-label">
                <svg className="login-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2">
                  </path>
                </svg>
                Mã nhân viên
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="login-input"
                placeholder="Nhập mã nhân viên của bạn (ví dụ: NV001)"
                autoComplete="username"
              />
            </div>

            {/* Password Input */}
            <div className="login-input-group">
              <label htmlFor="password" className="login-label">
                <svg className="login-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z">
                  </path>
                </svg>
                Password
              </label>
              <div className="login-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="login-input login-input-password"
                  placeholder="Nhập password của bạn"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-password-toggle"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21">
                      </path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z">
                      </path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z">
                      </path>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="login-submit-wrapper">
              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="login-spinner" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75" />
                    </svg>
                    <span>Đang đăng nhập...</span>
                  </>
                ) : (
                  <span>Đăng nhập</span>
                )}
              </button>
            </div>

            {/* Forgot Password Link */}
            <div className="login-forgot-password">
              <button
                type="button"
                onClick={() => setShowResetPasswordModal(true)}
                className="login-forgot-password-btn"
              >
                Quên mật khẩu?
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="login-footer">
            <p className="login-footer-text">
              © 2025 All rights reserved
              <br />
              by <strong>Hải Nguyễn</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
      />
    </div>
  );
};

export default Login;
