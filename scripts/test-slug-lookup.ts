import fetch from "node-fetch";

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";

function calculateSlugTimestamp(date: string, intervalIndex: number): number {
  // Create date in PST timezone
  // Note: timestamps in slugs seem to be based on the event start time
  const baseDate = new Date(date + "T00:00:00-08:00");

  // Add the interval minutes
  const intervalMinutes = intervalIndex * 15;
  baseDate.setMinutes(baseDate.getMinutes() + intervalMinutes);

  // Convert to Unix timestamp (seconds)
  return Math.floor(baseDate.getTime() / 1000);
}

async function testSlugLookup() {
  const date = "2026-02-04"; // Today

  // Calculate a few recent/future intervals
  // 10:00 AM PST = Index 40
  // 10:15 AM PST = Index 41

  const intervalsToCheck = [40, 41, 42, 43, 60, 80];

  console.log(`Testing slug lookup for date: ${date}`);

  for (const index of intervalsToCheck) {
    const timestamp = calculateSlugTimestamp(date, index);
    const slug = `btc-updown-15m-${timestamp}`;
    const url = `${GAMMA_API_BASE}/events?slug=${slug}`;

    console.log(`\nChecking interval ${index} (Timestamp: ${timestamp})`);
    console.log(`Slug: ${slug}`);
    console.log(`URL: ${url}`);

    try {
      const response = await fetch(url);
      if (response.ok) {
        const events = await response.json();
        if (events && events.length > 0) {
          console.log(`✅ FOUND EVENT!`);
          const event = events[0];
          console.log(`   Title: ${event.title}`);

          if (event.markets && event.markets.length > 0) {
            const market = event.markets[0];
            console.log(`   Market ID: ${market.id}`);
            console.log(`   Question: ${market.question}`);
            console.log(`   Active: ${market.active}`);
            console.log(`   Closed: ${market.closed}`);
          } else {
            console.log(`   ⚠️ Event found but no markets inside.`);
          }
        } else {
          console.log(`❌ No event found for this slug.`);
        }
      } else {
        console.log(`❌ API Error: ${response.status}`);
      }
    } catch (err) {
      console.error(`❌ Fetch error: ${err}`);
    }
  }
}

testSlugLookup();
