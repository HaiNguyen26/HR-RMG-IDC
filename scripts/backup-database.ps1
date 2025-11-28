# Script backup database PostgreSQL cho Windows PowerShell
# Sử dụng: .\scripts\backup-database.ps1

# Cấu hình
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "HR_Management_System" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$BACKUP_DIR = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { ".\backup" }
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = Join-Path $BACKUP_DIR "hr_management_backup_$TIMESTAMP.dump"

# Tạo thư mục backup nếu chưa có
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

# Backup database
Write-Host "Đang backup database $DB_NAME..."
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -F c -f $BACKUP_FILE

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup thành công: $BACKUP_FILE" -ForegroundColor Green
    
    # Hiển thị kích thước file
    $fileInfo = Get-Item $BACKUP_FILE
    Write-Host "Kích thước: $([math]::Round($fileInfo.Length / 1MB, 2)) MB"
}
else {
    Write-Host "❌ Backup thất bại!" -ForegroundColor Red
    exit 1
}

