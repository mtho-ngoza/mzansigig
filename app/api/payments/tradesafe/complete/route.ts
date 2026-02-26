import { NextRequest, NextResponse } from 'next/server'
import { TradeSafeService } from '@/lib/services/tradesafeService'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import { verifyAuthToken } from '@/lib/auth/verifyToken'
import * as admin from 'firebase-admin'

/**
 * POST /api/payments/tradesafe/complete
 *
 * Mark delivery complete (worker) or accept delivery (employer)
 *
 * @body {
 *   gigId: string
 *   action: 'start' | 'complete' | 'accept'
 * }
 *
 * Actions:
 * - 'start': Worker starts delivery process (FUNDS_RECEIVED → INITIATED)
 * - 'complete': Worker marks delivery complete (triggers 24h auto-accept EMAIL)
 * - 'accept': Employer accepts delivery (immediate payout, NO email)
 *
 * WARNING: 'complete' and 'accept' are MUTUALLY EXCLUSIVE paths:
 * - Path A: start → complete (TradeSafe sends email, 24h countdown)
 * - Path B: start → accept (immediate payout, no email - use for in-app approval)
 * You CANNOT call 'accept' after 'complete' - TradeSafe will reject it.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gigId, action } = body

    // Validate required fields
    if (!gigId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: gigId, action' },
        { status: 400 }
      )
    }

    if (!['start', 'complete', 'accept'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: start, complete, or accept' },
        { status: 400 }
      )
    }

    // Verify Firebase ID token
    const auth = await verifyAuthToken(request)
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized. Please sign in.' },
        { status: 401 }
      )
    }
    const userId = auth.userId

    // Get Firebase admin
    const app = getFirebaseAdmin()
    const db = app.firestore()

    // Get gig details
    const gigDoc = await db.collection('gigs').doc(gigId).get()
    if (!gigDoc.exists) {
      return NextResponse.json({ error: 'Gig not found' }, { status: 404 })
    }

    const gigData = gigDoc.data()
    if (!gigData) {
      return NextResponse.json({ error: 'Gig data not found' }, { status: 404 })
    }

    // Verify user authorization
    const isEmployer = gigData.employerId === userId
    const isWorker = gigData.assignedWorkerId === userId

    if (action === 'accept' && !isEmployer) {
      return NextResponse.json(
        { error: 'Only the employer can accept delivery' },
        { status: 403 }
      )
    }

    if ((action === 'start' || action === 'complete') && !isWorker) {
      return NextResponse.json(
        { error: 'Only the assigned worker can complete delivery' },
        { status: 403 }
      )
    }

    // Find the payment intent for this gig
    const paymentIntentQuery = await db.collection('paymentIntents')
      .where('gigId', '==', gigId)
      .where('provider', '==', 'tradesafe')
      .where('status', 'in', ['funded', 'releasing'])
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()

    if (paymentIntentQuery.empty) {
      return NextResponse.json(
        { error: 'No funded payment found for this gig' },
        { status: 400 }
      )
    }

    const paymentIntent = paymentIntentQuery.docs[0]
    const paymentData = paymentIntent.data()
    const allocationId = paymentData.allocationId

    if (!allocationId) {
      return NextResponse.json(
        { error: 'Allocation ID not found in payment intent' },
        { status: 400 }
      )
    }

    // Initialize TradeSafe service
    const tradeSafe = new TradeSafeService()

    let result
    switch (action) {
      case 'start':
        // Worker starts delivery process
        result = await tradeSafe.startDelivery(allocationId)
        await gigDoc.ref.update({
          deliveryStatus: 'initiated',
          deliveryStartedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        break

      case 'complete':
        // Worker marks delivery complete (triggers 24h auto-accept)
        result = await tradeSafe.completeDelivery(allocationId)
        await gigDoc.ref.update({
          deliveryStatus: 'completed',
          deliveryCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
          autoAcceptAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        break

      case 'accept':
        // Employer accepts delivery (immediate payout)
        result = await tradeSafe.acceptDelivery(allocationId)
        // Use transaction for atomic updates
        await db.runTransaction(async (transaction) => {
          transaction.update(gigDoc.ref, {
            status: 'completed',
            deliveryStatus: 'accepted',
            deliveryAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          })
          transaction.update(paymentIntent.ref, {
            status: 'releasing',
            acceptedAt: admin.firestore.FieldValue.serverTimestamp()
          })
        })
        break
    }

    console.log('[PAYMENT_AUDIT] Complete - Delivery action processed:', {
      gigId,
      action,
      allocationId,
      state: result?.state,
      status: action === 'accept' ? 'RELEASE_TRIGGERED' : action.toUpperCase(),
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      action,
      state: result?.state
    })
  } catch (error) {
    console.error('TradeSafe complete delivery error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process delivery action',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
