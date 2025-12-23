import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/hr/api' : 'http://localhost:3000/api');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include user ID in headers
api.interceptors.request.use(
  (config) => {
    // Get user from localStorage
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        // Add user ID to headers if available
        if (userData?.id) {
          config.headers['user-id'] = userData.id;
        } else if (userData?.employeeId) {
          config.headers['user-id'] = userData.employeeId;
        } else if (userData?.employee_id) {
          config.headers['user-id'] = userData.employee_id;
        }
      }
    } catch (error) {
      // Ignore errors when parsing user data
      console.warn('Error parsing user data for headers:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to suppress 404 errors for employee lookups and handle connection errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't log 404 errors for employee lookups - these are expected when user ID doesn't match employee ID
    if (error.config?.url?.includes('/employees/') && error.response?.status === 404) {
      // Return a rejected promise but don't show console error
      // The calling code will handle it gracefully
      return Promise.reject(error);
    }

    // Log connection errors for debugging
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
      console.warn('⚠️ Backend server không khả dụng. Đảm bảo backend đang chạy tại http://localhost:3000');
    }

    // For other errors, let them propagate normally
    return Promise.reject(error);
  }
);

// Helper function to clean and validate ID
const cleanId = (id) => {
  if (typeof id === 'number') {
    if (isNaN(id) || id <= 0) {
      return null;
    }
    return id;
  }
  if (!id) {
    return null;
  }
  const str = String(id).trim();
  // Extract only numeric part (remove any non-numeric characters like colons, etc.)
  const numericMatch = str.match(/^\d+/);
  if (numericMatch) {
    return parseInt(numericMatch[0], 10);
  }
  return null;
};

// Employees API
export const employeesAPI = {
  getAll: () => api.get('/employees'),
  getById: (id) => {
    const cleanedId = cleanId(id);
    if (!cleanedId || isNaN(cleanedId)) {
      return Promise.reject(new Error(`Invalid employee ID: ${id}`));
    }
    return api.get(`/employees/${cleanedId}`);
  },
  create: (data) => api.post('/employees', data),
  update: (id, data) => {
    const cleanedId = cleanId(id);
    if (!cleanedId || isNaN(cleanedId)) {
      return Promise.reject(new Error(`Invalid employee ID: ${id}`));
    }
    return api.put(`/employees/${cleanedId}`, data);
  },
  delete: (id) => {
    const cleanedId = cleanId(id);
    if (!cleanedId || isNaN(cleanedId)) {
      return Promise.reject(new Error(`Invalid employee ID: ${id}`));
    }
    return api.delete(`/employees/${cleanedId}`);
  },
  bulkCreate: (employees) => api.post('/employees/bulk', { employees }),
  getDepartments: () => api.get('/employees/departments'),
  getBoPhan: () => api.get('/employees/bo-phan'),
  getJobTitles: () => api.get('/employees/job-titles'),
  getBranches: () => api.get('/employees/branches'),
  getContractTypes: () => api.get('/employees/contract-types'),
  getLocations: () => api.get('/employees/locations'),
  getTaxStatuses: () => api.get('/employees/tax-statuses'),
  getRanks: () => api.get('/employees/ranks'),
  getManagers: () => api.get('/employees/managers'),
  getIndirectManagers: () => api.get('/employees/indirect-managers'),
};

// Equipment API
export const equipmentAPI = {
  getByEmployeeId: (employeeId) => {
    const cleanedId = cleanId(employeeId);
    if (!cleanedId || isNaN(cleanedId)) {
      console.error('[equipmentAPI.getByEmployeeId] Invalid employee ID:', employeeId);
      return Promise.reject(new Error(`Invalid employee ID: ${employeeId}`));
    }
    return api.get(`/equipment?employee_id=${cleanedId}`);
  },
  create: (data) => api.post('/equipment', data),
};

// Statistics API
export const statisticsAPI = {
  getStatistics: () => api.get('/statistics'),
};

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
};

// Requests API
export const requestsAPI = {
  getAll: (params) => api.get('/requests', { params }),
  getById: (id) => api.get(`/requests/${id}`),
  create: (data) => api.post('/requests', data),
  update: (id, data) => api.put(`/requests/${id}`, data),
  delete: (id) => api.delete(`/requests/${id}`),
  getStats: (department) => api.get(`/requests/stats/${department}`),
  updateItem: (requestId, itemId, data) => api.put(`/requests/${requestId}/items/${itemId}`, data),
};

