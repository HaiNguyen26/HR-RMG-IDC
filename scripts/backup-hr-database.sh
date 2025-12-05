#!/bin/bash

# Script backup database HR_Management_System
# Usage: ./scripts/backup-hr-database.sh [output_file]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database configuration (from .env or default)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-HR_Management_System}"
DB_USER="${DB_USER:-postgres}"

# Output file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="${1:-database/backup_HR_Management_System_${TIMESTAMP}.sql}"

echo -e "${GREEN}=== Backup HR Management System Database ===${NC}"
echo ""
echo "Database: ${DB_NAME}"
echo "Host: ${DB_HOST}:${DB_PORT}"
echo "User: ${DB_USER}"
echo "Output: ${OUTPUT_FILE}"
echo ""

# Create backup directory if not exists
mkdir -p "$(dirname "$OUTPUT_FILE")"

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}Error: pg_dump not found. Please install PostgreSQL client tools.${NC}"
    exit 1
fi

# Backup database
echo -e "${YELLOW}Backing up database...${NC}"
if [ -z "$DB_PASSWORD" ]; then
    # Use PGPASSWORD environment variable or prompt
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner --no-acl \
        --clean --if-exists \
        -f "$OUTPUT_FILE" 2>&1 | grep -v "WARNING: console code page"
else
    PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner --no-acl \
        --clean --if-exists \
        -f "$OUTPUT_FILE" 2>&1 | grep -v "WARNING: console code page"
fi

# Check if backup was successful
if [ $? -eq 0 ] && [ -f "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo -e "${GREEN}✓ Backup completed successfully!${NC}"
    echo -e "File: ${OUTPUT_FILE}"
    echo -e "Size: ${FILE_SIZE}"
    echo ""
    echo -e "${GREEN}To restore this backup:${NC}"
    echo -e "psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} < ${OUTPUT_FILE}"
else
    echo -e "${RED}✗ Backup failed!${NC}"
    exit 1
fi

