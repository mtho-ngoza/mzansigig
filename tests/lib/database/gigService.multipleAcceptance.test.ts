/**
 * GigService Multiple Acceptance Prevention Tests
 * Tests to ensure only one worker can be accepted per gig
 */

import { GigService } from '@/lib/database/gigService'
import { FirestoreService } from '@/lib/database/firestore'
import { GigApplication } from '@/types/gig'

// Mock Firestore
jest.mock('@/lib/database/firestore')

describe('GigService - Multiple Acceptance Prevention', () => {
  const mockGigId = 'gig-123'
  const mockApplicationId1 = 'app-1'
  const mockApplicationId2 = 'app-2'
  const mockApplicationId3 = 'app-3'

  const mockApplication1: GigApplication = {
    id: mockApplicationId1,
    gigId: mockGigId,
    applicantId: 'worker-1',
    applicantName: 'Worker One',
    proposedRate: 1000,
    status: 'pending',
    createdAt: new Date()
  }

  const mockApplication2: GigApplication = {
    id: mockApplicationId2,
    gigId: mockGigId,
    applicantId: 'worker-2',
    applicantName: 'Worker Two',
    proposedRate: 1100,
    status: 'pending',
    createdAt: new Date()
  }

  const mockApplication3: GigApplication = {
    id: mockApplicationId3,
    gigId: mockGigId,
    applicantId: 'worker-3',
    applicantName: 'Worker Three',
    proposedRate: 1200,
    status: 'pending',
    createdAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('First Acceptance', () => {
    it('should successfully accept first application when no others are accepted', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication1)
      jest.mocked(FirestoreService.getWhere).mockResolvedValue([
        mockApplication1,
        mockApplication2,
        mockApplication3
      ])
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.updateApplicationStatus(mockApplicationId1, 'accepted')

      // Verify the application was updated
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId1,
        { status: 'accepted', acceptedAt: expect.any(Date) }
      )

      // Verify gig was updated with assigned worker (but NOT status - that happens on funding)
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'gigs',
        mockGigId,
        expect.objectContaining({
          assignedTo: 'worker-1'
        })
      )

      // Verify gig status was NOT updated to in-progress (happens only when funded)
      const gigUpdateCall = jest.mocked(FirestoreService.update).mock.calls.find(
        call => call[0] === 'gigs' && call[1] === mockGigId
      )
      expect(gigUpdateCall?.[2]).not.toHaveProperty('status')
    })

    it('should reject other pending applications when first is accepted', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication1)
      jest.mocked(FirestoreService.getWhere).mockResolvedValue([
        mockApplication1,
        mockApplication2,
        mockApplication3
      ])
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.updateApplicationStatus(mockApplicationId1, 'accepted')

      // Verify other applications were rejected
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId2,
        { status: 'rejected' }
      )
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId3,
        { status: 'rejected' }
      )
    })
  })

  describe('Multiple Acceptance Prevention', () => {
    it('should prevent accepting second application when first is already accepted', async () => {
      const acceptedApplication: GigApplication = {
        ...mockApplication1,
        status: 'accepted'
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication2)
      jest.mocked(FirestoreService.getWhere).mockResolvedValue([
        acceptedApplication,
        mockApplication2,
        mockApplication3
      ])

      await expect(
        GigService.updateApplicationStatus(mockApplicationId2, 'accepted')
      ).rejects.toThrow('Another worker has already been selected for this gig')

      // Verify the second application was NOT updated
      expect(FirestoreService.update).not.toHaveBeenCalledWith(
        'applications',
        mockApplicationId2,
        { status: 'accepted' }
      )
    })

    it('should prevent accepting when another application is funded', async () => {
      const fundedApplication: GigApplication = {
        ...mockApplication1,
        status: 'funded',
        paymentStatus: 'in_escrow'
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication2)
      jest.mocked(FirestoreService.getWhere).mockResolvedValue([
        fundedApplication,
        mockApplication2,
        mockApplication3
      ])

      await expect(
        GigService.updateApplicationStatus(mockApplicationId2, 'accepted')
      ).rejects.toThrow('Another worker has already been selected for this gig')

      // Verify no updates were made
      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should allow accepting if previous acceptance was rejected', async () => {
      const rejectedApplication: GigApplication = {
        ...mockApplication1,
        status: 'rejected'
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication2)
      jest.mocked(FirestoreService.getWhere).mockResolvedValue([
        rejectedApplication,
        mockApplication2,
        mockApplication3
      ])
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.updateApplicationStatus(mockApplicationId2, 'accepted')

      // Verify the application was accepted successfully
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId2,
        { status: 'accepted', acceptedAt: expect.any(Date) }
      )
    })

    it('should allow accepting if previous acceptance was withdrawn', async () => {
      const withdrawnApplication: GigApplication = {
        ...mockApplication1,
        status: 'withdrawn'
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication2)
      jest.mocked(FirestoreService.getWhere).mockResolvedValue([
        withdrawnApplication,
        mockApplication2,
        mockApplication3
      ])
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.updateApplicationStatus(mockApplicationId2, 'accepted')

      // Verify the application was accepted successfully
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId2,
        { status: 'accepted', acceptedAt: expect.any(Date) }
      )
    })

    it('should allow accepting if previous acceptance was completed', async () => {
      const completedApplication: GigApplication = {
        ...mockApplication1,
        status: 'completed'
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication2)
      jest.mocked(FirestoreService.getWhere).mockResolvedValue([
        completedApplication,
        mockApplication2,
        mockApplication3
      ])
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.updateApplicationStatus(mockApplicationId2, 'accepted')

      // Verify the application was accepted successfully
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId2,
        { status: 'accepted', acceptedAt: expect.any(Date) }
      )
    })
  })

  describe('Non-Acceptance Status Updates', () => {
    it('should allow rejecting applications without checking for accepted', async () => {
      const acceptedApplication: GigApplication = {
        ...mockApplication1,
        status: 'accepted'
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication2)
      jest.mocked(FirestoreService.getWhere).mockResolvedValue([
        acceptedApplication,
        mockApplication2
      ])
      jest.mocked(FirestoreService.update).mockResolvedValue()

      // Should not throw even though another is accepted
      await GigService.updateApplicationStatus(mockApplicationId2, 'rejected')

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId2,
        { status: 'rejected' }
      )
    })

    it('should allow updating to funded without checking for accepted', async () => {
      const acceptedApplication: GigApplication = {
        ...mockApplication1,
        status: 'accepted'
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(acceptedApplication)
      jest.mocked(FirestoreService.getWhere).mockResolvedValue([
        acceptedApplication,
        mockApplication2
      ])
      jest.mocked(FirestoreService.update).mockResolvedValue()

      // Should not throw - this is transitioning accepted -> funded
      await GigService.updateApplicationStatus(mockApplicationId1, 'funded')

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId1,
        { status: 'funded' }
      )
    })

    it('should allow updating to completed without checking for accepted', async () => {
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.updateApplicationStatus(mockApplicationId1, 'completed')

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId1,
        { status: 'completed' }
      )
    })
  })

  describe('Error Handling', () => {
    it('should throw error when trying to accept non-existent application', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(null)

      await expect(
        GigService.updateApplicationStatus(mockApplicationId1, 'accepted')
      ).rejects.toThrow('Application not found')

      expect(FirestoreService.update).not.toHaveBeenCalled()
    })

    it('should handle race condition with clear error message', async () => {
      const acceptedApplication: GigApplication = {
        ...mockApplication1,
        status: 'accepted'
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication2)
      jest.mocked(FirestoreService.getWhere).mockResolvedValue([
        acceptedApplication,
        mockApplication2
      ])

      const error = await GigService.updateApplicationStatus(mockApplicationId2, 'accepted')
        .catch(e => e)

      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('Another worker has already been selected for this gig')
    })
  })
})
