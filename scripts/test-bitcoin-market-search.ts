#!/usr/bin/env ts-node
/**
 * Test script to search for Bitcoin markets on Polymarket
 * Demonstrates different search methods and API endpoints
 *
 * Run with: npx ts-node scripts/test-bitcoin-market-search.ts
 */

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'

interface PolymarketMarket {
  id: string
  question: string
  slug: string
  description?: string
  clobTokenIds: string[]
  active: boolean
  closed: boolean
  archived: boolean
  startDate?: string
  endDate: string
  volume?: string
  volume24hr?: string
  liquidity?: string
  enableOrderBook: boolean
  outcomes?: string[]
  outcomePrices?: string[]
  tokens?: Array<{
    token_id: string
    outcome: string
    price: string
  }>
}

interface SearchResult {
  events?: any[]
  markets?: PolymarketMarket[]
  profiles?: any[]
}

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logSection(title: string) {
  console.log()
  log('═'.repeat(70), colors.dim)
  log(title, colors.bright + colors.cyan)
  log('═'.repeat(70), colors.dim)
  console.log()
}

function displayMarket(market: PolymarketMarket, index?: number) {
  const prefix = index !== undefined ? `${index + 1}. ` : ''

  log(`${prefix}${market.question}`, colors.bright)
  log(`   ID: ${market.id}`, colors.dim)
  log(`   Slug: ${market.slug}`, colors.dim)

  if (market.description) {
    const shortDesc = market.description.length > 100
      ? market.description.substring(0, 100) + '...'
      : market.description
    log(`   Description: ${shortDesc}`, colors.dim)
  }

  log(`   Status: ${market.active ? '🟢 Active' : '⚫ Inactive'} | ${market.closed ? '🔒 Closed' : '🔓 Open'}`,
      market.active && !market.closed ? colors.green : colors.yellow)

  if (market.endDate) {
    const endDate = new Date(market.endDate)
    log(`   Ends: ${endDate.toLocaleString()}`, colors.dim)
  }

  if (market.volume24hr) {
    const volume = parseFloat(market.volume24hr)
    log(`   24h Volume: $${volume.toLocaleString()}`, colors.cyan)
  }

  if (market.tokens && market.tokens.length > 0) {
    log(`   Outcomes:`, colors.dim)
    market.tokens.forEach((token, i) => {
      const price = (parseFloat(token.price) * 100).toFixed(1)
      log(`      ${token.outcome}: ${price}%`, colors.magenta)
    })
  }

  if (market.clobTokenIds && market.clobTokenIds.length > 0) {
    log(`   Token IDs: ${market.clobTokenIds.join(', ')}`, colors.dim)
  }

  console.log()
}

/**
 * Method 1: Search using the general /markets endpoint with filtering
 */
async function searchMarketsGeneralEndpoint(searchTerm: string = 'bitcoin', limit: number = 100) {
  logSection(`Method 1: Search via /markets endpoint (filtering for "${searchTerm}")`)

  try {
    const url = `${GAMMA_API_BASE}/markets?closed=false&active=true&limit=${limit}`
    log(`Fetching: ${url}`, colors.dim)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }

    const markets: PolymarketMarket[] = await response.json()

    // Filter for Bitcoin-related markets
    const btcMarkets = markets.filter(market => {
      const question = market.question.toLowerCase()
      const slug = market.slug?.toLowerCase() || ''
      const description = market.description?.toLowerCase() || ''

      return question.includes(searchTerm.toLowerCase()) ||
             slug.includes(searchTerm.toLowerCase()) ||
             description.includes(searchTerm.toLowerCase())
    })

    log(`✅ Total markets fetched: ${markets.length}`, colors.green)
    log(`✅ Bitcoin-related markets found: ${btcMarkets.length}`, colors.green)

    if (btcMarkets.length > 0) {
      console.log()
      log('Top 10 Bitcoin markets:', colors.bright)
      btcMarkets.slice(0, 10).forEach((market, i) => displayMarket(market, i))
    }

    return btcMarkets

  } catch (error) {
    log(`❌ Error: ${error}`, colors.yellow)
    throw error
  }
}

/**
 * Method 2: Search using the /public-search endpoint (more targeted)
 */
async function searchMarketsPublicSearch(query: string = 'bitcoin', limit: number = 50) {
  logSection(`Method 2: Search via /public-search endpoint (query: "${query}")`)

  try {
    const url = new URL(`${GAMMA_API_BASE}/public-search`)
    url.searchParams.set('q', query)
    url.searchParams.set('limit_per_type', String(limit))
    url.searchParams.set('keep_closed_markets', '0')
    url.searchParams.set('search_tags', 'true')

    log(`Fetching: ${url.toString()}`, colors.dim)

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }

    const results: SearchResult = await response.json()

    const markets = results.markets || []

    log(`✅ Markets found: ${markets.length}`, colors.green)

    if (results.events) {
      log(`✅ Events found: ${results.events.length}`, colors.green)
    }

    if (markets.length > 0) {
      console.log()
      log('Search Results:', colors.bright)
      markets.forEach((market, i) => displayMarket(market, i))
    }

    return markets

  } catch (error) {
    log(`❌ Error: ${error}`, colors.yellow)
    throw error
  }
}

