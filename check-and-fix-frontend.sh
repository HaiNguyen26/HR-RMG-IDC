#!/bin/bash
# Script kiểm tra và sửa lỗi frontend toàn diện

set -e

echo "🔍 Kiểm tra Frontend PM2..."
echo ""

# Màu sắc
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Đường dẫn
APP_DIR="/var/www/hr-rmg-idc"
FRONTEND_DIR="$APP_DIR/frontend"
CONFIG_FILE="$APP_DIR/ecosystem.config.js"

# Kiểm tra 1: File ecosystem.config.js có tồn tại không
echo "1️⃣  Kiểm tra ecosystem.config.js..."
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ File ecosystem.config.js không tồn tại!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ File tồn tại${NC}"

# Kiểm tra 2: Args có phải array không
echo ""
echo "2️⃣  Kiểm tra args trong ecosystem.config.js..."
if grep -q "args: \['-s', 'build', '-l', '3002'\]" "$CONFIG_FILE"; then
    echo -e "${GREEN}✅ Args đã đúng (array)${NC}"
    ARGS_CORRECT=true
elif grep -q "args: '-s build -l 3002'" "$CONFIG_FILE"; then
    echo -e "${RED}❌ Args đang sai (string)${NC}"
    ARGS_CORRECT=false
else
    echo -e "${YELLOW}⚠️  Không tìm thấy args, kiểm tra thủ công${NC}"
    ARGS_CORRECT=false
fi

# Sửa args nếu sai
if [ "$ARGS_CORRECT" = false ]; then
    echo ""
    echo "🔧 Đang sửa args..."
    cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    sed -i "s/args: '-s build -l 3002'/args: ['-s', 'build', '-l', '3002']/" "$CONFIG_FILE"
    echo -e "${GREEN}✅ Đã sửa args thành array${NC}"
fi

# Kiểm tra 3: Thư mục build có tồn tại không
echo ""
echo "3️⃣  Kiểm tra thư mục build..."
if [ ! -d "$FRONTEND_DIR/build" ]; then
    echo -e "${RED}❌ Thư mục build không tồn tại!${NC}"
    echo "   Đang build frontend..."
    cd "$FRONTEND_DIR"
    npm run build
    echo -e "${GREEN}✅ Đã build frontend${NC}"
else
    echo -e "${GREEN}✅ Thư mục build tồn tại${NC}"
fi

# Kiểm tra 4: serve có được cài đặt không
echo ""
echo "4️⃣  Kiểm tra serve..."
if command -v serve &> /dev/null; then
    echo -e "${GREEN}✅ serve đã được cài đặt${NC}"
    serve --version
else
    echo -e "${YELLOW}⚠️  serve chưa được cài đặt, đang cài...${NC}"
    npm install -g serve
    echo -e "${GREEN}✅ Đã cài đặt serve${NC}"
fi

# Kiểm tra 5: Port 3002 có đang được dùng không
echo ""
echo "5️⃣  Kiểm tra port 3002..."
if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Port 3002 đang được sử dụng${NC}"
    lsof -Pi :3002 -sTCP:LISTEN
    echo "   Đang dừng process đang dùng port..."
    lsof -ti :3002 | xargs kill -9 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✅ Đã giải phóng port 3002${NC}"
else
    echo -e "${GREEN}✅ Port 3002 trống${NC}"
fi

# Xóa và khởi động lại frontend
echo ""
echo "6️⃣  Dừng và xóa process frontend cũ..."
pm2 stop hr-rmg-idc-frontend 2>/dev/null || true
pm2 delete hr-rmg-idc-frontend 2>/dev/null || true
echo -e "${GREEN}✅ Đã xóa process cũ${NC}"

# Khởi động lại
echo ""
echo "7️⃣  Khởi động lại frontend..."
cd "$APP_DIR"
pm2 start ecosystem.config.js --only hr-rmg-idc-frontend

# Đợi 3 giây
sleep 3

# Kiểm tra kết quả
echo ""
echo "8️⃣  Kiểm tra kết quả..."
echo ""
pm2 list | grep hr-rmg-idc-frontend

STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="hr-rmg-idc-frontend") | .pm2_env.status' 2>/dev/null || echo "unknown")

if [ "$STATUS" = "online" ]; then
    echo ""
    echo -e "${GREEN}✅✅✅ Frontend đã chạy thành công!${NC}"
    echo ""
    echo "📋 Logs (5 dòng cuối):"
    pm2 logs hr-rmg-idc-frontend --lines 5 --nostream
else
    echo ""
    echo -e "${RED}❌ Frontend vẫn bị lỗi${NC}"
    echo ""
    echo "📋 Logs lỗi:"
    pm2 logs hr-rmg-idc-frontend --err --lines 20 --nostream
    echo ""
    echo "💡 Hãy kiểm tra log trên để tìm nguyên nhân"
fi

echo ""
echo "📝 Lệnh hữu ích:"
echo "   pm2 logs hr-rmg-idc-frontend"
echo "   pm2 list"
echo "   curl http://localhost:3002"

