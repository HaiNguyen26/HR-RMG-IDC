// PM2 Ecosystem Config cho HR Management System - RMG-IDC
// Server: 27.71.16.15 (Ubuntu Server 22.04 LTS)
//
// ⚠️ QUAN TRỌNG: Cấu hình này được thiết kế để KHÔNG xung đột với app cũ:
// - Ports: 3001 (backend), 3002 (frontend) - khác với app cũ
// - PM2 App Names: 'hr-rmg-idc-backend', 'hr-rmg-idc-frontend' - tên riêng biệt
// - Thư mục: /var/www/hr-rmg-idc - thư mục riêng
// - Database: HR_Management_System - database riêng

module.exports = {
  apps: [
    {
      name: 'hr-rmg-idc-backend',  // Tên riêng biệt, không trùng với app cũ
      script: './backend/server.js',
      cwd: '/var/www/hr-rmg-idc',  // Thư mục riêng
      env: {
        NODE_ENV: 'production',
        PORT: 3001  // Port riêng, không trùng với app cũ
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
      name: 'hr-rmg-idc-frontend',  // Tên riêng biệt, không trùng với app cũ
      script: 'npx',  // Dùng npx để tránh lỗi parse args
      args: ['serve', '-s', 'build', '-l', '3002'],  // Port riêng, không trùng với app cũ
      cwd: '/var/www/hr-rmg-idc/frontend',  // Thư mục riêng
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
