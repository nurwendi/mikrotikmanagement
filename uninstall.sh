#!/bin/bash

# Buroq Billing Uninstallation/Reset Script for Linux
# Usage: ./uninstall.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${RED}🗑️  Starting Buroq Billing Uninstallation...${NC}"

# Helper Function
remove_item() {
    if [ -e "$1" ]; then
        echo -e "${YELLOW}Removing $1...${NC}"
        rm -rf "$1"
    fi
}

# 1. Remove Dependencies & Build
remove_item "node_modules"
remove_item ".next"

# 2. Remove Database
remove_item "prisma/dev.db"
remove_item "prisma/dev.db-journal"

# 3. Remove Lock Files
# remove_item "package-lock.json"

# 4. Backup .env instead of deleting
if [ -f .env ]; then
    echo -e "${YELLOW}Renaming .env to .env.bak...${NC}"
    mv .env .env.bak
fi

echo -e "${GREEN}✅ Uninstallation Complete!${NC}"
echo -e "${GREEN}The application has been reset.${NC}"
