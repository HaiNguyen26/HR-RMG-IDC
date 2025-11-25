#!/bin/bash

# HR Management System - Update Script
# Script này giúp cập nhật code mới lên server đã deploy

set -e  # Exit on error

echo "=========================================="
echo "HR Management System - Update Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/hr-management-system"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
DB_NAME="HR_Management_System"
DB_USER="hr_user"
BACKUP_DIR="/var/backups/hr-db"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    print_warning "Some operations may require sudo. Continuing anyway..."
fi

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    print_error "Application directory not found: $APP_DIR"
    exit 1
fi

cd "$APP_DIR"

# Step 1: Backup Database
print_step "Step 1: Backup Database"
print_warning "Creating database backup before update..."

mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/backup_before_update_$(date +%Y%m%d_%H%M%S).sql"

if command -v pg_dump &> /dev/null; then
    if pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null; then
        print_status "Database backup created: $BACKUP_FILE"
    else
        print_warning "Failed to create database backup. Continuing anyway..."
        print_warning "You may need to backup manually: pg_dump -U $DB_USER -d $DB_NAME > backup.sql"
    fi
else
    print_warning "pg_dump not found. Skipping database backup."
    print_warning "Please backup manually before continuing!"
    read -p "Continue without backup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Update cancelled."
        exit 1
    fi
fi

# Step 2: Pull Code
print_step "Step 2: Pull Latest Code"

if [ -d ".git" ]; then
    print_status "Git repository found. Pulling latest code..."
    
    # Check if there are uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "You have uncommitted changes!"
        git status
        read -p "Stash changes and continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git stash
            print_status "Changes stashed."
        else
            print_error "Update cancelled. Please commit or stash your changes first."
            exit 1
        fi
    fi
    
    # Pull latest code
    print_status "Pulling from repository..."
    if git pull; then
        print_status "Code updated successfully."
    else
        print_error "Failed to pull code. Please check manually."
        exit 1
    fi
else
    print_warning "Git repository not found. Skipping git pull."
    print_warning "Please update code manually (upload new files or clone repository)."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Update cancelled."
        exit 1
    fi
fi

# Step 3: Check for Environment Variable Changes
print_step "Step 3: Check Environment Variables"

if [ -f "$BACKEND_DIR/env.example" ] && [ -f "$BACKEND_DIR/.env" ]; then
    print_status "Checking backend environment variables..."
    # Simple diff check
    if ! diff -q "$BACKEND_DIR/env.example" "$BACKEND_DIR/.env" > /dev/null 2>&1; then
        print_warning "env.example has changed. Please review and update .env if needed."
        echo "Files to check:"
        echo "  - $BACKEND_DIR/env.example"
        echo "  - $BACKEND_DIR/.env"
    fi
fi

if [ -f "$FRONTEND_DIR/.env.example" ] && [ -f "$FRONTEND_DIR/.env" ]; then
    print_status "Checking frontend environment variables..."
    if ! diff -q "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env" > /dev/null 2>&1; then
        print_warning "Frontend .env.example has changed. Please review and update .env if needed."
    fi
fi

# Step 4: Update Dependencies
print_step "Step 4: Update Dependencies"

# Root dependencies
if [ -f "package.json" ]; then
    print_status "Updating root dependencies..."
    npm install --production=false
fi

# Backend dependencies
if [ -d "$BACKEND_DIR" ] && [ -f "$BACKEND_DIR/package.json" ]; then
    print_status "Updating backend dependencies..."
    cd "$BACKEND_DIR"
    npm install --production=false
    cd "$APP_DIR"
fi

# Frontend dependencies
if [ -d "$FRONTEND_DIR" ] && [ -f "$FRONTEND_DIR/package.json" ]; then
    print_status "Updating frontend dependencies..."
    cd "$FRONTEND_DIR"
    npm install --production=false
    cd "$APP_DIR"
fi

# Step 5: Check for Database Migrations
print_step "Step 5: Check for Database Migrations"

if [ -d "$APP_DIR/database" ]; then
    MIGRATION_FILES=$(find "$APP_DIR/database" -name "*.sql" -type f | wc -l)
    if [ "$MIGRATION_FILES" -gt 0 ]; then
        print_warning "Found SQL files in database directory."
        print_warning "Please review and run migrations manually if needed:"
        echo "  psql -U $DB_USER -d $DB_NAME -f database/migration_file.sql"
        
        read -p "Do you want to list migration files? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ls -la "$APP_DIR/database"/*.sql
        fi
    fi
fi

# Step 6: Build Frontend
print_step "Step 6: Build Frontend"

if [ -d "$FRONTEND_DIR" ]; then
    print_status "Building frontend for production..."
    cd "$FRONTEND_DIR"
    
    if npm run build; then
        if [ -d "build" ]; then
            print_status "Frontend build completed successfully."
        else
            print_error "Frontend build directory not found. Build may have failed."
            exit 1
        fi
    else
        print_error "Frontend build failed. Please check errors above."
        exit 1
    fi
    
    cd "$APP_DIR"
else
    print_error "Frontend directory not found: $FRONTEND_DIR"
    exit 1
fi

# Step 7: Restart Application
print_step "Step 7: Restart Application"

if command -v pm2 &> /dev/null; then
    print_status "Restarting application with PM2..."
    
    # Check if processes are running
    if pm2 list | grep -q "hr-backend\|hr-frontend"; then
        print_status "Restarting PM2 processes..."
        pm2 restart all
        
        # Wait a moment
        sleep 3
        
        # Check status
        print_status "Checking PM2 status..."
        pm2 status
        
        print_status "Application restarted successfully."
    else
        print_warning "PM2 processes not found. Starting with ecosystem.config.js..."
        if [ -f "ecosystem.config.js" ]; then
            pm2 start ecosystem.config.js
            pm2 save
        else
            print_warning "ecosystem.config.js not found. Please start manually."
        fi
    fi
else
    print_error "PM2 not found. Please restart application manually."
    print_error "Or install PM2: sudo npm install -g pm2"
fi

# Step 8: Summary
echo ""
echo "=========================================="
print_step "Update Summary"
echo "=========================================="
echo ""

print_status "Update process completed!"
echo ""
echo "Next steps:"
echo "  1. Check application logs: pm2 logs"
echo "  2. Test the application: http://your-domain.com"
echo "  3. Check for errors in browser console"
echo "  4. Test all major functionalities"
echo ""

if [ -f "$BACKUP_FILE" ]; then
    echo "Database backup saved at: $BACKUP_FILE"
    echo ""
fi

print_status "If you encounter any issues, you can:"
echo "  1. Check logs: pm2 logs"
echo "  2. Restart services: pm2 restart all"
echo "  3. Rollback code if needed: git reset --hard <previous-commit>"
echo "  4. Restore database if needed: psql -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
echo ""

print_status "Update completed successfully! 🎉"


