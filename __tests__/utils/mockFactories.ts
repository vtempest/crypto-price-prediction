/**
 * Mock factories for creating test data
 */

export interface PriceHistoryPoint {
  t: number // timestamp in seconds
  p: number // price (0-1 for probability, or absolute value if abs=true)
}

export interface PriceHistoryResponse {
  history: PriceHistoryPoint[]
  [key: string]: any // Allow additional properties
}

/**
 * Creates a mock price history response with specified number of points
 */
export function createMockPriceHistory(
  numPoints: number,
  options: {
    startTimestamp?: number
    intervalSeconds?: number
    startPrice?: number
    priceIncrement?: number
  } = {}
): PriceHistoryResponse {
  const {
    startTimestamp = 1700000000,
    intervalSeconds = 3600, // 1 hour default
    startPrice = 0.5,
    priceIncrement = 0.01,
  } = options

  const history: PriceHistoryPoint[] = Array.from({ length: numPoints }, (_, i) => ({
    t: startTimestamp + i * intervalSeconds,
    p: Math.min(1, Math.max(0, startPrice + i * priceIncrement)),
  }))

  return { history }
}

/**
 * Creates a mock price history with random walk prices
 */
export function createMockPriceHistoryWithRandomWalk(
  numPoints: number,
  options: {
    startTimestamp?: number
    intervalSeconds?: number
    startPrice?: number
    volatility?: number
  } = {}
): PriceHistoryResponse {
  const {
    startTimestamp = 1700000000,
    intervalSeconds = 3600,
    startPrice = 0.5,
    volatility = 0.05,
  } = options

  const history: PriceHistoryPoint[] = []
  let currentPrice = startPrice

  for (let i = 0; i < numPoints; i++) {
    const change = (Math.random() - 0.5) * volatility * 2
    currentPrice = Math.min(1, Math.max(0, currentPrice + change))

    history.push({
      t: startTimestamp + i * intervalSeconds,
      p: currentPrice,
    })
  }

  return { history }
}

/**
 * Creates a mock empty price history response
 */
export function createMockEmptyPriceHistory(): PriceHistoryResponse {
  return { history: [] }
}

/**
 * Creates a mock fetch Response object
 */
export function createMockFetchResponse(
  data: any,
  options: {
    ok?: boolean
    status?: number
    statusText?: string
  } = {}
): Response {
  const { ok = true, status = 200, statusText = 'OK' } = options

  return {
    ok,
    status,
    statusText,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: function () {
      return this
    },
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
  } as Response
}

/**
 * Creates a mock fetch Response for errors
 */
export function createMockErrorResponse(
  status: number,
  errorMessage: string = ''
): Response {
  return {
    ok: false,
    status,
    statusText: getStatusText(status),
    json: async () => {
      throw new Error('Response body is not JSON')
    },
    text: async () => errorMessage,
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: function () {
      return this
    },
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
  } as Response
}

function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  }
  return statusTexts[status] || 'Unknown'
}

/**
 * Helper to create a date range for testing
 */
export function createDateRange(
  startDate: Date,
  endDate: Date,
  intervalMinutes: number = 15
): number[] {
  const timestamps: number[] = []
  let current = Math.floor(startDate.getTime() / 1000)
  const end = Math.floor(endDate.getTime() / 1000)
  const intervalSeconds = intervalMinutes * 60

  while (current <= end) {
    timestamps.push(current)
    current += intervalSeconds
  }

  return timestamps
}

/**
 * Helper to create a mock token ID
 */
export function createMockTokenId(prefix: string = 'token'): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Creates a mock Polymarket market
 */
export function createMockPolymarketMarket(options: {
  id?: string
  question?: string
  upTokenId?: string
  downTokenId?: string
  active?: boolean
  closed?: boolean
  endDate?: Date
} = {}) {
  const {
    id = `market_${Math.random().toString(36).substring(2, 15)}`,
    question = 'Bitcoin Up or Down – 02/04 10:00-10:15 AM PST',
    upTokenId = createMockTokenId('token_up'),
    downTokenId = createMockTokenId('token_down'),
    active = true,
    closed = false,
    endDate = new Date(Date.now() + 3600000),
  } = options

  return {
    id,
    question,
    clobTokenIds: [upTokenId, downTokenId],
    active,
    closed,
    startDate: new Date(endDate.getTime() - 900000).toISOString(), // 15 min before end
    endDate: endDate.toISOString(),
    enableOrderBook: true,
  }
}

