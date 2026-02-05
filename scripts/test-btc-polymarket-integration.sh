#!/bin/bash
# Test script to verify BTC + Polymarket integration

echo "🧪 Testing BTC Price API with Polymarket Odds Integration"
echo ""

# Get today's date
TODAY=$(date +%Y-%m-%d)

echo "📅 Testing date: $TODAY"
echo "📊 Fetching BTC price data for interval 40 (10:00-10:15 AM PST)..."
echo ""

# Test the API
RESPONSE=$(curl -s "http://localhost:3000/api/btc-price?date=$TODAY&interval=40")

# Check if response contains data
if echo "$RESPONSE" | grep -q '"data"'; then
  echo "✅ API Response received"

  # Count total records
  TOTAL=$(echo "$RESPONSE" | grep -o '"totalRecords":[0-9]*' | cut -d: -f2)
  echo "📈 Total BTC records: $TOTAL"

  # Check for Polymarket odds in first few records
  echo ""
  echo "🔍 Checking for Polymarket odds in data..."
  echo "$RESPONSE" | head -c 2000 | grep -o '"polymarketOdds":[0-9.]*' | head -5

  if echo "$RESPONSE" | grep -q '"polymarketOdds":[0-9]'; then
    echo ""
    echo "✅ SUCCESS: Polymarket odds are included in BTC price data!"

    # Count how many records have Polymarket odds
    ODDS_COUNT=$(echo "$RESPONSE" | grep -o '"polymarketOdds":[0-9]' | wc -l)
    echo "📊 Records with Polymarket odds: $ODDS_COUNT"
  else
    echo ""
    echo "⚠️  WARNING: No Polymarket odds found in response"
    echo "This might be expected if:"
    echo "  - No Polymarket market exists for this interval"
    echo "  - The interval is in the future"
    echo "  - Polymarket API is unavailable"
  fi
else
  echo "❌ ERROR: No data in API response"
  echo "$RESPONSE" | head -c 500
fi

echo ""
echo "✅ Test complete"
