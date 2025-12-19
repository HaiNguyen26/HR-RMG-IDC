#!/bin/bash

# Script: Pull code mới và chạy migration database trên server
# Mô tả: Pull code từ git, chạy migration SQL scripts, restart PM2
# Ngày tạo: 2025-01-XX

set -e  # Exit on error

# Màu sắc cho output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Thông tin database
DB_NAME="HR_Management_System"
DB_USER="hr_user"

# Đường dẫn
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PULL CODE VÀ CHẠY MIGRATION DATABASE${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Dừng PM2 process
echo -e "${YELLOW}[1/4] Dừng PM2 process...${NC}"
pm2 stop hr-management-api || echo "PM2 process không chạy hoặc không tìm thấy"
echo -e "${GREEN}✓ Đã dừng PM2${NC}"
echo ""

# 2. Pull code mới từ git
echo -e "${YELLOW}[2/5] Pull code mới từ git...${NC}"
cd "$PROJECT_DIR"
git pull origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Đã pull code thành công${NC}"
else
    echo -e "${RED}❌ Lỗi khi pull code${NC}"
    echo -e "${YELLOW}Khởi động lại PM2...${NC}"
    pm2 start hr-management-api
    exit 1
fi
echo ""

# 2.5. Install dependencies và Build lại frontend
echo -e "${YELLOW}[3/5] Install dependencies và Build lại frontend...${NC}"
cd "$PROJECT_DIR/frontend"

# Kiểm tra xem có file .env không, nếu không thì tạo
if [ ! -f .env ]; then
    echo "REACT_APP_API_URL=/hr/api" > .env
    echo -e "${BLUE}→ Đã tạo file .env cho frontend${NC}"
fi

# Install dependencies (để đảm bảo có package mới)
echo "Đang install dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Đã install dependencies thành công${NC}"
else
    echo -e "${RED}❌ Lỗi khi install dependencies${NC}"
    echo -e "${YELLOW}Tiếp tục build...${NC}"
fi

# Build frontend
echo "Đang build frontend (có thể mất vài phút)..."
REACT_APP_API_URL="/hr/api" npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Đã build frontend thành công${NC}"
else
    echo -e "${RED}❌ Lỗi khi build frontend${NC}"
    echo -e "${YELLOW}Tiếp tục với các bước khác...${NC}"
fi
echo ""

# 4. Chạy migration SQL scripts
echo -e "${YELLOW}[4/5] Chạy migration SQL scripts...${NC}"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Migration 1: migrate_attendance_adjustments_allow_null_reason.sql
MIGRATION1="$PROJECT_DIR/database/migrate_attendance_adjustments_allow_null_reason.sql"
if [ -f "$MIGRATION1" ]; then
    echo -e "${BLUE}→ Chạy migration: migrate_attendance_adjustments_allow_null_reason.sql${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION1"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 1 thành công${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 1${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 1: $MIGRATION1${NC}"
fi

# Migration 2: migrate_travel_expense_step1_fields.sql
MIGRATION2="$PROJECT_DIR/database/migrate_travel_expense_step1_fields.sql"
if [ -f "$MIGRATION2" ]; then
    echo -e "${BLUE}→ Chạy migration: migrate_travel_expense_step1_fields.sql${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION2"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 2 thành công${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 2${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 2: $MIGRATION2${NC}"
fi

# Migration 3a: add_chi_nhanh_to_candidates.sql (Quick fix for immediate error)
MIGRATION3A="$PROJECT_DIR/database/add_chi_nhanh_to_candidates.sql"
if [ -f "$MIGRATION3A" ]; then
    echo -e "${BLUE}→ Chạy migration: add_chi_nhanh_to_candidates.sql${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION3A"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 3a thành công${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 3a${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 3a: $MIGRATION3A${NC}"
fi

# Migration 3: add_cccd_fields_to_candidates.sql
MIGRATION3="$PROJECT_DIR/database/add_cccd_fields_to_candidates.sql"
if [ -f "$MIGRATION3" ]; then
    echo -e "${BLUE}→ Chạy migration: add_cccd_fields_to_candidates.sql${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION3"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 3 thành công${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 3${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 3: $MIGRATION3${NC}"
fi

# Migration 4: add_address_fields_to_candidates.sql
MIGRATION4="$PROJECT_DIR/database/add_address_fields_to_candidates.sql"
if [ -f "$MIGRATION4" ]; then
    echo -e "${BLUE}→ Chạy migration: add_address_fields_to_candidates.sql${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION4"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 4 thành công${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 4${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 4: $MIGRATION4${NC}"
fi

# Migration 5: add_all_missing_columns_to_candidates.sql
MIGRATION5="$PROJECT_DIR/database/add_all_missing_columns_to_candidates.sql"
if [ -f "$MIGRATION5" ]; then
    echo -e "${BLUE}→ Chạy migration: add_all_missing_columns_to_candidates.sql${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION5"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 5 thành công${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 5${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 5: $MIGRATION5${NC}"
fi

# Migration 6: add_cv_fields_to_candidates.sql
MIGRATION6="$PROJECT_DIR/database/add_cv_fields_to_candidates.sql"
if [ -f "$MIGRATION6" ]; then
    echo -e "${BLUE}→ Chạy migration: add_cv_fields_to_candidates.sql${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION6"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 6 thành công${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 6${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 6: $MIGRATION6${NC}"
fi

# Migration 7: add_probation_start_date_to_candidates.sql
MIGRATION7="$PROJECT_DIR/database/add_probation_start_date_to_candidates.sql"
if [ -f "$MIGRATION7" ]; then
    echo -e "${BLUE}→ Chạy migration: add_probation_start_date_to_candidates.sql${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION7"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 7 thành công${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 7${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 7: $MIGRATION7${NC}"
fi

# Migration 8: add_on_probation_status_to_candidates.sql
MIGRATION8="$PROJECT_DIR/database/add_on_probation_status_to_candidates.sql"
if [ -f "$MIGRATION8" ]; then
    echo -e "${BLUE}→ Chạy migration: add_on_probation_status_to_candidates.sql${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION8"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 8 thành công${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 8${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 8: $MIGRATION8${NC}"
fi

# 4.5. Tạo và cấp quyền cho thư mục uploads
echo -e "${YELLOW}[4.5/5] Tạo và cấp quyền cho thư mục uploads...${NC}"
UPLOADS_DIR="$PROJECT_DIR/backend/uploads"
mkdir -p "$UPLOADS_DIR/candidates"
mkdir -p "$UPLOADS_DIR/customer-entertainment-expenses"
chmod -R 755 "$UPLOADS_DIR"
echo -e "${GREEN}✓ Đã tạo và cấp quyền cho thư mục uploads${NC}"
echo ""

# 5. Khởi động lại PM2
echo -e "${YELLOW}[5/5] Khởi động lại PM2...${NC}"
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
echo -e "${GREEN}✅ HOÀN THÀNH PULL VÀ MIGRATION${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Đã thực hiện:"
echo "  ✓ Pull code mới từ git"
echo "  ✓ Build lại frontend"
echo "  ✓ Chạy migration database"
echo "  ✓ Khởi động lại PM2"
echo ""

