import { NextRequest, NextResponse } from 'next/server'
import { eq, and, sql } from 'drizzle-orm'

/**
 * Cache management endpoint for Polymarket data
 *
 * GET - View cache stats
 * DELETE - Invalidate/clear cache
 */

export async function GET(request: NextRequest) {
  // Polymarket cache is no longer used - data is embedded in BTC price cache
  return NextResponse.json({
    message: 'Polymarket data is now embedded in BTC price cache',
    totalCached: 0,
    byDate: {},
    recentEntries: []
  })
}

export async function DELETE(request: NextRequest) {
  // Polymarket cache is no longer used - data is embedded in BTC price cache
  return NextResponse.json({
    message: 'Polymarket cache no longer exists - data is embedded in BTC price cache'
  })
}
