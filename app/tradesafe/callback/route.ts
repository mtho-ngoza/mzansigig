import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /tradesafe/callback
 *
 * Handles POST callbacks from TradeSafe after payment completion.
 * TradeSafe sends payment result via POST, we redirect to appropriate page.
 *
 * IMPORTANT: Use 303 (See Other) redirect to force GET method on the target page.
 * 307 preserves POST which doesn't work with Next.js page routes.
 */
export async function POST(request: NextRequest) {
  try {
    // TradeSafe may send data as form-encoded or JSON
    const contentType = request.headers.get('content-type') || ''

    let params: URLSearchParams
    let rawBody: string | null = null

    if (contentType.includes('application/json')) {
      rawBody = await request.text()
      try {
        const body = JSON.parse(rawBody)
        // Flatten object to URL params
        params = new URLSearchParams()
        for (const [key, value] of Object.entries(body)) {
          if (value !== null && value !== undefined) {
            params.set(key, String(value))
          }
        }
      } catch {
        params = new URLSearchParams(request.nextUrl.search)
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      rawBody = await request.text()
      params = new URLSearchParams(rawBody)
    } else {
      // Try to get from URL search params
      params = new URLSearchParams(request.nextUrl.search)
    }

    // Log the callback for debugging
    console.log('TradeSafe callback received:', {
      contentType,
      rawBody: rawBody?.substring(0, 500),
      params: Object.fromEntries(params.entries()),
      url: request.url
    })

    // TradeSafe uses 'action' param: 'success', 'failure', or 'canceled'
    const action = params.get('action') || params.get('status') || ''
    const actionLower = action.toLowerCase()

    // Build redirect URL with all params
    const redirectParams = params.toString()

    // Check for success indicators
    const isSuccess = actionLower === 'success' ||
                      actionLower === 'completed' ||
                      actionLower === 'funds_deposited' ||
                      actionLower === 'funds_received'

    const baseUrl = new URL(request.url).origin

    if (isSuccess) {
      console.log('TradeSafe callback: Redirecting to success page')
      // Use 303 See Other to force GET request
      return NextResponse.redirect(
        new URL(`/payment/success?${redirectParams}`, baseUrl),
        { status: 303 }
      )
    } else {
      console.log('TradeSafe callback: Redirecting to error page, action:', action)
      // Use 303 See Other to force GET request
      return NextResponse.redirect(
        new URL(`/payment/error?${redirectParams}`, baseUrl),
        { status: 303 }
      )
    }
  } catch (error) {
    console.error('TradeSafe callback error:', error)
    const baseUrl = new URL(request.url).origin
    return NextResponse.redirect(
      new URL('/payment/error?error=callback_failed', baseUrl),
      { status: 303 }
    )
  }
}

/**
 * GET /tradesafe/callback
 *
 * Handles GET redirects from TradeSafe (fallback)
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  // Log the callback for debugging
  console.log('TradeSafe GET callback received:', {
    params: Object.fromEntries(params.entries()),
    url: request.url
  })

  const action = params.get('action') || params.get('status') || ''
  const actionLower = action.toLowerCase()
  const redirectParams = params.toString()

  const isSuccess = actionLower === 'success' ||
                    actionLower === 'completed' ||
                    actionLower === 'funds_deposited' ||
                    actionLower === 'funds_received'

  const baseUrl = new URL(request.url).origin

  if (isSuccess) {
    return NextResponse.redirect(
      new URL(`/payment/success?${redirectParams}`, baseUrl),
      { status: 303 }
    )
  } else {
    return NextResponse.redirect(
      new URL(`/payment/error?${redirectParams}`, baseUrl),
      { status: 303 }
    )
  }
}
