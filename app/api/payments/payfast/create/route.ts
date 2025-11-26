import { NextRequest, NextResponse } from 'next/server'
import { PayFastService } from '@/lib/services/payfastService'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'

/**
 * POST /api/payments/payfast/create
 *
 * Creates a PayFast payment for gig funding
 *
 * @body {
 *   gigId: string
 *   amount: number
 *   itemName: string
 *   itemDescription?: string
 *   customerEmail?: string
 *   customerName?: string
 * }
 *
 * @returns Payment form HTML to redirect user to PayFast
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gigId, amount, itemName, itemDescription, customerEmail, customerName } = body

    // Validate required fields
    if (!gigId || !amount || !itemName) {
      return NextResponse.json(
        { error: 'Missing required fields: gigId, amount, itemName' },
        { status: 400 }
      )
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number.' },
        { status: 400 }
      )
    }

    // Get authenticated user from session/token
    // TODO: Implement proper authentication
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      )
    }

    // Initialize PayFast service
    const payfastService = new PayFastService()

    // Get app URL from environment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create payment data
    const paymentData = payfastService.createPayment({
      amount,
      item_name: itemName,
      item_description: itemDescription,
      m_payment_id: `${gigId}-${Date.now()}`, // Unique payment ID
      email_address: customerEmail,
      name_first: customerName?.split(' ')[0],
      name_last: customerName?.split(' ').slice(1).join(' '),
      return_url: `${appUrl}/dashboard?payment=success&gig=${gigId}`,
      cancel_url: `${appUrl}/dashboard?payment=cancelled&gig=${gigId}`,
      notify_url: `${appUrl}/api/payments/payfast/itn`,
      // Store gig and user info in custom fields for ITN processing
      custom_str1: gigId,
      custom_str2: userId
    })

    // Log payment creation for tracking
    console.log('PayFast payment created:', {
      gigId,
      amount: paymentData.amount,
      paymentId: paymentData.m_payment_id,
      mode: process.env.PAYFAST_MODE || 'sandbox'
    })

    // Generate payment form HTML
    const paymentForm = payfastService.generatePaymentForm(paymentData, true)

    // Store payment intent in database for tracking (optional in development)
    try {
      const app = getFirebaseAdmin()
      await app.firestore().collection('payment_intents').add({
        gigId,
        userId,
        amount,
        provider: 'payfast',
        status: 'created',
        paymentId: paymentData.m_payment_id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      })
    } catch (dbError) {
      // In development without Firebase Admin credentials, skip database write
      // The payment will still work via PayFast, just won't be tracked in payment_intents
      console.warn('Could not store payment intent (this is OK in development):', dbError)
    }

    // Return payment form HTML
    return new NextResponse(paymentForm, {
      status: 200,
      headers: {
        'Content-Type': 'text/html'
      }
    })
  } catch (error) {
    console.error('PayFast payment creation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
