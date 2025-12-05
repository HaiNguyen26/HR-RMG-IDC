#!/bin/bash
# ============================================================
# Script Pull Code từ Git và Cập nhật trên Server
# ============================================================
# 
# Script này sẽ:
# 1. Dừng ứng dụng HR (PM2)
# 2. Pull code mới nhất từ Git
# 3. Cài đặt dependencies (nếu có thay đổi)
# 4. Build frontend (nếu có thay đổi)
# 5. Khởi động lại ứng dụng HR
# ============================================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=========================================="
echo "PULL CODE TỪ GIT VÀ CẬP NHẬT"
echo "=========================================="
echo ""

cd "$PROJECT_DIR"

# Kiểm tra xem có phải git repository không
if [ ! -d ".git" ]; then
    echo "✗ Thư mục hiện tại không phải là git repository!"
    exit 1
fi

# Lưu branch hiện tại
CURRENT_BRANCH=$(git branch --show-current)
echo "Branch hiện tại: $CURRENT_BRANCH"
echo ""

# Dừng ứng dụng HR (PM2)
echo "=========================================="
echo "Dừng ứng dụng HR..."
echo "=========================================="
if pm2 list | grep -q "hr-backend\|hr-frontend"; then
    pm2 stop hr-backend 2>/dev/null || true
    pm2 stop hr-frontend 2>/dev/null || true
    echo "✓ Đã dừng ứng dụng HR"
else
    echo "⚠ Không tìm thấy ứng dụng HR trong PM2"
fi
echo ""

# Pull code từ Git
echo "=========================================="
echo "Pull code từ Git..."
echo "=========================================="
git fetch origin
git pull origin "$CURRENT_BRANCH"

if [ $? -eq 0 ]; then
    echo "✓ Đã pull code thành công"
else
    echo "✗ Lỗi khi pull code"
    exit 1
fi
echo ""

# Kiểm tra thay đổi trong package.json để cài đặt dependencies
echo "=========================================="
echo "Kiểm tra và cài đặt dependencies..."
echo "=========================================="

# Backend dependencies
if [ -f "backend/package.json" ]; then
    cd "$PROJECT_DIR/backend"
    echo "Cài đặt backend dependencies..."
    npm install
    echo "✓ Backend dependencies đã được cài đặt"
fi

# Frontend dependencies
if [ -f "frontend/package.json" ]; then
    cd "$PROJECT_DIR/frontend"
    echo "Cài đặt frontend dependencies..."
    npm install
    echo "✓ Frontend dependencies đã được cài đặt"
fi

echo ""

# Build frontend
echo "=========================================="
echo "Build frontend..."
echo "=========================================="
cd "$PROJECT_DIR/frontend"
npm run build

if [ $? -eq 0 ]; then
    echo "✓ Đã build frontend thành công"
else
    echo "✗ Lỗi khi build frontend"
    exit 1
fi
echo ""

# Khởi động lại ứng dụng HR
echo "=========================================="
echo "Khởi động lại ứng dụng HR..."
echo "=========================================="
cd "$PROJECT_DIR"
if [ -f "ecosystem.config.js" ]; then
    pm2 restart hr-backend
    pm2 restart hr-frontend
    pm2 save
    echo "✓ Đã khởi động lại ứng dụng HR"
else
    echo "⚠ Không tìm thấy ecosystem.config.js, vui lòng khởi động thủ công"
fi

echo ""
echo "=========================================="
echo "HOÀN TẤT!"
echo "=========================================="
echo "Code đã được cập nhật thành công."
echo "Kiểm tra logs: pm2 logs hr-backend"
echo "=========================================="

