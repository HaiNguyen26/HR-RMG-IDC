#!/bin/bash

# Script backup database PostgreSQL
# Sử dụng: ./scripts/backup-database.sh

# Cấu hình
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-HR_Management_System}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backup}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/hr_management_backup_${TIMESTAMP}.dump"

# Tạo thư mục backup nếu chưa có
mkdir -p "$BACKUP_DIR"

# Backup database
echo "Đang backup database ${DB_NAME}..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup thành công: $BACKUP_FILE"
    
    # Hiển thị kích thước file
    ls -lh "$BACKUP_FILE"
else
    echo "❌ Backup thất bại!"
    exit 1
fi

