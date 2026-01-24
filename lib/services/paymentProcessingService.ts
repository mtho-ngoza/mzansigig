/**
 * Payment Processing Service
 *
 * Shared service for processing successful payments.
 * Used by both ITN (production) and verify (sandbox) routes.
 */

import { getFirebaseAdmin } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'

export interface ProcessPaymentParams {
  gigId: string
  employerId: string
  // Payment amounts
  amount: number           // Net amount (after fees)
  grossAmount?: number     // Gross amount (before fees)
  fees?: number            // Payment gateway fees
  // Transaction identifiers
  transactionId?: string   // Provider transaction ID
  paymentId?: string       // Our payment reference
  // Provider info
  provider?: 'paystack' | 'payfast' | 'ozow' | 'yoco'
  // Metadata
  verifiedVia: 'webhook' | 'itn' | 'sandbox-fallback' | 'verify'
  itemName?: string
  merchantId?: string
}

export interface ProcessPaymentResult {
  success: boolean
  gigId: string
  applicationId?: string
  workerId?: string
  paidAmount: number
  escrowId: string
  paymentRecordId?: string
  walletTransactionId?: string
  error?: string
}

/**
 * Process a successful payment
 *
 * This function handles all database updates when a payment is confirmed:
 * 1. Find and validate the accepted application
 * 2. Update gig status to 'funded'
 * 3. Update application status to 'funded'
 * 4. Create escrow record
 * 5. Update worker's pending balance (money held in escrow)
 * 6. Create wallet transaction record for employer
 * 7. Create payment record
 * 8. Create payment history for employer (in escrow)
 * 9. Create payment history for worker (pending earnings)
 * 10. Update payment intent (if exists)
 */
