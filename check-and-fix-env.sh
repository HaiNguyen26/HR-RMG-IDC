#!/bin/bash

# Script kiểm tra và sửa file .env

echo "=========================================="
echo "Kiểm Tra Và Sửa File .env"
echo "=========================================="

ENV_FILE="/var/www/hr-rmg-idc/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ File .env không tồn tại: $ENV_FILE"
    echo ""
    echo "Tạo file .env:"
    echo "  cd /var/www/hr-rmg-idc/backend"
    echo "  nano .env"
    exit 1
fi

echo ""
echo "File .env hiện tại:"
echo "=========================================="
cat "$ENV_FILE"
echo "=========================================="
echo ""

# Kiểm tra DB_PASSWORD
echo "Kiểm tra DB_PASSWORD:"
DB_PASSWORD_LINE=$(grep "^DB_PASSWORD=" "$ENV_FILE" || echo "")

if [ -z "$DB_PASSWORD_LINE" ]; then
    echo "  ❌ Không tìm thấy DB_PASSWORD"
    echo "  → Cần thêm: DB_PASSWORD=your_password"
else
    echo "  ✅ Tìm thấy: $DB_PASSWORD_LINE"
    
    # Extract password value
    DB_PASSWORD_VALUE=$(echo "$DB_PASSWORD_LINE" | cut -d'=' -f2-)
    
    # Kiểm tra có dấu ngoặc kép không
    if [[ "$DB_PASSWORD_VALUE" =~ ^\".*\"$ ]] || [[ "$DB_PASSWORD_VALUE" =~ ^\'.*\'$ ]]; then
        echo "  ❌ Password có dấu ngoặc kép: $DB_PASSWORD_VALUE"
        echo "  → Cần xóa dấu ngoặc kép"
    else
        echo "  ✅ Password không có dấu ngoặc kép"
    fi
    
    # Kiểm tra password rỗng
    if [ -z "$DB_PASSWORD_VALUE" ]; then
        echo "  ❌ Password rỗng!"
        echo "  → Cần set password"
    else
        echo "  ✅ Password đã được set"
    fi
fi

echo ""
echo "=========================================="
echo "Hướng Dẫn Sửa"
echo "=========================================="
echo ""
echo "1. Mở file .env:"
echo "   nano $ENV_FILE"
echo ""
echo "2. Tìm dòng DB_PASSWORD và sửa:"
echo ""
echo "   Nếu có dấu ngoặc kép, xóa chúng:"
echo "   SAI:  DB_PASSWORD=\"mypassword\""
echo "   SAI:  DB_PASSWORD='mypassword'"
echo "   ĐÚNG: DB_PASSWORD=mypassword"
echo ""
echo "   Nếu password có ký tự đặc biệt, giữ nguyên (không cần escape):"
echo "   DB_PASSWORD=my@pass#123"
echo ""
echo "3. Đảm bảo các biến khác cũng đúng:"
echo "   DB_HOST=localhost"
echo "   DB_PORT=5432"
echo "   DB_NAME=HR_Management_System"
echo "   DB_USER=postgres"
echo ""
echo "4. Lưu file: Ctrl+O, Enter, Ctrl+X"
echo ""
echo "5. Restart backend:"
echo "   pm2 restart hr-rmg-idc-backend"
echo ""
echo "6. Kiểm tra logs:"
echo "   pm2 logs hr-rmg-idc-backend --lines 20"
echo ""

