import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchPriceHistory } from '../../api/prices'

// Mock node-fetch
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}))

import fetch from 'node-fetch'

const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>

describe('fetchPriceHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('successful API calls', () => {
    it('should fetch price history with default parameters', async () => {
      const mockResponse = {
        history: [
          { t: 1700000000, p: 0.55 },
          { t: 1700003600, p: 0.58 },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any)

      const result = await fetchPriceHistory({ market: 'test_token_id' })

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const callUrl = mockFetch.mock.calls[0][0] as URL
      expect(callUrl.toString()).toContain('clob.polymarket.com/prices-history')
      expect(callUrl.searchParams.get('market')).toBe('test_token_id')
      expect(callUrl.searchParams.get('interval')).toBe('1h')
      expect(callUrl.searchParams.get('abs')).toBe('false')
    })

    it('should fetch price history with custom interval', async () => {
      const mockResponse = {
        history: [{ t: 1700000000, p: 0.55 }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any)

      await fetchPriceHistory({ market: 'test_token_id', interval: '15m' })

      const callUrl = mockFetch.mock.calls[0][0] as URL
      expect(callUrl.searchParams.get('interval')).toBe('15m')
    })

    it('should fetch price history with startTs and endTs', async () => {
      const mockResponse = {
        history: [
          { t: 1700000000, p: 0.55 },
          { t: 1700003600, p: 0.58 },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any)

      const startTs = 1700000000
      const endTs = 1700086400

      await fetchPriceHistory({
        market: 'test_token_id',
        startTs,
        endTs,
      })

      const callUrl = mockFetch.mock.calls[0][0] as URL
      expect(callUrl.searchParams.get('startTs')).toBe(String(startTs))
      expect(callUrl.searchParams.get('endTs')).toBe(String(endTs))
    })

    it('should fetch price history with abs=true', async () => {
      const mockResponse = {
        history: [{ t: 1700000000, p: 55 }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any)

      await fetchPriceHistory({
        market: 'test_token_id',
        abs: true,
      })

      const callUrl = mockFetch.mock.calls[0][0] as URL
      expect(callUrl.searchParams.get('abs')).toBe('true')
    })

    it('should include correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: [] }),
      } as any)

      await fetchPriceHistory({ market: 'test_token_id' })

      const callOptions = mockFetch.mock.calls[0][1] as any
      expect(callOptions.headers).toEqual({ accept: 'application/json' })
      expect(callOptions.cache).toBe('no-store')
    })

    it('should handle empty history response', async () => {
      const mockResponse = { history: [] }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any)

      const result = await fetchPriceHistory({ market: 'test_token_id' })

      expect(result).toEqual(mockResponse)
      expect(result.history).toHaveLength(0)
    })
  })

  describe('error handling', () => {
    it('should throw error with details for 400 status (bad request)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid token ID',
      } as any)

      await expect(
        fetchPriceHistory({ market: 'invalid_token' })
      ).rejects.toThrow(
        'Invalid token or price history not available for token invalid_token - Invalid token ID'
      )
    })

    it('should throw error for 400 status without response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => '',
      } as any)

      await expect(
        fetchPriceHistory({ market: 'invalid_token' })
      ).rejects.toThrow(
        'Invalid token or price history not available for token invalid_token'
      )
    })

    it('should throw error for 500 status (server error)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as any)

      await expect(
        fetchPriceHistory({ market: 'test_token_id' })
      ).rejects.toThrow(
        'Price history fetch failed for token test_token_id: 500 - Internal Server Error'
      )
    })

    it('should throw error for 404 status (not found)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      } as any)

      await expect(
        fetchPriceHistory({ market: 'nonexistent_token' })
      ).rejects.toThrow(
        'Price history fetch failed for token nonexistent_token: 404 - Not Found'
      )
    })

    it('should handle error reading response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => {
          throw new Error('Cannot read body')
        },
      } as any)

      await expect(
        fetchPriceHistory({ market: 'test_token_id' })
      ).rejects.toThrow(
        'Price history fetch failed for token test_token_id: 500'
      )
    })

    it('should throw error for network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        fetchPriceHistory({ market: 'test_token_id' })
      ).rejects.toThrow('Network error')
    })

    it('should throw error for timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))

      await expect(
        fetchPriceHistory({ market: 'test_token_id' })
      ).rejects.toThrow('Request timeout')
    })
  })

  describe('URL construction', () => {
    it('should construct URL correctly with all parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: [] }),
      } as any)

      await fetchPriceHistory({
        market: 'token123',
        interval: '1d',
        startTs: 1700000000,
        endTs: 1700086400,
        abs: true,
      })

      const callUrl = mockFetch.mock.calls[0][0] as URL
      expect(callUrl.toString()).toContain('https://clob.polymarket.com/prices-history')
      expect(callUrl.searchParams.get('market')).toBe('token123')
      expect(callUrl.searchParams.get('interval')).toBe('1d')
      expect(callUrl.searchParams.get('startTs')).toBe('1700000000')
      expect(callUrl.searchParams.get('endTs')).toBe('1700086400')
      expect(callUrl.searchParams.get('abs')).toBe('true')
    })

    it('should not include startTs or endTs when undefined', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: [] }),
      } as any)

      await fetchPriceHistory({ market: 'token123' })

      const callUrl = mockFetch.mock.calls[0][0] as URL
      expect(callUrl.searchParams.has('startTs')).toBe(false)
      expect(callUrl.searchParams.has('endTs')).toBe(false)
    })

    it('should handle special characters in market ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: [] }),
      } as any)

      const specialMarketId = 'token_with_special-chars.123'
      await fetchPriceHistory({ market: specialMarketId })

      const callUrl = mockFetch.mock.calls[0][0] as URL
      expect(callUrl.searchParams.get('market')).toBe(specialMarketId)
    })
  })

  describe('response data types', () => {
    it('should handle decimal price values', async () => {
      const mockResponse = {
        history: [
          { t: 1700000000, p: 0.123456789 },
          { t: 1700003600, p: 0.987654321 },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any)

      const result = await fetchPriceHistory({ market: 'test_token_id' })

      expect(result.history[0].p).toBe(0.123456789)
      expect(result.history[1].p).toBe(0.987654321)
    })

    it('should handle large timestamp values', async () => {
      const mockResponse = {
        history: [{ t: 9999999999, p: 0.5 }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any)

      const result = await fetchPriceHistory({ market: 'test_token_id' })

      expect(result.history[0].t).toBe(9999999999)
    })

    it('should handle price values at boundaries (0 and 1)', async () => {
      const mockResponse = {
        history: [
          { t: 1700000000, p: 0 },
          { t: 1700003600, p: 1 },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any)

      const result = await fetchPriceHistory({ market: 'test_token_id' })

      expect(result.history[0].p).toBe(0)
      expect(result.history[1].p).toBe(1)
    })
  })
})
