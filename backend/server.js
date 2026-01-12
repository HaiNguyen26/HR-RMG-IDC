const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const employeesRoutes = require('./routes/employees');
const equipmentRoutes = require('./routes/equipment');
const statisticsRoutes = require('./routes/statistics');
const authRoutes = require('./routes/auth');
const requestsRoutes = require('./routes/requests');
const leaveRequestsRoutes = require('./routes/leaveRequests');
const overtimeRequestsRoutes = require('./routes/overtimeRequests');
const attendanceRequestsRoutes = require('./routes/attendanceRequests');
const lateEarlyRequestsRoutes = require('./routes/lateEarlyRequests');
const mealAllowanceRequestsRoutes = require('./routes/mealAllowanceRequests');
const travelExpensesRoutes = require('./routes/travelExpenses');
const customerEntertainmentExpensesRoutes = require('./routes/customerEntertainmentExpenses');
const candidatesRoutes = require('./routes/candidates');
const recruitmentRequestsRoutes = require('./routes/recruitmentRequests');
const interviewRequestsRoutes = require('./routes/interviewRequests');
const interviewEvaluationsRoutes = require('./routes/interviewEvaluations');
const attendanceSyncRoutes = require('./routes/attendanceSync');
const attendanceRecordsRoutes = require('./routes/attendanceRecords');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true
}));
// Increase body size limit to support file uploads (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files (support both /uploads and /api/uploads for compatibility)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/employees', employeesRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/leave-requests', leaveRequestsRoutes);
app.use('/api/overtime-requests', overtimeRequestsRoutes);
app.use('/api/attendance-adjustments', attendanceRequestsRoutes);
app.use('/api/late-early-requests', lateEarlyRequestsRoutes);
app.use('/api/meal-allowance-requests', mealAllowanceRequestsRoutes);
app.use('/api/travel-expenses', travelExpensesRoutes);
app.use('/api/customer-entertainment-expenses', customerEntertainmentExpensesRoutes);
app.use('/api/candidates', candidatesRoutes);
app.use('/api/recruitment-requests', recruitmentRequestsRoutes);
app.use('/api/interview-requests', interviewRequestsRoutes);
app.use('/api/interview-evaluations', interviewEvaluationsRoutes);
app.use('/api/attendance-sync', attendanceSyncRoutes);
app.use('/api/attendance-records', attendanceRecordsRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'HR Management System API',
        version: '1.0.0',
        endpoints: {
            employees: '/api/employees',
            equipment: '/api/equipment',
            statistics: '/api/statistics',
            auth: '/api/auth',
            requests: '/api/requests',
            leaveRequests: '/api/leave-requests',
            overtimeRequests: '/api/overtime-requests',
            attendanceAdjustments: '/api/attendance-adjustments',
            lateEarlyRequests: '/api/late-early-requests',
            mealAllowanceRequests: '/api/meal-allowance-requests',
            travelExpenses: '/api/travel-expenses',
            customerEntertainmentExpenses: '/api/customer-entertainment-expenses',
            candidates: '/api/candidates',
            recruitmentRequests: '/api/recruitment-requests'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error: ' + err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✓ Server is running on http://localhost:${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ API endpoints available at http://localhost:${PORT}/api`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`✗ Port ${PORT} is already in use. Please stop the other process or change the PORT in .env`);
    } else {
        console.error('✗ Error starting server:', err);
    }
    process.exit(1);
});

module.exports = app;
