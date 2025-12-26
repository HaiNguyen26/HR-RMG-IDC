import React, { useState, useEffect } from 'react';
import './TravelExpenseAccountant.css';
import { travelExpensesAPI } from '../../services/api';

const TravelExpenseAccountant = ({ currentUser, showToast }) => {
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState([]);
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('advance'); // 'advance' (Bước 4.2), 'check' (Bước 6), hoặc 'payment' (Bước 8)
    const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);

    // Form state for checking
    const [formData, setFormData] = useState({
        notes: ''
    });

    // Form state for payment (tích hợp vào tab check)
    const [paymentFormData, setPaymentFormData] = useState({
        paymentMethod: 'BANK_TRANSFER',
        paymentReference: ''
    });

    // Fetch requests based on active tab
    useEffect(() => {
        const fetchRequests = async () => {
            setLoading(true);
            try {
                let statusFilter;
                if (activeTab === 'advance') {
                    // Bước 4.2: Xác nhận chuyển khoản tạm ứng
                    // Fetch PENDING_FINANCE requests, sau đó filter advance_status = 'PENDING_ACCOUNTANT'
                    statusFilter = 'PENDING_FINANCE';
                } else if (activeTab === 'check') {
                    // Bước 6: Kiểm tra & Quyết toán
                    statusFilter = 'PENDING_ACCOUNTANT';
                } else {
                    statusFilter = 'SETTLED';
                }

                const response = await travelExpensesAPI.getAll({
                    status: statusFilter
                });

                if (response.data && response.data.success) {
                    // Filter requests based on tab
                    let filteredData = response.data.data || [];
                    if (activeTab === 'advance') {
                        // Chỉ lấy các đơn có advance_status = 'PENDING_ACCOUNTANT'
                        filteredData = filteredData.filter(req => {
                            const advanceStatus = req.advance_status || req.advance?.status;
                            return advanceStatus === 'PENDING_ACCOUNTANT';
                        });
                    } else if (activeTab === 'check') {
                        // Lấy cả PENDING_ACCOUNTANT và SETTLED (chưa có payment_confirmed_at) để giải ngân
                        // Fetch thêm SETTLED requests chưa được giải ngân
                        try {
                            const settledResponse = await travelExpensesAPI.getAll({
                                status: 'SETTLED'
                            });
                            if (settledResponse.data && settledResponse.data.success) {
                                const settledRequests = (settledResponse.data.data || []).filter(req => {
                                    // Chỉ lấy các request chưa có payment_confirmed_at (chưa được giải ngân)
                                    return !req.payment?.confirmedAt && !req.payment_confirmed_at;
                                });
                                filteredData = [...filteredData, ...settledRequests];
                            }
                        } catch (error) {
                            console.error('Error fetching SETTLED requests:', error);
                        }
                    }

                    console.log('[TravelExpenseAccountant] Fetching for tab:', activeTab, 'filtered count:', filteredData.length);

                    // Fetch attachments for each request
                    const requestsWithAttachments = await Promise.all(
                        filteredData.map(async (req) => {
                            try {
                                const attachmentsResponse = await travelExpensesAPI.getAttachments(req.id);
                                return {
                                    ...req,
                                    attachments: attachmentsResponse.data?.data || []
                                };
                            } catch (error) {
                                console.error(`Error fetching attachments for request ${req.id}:`, error);
                                return { ...req, attachments: [] };
                            }
                        })
                    );

                    const formattedRequests = requestsWithAttachments.map(req => {
                        const startDate = req.start_time ? new Date(req.start_time) : null;
                        const endDate = req.end_time ? new Date(req.end_time) : null;

                        return {
                            id: req.id,
                            code: `CTX-${req.id}`,
                            employeeName: req.employee_name || 'N/A',
                            location: req.location || '',
                            locationType: req.locationType || req.location_type,
                            purpose: req.purpose || '',
                            startDate: startDate ? startDate.toLocaleDateString('vi-VN') : '',
                            endDate: endDate ? endDate.toLocaleDateString('vi-VN') : '',
                            advanceAmount: req.advance?.amount || req.actual_advance_amount || 0,
                            requestedAdvanceAmount: req.requestedAdvanceAmount || req.requested_advance_amount || 0,
                            actualExpense: req.settlement?.actualExpense || req.actual_expense || null,
                            settlementNotes: req.settlement?.notes || req.settlement_notes || null,
                            attachments: req.attachments || []
                        };
                    });

                    console.log('[TravelExpenseAccountant] Formatted requests:', formattedRequests.length, formattedRequests);
                    setRequests(formattedRequests);
                } else {
                    console.warn('[TravelExpenseAccountant] API response was not successful:', response.data);
                }
            } catch (error) {
                console.error('[TravelExpenseAccountant] Error fetching travel expense requests:', error);
                showToast?.('Lỗi khi tải danh sách yêu cầu', 'error');
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            fetchRequests();
        }
    }, [currentUser, showToast, activeTab]);

    // Reset selected request when tab changes
    useEffect(() => {
        setSelectedRequestId(null);
        setSelectedRequestDetails(null);
        setFormData({ notes: '' });
        setPaymentFormData({ paymentMethod: 'BANK_TRANSFER', paymentReference: '' });
    }, [activeTab]);

    // Reset selectedRequestId if it's no longer in the current requests list
    useEffect(() => {
        if (selectedRequestId && requests.length > 0) {
            const exists = requests.some(req => req.id === selectedRequestId);
            if (!exists) {
                setSelectedRequestId(null);
                setSelectedRequestDetails(null);
            }
        }
    }, [requests, selectedRequestId]);

    // Fetch attachments when request is selected (backup - in case onClick doesn't work)
    useEffect(() => {
        const fetchAttachments = async () => {
            if (!selectedRequestId) {
                return;
            }

            try {
                const response = await travelExpensesAPI.getAttachments(selectedRequestId);
                if (response.data && response.data.success) {
                    const attachments = response.data.data || [];
                    console.log('[TravelExpenseAccountant] Fetched attachments in useEffect for request', selectedRequestId, attachments);
                    
                    // Update attachments in the selected request from list
                    setRequests(prevRequests => 
                        prevRequests.map(req => 
                            req.id === selectedRequestId 
                                ? { ...req, attachments } 
                                : req
                        )
                    );
                    
                    // Also update selectedRequestDetails if it exists
                    if (selectedRequestDetails && selectedRequestDetails.id === selectedRequestId) {
                        setSelectedRequestDetails(prev => ({
                            ...prev,
                            attachments: attachments
                        }));
                    }
                }
            } catch (error) {
                console.error('Error fetching attachments:', error);
            }
        };

        fetchAttachments();
    }, [selectedRequestId]);

    const selectedRequestFromList = requests.find(req => req.id === selectedRequestId) || null;

    // Normalize selectedRequest to handle both list format and detail format from API
    const normalizeSelectedRequest = () => {
        const request = selectedRequestDetails || selectedRequestFromList;
        if (!request) return null;

        // If it's from selectedRequestDetails (full API response), normalize it
        if (selectedRequestDetails) {
            const startDate = request.startTime ? new Date(request.startTime) : (request.start_time ? new Date(request.start_time) : null);
            const endDate = request.endTime ? new Date(request.endTime) : (request.end_time ? new Date(request.end_time) : null);
            const createdAt = request.createdAt ? new Date(request.createdAt) : (request.created_at ? new Date(request.created_at) : null);
            const locationType = request.locationType || request.location_type;
            const location = request.location || '';

            return {
                ...request,
                id: request.id,
                code: request.code || `CTX-${request.id}`,
                employeeName: request.employee_name || request.employeeName || 'N/A',
                location: location,
                locationType: locationType,
                locationFull: locationType === 'INTERNATIONAL'
                    ? `${location} (Nước ngoài)`
                    : `${location} (Trong nước)`,
                companyName: request.companyName || request.company_name || null,
                companyAddress: request.companyAddress || request.company_address || null,
                purpose: request.purpose || '',
                startDate: startDate && !isNaN(startDate.getTime()) ? startDate.toLocaleDateString('vi-VN') : '',
                endDate: endDate && !isNaN(endDate.getTime()) ? endDate.toLocaleDateString('vi-VN') : '',
                requestDate: createdAt && !isNaN(createdAt.getTime()) ? createdAt.toLocaleDateString('vi-VN') : '',
                advanceAmount: request.advance?.amount || request.actual_advance_amount || 0,
                requestedAdvanceAmount: request.requestedAdvanceAmount || request.requested_advance_amount || 0,
                actualExpense: request.settlement?.actualExpense || request.actual_expense || null,
                settlementNotes: request.settlement?.notes || request.settlement_notes || null,
                attachments: request.attachments || [],
                livingAllowance: request.livingAllowance || (request.living_allowance_amount && request.living_allowance_currency ? {
                    amount: request.living_allowance_amount,
                    currency: request.living_allowance_currency
                } : null),
                reimbursementAmount: request.accountant?.reimbursementAmount || request.reimbursement_amount || null,
                status: request.status || ''
            };
        }

        // If it's from selectedRequestFromList, ensure attachments are included
        // Attachments should already be in the request from the list, but double-check
        return {
            ...request,
            attachments: request.attachments || []
        };
    };

    const selectedRequest = normalizeSelectedRequest();
    
    // Debug: Log selectedRequest attachments
    useEffect(() => {
        if (selectedRequest) {
            console.log('[TravelExpenseAccountant] Selected request attachments:', selectedRequest.attachments);
            console.log('[TravelExpenseAccountant] Selected request:', selectedRequest);
        }
    }, [selectedRequest]);

    // Calculate comparison - Đối chiếu chi phí thực tế với số tiền tạm ứng
    const calculateComparison = () => {
        if (!selectedRequest || !selectedRequest.actualExpense || !selectedRequest.advanceAmount) {
            return null;
        }

        const actual = selectedRequest.actualExpense;
        const advanceAmount = selectedRequest.advanceAmount; // Số tiền đã tạm ứng (thay cho ngân sách cố định)
        const difference = actual - advanceAmount;
        const exceedsAdvance = difference > 0;

        // Nếu đã có reimbursementAmount (sau khi CEO duyệt exception), dùng giá trị đó
        const finalReimbursementAmount = selectedRequest.reimbursementAmount || (exceedsAdvance ? advanceAmount : actual);

        // Kiểm tra xem đã được check chưa (có reimbursementAmount) và status = SETTLED nhưng chưa có payment
        const isAlreadyChecked = !!selectedRequest.reimbursementAmount &&
            selectedRequest.status === 'SETTLED' &&
            !selectedRequest.payment_confirmed_at;

        return {
            actual,
            advanceAmount, // Số tiền tạm ứng (thay cho ngân sách)
            difference: Math.abs(difference),
            exceedsAdvance,
            reimbursementAmount: finalReimbursementAmount, // Hoàn ứng cuối cùng (có thể đã được CEO điều chỉnh)
            excessAmount: exceedsAdvance ? difference : 0,
            refundAmount: actual < advanceAmount ? advanceAmount - actual : 0, // Số tiền nhân viên phải hoàn trả nếu chi phí thực tế < số tiền tạm ứng
            isAlreadyChecked // Đã được kiểm tra, chỉ cần giải ngân
        };
    };

    const comparison = calculateComparison();

    // Tính toán needsPayment - cần giải ngân khi:
    // 1. Chưa check và chi phí <= tạm ứng (giải ngân ngay)
    // 2. Đã check và status = SETTLED (sau khi CEO duyệt exception, cần giải ngân)
    const needsPayment = comparison && (
        (!comparison.exceedsAdvance && !comparison.isAlreadyChecked) || // Chưa check, chi phí <= tạm ứng
        comparison.isAlreadyChecked // Đã check, status = SETTLED, cần giải ngân
    );

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedRequestId) {
            showToast?.('Vui lòng chọn một yêu cầu để kiểm tra', 'warning');
            return;
        }

        if (needsPayment && !paymentFormData.paymentMethod) {
            showToast?.('Vui lòng chọn phương thức thanh toán để giải ngân', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const requestData = {
                checkedBy: currentUser?.id || currentUser?.employeeId,
                notes: formData.notes
            };

            // Nếu cần giải ngân (chi phí <= tạm ứng hoặc đã được CEO duyệt), gửi thông tin giải ngân
            if (needsPayment) {
                requestData.paymentMethod = paymentFormData.paymentMethod;
                requestData.paymentReference = paymentFormData.paymentReference || null;
            }

            const response = await travelExpensesAPI.accountantCheck(selectedRequestId, requestData);

            if (response.data && response.data.success) {
                showToast?.(
                    comparison?.exceedsAdvance
                        ? `Đã kiểm tra và quyết toán. Chi phí thực tế vượt số tiền tạm ứng ${comparison.excessAmount.toLocaleString('vi-VN')} VND. Chuyển sang phê duyệt ngoại lệ.`
                        : comparison?.refundAmount > 0
                            ? `Đã kiểm tra và quyết toán thành công! Nhân viên cần hoàn trả ${comparison.refundAmount.toLocaleString('vi-VN')} VND.`
                            : 'Đã kiểm tra và quyết toán thành công!',
                    'success'
                );

                // Reset form
                setFormData({ notes: '' });
                setPaymentFormData({ paymentMethod: 'BANK_TRANSFER', paymentReference: '' });
                setSelectedRequestId(null);

                // Refresh requests - fetch cả PENDING_ACCOUNTANT và SETTLED (chưa có payment_confirmed_at)
                let allRequests = [];
                const refreshResponse = await travelExpensesAPI.getAll({
                    status: 'PENDING_ACCOUNTANT'
                });
                if (refreshResponse.data && refreshResponse.data.success) {
                    allRequests = [...(refreshResponse.data.data || [])];
                }
                // Fetch thêm SETTLED requests chưa được giải ngân
                try {
                    const settledResponse = await travelExpensesAPI.getAll({
                        status: 'SETTLED'
                    });
                    if (settledResponse.data && settledResponse.data.success) {
                        const settledRequests = (settledResponse.data.data || []).filter(req => {
                            return !req.payment?.confirmedAt && !req.payment_confirmed_at;
                        });
                        allRequests = [...allRequests, ...settledRequests];
                    }
                } catch (error) {
                    console.error('Error fetching SETTLED requests:', error);
                }

                if (allRequests.length > 0) {
                    // Fetch attachments for each request
                    const requestsWithAttachments = await Promise.all(
                        allRequests.map(async (req) => {
                            try {
                                const attachmentsResponse = await travelExpensesAPI.getAttachments(req.id);
                                return {
                                    ...req,
                                    attachments: attachmentsResponse.data?.data || []
                                };
                            } catch (error) {
                                console.error(`Error fetching attachments for request ${req.id}:`, error);
                                return { ...req, attachments: [] };
                            }
                        })
                    );

                    const formattedRequests = requestsWithAttachments.map(req => {
                        const startDate = req.start_time ? new Date(req.start_time) : null;
                        const endDate = req.end_time ? new Date(req.end_time) : null;
                        const locationType = req.locationType || req.location_type;
                        const location = req.location || '';

                        return {
                            id: req.id,
                            code: `CTX-${req.id}`,
                            employeeName: req.employee_name || 'N/A',
                            location: location,
                            locationType: locationType,
                            locationFull: locationType === 'INTERNATIONAL'
                                ? `${location} (Nước ngoài)`
                                : `${location} (Trong nước)`,
                            companyName: req.companyName || req.company_name || null,
                            companyAddress: req.companyAddress || req.company_address || null,
                            purpose: req.purpose || '',
                            startDate: startDate ? startDate.toLocaleDateString('vi-VN') : '',
                            endDate: endDate ? endDate.toLocaleDateString('vi-VN') : '',
                            requestDate: req.created_at ? new Date(req.created_at).toLocaleDateString('vi-VN') : '',
                            advanceAmount: req.advance?.amount || req.actual_advance_amount || 0,
                            requestedAdvanceAmount: req.requestedAdvanceAmount || req.requested_advance_amount || 0,
                            actualExpense: req.settlement?.actualExpense || req.actual_expense || null,
                            settlementNotes: req.settlement?.notes || req.settlement_notes || null,
                            attachments: req.attachments || [],
                            livingAllowance: req.livingAllowance || (req.living_allowance_amount && req.living_allowance_currency ? {
                                amount: req.living_allowance_amount,
                                currency: req.living_allowance_currency
                            } : null),
                            reimbursementAmount: req.accountant?.reimbursementAmount || req.reimbursement_amount || null,
                            status: req.status || '',
                            payment: req.payment || null,
                            payment_confirmed_at: req.payment_confirmed_at || req.payment?.confirmedAt || null
                        };
                    });
                    setRequests(formattedRequests);
                } else {
                    setRequests([]);
                }
            }
        } catch (error) {
            console.error('Error checking accountant:', error);
            showToast?.('Lỗi khi kiểm tra và quyết toán: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredRequests = requests.filter(request =>
        request.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="travel-expense-accountant">
            {/* Header */}
            <div className="travel-expense-accountant-header">
                <div className="travel-expense-accountant-header-top">
                    <div className="travel-expense-accountant-header-content">
                        <div className="travel-expense-accountant-icon-wrapper">
                            <svg className="travel-expense-accountant-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                            </svg>
                        </div>
                        <div>
                            <h1 className="travel-expense-accountant-title">Kiểm tra & Quyết toán</h1>
                            <p className="travel-expense-accountant-subtitle">
                                Đối chiếu chi phí thực tế với số tiền tạm ứng, quyết toán và giải ngân
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Container - Master-Detail View */}
            <div className="travel-expense-accountant-main-container">
                <div className="travel-expense-accountant-main-layout">
                    {/* Cột 1: Master - Danh Sách Yêu Cầu (33%) */}
                    <div className="travel-expense-accountant-list-column">
                        <div className="travel-expense-accountant-list-container">
                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '2px solid #e5e7eb' }}>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('advance')}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        border: 'none',
                                        background: activeTab === 'advance' ? '#0f766e' : 'transparent',
                                        color: activeTab === 'advance' ? 'white' : '#6b7280',
                                        cursor: 'pointer',
                                        fontWeight: activeTab === 'advance' ? 600 : 400,
                                        borderBottom: activeTab === 'advance' ? '2px solid #0f766e' : '2px solid transparent',
                                        marginBottom: '-2px'
                                    }}
                                >
                                    Tạm ứng
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('check')}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        border: 'none',
                                        background: activeTab === 'check' ? '#0f766e' : 'transparent',
                                        color: activeTab === 'check' ? 'white' : '#6b7280',
                                        cursor: 'pointer',
                                        fontWeight: activeTab === 'check' ? 600 : 400,
                                        borderBottom: activeTab === 'check' ? '2px solid #0f766e' : '2px solid transparent',
                                        marginBottom: '-2px'
                                    }}
                                >
                                    Kiểm tra
                                </button>
                            </div>

                            <h2 className="travel-expense-accountant-list-title">
                                {activeTab === 'advance' ? 'YÊU CẦU CHỜ XÁC NHẬN CHUYỂN KHOẢN TẠM ỨNG'
                                    : 'YÊU CẦU CHỜ KIỂM TRA, QUYẾT TOÁN & GIẢI NGÂN'}
                            </h2>

                            {/* Thanh Công Cụ: Search */}
                            <div className="travel-expense-accountant-toolbar">
                                <div className="travel-expense-accountant-search-wrapper">
                                    <svg className="travel-expense-accountant-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        className="travel-expense-accountant-search-input"
                                        placeholder="Tìm theo Mã YC, Tên NV..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Request List */}
                            <div className="travel-expense-accountant-list-items">
                                {loading ? (
                                    <div className="travel-expense-accountant-loading">Đang tải...</div>
                                ) : filteredRequests.length === 0 ? (
                                    <div className="travel-expense-accountant-empty">
                                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                                            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: '500' }}>
                                                {activeTab === 'check'
                                                    ? 'Không có yêu cầu nào chờ kiểm tra, quyết toán và giải ngân'
                                                    : 'Không có yêu cầu nào chờ xác nhận chuyển khoản tạm ứng'}
                                            </p>
                                            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                                                {activeTab === 'advance'
                                                    ? 'Các yêu cầu đã được HR xử lý tạm ứng (advance_status = PENDING_ACCOUNTANT) sẽ xuất hiện ở đây để kế toán xác nhận chuyển khoản.'
                                                    : 'Các yêu cầu đã được HR xác nhận báo cáo hoàn ứng sẽ xuất hiện ở đây để kế toán kiểm tra, quyết toán và giải ngân (nếu đầy đủ chứng từ hợp lệ).'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    filteredRequests.map((request) => (
                                        <div
                                            key={request.id}
                                            className={`travel-expense-accountant-list-item ${selectedRequestId === request.id ? 'active' : ''}`}
                                            onClick={async () => {
                                                setSelectedRequestId(request.id);
                                                setFormData({ notes: '' });
                                                setPaymentFormData({ paymentMethod: 'BANK_TRANSFER', paymentReference: '' }); // Reset payment form

                                                // Fetch full request details and attachments
                                                try {
                                                    const detailResponse = await travelExpensesAPI.getById(request.id);
                                                    if (detailResponse.data && detailResponse.data.success) {
                                                        const requestData = detailResponse.data.data;
                                                        
                                                        // Fetch attachments
                                                        try {
                                                            const attachmentsResponse = await travelExpensesAPI.getAttachments(request.id);
                                                            if (attachmentsResponse.data && attachmentsResponse.data.success) {
                                                                requestData.attachments = attachmentsResponse.data.data || [];
                                                                console.log('[TravelExpenseAccountant] Fetched attachments on click:', requestData.attachments);
                                                            }
                                                        } catch (error) {
                                                            console.error('Error fetching attachments:', error);
                                                            requestData.attachments = [];
                                                        }
                                                        
                                                        setSelectedRequestDetails(requestData);
                                                    }
                                                } catch (error) {
                                                    console.error('Error fetching request details:', error);
                                                    setSelectedRequestDetails(null);
                                                }
                                            }}
                                        >
                                            <div className="travel-expense-accountant-item-left">
                                                <div className="travel-expense-accountant-request-code">
                                                    {request.code}
                                                </div>
                                                <div className="travel-expense-accountant-employee-name">
                                                    {request.employeeName}
                                                </div>
                                                <div className="travel-expense-accountant-purpose">
                                                    {request.purpose}
                                                </div>
                                                {request.actualExpense && (
                                                    <div className="travel-expense-accountant-actual-expense">
                                                        Chi Phí: {request.actualExpense.toLocaleString('vi-VN')} ₫
                                                    </div>
                                                )}
                                            </div>
                                            <div className="travel-expense-accountant-item-right">
                                                <span className={`travel-expense-accountant-status-tag ${activeTab === 'advance' ? 'status-pending-accountant'
                                                    : request.status === 'SETTLED' && !request.payment_confirmed_at
                                                        ? 'status-completed'
                                                        : 'status-pending-accountant'
                                                    }`}>
                                                    {activeTab === 'advance' ? 'CHỜ XÁC NHẬN CHUYỂN KHOẢN'
                                                        : request.status === 'SETTLED' && !request.payment_confirmed_at
                                                            ? 'CHỜ GIẢI NGÂN'
                                                            : 'CHỜ KẾ TOÁN DUYỆT'}
                                                </span>
                                                {activeTab === 'advance' && request.advanceAmount && (
                                                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#059669', fontWeight: 600 }}>
                                                        {Number(request.advanceAmount).toLocaleString('vi-VN')} ₫
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Cột 2: Detail - Form Kiểm tra & Quyết toán (67%) */}
                    <div className="travel-expense-accountant-detail-column">
                        <div className="travel-expense-accountant-detail-container">
                            {selectedRequest ? (
                                activeTab === 'advance' ? (
                                    // Tab "Tạm ứng" - Form xác nhận chuyển khoản tạm ứng (Bước 4.2)
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        if (!selectedRequestId) {
                                            showToast?.('Vui lòng chọn một yêu cầu để xác nhận chuyển khoản', 'warning');
                                            return;
                                        }

                                        setIsSubmitting(true);
                                        try {
                                            const response = await travelExpensesAPI.confirmAdvanceTransfer(selectedRequestId, {
                                                transferredBy: currentUser?.id || currentUser?.employeeId
                                            });

                                            if (response.data && response.data.success) {
                                                showToast?.('Đã xác nhận chuyển khoản tạm ứng thành công!', 'success');
                                                setSelectedRequestId(null);
                                                setSelectedRequestDetails(null);

                                                // Refresh requests
                                                const refreshResponse = await travelExpensesAPI.getAll({
                                                    status: 'PENDING_FINANCE'
                                                });
                                                if (refreshResponse.data && refreshResponse.data.success) {
                                                    const unprocessedRequests = refreshResponse.data.data.filter(req => {
                                                        const advanceStatus = req.advance_status || req.advance?.status;
                                                        return advanceStatus === 'PENDING_ACCOUNTANT';
                                                    });

                                                    const formattedRequests = unprocessedRequests.map(req => {
                                                        const startDate = req.start_time ? new Date(req.start_time) : null;
                                                        const endDate = req.end_time ? new Date(req.end_time) : null;
                                                        return {
                                                            id: req.id,
                                                            code: `CTX-${req.id}`,
                                                            employeeName: req.employee_name || 'N/A',
                                                            location: req.location || '',
                                                            locationType: req.locationType || req.location_type,
                                                            purpose: req.purpose || '',
                                                            startDate: startDate ? startDate.toLocaleDateString('vi-VN') : '',
                                                            endDate: endDate ? endDate.toLocaleDateString('vi-VN') : '',
                                                            advanceAmount: req.advance?.amount || req.actual_advance_amount || 0,
                                                            requestedAdvanceAmount: req.requestedAdvanceAmount || req.requested_advance_amount || 0,
                                                            attachments: []
                                                        };
                                                    });
                                                    setRequests(formattedRequests);
                                                }
                                            }
                                        } catch (error) {
                                            console.error('Error confirming advance transfer:', error);
                                            showToast?.('Lỗi khi xác nhận chuyển khoản: ' + (error.response?.data?.message || error.message), 'error');
                                        } finally {
                                            setIsSubmitting(false);
                                        }
                                    }} className="travel-expense-accountant-form">
                                        {/* Header */}
                                        <div className="travel-expense-accountant-report-header">
                                            <div className="travel-expense-accountant-report-header-left">
                                                <h2 className="travel-expense-accountant-report-title">
                                                    <span className="travel-expense-accountant-report-title-code">{selectedRequest.code}</span>
                                                    {' - '}
                                                    <span className="travel-expense-accountant-report-title-text">XÁC NHẬN CHUYỂN KHOẢN TẠM ỨNG</span>
                                                </h2>
                                            </div>
                                            <div className="travel-expense-accountant-report-header-right">
                                                <span className="travel-expense-accountant-status-badge status-pending-accountant">
                                                    CHỜ XÁC NHẬN CHUYỂN KHOẢN
                                                </span>
                                            </div>
                                        </div>

                                        {/* Thông tin đề nghị */}
                                        <div className="travel-expense-accountant-section travel-expense-accountant-section-summary">
                                            <h3 className="travel-expense-accountant-section-title">
                                                I. THÔNG TIN ĐỀ NGHỊ
                                            </h3>
                                            <div className="travel-expense-accountant-section-content travel-expense-accountant-section-summary-content">
                                                <div className="travel-expense-accountant-info-grid">
                                                    <div className="travel-expense-accountant-info-item">
                                                        <span className="travel-expense-accountant-info-label">Nhân viên:</span>
                                                        <span className="travel-expense-accountant-info-value">{selectedRequest.employeeName}</span>
                                                    </div>
                                                    <div className="travel-expense-accountant-info-item">
                                                        <span className="travel-expense-accountant-info-label">Thời Gian Công Tác:</span>
                                                        <span className="travel-expense-accountant-info-value">{selectedRequest.startDate} - {selectedRequest.endDate}</span>
                                                    </div>
                                                    <div className="travel-expense-accountant-info-item">
                                                        <span className="travel-expense-accountant-info-label">Mục Đích:</span>
                                                        <span className="travel-expense-accountant-info-value">{selectedRequest.purpose}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Thông tin tạm ứng */}
                                        {selectedRequestDetails && (
                                            <div className="travel-expense-accountant-section">
                                                <h3 className="travel-expense-accountant-section-title">
                                                    II. THÔNG TIN TẠM ỨNG
                                                </h3>
                                                <div className="travel-expense-accountant-section-content">
                                                    <div className="travel-expense-accountant-info-grid">
                                                        <div className="travel-expense-accountant-info-item">
                                                            <span className="travel-expense-accountant-info-label">Số Tiền Tạm Ứng:</span>
                                                            <span className="travel-expense-accountant-info-value" style={{ fontWeight: 600, color: '#059669' }}>
                                                                {Number(selectedRequestDetails.advance?.amount || selectedRequestDetails.actual_advance_amount || 0).toLocaleString('vi-VN')} ₫
                                                            </span>
                                                        </div>
                                                        <div className="travel-expense-accountant-info-item">
                                                            <span className="travel-expense-accountant-info-label">Hình Thức:</span>
                                                            <span className="travel-expense-accountant-info-value">
                                                                {selectedRequestDetails.advance?.method || selectedRequestDetails.advance_method || '-'}
                                                            </span>
                                                        </div>
                                                        {selectedRequestDetails.advance?.bankAccount || selectedRequestDetails.bank_account ? (
                                                            <div className="travel-expense-accountant-info-item">
                                                                <span className="travel-expense-accountant-info-label">Tài Khoản Ngân Hàng:</span>
                                                                <span className="travel-expense-accountant-info-value">
                                                                    {selectedRequestDetails.advance?.bankAccount || selectedRequestDetails.bank_account}
                                                                </span>
                                                            </div>
                                                        ) : null}
                                                        {selectedRequestDetails.advance?.notes || selectedRequestDetails.advance_notes ? (
                                                            <div className="travel-expense-accountant-info-item" style={{ gridColumn: '1 / -1' }}>
                                                                <span className="travel-expense-accountant-info-label">Ghi Chú từ HR:</span>
                                                                <span className="travel-expense-accountant-info-value">
                                                                    {selectedRequestDetails.advance?.notes || selectedRequestDetails.advance_notes}
                                                                </span>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="travel-expense-accountant-section">
                                            <h3 className="travel-expense-accountant-section-title">
                                                III. XÁC NHẬN
                                            </h3>
                                            <div className="travel-expense-accountant-section-content">
                                                <div className="travel-expense-accountant-actions-card">
                                                    <div className="travel-expense-accountant-actions-title">
                                                        XÁC NHẬN ĐÃ CHUYỂN KHOẢN TẠM ỨNG
                                                    </div>
                                                    <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                                                        Vui lòng xác nhận sau khi đã thực hiện chuyển khoản tạm ứng cho nhân viên.
                                                    </p>
                                                    <div className="travel-expense-accountant-form-actions">
                                                        <button
                                                            type="submit"
                                                            className="travel-expense-accountant-approve-btn"
                                                            disabled={isSubmitting}
                                                        >
                                                            {isSubmitting ? 'Đang xử lý...' : 'XÁC NHẬN CHUYỂN KHOẢN'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                ) : activeTab === 'check' ? (
                                    // Tab "Kiểm tra" - Form kiểm tra & quyết toán (Bước 6)
                                    <form onSubmit={handleSubmit} className="travel-expense-accountant-form">
                                        {/* Header của Báo cáo */}
                                        <div className="travel-expense-accountant-report-header">
                                            <div className="travel-expense-accountant-report-header-left">
                                                <h2 className="travel-expense-accountant-report-title">
                                                    <span className="travel-expense-accountant-report-title-code">{selectedRequest.code}</span>
                                                    {' - '}
                                                    <span className="travel-expense-accountant-report-title-text">BÁO CÁO QUYẾT TOÁN</span>
                                                </h2>
                                            </div>
                                            <div className="travel-expense-accountant-report-header-right">
                                                <span className="travel-expense-accountant-status-badge status-pending-accountant">
                                                    CHỜ KẾ TOÁN DUYỆT
                                                </span>
                                            </div>
                                        </div>

                                        {/* Section I: Thông tin Đề nghị */}
                                        <div className="travel-expense-accountant-section travel-expense-accountant-section-summary">
                                            <h3 className="travel-expense-accountant-section-title">
                                                I. THÔNG TIN ĐỀ NGHỊ
                                            </h3>
                                            <div className="travel-expense-accountant-section-content travel-expense-accountant-section-summary-content">
                                                <div className="travel-expense-accountant-info-grid">
                                                    <div className="travel-expense-accountant-info-item">
                                                        <span className="travel-expense-accountant-info-label">Nhân viên/Phòng Ban:</span>
                                                        <span className="travel-expense-accountant-info-value">{selectedRequest.employeeName}</span>
                                                    </div>
                                                    <div className="travel-expense-accountant-info-item">
                                                        <span className="travel-expense-accountant-info-label">Địa điểm:</span>
                                                        <span className="travel-expense-accountant-info-value">{selectedRequest.locationFull || selectedRequest.location}</span>
                                                    </div>
                                                    {selectedRequest.companyName && (
                                                        <div className="travel-expense-accountant-info-item">
                                                            <span className="travel-expense-accountant-info-label">Công ty/Đối tác:</span>
                                                            <span className="travel-expense-accountant-info-value">{selectedRequest.companyName}</span>
                                                        </div>
                                                    )}
                                                    {selectedRequest.companyAddress && (
                                                        <div className="travel-expense-accountant-info-item">
                                                            <span className="travel-expense-accountant-info-label">Địa chỉ công ty:</span>
                                                            <span className="travel-expense-accountant-info-value">{selectedRequest.companyAddress}</span>
                                                        </div>
                                                    )}
                                                    <div className="travel-expense-accountant-info-item">
                                                        <span className="travel-expense-accountant-info-label">Thời Gian Công Tác:</span>
                                                        <span className="travel-expense-accountant-info-value">{selectedRequest.startDate} - {selectedRequest.endDate}</span>
                                                    </div>
                                                    <div className="travel-expense-accountant-info-item">
                                                        <span className="travel-expense-accountant-info-label">Ngày Đề Nghị:</span>
                                                        <span className="travel-expense-accountant-info-value">{selectedRequest.requestDate || '-'}</span>
                                                    </div>
                                                    <div className="travel-expense-accountant-info-item" style={{ gridColumn: '1 / -1' }}>
                                                        <span className="travel-expense-accountant-info-label">Mục Đích Chi Phí:</span>
                                                        <span className="travel-expense-accountant-info-value">{selectedRequest.purpose}</span>
                                                    </div>
                                                    {selectedRequest.livingAllowance && (
                                                        <div className="travel-expense-accountant-info-item">
                                                            <span className="travel-expense-accountant-info-label">Phụ cấp/Phí sinh hoạt:</span>
                                                            <span className="travel-expense-accountant-info-value">
                                                                {selectedRequest.livingAllowance.currency === 'VND'
                                                                    ? selectedRequest.livingAllowance.amount.toLocaleString('vi-VN')
                                                                    : selectedRequest.livingAllowance.amount} {selectedRequest.livingAllowance.currency}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section II: Chi tiết Quyết toán */}
                                        {comparison && (
                                            <div className="travel-expense-accountant-section">
                                                <h3 className="travel-expense-accountant-section-title">
                                                    II. CHI TIẾT QUYẾT TOÁN
                                                </h3>
                                                <div className="travel-expense-accountant-section-content">
                                                    {/* Summary Cards */}
                                                    <div className="travel-expense-accountant-summary-cards">
                                                        <div className="travel-expense-accountant-summary-card">
                                                            <div className="travel-expense-accountant-summary-card-label">Tạm Ứng Ban Đầu</div>
                                                            <div className="travel-expense-accountant-summary-card-value advance">
                                                                {comparison.advanceAmount.toLocaleString('vi-VN')} ₫
                                                            </div>
                                                        </div>
                                                        <div className="travel-expense-accountant-summary-card">
                                                            <div className="travel-expense-accountant-summary-card-label">Chi Phí Thực Tế</div>
                                                            <div className="travel-expense-accountant-summary-card-value actual">
                                                                {comparison.actual.toLocaleString('vi-VN')} ₫
                                                            </div>
                                                        </div>
                                                        <div className="travel-expense-accountant-summary-card">
                                                            <div className="travel-expense-accountant-summary-card-label">Cân Đối Quyết Toán</div>
                                                            <div className={`travel-expense-accountant-summary-card-value balance ${comparison.refundAmount > 0
                                                                ? 'refund'
                                                                : comparison.excessAmount > 0
                                                                    ? 'supplement'
                                                                    : 'balanced'
                                                                }`}>
                                                                {comparison.refundAmount > 0
                                                                    ? `${comparison.refundAmount.toLocaleString('vi-VN')} ₫`
                                                                    : comparison.excessAmount > 0
                                                                        ? `${comparison.excessAmount.toLocaleString('vi-VN')} ₫`
                                                                        : '0 ₫'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Expense List */}
                                                    <div className="travel-expense-accountant-expense-list-card">
                                                        <div className="travel-expense-accountant-expense-list-title">
                                                            Danh Sách Khoản Chi:
                                                        </div>
                                                        <div className="travel-expense-accountant-expense-list">
                                                            {selectedRequest.settlementNotes ? (
                                                                <div className="travel-expense-accountant-expense-item">
                                                                    <span className="travel-expense-accountant-expense-description">
                                                                        {selectedRequest.settlementNotes}
                                                                    </span>
                                                                    <span className="travel-expense-accountant-expense-amount">
                                                                        {comparison.actual.toLocaleString('vi-VN')} ₫
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className="travel-expense-accountant-expense-item">
                                                                    <span className="travel-expense-accountant-expense-description">
                                                                        Chưa có chi tiết khoản chi
                                                                    </span>
                                                                    <span className="travel-expense-accountant-expense-amount">
                                                                        {comparison.actual.toLocaleString('vi-VN')} ₫
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Section III: Ghi chú và Xử lý */}
                                        <div className="travel-expense-accountant-section">
                                            <h3 className="travel-expense-accountant-section-title">
                                                III. GHI CHÚ VÀ XỬ LÝ
                                            </h3>
                                            <div className="travel-expense-accountant-section-content">
                                                {/* Attachments Section */}
                                                {(() => {
                                                    const attachments = selectedRequest?.attachments || [];
                                                    const employeeAttachments = attachments.filter(att => {
                                                        const role = att.uploadedByRole || att.uploaded_by_role || '';
                                                        return role !== 'HR' && role !== 'hr';
                                                    });
                                                    const hrAttachments = attachments.filter(att => {
                                                        const role = att.uploadedByRole || att.uploaded_by_role || '';
                                                        return role === 'HR' || role === 'hr';
                                                    });
                                                    
                                                    if (attachments.length === 0) {
                                                        return (
                                                            <div className="travel-expense-accountant-attachments-card">
                                                                <div className="travel-expense-accountant-attachments-title">
                                                                    📎 Tổng Hợp File Đính Kèm
                                                                </div>
                                                                <div style={{ padding: '1rem', color: '#6b7280', fontStyle: 'italic' }}>
                                                                    Chưa có file đính kèm nào
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    
                                                    return (
                                                        <div className="travel-expense-accountant-attachments-card">
                                                            <div className="travel-expense-accountant-attachments-title">
                                                                📎 Tổng Hợp File Đính Kèm ({attachments.length} file)
                                                            </div>
                                                            <div className="travel-expense-accountant-attachments-list">
                                                                {/* Files from Employee */}
                                                                {employeeAttachments.length > 0 && (
                                                                    <div className="travel-expense-accountant-attachments-group">
                                                                        <div className="travel-expense-accountant-attachments-group-title">
                                                                            📄 Hóa đơn/Chứng từ từ Nhân viên ({employeeAttachments.length} file)
                                                                        </div>
                                                                        <div className="travel-expense-accountant-attachments-items">
                                                                            {employeeAttachments.map((att, idx) => {
                                                                                const fileName = att.fileName || att.file_name || 'Unknown';
                                                                                const filePath = att.filePath || att.file_path || '';
                                                                                const fileSize = att.fileSize || att.file_size || 0;
                                                                                const fileNameOnly = filePath ? filePath.split(/[/\\]/).pop() : fileName;
                                                                                
                                                                                return (
                                                                                    <a
                                                                                        key={idx}
                                                                                        href={`${process.env.REACT_APP_API_URL || ''}/uploads/travel-expenses/${fileNameOnly}`}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="travel-expense-accountant-attachment-link"
                                                                                    >
                                                                                        <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                        </svg>
                                                                                        <span className="travel-expense-accountant-attachment-name">{fileName}</span>
                                                                                        {fileSize > 0 && (
                                                                                            <span className="travel-expense-accountant-attachment-size">
                                                                                                ({(fileSize / 1024).toFixed(1)} KB)
                                                                                            </span>
                                                                                        )}
                                                                                    </a>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {/* Files from HR */}
                                                                {hrAttachments.length > 0 && (
                                                                    <div className="travel-expense-accountant-attachments-group">
                                                                        <div className="travel-expense-accountant-attachments-group-title">
                                                                            📎 File bổ sung từ HR ({hrAttachments.length} file)
                                                                        </div>
                                                                        <div className="travel-expense-accountant-attachments-items">
                                                                            {hrAttachments.map((att, idx) => {
                                                                                const fileName = att.fileName || att.file_name || 'Unknown';
                                                                                const filePath = att.filePath || att.file_path || '';
                                                                                const fileSize = att.fileSize || att.file_size || 0;
                                                                                const fileNameOnly = filePath ? filePath.split(/[/\\]/).pop() : fileName;
                                                                                
                                                                                return (
                                                                                    <a
                                                                                        key={idx}
                                                                                        href={`${process.env.REACT_APP_API_URL || ''}/uploads/travel-expenses/${fileNameOnly}`}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="travel-expense-accountant-attachment-link"
                                                                                    >
                                                                                        <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                        </svg>
                                                                                        <span className="travel-expense-accountant-attachment-name">{fileName}</span>
                                                                                        {fileSize > 0 && (
                                                                                            <span className="travel-expense-accountant-attachment-size">
                                                                                                ({(fileSize / 1024).toFixed(1)} KB)
                                                                                            </span>
                                                                                        )}
                                                                                    </a>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Employee's Note Section */}
                                                {selectedRequest.settlementNotes && (
                                                    <div className="travel-expense-accountant-employee-note-card">
                                                        <div className="travel-expense-accountant-employee-note-label">
                                                            Ghi Chú của Nhân Viên:
                                                        </div>
                                                        <div className="travel-expense-accountant-employee-note-content">
                                                            {selectedRequest.settlementNotes}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Processing Department Actions */}
                                                <div className="travel-expense-accountant-actions-card">
                                                    <div className="travel-expense-accountant-actions-title">
                                                        {needsPayment
                                                            ? comparison.isAlreadyChecked
                                                                ? 'GIẢI NGÂN (Đã quyết toán, chờ giải ngân)'
                                                                : 'HÀNH ĐỘNG CỦA PHÒNG BAN XỬ LÝ (KIỂM TRA, QUYẾT TOÁN & GIẢI NGÂN)'
                                                            : 'HÀNH ĐỘNG CỦA PHÒNG BAN XỬ LÝ (CHỜ KẾ TOÁN DUYỆT)'
                                                        }
                                                    </div>
                                                    <div className="travel-expense-accountant-form-group">
                                                        <textarea
                                                            id="notes"
                                                            className="travel-expense-accountant-form-textarea"
                                                            rows="6"
                                                            value={formData.notes}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                                            placeholder="Nhập ghi chú phê duyệt hoặc yêu cầu bổ sung chứng từ..."
                                                        />
                                                    </div>

                                                    {/* Form giải ngân - hiển thị khi:
                                                        1. Chi phí <= tạm ứng (chưa check) 
                                                        2. Đã check và status = SETTLED (sau khi CEO duyệt exception) */}
                                                    {comparison && (needsPayment) && (
                                                        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                                                            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
                                                                III. THÔNG TIN GIẢI NGÂN
                                                            </h4>
                                                            <div className="travel-expense-accountant-form-group">
                                                                <label htmlFor="paymentMethod" className="travel-expense-accountant-form-label">
                                                                    Phương thức thanh toán <span style={{ color: '#dc2626' }}>*</span>
                                                                </label>
                                                                <select
                                                                    id="paymentMethod"
                                                                    className="travel-expense-accountant-form-input"
                                                                    value={paymentFormData.paymentMethod}
                                                                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                                                    required
                                                                >
                                                                    <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
                                                                    <option value="CASH">Tiền mặt</option>
                                                                    <option value="OTHER">Khác</option>
                                                                </select>
                                                            </div>
                                                            <div className="travel-expense-accountant-form-group">
                                                                <label htmlFor="paymentReference" className="travel-expense-accountant-form-label">
                                                                    Số tham chiếu / Mã chuyển khoản
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    id="paymentReference"
                                                                    className="travel-expense-accountant-form-input"
                                                                    value={paymentFormData.paymentReference}
                                                                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, paymentReference: e.target.value }))}
                                                                    placeholder="Nhập số tham chiếu giao dịch (nếu có)"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="travel-expense-accountant-form-actions">
                                                        <button
                                                            type="submit"
                                                            className="travel-expense-accountant-approve-btn"
                                                            disabled={isSubmitting || !comparison}
                                                        >
                                                            {needsPayment
                                                                ? comparison.isAlreadyChecked
                                                                    ? 'GIẢI NGÂN'
                                                                    : 'KIỂM TRA, QUYẾT TOÁN & GIẢI NGÂN'
                                                                : 'PHÊ DUYỆT & CHUYỂN BƯỚC'
                                                            }
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="travel-expense-accountant-reject-btn"
                                                            disabled={isSubmitting}
                                                            onClick={() => {
                                                                // TODO: Handle reject action
                                                                showToast?.('Chức năng từ chối sẽ được triển khai sau', 'info');
                                                            }}
                                                        >
                                                            YÊU CẦU BỔ SUNG / TỪ CHỐI
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                ) : null
                            ) : (
                                <div className="travel-expense-accountant-empty-state">
                                    <p>Vui lòng chọn một yêu cầu từ danh sách để {
                                        activeTab === 'advance' ? 'xác nhận chuyển khoản tạm ứng'
                                            : 'kiểm tra, quyết toán và giải ngân'
                                    }.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TravelExpenseAccountant;