// Leave Requests API
export const leaveRequestsAPI = {
  create: (data) => api.post('/leave-requests', data),
  getAll: (params) => api.get('/leave-requests', { params }),
  decide: (id, data) => api.post(`/leave-requests/${id}/decision`, data),
  remove: (id, data) => api.delete(`/leave-requests/${id}`, { data }),
};

export const overtimeRequestsAPI = {
  create: (data) => api.post('/overtime-requests', data),
  getAll: (params) => api.get('/overtime-requests', { params }),
  update: (id, data) => api.put(`/overtime-requests/${id}`, data),
  decide: (id, data) => api.post(`/overtime-requests/${id}/decision`, data),
  escalate: (id, data) => api.post(`/overtime-requests/${id}/escalate`, data),
  processOverdue: () => api.post('/overtime-requests/overdue/process'),
  remove: (id, data) => api.delete(`/overtime-requests/${id}`, { data }),
};

export const attendanceAdjustmentsAPI = {
  create: (data) => api.post('/attendance-adjustments', data),
  getAll: (params) => api.get('/attendance-adjustments', { params }),
  decide: (id, data) => api.post(`/attendance-adjustments/${id}/decision`, data),
  escalate: (id, data) => api.post(`/attendance-adjustments/${id}/escalate`, data),
  processOverdue: () => api.post('/attendance-adjustments/overdue/process'),
  remove: (id, data) => api.delete(`/attendance-adjustments/${id}`, { data }),
};

