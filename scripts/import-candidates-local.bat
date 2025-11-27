@echo off
REM Script import ứng viên trên Local (Windows)
REM Yêu cầu: PostgreSQL đã cài đặt và có trong PATH

echo ====================================
echo Import Danh sach Ung vien - LOCAL
echo ====================================
echo.

REM Kiểm tra xem psql có tồn tại không
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PostgreSQL chua duoc cai dat hoac chua co trong PATH
    echo Vui long cai dat PostgreSQL hoac su dung pgAdmin
    pause
    exit /b 1
)

REM Nhập thông tin database
set /p DB_NAME="Ten database (mac dinh: HR_Management_System): "
if "%DB_NAME%"=="" set DB_NAME=HR_Management_System

set /p DB_USER="User database (mac dinh: postgres): "
if "%DB_USER%"=="" set DB_USER=postgres

echo.
echo Dang import vao database: %DB_NAME%
echo User: %DB_USER%
echo.

REM Chạy file SQL
psql -U %DB_USER% -d %DB_NAME% -f "%~dp0import-candidates.sql"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================
    echo Import thanh cong!
    echo ====================================
    echo.
    echo Ban co the kiem tra ket qua bang cach chay:
    echo   psql -U %DB_USER% -d %DB_NAME% -c "SELECT COUNT(*) FROM candidates WHERE created_at ^>= CURRENT_DATE;"
) else (
    echo.
    echo ====================================
    echo Import that bai!
    echo ====================================
)

echo.
pause

