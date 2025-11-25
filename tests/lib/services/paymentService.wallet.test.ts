/**
 * PaymentService Wallet Integration Tests
 */

import { PaymentService } from '@/lib/services/paymentService'
import { WalletService } from '@/lib/services/walletService'
import { GigService } from '@/lib/database/gigService'
import { collection, addDoc, getDoc, updateDoc, getDocs, query, where, orderBy, Timestamp, doc } from 'firebase/firestore'

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {}
}))

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn((coll) => coll),
  where: jest.fn((field, op, value) => ({ field, op, value })),
  orderBy: jest.fn(),
  doc: jest.fn(),
  // runTransaction removed to force fallback path in processPayment
  increment: jest.fn((val) => ({ __increment: val })),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
    fromMillis: jest.fn((ms) => ({ toDate: () => new Date(ms), toMillis: () => ms }))
  }
}))
jest.mock('@/lib/services/walletService')
jest.mock('@/lib/database/gigService')
jest.mock('@/lib/services/feeConfigService', () => ({
  FeeConfigService: {
    getActiveFeeConfig: jest.fn().mockResolvedValue({
      platformFeePercentage: 5,
      paymentProcessingFeePercentage: 2.9,
      fixedTransactionFee: 2.5,
      workerCommissionPercentage: 10,
      minimumWithdrawal: 50
    }),
    calculateFeeBreakdown: jest.fn((amount) => ({
      grossAmount: amount,
      platformFee: amount * 0.05,
      processingFee: amount * 0.029,
      fixedFee: 2.5,
      workerCommission: amount * 0.1,
      totalEmployerFees: amount * 0.079 + 2.5,
      totalWorkerDeductions: amount * 0.1,
      netAmountToWorker: amount * 0.9,
      totalEmployerCost: amount * 1.079 + 2.5
    }))
  }
}))

