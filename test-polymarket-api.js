/**
 * Test script to explore Polymarket Gamma API and find BTC Up/Down markets
 * Run with: node test-polymarket-api.js
 */

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'
const CLOB_API_BASE = 'https://clob.polymarket.com'

async function searchBTCMarkets() {
  console.log('='.repeat(80))
  console.log('SEARCHING FOR BTC UP/DOWN MARKETS IN GAMMA API')
  console.log('='.repeat(80))
  console.log()

  try {
    // Try fetching a known market ID directly
    console.log('📡 Fetching known BTC market...')
    console.log('-'.repeat(80))

    const knownMarketId = '1324407'
    console.log(`   Market ID: ${knownMarketId}`)
    console.log(`   URL: ${GAMMA_API_BASE}/markets/${knownMarketId}`)

    const response = await fetch(`${GAMMA_API_BASE}/markets/${knownMarketId}`)

    if (!response.ok) {
      console.log(`   ❌ Failed: HTTP ${response.status}`)
      return null
    }

    const market = await response.json()
    console.log('   ✅ Market retrieved successfully!')
    console.log('\n   📊 Market Details:')
    console.log(`      Question: ${market.question}`)
    console.log(`      Market ID: ${market.id}`)
    console.log(`      Active: ${market.active}, Closed: ${market.closed}`)
    console.log(`      Restricted: ${market.restricted}`)
    console.log(`      Start: ${market.startDate}`)
    console.log(`      End: ${market.endDate}`)
    console.log(`      Outcomes: ${market.outcomes}`)
    console.log(`      Outcome Prices: ${market.outcomePrices}`)
    console.log(`      Volume: $${parseFloat(market.volume).toLocaleString()}`)
    console.log(`      Accepting Orders: ${market.acceptingOrders}`)

    // Parse token IDs
    const tokenIds = JSON.parse(market.clobTokenIds)
    console.log(`\n   🎫 Token IDs:`)
    console.log(`      Up Token:   ${tokenIds[0]}`)
    console.log(`      Down Token: ${tokenIds[1]}`)

    return { market, tokenIds }

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    return null
  }
}

async function testPriceHistory(tokenId, label = 'Token') {
  console.log('\n\n' + '='.repeat(80))
  console.log(`TESTING PRICE HISTORY FOR ${label.toUpperCase()}`)
  console.log('='.repeat(80))

  console.log(`\n📡 Token ID: ${tokenId.substring(0, 30)}...`)
  console.log('-'.repeat(80))

  try {
    // Get the last 1 hour of data
    const url = `${CLOB_API_BASE}/prices-history?market=${tokenId}&interval=1h&fidelity=1`
    console.log(`   URL: ${url.substring(0, 100)}...`)

    const response = await fetch(url)

    if (!response.ok) {
      console.log(`   ❌ Failed: HTTP ${response.status}`)
      const text = await response.text()
      console.log(`   Response: ${text}`)
      return
    }

    const data = await response.json()
    console.log(`   ✅ Success! Retrieved ${data.history?.length || 0} price points`)

    if (data.history && data.history.length > 0) {
      console.log('\n   📊 First 5 data points:')
      data.history.slice(0, 5).forEach((point, idx) => {
        const timestamp = new Date(point.t * 1000).toISOString()
        console.log(`      ${idx + 1}. Time: ${timestamp}, Price: ${(point.p * 100).toFixed(2)}%`)
      })

      console.log('\n   📊 Last 5 data points:')
      data.history.slice(-5).forEach((point, idx) => {
        const timestamp = new Date(point.t * 1000).toISOString()
        console.log(`      ${data.history.length - 4 + idx}. Time: ${timestamp}, Price: ${(point.p * 100).toFixed(2)}%`)
      })

      // Calculate statistics
      const prices = data.history.map(p => p.p * 100)
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length

      console.log('\n   📈 Statistics:')
      console.log(`      Min Price: ${minPrice.toFixed(2)}%`)
      console.log(`      Max Price: ${maxPrice.toFixed(2)}%`)
      console.log(`      Avg Price: ${avgPrice.toFixed(2)}%`)
      console.log(`      Price Range: ${(maxPrice - minPrice).toFixed(2)}%`)
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
  }
}

async function testCurrentPrice(tokenId, label = 'Token') {
  console.log('\n\n' + '='.repeat(80))
  console.log(`TESTING CURRENT PRICE FOR ${label.toUpperCase()}`)
  console.log('='.repeat(80))

  console.log(`\n📡 Token ID: ${tokenId.substring(0, 30)}...`)
  console.log('-'.repeat(80))

  try {
    const url = `${CLOB_API_BASE}/price?token_id=${tokenId}&side=buy`
    console.log(`   URL: ${url.substring(0, 100)}...`)

    const response = await fetch(url)

    if (!response.ok) {
      console.log(`   ❌ Failed: HTTP ${response.status}`)
      const text = await response.text()
      console.log(`   Response: ${text}`)
      return
    }

    const data = await response.json()
    console.log('   ✅ Success!')
    console.log('\n   📊 Current Price Data:')
    console.log(`      Price: ${(parseFloat(data.price) * 100).toFixed(2)}%`)
    console.log(`      Full Response:`)
    console.log(JSON.stringify(data, null, 2).split('\n').map(line => '      ' + line).join('\n'))
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
  }
}

async function searchForActiveBTCMarkets() {
  console.log('\n\n' + '='.repeat(80))
  console.log('SEARCHING FOR ACTIVE BTC MARKETS BY ID PATTERN')
  console.log('='.repeat(80))
  console.log()

  // BTC markets seem to follow a pattern - let's try to find them
  // Market 1324407 is for Feb 4, 12:45AM-1:00AM ET
  // Try nearby IDs to find more markets

  const baseId = 1324407
  const idsToTry = []

  // Try IDs around the known one
  for (let offset = -5; offset <= 5; offset++) {
    if (offset !== 0) {
      idsToTry.push(baseId + offset)
    }
  }

  console.log(`🔍 Testing ${idsToTry.length} market IDs near ${baseId}...\n`)

  const foundMarkets = []

  for (const id of idsToTry) {
    try {
      const response = await fetch(`${GAMMA_API_BASE}/markets/${id}`)

      if (response.ok) {
        const market = await response.json()
        const isBTC = market.question.toLowerCase().includes('bitcoin') &&
                      market.question.toLowerCase().includes('up or down')

        if (isBTC) {
          foundMarkets.push(market)
          console.log(`✅ Found BTC market ${id}: ${market.question}`)
          console.log(`   Active: ${market.active}, Closed: ${market.closed}, Restricted: ${market.restricted}`)
        }
      }
    } catch (error) {
      // Ignore errors, just skip
    }
  }

  console.log(`\n📊 Total BTC markets found: ${foundMarkets.length}`)

  return foundMarkets
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Starting Polymarket API tests...\n')

  const marketData = await searchBTCMarkets()

  if (marketData) {
    const { market, tokenIds } = marketData

    // Test price history for both tokens
    await testPriceHistory(tokenIds[0], 'UP Token')
    await testPriceHistory(tokenIds[1], 'DOWN Token')

    // Test current price for both tokens
    await testCurrentPrice(tokenIds[0], 'UP Token')
    await testCurrentPrice(tokenIds[1], 'DOWN Token')
  }

  // Try to find more active markets
  await searchForActiveBTCMarkets()

  console.log('\n\n' + '='.repeat(80))
  console.log('✅ ALL TESTS COMPLETE')
  console.log('='.repeat(80))
  console.log()
}

runAllTests().catch(console.error)
