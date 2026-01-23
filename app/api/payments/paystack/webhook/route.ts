import { NextRequest, NextResponse } from 'next/server'
import { PaystackService } from '@/lib/services/paystackService'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'
import { processSuccessfulPayment } from '@/lib/services/paymentProcessingService'

/**
 * POST /api/payments/paystack/webhook
 *
 * Paystack webhook handler for payment notifications
 *
 * Events handled:
 * - charge.success: Payment completed successfully
 * - charge.failed: Payment failed
 *
 * @see https://paystack.com/docs/payments/webhooks/
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const payload = await request.text()
    const signature = request.headers.get('x-paystack-signature') || ''

    console.log('[Paystack Webhook] Received webhook')

    // Initialize service and validate signature
    const paystackService = new PaystackService()
    const { isValid, event, error } = paystackService.parseWebhookEvent(payload, signature)

    if (!isValid || !event) {
      console.error('[Paystack Webhook] Validation failed:', error)
      return NextResponse.json(
        { received: true, processed: false, error },
        { status: 200 } // Return 200 to prevent retries
      )
    }

    console.log('[Paystack Webhook] Event:', {
      type: event.event,
      reference: event.data.reference,
      status: event.data.status,
      amount: event.data.amount
    })

    // Process the event asynchronously
    processWebhookAsync(event).catch(err => {
      console.error('[Paystack Webhook] Processing error:', err)
    })

    // Return immediate acknowledgment
    return NextResponse.json(
      { received: true, processed: true },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Paystack Webhook] Error:', error)
    // Always return 200 to prevent Paystack retries
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
 * Process webhook event asynchronously
 */
async function processWebhookAsync(event: {
  event: string
  data: {
    id: number
    status: string
    reference: string
    amount: number
    fees: number
    currency: string
    metadata: {
      gigId?: string
      employerId?: string
      workerId?: string
      itemName?: string
      [key: string]: unknown
    }
    customer: {
      email: string
    }
  }
}) {
  const app = getFirebaseAdmin()
  const db = app.firestore()

  try {
    const { data } = event

    // Handle different event types
    switch (event.event) {
      case 'charge.success': {
        if (!PaystackService.isPaymentSuccessful(data.status)) {
          console.log(`[Paystack Webhook] Payment ${data.reference} not successful. Status: ${data.status}`)
          return
        }

        const gigId = data.metadata?.gigId
        const employerId = data.metadata?.employerId

        if (!gigId || !employerId) {
          console.error('[Paystack Webhook] Missing gigId or employerId in metadata')
          return
        }

        // Convert amounts from kobo to ZAR
        const grossAmount = PaystackService.toZar(data.amount)
        const fees = PaystackService.toZar(data.fees || 0)
        const netAmount = grossAmount - fees

        console.log('[Paystack Webhook] Processing successful payment:', {
          reference: data.reference,
          gigId,
          employerId,
          grossAmount,
          fees,
          netAmount
        })

        // Use shared payment processing service
        const result = await processSuccessfulPayment({
          gigId,
          employerId,
          amount: netAmount,
          grossAmount,
          fees,
          transactionId: data.id.toString(),
          paymentId: data.reference,
          provider: 'paystack',
          verifiedVia: 'webhook',
          itemName: data.metadata?.itemName as string
        })

        if (!result.success) {
          console.error(`[Paystack Webhook] Payment processing failed: ${result.error}`)
          throw new Error(result.error)
        }

        console.log(`[Paystack Webhook] Payment ${data.reference} processed successfully`)
        break
      }

      case 'charge.failed': {
        const _gigId = data.metadata?.gigId
        const reference = data.reference

        console.log(`[Paystack Webhook] Payment failed: ${reference}, gigId: ${_gigId}`)

        // Update payment intent with failed status
        if (reference) {
          const intentQuery = await db.collection('paymentIntents')
            .where('paymentId', '==', reference)
            .limit(1)
            .get()

          if (!intentQuery.empty) {
            await intentQuery.docs[0].ref.update({
              status: 'failed',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              failureReason: `Payment failed: ${data.status}`
            })
          }
        }
        break
      }

      default:
        console.log(`[Paystack Webhook] Unhandled event type: ${event.event}`)
    }
  } catch (error) {
    console.error('[Paystack Webhook] Processing error:', error)
    throw error
  }
}

/**
 * GET /api/payments/paystack/webhook
 *
 * Not allowed - webhooks must be POST
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Webhook endpoint only accepts POST requests.' },
    { status: 405 }
  )
}
