#!/usr/bin/env ts-node
/**
 * Test script to verify Polymarket odds fetching
 * Run with: npx ts-node scripts/test-polymarket-odds.ts
 */

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'
const CLOB_API_BASE = 'https://clob.polymarket.com'

interface Market {
  id: string
  question: string
  clobTokenIds: string[]
  active: boolean
  closed: boolean
  endDate: string
}

async function testPolymarketOdds() {
  console.log('🔍 Testing Polymarket Odds Fetching...\n')

  try {
    // Step 1: Fetch active BTC markets
    console.log('📊 Step 1: Fetching active BTC "Up or Down" markets...')
    const marketsUrl = `${GAMMA_API_BASE}/markets?closed=false&active=true&limit=2000`
    const marketsResponse = await fetch(marketsUrl)

    if (!marketsResponse.ok) {
      throw new Error(`Gamma API error: ${marketsResponse.status}`)
    }

    const marketsData: Market[] = await marketsResponse.json()

    // Filter for BTC 15-minute markets
    const btcMarkets = marketsData.filter(market => {
      const q = market.question.toLowerCase()
      return q.includes('bitcoin') && q.includes('up or down')
    })

    console.log(`✅ Found ${btcMarkets.length} active BTC Up/Down markets\n`)

    if (btcMarkets.length === 0) {
      console.log('⚠️  No active BTC markets found. This is normal if:')
      console.log('   - Markets haven\'t been created for today yet')
      console.log('   - All markets for today have closed')
      console.log('   - It\'s outside trading hours')
      return
    }

    // Step 2: Get current odds for first 5 markets
    console.log('📈 Step 2: Fetching current odds for markets...\n')

    const marketsToTest = btcMarkets.slice(0, 5)

    for (const market of marketsToTest) {
      console.log(`Market: ${market.question}`)
      console.log(`Market ID: ${market.id}`)

      const upTokenId = market.clobTokenIds[0]
      const downTokenId = market.clobTokenIds[1]

      if (!upTokenId || !downTokenId) {
        console.log('⚠️  Missing token IDs, skipping...\n')
        continue
      }

      console.log(`Up Token ID: ${upTokenId}`)
      console.log(`Down Token ID: ${downTokenId}`)

      try {
        // Method 1: Try /price endpoint
        const [upResponse, downResponse] = await Promise.all([
          fetch(`${CLOB_API_BASE}/price?token_id=${upTokenId}&side=buy`),
          fetch(`${CLOB_API_BASE}/price?token_id=${downTokenId}&side=buy`)
        ])

        let upOdds = 0
        let downOdds = 0
        let method = ''

        if (upResponse.ok && downResponse.ok) {
          const upData = await upResponse.json()
          const downData = await downResponse.json()
          upOdds = parseFloat(upData.price) * 100
          downOdds = parseFloat(downData.price) * 100
          method = '/price endpoint'
        } else {
          // Method 2: Fallback to price history
          const historyUrl = `${CLOB_API_BASE}/prices-history?market=${upTokenId}&interval=1m&fidelity=1`
          const historyResponse = await fetch(historyUrl)

          if (historyResponse.ok) {
            const historyData = await historyResponse.json()
            if (historyData.history && historyData.history.length > 0) {
              const latestUp = historyData.history[historyData.history.length - 1]
              upOdds = latestUp.p * 100
              method = 'price history (last point)'
            }
          }

          const historyUrlDown = `${CLOB_API_BASE}/prices-history?market=${downTokenId}&interval=1m&fidelity=1`
          const historyResponseDown = await fetch(historyUrlDown)

          if (historyResponseDown.ok) {
            const historyDataDown = await historyResponseDown.json()
            if (historyDataDown.history && historyDataDown.history.length > 0) {
              const latestDown = historyDataDown.history[historyDataDown.history.length - 1]
              downOdds = latestDown.p * 100
            }
          }
        }

        if (upOdds === 0 && downOdds === 0) {
          console.log('⚠️  Could not fetch odds for this market\n')
          continue
        }

        console.log(`\n📊 Current Odds (via ${method}):`)
        console.log(`   UP:   ${upOdds.toFixed(1)}% ${upOdds > downOdds ? '✅ (Favored)' : ''}`)
        console.log(`   DOWN: ${downOdds.toFixed(1)}% ${downOdds > upOdds ? '✅ (Favored)' : ''}`)

        const confidence = Math.abs(upOdds - downOdds)
        console.log(`   Confidence spread: ${confidence.toFixed(1)}%`)

        if (confidence > 20) {
          console.log(`   🔥 High confidence prediction!`)
        } else if (confidence < 5) {
          console.log(`   ⚖️  Very uncertain / close call`)
        }

        console.log()

      } catch (error) {
        console.log(`❌ Error fetching odds: ${error}`)
        console.log()
      }
    }

    // Step 3: Summary statistics
    console.log('\n📊 Summary Statistics')
    console.log('═'.repeat(50))
    console.log(`Total active BTC markets: ${btcMarkets.length}`)

    // Parse times to get upcoming vs past markets
    const now = new Date()
    const upcomingMarkets = btcMarkets.filter(m => new Date(m.endDate) > now)
    const pastMarkets = btcMarkets.filter(m => new Date(m.endDate) <= now)

    console.log(`Upcoming markets: ${upcomingMarkets.length}`)
    console.log(`Past markets: ${pastMarkets.length}`)

    if (upcomingMarkets.length > 0) {
      console.log('\n🔮 Next upcoming markets:')
      upcomingMarkets.slice(0, 3).forEach((m, i) => {
        const endTime = new Date(m.endDate).toLocaleString()
        console.log(`   ${i + 1}. ${m.question}`)
        console.log(`      Ends: ${endTime}`)
      })
    }

    console.log('\n✅ Test completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
    }
  }
}

// Run the test
testPolymarketOdds()
