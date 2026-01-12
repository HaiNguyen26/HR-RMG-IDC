import React, { useState, useEffect } from 'react';
import { employeesAPI, customerEntertainmentExpensesAPI } from '../../services/api';
import CustomSelect from '../Common/CustomSelect/CustomSelect';
import './CustomerEntertainmentExpenseRequest.css';

const CustomerEntertainmentExpenseRequest = ({ currentUser, showToast, showConfirm }) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [branches, setBranches] = useState([]);
    const [branchDirectors, setBranchDirectors] = useState([]);
    const [ceo, setCeo] = useState(null);
    const [formData, setFormData] = useState({
        // Section I: Thông Tin Chung
        requester: '',
        branchDirectorId: '',
        branchDirectorName: '',
        ceoId: '',
        ceoName: '',
        startDate: '',
        endDate: '',
        branch: '',
        advanceAmount: '',

        // Section II: Chi Tiết Chứng Từ & Hóa Đơn
        expenseItems: []
    });

    // Exchange rate state (có thể lấy từ API hoặc hardcode)
    const [exchangeRate, setExchangeRate] = useState({
        USD: 25000, // Tỷ giá mặc định, có thể lấy từ API
        EUR: 27000,
        JPY: 180
    });

    const [errors, setErrors] = useState({});

    // Fetch branches list from database
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                setLoading(true);
                const response = await employeesAPI.getBranches();
                if (response.data && response.data.success) {
                    // Map array of branch names to objects with id and name
                    const branchesList = response.data.data.map((branchName, index) => ({
                        id: index + 1,
                        name: branchName
                    }));
                    setBranches(branchesList);
                } else {
                    console.error('Error fetching branches: Invalid response format');
                    showToast?.('Không thể tải danh sách chi nhánh', 'error');
                }
            } catch (error) {
                console.error('Error fetching branches:', error);
                showToast?.('Lỗi khi tải danh sách chi nhánh', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchBranches();
    }, [showToast]);

    // Fetch branch directors list from database
    useEffect(() => {
        const fetchBranchDirectors = async () => {
            try {
                setLoading(true);
                // Get all employees
                const response = await employeesAPI.getAll();
                if (response.data && response.data.success) {
                    const employees = response.data.data || [];

                    // Chỉ cho phép 3 giám đốc chi nhánh: Châu Quang Hải, Nguyễn Ngọc Luyễn, Nguyễn Văn Khải
                    const allowedBranchDirectorNames = [
                        'châu quang hải', 'chau quang hai',
                        'nguyễn ngọc luyễn', 'nguyen ngoc luyen',
                        'nguyễn văn khải', 'nguyen van khai'
                    ];

                    const allowedManagerNames = [
                        'hoàng đình sạch', 'hoang dinh sach',
                        'huỳnh phúc văn', 'huynh phuc van'
                    ];

                    // Tổng giám đốc: Lê Thanh Tùng
                    const ceoNames = [
                        'lê thanh tùng', 'le thanh tung'
                    ];

                    const removeVietnameseAccents = (str) => {
                        if (!str) return '';
                        return str
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/đ/g, 'd')
                            .replace(/Đ/g, 'D');
                    };

                    // Lọc 3 giám đốc chi nhánh được phép
                    const directors = employees.filter(emp => {
                        const hoTen = (emp.hoTen || emp.ho_ten || '').toLowerCase().trim();
                        const hoTenNoAccents = removeVietnameseAccents(hoTen);
                        const chucDanh = (emp.chucDanh || emp.chuc_danh || '').toLowerCase().trim();
                        const chucDanhNoAccents = removeVietnameseAccents(chucDanh);

                        // Check if is manager (Hoàng Đình Sạch or Huỳnh Phúc Văn - quản lý được đặc cách duyệt)
                        const isManager = allowedManagerNames.some(name => {
                            const nameNoAccents = removeVietnameseAccents(name);
                            return hoTen.includes(name) || hoTenNoAccents.includes(nameNoAccents);
                        });

                        if (isManager) {
                            return true; // Include managers (Hoàng Đình Sạch, Huỳnh Phúc Văn)
                        }

                        // Check by name for branch directors (chỉ 3 người được phép)
                        const nameMatch = allowedBranchDirectorNames.some(name => {
                            const nameNoAccents = removeVietnameseAccents(name);
                            return hoTen.includes(name) || hoTenNoAccents.includes(nameNoAccents);
                        });

                        // Check by title (Giám đốc Chi nhánh)
                        const titleMatch = chucDanh.includes('giám đốc chi nhánh') ||
                            chucDanhNoAccents.includes('giam doc chi nhanh');

                        return nameMatch && titleMatch;
                    });

                    // Lọc Tổng giám đốc (Lê Thanh Tùng)
                    const foundCeo = employees.find(emp => {
                        const hoTen = (emp.hoTen || emp.ho_ten || '').toLowerCase().trim();
                        const hoTenNoAccents = removeVietnameseAccents(hoTen);
                        return ceoNames.some(name => {
                            const nameNoAccents = removeVietnameseAccents(name);
                            return hoTen.includes(name) || hoTenNoAccents.includes(nameNoAccents);
                        });
                    });

                    setBranchDirectors(directors);
                    setCeo(foundCeo || null);
                } else {
                    console.error('Error fetching branch directors: Invalid response format');
                }
            } catch (error) {
                console.error('Error fetching branch directors:', error);
                // Fallback to mock data if API fails
                setBranchDirectors([
                    { id: 1, hoTen: 'Châu Quang Hải', chucDanh: 'Giám đốc Chi nhánh' },
                    { id: 2, hoTen: 'Nguyễn Ngọc Luyễn', chucDanh: 'Giám đốc Chi nhánh' },
                    { id: 3, hoTen: 'Nguyễn Văn Khải', chucDanh: 'Giám đốc Chi nhánh' },
                    { id: 4, hoTen: 'Huỳnh Phúc Văn', chucDanh: 'Giám đốc Chi nhánh' },
                    { id: 5, hoTen: 'Hoàng Đình Sạch', chucDanh: 'Quản lý trực tiếp' }
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchBranchDirectors();
    }, []);

    // Set requester name on mount
    useEffect(() => {
        if (currentUser) {
            const requesterName = `${currentUser.hoTen || currentUser.username || ''} - ${currentUser.phongBan || currentUser.boPhan || ''}`;
            setFormData(prev => ({ ...prev, requester: requesterName }));
        }
    }, [currentUser]);

    // Handle input change
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // Add new expense item
    const handleAddExpenseItem = () => {
        const newItem = {
            id: Date.now() + Math.random(),
            invoiceNumber: '',
            amount: '',
            companyName: '',
            content: '',
            files: []
        };
        setFormData(prev => ({
            ...prev,
            expenseItems: [...prev.expenseItems, newItem]
        }));
    };

    // Remove expense item
    const handleRemoveExpenseItem = (itemId) => {
        setFormData(prev => ({
            ...prev,
            expenseItems: prev.expenseItems.filter(item => item.id !== itemId)
        }));
    };

    // Update expense item field
    const handleExpenseItemChange = (itemId, field, value) => {
        setFormData(prev => ({
            ...prev,
            expenseItems: prev.expenseItems.map(item =>
                item.id === itemId ? { ...item, [field]: value } : item
            )
        }));
    };

    // Handle file selection for expense item
    const handleExpenseItemFileChange = (itemId, e) => {
        const files = Array.from(e.target.files);

        // Validate file types
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));

        if (invalidFiles.length > 0) {
            showToast?.('Chỉ chấp nhận các định dạng: PDF, JPG, PNG', 'warning');
            return;
        }

        // Add files to expense item
        const newFiles = files.map(file => ({
            id: Date.now() + Math.random(),
            file: file,
            name: file.name,
            size: file.size,
            type: file.type
        }));

        setFormData(prev => ({
            ...prev,
            expenseItems: prev.expenseItems.map(item =>
                item.id === itemId
                    ? { ...item, files: [...item.files, ...newFiles] }
                    : item
            )
        }));
    };

    // Remove file from expense item
    const handleRemoveExpenseItemFile = (itemId, fileId) => {
        setFormData(prev => ({
            ...prev,
            expenseItems: prev.expenseItems.map(item =>
                item.id === itemId
                    ? { ...item, files: item.files.filter(f => f.id !== fileId) }
                    : item
            )
        }));
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    // Calculate total amount
    const calculateTotalAmount = () => {
        return formData.expenseItems.reduce((total, item) => {
            const amount = parseFloat(item.amount) || 0;
            return total + amount;
        }, 0);
    };

    // Format currency
    const formatCurrency = (amount, currency = 'VND') => {
        if (currency === 'USD') {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount);
        } else if (currency === 'EUR') {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount);
        } else if (currency === 'JPY') {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'JPY',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(amount);
        } else {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(amount);
        }
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        // Section I validation
        if (!formData.requester.trim()) {
            newErrors.requester = 'Vui lòng nhập người yêu cầu';
        }
        // Phải chọn branchDirectorId hoặc ceoId (ít nhất một trong hai)
        if (!formData.branchDirectorId && !formData.ceoId) {
            newErrors.branchDirectorId = 'Vui lòng chọn Người Duyệt';
        }
        if (!formData.startDate) {
            newErrors.startDate = 'Vui lòng chọn ngày bắt đầu';
        }
        if (!formData.endDate) {
            newErrors.endDate = 'Vui lòng chọn ngày kết thúc';
        }
        if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
            newErrors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
        }
        if (!formData.branch) {
            newErrors.branch = 'Vui lòng chọn chi nhánh';
        }
        if (formData.advanceAmount && parseFloat(formData.advanceAmount) < 0) {
            newErrors.advanceAmount = 'Số tiền tạm ứng không hợp lệ';
        }

        // Section II validation
        if (formData.expenseItems.length === 0) {
            newErrors.expenseItems = 'Vui lòng thêm ít nhất một mục chi';
        } else {
            formData.expenseItems.forEach((item, index) => {
                if (!item.invoiceNumber.trim()) {
                    newErrors[`expenseItem_${item.id}_invoiceNumber`] = `Mục ${index + 1}: Vui lòng nhập số hóa đơn`;
                }
                if (!item.amount || parseFloat(item.amount) <= 0) {
                    newErrors[`expenseItem_${item.id}_amount`] = `Mục ${index + 1}: Vui lòng nhập giá tiền hợp lệ`;
                }
                if (!item.companyName.trim()) {
                    newErrors[`expenseItem_${item.id}_companyName`] = `Mục ${index + 1}: Vui lòng nhập tên công ty`;
                }
                if (!item.content.trim()) {
                    newErrors[`expenseItem_${item.id}_content`] = `Mục ${index + 1}: Vui lòng nhập nội dung`;
                }
                if (item.files.length === 0) {
                    newErrors[`expenseItem_${item.id}_files`] = `Mục ${index + 1}: Vui lòng đính kèm ít nhất một file`;
                }
            });
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showToast?.('Vui lòng điền đầy đủ thông tin bắt buộc', 'warning');
            return;
        }

        if (showConfirm) {
            const confirmed = await showConfirm({
                title: 'Xác nhận gửi phiếu yêu cầu',
                message: 'Bạn có chắc chắn muốn gửi phiếu yêu cầu chi phí tiếp khách này không?',
                confirmText: 'Gửi',
                cancelText: 'Hủy'
            });

            if (!confirmed) return;
        }

        setSubmitting(true);
        try {
            // Prepare form data
            const totalAmount = calculateTotalAmount();

            // Collect all files from expense items
            const allFiles = [];
            let totalFileSize = 0;
            const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total
            
            formData.expenseItems.forEach(item => {
                if (item.files && item.files.length > 0) {
                    item.files.forEach(fileObj => {
                        if (fileObj.file) {
                            totalFileSize += fileObj.file.size;
                            allFiles.push(fileObj.file);
                        }
                    });
                }
            });

            // Validate total file size
            if (totalFileSize > MAX_TOTAL_SIZE) {
                showToast?.(`Tổng kích thước file vượt quá 50MB. Hiện tại: ${(totalFileSize / 1024 / 1024).toFixed(2)}MB. Vui lòng giảm số lượng hoặc kích thước file.`, 'error');
                setSubmitting(false);
                return;
            }

            // Kiểm tra nếu chọn Tổng giám đốc
            const isCeoSelected = formData.ceoId && !formData.branchDirectorId;

            // Check if selected director is manager (Hoàng Đình Sạch or Huỳnh Phúc Văn) - chỉ khi không chọn CEO
            let isManager = false;
            if (!isCeoSelected && formData.branchDirectorId) {
                const selectedDirector = branchDirectors.find(d => d.id === parseInt(formData.branchDirectorId));
                const directorNameLower = (selectedDirector?.hoTen || selectedDirector?.ho_ten || '').toLowerCase();

                const isHoangDinhSach = selectedDirector && (
                    directorNameLower.includes('hoàng đình sạch') ||
                    directorNameLower.includes('hoang dinh sach')
                );

                const isHuynhPhucVan = selectedDirector && (
                    directorNameLower.includes('huỳnh phúc văn') ||
                    directorNameLower.includes('huynh phuc van')
                );

                isManager = isHoangDinhSach || isHuynhPhucVan;
            }

            // Chuẩn bị dữ liệu gửi lên, đảm bảo không gửi undefined hoặc chuỗi rỗng
            const submitData = {
                employeeId: currentUser?.id,
                branch: formData.branch,
                startDate: formData.startDate,
                endDate: formData.endDate,
                advanceAmount: formData.advanceAmount ? parseFloat(formData.advanceAmount) : 0,
                expenseItems: formData.expenseItems.map(item => ({
                    invoiceNumber: item.invoiceNumber,
                    amount: parseFloat(item.amount) || 0,
                    companyName: item.companyName,
                    content: item.content,
                    files: item.files || [] // Keep file info for reference
                })),
                files: allFiles
            };

            // Chỉ thêm branchDirectorId nếu không chọn CEO
            if (!isCeoSelected && formData.branchDirectorId) {
                const parsedBranchDirectorId = parseInt(formData.branchDirectorId);
                if (!isNaN(parsedBranchDirectorId) && parsedBranchDirectorId > 0) {
                    submitData.branchDirectorId = parsedBranchDirectorId;
                    submitData.branchDirectorName = formData.branchDirectorName || null;
                    
                    // If manager (Hoàng Đình Sạch or Huỳnh Phúc Văn) is selected, also set as manager
                    if (isManager) {
                        submitData.managerId = parsedBranchDirectorId;
                        submitData.managerName = formData.branchDirectorName || null;
                    }
                }
            }

            // Chỉ thêm ceoId nếu chọn CEO
            if (isCeoSelected && formData.ceoId) {
                const parsedCeoId = parseInt(formData.ceoId);
                if (!isNaN(parsedCeoId) && parsedCeoId > 0) {
                    submitData.ceoId = parsedCeoId;
                    submitData.ceoName = formData.ceoName || null;
                }
            }

            const response = await customerEntertainmentExpensesAPI.create(submitData);

            if (response.data && response.data.success) {
                showToast?.('Đã gửi phiếu yêu cầu thành công!', 'success');

                // Reset form
                setFormData({
                    requester: `${currentUser?.hoTen || currentUser?.username || ''} - ${currentUser?.phongBan || currentUser?.boPhan || ''}`,
                    branchDirectorId: '',
                    branchDirectorName: '',
                    ceoId: '',
                    ceoName: '',
                    startDate: '',
                    endDate: '',
                    branch: '',
                    advanceAmount: '',
                    expenseItems: []
                });
                setErrors({});
            } else {
                showToast?.('Không thể gửi phiếu yêu cầu. Vui lòng thử lại.', 'error');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Không thể gửi phiếu yêu cầu. Vui lòng thử lại.';
            showToast?.(errorMessage, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="customer-entertainment-expense-request-container">
            <div className="customer-entertainment-expense-request-content">
                {/* Header */}
                <div className="customer-entertainment-expense-request-header">
                    <div className="customer-entertainment-expense-request-header-content">
                        <div className="customer-entertainment-expense-request-icon-wrapper">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="customer-entertainment-expense-request-icon">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </div>
                        <div>
                            <h1 className="customer-entertainment-expense-request-title">PHIẾU YÊU CẦU CHI PHÍ TIẾP KHÁCH</h1>
                            <p className="customer-entertainment-expense-request-subtitle">Bước 1: Người Yêu Cầu Lập Phiếu & Đính kèm Chứng từ</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="customer-entertainment-expense-request-form">
                    {/* Form Container - Chứa tất cả 3 sections */}
                    <div className="customer-entertainment-expense-form-container">
                        {/* Section I: Thông Tin Chung */}
                        <div className="customer-entertainment-expense-section">
                            <div className="customer-entertainment-expense-section-header">
                                <h3 className="customer-entertainment-expense-section-title">I. Thông Tin Chung (Mục đích chi)</h3>
                                <div className="customer-entertainment-expense-section-divider"></div>
                            </div>

                            <div className="customer-entertainment-expense-form-content">
                                <div className="customer-entertainment-expense-form-row customer-entertainment-expense-form-row-2cols">
                                    {/* Người Yêu Cầu Chi */}
                                    <div className="customer-entertainment-expense-form-field">
                                        <label className="customer-entertainment-expense-form-label">
                                            Người Yêu Cầu Chi <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={`customer-entertainment-expense-form-input ${errors.requester ? 'error' : ''}`}
                                            value={formData.requester}
                                            onChange={(e) => handleChange('requester', e.target.value)}
                                            placeholder="Tên nhân viên và Bộ phận"
                                            disabled
                                        />
                                        {errors.requester && (
                                            <span className="customer-entertainment-expense-error-text">{errors.requester}</span>
                                        )}
                                    </div>

                                    {/* Chi Nhánh / Đơn Vị Công Tác */}
                                    <div className="customer-entertainment-expense-form-field">
                                        <label className="customer-entertainment-expense-form-label">
                                            Chi Nhánh / Đơn Vị Công Tác <span className="required">*</span>
                                        </label>
                                        <CustomSelect
                                            id="branch-select"
                                            name="branch"
                                            value={formData.branch}
                                            onChange={(e) => handleChange('branch', e.target.value)}
                                            options={[
                                                { value: '', label: 'Chọn Chi nhánh' },
                                                ...branches.map(branch => ({
                                                    value: branch.name,
                                                    label: branch.name
                                                }))
                                            ]}
                                            placeholder="Chọn Chi nhánh"
                                            error={errors.branch}
                                            required={true}
                                        />
                                    </div>
                                </div>

                                {/* Chọn Người Duyệt (Giám đốc Chi nhánh hoặc Quản lý trực tiếp hoặc Tổng giám đốc) */}
                                <div className="customer-entertainment-expense-form-field">
                                    <label className="customer-entertainment-expense-form-label">
                                        Chọn Người Duyệt <span className="required">*</span>
                                    </label>
                                    {(() => {
                                        // Kiểm tra xem currentUser có phải là 1 trong 3 giám đốc chi nhánh được phép không
                                        const removeVietnameseAccents = (str) => {
                                            if (!str) return '';
                                            return str
                                                .normalize('NFD')
                                                .replace(/[\u0300-\u036f]/g, '')
                                                .replace(/đ/g, 'd')
                                                .replace(/Đ/g, 'D');
                                        };

                                        const allowedBranchDirectorNames = [
                                            'châu quang hải', 'chau quang hai',
                                            'nguyễn ngọc luyễn', 'nguyen ngoc luyen',
                                            'nguyễn văn khải', 'nguyen van khai'
                                        ];

                                        const currentUserName = (currentUser?.hoTen || currentUser?.ho_ten || '').toLowerCase().trim();
                                        const currentUserNameNoAccents = removeVietnameseAccents(currentUserName);
                                        
                                        const isAllowedToSelectCEO = allowedBranchDirectorNames.some(name => {
                                            const nameNoAccents = removeVietnameseAccents(name);
                                            return currentUserName.includes(name) || currentUserNameNoAccents.includes(nameNoAccents);
                                        });

                                        // Tạo danh sách options
                                        const options = [
                                            { value: '', label: 'Chọn Người Duyệt' },
                                            ...branchDirectors.map(director => ({
                                                value: director.id,
                                                label: `${director.hoTen || director.ho_ten} - ${director.chucDanh || director.chuc_danh || ''}`
                                            }))
                                        ];

                                        // Chỉ thêm Tổng giám đốc nếu currentUser là 1 trong 3 giám đốc chi nhánh được phép
                                        if (isAllowedToSelectCEO && ceo) {
                                            options.push({
                                                value: `ceo_${ceo.id}`,
                                                label: `${ceo.hoTen || ceo.ho_ten} - Tổng giám đốc`
                                            });
                                        }

                                        return (
                                            <CustomSelect
                                                id="branch-director-select"
                                                name="branchDirector"
                                                value={formData.branchDirectorId || formData.ceoId ? (formData.ceoId ? `ceo_${formData.ceoId}` : formData.branchDirectorId) : ''}
                                                onChange={(e) => {
                                                    const value = String(e.target.value || '');
                                                    
                                                    // Kiểm tra nếu chọn Tổng giám đốc
                                                    if (value && value.startsWith('ceo_')) {
                                                        const ceoId = value.replace('ceo_', '');
                                                        handleChange('branchDirectorId', '');
                                                        handleChange('branchDirectorName', '');
                                                        handleChange('ceoId', ceoId);
                                                        handleChange('ceoName', ceo ? (ceo.hoTen || ceo.ho_ten || '') : '');
                                                    } else {
                                                        const selectedDirector = branchDirectors.find(d => d.id === parseInt(value));
                                                        handleChange('branchDirectorId', value);
                                                        handleChange('branchDirectorName', selectedDirector ? (selectedDirector.hoTen || selectedDirector.ho_ten) : '');
                                                        handleChange('ceoId', '');
                                                        handleChange('ceoName', '');
                                                    }
                                                }}
                                                options={options}
                                                placeholder="Chọn Người Duyệt (Giám đốc Chi nhánh, Quản lý trực tiếp hoặc Tổng giám đốc)"
                                                error={errors.branchDirectorId}
                                                required={true}
                                            />
                                        );
                                    })()}
                                    {errors.branchDirectorId && (
                                        <span className="customer-entertainment-expense-error-text">{errors.branchDirectorId}</span>
                                    )}
                                </div>

                                <div className="customer-entertainment-expense-form-row customer-entertainment-expense-form-row-2cols">
                                    {/* Ngày Bắt Đầu Chi */}
                                    <div className="customer-entertainment-expense-form-field">
                                        <label className="customer-entertainment-expense-form-label">
                                            Ngày Bắt Đầu Chi <span className="required">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            className={`customer-entertainment-expense-form-input ${errors.startDate ? 'error' : ''}`}
                                            value={formData.startDate}
                                            onChange={(e) => handleChange('startDate', e.target.value)}
                                            placeholder="dd/mm/yyyy"
                                        />
                                        {errors.startDate && (
                                            <span className="customer-entertainment-expense-error-text">{errors.startDate}</span>
                                        )}
                                    </div>

                                    {/* Ngày Kết Thúc Chi */}
                                    <div className="customer-entertainment-expense-form-field">
                                        <label className="customer-entertainment-expense-form-label">
                                            Ngày Kết Thúc Chi <span className="required">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            className={`customer-entertainment-expense-form-input ${errors.endDate ? 'error' : ''}`}
                                            value={formData.endDate}
                                            onChange={(e) => handleChange('endDate', e.target.value)}
                                            placeholder="dd/mm/yyyy"
                                            min={formData.startDate}
                                        />
                                        {errors.endDate && (
                                            <span className="customer-entertainment-expense-error-text">{errors.endDate}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Số Tiền Tạm Ứng Ban Đầu */}
                                <div className="customer-entertainment-expense-form-field">
                                    <label className="customer-entertainment-expense-form-label">
                                        Số Tiền Tạm Ứng Ban Đầu (VND)
                                    </label>
                                    <input
                                        type="number"
                                        className={`customer-entertainment-expense-form-input ${errors.advanceAmount ? 'error' : ''}`}
                                        value={formData.advanceAmount}
                                        onChange={(e) => handleChange('advanceAmount', e.target.value)}
                                        placeholder="0"
                                        min="0"
                                        step="1"
                                    />
                                    {errors.advanceAmount && (
                                        <span className="customer-entertainment-expense-error-text">{errors.advanceAmount}</span>
                                    )}

                                    {/* Khối Quy Đổi */}
                                    {formData.advanceAmount && parseFloat(formData.advanceAmount) > 0 && (
                                        <div className="customer-entertainment-expense-exchange-block">
                                            <div className="customer-entertainment-expense-exchange-title">Quy Đổi:</div>
                                            <div className="customer-entertainment-expense-exchange-items">
                                                <div className="customer-entertainment-expense-exchange-item">
                                                    <span className="exchange-currency">USD:</span>
                                                    <span className="exchange-value">
                                                        {formatCurrency((parseFloat(formData.advanceAmount) || 0) / exchangeRate.USD, 'USD')}
                                                    </span>
                                                </div>
                                                <div className="customer-entertainment-expense-exchange-item">
                                                    <span className="exchange-currency">EUR:</span>
                                                    <span className="exchange-value">
                                                        {formatCurrency((parseFloat(formData.advanceAmount) || 0) / exchangeRate.EUR, 'EUR')}
                                                    </span>
                                                </div>
                                                <div className="customer-entertainment-expense-exchange-item">
                                                    <span className="exchange-currency">JPY:</span>
                                                    <span className="exchange-value">
                                                        {formatCurrency((parseFloat(formData.advanceAmount) || 0) / exchangeRate.JPY, 'JPY')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section II: Chi Tiết Chứng Từ & Hóa Đơn Gốc */}
                        <div className="customer-entertainment-expense-section">
                            <div className="customer-entertainment-expense-section-header">
                                <div className="customer-entertainment-expense-voucher-header">
                                    <div className="customer-entertainment-expense-voucher-icon">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                        </svg>
                                    </div>
                                    <h3 className="customer-entertainment-expense-section-title">
                                        II. CHI TIẾT CHỨNG TỪ & HÓA ĐƠN GỐC
                                        <span className="customer-entertainment-expense-voucher-note">(Có thể chọn nhiều file cho mỗi mục)</span>
                                    </h3>
                                </div>
                                <div className="customer-entertainment-expense-section-divider"></div>
                            </div>

                            <div className="customer-entertainment-expense-form-content">
                                {errors.expenseItems && (
                                    <span className="customer-entertainment-expense-error-text">{errors.expenseItems}</span>
                                )}

                                {/* Expense Items Table */}
                                <div className="customer-entertainment-expense-voucher-table-container">
                                    <table className="customer-entertainment-expense-voucher-table">
                                        <thead>
                                            <tr>
                                                <th>STT</th>
                                                <th>Số Hóa Đơn/Phiếu</th>
                                                <th>Giá Tiền (VND)</th>
                                                <th>Tên Công Ty Xuất HĐ</th>
                                                <th>Nội Dung</th>
                                                <th>File Đính Kèm</th>
                                                <th>Xóa</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formData.expenseItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" className="customer-entertainment-expense-empty-row">
                                                        Chưa có mục chi nào. Vui lòng nhấn "Thêm Mục Chi" để thêm.
                                                    </td>
                                                </tr>
                                            ) : (
                                                formData.expenseItems.map((item, index) => (
                                                    <tr key={item.id}>
                                                        <td className="customer-entertainment-expense-stt-cell">{index + 1}</td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                className={`customer-entertainment-expense-voucher-input ${errors[`expenseItem_${item.id}_invoiceNumber`] ? 'error' : ''}`}
                                                                value={item.invoiceNumber}
                                                                onChange={(e) => handleExpenseItemChange(item.id, 'invoiceNumber', e.target.value)}
                                                                placeholder="VD: 00123/HĐ"
                                                            />
                                                            {errors[`expenseItem_${item.id}_invoiceNumber`] && (
                                                                <span className="customer-entertainment-expense-error-text-small">
                                                                    {errors[`expenseItem_${item.id}_invoiceNumber`]}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                className={`customer-entertainment-expense-voucher-input ${errors[`expenseItem_${item.id}_amount`] ? 'error' : ''}`}
                                                                value={item.amount}
                                                                onChange={(e) => handleExpenseItemChange(item.id, 'amount', e.target.value)}
                                                                placeholder="0"
                                                                min="0"
                                                                step="1"
                                                            />
                                                            {errors[`expenseItem_${item.id}_amount`] && (
                                                                <span className="customer-entertainment-expense-error-text-small">
                                                                    {errors[`expenseItem_${item.id}_amount`]}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                className={`customer-entertainment-expense-voucher-input ${errors[`expenseItem_${item.id}_companyName`] ? 'error' : ''}`}
                                                                value={item.companyName}
                                                                onChange={(e) => handleExpenseItemChange(item.id, 'companyName', e.target.value)}
                                                                placeholder="Tên công ty"
                                                            />
                                                            {errors[`expenseItem_${item.id}_companyName`] && (
                                                                <span className="customer-entertainment-expense-error-text-small">
                                                                    {errors[`expenseItem_${item.id}_companyName`]}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                className={`customer-entertainment-expense-voucher-input ${errors[`expenseItem_${item.id}_content`] ? 'error' : ''}`}
                                                                value={item.content}
                                                                onChange={(e) => handleExpenseItemChange(item.id, 'content', e.target.value)}
                                                                placeholder="VD: Vé máy bay công tác"
                                                            />
                                                            {errors[`expenseItem_${item.id}_content`] && (
                                                                <span className="customer-entertainment-expense-error-text-small">
                                                                    {errors[`expenseItem_${item.id}_content`]}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <div className="customer-entertainment-expense-voucher-file-cell">
                                                                <input
                                                                    type="file"
                                                                    id={`file-upload-${item.id}`}
                                                                    className="customer-entertainment-expense-voucher-file-input"
                                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                                    multiple
                                                                    onChange={(e) => handleExpenseItemFileChange(item.id, e)}
                                                                />
                                                                <label htmlFor={`file-upload-${item.id}`} className="customer-entertainment-expense-voucher-file-label">
                                                                    Chọn file...
                                                                </label>
                                                                {item.files.length > 0 && (
                                                                    <div className="customer-entertainment-expense-voucher-file-list">
                                                                        {item.files.map((fileObj) => (
                                                                            <div key={fileObj.id} className="customer-entertainment-expense-voucher-file-item">
                                                                                <span className="customer-entertainment-expense-voucher-file-name">{fileObj.name}</span>
                                                                                <button
                                                                                    type="button"
                                                                                    className="customer-entertainment-expense-voucher-file-remove"
                                                                                    onClick={() => handleRemoveExpenseItemFile(item.id, fileObj.id)}
                                                                                >
                                                                                    ×
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {errors[`expenseItem_${item.id}_files`] && (
                                                                    <span className="customer-entertainment-expense-error-text-small">
                                                                        {errors[`expenseItem_${item.id}_files`]}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="customer-entertainment-expense-voucher-delete-btn"
                                                                onClick={() => handleRemoveExpenseItem(item.id)}
                                                            >
                                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                                </svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Total and Add Button */}
                                <div className="customer-entertainment-expense-voucher-footer">
                                    <div className="customer-entertainment-expense-voucher-total">
                                        <span className="customer-entertainment-expense-voucher-total-label">TỔNG CỘNG:</span>
                                        <span className="customer-entertainment-expense-voucher-total-value">
                                            {formatCurrency(calculateTotalAmount())}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        className="customer-entertainment-expense-voucher-add-btn"
                                        onClick={handleAddExpenseItem}
                                    >
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                        </svg>
                                        <span>Thêm Mục Chi</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="customer-entertainment-expense-form-actions">
                        <button
                            type="submit"
                            className="customer-entertainment-expense-submit-btn"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <div className="customer-entertainment-expense-spinner"></div>
                                    <span>Đang gửi...</span>
                                </>
                            ) : (
                                <>
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    <span>Gửi Phiếu Yêu Cầu (Chuyển GĐ Chi nhánh)</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerEntertainmentExpenseRequest;

