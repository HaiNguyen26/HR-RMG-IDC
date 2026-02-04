#!/bin/bash

# Script: Chạy migration script trên local (Windows với Git Bash)
# Usage: bash scripts/run-migration-local.sh [migration_file.sql]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# PostgreSQL settings
DB_NAME="HR_Management_System"
DB_USER="postgres"
DB_PASSWORD="Hainguyen261097"

# Tìm psql.exe
PSQL_PATH=""
if [ -f "/d/SQL/bin/psql.exe" ]; then
    PSQL_PATH="/d/SQL/bin/psql.exe"
elif [ -f "D:/SQL/bin/psql.exe" ]; then
    PSQL_PATH="D:/SQL/bin/psql.exe"
elif command -v psql &> /dev/null; then
    PSQL_PATH="psql"
else
    echo -e "${RED}❌ Không tìm thấy psql.exe${NC}"
    echo "Vui lòng cài đặt PostgreSQL hoặc cập nhật đường dẫn trong script này"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Nếu có tham số, dùng file đó, nếu không dùng file mặc định
MIGRATION_FILE="${1:-database/add_password_display_column.sql}"
MIGRATION_PATH="$PROJECT_DIR/$MIGRATION_FILE"

if [ ! -f "$MIGRATION_PATH" ]; then
    echo -e "${RED}❌ Không tìm thấy file migration: $MIGRATION_PATH${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}RUN LOCAL MIGRATION${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Database: $DB_NAME${NC}"
echo -e "${YELLOW}User: $DB_USER${NC}"
echo -e "${YELLOW}Migration file: $MIGRATION_FILE${NC}"
echo -e "${YELLOW}psql path: $PSQL_PATH${NC}"
echo ""

# Chạy migration với PGPASSWORD
export PGPASSWORD="$DB_PASSWORD"
echo -e "${BLUE}→ Chạy migration: $MIGRATION_FILE${NC}"
"$PSQL_PATH" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ MIGRATION THÀNH CÔNG${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ MIGRATION THẤT BẠI${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
