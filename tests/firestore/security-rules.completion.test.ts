/**
 * Firestore Security Rules Tests for Completion Requests
 *
 * These tests document the expected behavior for completion request permissions.
 * The rules allow:
 * 1. Workers to request completion on funded applications (update completionRequestedAt, etc.)
 * 2. Employers to approve/dispute completion requests
 *
 * NOTE: These are unit tests that verify the gigService behavior,
 * not actual Firestore emulator tests.
 */

import { GigService } from '@/lib/database/gigService'
import { FirestoreService } from '@/lib/database/firestore'
import { PaymentService } from '@/lib/services/paymentService'
import { ConfigService } from '@/lib/database/configService'
import { GigApplication } from '@/types/gig'

// Mock transaction object
const mockTransaction = {
  update: jest.fn(),
  get: jest.fn(),
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

jest.mock('@/lib/database/firestore')
jest.mock('@/lib/services/paymentService')
jest.mock('@/lib/database/configService')

describe('Firestore Security Rules - Completion Requests', () => {
  const mockWorkerId = 'worker-123'
  const mockEmployerId = 'employer-456'
  const mockApplicationId = 'app-789'
  const mockGigId = 'gig-101'

  const mockFundedApplication: GigApplication = {
    id: mockApplicationId,
    gigId: mockGigId,
    applicantId: mockWorkerId,
    applicantName: 'Test Worker',
    proposedRate: 1000,
    status: 'funded',
    paymentStatus: 'in_escrow',
    paymentId: 'payment-123',
    createdAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockTransaction.update.mockClear()
    mockTransaction.get.mockClear()
    mockTransaction.set.mockClear()

    jest.mocked(ConfigService.getValue).mockResolvedValue(7) // 7 days auto-release

    // Mock PaymentService transactional methods
    ;(PaymentService.getEscrowReleaseContext as jest.Mock).mockResolvedValue({
      paymentId: 'payment-123',
      paymentData: { amount: 1000, gigId: 'gig-101', workerId: 'worker-123' },
      feeBreakdown: { netAmountToWorker: 900, workerCommission: 100 },
      paymentHistoryDocs: []
    })
    ;(PaymentService.releaseEscrowInTransaction as jest.Mock).mockResolvedValue(undefined)
  })

  // Mock worker with bank details for completion requests
  const mockWorkerWithBankDetails = {
    id: mockWorkerId,
    bankDetails: {
      bankName: 'FNB',
      accountNumber: '1234567890',
      accountType: 'SAVINGS'
    }
  }

  describe('Worker Completion Request Permissions', () => {
    it('should allow worker to request completion on their funded application', async () => {
      // This tests the fix for: "Request Completion" Firestore permissions error
      // Workers need to update completionRequestedAt, completionRequestedBy, completionAutoReleaseAt
      // on applications where status = 'funded'

      jest.mocked(FirestoreService.getById).mockImplementation((collection: string) => {
        if (collection === 'applications') return Promise.resolve(mockFundedApplication)
        if (collection === 'users') return Promise.resolve(mockWorkerWithBankDetails)
        return Promise.resolve(null)
      })
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.requestCompletionByWorker(mockApplicationId, mockWorkerId)

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        expect.objectContaining({
          completionRequestedAt: expect.any(Date),
          completionRequestedBy: 'worker',
          completionAutoReleaseAt: expect.any(Date)
        })
      )
    })

    it('should NOT allow different worker to request completion', async () => {
      const differentWorkerId = 'different-worker-999'
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockFundedApplication)

      await expect(
        GigService.requestCompletionByWorker(mockApplicationId, differentWorkerId)
      ).rejects.toThrow('Only the assigned worker can request completion')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should NOT allow worker to request completion on pending applications', async () => {
      const pendingApplication: GigApplication = {
        ...mockFundedApplication,
        status: 'pending'
      }
      jest.mocked(FirestoreService.getById).mockResolvedValue(pendingApplication)

      await expect(
        GigService.requestCompletionByWorker(mockApplicationId, mockWorkerId)
      ).rejects.toThrow('Only funded applications can request completion')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should NOT allow worker to request completion on accepted (unfunded) applications', async () => {
      const acceptedApplication: GigApplication = {
        ...mockFundedApplication,
        status: 'accepted',
        paymentStatus: 'unpaid'
      }
      jest.mocked(FirestoreService.getById).mockResolvedValue(acceptedApplication)

      await expect(
        GigService.requestCompletionByWorker(mockApplicationId, mockWorkerId)
      ).rejects.toThrow('Only funded applications can request completion')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should NOT allow worker to request completion twice', async () => {
      const alreadyRequestedApplication: GigApplication = {
        ...mockFundedApplication,
        completionRequestedAt: new Date(),
        completionRequestedBy: 'worker'
      }
      jest.mocked(FirestoreService.getById).mockResolvedValue(alreadyRequestedApplication)

      await expect(
        GigService.requestCompletionByWorker(mockApplicationId, mockWorkerId)
      ).rejects.toThrow('Completion has already been requested for this application')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })
  })

  describe('Employer Completion Actions Permissions', () => {
    const mockGig = {
      id: mockGigId,
      employerId: mockEmployerId,
      status: 'in-progress'
    }

    const applicationWithCompletionRequest: GigApplication = {
      ...mockFundedApplication,
      completionRequestedAt: new Date(),
      completionRequestedBy: 'worker',
      completionAutoReleaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }

    it('should allow employer to approve completion', async () => {
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(applicationWithCompletionRequest)
        .mockResolvedValueOnce(mockGig)

      await GigService.approveCompletion(mockApplicationId, mockEmployerId)

      // Verify transaction updates were called
      expect(mockTransaction.update).toHaveBeenCalled()

      // Verify escrow was released in transaction
      expect(PaymentService.getEscrowReleaseContext).toHaveBeenCalled()
      expect(PaymentService.releaseEscrowInTransaction).toHaveBeenCalled()
    })

    it('should NOT allow different employer to approve completion', async () => {
      const differentEmployerId = 'different-employer-999'
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(applicationWithCompletionRequest)
        .mockResolvedValueOnce(mockGig)

      await expect(
        GigService.approveCompletion(mockApplicationId, differentEmployerId)
      ).rejects.toThrow('Only the gig employer can approve completion')

      expect(mockTransaction.update).not.toHaveBeenCalled()
    })

    it('should allow employer to dispute completion with valid reason', async () => {
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(applicationWithCompletionRequest)
        .mockResolvedValueOnce(mockGig)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.disputeCompletion(
        mockApplicationId,
        mockEmployerId,
        'Work was not completed as specified. Multiple issues remain unresolved.'
      )

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        expect.objectContaining({
          completionDisputedAt: expect.any(Date),
          completionDisputeReason: expect.any(String),
          completionAutoReleaseAt: undefined // Auto-release cancelled
        })
      )
    })

    it('should NOT allow employer to dispute without a valid reason', async () => {
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(applicationWithCompletionRequest)
        .mockResolvedValueOnce(mockGig)

      await expect(
        GigService.disputeCompletion(mockApplicationId, mockEmployerId, 'Too short')
      ).rejects.toThrow('Dispute reason must be at least 10 characters')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should NOT allow worker to approve completion (employer action only)', async () => {
      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(applicationWithCompletionRequest)
        .mockResolvedValueOnce(mockGig)

      await expect(
        GigService.approveCompletion(mockApplicationId, mockWorkerId) // Worker trying to approve
      ).rejects.toThrow('Only the gig employer can approve completion')
    })
  })

  describe('Auto-Release Protection', () => {
    it('should set 7-day auto-release window when worker requests completion', async () => {
      // Use a fresh application without completionRequestedAt
      const freshFundedApplication: GigApplication = {
        id: 'fresh-app-123',
        gigId: mockGigId,
        applicantId: mockWorkerId,
        applicantName: 'Test Worker',
        proposedRate: 1000,
        status: 'funded',
        paymentStatus: 'in_escrow',
        paymentId: 'payment-123',
        createdAt: new Date()
        // No completionRequestedAt - fresh application
      }

      jest.mocked(FirestoreService.getById).mockImplementation((collection: string) => {
        if (collection === 'applications') return Promise.resolve(freshFundedApplication)
        if (collection === 'users') return Promise.resolve(mockWorkerWithBankDetails)
        return Promise.resolve(null)
      })
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.requestCompletionByWorker('fresh-app-123', mockWorkerId)

      const updateCall = jest.mocked(FirestoreService.update).mock.calls[0][2]
      const requestDate = new Date(updateCall.completionRequestedAt as Date)
      const autoReleaseDate = new Date(updateCall.completionAutoReleaseAt as Date)

      const daysDifference = (autoReleaseDate.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24)
      expect(daysDifference).toBeCloseTo(7, 1)
    })

    it('should cancel auto-release when employer disputes', async () => {
      const applicationWithCompletionRequest: GigApplication = {
        ...mockFundedApplication,
        completionRequestedAt: new Date(),
        completionRequestedBy: 'worker',
        completionAutoReleaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
      const gigForDispute = { id: mockGigId, employerId: mockEmployerId, status: 'in-progress' }

      jest.mocked(FirestoreService.getById)
        .mockResolvedValueOnce(applicationWithCompletionRequest)
        .mockResolvedValueOnce(gigForDispute)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.disputeCompletion(
        mockApplicationId,
        mockEmployerId,
        'Work incomplete - bugs remain unfixed and requirements not met.'
      )

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        expect.objectContaining({
          completionAutoReleaseAt: undefined // Auto-release should be cancelled
        })
      )
    })
  })
})

/**
 * Firestore Rules Required for Completion Flow:
 *
 * The following rules must be in firestore.rules for this flow to work:
 *
 * match /applications/{applicationId} {
 *   allow update: if isAuthenticated() &&
 *     (
 *       // ... existing rules for pending applications ...
 *
 *       // Worker requesting completion on funded application
 *       // Only allows updating completion fields, not status
 *       (request.auth.uid == resource.data.applicantId &&
 *        resource.data.status == 'funded' &&
 *        request.resource.data.status == 'funded' &&
 *        request.resource.data.gigId == resource.data.gigId &&
 *        request.resource.data.applicantId == resource.data.applicantId)
 *     );
 * }
 */
