import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'

/**
 * POST /tradesafe/callback
 *
 * Handles two types of POST requests from TradeSafe:
 * 1. User redirect callbacks - after payment, user is redirected here with action param
 * 2. Webhook notifications - server-to-server updates with type and state params
 *
 * For user redirects: Use 303 redirect to payment success/error page
 * For webhooks: Process the webhook and update database, return 200 OK
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
        const body = JSON.parse(rawBody) as Record<string, unknown>
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

    // Detect webhook notification vs user redirect
    // Webhooks have: type (e.g. "Transaction"), state, signature
    // User redirects have: action (e.g. "success", "failure")
    const isWebhook = params.has('type') && params.has('state') && params.has('signature')

    if (isWebhook) {
      // This is a webhook notification (server-to-server)
      const state = params.get('state') || ''
      const transactionId = params.get('id') || ''
      const gigId = params.get('reference') || ''
      const balance = parseFloat(params.get('balance') || '0')

      console.log('TradeSafe webhook received:', { state, transactionId, gigId, balance })

      // Process payment success states
      if (['FUNDS_DEPOSITED', 'FUNDS_RECEIVED', 'INITIATED'].includes(state)) {
        await handlePaymentSuccess(gigId, transactionId, balance)
      } else if (state === 'COMPLETED') {
        await handleTransactionCompleted(gigId, transactionId)
      } else if (state === 'CANCELLED') {
        await handleTransactionCancelled(gigId, transactionId)
      }

      return NextResponse.json({
        received: true,
        state,
        processed: true
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
 * Handle successful payment - update gig to in-progress
 */
async function handlePaymentSuccess(gigId: string, transactionId: string, amount: number) {
  if (!gigId || !transactionId) {
    console.warn('TradeSafe webhook: Missing gigId or transactionId')
    return
  }

  console.log('TradeSafe webhook: Processing payment success for gig:', gigId)

  const app = getFirebaseAdmin()
  const db = app.firestore()

  // Update payment intent status
  const paymentIntentQuery = await db.collection('paymentIntents')
    .where('transactionId', '==', transactionId)
    .where('provider', '==', 'tradesafe')
    .limit(1)
    .get()

  if (!paymentIntentQuery.empty) {
    const paymentIntent = paymentIntentQuery.docs[0]
    const paymentData = paymentIntent.data()

    // Only update if not already funded
    if (paymentData.status !== 'funded' && paymentData.status !== 'completed') {
      await paymentIntent.ref.update({
        status: 'funded',
        fundedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }
  }

  // Update gig status to in-progress
  const gigRef = db.collection('gigs').doc(gigId)
  const gigDoc = await gigRef.get()

  if (gigDoc.exists) {
    const gigData = gigDoc.data()
    // Only update if not already funded
    if (gigData?.paymentStatus !== 'funded' && gigData?.paymentStatus !== 'completed') {
      await gigRef.update({
        status: 'in-progress',
        paymentStatus: 'funded',
        escrowTransactionId: transactionId,
        escrowAmount: amount,
        fundedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      // Also update the accepted application
      const applicationsQuery = await db.collection('applications')
        .where('gigId', '==', gigId)
        .where('status', '==', 'accepted')
        .limit(1)
        .get()

      if (!applicationsQuery.empty) {
        await applicationsQuery.docs[0].ref.update({
          status: 'funded',
          paymentStatus: 'in_escrow',
          fundedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      }

      console.log('TradeSafe webhook: Gig and application updated to funded:', gigId)
    } else {
      console.log('TradeSafe webhook: Gig already funded, skipping update:', gigId)
    }
  } else {
    console.warn('TradeSafe webhook: Gig not found:', gigId)
  }
}

/**
 * Handle transaction completed - funds released to worker
 */
async function handleTransactionCompleted(gigId: string, transactionId: string) {
  if (!gigId) return

  console.log('TradeSafe webhook: Processing transaction completed for gig:', gigId)

  const app = getFirebaseAdmin()
  const db = app.firestore()

  // Update gig status
  const gigRef = db.collection('gigs').doc(gigId)
  await gigRef.update({
    status: 'completed',
    paymentStatus: 'released',
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })

  // Update payment intent
  const paymentIntentQuery = await db.collection('paymentIntents')
    .where('transactionId', '==', transactionId)
    .where('provider', '==', 'tradesafe')
    .limit(1)
    .get()

  if (!paymentIntentQuery.empty) {
    await paymentIntentQuery.docs[0].ref.update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    })
  }

  console.log('TradeSafe webhook: Transaction completed, gig marked complete:', gigId)
}

/**
 * Handle transaction cancelled - refund processed
 */
async function handleTransactionCancelled(gigId: string, transactionId: string) {
  if (!gigId) return

  console.log('TradeSafe webhook: Processing transaction cancellation for gig:', gigId)

  const app = getFirebaseAdmin()
  const db = app.firestore()

  // Update payment intent status
  const paymentIntentQuery = await db.collection('paymentIntents')
    .where('transactionId', '==', transactionId)
    .where('provider', '==', 'tradesafe')
    .limit(1)
    .get()

  if (!paymentIntentQuery.empty) {
    await paymentIntentQuery.docs[0].ref.update({
      status: 'cancelled',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp()
    })
  }

  // Update gig status
  const gigRef = db.collection('gigs').doc(gigId)
  const gigDoc = await gigRef.get()

  if (gigDoc.exists) {
    const gigData = gigDoc.data()
    if (gigData?.paymentStatus === 'funded') {
      await gigRef.update({
        paymentStatus: 'refunded',
        escrowTransactionId: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }
  }

  console.log('TradeSafe webhook: Transaction cancelled:', transactionId)
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
