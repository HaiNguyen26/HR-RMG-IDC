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

# Migration 3a: add_trang_thai_to_candidates.sql (Essential column - must be first)
MIGRATION3A="$PROJECT_DIR/database/add_trang_thai_to_candidates.sql"
if [ -f "$MIGRATION3A" ]; then
    echo -e "${BLUE}→ Chạy migration: add_trang_thai_to_candidates.sql${NC}"
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

# Migration 3b: add_chi_nhanh_to_candidates.sql (Quick fix for immediate error)
MIGRATION3B="$PROJECT_DIR/database/add_chi_nhanh_to_candidates.sql"
if [ -f "$MIGRATION3B" ]; then
    echo -e "${BLUE}→ Chạy migration: add_chi_nhanh_to_candidates.sql${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION3B"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 3b thành công${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 3b${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 3b: $MIGRATION3B${NC}"
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

# Migration 9: ensure_all_candidates_columns.sql (COMPREHENSIVE - adds ALL missing columns)
MIGRATION9="$PROJECT_DIR/database/ensure_all_candidates_columns.sql"
if [ -f "$MIGRATION9" ]; then
    echo -e "${BLUE}→ Chạy migration: ensure_all_candidates_columns.sql (TỔNG HỢP - thêm TẤT CẢ cột còn thiếu)${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION9"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 9 thành công - Tất cả cột đã được đảm bảo${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 9${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 9: $MIGRATION9${NC}"
fi

# Migration 10: create_candidate_related_tables.sql (Tạo các bảng liên quan đến candidates)
MIGRATION10="$PROJECT_DIR/database/create_candidate_related_tables.sql"
if [ -f "$MIGRATION10" ]; then
    echo -e "${BLUE}→ Chạy migration: create_candidate_related_tables.sql (Tạo bảng candidate_work_experiences, candidate_training_processes, candidate_foreign_languages)${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION10"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 10 thành công - Đã tạo các bảng liên quan đến candidates${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 10${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 10: $MIGRATION10${NC}"
fi

# Migration 11: add_exception_approval_fields_to_travel_expenses.sql (Thêm các trường cho phê duyệt ngoại lệ vượt ngân sách)
MIGRATION11="$PROJECT_DIR/database/add_exception_approval_fields_to_travel_expenses.sql"
if [ -f "$MIGRATION11" ]; then
    echo -e "${BLUE}→ Chạy migration: add_exception_approval_fields_to_travel_expenses.sql (Thêm các trường exception approval)${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION11"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 11 thành công - Đã thêm các trường exception approval${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 11${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 11: $MIGRATION11${NC}"
fi

# Migration 12: add_payment_fields_to_travel_expenses.sql (Thêm các trường cho giải ngân - Bước 8)
MIGRATION12="$PROJECT_DIR/database/add_payment_fields_to_travel_expenses.sql"
if [ -f "$MIGRATION12" ]; then
    echo -e "${BLUE}→ Chạy migration: add_payment_fields_to_travel_expenses.sql (Thêm các trường payment - Giải ngân)${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION12"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 12 thành công - Đã thêm các trường payment${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 12${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 12: $MIGRATION12${NC}"
fi

# Migration 13: migrate_recruitment_requests_add_employee_id.sql (Thêm các cột created_by_employee_id và branch_director_id)
MIGRATION13="$PROJECT_DIR/database/migrate_recruitment_requests_add_employee_id.sql"
if [ -f "$MIGRATION13" ]; then
    echo -e "${BLUE}→ Chạy migration: migrate_recruitment_requests_add_employee_id.sql (Thêm các cột cho recruitment_requests)${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION13"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 13 thành công - Đã thêm các cột cho recruitment_requests${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 13${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 13: $MIGRATION13${NC}"
fi

# Migration 14: migrate_interview_requests_add_branch_director_id.sql (Thêm cột branch_director_id cho interview_requests)
MIGRATION14="$PROJECT_DIR/database/migrate_interview_requests_add_branch_director_id.sql"
if [ -f "$MIGRATION14" ]; then
    echo -e "${BLUE}→ Chạy migration: migrate_interview_requests_add_branch_director_id.sql (Thêm cột branch_director_id cho interview_requests)${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION14"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 14 thành công - Đã thêm cột branch_director_id cho interview_requests${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 14${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 14: $MIGRATION14${NC}"
fi

# Migration 15: migrate_candidates_file_fields.sql (Đảm bảo các cột file đính kèm tồn tại - QUAN TRỌNG)
MIGRATION15="$PROJECT_DIR/database/migrate_candidates_file_fields.sql"
if [ -f "$MIGRATION15" ]; then
    echo -e "${BLUE}→ Chạy migration: migrate_candidates_file_fields.sql (Đảm bảo các cột anh_dai_dien_path, cv_dinh_kem_path tồn tại)${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION15"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 15 thành công - Đã đảm bảo các cột file đính kèm tồn tại${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 15${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 15: $MIGRATION15${NC}"
fi

# Migration 16: ensure_candidate_related_tables.sql (Đảm bảo các bảng liên quan tồn tại)
MIGRATION16="$PROJECT_DIR/database/ensure_candidate_related_tables.sql"
if [ -f "$MIGRATION16" ]; then
    echo -e "${BLUE}→ Chạy migration: ensure_candidate_related_tables.sql (Đảm bảo các bảng candidate_work_experiences, candidate_training_processes, candidate_foreign_languages tồn tại)${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION16"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 16 thành công - Đã đảm bảo các bảng liên quan tồn tại${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 16${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 16: $MIGRATION16${NC}"
fi

# Migration 17: grant_permissions_candidate_tables.sql (Cấp quyền cho database user - QUAN TRỌNG)
MIGRATION17="$PROJECT_DIR/database/grant_permissions_candidate_tables.sql"
if [ -f "$MIGRATION17" ]; then
    echo -e "${BLUE}→ Chạy migration: grant_permissions_candidate_tables.sql (Cấp quyền SELECT, INSERT, UPDATE, DELETE cho hr_user trên các bảng candidate_work_experiences, candidate_training_processes, candidate_foreign_languages)${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION17"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 17 thành công - Đã cấp quyền cho database user${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 17${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 17: $MIGRATION17${NC}"
fi

# Migration 18: add_note_to_interview_requests.sql (Thêm cột note vào bảng interview_requests)
MIGRATION18="$PROJECT_DIR/database/add_note_to_interview_requests.sql"
if [ -f "$MIGRATION18" ]; then
    echo -e "${BLUE}→ Chạy migration: add_note_to_interview_requests.sql (Thêm cột note vào bảng interview_requests)${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION18"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 18 thành công - Đã thêm cột note vào interview_requests${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 18${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 18: $MIGRATION18${NC}"
fi

# Migration 19: fix_interview_requests_interview_time_type.sql (Sửa type interview_time từ TIME sang TIMESTAMP)
MIGRATION19="$PROJECT_DIR/database/fix_interview_requests_interview_time_type.sql"
if [ -f "$MIGRATION19" ]; then
    echo -e "${BLUE}→ Chạy migration: fix_interview_requests_interview_time_type.sql (Sửa type interview_time từ TIME sang TIMESTAMP)${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION19"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 19 thành công - Đã sửa type interview_time${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 19${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 19: $MIGRATION19${NC}"
fi

# Migration 20: fix_interview_requests_manager_name_constraint.sql (Xóa NOT NULL constraint từ manager_name và branch_director_name)
MIGRATION20="$PROJECT_DIR/database/fix_interview_requests_manager_name_constraint.sql"
if [ -f "$MIGRATION20" ]; then
    echo -e "${BLUE}→ Chạy migration: fix_interview_requests_manager_name_constraint.sql (Xóa NOT NULL constraint từ manager_name và branch_director_name)${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION20"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 20 thành công - Đã xóa NOT NULL constraint từ manager_name và branch_director_name${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 20${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 20: $MIGRATION20${NC}"
fi

# Migration 21: fix_interview_requests_status_constraint.sql (Cập nhật check constraint cho status)
MIGRATION21="$PROJECT_DIR/database/fix_interview_requests_status_constraint.sql"
if [ -f "$MIGRATION21" ]; then
    echo -e "${BLUE}→ Chạy migration: fix_interview_requests_status_constraint.sql (Cập nhật check constraint cho status để cho phép PENDING_INTERVIEW, WAITING_FOR_OTHER_APPROVAL, READY_FOR_INTERVIEW, APPROVED, REJECTED)${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION21"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 21 thành công - Đã cập nhật status constraint${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 21${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 21: $MIGRATION21${NC}"
fi

# Migration 22: add_approval_columns_to_interview_requests.sql (Thêm các cột approval)
MIGRATION22="$PROJECT_DIR/database/add_approval_columns_to_interview_requests.sql"
if [ -f "$MIGRATION22" ]; then
    echo -e "${BLUE}→ Chạy migration: add_approval_columns_to_interview_requests.sql (Thêm các cột manager_approved, branch_director_approved, manager_approved_at, branch_director_approved_at)${NC}"
    sudo -u postgres psql -d "$DB_NAME" -f "$MIGRATION22"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration 22 thành công - Đã thêm các cột approval${NC}"
    else
        echo -e "${RED}❌ Lỗi khi chạy migration 22${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ Không tìm thấy migration 22: $MIGRATION22${NC}"
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

