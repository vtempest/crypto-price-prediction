import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { btcPriceCache, polymarketIntervalsCache } from '@/db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'

// Convert "HH:MM:SS" time string to seconds since midnight
function timeToSeconds(time: string): number {
  const parts = time.split(':').map(Number)
  return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0)
}

// Read polymarket odds from polymarket_intervals_cache, sorted by time
async function getPolymarketOddsFromCache(
  date: string,
  intervalIndex: number
): Promise<{ seconds: number; odds: number }[]> {
  try {
    const cachedPolyData = await db
      .select()
      .from(polymarketIntervalsCache)
      .where(
        and(
          eq(polymarketIntervalsCache.date, date),
          eq(polymarketIntervalsCache.intervalIndex, intervalIndex)
        )
      )
      .limit(1)

    if (!cachedPolyData || cachedPolyData.length === 0) return []

    const intervalObj = JSON.parse(cachedPolyData[0].data as string)
    if (!intervalObj.data || intervalObj.data.length === 0) return []

    return intervalObj.data
      .map((p: any) => ({
        seconds: timeToSeconds(p.time),
        odds: p.price,
      }))
      .sort((a: any, b: any) => a.seconds - b.seconds)
  } catch (error) {
    console.warn('Could not read polymarket cache:', error)
    return []
  }
}

