/**
 * GigService Completion Workflow Tests
 * Tests for worker-initiated completion, employer approval/dispute, and auto-release
 */

import { GigService } from '@/lib/database/gigService'
import { FirestoreService } from '@/lib/database/firestore'
import { PaymentService } from '@/lib/services/paymentService'
import { Gig, GigApplication } from '@/types/gig'

// Mock dependencies
jest.mock('@/lib/database/firestore')
jest.mock('@/lib/services/paymentService')

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
    updatedAt: new Date()
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
      jest.mocked(FirestoreService.update).mockResolvedValue()
      jest.mocked(PaymentService.releaseEscrow).mockResolvedValue()

      await GigService.approveCompletion(mockApplicationId, mockEmployerId)

      // Verify application status updated
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        { status: 'completed' }
      )

      // Verify gig status updated
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'gigs',
        mockGigId,
        expect.objectContaining({ status: 'completed' })
      )

      // Verify escrow released
      expect(PaymentService.releaseEscrow).toHaveBeenCalledWith(mockPaymentId)
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
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.approveCompletion(mockApplicationId, mockEmployerId)

      // Should still update statuses
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        { status: 'completed' }
      )

      // But should not attempt to release escrow
      expect(PaymentService.releaseEscrow).not.toHaveBeenCalled()
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
      jest.mocked(FirestoreService.update).mockResolvedValue()
      jest.mocked(PaymentService.releaseEscrow).mockResolvedValue()

      const result = await GigService.checkAndProcessAutoRelease(mockApplicationId)

      expect(result).toBe(true)

      // Verify application status updated
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        { status: 'completed' }
      )

      // Verify gig status updated
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'gigs',
        mockGigId,
        expect.objectContaining({ status: 'completed' })
      )

      // Verify escrow released
      expect(PaymentService.releaseEscrow).toHaveBeenCalledWith(mockPaymentId)
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
      expect(FirestoreService.update).not.toHaveBeenCalled()
      expect(PaymentService.releaseEscrow).not.toHaveBeenCalled()
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
      expect(FirestoreService.update).not.toHaveBeenCalled()
      expect(PaymentService.releaseEscrow).not.toHaveBeenCalled()
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
      jest.mocked(FirestoreService.update).mockResolvedValue()

      const result = await GigService.checkAndProcessAutoRelease(mockApplicationId)

      expect(result).toBe(true)

      // Should still update statuses
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        { status: 'completed' }
      )

      // But should not attempt to release escrow
      expect(PaymentService.releaseEscrow).not.toHaveBeenCalled()
    })
  })
})
