import React, { useState, useEffect } from 'react';
import './TravelExpenseSettlement.css';
import { travelExpensesAPI, employeesAPI, customerEntertainmentExpensesAPI } from '../../services/api';

const TravelExpenseSettlement = ({ currentUser, showToast }) => {
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState([]);
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attachments, setAttachments] = useState([]); // Existing attachments from server
    const [selectedFiles, setSelectedFiles] = useState([]); // Files selected for upload

    // Form state
    const [formData, setFormData] = useState({
        actualExpense: '',
        advanceAmount: '',
        notes: ''
    });

    // Helper function to get display status for customer entertainment expenses
    const getCustomerEntertainmentStatus = (status) => {
        // Map customer entertainment status to display status
        switch (status) {
            case 'PENDING_BRANCH_DIRECTOR':
                return 'PENDING_BRANCH_DIRECTOR';
            case 'PENDING_MANAGER':
                return 'PENDING_MANAGER';
            case 'PENDING_CEO':
                return 'PENDING_CEO';
            case 'APPROVED_BRANCH_DIRECTOR':
                return 'APPROVED_BRANCH_DIRECTOR';
            case 'APPROVED':
            case 'ACCOUNTANT_PROCESSED':
                return 'ACCOUNTANT_PROCESSED';
            case 'PAID':
                return 'ACCOUNTANT_DONE';
            case 'REJECTED':
                return 'REJECTED';
            case 'RETURNED':
                return 'RETURNED';
            default:
                return status;
        }
    };

    // Helper function to get display status text for customer entertainment expenses
    const getCustomerEntertainmentStatusText = (status) => {
        switch (status) {
            case 'PENDING_BRANCH_DIRECTOR':
                return 'CHỜ GIÁM ĐỐC CHI NHÁNH';
            case 'PENDING_MANAGER':
                return 'CHỜ QUẢN LÝ';
            case 'PENDING_CEO':
                return 'CHỜ TỔNG GIÁM ĐỐC';
            case 'APPROVED_BRANCH_DIRECTOR':
                return 'Đã duyệt giám đốc chi nhánh';
            case 'APPROVED':
            case 'ACCOUNTANT_PROCESSED':
                return 'CHỜ KẾ TOÁN DUYỆT';
            case 'PAID':
                return 'ĐÃ HOÀN TẤT QUYẾT TOÁN';
            case 'REJECTED':
                return 'TỪ CHỐI';
            default:
                return status;
        }
    };

    // Fetch requests function (extracted for reuse)
    const fetchRequests = async () => {
        setLoading(true);
        try {
            const currentUserId = currentUser?.id || currentUser?.employeeId;
            
            // Fetch employees to get department info
            const employeesResponse = await employeesAPI.getAll();
            const employeesMap = new Map();
            if (employeesResponse.data && employeesResponse.data.success) {
                employeesResponse.data.data.forEach(emp => {
                    employeesMap.set(emp.id, emp);
                });
            }

            const allRequests = [];

            // Fetch travel expense requests
            try {
                const travelResponse = await travelExpensesAPI.getAll({});
                if (travelResponse.data && travelResponse.data.success) {
                    const travelRequests = (travelResponse.data.data || [])
                        .filter(req => {
                            // QUAN TRỌNG: Chỉ hiển thị requests của chính user hiện tại
                            const employeeId = req.employee_id || req.employeeId;
                            if (employeeId !== currentUserId) {
                                return false;
                            }

                            // Only show requests that have advance (TRANSFERRED) and are ready for settlement
                            const hasAdvance = req.advance?.status === 'TRANSFERRED' || req.advance_status === 'TRANSFERRED';
                            const settlementStatus = req.settlement?.status || req.settlement_status;
                            // Include all settlement-related statuses or PENDING_SETTLEMENT, including RETURNED
                            return hasAdvance && (
                                req.status === 'PENDING_SETTLEMENT' ||
                                settlementStatus === 'PENDING' ||
                                settlementStatus === 'SUBMITTED' ||
                                settlementStatus === 'HR_CONFIRMED' ||
                                settlementStatus === 'ACCOUNTANT_DONE' ||
                                settlementStatus === 'REJECTED' ||
                                settlementStatus === 'RETURNED'
                            );
                        })
                        .map(req => {
                            const startTimeValue = req.startTime || req.start_time;
                            const endTimeValue = req.endTime || req.end_time;
                            const startDate = startTimeValue ? (() => {
                                const d = new Date(startTimeValue);
                                return !isNaN(d.getTime()) ? d : null;
                            })() : null;
                            const endDate = endTimeValue ? (() => {
                                const d = new Date(endTimeValue);
                                return !isNaN(d.getTime()) ? d : null;
                            })() : null;
                            const employee = employeesMap.get(req.employee_id || req.employeeId);
                            const createdDate = req.created_at ? new Date(req.created_at) : null;

                            // Xác định settlementStatus: nếu đã giải ngân (có payment_confirmed_at), status là ACCOUNTANT_DONE
                            const hasPaymentConfirmed = req.payment?.confirmedAt || req.payment_confirmed_at;
                            const baseSettlementStatus = req.settlement?.status || req.settlement_status || 'PENDING';
                            const finalSettlementStatus = hasPaymentConfirmed ? 'ACCOUNTANT_DONE' : baseSettlementStatus;

                            return {
                                id: req.id,
                                requestType: 'travel',
                                code: `TC-${String(req.id).padStart(3, '0')}`,
                                employeeName: req.employee_name || 'N/A',
                                department: employee?.phong_ban || employee?.department || 'N/A',
                                location: req.location || '',
                                locationType: req.locationType || req.location_type,
                                locationFull: (req.locationType || req.location_type) === 'INTERNATIONAL'
                                    ? `${req.location || ''} (Nước ngoài)`
                                    : `${req.location || ''} (Trong nước)`,
                                purpose: req.purpose || '',
                                companyName: req.companyName || req.company_name || null,
                                companyAddress: req.companyAddress || req.company_address || null,
                                startDate: startDate ? startDate.toLocaleDateString('vi-VN') : '',
                                endDate: endDate ? endDate.toLocaleDateString('vi-VN') : '',
                                startDateRaw: startDate,
                                endDateRaw: endDate,
                                createdDate: createdDate ? createdDate.toLocaleDateString('vi-VN') : '',
                                advanceAmount: req.advance?.amount || req.actual_advance_amount || 0,
                                actualExpense: req.settlement?.actualExpense || req.actual_expense || null,
                            settlementStatus: finalSettlementStatus,
                            settlementNotes: req.settlement?.notes || req.settlement_notes || null,
                            returnNotes: req.return_notes || null,
                            paymentConfirmed: hasPaymentConfirmed,
                            livingAllowance: req.livingAllowance || null,
                            rawData: req // Store raw data for detail view
                            };
                        });
                    allRequests.push(...travelRequests);
                }
            } catch (error) {
                console.error('Error fetching travel expense requests:', error);
            }

            // Fetch customer entertainment expense requests
            try {
                const customerEntertainmentResponse = await customerEntertainmentExpensesAPI.getAll({
                    employeeId: currentUserId
                });
                if (customerEntertainmentResponse.data && customerEntertainmentResponse.data.success) {
                    const customerEntertainmentRequests = (customerEntertainmentResponse.data.data || [])
                        .filter(req => {
                            // Chỉ hiển thị các phiếu đã được duyệt hoặc bị trả về
                            return req.status === 'APPROVED_BRANCH_DIRECTOR' || 
                                   req.status === 'ACCOUNTANT_PROCESSED' || 
                                   req.status === 'RETURNED' ||
                                   req.status === 'PAID';
                        })
                        .map(req => {
                            const startDate = req.start_date ? new Date(req.start_date) : null;
                            const endDate = req.end_date ? new Date(req.end_date) : null;
                            const employee = employeesMap.get(req.employee_id);
                            const createdDate = req.created_at ? new Date(req.created_at) : null;

                            // Calculate total amount from expense items if available
                            // Parse amount từ database (có thể là NUMERIC(12,2) nên cần parse đúng)
                            let totalAmount = 0;
                            if (req.total_amount) {
                                // Nếu có total_amount từ database, sử dụng nó (đã được tính sẵn)
                                totalAmount = typeof req.total_amount === 'string' 
                                    ? parseFloat(req.total_amount.replace(/[^\d.-]/g, '')) || 0
                                    : parseFloat(req.total_amount) || 0;
                            } else if (req.expenseItems && req.expenseItems.length > 0) {
                                // Nếu không có total_amount, tính từ expenseItems
                                totalAmount = req.expenseItems.reduce((sum, item) => {
                                    // Parse amount từ database (có thể là NUMERIC(12,2))
                                    const itemAmount = typeof item.amount === 'string'
                                        ? parseFloat(item.amount.replace(/[^\d.-]/g, '')) || 0
                                        : parseFloat(item.amount) || 0;
                                    return sum + itemAmount;
                                }, 0);
                            }

                            // Map status to display status
                            const displayStatus = getCustomerEntertainmentStatus(req.status);

                            return {
                                id: req.id,
                                requestType: 'customer-entertainment',
                                code: req.request_number || `PHIEU-${String(req.id).padStart(3, '0')}`,
                                employeeName: req.requester_name || employee?.ho_ten || 'N/A',
                                department: req.requester_department || employee?.phong_ban || 'N/A',
                                location: req.branch || '',
                                locationFull: req.branch || '',
                                purpose: `Kinh phí tiếp khách${req.expenseItems && req.expenseItems.length > 0 ? ` (${req.expenseItems.length} phiếu)` : ''}`,
                                companyName: null,
                                companyAddress: null,
                                startDate: startDate ? startDate.toLocaleDateString('vi-VN') : '',
                                endDate: endDate ? endDate.toLocaleDateString('vi-VN') : '',
                                startDateRaw: startDate,
                                endDateRaw: endDate,
                                createdDate: createdDate ? createdDate.toLocaleDateString('vi-VN') : '',
                                advanceAmount: parseFloat(req.advance_amount) || 0,
                                actualExpense: totalAmount > 0 ? totalAmount : null,
                                settlementStatus: displayStatus,
                                settlementNotes: null,
                                returnNotes: req.return_notes || null,
                                paymentConfirmed: req.status === 'PAID',
                                livingAllowance: null,
                                rawData: req // Store raw data for detail view
                            };
                        });
                    allRequests.push(...customerEntertainmentRequests);
                }
            } catch (error) {
                console.error('Error fetching customer entertainment expense requests:', error);
            }

            // Sort by created date (newest first)
            allRequests.sort((a, b) => {
                const dateA = a.rawData?.created_at ? new Date(a.rawData.created_at) : new Date(0);
                const dateB = b.rawData?.created_at ? new Date(b.rawData.created_at) : new Date(0);
                return dateB - dateA;
            });

            setRequests(allRequests);
        } catch (error) {
            console.error('Error fetching requests:', error);
            showToast?.('Lỗi khi tải danh sách yêu cầu', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Fetch requests that are ready for settlement
    useEffect(() => {
        if (currentUser) {
            fetchRequests();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, showToast]);

    const selectedRequest = requests.find(req => req.id === selectedRequestId) || null;

    // Fetch attachments when request is selected
    useEffect(() => {
        const fetchAttachments = async () => {
            if (!selectedRequestId || !selectedRequest) {
                setAttachments([]);
                return;
            }

            try {
                // Only fetch attachments for travel expenses
                if (selectedRequest.requestType === 'travel') {
                    const response = await travelExpensesAPI.getAttachments(selectedRequestId);
                    if (response.data && response.data.success) {
                        setAttachments(response.data.data || []);
                    }
                } else if (selectedRequest.requestType === 'customer-entertainment') {
                    // For customer entertainment, get files from expense items
                    const files = [];
                    if (selectedRequest.rawData?.expenseItems) {
                        selectedRequest.rawData.expenseItems.forEach(item => {
                            if (item.files && item.files.length > 0) {
                                files.push(...item.files);
                            }
                        });
                    }
                    setAttachments(files);
                } else {
                    setAttachments([]);
                }
            } catch (error) {
                console.error('Error fetching attachments:', error);
                setAttachments([]);
            }
        };

        fetchAttachments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRequestId]);

    // Reset form when selecting a request
    useEffect(() => {
        if (selectedRequest) {
            // Nếu phiếu bị trả (RETURNED), lấy giá trị ban đầu để chỉnh sửa
            const isReturned = selectedRequest.settlementStatus === 'RETURNED';
            // Đối với customer entertainment, luôn lấy giá trị để chỉnh sửa khi RETURNED
            if (selectedRequest.requestType === 'customer-entertainment' && isReturned) {
                // Lấy giá trị từ rawData (database) hoặc từ mapped data
                const rawAdvanceAmount = selectedRequest.rawData?.advance_amount || selectedRequest.advanceAmount || 0;
                const rawTotalAmount = selectedRequest.rawData?.total_amount || selectedRequest.actualExpense || 0;
                setFormData({
                    actualExpense: rawTotalAmount > 0 ? formatCurrency(rawTotalAmount.toString()) : '',
                    advanceAmount: rawAdvanceAmount > 0 ? formatCurrency(rawAdvanceAmount.toString()) : '',
                    notes: ''
                });
            } else {
                setFormData({
                    actualExpense: selectedRequest.actualExpense ? formatCurrency(selectedRequest.actualExpense.toString()) : '',
                    advanceAmount: isReturned && selectedRequest.advanceAmount ? formatCurrency(selectedRequest.advanceAmount.toString()) : '',
                    notes: selectedRequest.settlementNotes || ''
                });
            }
            setSelectedFiles([]); // Reset selected files when changing request
        } else {
            setFormData({
                actualExpense: '',
                advanceAmount: '',
                notes: ''
            });
            setSelectedFiles([]);
        }
    }, [selectedRequestId]);

    // Filter requests
    const filteredRequests = requests.filter(request => {
        const matchesSearch =
            request.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            request.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
            request.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            request.purpose.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesStatus = false;
        if (statusFilter === 'ALL') {
            matchesStatus = true;
        } else if (statusFilter === 'PENDING') {
            matchesStatus = request.settlementStatus === 'PENDING' || 
                          request.settlementStatus === 'PENDING_BRANCH_DIRECTOR' ||
                          request.settlementStatus === 'PENDING_MANAGER' ||
                          request.settlementStatus === 'PENDING_CEO';
        } else if (statusFilter === 'SUBMITTED') {
            matchesStatus = request.settlementStatus === 'SUBMITTED' || 
                          request.settlementStatus === 'ACCOUNTANT_PROCESSED';
        } else if (statusFilter === 'HR_CONFIRMED') {
            matchesStatus = request.settlementStatus === 'HR_CONFIRMED';
        } else if (statusFilter === 'ACCOUNTANT_DONE') {
            matchesStatus = request.settlementStatus === 'ACCOUNTANT_DONE' || 
                          request.settlementStatus === 'PAID';
        } else if (statusFilter === 'REJECTED') {
            matchesStatus = request.settlementStatus === 'REJECTED';
        } else if (statusFilter === 'RETURNED') {
            matchesStatus = request.settlementStatus === 'RETURNED';
        }

        return matchesSearch && matchesStatus;
    });

    // Handle form submit (for travel expenses and customer entertainment expenses when RETURNED)
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedRequest) return;
        if (isSubmitting) return;

        const isReturned = selectedRequest.settlementStatus === 'RETURNED';
        const isCustomerEntertainment = selectedRequest.requestType === 'customer-entertainment';

        // Parse currency values (remove commas and dots)
        // Đối với customer entertainment expenses khi RETURNED, có thể chỉ cần chỉnh sửa advanceAmount
        // Nên chỉ validate actualExpense nếu nó được nhập và không rỗng
        let actualExpenseNum = null;
        if (formData.actualExpense && formData.actualExpense.trim() !== '') {
            const actualExpenseStr = parseCurrency(formData.actualExpense);
            // Parse thành số nguyên (VND không có phần thập phân)
            // Đảm bảo chuỗi không rỗng trước khi parse
            if (!actualExpenseStr || actualExpenseStr === '') {
                showToast?.('Vui lòng nhập chi phí thực tế hợp lệ', 'error');
                return;
            }
            
            // Debug: Log để kiểm tra
            console.log('Parsing actualExpense:', {
                original: formData.actualExpense,
                cleaned: actualExpenseStr,
            });
            
            actualExpenseNum = parseInt(actualExpenseStr, 10);
            
            console.log('Parsed actualExpenseNum:', actualExpenseNum);
            
            if (isNaN(actualExpenseNum) || actualExpenseNum <= 0) {
                console.error('Invalid actualExpenseNum:', actualExpenseNum);
                showToast?.('Vui lòng nhập chi phí thực tế hợp lệ', 'error');
                return;
            }

            // Validate giá trị không vượt quá NUMERIC(12,2) - tối đa 9,999,999,999
            // NUMERIC(12,2) = 12 chữ số tổng cộng, 2 chữ số sau dấu phẩy = tối đa 9,999,999,999.99
            // VND không có phần thập phân nên giới hạn là 9,999,999,999
            console.log('Validating actualExpenseNum:', {
                value: actualExpenseNum,
                limit: 9999999999,
                exceeds: actualExpenseNum > 9999999999
            });
            
            if (actualExpenseNum > 9999999999) {
                console.error('Actual expense validation failed:', {
                    original: formData.actualExpense,
                    parsed: actualExpenseStr,
                    number: actualExpenseNum,
                    limit: 9999999999
                });
                showToast?.('Chi phí thực tế quá lớn (tối đa 9.999.999.999 VND)', 'error');
                return;
            }
        } else if (!isCustomerEntertainment || !isReturned) {
            // Đối với travel expenses hoặc khi không phải RETURNED, actualExpense là bắt buộc
            showToast?.('Vui lòng nhập chi phí thực tế hợp lệ', 'error');
            return;
        }

        // Nếu phiếu bị trả, validate advanceAmount (cho phép 0 nếu chưa ứng)
        if (isReturned) {
            const advanceAmountStr = parseCurrency(formData.advanceAmount || '0');
            // Parse thành số nguyên (VND không có phần thập phân)
            const advanceAmountNum = parseInt(advanceAmountStr, 10);
            if (isNaN(advanceAmountNum) || advanceAmountNum < 0) {
                showToast?.('Kinh phí đã ứng không hợp lệ', 'error');
                return;
            }
            if (advanceAmountNum > 9999999999) {
                showToast?.('Kinh phí đã ứng quá lớn (tối đa 9.999.999.999 VND)', 'error');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            // Xử lý customer entertainment expenses khi RETURNED
            if (isCustomerEntertainment && isReturned) {
                const advanceAmountStr = parseCurrency(formData.advanceAmount || '0');
                const advanceAmountNum = parseInt(advanceAmountStr, 10);
                if (isNaN(advanceAmountNum) || advanceAmountNum < 0) {
                    showToast?.('Kinh phí đã ứng không hợp lệ', 'error');
                    return;
                }
                // Nếu actualExpense không được nhập, sử dụng giá trị hiện tại từ selectedRequest
                const totalAmountToSubmit = actualExpenseNum !== null 
                    ? actualExpenseNum 
                    : (selectedRequest.actualExpense || selectedRequest.rawData?.total_amount || null);
                
                const response = await customerEntertainmentExpensesAPI.resubmit(selectedRequest.id, {
                    advanceAmount: advanceAmountNum,
                    totalAmount: totalAmountToSubmit
                });
                if (response.data && response.data.success) {
                    showToast?.('Đã gửi lại phiếu thành công', 'success');
                    await fetchRequests();
                    setSelectedRequestId(null);
                }
                return;
            }

            // Xử lý travel expenses
            if (selectedRequest.requestType !== 'travel') {
                showToast?.('Chỉ có thể gửi báo cáo hoàn ứng cho đơn công tác', 'error');
                return;
            }

            // Đối với travel expenses, actualExpense là bắt buộc
            if (actualExpenseNum === null) {
                showToast?.('Vui lòng nhập chi phí thực tế hợp lệ', 'error');
                return;
            }

            const submitData = {
                actualExpense: actualExpenseNum,
                notes: formData.notes || null,
                attachments: selectedFiles
            };
            
            // Nếu phiếu bị trả, gửi cả advanceAmount để cập nhật (có thể là 0)
            if (isReturned) {
                const advanceAmountStr = parseCurrency(formData.advanceAmount || '0');
                submitData.advanceAmount = parseInt(advanceAmountStr, 10);
            }

            const response = await travelExpensesAPI.submitSettlement(selectedRequest.id, submitData);

            if (response.data && response.data.success) {
                showToast?.('Báo cáo hoàn ứng đã được gửi thành công', 'success');

                // Reset form
                setFormData({
                    actualExpense: '',
                    advanceAmount: '',
                    notes: ''
                });
                setAttachments([]);
                setSelectedFiles([]);
                setSelectedRequestId(null);

                // Refresh requests list
                await fetchRequests();
            }
        } catch (error) {
            console.error('Error submitting settlement:', error);
            showToast?.('Lỗi khi gửi báo cáo hoàn ứng: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format currency input - format với dấu chấm ngăn cách hàng nghìn (VND)
    const formatCurrency = (value) => {
        // Remove all non-digit characters
        const numericValue = value.replace(/\D/g, '');
        // Format with thousand separators (dấu chấm cho VND)
        if (numericValue === '') return '';
        return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    // Parse currency value (remove commas and dots) for submission
    const parseCurrency = (value) => {
        if (!value || value === '') return '';
        // Loại bỏ tất cả dấu phẩy, dấu chấm, khoảng trắng và các ký tự không phải số
        // Chỉ giữ lại các chữ số 0-9
        const cleaned = value.toString().replace(/[^\d]/g, '');
        // Trả về chuỗi rỗng nếu không còn số nào
        return cleaned === '' ? '' : cleaned;
    };

    // Format VND for display (không có phần thập phân, dấu chấm ngăn cách hàng nghìn)
    const formatVND = (value) => {
        if (!value && value !== 0) return '0';
        // Convert to number if string - loại bỏ tất cả dấu chấm/phẩy trước khi parse
        let numValue;
        if (typeof value === 'string') {
            // Loại bỏ tất cả dấu chấm, phẩy và các ký tự không phải số
            const cleaned = value.replace(/[^\d]/g, '');
            numValue = cleaned === '' ? 0 : parseInt(cleaned, 10);
        } else {
            numValue = value;
        }
        if (isNaN(numValue)) return '0';
        // Round to integer (VND không có phần thập phân)
        const intValue = Math.round(numValue);
        // Format với dấu chấm ngăn cách hàng nghìn
        return intValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const handleActualExpenseChange = (e) => {
        const formatted = formatCurrency(e.target.value);
        setFormData(prev => ({ ...prev, actualExpense: formatted }));
    };

    const handleAdvanceAmountChange = (e) => {
        const formatted = formatCurrency(e.target.value);
        setFormData(prev => ({ ...prev, advanceAmount: formatted }));
    };

    // Get status tag color and text
    const getStatusTagClass = (status) => {
        switch (status) {
            case 'SUBMITTED':
            case 'ACCOUNTANT_PROCESSED':
                return 'status-submitted'; // Chờ HR/Kế Toán Xác nhận
            case 'HR_CONFIRMED':
                return 'status-hr-confirmed'; // Chờ Kế Toán Duyệt
            case 'ACCOUNTANT_DONE':
            case 'PAID':
                return 'status-accountant-done'; // Đã Hoàn Tất Quyết Toán
            case 'REJECTED':
                return 'status-rejected'; // Từ Chối
            case 'RETURNED':
                return 'status-returned'; // Đã trả về để chỉnh sửa
            case 'APPROVED_BRANCH_DIRECTOR':
                return 'status-approved-branch-director'; // Đã duyệt giám đốc chi nhánh
            case 'PENDING':
            case 'PENDING_BRANCH_DIRECTOR':
            case 'PENDING_MANAGER':
            case 'PENDING_CEO':
                return 'status-pending'; // Chờ gửi/duyệt
            default:
                return 'status-pending';
        }
    };

    const getStatusTagText = (status) => {
        switch (status) {
            case 'SUBMITTED':
                return 'Chờ HR xác nhận';
            case 'HR_CONFIRMED':
                return 'Chờ kế toán duyệt';
            case 'ACCOUNTANT_DONE':
            case 'PAID':
                return 'Đã hoàn tất quyết toán';
            case 'REJECTED':
                return 'Từ chối';
            case 'RETURNED':
                return 'Đã trả về để chỉnh sửa';
            case 'APPROVED_BRANCH_DIRECTOR':
                return 'Đã duyệt giám đốc chi nhánh';
            case 'PENDING':
                return 'Chờ gửi';
            case 'PENDING_BRANCH_DIRECTOR':
                return 'Chờ giám đốc chi nhánh';
            case 'PENDING_MANAGER':
                return 'Chờ quản lý';
            case 'PENDING_CEO':
                return 'Chờ tổng giám đốc';
            case 'ACCOUNTANT_PROCESSED':
                return 'Chờ kế toán duyệt';
            default:
                return status || 'Chờ gửi';
        }
    };

    // Calculate result
    const calculateResult = () => {
        if (!selectedRequest || !formData.actualExpense) return null;

        const advance = selectedRequest.advanceAmount || 0;
        // Parse actual expense - loại bỏ dấu chấm/phẩy format trước khi parse
        const actualExpenseStr = parseCurrency(formData.actualExpense);
        const actual = parseInt(actualExpenseStr, 10) || 0;
        const difference = advance - actual;

        return {
            advance,
            actual,
            difference,
            needsRefund: difference > 0,
            needsSupplement: difference < 0
        };
    };

    const result = calculateResult();

    return (
        <div className="travel-expense-settlement">
            {/* Header */}
            <div className="travel-expense-settlement-header">
                <div className="travel-expense-settlement-header-content">
                    <div className="travel-expense-settlement-icon-wrapper">
                        <svg
                            className="travel-expense-settlement-icon"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    </div>
                    <div>
                        <h1 className="travel-expense-settlement-title">Báo cáo Hoàn ứng</h1>
                        <p className="travel-expense-settlement-subtitle">
                            Danh sách các đơn kinh phí tiếp khách và kinh phí công tác kèm trạng thái
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Container - Master-Detail View */}
            <div className="travel-expense-settlement-main-container">
                <div className="travel-expense-settlement-main-layout">
                    {/* Cột 1: Master - Danh Sách Yêu Cầu (33%) */}
                    <div className="travel-expense-settlement-list-column">
                        <div className="travel-expense-settlement-list-container">
                            <h2 className="travel-expense-settlement-list-title">
                                YÊU CẦU CHỜ DUYỆT
                            </h2>

                            {/* Thanh Công Cụ: Filter + Search */}
                            <div className="travel-expense-settlement-toolbar">
                                <select
                                    className="travel-expense-settlement-status-filter"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="ALL">-- Tất cả trạng thái --</option>
                                    <option value="PENDING">Chờ gửi</option>
                                    <option value="SUBMITTED">Chờ HR xác nhận</option>
                                    <option value="HR_CONFIRMED">Chờ kế toán duyệt</option>
                                    <option value="ACCOUNTANT_DONE">Đã hoàn tất</option>
                                    <option value="RETURNED">Đã trả về để chỉnh sửa</option>
                                    <option value="REJECTED">Từ chối</option>
                                </select>
                                <div className="travel-expense-settlement-search-wrapper">
                                    <svg className="travel-expense-settlement-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        className="travel-expense-settlement-search-input"
                                        placeholder="Tìm theo Mã YC, Tên NV..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Request List */}
                            <div className="travel-expense-settlement-list-items">
                                {loading ? (
                                    <div className="travel-expense-settlement-loading">Đang tải...</div>
                                ) : filteredRequests.length === 0 ? (
                                    <div className="travel-expense-settlement-empty">Không có yêu cầu</div>
                                ) : (
                                    filteredRequests.map((request) => (
                                        <div
                                            key={request.id}
                                            className={`travel-expense-settlement-list-item ${selectedRequestId === request.id ? 'active' : ''}`}
                                            onClick={() => setSelectedRequestId(request.id)}
                                        >
                                            <div className="travel-expense-settlement-item-left">
                                                <div className="travel-expense-settlement-request-code">
                                                    {request.code}
                                                    <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#6b7280' }}>
                                                        ({request.requestType === 'travel' ? 'Công tác' : 'Tiếp khách'})
                                                    </span>
                                                </div>
                                                <div className="travel-expense-settlement-employee-name">
                                                    {request.employeeName} ({request.department})
                                                </div>
                                                <div className="travel-expense-settlement-purpose">
                                                    {request.purpose}
                                                </div>
                                                {request.actualExpense && (
                                                    <div className="travel-expense-settlement-actual-expense">
                                                        Chi: {formatVND(request.actualExpense)} VND
                                                    </div>
                                                )}
                                            </div>
                                            <div className="travel-expense-settlement-item-right">
                                                <span className={`travel-expense-settlement-status-tag ${getStatusTagClass(request.settlementStatus)}`}>
                                                    {getStatusTagText(request.settlementStatus)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Cột 2: Detail - Form Báo Cáo Quyết Toán (66%) */}
                    <div className="travel-expense-settlement-detail-column">
                        <div className="travel-expense-settlement-detail-container">
                            {selectedRequest ? (
                                <form onSubmit={handleSubmit} className="travel-expense-settlement-form">
                                    {/* Header của Báo cáo */}
                                    <div className="travel-expense-settlement-report-header">
                                        <div className="travel-expense-settlement-report-header-left">
                                            <h2 className="travel-expense-settlement-report-title">
                                                <span className="travel-expense-settlement-report-title-text">BÁO CÁO QUYẾT TOÁN</span>{' '}
                                                <span className="travel-expense-settlement-report-title-code">{selectedRequest.code}</span>
                                            </h2>
                                            <div className="travel-expense-settlement-report-date">
                                                Ngày tạo: {selectedRequest.createdDate}
                                            </div>
                                        </div>
                                        <div className="travel-expense-settlement-report-header-right">
                                            <span className={`travel-expense-settlement-status-badge ${getStatusTagClass(selectedRequest.settlementStatus)}`}>
                                                {getStatusTagText(selectedRequest.settlementStatus)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Section I: Thông tin Công tác và Tóm tắt Ngân sách */}
                                    <div className="travel-expense-settlement-section travel-expense-settlement-section-summary">
                                        <h3 className="travel-expense-settlement-section-title">
                                            I. THÔNG TIN CÔNG TÁC VÀ TÓM TẮT NGÂN SÁCH
                                        </h3>
                                        <div className="travel-expense-settlement-section-content travel-expense-settlement-section-summary-content">
                                            <div className="travel-expense-settlement-info-grid">
                                                <div className="travel-expense-settlement-info-item">
                                                    <span className="travel-expense-settlement-info-label">Nhân viên:</span>
                                                    <span className="travel-expense-settlement-info-value">{selectedRequest.employeeName}</span>
                                                </div>
                                                <div className="travel-expense-settlement-info-item">
                                                    <span className="travel-expense-settlement-info-label">Địa điểm:</span>
                                                    <span className="travel-expense-settlement-info-value">{selectedRequest.locationFull || selectedRequest.location}</span>
                                                </div>
                                                {selectedRequest.companyName && (
                                                    <div className="travel-expense-settlement-info-item">
                                                        <span className="travel-expense-settlement-info-label">Công ty/Đối tác:</span>
                                                        <span className="travel-expense-settlement-info-value">{selectedRequest.companyName}</span>
                                                    </div>
                                                )}
                                                {selectedRequest.companyAddress && (
                                                    <div className="travel-expense-settlement-info-item">
                                                        <span className="travel-expense-settlement-info-label">Địa chỉ công ty:</span>
                                                        <span className="travel-expense-settlement-info-value">{selectedRequest.companyAddress}</span>
                                                    </div>
                                                )}
                                                <div className="travel-expense-settlement-info-item-full">
                                                    <span className="travel-expense-settlement-info-label">Mục Đích Công Tác:</span>
                                                    <span className="travel-expense-settlement-info-value">{selectedRequest.purpose}</span>
                                                </div>
                                                <div className="travel-expense-settlement-info-item">
                                                    <span className="travel-expense-settlement-info-label">Từ Ngày:</span>
                                                    <span className="travel-expense-settlement-info-value">{selectedRequest.startDate}</span>
                                                </div>
                                                <div className="travel-expense-settlement-info-item">
                                                    <span className="travel-expense-settlement-info-label">Đến Ngày:</span>
                                                    <span className="travel-expense-settlement-info-value">{selectedRequest.endDate}</span>
                                                </div>
                                                {selectedRequest.livingAllowance && (
                                                    <div className="travel-expense-settlement-info-item">
                                                        <span className="travel-expense-settlement-info-label">Phụ cấp/Phí sinh hoạt:</span>
                                                        <span className="travel-expense-settlement-info-value">
                                                            {selectedRequest.livingAllowance.currency === 'VND'
                                                                ? formatVND(selectedRequest.livingAllowance.amount)
                                                                : selectedRequest.livingAllowance.amount} {selectedRequest.livingAllowance.currency}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="travel-expense-settlement-advance-amount-large">
                                                <span className="travel-expense-settlement-advance-label">Số Tiền Tạm Ứng Ban Đầu:</span>
                                                <span className="travel-expense-settlement-advance-value">
                                                    {formatVND(selectedRequest.advanceAmount)} VND
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Return Notes Alert - Hiển thị khi phiếu bị trả (chỉ 1 lần, dưới Section I) */}
                                    {selectedRequest.settlementStatus === 'RETURNED' && selectedRequest.returnNotes && (
                                        <div className="travel-expense-settlement-return-alert">
                                            <div className="travel-expense-settlement-return-alert-icon">
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </div>
                                            <div className="travel-expense-settlement-return-alert-content">
                                                <div className="travel-expense-settlement-return-alert-title">
                                                    Phiếu đã bị trả về để chỉnh sửa
                                                </div>
                                                <div className="travel-expense-settlement-return-alert-label">
                                                    Lý do trả phiếu từ kế toán:
                                                </div>
                                                <div className="travel-expense-settlement-return-alert-note">
                                                    {selectedRequest.returnNotes}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Section II: Chi tiết Chi phí Thực tế và Chứng từ */}
                                    <div className="travel-expense-settlement-section">
                                        <h3 className="travel-expense-settlement-section-title">
                                            II. CHI TIẾT CHI PHÍ THỰC TẾ VÀ CHỨNG TỪ
                                        </h3>
                                        <div className="travel-expense-settlement-section-content">
                                            {/* Input để chỉnh sửa kinh phí đã ứng khi phiếu bị trả (cho cả travel và customer entertainment) */}
                                            {selectedRequest.settlementStatus === 'RETURNED' && (
                                                <div className="travel-expense-settlement-form-group">
                                                    <label htmlFor="advanceAmount" className="travel-expense-settlement-form-label">
                                                        0. Kinh Phí Đã Ứng (VND) <span className="required">*</span>
                                                    </label>
                                                    <div className="travel-expense-settlement-currency-input-wrapper">
                                                        <input
                                                            type="text"
                                                            id="advanceAmount"
                                                            className="travel-expense-settlement-currency-input"
                                                            placeholder="Nhập kinh phí đã ứng (có thể nhập 0 nếu chưa ứng)"
                                                            value={formData.advanceAmount}
                                                            onChange={handleAdvanceAmountChange}
                                                            required
                                                        />
                                                        <span className="travel-expense-settlement-currency-unit">VND</span>
                                                    </div>
                                                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                                        Giá trị ban đầu: {formatVND(selectedRequest.rawData?.advance_amount || selectedRequest.advanceAmount || 0)} VND
                                                    </div>
                                                </div>
                                            )}

                                            <div className="travel-expense-settlement-form-group">
                                                <label htmlFor="actualExpense" className="travel-expense-settlement-form-label">
                                                    1. Tổng Chi Phí Thực Tế Đã Chi (VND) <span className="required">*</span>
                                                </label>
                                                {/* Cho phép chỉnh sửa nếu phiếu bị trả */}
                                                {selectedRequest.settlementStatus === 'RETURNED' ? (
                                                    <div className="travel-expense-settlement-currency-input-wrapper">
                                                        <input
                                                            type="text"
                                                            id="actualExpense"
                                                            className="travel-expense-settlement-currency-input"
                                                            placeholder="Nhập tổng chi phí thực tế đã chi"
                                                            value={formData.actualExpense}
                                                            onChange={handleActualExpenseChange}
                                                            required
                                                        />
                                                        <span className="travel-expense-settlement-currency-unit">VND</span>
                                                    </div>
                                                ) : selectedRequest.actualExpense ? (
                                                    <div className="travel-expense-settlement-actual-expense-display">
                                                        {formatVND(selectedRequest.actualExpense)} VND
                                                    </div>
                                                ) : (
                                                    <div className="travel-expense-settlement-currency-input-wrapper">
                                                        <input
                                                            type="text"
                                                            id="actualExpense"
                                                            className="travel-expense-settlement-currency-input"
                                                            placeholder="Nhập tổng chi phí thực tế đã chi"
                                                            value={formData.actualExpense}
                                                            onChange={handleActualExpenseChange}
                                                            required
                                                        />
                                                        <span className="travel-expense-settlement-currency-unit">VND</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="travel-expense-settlement-form-group">
                                                <label htmlFor="notes" className="travel-expense-settlement-form-label">
                                                    2. Ghi Chú Chi Tiết Khoản Chi
                                                </label>
                                                {/* Cho phép chỉnh sửa nếu phiếu bị trả */}
                                                {selectedRequest.settlementStatus === 'RETURNED' ? (
                                                    <textarea
                                                        id="notes"
                                                        className="travel-expense-settlement-form-textarea"
                                                        placeholder="Mô tả chi tiết các khoản chi phí thực tế..."
                                                        value={formData.notes}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                                        rows={5}
                                                    />
                                                ) : selectedRequest.settlementNotes ? (
                                                    <div className="travel-expense-settlement-notes-display">
                                                        {selectedRequest.settlementNotes}
                                                    </div>
                                                ) : (
                                                    <textarea
                                                        id="notes"
                                                        className="travel-expense-settlement-form-textarea"
                                                        placeholder="Mô tả chi tiết các khoản chi phí thực tế..."
                                                        value={formData.notes}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                                        rows={5}
                                                        required
                                                    />
                                                )}
                                            </div>
                                            {/* Attachments Section */}
                                            <div className="travel-expense-settlement-form-group">
                                                <label className="travel-expense-settlement-form-label">
                                                    3. Đính Kèm Chứng Từ (PDF, JPG, PNG, ZIP)
                                                </label>
                                                {/* Cho phép upload lại nếu phiếu bị trả hoặc chưa submit */}
                                                {(selectedRequest.settlementStatus === 'RETURNED' || !selectedRequest.actualExpense) && (
                                                    // If not submitted yet or returned, show file upload
                                                    <div>
                                                        {/* Hiển thị attachments cũ nếu phiếu bị trả */}
                                                        {selectedRequest.settlementStatus === 'RETURNED' && attachments.length > 0 && (
                                                            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem' }}>
                                                                <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                                                                    File đã đính kèm trước đó ({attachments.length} file):
                                                                </div>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                                    {attachments.map((att, idx) => {
                                                                        const fileName = att.fileName || att.file_name || 'Unknown';
                                                                        const filePath = att.filePath || att.file_path || '';
                                                                        const fileNameOnly = filePath ? filePath.split(/[/\\]/).pop() : fileName;
                                                                        return (
                                                                            <a
                                                                                key={idx}
                                                                                href={`${process.env.REACT_APP_API_URL || ''}/uploads/travel-expenses/${fileNameOnly}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                style={{
                                                                                    display: 'inline-flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.25rem',
                                                                                    padding: '0.25rem 0.5rem',
                                                                                    backgroundColor: '#fff',
                                                                                    border: '1px solid #d1d5db',
                                                                                    borderRadius: '0.25rem',
                                                                                    fontSize: '0.875rem',
                                                                                    color: '#374151',
                                                                                    textDecoration: 'none'
                                                                                }}
                                                                            >
                                                                                <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                                </svg>
                                                                                {fileName}
                                                                            </a>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                                                                    Bạn có thể upload thêm file mới hoặc thay thế file cũ
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* File upload input */}
                                                        <input
                                                            type="file"
                                                            id="fileUpload"
                                                            multiple
                                                            accept=".pdf,.jpg,.jpeg,.png,.zip"
                                                            onChange={(e) => {
                                                                const files = Array.from(e.target.files || []);
                                                                setSelectedFiles(files);
                                                            }}
                                                            className="travel-expense-settlement-file-input"
                                                            style={{
                                                                width: '100%',
                                                                padding: '0.75rem',
                                                                border: '1px solid #d1d5db',
                                                                borderRadius: '0.5rem',
                                                                fontSize: '0.875rem',
                                                                cursor: 'pointer'
                                                            }}
                                                        />
                                                        {selectedFiles.length > 0 && (
                                                            <div style={{ marginTop: '0.5rem' }}>
                                                                <div className="travel-expense-settlement-attachments-info">
                                                                    Đã chọn {selectedFiles.length} file(s):
                                                                </div>
                                                                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#4b5563' }}>
                                                                    {selectedFiles.map((file, index) => (
                                                                        <li key={index}>{file.name}</li>
                                                                    ))}
                                                                </ul>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedFiles([]);
                                                                        document.getElementById('fileUpload').value = '';
                                                                    }}
                                                                    style={{
                                                                        marginTop: '0.5rem',
                                                                        padding: '0.5rem 1rem',
                                                                        backgroundColor: '#ef4444',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        borderRadius: '0.375rem',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.875rem'
                                                                    }}
                                                                >
                                                                    Xóa tất cả
                                                                </button>
                                                            </div>
                                                        )}
                                                        <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                                                            Chấp nhận các file: PDF, JPG, JPEG, PNG, ZIP (tối đa 10MB mỗi file)
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Hiển thị attachments nếu đã submit và không phải RETURNED */}
                                                {selectedRequest.settlementStatus !== 'RETURNED' && selectedRequest.actualExpense && (
                                                    <div className="travel-expense-settlement-attachments-box">
                                                        {attachments.length > 0 ? (
                                                            <>
                                                                <div className="travel-expense-settlement-attachments-info">
                                                                    Chứng từ đính kèm: {attachments.length} files đã được HR xác nhận.
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    className="travel-expense-settlement-attachments-link"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        // TODO: Show attachment list modal
                                                                    }}
                                                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', color: 'inherit' }}
                                                                >
                                                                    Xem danh sách files
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div className="travel-expense-settlement-attachments-info">
                                                                Chưa có chứng từ đính kèm.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section III: Tổng kết và Quy trình Xác nhận */}
                                    {result && (
                                        <div className="travel-expense-settlement-section travel-expense-settlement-section-summary">
                                            <h3 className="travel-expense-settlement-section-title">
                                                III. TỔNG KẾT VÀ QUY TRÌNH XÁC NHẬN
                                            </h3>
                                            <div className="travel-expense-settlement-section-content travel-expense-settlement-section-summary-content">
                                                <div className="travel-expense-settlement-calculation">
                                                    <div className="travel-expense-settlement-calculation-title">
                                                        TÍNH TOÁN KẾT QUẢ
                                                    </div>
                                                    <div className="travel-expense-settlement-calculation-row">
                                                        <span className="travel-expense-settlement-calculation-label">Tổng số tiền Tạm ứng:</span>
                                                        <span className="travel-expense-settlement-calculation-value advance">
                                                            {formatVND(result.advance)} VND
                                                        </span>
                                                    </div>
                                                    <div className="travel-expense-settlement-calculation-row">
                                                        <span className="travel-expense-settlement-calculation-label">Tổng chi phí Thực tế đã chi:</span>
                                                        <span className="travel-expense-settlement-calculation-value actual">
                                                            {formatVND(result.actual)} VND
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="travel-expense-settlement-result">
                                                    <div className="travel-expense-settlement-result-title">KẾT QUẢ:</div>
                                                    <div className={`travel-expense-settlement-result-amount ${result.needsRefund ? 'refund' : result.needsSupplement ? 'supplement' : 'balanced'}`}>
                                                        {formatVND(Math.abs(result.difference))} VND
                                                    </div>
                                                    <div className="travel-expense-settlement-result-description">
                                                        {result.needsRefund
                                                            ? 'Số tiền CẦN HOÀN TRẢ lại công ty.'
                                                            : result.needsSupplement
                                                                ? 'Số tiền CÔNG TY CẦN BỔ SUNG.'
                                                                : 'Số tiền khớp với tạm ứng.'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Nút gửi lại (chỉ hiện khi cần) */}
                                    {((selectedRequest.requestType === 'travel' && (selectedRequest.settlementStatus === 'PENDING' || selectedRequest.settlementStatus === 'RETURNED'))
                                        || (selectedRequest.requestType === 'customer-entertainment' && selectedRequest.settlementStatus === 'RETURNED')) && (
                                        <div className="travel-expense-settlement-actions" style={{ marginTop: '1.5rem' }}>
                                            <button
                                                type="submit"
                                                className="travel-expense-settlement-submit-btn"
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting 
                                                    ? 'Đang gửi...' 
                                                    : selectedRequest.settlementStatus === 'RETURNED' 
                                                        ? 'Gửi lại' 
                                                        : 'Gửi Báo cáo Hoàn ứng'}
                                            </button>
                                        </div>
                                    )}

                                </form>
                            ) : (
                                <div className="travel-expense-settlement-empty-detail">
                                    Vui lòng chọn một yêu cầu từ danh sách để xem chi tiết
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TravelExpenseSettlement;