// Forward-fill binary search: find the last odds value at or before the given time
function findOddsByTime(
  sortedOdds: { seconds: number; odds: number }[],
  timeStr: string
): number | null {
  if (sortedOdds.length === 0) return null

  const seconds = timeToSeconds(timeStr)

  let lo = 0,
    hi = sortedOdds.length - 1
  let result: number | null = null

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (sortedOdds[mid].seconds <= seconds) {
      result = sortedOdds[mid].odds
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  return result
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const date = searchParams.get('date') // Format: YYYY-MM-DD
  const intervalParam = searchParams.get('interval') // Optional: 0-95 for specific 15-minute interval

  if (!date) {
    return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
  }

  try {
    // PST is UTC-8 (or UTC-7 during PDT, but we'll use PST for consistency)
    const PST_OFFSET = -8 * 60 // PST offset in minutes

    // Parse the date in PST timezone
    const startOfDay = new Date(date + 'T00:00:00-08:00')

    let startTime: number
    let endTime: number

    // If interval is specified, fetch only that 15-minute block
    if (intervalParam !== null) {
      const intervalIndex = parseInt(intervalParam)
      if (isNaN(intervalIndex) || intervalIndex < 0 || intervalIndex > 95) {
        return NextResponse.json({ error: 'Interval must be between 0 and 95' }, { status: 400 })
      }

      // Calculate start and end time for the specific interval
      // Each interval is 15 minutes (900 seconds)
      startTime = startOfDay.getTime() + intervalIndex * 15 * 60 * 1000
      endTime = startTime + 15 * 60 * 1000

      console.log(`Fetching interval ${intervalIndex} (${new Date(startTime)} to ${new Date(endTime)})`)
    } else {
      // Fetch entire day
      const endOfDay = new Date(date + 'T23:59:59.999-08:00')
      startTime = startOfDay.getTime()
      endTime = endOfDay.getTime()

      console.log(`Fetching entire day (${new Date(startTime)} to ${new Date(endTime)})`)
    }

    // Get current time in PST for filtering future blocks
    const nowPST = new Date()
    const currentTimePST = nowPST.getTime() + (nowPST.getTimezoneOffset() + PST_OFFSET) * 60 * 1000

    // Check if we have cached data for this time range
    console.log('Checking cache for date:', date, 'range:', startTime, '-', endTime)
    const cachedData = await db
      .select()
      .from(btcPriceCache)
      .where(
        and(
          eq(btcPriceCache.date, date),
          gte(btcPriceCache.timestamp, startTime),
          lte(btcPriceCache.timestamp, endTime)
        )
      )
      .orderBy(btcPriceCache.timestamp)

    // Calculate expected number of records (1 per second)
    const expectedRecords = Math.floor((endTime - startTime) / 1000)
    const cacheIsComplete = cachedData.length >= expectedRecords * 0.95 // Allow 5% tolerance

    if (cacheIsComplete && cachedData.length > 0) {
      console.log(`Cache hit! Found ${cachedData.length} records (expected ~${expectedRecords})`)

      // Try to fill in Polymarket odds from polymarket cache if missing
      const hasOdds = cachedData.some((r) => r.polymarketOdds !== null)
      let polyOddsArray: { seconds: number; odds: number }[] = []
      if (!hasOdds && intervalParam !== null) {
        polyOddsArray = await getPolymarketOddsFromCache(date, parseInt(intervalParam))
        if (polyOddsArray.length > 0) {
          console.log(`Enriching cached BTC data with ${polyOddsArray.length} Polymarket odds points`)
        }
      }

      // Return cached data
      const processedCachedData = cachedData
        .filter((record) => record.timestamp <= currentTimePST)
        .map((record) => {
          let odds = record.polymarketOdds
          if (odds === null && polyOddsArray.length > 0) {
            odds = findOddsByTime(polyOddsArray, record.time)
          }
          return {
            timestamp: record.timestamp,
            time: record.time,
            open: record.open,
            high: record.high,
            low: record.low,
            close: record.close,
            volume: record.volume,
            numberOfTrades: record.numberOfTrades,
            polymarketOdds: odds ?? undefined,
          }
        })

      return NextResponse.json({
        data: processedCachedData,
        date,
        intervalIndex: intervalParam !== null ? parseInt(intervalParam) : null,
        totalRecords: processedCachedData.length,
        interval: '1s',
        startTime: startTime,
        endTime: endTime,
        cached: true,
      })
    }

    console.log(`Cache miss or incomplete. Found ${cachedData.length}/${expectedRecords} records. Fetching from Binance...`)

    // Fetch 1-second klines for the entire day (86,400 data points)
    // Binance API limit is 1000 per request, so we need ~87 requests
    const allData = []
    let currentStartTime = startTime
    const interval = '1s'
    const intervalMs = 1000 // 1 second in milliseconds

    console.log(`Fetching second-interval data from ${new Date(startTime)} to ${new Date(endTime)}`)

    // Fetch data in batches of 1000
    while (currentStartTime < endTime) {
      const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&startTime=${currentStartTime}&endTime=${endTime}&limit=1000`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.length === 0) {
        break // No more data
      }

      allData.push(...data)

      // Get the last timestamp and move to next batch
      const lastTimestamp = data[data.length - 1][0]
      currentStartTime = lastTimestamp + intervalMs

      console.log(`Fetched ${data.length} records, total: ${allData.length}`)

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`Total records fetched: ${allData.length}`)

    // Fetch Polymarket odds from polymarket_intervals_cache (direct DB read)
    let polyOddsArray: { seconds: number; odds: number }[] = []
    if (intervalParam !== null) {
      try {
        console.log(`Reading Polymarket odds for interval ${intervalParam} from cache...`)
        polyOddsArray = await getPolymarketOddsFromCache(date, parseInt(intervalParam))
        if (polyOddsArray.length > 0) {
          console.log(`Loaded ${polyOddsArray.length} Polymarket odds points (forward-fill interpolation)`)
        } else {
          console.log(`No Polymarket cache data for interval ${intervalParam} yet`)
        }
      } catch (polymarketError) {
        console.warn('Could not read Polymarket odds:', polymarketError)
      }
    }

    // Process all second-level data
    // Kline format: [openTime, open, high, low, close, volume, closeTime, quoteAssetVolume, numberOfTrades, takerBuyBaseAssetVolume, takerBuyQuoteAssetVolume, ignore]
    const processedData = allData
      .filter((kline: any[]) => kline[0] <= currentTimePST) // Filter out future data
      .map((kline: any[]) => {
        const timestamp = kline[0]
        const time = new Date(timestamp)

        // Convert to PST for display
        const pstTime = new Date(time.getTime() + PST_OFFSET * 60 * 1000)

        const formatTime = (date: Date) => {
          const h = date.getUTCHours()
          const m = date.getUTCMinutes()
          const s = date.getUTCSeconds()
          return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        }

        const timeStr = formatTime(pstTime)
        const polymarketOdds = findOddsByTime(polyOddsArray, timeStr)

        return {
          timestamp: timestamp,
          time: timeStr,
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5]),
          numberOfTrades: parseInt(kline[8]),
          polymarketOdds: polymarketOdds ?? undefined, // Forward-fill interpolated Polymarket odds
        }
      })

    // Save fetched data to cache (batch insert)
    if (processedData.length > 0) {
      console.log(`Saving ${processedData.length} records to cache...`)
      const now = Date.now()

      // Prepare batch insert data
      const cacheRecords = processedData.map((record) => ({
        date,
        timestamp: record.timestamp,
        time: record.time,
        open: record.open,
        high: record.high,
        low: record.low,
        close: record.close,
        volume: record.volume,
        numberOfTrades: record.numberOfTrades,
        polymarketOdds: record.polymarketOdds ?? null, // Include Polymarket odds in cache
        createdAt: now,
      }))

      // Insert in batches to avoid memory issues (1000 records at a time)
      const batchSize = 1000
      for (let i = 0; i < cacheRecords.length; i += batchSize) {
        const batch = cacheRecords.slice(i, i + batchSize)
        try {
          await db.insert(btcPriceCache).values(batch).onConflictDoNothing()
        } catch (error) {
          console.error(`Error inserting batch ${i / batchSize + 1}:`, error)
        }
      }

      console.log('Cache updated successfully')
    }

    return NextResponse.json({
      data: processedData,
      date,
      intervalIndex: intervalParam !== null ? parseInt(intervalParam) : null,
      totalRecords: processedData.length,
      interval: '1s',
      startTime: startTime,
      endTime: endTime,
    })
  } catch (error) {
    console.error('Error fetching BTC price:', error)
    return NextResponse.json(
      { error: 'Failed to fetch BTC price data' },
      { status: 500 }
    )
  }
}
