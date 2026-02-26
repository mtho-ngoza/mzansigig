import { NextRequest, NextResponse } from 'next/server'
import { TradeSafeService } from '@/lib/services/tradesafeService'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'

/**
 * POST /api/payments/tradesafe/webhook
 *
 * Handle TradeSafe webhook notifications for transaction state changes
 *
 * Events:
 * - transaction.funded: Funds deposited by buyer
 * - transaction.completed: All allocations accepted, payouts complete
 * - transaction.cancelled: Transaction cancelled, funds refunded
 * - allocation.delivered: Seller marked delivery complete
 * - allocation.accepted: Buyer accepted delivery, payout triggered
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get('x-tradesafe-signature') || ''

    // Initialize TradeSafe service
    const tradeSafe = new TradeSafeService()

    // Validate webhook signature
    if (!tradeSafe.validateWebhook(payload, signature)) {
      console.error('TradeSafe webhook: Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse webhook payload
    const event = tradeSafe.parseWebhook(payload)
    if (!event) {
      console.error('TradeSafe webhook: Failed to parse payload')
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    console.log('[PAYMENT_AUDIT] Webhook - Event received:', {
      event: event.event,
      transactionId: event.transactionId,
      state: event.state,
      timestamp: new Date().toISOString()
    })

    // Get Firebase admin
    const app = getFirebaseAdmin()
    const db = app.firestore()

    // Find the payment intent by transaction ID
    const paymentIntentQuery = await db.collection('paymentIntents')
      .where('transactionId', '==', event.transactionId)
      .where('provider', '==', 'tradesafe')
      .limit(1)
      .get()

    if (paymentIntentQuery.empty) {
      console.warn('TradeSafe webhook: Payment intent not found for transaction:', event.transactionId)
      // Return 200 to acknowledge receipt (avoid retries for unknown transactions)
      return NextResponse.json({ received: true, warning: 'Payment intent not found' })
    }

    const paymentIntent = paymentIntentQuery.docs[0]
    const paymentData = paymentIntent.data()
    const gigId = paymentData.gigId
    const workerId = paymentData.workerId

    // Handle different webhook events
    switch (event.state) {
      case 'FUNDS_RECEIVED':
      case 'FUNDS_DEPOSITED':
        // Payment successful - update gig status
        await handlePaymentSuccess(db, gigId, paymentIntent.id, event.transactionId, paymentData.amount)
        break

      case 'COMPLETED':
        // Transaction completed - funds released to worker
        await handleTransactionCompleted(db, gigId, workerId, paymentData.amount, event.transactionId)
        break

      case 'CANCELLED':
        // Transaction cancelled - handle refund
        await handleTransactionCancelled(db, gigId, paymentIntent.id, event.transactionId)
        break

      case 'ACCEPTED':
        // Allocation accepted - funds being released
        console.log('TradeSafe: Allocation accepted, payout in progress:', event.transactionId)
        await paymentIntent.ref.update({
          status: 'releasing',
          releasedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        break

      default:
        console.log('TradeSafe webhook: Unhandled state:', event.state)
    }

    return NextResponse.json({ received: true, event: event.event })
  } catch (error) {
    console.error('TradeSafe webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle successful payment - update gig to in-progress
 * Uses Firestore transaction for atomicity
 */
async function handlePaymentSuccess(
  db: admin.firestore.Firestore,
  gigId: string,
  paymentIntentId: string,
  transactionId: string,
  amount: number
) {
  console.log('[PAYMENT_AUDIT] Webhook - Payment success (escrow funded):', {
    gigId,
    transactionId,
    status: 'ESCROW_FUNDED'
  })

  const paymentIntentRef = db.collection('paymentIntents').doc(paymentIntentId)
  const gigRef = db.collection('gigs').doc(gigId)

  await db.runTransaction(async (transaction) => {
    const gigDoc = await transaction.get(gigRef)

    // Update payment intent status
    transaction.update(paymentIntentRef, {
      status: 'funded',
      fundedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    // Update gig status to in-progress if it exists
    if (gigDoc.exists) {
      transaction.update(gigRef, {
        status: 'in-progress',
        paymentStatus: 'funded',
        escrowTransactionId: transactionId,
        escrowAmount: amount,
        fundedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }
  })

  console.log('[PAYMENT_AUDIT] Gig updated to in-progress:', gigId)
}

/**
 * Handle transaction completed - funds released to worker
 * Uses Firestore transaction for atomicity
 */
async function handleTransactionCompleted(
  db: admin.firestore.Firestore,
  gigId: string,
  workerId: string,
  amount: number,
  transactionId: string
) {
  console.log('[PAYMENT_AUDIT] Processing transaction completed for gig:', gigId)

  const gigRef = db.collection('gigs').doc(gigId)

  // Find the payment intent first (outside transaction for query)
  const paymentIntentQuery = await db.collection('paymentIntents')
    .where('transactionId', '==', transactionId)
    .where('provider', '==', 'tradesafe')
    .limit(1)
    .get()

  await db.runTransaction(async (transaction) => {
    // Update gig status
    transaction.update(gigRef, {
      status: 'completed',
      paymentStatus: 'released',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    // Update payment intent if found
    if (!paymentIntentQuery.empty) {
      transaction.update(paymentIntentQuery.docs[0].ref, {
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }
  })

  // Note: Wallet updates not needed - TradeSafe handles actual payouts
  // The worker receives funds directly to their bank account via TradeSafe

  console.log('[PAYMENT_AUDIT] Webhook - PAYOUT COMPLETE - Funds released to worker bank:', {
    gigId,
    workerId,
    escrowAmount: amount,
    transactionId,
    status: 'WORKER_PAID',
    timestamp: new Date().toISOString()
  })
}

/**
 * Handle transaction cancelled - refund processed
 * Uses Firestore transaction for atomicity
 */
async function handleTransactionCancelled(
  db: admin.firestore.Firestore,
  gigId: string,
  paymentIntentId: string,
  transactionId: string
) {
  console.log('[PAYMENT_AUDIT] Processing transaction cancellation for gig:', gigId)

  const paymentIntentRef = db.collection('paymentIntents').doc(paymentIntentId)
  const gigRef = db.collection('gigs').doc(gigId)

  await db.runTransaction(async (transaction) => {
    const gigDoc = await transaction.get(gigRef)

    // Update payment intent status
    transaction.update(paymentIntentRef, {
      status: 'cancelled',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp()
    })

    // Update gig status if it exists and was funded
    if (gigDoc.exists) {
      const gigData = gigDoc.data()
      if (gigData?.paymentStatus === 'funded') {
        transaction.update(gigRef, {
          paymentStatus: 'refunded',
          escrowTransactionId: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      }
    }
  })

  console.log('[PAYMENT_AUDIT] Transaction cancelled, refund processed:', transactionId)
}
