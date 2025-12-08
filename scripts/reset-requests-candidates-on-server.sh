#!/bin/bash

# Script: Reset dữ liệu các đơn từ và ứng viên trên server
# Mô tả: Dừng PM2, chạy SQL script để xóa đơn từ và ứng viên, giữ lại employees và users
# Ngày tạo: 2025-01-XX

set -e  # Exit on error

# Màu sắc cho output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Thông tin database
DB_NAME="HR_Management_System"
DB_USER="hr_user"

# Đường dẫn
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SQL_SCRIPT="$PROJECT_DIR/database/reset-requests-and-candidates.sql"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}RESET DỮ LIỆU ĐƠN TỪ VÀ ỨNG VIÊN${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Kiểm tra file SQL script
if [ ! -f "$SQL_SCRIPT" ]; then
    echo -e "${RED}❌ Không tìm thấy file SQL script: $SQL_SCRIPT${NC}"
    echo "Vui lòng đảm bảo file tồn tại hoặc cập nhật đường dẫn trong script."
    exit 1
fi

echo -e "${GREEN}✓ Tìm thấy file SQL script${NC}"
echo ""

# 1. Dừng PM2 process
echo -e "${YELLOW}[1/3] Dừng PM2 process...${NC}"
pm2 stop hr-management-api || echo "PM2 process không chạy hoặc không tìm thấy"
echo -e "${GREEN}✓ Đã dừng PM2${NC}"
echo ""

# 2. Chạy SQL script
echo -e "${YELLOW}[2/3] Chạy SQL script để reset dữ liệu...${NC}"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Yêu cầu xác nhận
read -p "Bạn có chắc chắn muốn xóa TẤT CẢ đơn từ và ứng viên? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Đã hủy thao tác.${NC}"
    pm2 start hr-management-api
    exit 0
fi

# Chạy SQL script
cd "$PROJECT_DIR"
sudo -u postgres psql -d "$DB_NAME" -f "$SQL_SCRIPT"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Đã reset dữ liệu thành công${NC}"
else
    echo -e "${RED}❌ Lỗi khi chạy SQL script${NC}"
    echo -e "${YELLOW}Khởi động lại PM2...${NC}"
    pm2 start hr-management-api
    exit 1
fi

echo ""

# 3. Khởi động lại PM2
echo -e "${YELLOW}[3/3] Khởi động lại PM2...${NC}"
pm2 start hr-management-api
pm2 save

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Đã khởi động lại PM2${NC}"
else
    echo -e "${RED}❌ Lỗi khi khởi động PM2${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ HOÀN THÀNH RESET DỮ LIỆU${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Đã xóa:"
echo "  - Tất cả đơn từ (nghỉ phép, tăng ca, bổ sung công, công tác, v.v.)"
echo "  - Tất cả ứng viên (candidates)"
echo "  - Tất cả yêu cầu phỏng vấn và tuyển dụng"
echo ""
echo "Đã giữ lại:"
echo "  ✓ employees (nhân viên)"
echo "  ✓ users (người dùng hệ thống)"
echo "  ✓ equipment_assignments (phân công vật dụng)"
echo ""