/**
 * Method 3: Search for specific BTC "Up or Down" markets
 */
async function searchBTCUpDownMarkets() {
  logSection('Method 3: Search for BTC "Up or Down" 15-minute markets')

  try {
    const url = `${GAMMA_API_BASE}/markets?closed=false&active=true&limit=2000`
    log(`Fetching: ${url}`, colors.dim)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }

    const markets: PolymarketMarket[] = await response.json()

    // Filter for BTC Up/Down markets
    const btcUpDownMarkets = markets.filter(market => {
      const q = market.question.toLowerCase()
      return (q.includes('bitcoin') || q.includes('btc')) &&
             q.includes('up or down')
    })

    log(`✅ Total markets fetched: ${markets.length}`, colors.green)
    log(`✅ BTC "Up or Down" markets: ${btcUpDownMarkets.length}`, colors.green)

    if (btcUpDownMarkets.length > 0) {
      // Group by date if possible
      const upcomingMarkets = btcUpDownMarkets.filter(m => new Date(m.endDate) > new Date())
      const pastMarkets = btcUpDownMarkets.filter(m => new Date(m.endDate) <= new Date())

      log(`   Upcoming: ${upcomingMarkets.length}`, colors.cyan)
      log(`   Past: ${pastMarkets.length}`, colors.dim)

      console.log()
      log('Next 10 upcoming BTC Up/Down markets:', colors.bright)
      upcomingMarkets.slice(0, 10).forEach((market, i) => displayMarket(market, i))
    }

    return btcUpDownMarkets

  } catch (error) {
    log(`❌ Error: ${error}`, colors.yellow)
    throw error
  }
}

/**
 * Method 4: Search for all BTC price prediction markets (broader search)
 */
async function searchAllBTCPriceMarkets() {
  logSection('Method 4: Search for ALL Bitcoin price-related markets')

  try {
    const url = `${GAMMA_API_BASE}/markets?closed=false&active=true&limit=2000`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }

    const markets: PolymarketMarket[] = await response.json()

    // Filter for various BTC price-related keywords
    const keywords = ['bitcoin', 'btc', 'price', 'above', 'below', 'reach', 'hit']

    const btcPriceMarkets = markets.filter(market => {
      const text = (market.question + ' ' + market.slug + ' ' + (market.description || '')).toLowerCase()

      // Must include bitcoin/btc AND at least one other keyword
      const hasBTC = text.includes('bitcoin') || text.includes('btc')
      const hasPriceKeyword = keywords.some(keyword => text.includes(keyword))

      return hasBTC && hasPriceKeyword
    })

    log(`✅ Total markets fetched: ${markets.length}`, colors.green)
    log(`✅ BTC price-related markets: ${btcPriceMarkets.length}`, colors.green)

    // Categorize markets
    const categories: Record<string, PolymarketMarket[]> = {
      'Up or Down': [],
      'Price Target': [],
      'Range': [],
      'Other': []
    }

    btcPriceMarkets.forEach(market => {
      const q = market.question.toLowerCase()
      if (q.includes('up or down')) {
        categories['Up or Down'].push(market)
      } else if (q.includes('above') || q.includes('below') || q.includes('reach') || q.includes('hit')) {
        categories['Price Target'].push(market)
      } else if (q.includes('between') || q.includes('range')) {
        categories['Range'].push(market)
      } else {
        categories['Other'].push(market)
      }
    })

    console.log()
    log('Markets by Category:', colors.bright)
    Object.entries(categories).forEach(([category, categoryMarkets]) => {
      if (categoryMarkets.length > 0) {
        log(`\n📊 ${category} (${categoryMarkets.length} markets)`, colors.cyan)
        categoryMarkets.slice(0, 3).forEach((market, i) => {
          log(`   ${i + 1}. ${market.question}`, colors.dim)
        })
        if (categoryMarkets.length > 3) {
          log(`   ... and ${categoryMarkets.length - 3} more`, colors.dim)
        }
      }
    })

    return btcPriceMarkets

  } catch (error) {
    log(`❌ Error: ${error}`, colors.yellow)
    throw error
  }
}

/**
 * Method 5: Get a specific market by ID
 */
