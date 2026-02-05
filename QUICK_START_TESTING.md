# Quick Start: Testing Polymarket Bitcoin Markets

This guide shows you how to quickly test and fetch Bitcoin markets from Polymarket's API.

## 🚀 Quick Test Commands

I've added convenient npm scripts to make testing easy:

```bash
# 1. Quick search for Bitcoin markets (FASTEST - recommended to start)
npm run test:btc-search

# 2. Test BTC "Up or Down" 15-minute markets (what your app uses)
npm run test:btc-updown

# 3. Test current odds fetching
npm run test:polymarket

# 4. Comprehensive market analysis (all search methods)
npm run test:btc-full
```

## 📝 What Each Test Shows

### 1. Quick Search (`npm run test:btc-search`)
**5 seconds** - Shows all active Bitcoin markets

```
✅ Found 24 markets

🟢 ACTIVE MARKETS
1. Bitcoin Up or Down – 02/04 10:00-10:15 AM PST
   Current Odds:
     Up: 65.5%
     Down: 34.5%
   Token IDs: 0x123..., 0x456...
```

**When to use**: Quick check to see what markets are available

---

### 2. BTC Up/Down Test (`npm run test:btc-updown`)
**10 seconds** - Focused on 15-minute prediction markets

```
🎲 Found 24 BTC "Up or Down" markets

🔮 UPCOMING MARKETS (Next 10)
1. Interval #41 (10:00 AM)
   UP:   65.5% ✅
   DOWN: 34.5%
   🔥 High confidence (31.0% spread)

📈 STATISTICS
Bullish markets: 15 (63%)
Bearish markets: 9 (37%)
🟢 Overall market sentiment: BULLISH
```

**When to use**: Verify your app will have data to display

---

### 3. Current Odds Test (`npm run test:polymarket`)
**15 seconds** - Tests fetching live odds/prices

```
📊 Step 1: Fetching active BTC "Up or Down" markets...
✅ Found 24 active BTC Up/Down markets

📊 Current Odds (via /price endpoint):
   UP:   65.5% ✅ (Favored)
   DOWN: 34.5%
   Confidence spread: 31.0%
```

**When to use**: Verify the CLOB API price fetching works

---

### 4. Full Analysis (`npm run test:btc-full`)
**2-3 minutes** - Comprehensive analysis with multiple search methods

```
Method 1: Search via /markets endpoint
✅ Bitcoin-related markets found: 28

Method 2: Public search
✅ Markets found: 24

Method 3: BTC "Up or Down" markets
✅ Markets: 24

📊 Summary Statistics
Top 5 by volume: ...
Next 5 upcoming markets: ...
```

**When to use**: Detailed market analysis and research

---

## 🎯 Recommended Testing Flow

### First Time Setup
```bash
# 1. Start with quick search to verify API works
npm run test:btc-search

# 2. Test the specific markets your app uses
npm run test:btc-updown

# 3. Verify odds fetching works
npm run test:polymarket
```

### Daily Check
```bash
# Quick check of what markets are active today
npm run test:btc-search
```

### Debugging
```bash
# If your app isn't showing data
npm run test:btc-updown

# If odds aren't updating
npm run test:polymarket
```

---

## 🔍 Custom Searches

You can also search for specific terms:

```bash
# Search for any Bitcoin-related markets
npx ts-node scripts/quick-btc-search.ts "bitcoin"

# Search for price target markets
npx ts-node scripts/quick-btc-search.ts "btc 100k"

# Search for specific predictions
npx ts-node scripts/quick-btc-search.ts "bitcoin price above"
```

---

## 📊 Understanding the Output

### Odds/Prices
- **65.5%** = 65.5% probability of that outcome
- Higher % = more confident prediction
- Up + Down ≈ 100%

### Market Status
- **🟢 Active** = Trading is live
- **🔒 Closed** = Market has ended
- **⚫ Inactive** = Not currently trading

### Confidence
- **>20% spread** = High confidence (e.g., 70% vs 30%)
- **<5% spread** = Very uncertain (e.g., 52% vs 48%)

### Sentiment
- **Bullish** = More markets favor Up
- **Bearish** = More markets favor Down
- **Neutral** = Evenly split

---

## ✅ Expected Results

### Normal Day (Active Trading)
```
Found 24 BTC "Up or Down" markets
Upcoming markets: 20
Past markets: 4
Bullish markets: 12 (60%)
```

### Before Markets Open
```
Found 0 BTC "Up or Down" markets
⚠️ No active BTC markets found
Markets haven't been created for today yet
```

### After Markets Close
```
Found 24 BTC "Up or Down" markets
Upcoming markets: 0
Past markets: 24
```

---

## 🚨 Troubleshooting

### No Markets Found
**Why**: Markets might not be created yet

**Solutions**:
1. Check [polymarket.com](https://polymarket.com) directly
2. Try later in the day
3. Search for different terms: `npm run test:btc-search "btc price"`

### API Errors
**Why**: Rate limiting or connectivity issues

**Solutions**:
1. Wait a few minutes
2. Check your internet connection
3. Run tests one at a time

### Odds Showing 0%
**Why**: Price data not available for that token

**Solutions**:
1. Check if market is actually active
2. Verify token IDs are correct
3. Try the price history fallback (test automatically does this)

---

## 🔗 What's Next

After testing:

1. **Run your dev server**
   ```bash
   npm run dev
   ```

2. **View the app** at http://localhost:3000
   - You'll see the live odds summary at the top
   - Historical charts below

3. **Switch to live data** (if using mock):
   - Edit `app/page.tsx` line 53
   - Change `useState(true)` to `useState(false)`

---

## 📚 More Information

- **Full API Guide**: See [POLYMARKET_ODDS_GUIDE.md](POLYMARKET_ODDS_GUIDE.md)
- **Script Details**: See [scripts/README.md](scripts/README.md)
- **API Endpoints**: Check `/app/api/polymarket-*/route.ts`

---

## 💡 Pro Tips

1. **Run tests before starting development** to verify markets exist
2. **Use quick search during development** for fast feedback
3. **Check updown test for sentiment analysis** to understand market direction
4. **Run full analysis weekly** for comprehensive market overview

---

**That's it!** Start with `npm run test:btc-search` and you're ready to go! 🚀
