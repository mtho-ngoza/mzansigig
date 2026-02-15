import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import { verifyAuthToken } from '@/lib/auth/verifyToken'
import * as admin from 'firebase-admin'
import { TradeSafeService } from '@/lib/services/tradesafeService'

/**
 * POST /api/gigs/approve-completion
 *
 * Employer approves worker's completion request
 * Releases escrow funds to worker (minus platform commission)
 *
 * @body {
 *   applicationId: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { applicationId } = body

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Missing required field: applicationId' },
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
    const employerId = auth.userId

    console.log('=== APPROVE COMPLETION API: Starting ===')
    console.log('applicationId:', applicationId)
    console.log('employerId:', employerId)

    // Get Firebase admin
    const app = getFirebaseAdmin()
    const db = app.firestore()

    // Get application
    const appDoc = await db.collection('applications').doc(applicationId).get()
    if (!appDoc.exists) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const application = appDoc.data()!
    const workerId = application.applicantId

    console.log('Application found:', {
      id: applicationId,
      workerId,
      status: application.status,
      paymentStatus: application.paymentStatus
    })

    // Verify application is in correct state
    if (application.status !== 'funded' && application.status !== 'in_progress') {
      return NextResponse.json(
        { error: `Cannot approve completion: application status is ${application.status}` },
        { status: 400 }
      )
    }

    // Get gig
    const gigDoc = await db.collection('gigs').doc(application.gigId).get()
    if (!gigDoc.exists) {
      return NextResponse.json({ error: 'Gig not found' }, { status: 404 })
    }

    const gig = gigDoc.data()!

    // Verify employer owns this gig
    if (gig.employerId !== employerId) {
      return NextResponse.json(
        { error: 'Only the employer can approve completion' },
        { status: 403 }
      )
    }

    console.log('Gig found:', {
      id: application.gigId,
      escrowAmount: gig.escrowAmount,
      employerId: gig.employerId
    })

    // Calculate escrow amount
    const escrowAmount = gig.escrowAmount || application.agreedRate || application.proposedRate || 0

    // Get payment intent to find TradeSafe allocation ID
    const paymentIntentQuery = await db.collection('paymentIntents')
      .where('gigId', '==', application.gigId)
      .where('status', '==', 'funded')
      .limit(1)
      .get()

    const paymentIntent = paymentIntentQuery.empty ? null : paymentIntentQuery.docs[0].data()
    const allocationId = paymentIntent?.allocationId

    console.log('Payment intent:', {
      found: !paymentIntentQuery.empty,
      allocationId,
      transactionId: paymentIntent?.transactionId
    })

    console.log('Escrow release details:', {
      escrowAmount,
      workerId,
      employerId
    })

    // Run transaction with admin SDK (bypasses security rules)
    await db.runTransaction(async (transaction) => {
      // Read worker and employer docs first (Firestore requirement)
      const workerRef = db.collection('users').doc(workerId)
      const employerRef = db.collection('users').doc(employerId)

      const workerDoc = await transaction.get(workerRef)
      const employerDoc = await transaction.get(employerRef)

      // Validate worker exists and has sufficient pending balance
      if (!workerDoc.exists) {
        throw new Error('Worker not found')
      }

      const workerData = workerDoc.data()!
      const currentPending = workerData.pendingBalance || 0

      if (escrowAmount > 0 && currentPending < escrowAmount) {
        throw new Error(`Insufficient pending balance. Expected ${escrowAmount}, found ${currentPending}`)
      }

      // Update application
      const appRef = db.collection('applications').doc(applicationId)
      transaction.update(appRef, {
        status: 'completed',
        paymentStatus: 'released',
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      console.log('Application updated to completed')

      // Update gig
      const gigRef = db.collection('gigs').doc(application.gigId)
      transaction.update(gigRef, {
        status: 'completed',
        paymentStatus: 'released',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      console.log('Gig updated to completed')

      // Increment worker's completedGigs
      transaction.update(workerRef, {
        completedGigs: admin.firestore.FieldValue.increment(1)
      })
      console.log('Worker completedGigs incremented')

      // Release escrow if there's an amount
      if (escrowAmount > 0) {
        // Calculate net amount (10% platform commission)
        const platformCommission = escrowAmount * 0.10
        const netAmount = escrowAmount - platformCommission

        console.log('[PAYMENT_AUDIT] Approve - Fee calculation:', {
          gigId: application.gigId,
          workerId,
          employerId,
          escrowAmount,
          platformCommissionPercent: 10,
          platformCommission,
          workerEarnings: netAmount,
          verifyCommission: `${((platformCommission / escrowAmount) * 100).toFixed(1)}%`
        })

        // Update worker wallet
        transaction.update(workerRef, {
          pendingBalance: admin.firestore.FieldValue.increment(-escrowAmount),
          walletBalance: admin.firestore.FieldValue.increment(netAmount),
          totalEarnings: admin.firestore.FieldValue.increment(netAmount),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        console.log('Worker wallet updated')

        // Update employer pending balance
        if (employerDoc.exists) {
          const employerData = employerDoc.data()!
          const employerPending = employerData.pendingBalance || 0
          const newPending = Math.max(0, employerPending - escrowAmount)

          console.log('Releasing employer escrow:', {
            employerId,
            currentPending: employerPending,
            releaseAmount: escrowAmount,
            newPending
          })

          transaction.update(employerRef, {
            pendingBalance: newPending,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          })
          console.log('Employer pending balance updated')
        }
      }
    })

    // Trigger TradeSafe payout if we have an allocation ID
    let tradeSafePayoutTriggered = false
    if (allocationId) {
      try {
        // Get worker bank details for audit log
        const workerDocForLog = await db.collection('users').doc(workerId).get()
        const workerBankData = workerDocForLog.data()?.bankDetails

        console.log('[PAYMENT_AUDIT] Approve - Triggering TradeSafe payout:', {
          gigId: application.gigId,
          allocationId,
          escrowAmount,
          workerId,
          workerBankDetails: workerBankData
            ? `${workerBankData.bankName} ****${workerBankData.accountNumber?.slice(-4)}`
            : 'NOT_FOUND'
        })
        const tradeSafe = new TradeSafeService()

        // Get current transaction/allocation state
        const transactionId = paymentIntent?.transactionId
        const transaction = transactionId ? await tradeSafe.getTransaction(transactionId) : null
        const allocation = transaction?.allocations?.[0]

        console.log('TradeSafe current state:', {
          transactionId,
          transactionState: transaction?.state,
          allocationId,
          allocationState: allocation?.state
        })

        // Transaction must be in FUNDS_RECEIVED state before delivery flow can start
        // Note: Transaction and Allocation have separate state machines
        if (transaction?.state === 'FUNDS_RECEIVED') {
          // TradeSafe requires full delivery flow sequence:
          // 1. startDelivery - Worker starts delivering
          // 2. completeDelivery - Worker marks delivery complete
          // 3. acceptDelivery - Buyer accepts, triggers immediate payout
          console.log('TradeSafe: Starting delivery flow for allocation:', allocationId)

          const startResult = await tradeSafe.startDelivery(allocationId)
          console.log('TradeSafe startDelivery result:', startResult)

          const completeResult = await tradeSafe.completeDelivery(allocationId)
          console.log('TradeSafe completeDelivery result:', completeResult)

          const acceptResult = await tradeSafe.acceptDelivery(allocationId)
          console.log('TradeSafe acceptDelivery result:', acceptResult)

          tradeSafePayoutTriggered = true
        } else {
          // Funds not yet fully received by TradeSafe
          // This can happen in sandbox or when payment is still processing
          console.log('TradeSafe: Transaction not ready for payout', {
            transactionState: transaction?.state,
            allocationState: allocation?.state,
            requiredState: 'FUNDS_RECEIVED',
            note: 'Worker will receive payout when funds are fully processed by TradeSafe'
          })
        }

        // Update payment intent status
        if (!paymentIntentQuery.empty) {
          await paymentIntentQuery.docs[0].ref.update({
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp()
          })
        }
      } catch (tradeSafeError) {
        // Log but don't fail - local records are already updated
        console.error('TradeSafe payout error (non-blocking):', tradeSafeError)
      }
    } else {
      console.log('No TradeSafe allocation ID - skipping direct payout')
    }

    // Create payment history records (outside transaction for simplicity)
    console.log('=== APPROVE COMPLETION API: Creating payment history ===')
    const gigTitle = gig.title || `Gig ${application.gigId}`
    const platformCommission = escrowAmount * 0.10
    const netAmount = escrowAmount - platformCommission

    // Update existing pending earnings record to completed, or create new one
    const pendingHistoryQuery = await db.collection('paymentHistory')
      .where('userId', '==', workerId)
      .where('gigId', '==', application.gigId)
      .where('type', '==', 'earnings')
      .where('status', '==', 'pending')
      .limit(1)
      .get()

    if (!pendingHistoryQuery.empty) {
      // Update existing pending record to completed with net amount
      await pendingHistoryQuery.docs[0].ref.update({
        status: 'completed',
        amount: netAmount,
        description: `Earnings from: ${gigTitle} (released - R${escrowAmount.toFixed(2)} minus 10% fee)`,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      console.log('Updated existing payment history record to completed')
    } else {
      // Create new completed earnings record if pending not found
      await db.collection('paymentHistory').add({
        userId: workerId,
        type: 'earnings',
        amount: netAmount,
        currency: 'ZAR',
        status: 'completed',
        gigId: application.gigId,
        description: `Earnings from: ${gigTitle} (R${escrowAmount.toFixed(2)} minus 10% fee)`,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
      console.log('Created new completed payment history record')
    }

    // Create platform fee record for tracking
    await db.collection('paymentHistory').add({
      userId: workerId,
      type: 'fees',
      amount: -platformCommission,
      currency: 'ZAR',
      status: 'completed',
      gigId: application.gigId,
      description: `Platform fee (10%) for: ${gigTitle}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
    console.log('Created platform fee history record')

    console.log('[PAYMENT_AUDIT] Approve - COMPLETION SUCCESS:', {
      gigId: application.gigId,
      applicationId,
      workerId,
      employerId,
      escrowAmount,
      platformCommission: escrowAmount > 0 ? escrowAmount * 0.10 : 0,
      workerEarnings: escrowAmount > 0 ? escrowAmount - (escrowAmount * 0.10) : 0,
      tradeSafePayoutTriggered,
      allocationId: allocationId || 'N/A',
      status: 'APPROVED_PAYOUT_TRIGGERED',
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: tradeSafePayoutTriggered
        ? 'Completion approved. Payment sent directly to worker\'s bank account.'
        : 'Completion approved and escrow released to wallet.',
      tradeSafePayout: tradeSafePayoutTriggered,
      netAmount
    })
  } catch (error) {
    console.error('Approve completion error:', error)
    return NextResponse.json(
      {
        error: 'Failed to approve completion',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
