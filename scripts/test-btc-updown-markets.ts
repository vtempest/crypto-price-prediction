#!/usr/bin/env ts-node
/**
 * Test script specifically for BTC "Up or Down" 15-minute markets
 * These are the markets used in the main app
 *
 * Run with: npx ts-node scripts/test-btc-updown-markets.ts
 */

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'
const CLOB_API_BASE = 'https://clob.polymarket.com'

interface Market {
  id: string
  question: string
  slug: string
  clobTokenIds: string[]
  active: boolean
  closed: boolean
  endDate: string
  startDate?: string
  tokens?: Array<{
    outcome: string
    price: string
  }>
}

interface IntervalMarket {
  market: Market
  intervalIndex: number
  intervalLabel: string
  startTime: Date
  endTime: Date
  upOdds: number
  downOdds: number
}

function parseTimeFromQuestion(question: string): { hour: number; minute: number; period: string } | null {
  // Example: "Bitcoin Up or Down – 02/04 10:00-10:15 AM PST"
  const timeMatch = question.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})\s*(AM|PM)/i)

  if (!timeMatch) return null

  return {
    hour: parseInt(timeMatch[1]),
    minute: parseInt(timeMatch[2]),
    period: timeMatch[5].toUpperCase()
  }
}

function calculateIntervalIndex(hour: number, minute: number, period: string): number {
  let hour24 = hour
  if (period === 'PM' && hour !== 12) hour24 += 12
  if (period === 'AM' && hour === 12) hour24 = 0

  return Math.floor((hour24 * 60 + minute) / 15)
}

