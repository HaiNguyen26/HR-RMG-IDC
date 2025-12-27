#!/bin/bash

# Script to fix 413 Request Entity Too Large error for HR Management System
# This script updates nginx configuration to allow larger file uploads

echo "=========================================="
echo "Fix Nginx Upload Limit for HR Management"
echo "=========================================="
echo ""

# Nginx config file location (shared with IT-Request app)
NGINX_CONFIG="/etc/nginx/sites-available/it-request-tracking"

# Backup original config
BACKUP_FILE="/etc/nginx/sites-available/it-request-tracking.backup.$(date +%Y%m%d_%H%M%S)"
echo "📋 Creating backup: $BACKUP_FILE"
cp "$NGINX_CONFIG" "$BACKUP_FILE"

# Check if client_max_body_size already exists
if grep -q "client_max_body_size" "$NGINX_CONFIG"; then
    echo "⚠️  client_max_body_size already exists in config"
    echo "Current setting:"
    grep "client_max_body_size" "$NGINX_CONFIG"
    echo ""
    read -p "Do you want to update it? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted. No changes made."
        exit 1
    fi
    
    # Update existing client_max_body_size
    sed -i 's/client_max_body_size.*/client_max_body_size 50M;/' "$NGINX_CONFIG"
    echo "✅ Updated existing client_max_body_size to 50M"
else
    # Add client_max_body_size to server block
    # Find the server block and add it after the first line
    if grep -q "server {" "$NGINX_CONFIG"; then
        # Add after the first "server {" line
        sed -i '/^[[:space:]]*server[[:space:]]*{/a\    client_max_body_size 50M;' "$NGINX_CONFIG"
        echo "✅ Added client_max_body_size 50M to server block"
    else
        # If no server block found, add at the beginning
        sed -i '1i\client_max_body_size 50M;' "$NGINX_CONFIG"
        echo "✅ Added client_max_body_size 50M at the beginning of config"
    fi
fi

# Also add to /hr/api location block specifically
if grep -q "location /hr/api" "$NGINX_CONFIG"; then
    if ! grep -A 10 "location /hr/api" "$NGINX_CONFIG" | grep -q "client_max_body_size"; then
        # Add client_max_body_size to /hr/api location block
        sed -i '/location \/hr\/api {/a\        client_max_body_size 50M;' "$NGINX_CONFIG"
        echo "✅ Added client_max_body_size 50M to /hr/api location block"
    else
        echo "ℹ️  client_max_body_size already exists in /hr/api location block"
    fi
fi

# Test nginx configuration
echo ""
echo "🧪 Testing nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
    echo ""
    read -p "Do you want to reload nginx now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        systemctl reload nginx
        echo "✅ Nginx reloaded successfully"
        echo ""
        echo "=========================================="
        echo "✅ Configuration updated successfully!"
        echo "=========================================="
        echo ""
        echo "Changes made:"
        echo "  - client_max_body_size set to 50M"
        echo "  - Applied to server block and /hr/api location"
        echo ""
        echo "Backup saved at: $BACKUP_FILE"
        echo ""
        echo "You can now upload files up to 50MB."
    else
        echo "⚠️  Configuration updated but nginx not reloaded."
        echo "   Run 'systemctl reload nginx' manually to apply changes."
    fi
else
    echo "❌ Nginx configuration test failed!"
    echo "   Restoring backup..."
    cp "$BACKUP_FILE" "$NGINX_CONFIG"
    echo "   Backup restored. Please check the configuration manually."
    exit 1
fi

