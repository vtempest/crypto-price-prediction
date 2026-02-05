# Polymarket Test Scripts

This directory contains test scripts for fetching and searching Bitcoin markets on Polymarket. Each script demonstrates different ways to interact with the Polymarket API.

## 📋 Available Scripts

### 1. `test-bitcoin-market-search.ts` (Comprehensive)
**Most complete test suite** - Tests multiple search methods and generates detailed statistics.

**Features**:
- 5 different search methods
- Color-coded terminal output
- Volume analysis
- Market categorization (Up/Down, Price Target, Range, etc.)
- Summary statistics
- Upcoming markets timeline

**Run**:
```bash
npx ts-node scripts/test-bitcoin-market-search.ts
```

**Output**:
- Detailed market information
- Search results from multiple endpoints
- Statistics and summaries
- ~2-3 minutes to complete (fetches from multiple endpoints)

---

### 2. `quick-btc-search.ts` (Simple & Fast)
**Quick search** - Fast and simple search with clean output.

**Features**:
- Single search endpoint
- Clean, readable output
- Active vs closed market separation
- Custom search queries
- Fast execution (~5 seconds)

**Run**:
```bash
# Default search (bitcoin)
npx ts-node scripts/quick-btc-search.ts

# Custom search query
npx ts-node scripts/quick-btc-search.ts "btc price"
npx ts-node scripts/quick-btc-search.ts "bitcoin 100k"
```

**Output**:
```
✅ Found 24 markets

🟢 ACTIVE MARKETS
1. Bitcoin Up or Down – 02/04 10:00-10:15 AM PST
   Market ID: 123456
   Ends: 2/4/2026, 10:15:00 AM
   Current Odds:
     Up: 65.5%
     Down: 34.5%
```

---

### 3. `test-btc-updown-markets.ts` (Specialized)
**BTC "Up or Down" markets only** - Focused on 15-minute prediction markets.

**Features**:
- Filters specifically for "Up or Down" markets
- Parses interval times
- Calculates interval indices (0-95)
- Shows upcoming vs past markets
- Sentiment analysis (bullish vs bearish)
- Time coverage analysis

**Run**:
```bash
npx ts-node scripts/test-btc-updown-markets.ts
```

**Output**:
```
🎲 Found 24 BTC "Up or Down" markets

🔮 UPCOMING MARKETS (Next 10)
1. Interval #41 (10:00 AM)
   Current Odds:
     UP:   65.5% ✅
     DOWN: 34.5%
     🔥 High confidence (31.0% spread)

📈 STATISTICS
Markets with odds data: 24
Bullish markets (UP favored): 15 (63%)
Bearish markets (DOWN favored): 9 (37%)

🟢 Overall market sentiment: BULLISH (5.2% above neutral)
```

---

### 4. `test-polymarket-odds.ts` (Odds Fetching)
**Current odds test** - Tests fetching live odds/prices from CLOB API.

**Features**:
- Tests both `/price` endpoint and price history fallback
- Shows current Up/Down odds
- Confidence spread calculation
- Lists upcoming markets
- Method comparison (which API endpoint works)

**Run**:
```bash
npx ts-node scripts/test-polymarket-odds.ts
```

**Output**:
```
📊 Step 1: Fetching active BTC "Up or Down" markets...
✅ Found 24 active BTC Up/Down markets

📈 Step 2: Fetching current odds for markets...

Market: Bitcoin Up or Down – 02/04 10:00-10:15 AM PST
📊 Current Odds (via /price endpoint):
   UP:   65.5% ✅ (Favored)
   DOWN: 34.5%
   Confidence spread: 31.0%
   🔥 High confidence prediction!
```

---

## 🎯 Which Script Should I Use?

| **Use Case** | **Recommended Script** |
|--------------|------------------------|
| Quick check of active BTC markets | `quick-btc-search.ts` |
| Testing API integration for your app | `test-btc-updown-markets.ts` |
| Comprehensive market analysis | `test-bitcoin-market-search.ts` |
| Verifying odds/price fetching works | `test-polymarket-odds.ts` |
| Custom search query | `quick-btc-search.ts "your query"` |

---

## 🔧 Requirements

All scripts use native `fetch` (Node 18+) and TypeScript. No additional dependencies needed beyond what's in `package.json`.

**Verify your setup**:
```bash
node --version  # Should be v18 or higher
```

---

## 📡 API Endpoints Used

All scripts use these Polymarket APIs:

### Gamma API (`https://gamma-api.polymarket.com`)
- `/markets` - List all markets with filters
- `/markets/:id` - Get specific market by ID
- `/public-search` - Search markets by query

### CLOB API (`https://clob.polymarket.com`)
- `/price` - Get current price/odds for a token
- `/prices-history` - Get historical price data

**No authentication required** - All endpoints are public.

---

## 🎨 Output Examples

### Comprehensive Search Output
```
═══════════════════════════════════════════════════════════════════
Method 1: Search via /markets endpoint (filtering for "bitcoin")
═══════════════════════════════════════════════════════════════════

✅ Total markets fetched: 450
✅ Bitcoin-related markets found: 28

Top 10 Bitcoin markets:
1. Bitcoin Up or Down – February 4, 10:00AM-10:15AM ET
   ID: 1324407
   Status: 🟢 Active | 🔓 Open
   Ends: 2/4/2026, 10:15:00 AM
   Outcomes:
      Up: 65.5%
      Down: 34.5%
```

### Quick Search Output
```
🔍 Searching for "bitcoin" markets on Polymarket...

✅ Found 24 markets

🟢 ACTIVE MARKETS
═══════════════════════════════════════════════════════════════════

1. Bitcoin Up or Down – 02/04 10:00-10:15 AM PST
   Market ID: 1324407
   Ends: 2/4/2026, 10:15:00 AM
   Current Odds:
     Up: 65.5%
     Down: 34.5%
   Token IDs: token-up-id, token-down-id
```

---

## 🚨 Common Issues

### "No markets found"
- Markets might not be created yet for today
- Try searching for different terms: `"btc"`, `"bitcoin price"`, `"crypto"`
- Check Polymarket.com directly to see if markets exist

### "API Error 429" (Rate Limit)
- Add delays between requests
- Use only one script at a time
- Wait a few minutes before retrying

### "Cannot find module 'ts-node'"
Install ts-node globally or use npx:
```bash
npm install -g ts-node
# or just use npx (automatically downloads)
npx ts-node scripts/quick-btc-search.ts
```

### "fetch is not defined"
Update Node.js to version 18 or higher:
```bash
node --version  # Check version
nvm install 18  # Install v18 if needed
```

---

## 💡 Tips

1. **Start with the quick search** to verify API connectivity
2. **Use the comprehensive search** for detailed analysis
3. **Run the updown test** to see exactly what your app will fetch
4. **Check the odds test** if prices aren't showing up

---

## 🔗 Related Files

- `/app/api/polymarket-price/route.ts` - Historical odds API endpoint
- `/app/api/polymarket-current-odds/route.ts` - Current odds API endpoint
- `/components/polymarket-odds-summary.tsx` - Odds display component
- `/POLYMARKET_ODDS_GUIDE.md` - Complete integration guide

---

## 📚 Further Reading

- [Polymarket API Docs](https://docs.polymarket.com)
- [Gamma API Reference](https://gamma-api.polymarket.com/docs)
- [Understanding Prediction Markets](https://polymarket.com/about)

---

**Happy testing!** 🎉

If you find issues or have questions, check the main [POLYMARKET_ODDS_GUIDE.md](../POLYMARKET_ODDS_GUIDE.md) for more details.