describe('PaymentService - Wallet Integration', () => {
  const mockGigId = 'gig-123'
  const mockEmployerId = 'employer-123'
  const mockWorkerId = 'worker-123'
  const mockAmount = 1000

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('processPayment', () => {
    it('should update worker pending balance when payment is processed', async () => {
      const mockPaymentMethodDoc = {
        exists: () => true,
        id: 'pm-123',
        data: () => ({
          type: 'card',
          provider: 'payfast',
          isDefault: true,
          isVerified: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
      }

      const mockIntentDoc = {
        exists: () => true,
        data: () => ({
          gigId: mockGigId,
          employerId: mockEmployerId,
          workerId: mockWorkerId,
          amount: mockAmount,
          currency: 'ZAR',
          paymentMethodId: 'pm-123',
          type: 'fixed',
          status: 'created'
        })
      }

      const mockGig = {
        id: mockGigId,
        title: 'Test Gig',
        budget: mockAmount,
        employerId: mockEmployerId
      }

      ;(getDoc as jest.Mock).mockImplementation((docRef: any) => {
        if (docRef === 'intent-doc') return Promise.resolve(mockIntentDoc)
        if (docRef === 'pm-doc') return Promise.resolve(mockPaymentMethodDoc)
        return Promise.resolve({ exists: () => false })
      })

      ;(doc as jest.Mock).mockImplementation((db: any, collection: string, id: string) => {
        if (collection === 'paymentIntents') return 'intent-doc'
        if (collection === 'paymentMethods') return 'pm-doc'
        return `${collection}-${id}`
      })

      ;(addDoc as jest.Mock).mockResolvedValue({ id: 'payment-123' })
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(GigService.getGigById as jest.Mock).mockResolvedValue(mockGig)
      ;(WalletService.updatePendingBalance as jest.Mock).mockResolvedValue(undefined)

      await PaymentService.processPayment('intent-123')

      expect(WalletService.updatePendingBalance).toHaveBeenCalledWith(mockWorkerId, mockAmount)
    })

    it('should handle errors when updating pending balance fails', async () => {
      const mockPaymentMethodDoc = {
        exists: () => true,
        id: 'pm-123',
        data: () => ({
          type: 'card',
          provider: 'payfast',
          isDefault: true,
          isVerified: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
      }

      const mockIntentDoc = {
        exists: () => true,
        data: () => ({
          gigId: mockGigId,
          employerId: mockEmployerId,
          workerId: mockWorkerId,
          amount: mockAmount,
          currency: 'ZAR',
          paymentMethodId: 'pm-123',
          type: 'fixed',
          status: 'created'
        })
      }

      ;(getDoc as jest.Mock).mockImplementation((docRef: any) => {
        if (docRef === 'intent-doc') return Promise.resolve(mockIntentDoc)
        if (docRef === 'pm-doc') return Promise.resolve(mockPaymentMethodDoc)
        return Promise.resolve({ exists: () => false })
      })

      ;(doc as jest.Mock).mockImplementation((db: any, collection: string, id: string) => {
        if (collection === 'paymentIntents') return 'intent-doc'
        if (collection === 'paymentMethods') return 'pm-doc'
        return `${collection}-${id}`
      })

      ;(addDoc as jest.Mock).mockResolvedValue({ id: 'payment-123' })
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(GigService.getGigById as jest.Mock).mockResolvedValue({ id: mockGigId, title: 'Test Gig' })
      ;(WalletService.updatePendingBalance as jest.Mock).mockRejectedValue(new Error('Wallet update failed'))

      await expect(PaymentService.processPayment('intent-123')).rejects.toThrow('Failed to process payment')
    })
  })

  describe('releaseEscrow', () => {
    it('should move funds from pending to wallet when escrow is released', async () => {
      const mockPaymentDoc = {
        exists: () => true,
        data: () => ({
          gigId: mockGigId,
          employerId: mockEmployerId,
          workerId: mockWorkerId,
          amount: mockAmount,
          status: 'processing',
          escrowStatus: 'funded'
        })
      }

      ;(getDoc as jest.Mock).mockResolvedValue(mockPaymentDoc)
      ;(doc as jest.Mock).mockReturnValue('payment-doc')
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(addDoc as jest.Mock).mockResolvedValue({ id: 'history-123' })
      ;(GigService.getGigById as jest.Mock).mockResolvedValue({ id: mockGigId, title: 'Test Gig' })
      ;(WalletService.movePendingToWallet as jest.Mock).mockResolvedValue(undefined)

      await PaymentService.releaseEscrow('payment-123')

      expect(WalletService.movePendingToWallet).toHaveBeenCalledWith(mockWorkerId, mockAmount)
    })

    it('should handle partial escrow release', async () => {
      const releaseAmount = 500
      const mockPaymentDoc = {
        exists: () => true,
        data: () => ({
          gigId: mockGigId,
          employerId: mockEmployerId,
          workerId: mockWorkerId,
          amount: mockAmount,
          status: 'processing',
          escrowStatus: 'funded'
        })
      }

      ;(getDoc as jest.Mock).mockResolvedValue(mockPaymentDoc)
      ;(doc as jest.Mock).mockReturnValue('payment-doc')
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(addDoc as jest.Mock).mockResolvedValue({ id: 'history-123' })
      ;(GigService.getGigById as jest.Mock).mockResolvedValue({ id: mockGigId, title: 'Test Gig' })
      ;(WalletService.movePendingToWallet as jest.Mock).mockResolvedValue(undefined)

      await PaymentService.releaseEscrow('payment-123', releaseAmount)

      expect(WalletService.movePendingToWallet).toHaveBeenCalledWith(mockWorkerId, releaseAmount)
    })

    it('should handle errors when payment not found', async () => {
      ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => false })
      ;(doc as jest.Mock).mockReturnValue('payment-doc')

      await expect(PaymentService.releaseEscrow('payment-999')).rejects.toThrow('Payment not found')
    })

    it('should handle errors when moving funds fails', async () => {
      const mockPaymentDoc = {
        exists: () => true,
        data: () => ({
          gigId: mockGigId,
          employerId: mockEmployerId,
          workerId: mockWorkerId,
          amount: mockAmount,
          status: 'processing',
          escrowStatus: 'funded'
        })
      }

      ;(getDoc as jest.Mock).mockResolvedValue(mockPaymentDoc)
      ;(doc as jest.Mock).mockReturnValue('payment-doc')
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(addDoc as jest.Mock).mockResolvedValue({ id: 'history-123' })
      ;(GigService.getGigById as jest.Mock).mockResolvedValue({ id: mockGigId, title: 'Test Gig' })
      ;(WalletService.movePendingToWallet as jest.Mock).mockRejectedValue(new Error('Wallet update failed'))

      await expect(PaymentService.releaseEscrow('payment-123')).rejects.toThrow('Wallet update failed')
    })
  })

  describe('Escrow Integration: processPayment → releaseEscrow', () => {
    it('should correctly update pendingBalance when payment processed, then move to wallet when escrow released', async () => {
      // SETUP: Mock for processPayment
      const mockPaymentMethodDoc = {
        exists: () => true,
        id: 'pm-123',
        data: () => ({
          type: 'card',
          provider: 'payfast',
          isDefault: true,
          isVerified: true
        })
      }

      const mockIntentDoc = {
        exists: () => true,
        data: () => ({
          gigId: mockGigId,
          employerId: mockEmployerId,
          workerId: mockWorkerId,
          amount: mockAmount,
          currency: 'ZAR',
          paymentMethodId: 'pm-123',
          type: 'fixed',
          status: 'created'
        })
      }

      const mockGig = {
        id: mockGigId,
        title: 'Test Gig',
        budget: mockAmount,
        employerId: mockEmployerId
      }

      // Setup mocks for processPayment
      ;(getDoc as jest.Mock)
        .mockResolvedValueOnce(mockIntentDoc) // First call for payment intent
        .mockResolvedValueOnce(mockPaymentMethodDoc) // Second call for payment method
      ;(doc as jest.Mock).mockReturnValue('mock-doc-ref')
      ;(addDoc as jest.Mock).mockResolvedValue({ id: 'payment-123' })
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(GigService.getGigById as jest.Mock).mockResolvedValue(mockGig)
      ;(WalletService.updatePendingBalance as jest.Mock).mockResolvedValue(undefined)

      // STEP 1: Process payment (should add to pendingBalance)
      const payment = await PaymentService.processPayment('intent-123')

      expect(payment.id).toBe('payment-123')
      expect(WalletService.updatePendingBalance).toHaveBeenCalledWith(mockWorkerId, mockAmount)

      // STEP 2: Verify analytics shows pending balance
      ;(WalletService.getWalletBalance as jest.Mock).mockResolvedValue({
        walletBalance: 0,
        pendingBalance: mockAmount,
        totalEarnings: 0,
        totalWithdrawn: 0
      })
      ;(getDocs as jest.Mock).mockResolvedValue({ empty: false, docs: [] })

      const analyticsAfterPayment = await PaymentService.getUserPaymentAnalytics(mockWorkerId)
      expect(analyticsAfterPayment.pendingBalance).toBe(mockAmount)
      expect(analyticsAfterPayment.availableBalance).toBe(0)

      // STEP 3: Release escrow (should move from pending to wallet)
      const mockPaymentDoc = {
        exists: () => true,
        data: () => ({
          gigId: mockGigId,
          employerId: mockEmployerId,
          workerId: mockWorkerId,
          amount: mockAmount,
          status: 'processing',
          escrowStatus: 'funded'
        })
      }

      ;(getDoc as jest.Mock).mockResolvedValue(mockPaymentDoc)
      ;(WalletService.movePendingToWallet as jest.Mock).mockResolvedValue(undefined)

      await PaymentService.releaseEscrow('payment-123')

      expect(WalletService.movePendingToWallet).toHaveBeenCalledWith(mockWorkerId, mockAmount)

      // STEP 4: Verify analytics shows correct balances after escrow release
      ;(WalletService.getWalletBalance as jest.Mock).mockResolvedValue({
        walletBalance: mockAmount,
        pendingBalance: 0,
        totalEarnings: mockAmount,
        totalWithdrawn: 0
      })

      const analyticsAfterRelease = await PaymentService.getUserPaymentAnalytics(mockWorkerId)
      expect(analyticsAfterRelease.availableBalance).toBe(mockAmount)
      expect(analyticsAfterRelease.pendingBalance).toBe(0)
      expect(analyticsAfterRelease.totalEarnings).toBe(mockAmount)
    })
  })

  describe('requestWithdrawal', () => {
    it('should use atomic transaction to debit wallet when requesting withdrawal', async () => {
      ;(getDocs as jest.Mock).mockResolvedValue({ size: 0, docs: [] }) // No recent withdrawals
      ;(WalletService.debitWalletAtomic as jest.Mock).mockResolvedValue(undefined)
      ;(addDoc as jest.Mock).mockResolvedValue({ id: 'withdrawal-123' })

      await PaymentService.requestWithdrawal(mockWorkerId, 500, 'pm-123')

      expect(WalletService.debitWalletAtomic).toHaveBeenCalledWith(mockWorkerId, 500)
    })

    it('should reject withdrawal if balance is insufficient (atomic check)', async () => {
      ;(getDocs as jest.Mock).mockResolvedValue({ size: 0, docs: [] }) // No recent withdrawals
      ;(WalletService.debitWalletAtomic as jest.Mock).mockRejectedValue(new Error('Insufficient balance'))

      await expect(PaymentService.requestWithdrawal(mockWorkerId, 500, 'pm-123')).rejects.toThrow('Insufficient balance')

      expect(addDoc).not.toHaveBeenCalled()
    })

    it('should prevent race condition with concurrent withdrawals (atomic transaction)', async () => {
      // Simulate race condition: Two concurrent requests for R600 each with R1000 balance
      // Only first should succeed, second should fail

      let callCount = 0
      ;(getDocs as jest.Mock).mockResolvedValue({ size: 0, docs: [] }) // No recent withdrawals
      ;(WalletService.debitWalletAtomic as jest.Mock).mockImplementation(async (userId: string, amount: number) => {
        callCount++
        if (callCount === 1) {
          // First withdrawal succeeds
          return Promise.resolve()
        } else {
          // Second withdrawal fails - balance already depleted
          return Promise.reject(new Error('Insufficient balance'))
        }
      })
      ;(addDoc as jest.Mock).mockResolvedValue({ id: 'withdrawal-123' })

      // First withdrawal succeeds
      await expect(PaymentService.requestWithdrawal(mockWorkerId, 600, 'pm-123')).resolves.toBeDefined()

      // Second concurrent withdrawal fails (atomic check prevents overdraft)
      await expect(PaymentService.requestWithdrawal(mockWorkerId, 600, 'pm-123')).rejects.toThrow('Insufficient balance')

      // Verify atomic method was called twice
      expect(WalletService.debitWalletAtomic).toHaveBeenCalledTimes(2)
    })

    it('should reject withdrawal if rate limit exceeded (3 requests in 24 hours)', async () => {
      // Mock 3 recent withdrawals in last 24 hours
      ;(getDocs as jest.Mock).mockResolvedValue({ size: 3, docs: [] })

      await expect(PaymentService.requestWithdrawal(mockWorkerId, 500, 'pm-123'))
        .rejects.toThrow('Withdrawal limit exceeded. You can only request 3 withdrawals per 24 hours.')

      // Should not debit wallet if rate limit exceeded
      expect(WalletService.debitWalletAtomic).not.toHaveBeenCalled()
      expect(addDoc).not.toHaveBeenCalled()
    })

    it('should reject withdrawal if amount exceeds maximum (R50,000)', async () => {
      ;(getDocs as jest.Mock).mockResolvedValue({ size: 0, docs: [] })

      await expect(PaymentService.requestWithdrawal(mockWorkerId, 51000, 'pm-123'))
        .rejects.toThrow('Maximum withdrawal amount is')

      expect(WalletService.debitWalletAtomic).not.toHaveBeenCalled()
      expect(addDoc).not.toHaveBeenCalled()
    })

    it('should reject withdrawal if amount below minimum (R50)', async () => {
      ;(getDocs as jest.Mock).mockResolvedValue({ size: 0, docs: [] })

      await expect(PaymentService.requestWithdrawal(mockWorkerId, 30, 'pm-123'))
        .rejects.toThrow('Minimum withdrawal amount is R50.')

      expect(WalletService.debitWalletAtomic).not.toHaveBeenCalled()
      expect(addDoc).not.toHaveBeenCalled()
    })

    it('should allow withdrawal if under rate limit', async () => {
      // Mock 2 recent withdrawals (under limit of 3)
      ;(getDocs as jest.Mock).mockResolvedValue({ size: 2, docs: [] })
      ;(WalletService.debitWalletAtomic as jest.Mock).mockResolvedValue(undefined)
      ;(addDoc as jest.Mock).mockResolvedValue({ id: 'withdrawal-123' })

      await expect(PaymentService.requestWithdrawal(mockWorkerId, 500, 'pm-123')).resolves.toBeDefined()

      expect(WalletService.debitWalletAtomic).toHaveBeenCalledWith(mockWorkerId, 500)
      expect(addDoc).toHaveBeenCalled()
    })

    it('should allow withdrawal at exactly maximum amount (R50,000)', async () => {
      ;(getDocs as jest.Mock).mockResolvedValue({ size: 0, docs: [] })
      ;(WalletService.debitWalletAtomic as jest.Mock).mockResolvedValue(undefined)
      ;(addDoc as jest.Mock).mockResolvedValue({ id: 'withdrawal-123' })

      await expect(PaymentService.requestWithdrawal(mockWorkerId, 50000, 'pm-123')).resolves.toBeDefined()

      expect(WalletService.debitWalletAtomic).toHaveBeenCalledWith(mockWorkerId, 50000)
    })

    it('should allow withdrawal at exactly minimum amount (R50)', async () => {
      ;(getDocs as jest.Mock).mockResolvedValue({ size: 0, docs: [] })
      ;(WalletService.debitWalletAtomic as jest.Mock).mockResolvedValue(undefined)
      ;(addDoc as jest.Mock).mockResolvedValue({ id: 'withdrawal-123' })

      await expect(PaymentService.requestWithdrawal(mockWorkerId, 50, 'pm-123')).resolves.toBeDefined()

      expect(WalletService.debitWalletAtomic).toHaveBeenCalledWith(mockWorkerId, 50)
    })
  })

  describe('updateWithdrawalStatus', () => {
    it('should not debit wallet when withdrawal is completed (already debited on request)', async () => {
      const mockWithdrawalDoc = {
        exists: () => true,
        data: () => ({
          userId: mockWorkerId,
          amount: 500,
          currency: 'ZAR',
          status: 'processing',
          paymentMethodId: 'pm-123'
        })
      }

      ;(getDoc as jest.Mock).mockResolvedValue(mockWithdrawalDoc)
      ;(doc as jest.Mock).mockReturnValue('withdrawal-doc')
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(addDoc as jest.Mock).mockResolvedValue({ id: 'history-123' })

      await PaymentService.updateWithdrawalStatus('withdrawal-123', 'completed')

      // Wallet should NOT be debited since it was already debited when request was created
      expect(WalletService.debitWallet).not.toHaveBeenCalled()
    })

    it('should refund wallet when withdrawal fails', async () => {
      const mockWithdrawalDoc = {
        exists: () => true,
        data: () => ({
          userId: mockWorkerId,
          amount: 500,
          currency: 'ZAR',
          status: 'processing',
          paymentMethodId: 'pm-123'
        })
      }

      ;(getDoc as jest.Mock).mockResolvedValue(mockWithdrawalDoc)
      ;(doc as jest.Mock).mockReturnValue('withdrawal-doc')
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(addDoc as jest.Mock).mockResolvedValue({ id: 'history-123' })
      ;(WalletService.creditWallet as jest.Mock).mockResolvedValue(undefined)

      await PaymentService.updateWithdrawalStatus('withdrawal-123', 'failed', 'Bank transfer failed')

      // Wallet should be credited (refunded) since withdrawal failed
      expect(WalletService.creditWallet).toHaveBeenCalledWith(mockWorkerId, 500)
    })

    it('should refund wallet when withdrawal is rejected by admin', async () => {
      const mockWithdrawalDoc = {
        exists: () => true,
        data: () => ({
          userId: mockWorkerId,
          amount: 500,
          currency: 'ZAR',
          status: 'pending',
          paymentMethodId: 'pm-123'
        })
      }

      ;(getDoc as jest.Mock).mockResolvedValue(mockWithdrawalDoc)
      ;(doc as jest.Mock).mockReturnValue('withdrawal-doc')
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(addDoc as jest.Mock).mockResolvedValue({ id: 'history-123' })
      ;(WalletService.creditWallet as jest.Mock).mockResolvedValue(undefined)

      // Use 'failed' status with failureReason to indicate admin rejection
      await PaymentService.updateWithdrawalStatus('withdrawal-123', 'failed', 'Admin rejected: insufficient documentation')

      // Wallet should be credited (refunded) since withdrawal was rejected
      expect(WalletService.creditWallet).toHaveBeenCalledWith(mockWorkerId, 500)
    })

    it('should not debit wallet when withdrawal is processing', async () => {
      const mockWithdrawalDoc = {
        exists: () => true,
        data: () => ({
          userId: mockWorkerId,
          amount: 500,
          currency: 'ZAR',
          status: 'pending',
          paymentMethodId: 'pm-123'
        })
      }

      ;(getDoc as jest.Mock).mockResolvedValue(mockWithdrawalDoc)
      ;(doc as jest.Mock).mockReturnValue('withdrawal-doc')
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

      await PaymentService.updateWithdrawalStatus('withdrawal-123', 'processing')

      expect(WalletService.debitWallet).not.toHaveBeenCalled()
    })

    it('should handle errors when withdrawal not found', async () => {
      ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => false })
      ;(doc as jest.Mock).mockReturnValue('withdrawal-doc')

      await expect(PaymentService.updateWithdrawalStatus('withdrawal-999', 'completed')).rejects.toThrow('Withdrawal request not found')
    })

    it('should handle errors when crediting wallet fails during refund', async () => {
      const mockWithdrawalDoc = {
        exists: () => true,
        data: () => ({
          userId: mockWorkerId,
          amount: 500,
          currency: 'ZAR',
          status: 'processing',
          paymentMethodId: 'pm-123'
        })
      }

      ;(getDoc as jest.Mock).mockResolvedValue(mockWithdrawalDoc)
      ;(doc as jest.Mock).mockReturnValue('withdrawal-doc')
      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(addDoc as jest.Mock).mockResolvedValue({ id: 'history-123' })
      ;(WalletService.creditWallet as jest.Mock).mockRejectedValue(new Error('Wallet update failed'))

      await expect(PaymentService.updateWithdrawalStatus('withdrawal-123', 'failed', 'Bank transfer failed')).rejects.toThrow('Wallet update failed')
    })
  })

  describe('getUserPaymentAnalytics', () => {
    it('should fetch real wallet balance from user document', async () => {
      const mockWalletBalance = {
        walletBalance: 500,
        pendingBalance: 200,
        totalEarnings: 1000,
        totalWithdrawn: 300
      }

      ;(WalletService.getWalletBalance as jest.Mock).mockResolvedValue(mockWalletBalance)
      ;(getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: []
      })

      const analytics = await PaymentService.getUserPaymentAnalytics(mockWorkerId)

      expect(WalletService.getWalletBalance).toHaveBeenCalledWith(mockWorkerId)
      expect(analytics.availableBalance).toBe(500)
      expect(analytics.pendingBalance).toBe(200)
      expect(analytics.totalEarnings).toBe(1000)
      expect(analytics.totalWithdrawn).toBe(300)
    })

    it('should reflect updated balance after withdrawal', async () => {
      const initialBalance = {
        walletBalance: 1000,
        pendingBalance: 0,
        totalEarnings: 1000,
        totalWithdrawn: 0
      }

      const balanceAfterWithdrawal = {
        walletBalance: 500, // 1000 - 500 withdrawn
        pendingBalance: 0,
        totalEarnings: 1000,
        totalWithdrawn: 500
      }

      // Initial analytics
      ;(WalletService.getWalletBalance as jest.Mock).mockResolvedValueOnce(initialBalance)
      ;(getDocs as jest.Mock).mockResolvedValue({ empty: false, docs: [], size: 0 })

      const analyticsBeforeWithdrawal = await PaymentService.getUserPaymentAnalytics(mockWorkerId)
      expect(analyticsBeforeWithdrawal.availableBalance).toBe(1000)
      expect(analyticsBeforeWithdrawal.totalWithdrawn).toBe(0)

      // Simulate withdrawal (uses atomic method now)
      ;(getDocs as jest.Mock).mockResolvedValue({ size: 0, docs: [] }) // No recent withdrawals for rate limit check
      ;(WalletService.debitWalletAtomic as jest.Mock).mockResolvedValue(undefined)
      ;(addDoc as jest.Mock).mockResolvedValue({ id: 'withdrawal-123' })
      await PaymentService.requestWithdrawal(mockWorkerId, 500, 'pm-123')

      // Analytics after withdrawal should show updated balance
      ;(WalletService.getWalletBalance as jest.Mock).mockResolvedValueOnce(balanceAfterWithdrawal)
      const analyticsAfterWithdrawal = await PaymentService.getUserPaymentAnalytics(mockWorkerId)

      expect(analyticsAfterWithdrawal.availableBalance).toBe(500)
      expect(analyticsAfterWithdrawal.totalWithdrawn).toBe(500)
    })

    it('should return zero balances when wallet not initialized', async () => {
      ;(WalletService.getWalletBalance as jest.Mock).mockResolvedValue({
        walletBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0
      })
      ;(getDocs as jest.Mock).mockResolvedValue({ empty: false, docs: [] })

      const analytics = await PaymentService.getUserPaymentAnalytics(mockWorkerId)

      expect(analytics.availableBalance).toBe(0)
      expect(analytics.pendingBalance).toBe(0)
      expect(analytics.totalEarnings).toBe(0)
      expect(analytics.totalWithdrawn).toBe(0)
    })
  })
})
