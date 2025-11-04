import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  Payment,
  PaymentMethod,
  PaymentIntent,
  Milestone,
  WithdrawalRequest,
  EscrowAccount,
  PaymentHistory,
  PaymentAnalytics,
  PaymentConfig,
  PaymentDispute,
  BankAccount,
  FeeBreakdown
} from '@/types/payment'
import { FeeConfigService } from './feeConfigService'
import { GigService } from '../database/gigService'
import { WalletService } from './walletService'

const COLLECTIONS = {
  PAYMENTS: 'payments',
  PAYMENT_METHODS: 'paymentMethods',
  PAYMENT_INTENTS: 'paymentIntents',
  MILESTONES: 'milestones',
  WITHDRAWALS: 'withdrawals',
  ESCROW_ACCOUNTS: 'escrowAccounts',
  PAYMENT_HISTORY: 'paymentHistory',
  PAYMENT_DISPUTES: 'paymentDisputes'
} as const

// Cache for the active fee configuration
let cachedFeeConfig: PaymentConfig | null = null
let configCacheTime: number = 0
const CONFIG_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export class PaymentService {
  // Payment Methods Management
  static async addPaymentMethod(userId: string, paymentMethodData: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentMethod> {
    try {
      // If this payment method is being set as default, remove default from all other methods first
      if (paymentMethodData.isDefault) {
        const batch = writeBatch(db)
        const userMethods = await this.getUserPaymentMethods(userId)

        userMethods.forEach(method => {
          if (method.isDefault) {
            batch.update(doc(db, COLLECTIONS.PAYMENT_METHODS, method.id), {
              isDefault: false,
              updatedAt: Timestamp.now()
            })
          }
        })

        await batch.commit()
      }

      const docRef = await addDoc(collection(db, COLLECTIONS.PAYMENT_METHODS), {
        ...paymentMethodData,
        userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })

      const paymentMethod: PaymentMethod = {
        id: docRef.id,
        ...paymentMethodData,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      return paymentMethod
    } catch (error) {
      console.error('Error adding payment method:', error)
      throw new Error('Failed to add payment method')
    }
  }

  static async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.PAYMENT_METHODS),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      } as PaymentMethod))
    } catch (error) {
      console.error('Error fetching payment methods:', error)
      return []
    }
  }

  static async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    try {
      const batch = writeBatch(db)

      // Remove default from all other payment methods
      const userMethods = await this.getUserPaymentMethods(userId)
      userMethods.forEach(method => {
        if (method.isDefault) {
          batch.update(doc(db, COLLECTIONS.PAYMENT_METHODS, method.id), {
            isDefault: false,
            updatedAt: Timestamp.now()
          })
        }
      })

      // Set new default
      batch.update(doc(db, COLLECTIONS.PAYMENT_METHODS, paymentMethodId), {
        isDefault: true,
        updatedAt: Timestamp.now()
      })

      await batch.commit()
    } catch (error) {
      console.error('Error setting default payment method:', error)
      throw new Error('Failed to set default payment method')
    }
  }

  // Payment Processing
  static async createPaymentIntent(
    gigId: string,
    employerId: string,
    workerId: string,
    amount: number,
    paymentMethodId: string,
    type: 'milestone' | 'hourly' | 'fixed' | 'bonus' = 'fixed'
  ): Promise<PaymentIntent> {
    try {
      const intentData = {
        gigId,
        employerId,
        workerId,
        amount,
        currency: 'ZAR' as const,
        paymentMethodId,
        type,
        status: 'created' as const,
        metadata: {
          gigId,
          employerId,
          workerId,
          type
        },
        createdAt: Timestamp.now()
      }

      const docRef = await addDoc(collection(db, COLLECTIONS.PAYMENT_INTENTS), intentData)

      return {
        id: docRef.id,
        ...intentData,
        createdAt: new Date()
      }
    } catch (error) {
      console.error('Error creating payment intent:', error)
      throw new Error('Failed to create payment intent')
    }
  }

  static async processPayment(paymentIntentId: string): Promise<Payment> {
    try {
      // In a real implementation, this would integrate with payment providers
      // For now, we'll simulate the payment process

      const intentDoc = await getDoc(doc(db, COLLECTIONS.PAYMENT_INTENTS, paymentIntentId))
      if (!intentDoc.exists()) {
        throw new Error('Payment intent not found')
      }

      const intentData = intentDoc.data()
      const paymentMethodDoc = await getDoc(doc(db, COLLECTIONS.PAYMENT_METHODS, intentData.paymentMethodId))

      if (!paymentMethodDoc.exists()) {
        throw new Error('Payment method not found')
      }

      const paymentMethod = {
        id: paymentMethodDoc.id,
        ...paymentMethodDoc.data(),
        createdAt: paymentMethodDoc.data().createdAt?.toDate() || new Date(),
        updatedAt: paymentMethodDoc.data().updatedAt?.toDate() || new Date()
      } as PaymentMethod

      // Create payment record
      const paymentData = {
        gigId: intentData.gigId,
        employerId: intentData.employerId,
        workerId: intentData.workerId,
        amount: intentData.amount,
        currency: 'ZAR' as const,
        type: intentData.type,
        status: 'processing' as const,
        paymentMethodId: intentData.paymentMethodId,
        paymentMethod,
        escrowStatus: 'pending' as const,
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        providerTransactionId: `prov_${Date.now()}`,
        providerReference: `ref_${Date.now()}`,
        description: `Payment for gig ${intentData.gigId}`,
        createdAt: Timestamp.now(),
        processedAt: Timestamp.now()
      }

      const paymentDocRef = await addDoc(collection(db, COLLECTIONS.PAYMENTS), paymentData)

      // Update payment intent status
      await updateDoc(doc(db, COLLECTIONS.PAYMENT_INTENTS, paymentIntentId), {
        status: 'succeeded',
        paymentId: paymentDocRef.id
      })

      // Create escrow account
      await this.createEscrowAccount(paymentDocRef.id, intentData.gigId, intentData.employerId, intentData.workerId, intentData.amount)

      // Get gig details for better descriptions
      let gigTitle = `Gig ${intentData.gigId}` // fallback
      try {
        const gig = await GigService.getGigById(intentData.gigId)
        if (gig?.title) {
          gigTitle = gig.title
        }
      } catch {
        console.log('Could not fetch gig title for payment history, using ID')
      }

      // Add to payment history with human-readable descriptions
      await this.addPaymentHistory(intentData.employerId, 'payments', intentData.amount, 'completed', intentData.gigId, paymentDocRef.id, `Payment for "${gigTitle}"`)
      await this.addPaymentHistory(intentData.workerId, 'earnings', intentData.amount, 'pending', intentData.gigId, paymentDocRef.id, `Earnings from "${gigTitle}"`)

      // Update worker's pending balance (funds in escrow)
      await WalletService.updatePendingBalance(intentData.workerId, intentData.amount)

      return {
        id: paymentDocRef.id,
        ...paymentData,
        createdAt: new Date(),
        processedAt: new Date()
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      throw new Error('Failed to process payment')
    }
  }

  // Escrow Management
  static async createEscrowAccount(
    paymentId: string,
    gigId: string,
    employerId: string,
    workerId: string,
    amount: number
  ): Promise<EscrowAccount> {
    try {
      const escrowData = {
        paymentId,
        gigId,
        employerId,
        workerId,
        totalAmount: amount,
        releasedAmount: 0,
        status: 'active' as const,
        milestones: [],
        createdAt: Timestamp.now()
      }

      const docRef = await addDoc(collection(db, COLLECTIONS.ESCROW_ACCOUNTS), escrowData)

      return {
        id: docRef.id,
        ...escrowData,
        createdAt: new Date()
      }
    } catch (error) {
      console.error('Error creating escrow account:', error)
      throw new Error('Failed to create escrow account')
    }
  }

  static async releaseEscrow(paymentId: string, amount?: number): Promise<void> {
    try {
      const paymentDoc = await getDoc(doc(db, COLLECTIONS.PAYMENTS, paymentId))
      if (!paymentDoc.exists()) {
        throw new Error('Payment not found')
      }

      const paymentData = paymentDoc.data()
      const releaseAmount = amount || paymentData.amount

      // Update payment status
      await updateDoc(doc(db, COLLECTIONS.PAYMENTS, paymentId), {
        escrowStatus: 'released',
        escrowReleaseDate: Timestamp.now(),
        status: 'completed',
        completedAt: Timestamp.now()
      })

      // Get gig title for better description
      let gigTitle = `Gig ${paymentData.gigId}` // fallback
      try {
        const gig = await GigService.getGigById(paymentData.gigId)
        if (gig?.title) {
          gigTitle = gig.title
        }
      } catch {
        console.log('Could not fetch gig title for escrow release history, using ID')
      }

      // Update payment history for worker
      await this.addPaymentHistory(
        paymentData.workerId,
        'earnings',
        releaseAmount,
        'completed',
        paymentData.gigId,
        paymentId,
        `Payment released for "${gigTitle}"`
      )

      // Move funds from pending to wallet
      await WalletService.movePendingToWallet(paymentData.workerId, releaseAmount)
    } catch (error) {
      console.error('Error releasing escrow:', error)
      throw new Error(error instanceof Error ? error.message : 'Failed to release escrow')
    }
  }

  // Milestones
  static async createMilestone(
    gigId: string,
    title: string,
    description: string,
    amount: number,
    dueDate?: Date
  ): Promise<Milestone> {
    try {
      const milestoneData = {
        gigId,
        title,
        description,
        amount,
        dueDate: dueDate ? Timestamp.fromDate(dueDate) : undefined,
        status: 'pending' as const,
        createdAt: Timestamp.now()
      }

      const docRef = await addDoc(collection(db, COLLECTIONS.MILESTONES), milestoneData)

      return {
        id: docRef.id,
        ...milestoneData,
        dueDate,
        createdAt: new Date()
      }
    } catch (error) {
      console.error('Error creating milestone:', error)
      throw new Error('Failed to create milestone')
    }
  }

  static async updateMilestoneStatus(
    milestoneId: string,
    status: Milestone['status'],
    paymentId?: string
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = { status }

      if (status === 'completed') {
        updateData.completedAt = Timestamp.now()
      } else if (status === 'approved') {
        updateData.approvedAt = Timestamp.now()
      }

      if (paymentId) {
        updateData.paymentId = paymentId
      }

      await updateDoc(doc(db, COLLECTIONS.MILESTONES, milestoneId), updateData)
    } catch (error) {
      console.error('Error updating milestone status:', error)
      throw new Error('Failed to update milestone status')
    }
  }

  // Withdrawals
  static async requestWithdrawal(
    userId: string,
    amount: number,
    paymentMethodId: string,
    bankDetails?: BankAccount
  ): Promise<WithdrawalRequest> {
    try {
      const withdrawalData = {
        userId,
        amount,
        currency: 'ZAR' as const,
        status: 'pending' as const,
        paymentMethodId,
        bankDetails,
        requestedAt: Timestamp.now()
      }

      const docRef = await addDoc(collection(db, COLLECTIONS.WITHDRAWALS), withdrawalData)

      // Add to payment history
      await this.addPaymentHistory(userId, 'payments', -amount, 'pending', undefined, undefined, `Withdrawal request of R${amount}`)

      return {
        id: docRef.id,
        ...withdrawalData,
        requestedAt: new Date()
      }
    } catch (error) {
      console.error('Error requesting withdrawal:', error)
      throw new Error('Failed to request withdrawal')
    }
  }

  static async updateWithdrawalStatus(
    withdrawalId: string,
    status: WithdrawalRequest['status'],
    failureReason?: string,
    adminNotes?: string
  ): Promise<void> {
    try {
      const withdrawalDoc = await getDoc(doc(db, COLLECTIONS.WITHDRAWALS, withdrawalId))
      if (!withdrawalDoc.exists()) {
        throw new Error('Withdrawal request not found')
      }

      const withdrawalData = withdrawalDoc.data()
      const updateData: Record<string, unknown> = { status }

      if (status === 'processing') {
        updateData.processedAt = Timestamp.now()
      } else if (status === 'completed') {
        updateData.completedAt = Timestamp.now()

        // Debit user's wallet when withdrawal is completed
        await WalletService.debitWallet(withdrawalData.userId, withdrawalData.amount)

        // Update payment history to mark as completed
        await this.addPaymentHistory(
          withdrawalData.userId,
          'payments',
          -withdrawalData.amount,
          'completed',
          undefined,
          undefined,
          `Withdrawal completed: R${withdrawalData.amount}`
        )
      } else if (status === 'failed') {
        updateData.failureReason = failureReason

        // Update payment history to mark as failed
        await this.addPaymentHistory(
          withdrawalData.userId,
          'payments',
          -withdrawalData.amount,
          'failed',
          undefined,
          undefined,
          `Withdrawal failed: ${failureReason || 'Unknown error'}`
        )
      }

      if (adminNotes) {
        updateData.adminNotes = adminNotes
      }

      await updateDoc(doc(db, COLLECTIONS.WITHDRAWALS, withdrawalId), updateData)
    } catch (error) {
      console.error('Error updating withdrawal status:', error)
      throw new Error(error instanceof Error ? error.message : 'Failed to update withdrawal status')
    }
  }

  // Payment History
  static async addPaymentHistory(
    userId: string,
    type: PaymentHistory['type'],
    amount: number,
    status: PaymentHistory['status'],
    gigId?: string,
    paymentId?: string,
    description?: string
  ): Promise<void> {
    try {
      await addDoc(collection(db, COLLECTIONS.PAYMENT_HISTORY), {
        userId,
        type,
        amount,
        currency: 'ZAR',
        status,
        gigId,
        paymentId,
        description: description || `${type.charAt(0).toUpperCase() + type.slice(1)} of R${Math.abs(amount)}`,
        createdAt: Timestamp.now()
      })
    } catch (error) {
      console.error('Error adding payment history:', error)
    }
  }

  static async getUserPaymentHistory(userId: string, limit: number = 50): Promise<PaymentHistory[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.PAYMENT_HISTORY),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.slice(0, limit).map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as PaymentHistory))
    } catch (error) {
      console.error('Error fetching payment history:', error)
      return []
    }
  }

  // Analytics
  static async getUserPaymentAnalytics(userId: string): Promise<PaymentAnalytics> {
    try {
      const history = await this.getUserPaymentHistory(userId, 1000)

      const earnings = history.filter(h => h.type === 'earnings' && h.status === 'completed')
      const payments = history.filter(h => h.type === 'payments' && h.status === 'completed')

      const totalEarnings = earnings.reduce((sum, h) => sum + h.amount, 0)
      const totalPaid = payments.reduce((sum, h) => sum + h.amount, 0)
      const pendingPayments = history.filter(h => h.status === 'pending').reduce((sum, h) => sum + h.amount, 0)

      // Get completed gigs count
      const completedGigIds = new Set(earnings.map(h => h.gigId).filter(Boolean))
      const completedGigs = completedGigIds.size

      const averageGigValue = completedGigs > 0 ? totalEarnings / completedGigs : 0

      // Monthly earnings calculation
      const monthlyEarningsMap = new Map<string, number>()
      earnings.forEach(earning => {
        const month = earning.createdAt.toISOString().slice(0, 7) // YYYY-MM format
        monthlyEarningsMap.set(month, (monthlyEarningsMap.get(month) || 0) + earning.amount)
      })

      const monthlyEarnings = Array.from(monthlyEarningsMap.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month))

      return {
        totalEarnings,
        totalPaid,
        pendingPayments,
        completedGigs,
        averageGigValue,
        monthlyEarnings,
        topCategories: [], // Would need category data from gigs
        paymentMethodUsage: [] // Would need to aggregate from payment methods used
      }
    } catch (error) {
      console.error('Error calculating payment analytics:', error)
      return {
        totalEarnings: 0,
        totalPaid: 0,
        pendingPayments: 0,
        completedGigs: 0,
        averageGigValue: 0,
        monthlyEarnings: [],
        topCategories: [],
        paymentMethodUsage: []
      }
    }
  }

  // Disputes
  static async createDispute(
    paymentId: string,
    gigId: string,
    raisedBy: string,
    raisedAgainst: string,
    reason: string,
    description: string,
    evidence?: string[]
  ): Promise<PaymentDispute> {
    try {
      const disputeData = {
        paymentId,
        gigId,
        raisedBy,
        raisedAgainst,
        reason,
        description,
        status: 'open' as const,
        evidence: evidence || [],
        createdAt: Timestamp.now()
      }

      const docRef = await addDoc(collection(db, COLLECTIONS.PAYMENT_DISPUTES), disputeData)

      // Update payment status
      await updateDoc(doc(db, COLLECTIONS.PAYMENTS, paymentId), {
        disputeId: docRef.id,
        disputeStatus: 'raised'
      })

      return {
        id: docRef.id,
        ...disputeData,
        createdAt: new Date()
      }
    } catch (error) {
      console.error('Error creating dispute:', error)
      throw new Error('Failed to create dispute')
    }
  }

  // Get active fee configuration with caching
  static async getActiveFeeConfig(): Promise<PaymentConfig> {
    const now = Date.now()

    // Return cached config if still valid
    if (cachedFeeConfig && (now - configCacheTime) < CONFIG_CACHE_DURATION) {
      return cachedFeeConfig
    }

    // Fetch fresh config
    cachedFeeConfig = await FeeConfigService.getActiveFeeConfig()
    configCacheTime = now
    return cachedFeeConfig
  }

  // Clear fee config cache (useful when config is updated)
  static clearFeeConfigCache(): void {
    cachedFeeConfig = null
    configCacheTime = 0
  }

  // Calculate fee breakdown for a gig amount
  static async calculateGigFees(gigAmount: number): Promise<FeeBreakdown> {
    const config = await this.getActiveFeeConfig()
    return FeeConfigService.calculateFeeBreakdown(gigAmount, config)
  }

  // Legacy method for backward compatibility
  static async calculateFees(amount: number): Promise<{
    platformFee: number
    processingFee: number
    fixedFee: number
    totalFees: number
    netAmount: number
  }> {
    const breakdown = await this.calculateGigFees(amount)
    return {
      platformFee: breakdown.platformFee,
      processingFee: breakdown.processingFee,
      fixedFee: breakdown.fixedFee,
      totalFees: breakdown.totalEmployerFees,
      netAmount: breakdown.netAmountToWorker
    }
  }

  static formatCurrency(amount: number, currency: 'ZAR' = 'ZAR'): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Utility function to fix multiple default payment methods
  static async fixMultipleDefaultPaymentMethods(userId: string): Promise<void> {
    try {
      const userMethods = await this.getUserPaymentMethods(userId)
      const defaultMethods = userMethods.filter(method => method.isDefault)

      // If there are multiple defaults, keep the most recently created one
      if (defaultMethods.length > 1) {
        const batch = writeBatch(db)

        // Sort by creation date and keep the most recent as default
        const sortedDefaults = defaultMethods.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        // Remove default flag from all others
        sortedDefaults.slice(1).forEach(method => {
          batch.update(doc(db, COLLECTIONS.PAYMENT_METHODS, method.id), {
            isDefault: false,
            updatedAt: Timestamp.now()
          })
        })

        await batch.commit()
        console.log(`Fixed ${defaultMethods.length - 1} duplicate default payment methods for user ${userId}`)
      }
    } catch (error) {
      console.error('Error fixing multiple default payment methods:', error)
    }
  }
}