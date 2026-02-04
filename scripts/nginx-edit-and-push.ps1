# Script: Tự động đảm bảo block Nginx HR đúng, commit và push lên git
# Chạy trên máy local (PowerShell): .\scripts\nginx-edit-and-push.ps1

$ErrorActionPreference = "Stop"

$ProjectDir = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $ProjectDir ".git"))) {
    $ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

Set-Location $ProjectDir

Write-Host "========================================" -ForegroundColor Blue
Write-Host "NGINX EDIT BLOCK & PUSH GIT" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

$nginxPath = Join-Path $ProjectDir "nginx\hr-management.conf"
if (-not (Test-Path $nginxPath)) {
    Write-Host "Không tìm thấy nginx/hr-management.conf" -ForegroundColor Red
    exit 1
}

$content = Get-Content $nginxPath -Raw
if ($content -notmatch "client_max_body_size") {
    Write-Host "Chưa có client_max_body_size trong nginx config." -ForegroundColor Yellow
    exit 1
}
if ($content -notmatch "Prevent caching of HTML") {
    Write-Host "Chưa có block prevent cache HTML." -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/3] Nginx block HR OK (client_max_body_size, cache prevention)" -ForegroundColor Green
Write-Host ""

Write-Host "[2/3] Git add & commit..." -ForegroundColor Yellow
git add nginx/ scripts/ docs/ 2>$null
git add -u nginx/ scripts/ docs/ 2>$null

$status = git status --short nginx/ scripts/ docs/ 2>$null
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "Không có thay đổi để commit." -ForegroundColor Yellow
} else {
    git commit -m "Nginx: client_max_body_size 100M, prevent cache HTML cho /hr"
    Write-Host "Da commit." -ForegroundColor Green
}
Write-Host ""

Write-Host "[3/3] Push len git..." -ForegroundColor Yellow
git push origin main
Write-Host "Da push len origin main" -ForegroundColor Green
Write-Host ""
Write-Host "XONG. Tren server chay: bash scripts/on-server-pull-and-apply-nginx.sh" -ForegroundColor Green
