# Polymarket Odds Integration Guide

This application now fetches and displays **real-time Polymarket odds** for BTC 15-minute "Up or Down" prediction markets.

## Overview

The app fetches Polymarket odds in two ways:

### 1. **Current Odds Summary** (New!)
   - **Endpoint**: `/api/polymarket-current-odds`
   - **Component**: `PolymarketOddsSummary`
   - **What it does**: Fetches the latest price/odds for all active BTC markets
   - **Auto-refreshes**: Every 60 seconds
   - **Displays**:
     - Up odds (% probability BTC goes up)
     - Down odds (% probability BTC goes down)
     - Upcoming 6 intervals
     - Bullish vs Bearish count

### 2. **Historical Odds** (Existing)
   - **Endpoint**: `/api/polymarket-price`
   - **What it does**: Fetches minute-by-minute odds history for each 15-minute interval
   - **Displays**:
     - Chart showing how odds changed over time
     - Start odds, end odds, and change

## How Polymarket Odds Work

### Understanding the Odds
- **Odds = Price** in prediction markets
- Range: 0% to 100%
- **Up odds of 65%** means: Market thinks there's a 65% chance BTC will be higher at the end of the interval
- **Down odds of 35%** means: Market thinks there's a 35% chance BTC will be lower
- Up + Down odds ≈ 100% (may vary slightly due to market spreads)

### What's Being Fetched

#### From Gamma API (`https://gamma-api.polymarket.com`)
```typescript
// Find BTC "Up or Down" markets
GET /markets?closed=false&active=true&limit=2000

// Response includes:
{
  id: "market-id",
  question: "Bitcoin Up or Down – 02/04 10:00-10:15 AM PST",
  clobTokenIds: ["token-id-up", "token-id-down"],
  active: true,
  closed: false,
  endDate: "2026-02-04T10:15:00Z"
}
```

#### From CLOB API (`https://clob.polymarket.com`)
```typescript
// Get current price/odds
GET /price?token_id=TOKEN_ID&side=buy

// Response:
{
  price: "0.65" // 0.65 = 65% odds
}

// Get historical prices
GET /prices-history?market=TOKEN_ID&startTs=START&endTs=END&fidelity=1

// Response:
{
  history: [
    { t: 1738594800, p: 0.65 }, // timestamp (seconds), price (0-1)
    { t: 1738594860, p: 0.67 },
    ...
  ]
}
```

## API Endpoints

### `/api/polymarket-current-odds`
**Purpose**: Get current odds for all active BTC markets

**Query Parameters**: None

**Response**:
```json
{
  "markets": [
    {
      "marketId": "123456",
      "question": "Bitcoin Up or Down – 02/04 10:00-10:15 AM PST",
      "intervalIndex": 40,
      "intervalLabel": "10:00-10:15 AM",
      "upOdds": 65.5,
      "downOdds": 34.5,
      "upTokenId": "token-up",
      "downTokenId": "token-down",
      "endDate": "2026-02-04T10:15:00Z",
      "isActive": true
    }
  ],
  "count": 24,
  "timestamp": "2026-02-04T09:45:00Z"
}
```

**Use Case**: Display a summary of upcoming predictions

### `/api/polymarket-price?date=YYYY-MM-DD`
**Purpose**: Get historical odds for all intervals on a specific date

**Query Parameters**:
- `date` (required): Date in YYYY-MM-DD format

**Response**:
```json
{
  "intervals": [
    {
      "index": 40,
      "label": "10:00 - 10:15 PST",
      "data": [
        { "time": "10:00", "price": 65.5 },
        { "time": "10:01", "price": 66.0 },
        ...
      ],
      "marketQuestion": "Bitcoin Up or Down – 02/04 10:00-10:15 AM PST"
    }
  ]
}
```

**Use Case**: Display charts showing how odds changed during each interval

## Components

### `PolymarketOddsSummary`
Located at: `components/polymarket-odds-summary.tsx`

**Features**:
- Auto-refreshes every 60 seconds
- Shows upcoming 6 intervals
- Highlights high-confidence predictions (>20% spread)
- Shows bullish vs bearish count
- Responsive design

