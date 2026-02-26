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
      console.warn('[PAYMENT_AUDIT] Verify - PaymentIntent not found:', transactionId)
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
      return NextResponse.json(
        { error: 'Transaction not found in TradeSafe' },
        { status: 404 }
      )
    }

    // Check if payment was successful (funds deposited)
    const isPaymentSuccess = ['FUNDS_DEPOSITED', 'FUNDS_RECEIVED', 'INITIATED', 'COMPLETED'].includes(transaction.state)

    if (isPaymentSuccess && paymentData.status !== 'funded' && paymentData.status !== 'completed') {
      // Payment successful but not yet recorded - update database
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
          const appDoc = applicationsQuery.docs[0]
          const appData = appDoc.data()

          await appDoc.ref.update({
            status: 'funded',
            paymentStatus: 'in_escrow',
            fundedAt: admin.firestore.FieldValue.serverTimestamp()
          })

          // Update worker's pending balance (funds in escrow)
          const workerId = appData.applicantId
          if (workerId) {
            const workerRef = db.collection('users').doc(workerId)
            const workerDoc = await workerRef.get()

            if (workerDoc.exists) {
              const workerData = workerDoc.data()
              const currentPending = workerData?.pendingBalance || 0
              const newPending = currentPending + paymentData.amount

              await workerRef.update({
                pendingBalance: newPending,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              })
              console.log('[PAYMENT_AUDIT] Verify - Escrow funded, worker pending updated:', {
                gigId,
                workerId,
                employerId: paymentData.employerId,
                transactionId,
                escrowAmount: paymentData.amount,
                previousPending: currentPending,
                newPending,
                status: 'ESCROW_FUNDED'
              })
            }
          }
        }
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
    console.error('[PAYMENT_AUDIT] Verify error:', error)
    return NextResponse.json(
      {
        error: 'Failed to verify payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
