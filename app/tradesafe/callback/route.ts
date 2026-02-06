import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /tradesafe/callback
 *
 * Handles POST callbacks from TradeSafe after payment completion.
 * TradeSafe sends payment result via POST, we redirect to appropriate page.
 */
export async function POST(request: NextRequest) {
  try {
    // TradeSafe may send data as form-encoded or JSON
    const contentType = request.headers.get('content-type') || ''

    let params: URLSearchParams

    if (contentType.includes('application/json')) {
      const body = await request.json()
      params = new URLSearchParams(body)
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text()
      params = new URLSearchParams(text)
    } else {
      // Try to get from URL search params
      params = new URLSearchParams(request.nextUrl.search)
    }

    const action = params.get('action') || params.get('status')

    // Build redirect URL with all params
    const redirectParams = params.toString()

    if (action === 'success') {
      return NextResponse.redirect(
        new URL(`/payment/success?${redirectParams}`, request.url)
      )
    } else {
      return NextResponse.redirect(
        new URL(`/payment/error?${redirectParams}`, request.url)
      )
    }
  } catch (error) {
    console.error('TradeSafe callback error:', error)
    return NextResponse.redirect(
      new URL('/payment/error?error=callback_failed', request.url)
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
  const action = params.get('action') || params.get('status')
  const redirectParams = params.toString()

  if (action === 'success') {
    return NextResponse.redirect(
      new URL(`/payment/success?${redirectParams}`, request.url)
    )
  } else {
    return NextResponse.redirect(
      new URL(`/payment/error?${redirectParams}`, request.url)
    )
  }
}
