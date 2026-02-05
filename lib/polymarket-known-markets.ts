/**
 * Known Bitcoin Up/Down 15-minute market IDs
 * These markets exist but may not appear in general API queries due to restrictions.
 *
 * Update this list with new market IDs as they become available.
 * You can find markets at: https://polymarket.com/event/btc-updown-15m-{timestamp}
 */

export interface KnownMarket {
  id: string;
  question: string;
  upTokenId: string;
  downTokenId: string;
  startTime: Date;
  endTime: Date;
}

/**
 * Fetches a known market by ID
 */
export async function fetchKnownMarket(marketId: string) {
  const response = await fetch(`https://gamma-api.polymarket.com/markets/${marketId}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch market ${marketId}: ${response.status}`)
  }

  return await response.json()
}

/**
 * Attempts to discover active Bitcoin Up/Down markets
 * Falls back to checking known recent market IDs if API doesn't return results
 */
export async function discoverBitcoinUpDownMarkets(): Promise<any[]> {
  // Try the standard API first
  const response = await fetch(
    'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=1000'
  )

  if (!response.ok) {
    return []
  }

  const markets = await response.json()

  // Filter for Bitcoin Up or Down markets
  const btcMarkets = markets.filter((m: any) => {
    const q = m.question.toLowerCase()
    return q.includes('bitcoin') && q.includes('up or down')
  })

  // If we found markets through the API, return them
  if (btcMarkets.length > 0) {
    return btcMarkets
  }

  // Otherwise, try checking some known market IDs
  // These IDs can be found from the Polymarket website
  const knownMarketIds = [
    '1324407', // Bitcoin Up or Down - February 4, 12:45AM-1:00AM ET
    // Add more as discovered
  ]

  const discoveredMarkets = []

  for (const id of knownMarketIds) {
    try {
      const market = await fetchKnownMarket(id)

      // Check if market is still active
      if (market.active && !market.closed) {
        const endDate = new Date(market.endDate)

        // Only include if not yet ended
        if (endDate.getTime() > Date.now()) {
          discoveredMarkets.push(market)
        }
      }
    } catch (error) {
      // Skip markets that can't be fetched
      console.warn(`Could not fetch market ${id}:`, error)
    }
  }

  return discoveredMarkets
}
