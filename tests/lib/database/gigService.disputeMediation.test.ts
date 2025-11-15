/**
 * GigService Dispute Mediation Tests
 * Tests for admin dispute resolution functionality
 */

import { GigService } from '@/lib/database/gigService'
import { FirestoreService } from '@/lib/database/firestore'
import { PaymentService } from '@/lib/services/paymentService'
import { Gig, GigApplication } from '@/types/gig'

// Mock dependencies
jest.mock('@/lib/database/firestore')
jest.mock('@/lib/services/paymentService')

describe('GigService - Dispute Mediation', () => {
  const mockGigId = 'gig-123'
  const mockApplicationId = 'app-456'
  const mockWorkerId = 'worker-789'
  const mockEmployerId = 'employer-999'
  const mockAdminId = 'admin-111'
  const mockPaymentId = 'payment-222'

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

  const mockDisputedApplication: GigApplication = {
    id: mockApplicationId,
    gigId: mockGigId,
    applicantId: mockWorkerId,
    applicantName: 'Test Worker',
    proposedRate: 1000,
    status: 'funded',
    paymentStatus: 'in_escrow',
    paymentId: mockPaymentId,
    createdAt: new Date(),
    completionRequestedAt: new Date(),
    completionRequestedBy: 'worker',
    completionAutoReleaseAt: new Date(),
    completionDisputedAt: new Date(),
    completionDisputeReason: 'Work not completed as specified'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAllDisputedApplications', () => {
    it('should return only applications with active disputes', async () => {
      const allApplications: GigApplication[] = [
        mockDisputedApplication,
        {
          ...mockDisputedApplication,
          id: 'app-2',
          completionDisputedAt: undefined // Not disputed
        },
        {
          ...mockDisputedApplication,
          id: 'app-3',
          completionResolvedAt: new Date() // Already resolved
        },
        {
          ...mockDisputedApplication,
          id: 'app-4' // Active dispute
        }
      ]

      jest.mocked(FirestoreService.getAll).mockResolvedValue(allApplications)

      const disputes = await GigService.getAllDisputedApplications()

      expect(disputes).toHaveLength(2)
      expect(disputes[0].id).toBe(mockApplicationId)
      expect(disputes[1].id).toBe('app-4')
      expect(disputes.every(d => d.completionDisputedAt)).toBe(true)
      expect(disputes.every(d => !d.completionResolvedAt)).toBe(true)
    })

    it('should return empty array when no disputes exist', async () => {
      jest.mocked(FirestoreService.getAll).mockResolvedValue([])

      const disputes = await GigService.getAllDisputedApplications()

      expect(disputes).toHaveLength(0)
    })

    it('should filter out non-funded applications', async () => {
      const allApplications: GigApplication[] = [
        {
          ...mockDisputedApplication,
          status: 'accepted' // Not funded yet
        },
        mockDisputedApplication // Funded and disputed
      ]

      jest.mocked(FirestoreService.getAll).mockResolvedValue(allApplications)

      const disputes = await GigService.getAllDisputedApplications()

      expect(disputes).toHaveLength(1)
      expect(disputes[0].id).toBe(mockApplicationId)
    })
  })

  describe('resolveDisputeInFavorOfWorker', () => {
    it('should successfully resolve dispute and release payment to worker', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockDisputedApplication)
      jest.mocked(FirestoreService.update).mockResolvedValue()
      jest.mocked(PaymentService.releaseEscrow).mockResolvedValue()

      const resolutionNotes = 'Worker has completed the work as agreed. Employer concerns were minor.'

      await GigService.resolveDisputeInFavorOfWorker(
        mockApplicationId,
        mockAdminId,
        resolutionNotes
      )

      // Verify application was marked as resolved
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        expect.objectContaining({
          completionResolvedAt: expect.any(Date),
          completionResolvedBy: mockAdminId,
          completionResolution: 'approved',
          completionResolutionNotes: resolutionNotes,
          status: 'completed'
        })
      )

      // Verify gig was marked as completed
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'gigs',
        mockGigId,
        expect.objectContaining({ status: 'completed' })
      )

      // Verify escrow was released
      expect(PaymentService.releaseEscrow).toHaveBeenCalledWith(mockPaymentId)
    })

    it('should work without resolution notes', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockDisputedApplication)
      jest.mocked(FirestoreService.update).mockResolvedValue()
      jest.mocked(PaymentService.releaseEscrow).mockResolvedValue()

      await GigService.resolveDisputeInFavorOfWorker(mockApplicationId, mockAdminId)

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        expect.objectContaining({
          completionResolution: 'approved',
          status: 'completed'
        })
      )
    })

    it('should handle applications without payment gracefully', async () => {
      const applicationWithoutPayment = {
        ...mockDisputedApplication,
        paymentId: undefined
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(applicationWithoutPayment)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.resolveDisputeInFavorOfWorker(mockApplicationId, mockAdminId)

      // Should still update application and gig
      expect(FirestoreService.update).toHaveBeenCalledTimes(2)

      // But should not attempt to release escrow
      expect(PaymentService.releaseEscrow).not.toHaveBeenCalled()
    })

    it('should reject if application not found', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(null)

      await expect(
        GigService.resolveDisputeInFavorOfWorker(mockApplicationId, mockAdminId)
      ).rejects.toThrow('Application not found')

      expect(PaymentService.releaseEscrow).not.toHaveBeenCalled()
    })

    it('should reject if no active dispute exists', async () => {
      const applicationWithoutDispute = {
        ...mockDisputedApplication,
        completionDisputedAt: undefined
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(applicationWithoutDispute)

      await expect(
        GigService.resolveDisputeInFavorOfWorker(mockApplicationId, mockAdminId)
      ).rejects.toThrow('This application does not have an active dispute')

      expect(PaymentService.releaseEscrow).not.toHaveBeenCalled()
    })

    it('should reject if dispute already resolved', async () => {
      const resolvedDispute = {
        ...mockDisputedApplication,
        completionResolvedAt: new Date()
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(resolvedDispute)

      await expect(
        GigService.resolveDisputeInFavorOfWorker(mockApplicationId, mockAdminId)
      ).rejects.toThrow('This dispute has already been resolved')

      expect(PaymentService.releaseEscrow).not.toHaveBeenCalled()
    })
  })

  describe('resolveDisputeInFavorOfEmployer', () => {
    it('should successfully resolve dispute and require worker to continue work', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockDisputedApplication)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      const resolutionNotes = 'Employer is correct. Work does not meet the specified requirements.'

      await GigService.resolveDisputeInFavorOfEmployer(
        mockApplicationId,
        mockAdminId,
        resolutionNotes
      )

      // Verify application was marked as resolved with fields cleared
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        expect.objectContaining({
          completionResolvedAt: expect.any(Date),
          completionResolvedBy: mockAdminId,
          completionResolution: 'rejected',
          completionResolutionNotes: resolutionNotes,
          completionRequestedAt: undefined,
          completionRequestedBy: undefined,
          completionDisputedAt: undefined,
          completionDisputeReason: undefined
        })
      )

      // Verify escrow was NOT released
      expect(PaymentService.releaseEscrow).not.toHaveBeenCalled()

      // Verify gig status was NOT changed (stays in-progress)
      const gigUpdateCalls = jest.mocked(FirestoreService.update).mock.calls.filter(
        call => call[0] === 'gigs'
      )
      expect(gigUpdateCalls).toHaveLength(0)
    })

    it('should clear completion fields to allow worker to request again', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockDisputedApplication)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.resolveDisputeInFavorOfEmployer(mockApplicationId, mockAdminId, 'Needs fixes')

      const updateCall = jest.mocked(FirestoreService.update).mock.calls[0][2]

      expect(updateCall).toHaveProperty('completionRequestedAt', undefined)
      expect(updateCall).toHaveProperty('completionRequestedBy', undefined)
      expect(updateCall).toHaveProperty('completionDisputedAt', undefined)
      expect(updateCall).toHaveProperty('completionDisputeReason', undefined)
    })

    it('should reject if application not found', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(null)

      await expect(
        GigService.resolveDisputeInFavorOfEmployer(mockApplicationId, mockAdminId, 'Notes')
      ).rejects.toThrow('Application not found')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should reject if no active dispute exists', async () => {
      const applicationWithoutDispute = {
        ...mockDisputedApplication,
        completionDisputedAt: undefined
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(applicationWithoutDispute)

      await expect(
        GigService.resolveDisputeInFavorOfEmployer(mockApplicationId, mockAdminId, 'Notes')
      ).rejects.toThrow('This application does not have an active dispute')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should reject if dispute already resolved', async () => {
      const resolvedDispute = {
        ...mockDisputedApplication,
        completionResolvedAt: new Date()
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(resolvedDispute)

      await expect(
        GigService.resolveDisputeInFavorOfEmployer(mockApplicationId, mockAdminId, 'Notes')
      ).rejects.toThrow('This dispute has already been resolved')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })
  })

  describe('Mediation Workflow', () => {
    it('should maintain escrow when resolving in favor of employer', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockDisputedApplication)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.resolveDisputeInFavorOfEmployer(mockApplicationId, mockAdminId, 'Continue work')

      // Escrow should NOT be released
      expect(PaymentService.releaseEscrow).not.toHaveBeenCalled()

      // Application should stay funded
      const updateCall = jest.mocked(FirestoreService.update).mock.calls[0][2]
      expect(updateCall).not.toHaveProperty('status', 'completed')
    })

    it('should allow worker to re-request completion after employer resolution', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockDisputedApplication)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.resolveDisputeInFavorOfEmployer(mockApplicationId, mockAdminId, 'Fix issues')

      const updateCall = jest.mocked(FirestoreService.update).mock.calls[0][2]

      // Completion request fields should be cleared
      expect(updateCall.completionRequestedAt).toBeUndefined()
      expect(updateCall.completionRequestedBy).toBeUndefined()

      // Worker can now request completion again after fixing issues
    })

    it('should document admin resolution for both outcomes', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockDisputedApplication)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      const workerNotes = 'Worker completed as agreed'
      const employerNotes = 'Employer is correct about missing features'

      // Test worker resolution
      await GigService.resolveDisputeInFavorOfWorker(mockApplicationId, mockAdminId, workerNotes)

      let updateCall = jest.mocked(FirestoreService.update).mock.calls[0][2]
      expect(updateCall).toMatchObject({
        completionResolvedBy: mockAdminId,
        completionResolution: 'approved',
        completionResolutionNotes: workerNotes
      })

      jest.clearAllMocks()

      // Test employer resolution
      await GigService.resolveDisputeInFavorOfEmployer(mockApplicationId, mockAdminId, employerNotes)

      updateCall = jest.mocked(FirestoreService.update).mock.calls[0][2]
      expect(updateCall).toMatchObject({
        completionResolvedBy: mockAdminId,
        completionResolution: 'rejected',
        completionResolutionNotes: employerNotes
      })
    })
  })
})
