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
      console.log(`Sandbox payment verification for gig ${gigId} - updating status`)

      await gigRef.update({
        status: 'funded',
        paymentStatus: 'completed',
        fundedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentVerifiedVia: 'sandbox-fallback'
      })

      return NextResponse.json({
        success: true,
        message: 'Payment verified and gig funded (sandbox mode)',
        status: 'funded'
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
