import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'

/**
 * POST /tradesafe/callback
 *
 * Handles two types of POST requests from TradeSafe:
 * 1. User redirect callbacks - after payment, user is redirected here with action param
 * 2. Webhook notifications - server-to-server updates with type and state params
 *
 * For user redirects: Use 303 redirect to payment success/error page
 * For webhooks: Process the webhook and update database, return 200 OK
 */
export async function POST(request: NextRequest) {
  try {
    // TradeSafe may send data as form-encoded or JSON
    const contentType = request.headers.get('content-type') || ''

    let params: URLSearchParams
    let rawBody: string | null = null

    if (contentType.includes('application/json')) {
      rawBody = await request.text()
      try {
        const body = JSON.parse(rawBody) as Record<string, unknown>
        // Flatten object to URL params
        params = new URLSearchParams()
        for (const [key, value] of Object.entries(body)) {
          if (value !== null && value !== undefined) {
            params.set(key, String(value))
          }
        }
      } catch {
        params = new URLSearchParams(request.nextUrl.search)
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      rawBody = await request.text()
      params = new URLSearchParams(rawBody)
    } else {
      // Try to get from URL search params
      params = new URLSearchParams(request.nextUrl.search)
    }

    // Log the callback for debugging
    console.log('=== TRADESAFE CALLBACK: Received ===')
    console.log('Full raw body:', rawBody)
    console.log('Content-Type:', contentType)
    console.log('All params:', Object.fromEntries(params.entries()))
    console.log('URL:', request.url)

    // Detect webhook notification vs user redirect
    // Webhooks have: type (e.g. "Transaction"), state, signature
    // User redirects have: action (e.g. "success", "failure")
    const isWebhook = params.has('type') && params.has('state') && params.has('signature')

    console.log('=== TRADESAFE CALLBACK: Detection ===')
    console.log('Is webhook?', isWebhook)
    console.log('Has type?', params.has('type'), '=', params.get('type'))
    console.log('Has state?', params.has('state'), '=', params.get('state'))
    console.log('Has signature?', params.has('signature'))
    console.log('Has action?', params.has('action'), '=', params.get('action'))

    if (isWebhook) {
      // This is a webhook notification (server-to-server)
      const state = params.get('state') || ''
      const transactionId = params.get('id') || ''
      const referenceFromWebhook = params.get('reference') || ''
      const balance = parseFloat(params.get('balance') || '0')

      console.log('=== TRADESAFE CALLBACK: Webhook Data ===')
      console.log('state:', state)
      console.log('transactionId (id field):', transactionId)
      console.log('reference from webhook:', referenceFromWebhook)
      console.log('balance:', balance)
      console.log('NOTE: reference should be our gigId if we set it correctly during initialize')

      // Process payment success states
      // First, try to find gigId from paymentIntent using transactionId
      const gigId = await lookupGigIdFromTransaction(transactionId, referenceFromWebhook)

      console.log('=== TRADESAFE CALLBACK: GigId Lookup Result ===')
      console.log('Looked up gigId:', gigId)
      console.log('Will use this gigId for database updates')

      if (['FUNDS_DEPOSITED', 'FUNDS_RECEIVED', 'INITIATED'].includes(state)) {
        await handlePaymentSuccess(gigId, transactionId, balance)
      } else if (state === 'COMPLETED') {
        await handleTransactionCompleted(gigId, transactionId)
      } else if (state === 'CANCELLED') {
        await handleTransactionCancelled(gigId, transactionId)
      }

      return NextResponse.json({
        received: true,
        state,
        gigId,
        transactionId,
        processed: true
      })
    }

    // User redirect callback (POST) - redirect to appropriate page
    console.log('=== TRADESAFE USER REDIRECT (POST): Processing ===')
    console.log('This is a user redirect, not a webhook')

    const action = params.get('action') || params.get('status') || ''
    const actionLower = action.toLowerCase()
    const transactionId = params.get('transactionId') || params.get('id') || ''

    console.log('Redirect params:', {
      action,
      status: params.get('status'),
      transactionId,
      reference: params.get('reference'),
      method: params.get('method'),
      reason: params.get('reason')
    })

    // Build redirect URL with all params
    const redirectParams = params.toString()

    // Check for success indicators
    const isSuccess = actionLower === 'success' ||
                      actionLower === 'completed' ||
                      actionLower === 'funds_deposited' ||
                      actionLower === 'funds_received'

    console.log('isSuccess?', isSuccess, '(action:', actionLower, ')')

    const baseUrl = new URL(request.url).origin

    if (isSuccess) {
      const successUrl = `/payment/success?${redirectParams}`
      console.log('=== TRADESAFE USER REDIRECT (POST): Redirecting to SUCCESS ===')
      console.log('Redirect URL:', successUrl)
      // Use 303 See Other to force GET request
      return NextResponse.redirect(
        new URL(successUrl, baseUrl),
        { status: 303 }
      )
    } else {
      const errorUrl = `/payment/error?${redirectParams}`
      console.log('=== TRADESAFE USER REDIRECT (POST): Redirecting to ERROR ===')
      console.log('Redirect URL:', errorUrl)
      console.log('Reason:', params.get('reason') || action || 'unknown')
      // Use 303 See Other to force GET request
      return NextResponse.redirect(
        new URL(errorUrl, baseUrl),
        { status: 303 }
      )
    }
  } catch (error) {
    console.error('TradeSafe callback error:', error)
    const baseUrl = new URL(request.url).origin
    return NextResponse.redirect(
      new URL('/payment/error?error=callback_failed', baseUrl),
      { status: 303 }
    )
  }
}

/**
 * Look up gigId from paymentIntent using transactionId
 * Falls back to reference if not found
 */
async function lookupGigIdFromTransaction(transactionId: string, fallbackReference: string): Promise<string> {
  console.log('=== LOOKUP: Finding gigId ===')
  console.log('Looking up by transactionId:', transactionId)
  console.log('Fallback reference:', fallbackReference)

  if (!transactionId) {
    console.log('No transactionId, using fallback reference as gigId')
    return fallbackReference
  }

  try {
    const app = getFirebaseAdmin()
    const db = app.firestore()

    const paymentIntentQuery = await db.collection('paymentIntents')
      .where('transactionId', '==', transactionId)
      .where('provider', '==', 'tradesafe')
      .limit(1)
      .get()

    if (!paymentIntentQuery.empty) {
      const paymentData = paymentIntentQuery.docs[0].data()
      console.log('Found paymentIntent:', {
        id: paymentIntentQuery.docs[0].id,
        gigId: paymentData.gigId,
        transactionId: paymentData.transactionId
      })
      return paymentData.gigId
    }

    console.log('PaymentIntent not found for transactionId, using fallback reference')
    return fallbackReference
  } catch (error) {
    console.error('Error looking up gigId:', error)
    return fallbackReference
  }
}

/**
 * Handle successful payment - update gig to in-progress
 * IMPORTANT: We use agreedRate from application, NOT balance from TradeSafe
 * because TradeSafe may not send the balance field reliably
 */
async function handlePaymentSuccess(gigId: string, transactionId: string, _balanceFromTradeSafe: number) {
  console.log('=== PAYMENT SUCCESS: Starting ===')
  console.log('gigId:', gigId)
  console.log('transactionId:', transactionId)
  console.log('Note: Using agreedRate from application, not TradeSafe balance')

  if (!gigId || !transactionId) {
    console.warn('=== PAYMENT SUCCESS: FAILED - Missing gigId or transactionId ===')
    return
  }

  const app = getFirebaseAdmin()
  const db = app.firestore()

  // Update payment intent status
  console.log('=== PAYMENT SUCCESS: Step 1 - Finding paymentIntent ===')
  const paymentIntentQuery = await db.collection('paymentIntents')
    .where('transactionId', '==', transactionId)
    .where('provider', '==', 'tradesafe')
    .limit(1)
    .get()

  if (!paymentIntentQuery.empty) {
    const paymentIntent = paymentIntentQuery.docs[0]
    const paymentData = paymentIntent.data()
    console.log('Found paymentIntent:', {
      id: paymentIntent.id,
      currentStatus: paymentData.status,
      gigId: paymentData.gigId
    })

    // Only update if not already funded
    if (paymentData.status !== 'funded' && paymentData.status !== 'completed') {
      await paymentIntent.ref.update({
        status: 'funded',
        fundedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      console.log('PaymentIntent updated to funded')
    } else {
      console.log('PaymentIntent already funded, skipping')
    }
  } else {
    console.warn('PaymentIntent NOT FOUND for transactionId:', transactionId)
  }

  // Update gig status to in-progress
  console.log('=== PAYMENT SUCCESS: Step 2 - Finding gig ===')
  const gigRef = db.collection('gigs').doc(gigId)
  const gigDoc = await gigRef.get()

  if (gigDoc.exists) {
    const gigData = gigDoc.data()
    console.log('Found gig:', {
      id: gigDoc.id,
      currentStatus: gigData?.status,
      currentPaymentStatus: gigData?.paymentStatus
    })

    // Only update if not already funded
    if (gigData?.paymentStatus !== 'funded' && gigData?.paymentStatus !== 'completed') {
      // First find the application to get the agreedRate
      console.log('=== PAYMENT SUCCESS: Step 3 - Finding application for agreedRate ===')
      const applicationsQuery = await db.collection('applications')
        .where('gigId', '==', gigId)
        .where('status', '==', 'accepted')
        .limit(1)
        .get()

      if (applicationsQuery.empty) {
        console.warn('=== PAYMENT SUCCESS: FAILED - No accepted application found ===')
        return
      }

      const appDoc = applicationsQuery.docs[0]
      const appData = appDoc.data()
      const workerId = appData.applicantId

      // Use agreedRate from application, fallback to proposedRate, then gig budget
      const escrowAmount = appData.agreedRate || appData.proposedRate || gigData?.budget || 0

      console.log('Application found:', {
        id: appDoc.id,
        workerId,
        agreedRate: appData.agreedRate,
        proposedRate: appData.proposedRate,
        escrowAmount
      })

      if (escrowAmount === 0) {
        console.error('=== PAYMENT SUCCESS: CRITICAL - escrowAmount is 0, aborting payment processing ===')
        throw new Error('Cannot process payment: no valid amount found (agreedRate, proposedRate, or budget required)')
      }

      // Update gig
      console.log('=== PAYMENT SUCCESS: Step 4 - Updating gig ===')
      await gigRef.update({
        status: 'in-progress',
        paymentStatus: 'funded',
        escrowTransactionId: transactionId,
        escrowAmount: escrowAmount,
        fundedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      console.log('Gig updated to in-progress/funded with escrowAmount:', escrowAmount)

      // Update application
      console.log('=== PAYMENT SUCCESS: Step 5 - Updating application ===')
      await appDoc.ref.update({
        status: 'funded',
        paymentStatus: 'in_escrow',
        fundedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      console.log('Application updated to funded')

      // Update worker's pending balance (funds in escrow)
      console.log('=== PAYMENT SUCCESS: Step 6 - Updating worker pendingBalance ===')
      if (workerId) {
        try {
          const workerRef = db.collection('users').doc(workerId)
          const workerDoc = await workerRef.get()

          if (workerDoc.exists) {
            const workerData = workerDoc.data()
            const currentPending = workerData?.pendingBalance || 0
            const currentWallet = workerData?.walletBalance || 0
            const currentEarnings = workerData?.totalEarnings || 0
            const newPending = currentPending + escrowAmount

            console.log('Worker current state:', {
              workerId,
              currentPending,
              currentWallet,
              currentEarnings,
              escrowAmount,
              newPending
            })

            const updateData = {
              pendingBalance: newPending,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }
            console.log('Attempting update with data:', JSON.stringify(updateData))

            await workerRef.update(updateData)

            // Verify the update by reading back
            const verifyDoc = await workerRef.get()
            const verifyData = verifyDoc.data()
            console.log('Worker pendingBalance updated - VERIFIED:', {
              workerId,
              previousBalance: currentPending,
              addedAmount: escrowAmount,
              expectedNewBalance: newPending,
              actualNewBalance: verifyData?.pendingBalance,
              updateSuccess: verifyData?.pendingBalance === newPending
            })
          } else {
            console.warn('Worker document NOT FOUND:', workerId)
          }
        } catch (updateError) {
          console.error('=== PAYMENT SUCCESS: FAILED to update worker balance ===')
          console.error('Error:', updateError)
          console.error('WorkerId:', workerId)
          console.error('EscrowAmount:', escrowAmount)
        }
      } else {
        console.warn('No workerId provided, skipping balance update')
      }

      // Update employer's pending balance (funds they have in escrow)
      console.log('=== PAYMENT SUCCESS: Step 7 - Updating employer pendingBalance ===')
      const employerId = gigData?.employerId
      if (employerId) {
        try {
          const employerRef = db.collection('users').doc(employerId)
          const employerDoc = await employerRef.get()

          if (employerDoc.exists) {
            const employerData = employerDoc.data()
            const currentPending = employerData?.pendingBalance || 0
            const newPending = currentPending + escrowAmount

            console.log('Employer current state:', {
              employerId,
              currentPending,
              escrowAmount,
              newPending
            })

            await employerRef.update({
              pendingBalance: newPending,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            })

            // Verify the update
            const verifyDoc = await employerRef.get()
            const verifyData = verifyDoc.data()
            console.log('Employer pendingBalance updated - VERIFIED:', {
              employerId,
              previousBalance: currentPending,
              addedAmount: escrowAmount,
              expectedNewBalance: newPending,
              actualNewBalance: verifyData?.pendingBalance,
              updateSuccess: verifyData?.pendingBalance === newPending
            })
          } else {
            console.warn('Employer document NOT FOUND:', employerId)
          }
        } catch (updateError) {
          console.error('=== PAYMENT SUCCESS: FAILED to update employer balance ===')
          console.error('Error:', updateError)
          console.error('EmployerId:', employerId)
          console.error('EscrowAmount:', escrowAmount)
        }
      } else {
        console.warn('No employerId found in gig, skipping employer balance update')
      }

      console.log('=== PAYMENT SUCCESS: COMPLETE ===')
    } else {
      console.log('=== PAYMENT SUCCESS: Gig already funded, skipping ===')
    }
  } else {
    console.warn('=== PAYMENT SUCCESS: FAILED - Gig not found ===')
    console.warn('gigId that was NOT found:', gigId)
  }
}

/**
 * Handle transaction completed - funds released to worker
 * CRITICAL: This moves funds from pendingBalance to walletBalance
 */
async function handleTransactionCompleted(gigId: string, transactionId: string) {
  if (!gigId) {
    console.warn('=== TRANSACTION COMPLETED: FAILED - Missing gigId ===')
    return
  }

  console.log('=== TRANSACTION COMPLETED: Starting ===')
  console.log('gigId:', gigId)
  console.log('transactionId:', transactionId)

  const app = getFirebaseAdmin()
  const db = app.firestore()

  // Step 1: Get the gig to find escrowAmount
  console.log('=== TRANSACTION COMPLETED: Step 1 - Finding gig ===')
  const gigRef = db.collection('gigs').doc(gigId)
  const gigDoc = await gigRef.get()

  if (!gigDoc.exists) {
    console.warn('=== TRANSACTION COMPLETED: FAILED - Gig not found ===')
    return
  }

  const gigData = gigDoc.data()
  const escrowAmount = gigData?.escrowAmount || 0

  console.log('Gig found:', {
    id: gigDoc.id,
    currentStatus: gigData?.status,
    escrowAmount
  })

  // Step 2: Find the funded application to get workerId
  console.log('=== TRANSACTION COMPLETED: Step 2 - Finding application ===')
  const applicationsQuery = await db.collection('applications')
    .where('gigId', '==', gigId)
    .where('status', '==', 'funded')
    .limit(1)
    .get()

  if (applicationsQuery.empty) {
    console.warn('=== TRANSACTION COMPLETED: No funded application found, trying completed ===')
    // Try completed status in case it was already updated
    const completedAppsQuery = await db.collection('applications')
      .where('gigId', '==', gigId)
      .where('status', '==', 'completed')
      .limit(1)
      .get()

    if (completedAppsQuery.empty) {
      console.warn('=== TRANSACTION COMPLETED: FAILED - No application found ===')
      return
    }
  }

  const appDoc = applicationsQuery.empty
    ? (await db.collection('applications').where('gigId', '==', gigId).where('status', '==', 'completed').limit(1).get()).docs[0]
    : applicationsQuery.docs[0]

  const appData = appDoc.data()
  const workerId = appData.applicantId

  // Use escrowAmount from gig, or agreedRate from application as fallback
  const releaseAmount = escrowAmount || appData.agreedRate || appData.proposedRate || 0

  console.log('Application found:', {
    id: appDoc.id,
    workerId,
    releaseAmount
  })

  // Step 3: Update gig status
  console.log('=== TRANSACTION COMPLETED: Step 3 - Updating gig ===')
  await gigRef.update({
    status: 'completed',
    paymentStatus: 'released',
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })
  console.log('Gig updated to completed/released')

  // Step 4: Update application status
  console.log('=== TRANSACTION COMPLETED: Step 4 - Updating application ===')
  await appDoc.ref.update({
    status: 'completed',
    paymentStatus: 'released',
    completedAt: admin.firestore.FieldValue.serverTimestamp()
  })
  console.log('Application updated to completed/released')

  // Step 5: Update payment intent
  console.log('=== TRANSACTION COMPLETED: Step 5 - Updating paymentIntent ===')
  const paymentIntentQuery = await db.collection('paymentIntents')
    .where('transactionId', '==', transactionId)
    .where('provider', '==', 'tradesafe')
    .limit(1)
    .get()

  if (!paymentIntentQuery.empty) {
    await paymentIntentQuery.docs[0].ref.update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    console.log('PaymentIntent updated to completed')
  }

  // Step 6: CRITICAL - Move funds from pendingBalance to walletBalance
  console.log('=== TRANSACTION COMPLETED: Step 6 - Updating worker wallet ===')
  if (workerId && releaseAmount > 0) {
    try {
      const workerRef = db.collection('users').doc(workerId)
      const workerDoc = await workerRef.get()

      if (workerDoc.exists) {
        const workerData = workerDoc.data()
        const currentPending = workerData?.pendingBalance || 0
        const currentWallet = workerData?.walletBalance || 0
        const currentTotalEarnings = workerData?.totalEarnings || 0

        // Move from pending to wallet
        const newPending = Math.max(0, currentPending - releaseAmount)
        const newWallet = currentWallet + releaseAmount
        const newTotalEarnings = currentTotalEarnings + releaseAmount

        console.log('Worker current state:', {
          workerId,
          currentPending,
          currentWallet,
          currentTotalEarnings,
          releaseAmount
        })

        const updateData = {
          pendingBalance: newPending,
          walletBalance: newWallet,
          totalEarnings: newTotalEarnings,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
        console.log('Attempting wallet update with data:', JSON.stringify({
          pendingBalance: newPending,
          walletBalance: newWallet,
          totalEarnings: newTotalEarnings
        }))

        await workerRef.update(updateData)

        // Verify the update by reading back
        const verifyDoc = await workerRef.get()
        const verifyData = verifyDoc.data()
        console.log('Worker wallet updated - VERIFIED:', {
          workerId,
          releaseAmount,
          pendingBalance: { before: currentPending, after: newPending, actual: verifyData?.pendingBalance },
          walletBalance: { before: currentWallet, after: newWallet, actual: verifyData?.walletBalance },
          totalEarnings: { before: currentTotalEarnings, after: newTotalEarnings, actual: verifyData?.totalEarnings },
          updateSuccess: verifyData?.walletBalance === newWallet
        })
      } else {
        console.warn('Worker document NOT FOUND:', workerId)
      }
    } catch (updateError) {
      console.error('=== TRANSACTION COMPLETED: FAILED to update worker wallet ===')
      console.error('Error:', updateError)
      console.error('WorkerId:', workerId)
      console.error('ReleaseAmount:', releaseAmount)
    }
  } else {
    console.warn('Cannot update wallet - workerId:', workerId, 'releaseAmount:', releaseAmount)
  }

  // Step 7: CRITICAL - Decrease employer's pendingBalance (funds released from escrow)
  console.log('=== TRANSACTION COMPLETED: Step 7 - Updating employer pendingBalance ===')
  const employerId = gigData?.employerId
  if (employerId && releaseAmount > 0) {
    try {
      const employerRef = db.collection('users').doc(employerId)
      const employerDoc = await employerRef.get()

      if (employerDoc.exists) {
        const employerData = employerDoc.data()
        const currentPending = employerData?.pendingBalance || 0
        const newPending = Math.max(0, currentPending - releaseAmount)

        console.log('Employer current state:', {
          employerId,
          currentPending,
          releaseAmount,
          newPending
        })

        await employerRef.update({
          pendingBalance: newPending,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })

        // Verify the update
        const verifyDoc = await employerRef.get()
        const verifyData = verifyDoc.data()
        console.log('Employer pendingBalance updated - VERIFIED:', {
          employerId,
          previousBalance: currentPending,
          releasedAmount: releaseAmount,
          expectedNewBalance: newPending,
          actualNewBalance: verifyData?.pendingBalance,
          updateSuccess: verifyData?.pendingBalance === newPending
        })
      } else {
        console.warn('Employer document NOT FOUND:', employerId)
      }
    } catch (updateError) {
      console.error('=== TRANSACTION COMPLETED: FAILED to update employer balance ===')
      console.error('Error:', updateError)
      console.error('EmployerId:', employerId)
      console.error('ReleaseAmount:', releaseAmount)
    }
  } else {
    console.warn('Cannot update employer balance - employerId:', employerId, 'releaseAmount:', releaseAmount)
  }

  console.log('=== TRANSACTION COMPLETED: COMPLETE ===')
}

/**
 * Handle transaction cancelled - refund processed
 */
async function handleTransactionCancelled(gigId: string, transactionId: string) {
  if (!gigId) return

  console.log('TradeSafe webhook: Processing transaction cancellation for gig:', gigId)

  const app = getFirebaseAdmin()
  const db = app.firestore()

  // Update payment intent status
  const paymentIntentQuery = await db.collection('paymentIntents')
    .where('transactionId', '==', transactionId)
    .where('provider', '==', 'tradesafe')
    .limit(1)
    .get()

  if (!paymentIntentQuery.empty) {
    await paymentIntentQuery.docs[0].ref.update({
      status: 'cancelled',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp()
    })
  }

  // Update gig status
  const gigRef = db.collection('gigs').doc(gigId)
  const gigDoc = await gigRef.get()

  if (gigDoc.exists) {
    const gigData = gigDoc.data()
    if (gigData?.paymentStatus === 'funded') {
      await gigRef.update({
        paymentStatus: 'refunded',
        escrowTransactionId: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }
  }

  console.log('TradeSafe webhook: Transaction cancelled:', transactionId)
}

/**
 * GET /tradesafe/callback
 *
 * Handles GET redirects from TradeSafe (fallback)
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  // Detailed logging for user redirect tracking
  console.log('=== TRADESAFE USER REDIRECT: Received ===')
  console.log('Full URL:', request.url)
  console.log('All params:', Object.fromEntries(params.entries()))
  console.log('Key params:', {
    status: params.get('status'),
    action: params.get('action'),
    transactionId: params.get('transactionId') || params.get('id'),
    reference: params.get('reference'),
    method: params.get('method'),
    reason: params.get('reason')
  })

  const action = params.get('action') || params.get('status') || ''
  const actionLower = action.toLowerCase()
  const redirectParams = params.toString()

  console.log('=== TRADESAFE USER REDIRECT: Detection ===')
  console.log('action/status value:', action)
  console.log('actionLower:', actionLower)

  const isSuccess = actionLower === 'success' ||
                    actionLower === 'completed' ||
                    actionLower === 'funds_deposited' ||
                    actionLower === 'funds_received'

  console.log('isSuccess?', isSuccess)

  const baseUrl = new URL(request.url).origin

  if (isSuccess) {
    const successUrl = `/payment/success?${redirectParams}`
    console.log('=== TRADESAFE USER REDIRECT: Redirecting to SUCCESS ===')
    console.log('Redirect URL:', successUrl)
    return NextResponse.redirect(
      new URL(successUrl, baseUrl),
      { status: 303 }
    )
  } else {
    const errorUrl = `/payment/error?${redirectParams}`
    console.log('=== TRADESAFE USER REDIRECT: Redirecting to ERROR ===')
    console.log('Redirect URL:', errorUrl)
    console.log('Reason:', params.get('reason') || 'unknown')
    return NextResponse.redirect(
      new URL(errorUrl, baseUrl),
      { status: 303 }
    )
  }
}
