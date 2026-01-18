import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'

/**
 * POST /api/payments/payfast/verify
 *
 * Verify and update payment status after redirect
 *
 * This is a fallback for when ITN doesn't arrive (common in sandbox/testing).
 * In production, ITN is the authoritative source for payment status.
 *
 * @body { gigId: string, paymentSuccess: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gigId, paymentSuccess } = body

    if (!gigId) {
      return NextResponse.json(
        { error: 'Missing gigId' },
        { status: 400 }
      )
    }

    // Get user ID from header
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const app = getFirebaseAdmin()
    const db = app.firestore()

    // Get gig
    const gigRef = db.collection('gigs').doc(gigId)
    const gigDoc = await gigRef.get()

    if (!gigDoc.exists) {
      return NextResponse.json(
        { error: 'Gig not found' },
        { status: 404 }
      )
    }

    const gigData = gigDoc.data()

    // Only allow the gig owner to verify
    if (gigData?.employerId !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to verify this payment' },
        { status: 403 }
      )
    }

    // Check if already funded
    if (gigData?.status === 'funded') {
      return NextResponse.json({
        success: true,
        message: 'Gig already funded',
        status: 'funded'
      })
    }

    if (!paymentSuccess) {
      return NextResponse.json({
        success: false,
        message: 'Payment was not successful',
        status: gigData?.status
      })
    }

    // Update gig status to funded (sandbox fallback)
    // In production, this should only happen via ITN
    const isSandbox = process.env.PAYFAST_MODE !== 'live'

    if (isSandbox) {
      console.log(`[PayFast Verify] Sandbox mode - verifying gig ${gigId}`)

      // Get the accepted application to find worker and proposed rate
      const applicationsQuery = await db.collection('applications')
        .where('gigId', '==', gigId)
        .where('status', '==', 'accepted')
        .limit(1)
        .get()

      // Log query results for debugging
      console.log(`[PayFast Verify] Found ${applicationsQuery.size} accepted application(s) for gig ${gigId}`)

      if (applicationsQuery.empty) {
        // No accepted application found - this is an error state
        // Query all applications for this gig to help diagnose
        const allAppsQuery = await db.collection('applications')
          .where('gigId', '==', gigId)
          .get()

        const appStatuses = allAppsQuery.docs.map(doc => ({
          id: doc.id,
          status: doc.data().status,
          applicantId: doc.data().applicantId
        }))

        console.error(`[PayFast Verify] No accepted application found for gig ${gigId}`)
        console.error(`[PayFast Verify] All applications for this gig:`, JSON.stringify(appStatuses))

        return NextResponse.json({
          success: false,
          message: 'No accepted application found for this gig. Please accept an application before funding.',
          status: gigData?.status,
          debug: {
            gigId,
            applicationsFound: allAppsQuery.size,
            applicationStatuses: appStatuses
          }
        })
      }

      const applicationDoc = applicationsQuery.docs[0]
      const applicationData = applicationDoc.data()
      const paidAmount = applicationData.proposedRate || gigData?.budget || 0
      const workerId = applicationData.applicantId

      console.log(`[PayFast Verify] Processing payment - Amount: R${paidAmount}, Worker: ${workerId}, Application: ${applicationDoc.id}`)

      // Update gig status with payment amount
      await gigRef.update({
        status: 'funded',
        paymentStatus: 'completed',
        paidAmount: paidAmount,
        fundedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentVerifiedVia: 'sandbox-fallback'
      })
      console.log(`[PayFast Verify] Updated gig ${gigId} to funded`)

      // Update the accepted application to funded status
      await applicationDoc.ref.update({
        status: 'funded',
        paymentStatus: 'in_escrow',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      console.log(`[PayFast Verify] Updated application ${applicationDoc.id} to funded`)

      // Create escrow record for tracking
      const escrowRef = db.collection('escrow').doc(gigId)
      await escrowRef.set({
        id: gigId,
        gigId,
        employerId: userId,
        workerId: workerId,
        totalAmount: paidAmount,
        releasedAmount: 0,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        verifiedVia: 'sandbox-fallback'
      })
      console.log(`[PayFast Verify] Created escrow record for gig ${gigId} - Amount: R${paidAmount}`)

      console.log(`[PayFast Verify] ✅ Payment verification complete for gig ${gigId}`)

      return NextResponse.json({
        success: true,
        message: 'Payment verified and gig funded (sandbox mode)',
        status: 'funded',
        paidAmount: paidAmount,
        applicationId: applicationDoc.id,
        workerId: workerId
      })
    } else {
      // In production, don't trust client-side verification
      // Just return current status and wait for ITN
      return NextResponse.json({
        success: false,
        message: 'Waiting for payment confirmation from PayFast',
        status: gigData?.status
      })
    }
  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
