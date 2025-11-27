#!/bin/bash

# Script xóa các file hướng dẫn cũ trên server
# Chạy trên server: bash cleanup-old-server.sh

echo "🗑️  Đang xóa các file hướng dẫn cũ..."

# Thư mục app cũ (nếu có)
OLD_APP_DIR="/var/www/hr-management-system"

if [ -d "$OLD_APP_DIR" ]; then
    echo "📂 Tìm thấy thư mục app cũ: $OLD_APP_DIR"
    echo "   Xóa các file hướng dẫn cũ..."
    
    cd $OLD_APP_DIR
    rm -f DEPLOY_NOW.md PUSH_TO_GITHUB.md QUICK_DEPLOY.md 2>/dev/null || true
    rm -rf docs/DEPLOYMENT_QUICK_START.md docs/DEPLOYMENT_STEP_BY_STEP.md 2>/dev/null || true
    
    echo "   ✅ Đã xóa file hướng dẫn cũ"
else
    echo "   ℹ️  Không tìm thấy thư mục app cũ"
fi

# Thư mục app mới
NEW_APP_DIR="/var/www/hr-rmg-idc"

if [ -d "$NEW_APP_DIR" ]; then
    echo "📂 Thư mục app mới: $NEW_APP_DIR"
    echo "   Xóa các file hướng dẫn cũ..."
    
    cd $NEW_APP_DIR
    rm -f DEPLOY_NOW.md PUSH_TO_GITHUB.md QUICK_DEPLOY.md 2>/dev/null || true
    
    echo "   ✅ Đã dọn dẹp file hướng dẫn cũ"
fi

echo ""
echo "✅ Hoàn thành!"

