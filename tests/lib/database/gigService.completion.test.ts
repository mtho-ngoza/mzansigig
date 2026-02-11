/**
 * GigService Completion Workflow Tests
 * Tests for worker-initiated completion, employer approval/dispute, and auto-release
 */

import { GigService } from '@/lib/database/gigService'
import { FirestoreService } from '@/lib/database/firestore'
import { PaymentService } from '@/lib/services/paymentService'
import { ConfigService } from '@/lib/database/configService'
import { Gig, GigApplication } from '@/types/gig'

// Mock document snapshot
const createMockDocSnapshot = (exists: boolean, data: Record<string, unknown> = {}) => ({
  exists: () => exists,
  data: () => data
})

// Mock transaction object
const mockTransaction = {
  update: jest.fn(),
  get: jest.fn().mockResolvedValue(createMockDocSnapshot(true, { pendingBalance: 1000, walletBalance: 0 })),
  set: jest.fn()
}

// Mock firebase/firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ id: 'mock-doc-ref' })),
  runTransaction: jest.fn((db, callback) => callback(mockTransaction)),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() }))
  },
  increment: jest.fn((value) => ({ _increment: value }))
}))

// Mock firebase db
jest.mock('@/lib/firebase', () => ({
  db: {}
}))

// Mock dependencies
jest.mock('@/lib/database/firestore')
jest.mock('@/lib/services/paymentService')
jest.mock('@/lib/database/configService')
jest.mock('@/lib/services/walletService', () => ({
  WalletService: {
    releaseEscrowWithCommissionInTransaction: jest.fn().mockResolvedValue(undefined),
    releaseEmployerEscrowInTransaction: jest.fn().mockResolvedValue(undefined)
  }
}))

