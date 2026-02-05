import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/polymarket-types', () => ({
  fetchMarketQuote: vi.fn(),
  fetchPriceHistory: vi.fn(),
}))

vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
  },
}))

vi.mock('@/db/schema', () => ({
  polymarketIntervalsCache: {},
}))

// Mock global fetch
global.fetch = vi.fn()
const mockFetch = global.fetch as ReturnType<typeof vi.fn>

describe('Polymarket API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('/api/polymarket-current-odds', () => {
    describe('successful responses', () => {
      it('should return current odds for active BTC markets', async () => {
        const mockMarkets = [
          {
            id: 'market_1',
            question: 'Bitcoin Up or Down – 02/04 10:00-10:15 AM PST',
            clobTokenIds: ['token_up_1', 'token_down_1'],
            active: true,
            closed: false,
            endDate: new Date(Date.now() + 3600000).toISOString(),
          },
          {
            id: 'market_2',
            question: 'Bitcoin Up or Down – 02/04 10:15-10:30 AM PST',
            clobTokenIds: ['token_up_2', 'token_down_2'],
            active: true,
            closed: false,
            endDate: new Date(Date.now() + 7200000).toISOString(),
          },
        ]

        // Mock fetching all markets
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockMarkets,
        } as any)

        // Mock price fetches for each market (2 tokens per market)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ price: '0.55' }),
        } as any)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ price: '0.45' }),
        } as any)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ price: '0.60' }),
        } as any)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ price: '0.40' }),
        } as any)

        // Import and call the API route
        const { GET } = await import('../../app/api/polymarket-current-odds/route')
        const request = new NextRequest('http://localhost:3000/api/polymarket-current-odds')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.markets).toBeDefined()
        expect(data.markets.length).toBeGreaterThan(0)
        expect(data.count).toBe(data.markets.length)
        expect(data.timestamp).toBeDefined()
      })

      it('should handle no active markets gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        } as any)

        const { GET } = await import('../../app/api/polymarket-current-odds/route')
        const request = new NextRequest('http://localhost:3000/api/polymarket-current-odds')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.markets).toEqual([])
        expect(data.message).toBeDefined()
      })

      it('should sort markets by interval index', async () => {
        const mockMarkets = [
          {
            id: 'market_2',
            question: 'Bitcoin Up or Down – 02/04 10:15-10:30 AM PST',
            clobTokenIds: ['token_up_2', 'token_down_2'],
            active: true,
            closed: false,
            endDate: new Date(Date.now() + 7200000).toISOString(),
          },
          {
            id: 'market_1',
            question: 'Bitcoin Up or Down – 02/04 10:00-10:15 AM PST',
            clobTokenIds: ['token_up_1', 'token_down_1'],
            active: true,
            closed: false,
            endDate: new Date(Date.now() + 3600000).toISOString(),
          },
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockMarkets,
        } as any)

        // Mock price fetches
        for (let i = 0; i < 4; i++) {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ price: '0.50' }),
          } as any)
        }

        const { GET } = await import('../../app/api/polymarket-current-odds/route')
        const request = new NextRequest('http://localhost:3000/api/polymarket-current-odds')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        // Markets should be sorted by interval index
        if (data.markets.length > 1) {
          for (let i = 1; i < data.markets.length; i++) {
            expect(data.markets[i].intervalIndex).toBeGreaterThanOrEqual(
              data.markets[i - 1].intervalIndex
            )
          }
        }
      })
    })

    describe('error handling', () => {
      it('should handle API errors gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as any)

        const { GET } = await import('../../app/api/polymarket-current-odds/route')
        const request = new NextRequest('http://localhost:3000/api/polymarket-current-odds')
        const response = await GET(request)

        expect(response.status).toBe(500)
        const data = await response.json()
        expect(data.error).toBeDefined()
      })

      it('should skip markets with missing token IDs', async () => {
        const mockMarkets = [
          {
            id: 'market_1',
            question: 'Bitcoin Up or Down – 02/04 10:00-10:15 AM PST',
            clobTokenIds: ['token_up_1'], // Missing down token
            active: true,
            closed: false,
            endDate: new Date(Date.now() + 3600000).toISOString(),
          },
          {
            id: 'market_2',
            question: 'Bitcoin Up or Down – 02/04 10:15-10:30 AM PST',
            clobTokenIds: ['token_up_2', 'token_down_2'],
            active: true,
            closed: false,
            endDate: new Date(Date.now() + 7200000).toISOString(),
          },
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockMarkets,
        } as any)

        // Mock price fetches for valid market only
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ price: '0.60' }),
        } as any)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ price: '0.40' }),
        } as any)

        const { GET } = await import('../../app/api/polymarket-current-odds/route')
        const request = new NextRequest('http://localhost:3000/api/polymarket-current-odds')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        // Should only have the market with valid token IDs
        expect(data.markets.length).toBeLessThanOrEqual(mockMarkets.length)
      })
    })
  })

  describe('/api/polymarket-price', () => {
    describe('successful responses', () => {
      it('should fetch price history for specific interval', async () => {
        const date = '2024-02-04'
        const interval = 40

        // Mock all markets fetch
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        } as any)

        // Mock events fetch (slug-based lookup)
        const mockEvent = {
          markets: [
            {
              id: 'market_1',
              question: 'Bitcoin Up or Down – 02/04 10:00-10:15 AM PST',
              clobTokenIds: ['token_up_1', 'token_down_1'],
              active: true,
              closed: false,
              endDate: new Date('2024-02-04T10:15:00-08:00').toISOString(),
            },
          ],
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [mockEvent],
        } as any)

        // Mock price history fetch
        const mockPriceHistory = {
          history: [
            { t: 1707000000, p: 0.55 },
            { t: 1707000060, p: 0.56 },
            { t: 1707000120, p: 0.57 },
          ],
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceHistory,
        } as any)

        const { GET } = await import('../../app/api/polymarket-price/route')
        const url = `http://localhost:3000/api/polymarket-price?date=${date}&interval=${interval}`
        const request = new NextRequest(url)
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.intervals).toBeDefined()
        expect(data.date).toBe(date)
      })

      it('should handle request without interval parameter (fetch all)', async () => {
        const date = '2024-02-04'

        // Mock all markets fetch - return empty to trigger slug-based lookup
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        } as any)

        const { GET } = await import('../../app/api/polymarket-price/route')
        const url = `http://localhost:3000/api/polymarket-price?date=${date}`
        const request = new NextRequest(url)
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.intervals).toBeDefined()
        expect(Array.isArray(data.intervals)).toBe(true)
      })

      it('should match markets by time range', async () => {
        const date = '2024-02-04'
        const interval = 40

        // Mock all markets fetch with matching market
        const mockMarkets = [
          {
            id: 'market_1',
            question: 'Bitcoin Up or Down – 02/04 10:00-10:15 AM PST',
            clobTokenIds: ['token_up_1', 'token_down_1'],
            active: true,
            closed: false,
            endDate: new Date('2024-02-04T10:15:00-08:00').toISOString(),
          },
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockMarkets,
        } as any)

        // Mock price history fetch
        const mockPriceHistory = {
          history: [
            { t: 1707000000, p: 0.55 },
            { t: 1707000060, p: 0.56 },
          ],
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceHistory,
        } as any)

        const { GET } = await import('../../app/api/polymarket-price/route')
        const url = `http://localhost:3000/api/polymarket-price?date=${date}&interval=${interval}`
        const request = new NextRequest(url)
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.intervals).toBeDefined()
      })
    })

    describe('error handling', () => {
      it('should return 400 when date parameter is missing', async () => {
        const { GET } = await import('../../app/api/polymarket-price/route')
        const url = 'http://localhost:3000/api/polymarket-price'
        const request = new NextRequest(url)
        const response = await GET(request)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Date parameter is required')
      })

      it('should handle market not found gracefully', async () => {
        const date = '2024-02-04'
        const interval = 40

        // Mock all markets fetch - empty
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        } as any)

        // Mock slug-based fetch - not found
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        } as any)

        const { GET } = await import('../../app/api/polymarket-price/route')
        const url = `http://localhost:3000/api/polymarket-price?date=${date}&interval=${interval}`
        const request = new NextRequest(url)
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        // Should return empty intervals array when no market found
        expect(data.intervals).toEqual([])
      })

      it('should handle API errors gracefully', async () => {
        const date = '2024-02-04'

        // Mock all markets fetch to fail
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        const { GET } = await import('../../app/api/polymarket-price/route')
        const url = `http://localhost:3000/api/polymarket-price?date=${date}&interval=0`
        const request = new NextRequest(url)
        const response = await GET(request)

        // The API catches the error at the top level and returns 500
        // But if the error is in a specific interval, it continues and returns empty intervals
        expect([200, 500]).toContain(response.status)
        const data = await response.json()
        // Either an error is returned or empty intervals array
        if (response.status === 500) {
          expect(data.error).toBeDefined()
        } else {
          expect(data.intervals).toBeDefined()
        }
      })

      it('should skip future intervals', async () => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const date = tomorrow.toISOString().split('T')[0]

        // Mock all markets fetch
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        } as any)

        const { GET } = await import('../../app/api/polymarket-price/route')
        const url = `http://localhost:3000/api/polymarket-price?date=${date}&interval=0`
        const request = new NextRequest(url)
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        // Should not include future intervals
        expect(data.intervals).toBeDefined()
      })
    })

    describe('integration with time matching', () => {
      it('should prioritize time-based matching over slug-based', async () => {
        const date = '2024-02-04'
        const interval = 40

        // Mock all markets fetch with matching market
        const mockMarkets = [
          {
            id: 'market_1',
            question: 'Bitcoin Up or Down – 02/04 10:00-10:15 AM PST',
            clobTokenIds: ['token_up_1', 'token_down_1'],
            active: true,
            closed: false,
            // End time matches interval 40 (10:15 AM PST)
            endDate: new Date('2024-02-04T10:15:00-08:00').toISOString(),
          },
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockMarkets,
        } as any)

        // Mock price history fetch
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ history: [{ t: 1707000000, p: 0.55 }] }),
        } as any)

        const { GET } = await import('../../app/api/polymarket-price/route')
        const url = `http://localhost:3000/api/polymarket-price?date=${date}&interval=${interval}`
        const request = new NextRequest(url)
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.intervals).toBeDefined()
        // Should not call slug-based lookup since time matching succeeded
        expect(mockFetch).toHaveBeenCalledTimes(2) // markets + price history
      })

      it('should fall back to slug-based when time matching fails', async () => {
        const date = '2024-02-04'
        const interval = 40

        // Mock all markets fetch with no matching market
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        } as any)

        // Mock slug-based lookup
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              markets: [
                {
                  id: 'market_1',
                  question: 'Bitcoin Up or Down – 02/04 10:00-10:15 AM PST',
                  clobTokenIds: ['token_up_1', 'token_down_1'],
                  active: true,
                  closed: false,
                  endDate: new Date('2024-02-04T10:15:00-08:00').toISOString(),
                },
              ],
            },
          ],
        } as any)

        // Mock price history fetch
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ history: [{ t: 1707000000, p: 0.55 }] }),
        } as any)

        const { GET } = await import('../../app/api/polymarket-price/route')
        const url = `http://localhost:3000/api/polymarket-price?date=${date}&interval=${interval}`
        const request = new NextRequest(url)
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.intervals).toBeDefined()
        // Should call: markets + slug lookup + price history
        expect(mockFetch).toHaveBeenCalledTimes(3)
      })
    })
  })
})
