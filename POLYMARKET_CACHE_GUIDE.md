# Polymarket Cache System Guide

## Overview

The Polymarket data caching system stores historical odds data in a local database to:
- **Reduce API calls** to Polymarket servers
- **Improve performance** with faster load times
- **Save bandwidth** and respect rate limits
- **Preserve historical data** that may no longer be available via API

---

## How It Works

### Cache Flow

```
1. Request comes in for interval data
   ↓
2. Check if cache exists for this date/interval
   ↓
3a. Cache HIT → Return cached data immediately
3b. Cache MISS → Fetch from Polymarket API
   ↓
4. Store fresh data in cache for future requests
   ↓
5. Return data to client
```

### Cache Storage

Data is stored in SQLite database (`polymarketIntervalsCache` table):
- **date**: YYYY-MM-DD format
- **intervalIndex**: 0-95 (96 intervals per day)
- **data**: JSON string of interval data
- **createdAt**: Timestamp of when cached

---

## Using the Cache

### 1. Normal Requests (Cache Enabled)

By default, all requests use cached data when available:

```bash
# Fetch single interval (uses cache if available)
curl "http://localhost:3000/api/polymarket-price?date=2026-02-04&interval=40"

# Fetch all intervals for a date (uses cache if available)
curl "http://localhost:3000/api/polymarket-price?date=2026-02-04"
```

