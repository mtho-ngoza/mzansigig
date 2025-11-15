/**
 * GigService Gig Status Auto-Update Tests
 * Tests to ensure gig status updates correctly through application lifecycle
 */

import { GigService } from '@/lib/database/gigService'
import { FirestoreService } from '@/lib/database/firestore'
import { Gig, GigApplication } from '@/types/gig'

// Mock Firestore
jest.mock('@/lib/database/firestore')

describe('GigService - Gig Status Auto-Update', () => {
  const mockGigId = 'gig-123'
  const mockApplicationId = 'app-456'
  const mockWorkerId = 'worker-789'

  const mockGig: Gig = {
    id: mockGigId,
    title: 'Test Gig',
    description: 'Test description',
    category: 'Technology',
    location: 'Johannesburg',
    budget: 1000,
    duration: '1 week',
    skillsRequired: ['JavaScript'],
    employerId: 'employer-123',
    employerName: 'Test Employer',
    status: 'open',
    applicants: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockApplication: GigApplication = {
    id: mockApplicationId,
    gigId: mockGigId,
    applicantId: mockWorkerId,
    applicantName: 'Test Worker',
    proposedRate: 1000,
    status: 'pending',
    createdAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Acceptance Flow', () => {
    it('should NOT change gig status to in-progress when application is accepted', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)
      jest.mocked(FirestoreService.getWhere).mockResolvedValue([mockApplication])
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.updateApplicationStatus(mockApplicationId, 'accepted')

      // Verify application status was updated
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        { status: 'accepted', acceptedAt: expect.any(Date) }
      )

      // Verify gig was updated with assignedTo but NOT status
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'gigs',
        mockGigId,
        expect.objectContaining({
          assignedTo: mockWorkerId
        })
      )

      // Verify gig status was NOT set to in-progress
      const gigUpdateCall = jest.mocked(FirestoreService.update).mock.calls.find(
        call => call[0] === 'gigs' && call[1] === mockGigId
      )
      expect(gigUpdateCall?.[2]).not.toHaveProperty('status')
    })

    it('should assign worker to gig when application is accepted', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)
      jest.mocked(FirestoreService.getWhere).mockResolvedValue([mockApplication])
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.updateApplicationStatus(mockApplicationId, 'accepted')

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'gigs',
        mockGigId,
        expect.objectContaining({ assignedTo: mockWorkerId })
      )
    })

    it('should still reject other pending applications when one is accepted', async () => {
      const otherApplication: GigApplication = {
        ...mockApplication,
        id: 'other-app-123',
        applicantId: 'other-worker-456'
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)
      jest.mocked(FirestoreService.getWhere).mockResolvedValue([
        mockApplication,
        otherApplication
      ])
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.updateApplicationStatus(mockApplicationId, 'accepted')

      // Verify other application was rejected
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        'other-app-123',
        { status: 'rejected' }
      )
    })
  })

  describe('Funding Flow', () => {
    it('should change gig status to in-progress when application is funded', async () => {
      const acceptedApplication: GigApplication = {
        ...mockApplication,
        status: 'accepted'
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(acceptedApplication)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.updateApplicationStatus(mockApplicationId, 'funded')

      // Verify application status was updated
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        { status: 'funded' }
      )

      // Verify gig status was updated to in-progress
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'gigs',
        mockGigId,
        expect.objectContaining({ status: 'in-progress' })
      )
    })

    it('should only update gig status once when funding', async () => {
      const acceptedApplication: GigApplication = {
        ...mockApplication,
        status: 'accepted'
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(acceptedApplication)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.updateApplicationStatus(mockApplicationId, 'funded')

      // Count calls to update gig
      const gigUpdateCalls = jest.mocked(FirestoreService.update).mock.calls.filter(
        call => call[0] === 'gigs' && call[1] === mockGigId
      )

      expect(gigUpdateCalls).toHaveLength(1)
      expect(gigUpdateCalls[0][2]).toEqual(expect.objectContaining({ status: 'in-progress' }))
    })
  })

  describe('Complete Lifecycle', () => {
    it('should properly transition gig status through full lifecycle', async () => {
      // Step 1: Accept application - gig should NOT change to in-progress
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)
      jest.mocked(FirestoreService.getWhere).mockResolvedValue([mockApplication])
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.updateApplicationStatus(mockApplicationId, 'accepted')

      let gigStatusUpdateCall = jest.mocked(FirestoreService.update).mock.calls.find(
        call => call[0] === 'gigs' && call[1] === mockGigId
      )
      expect(gigStatusUpdateCall?.[2]).not.toHaveProperty('status')

      // Clear mocks for next step
      jest.clearAllMocks()

      // Step 2: Fund application - gig SHOULD change to in-progress
      const acceptedApplication: GigApplication = {
        ...mockApplication,
        status: 'accepted'
      }
      jest.mocked(FirestoreService.getById).mockResolvedValue(acceptedApplication)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.updateApplicationStatus(mockApplicationId, 'funded')

      gigStatusUpdateCall = jest.mocked(FirestoreService.update).mock.calls.find(
        call => call[0] === 'gigs' && call[1] === mockGigId
      )
      expect(gigStatusUpdateCall?.[2]).toEqual(expect.objectContaining({ status: 'in-progress' }))
    })
  })

  describe('Edge Cases', () => {
    it('should not crash if application not found when funding', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(null)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      // Should not throw, just update status without gig update
      await GigService.updateApplicationStatus(mockApplicationId, 'funded')

      // Only application update should happen
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        { status: 'funded' }
      )

      // No gig update should happen
      const gigUpdateCalls = jest.mocked(FirestoreService.update).mock.calls.filter(
        call => call[0] === 'gigs'
      )
      expect(gigUpdateCalls).toHaveLength(0)
    })

    it('should not update gig status for other status transitions', async () => {
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      // Test rejected status
      await GigService.updateApplicationStatus(mockApplicationId, 'rejected')

      let gigUpdateCalls = jest.mocked(FirestoreService.update).mock.calls.filter(
        call => call[0] === 'gigs'
      )
      expect(gigUpdateCalls).toHaveLength(0)

      jest.clearAllMocks()

      // Test completed status
      await GigService.updateApplicationStatus(mockApplicationId, 'completed')

      gigUpdateCalls = jest.mocked(FirestoreService.update).mock.calls.filter(
        call => call[0] === 'gigs'
      )
      expect(gigUpdateCalls).toHaveLength(0)
    })

    it('should handle funding when gig is already in-progress', async () => {
      const acceptedApplication: GigApplication = {
        ...mockApplication,
        status: 'accepted'
      }

      jest.mocked(FirestoreService.getById).mockResolvedValue(acceptedApplication)
      jest.mocked(FirestoreService.update).mockResolvedValue()

      // Fund the application - should still set status even if already in-progress
      await GigService.updateApplicationStatus(mockApplicationId, 'funded')

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'gigs',
        mockGigId,
        expect.objectContaining({ status: 'in-progress' })
      )
    })
  })

  describe('UX Benefits', () => {
    it('should allow workers to keep applying to accepted but unfunded gigs', async () => {
      // This test documents the intended behavior:
      // - Gig is 'open' initially
      // - Application is accepted → gig still 'open' (workers can apply as backup)
      // - Payment funded → gig becomes 'in-progress' (no more applications)

      const openGig: Gig = {
        ...mockGig,
        status: 'open'
      }

      // Accept an application
      jest.mocked(FirestoreService.getById).mockResolvedValue(mockApplication)
      jest.mocked(FirestoreService.getWhere).mockResolvedValue([mockApplication])
      jest.mocked(FirestoreService.update).mockResolvedValue()

      await GigService.updateApplicationStatus(mockApplicationId, 'accepted')

      // Gig should still be 'open' (not updated to in-progress)
      const gigUpdateCall = jest.mocked(FirestoreService.update).mock.calls.find(
        call => call[0] === 'gigs'
      )
      expect(gigUpdateCall?.[2]).not.toHaveProperty('status')

      // This means other workers can still see and apply to the gig
      // providing backup options in case the accepted worker or employer backs out
    })
  })
})
