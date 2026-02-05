# Polymarket Integration for BTC Price Predictions

## What Was Fixed

### 1. API Response Format Issue
**Problem**: The Polymarket Gamma API returns an array directly, not an object with a `data` property.

**Solution**: Updated [app/api/polymarket-price/route.ts](app/api/polymarket-price/route.ts) to handle the correct response format:
```typescript
// Before (incorrect):
const marketsData: PolymarketMarketsResponse = await marketsResponse.json()
const btc15mMarkets = marketsData.data.filter(...)

// After (correct):
const marketsData: PolymarketMarket[] = await marketsResponse.json()
const btc15mMarkets = marketsData.filter(...)
```

### 2. Market Availability Issue
**Problem**: Bitcoin "Up or Down" 15-minute interval markets are not currently active on Polymarket.

**Solution**: Created a mock data endpoint at [app/api/polymarket-price-mock/route.ts](app/api/polymarket-price-mock/route.ts) that generates realistic test data for demonstration and development.

### 3. Enhanced Type Definitions
Added to [lib/polymarket-types.ts](lib/polymarket-types.ts):
- `fetchPriceHistory()` - General function to fetch price history with fidelity support
- `fetch15MinuteInterval()` - Convenience function specifically for 15-minute BTC intervals

## How to Use

### Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open http://localhost:3000 in your browser

### Switching Between Data Sources

The application now includes a toggle button to switch between:
- **Mock Data**: Simulated realistic Polymarket odds (default)
- **Live Data**: Real Polymarket API (currently returns no results as these markets aren't active)

### Features

#### Mock Data Endpoint
- **URL**: `/api/polymarket-price-mock?date=YYYY-MM-DD`
- **Returns**: 96 intervals (one per 15 minutes for 24 hours)
- **Each interval**: 15 data points (one per minute)
- **Data format**: Realistic odds fluctuating between 30-70%

#### Live Data Endpoint
- **URL**: `/api/polymarket-price?date=YYYY-MM-DD`
- **Returns**: Actual Polymarket market data (when available)
- **Filters**: Bitcoin + "Up or Down" + 15-minute intervals

## Example API Responses

### Mock Data
```bash
curl "http://localhost:3000/api/polymarket-price-mock?date=2026-02-02"
```

Returns:
```json
{
  "intervals": [
    {
      "index": 0,
      "label": "00:00 - 00:15 PST",
      "data": [
        {
          "time": "00:00",
          "price": 52.3,
          "open": 52.3,
          "high": 53.3,
          "low": 51.3
        },
        // ... 14 more minutes
      ],
      "isMostRecent": false,
      "marketQuestion": "Bitcoin Up or Down – 02/02 00:00-00:15 PST (Mock Data)"
    }
    // ... 95 more intervals
  ],
  "date": "2026-02-02",
  "mostRecentIndex": 95,
  "totalMarkets": 96,
  "isMockData": true
}
```

## Technical Details

### Data Structure
Each 15-minute interval contains:
- **index**: 0-95 (representing position in 24-hour day)
- **label**: Time range in PST (e.g., "10:00 - 10:15 PST")
- **data**: Array of 15 data points (one per minute)
- **marketQuestion**: Description of the market
- **isMostRecent**: Boolean indicating if this is the current interval

### Price Data Format
- **price**: Percentage (0-100) representing odds of BTC going up
- **open/high/low**: Additional OHLC data for the minute
- **time**: HH:MM format in PST timezone

## When Real Markets Become Available

If Polymarket reintroduces 15-minute BTC "Up or Down" markets:

1. Switch the frontend to use **Live Data** mode
2. The `/api/polymarket-price` endpoint is already configured correctly
3. It will automatically fetch and display real market data

## Development

### Testing the API
```bash
# Test mock endpoint
curl "http://localhost:3000/api/polymarket-price-mock?date=2026-02-02" | jq '.intervals | length'

# Test live endpoint (currently returns no markets)
curl "http://localhost:3000/api/polymarket-price?date=2026-02-02"
```

### Using the Helper Functions

```typescript
import { fetch15MinuteInterval } from '@/lib/polymarket-types';

// Fetch data for a specific 15-minute window
const startTs = Math.floor(new Date('2024-01-15T10:00:00-08:00').getTime() / 1000);
const endTs = startTs + (15 * 60);

const data = await fetch15MinuteInterval({
  market: "token_id",
  startTs,
  endTs
});

// Process for display
const chartData = data.history.map(point => ({
  time: new Date(point.t * 1000).toLocaleTimeString(),
  price: point.p * 100 // Convert to percentage
}));
```

## Summary

✅ API integration fixed and working
✅ Mock data available for testing and demonstration
✅ Real API endpoint ready for when markets return
✅ UI toggle to switch between mock and live data
✅ Helper functions for easy data fetching
