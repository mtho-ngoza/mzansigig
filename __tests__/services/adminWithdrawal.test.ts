/**
 * Tests for Admin Withdrawal Approval Service Methods
 */

import { PaymentService } from '@/lib/services/paymentService'
import { WalletService } from '@/lib/services/walletService'

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {}
}))

// Mock WalletService
jest.mock('@/lib/services/walletService')

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({ _type: 'collection' })),
  doc: jest.fn(() => ({ _type: 'doc' })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(() => ({ _type: 'query' })),
  where: jest.fn(),
  orderBy: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date('2024-01-15T10:00:00Z') })),
    fromDate: jest.fn((date) => date)
  }
}))

describe('PaymentService - Admin Withdrawal Approval', () => {
  const mockAdminId = 'admin-123'
  const mockWorkerId = 'worker-456'
  const mockWithdrawalId = 'withdrawal-789'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getWithdrawalRequests', () => {
    it('should fetch all withdrawal requests without filter', async () => {
      const { getDocs } = require('firebase/firestore')
      getDocs.mockResolvedValue({
        docs: [
          {
            id: 'w1',
            data: () => ({
              userId: 'user-1',
              amount: 500,
              status: 'pending',
              requestedAt: { toDate: () => new Date('2024-01-15T09:00:00Z') }
            })
          },
          {
            id: 'w2',
            data: () => ({
              userId: 'user-2',
              amount: 1000,
              status: 'completed',
              requestedAt: { toDate: () => new Date('2024-01-14T09:00:00Z') },
              completedAt: { toDate: () => new Date('2024-01-14T10:00:00Z') }
            })
          }
        ]
      })

      const result = await PaymentService.getWithdrawalRequests()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('w1')
      expect(result[0].status).toBe('pending')
      expect(result[1].id).toBe('w2')
      expect(result[1].status).toBe('completed')
    })

    it('should fetch withdrawal requests filtered by status', async () => {
      const { getDocs } = require('firebase/firestore')
      getDocs.mockResolvedValue({
        docs: [
          {
            id: 'w1',
            data: () => ({
              userId: 'user-1',
              amount: 500,
              status: 'pending',
              requestedAt: { toDate: () => new Date('2024-01-15T09:00:00Z') }
            })
          }
        ]
      })

      const result = await PaymentService.getWithdrawalRequests('pending')

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('pending')
    })

    it('should throw error if fetch fails', async () => {
      const { getDocs } = require('firebase/firestore')
      getDocs.mockRejectedValue(new Error('Firestore error'))

      await expect(PaymentService.getWithdrawalRequests()).rejects.toThrow(
        'Failed to fetch withdrawal requests'
      )
    })
  })

  describe('approveWithdrawal', () => {
    it('should approve pending withdrawal', async () => {
      const { getDoc, updateDoc } = require('firebase/firestore')

      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          userId: mockWorkerId,
          amount: 500,
          status: 'pending',
          requestedAt: { toDate: () => new Date('2024-01-15T09:00:00Z') }
        })
      })

      updateDoc.mockResolvedValue(undefined)

      // Mock addPaymentHistory (it's a static method)
      const addPaymentHistorySpy = jest.spyOn(PaymentService, 'addPaymentHistory').mockResolvedValue()

      await PaymentService.approveWithdrawal(mockWithdrawalId, mockAdminId)

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'completed',
          approvedBy: mockAdminId,
          adminNotes: 'Approved by admin - virtual deposit (Phase 1)',
          completedAt: expect.anything()
        })
      )

      expect(addPaymentHistorySpy).toHaveBeenCalledWith(
        mockWorkerId,
        'payments',
        -500,
        'completed',
        undefined,
        undefined,
        expect.stringContaining('Withdrawal approved')
      )

      addPaymentHistorySpy.mockRestore()
    })

    it('should throw error if withdrawal not found', async () => {
      const { getDoc } = require('firebase/firestore')

      getDoc.mockResolvedValue({
        exists: () => false
      })

      await expect(
        PaymentService.approveWithdrawal(mockWithdrawalId, mockAdminId)
      ).rejects.toThrow('Withdrawal request not found')
    })

    it('should throw error if withdrawal is not pending', async () => {
      const { getDoc } = require('firebase/firestore')

      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          userId: mockWorkerId,
          amount: 500,
          status: 'completed',
          requestedAt: { toDate: () => new Date('2024-01-15T09:00:00Z') }
        })
      })

      await expect(
        PaymentService.approveWithdrawal(mockWithdrawalId, mockAdminId)
      ).rejects.toThrow('Cannot approve withdrawal with status: completed')
    })

    it('should throw error if processing withdrawal is not pending', async () => {
      const { getDoc } = require('firebase/firestore')

      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          userId: mockWorkerId,
          amount: 500,
          status: 'processing',
          requestedAt: { toDate: () => new Date('2024-01-15T09:00:00Z') }
        })
      })

      await expect(
        PaymentService.approveWithdrawal(mockWithdrawalId, mockAdminId)
      ).rejects.toThrow('Cannot approve withdrawal with status: processing')
    })
  })

  describe('rejectWithdrawal', () => {
    const rejectionReason = 'Insufficient documentation'

    it('should reject pending withdrawal and refund balance', async () => {
      const { getDoc, updateDoc } = require('firebase/firestore')

      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          userId: mockWorkerId,
          amount: 500,
          status: 'pending',
          requestedAt: { toDate: () => new Date('2024-01-15T09:00:00Z') }
        })
      })

      updateDoc.mockResolvedValue(undefined)

      // Mock creditWallet
      const creditWalletSpy = jest.spyOn(WalletService, 'creditWallet').mockResolvedValue()

      // Mock addPaymentHistory
      const addPaymentHistorySpy = jest.spyOn(PaymentService, 'addPaymentHistory').mockResolvedValue()

      await PaymentService.rejectWithdrawal(mockWithdrawalId, mockAdminId, rejectionReason)

      // Should refund to wallet
      expect(creditWalletSpy).toHaveBeenCalledWith(mockWorkerId, 500)

      // Should update withdrawal status
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'failed',
          rejectedBy: mockAdminId,
          failureReason: `Admin rejected: ${rejectionReason}`,
          adminNotes: rejectionReason,
          completedAt: expect.anything()
        })
      )

      // Should add payment history
      expect(addPaymentHistorySpy).toHaveBeenCalledWith(
        mockWorkerId,
        'payments',
        500, // Positive (refund)
        'failed',
        undefined,
        undefined,
        expect.stringContaining('Withdrawal rejected')
      )

      creditWalletSpy.mockRestore()
      addPaymentHistorySpy.mockRestore()
    })

    it('should throw error if withdrawal not found', async () => {
      const { getDoc } = require('firebase/firestore')

      getDoc.mockResolvedValue({
        exists: () => false
      })

      await expect(
        PaymentService.rejectWithdrawal(mockWithdrawalId, mockAdminId, rejectionReason)
      ).rejects.toThrow('Withdrawal request not found')
    })

    it('should throw error if withdrawal is not pending', async () => {
      const { getDoc } = require('firebase/firestore')

      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          userId: mockWorkerId,
          amount: 500,
          status: 'completed',
          requestedAt: { toDate: () => new Date('2024-01-15T09:00:00Z') }
        })
      })

      await expect(
        PaymentService.rejectWithdrawal(mockWithdrawalId, mockAdminId, rejectionReason)
      ).rejects.toThrow('Cannot reject withdrawal with status: completed')
    })

    it('should throw error if withdrawal is already failed', async () => {
      const { getDoc } = require('firebase/firestore')

      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          userId: mockWorkerId,
          amount: 500,
          status: 'failed',
          requestedAt: { toDate: () => new Date('2024-01-15T09:00:00Z') }
        })
      })

      await expect(
        PaymentService.rejectWithdrawal(mockWithdrawalId, mockAdminId, rejectionReason)
      ).rejects.toThrow('Cannot reject withdrawal with status: failed')
    })
  })
})