**Behavior:**
- First request: Fetches from Polymarket API, stores in cache
- Subsequent requests: Returns cached data instantly
- Cache never expires (historical data doesn't change)

### 2. Force Refresh (Bypass Cache)

To bypass cache and fetch fresh data from Polymarket:

```bash
# Force refresh single interval
curl "http://localhost:3000/api/polymarket-price?date=2026-02-04&interval=40&forceRefresh=true"

# Force refresh all intervals
curl "http://localhost:3000/api/polymarket-price?date=2026-02-04&forceRefresh=true"
```

**When to use:**
- Market data has changed/been corrected
- Testing new data fetching logic
- Verifying cache accuracy

### 3. UI Force Refresh Button

In the web interface:

1. Load a date with Polymarket data
2. Look for purple stats box showing "Polymarket Data Available"
3. Click **"🔄 Force Refresh"** button
4. All data for that date will be:
   - Cleared from cache
   - Re-fetched from Polymarket
   - Re-cached with fresh data

---

## Cache Management API

### View Cache Stats

```bash
GET /api/polymarket-cache
```

**Response:**
```json
{
  "totalCached": 250,
  "byDate": {
    "2026-02-04": 48,
    "2026-02-03": 45,
    "2026-02-02": 42
  },
  "recentEntries": [
    {
      "date": "2026-02-04",
      "intervalIndex": 40,
      "cachedAt": "2026-02-04T18:30:00.000Z",
      "dataSize": 15234
    }
  ]
}
```

### Clear All Cache

```bash
DELETE /api/polymarket-cache
```

**Response:**
```json
{
  "message": "All cache cleared"
}
```

### Clear Cache for Specific Date

```bash
DELETE /api/polymarket-cache?date=2026-02-04
```

**Response:**
```json
{
  "message": "Cache cleared for date: 2026-02-04"
}
```

### Clear Cache for Specific Interval

```bash
DELETE /api/polymarket-cache?date=2026-02-04&interval=40
```

**Response:**
```json
{
  "message": "Cache cleared for date: 2026-02-04, interval: 40"
}
```

---

## Console Logs

### Cache Hit

```
💾 Using cached data for interval 40 (cached at 2/4/2026, 10:30:00 AM)
```

### Cache Miss

```
📭 No cached data found for interval 40
🔄 Fetching fresh data from Polymarket API for interval 40
```

### Force Refresh

```
🔄 Force refresh enabled - skipping cache for interval 40
🔄 Fetching fresh data from Polymarket API for interval 40
```

### Caching New Data

```
💾 Cached interval 40 with 900 data points
```

---

## Performance Benefits

### Without Cache

```
Load 96 intervals: ~96 API requests × 500ms = 48 seconds
```

### With Cache

```
First load: ~96 API requests × 500ms = 48 seconds
Subsequent loads: <1 second (all from cache)
```

### Cache Hit Ratio

For historical data (> 24 hours old):
- **Expected hit ratio: ~99%** (data rarely changes)

For recent data (< 24 hours):
- **Expected hit ratio: ~70%** (markets still active/changing)

---

## Database Schema

```sql
CREATE TABLE polymarketIntervalsCache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,           -- YYYY-MM-DD format
  intervalIndex INTEGER NOT NULL, -- 0-95
  data TEXT NOT NULL,            -- JSON string
  createdAt INTEGER NOT NULL,    -- Unix timestamp
  UNIQUE(date, intervalIndex)    -- One cache entry per interval
);

CREATE INDEX idx_polymarket_intervals_date
  ON polymarketIntervalsCache(date);

CREATE INDEX idx_polymarket_intervals_date_interval
  ON polymarketIntervalsCache(date, intervalIndex);
```

---

## Best Practices

### When to Use Cache

✅ **Always use cache for:**
- Historical data (> 24 hours old)
- Completed/closed markets
- Displaying data to users
- Development/testing with known data

### When to Force Refresh

🔄 **Force refresh when:**
- Testing new market discovery logic
- Verifying data accuracy
- Updating stale cache entries
- Investigating discrepancies

### Cache Maintenance

**Automatic:**
- No expiration needed for historical data
- Cache grows linearly (1 entry per interval per day)
- Typical size: ~50KB per interval × 96 = ~5MB per day

**Manual:**
- Clear cache if corrupted: `DELETE /api/polymarket-cache`
- Clear old dates if needed: `DELETE /api/polymarket-cache?date=YYYY-MM-DD`
- Monitor cache stats: `GET /api/polymarket-cache`

---

## Troubleshooting

### Cache Not Working

**Symptoms:** Every request shows "🔄 Fetching fresh data"

**Causes:**
1. Database connection issues
2. Cache write failures
3. Force refresh enabled

**Solutions:**
```bash
# Check cache stats
curl http://localhost:3000/api/polymarket-cache

# Try explicit cache request (no forceRefresh)
curl "http://localhost:3000/api/polymarket-price?date=2026-02-04&interval=40"

# Check console for cache errors
```

### Stale Data in Cache

**Symptoms:** Cached data doesn't match Polymarket website

**Causes:**
1. Market data was updated/corrected
2. Cache entry is old/incorrect

**Solutions:**
```bash
# Clear cache for specific date
curl -X DELETE "http://localhost:3000/api/polymarket-cache?date=2026-02-04"

# Or use UI force refresh button
```

### Cache Growing Too Large

**Symptoms:** Database file size increasing

**Current size:**
```bash
# Check database size
ls -lh db/polymarket.db
```

**Solutions:**
```bash
# Clear old dates (keep last 30 days)
for date in $(date -d "31 days ago" +%Y-%m-%d); do
  curl -X DELETE "http://localhost:3000/api/polymarket-cache?date=$date"
done

# Or clear all and rebuild
curl -X DELETE http://localhost:3000/api/polymarket-cache
```

---

## Implementation Details

### Cache Key

Each cache entry is uniquely identified by:
- `date` (YYYY-MM-DD)
- `intervalIndex` (0-95)

This creates a composite key ensuring one cache entry per interval.

### Cache Lookup

```typescript
// Check cache
const cached = await db
  .select()
  .from(polymarketIntervalsCache)
  .where(
    and(
      eq(polymarketIntervalsCache.date, date),
      eq(polymarketIntervalsCache.intervalIndex, intervalIndex)
    )
  )
  .limit(1)
```

### Cache Storage

```typescript
// Save to cache
await db.insert(polymarketIntervalsCache).values({
  date,
  intervalIndex,
  data: JSON.stringify(intervalObj),
  createdAt: Date.now()
})
```

---

## API Changes

### `/api/polymarket-price`

**New Parameter:**
- `forceRefresh` (optional, boolean)
  - `true`: Bypass cache, fetch from API
  - `false` or omitted: Use cache if available

**Examples:**
```bash
# Use cache (default)
GET /api/polymarket-price?date=2026-02-04&interval=40

# Force refresh
GET /api/polymarket-price?date=2026-02-04&interval=40&forceRefresh=true
```

### `/api/polymarket-cache` (New)

**Endpoints:**
- `GET /api/polymarket-cache` - View cache stats
- `DELETE /api/polymarket-cache` - Clear all cache
- `DELETE /api/polymarket-cache?date=YYYY-MM-DD` - Clear date
- `DELETE /api/polymarket-cache?date=YYYY-MM-DD&interval=N` - Clear specific interval

---

## Testing the Cache

### Test Cache Write

```bash
# Fetch data (should cache it)
curl "http://localhost:3000/api/polymarket-price?date=2026-02-04&interval=40"

# Check cache stats
curl http://localhost:3000/api/polymarket-cache | jq
```

### Test Cache Read

```bash
# First request (cache miss)
time curl "http://localhost:3000/api/polymarket-price?date=2026-02-04&interval=40"
# Should take ~500ms+

# Second request (cache hit)
time curl "http://localhost:3000/api/polymarket-price?date=2026-02-04&interval=40"
# Should take <100ms
```

### Test Force Refresh

```bash
# Force refresh (bypass cache)
curl "http://localhost:3000/api/polymarket-price?date=2026-02-04&interval=40&forceRefresh=true"
# Should take ~500ms+ even if cached
```

### Test Cache Clear

```bash
# Clear specific interval
curl -X DELETE "http://localhost:3000/api/polymarket-cache?date=2026-02-04&interval=40"

# Verify it's gone
curl "http://localhost:3000/api/polymarket-price?date=2026-02-04&interval=40"
# Should fetch fresh (cache miss)
```

---

## Files Modified

1. [app/api/polymarket-price/route.ts](app/api/polymarket-price/route.ts)
   - Added cache reading logic
   - Added `forceRefresh` parameter support
   - Improved logging for cache hits/misses

2. [app/api/polymarket-cache/route.ts](app/api/polymarket-cache/route.ts) (New)
   - Cache management endpoints
   - Stats viewing
   - Cache invalidation

3. [app/page.tsx](app/page.tsx)
   - Added force refresh button
   - Added `forceRefreshPolymarketData()` function
   - UI indicators for cached vs fresh data

---

**Last Updated:** 2026-02-04
**Status:** ✅ Fully implemented and tested
