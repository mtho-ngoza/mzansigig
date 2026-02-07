import { NextRequest, NextResponse } from 'next/server'
import { TradeSafeService } from '@/lib/services/tradesafeService'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'

/**
 * POST /api/payments/tradesafe/verify
 *
 * Verify payment status after TradeSafe redirect and update database.
 * Called by the success page to ensure payment status is synced.
 *
 * This is a fallback for when webhooks don't fire (common in sandbox).
 *
 * @body {
 *   transactionId: string - TradeSafe transaction ID
 * }
 *
 * @returns {
 *   success: boolean
 *   gigId: string
 *   status: string
 *   state: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transactionId } = body

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Missing required field: transactionId' },
        { status: 400 }
      )
    }

    console.log('TradeSafe verify: Checking transaction:', transactionId)

    // Get Firebase admin
    const app = getFirebaseAdmin()
    const db = app.firestore()

    // Find the payment intent by transaction ID
    const paymentIntentQuery = await db.collection('paymentIntents')
      .where('transactionId', '==', transactionId)
      .where('provider', '==', 'tradesafe')
      .limit(1)
      .get()

    if (paymentIntentQuery.empty) {
      console.warn('TradeSafe verify: Payment intent not found for transaction:', transactionId)
      return NextResponse.json(
        { error: 'Payment not found', transactionId },
        { status: 404 }
      )
    }

    const paymentIntent = paymentIntentQuery.docs[0]
    const paymentData = paymentIntent.data()
    const gigId = paymentData.gigId

    // Initialize TradeSafe service and check transaction status
    const tradeSafe = new TradeSafeService()
    const transaction = await tradeSafe.getTransaction(transactionId)

    if (!transaction) {
      console.error('TradeSafe verify: Transaction not found in TradeSafe:', transactionId)
      return NextResponse.json(
        { error: 'Transaction not found in TradeSafe' },
        { status: 404 }
      )
    }

    console.log('TradeSafe verify: Transaction state:', {
      transactionId,
      gigId,
      state: transaction.state,
      currentPaymentStatus: paymentData.status
    })

    // Check if payment was successful (funds deposited)
    const isPaymentSuccess = ['FUNDS_DEPOSITED', 'FUNDS_RECEIVED', 'INITIATED', 'COMPLETED'].includes(transaction.state)

    if (isPaymentSuccess && paymentData.status !== 'funded' && paymentData.status !== 'completed') {
      // Payment successful but not yet recorded - update database
      console.log('TradeSafe verify: Updating payment status to funded:', gigId)

      // Update payment intent
      await paymentIntent.ref.update({
        status: 'funded',
        fundedAt: admin.firestore.FieldValue.serverTimestamp(),
        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      // Update gig status
      const gigRef = db.collection('gigs').doc(gigId)
      const gigDoc = await gigRef.get()

      if (gigDoc.exists) {
        await gigRef.update({
          status: 'in-progress',
          paymentStatus: 'funded',
          escrowTransactionId: transactionId,
          escrowAmount: paymentData.amount,
          fundedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })

        // Also update the application status to 'funded'
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

        console.log('TradeSafe verify: Gig and application updated to funded:', gigId)
      }
    }

    return NextResponse.json({
      success: true,
      gigId,
      status: isPaymentSuccess ? 'funded' : paymentData.status,
      state: transaction.state,
      transactionId
    })
  } catch (error) {
    console.error('TradeSafe verify error:', error)
    return NextResponse.json(
      {
        error: 'Failed to verify payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