describe('GigService - Completion Workflows', () => {
  const mockGigId = 'gig-123'
  const mockApplicationId = 'app-456'
  const mockWorkerId = 'worker-789'
  const mockEmployerId = 'employer-999'
  const mockPaymentId = 'payment-111'

  const mockGig: Gig = {
    id: mockGigId,
    title: 'Test Gig',
    description: 'Test description',
    category: 'Technology',
    location: 'Johannesburg',
    budget: 1000,
    duration: '1 week',
    skillsRequired: ['JavaScript'],
    employerId: mockEmployerId,
    employerName: 'Test Employer',
    status: 'in-progress',
    applicants: [],
    assignedTo: mockWorkerId,
    createdAt: new Date(),
    updatedAt: new Date(),
    workType: 'remote'
  }

  const mockApplication: GigApplication = {
    id: mockApplicationId,
    gigId: mockGigId,
    applicantId: mockWorkerId,
    applicantName: 'Test Worker',
    proposedRate: 1000,
    status: 'funded',
    paymentStatus: 'in_escrow',
    paymentId: mockPaymentId,
    createdAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockTransaction.update.mockClear()
    mockTransaction.get.mockClear()
    mockTransaction.set.mockClear()

    // Mock PaymentService transactional methods
    ;(PaymentService.getEscrowReleaseContext as jest.Mock).mockResolvedValue({
      paymentId: 'payment-111',
      paymentData: { amount: 1000, gigId: 'gig-123', workerId: 'worker-789' },
      feeBreakdown: { netAmountToWorker: 900, workerCommission: 100 },
      paymentHistoryDocs: []
    })
    ;(PaymentService.releaseEscrowInTransaction as jest.Mock).mockResolvedValue(undefined)

    // Mock ConfigService to return default values
    ;(ConfigService.getValue as jest.Mock).mockImplementation((key: string) => {
      const defaults: Record<string, number> = {
        escrowAutoReleaseDays: 7,
        safetyCheckIntervalHours: 2,
        gigExpiryTimeoutDays: 7,
        fundingTimeoutHours: 48,
        maxActiveApplicationsPerWorker: 20,
        distanceWarningThresholdKm: 50,
        reviewDeadlineDays: 30,
      }
      return Promise.resolve(defaults[key] || 0)
    })
  })

  describe('requestCompletionByWorker', () => {
    it('should successfully create completion request with 7-day auto-release', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      const beforeRequest = new Date()
      await GigService.requestCompletionByWorker(mockApplicationId, mockWorkerId)
      const afterRequest = new Date()

      expect(FirestoreService.getById).toHaveBeenCalledWith('applications', mockApplicationId)
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        expect.objectContaining({
          completionRequestedBy: 'worker',
          completionRequestedAt: expect.any(Date),
          completionAutoReleaseAt: expect.any(Date)
        })
      )

      // Verify auto-release is set to 7 days from now
      const updateCall = jest.mocked(FirestoreService.update).mock.calls[0][2]
      const autoReleaseDate = new Date(updateCall.completionAutoReleaseAt as Date)
      const requestDate = new Date(updateCall.completionRequestedAt as Date)
      const daysDifference = (autoReleaseDate.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24)

      expect(daysDifference).toBeCloseTo(7, 1)
      expect(requestDate.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime())
      expect(requestDate.getTime()).toBeLessThanOrEqual(afterRequest.getTime())
    })

    it('should reject if application not found', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(null)

      await expect(
        GigService.requestCompletionByWorker(mockApplicationId, mockWorkerId)
      ).rejects.toThrow('Application not found')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should reject if worker is not the assigned applicant', async () => {
      const differentWorker = 'different-worker-id'
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)

      await expect(
        GigService.requestCompletionByWorker(mockApplicationId, differentWorker)
      ).rejects.toThrow('Only the assigned worker can request completion')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should reject if application is not funded', async () => {
      const unfundedApplication: GigApplication = {
        ...mockApplication,
        status: 'accepted',
        paymentStatus: 'unpaid'
      }
      jest.mocked(FirestoreService.getById).mockResolvedValue(unfundedApplication)

      await expect(
        GigService.requestCompletionByWorker(mockApplicationId, mockWorkerId)
      ).rejects.toThrow('Only funded applications can request completion')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should reject if completion already requested', async () => {
      const alreadyRequestedApplication: GigApplication = {
        ...mockApplication,
        completionRequestedAt: new Date(),
        completionRequestedBy: 'worker',
        completionAutoReleaseAt: new Date()
      }
      jest.mocked(FirestoreService.getById).mockResolvedValue(alreadyRequestedApplication)

      await expect(
        GigService.requestCompletionByWorker(mockApplicationId, mockWorkerId)
      ).rejects.toThrow('Completion has already been requested for this application')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })
  })

  describe('approveCompletion', () => {
    const applicationWithCompletion: GigApplication = {
      ...mockApplication,
      completionRequestedAt: new Date(),
      completionRequestedBy: 'worker',
      completionAutoReleaseAt: new Date()
    }

    it('should successfully approve completion and release escrow', async () => {
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(applicationWithCompletion) // First call for application
        .mockResolvedValueOnce(mockGig) // Second call for gig

      await GigService.approveCompletion(mockApplicationId, mockEmployerId)

      // Verify transaction updates were called
      expect(mockTransaction.update).toHaveBeenCalled()

      // Verify escrow context fetched and released in transaction
      expect(PaymentService.getEscrowReleaseContext).toHaveBeenCalledWith(mockPaymentId)
      expect(PaymentService.releaseEscrowInTransaction).toHaveBeenCalled()
    })

    it('should increment worker completedGigs counter on approval', async () => {
      const { increment } = require('firebase/firestore')

      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(applicationWithCompletion)
        .mockResolvedValueOnce(mockGig)

      await GigService.approveCompletion(mockApplicationId, mockEmployerId)

      // Verify increment was called with 1
      expect(increment).toHaveBeenCalledWith(1)

      // Verify transaction.update was called for the worker document
      const updateCalls = mockTransaction.update.mock.calls
      const workerUpdateCall = updateCalls.find(call =>
        call[1] && call[1].completedGigs !== undefined
      )
      expect(workerUpdateCall).toBeDefined()
    })

    it('should reject if application not found', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(null)

      await expect(
        GigService.approveCompletion(mockApplicationId, mockEmployerId)
      ).rejects.toThrow('Application not found')

      expect(PaymentService.releaseEscrow).not.toHaveBeenCalled()
    })

    it('should reject if gig not found', async () => {
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(applicationWithCompletion)
        .mockResolvedValueOnce(null)

      await expect(
        GigService.approveCompletion(mockApplicationId, mockEmployerId)
      ).rejects.toThrow('Gig not found')

      expect(PaymentService.releaseEscrow).not.toHaveBeenCalled()
    })

    it('should reject if user is not the gig employer', async () => {
      const differentEmployer = 'different-employer-id'
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(applicationWithCompletion)
        .mockResolvedValueOnce(mockGig)

      await expect(
        GigService.approveCompletion(mockApplicationId, differentEmployer)
      ).rejects.toThrow('Only the gig employer can approve completion')

      expect(PaymentService.releaseEscrow).not.toHaveBeenCalled()
    })

    it('should reject if no completion request exists', async () => {
      const applicationWithoutCompletion: GigApplication = {
        ...mockApplication,
        completionRequestedAt: undefined
      }
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(applicationWithoutCompletion)
        .mockResolvedValueOnce(mockGig)

      await expect(
        GigService.approveCompletion(mockApplicationId, mockEmployerId)
      ).rejects.toThrow('No completion request found for this application')

      expect(PaymentService.releaseEscrow).not.toHaveBeenCalled()
    })

    it('should handle applications without payment gracefully', async () => {
      const applicationWithoutPayment: GigApplication = {
        ...applicationWithCompletion,
        paymentId: undefined
      }
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(applicationWithoutPayment)
        .mockResolvedValueOnce(mockGig)

      await GigService.approveCompletion(mockApplicationId, mockEmployerId)

      // Should still update statuses via transaction
      expect(mockTransaction.update).toHaveBeenCalled()

      // But should not attempt to release escrow
      expect(PaymentService.getEscrowReleaseContext).not.toHaveBeenCalled()
      expect(PaymentService.releaseEscrowInTransaction).not.toHaveBeenCalled()
    })

    it('should call releaseEscrowInTransaction with correct context when application has paymentId', async () => {
      // This test documents the CRITICAL requirement: paymentId must be saved to application
      // during funding for escrow to be released on completion
      const appWithPaymentId: GigApplication = {
        ...applicationWithCompletion,
        paymentId: 'specific-payment-id-123'
      }

      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(appWithPaymentId)
        .mockResolvedValueOnce(mockGig)

      await GigService.approveCompletion(mockApplicationId, mockEmployerId)

      // Verify escrow context is fetched with the exact paymentId from the application
      expect(PaymentService.getEscrowReleaseContext).toHaveBeenCalledWith('specific-payment-id-123')
      // Verify escrow is released within the transaction
      expect(PaymentService.releaseEscrowInTransaction).toHaveBeenCalledTimes(1)
    })

    it('should release escrow via WalletService when paymentId is missing but escrowAmount exists (TradeSafe)', async () => {
      // TradeSafe payments don't create payment records but do set escrowAmount on gig
      const appWithoutPaymentId: GigApplication = {
        ...applicationWithCompletion,
        paymentId: undefined,
        proposedRate: 1000
      }

      const gigWithEscrow: Gig = {
        ...mockGig,
        escrowAmount: 1000
      }

      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(appWithoutPaymentId)
        .mockResolvedValueOnce(gigWithEscrow)

      await GigService.approveCompletion(mockApplicationId, mockEmployerId)

      // Application and gig should be marked completed
      expect(mockTransaction.update).toHaveBeenCalled()

      // PaymentService should NOT be called (no paymentId)
      expect(PaymentService.getEscrowReleaseContext).not.toHaveBeenCalled()
      expect(PaymentService.releaseEscrowInTransaction).not.toHaveBeenCalled()

      // Wallet updates should happen via transaction.update (inlined for Firestore transaction rules)
      // We verify transaction.get was called to read worker/employer docs
      expect(mockTransaction.get).toHaveBeenCalled()
      // And transaction.update was called multiple times (app, gig, worker wallet, employer wallet)
      expect(mockTransaction.update.mock.calls.length).toBeGreaterThanOrEqual(4)
    })

    it('should NOT release escrow when both paymentId and escrowAmount are missing (unfunded/legacy)', async () => {
      // Legacy or unfunded apps have neither paymentId nor escrowAmount
      const appWithoutPaymentId: GigApplication = {
        ...applicationWithCompletion,
        paymentId: undefined,
        proposedRate: undefined,
        agreedRate: undefined
      }

      const gigWithoutEscrow: Gig = {
        ...mockGig,
        escrowAmount: undefined
      }

      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(appWithoutPaymentId)
        .mockResolvedValueOnce(gigWithoutEscrow)

      const { WalletService } = require('@/lib/services/walletService')
      WalletService.releaseEscrowWithCommissionInTransaction.mockClear()
      WalletService.releaseEmployerEscrowInTransaction.mockClear()

      await GigService.approveCompletion(mockApplicationId, mockEmployerId)

      // Application and gig should still be marked completed
      expect(mockTransaction.update).toHaveBeenCalled()

      // No escrow release should be attempted
      expect(PaymentService.getEscrowReleaseContext).not.toHaveBeenCalled()
      expect(PaymentService.releaseEscrowInTransaction).not.toHaveBeenCalled()
      expect(WalletService.releaseEscrowWithCommissionInTransaction).not.toHaveBeenCalled()
      expect(WalletService.releaseEmployerEscrowInTransaction).not.toHaveBeenCalled()
    })
  })

  describe('disputeCompletion', () => {
    const applicationWithCompletion: GigApplication = {
      ...mockApplication,
      completionRequestedAt: new Date(),
      completionRequestedBy: 'worker',
      completionAutoReleaseAt: new Date()
    }

    const validDisputeReason = 'Work was not completed as specified in the requirements. Multiple bugs remain unfixed.'

    it('should successfully dispute completion with valid reason', async () => {
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(applicationWithCompletion)
        .mockResolvedValueOnce(mockGig)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      const beforeDispute = new Date()
      await GigService.disputeCompletion(mockApplicationId, mockEmployerId, validDisputeReason)
      const afterDispute = new Date()

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        expect.objectContaining({
          completionDisputedAt: expect.any(Date),
          completionDisputeReason: validDisputeReason,
          completionAutoReleaseAt: undefined // Auto-release should be removed
        })
      )

      // Verify dispute date is recent
      const updateCall = jest.mocked(FirestoreService.update).mock.calls[0][2]
      const disputeDate = new Date(updateCall.completionDisputedAt as Date)
      expect(disputeDate.getTime()).toBeGreaterThanOrEqual(beforeDispute.getTime())
      expect(disputeDate.getTime()).toBeLessThanOrEqual(afterDispute.getTime())
    })

    it('should reject if application not found', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(null)

      await expect(
        GigService.disputeCompletion(mockApplicationId, mockEmployerId, validDisputeReason)
      ).rejects.toThrow('Application not found')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should reject if gig not found', async () => {
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(applicationWithCompletion)
        .mockResolvedValueOnce(null)

      await expect(
        GigService.disputeCompletion(mockApplicationId, mockEmployerId, validDisputeReason)
      ).rejects.toThrow('Gig not found')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should reject if user is not the gig employer', async () => {
      const differentEmployer = 'different-employer-id'
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(applicationWithCompletion)
        .mockResolvedValueOnce(mockGig)

      await expect(
        GigService.disputeCompletion(mockApplicationId, differentEmployer, validDisputeReason)
      ).rejects.toThrow('Only the gig employer can dispute completion')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should reject if no completion request exists', async () => {
      const applicationWithoutCompletion: GigApplication = {
        ...mockApplication,
        completionRequestedAt: undefined
      }
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(applicationWithoutCompletion)
        .mockResolvedValueOnce(mockGig)

      await expect(
        GigService.disputeCompletion(mockApplicationId, mockEmployerId, validDisputeReason)
      ).rejects.toThrow('No completion request found for this application')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should reject if completion already disputed', async () => {
      const alreadyDisputedApplication: GigApplication = {
        ...applicationWithCompletion,
        completionDisputedAt: new Date(),
        completionDisputeReason: 'Previous dispute reason'
      }
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(alreadyDisputedApplication)
        .mockResolvedValueOnce(mockGig)

      await expect(
        GigService.disputeCompletion(mockApplicationId, mockEmployerId, validDisputeReason)
      ).rejects.toThrow('Completion has already been disputed')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should reject if dispute reason is too short', async () => {
      const shortReason = 'Too short'
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(applicationWithCompletion)
        .mockResolvedValueOnce(mockGig)

      await expect(
        GigService.disputeCompletion(mockApplicationId, mockEmployerId, shortReason)
      ).rejects.toThrow('Dispute reason must be at least 10 characters')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should reject if dispute reason is empty or whitespace', async () => {
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(applicationWithCompletion)
        .mockResolvedValueOnce(mockGig)

      await expect(
        GigService.disputeCompletion(mockApplicationId, mockEmployerId, '   ')
      ).rejects.toThrow('Dispute reason must be at least 10 characters')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })
  })

  describe('checkAndProcessAutoRelease', () => {
    it('should auto-release escrow after 7 days if not disputed', async () => {
      const sevenDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago (expired)
      const autoReleaseDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago (expired)

      const expiredApplication: GigApplication = {
        ...mockApplication,
        completionRequestedAt: sevenDaysAgo,
        completionRequestedBy: 'worker',
        completionAutoReleaseAt: autoReleaseDate
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(expiredApplication)

      const result = await GigService.checkAndProcessAutoRelease(mockApplicationId)

      expect(result).toBe(true)

      // Verify updates happened via transaction
      expect(mockTransaction.update).toHaveBeenCalled()

      // Verify escrow context fetched and released
      expect(PaymentService.getEscrowReleaseContext).toHaveBeenCalledWith(mockPaymentId)
      expect(PaymentService.releaseEscrowInTransaction).toHaveBeenCalled()
    })

    it('should not auto-release if 7 days have not passed yet', async () => {
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      const sixDaysFromNow = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000) // Still 6 days remaining

      const pendingApplication: GigApplication = {
        ...mockApplication,
        completionRequestedAt: oneDayAgo,
        completionRequestedBy: 'worker',
        completionAutoReleaseAt: sixDaysFromNow
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(pendingApplication)

      const result = await GigService.checkAndProcessAutoRelease(mockApplicationId)

      expect(result).toBe(false)
      expect(mockTransaction.update).not.toHaveBeenCalled()
      expect(PaymentService.releaseEscrowInTransaction).not.toHaveBeenCalled()
    })

    it('should not auto-release if completion was disputed', async () => {
      const sevenDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      const autoReleaseDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // Expired but disputed

      const disputedApplication: GigApplication = {
        ...mockApplication,
        completionRequestedAt: sevenDaysAgo,
        completionRequestedBy: 'worker',
        completionAutoReleaseAt: autoReleaseDate,
        completionDisputedAt: new Date(),
        completionDisputeReason: 'Work not completed properly'
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(disputedApplication)

      const result = await GigService.checkAndProcessAutoRelease(mockApplicationId)

      expect(result).toBe(false)
      expect(mockTransaction.update).not.toHaveBeenCalled()
      expect(PaymentService.releaseEscrowInTransaction).not.toHaveBeenCalled()
    })

    it('should return false if application not found', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(null)

      const result = await GigService.checkAndProcessAutoRelease(mockApplicationId)

      expect(result).toBe(false)
      expect(FirestoreService.update).not.toHaveBeenCalled()
      expect(PaymentService.releaseEscrow).not.toHaveBeenCalled()
    })

    it('should return false if application status is not funded', async () => {
      const completedApplication: GigApplication = {
        ...mockApplication,
        status: 'completed',
        completionRequestedAt: new Date(),
        completionRequestedBy: 'worker',
        completionAutoReleaseAt: new Date()
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(completedApplication)

      const result = await GigService.checkAndProcessAutoRelease(mockApplicationId)

      expect(result).toBe(false)
      expect(FirestoreService.update).not.toHaveBeenCalled()
      expect(PaymentService.releaseEscrow).not.toHaveBeenCalled()
    })

    it('should return false if no completion request exists', async () => {
      const applicationWithoutCompletion: GigApplication = {
        ...mockApplication,
        completionRequestedAt: undefined
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(applicationWithoutCompletion)

      const result = await GigService.checkAndProcessAutoRelease(mockApplicationId)

      expect(result).toBe(false)
      expect(FirestoreService.update).not.toHaveBeenCalled()
      expect(PaymentService.releaseEscrow).not.toHaveBeenCalled()
    })

    it('should handle applications without payment gracefully during auto-release', async () => {
      const sevenDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      const autoReleaseDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)

      const applicationWithoutPayment: GigApplication = {
        ...mockApplication,
        paymentId: undefined,
        completionRequestedAt: sevenDaysAgo,
        completionRequestedBy: 'worker',
        completionAutoReleaseAt: autoReleaseDate
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(applicationWithoutPayment)

      const result = await GigService.checkAndProcessAutoRelease(mockApplicationId)

      expect(result).toBe(true)

      // Should still update statuses via transaction
      expect(mockTransaction.update).toHaveBeenCalled()

      // But should not attempt to release escrow
      expect(PaymentService.getEscrowReleaseContext).not.toHaveBeenCalled()
      expect(PaymentService.releaseEscrowInTransaction).not.toHaveBeenCalled()
    })
  })

  describe('getApplicationsEligibleForAutoRelease', () => {
    it('should return applications that are eligible for auto-release', async () => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 1 day ago
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 1 day from now

      const eligibleApp: GigApplication = {
        ...mockApplication,
        id: 'eligible-1',
        status: 'funded',
        completionRequestedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
        completionRequestedBy: 'worker',
        completionAutoReleaseAt: pastDate
      }

      const notEligibleFuture: GigApplication = {
        ...mockApplication,
        id: 'not-eligible-future',
        status: 'funded',
        completionRequestedAt: new Date(),
        completionRequestedBy: 'worker',
        completionAutoReleaseAt: futureDate
      }

      const notEligibleDisputed: GigApplication = {
        ...mockApplication,
        id: 'not-eligible-disputed',
        status: 'funded',
        completionRequestedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
        completionRequestedBy: 'worker',
        completionAutoReleaseAt: pastDate,
        completionDisputedAt: new Date()
      }

      const notEligibleStatus: GigApplication = {
        ...mockApplication,
        id: 'not-eligible-status',
        status: 'completed',
        completionRequestedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
        completionRequestedBy: 'worker',
        completionAutoReleaseAt: pastDate
      }

      jest.mocked(FirestoreService.getAll).mockResolvedValue([
        eligibleApp,
        notEligibleFuture,
        notEligibleDisputed,
        notEligibleStatus
      ])

      const result = await GigService.getApplicationsEligibleForAutoRelease()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('eligible-1')
    })

    it('should return empty array when no applications are eligible', async () => {
      jest.mocked(FirestoreService.getAll).mockResolvedValue([])

      const result = await GigService.getApplicationsEligibleForAutoRelease()

      expect(result).toHaveLength(0)
    })
  })

  describe('processAllAutoReleases', () => {
    it('should process all eligible applications and return results', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const eligibleApp1: GigApplication = {
        ...mockApplication,
        id: 'eligible-1',
        gigId: 'gig-1',
        status: 'funded',
        completionRequestedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        completionRequestedBy: 'worker',
        completionAutoReleaseAt: pastDate,
        paymentId: 'payment-1'
      }

      const eligibleApp2: GigApplication = {
        ...mockApplication,
        id: 'eligible-2',
        gigId: 'gig-2',
        status: 'funded',
        completionRequestedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        completionRequestedBy: 'worker',
        completionAutoReleaseAt: pastDate,
        paymentId: 'payment-2'
      }

      // Mock getAll for getApplicationsEligibleForAutoRelease
      jest.mocked(FirestoreService.getAll).mockResolvedValue([eligibleApp1, eligibleApp2])

      // Mock getById for checkAndProcessAutoRelease calls
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(eligibleApp1)
        .mockResolvedValueOnce(eligibleApp2)

      // Mock PaymentService for escrow context
      ;(PaymentService.getEscrowReleaseContext as jest.Mock)
        .mockResolvedValueOnce({
          paymentId: 'payment-1',
          paymentData: { amount: 1000, gigId: 'gig-1', workerId: 'worker-789' },
          feeBreakdown: { netAmountToWorker: 900, workerCommission: 100 },
          paymentHistoryDocs: []
        })
        .mockResolvedValueOnce({
          paymentId: 'payment-2',
          paymentData: { amount: 1000, gigId: 'gig-2', workerId: 'worker-789' },
          feeBreakdown: { netAmountToWorker: 900, workerCommission: 100 },
          paymentHistoryDocs: []
        })

      const result = await GigService.processAllAutoReleases()

      expect(result.processed).toBe(2)
      expect(result.succeeded).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(2)
      expect(result.results[0]).toEqual({ applicationId: 'eligible-1', success: true })
      expect(result.results[1]).toEqual({ applicationId: 'eligible-2', success: true })
    })

    it('should handle failures gracefully and continue processing', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const eligibleApp1: GigApplication = {
        ...mockApplication,
        id: 'eligible-1',
        status: 'funded',
        completionRequestedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        completionRequestedBy: 'worker',
        completionAutoReleaseAt: pastDate
      }

      const eligibleApp2: GigApplication = {
        ...mockApplication,
        id: 'eligible-2',
        status: 'funded',
        completionRequestedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        completionRequestedBy: 'worker',
        completionAutoReleaseAt: pastDate,
        paymentId: 'payment-2'
      }

      jest.mocked(FirestoreService.getAll).mockResolvedValue([eligibleApp1, eligibleApp2])

      // First app returns null (failure case)
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(null) // Will return false, not throw
        .mockResolvedValueOnce(eligibleApp2)

      // Mock PaymentService for escrow context (only second app has paymentId)
      ;(PaymentService.getEscrowReleaseContext as jest.Mock).mockResolvedValue({
        paymentId: 'payment-2',
        paymentData: { amount: 1000, gigId: 'gig-2', workerId: 'worker-789' },
        feeBreakdown: { netAmountToWorker: 900, workerCommission: 100 },
        paymentHistoryDocs: []
      })

      const result = await GigService.processAllAutoReleases()

      expect(result.processed).toBe(2)
      expect(result.succeeded).toBe(1) // Only second succeeded
      expect(result.failed).toBe(1) // First returned false
    })

    it('should return empty results when no applications are eligible', async () => {
      jest.mocked(FirestoreService.getAll).mockResolvedValue([])

      const result = await GigService.processAllAutoReleases()

      expect(result.processed).toBe(0)
      expect(result.succeeded).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(0)
    })
  })
})
