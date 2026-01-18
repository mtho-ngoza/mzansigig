import { NextRequest, NextResponse } from 'next/server'
import { PayFastService } from '@/lib/services/payfastService'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'
import { processSuccessfulPayment } from '@/lib/services/paymentProcessingService'

/**
 * POST /api/payments/payfast/itn
 *
 * PayFast ITN (Instant Transaction Notification) webhook handler
 *
 * This endpoint receives payment notifications from PayFast when:
 * - Payment is completed
 * - Payment fails
 * - Payment is cancelled
 *
 * CRITICAL: Must respond with HTTP 200 immediately to acknowledge receipt
 *
 * @see https://developers.payfast.co.za/documentation/#itn-step-by-step-guide
 */
export async function POST(request: NextRequest) {
  try {
    // STEP 1: Immediately acknowledge receipt with HTTP 200
    // PayFast expects this within 10 seconds
    const formData = await request.formData()

    // Convert FormData to object
    const itnData: Record<string, string> = {}
    formData.forEach((value, key) => {
      itnData[key] = value.toString()
    })

    console.log('[PayFast ITN] Received:', {
      m_payment_id: itnData.m_payment_id,
      payment_status: itnData.payment_status,
      amount_gross: itnData.amount_gross
    })

    // STEP 2: Validate ITN signature and source
    const payfastService = new PayFastService()
    const sourceIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      'unknown'

    // Type assertion needed: FormData values are all strings, but PayFastService accepts the ITN data object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validation = await payfastService.validateITN(itnData as any, sourceIp)

    if (!validation.isValid) {
      console.error('[PayFast ITN] Validation failed:', validation.error)
      // Still return 200 to PayFast, but don't process the payment
      return NextResponse.json(
        { received: true, processed: false, error: validation.error },
        { status: 200 }
      )
    }

    // STEP 3: Process the payment asynchronously
    // We respond 200 immediately, then process in the background
    processPaymentAsync(itnData).catch(error => {
      console.error('[PayFast ITN] Processing error:', error)
    })

    // Return immediate acknowledgment
    return NextResponse.json(
      { received: true, processed: true },
      { status: 200 }
    )
  } catch (error) {
    console.error('[PayFast ITN] Error:', error)
    // Always return 200 even on error to prevent PayFast retries
    return NextResponse.json(
      {
        received: true,
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 200 }
    )
  }
}

/**
 * Process payment notification asynchronously
 */
async function processPaymentAsync(itnData: Record<string, string>) {
  const app = getFirebaseAdmin()
  const db = app.firestore()

  try {
    const {
      m_payment_id,
      pf_payment_id,
      payment_status,
      amount_gross,
      amount_fee,
      amount_net,
      custom_str1: gigId,
      custom_str2: userId,
      item_name,
      merchant_id
    } = itnData

    // Validate payment status
    if (!PayFastService.isPaymentComplete(payment_status)) {
      console.log(`[PayFast ITN] Payment ${m_payment_id} not complete. Status: ${payment_status}`)

      // Update payment intent with failed status
      const failedPaymentQuery = await db.collection('paymentIntents')
        .where('paymentId', '==', m_payment_id)
        .limit(1)
        .get()

      if (!failedPaymentQuery.empty) {
        await failedPaymentQuery.docs[0].ref.update({
          status: payment_status.toLowerCase(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          failureReason: `Payment ${payment_status}`
        })
      }

      return
    }

    // Parse amounts
    const grossAmount = PayFastService.parseAmount(amount_gross)
    const feeAmount = PayFastService.parseAmount(amount_fee)
    const netAmount = PayFastService.parseAmount(amount_net)

    console.log('[PayFast ITN] Processing completed payment:', {
      m_payment_id,
      pf_payment_id,
      gigId,
      userId,
      grossAmount,
      netAmount
    })

    // Use shared payment processing service
    const result = await processSuccessfulPayment({
      gigId,
      employerId: userId,
      amount: netAmount,
      grossAmount,
      fees: feeAmount,
      transactionId: pf_payment_id,
      paymentId: m_payment_id,
      verifiedVia: 'itn',
      itemName: item_name,
      merchantId: merchant_id
    })

    if (!result.success) {
      console.error(`[PayFast ITN] Payment processing failed: ${result.error}`)
      throw new Error(result.error)
    }

    console.log(`[PayFast ITN] ✅ Payment ${m_payment_id} processed successfully`)

    // TODO: Send notification to employer that gig is funded
    // TODO: Send notification to worker (if assigned) that gig is ready to start

  } catch (error) {
    console.error('[PayFast ITN] Payment processing error:', error)
    throw error
  }
}

/**
 * GET /api/payments/payfast/itn
 *
 * Not allowed - ITN must be POST
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. ITN endpoint only accepts POST requests.' },
    { status: 405 }
  )
}
