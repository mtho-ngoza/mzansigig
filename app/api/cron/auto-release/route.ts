import { NextRequest, NextResponse } from 'next/server'
import { GigService } from '@/lib/database/gigService'

/**
 * POST /api/cron/auto-release
 *
 * Scheduled job to process auto-release of escrow for completed work.
 * Workers are protected by auto-release after 7 days if employer doesn't respond.
 *
 * Security: Requires CRON_SECRET authorization header
 * Schedule: Runs every 6 hours (configured in vercel.json)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('[Auto-Release Cron] CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Cron endpoint not configured' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Auto-Release Cron] Unauthorized request attempted')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Auto-Release Cron] Starting auto-release processing...')

    const result = await GigService.processAllAutoReleases()

    console.log('[Auto-Release Cron] Processing complete:', {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed
    })

    // Log individual failures for debugging
    const failures = result.results.filter(r => !r.success)
    if (failures.length > 0) {
      console.error('[Auto-Release Cron] Failed releases:', failures)
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    })
  } catch (error) {
    console.error('[Auto-Release Cron] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/auto-release
 *
 * Health check endpoint - returns eligible count without processing
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      return NextResponse.json(
        { error: 'Cron endpoint not configured' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const eligibleApplications = await GigService.getApplicationsEligibleForAutoRelease()

    return NextResponse.json({
      status: 'healthy',
      eligibleCount: eligibleApplications.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
