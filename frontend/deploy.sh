#!/bin/bash

# AgentForge Arena - Production Deployment Script
# Date: November 5, 2025
# Status: All Somnia URLs verified and corrected

echo "🚀 AgentForge Arena - Production Deployment"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Verify we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Not in frontend directory${NC}"
    echo "Please run: cd frontend && ./deploy.sh"
    exit 1
fi

echo -e "${YELLOW}Step 1: Running build verification...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed! Please fix errors before deploying.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"
echo ""

echo -e "${YELLOW}Step 2: Deploying to Vercel...${NC}"
vercel --prod

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "🎉 SUCCESS! Your app is now live."
echo ""
echo "📝 Post-Deployment Checklist:"
echo "  1. ☐ Click an agent card mint tx link"
echo "  2. ☐ Complete a round and click resolve tx link"
echo "  3. ☐ Win and click claim tx link"
echo "  4. ☐ Verify all links open: https://shannon-explorer.somnia.network"
echo ""
echo "🌐 Somnia Explorer: https://shannon-explorer.somnia.network"
echo "🔗 Testnet Chain ID: 50312"
echo "💰 Currency: STT"
echo ""
echo "Happy deploying! 🚀"
