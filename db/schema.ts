import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const btcPriceCache = sqliteTable("btc_price_cache", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // Format: YYYY-MM-DD
  timestamp: integer("timestamp").notNull(), // Unix timestamp in milliseconds
  time: text("time").notNull(), // HH:MM:SS in PST
  open: real("open").notNull(),
  high: real("high").notNull(),
  low: real("low").notNull(),
  close: real("close").notNull(),
  volume: real("volume").notNull(),
  numberOfTrades: integer("number_of_trades").notNull(),
  polymarketOdds: real("polymarket_odds"), // Polymarket prediction odds (0-100) at this time
  createdAt: integer("created_at").notNull(), // When this record was cached
});

// Create a unique index on date and timestamp to prevent duplicates
export const btcPriceCacheIndex = sqliteTable("btc_price_cache_index", {
  date: text("date"),
  timestamp: integer("timestamp"),
});

export const polymarketIntervalsCache = sqliteTable("polymarket_intervals_cache", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  intervalIndex: integer("interval_index").notNull(),
  data: text("data").notNull(),
  createdAt: integer("created_at").notNull(),
});
