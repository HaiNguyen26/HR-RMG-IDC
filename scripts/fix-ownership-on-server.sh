#!/bin/bash

# Script chuyển ownership database sang hr_user
# Chạy sau khi restore backup nếu gặp lỗi "must be owner of"
# Usage: ./scripts/fix-ownership-on-server.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DB_NAME="HR_Management_System"
DB_USER="hr_user"

echo -e "${BLUE}=== Fix Database Ownership ===${NC}"
echo ""

# Kiểm tra script transfer ownership
if [ ! -f "database/transfer_ownership_to_hr_user.sql" ]; then
    echo -e "${RED}✗ Script transfer_ownership_to_hr_user.sql not found${NC}"
    echo -e "${YELLOW}Please run this script from project root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}Transferring ownership to hr_user...${NC}"
echo ""

# Chạy script transfer ownership
sudo -u postgres psql -d "$DB_NAME" -f database/transfer_ownership_to_hr_user.sql 2>&1 | grep -v "NOTICE:" || true

echo ""
echo -e "${GREEN}✓ Ownership transfer completed${NC}"
echo ""

# Kiểm tra ownership
echo -e "${YELLOW}Verifying ownership...${NC}"
TABLE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tableowner = 'hr_user';" 2>/dev/null | xargs)

if [ -n "$TABLE_COUNT" ]; then
    echo -e "${GREEN}✓ $TABLE_COUNT tables owned by hr_user${NC}"
else
    echo -e "${YELLOW}⚠ Could not verify ownership${NC}"
fi

echo ""
echo -e "${GREEN}=== Done ===${NC}"
echo ""
echo "You can now test database connection:"
echo "PGPASSWORD=Hainguyen261097 psql -h localhost -U hr_user -d HR_Management_System -c \"SELECT COUNT(*) FROM employees;\""

