#!/bin/bash

# Script deploy HR Management System lên server
# Usage: ./scripts/deploy-hr-to-server.sh
# 
# Prerequisites:
# - SSH access to server
# - PostgreSQL installed on server
# - Node.js 18+ installed on server
# - PM2 installed globally
# - Nginx installed and configured

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SERVER_IP="27.71.16.15"
SERVER_USER="root"
PROJECT_DIR="/var/www/hr-management"
REPO_URL="https://github.com/HaiNguyen26/HR-RMG-IDC.git"
BRANCH="main"
BACKEND_PORT=3000
DB_NAME="HR_Management_System"
DB_USER="hr_user"
DB_PASSWORD="Hainguyen261097"

echo -e "${BLUE}=== Deploy HR Management System to Server ===${NC}"
echo ""
echo "Server: ${SERVER_USER}@${SERVER_IP}"
echo "Project Directory: ${PROJECT_DIR}"
echo "Repository: ${REPO_URL}"
echo "Branch: ${BRANCH}"
echo ""

# Check if running locally
if [ "$(uname -s)" != "Linux" ]; then
    echo -e "${YELLOW}⚠ This script should be run on the server.${NC}"
    echo -e "${YELLOW}You can copy this script to server and run it there, or use SSH:${NC}"
    echo ""
    echo "ssh ${SERVER_USER}@${SERVER_IP}"
    echo "cd /tmp && wget https://raw.githubusercontent.com/HaiNguyen26/HR-RMG-IDC/main/scripts/deploy-hr-to-server.sh"
    echo "chmod +x deploy-hr-to-server.sh"
    echo "./deploy-hr-to-server.sh"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 1: Check prerequisites
echo -e "${YELLOW}[1/8] Checking prerequisites...${NC}"
command -v node >/dev/null 2>&1 || { echo -e "${RED}✗ Node.js not found${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}✗ npm not found${NC}"; exit 1; }
command -v pm2 >/dev/null 2>&1 || { echo -e "${RED}✗ PM2 not found. Install: npm install -g pm2${NC}"; exit 1; }
command -v psql >/dev/null 2>&1 || { echo -e "${RED}✗ PostgreSQL client not found${NC}"; exit 1; }
echo -e "${GREEN}✓ Prerequisites OK${NC}"

# Step 2: Create project directory
echo -e "${YELLOW}[2/8] Setting up project directory...${NC}"
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}Directory exists, backing up...${NC}"
    BACKUP_DIR="${PROJECT_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    mv "$PROJECT_DIR" "$BACKUP_DIR"
    echo -e "${GREEN}✓ Backed up to ${BACKUP_DIR}${NC}"
fi
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"
echo -e "${GREEN}✓ Directory created${NC}"

# Step 3: Clone or update repository
echo -e "${YELLOW}[3/8] Cloning repository...${NC}"
if [ -d ".git" ]; then
    echo -e "${YELLOW}Repository exists, pulling latest changes...${NC}"
    git pull origin "$BRANCH"
else
    git clone -b "$BRANCH" "$REPO_URL" .
fi
echo -e "${GREEN}✓ Repository updated${NC}"

# Step 4: Install dependencies
echo -e "${YELLOW}[4/8] Installing dependencies...${NC}"
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 5: Setup database user
echo -e "${YELLOW}[5/8] Setting up database user...${NC}"
if [ -f "database/create_hr_user.sql" ]; then
    sudo -u postgres psql -f database/create_hr_user.sql
    echo -e "${GREEN}✓ Database user hr_user configured${NC}"
else
    echo -e "${YELLOW}⚠ Script create_hr_user.sql not found, creating user manually...${NC}"
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}' CREATEDB;" 2>/dev/null || echo "User may already exist"
fi

# Step 6: Setup environment variables
echo -e "${YELLOW}[6/9] Setting up environment variables...${NC}"
if [ ! -f "backend/.env" ]; then
    cat > backend/.env << EOF
NODE_ENV=production
PORT=${BACKEND_PORT}
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
EOF
    echo -e "${GREEN}✓ Created backend/.env${NC}"
else
    echo -e "${YELLOW}✓ backend/.env already exists${NC}"
fi

