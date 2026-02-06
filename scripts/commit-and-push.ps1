# Script để commit và push code lên git
# Chạy script này trong PowerShell: .\scripts\commit-and-push.ps1

Write-Host "========================================" -ForegroundColor Blue
Write-Host "COMMIT VÀ PUSH CODE LÊN GIT" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Xóa file lock nếu có
Write-Host "[1/4] Xóa file lock..." -ForegroundColor Yellow
Remove-Item -Force .git/index.lock -ErrorAction SilentlyContinue
Write-Host "✓ Đã xóa file lock" -ForegroundColor Green
Write-Host ""

# Add tất cả các file đã thay đổi
Write-Host "[2/4] Add các file đã thay đổi..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Đã add files thành công" -ForegroundColor Green
} else {
    Write-Host "❌ Lỗi khi add files" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Commit với message
Write-Host "[3/4] Commit với message..." -ForegroundColor Yellow
$commitMessage = "Fix: Sửa linting warnings, cập nhật báo cáo hoàn ứng - chỉnh sửa tại phần II, status APPROVED_BRANCH_DIRECTOR tiếng Việt, badge sidebar, sửa hiển thị tổng chi phí, cho phép kinh phí đã ứng = 0"
git commit -m $commitMessage
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Đã commit thành công" -ForegroundColor Green
} else {
    Write-Host "❌ Lỗi khi commit" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Push lên git
Write-Host "[4/4] Push lên git..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Đã push thành công" -ForegroundColor Green
} else {
    Write-Host "❌ Lỗi khi push - có thể cần cấu hình credentials" -ForegroundColor Red
    Write-Host "Hãy chạy: git push origin main" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ HOÀN THÀNH COMMIT VÀ PUSH" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Bây giờ trên server, chạy:" -ForegroundColor Cyan
Write-Host "  cd /var/www/hr-management" -ForegroundColor White
Write-Host "  bash scripts/pull-only.sh" -ForegroundColor White
Write-Host ""
