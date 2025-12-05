@echo off
REM Script backup database HR_Management_System for Windows
REM Usage: scripts\backup-hr-database.bat [output_file]

setlocal enabledelayedexpansion

REM Database configuration
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=HR_Management_System
set DB_USER=postgres

REM Output file
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set mytime=!mytime: =0!
set TIMESTAMP=!mydate!_!mytime!
set OUTPUT_FILE=%~1
if "%OUTPUT_FILE%"=="" set OUTPUT_FILE=database\backup_HR_Management_System_%TIMESTAMP%.sql

echo === Backup HR Management System Database ===
echo.
echo Database: %DB_NAME%
echo Host: %DB_HOST%:%DB_PORT%
echo User: %DB_USER%
echo Output: %OUTPUT_FILE%
echo.

REM Create backup directory if not exists
if not exist "database" mkdir database

REM Check if pg_dump is available
where pg_dump >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: pg_dump not found. Please install PostgreSQL client tools.
    exit /b 1
)

REM Backup database
echo Backing up database...
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% --no-owner --no-acl --clean --if-exists -f "%OUTPUT_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Backup completed successfully!
    echo File: %OUTPUT_FILE%
    echo.
    echo To restore this backup:
    echo psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% ^< %OUTPUT_FILE%
) else (
    echo.
    echo Backup failed!
    exit /b 1
)

