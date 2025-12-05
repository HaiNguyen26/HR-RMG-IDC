#!/bin/bash
# ============================================================
# Script Reset Database trên Server
# CHỈ GIỮ LẠI: Danh sách nhân viên (employees)
# ============================================================
# 
# Script này sẽ:
# 1. Dừng ứng dụng HR (PM2)
# 2. Xóa toàn bộ dữ liệu từ các bảng (candidates, leave_requests, etc.)
# 3. CHỈ GIỮ LẠI: employees, users, equipment_assignments
# 4. Reset sequences về 1
# 5. Khởi động lại ứng dụng HR
#
# CẢNH BÁO: Script này sẽ XÓA VĨNH VIỄN dữ liệu!
# ============================================================

set -e  # Exit on error

DB_NAME="HR_Management_System"
DB_USER="hr_user"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SQL_SCRIPT="$PROJECT_DIR/database/clean-database-keep-employees.sql"

echo "=========================================="
echo "RESET DATABASE TRÊN SERVER"
echo "CHỈ GIỮ LẠI: Danh sách nhân viên"
echo "=========================================="
echo ""

# Kiểm tra file SQL script
if [ ! -f "$SQL_SCRIPT" ]; then
    echo "✗ Không tìm thấy file SQL script: $SQL_SCRIPT"
    exit 1
fi

# Kiểm tra database có tồn tại không
echo "Kiểm tra database..."
DB_EXISTS=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w "$DB_NAME" | wc -l)
if [ "$DB_EXISTS" -eq 0 ]; then
    echo "✗ Database '$DB_NAME' không tồn tại!"
    exit 1
fi
echo "✓ Database '$DB_NAME' tồn tại"
echo ""

# Đếm số nhân viên trước khi reset
echo "Đếm số nhân viên hiện tại..."
EMPLOYEE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM employees;" | xargs)
echo "✓ Số nhân viên hiện tại: $EMPLOYEE_COUNT"
echo ""

# Xác nhận từ người dùng
read -p "Bạn có chắc chắn muốn reset database? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Đã hủy bỏ."
    exit 0
fi

# Dừng ứng dụng HR (PM2)
echo ""
echo "=========================================="
echo "Dừng ứng dụng HR..."
echo "=========================================="
cd "$PROJECT_DIR"
# Kiểm tra và dừng các process có thể có
if pm2 list | grep -q "hr-management-api\|hr-backend\|hr-frontend"; then
    pm2 stop hr-management-api 2>/dev/null || true
    pm2 stop hr-backend 2>/dev/null || true
    pm2 stop hr-frontend 2>/dev/null || true
    echo "✓ Đã dừng ứng dụng HR"
else
    echo "⚠ Không tìm thấy ứng dụng HR trong PM2"
fi
echo ""

# Chạy script SQL để reset database
echo "=========================================="
echo "Reset database..."
echo "=========================================="
sudo -u postgres psql -d "$DB_NAME" -f "$SQL_SCRIPT"

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Đã reset database thành công"
else
    echo ""
    echo "✗ Lỗi khi reset database"
    exit 1
fi

# Đếm số nhân viên sau khi reset
echo ""
echo "=========================================="
echo "Kiểm tra kết quả..."
echo "=========================================="
FINAL_EMPLOYEE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM employees;" | xargs)
echo "✓ Số nhân viên sau khi reset: $FINAL_EMPLOYEE_COUNT"

# Kiểm tra các bảng đã được xóa
echo ""
echo "Kiểm tra các bảng đã được xóa:"
TABLES_TO_CHECK=("candidates" "leave_requests" "overtime_requests" "attendance_adjustments")
for table in "${TABLES_TO_CHECK[@]}"; do
    COUNT=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | xargs || echo "0")
    if [ "$COUNT" == "0" ]; then
        echo "  ✓ $table: 0 records (đã xóa sạch)"
    else
        echo "  ⚠ $table: $COUNT records (còn sót lại)"
    fi
done

# Khởi động lại ứng dụng HR
echo ""
echo "=========================================="
echo "Khởi động lại ứng dụng HR..."
echo "=========================================="
cd "$PROJECT_DIR"

# Kiểm tra PM2 process nào đang chạy
PM2_PROCESS=$(pm2 list | grep -E "hr-management-api|hr-backend|hr-frontend" | awk '{print $2}' | head -1)

if [ -n "$PM2_PROCESS" ]; then
    echo "Tìm thấy PM2 process: $PM2_PROCESS"
    pm2 restart "$PM2_PROCESS"
    pm2 save
    echo "✓ Đã khởi động lại ứng dụng HR"
elif [ -f "ecosystem.config.js" ]; then
    echo "Không tìm thấy process, thử khởi động từ ecosystem.config.js..."
    pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
    pm2 save
    echo "✓ Đã khởi động lại ứng dụng HR"
else
    echo "⚠ Không tìm thấy PM2 process hoặc ecosystem.config.js"
    echo "Vui lòng khởi động thủ công:"
    echo "  cd backend && pm2 start npm --name hr-management-api -- run start"
fi

echo ""
echo "=========================================="
echo "HOÀN TẤT!"
echo "=========================================="
echo "Database đã được reset thành công."
echo "Số nhân viên được giữ lại: $FINAL_EMPLOYEE_COUNT"
echo "=========================================="