/**
 * Creates a mock market quote
 */
export function createMockMarketQuote(options: {
  price?: number
  bid?: number
  ask?: number
  volume?: number
} = {}) {
  const {
    price = 0.5,
    bid = price * 0.98,
    ask = price * 1.02,
    volume = 0,
  } = options

  return {
    price,
    bid,
    ask,
    volume,
    timestamp: Date.now(),
  }
}

/**
 * Creates a mock order book
 */
export function createMockOrderBook(options: {
  tokenId?: string
  numBids?: number
  numAsks?: number
  midPrice?: number
  spread?: number
} = {}) {
  const {
    tokenId = createMockTokenId(),
    numBids = 5,
    numAsks = 5,
    midPrice = 0.5,
    spread = 0.02,
  } = options

  const bids = Array.from({ length: numBids }, (_, i) => ({
    price: (midPrice - spread / 2 - i * 0.01).toFixed(4),
    size: ((100 + i * 50) * Math.random()).toFixed(2),
  }))

  const asks = Array.from({ length: numAsks }, (_, i) => ({
    price: (midPrice + spread / 2 + i * 0.01).toFixed(4),
    size: ((100 + i * 50) * Math.random()).toFixed(2),
  }))

  return {
    bids,
    asks,
    timestamp: Date.now(),
    market: tokenId,
  }
}

/**
 * Creates mock current odds data
 */
export function createMockCurrentOdds(options: {
  marketId?: string
  question?: string
  intervalIndex?: number
  upOdds?: number
  downOdds?: number
} = {}) {
  const {
    marketId = createMockTokenId('market'),
    question = 'Bitcoin Up or Down – 02/04 10:00-10:15 AM PST',
    intervalIndex = 40,
    upOdds = 55.0,
    downOdds = 45.0,
  } = options

  const startHour = Math.floor((intervalIndex * 15) / 60)
  const startMinute = (intervalIndex * 15) % 60
  const endHour = Math.floor(((intervalIndex + 1) * 15) / 60)
  const endMinute = ((intervalIndex + 1) * 15) % 60

  const formatTime = (h: number, m: number) =>
    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`

  return {
    marketId,
    question,
    intervalIndex,
    intervalLabel: `${formatTime(startHour, startMinute)}-${formatTime(endHour, endMinute)} AM PST`,
    upOdds,
    downOdds,
    upTokenId: createMockTokenId('token_up'),
    downTokenId: createMockTokenId('token_down'),
    endDate: new Date(Date.now() + 3600000).toISOString(),
    isActive: true,
  }
}

/**
 * Creates a mock processed Polymarket interval
 */
export function createMockProcessedInterval(options: {
  index?: number
  numDataPoints?: number
  startPrice?: number
} = {}) {
  const { index = 0, numDataPoints = 15, startPrice = 50.0 } = options

  const startHour = Math.floor((index * 15) / 60)
  const startMinute = (index * 15) % 60
  const endHour = Math.floor(((index + 1) * 15) / 60)
  const endMinute = ((index + 1) * 15) % 60

  const formatTime = (h: number, m: number) =>
    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`

  const data = Array.from({ length: numDataPoints }, (_, i) => {
    const price = startPrice + (Math.random() - 0.5) * 10
    return {
      time: `${formatTime(startHour, startMinute + i)}:00`,
      price,
      open: price,
      high: price + Math.random() * 2,
      low: price - Math.random() * 2,
      highDiff: Math.random() * 5,
      lowDiff: -Math.random() * 5,
    }
  })

  return {
    index,
    label: `${formatTime(startHour, startMinute)} - ${formatTime(endHour, endMinute)} PST`,
    data,
    isMostRecent: false,
    marketQuestion: `Bitcoin Up or Down – 02/04 ${formatTime(startHour, startMinute)}-${formatTime(endHour, endMinute)} PST`,
    marketUrl: `https://polymarket.com/event/btc-updown-15m-${Date.now()}`,
  }
}