**Usage**:
```tsx
import { PolymarketOddsSummary } from '@/components/polymarket-odds-summary'

<PolymarketOddsSummary
  autoRefresh={true}
  refreshInterval={60000} // 1 minute
/>
```

**Props**:
- `autoRefresh` (boolean, default: `true`): Enable auto-refresh
- `refreshInterval` (number, default: `60000`): Refresh interval in milliseconds

## Data Flow

```
1. User opens app
   ↓
2. PolymarketOddsSummary component loads
   ↓
3. Fetches /api/polymarket-current-odds
   ↓
4. API calls Gamma API to find active BTC markets
   ↓
5. For each market:
   - Extract token IDs (Up and Down)
   - Call CLOB API to get current price
   - Calculate odds (price × 100)
   ↓
6. Return sorted list of markets with current odds
   ↓
7. Component displays odds, auto-refreshes every 60s
```

## Understanding the Display

### Color Coding
- **Green background**: Up is favored (Up odds > Down odds)
- **Red background**: Down is favored (Down odds > Up odds)
- **Purple background**: High confidence (>20% spread)

### Interval Index
- Ranges from 0-95 (96 intervals per day)
- Index 40 = 10:00-10:15 AM (PST)
- Index 0 = 12:00-12:15 AM (PST)

### Odds Interpretation
| Up Odds | Down Odds | Interpretation |
|---------|-----------|----------------|
| 65% | 35% | Moderate bullish |
| 75% | 25% | Strong bullish |
| 85% | 15% | Very strong bullish |
| 35% | 65% | Moderate bearish |
| 25% | 75% | Strong bearish |
| 50% | 50% | Neutral / uncertain |

## Switching Between Live and Mock Data

In the main page ([page.tsx](app/page.tsx)), there's a toggle:

```tsx
const [useMockData, setUseMockData] = useState(true)
```

**To use LIVE Polymarket data**:
1. Change `useState(true)` to `useState(false)`
2. Or click "Switch to Live" button in the UI

**Note**: Mock data is useful when:
- Testing the UI
- Polymarket doesn't have active markets
- You're offline

## Troubleshooting

### "No active BTC 15-minute markets found"
- Polymarket may not have created markets yet for today/tomorrow
- Markets are typically created closer to the trading day
- Check directly on [polymarket.com](https://polymarket.com)

### Odds showing 0% or not loading
- Check browser console for errors
- Verify the CLOB API is accessible
- Token IDs might have changed (Polymarket updates markets)

### Auto-refresh not working
- Check the `refreshInterval` prop
- Verify component is still mounted
- Check browser console for fetch errors

## API Rate Limits

Be aware of:
- Gamma API: No official limit, but use reasonable refresh intervals
- CLOB API: No official limit, but avoid excessive requests
- Recommended: 60-second refresh interval for production

## Example: Using the Odds in Your Code

```typescript
// Fetch current odds
const response = await fetch('/api/polymarket-current-odds')
const data = await response.json()

// Find next interval
const now = new Date()
const currentIntervalIndex = Math.floor((now.getHours() * 60 + now.getMinutes()) / 15)
const nextMarket = data.markets.find(m => m.intervalIndex === currentIntervalIndex + 1)

if (nextMarket) {
  console.log(`Next interval: ${nextMarket.intervalLabel}`)
  console.log(`Up odds: ${nextMarket.upOdds}%`)
  console.log(`Down odds: ${nextMarket.downOdds}%`)

  // Make a decision based on odds
  if (nextMarket.upOdds > 60) {
    console.log('Market is bullish!')
  } else if (nextMarket.downOdds > 60) {
    console.log('Market is bearish!')
  } else {
    console.log('Market is uncertain')
  }
}
```

## Further Reading

- [Polymarket API Documentation](https://docs.polymarket.com)
- [Gamma API Reference](https://gamma-api.polymarket.com)
- [CLOB API Reference](https://docs.polymarket.com)

## Summary

✅ **What you now have**:
- Real-time Polymarket odds fetching
- Auto-refreshing odds summary component
- Two API endpoints (current + historical)
- Visual display of Up/Down predictions
- Bullish/Bearish sentiment tracking

🎯 **Key takeaway**: The "odds" are the market's collective prediction of whether BTC will go up or down in each 15-minute interval. Higher odds = higher confidence.
