import { NextRequest, NextResponse } from 'next/server'
import { PaystackService } from '@/lib/services/paystackService'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import { processSuccessfulPayment } from '@/lib/services/paymentProcessingService'

/**
 * POST /api/payments/paystack/verify
 *
 * Verify payment status after redirect from Paystack
 *
 * This endpoint is called when the user returns from Paystack checkout.
 * It verifies the transaction with Paystack and processes the payment if successful.
 *
 * In production, the webhook is the authoritative source, but this provides
 * immediate feedback to the user.
 *
 * @body { gigId: string, reference: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gigId, reference } = body

    if (!gigId || !reference) {
      return NextResponse.json(
        { error: 'Missing gigId or reference' },
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

    // Verify transaction with Paystack
    const paystackService = new PaystackService()
    const verification = await paystackService.verifyTransaction(reference)

    if (!verification.status) {
      return NextResponse.json({
        success: false,
        message: 'Could not verify payment with Paystack',
        status: gigData?.status
      })
    }

    const { data } = verification

    // Check if payment was successful
    if (!PaystackService.isPaymentSuccessful(data.status)) {
      return NextResponse.json({
        success: false,
        message: `Payment ${data.status}: ${data.gateway_response}`,
        status: gigData?.status,
        paymentStatus: data.status
      })
    }

    // Payment successful - check if webhook already processed it
    // Re-fetch gig to check latest status
    const updatedGigDoc = await gigRef.get()
    if (updatedGigDoc.data()?.status === 'funded') {
      return NextResponse.json({
        success: true,
        message: 'Payment already processed',
        status: 'funded'
      })
    }

    // Process the payment (webhook may not have arrived yet)
    console.log(`[Paystack Verify] Processing payment for gig ${gigId}`)

    const grossAmount = PaystackService.toZar(data.amount)
    const fees = PaystackService.toZar(data.fees || 0)
    const netAmount = grossAmount - fees

    const result = await processSuccessfulPayment({
      gigId,
      employerId: userId,
      amount: netAmount,
      grossAmount,
      fees,
      transactionId: data.id.toString(),
      paymentId: reference,
      provider: 'paystack',
      verifiedVia: 'verify',
      itemName: `Funded gig: ${gigData?.title || gigId}`
    })

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.error || 'Payment processing failed',
        status: gigData?.status
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and gig funded',
      status: 'funded',
      paidAmount: result.paidAmount,
      applicationId: result.applicationId,
      workerId: result.workerId
    })
  } catch (error) {
    console.error('Paystack verification error:', error)
    return NextResponse.json(
      {
        error: 'Verification failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/payments/paystack/verify/:reference
 *
 * Quick verification check (for polling)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')
    const gigId = searchParams.get('gigId')

    if (!reference) {
      return NextResponse.json(
        { error: 'Missing reference parameter' },
        { status: 400 }
      )
    }

    // Verify with Paystack
    const paystackService = new PaystackService()
    const verification = await paystackService.verifyTransaction(reference)

    if (!verification.status) {
      return NextResponse.json({
        verified: false,
        message: 'Could not verify payment'
      })
    }

    const isSuccess = PaystackService.isPaymentSuccessful(verification.data.status)

    // If gigId provided, also check gig status
    let gigStatus = null
    if (gigId) {
      try {
        const app = getFirebaseAdmin()
        const gigDoc = await app.firestore().collection('gigs').doc(gigId).get()
        gigStatus = gigDoc.data()?.status
      } catch {
        // Ignore db errors for status check
      }
    }

    return NextResponse.json({
      verified: true,
      success: isSuccess,
      status: verification.data.status,
      gatewayResponse: verification.data.gateway_response,
      amount: PaystackService.toZar(verification.data.amount),
      gigStatus
    })
  } catch (error) {
    console.error('Paystack verification check error:', error)
    return NextResponse.json(
      {
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
