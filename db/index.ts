import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { btcPriceCache } from "./schema";
import path from "path";

// Create libsql client with local file database
const dbPath = path.join(process.cwd(), "local.db");
const client = createClient({
  url: `file:${dbPath}`,
});

export const db = drizzle(client, {
  schema: { btcPriceCache },
});

// Initialize database (create tables if they don't exist)
export async function initializeDatabase() {
  // Create table if it doesn't exist
  await client.execute(`
    CREATE TABLE IF NOT EXISTS btc_price_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      time TEXT NOT NULL,
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume REAL NOT NULL,
      number_of_trades INTEGER NOT NULL,
      polymarket_odds REAL,
      created_at INTEGER NOT NULL,
      UNIQUE(date, timestamp)
    );
  `);

  // Add polymarket_odds column to existing tables (no-op if already exists)
  await client.execute(`
    ALTER TABLE btc_price_cache ADD COLUMN polymarket_odds REAL;
  `).catch(() => { /* column already exists */ });

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_date ON btc_price_cache(date);
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_timestamp ON btc_price_cache(timestamp);
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_date_timestamp ON btc_price_cache(date, timestamp);
  `);
}

// Initialize on import
initializeDatabase().catch(console.error);

// Export client for direct queries if needed
export { client };
