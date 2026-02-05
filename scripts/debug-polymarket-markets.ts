import fetch from "node-fetch";

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";

async function listActiveMarkets() {
  console.log("Fetching active markets...");
  const url = `${GAMMA_API_BASE}/markets?closed=false&active=true&limit=100`;
  const response = await fetch(url);
  const markets = await response.json();

  console.log(`Found ${markets.length} active markets.`);
  console.log("Sample markets (first 20):");
  markets.slice(0, 20).forEach((m: any) => {
    console.log(`- ID: ${m.id}`);
    console.log(`  Question: ${m.question}`);
    console.log(`  End Date: ${m.endDate}`);
    console.log("---");
  });

  // Check specifically for Bitcoin/BTC
  console.log('\nSearching for "Bitcoin" or "BTC" in all fetched markets:');
  const btcMarkets = markets.filter(
    (m: any) =>
      m.question.toLowerCase().includes("bitcoin") ||
      m.question.toLowerCase().includes("btc"),
  );

  btcMarkets.forEach((m: any) => {
    console.log(`[BTC Match] ${m.question} (ID: ${m.id})`);
  });
}

listActiveMarkets();
