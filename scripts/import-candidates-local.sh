#!/bin/bash

# Script import ứng viên trên Local (Linux/Mac)
# Yêu cầu: PostgreSQL đã cài đặt

echo "===================================="
echo "Import Danh sách Ứng viên - LOCAL"
echo "===================================="
echo ""

# Kiểm tra xem psql có tồn tại không
if ! command -v psql &> /dev/null; then
    echo "[ERROR] PostgreSQL chưa được cài đặt hoặc chưa có trong PATH"
    echo "Vui lòng cài đặt PostgreSQL:"
    echo "  - Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo "  - Mac: brew install postgresql"
    exit 1
fi

# Nhập thông tin database
read -p "Tên database (mặc định: HR_Management_System): " DB_NAME
DB_NAME=${DB_NAME:-HR_Management_System}

read -p "User database (mặc định: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

echo ""
echo "Đang import vào database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Lấy đường dẫn của script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Chạy file SQL
psql -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/import-candidates.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "===================================="
    echo "Import thành công!"
    echo "===================================="
    echo ""
    echo "Bạn có thể kiểm tra kết quả bằng cách chạy:"
    echo "  psql -U $DB_USER -d $DB_NAME -c \"SELECT COUNT(*) FROM candidates WHERE created_at >= CURRENT_DATE;\""
else
    echo ""
    echo "===================================="
    echo "Import thất bại!"
    echo "===================================="
fi

echo ""

