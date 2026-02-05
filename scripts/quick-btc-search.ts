#!/usr/bin/env ts-node
/**
 * Quick Bitcoin market search on Polymarket
 * Simple, focused search with clean output
 *
 * Run with: npx ts-node scripts/quick-btc-search.ts
 * Or with custom query: npx ts-node scripts/quick-btc-search.ts "btc price"
 */

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'

interface Market {
  id: string
  question: string
  slug: string
  clobTokenIds: string[]
  active: boolean
  closed: boolean
  endDate: string
  volume24hr?: string
  tokens?: Array<{
    outcome: string
    price: string
  }>
}

async function searchBitcoinMarkets(query: string = 'bitcoin') {
  console.log(`\n🔍 Searching for "${query}" markets on Polymarket...\n`)

  try {
    // Use public search endpoint for more accurate results
    const url = new URL(`${GAMMA_API_BASE}/public-search`)
    url.searchParams.set('q', query)
    url.searchParams.set('limit_per_type', '100')
    url.searchParams.set('keep_closed_markets', '0')

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const data = await response.json()
    const markets: Market[] = data.markets || []

    if (markets.length === 0) {
      console.log('❌ No markets found')
      return
    }

    console.log(`✅ Found ${markets.length} markets\n`)

    // Separate active and upcoming markets
    const now = new Date()
    const activeMarkets = markets.filter(m => m.active && !m.closed && new Date(m.endDate) > now)
    const otherMarkets = markets.filter(m => !m.active || m.closed || new Date(m.endDate) <= now)

    // Display active markets
    if (activeMarkets.length > 0) {
      console.log('🟢 ACTIVE MARKETS')
      console.log('═'.repeat(80))
      console.log()

      activeMarkets.forEach((market, i) => {
        console.log(`${i + 1}. ${market.question}`)
        console.log(`   Market ID: ${market.id}`)
        console.log(`   Ends: ${new Date(market.endDate).toLocaleString()}`)

        if (market.volume24hr) {
          const vol = parseFloat(market.volume24hr).toLocaleString()
          console.log(`   24h Volume: $${vol}`)
        }

        if (market.tokens && market.tokens.length > 0) {
          console.log(`   Current Odds:`)
          market.tokens.forEach(token => {
            const price = (parseFloat(token.price) * 100).toFixed(1)
            console.log(`     ${token.outcome}: ${price}%`)
          })
        }

        if (market.clobTokenIds && market.clobTokenIds.length > 0) {
          console.log(`   Token IDs: ${market.clobTokenIds.join(', ')}`)
        }

        console.log()
      })
    }

    // Display other markets
    if (otherMarkets.length > 0) {
      console.log(`⚫ OTHER MARKETS (${otherMarkets.length} closed/inactive)`)
      console.log('═'.repeat(80))
      console.log()

      otherMarkets.slice(0, 5).forEach((market, i) => {
        const status = market.closed ? 'CLOSED' : 'INACTIVE'
        console.log(`${i + 1}. [${status}] ${market.question}`)
      })

      if (otherMarkets.length > 5) {
        console.log(`   ... and ${otherMarkets.length - 5} more`)
      }
      console.log()
    }

    // Summary
    console.log('📊 SUMMARY')
    console.log('═'.repeat(80))
    console.log(`Total markets found: ${markets.length}`)
    console.log(`Active & upcoming: ${activeMarkets.length}`)
    console.log(`Closed/inactive: ${otherMarkets.length}`)
    console.log()

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
  }
}

// Get search query from command line args or use default
const searchQuery = process.argv[2] || 'bitcoin'

searchBitcoinMarkets(searchQuery)
