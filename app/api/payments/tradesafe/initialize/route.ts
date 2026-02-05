import { NextRequest, NextResponse } from 'next/server'
import { TradeSafeService } from '@/lib/services/tradesafeService'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import { verifyAuthToken } from '@/lib/auth/verifyToken'
import * as admin from 'firebase-admin'

/**
 * POST /api/payments/tradesafe/initialize
 *
 * Initialize a TradeSafe escrow transaction for gig funding
 *
 * @body {
 *   gigId: string
 *   amount: number (in ZAR)
 *   title: string
 *   description?: string
 *   workerId: string
 *   workerToken?: string (TradeSafe token - will be created if not provided)
 * }
 *
 * @returns { checkoutUrl: string, transactionId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gigId, amount, title, description, workerId, workerToken } = body

    // Validate required fields
    if (!gigId || !amount || !title || !workerId) {
      return NextResponse.json(
        { error: 'Missing required fields: gigId, amount, title, workerId' },
        { status: 400 }
      )
    }

    // Validate amount
    if (typeof amount !== 'number' || amount < 100) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be at least R100.' },
        { status: 400 }
      )
    }

    // Verify Firebase ID token (secure authentication)
    const auth = await verifyAuthToken(request)
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized. Please sign in.' },
        { status: 401 }
      )
    }
    const employerId = auth.userId

    // Initialize TradeSafe service
    const tradeSafe = new TradeSafeService()

    // Get Firebase admin
    const app = getFirebaseAdmin()
    const db = app.firestore()

    // Get employer profile for TradeSafe token
    const employerDoc = await db.collection('users').doc(employerId).get()
    const employerData = employerDoc.data()

    if (!employerData) {
      return NextResponse.json(
        { error: 'Employer profile not found' },
        { status: 404 }
      )
    }

    // Get or create employer's TradeSafe token
    let buyerToken = employerData.tradeSafeToken
    if (!buyerToken) {
      // Create new token for employer
      const token = await tradeSafe.createToken({
        givenName: employerData.displayName?.split(' ')[0] || 'Employer',
        familyName: employerData.displayName?.split(' ').slice(1).join(' ') || '',
        email: employerData.email,
        mobile: employerData.phone || '+27000000000'
      })
      buyerToken = token.id

      // Store token in user profile
      await db.collection('users').doc(employerId).update({
        tradeSafeToken: buyerToken,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }

    // Get worker profile for TradeSafe token
    const workerDoc = await db.collection('users').doc(workerId).get()
    const workerData = workerDoc.data()

    if (!workerData) {
      return NextResponse.json(
        { error: 'Worker profile not found' },
        { status: 404 }
      )
    }

    // Get or create worker's TradeSafe token
    let sellerToken = workerToken || workerData.tradeSafeToken
    if (!sellerToken) {
      // Create new token for worker
      const token = await tradeSafe.createToken({
        givenName: workerData.displayName?.split(' ')[0] || 'Worker',
        familyName: workerData.displayName?.split(' ').slice(1).join(' ') || '',
        email: workerData.email,
        mobile: workerData.phone || '+27000000000'
      })
      sellerToken = token.id

      // Store token in user profile
      await db.collection('users').doc(workerId).update({
        tradeSafeToken: sellerToken,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }

    // Get platform token for agent fees
    const platformToken = await tradeSafe.getApiProfile()

    // Get platform fee from config (default 10%)
    const configDoc = await db.collection('config').doc('platform').get()
    const platformFee = configDoc.exists ? (configDoc.data()?.platformFeePercent || 10) : 10

    // Create TradeSafe transaction
    const transaction = await tradeSafe.createTransaction({
      title: title,
      description: description || `Payment for gig: ${title}`,
      value: amount,
      buyerToken: buyerToken,
      sellerToken: sellerToken,
      agentToken: platformToken,
      agentFeePercent: platformFee,
      daysToDeliver: 7,
      daysToInspect: 7,
      reference: gigId
    })

    // Generate checkout link
    const checkoutUrl = await tradeSafe.getCheckoutLink({
      transactionId: transaction.id,
      paymentMethods: ['EFT', 'INSTANT_EFT', 'CARD']
    })

    // Store payment intent in database for tracking
    await db.collection('paymentIntents').add({
      gigId,
      employerId,
      workerId,
      amount,
      provider: 'tradesafe',
      status: 'created',
      transactionId: transaction.id,
      allocationId: transaction.allocations[0]?.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // Checkout link valid for 15 minutes
    })

    // Log payment creation
    console.log('TradeSafe payment initialized:', {
      gigId,
      amount,
      transactionId: transaction.id,
      mode: tradeSafe.isSandbox() ? 'sandbox' : 'production'
    })

    // Return checkout URL for redirect
    return NextResponse.json({
      success: true,
      checkoutUrl,
      transactionId: transaction.id,
      allocationId: transaction.allocations[0]?.id
    })
  } catch (error) {
    console.error('TradeSafe payment initialization error:', error)
    return NextResponse.json(
      {
        error: 'Failed to initialize payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