async function findBTCUpDownMarkets() {
  console.log('\n🎯 Searching for BTC "Up or Down" 15-minute markets...\n')

  try {
    // Fetch active markets
    const url = `${GAMMA_API_BASE}/markets?closed=false&active=true&limit=2000`
    console.log(`📡 Fetching from: ${url}`)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const markets: Market[] = await response.json()
    console.log(`✅ Fetched ${markets.length} total active markets\n`)

    // Filter for BTC Up/Down markets
    const btcUpDownMarkets = markets.filter(market => {
      const q = market.question.toLowerCase()
      return (q.includes('bitcoin') || q.includes('btc')) &&
             q.includes('up or down')
    })

    console.log(`🎲 Found ${btcUpDownMarkets.length} BTC "Up or Down" markets\n`)

    if (btcUpDownMarkets.length === 0) {
      console.log('⚠️  No BTC Up/Down markets currently active')
      console.log('This could mean:')
      console.log('  - Markets haven\'t been created for today yet')
      console.log('  - All markets have closed for the day')
      console.log('  - Markets are created closer to trading time')
      return
    }

    // Parse and process each market
    const processedMarkets: IntervalMarket[] = []

    for (const market of btcUpDownMarkets) {
      const timeInfo = parseTimeFromQuestion(market.question)

      if (!timeInfo) {
        console.log(`⚠️  Could not parse time from: ${market.question}`)
        continue
      }

      const intervalIndex = calculateIntervalIndex(timeInfo.hour, timeInfo.minute, timeInfo.period)

      const startTime = new Date(market.startDate || market.endDate)
      const endTime = new Date(market.endDate)

      // Get odds from tokens if available
      let upOdds = 0
      let downOdds = 0

      if (market.tokens && market.tokens.length >= 2) {
        upOdds = parseFloat(market.tokens[0].price) * 100
        downOdds = parseFloat(market.tokens[1].price) * 100
      }

      processedMarkets.push({
        market,
        intervalIndex,
        intervalLabel: `${timeInfo.hour.toString().padStart(2, '0')}:${timeInfo.minute.toString().padStart(2, '0')} ${timeInfo.period}`,
        startTime,
        endTime,
        upOdds,
        downOdds
      })
    }

    // Sort by interval index (chronological)
    processedMarkets.sort((a, b) => a.intervalIndex - b.intervalIndex)

    // Separate upcoming and past markets
    const now = new Date()
    const upcomingMarkets = processedMarkets.filter(m => m.endTime > now)
    const pastMarkets = processedMarkets.filter(m => m.endTime <= now)

    console.log('📊 MARKET BREAKDOWN')
    console.log('═'.repeat(80))
    console.log(`Upcoming markets: ${upcomingMarkets.length}`)
    console.log(`Past markets: ${pastMarkets.length}`)
    console.log()

    // Display upcoming markets
    if (upcomingMarkets.length > 0) {
      console.log('🔮 UPCOMING MARKETS (Next 10)')
      console.log('═'.repeat(80))
      console.log()

      upcomingMarkets.slice(0, 10).forEach((item, i) => {
        const { market, intervalIndex, intervalLabel, endTime, upOdds, downOdds } = item

        console.log(`${i + 1}. Interval #${intervalIndex + 1} (${intervalLabel})`)
        console.log(`   Question: ${market.question}`)
        console.log(`   Market ID: ${market.id}`)
        console.log(`   Ends: ${endTime.toLocaleString()}`)

        if (upOdds > 0 || downOdds > 0) {
          console.log(`   Current Odds:`)
          console.log(`     UP:   ${upOdds.toFixed(1)}% ${upOdds > downOdds ? '✅' : ''}`)
          console.log(`     DOWN: ${downOdds.toFixed(1)}% ${downOdds > upOdds ? '✅' : ''}`)

          const confidence = Math.abs(upOdds - downOdds)
          if (confidence > 20) {
            console.log(`     🔥 High confidence (${confidence.toFixed(1)}% spread)`)
          } else if (confidence < 5) {
            console.log(`     ⚖️  Very uncertain (${confidence.toFixed(1)}% spread)`)
          }
        }

        if (market.clobTokenIds.length >= 2) {
          console.log(`   Token IDs:`)
          console.log(`     UP:   ${market.clobTokenIds[0]}`)
          console.log(`     DOWN: ${market.clobTokenIds[1]}`)
        }

        console.log()
      })
    }

    // Display past markets summary
    if (pastMarkets.length > 0) {
      console.log(`📜 PAST MARKETS (${pastMarkets.length} total)`)
      console.log('═'.repeat(80))
      console.log()

      // Show first 3 and last 3
      const recentPast = pastMarkets.slice(-3)
      recentPast.forEach(item => {
        console.log(`   [CLOSED] ${item.intervalLabel} - ${item.market.question.substring(0, 60)}...`)
      })

      if (pastMarkets.length > 3) {
        console.log(`   ... and ${pastMarkets.length - 3} more`)
      }
      console.log()
    }

    // Overall statistics
    console.log('📈 STATISTICS')
    console.log('═'.repeat(80))

    if (upcomingMarkets.length > 0) {
      const marketsWithOdds = upcomingMarkets.filter(m => m.upOdds > 0 || m.downOdds > 0)
      const bullishMarkets = upcomingMarkets.filter(m => m.upOdds > m.downOdds)
      const bearishMarkets = upcomingMarkets.filter(m => m.downOdds > m.upOdds)

      console.log(`Markets with odds data: ${marketsWithOdds.length}`)
      console.log(`Bullish markets (UP favored): ${bullishMarkets.length} (${((bullishMarkets.length / marketsWithOdds.length) * 100).toFixed(0)}%)`)
      console.log(`Bearish markets (DOWN favored): ${bearishMarkets.length} (${((bearishMarkets.length / marketsWithOdds.length) * 100).toFixed(0)}%)`)

      if (marketsWithOdds.length > 0) {
        const avgUpOdds = upcomingMarkets.reduce((sum, m) => sum + m.upOdds, 0) / marketsWithOdds.length
        const avgDownOdds = upcomingMarkets.reduce((sum, m) => sum + m.downOdds, 0) / marketsWithOdds.length

        console.log()
        console.log(`Average UP odds: ${avgUpOdds.toFixed(1)}%`)
        console.log(`Average DOWN odds: ${avgDownOdds.toFixed(1)}%`)

        if (avgUpOdds > avgDownOdds) {
          console.log(`\n🟢 Overall market sentiment: BULLISH (${(avgUpOdds - 50).toFixed(1)}% above neutral)`)
        } else if (avgDownOdds > avgUpOdds) {
          console.log(`\n🔴 Overall market sentiment: BEARISH (${(avgDownOdds - 50).toFixed(1)}% above neutral)`)
        } else {
          console.log(`\n⚖️  Overall market sentiment: NEUTRAL`)
        }
      }
    }

    // Time coverage
    if (processedMarkets.length > 0) {
      const firstInterval = processedMarkets[0]
      const lastInterval = processedMarkets[processedMarkets.length - 1]

      console.log()
      console.log('⏰ TIME COVERAGE')
      console.log(`First interval: ${firstInterval.intervalLabel} (ends ${firstInterval.endTime.toLocaleTimeString()})`)
      console.log(`Last interval: ${lastInterval.intervalLabel} (ends ${lastInterval.endTime.toLocaleTimeString()})`)
    }

    console.log()
    console.log('✅ Analysis complete!')

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
    throw error
  }
}

// Run the test
findBTCUpDownMarkets()
