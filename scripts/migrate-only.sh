#!/bin/bash

# Script: Chạy migration database (KHÔNG pull code)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DB_NAME="HR_Management_System"
DB_USER="hr_user"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}RUN DB MIGRATIONS ONLY${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}[1/2] Chạy migration SQL scripts...${NC}"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

run_migration() {
    local name="$1"
    local file="$PROJECT_DIR/database/$2"
    if [ -f "$file" ]; then
        echo -e "${BLUE}→ Chạy migration: $name${NC}"
        sudo -u postgres psql -d "$DB_NAME" -f "$file" || echo -e "${RED}❌ Lỗi khi chạy migration: $name${NC}"
        echo ""
    else
        echo -e "${YELLOW}⚠ Không tìm thấy migration: $file${NC}"
    fi
}

run_migration "migrate_attendance_adjustments_allow_null_reason.sql" "migrate_attendance_adjustments_allow_null_reason.sql"
run_migration "migrate_travel_expense_step1_fields.sql" "migrate_travel_expense_step1_fields.sql"
run_migration "add_trang_thai_to_candidates.sql" "add_trang_thai_to_candidates.sql"
run_migration "add_chi_nhanh_to_candidates.sql" "add_chi_nhanh_to_candidates.sql"
run_migration "add_cccd_fields_to_candidates.sql" "add_cccd_fields_to_candidates.sql"
run_migration "add_address_fields_to_candidates.sql" "add_address_fields_to_candidates.sql"
run_migration "add_all_missing_columns_to_candidates.sql" "add_all_missing_columns_to_candidates.sql"
run_migration "add_cv_fields_to_candidates.sql" "add_cv_fields_to_candidates.sql"
run_migration "add_probation_start_date_to_candidates.sql" "add_probation_start_date_to_candidates.sql"
run_migration "add_on_probation_status_to_candidates.sql" "add_on_probation_status_to_candidates.sql"
run_migration "ensure_all_candidates_columns.sql" "ensure_all_candidates_columns.sql"
run_migration "create_candidate_related_tables.sql" "create_candidate_related_tables.sql"
run_migration "add_exception_approval_fields_to_travel_expenses.sql" "add_exception_approval_fields_to_travel_expenses.sql"
run_migration "add_payment_fields_to_travel_expenses.sql" "add_payment_fields_to_travel_expenses.sql"
run_migration "migrate_recruitment_requests_add_employee_id.sql" "migrate_recruitment_requests_add_employee_id.sql"
run_migration "migrate_interview_requests_add_branch_director_id.sql" "migrate_interview_requests_add_branch_director_id.sql"
run_migration "migrate_candidates_file_fields.sql" "migrate_candidates_file_fields.sql"
run_migration "ensure_candidate_related_tables.sql" "ensure_candidate_related_tables.sql"
run_migration "grant_permissions_candidate_tables.sql" "grant_permissions_candidate_tables.sql"
run_migration "add_note_to_interview_requests.sql" "add_note_to_interview_requests.sql"
run_migration "fix_interview_requests_interview_time_type.sql" "fix_interview_requests_interview_time_type.sql"
run_migration "fix_interview_requests_manager_name_constraint.sql" "fix_interview_requests_manager_name_constraint.sql"
run_migration "fix_interview_requests_status_constraint.sql" "fix_interview_requests_status_constraint.sql"
run_migration "add_approval_columns_to_interview_requests.sql" "add_approval_columns_to_interview_requests.sql"
run_migration "create_late_early_requests_schema.sql" "create_late_early_requests_schema.sql"
run_migration "create_meal_allowance_requests_schema.sql" "create_meal_allowance_requests_schema.sql"
run_migration "add_manager_fields_customer_entertainment_expenses.sql" "add_manager_fields_customer_entertainment_expenses.sql"
run_migration "add_ceo_fields_customer_entertainment_expenses.sql" "add_ceo_fields_customer_entertainment_expenses.sql"
run_migration "grant_permissions_late_early_meal_allowance.sql" "grant_permissions_late_early_meal_allowance.sql"
run_migration "create_password_reset_table.sql" "create_password_reset_table.sql"
run_migration "add_password_display_column.sql" "add_password_display_column.sql"

echo -e "${YELLOW}[2/2] Tạo và cấp quyền cho thư mục uploads...${NC}"
UPLOADS_DIR="$PROJECT_DIR/backend/uploads"
mkdir -p "$UPLOADS_DIR/candidates"
mkdir -p "$UPLOADS_DIR/customer-entertainment-expenses"
chmod -R 755 "$UPLOADS_DIR"
echo -e "${GREEN}✓ Đã tạo và cấp quyền cho thư mục uploads${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ HOÀN THÀNH MIGRATE (ONLY)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
