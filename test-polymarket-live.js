// Test script for Polymarket live data fetching
// Tests the real BTC Up/Down 15-minute markets

const CLOB_API_BASE = 'https://clob.polymarket.com';
const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';

async function testMarketFetch() {
  console.log('=== Testing Polymarket Live Data ===\n');

  // Test 1: Fetch a specific known market
  console.log('Test 1: Fetching specific market (ID: 1324407)');
  try {
    const response = await fetch(`${GAMMA_API_BASE}/markets/1324407`);
    const market = await response.json();

    console.log(`✓ Market found: "${market.question}"`);
    console.log(`  Active: ${market.active}, Closed: ${market.closed}`);
    console.log(`  Start: ${market.startDate}`);
    console.log(`  End: ${market.endDate}`);
    console.log(`  Token IDs:`, JSON.parse(market.clobTokenIds));
    console.log('');

    return market;
  } catch (error) {
    console.error('✗ Failed to fetch market:', error.message);
    return null;
  }
}

async function testPriceHistory(market) {
  if (!market) return;

  console.log('Test 2: Fetching price history for market tokens');

  try {
    const tokenIds = JSON.parse(market.clobTokenIds);
    const upTokenId = tokenIds[0];

    // Get a 15-minute window of data
    const now = Math.floor(Date.now() / 1000);
    const fifteenMinutesAgo = now - (15 * 60);

    const url = `${CLOB_API_BASE}/prices-history?` +
      `market=${upTokenId}&` +
      `startTs=${fifteenMinutesAgo}&` +
      `endTs=${now}&` +
      `fidelity=1`;

    console.log(`  Fetching last 15 minutes of data...`);
    console.log(`  URL: ${url}`);

    const response = await fetch(url);
    const data = await response.json();

    console.log(`✓ Received ${data.history.length} data points`);

    if (data.history.length > 0) {
      const first = data.history[0];
      const last = data.history[data.history.length - 1];

      console.log(`  First: ${new Date(first.t * 1000).toISOString()} - Price: ${(first.p * 100).toFixed(1)}%`);
      console.log(`  Last:  ${new Date(last.t * 1000).toISOString()} - Price: ${(last.p * 100).toFixed(1)}%`);
    }
    console.log('');

    return data;
  } catch (error) {
    console.error('✗ Failed to fetch price history:', error.message);
    return null;
  }
}

async function testLocalAPI() {
  console.log('Test 3: Testing local API endpoint with live data');

  try {
    const date = new Date().toISOString().split('T')[0]; // Today's date
    const url = `http://localhost:3000/api/polymarket-price?date=${date}`;

    console.log(`  Fetching: ${url}`);

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.log(`✗ API returned error: ${data.error}`);
      console.log(`  Details: ${data.details || 'none'}`);
    } else if (data.intervals && data.intervals.length > 0) {
      console.log(`✓ API returned ${data.intervals.length} intervals`);
      console.log(`  Most recent index: ${data.mostRecentIndex}`);
      console.log(`  Sample interval: ${data.intervals[0].label}`);
    } else {
      console.log(`ℹ No intervals found: ${data.message || 'unknown reason'}`);
    }
    console.log('');

    return data;
  } catch (error) {
    console.error('✗ Failed to test local API:', error.message);
    return null;
  }
}

async function searchForActiveMarkets() {
  console.log('Test 4: Searching for all active Bitcoin markets');

  try {
    const url = `${GAMMA_API_BASE}/markets?active=true&closed=false&limit=1000`;
    console.log(`  Fetching markets...`);

    const response = await fetch(url);
    const markets = await response.json();

    console.log(`  Total markets fetched: ${markets.length}`);

    // Search for Bitcoin markets
    const btcMarkets = markets.filter(m =>
      m.question.toLowerCase().includes('bitcoin') ||
      m.question.toLowerCase().includes('btc')
    );

    console.log(`  Bitcoin-related markets: ${btcMarkets.length}`);

    // Search specifically for Up or Down markets
    const upDownMarkets = markets.filter(m =>
      m.question.includes('Up or Down') ||
      m.question.includes('up or down')
    );

    console.log(`  "Up or Down" markets: ${upDownMarkets.length}`);

    if (upDownMarkets.length > 0) {
      console.log('  Found markets:');
      upDownMarkets.slice(0, 3).forEach(m => {
        console.log(`    - [${m.id}] ${m.question}`);
      });
    }
    console.log('');

  } catch (error) {
    console.error('✗ Failed to search markets:', error.message);
  }
}

// Run all tests
async function runTests() {
  const market = await testMarketFetch();
  await testPriceHistory(market);
  await testLocalAPI();
  await searchForActiveMarkets();

  console.log('=== Tests Complete ===');
}

runTests().catch(console.error);
