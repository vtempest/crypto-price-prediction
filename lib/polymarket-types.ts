// Polymarket API type definitions

export interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  clobTokenIds: string[];
  active: boolean;
  closed: boolean;
  startDate: string;
  endDate: string;
  enableOrderBook: boolean;
  // Add other fields as needed
}

export interface PolymarketMarketsResponse {
  data: PolymarketMarket[];
  count: number;
  next_cursor?: string;
}

export interface PriceHistoryPoint {
  t: number; // Unix timestamp (seconds)
  p: number; // Price (0-1 range, where 1 = $1 or 100%)
}

export interface PriceHistoryResponse {
  history: PriceHistoryPoint[];
}

export interface MarketQuote {
  price: number; // Current mid price (0-1 range)
  bid: number; // Best bid price
  ask: number; // Best ask price
  volume: number; // 24h volume
  timestamp: number; // Unix timestamp
}

export interface OrderBookLevel {
  price: string;
  size: string;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
  market: string;
}

export interface ProcessedPolymarketInterval {
  index: number;
  label: string;
  data: {
    time: string;
    price: number; // Converted to percentage (0-100)
    open: number;
    high: number;
    low: number;
    highDiff: number; // Difference between high and start price
    lowDiff: number; // Difference between low and start price
  }[];
  isMostRecent?: boolean;
  marketQuestion?: string;
  quote?: MarketQuote; // Current market quote
  marketUrl?: string; // Direct link to Polymarket
}

/**
 * Fetches historical price data for a specific token/market.
 * @param options - Configuration options for the price history query
 * @param options.market - The token ID of the market outcome
 * @param options.interval - Time interval for data points (e.g., "1h", "1d", "max")
 * @param options.startTs - Optional start timestamp (Unix timestamp in seconds)
 * @param options.endTs - Optional end timestamp (Unix timestamp in seconds)
 * @param options.abs - Optional flag to return absolute prices instead of 0-1 probability scale
 * @param options.fidelity - Optional fidelity for data points (e.g., 1 for 1-minute intervals)
 * @returns Object containing history array with { t: timestamp, p: price } entries
 * @throws Error if the API request fails
 *
 * @example
 * // Get entire 1-hour interval history for a token
 * const history = await fetchPriceHistory({ market: "token_id", interval: "1h" });
 *
 * @example
 * // Get history for a specific time range with 1-minute fidelity
 * const history = await fetchPriceHistory({
 *   market: "token_id",
 *   interval: "1h",
 *   startTs: 1700000000,
 *   endTs: 1700086400,
 *   fidelity: 1
 * });
 */
export async function fetchPriceHistory(options: {
  market: string;
  interval?: string;
  startTs?: number;
  endTs?: number;
  abs?: boolean;
  fidelity?: number;
}) {
  const { market, interval = "1h", startTs, endTs, abs = false, fidelity } = options;

  const url = new URL("https://clob.polymarket.com/prices-history");
  url.searchParams.set("market", market);
  url.searchParams.set("interval", interval);
  url.searchParams.set("abs", String(abs));

  if (startTs !== undefined) {
    url.searchParams.set("startTs", String(startTs));
  }
  if (endTs !== undefined) {
    url.searchParams.set("endTs", String(endTs));
  }
  if (fidelity !== undefined) {
    url.searchParams.set("fidelity", String(fidelity));
  }

  const resp = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!resp.ok) {
    // Try to get error details from response body
    let errorDetails = "";
    try {
      const errorBody = await resp.text();
      errorDetails = errorBody ? ` - ${errorBody}` : "";
    } catch (e) {
      // Ignore if we can't read the body
    }

    // For 400 errors, provide more context
    if (resp.status === 400) {
      throw new Error(
        `Invalid token or price history not available for token ${market}${errorDetails}`,
      );
    }

    throw new Error(
      `Price history fetch failed for token ${market}: ${resp.status}${errorDetails}`,
    );
  }

  return await resp.json();
}

/**
 * Fetches Polymarket price history for a 15-minute interval.
 * Optimized for fetching minute-by-minute data within a 15-minute window for BTC price up/down predictions.
 *
 * @param options - Configuration options for the 15-minute interval query
 * @param options.market - The token ID of the market outcome (usually the "Up/Yes" token)
 * @param options.startTs - Start timestamp (Unix timestamp in seconds)
 * @param options.endTs - End timestamp (Unix timestamp in seconds)
 * @param options.abs - Optional flag to return absolute prices instead of 0-1 probability scale
 * @returns Object containing history array with { t: timestamp, p: price } entries at 1-minute intervals
 * @throws Error if the API request fails
 *
 * @example
 * // Get minute-by-minute data for a 15-minute interval
 * const startTime = Math.floor(new Date('2024-01-15T10:00:00-08:00').getTime() / 1000);
 * const endTime = startTime + (15 * 60); // 15 minutes later
 * const history = await fetch15MinuteInterval({
 *   market: "token_id",
 *   startTs: startTime,
 *   endTs: endTime
 * });
 *
 * @example
 * // Process the results for display
 * const data = await fetch15MinuteInterval({ market: "token_id", startTs, endTs });
 * const chartData = data.history.map(point => ({
 *   time: new Date(point.t * 1000).toLocaleTimeString(),
 *   price: point.p * 100 // Convert to percentage
 * }));
 */
export async function fetch15MinuteInterval(options: {
  market: string;
  startTs: number;
  endTs: number;
  abs?: boolean;
}): Promise<PriceHistoryResponse> {
  const { market, startTs, endTs, abs = false } = options;

  return fetchPriceHistory({
    market,
    startTs,
    endTs,
    abs,
    fidelity: 1, // 1-minute fidelity for detailed 15-minute data
  });
}

/**
 * Fetches current market price/quote for a token
 */
export async function fetchMarketPrice(tokenId: string): Promise<number | null> {
  try {
    const response = await fetch(`https://clob.polymarket.com/price?token_id=${tokenId}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`Failed to fetch price for token ${tokenId}`);
      return null;
    }

    const data = await response.json();
    return data.price ? parseFloat(data.price) : null;
  } catch (error) {
    console.error(`Error fetching market price for ${tokenId}:`, error);
    return null;
  }
}

/**
 * Fetches order book for a token
 */
export async function fetchOrderBook(tokenId: string): Promise<OrderBook | null> {
  try {
    const response = await fetch(`https://clob.polymarket.com/book?token_id=${tokenId}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`Failed to fetch order book for token ${tokenId}`);
      return null;
    }

    const data = await response.json();
    return {
      bids: data.bids || [],
      asks: data.asks || [],
      timestamp: Date.now(),
      market: tokenId,
    };
  } catch (error) {
    console.error(`Error fetching order book for ${tokenId}:`, error);
    return null;
  }
}

/**
 * Fetches comprehensive quote data including price and order book info
 */
export async function fetchMarketQuote(tokenId: string): Promise<MarketQuote | null> {
  try {
    const [price, orderBook] = await Promise.all([
      fetchMarketPrice(tokenId),
      fetchOrderBook(tokenId),
    ]);

    if (!price) return null;

    let bid = price;
    let ask = price;

    if (orderBook && orderBook.bids.length > 0 && orderBook.asks.length > 0) {
      bid = parseFloat(orderBook.bids[0].price);
      ask = parseFloat(orderBook.asks[0].price);
    }

    return {
      price,
      bid,
      ask,
      volume: 0, // Volume data would need separate endpoint
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Error fetching market quote for ${tokenId}:`, error);
    return null;
  }
}