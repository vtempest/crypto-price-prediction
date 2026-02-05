/**
 * Test script to verify slug-based market fetching
 * Run with: node test-slug-approach.js
 */

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'

// Calculate the slug timestamp for a given date and interval
function calculateSlugTimestamp(date, intervalIndex) {
  // Create date in PST timezone
  const baseDate = new Date(date + 'T00:00:00-08:00')

  // Add the interval minutes
  const intervalMinutes = intervalIndex * 15
  baseDate.setMinutes(baseDate.getMinutes() + intervalMinutes)

  // Convert to Unix timestamp (seconds)
  return Math.floor(baseDate.getTime() / 1000)
}

// Fetch market by slug
async function fetchMarketBySlug(slug) {
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

async function testSlugApproach() {
  console.log('='.repeat(80))
  console.log('TESTING SLUG-BASED MARKET FETCHING')
  console.log('='.repeat(80))
  console.log()

  // Test with today's date
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]

  console.log(`Testing with date: ${dateStr}`)
  console.log()

  // Test a few intervals
  const testIntervals = [0, 1, 2, 3, 4, 5] // First 6 intervals of the day

  for (const intervalIndex of testIntervals) {
    const slugTimestamp = calculateSlugTimestamp(dateStr, intervalIndex)
    const slug = `btc-updown-15m-${slugTimestamp}`

    console.log(`\n📊 Interval ${intervalIndex}:`)
    console.log(`   Timestamp: ${slugTimestamp}`)
    console.log(`   Slug: ${slug}`)
    console.log(`   Date: ${new Date(slugTimestamp * 1000).toISOString()}`)

    // Try to fetch the market
    const market = await fetchMarketBySlug(slug)

    if (market) {
      console.log(`   ✅ Market found!`)
      console.log(`      ID: ${market.id}`)
      console.log(`      Question: ${market.question}`)
      console.log(`      Active: ${market.active}, Closed: ${market.closed}`)
    } else {
      console.log(`   ❌ Market not found (may not exist yet or already passed)`)
    }
  }

  // Also test with the known URL from earlier
  console.log('\n\n' + '='.repeat(80))
  console.log('TESTING WITH KNOWN SLUG')
  console.log('='.repeat(80))
  console.log()

  const knownSlug = 'btc-updown-15m-1770198300'
  console.log(`Known slug: ${knownSlug}`)
  console.log(`Known timestamp: 1770198300 = ${new Date(1770198300 * 1000).toISOString()}`)

  const knownMarket = await fetchMarketBySlug(knownSlug)

  if (knownMarket) {
    console.log(`\n✅ Market found!`)
    console.log(`   ID: ${knownMarket.id}`)
    console.log(`   Question: ${knownMarket.question}`)
    console.log(`   Active: ${knownMarket.active}`)
    console.log(`   Closed: ${knownMarket.closed}`)
    console.log(`   Event Start: ${knownMarket.eventStartTime}`)

    // Parse token IDs
    const tokenIds = typeof knownMarket.clobTokenIds === 'string'
      ? JSON.parse(knownMarket.clobTokenIds)
      : knownMarket.clobTokenIds

    console.log(`   Token IDs:`)
    console.log(`      Up:   ${tokenIds[0]}`)
    console.log(`      Down: ${tokenIds[1]}`)
  } else {
    console.log(`\n❌ Market not found`)
  }

  console.log('\n\n' + '='.repeat(80))
  console.log('✅ TEST COMPLETE')
  console.log('='.repeat(80))
  console.log()
}

testSlugApproach().catch(console.error)
