'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CurrentOdds {
  marketId: string
  question: string
  intervalIndex: number
  intervalLabel: string
  upOdds: number
  downOdds: number
  upTokenId: string
  downTokenId: string
  endDate: string
  isActive: boolean
}

interface PolymarketOddsSummaryProps {
  autoRefresh?: boolean
  refreshInterval?: number // in milliseconds
}

export function PolymarketOddsSummary({
  autoRefresh = true,
  refreshInterval = 60000 // 1 minute default
}: PolymarketOddsSummaryProps) {
  const [odds, setOdds] = useState<CurrentOdds[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchOdds = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/polymarket-current-odds')

      if (!response.ok) {
        throw new Error('Failed to fetch current odds')
      }

      const data = await response.json()
      setOdds(data.markets || [])
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching Polymarket odds:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOdds()

    if (autoRefresh) {
      const interval = setInterval(fetchOdds, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  if (loading && !lastUpdated) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading current Polymarket odds...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-yellow-200 dark:border-yellow-800">
        <CardContent className="py-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (odds.length === 0) {
    return (
      <Card className="border-yellow-200 dark:border-yellow-800">
        <CardContent className="py-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            No active BTC 15-minute markets found on Polymarket
          </p>
        </CardContent>
      </Card>
    )
  }

  // Get upcoming markets (next 4-6 intervals)
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentIntervalIndex = Math.floor((currentHour * 60 + currentMinute) / 15)

  const upcomingOdds = odds
    .filter(o => o.intervalIndex >= currentIntervalIndex)
    .slice(0, 6)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Live Polymarket Predictions</CardTitle>
            <CardDescription>
              Current odds for upcoming 15-minute BTC intervals
            </CardDescription>
          </div>
          {lastUpdated && (
            <div className="text-xs text-muted-foreground">
              Updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcomingOdds.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No upcoming markets available
            </p>
          ) : (
            upcomingOdds.map((market) => {
              const isUpFavored = market.upOdds > market.downOdds
              const confidence = Math.abs(market.upOdds - market.downOdds)
              const isHighConfidence = confidence > 20

              return (
                <div
                  key={market.marketId}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    isHighConfidence
                      ? "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
                      : "bg-muted/50"
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold bg-background px-2 py-0.5 rounded">
                        #{market.intervalIndex + 1}
                      </span>
                      <span className="text-sm font-medium">{market.intervalLabel}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {market.question}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 ml-4">
                    {/* UP Odds */}
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-md min-w-[80px]",
                      isUpFavored
                        ? "bg-green-100 dark:bg-green-950/40 border border-green-300 dark:border-green-800"
                        : "bg-muted"
                    )}>
                      <TrendingUp className={cn(
                        "h-3.5 w-3.5",
                        isUpFavored ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      )} />
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">Up</div>
                        <div className={cn(
                          "text-sm font-bold font-mono",
                          isUpFavored ? "text-green-600 dark:text-green-400" : "text-foreground"
                        )}>
                          {market.upOdds.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* DOWN Odds */}
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-md min-w-[80px]",
                      !isUpFavored
                        ? "bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800"
                        : "bg-muted"
                    )}>
                      <TrendingDown className={cn(
                        "h-3.5 w-3.5",
                        !isUpFavored ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                      )} />
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">Down</div>
                        <div className={cn(
                          "text-sm font-bold font-mono",
                          !isUpFavored ? "text-red-600 dark:text-red-400" : "text-foreground"
                        )}>
                          {market.downOdds.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Summary Stats */}
        {upcomingOdds.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center text-xs">
              <div>
                <p className="text-muted-foreground">Active Markets</p>
                <p className="text-lg font-bold">{odds.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Bullish (Up favored)</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {upcomingOdds.filter(o => o.upOdds > o.downOdds).length}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Bearish (Down favored)</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  {upcomingOdds.filter(o => o.downOdds > o.upOdds).length}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
