import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import { verifyAuthToken } from '@/lib/auth/verifyToken'
import * as admin from 'firebase-admin'

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

        console.log('Fee calculation:', {
          grossAmount: escrowAmount,
          platformCommission,
          netAmount
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

    console.log('=== APPROVE COMPLETION API: SUCCESS ===')

    return NextResponse.json({
      success: true,
      message: 'Completion approved and escrow released'
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
