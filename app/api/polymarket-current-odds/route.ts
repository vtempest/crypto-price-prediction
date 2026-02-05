import { NextRequest, NextResponse } from 'next/server'

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'
const CLOB_API_BASE = 'https://clob.polymarket.com'

interface CurrentOdds {
  marketId: string
  question: string
  intervalIndex: number
  intervalLabel: string
  upOdds: number // Percentage (0-100)
  downOdds: number // Percentage (0-100)
  upTokenId: string
  downTokenId: string
  endDate: string
  isActive: boolean
}

/**
 * Fetches the current odds for all active BTC "Up or Down" markets
 * Returns the latest price (odds) for each market without historical data
 */
export async function GET(request: NextRequest) {
  try {
    // Step 1: Find all active BTC 15-minute markets
    const marketsUrl = `${GAMMA_API_BASE}/markets?closed=false&active=true&limit=2000`
    const marketsResponse = await fetch(marketsUrl)

    if (!marketsResponse.ok) {
      throw new Error(`Gamma API error: ${marketsResponse.status}`)
    }

    const marketsData = await marketsResponse.json()

    // Filter for BTC 15-minute "Up or Down" markets
    const btc15mMarkets = marketsData.filter((market: any) => {
      const q = market.question.toLowerCase()
      return q.includes('bitcoin') && q.includes('up or down')
    })

    console.log(`Found ${btc15mMarkets.length} active BTC Up/Down markets`)

    if (btc15mMarkets.length === 0) {
      return NextResponse.json({
        markets: [],
        message: 'No active BTC 15-minute markets found',
        timestamp: new Date().toISOString()
      })
    }

    // Step 2: Fetch current price for each market
    const currentOdds: CurrentOdds[] = []

    for (const market of btc15mMarkets) {
      try {
        // Get both token IDs (Up/Yes and Down/No)
        const upTokenId = market.clobTokenIds[0]
        const downTokenId = market.clobTokenIds[1]

        if (!upTokenId || !downTokenId) {
          console.warn(`Market ${market.id} missing token IDs`)
          continue
        }

        // Parse the time range from the question to get interval index
        // Example: "Bitcoin Up or Down – 01/15 10:00-10:15 AM PST"
        const timeMatch = market.question.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})\s*(AM|PM)/i)

        let intervalIndex = -1
        let intervalLabel = 'Unknown'

        if (timeMatch) {
          const startHour = parseInt(timeMatch[1])
          const startMinute = parseInt(timeMatch[2])
          const endHour = parseInt(timeMatch[3])
          const endMinute = parseInt(timeMatch[4])
          const period = timeMatch[5].toUpperCase()

          // Convert to 24-hour format
          let hour24 = startHour
          if (period === 'PM' && startHour !== 12) hour24 += 12
          if (period === 'AM' && startHour === 12) hour24 = 0

          // Calculate interval index (0-95)
          intervalIndex = Math.floor((hour24 * 60 + startMinute) / 15)

          const formatTime = (h: number, m: number) =>
            `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`

          intervalLabel = `${formatTime(startHour, startMinute)}-${formatTime(endHour, endMinute)} ${period}`
        }

        // Fetch current price for both tokens
        // Using the /price endpoint for latest tick
        const [upPriceResponse, downPriceResponse] = await Promise.all([
          fetch(`${CLOB_API_BASE}/price?token_id=${upTokenId}&side=buy`),
          fetch(`${CLOB_API_BASE}/price?token_id=${downTokenId}&side=buy`)
        ])

        // Alternative: Use the last point from price history if /price endpoint doesn't work
        let upOdds = 0
        let downOdds = 0

        if (upPriceResponse.ok) {
          const upData = await upPriceResponse.json()
          upOdds = parseFloat(upData.price) * 100
        } else {
          // Fallback: get latest from history
          const historyResponse = await fetch(
            `${CLOB_API_BASE}/prices-history?market=${upTokenId}&interval=1m&fidelity=1`
          )
          if (historyResponse.ok) {
            const historyData = await historyResponse.json()
            if (historyData.history && historyData.history.length > 0) {
              const latest = historyData.history[historyData.history.length - 1]
              upOdds = latest.p * 100
            }
          }
        }

        if (downPriceResponse.ok) {
          const downData = await downPriceResponse.json()
          downOdds = parseFloat(downData.price) * 100
        } else {
          // Fallback: get latest from history
          const historyResponse = await fetch(
            `${CLOB_API_BASE}/prices-history?market=${downTokenId}&interval=1m&fidelity=1`
          )
          if (historyResponse.ok) {
            const historyData = await historyResponse.json()
            if (historyData.history && historyData.history.length > 0) {
              const latest = historyData.history[historyData.history.length - 1]
              downOdds = latest.p * 100
            }
          }
        }

        // If we still don't have odds, skip this market
        if (upOdds === 0 && downOdds === 0) {
          console.warn(`Could not fetch odds for market ${market.id}`)
          continue
        }

        currentOdds.push({
          marketId: market.id,
          question: market.question,
          intervalIndex,
          intervalLabel,
          upOdds: Math.round(upOdds * 10) / 10, // Round to 1 decimal
          downOdds: Math.round(downOdds * 10) / 10,
          upTokenId,
          downTokenId,
          endDate: market.endDate,
          isActive: market.active && !market.closed
        })

      } catch (error) {
        console.error(`Error fetching odds for market ${market.id}:`, error)
        continue
      }
    }

    // Sort by interval index (chronological order)
    currentOdds.sort((a, b) => {
      if (a.intervalIndex === -1) return 1
      if (b.intervalIndex === -1) return -1
      return a.intervalIndex - b.intervalIndex
    })

    return NextResponse.json({
      markets: currentOdds,
      count: currentOdds.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching current Polymarket odds:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch current Polymarket odds',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