# Step 7: Setup database
echo -e "${YELLOW}[7/9] Setting up database...${NC}"
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${YELLOW}Database ${DB_NAME} already exists${NC}"
    # Cấp quyền owner cho hr_user
    sudo -u postgres psql -c "ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};" 2>/dev/null || true
    read -p "Do you want to restore from backup? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Tìm file backup trong /tmp
        BACKUP_FILE=$(ls -t /tmp/backup_HR_Management_System_*.sql 2>/dev/null | head -1)
        if [ -z "$BACKUP_FILE" ]; then
            read -p "Enter backup file path: " BACKUP_FILE
        else
            echo -e "${BLUE}Found backup: ${BACKUP_FILE}${NC}"
            read -p "Use this backup? (y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                read -p "Enter backup file path: " BACKUP_FILE
            fi
        fi
        if [ -f "$BACKUP_FILE" ]; then
            echo -e "${YELLOW}Restoring database from backup...${NC}"
            # Restore bằng postgres user trước (vì backup có thể có owner là postgres)
            sudo -u postgres psql -d "$DB_NAME" < "$BACKUP_FILE" 2>&1 | grep -v "ERROR:" | grep -v "WARNING:" || true
            
            echo -e "${YELLOW}Transferring ownership to hr_user...${NC}"
            # Chuyển ownership sang hr_user
            if [ -f "database/transfer_ownership_to_hr_user.sql" ]; then
                sudo -u postgres psql -d "$DB_NAME" -f database/transfer_ownership_to_hr_user.sql 2>&1 | grep -v "NOTICE:" || true
                echo -e "${GREEN}✓ Ownership transferred${NC}"
            else
                echo -e "${YELLOW}⚠ Script transfer_ownership_to_hr_user.sql not found, transferring manually...${NC}"
                # Chuyển ownership thủ công nếu không có script
                sudo -u postgres psql -d "$DB_NAME" -c "ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};" 2>/dev/null || true
                sudo -u postgres psql -d "$DB_NAME" -c "ALTER SCHEMA public OWNER TO ${DB_USER};" 2>/dev/null || true
                echo -e "${GREEN}✓ Basic ownership transferred${NC}"
            fi
            
            echo -e "${GREEN}✓ Database restored from backup and ownership transferred${NC}"
        else
            echo -e "${RED}✗ Backup file not found: ${BACKUP_FILE}${NC}"
        fi
    fi
else
    echo -e "${YELLOW}Creating database...${NC}"
    # Tạo database với owner là hr_user
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" || sudo -u postgres createdb "$DB_NAME" && sudo -u postgres psql -c "ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};"
    
    # Kiểm tra có backup không
    BACKUP_FILE=$(ls -t /tmp/backup_HR_Management_System_*.sql 2>/dev/null | head -1)
        if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
            echo -e "${BLUE}Found backup: ${BACKUP_FILE}${NC}"
            read -p "Restore from backup? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo -e "${YELLOW}Restoring database from backup...${NC}"
                # Restore bằng postgres user trước (vì backup có thể có owner là postgres)
                sudo -u postgres psql -d "$DB_NAME" < "$BACKUP_FILE" 2>&1 | grep -v "ERROR:" | grep -v "WARNING:" || true
                
                echo -e "${YELLOW}Transferring ownership to hr_user...${NC}"
                # Chuyển ownership sang hr_user
                if [ -f "database/transfer_ownership_to_hr_user.sql" ]; then
                    sudo -u postgres psql -d "$DB_NAME" -f database/transfer_ownership_to_hr_user.sql 2>&1 | grep -v "NOTICE:" || true
                    echo -e "${GREEN}✓ Ownership transferred${NC}"
                else
                    echo -e "${YELLOW}⚠ Script transfer_ownership_to_hr_user.sql not found, transferring manually...${NC}"
                    sudo -u postgres psql -d "$DB_NAME" -c "ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};" 2>/dev/null || true
                    sudo -u postgres psql -d "$DB_NAME" -c "ALTER SCHEMA public OWNER TO ${DB_USER};" 2>/dev/null || true
                    echo -e "${GREEN}✓ Basic ownership transferred${NC}"
                fi
                
                echo -e "${GREEN}✓ Database created and restored from backup${NC}"
            else
                # Import schema nếu không restore từ backup
                if [ -f "database/database_schema_postgresql.sql" ]; then
                    PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" < database/database_schema_postgresql.sql || sudo -u postgres psql -d "$DB_NAME" < database/database_schema_postgresql.sql
                    echo -e "${GREEN}✓ Database created and schema imported${NC}"
                else
                    echo -e "${YELLOW}⚠ Schema file not found. Please import manually.${NC}"
                fi
            fi
        else
            # Không có backup, import schema
            if [ -f "database/database_schema_postgresql.sql" ]; then
                PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" < database/database_schema_postgresql.sql || sudo -u postgres psql -d "$DB_NAME" < database/database_schema_postgresql.sql
                echo -e "${GREEN}✓ Database created and schema imported${NC}"
            else
                echo -e "${YELLOW}⚠ Schema file not found. Please import manually.${NC}"
            fi
        fi
    fi

    # Kiểm tra database
    echo -e "${YELLOW}Verifying database...${NC}"
    TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
if [ -n "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Database verified: ${TABLE_COUNT} tables found${NC}"
else
    echo -e "${YELLOW}⚠ Database may be empty or error occurred${NC}"
fi

# Step 8: Build frontend
echo -e "${YELLOW}[8/9] Building frontend...${NC}"
cd frontend
REACT_APP_API_URL="/hr/api" npm run build
cd ..
echo -e "${GREEN}✓ Frontend built${NC}"

# Step 9: Setup PM2
echo -e "${YELLOW}[9/9] Setting up PM2...${NC}"
if [ -f "ecosystem.hr.config.js" ]; then
    pm2 delete hr-management-api 2>/dev/null || true
    pm2 start ecosystem.hr.config.js
    pm2 save
    echo -e "${GREEN}✓ PM2 configured${NC}"
else
    echo -e "${RED}✗ ecosystem.hr.config.js not found${NC}"
fi

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Configure Nginx (see docs/DEPLOY_HR.md)"
echo "2. Test API: curl http://localhost:${BACKEND_PORT}/health"
echo "3. Check PM2: pm2 status"
echo "4. View logs: pm2 logs hr-management-api"
echo ""

