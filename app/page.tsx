'use client'

import { useState, useEffect } from 'react'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Scatter } from 'recharts'
import { cn } from '@/lib/utils'
import { PolymarketOddsSummary } from '@/components/polymarket-odds-summary'

interface IntervalData {
  index: number
  label: string
  data: { time: string; price: number; open: number; high: number; low: number; polymarketOdds?: number }[]
  isMostRecent?: boolean
  marketQuestion?: string
}

const btcChartConfig = {
  price: {
    label: 'BTC Price',
    color: 'hsl(45, 93%, 47%)',
  },
} satisfies ChartConfig

export default function BTCPriceCharts() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Default to yesterday since today's data may be incomplete
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday
  })

  // BTC Price data for all intervals (includes embedded Polymarket odds)
  const [btcIntervalData, setBtcIntervalData] = useState<{ [key: number]: IntervalData }>({})
  const [btcInitialLoading, setBtcInitialLoading] = useState(true)
  const [btcError, setBtcError] = useState<string | null>(null)

  // Lazy loading state
  const [visibleIntervals, setVisibleIntervals] = useState(30) // Start with 30 intervals
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Fetch BTC Price data for visible intervals
  useEffect(() => {
    async function fetchBtcData() {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')

      // Only fetch intervals that we don't have yet and are visible
      const intervalsToFetch = Array.from({ length: visibleIntervals }, (_, i) => i)
        .filter(index => !btcIntervalData[index])

      if (intervalsToFetch.length === 0) {
        setBtcInitialLoading(false)
        setIsLoadingMore(false)
        return
      }

      // Only show initial loading for the first batch
      if (Object.keys(btcIntervalData).length === 0) {
        setBtcInitialLoading(true)
      }
      setBtcError(null)

      try {
        const promises = intervalsToFetch.map(async (intervalIndex) => {
          try {
            const response = await fetch(`/api/btc-price?date=${dateStr}&interval=${intervalIndex}`)

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}))
              console.error(`API Error for interval ${intervalIndex}:`, response.status, errorData)
              throw new Error(`Failed to fetch BTC data: ${errorData.error || response.statusText}`)
            }

            const apiData = await response.json()

            // Create interval label
            const startHour = Math.floor((intervalIndex * 15) / 60)
            const startMinute = (intervalIndex * 15) % 60
            const endHour = Math.floor(((intervalIndex + 1) * 15) / 60)
            const endMinute = ((intervalIndex + 1) * 15) % 60

            const formatTime = (h: number, m: number) =>
              `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`

            const label = `${formatTime(startHour, startMinute)} - ${formatTime(endHour % 24, endMinute)} PST`

            // Transform API data to interval format
            const intervalData: IntervalData = {
              index: intervalIndex,
              label,
              data: apiData.data.map((d: any) => ({
                time: d.time,
                price: d.close,
                open: d.open,
                high: d.high,
                low: d.low,
                polymarketOdds: d.polymarketOdds, // Include Polymarket odds from BTC API
              })),
            }

            return { intervalIndex, intervalData }
          } catch (err) {
            console.error(`Failed to fetch interval ${intervalIndex}:`, err)
            return null
          }
        })

        const results = await Promise.all(promises)

        // Merge new data with existing data
        setBtcIntervalData(prev => {
          const newData = { ...prev }
          results.forEach(result => {
            if (result) {
              newData[result.intervalIndex] = result.intervalData
            }
          })
          return newData
        })
      } catch (err) {
        setBtcError('Failed to load BTC price data. Please try again.')
        console.error(err)
      } finally {
        setBtcInitialLoading(false)
        setIsLoadingMore(false)
      }
    }

    fetchBtcData()
  }, [selectedDate, visibleIntervals])

  // Reset visible intervals when date changes
  useEffect(() => {
    setVisibleIntervals(30)
    setBtcIntervalData({})
  }, [selectedDate])

  // Load more intervals function
  const loadMoreIntervals = () => {
    if (visibleIntervals < 96 && !isLoadingMore) {
      setIsLoadingMore(true)
      setVisibleIntervals(prev => Math.min(prev + 30, 96))
    }
  }

  // Intersection observer for auto-loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleIntervals < 96) {
          loadMoreIntervals()
        }
      },
      { threshold: 0.1 }
    )

    const sentinel = document.getElementById('load-more-sentinel')
    if (sentinel) {
      observer.observe(sentinel)
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel)
      }
    }
  }, [visibleIntervals])

  // Polymarket odds are now embedded in BTC data - no separate fetching needed

  // Calculate metrics for each interval
  const getIntervalMetrics = (intervalIndex: number) => {
    const intervalData = btcIntervalData[intervalIndex]
    if (!intervalData || !intervalData.data.length) {
      return null
    }

    const startPrice = intervalData.data[0].price
    const endPrice = intervalData.data[intervalData.data.length - 1].price
    const change = endPrice - startPrice
    const percentChange = ((change / startPrice) * 100)
    const isUp = change >= 0

    // Calculate total number of color switches within this interval
    // Color is determined by whether price is above or below the starting price
    let internalPeriods = 0
    let currentPeriodType: 'green' | 'red' | null = null

    for (let i = 0; i < intervalData.data.length; i++) {
      const currentPrice = intervalData.data[i].price
      const periodType = currentPrice >= startPrice ? 'green' : 'red'

      if (currentPeriodType === null) {
        currentPeriodType = periodType
      } else if (currentPeriodType !== periodType) {
        // Color switched (crossed the start price line), increment period count
        currentPeriodType = periodType
        internalPeriods++
      }
    }

    // Calculate color switches in the last 6 minutes (360 seconds)
    // Only count when price crosses above or below the starting price
    const last6MinStart = Math.max(0, intervalData.data.length - 360)
    let lastMinuteShifts = 0
    let lastMinPeriodType: 'green' | 'red' | null = null

    for (let i = last6MinStart; i < intervalData.data.length; i++) {
      const currentPrice = intervalData.data[i].price
      const periodType = currentPrice >= startPrice ? 'green' : 'red'

      if (lastMinPeriodType === null) {
        lastMinPeriodType = periodType
      } else if (lastMinPeriodType !== periodType) {
        lastMinPeriodType = periodType
        lastMinuteShifts++
      }
    }

    return {
      startPrice,
      endPrice,
      change,
      percentChange,
      isUp,
      internalPeriods,
      lastMinuteShifts
    }
  }

  // Calculate Unix timestamp for a given interval
  // This must match the calculateSlugTimestamp function in the API
  const getIntervalTimestamp = (intervalIndex: number) => {
    // Create a date at midnight PST for the selected date
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const baseDate = new Date(dateStr + 'T00:00:00-08:00')

    // Add the interval minutes (intervalIndex * 15 minutes)
    const intervalMinutes = intervalIndex * 15
    baseDate.setMinutes(baseDate.getMinutes() + intervalMinutes)

    // Convert to Unix timestamp (seconds)
    return Math.floor(baseDate.getTime() / 1000)
  }

  // Calculate consecutive red/green periods
  const calculatePeriods = () => {
    const periods: { type: 'green' | 'red', count: number, startIndex: number, endIndex: number }[] = []
    let currentPeriodType: 'green' | 'red' | null = null
    let currentPeriodStart = 0

    for (let i = 0; i < 96; i++) {
      const metrics = getIntervalMetrics(i)
      if (!metrics) continue

      const periodType = metrics.isUp ? 'green' : 'red'

      if (currentPeriodType === null) {
        // First period
        currentPeriodType = periodType
        currentPeriodStart = i
      } else if (currentPeriodType !== periodType) {
        // Period changed, save the previous period
        periods.push({
          type: currentPeriodType,
          count: i - currentPeriodStart,
          startIndex: currentPeriodStart,
          endIndex: i - 1
        })
        currentPeriodType = periodType
        currentPeriodStart = i
      }
    }

    // Add the last period if we have one
    if (currentPeriodType !== null) {
      periods.push({
        type: currentPeriodType,
        count: 96 - currentPeriodStart,
        startIndex: currentPeriodStart,
        endIndex: 95
      })
    }

    return periods
  }

  // Generate intervals (only visible ones)
  const allIntervals = Array.from({ length: visibleIntervals }, (_, i) => {
    const startHour = Math.floor((i * 15) / 60)
    const startMinute = (i * 15) % 60
    const endHour = Math.floor(((i + 1) * 15) / 60)
    const endMinute = ((i + 1) * 15) % 60
    const formatTime = (h: number, m: number) =>
      `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    return {
      index: i,
      label: `${formatTime(startHour, startMinute)} - ${formatTime(endHour % 24, endMinute)} PST`
    }
  })

  // Chart rendering function for BTC
  const renderBtcChart = (intervalIndex: number) => {
    const currentBtcInterval = btcIntervalData[intervalIndex]

    if (!currentBtcInterval || !currentBtcInterval.data.length) {
      return (
        <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
          No BTC data available for this interval
        </div>
      )
    }

    // BTC Price calculations
    const btcStartPrice = currentBtcInterval.data[0].price
    const btcEndPrice = currentBtcInterval.data[currentBtcInterval.data.length - 1].price
    const btcMinPrice = Math.min(...currentBtcInterval.data.map((d) => d.price))
    const btcMaxPrice = Math.max(...currentBtcInterval.data.map((d) => d.price))
    const btcPadding = (btcMaxPrice - btcMinPrice) * 0.1 || 100

    // Check if BTC data has embedded Polymarket odds
    const hasPolymarketData = currentBtcInterval.data.some(d => d.polymarketOdds !== undefined && d.polymarketOdds !== null)

    // Polymarket Price calculations (from embedded odds)
    let polymarketStartPrice = 0
    let polymarketEndPrice = 0
    let polymarketMinPrice = 0
    let polymarketMaxPrice = 0
    let polymarketAvgPrice = 0
    let polymarketVolatility = 0

    if (hasPolymarketData) {
      const prices = currentBtcInterval.data
        .filter(d => d.polymarketOdds !== undefined && d.polymarketOdds !== null)
        .map(d => d.polymarketOdds!)

      if (prices.length > 0) {
        polymarketStartPrice = prices[0]
        polymarketEndPrice = prices[prices.length - 1]
        polymarketMinPrice = Math.min(...prices)
        polymarketMaxPrice = Math.max(...prices)
        polymarketAvgPrice = prices.reduce((a, b) => a + b, 0) / prices.length

        // Calculate volatility (standard deviation)
        const squaredDiffs = prices.map(p => Math.pow(p - polymarketAvgPrice, 2))
        polymarketVolatility = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / prices.length)
      }
    }

    // Pre-process separate polymarket data for efficient forward-fill interpolation
    // Convert time strings to numeric seconds for fast binary search
    const sortedPolyData: { seconds: number; price: number }[] = []
    if (hasSeparatePolymarketData && currentPolymarketInterval?.data?.length > 0) {
      currentPolymarketInterval.data.forEach((p: any) => {
        const parts = p.time.split(':').map(Number)
        sortedPolyData.push({
          seconds: parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0),
          price: p.price,
        })
      })
      sortedPolyData.sort((a, b) => a.seconds - b.seconds)
    }

    // Prepare combined BTC + Polymarket chart data
    const btcChartData = currentBtcInterval.data.map((d) => ({
      ...d,
      start: btcStartPrice,
      above: d.price > btcStartPrice ? d.price : null,
      below: d.price < btcStartPrice ? d.price : null,
      polyOdds: d.polymarketOdds || null,
    }))


    // Calculate Threshold Hits for Polymarket
    const thresholdHits: any[] = []
    if (hasPolymarketData && polymarketStartPrice > 0) {
      const thresholds = [10, 15, 20, 75, 80, 85, 90]

      // Get embedded Polymarket odds data
      const polyData = currentBtcInterval.data
        .filter(d => d.polymarketOdds !== undefined && d.polymarketOdds !== null)
        .map(d => ({ time: d.time, price: d.polymarketOdds! }))

      if (polyData.length > 0) {
        const startPrice = polyData[0].price

        thresholds.forEach(threshold => {
          // Find the first time the threshold is hit
          const isIncreasing = threshold > startPrice
          const isDecreasing = threshold < startPrice
          const isEqual = threshold === startPrice

          if (isEqual) {
            thresholdHits.push({
              ...polyData[0],
              threshold
            })
            return
          }

          const hitPoint = polyData.find(d => {
            if (isIncreasing) return d.price >= threshold
            if (isDecreasing) return d.price <= threshold
            return false
          })

          if (hitPoint) {
            thresholdHits.push({
              ...hitPoint,
              threshold
            })
          }
        })
      }
    }

    return (
      <div className="space-y-4 pt-4">
        {/* Side by Side Charts */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* BTC Price Chart with Polymarket Overlay */}
          <div className="space-y-3">
            {hasPolymarketData && (
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-[#f59e0b]"></div>
                  <span className="text-muted-foreground">BTC Price</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-[hsl(280,90%,60%)]"></div>
                  <span className="text-muted-foreground">PM Odds (Up)</span>
                </div>
              </div>
            )}
            <ChartContainer config={btcChartConfig} className="h-[200px] w-full">
              <ComposedChart
                data={btcChartData}
                margin={{ top: 5, right: hasPolymarketData ? 55 : 5, left: 5, bottom: 5 }}
              >
                <defs>
                  <linearGradient id={`colorAbove-${intervalIndex}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id={`colorBelow-${intervalIndex}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                />
                <YAxis
                  yAxisId="btc"
                  domain={[btcMinPrice - btcPadding, btcMaxPrice + btcPadding]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                  fontSize={11}
                  width={80}
                />
                {hasPolymarketData && (
                  <YAxis
                    yAxisId="poly"
                    orientation="right"
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => `${value}%`}
                    fontSize={10}
                    width={50}
                    stroke="hsl(280, 90%, 60%)"
                  />
                )}
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name, item) => {
                        if (name === 'price' || name === 'above' || name === 'below') {
                          return (
                            <div className="space-y-1">
                              <div className="flex w-full justify-between gap-4">
                                <span className="text-muted-foreground">BTC Price</span>
                                <span className="font-mono font-medium">
                                  ${Number(value).toLocaleString()}
                                </span>
                              </div>
                              {hasPolymarketData && item.payload.polyOdds !== null && (
                                <div className="flex w-full justify-between gap-4">
                                  <span className="text-purple-600 dark:text-purple-400">PM Odds</span>
                                  <span className="font-mono font-medium text-purple-600 dark:text-purple-400">
                                    {Number(item.payload.polyOdds).toFixed(1)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          )
                        }
                        if (name === 'polyOdds') {
                          return null // Already shown above
                        }
                        return null
                      }}
                    />
                  }
                />
                <ReferenceLine
                  yAxisId="btc"
                  y={btcStartPrice}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="2 4"
                  label={{ value: 'Start', position: 'left', fill: 'hsl(var(--muted-foreground))' }}
                />
                {hasPolymarketData && (
                  <ReferenceLine
                    yAxisId="poly"
                    y={50}
                    stroke="hsl(280, 90%, 60%)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    opacity={0.5}
                  />
                )}
                <Area
                  yAxisId="btc"
                  type="monotone"
                  dataKey="above"
                  stroke="none"
                  strokeWidth={0}
                  fill={`url(#colorAbove-${intervalIndex})`}
                  fillOpacity={1}
                  isAnimationActive={false}
                  connectNulls={false}
                />
                <Area
                  yAxisId="btc"
                  type="monotone"
                  dataKey="below"
                  stroke="none"
                  strokeWidth={0}
                  fill={`url(#colorBelow-${intervalIndex})`}
                  fillOpacity={1}
                  isAnimationActive={false}
                  connectNulls={false}
                />
                <Line
                  yAxisId="btc"
                  type="monotone"
                  dataKey="above"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
                <Line
                  yAxisId="btc"
                  type="monotone"
                  dataKey="below"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
                {hasPolymarketData && (
                  <Line
                    yAxisId="poly"
                    type="monotone"
                    dataKey="polyOdds"
                    stroke="hsl(280, 90%, 60%)"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={true}
                    strokeDasharray="3 3"
                  />
                )}
              </ComposedChart>
            </ChartContainer>

            {/* BTC Stats */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg bg-muted p-2">
                <p className="text-muted-foreground">Highest</p>
                <p className={cn(
                  "font-mono font-semibold text-xs",
                  btcMaxPrice >= btcStartPrice ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {btcMaxPrice >= btcStartPrice ? '+' : ''}${(btcMaxPrice - btcStartPrice).toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <p className="text-muted-foreground">Lowest</p>
                <p className={cn(
                  "font-mono font-semibold text-xs",
                  btcMinPrice >= btcStartPrice ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {btcMinPrice >= btcStartPrice ? '+' : ''}${(btcMinPrice - btcStartPrice).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Polymarket Odds Stats */}
            {hasPolymarketData && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2">
                  📊 Polymarket Odds (Live from CLOB API)
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 p-2">
                    <p className="text-muted-foreground">Start</p>
                    <p className="font-mono font-semibold text-xs text-purple-600 dark:text-purple-400">
                      {polymarketStartPrice.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 p-2">
                    <p className="text-muted-foreground">End</p>
                    <p className={cn(
                      "font-mono font-semibold text-xs",
                      polymarketEndPrice >= polymarketStartPrice ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {polymarketEndPrice.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 p-2">
                    <p className="text-muted-foreground">High</p>
                    <p className="font-mono font-semibold text-xs text-green-600 dark:text-green-400">
                      {polymarketMaxPrice.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 p-2">
                    <p className="text-muted-foreground">Low</p>
                    <p className="font-mono font-semibold text-xs text-red-600 dark:text-red-400">
                      {polymarketMinPrice.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 p-2">
                    <p className="text-muted-foreground">Average</p>
                    <p className="font-mono font-semibold text-xs">
                      {polymarketAvgPrice.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 p-2">
                    <p className="text-muted-foreground">Volatility</p>
                    <p className="font-mono font-semibold text-xs">
                      ±{polymarketVolatility.toFixed(1)}%
                    </p>
                  </div>
                  <div className="col-span-2 rounded-lg bg-purple-50 dark:bg-purple-950/20 p-2">
                    <p className="text-muted-foreground">Change</p>
                    <p className={cn(
                      "font-mono font-semibold text-xs",
                      polymarketEndPrice >= polymarketStartPrice ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {polymarketEndPrice >= polymarketStartPrice ? '+' : ''}{(polymarketEndPrice - polymarketStartPrice).toFixed(1)}%
                      <span className="text-muted-foreground ml-1">
                        ({((polymarketEndPrice - polymarketStartPrice) / polymarketStartPrice * 100).toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Demo Video */}
        <div className="flex justify-center">
          <video
            src="https://i.imgur.com/qxu9TS9.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="rounded-lg shadow-lg max-w-xs w-full"
          />
        </div>

        {/* Current Polymarket Odds Summary */}
        <PolymarketOddsSummary autoRefresh={true} refreshInterval={60000} />

        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">BTC/USDT Price Chart</CardTitle>
            <CardDescription>
              15-minute intervals • 96 intervals per day • Scroll to view all charts with Polymarket prediction odds
            </CardDescription>
            {selectedDate < new Date(new Date().setHours(0, 0, 0, 0)) && (
              <div className="mt-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 p-2 text-xs text-blue-800 dark:text-blue-200">
                📅 Viewing historical data from {format(selectedDate, 'MMMM d, yyyy')}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Date Picker with Quick Navigation */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[240px] justify-start text-left font-normal',
                        !selectedDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      disabled={(date) => date > new Date() || date < new Date('2017-08-17')}
                      defaultMonth={selectedDate}
                    />
                  </PopoverContent>
                </Popover>

                {/* Quick Date Navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newDate = new Date(selectedDate)
                      newDate.setDate(newDate.getDate() - 1)
                      if (newDate >= new Date('2017-08-17')) {
                        setSelectedDate(newDate)
                      }
                    }}
                  >
                    ← Previous Day
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newDate = new Date(selectedDate)
                      newDate.setDate(newDate.getDate() + 1)
                      if (newDate <= new Date()) {
                        setSelectedDate(newDate)
                      }
                    }}
                    disabled={selectedDate >= new Date(new Date().setHours(0, 0, 0, 0))}
                  >
                    Next Day →
                  </Button>
                </div>
              </div>

              {/* Quick Date Presets */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Quick select:</span>
                {[
                  { label: 'Today', offset: 0 },
                  { label: 'Yesterday', offset: -1 },
                  { label: '2 days ago', offset: -2 },
                  { label: '3 days ago', offset: -3 },
                  { label: 'Last week', offset: -7 },
                ].map((preset) => {
                  const presetDate = new Date()
                  presetDate.setDate(presetDate.getDate() + preset.offset)
                  presetDate.setHours(0, 0, 0, 0)
                  const isSelected = format(selectedDate, 'yyyy-MM-dd') === format(presetDate, 'yyyy-MM-dd')

                  return (
                    <Button
                      key={preset.label}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedDate(presetDate)}
                    >
                      {preset.label}
                    </Button>
                  )
                })}
              </div>
            </div>

            {btcError && (
              <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
                {btcError}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading State - Only for initial load */}
        {btcInitialLoading && Object.keys(btcIntervalData).length === 0 && (
          <Card>
            <CardContent className="py-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading first 30 intervals...</p>
            </CardContent>
          </Card>
        )}

        {/* Scrolling List of Intervals */}
        {Object.keys(btcIntervalData).length > 0 && (
          <div className="space-y-2">
            {allIntervals.map((interval) => {
              const metrics = getIntervalMetrics(interval.index)
              const isLowVolatility = metrics && Math.abs(metrics.change) < 40
              return (
                <Card
                  key={interval.index}
                  className={cn(
                    "transition-all",
                    isLowVolatility && "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                  )}
                >
                  <CardHeader
                    className="py-3 px-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-mono font-semibold bg-muted px-3 py-1 rounded">
                          {interval.index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{interval.label}</CardTitle>
                            <a
                              href={`https://polymarket.com/event/btc-updown-15m-${getIntervalTimestamp(interval.index)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                            >
                              Polymarket ↗
                            </a>
                          </div>
                          {metrics ? (
                            <div className="space-y-1">
                              <CardDescription className="text-xs flex items-center gap-2 mt-1">
                                <span className={cn(
                                  "font-semibold",
                                  metrics.isUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                )}>
                                  {metrics.isUp ? '↑' : '↓'} ${Math.abs(metrics.change).toFixed(2)} ({metrics.percentChange >= 0 ? '+' : ''}{metrics.percentChange.toFixed(2)}%)
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span>${metrics.startPrice.toLocaleString()} → ${metrics.endPrice.toLocaleString()}</span>
                              </CardDescription>
                              <CardDescription className="text-xs flex items-center gap-2">
                                <span className="text-muted-foreground">Direction switches:</span>
                                <span className="font-semibold">{metrics.internalPeriods}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">Last 6min shifts:</span>
                                <span className="font-semibold">{metrics.lastMinuteShifts}</span>
                              </CardDescription>
                            </div>
                          ) : (
                            <CardDescription className="text-xs">
                              No data available
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {btcIntervalData[interval.index] && btcIntervalData[interval.index].data.some(d => d.polymarketOdds !== undefined && d.polymarketOdds !== null) && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                            <span className="text-purple-600 dark:text-purple-400 font-medium">PM</span>
                          </div>
                        )}
                        {metrics && (
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            metrics.isUp ? "bg-green-500" : "bg-red-500"
                          )}></div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 px-4 pb-4">
                    {renderBtcChart(interval.index)}
                  </CardContent>
                </Card>
              )
            })}

            {/* Load More Sentinel */}
            {visibleIntervals < 96 && (
              <div id="load-more-sentinel" className="py-8">
                <Card>
                  <CardContent className="py-8 flex flex-col items-center justify-center gap-4">
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Loading more intervals...</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Showing {visibleIntervals} of 96 intervals
                        </p>
                        <Button onClick={loadMoreIntervals} variant="outline">
                          Load More Intervals
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {visibleIntervals >= 96 && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                All 96 intervals loaded
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
