#!/bin/bash
# Quick debug script to test Polymarket API

echo "🔍 Testing Polymarket API..."
echo ""

# Start dev server in background
echo "Starting dev server..."
npm run dev > /dev/null 2>&1 &
DEV_PID=$!

# Wait for server to start
sleep 8

echo "Testing API endpoint..."
echo ""

# Test for today's date
TODAY=$(date +%Y-%m-%d)
echo "📅 Testing date: $TODAY, interval: 0"
curl -s "http://localhost:3000/api/polymarket-price?date=$TODAY&interval=0" | head -100

echo ""
echo ""
echo "📅 Testing current odds:"
curl -s "http://localhost:3000/api/polymarket-current-odds" | head -50

# Kill dev server
kill $DEV_PID 2>/dev/null

echo ""
echo "✅ Test complete"
