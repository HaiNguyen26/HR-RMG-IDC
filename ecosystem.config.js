// PM2 Ecosystem Config cho HR Management System - RMG-IDC
// Server mới: 27.71.16.15

module.exports = {
  apps: [
    {
      name: 'hr-rmg-idc-backend',
      script: './backend/server.js',
      cwd: '/var/www/hr-rmg-idc',
      env: {
        NODE_ENV: 'production',
        PORT: 3001  // Port khác với app cũ để tránh xung đột
      },
      error_file: '/var/www/hr-rmg-idc/logs/backend-error.log',
      out_file: '/var/www/hr-rmg-idc/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'hr-rmg-idc-frontend',
      script: 'serve',
      args: '-s build -l 3002',  // Port khác với app cũ
      cwd: '/var/www/hr-rmg-idc/frontend',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/www/hr-rmg-idc/logs/frontend-error.log',
      out_file: '/var/www/hr-rmg-idc/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      instances: 1,
      autorestart: true,
      watch: false
    }
  ]
};
