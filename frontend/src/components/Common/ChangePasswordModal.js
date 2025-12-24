import React, { useState } from 'react';
import './ChangePasswordModal.css';

const ChangePasswordModal = ({ isOpen, onClose, onConfirm, currentUser, showToast }) => {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.currentPassword) {
            newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
        }

        if (!formData.newPassword) {
            newErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
        } else if (formData.newPassword.length < 6) {
            newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
        } else if (formData.newPassword === formData.currentPassword) {
            newErrors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
        } else if (formData.confirmPassword !== formData.newPassword) {
            newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setLoading(true);
        try {
            await onConfirm({
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });
            // Reset form
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setErrors({});
            onClose();
        } catch (error) {
            // Error handled by parent
            console.error('Error changing password:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setErrors({});
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="change-password-modal-overlay" onClick={handleClose}>
            <div className="change-password-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="change-password-modal-content">
                    <button
                        className="change-password-modal-close"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="change-password-modal-header">
                        <div className="change-password-modal-icon">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z">
                                </path>
                            </svg>
                        </div>
                        <h3 className="change-password-modal-title">Đổi mật khẩu</h3>
                    </div>

                    <form onSubmit={handleSubmit} className="change-password-form">
                        <div className="change-password-form-group">
                            <label htmlFor="currentPassword" className="change-password-label">
                                Mật khẩu hiện tại
                            </label>
                            <div className="change-password-input-wrapper">
                                <input
                                    type={showPasswords.current ? 'text' : 'password'}
                                    id="currentPassword"
                                    name="currentPassword"
                                    value={formData.currentPassword}
                                    onChange={handleChange}
                                    className={`change-password-input ${errors.currentPassword ? 'error' : ''}`}
                                    placeholder="Nhập mật khẩu hiện tại"
                                    disabled={loading}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="change-password-toggle"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                                    disabled={loading}
                                >
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {showPasswords.current ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21">
                                            </path>
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z">
                                            </path>
                                        )}
                                    </svg>
                                </button>
                            </div>
                            {errors.currentPassword && (
                                <span className="change-password-error">{errors.currentPassword}</span>
                            )}
                        </div>

                        <div className="change-password-form-group">
                            <label htmlFor="newPassword" className="change-password-label">
                                Mật khẩu mới
                            </label>
                            <div className="change-password-input-wrapper">
                                <input
                                    type={showPasswords.new ? 'text' : 'password'}
                                    id="newPassword"
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    className={`change-password-input ${errors.newPassword ? 'error' : ''}`}
                                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                                    disabled={loading}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="change-password-toggle"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                    disabled={loading}
                                >
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {showPasswords.new ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21">
                                            </path>
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z">
                                            </path>
                                        )}
                                    </svg>
                                </button>
                            </div>
                            {errors.newPassword && (
                                <span className="change-password-error">{errors.newPassword}</span>
                            )}
                        </div>

                        <div className="change-password-form-group">
                            <label htmlFor="confirmPassword" className="change-password-label">
                                Xác nhận mật khẩu mới
                            </label>
                            <div className="change-password-input-wrapper">
                                <input
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className={`change-password-input ${errors.confirmPassword ? 'error' : ''}`}
                                    placeholder="Nhập lại mật khẩu mới"
                                    disabled={loading}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="change-password-toggle"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                    disabled={loading}
                                >
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {showPasswords.confirm ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21">
                                            </path>
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z">
                                            </path>
                                        )}
                                    </svg>
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <span className="change-password-error">{errors.confirmPassword}</span>
                            )}
                        </div>

                        <div className="change-password-modal-actions">
                            <button
                                type="button"
                                className="change-password-btn change-password-btn-cancel"
                                onClick={handleClose}
                                disabled={loading}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="change-password-btn change-password-btn-submit"
                                disabled={loading}
                            >
                                {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;


