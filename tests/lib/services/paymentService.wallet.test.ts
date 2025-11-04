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
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  doc: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() }))
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

  describe('updateWithdrawalStatus', () => {
    it('should debit wallet when withdrawal is completed', async () => {
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
      ;(WalletService.debitWallet as jest.Mock).mockResolvedValue(undefined)

      await PaymentService.updateWithdrawalStatus('withdrawal-123', 'completed')

      expect(WalletService.debitWallet).toHaveBeenCalledWith(mockWorkerId, 500)
    })

    it('should not debit wallet when withdrawal fails', async () => {
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

      await PaymentService.updateWithdrawalStatus('withdrawal-123', 'failed', 'Insufficient funds')

      expect(WalletService.debitWallet).not.toHaveBeenCalled()
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

    it('should handle errors when debiting wallet fails', async () => {
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
      ;(WalletService.debitWallet as jest.Mock).mockRejectedValue(new Error('Insufficient balance'))

      await expect(PaymentService.updateWithdrawalStatus('withdrawal-123', 'completed')).rejects.toThrow('Insufficient balance')
    })
  })
})
