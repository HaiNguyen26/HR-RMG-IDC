#!/bin/bash

# Script sửa lỗi database password

echo "=========================================="
echo "Sửa Lỗi Database Password"
echo "=========================================="

# 1. Kiểm tra file .env
echo ""
echo "[1/3] Kiểm tra file .env..."
ENV_FILE="/var/www/hr-rmg-idc/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "  ❌ File .env không tồn tại!"
    echo "  → Tạo file .env theo hướng dẫn trong DEPLOY_HR_CLEAN.md"
    exit 1
fi

echo "  ✅ File .env tồn tại"

# 2. Kiểm tra DB_PASSWORD
echo ""
echo "[2/3] Kiểm tra DB_PASSWORD..."
if grep -q "^DB_PASSWORD=" "$ENV_FILE"; then
    DB_PASSWORD=$(grep "^DB_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2-)
    
    # Kiểm tra password có trong dấu ngoặc kép không
    if [[ "$DB_PASSWORD" =~ ^\".*\"$ ]] || [[ "$DB_PASSWORD" =~ ^\'.*\'$ ]]; then
        echo "  ⚠️  Password có dấu ngoặc kép - Có thể gây lỗi"
        echo "  → Password phải là string không có dấu ngoặc kép"
        echo ""
        echo "  Ví dụ SAI:"
        echo "    DB_PASSWORD=\"mypassword\""
        echo "    DB_PASSWORD='mypassword'"
        echo ""
        echo "  Ví dụ ĐÚNG:"
        echo "    DB_PASSWORD=mypassword"
        echo ""
        read -p "  Bạn có muốn sửa password? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "  → Mở file để sửa: nano $ENV_FILE"
            echo "  → Xóa dấu ngoặc kép khỏi DB_PASSWORD"
        fi
    else
        echo "  ✅ Password không có dấu ngoặc kép"
    fi
    
    # Kiểm tra password có rỗng không
    if [ -z "$DB_PASSWORD" ]; then
        echo "  ❌ Password rỗng!"
        echo "  → Cần set password trong .env"
    else
        echo "  ✅ Password đã được set"
    fi
else
    echo "  ❌ Không tìm thấy DB_PASSWORD trong .env"
    echo "  → Cần thêm: DB_PASSWORD=your_password"
fi

# 3. Kiểm tra các biến database khác
echo ""
echo "[3/3] Kiểm tra các biến database khác..."
REQUIRED_VARS=("DB_HOST" "DB_PORT" "DB_NAME" "DB_USER" "DB_PASSWORD")

for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${var}=" "$ENV_FILE"; then
        echo "  ✅ $var đã được set"
    else
        echo "  ❌ THIẾU $var"
    fi
done

echo ""
echo "=========================================="
echo "Hướng Dẫn Sửa"
echo "=========================================="
echo ""
echo "1. Mở file .env:"
echo "   nano $ENV_FILE"
echo ""
echo "2. Đảm bảo có các dòng sau (KHÔNG có dấu ngoặc kép):"
echo "   DB_HOST=localhost"
echo "   DB_PORT=5432"
echo "   DB_NAME=HR_Management_System"
echo "   DB_USER=postgres"
echo "   DB_PASSWORD=your_actual_password"
echo ""
echo "3. Lưu file: Ctrl+O, Enter, Ctrl+X"
echo ""
echo "4. Restart backend:"
echo "   pm2 restart hr-rmg-idc-backend"
echo ""
echo "5. Kiểm tra lại:"
echo "   curl http://localhost:3001/api/employees"
echo ""

