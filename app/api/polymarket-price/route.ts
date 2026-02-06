import { NextRequest, NextResponse } from 'next/server'
import { PolymarketMarket, PriceHistoryResponse, ProcessedPolymarketInterval, fetchMarketQuote } from '@/lib/polymarket-types'

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'
const CLOB_API_BASE = 'https://clob.polymarket.com'

/**
 * Fetch market by slug
 * Slug format: btc-updown-15m-{timestamp}
 */
async function fetchMarketBySlug(slug: string): Promise<PolymarketMarket | null> {
  try {
    // Use the events endpoint to fetch by slug
    const response = await fetch(`${GAMMA_API_BASE}/events?slug=${slug}`)

    if (!response.ok) {
      return null
    }

    const events = await response.json()

    if (!events || events.length === 0) {
      return null
    }

    // The event contains markets - get the first market
    const event = events[0]

    // Try to get the market from the event's markets array
    if (event.markets && event.markets.length > 0) {
      return event.markets[0]
    }

    return null
  } catch (error) {
    console.error(`Error fetching market by slug ${slug}:`, error)
    return null
  }
}

/**
 * Calculate the slug timestamp for a given date and interval
 * The slug uses a Unix timestamp that corresponds to the event time
 */
function calculateSlugTimestamp(date: string, intervalIndex: number): number {
  // Create date in PST timezone
  const baseDate = new Date(date + 'T00:00:00-08:00')

  // Add the interval minutes
  const intervalMinutes = intervalIndex * 15
  baseDate.setMinutes(baseDate.getMinutes() + intervalMinutes)

  // Convert to Unix timestamp (seconds)
  return Math.floor(baseDate.getTime() / 1000)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const date = searchParams.get('date') // Format: YYYY-MM-DD
  const intervalParam = searchParams.get('interval')
  const forceRefresh = searchParams.get('forceRefresh') === 'true' // Add cache invalidation parameter

  if (!date) {
    return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
  }

  try {
    console.log(`Fetching Polymarket data for date: ${date}${forceRefresh ? ' (force refresh)' : ''}`)

    const intervals: ProcessedPolymarketInterval[] = []
    const now = Date.now()
    let mostRecentIndex = -1

    // If specific interval requested, only fetch that one
    const intervalsToFetch = intervalParam !== null
      ? [parseInt(intervalParam)]
      : Array.from({ length: 96 }, (_, i) => i)

    // First, try to fetch all BTC Up/Down markets (both active and closed)
    // For historical data, we need to include closed markets
    console.log(`📊 Fetching BTC Up/Down markets for date: ${date}...`)
    let allBtcMarkets: any[] = []
    try {
      // Don't filter by closed status - get all markets so we can fetch historical data
      const marketsUrl = `${GAMMA_API_BASE}/markets?limit=2000`
      console.log(`  API: ${marketsUrl}`)
      const marketsResponse = await fetch(marketsUrl)
      if (marketsResponse.ok) {
        const allMarkets = await marketsResponse.json()
        allBtcMarkets = allMarkets.filter((m: any) => {
          const q = m.question.toLowerCase()
          const isBtcUpDown = (q.includes('bitcoin') || q.includes('btc')) && q.includes('up or down')
          if (isBtcUpDown) {
            console.log(`  📝 Found: "${m.question}" (end: ${m.endDate}, active: ${m.active}, closed: ${m.closed})`)
          }
          return isBtcUpDown
        })
        console.log(`✅ Found ${allBtcMarkets.length} total BTC Up/Down markets`)
      } else {
        console.warn(`⚠️ Markets API returned status ${marketsResponse.status}`)
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch all markets, will try slug-based approach:', err)
    }

    // Fetch markets for each interval
    for (const intervalIndex of intervalsToFetch) {
      try {
        // Check cache first (unless force refresh is requested)

        console.log(`🔄 Fetching fresh data from Polymarket API for interval ${intervalIndex}`)

        // Calculate interval time range
        const intervalStartTime = new Date(date + 'T00:00:00-08:00')
        intervalStartTime.setMinutes(intervalStartTime.getMinutes() + intervalIndex * 15)
        const intervalEndTime = new Date(intervalStartTime.getTime() + 15 * 60 * 1000)

        // Try to find market from the fetched markets by matching time ranges
        let market = null
        if (allBtcMarkets.length > 0) {
          market = allBtcMarkets.find((m: any) => {
            const marketEnd = new Date(m.endDate)
            // Match if market end time is within 15 minutes of interval end time
            // (increased tolerance for flexibility with timezone conversions)
            const timeDiff = Math.abs(marketEnd.getTime() - intervalEndTime.getTime())
            const matches = timeDiff < 15 * 60 * 1000 // 15 minutes tolerance

            if (matches) {
              console.log(`⏰ Time match found: Market ends at ${marketEnd.toISOString()}, interval ends at ${intervalEndTime.toISOString()}, diff: ${Math.round(timeDiff / 1000 / 60)}min`)
            }

            return matches
          })
          if (market) {
            console.log(`✅ Found market by time matching: ${market.question}`)
          } else {
            console.log(`⚠️ No time match for interval ${intervalIndex} (looking for end time ${intervalEndTime.toISOString()})`)
          }
        }

        // Fallback: Try slug-based lookup
        if (!market) {
          const slugTimestamp = calculateSlugTimestamp(date, intervalIndex)
          const slug = `btc-updown-15m-${slugTimestamp}`
          console.log(`Trying slug-based lookup: ${slug}`)
          market = await fetchMarketBySlug(slug)
        }

        if (!market) {
          console.log(`❌ Market not found for interval ${intervalIndex}, skipping`)
          continue
        }

        // Parse token IDs
        const tokenIds = typeof market.clobTokenIds === 'string'
          ? JSON.parse(market.clobTokenIds)
          : market.clobTokenIds

        const upTokenId = tokenIds?.[0]
        if (!upTokenId) {
          console.warn(`Market ${market.id} missing token IDs`)
          continue
        }

        // Recalculate interval time range for price history
        const priceStartTime = new Date(date + 'T00:00:00-08:00')
        priceStartTime.setMinutes(priceStartTime.getMinutes() + intervalIndex * 15)
        const priceEndTime = new Date(priceStartTime.getTime() + 15 * 60 * 1000)

        // Skip future intervals
        if (priceStartTime.getTime() > now) {
          console.log(`Skipping future interval ${intervalIndex}`)
          continue
        }

        mostRecentIndex = Math.max(mostRecentIndex, intervalIndex)

        // Fetch price history with maximum granularity for the full 15-minute interval
        const startTs = Math.floor(priceStartTime.getTime() / 1000)
        const endTs = Math.floor(priceEndTime.getTime() / 1000)

        console.log(`Fetching price history from ${new Date(startTs * 1000).toISOString()} to ${new Date(endTs * 1000).toISOString()}`)
        console.log(`Time range: ${endTs - startTs} seconds (should be 900 for 15 minutes)`)

        // Use fidelity=60 for high-resolution data (up to 60 data points per minute)
        // This provides second-level granularity for the full 15-minute interval
        const priceHistoryUrl = `${CLOB_API_BASE}/prices-history?` +
          `market=${upTokenId}&` +
          `startTs=${startTs}&` +
          `endTs=${endTs}&` +
          `fidelity=60`

        const priceResponse = await fetch(priceHistoryUrl)

        if (!priceResponse.ok) {
          console.warn(`CLOB API error for interval ${intervalIndex}: ${priceResponse.status}`)
          continue
        }

        const priceData: PriceHistoryResponse = await priceResponse.json()

        if (!priceData.history || priceData.history.length === 0) {
          console.warn(`No price history for interval ${intervalIndex}`)
          continue
        }

        console.log(`📥 Received ${priceData.history.length} odds data points from CLOB for interval ${intervalIndex}`)
        console.log(`First point: ${new Date(priceData.history[0].t * 1000).toISOString()} @ ${(priceData.history[0].p * 100).toFixed(1)}%`)
        console.log(`Last point: ${new Date(priceData.history[priceData.history.length - 1].t * 1000).toISOString()} @ ${(priceData.history[priceData.history.length - 1].p * 100).toFixed(1)}%`)

        // Get the start price (first data point)
        const startPrice = priceData.history[0].p * 100

        // Process price history into minute-by-minute data
        const processedData = priceData.history.map(point => {
          const timestamp = new Date(point.t * 1000)
          const currentPrice = point.p * 100

          // Format time in PST
          const pstTime = timestamp.toLocaleTimeString('en-US', {
            timeZone: 'America/Los_Angeles',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          })

          return {
            time: pstTime,
            price: currentPrice,
            open: currentPrice,
            high: currentPrice,
            low: currentPrice,
            highDiff: currentPrice - startPrice,
            lowDiff: currentPrice - startPrice,
          }
        })

        // Calculate odds statistics
        const oddsValues = processedData.map(d => d.price)
        const minOdds = Math.min(...oddsValues)
        const maxOdds = Math.max(...oddsValues)
        const avgOdds = oddsValues.reduce((a, b) => a + b, 0) / oddsValues.length
        console.log(`📊 Odds range for interval ${intervalIndex}: ${minOdds.toFixed(1)}% - ${maxOdds.toFixed(1)}% (avg: ${avgOdds.toFixed(1)}%)`)

        const formatTime = (h: number, m: number) =>
          `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`

        const startHourFormatted = Math.floor((intervalIndex * 15) / 60)
        const startMinuteFormatted = (intervalIndex * 15) % 60
        const endHourFormatted = Math.floor(((intervalIndex + 1) * 15) / 60)
        const endMinuteFormatted = ((intervalIndex + 1) * 15) % 60

        const label = `${formatTime(startHourFormatted, startMinuteFormatted)} - ${formatTime(endHourFormatted % 24, endMinuteFormatted)} PST`

        // Fetch current market quote (only for most recent/active intervals)
        let quote = null
        if (priceEndTime.getTime() >= now - (24 * 60 * 60 * 1000)) {
          // Only fetch quotes for intervals within last 24 hours
          try {
            quote = await fetchMarketQuote(upTokenId)
            if (quote) {
              console.log(`📊 Fetched quote for interval ${intervalIndex}: bid=${quote.bid.toFixed(4)}, ask=${quote.ask.toFixed(4)}, mid=${quote.price.toFixed(4)}`)
            }
          } catch (quoteErr) {
            console.warn(`Failed to fetch quote for interval ${intervalIndex}:`, quoteErr)
          }
        }

        const slugTimestamp = calculateSlugTimestamp(date, intervalIndex)
        const intervalObj: ProcessedPolymarketInterval = {
          index: intervalIndex,
          label,
          data: processedData,
          isMostRecent: false,
          marketQuestion: market.question,
          quote: quote || undefined,
          marketUrl: `https://polymarket.com/event/btc-updown-15m-${slugTimestamp}`,
        }

        intervals.push(intervalObj)


        console.log(`✅ Successfully processed interval ${intervalIndex} with ${processedData.length} data points`)

      } catch (error) {
        console.error(`Error processing interval ${intervalIndex}:`, error)
        continue
      }
    }

    // Sort intervals by index
    intervals.sort((a, b) => a.index - b.index)

    // Mark the most recent interval
    if (mostRecentIndex >= 0 && intervals.length > 0) {
      const mostRecentInterval = intervals.find(i => i.index === mostRecentIndex)
      if (mostRecentInterval) {
        mostRecentInterval.isMostRecent = true
      }
    }

    // Calculate total data points across all intervals
    const totalDataPoints = intervals.reduce((sum, interval) => sum + interval.data.length, 0)
    console.log(`✅ Returning ${intervals.length} intervals with ${totalDataPoints} total data points`)

    return NextResponse.json({
      intervals,
      date,
      mostRecentIndex,
      totalMarkets: intervals.length,
      totalDataPoints,
    })
  } catch (error) {
    console.error('Error fetching Polymarket data:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch Polymarket data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
