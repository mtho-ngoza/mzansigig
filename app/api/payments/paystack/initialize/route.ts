import { NextRequest, NextResponse } from 'next/server'
import { PaystackService } from '@/lib/services/paystackService'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'

/**
 * POST /api/payments/paystack/initialize
 *
 * Initialize a Paystack payment for gig funding
 *
 * @body {
 *   gigId: string
 *   amount: number
 *   itemName: string
 *   itemDescription?: string
 *   customerEmail: string
 *   customerName?: string
 * }
 *
 * @returns { authorizationUrl: string, reference: string, accessCode: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gigId, amount, itemName, itemDescription, customerEmail, customerName } = body

    // Validate required fields
    if (!gigId || !amount || !itemName || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: gigId, amount, itemName, customerEmail' },
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address.' },
        { status: 400 }
      )
    }

    // Get authenticated user from session/token
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      )
    }

    // Initialize Paystack service
    const paystackService = new PaystackService()

    // Get app URL from environment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
      || 'http://localhost:3000'

    // Generate unique reference
    const reference = PaystackService.generateReference()

    // Initialize transaction with Paystack
    const response = await paystackService.initializeTransaction({
      email: customerEmail,
      amount: amount,
      reference: reference,
      callbackUrl: `${appUrl}/dashboard/manage-applications?payment=success&gig=${gigId}&reference=${reference}`,
      currency: 'ZAR',
      channels: ['card', 'bank_transfer', 'eft'],
      metadata: {
        gigId,
        employerId: userId,
        itemName,
        itemDescription,
        customerName,
        custom_fields: [
          {
            display_name: 'Gig',
            variable_name: 'gig_id',
            value: gigId
          },
          {
            display_name: 'Item',
            variable_name: 'item_name',
            value: itemName
          }
        ]
      }
    })

    if (!response.status) {
      return NextResponse.json(
        { error: 'Failed to initialize payment', message: response.message },
        { status: 500 }
      )
    }

    // Log payment creation
    console.log('Paystack payment initialized:', {
      gigId,
      amount,
      reference: response.data.reference,
      mode: paystackService.isTestMode() ? 'test' : 'live'
    })

    // Store payment intent in database for tracking
    try {
      const app = getFirebaseAdmin()
      await app.firestore().collection('paymentIntents').add({
        gigId,
        userId,
        amount,
        provider: 'paystack',
        status: 'created',
        paymentId: reference,
        accessCode: response.data.access_code,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      })
    } catch (dbError) {
      console.warn('Could not store payment intent (this is OK in development):', dbError)
    }

    // Return authorization URL for redirect
    return NextResponse.json({
      success: true,
      authorizationUrl: response.data.authorization_url,
      reference: response.data.reference,
      accessCode: response.data.access_code
    })
  } catch (error) {
    console.error('Paystack payment initialization error:', error)
    return NextResponse.json(
      {
        error: 'Failed to initialize payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
