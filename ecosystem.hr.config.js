// PM2 Ecosystem Configuration for HR Management System
// Usage: pm2 start ecosystem.hr.config.js

module.exports = {
    apps: [
        {
            name: 'hr-management-api',
            script: './backend/server.js',
            cwd: '/var/www/hr-management',
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
                DB_HOST: 'localhost',
                DB_PORT: 5432,
                DB_NAME: 'HR_Management_System',
                DB_USER: 'hr_user',
                DB_PASSWORD: 'Hainguyen261097', // Set in .env file
            },
            error_file: '/var/log/pm2/hr-api-error.log',
            out_file: '/var/log/pm2/hr-api-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            autorestart: true,
            max_restarts: 10,
            min_uptime: '10s',
        },
    ],
};

