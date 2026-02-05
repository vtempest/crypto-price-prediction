import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { syncPriceHistory } from '../../sync/syncPriceHistory'

// Mock the dependencies
vi.mock('../../api/prices', () => ({
  fetchPriceHistory: vi.fn(),
}))

vi.mock('../../db/prices', () => ({
  savePriceHistory: vi.fn(),
}))

import { fetchPriceHistory } from '../../api/prices'
import { savePriceHistory } from '../../db/prices'

const mockFetchPriceHistory = fetchPriceHistory as unknown as ReturnType<typeof vi.fn>
const mockSavePriceHistory = savePriceHistory as unknown as ReturnType<typeof vi.fn>

describe('syncPriceHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('successful synchronization', () => {
    it('should fetch and save price history with default options', async () => {
      const mockHistoryData = {
        history: [
          { t: 1700000000, p: 0.55 },
          { t: 1700003600, p: 0.58 },
          { t: 1700007200, p: 0.62 },
        ],
      }

      mockFetchPriceHistory.mockResolvedValueOnce(mockHistoryData)
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      const result = await syncPriceHistory('test_token_id')

      expect(mockFetchPriceHistory).toHaveBeenCalledTimes(1)
      expect(mockFetchPriceHistory).toHaveBeenCalledWith({
        market: 'test_token_id',
        interval: '1h',
        startTs: undefined,
        endTs: undefined,
        abs: false,
      })

      expect(mockSavePriceHistory).toHaveBeenCalledTimes(1)
      expect(mockSavePriceHistory).toHaveBeenCalledWith(
        'test_token_id',
        mockHistoryData,
        '1h'
      )

      expect(result).toEqual({ pricePoints: 3 })
    })

    it('should fetch and save price history with custom interval', async () => {
      const mockHistoryData = {
        history: [
          { t: 1700000000, p: 0.55 },
          { t: 1700000900, p: 0.56 },
        ],
      }

      mockFetchPriceHistory.mockResolvedValueOnce(mockHistoryData)
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      const result = await syncPriceHistory('test_token_id', { interval: '15m' })

      expect(mockFetchPriceHistory).toHaveBeenCalledWith({
        market: 'test_token_id',
        interval: '15m',
        startTs: undefined,
        endTs: undefined,
        abs: false,
      })

      expect(mockSavePriceHistory).toHaveBeenCalledWith(
        'test_token_id',
        mockHistoryData,
        '15m'
      )

      expect(result).toEqual({ pricePoints: 2 })
    })

    it('should fetch and save price history with start and end timestamps', async () => {
      const mockHistoryData = {
        history: [
          { t: 1700000000, p: 0.55 },
          { t: 1700003600, p: 0.58 },
        ],
      }

      mockFetchPriceHistory.mockResolvedValueOnce(mockHistoryData)
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      const startTs = 1700000000
      const endTs = 1700086400

      const result = await syncPriceHistory('test_token_id', {
        startTs,
        endTs,
      })

      expect(mockFetchPriceHistory).toHaveBeenCalledWith({
        market: 'test_token_id',
        interval: '1h',
        startTs,
        endTs,
        abs: false,
      })

      expect(result).toEqual({ pricePoints: 2 })
    })

    it('should fetch and save price history with abs=true', async () => {
      const mockHistoryData = {
        history: [
          { t: 1700000000, p: 55 },
          { t: 1700003600, p: 58 },
        ],
      }

      mockFetchPriceHistory.mockResolvedValueOnce(mockHistoryData)
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      const result = await syncPriceHistory('test_token_id', { abs: true })

      expect(mockFetchPriceHistory).toHaveBeenCalledWith({
        market: 'test_token_id',
        interval: '1h',
        startTs: undefined,
        endTs: undefined,
        abs: true,
      })

      expect(result).toEqual({ pricePoints: 2 })
    })

    it('should fetch and save with all custom options', async () => {
      const mockHistoryData = {
        history: [{ t: 1700000000, p: 50.5 }],
      }

      mockFetchPriceHistory.mockResolvedValueOnce(mockHistoryData)
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      const result = await syncPriceHistory('test_token_id', {
        interval: '1d',
        startTs: 1700000000,
        endTs: 1700086400,
        abs: true,
      })

      expect(mockFetchPriceHistory).toHaveBeenCalledWith({
        market: 'test_token_id',
        interval: '1d',
        startTs: 1700000000,
        endTs: 1700086400,
        abs: true,
      })

      expect(mockSavePriceHistory).toHaveBeenCalledWith(
        'test_token_id',
        mockHistoryData,
        '1d'
      )

      expect(result).toEqual({ pricePoints: 1 })
    })

    it('should handle empty history data', async () => {
      const mockHistoryData = {
        history: [],
      }

      mockFetchPriceHistory.mockResolvedValueOnce(mockHistoryData)
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      const result = await syncPriceHistory('test_token_id')

      expect(mockSavePriceHistory).toHaveBeenCalledWith(
        'test_token_id',
        mockHistoryData,
        '1h'
      )

      expect(result).toEqual({ pricePoints: 0 })
    })

    it('should handle history data without history property', async () => {
      const mockHistoryData = {} as any

      mockFetchPriceHistory.mockResolvedValueOnce(mockHistoryData)
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      const result = await syncPriceHistory('test_token_id')

      expect(result).toEqual({ pricePoints: 0 })
    })
  })

  describe('error handling', () => {
    it('should propagate fetch errors', async () => {
      const fetchError = new Error('Failed to fetch price history')
      mockFetchPriceHistory.mockRejectedValueOnce(fetchError)

      await expect(syncPriceHistory('test_token_id')).rejects.toThrow(
        'Failed to fetch price history'
      )

      expect(mockFetchPriceHistory).toHaveBeenCalledTimes(1)
      expect(mockSavePriceHistory).not.toHaveBeenCalled()
    })

    it('should propagate save errors', async () => {
      const mockHistoryData = {
        history: [{ t: 1700000000, p: 0.55 }],
      }

      mockFetchPriceHistory.mockResolvedValueOnce(mockHistoryData)

      const saveError = new Error('Database save failed')
      mockSavePriceHistory.mockRejectedValueOnce(saveError)

      await expect(syncPriceHistory('test_token_id')).rejects.toThrow(
        'Database save failed'
      )

      expect(mockFetchPriceHistory).toHaveBeenCalledTimes(1)
      expect(mockSavePriceHistory).toHaveBeenCalledTimes(1)
    })

    it('should handle network errors during fetch', async () => {
      mockFetchPriceHistory.mockRejectedValueOnce(new Error('Network timeout'))

      await expect(syncPriceHistory('test_token_id')).rejects.toThrow(
        'Network timeout'
      )
    })

    it('should handle invalid token ID errors', async () => {
      mockFetchPriceHistory.mockRejectedValueOnce(
        new Error('Invalid token or price history not available')
      )

      await expect(syncPriceHistory('invalid_token')).rejects.toThrow(
        'Invalid token or price history not available'
      )
    })
  })

  describe('data flow', () => {
    it('should pass fetched data to save function correctly', async () => {
      const mockHistoryData = {
        history: [
          { t: 1700000000, p: 0.55 },
          { t: 1700003600, p: 0.58 },
        ],
        metadata: { source: 'test' }, // Additional properties should be preserved
      }

      mockFetchPriceHistory.mockResolvedValueOnce(mockHistoryData)
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      await syncPriceHistory('test_token_id')

      expect(mockSavePriceHistory).toHaveBeenCalledWith(
        'test_token_id',
        mockHistoryData,
        '1h'
      )
    })

    it('should maintain token ID throughout the flow', async () => {
      const tokenId = 'unique_token_12345'
      const mockHistoryData = {
        history: [{ t: 1700000000, p: 0.55 }],
      }

      mockFetchPriceHistory.mockResolvedValueOnce(mockHistoryData)
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      await syncPriceHistory(tokenId)

      expect(mockFetchPriceHistory).toHaveBeenCalledWith(
        expect.objectContaining({ market: tokenId })
      )
      expect(mockSavePriceHistory).toHaveBeenCalledWith(
        tokenId,
        expect.anything(),
        expect.anything()
      )
    })

    it('should maintain interval throughout the flow', async () => {
      const interval = '5m'
      const mockHistoryData = {
        history: [{ t: 1700000000, p: 0.55 }],
      }

      mockFetchPriceHistory.mockResolvedValueOnce(mockHistoryData)
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      await syncPriceHistory('test_token_id', { interval })

      expect(mockFetchPriceHistory).toHaveBeenCalledWith(
        expect.objectContaining({ interval })
      )
      expect(mockSavePriceHistory).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        interval
      )
    })
  })

  describe('return values', () => {
    it('should return correct count for single price point', async () => {
      mockFetchPriceHistory.mockResolvedValueOnce({
        history: [{ t: 1700000000, p: 0.55 }],
      })
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      const result = await syncPriceHistory('test_token_id')

      expect(result.pricePoints).toBe(1)
    })

    it('should return correct count for multiple price points', async () => {
      const historyArray = Array.from({ length: 100 }, (_, i) => ({
        t: 1700000000 + i * 3600,
        p: 0.5 + i * 0.001,
      }))

      mockFetchPriceHistory.mockResolvedValueOnce({ history: historyArray })
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      const result = await syncPriceHistory('test_token_id')

      expect(result.pricePoints).toBe(100)
    })

    it('should return zero for null history', async () => {
      mockFetchPriceHistory.mockResolvedValueOnce({ history: null as any })
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      const result = await syncPriceHistory('test_token_id')

      expect(result.pricePoints).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle very long token IDs', async () => {
      const longTokenId = 'a'.repeat(1000)
      const mockHistoryData = {
        history: [{ t: 1700000000, p: 0.55 }],
      }

      mockFetchPriceHistory.mockResolvedValueOnce(mockHistoryData)
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      const result = await syncPriceHistory(longTokenId)

      expect(mockFetchPriceHistory).toHaveBeenCalledWith(
        expect.objectContaining({ market: longTokenId })
      )
      expect(result.pricePoints).toBe(1)
    })

    it('should handle special characters in token ID', async () => {
      const specialTokenId = 'token-with_special.chars@123'
      const mockHistoryData = {
        history: [{ t: 1700000000, p: 0.55 }],
      }

      mockFetchPriceHistory.mockResolvedValueOnce(mockHistoryData)
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      const result = await syncPriceHistory(specialTokenId)

      expect(mockFetchPriceHistory).toHaveBeenCalledWith(
        expect.objectContaining({ market: specialTokenId })
      )
      expect(result.pricePoints).toBe(1)
    })

    it('should handle zero timestamps', async () => {
      const mockHistoryData = {
        history: [
          { t: 0, p: 0.5 },
          { t: 1, p: 0.55 },
        ],
      }

      mockFetchPriceHistory.mockResolvedValueOnce(mockHistoryData)
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      const result = await syncPriceHistory('test_token_id', {
        startTs: 0,
        endTs: 1,
      })

      expect(result.pricePoints).toBe(2)
    })

    it('should handle large datasets', async () => {
      const largeHistoryArray = Array.from({ length: 10000 }, (_, i) => ({
        t: 1700000000 + i * 60,
        p: Math.random(),
      }))

      mockFetchPriceHistory.mockResolvedValueOnce({ history: largeHistoryArray })
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      const result = await syncPriceHistory('test_token_id', { interval: '1m' })

      expect(result.pricePoints).toBe(10000)
      expect(mockSavePriceHistory).toHaveBeenCalledWith(
        'test_token_id',
        expect.objectContaining({ history: largeHistoryArray }),
        '1m'
      )
    })
  })

  describe('options handling', () => {
    it('should handle undefined options object', async () => {
      const mockHistoryData = {
        history: [{ t: 1700000000, p: 0.55 }],
      }

      mockFetchPriceHistory.mockResolvedValueOnce(mockHistoryData)
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      const result = await syncPriceHistory('test_token_id', undefined)

      expect(mockFetchPriceHistory).toHaveBeenCalledWith({
        market: 'test_token_id',
        interval: '1h',
        startTs: undefined,
        endTs: undefined,
        abs: false,
      })

      expect(result.pricePoints).toBe(1)
    })

    it('should handle empty options object', async () => {
      const mockHistoryData = {
        history: [{ t: 1700000000, p: 0.55 }],
      }

      mockFetchPriceHistory.mockResolvedValueOnce(mockHistoryData)
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      const result = await syncPriceHistory('test_token_id', {})

      expect(mockFetchPriceHistory).toHaveBeenCalledWith({
        market: 'test_token_id',
        interval: '1h',
        startTs: undefined,
        endTs: undefined,
        abs: false,
      })

      expect(result.pricePoints).toBe(1)
    })

    it('should handle partial options', async () => {
      const mockHistoryData = {
        history: [{ t: 1700000000, p: 0.55 }],
      }

      mockFetchPriceHistory.mockResolvedValueOnce(mockHistoryData)
      mockSavePriceHistory.mockResolvedValueOnce(undefined)

      const result = await syncPriceHistory('test_token_id', {
        startTs: 1700000000,
      })

      expect(mockFetchPriceHistory).toHaveBeenCalledWith({
        market: 'test_token_id',
        interval: '1h',
        startTs: 1700000000,
        endTs: undefined,
        abs: false,
      })

      expect(result.pricePoints).toBe(1)
    })
  })
})
