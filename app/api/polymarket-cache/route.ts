import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { polymarketIntervalsCache } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'

/**
 * Cache management endpoint for Polymarket data
 *
 * GET - View cache stats
 * DELETE - Invalidate/clear cache
 */

export async function GET(request: NextRequest) {
  try {
    // Get cache statistics
    const allCached = await db
      .select()
      .from(polymarketIntervalsCache)
      .orderBy(sql`${polymarketIntervalsCache.createdAt} DESC`)
      .limit(100)

    // Group by date
    const byDate: Record<string, number> = {}
    allCached.forEach(item => {
      byDate[item.date] = (byDate[item.date] || 0) + 1
    })

    return NextResponse.json({
      totalCached: allCached.length,
      byDate,
      recentEntries: allCached.slice(0, 10).map(item => ({
        date: item.date,
        intervalIndex: item.intervalIndex,
        cachedAt: new Date(item.createdAt).toISOString(),
        dataSize: (item.data as string).length
      }))
    })
  } catch (error) {
    console.error('Error getting cache stats:', error)
    return NextResponse.json(
      {
        error: 'Failed to get cache stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const date = searchParams.get('date')
  const interval = searchParams.get('interval')

  try {
    if (date && interval !== null) {
      // Delete specific interval
      const intervalIndex = parseInt(interval)
      await db
        .delete(polymarketIntervalsCache)
        .where(
          and(
            eq(polymarketIntervalsCache.date, date),
            eq(polymarketIntervalsCache.intervalIndex, intervalIndex)
          )
        )

      return NextResponse.json({
        message: `Cache cleared for date: ${date}, interval: ${intervalIndex}`
      })
    } else if (date) {
      // Delete all intervals for a specific date
      await db
        .delete(polymarketIntervalsCache)
        .where(eq(polymarketIntervalsCache.date, date))

      return NextResponse.json({
        message: `Cache cleared for date: ${date}`
      })
    } else {
      // Delete all cache
      await db.delete(polymarketIntervalsCache)

      return NextResponse.json({
        message: 'All cache cleared'
      })
    }
  } catch (error) {
    console.error('Error clearing cache:', error)
    return NextResponse.json(
      {
        error: 'Failed to clear cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
