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

    console.log('=== VERIFY ENDPOINT: Request received ===')
    console.log('Body:', JSON.stringify(body))
    console.log('transactionId:', transactionId)

    if (!transactionId) {
      console.log('=== VERIFY ENDPOINT: FAILED - No transactionId ===')
      return NextResponse.json(
        { error: 'Missing required field: transactionId' },
        { status: 400 }
      )
    }

    // Get Firebase admin
    const app = getFirebaseAdmin()
    const db = app.firestore()

    // Find the payment intent by transaction ID
    console.log('=== VERIFY ENDPOINT: Step 1 - Finding paymentIntent ===')
    console.log('Searching for transactionId:', transactionId)

    const paymentIntentQuery = await db.collection('paymentIntents')
      .where('transactionId', '==', transactionId)
      .where('provider', '==', 'tradesafe')
      .limit(1)
      .get()

    if (paymentIntentQuery.empty) {
      console.warn('=== VERIFY ENDPOINT: FAILED - PaymentIntent not found ===')
      console.warn('transactionId searched:', transactionId)
      return NextResponse.json(
        { error: 'Payment not found', transactionId },
        { status: 404 }
      )
    }

    const paymentIntent = paymentIntentQuery.docs[0]
    const paymentData = paymentIntent.data()
    const gigId = paymentData.gigId

    console.log('=== VERIFY ENDPOINT: Step 2 - Found paymentIntent ===')
    console.log('paymentIntent id:', paymentIntent.id)
    console.log('gigId from paymentIntent:', gigId)
    console.log('current status:', paymentData.status)
    console.log('full paymentData:', JSON.stringify(paymentData))

    // Initialize TradeSafe service and check transaction status
    console.log('=== VERIFY ENDPOINT: Step 3 - Calling TradeSafe API ===')
    const tradeSafe = new TradeSafeService()
    const transaction = await tradeSafe.getTransaction(transactionId)

    if (!transaction) {
      console.error('=== VERIFY ENDPOINT: FAILED - Transaction not found in TradeSafe ===')
      return NextResponse.json(
        { error: 'Transaction not found in TradeSafe' },
        { status: 404 }
      )
    }

    console.log('=== VERIFY ENDPOINT: Step 4 - TradeSafe response ===')
    console.log('Full transaction from TradeSafe:', JSON.stringify(transaction, null, 2))
    console.log('Transaction state:', transaction.state)
    console.log('Transaction reference:', transaction.reference)

    // Check if payment was successful (funds deposited)
    const isPaymentSuccess = ['FUNDS_DEPOSITED', 'FUNDS_RECEIVED', 'INITIATED', 'COMPLETED'].includes(transaction.state)
    console.log('=== VERIFY ENDPOINT: Step 5 - Payment success check ===')
    console.log('isPaymentSuccess:', isPaymentSuccess)
    console.log('current paymentData.status:', paymentData.status)

    if (isPaymentSuccess && paymentData.status !== 'funded' && paymentData.status !== 'completed') {
      // Payment successful but not yet recorded - update database
      console.log('=== VERIFY ENDPOINT: Step 6 - Updating database ===')

      // Update payment intent
      await paymentIntent.ref.update({
        status: 'funded',
        fundedAt: admin.firestore.FieldValue.serverTimestamp(),
        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      console.log('PaymentIntent updated to funded')

      // Update gig status
      const gigRef = db.collection('gigs').doc(gigId)
      const gigDoc = await gigRef.get()

      if (gigDoc.exists) {
        console.log('Found gig, current data:', JSON.stringify(gigDoc.data()))

        await gigRef.update({
          status: 'in-progress',
          paymentStatus: 'funded',
          escrowTransactionId: transactionId,
          escrowAmount: paymentData.amount,
          fundedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        console.log('Gig updated to in-progress/funded')

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
          console.log('Application updated to funded')

          // Update worker's pending balance (funds in escrow)
          console.log('=== VERIFY ENDPOINT: Updating worker pendingBalance ===')
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
        } else {
          console.warn('No accepted application found for gigId:', gigId)
        }

        console.log('=== VERIFY ENDPOINT: COMPLETE - All updates done ===')
      } else {
        console.warn('=== VERIFY ENDPOINT: WARNING - Gig not found ===')
        console.warn('gigId:', gigId)
      }
    } else {
      console.log('=== VERIFY ENDPOINT: Skipping update ===')
      console.log('Reason: isPaymentSuccess=', isPaymentSuccess, 'status=', paymentData.status)
    }

    const response = {
      success: true,
      gigId,
      status: isPaymentSuccess ? 'funded' : paymentData.status,
      state: transaction.state,
      transactionId
    }
    console.log('=== VERIFY ENDPOINT: Returning ===', response)

    return NextResponse.json(response)
  } catch (error) {
    console.error('=== VERIFY ENDPOINT: ERROR ===')
    console.error('Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to verify payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
