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
    console.log('=== TRADESAFE CALLBACK: Received ===')
    console.log('Full raw body:', rawBody)
    console.log('Content-Type:', contentType)
    console.log('All params:', Object.fromEntries(params.entries()))
    console.log('URL:', request.url)

    // Detect webhook notification vs user redirect
    // Webhooks have: type (e.g. "Transaction"), state, signature
    // User redirects have: action (e.g. "success", "failure")
    const isWebhook = params.has('type') && params.has('state') && params.has('signature')

    console.log('=== TRADESAFE CALLBACK: Detection ===')
    console.log('Is webhook?', isWebhook)
    console.log('Has type?', params.has('type'), '=', params.get('type'))
    console.log('Has state?', params.has('state'), '=', params.get('state'))
    console.log('Has signature?', params.has('signature'))
    console.log('Has action?', params.has('action'), '=', params.get('action'))

    if (isWebhook) {
      // This is a webhook notification (server-to-server)
      const state = params.get('state') || ''
      const transactionId = params.get('id') || ''
      const referenceFromWebhook = params.get('reference') || ''
      const balance = parseFloat(params.get('balance') || '0')

      console.log('=== TRADESAFE CALLBACK: Webhook Data ===')
      console.log('state:', state)
      console.log('transactionId (id field):', transactionId)
      console.log('reference from webhook:', referenceFromWebhook)
      console.log('balance:', balance)
      console.log('NOTE: reference should be our gigId if we set it correctly during initialize')

      // Process payment success states
      // First, try to find gigId from paymentIntent using transactionId
      const gigId = await lookupGigIdFromTransaction(transactionId, referenceFromWebhook)

      console.log('=== TRADESAFE CALLBACK: GigId Lookup Result ===')
      console.log('Looked up gigId:', gigId)
      console.log('Will use this gigId for database updates')

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
        gigId,
        transactionId,
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
 * Look up gigId from paymentIntent using transactionId
 * Falls back to reference if not found
 */
async function lookupGigIdFromTransaction(transactionId: string, fallbackReference: string): Promise<string> {
  console.log('=== LOOKUP: Finding gigId ===')
  console.log('Looking up by transactionId:', transactionId)
  console.log('Fallback reference:', fallbackReference)

  if (!transactionId) {
    console.log('No transactionId, using fallback reference as gigId')
    return fallbackReference
  }

  try {
    const app = getFirebaseAdmin()
    const db = app.firestore()

    const paymentIntentQuery = await db.collection('paymentIntents')
      .where('transactionId', '==', transactionId)
      .where('provider', '==', 'tradesafe')
      .limit(1)
      .get()

    if (!paymentIntentQuery.empty) {
      const paymentData = paymentIntentQuery.docs[0].data()
      console.log('Found paymentIntent:', {
        id: paymentIntentQuery.docs[0].id,
        gigId: paymentData.gigId,
        transactionId: paymentData.transactionId
      })
      return paymentData.gigId
    }

    console.log('PaymentIntent not found for transactionId, using fallback reference')
    return fallbackReference
  } catch (error) {
    console.error('Error looking up gigId:', error)
    return fallbackReference
  }
}

/**
 * Handle successful payment - update gig to in-progress
 */
async function handlePaymentSuccess(gigId: string, transactionId: string, amount: number) {
  console.log('=== PAYMENT SUCCESS: Starting ===')
  console.log('gigId:', gigId)
  console.log('transactionId:', transactionId)
  console.log('amount:', amount)

  if (!gigId || !transactionId) {
    console.warn('=== PAYMENT SUCCESS: FAILED - Missing gigId or transactionId ===')
    return
  }

  const app = getFirebaseAdmin()
  const db = app.firestore()

  // Update payment intent status
  console.log('=== PAYMENT SUCCESS: Step 1 - Finding paymentIntent ===')
  const paymentIntentQuery = await db.collection('paymentIntents')
    .where('transactionId', '==', transactionId)
    .where('provider', '==', 'tradesafe')
    .limit(1)
    .get()

  if (!paymentIntentQuery.empty) {
    const paymentIntent = paymentIntentQuery.docs[0]
    const paymentData = paymentIntent.data()
    console.log('Found paymentIntent:', {
      id: paymentIntent.id,
      currentStatus: paymentData.status,
      gigId: paymentData.gigId
    })

    // Only update if not already funded
    if (paymentData.status !== 'funded' && paymentData.status !== 'completed') {
      await paymentIntent.ref.update({
        status: 'funded',
        fundedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      console.log('PaymentIntent updated to funded')
    } else {
      console.log('PaymentIntent already funded, skipping')
    }
  } else {
    console.warn('PaymentIntent NOT FOUND for transactionId:', transactionId)
  }

  // Update gig status to in-progress
  console.log('=== PAYMENT SUCCESS: Step 2 - Finding gig ===')
  const gigRef = db.collection('gigs').doc(gigId)
  const gigDoc = await gigRef.get()

  if (gigDoc.exists) {
    const gigData = gigDoc.data()
    console.log('Found gig:', {
      id: gigDoc.id,
      currentStatus: gigData?.status,
      currentPaymentStatus: gigData?.paymentStatus
    })

    // Only update if not already funded
    if (gigData?.paymentStatus !== 'funded' && gigData?.paymentStatus !== 'completed') {
      console.log('=== PAYMENT SUCCESS: Step 3 - Updating gig ===')
      await gigRef.update({
        status: 'in-progress',
        paymentStatus: 'funded',
        escrowTransactionId: transactionId,
        escrowAmount: amount,
        fundedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      console.log('Gig updated to in-progress/funded')

      // Also update the accepted application
      console.log('=== PAYMENT SUCCESS: Step 4 - Finding application ===')
      const applicationsQuery = await db.collection('applications')
        .where('gigId', '==', gigId)
        .where('status', '==', 'accepted')
        .limit(1)
        .get()

      if (!applicationsQuery.empty) {
        const appDoc = applicationsQuery.docs[0]
        console.log('Found application:', appDoc.id)
        await appDoc.ref.update({
          status: 'funded',
          paymentStatus: 'in_escrow',
          fundedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        console.log('Application updated to funded')
      } else {
        console.warn('No accepted application found for gigId:', gigId)
      }

      console.log('=== PAYMENT SUCCESS: COMPLETE ===')
    } else {
      console.log('=== PAYMENT SUCCESS: Gig already funded, skipping ===')
    }
  } else {
    console.warn('=== PAYMENT SUCCESS: FAILED - Gig not found ===')
    console.warn('gigId that was NOT found:', gigId)
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
