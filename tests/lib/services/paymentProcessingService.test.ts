/**
 * PaymentProcessingService Tests
 * Tests the shared payment processing logic used by both ITN and verify routes
 */

import { processSuccessfulPayment, ProcessPaymentParams } from '@/lib/services/paymentProcessingService'

// Mock Firebase Admin
const mockTransaction = {
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn()
}

const mockRunTransaction = jest.fn()
const mockGet = jest.fn()
const mockDoc = jest.fn()
const mockWhere = jest.fn()
const mockLimit = jest.fn()
const mockCollection = jest.fn()

jest.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdmin: () => ({
    firestore: () => ({
      collection: mockCollection,
      runTransaction: mockRunTransaction
    })
  })
}))

jest.mock('firebase-admin', () => ({
  firestore: {
    FieldValue: {
      serverTimestamp: () => 'SERVER_TIMESTAMP',
      increment: (amount: number) => ({ _increment: amount })
    }
  }
}))

describe('PaymentProcessingService', () => {
  const mockGigId = 'gig-123'
  const mockEmployerId = 'employer-456'
  const mockWorkerId = 'worker-789'
  const mockApplicationId = 'app-001'

  const defaultParams: ProcessPaymentParams = {
    gigId: mockGigId,
    employerId: mockEmployerId,
    amount: 1000,
    verifiedVia: 'sandbox-fallback'
  }

  const mockApplicationDoc = {
    id: mockApplicationId,
    ref: { update: jest.fn() },
    data: () => ({
      applicantId: mockWorkerId,
      proposedRate: 1500,
      status: 'accepted'
    })
  }

  const mockGigDoc = {
    exists: true,
    data: () => ({
      title: 'Test Gig',
      paymentType: 'fixed'
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup the chain: collection().doc().get() and collection().where().where().limit().get()
    mockCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'applications') {
        return {
          where: mockWhere.mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: mockLimit.mockReturnValue({
                get: mockGet
              })
            }),
            get: mockGet
          })
        }
      }
      if (collectionName === 'gigs') {
        return {
          doc: mockDoc.mockReturnValue({
            get: mockGet
          })
        }
      }
      if (collectionName === 'paymentIntents') {
        return {
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ empty: true })
            })
          })
        }
      }
      if (collectionName === 'users') {
        // For worker pending balance update
        return {
          doc: jest.fn().mockReturnValue({
            id: 'worker-doc-id'
          })
        }
      }
      // For escrowAccounts, walletTransactions, payments, paymentHistory
      return {
        doc: jest.fn().mockReturnValue({
          id: `${collectionName}-new-id`
        })
      }
    })

    // Default mock for runTransaction - execute the callback
    mockRunTransaction.mockImplementation(async (callback) => {
      await callback(mockTransaction)
    })
  })

  describe('processSuccessfulPayment', () => {
    it('should process payment successfully with accepted application', async () => {
      // First call: applications query (accepted)
      // Second call: gig doc
      mockGet
        .mockResolvedValueOnce({ empty: false, docs: [mockApplicationDoc], size: 1 })
        .mockResolvedValueOnce(mockGigDoc)

      mockTransaction.get.mockResolvedValue(mockGigDoc)

      const result = await processSuccessfulPayment(defaultParams)

      expect(result.success).toBe(true)
      expect(result.gigId).toBe(mockGigId)
      expect(result.workerId).toBe(mockWorkerId)
      expect(result.applicationId).toBe(mockApplicationId)
      expect(result.paidAmount).toBe(1500) // Uses proposedRate from application
    })

    it('should fail when no accepted application found', async () => {
      // No accepted application, then query all apps also returns empty
      mockGet
        .mockResolvedValueOnce({ empty: true, docs: [], size: 0 })
        .mockResolvedValueOnce({ empty: true, docs: [], size: 0 })

      const result = await processSuccessfulPayment(defaultParams)

      expect(result.success).toBe(false)
      expect(result.error).toContain('No accepted application found')
    })

    it('should fail when gig not found', async () => {
      mockGet
        .mockResolvedValueOnce({ empty: false, docs: [mockApplicationDoc], size: 1 })
        .mockResolvedValueOnce({ exists: false })

      const result = await processSuccessfulPayment(defaultParams)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should use amount from application proposedRate over params', async () => {
      const customAppDoc = {
        ...mockApplicationDoc,
        data: () => ({
          applicantId: mockWorkerId,
          proposedRate: 2500, // Different from params.amount
          status: 'accepted'
        })
      }

      mockGet
        .mockResolvedValueOnce({ empty: false, docs: [customAppDoc], size: 1 })
        .mockResolvedValueOnce(mockGigDoc)

      mockTransaction.get.mockResolvedValue(mockGigDoc)

      const result = await processSuccessfulPayment({
        ...defaultParams,
        amount: 1000 // Should be overridden
      })

      expect(result.success).toBe(true)
      expect(result.paidAmount).toBe(2500)
    })

    it('should return diagnostic info when application not found', async () => {
      const pendingApp = {
        id: 'pending-app',
        data: () => ({
          status: 'pending',
          applicantId: 'other-worker'
        })
      }

      mockGet
        .mockResolvedValueOnce({ empty: true, docs: [], size: 0 })
        .mockResolvedValueOnce({ empty: false, docs: [pendingApp], size: 1 })

      const result = await processSuccessfulPayment(defaultParams)

      expect(result.success).toBe(false)
      expect(result.error).toContain('pending')
    })
  })

  describe('Database operations', () => {
    it('should run transaction for atomic operations', async () => {
      mockGet
        .mockResolvedValueOnce({ empty: false, docs: [mockApplicationDoc], size: 1 })
        .mockResolvedValueOnce(mockGigDoc)

      mockTransaction.get.mockResolvedValue(mockGigDoc)

      await processSuccessfulPayment(defaultParams)

      expect(mockRunTransaction).toHaveBeenCalled()
    })

    it('should update gig status in transaction', async () => {
      mockGet
        .mockResolvedValueOnce({ empty: false, docs: [mockApplicationDoc], size: 1 })
        .mockResolvedValueOnce(mockGigDoc)

      mockTransaction.get.mockResolvedValue(mockGigDoc)

      await processSuccessfulPayment(defaultParams)

      expect(mockTransaction.update).toHaveBeenCalled()
    })

    it('should create escrow, wallet transaction, payment, and history records', async () => {
      mockGet
        .mockResolvedValueOnce({ empty: false, docs: [mockApplicationDoc], size: 1 })
        .mockResolvedValueOnce(mockGigDoc)

      mockTransaction.get.mockResolvedValue(mockGigDoc)

      await processSuccessfulPayment(defaultParams)

      // Should call set at least 5 times:
      // 1. escrow record
      // 2. wallet_transaction
      // 3. payment record
      // 4. employer payment_history
      // 5. worker payment_history
      expect(mockTransaction.set.mock.calls.length).toBeGreaterThanOrEqual(5)
    })

    it('should update worker pending balance in transaction', async () => {
      mockGet
        .mockResolvedValueOnce({ empty: false, docs: [mockApplicationDoc], size: 1 })
        .mockResolvedValueOnce(mockGigDoc)

      mockTransaction.get.mockResolvedValue(mockGigDoc)

      await processSuccessfulPayment(defaultParams)

      // Should call update for gig, application, worker, and possibly payment_intent
      // At minimum: gig update, application update, worker pending balance update
      expect(mockTransaction.update.mock.calls.length).toBeGreaterThanOrEqual(3)
    })

    it('should use correct camelCase collection names', async () => {
      const collectionCalls: string[] = []
      mockCollection.mockImplementation((collectionName: string) => {
        collectionCalls.push(collectionName)
        if (collectionName === 'applications') {
          return {
            where: mockWhere.mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: mockLimit.mockReturnValue({
                  get: mockGet
                })
              }),
              get: mockGet
            })
          }
        }
        if (collectionName === 'gigs') {
          return {
            doc: mockDoc.mockReturnValue({
              get: mockGet
            })
          }
        }
        if (collectionName === 'paymentIntents') {
          return {
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({ empty: true })
              })
            })
          }
        }
        if (collectionName === 'users') {
          return {
            doc: jest.fn().mockReturnValue({
              id: 'worker-doc-id'
            })
          }
        }
        return {
          doc: jest.fn().mockReturnValue({
            id: `${collectionName}-new-id`
          })
        }
      })

      mockGet
        .mockResolvedValueOnce({ empty: false, docs: [mockApplicationDoc], size: 1 })
        .mockResolvedValueOnce(mockGigDoc)

      mockTransaction.get.mockResolvedValue(mockGigDoc)

      await processSuccessfulPayment(defaultParams)

      // Verify correct collection names (camelCase convention)
      expect(collectionCalls).toContain('escrowAccounts')
      expect(collectionCalls).toContain('walletTransactions')
      expect(collectionCalls).toContain('paymentHistory')
    })

    it('should use paymentIntents collection when updating intent', async () => {
      const collectionCalls: string[] = []
      mockCollection.mockImplementation((collectionName: string) => {
        collectionCalls.push(collectionName)
        if (collectionName === 'applications') {
          return {
            where: mockWhere.mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: mockLimit.mockReturnValue({
                  get: mockGet
                })
              }),
              get: mockGet
            })
          }
        }
        if (collectionName === 'gigs') {
          return {
            doc: mockDoc.mockReturnValue({
              get: mockGet
            })
          }
        }
        if (collectionName === 'paymentIntents') {
          return {
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({
                  empty: false,
                  docs: [{ ref: { id: 'intent-123' } }]
                })
              })
            })
          }
        }
        if (collectionName === 'users') {
          return {
            doc: jest.fn().mockReturnValue({
              id: 'worker-doc-id'
            })
          }
        }
        return {
          doc: jest.fn().mockReturnValue({
            id: `${collectionName}-new-id`
          })
        }
      })

      mockGet
        .mockResolvedValueOnce({ empty: false, docs: [mockApplicationDoc], size: 1 })
        .mockResolvedValueOnce(mockGigDoc)

      mockTransaction.get.mockResolvedValue(mockGigDoc)

      // Call with a paymentId to trigger intent update
      await processSuccessfulPayment({
        ...defaultParams,
        paymentId: 'test-payment-id'
      })

      // Verify paymentIntents collection is used
      expect(collectionCalls).toContain('paymentIntents')
    })
  })

  describe('ITN vs Sandbox verification', () => {
    it('should handle sandbox-fallback verification', async () => {
      mockGet
        .mockResolvedValueOnce({ empty: false, docs: [mockApplicationDoc], size: 1 })
        .mockResolvedValueOnce(mockGigDoc)

      mockTransaction.get.mockResolvedValue(mockGigDoc)

      const result = await processSuccessfulPayment({
        ...defaultParams,
        verifiedVia: 'sandbox-fallback'
      })

      expect(result.success).toBe(true)
    })

    it('should handle ITN verification with transaction details', async () => {
      mockGet
        .mockResolvedValueOnce({ empty: false, docs: [mockApplicationDoc], size: 1 })
        .mockResolvedValueOnce(mockGigDoc)

      mockTransaction.get.mockResolvedValue(mockGigDoc)

      const result = await processSuccessfulPayment({
        ...defaultParams,
        verifiedVia: 'itn',
        transactionId: 'pf-12345',
        paymentId: 'gig-123-1234567890',
        grossAmount: 1600,
        fees: 100,
        merchantId: '10000100'
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Return values', () => {
    it('should return all expected fields on success', async () => {
      mockGet
        .mockResolvedValueOnce({ empty: false, docs: [mockApplicationDoc], size: 1 })
        .mockResolvedValueOnce(mockGigDoc)

      mockTransaction.get.mockResolvedValue(mockGigDoc)

      const result = await processSuccessfulPayment(defaultParams)

      expect(result).toHaveProperty('success', true)
      expect(result).toHaveProperty('gigId', mockGigId)
      expect(result).toHaveProperty('applicationId', mockApplicationId)
      expect(result).toHaveProperty('workerId', mockWorkerId)
      expect(result).toHaveProperty('paidAmount')
      expect(result).toHaveProperty('escrowId', mockGigId)
    })

    it('should return error details on failure', async () => {
      mockGet
        .mockResolvedValueOnce({ empty: true, docs: [], size: 0 })
        .mockResolvedValueOnce({ empty: true, docs: [], size: 0 })

      const result = await processSuccessfulPayment(defaultParams)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.gigId).toBe(mockGigId)
    })
  })
})
