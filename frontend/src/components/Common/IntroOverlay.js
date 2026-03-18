import React from 'react';
import './IntroOverlay.css';

const IntroOverlay = ({ user, onClose }) => {
    return (
        <div className="hrm-release-overlay">
            <div className="hrm-release-backdrop" onClick={onClose} />
            <div className="hrm-release-modal">
                {/* Header */}
                <div className="hrm-release-header">
                    <div className="hrm-release-header-left">
                        <div className="hrm-release-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div className="hrm-release-header-text">
                            <div className="hrm-release-badge-row">
                                <span className="hrm-release-badge">OFFICIAL RELEASE</span>
                                <span className="hrm-release-version">HRM V2.0</span>
                            </div>
                            <p className="hrm-release-tagline">Giải pháp nhân sự toàn diện &amp; minh bạch</p>
                        </div>
                    </div>
                    <button className="hrm-release-close" onClick={onClose} aria-label="Đóng">×</button>
                </div>

                {/* Body */}
                <div className="hrm-release-body">
                    {/* Thank you */}
                    <div className="hrm-release-thankyou">
                        <span className="hrm-release-heart">🥑</span>
                        <span><strong>Phòng IT - RMG gửi lời cảm ơn chân thành đến các bạn!</strong></span>
                    </div>

                    <h2 className="hrm-release-title">
                        Sự đồng hành của các bạn là động lực để Phòng IT đổi mới
                    </h2>
                    <p className="hrm-release-desc">
                        Hiểu được những bất tiện về tốc độ, hiển thị và đặc biệt là các sai lệch về ngày phép
                        trong thời gian qua. Phiên bản <strong>HRM V2.0</strong> được xây dựng và phát triển để khắc phục
                        triệt để các lỗi này, mang lại sự công bằng và minh bạch tuyệt đối, cũng như tổ chức phòng ban
                        minh bạch, rõ ràng hơn nhờ công nghệ tách sơ đồ cây.
                    </p>

                    {/* Feature cards 2×2 */}
                    <div className="hrm-release-features">
                        <div className="hrm-release-feature-card">
                            <div className="hrm-release-feature-icon hrm-feature-blue">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    <circle cx="12" cy="7" r="3" />
                                    <path strokeLinecap="round" d="M8 12v4M12 10v6M16 12v4" />
                                </svg>
                            </div>
                            <div>
                                <div className="hrm-release-feature-title">Công nghệ Sơ đồ cây</div>
                                <div className="hrm-release-feature-desc">Tách bạch cấu trúc phòng ban, giúp quản lý nhân sự rõ ràng và trực quan.</div>
                            </div>
                        </div>
                        <div className="hrm-release-feature-card">
                            <div className="hrm-release-feature-icon hrm-feature-teal">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                    <line x1="12" y1="18" x2="12.01" y2="18" />
                                </svg>
                            </div>
                            <div>
                                <div className="hrm-release-feature-title">Tối ưu Mobile</div>
                                <div className="hrm-release-feature-desc">Hiển thị đầy đủ nút chức năng trên điện thoại, không còn lỗi giao diện.</div>
                            </div>
                        </div>
                        <div className="hrm-release-feature-card">
                            <div className="hrm-release-feature-icon hrm-feature-green">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                    <path strokeLinecap="round" d="M8 14l2 2 4-4" />
                                </svg>
                            </div>
                            <div>
                                <div className="hrm-release-feature-title">Chính xác tuyệt đối</div>
                                <div className="hrm-release-feature-desc">Fix lỗi tính sai phép năm và công (0.5 ngày), đảm bảo quyền lợi nhân viên.</div>
                            </div>
                        </div>
                        <div className="hrm-release-feature-card">
                            <div className="hrm-release-feature-icon hrm-feature-orange">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                </svg>
                            </div>
                            <div>
                                <div className="hrm-release-feature-title">Tốc độ xử lý</div>
                                <div className="hrm-release-feature-desc">Hệ thống phản hồi tức thì, loại bỏ hoàn toàn hiện tượng giật lag.</div>
                            </div>
                        </div>
                    </div>

                    {/* Roadmap */}
                    <div className="hrm-release-roadmap">
                        <div className="hrm-release-roadmap-title">
                            <span className="hrm-roadmap-arrow">›</span> Lộ trình nâng cấp tiếp theo
                        </div>
                        <div className="hrm-release-roadmap-items">
                            <div className="hrm-release-roadmap-item">
                                <span className="hrm-roadmap-item-icon">☞</span>
                                Chấm công trực tuyến
                            </div>
                            <div className="hrm-release-roadmap-item">
                                <span className="hrm-roadmap-item-icon hrm-roadmap-item-icon--orange">◎</span>
                                Đánh giá KPI cá nhân
                            </div>
                        </div>
                    </div>

                    {/* Transition plan */}
                    <div className="hrm-release-plan">
                        <div className="hrm-release-plan-header">
                            <span className="hrm-release-plan-icon">🛡</span>
                            <span className="hrm-release-plan-title">Kế hoạch chuyển đổi</span>
                        </div>
                        <div className="hrm-release-plan-row">
                            <span>Bắt đầu vận hành V2.0:</span>
                            <span className="hrm-release-plan-date">01/04/2026</span>
                        </div>
                        <div className="hrm-release-plan-row">
                            <span>Đóng hệ thống V1:</span>
                            <span className="hrm-release-plan-date">01/04/2026</span>
                        </div>
                    </div>

                    {/* Warning: pending leave requests */}
                    <div className="hrm-release-warning">
                        <div className="hrm-release-warning-header">
                            <span className="hrm-release-warning-icon">⚠️</span>
                            <span className="hrm-release-warning-title">Lưu ý quan trọng — Trước ngày 01/04/2026</span>
                        </div>
                        <p className="hrm-release-warning-lead">
                            Sau ngày <strong>01/04/2026</strong>, hệ thống V1 sẽ ngừng hoạt động. Tất cả đơn xin phép
                            chưa được xử lý trên V1 sẽ <strong>không còn được truy cập</strong>.
                        </p>
                        <div className="hrm-release-warning-steps">
                            <div className="hrm-release-warning-step">
                                <span className="hrm-warning-step-num">1</span>
                                <div>
                                    <strong>Nhân viên:</strong> Kiểm tra và xác nhận lại tất cả các đơn xin phép
                                    đã nộp trên V1 còn đang <em>chờ duyệt</em>. Nếu cần, hãy liên hệ
                                    QL trực tiếp hoặc HR để đẩy nhanh quá trình phê duyệt.
                                </div>
                            </div>
                            <div className="hrm-release-warning-step">
                                <span className="hrm-warning-step-num">2</span>
                                <div>
                                    <strong>Quản lý / HR:</strong> Rà soát và xử lý dứt điểm toàn bộ đơn
                                    đang chờ phê duyệt trên V1 <strong>trước 01/04/2026</strong>.
                                    Các đơn chưa được duyệt sẽ coi như <em>hủy</em> khi V1 đóng cửa.
                                </div>
                            </div>
                            <div className="hrm-release-warning-step">
                                <span className="hrm-warning-step-num">3</span>
                                <div>
                                    <strong>Từ 01/04/2026 trở đi:</strong> Toàn bộ đơn xin phép, công tác,
                                    đi muộn/về sớm… được nộp và phê duyệt hoàn toàn trên <strong>HRM V2.0</strong>.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="hrm-release-footer">
                    <button className="hrm-release-btn-primary" onClick={onClose}>
                        Tôi đã hiểu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IntroOverlay;
