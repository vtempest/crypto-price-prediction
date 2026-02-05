import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchMarketPrice, fetchOrderBook, fetchMarketQuote } from '../../lib/polymarket-types'

// Mock global fetch
global.fetch = vi.fn()

const mockFetch = global.fetch as ReturnType<typeof vi.fn>

describe('Polymarket Quote Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchMarketPrice', () => {
    const TEST_TOKEN_ID = 'test_token_123'

    describe('successful cases', () => {
      it('should fetch current market price successfully', async () => {
        const mockPriceData = { price: '0.65' }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceData,
        } as any)

        const result = await fetchMarketPrice(TEST_TOKEN_ID)

        expect(result).toBe(0.65)
        expect(mockFetch).toHaveBeenCalledTimes(1)
        expect(mockFetch).toHaveBeenCalledWith(
          `https://clob.polymarket.com/price?token_id=${TEST_TOKEN_ID}`,
          expect.objectContaining({
            headers: { accept: 'application/json' },
            cache: 'no-store',
          })
        )
      })

      it('should handle price as number', async () => {
        const mockPriceData = { price: 0.75 }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceData,
        } as any)

        const result = await fetchMarketPrice(TEST_TOKEN_ID)

        expect(result).toBe(0.75)
      })

      it('should handle edge case prices (0 and 1)', async () => {
        // Test price = 0
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ price: '0' }),
        } as any)

        let result = await fetchMarketPrice(TEST_TOKEN_ID)
        expect(result).toBe(0)

        // Test price = 1
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ price: '1.0' }),
        } as any)

        result = await fetchMarketPrice(TEST_TOKEN_ID)
        expect(result).toBe(1)
      })

      it('should handle very precise decimal prices', async () => {
        const mockPriceData = { price: '0.123456789' }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceData,
        } as any)

        const result = await fetchMarketPrice(TEST_TOKEN_ID)

        expect(result).toBeCloseTo(0.123456789, 9)
      })
    })

    describe('error handling', () => {
      it('should return null when API returns non-ok status', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as any)

        const result = await fetchMarketPrice(TEST_TOKEN_ID)

        expect(result).toBeNull()
      })

      it('should return null when price is missing from response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        } as any)

        const result = await fetchMarketPrice(TEST_TOKEN_ID)

        expect(result).toBeNull()
      })

      it('should return null when price is null', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ price: null }),
        } as any)

        const result = await fetchMarketPrice(TEST_TOKEN_ID)

        expect(result).toBeNull()
      })

      it('should return null on network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        const result = await fetchMarketPrice(TEST_TOKEN_ID)

        expect(result).toBeNull()
      })

      it('should return null when JSON parsing fails', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => {
            throw new Error('Invalid JSON')
          },
        } as any)

        const result = await fetchMarketPrice(TEST_TOKEN_ID)

        expect(result).toBeNull()
      })
    })
  })

  describe('fetchOrderBook', () => {
    const TEST_TOKEN_ID = 'test_token_123'

    describe('successful cases', () => {
      it('should fetch order book successfully', async () => {
        const mockOrderBookData = {
          bids: [
            { price: '0.60', size: '100' },
            { price: '0.59', size: '200' },
          ],
          asks: [
            { price: '0.61', size: '150' },
            { price: '0.62', size: '250' },
          ],
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockOrderBookData,
        } as any)

        const result = await fetchOrderBook(TEST_TOKEN_ID)

        expect(result).toBeDefined()
        expect(result?.bids).toHaveLength(2)
        expect(result?.asks).toHaveLength(2)
        expect(result?.market).toBe(TEST_TOKEN_ID)
        expect(result?.timestamp).toBeGreaterThan(0)
        expect(mockFetch).toHaveBeenCalledWith(
          `https://clob.polymarket.com/book?token_id=${TEST_TOKEN_ID}`,
          expect.objectContaining({
            headers: { accept: 'application/json' },
            cache: 'no-store',
          })
        )
      })

      it('should handle empty order book', async () => {
        const mockOrderBookData = {
          bids: [],
          asks: [],
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockOrderBookData,
        } as any)

        const result = await fetchOrderBook(TEST_TOKEN_ID)

        expect(result).toBeDefined()
        expect(result?.bids).toHaveLength(0)
        expect(result?.asks).toHaveLength(0)
      })

      it('should handle missing bids or asks in response', async () => {
        const mockOrderBookData = {}

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockOrderBookData,
        } as any)

        const result = await fetchOrderBook(TEST_TOKEN_ID)

        expect(result).toBeDefined()
        expect(result?.bids).toEqual([])
        expect(result?.asks).toEqual([])
      })
    })

    describe('error handling', () => {
      it('should return null when API returns non-ok status', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as any)

        const result = await fetchOrderBook(TEST_TOKEN_ID)

        expect(result).toBeNull()
      })

      it('should return null on network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        const result = await fetchOrderBook(TEST_TOKEN_ID)

        expect(result).toBeNull()
      })

      it('should return null when JSON parsing fails', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => {
            throw new Error('Invalid JSON')
          },
        } as any)

        const result = await fetchOrderBook(TEST_TOKEN_ID)

        expect(result).toBeNull()
      })
    })
  })

  describe('fetchMarketQuote', () => {
    const TEST_TOKEN_ID = 'test_token_123'

    describe('successful cases', () => {
      it('should fetch comprehensive market quote with price and order book', async () => {
        const mockPriceData = { price: '0.65' }
        const mockOrderBookData = {
          bids: [{ price: '0.64', size: '100' }],
          asks: [{ price: '0.66', size: '150' }],
        }

        // Mock price fetch
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceData,
        } as any)

        // Mock order book fetch
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockOrderBookData,
        } as any)

        const result = await fetchMarketQuote(TEST_TOKEN_ID)

        expect(result).toBeDefined()
        expect(result?.price).toBe(0.65)
        expect(result?.bid).toBe(0.64)
        expect(result?.ask).toBe(0.66)
        expect(result?.volume).toBe(0)
        expect(result?.timestamp).toBeGreaterThan(0)
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })

      it('should use mid price for bid/ask when order book is empty', async () => {
        const mockPriceData = { price: '0.65' }
        const mockOrderBookData = {
          bids: [],
          asks: [],
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceData,
        } as any)

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockOrderBookData,
        } as any)

        const result = await fetchMarketQuote(TEST_TOKEN_ID)

        expect(result).toBeDefined()
        expect(result?.price).toBe(0.65)
        expect(result?.bid).toBe(0.65)
        expect(result?.ask).toBe(0.65)
      })

      it('should handle case when only price is available', async () => {
        const mockPriceData = { price: '0.70' }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceData,
        } as any)

        // Order book fetch fails
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as any)

        const result = await fetchMarketQuote(TEST_TOKEN_ID)

        expect(result).toBeDefined()
        expect(result?.price).toBe(0.70)
        expect(result?.bid).toBe(0.70)
        expect(result?.ask).toBe(0.70)
      })

      it('should calculate spread correctly', async () => {
        const mockPriceData = { price: '0.65' }
        const mockOrderBookData = {
          bids: [{ price: '0.60', size: '100' }],
          asks: [{ price: '0.70', size: '150' }],
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceData,
        } as any)

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockOrderBookData,
        } as any)

        const result = await fetchMarketQuote(TEST_TOKEN_ID)

        expect(result).toBeDefined()
        expect(result?.bid).toBe(0.60)
        expect(result?.ask).toBe(0.70)
        // Spread would be 0.10 (10%)
        expect(result!.ask - result!.bid).toBeCloseTo(0.10, 2)
      })
    })

    describe('error handling', () => {
      it('should return null when price fetch fails', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as any)

        const result = await fetchMarketQuote(TEST_TOKEN_ID)

        expect(result).toBeNull()
        // Both price and order book are fetched in parallel with Promise.all
        expect(mockFetch).toHaveBeenCalled()
      })

      it('should return null when price is null', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ price: null }),
        } as any)

        const result = await fetchMarketQuote(TEST_TOKEN_ID)

        expect(result).toBeNull()
      })

      it('should handle network error gracefully', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        const result = await fetchMarketQuote(TEST_TOKEN_ID)

        expect(result).toBeNull()
      })

      it('should handle case where Promise.all rejects', async () => {
        // Price succeeds, order book fails
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ price: '0.65' }),
        } as any)

        mockFetch.mockRejectedValueOnce(new Error('Order book error'))

        const result = await fetchMarketQuote(TEST_TOKEN_ID)

        // Should still work with just price
        expect(result).toBeDefined()
        expect(result?.price).toBe(0.65)
      })
    })

    describe('edge cases', () => {
      it('should handle very wide spreads', async () => {
        const mockPriceData = { price: '0.50' }
        const mockOrderBookData = {
          bids: [{ price: '0.01', size: '100' }],
          asks: [{ price: '0.99', size: '150' }],
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceData,
        } as any)

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockOrderBookData,
        } as any)

        const result = await fetchMarketQuote(TEST_TOKEN_ID)

        expect(result).toBeDefined()
        expect(result?.bid).toBe(0.01)
        expect(result?.ask).toBe(0.99)
      })

      it('should handle inverted bid/ask (crossed market)', async () => {
        const mockPriceData = { price: '0.50' }
        const mockOrderBookData = {
          bids: [{ price: '0.60', size: '100' }],
          asks: [{ price: '0.40', size: '150' }],
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceData,
        } as any)

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockOrderBookData,
        } as any)

        const result = await fetchMarketQuote(TEST_TOKEN_ID)

        expect(result).toBeDefined()
        // Should still return the values even if crossed
        expect(result?.bid).toBe(0.60)
        expect(result?.ask).toBe(0.40)
      })

      it('should handle multiple bid/ask levels (use best)', async () => {
        const mockPriceData = { price: '0.65' }
        const mockOrderBookData = {
          bids: [
            { price: '0.64', size: '100' }, // Best bid
            { price: '0.63', size: '200' },
            { price: '0.62', size: '300' },
          ],
          asks: [
            { price: '0.66', size: '150' }, // Best ask
            { price: '0.67', size: '250' },
            { price: '0.68', size: '350' },
          ],
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceData,
        } as any)

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockOrderBookData,
        } as any)

        const result = await fetchMarketQuote(TEST_TOKEN_ID)

        expect(result).toBeDefined()
        expect(result?.bid).toBe(0.64) // First (best) bid
        expect(result?.ask).toBe(0.66) // First (best) ask
      })
    })
  })

  describe('integration scenarios', () => {
    it('should handle rapid successive calls', async () => {
      const TEST_TOKEN_ID = 'rapid_test_token'

      // Setup mocks for multiple calls
      for (let i = 0; i < 5; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ price: `0.${60 + i}` }),
        } as any)
      }

      const results = await Promise.all([
        fetchMarketPrice(TEST_TOKEN_ID),
        fetchMarketPrice(TEST_TOKEN_ID),
        fetchMarketPrice(TEST_TOKEN_ID),
        fetchMarketPrice(TEST_TOKEN_ID),
        fetchMarketPrice(TEST_TOKEN_ID),
      ])

      expect(results).toHaveLength(5)
      results.forEach((result) => {
        expect(result).not.toBeNull()
        expect(typeof result).toBe('number')
      })
      expect(mockFetch).toHaveBeenCalledTimes(5)
    })

    it('should handle mixed success and failure calls', async () => {
      const TEST_TOKEN_ID = 'mixed_test_token'

      // First call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ price: '0.65' }),
      } as any)

      // Second call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as any)

      // Third call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ price: '0.70' }),
      } as any)

      const result1 = await fetchMarketPrice(TEST_TOKEN_ID)
      const result2 = await fetchMarketPrice(TEST_TOKEN_ID)
      const result3 = await fetchMarketPrice(TEST_TOKEN_ID)

      expect(result1).toBe(0.65)
      expect(result2).toBeNull()
      expect(result3).toBe(0.70)
    })
  })
})