export async function processSuccessfulPayment(
  params: ProcessPaymentParams
): Promise<ProcessPaymentResult> {
  const {
    gigId,
    employerId,
    amount,
    grossAmount = amount,
    fees = 0,
    transactionId,
    paymentId,
    provider = 'paystack',
    verifiedVia,
    itemName,
    merchantId
  } = params

  const app = getFirebaseAdmin()
  const db = app.firestore()

  console.log(`[PaymentProcessing] Starting payment processing for gig ${gigId}`)
  console.log(`[PaymentProcessing] Amount: R${amount}, Via: ${verifiedVia}`)

  // 1. Find the accepted application
  const applicationsQuery = await db.collection('applications')
    .where('gigId', '==', gigId)
    .where('status', '==', 'accepted')
    .limit(1)
    .get()

  if (applicationsQuery.empty) {
    // Query all applications for debugging
    const allAppsQuery = await db.collection('applications')
      .where('gigId', '==', gigId)
      .get()

    const appStatuses = allAppsQuery.docs.map(doc => ({
      id: doc.id,
      status: doc.data().status,
      applicantId: doc.data().applicantId
    }))

    console.error(`[PaymentProcessing] No accepted application found for gig ${gigId}`)
    console.error(`[PaymentProcessing] All applications:`, JSON.stringify(appStatuses))

    return {
      success: false,
      gigId,
      paidAmount: amount,
      escrowId: gigId,
      error: `No accepted application found for gig ${gigId}. Found ${allAppsQuery.size} applications with statuses: ${appStatuses.map(a => a.status).join(', ')}`
    }
  }

  const applicationDoc = applicationsQuery.docs[0]
  const applicationData = applicationDoc.data()
  const workerId = applicationData.applicantId
  // Use agreed rate (from negotiation) if available, otherwise fall back to proposed rate
  const paidAmount = applicationData.agreedRate || applicationData.proposedRate || amount

  console.log(`[PaymentProcessing] Found application ${applicationDoc.id} for worker ${workerId}`)
  console.log(`[PaymentProcessing] Paid amount: R${paidAmount}`)

  // 2. Get gig details
  const gigRef = db.collection('gigs').doc(gigId)
  const gigDoc = await gigRef.get()

  if (!gigDoc.exists) {
    console.error(`[PaymentProcessing] Gig ${gigId} not found`)
    return {
      success: false,
      gigId,
      paidAmount,
      escrowId: gigId,
      error: `Gig ${gigId} not found`
    }
  }

  const gigData = gigDoc.data()

  // Use transaction for atomic operations
  let walletTransactionId: string | undefined
  let paymentRecordId: string | undefined

  await db.runTransaction(async (transaction) => {
    // 3. Update gig status to funded
    transaction.update(gigRef, {
      status: 'funded',
      paymentStatus: 'completed',
      paidAmount: paidAmount,
      fundedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentVerifiedVia: verifiedVia,
      ...(transactionId && { paymentTransactionId: transactionId })
    })
    console.log(`[PaymentProcessing] Updated gig ${gigId} to funded`)

    // 4. Update application status to funded
    transaction.update(applicationDoc.ref, {
      status: 'funded',
      paymentStatus: 'in_escrow',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    console.log(`[PaymentProcessing] Updated application ${applicationDoc.id} to funded`)

    // 5. Create escrow record
    const escrowRef = db.collection('escrowAccounts').doc(gigId)
    transaction.set(escrowRef, {
      id: gigId,
      gigId,
      employerId,
      workerId,
      totalAmount: paidAmount,
      releasedAmount: 0,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedVia,
      ...(transactionId && { paymentTransactionId: transactionId })
    })
    console.log(`[PaymentProcessing] Created escrow record for gig ${gigId}`)

    // 6. Update worker's pending balance (money held in escrow for them)
    const workerRef = db.collection('users').doc(workerId)
    transaction.update(workerRef, {
      pendingBalance: admin.firestore.FieldValue.increment(paidAmount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    console.log(`[PaymentProcessing] Updated worker ${workerId} pending balance +${paidAmount}`)

    // 7. Create wallet transaction record for employer
    const walletTxRef = db.collection('walletTransactions').doc()
    walletTransactionId = walletTxRef.id
    transaction.set(walletTxRef, {
      id: walletTxRef.id,
      userId: employerId,
      type: 'deposit',
      amount: paidAmount,
      grossAmount: grossAmount,
      fees: fees,
      status: 'completed',
      source: provider,
      sourceTransactionId: transactionId || null,
      gigId,
      description: itemName || `Funded gig: ${gigData?.title || gigId}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    console.log(`[PaymentProcessing] Created wallet transaction ${walletTxRef.id}`)

    // 8. Create payment record
    const paymentRef = db.collection('payments').doc()
    paymentRecordId = paymentRef.id
    transaction.set(paymentRef, {
      id: paymentRef.id,
      gigId,
      employerId,
      workerId,
      amount: paidAmount,
      grossAmount: grossAmount,
      fees: fees,
      currency: 'ZAR',
      type: gigData?.paymentType || 'fixed',
      status: 'completed',
      provider: provider,
      providerTransactionId: transactionId || null,
      escrowStatus: 'funded',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      description: itemName || `Payment for gig: ${gigData?.title || gigId}`,
      verifiedVia,
      metadata: {
        paymentId: paymentId || null,
        merchantId: merchantId || null,
        verifiedVia
      }
    })
    console.log(`[PaymentProcessing] Created payment record ${paymentRef.id}`)

    // 9. Create payment history for employer (shows payment in escrow)
    const employerHistoryRef = db.collection('paymentHistory').doc()
    transaction.set(employerHistoryRef, {
      id: employerHistoryRef.id,
      userId: employerId,
      paymentId: paymentRecordId,
      gigId,
      type: 'payments',
      amount: paidAmount,
      currency: 'ZAR',
      status: 'pending', // pending = in escrow, will be 'completed' when released
      description: `Payment to escrow for: ${gigData?.title || gigId}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
    console.log(`[PaymentProcessing] Created employer payment history`)

    // 10. Create payment history for worker (shows incoming payment in escrow)
    const workerHistoryRef = db.collection('paymentHistory').doc()
    transaction.set(workerHistoryRef, {
      id: workerHistoryRef.id,
      userId: workerId,
      paymentId: paymentRecordId,
      gigId,
      type: 'earnings',
      amount: paidAmount,
      currency: 'ZAR',
      status: 'pending', // pending = in escrow, will be 'completed' when released
      description: `Payment in escrow for: ${gigData?.title || gigId}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
    console.log(`[PaymentProcessing] Created worker payment history`)

    // 11. Update payment intent (if exists)
    if (paymentId) {
      const intentQuery = await db.collection('paymentIntents')
        .where('paymentId', '==', paymentId)
        .limit(1)
        .get()

      if (!intentQuery.empty) {
        transaction.update(intentQuery.docs[0].ref, {
          status: 'succeeded',
          providerTransactionId: transactionId || null,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        console.log(`[PaymentProcessing] Updated payment intent`)
      }
    }
  })

  console.log(`[PaymentProcessing] ✅ Payment processing complete for gig ${gigId}`)

  return {
    success: true,
    gigId,
    applicationId: applicationDoc.id,
    workerId,
    paidAmount,
    escrowId: gigId,
    paymentRecordId,
    walletTransactionId
  }
}
