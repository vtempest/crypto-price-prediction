#!/bin/bash
# Verification script for Polymarket tests

echo "🧪 Polymarket Test Suite Verification"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Run Polymarket-specific tests
echo "📊 Running Polymarket quote tests..."
npm test -- __tests__/api/polymarket-quotes.test.ts --reporter=verbose

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Quote tests passed!${NC}"
else
    echo -e "${RED}❌ Quote tests failed!${NC}"
    exit 1
fi

echo ""
echo "📊 Running Polymarket API route tests..."
npm test -- __tests__/api/polymarket-api-routes.test.ts --reporter=verbose

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ API route tests passed!${NC}"
else
    echo -e "${RED}❌ API route tests failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 All Polymarket tests passed successfully!${NC}"
echo ""
echo "📋 Test Summary:"
echo "   - Quote functions: fetchMarketPrice, fetchOrderBook, fetchMarketQuote"
echo "   - API routes: /api/polymarket-current-odds, /api/polymarket-price"
echo "   - Coverage: Price fetching, order books, error handling, API integration"
echo ""
echo "📚 For more details, see: __tests__/POLYMARKET_TEST_SUMMARY.md"
