/**
 * Test script for active BTC market
 * Run with: node test-active-market.js
 */

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'
const CLOB_API_BASE = 'https://clob.polymarket.com'

async function testActiveMarket() {
  console.log('='.repeat(80))
  console.log('TESTING ACTIVE BTC MARKET')
  console.log('='.repeat(80))
  console.log()

  // Use the active market we found
  const marketId = '1324410'

  console.log(`📡 Fetching active BTC market ${marketId}...`)
  console.log('-'.repeat(80))

  try {
    const response = await fetch(`${GAMMA_API_BASE}/markets/${marketId}`)

    if (!response.ok) {
      console.log(`   ❌ Failed: HTTP ${response.status}`)
      return
    }

    const market = await response.json()
    console.log('   ✅ Market retrieved successfully!')
    console.log('\n   📊 Market Details:')
    console.log(`      Question: ${market.question}`)
    console.log(`      Market ID: ${market.id}`)
    console.log(`      Active: ${market.active}`)
    console.log(`      Closed: ${market.closed}`)
    console.log(`      Restricted: ${market.restricted}`)
    console.log(`      Accepting Orders: ${market.acceptingOrders}`)
    console.log(`      Start: ${market.startDate}`)
    console.log(`      End: ${market.endDate}`)
    console.log(`      Event Start Time: ${market.eventStartTime}`)
    console.log(`      Volume: $${parseFloat(market.volume).toLocaleString()}`)

    // Parse token IDs
    const tokenIds = JSON.parse(market.clobTokenIds)
    console.log(`\n   🎫 Token IDs:`)
    console.log(`      Up Token:   ${tokenIds[0]}`)
    console.log(`      Down Token: ${tokenIds[1]}`)

    // Test price history for Up token
    console.log('\n\n' + '='.repeat(80))
    console.log('TESTING PRICE HISTORY FOR UP TOKEN')
    console.log('='.repeat(80))

    const upTokenId = tokenIds[0]
    console.log(`\n📡 Fetching price history for Up token...`)
    console.log(`   Token ID: ${upTokenId.substring(0, 30)}...`)

    // Try different intervals
    const intervals = ['1h', 'max']

    for (const interval of intervals) {
      console.log(`\n   Testing interval: ${interval}`)
      const historyUrl = `${CLOB_API_BASE}/prices-history?market=${upTokenId}&interval=${interval}&fidelity=1`

      const historyResponse = await fetch(historyUrl)

      if (!historyResponse.ok) {
        console.log(`   ❌ Failed: HTTP ${historyResponse.status}`)
        const text = await historyResponse.text()
        console.log(`   Response: ${text}`)
      } else {
        const historyData = await historyResponse.json()
        console.log(`   ✅ Success! Retrieved ${historyData.history?.length || 0} price points`)

        if (historyData.history && historyData.history.length > 0) {
          console.log(`\n   📊 First 3 data points:`)
          historyData.history.slice(0, 3).forEach((point, idx) => {
            const timestamp = new Date(point.t * 1000).toISOString()
            console.log(`      ${idx + 1}. Time: ${timestamp}, Price: ${(point.p * 100).toFixed(2)}%`)
          })

          console.log(`\n   📊 Last 3 data points:`)
          historyData.history.slice(-3).forEach((point, idx) => {
            const timestamp = new Date(point.t * 1000).toISOString()
            console.log(`      ${historyData.history.length - 2 + idx}. Time: ${timestamp}, Price: ${(point.p * 100).toFixed(2)}%`)
          })
        }
      }
    }

    // Test current price
    console.log('\n\n' + '='.repeat(80))
    console.log('TESTING CURRENT PRICE FOR UP TOKEN')
    console.log('='.repeat(80))

    const priceUrl = `${CLOB_API_BASE}/price?token_id=${upTokenId}&side=buy`
    console.log(`\n📡 URL: ${priceUrl.substring(0, 100)}...`)

    const priceResponse = await fetch(priceUrl)

    if (!priceResponse.ok) {
      console.log(`   ❌ Failed: HTTP ${priceResponse.status}`)
      const text = await priceResponse.text()
      console.log(`   Response: ${text}`)
    } else {
      const priceData = await priceResponse.json()
      console.log('   ✅ Success!')
      console.log('\n   📊 Current Price Data:')
      console.log(JSON.stringify(priceData, null, 2).split('\n').map(line => '   ' + line).join('\n'))
    }

    // Test with specific time range (for a 15-minute interval)
    console.log('\n\n' + '='.repeat(80))
    console.log('TESTING SPECIFIC 15-MINUTE INTERVAL')
    console.log('='.repeat(80))

    // Parse the event start time
    const eventStart = new Date(market.eventStartTime)
    const eventEnd = new Date(eventStart.getTime() + 15 * 60 * 1000)

    console.log(`\n📡 Event time range:`)
    console.log(`   Start: ${eventStart.toISOString()}`)
    console.log(`   End:   ${eventEnd.toISOString()}`)

    const startTs = Math.floor(eventStart.getTime() / 1000)
    const endTs = Math.floor(eventEnd.getTime() / 1000)

    const rangeUrl = `${CLOB_API_BASE}/prices-history?market=${upTokenId}&startTs=${startTs}&endTs=${endTs}&fidelity=1`
    console.log(`\n   URL: ${rangeUrl.substring(0, 100)}...`)

    const rangeResponse = await fetch(rangeUrl)

    if (!rangeResponse.ok) {
      console.log(`   ❌ Failed: HTTP ${rangeResponse.status}`)
      const text = await rangeResponse.text()
      console.log(`   Response: ${text}`)
    } else {
      const rangeData = await rangeResponse.json()
      console.log(`   ✅ Success! Retrieved ${rangeData.history?.length || 0} price points`)

      if (rangeData.history && rangeData.history.length > 0) {
        console.log(`\n   📊 All data points:`)
        rangeData.history.forEach((point, idx) => {
          const timestamp = new Date(point.t * 1000).toISOString()
          console.log(`      ${idx + 1}. Time: ${timestamp}, Price: ${(point.p * 100).toFixed(2)}%`)
        })
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error)
  }

  console.log('\n\n' + '='.repeat(80))
  console.log('✅ TEST COMPLETE')
  console.log('='.repeat(80))
  console.log()
}

testActiveMarket().catch(console.error)
