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

    // Map bank names to TradeSafe bank codes
    const BANK_CODES: Record<string, string> = {
      'ABSA': 'absa', 'FNB': 'fnb', 'Nedbank': 'nedbank',
      'Standard Bank': 'standard_bank', 'Capitec': 'capitec',
      'African Bank': 'african_bank', 'TymeBank': 'tymebank',
      'Discovery Bank': 'discovery', 'Investec': 'investec'
    }

    // Get or create worker's TradeSafe token
    let sellerToken = workerToken || workerData.tradeSafeToken

    // Check if worker has bank details
    const hasBankDetails = workerData.bankDetails?.bankName && workerData.bankDetails?.accountNumber
    const bankCode = hasBankDetails ? BANK_CODES[workerData.bankDetails.bankName] : null

    if (!sellerToken) {
      // Create new token for worker - include bank details if available
      const tokenInput: {
        givenName: string
        familyName: string
        email: string
        mobile: string
        bankAccount?: { accountNumber: string; accountType: 'CHEQUE' | 'SAVINGS'; bank: string }
      } = {
        givenName: workerData.displayName?.split(' ')[0] || workerData.firstName || 'Worker',
        familyName: workerData.displayName?.split(' ').slice(1).join(' ') || workerData.lastName || '',
        email: workerData.email,
        mobile: workerData.phone || '+27000000000'
      }

      // Include bank details for direct payout if worker has them
      if (hasBankDetails && bankCode) {
        tokenInput.bankAccount = {
          accountNumber: workerData.bankDetails.accountNumber,
          accountType: workerData.bankDetails.accountType || 'SAVINGS',
          bank: bankCode
        }
      }

      const token = await tradeSafe.createToken(tokenInput)
      sellerToken = token.id

      // Store token in user profile (mark if bank details were included)
      await db.collection('users').doc(workerId).update({
        tradeSafeToken: sellerToken,
        tradeSafeTokenHasBankDetails: hasBankDetails && bankCode ? true : false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    } else if (hasBankDetails && bankCode && !workerData.tradeSafeTokenHasBankDetails) {
      // Token exists but was created without bank details - update it now
      console.log('[PAYMENT_AUDIT] Updating existing TradeSafe token with bank details:', {
        workerId,
        tokenId: sellerToken,
        bankName: workerData.bankDetails.bankName
      })

      try {
        await tradeSafe.updateTokenBankAccount(sellerToken, {
          accountNumber: workerData.bankDetails.accountNumber,
          accountType: workerData.bankDetails.accountType || 'SAVINGS',
          bank: bankCode
        })

        // Mark token as having bank details
        await db.collection('users').doc(workerId).update({
          tradeSafeTokenHasBankDetails: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })

        console.log('[PAYMENT_AUDIT] TradeSafe token updated with bank details successfully')
      } catch (updateError) {
        console.error('Failed to update TradeSafe token with bank details:', updateError)
        // Continue anyway - the token exists, just without bank details
        // Worker will receive payout to TradeSafe wallet instead
      }
    }

    // Get platform token for agent fees
    const platformToken = await tradeSafe.getApiProfile()

    // Get platform commission from feeConfigs (single source of truth)
    // This becomes the TradeSafe agent fee - platform's revenue
    const feeConfigQuery = await db.collection('feeConfigs')
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()

    // Default to 10% if no config found
    // Support both new field (platformCommissionPercent) and legacy (workerCommissionPercentage)
    const configData = feeConfigQuery.empty ? null : feeConfigQuery.docs[0].data()
    const platformFee = configData?.platformCommissionPercent ?? configData?.workerCommissionPercentage ?? 10

    // Calculate expected amounts for audit
    const expectedCommission = Math.round(amount * (platformFee / 100) * 100) / 100
    const expectedWorkerEarnings = amount - expectedCommission

    console.log('[PAYMENT_AUDIT] Initialize - Fee config:', {
      source: feeConfigQuery.empty ? 'default' : feeConfigQuery.docs[0].id,
      platformCommissionPercent: platformFee,
      gigId,
      amount,
      expectedCommission,
      expectedWorkerEarnings
    })

    // Create TradeSafe transaction
    console.log('=== TRADESAFE INITIALIZE: Step 1 - Creating transaction ===')
    console.log('Input to createTransaction:', {
      title,
      description: description || `Payment for gig: ${title}`,
      value: amount,
      buyerToken,
      sellerToken,
      agentToken: platformToken,
      agentFeePercent: platformFee,
      daysToDeliver: 7,
      daysToInspect: 7,
      reference: gigId,
      gigId_we_are_sending: gigId
    })

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

    console.log('=== TRADESAFE INITIALIZE: Step 2 - Transaction created ===')
    console.log('Full transaction response:', JSON.stringify(transaction, null, 2))
    console.log('Key IDs:', {
      transactionId: transaction.id,
      our_gigId: gigId,
      allocationId: transaction.allocations?.[0]?.id
    })
    console.log('NOTE: TradeSafe does NOT return reference in response. We use transactionId to lookup paymentIntent which has gigId.')

    // Generate checkout link
    const checkoutUrl = await tradeSafe.getCheckoutLink({
      transactionId: transaction.id
    })

    console.log('=== TRADESAFE INITIALIZE: Step 3 - Checkout link generated ===')
    console.log('Checkout URL:', checkoutUrl)

    // Store payment intent in database for tracking
    // Note: TradeSafe does NOT return our reference in the response, so we store our gigId
    const paymentIntentData: Record<string, unknown> = {
      gigId,
      employerId,
      workerId,
      amount,
      provider: 'tradesafe',
      status: 'created',
      transactionId: transaction.id,
      allocationId: transaction.allocations[0]?.id || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    }

    const paymentIntentRef = await db.collection('paymentIntents').add(paymentIntentData)

    console.log('[PAYMENT_AUDIT] Initialize - Payment intent created:', {
      paymentIntentId: paymentIntentRef.id,
      gigId,
      transactionId: transaction.id,
      allocationId: transaction.allocations[0]?.id,
      employerId,
      workerId,
      escrowAmount: amount,
      platformCommissionPercent: platformFee,
      expectedCommission: Math.round(amount * (platformFee / 100) * 100) / 100,
      expectedWorkerEarnings: amount - Math.round(amount * (platformFee / 100) * 100) / 100
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
