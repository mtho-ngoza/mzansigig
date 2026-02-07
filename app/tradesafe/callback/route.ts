import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /tradesafe/callback
 *
 * Handles two types of POST requests from TradeSafe:
 * 1. User redirect callbacks - after payment, user is redirected here with action param
 * 2. Webhook notifications - server-to-server updates with type and state params
 *
 * For user redirects: Use 303 redirect to payment success/error page
 * For webhooks: Return 200 OK (webhooks are server-to-server, can't redirect)
 */
export async function POST(request: NextRequest) {
  try {
    // TradeSafe may send data as form-encoded or JSON
    const contentType = request.headers.get('content-type') || ''

    let params: URLSearchParams
    let rawBody: string | null = null
    let parsedBody: Record<string, unknown> | null = null

    if (contentType.includes('application/json')) {
      rawBody = await request.text()
      try {
        parsedBody = JSON.parse(rawBody)
        // Flatten object to URL params
        params = new URLSearchParams()
        for (const [key, value] of Object.entries(parsedBody)) {
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

    // Detect webhook notification vs user redirect
    // Webhooks have: type (e.g. "Transaction"), state, signature
    // User redirects have: action (e.g. "success", "failure")
    const isWebhook = params.has('type') && params.has('state') && params.has('signature')

    if (isWebhook) {
      // This is a webhook notification (server-to-server)
      // Don't redirect - just acknowledge receipt
      // Note: The proper webhook handler at /api/payments/tradesafe/webhook handles processing
      console.log('TradeSafe callback: Webhook notification received, state:', params.get('state'))

      // Return 200 to acknowledge receipt
      return NextResponse.json({
        received: true,
        state: params.get('state'),
        note: 'Webhook received at callback URL. Configure webhook URL to /api/payments/tradesafe/webhook for full processing.'
      })
    }

    // User redirect callback - redirect to appropriate page
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
