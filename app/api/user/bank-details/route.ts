import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'
import { TradeSafeService } from '@/lib/services/tradesafeService'
import { TRADESAFE_BANK_CODES, SUPPORTED_BANKS } from '@/lib/constants/banks'
import { normalizePhoneNumber } from '@/lib/utils/phoneUtils'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const app = getFirebaseAdmin()
    const db = app.firestore()
    const adminAuth = app.auth()

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    const body = await request.json()
    const { bankName, accountNumber, accountType, accountHolder, branchCode } = body

    // Validate required fields
    if (!bankName || !accountNumber || !accountType || !accountHolder) {
      return NextResponse.json(
        { error: 'Missing required fields: bankName, accountNumber, accountType, accountHolder' },
        { status: 400 }
      )
    }

    // Validate bank name
    if (!TRADESAFE_BANK_CODES[bankName]) {
      return NextResponse.json(
        { error: `Unsupported bank: ${bankName}. Supported banks: ${SUPPORTED_BANKS.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate account type
    if (!['CHEQUE', 'SAVINGS'].includes(accountType)) {
      return NextResponse.json(
        { error: 'Account type must be CHEQUE or SAVINGS' },
        { status: 400 }
      )
    }

    // Validate account number (South African format: 10-11 digits)
    if (!/^\d{10,11}$/.test(accountNumber)) {
      return NextResponse.json(
        { error: 'Account number must be 10-11 digits' },
        { status: 400 }
      )
    }

    // Get user profile
    const userDoc = await db.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userDoc.data()

    // Check if user already has bank details (TradeSafe only allows setting once)
    if (userData?.bankDetails) {
      return NextResponse.json(
        { error: 'Bank details already set. Contact support to update.' },
        { status: 400 }
      )
    }

    const bankDetails = {
      bankName,
      accountNumber,
      accountType: accountType as 'CHEQUE' | 'SAVINGS',
      accountHolder,
      branchCode: branchCode || '',
      addedAt: new Date()
    }

    // If user already has a TradeSafe token, we can't add bank details to it
    // They need to have bank details BEFORE first gig payment
    if (userData?.tradeSafeToken) {
      // For now, just store bank details locally
      // In production, would need TradeSafe support to update token
      await db.collection('users').doc(userId).update({
        bankDetails,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      return NextResponse.json({
        success: true,
        message: 'Bank details saved. Note: Your TradeSafe token was created before adding bank details. New gigs will use updated details.',
        bankDetails: {
          bankName,
          accountNumber: `****${accountNumber.slice(-4)}`,
          accountType,
          accountHolder
        }
      })
    }

    // Create TradeSafe token with bank details
    const tradeSafe = new TradeSafeService()

    const nameParts = (userData?.displayName || `${userData?.firstName || ''} ${userData?.lastName || ''}`).trim().split(' ')
    const givenName = nameParts[0] || 'User'
    const familyName = nameParts.slice(1).join(' ') || 'User'
    const email = userData?.email
    const mobile = normalizePhoneNumber(userData?.phone)

    // Validate required fields for TradeSafe
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required for TradeSafe account creation' },
        { status: 400 }
      )
    }

    const tokenInput = {
      givenName,
      familyName,
      email,
      mobile,
      bankAccount: {
        accountNumber,
        accountType: accountType as 'CHEQUE' | 'SAVINGS',
        bank: TRADESAFE_BANK_CODES[bankName]
      }
    }

    console.log('[BANK_DETAILS] Creating TradeSafe token with:', {
      givenName,
      familyName,
      email,
      mobile,
      bankAccount: {
        accountNumber: `****${accountNumber.slice(-4)}`,
        accountType,
        bank: TRADESAFE_BANK_CODES[bankName]
      }
    })

    const tradeSafeToken = await tradeSafe.createToken(tokenInput)

    // Update user profile with bank details and TradeSafe token
    await db.collection('users').doc(userId).update({
      bankDetails,
      tradeSafeToken: tradeSafeToken.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    return NextResponse.json({
      success: true,
      message: 'Bank details saved and TradeSafe account created. You will receive payments directly to your bank account.',
      bankDetails: {
        bankName,
        accountNumber: `****${accountNumber.slice(-4)}`,
        accountType,
        accountHolder
      },
      tradeSafeTokenCreated: true
    })

  } catch (error) {
    console.error('Error saving bank details:', error)
    return NextResponse.json(
      { error: 'Failed to save bank details' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const app = getFirebaseAdmin()
    const db = app.firestore()
    const adminAuth = app.auth()

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    const userDoc = await db.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userDoc.data()
    const bankDetails = userData?.bankDetails

    if (!bankDetails) {
      return NextResponse.json({
        hasBankDetails: false,
        message: 'No bank details on file. Add bank details to receive direct payments.'
      })
    }

    return NextResponse.json({
      hasBankDetails: true,
      bankDetails: {
        bankName: bankDetails.bankName,
        accountNumber: `****${bankDetails.accountNumber.slice(-4)}`,
        accountType: bankDetails.accountType,
        accountHolder: bankDetails.accountHolder,
        addedAt: bankDetails.addedAt
      },
      hasTradeSafeToken: !!userData?.tradeSafeToken
    })

  } catch (error) {
    console.error('Error fetching bank details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bank details' },
      { status: 500 }
    )
  }
}