// Candidates API
export const candidatesAPI = {
  getAll: (params) => api.get('/candidates', { params }),
  getById: (id) => api.get(`/candidates/${id}`),
  create: (data) => {
    const formData = new FormData();

    // Append all form fields (skip files, append later)
    Object.keys(data).forEach(key => {
      if (key === 'anhDaiDien' || key === 'cvDinhKem') {
        // skip here, handled below
        return;
      } else if (key === 'workExperiences' || key === 'trainingProcesses' || key === 'foreignLanguages') {
        // Convert arrays to JSON strings
        formData.append(key, JSON.stringify(data[key]));
      } else if (key === 'diaChiThuongTru' || key === 'diaChiLienLac') {
        // Convert address objects to JSON strings
        formData.append(key === 'diaChiThuongTru' ? 'diaChiTamTru' : 'diaChiLienLac', JSON.stringify(data[key]));
      } else {
        formData.append(key, data[key] || '');
      }
    });

    // Append files
    if (data.anhDaiDien) {
      formData.append('anhDaiDien', data.anhDaiDien);
    }
    if (data.cvDinhKem) {
      formData.append('cvDinhKem', data.cvDinhKem);
    }

    return api.post('/candidates', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  update: (id, data) => {
    const formData = new FormData();

    // Similar to create (skip files, append later)
    Object.keys(data).forEach(key => {
      if (key === 'anhDaiDien' || key === 'cvDinhKem') {
        // Skip files, will be appended separately
        return;
      } else if (key === 'workExperiences' || key === 'trainingProcesses' || key === 'foreignLanguages') {
        formData.append(key, JSON.stringify(data[key]));
      } else if (key === 'diaChiThuongTru' || key === 'diaChiLienLac') {
        formData.append(key === 'diaChiThuongTru' ? 'diaChiTamTru' : 'diaChiLienLac', JSON.stringify(data[key]));
      } else {
        formData.append(key, data[key] || '');
      }
    });

    // Append files only if they are File objects
    if (data.anhDaiDien && data.anhDaiDien instanceof File) {
      console.log('[candidatesAPI.update] Appending anhDaiDien file:', data.anhDaiDien.name);
      formData.append('anhDaiDien', data.anhDaiDien);
    }
    if (data.cvDinhKem && data.cvDinhKem instanceof File) {
      console.log('[candidatesAPI.update] Appending cvDinhKem file:', data.cvDinhKem.name);
      formData.append('cvDinhKem', data.cvDinhKem);
    }

    // Log FormData contents for debugging
    console.log('[candidatesAPI.update] FormData keys:', Array.from(formData.keys()));
    console.log('[candidatesAPI.update] Has cvDinhKem:', formData.has('cvDinhKem'));

    return api.put(`/candidates/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  delete: (id) => api.delete(`/candidates/${id}`),
  startProbation: (id, data) => api.post(`/candidates/${id}/start-probation`, data),
};

export const travelExpensesAPI = {
  create: (data) => api.post('/travel-expenses', data),
  getAll: (params) => api.get('/travel-expenses', { params }),
  getById: (id) => api.get(`/travel-expenses/${id}`),
  decide: (id, data) => api.post(`/travel-expenses/${id}/decision`, data),
  approveBudget: (id, data) => api.post(`/travel-expenses/${id}/budget`, data),
  submitSettlement: (id, data) => {
    const formData = new FormData();
    formData.append('actualExpense', data.actualExpense);
    if (data.notes) formData.append('notes', data.notes);
    if (data.attachments && data.attachments.length > 0) {
      data.attachments.forEach((file) => {
        formData.append('attachments', file);
      });
    }
    return api.post(`/travel-expenses/${id}/settlement`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getAttachments: (id) => api.get(`/travel-expenses/${id}/attachments`),
  confirmSettlement: (id, data) => api.post(`/travel-expenses/${id}/settlement/confirm`, data),
  accountantCheck: (id, data) => api.post(`/travel-expenses/${id}/accountant/check`, data),
  processAdvance: (id, data) => api.post(`/travel-expenses/${id}/advance/process`, data),
  confirmAdvanceTransfer: (id, data) => api.post(`/travel-expenses/${id}/advance`, data),
  approveException: (id, data) => api.post(`/travel-expenses/${id}/exception-approval`, data),
  confirmPayment: (id, data) => api.post(`/travel-expenses/${id}/payment`, data),
};

// Customer Entertainment Expenses API
export const customerEntertainmentExpensesAPI = {
  create: (data) => {
    const formData = new FormData();
    formData.append('employeeId', data.employeeId);
    formData.append('branchDirectorId', data.branchDirectorId);
    formData.append('branchDirectorName', data.branchDirectorName);
    if (data.managerId) {
      formData.append('managerId', data.managerId);
    }
    if (data.managerName) {
      formData.append('managerName', data.managerName);
    }
    formData.append('branch', data.branch);
    formData.append('startDate', data.startDate);
    formData.append('endDate', data.endDate);
    formData.append('advanceAmount', data.advanceAmount || 0);
    formData.append('expenseItems', JSON.stringify(data.expenseItems));

    // Add files
    if (data.files && data.files.length > 0) {
      data.files.forEach((file) => {
        formData.append('files', file);
      });
    }

    return api.post('/customer-entertainment-expenses', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getAll: (params) => api.get('/customer-entertainment-expenses', { params }),
  getById: (id) => api.get(`/customer-entertainment-expenses/${id}`),
  approve: (id, data) => api.put(`/customer-entertainment-expenses/${id}/approve`, data),
  reject: (id, data) => api.put(`/customer-entertainment-expenses/${id}/reject`, data),
  requestCorrection: (id, data) => api.put(`/customer-entertainment-expenses/${id}/request-correction`, data),
  accountantProcess: (id, data) => api.put(`/customer-entertainment-expenses/${id}/accountant-process`, data),
  ceoApprove: (id, data) => api.put(`/customer-entertainment-expenses/${id}/ceo-approve`, data),
  ceoReject: (id, data) => api.put(`/customer-entertainment-expenses/${id}/ceo-reject`, data),
  processPayment: (id, data) => api.put(`/customer-entertainment-expenses/${id}/payment`, data),
};

// Candidates API

// Recruitment Requests API
export const recruitmentRequestsAPI = {
  getAll: (params) => api.get('/recruitment-requests', { params }),
  getById: (id) => api.get(`/recruitment-requests/${id}`),
  create: (data) => api.post('/recruitment-requests', data),
  approve: (id) => api.put(`/recruitment-requests/${id}/approve`),
  reject: (id, data) => api.put(`/recruitment-requests/${id}/reject`, data),
};

// Interview Requests API
export const interviewRequestsAPI = {
  getAll: (params) => api.get('/interview-requests', { params }),
  create: (data) => api.post('/interview-requests', data),
  approve: (id, data) => api.put(`/interview-requests/${id}/approve`, data),
  reject: (id, data) => api.put(`/interview-requests/${id}/reject`, data),
};

export const interviewEvaluationsAPI = {
  getAll: (params) => api.get('/interview-evaluations', { params }),
  getById: (id) => api.get(`/interview-evaluations/${id}`),
  create: (data) => api.post('/interview-evaluations', data),
  update: (id, data) => api.put(`/interview-evaluations/${id}`, data),
  checkAndUpdateStatus: (candidateId) => api.post(`/interview-evaluations/check-and-update-status/${candidateId}`),
};

// Notification system removed

export default api;
