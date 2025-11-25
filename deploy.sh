#!/bin/bash

# HR Management System - Deployment Script for Ubuntu Server
# This script automates the deployment process

set -e  # Exit on error

echo "=========================================="
echo "HR Management System - Deployment Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/hr-management-system"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
DB_NAME="HR_Management_System"
DB_USER="hr_user"

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root or use sudo"
    exit 1
fi

# Step 1: Check prerequisites
print_status "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi
NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi
NPM_VERSION=$(npm --version)
print_status "npm version: $NPM_VERSION"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi
print_status "PostgreSQL is installed"

# Check PM2
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi
print_status "PM2 is installed"

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    print_error "Application directory not found: $APP_DIR"
    print_error "Please clone or copy the application to $APP_DIR first"
    exit 1
fi

cd "$APP_DIR"

# Step 2: Install dependencies
print_status "Installing dependencies..."

# Install root dependencies
if [ -f "package.json" ]; then
    print_status "Installing root dependencies..."
    npm install
fi

# Install backend dependencies
if [ -d "$BACKEND_DIR" ]; then
    print_status "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    npm install
    cd "$APP_DIR"
fi

# Install frontend dependencies
if [ -d "$FRONTEND_DIR" ]; then
    print_status "Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    npm install
    cd "$APP_DIR"
fi

# Step 3: Check environment files
print_status "Checking environment configuration..."

if [ ! -f "$BACKEND_DIR/.env" ]; then
    print_warning "Backend .env file not found. Creating from example..."
    if [ -f "$BACKEND_DIR/env.example" ]; then
        cp "$BACKEND_DIR/env.example" "$BACKEND_DIR/.env"
        print_warning "Please edit $BACKEND_DIR/.env with your configuration"
    else
        print_error "env.example not found. Please create .env manually."
        exit 1
    fi
fi

if [ ! -f "$FRONTEND_DIR/.env" ]; then
    print_warning "Frontend .env file not found."
    print_warning "Please create $FRONTEND_DIR/.env with REACT_APP_API_URL"
fi

# Step 4: Build frontend
print_status "Building frontend for production..."
cd "$FRONTEND_DIR"
npm run build

if [ ! -d "build" ]; then
    print_error "Frontend build failed. Build directory not found."
    exit 1
fi
print_status "Frontend build completed successfully"

cd "$APP_DIR"

# Step 5: Create logs directory
print_status "Creating logs directory..."
mkdir -p "$APP_DIR/logs"

# Step 6: Check database
print_status "Checking database connection..."
# Note: Database setup should be done manually before running this script

# Step 7: Stop existing PM2 processes
print_status "Stopping existing PM2 processes (if any)..."
pm2 delete hr-backend 2>/dev/null || true
pm2 delete hr-frontend 2>/dev/null || true

# Step 8: Start application with PM2
print_status "Starting application with PM2..."

if [ -f "ecosystem.config.js" ]; then
    print_status "Using ecosystem.config.js..."
    pm2 start ecosystem.config.js
else
    print_warning "ecosystem.config.js not found. Starting manually..."
    
    # Start backend
    print_status "Starting backend..."
    cd "$BACKEND_DIR"
    pm2 start server.js --name hr-backend --cwd "$BACKEND_DIR" \
        --env production --log-date-format "YYYY-MM-DD HH:mm:ss Z" \
        --error "$APP_DIR/logs/backend-error.log" \
        --output "$APP_DIR/logs/backend-out.log"
    
    # Start frontend (using serve)
    print_status "Starting frontend..."
    cd "$FRONTEND_DIR"
    pm2 start serve --name hr-frontend -- \
        -s build -l 3001 \
        --error "$APP_DIR/logs/frontend-error.log" \
        --output "$APP_DIR/logs/frontend-out.log"
fi

# Step 9: Save PM2 configuration
print_status "Saving PM2 configuration..."
pm2 save

# Step 10: Setup PM2 startup script
print_status "Setting up PM2 startup script..."
pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER || pm2 startup

# Step 11: Show status
print_status "Application deployment completed!"
echo ""
echo "=========================================="
echo "Deployment Summary"
echo "=========================================="
pm2 status
echo ""
echo "To view logs:"
echo "  pm2 logs"
echo "  pm2 logs hr-backend"
echo "  pm2 logs hr-frontend"
echo ""
echo "To restart:"
echo "  pm2 restart all"
echo ""
echo "To stop:"
echo "  pm2 stop all"
echo ""
print_status "Please check the logs if there are any issues."
print_status "Make sure your database is configured correctly in backend/.env"
print_status "Make sure your frontend API URL is configured in frontend/.env"


