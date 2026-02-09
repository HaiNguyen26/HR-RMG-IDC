# Script: Push code thêm cột Ngày tạo phiếu
# Cách dùng: .\scripts\push-add-date-column.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Blue
Write-Host "PUSH CODE THÊM CỘT NGÀY TẠO PHIẾU" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# 1. Xóa file lock nếu có
Write-Host "[1/4] Xóa file lock..." -ForegroundColor Yellow
if (Test-Path ".git\index.lock") {
    Remove-Item -Path ".git\index.lock" -Force -ErrorAction SilentlyContinue
    Write-Host "Đã xóa file lock" -ForegroundColor Green
}
Start-Sleep -Seconds 2
Write-Host ""

# 2. Add file
Write-Host "[2/4] Add file..." -ForegroundColor Yellow
git add frontend/src/components/CustomerEntertainmentExpense/CustomerEntertainmentExpenseAccountant.js
Write-Host "Đã add file" -ForegroundColor Green
Write-Host ""

# 3. Commit
Write-Host "[3/4] Commit..." -ForegroundColor Yellow
git commit -m "Add: Thêm cột Ngày tạo phiếu vào Báo cáo Tổng hợp Quyết toán Chi phí"
Write-Host "Đã commit" -ForegroundColor Green
Write-Host ""

# 4. Push
Write-Host "[4/4] Push..." -ForegroundColor Yellow
git push origin main
Write-Host "Đã push" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ HOÀN TẤT" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