async function getMarketById(marketId: string) {
  logSection(`Method 5: Fetch specific market by ID (${marketId})`)

  try {
    const url = `${GAMMA_API_BASE}/markets/${marketId}`
    log(`Fetching: ${url}`, colors.dim)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }

    const market: PolymarketMarket = await response.json()

    log(`✅ Market found!`, colors.green)
    console.log()
    displayMarket(market)

    return market

  } catch (error) {
    log(`❌ Error: ${error}`, colors.yellow)
    throw error
  }
}

/**
 * Summary statistics across all search methods
 */
async function generateSummary(allResults: PolymarketMarket[]) {
  logSection('📊 Summary Statistics')

  const uniqueMarkets = new Map<string, PolymarketMarket>()
  allResults.forEach(market => uniqueMarkets.set(market.id, market))

  const markets = Array.from(uniqueMarkets.values())

  log(`Total unique Bitcoin markets found: ${markets.length}`, colors.bright + colors.green)

  // Active vs Inactive
  const activeMarkets = markets.filter(m => m.active && !m.closed)
  const closedMarkets = markets.filter(m => m.closed)
  const inactiveMarkets = markets.filter(m => !m.active && !m.closed)

  console.log()
  log('Status Breakdown:', colors.bright)
  log(`  🟢 Active & Open: ${activeMarkets.length}`, colors.green)
  log(`  🔒 Closed: ${closedMarkets.length}`, colors.yellow)
  log(`  ⚫ Inactive: ${inactiveMarkets.length}`, colors.dim)

  // Upcoming vs Past
  const now = new Date()
  const upcomingMarkets = markets.filter(m => new Date(m.endDate) > now)
  const pastMarkets = markets.filter(m => new Date(m.endDate) <= now)

  console.log()
  log('Timeline:', colors.bright)
  log(`  🔮 Upcoming: ${upcomingMarkets.length}`, colors.cyan)
  log(`  📜 Past: ${pastMarkets.length}`, colors.dim)

  // Volume analysis
  const marketsWithVolume = markets.filter(m => m.volume24hr && parseFloat(m.volume24hr) > 0)
  if (marketsWithVolume.length > 0) {
    const totalVolume = marketsWithVolume.reduce((sum, m) => sum + parseFloat(m.volume24hr || '0'), 0)
    console.log()
    log('Volume:', colors.bright)
    log(`  Markets with volume data: ${marketsWithVolume.length}`, colors.cyan)
    log(`  Total 24h volume: $${totalVolume.toLocaleString()}`, colors.cyan)

    // Top 5 by volume
    const topByVolume = marketsWithVolume
      .sort((a, b) => parseFloat(b.volume24hr || '0') - parseFloat(a.volume24hr || '0'))
      .slice(0, 5)

    console.log()
    log('  Top 5 by 24h volume:', colors.bright)
    topByVolume.forEach((market, i) => {
      const volume = parseFloat(market.volume24hr || '0')
      log(`    ${i + 1}. $${volume.toLocaleString()} - ${market.question}`, colors.dim)
    })
  }

  // Most upcoming markets
  if (upcomingMarkets.length > 0) {
    const nextMarkets = upcomingMarkets
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
      .slice(0, 5)

    console.log()
    log('🔜 Next 5 upcoming markets:', colors.bright + colors.green)
    nextMarkets.forEach((market, i) => {
      const endTime = new Date(market.endDate).toLocaleString()
      log(`  ${i + 1}. ${market.question}`, colors.dim)
      log(`     Ends: ${endTime}`, colors.dim)
    })
  }
}

/**
 * Main test runner
 */
async function main() {
  log('\n🔍 Polymarket Bitcoin Market Search Test', colors.bright + colors.cyan)
  log('Testing multiple search methods and API endpoints\n', colors.dim)

  const allResults: PolymarketMarket[] = []

  try {
    // Method 1: General endpoint with filtering
    const method1Results = await searchMarketsGeneralEndpoint('bitcoin', 500)
    allResults.push(...method1Results)

    await new Promise(resolve => setTimeout(resolve, 1000)) // Rate limit pause

    // Method 2: Public search
    const method2Results = await searchMarketsPublicSearch('bitcoin', 100)
    allResults.push(...method2Results)

    await new Promise(resolve => setTimeout(resolve, 1000))

    // Method 3: Specific Up/Down markets
    const method3Results = await searchBTCUpDownMarkets()
    allResults.push(...method3Results)

    await new Promise(resolve => setTimeout(resolve, 1000))

    // Method 4: All price-related markets
    const method4Results = await searchAllBTCPriceMarkets()
    allResults.push(...method4Results)

    // Generate summary
    await generateSummary(allResults)

    // Optional: Test specific market ID if you have one
    // Uncomment and replace with a real market ID to test
    // await getMarketById('1324407')

    logSection('✅ All tests completed successfully!')

  } catch (error) {
    logSection('❌ Test suite failed')
    console.error(error)
    process.exit(1)
  }
}

// Run the test suite
main()
